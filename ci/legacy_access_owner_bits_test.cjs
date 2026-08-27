'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const releaseCliRoot = path.resolve(
  process.env.DOPPIO_RELEASE_CLI_ROOT ||
  path.join(__dirname, '..', 'build', 'release-cli')
);
const doppio = require(path.join(releaseCliRoot, 'src', 'doppiojvm'));
const javaIoNatives = require(
  path.join(releaseCliRoot, 'src', 'natives', 'java_io')
).default();
const nioNatives = require(
  path.join(releaseCliRoot, 'src', 'natives', 'sun_nio')
).default();
const util = require(path.join(releaseCliRoot, 'src', 'util'));

const Long = doppio.VM.Long;
const legacyAccess = javaIoNatives['java/io/UnixFileSystem'][
  'checkAccess(Ljava/io/File;I)Z'
];
const nioAccess = nioNatives['sun/nio/fs/UnixNativeDispatcher']['access0(JI)V'];
const testPath = '/legacy-access-owner-bits';
const pathAddress = 4096;
const pathBytes = Buffer.from(`${testPath}\0`);
const originals = {
  access: fs.access,
  areInBrowser: util.are_in_browser,
  stat: fs.stat
};
let scenarioCount = 0;

class FakeUnixException {
}

function FakeUnixConstants() {
}

FakeUnixConstants['sun/nio/fs/UnixConstants/EACCES'] = 13;
FakeUnixConstants['sun/nio/fs/UnixConstants/ENOENT'] = 2;

function makeLegacyThread() {
  return {
    returns: [],
    setStatus() {
    },
    asyncReturn(value) {
      this.returns.push(value);
    }
  };
}

function makeNioThread() {
  const heap = {
    get_signed_byte(address) {
      return pathBytes.readInt8(address - pathAddress);
    },
    get_buffer(address, length) {
      const offset = address - pathAddress;
      return pathBytes.subarray(offset, offset + length);
    }
  };
  return {
    returns: [],
    exceptions: [],
    setStatus() {
    },
    getJVM() {
      return {
        getHeap() {
          return heap;
        }
      };
    },
    getBsCl() {
      return {
        initializeClass(thread, className, callback) {
          if (className === 'Lsun/nio/fs/UnixException;') {
            callback({getConstructor: () => FakeUnixException});
          } else if (className === 'Lsun/nio/fs/UnixConstants;') {
            callback({getConstructor: () => FakeUnixConstants});
          } else {
            throw new Error(`Unexpected class initialization: ${className}`);
          }
        }
      };
    },
    asyncReturn() {
      this.returns.push(Array.from(arguments));
    },
    throwException(exception) {
      this.exceptions.push(exception);
    }
  };
}

function invokeLegacy(access) {
  const thread = makeLegacyThread();
  const file = {
    'java/io/File/path': {
      toString() {
        return testPath;
      }
    }
  };
  legacyAccess(thread, null, file, access);
  assert.equal(thread.returns.length, 1);
  return thread.returns[0] === 1;
}

function invokeNio(access) {
  const thread = makeNioThread();
  nioAccess(thread, Long.fromNumber(pathAddress), access);
  assert.equal(thread.returns.length + thread.exceptions.length, 1);
  return thread.returns.length === 1;
}

function checkBrowserMode(label, mode, access, expected) {
  let statCalls = 0;
  util.are_in_browser = () => true;
  fs.stat = function(actualPath, callback) {
    assert.equal(actualPath, testPath, label);
    statCalls += 1;
    callback(null, {mode});
  };

  const legacyResult = invokeLegacy(access);
  const nioResult = invokeNio(access);
  assert.equal(statCalls, 2, label);
  assert.equal(legacyResult, expected, `${label}: legacy`);
  assert.equal(nioResult, expected, `${label}: NIO`);
  assert.equal(legacyResult, nioResult, `${label}: parity`);
  scenarioCount += 1;
}

function checkBrowserMissing() {
  const missingError = new Error('injected missing path');
  missingError.code = 'ENOENT';
  let statCalls = 0;
  util.are_in_browser = () => true;
  fs.stat = function(actualPath, callback) {
    assert.equal(actualPath, testPath);
    statCalls += 1;
    callback(missingError);
  };

  const legacyResult = invokeLegacy(4);
  const nioResult = invokeNio(4);
  assert.equal(statCalls, 2);
  assert.equal(legacyResult, false);
  assert.equal(nioResult, false);
  assert.equal(legacyResult, nioResult);
  scenarioCount += 1;
}

function checkNativeMode(label, access, accessError, expected) {
  let accessCalls = 0;
  util.are_in_browser = () => false;
  fs.stat = function() {
    assert.fail(`${label}: native access must not infer permissions from stat`);
  };
  fs.access = function(actualPath, actualMode, callback) {
    assert.equal(actualPath, testPath, label);
    assert.equal(actualMode, access, label);
    accessCalls += 1;
    callback(accessError);
  };

  const legacyResult = invokeLegacy(access);
  const nioResult = invokeNio(access);
  assert.equal(accessCalls, 2, label);
  assert.equal(legacyResult, expected, `${label}: legacy`);
  assert.equal(nioResult, expected, `${label}: NIO`);
  assert.equal(legacyResult, nioResult, `${label}: parity`);
  scenarioCount += 1;
}

function checkInvalidMode(browser, access) {
  util.are_in_browser = () => browser;
  fs.stat = function() {
    assert.fail(`invalid mode ${access} must not reach stat`);
  };
  fs.access = function() {
    assert.fail(`invalid mode ${access} must not reach fs.access`);
  };
  assert.equal(invokeLegacy(access), false);
  scenarioCount += 1;
}

try {
  const permissions = [
    {name: 'read', access: 4},
    {name: 'write', access: 2},
    {name: 'execute', access: 1}
  ];
  const permissionClasses = [
    {name: 'owner', shift: 6, expected: true},
    {name: 'group', shift: 3, expected: false},
    {name: 'other', shift: 0, expected: false}
  ];

  for (const permission of permissions) {
    for (const permissionClass of permissionClasses) {
      checkBrowserMode(
        `${permissionClass.name}-${permission.name}`,
        permission.access << permissionClass.shift,
        permission.access,
        permissionClass.expected
      );
    }
  }
  checkBrowserMode('owner-read-write', 0o600, 6, true);
  checkBrowserMode('owner-read-without-write', 0o400, 6, false);
  checkBrowserMissing();

  for (const permission of permissions) {
    checkNativeMode(`${permission.name}-allowed`, permission.access, null, true);
    const denied = new Error(`injected ${permission.name} denial`);
    denied.code = 'EACCES';
    checkNativeMode(`${permission.name}-denied`, permission.access, denied, false);
  }

  for (const browser of [true, false]) {
    checkInvalidMode(browser, 0);
    checkInvalidMode(browser, 8);
  }

  console.log(`legacy-access-owner-bits:${scenarioCount}:ok`);
} finally {
  fs.access = originals.access;
  fs.stat = originals.stat;
  util.are_in_browser = originals.areInBrowser;
}
