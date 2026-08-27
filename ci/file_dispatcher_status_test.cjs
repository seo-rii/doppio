'use strict';

const assert = require('assert');
const fs = require('fs');
const doppio = require('../build/release-cli/src/doppiojvm');
const natives = require('../build/release-cli/src/natives/sun_nio').default();
const util = require('../build/release-cli/src/util');

const FDState = doppio.VM.FDState;
const Long = doppio.VM.Long;
const dispatcher = natives['sun/nio/ch/FileDispatcherImpl'];
const iovAddress = 4096;
const bufferAddress = 8192;
const originals = {
  fstat: fs.fstat,
  fsync: fs.fsync,
  read: fs.read,
  readv: fs.readv,
  write: fs.write,
  writev: fs.writev,
  areInBrowser: util.are_in_browser
};
let nextFd = 12600;
let assertions = 0;

function makeError(code) {
  const error = new Error(`injected ${code}`);
  error.code = code;
  return error;
}

function makeThread(iovLengths = [1]) {
  return {
    returns: [],
    exceptions: [],
    setStatus() {
    },
    getJVM() {
      return {
        getHeap() {
          return {
            get_buffer(address, length) {
              assert.equal(address >= bufferAddress, true);
              return Buffer.alloc(length);
            },
            get_word(address) {
              const relative = address - iovAddress;
              const index = Math.floor(relative / 8);
              if (index < 0 || index >= iovLengths.length) {
                throw new Error(`Unexpected iovec address: ${address}`);
              }
              if (relative % 8 === 0) {
                return bufferAddress + index * 16;
              }
              if (relative % 8 === 4) {
                return iovLengths[index];
              }
              throw new Error(`Unexpected iovec address: ${address}`);
            }
          };
        }
      };
    },
    asyncReturn() {
      this.returns.push(Array.from(arguments));
    },
    throwNewException(type, message) {
      this.exceptions.push({type, message});
    }
  };
}

function retire(fd) {
  let drained = 0;
  assert.equal(FDState.requestClose(fd, () => {
    drained += 1;
  }), true);
  assert.equal(drained, 1);
  FDState.open(fd, 0, false, 0, `/dispatcher-reuse-${fd}`);
  FDState.close(fd);
}

function assertReturn(thread, kind, expected) {
  assert.deepEqual(thread.exceptions, []);
  assert.equal(thread.returns.length, 1);
  if (kind === 'long') {
    assert.equal(thread.returns[0].length, 2);
    assert.equal(thread.returns[0][0].toNumber(), expected);
    assert.equal(thread.returns[0][1], null);
  } else {
    assert.deepEqual(thread.returns[0], [expected]);
  }
}

const operations = [
  {
    name: 'read',
    hostMethod: 'read',
    kind: 'int',
    invoke(thread, descriptor) {
      dispatcher['read0(Ljava/io/FileDescriptor;JI)I'](
        thread, descriptor, Long.fromNumber(bufferAddress), 1);
    }
  },
  {
    name: 'pread',
    hostMethod: 'read',
    kind: 'int',
    invoke(thread, descriptor) {
      dispatcher['pread0(Ljava/io/FileDescriptor;JIJ)I'](
        thread, descriptor, Long.fromNumber(bufferAddress), 1, Long.ZERO);
    }
  },
  {
    name: 'readv',
    hostMethod: 'readv',
    kind: 'long',
    invoke(thread, descriptor) {
      dispatcher['readv0(Ljava/io/FileDescriptor;JI)J'](
        thread, descriptor, Long.fromNumber(iovAddress), 1);
    }
  },
  {
    name: 'write',
    hostMethod: 'write',
    kind: 'int',
    invoke(thread, descriptor) {
      dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
        thread, descriptor, Long.fromNumber(bufferAddress), 1);
    }
  },
  {
    name: 'pwrite',
    hostMethod: 'write',
    kind: 'int',
    invoke(thread, descriptor) {
      dispatcher['pwrite0(Ljava/io/FileDescriptor;JIJ)I'](
        thread, descriptor, Long.fromNumber(bufferAddress), 1, Long.ZERO);
    }
  },
  {
    name: 'writev',
    hostMethod: 'writev',
    kind: 'long',
    invoke(thread, descriptor) {
      dispatcher['writev0(Ljava/io/FileDescriptor;JI)J'](
        thread, descriptor, Long.fromNumber(iovAddress), 1);
    }
  }
];

function testStatus(operation, code, expected) {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  FDState.open(fd, 0, false, 0, `/dispatcher-status-${operation.name}`);
  fs[operation.hostMethod] = function() {
    const callback = arguments[arguments.length - 1];
    callback(makeError(code));
  };
  try {
    operation.invoke(thread, descriptor);
    assertReturn(thread, operation.kind, expected);
    assertions += 1;
  } finally {
    fs[operation.hostMethod] = originals[operation.hostMethod];
    retire(fd);
  }
}

function testLateCallbackAfterSynchronousStatus(operation) {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  let lateCallback = null;
  FDState.open(fd, 0, false, 0, `/dispatcher-late-${operation.name}`);
  fs[operation.hostMethod] = function() {
    lateCallback = arguments[arguments.length - 1];
    throw makeError('EAGAIN');
  };
  try {
    operation.invoke(thread, descriptor);
    assertReturn(thread, operation.kind, -2);
    assert.equal(FDState.getPos(fd), 0);
    assert.equal(typeof lateCallback, 'function');
    lateCallback(null, 1);
    assertReturn(thread, operation.kind, -2);
    assert.equal(FDState.getPos(fd), 0);
    assertions += 1;
  } finally {
    fs[operation.hostMethod] = originals[operation.hostMethod];
    retire(fd);
  }
}

function testDuplicateSuccessCallback(operation) {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  const expectedPosition = operation.name === 'read' || operation.name === 'readv' ||
    operation.name === 'write' || operation.name === 'writev' ? 1 : 0;
  FDState.open(fd, 0, false, 0, `/dispatcher-duplicate-${operation.name}`);
  fs[operation.hostMethod] = function() {
    const callback = arguments[arguments.length - 1];
    callback(null, 1);
    callback(null, 1);
  };
  try {
    operation.invoke(thread, descriptor);
    assertReturn(thread, operation.kind, 1);
    assert.equal(FDState.getPos(fd), expectedPosition);
    assertions += 1;
  } finally {
    fs[operation.hostMethod] = originals[operation.hostMethod];
    retire(fd);
  }
}

function testMetadataError() {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  FDState.open(fd, 0, false, 0, '/dispatcher-metadata-status');
  fs.fstat = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    callback(makeError('EAGAIN'));
  };
  try {
    dispatcher['size0(Ljava/io/FileDescriptor;)J'](thread, descriptor);
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, [{
      type: 'Ljava/io/IOException;',
      message: 'injected EAGAIN'
    }]);
    assertions += 1;
  } finally {
    fs.fstat = originals.fstat;
    retire(fd);
  }
}

function testPostWriteMetadataError() {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  FDState.open(fd, 0, false, 1, '/dispatcher-post-write-metadata-status');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    callback(null, 1);
  };
  fs.fsync = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    callback(makeError('EINTR'));
  };
  try {
    dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
      thread, descriptor, Long.fromNumber(bufferAddress), 1);
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, [{
      type: 'Ljava/io/IOException;',
      message: 'injected EINTR'
    }]);
    assertions += 1;
  } finally {
    fs.write = originals.write;
    fs.fsync = originals.fsync;
    retire(fd);
  }
}

function testOrdinaryIOError() {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  FDState.open(fd, 0, false, 0, '/dispatcher-ordinary-io-error');
  fs.read = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    callback(makeError('EIO'));
  };
  try {
    dispatcher['read0(Ljava/io/FileDescriptor;JI)I'](
      thread, descriptor, Long.fromNumber(bufferAddress), 1);
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, [{
      type: 'Ljava/io/IOException;',
      message: 'injected EIO'
    }]);
    assertions += 1;
  } finally {
    fs.read = originals.read;
    retire(fd);
  }
}

function testFallbackCallbackThenThrow(kind) {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread([1, 1]);
  const marker = makeError('EAGAIN');
  const vectorMethod = kind === 'read' ? 'readv' : 'writev';
  const scalarMethod = kind === 'read' ? 'read' : 'write';
  let calls = 0;
  let pendingCallback = null;
  FDState.open(fd, 0, false, 0, `/dispatcher-fallback-callback-throw-${kind}`);
  fs[vectorMethod] = undefined;
  fs[scalarMethod] = function() {
    calls += 1;
    const callback = arguments[arguments.length - 1];
    if (calls === 1) {
      callback(null, 1);
      throw marker;
    }
    pendingCallback = callback;
  };
  try {
    assert.throws(
      () => dispatcher[`${vectorMethod}0(Ljava/io/FileDescriptor;JI)J`](
        thread, descriptor, Long.fromNumber(iovAddress), 2),
      (error) => error === marker
    );
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, []);
    assert.equal(FDState.getPos(fd), 1);
    assert.equal(typeof pendingCallback, 'function');
    pendingCallback(null, 1);
    assertReturn(thread, 'long', 2);
    assert.equal(FDState.getPos(fd), 2);
    assertions += 1;
  } finally {
    fs[scalarMethod] = originals[scalarMethod];
    fs[vectorMethod] = originals[vectorMethod];
    retire(fd);
  }
}

function testFallbackPartialStatus(kind, code) {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread([1, 1]);
  const vectorMethod = kind === 'read' ? 'readv' : 'writev';
  const scalarMethod = kind === 'read' ? 'read' : 'write';
  let calls = 0;
  FDState.open(fd, 0, false, 0, `/dispatcher-fallback-partial-${kind}-${code}`);
  fs[vectorMethod] = undefined;
  fs[scalarMethod] = function() {
    calls += 1;
    const callback = arguments[arguments.length - 1];
    if (calls === 1) {
      callback(null, 1);
      return;
    }
    throw makeError(code);
  };
  try {
    dispatcher[`${vectorMethod}0(Ljava/io/FileDescriptor;JI)J`](
      thread, descriptor, Long.fromNumber(iovAddress), 2);
    assertReturn(thread, 'long', 1);
    assert.equal(FDState.getPos(fd), 1);
    assertions += 1;
  } finally {
    fs[scalarMethod] = originals[scalarMethod];
    fs[vectorMethod] = originals[vectorMethod];
    retire(fd);
  }
}

function testScalarPendingSync(kind) {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  const marker = makeError('EINTR');
  let syncCallback = null;
  FDState.open(fd, 0, false, 1, `/dispatcher-pending-sync-${kind}`);
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    callback(null, 1);
    throw marker;
  };
  fs.fsync = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    syncCallback = callback;
  };
  try {
    assert.throws(
      () => {
        if (kind === 'write') {
          dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
            thread, descriptor, Long.fromNumber(bufferAddress), 1);
        } else {
          dispatcher['pwrite0(Ljava/io/FileDescriptor;JIJ)I'](
            thread, descriptor, Long.fromNumber(bufferAddress), 1, Long.ZERO);
        }
      },
      (error) => error === marker
    );
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, []);
    assert.equal(FDState.getPos(fd), kind === 'write' ? 1 : 0);
    assert.equal(typeof syncCallback, 'function');
    syncCallback(null);
    assertReturn(thread, 'int', 1);
    assert.equal(FDState.getPos(fd), kind === 'write' ? 1 : 0);
    assertions += 1;
  } finally {
    fs.write = originals.write;
    fs.fsync = originals.fsync;
    retire(fd);
  }
}

function testNativeWritevPendingTail() {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  const marker = makeError('EWOULDBLOCK');
  let syncCallback = null;
  FDState.open(fd, 0, false, 1, '/dispatcher-native-writev-tail');
  fs.writev = function(fdArg, buffers, position, callback) {
    assert.equal(fdArg, fd);
    callback(null, 1);
    throw marker;
  };
  fs.fsync = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    syncCallback = callback;
  };
  try {
    assert.throws(
      () => dispatcher['writev0(Ljava/io/FileDescriptor;JI)J'](
        thread, descriptor, Long.fromNumber(iovAddress), 1),
      (error) => error === marker
    );
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, []);
    assert.equal(FDState.getPos(fd), 1);
    assert.equal(typeof syncCallback, 'function');
    syncCallback(null);
    assertReturn(thread, 'long', 1);
    assert.equal(FDState.getPos(fd), 1);
    assertions += 1;
  } finally {
    fs.writev = originals.writev;
    fs.fsync = originals.fsync;
    retire(fd);
  }
}

function testBrowserAppendTails() {
  const fd = nextFd++;
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread();
  const preflightMarker = makeError('EAGAIN');
  const postWriteMarker = makeError('EINTR');
  let statCalls = 0;
  let writeCallback = null;
  let syncCallback = null;
  FDState.open(fd, 0, true, 1, '/dispatcher-browser-append-tails');
  util.are_in_browser = () => true;
  fs.fstat = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    statCalls += 1;
    if (statCalls === 1) {
      callback(null, {size: 5});
      throw preflightMarker;
    }
    callback(null, {size: 6});
    throw postWriteMarker;
  };
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    assert.equal(position, 5);
    writeCallback = callback;
  };
  fs.fsync = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    syncCallback = callback;
  };
  try {
    assert.throws(
      () => dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
        thread, descriptor, Long.fromNumber(bufferAddress), 1),
      (error) => error === preflightMarker
    );
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, []);
    assert.equal(FDState.getPos(fd), 5);
    assert.equal(typeof writeCallback, 'function');
    assert.throws(
      () => writeCallback(null, 1),
      (error) => error === postWriteMarker
    );
    assert.deepEqual(thread.returns, []);
    assert.deepEqual(thread.exceptions, []);
    assert.equal(FDState.getPos(fd), 6);
    assert.equal(typeof syncCallback, 'function');
    syncCallback(null);
    assertReturn(thread, 'int', 1);
    assert.equal(FDState.getPos(fd), 6);
    assertions += 1;
  } finally {
    util.are_in_browser = originals.areInBrowser;
    fs.fstat = originals.fstat;
    fs.fsync = originals.fsync;
    fs.write = originals.write;
    retire(fd);
  }
}

try {
  assert.equal(typeof fs.readv, 'function');
  assert.equal(typeof fs.writev, 'function');
  for (const operation of operations) {
    testStatus(operation, 'EINTR', -3);
    testStatus(operation, 'EAGAIN', -2);
    testStatus(operation, 'EWOULDBLOCK', -2);
    testLateCallbackAfterSynchronousStatus(operation);
    testDuplicateSuccessCallback(operation);
  }
  for (const code of ['EINTR', 'EAGAIN', 'EWOULDBLOCK']) {
    testFallbackPartialStatus('read', code);
    testFallbackPartialStatus('write', code);
  }
  testMetadataError();
  testPostWriteMetadataError();
  testOrdinaryIOError();
  testFallbackCallbackThenThrow('read');
  testFallbackCallbackThenThrow('write');
  testScalarPendingSync('write');
  testScalarPendingSync('pwrite');
  testNativeWritevPendingTail();
  testBrowserAppendTails();
  console.log(`file-dispatcher-status:${assertions}:ok`);
} finally {
  util.are_in_browser = originals.areInBrowser;
  fs.fstat = originals.fstat;
  fs.fsync = originals.fsync;
  fs.read = originals.read;
  fs.readv = originals.readv;
  fs.write = originals.write;
  fs.writev = originals.writev;
}
