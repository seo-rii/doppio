'use strict';

const assert = require('assert');
const fs = require('fs');
const doppio = require('../build/release-cli/src/doppiojvm');
const javaIoNatives = require('../build/release-cli/src/natives/java_io').default();

const FDState = doppio.VM.FDState;
const Long = doppio.VM.Long;
const fd = 12345;
const originalClose = fs.close;
const originalFstat = fs.fstat;
const originalFtruncate = fs.ftruncate;
const originalRead = fs.read;
const originalWrite = fs.write;
let pendingCloses = [];

function makeThread() {
  return {
    returns: [],
    exceptions: [],
    setStatus() {
    },
    asyncReturn(value) {
      this.returns.push(value);
    },
    throwNewException(type, message) {
      this.exceptions.push({type, message});
    },
    throwException(exception) {
      this.exceptions.push(exception);
    }
  };
}

function makeOwner(className) {
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const owner = {};
  owner[`${className}/fd`] = descriptor;
  return {descriptor, owner};
}

let scenarioCount = 0;

function assertReturnedOnce(thread) {
  assert.deepEqual(thread.exceptions, []);
  assert.equal(thread.returns.length, 1);
  return thread.returns[0];
}

function assertIOExceptionOnce(thread, message) {
  assert.deepEqual(thread.returns, []);
  assert.equal(thread.exceptions.length, 1);
  assert.equal(thread.exceptions[0].type, 'Ljava/io/IOException;');
  assert.equal(thread.exceptions[0].message, message);
}

function assertStreamClosedOnce(thread) {
  assertIOExceptionOnce(thread, 'Stream Closed');
}

function closeDescriptor(nativeClass, descriptorOwner) {
  const closeThread = makeThread();
  nativeClass['close0()V'](closeThread, descriptorOwner.owner);
  assert.equal(descriptorOwner.descriptor['java/io/FileDescriptor/fd'], -1);
  assert.deepEqual(closeThread.returns, []);
  assert.deepEqual(closeThread.exceptions, []);
  return closeThread;
}

function completeClose(closeThread, reuse) {
  assert.equal(pendingCloses.length, 1);
  const pendingClose = pendingCloses.shift();
  assert.equal(pendingClose.fd, fd);
  if (reuse) {
    FDState.open(fd, 99, false, 0, '/replacement');
  }
  pendingClose.callback(null);
  assertReturnedOnce(closeThread);
}

function resetState(position, append) {
  FDState.close(fd);
  FDState.open(fd, position, append, 0, '/original');
  pendingCloses = [];
}

function runStaleModes(label, className, position, append, invoke) {
  const natives = javaIoNatives[className];
  [false, true].forEach((reuse) => {
    const descriptorOwner = makeOwner(className);
    const thread = makeThread();
    resetState(position, append);
    const pending = invoke(natives, thread, descriptorOwner.owner);

    const closeThread = closeDescriptor(natives, descriptorOwner);
    assert.equal(pendingCloses.length, 0);
    assert.doesNotThrow(pending.release);
    assertStreamClosedOnce(thread);
    if (pending.verify !== undefined) {
      pending.verify();
    }
    assert.equal(pendingCloses.length, 1);
    if (reuse) {
      completeClose(closeThread, true);
      assert.equal(FDState.getPos(fd), 99);
    } else {
      completeClose(closeThread, false);
      assert.throws(() => FDState.getPos(fd), TypeError);
    }
    scenarioCount += 1;
  });
  return label;
}

function testInputRead() {
  runStaleModes('input-read', 'java/io/FileInputStream', 5, false,
    (natives, thread, owner) => {
      let releaseRead;
      fs.read = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, 5);
        releaseRead = () => {
          buffer[0] = 65;
          callback(null, 1, buffer);
        };
      };
      natives['read0()I'](thread, owner);
      return {release: releaseRead};
    });
}

function testInputReadBytes() {
  runStaleModes('input-read-bytes', 'java/io/FileInputStream', 6, false,
    (natives, thread, owner) => {
      const bytes = {array: [0, 0]};
      let releaseRead;
      fs.read = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, 6);
        releaseRead = () => {
          buffer[0] = 66;
          callback(null, 1, buffer);
        };
      };
      natives['readBytes([BII)I'](thread, owner, bytes, 0, 2);
      return {
        release: releaseRead,
        verify: () => assert.deepEqual(bytes.array, [0, 0])
      };
    });
}

function testInputSkip() {
  runStaleModes('input-skip', 'java/io/FileInputStream', 7, false,
    (natives, thread, owner) => {
      let releaseStat;
      fs.fstat = function(fdArg, callback) {
        assert.equal(fdArg, fd);
        releaseStat = () => callback(null, {size: 20});
      };
      natives['skip(J)J'](thread, owner, Long.fromNumber(2));
      return {release: releaseStat};
    });
}

function testInputAvailable() {
  runStaleModes('input-available', 'java/io/FileInputStream', 8, false,
    (natives, thread, owner) => {
      let releaseStat;
      fs.fstat = function(fdArg, callback) {
        assert.equal(fdArg, fd);
        releaseStat = () => callback(null, {size: 20});
      };
      natives['available()I'](thread, owner);
      return {release: releaseStat};
    });
}

function testOutputAppendWrite() {
  runStaleModes('output-append-write', 'java/io/FileOutputStream', 9, true,
    (natives, thread, owner) => {
      let releaseWrite;
      let fstatCalls = 0;
      fs.write = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, null);
        releaseWrite = () => callback(null, 1, buffer);
      };
      fs.fstat = function() {
        fstatCalls += 1;
      };
      natives['writeBytes([BIIZ)V'](thread, owner, {array: [67]}, 0, 1, 1);
      return {
        release: releaseWrite,
        verify: () => assert.equal(fstatCalls, 0)
      };
    });
}

function testRandomRead() {
  runStaleModes('random-read', 'java/io/RandomAccessFile', 10, false,
    (natives, thread, owner) => {
      let releaseRead;
      fs.read = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, 10);
        releaseRead = () => {
          buffer[0] = 82;
          callback(null, 1, buffer);
        };
      };
      natives['read0()I'](thread, owner);
      return {release: releaseRead};
    });
}

function testRandomReadBytes() {
  runStaleModes('random-read-bytes', 'java/io/RandomAccessFile', 11, false,
    (natives, thread, owner) => {
      const bytes = {array: [0, 0]};
      let releaseRead;
      fs.read = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, 11);
        releaseRead = () => {
          buffer[0] = 83;
          callback(null, 1, buffer);
        };
      };
      natives['readBytes([BII)I'](thread, owner, bytes, 0, 2);
      return {
        release: releaseRead,
        verify: () => assert.deepEqual(bytes.array, [0, 0])
      };
    });
}

function testRandomWrite() {
  runStaleModes('random-write', 'java/io/RandomAccessFile', 12, false,
    (natives, thread, owner) => {
      let releaseWrite;
      fs.write = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, 12);
        releaseWrite = () => callback(null, 1, buffer);
      };
      natives['write0(I)V'](thread, owner, 87);
      return {release: releaseWrite};
    });
}

function testRandomWriteBytes() {
  runStaleModes('random-write-bytes', 'java/io/RandomAccessFile', 13, false,
    (natives, thread, owner) => {
      let releaseWrite;
      fs.write = function(fdArg, buffer, offset, length, position, callback) {
        assert.equal(fdArg, fd);
        assert.equal(position, 13);
        releaseWrite = () => callback(null, 1, buffer);
      };
      natives['writeBytes([BII)V'](thread, owner, {array: [88]}, 0, 1);
      return {release: releaseWrite};
    });
}

function testRandomLength() {
  runStaleModes('random-length', 'java/io/RandomAccessFile', 14, false,
    (natives, thread, owner) => {
      let releaseStat;
      fs.fstat = function(fdArg, callback) {
        assert.equal(fdArg, fd);
        releaseStat = () => callback(null, {size: 20});
      };
      natives['length()J'](thread, owner);
      return {release: releaseStat};
    });
}

function testRandomTruncate() {
  runStaleModes('random-truncate', 'java/io/RandomAccessFile', 15, false,
    (natives, thread, owner) => {
      let releaseTruncate;
      fs.ftruncate = function(fdArg, length, callback) {
        assert.equal(fdArg, fd);
        assert.equal(length, 3);
        releaseTruncate = () => callback(null);
      };
      natives['setLength(J)V'](thread, owner, Long.fromNumber(3));
      return {release: releaseTruncate};
    });
}

function testOutputAppendStat() {
  const natives = javaIoNatives['java/io/FileOutputStream'];
  [false, true].forEach((reuse) => {
    const descriptorOwner = makeOwner('java/io/FileOutputStream');
    const thread = makeThread();
    let releaseWrite;
    let releaseStat;

    resetState(16, true);
    fs.write = function(fdArg, buffer, offset, length, position, callback) {
      assert.equal(fdArg, fd);
      assert.equal(position, null);
      releaseWrite = () => callback(null, 1, buffer);
    };
    fs.fstat = function(fdArg, callback) {
      assert.equal(fdArg, fd);
      releaseStat = () => callback(null, {size: 17});
    };
    natives['writeBytes([BIIZ)V'](
      thread,
      descriptorOwner.owner,
      {array: [89]},
      0,
      1,
      1
    );
    releaseWrite();
    assert.equal(thread.returns.length + thread.exceptions.length, 0);
    assert.equal(FDState.getPos(fd), 17);
    const closeThread = closeDescriptor(natives, descriptorOwner);
    assert.equal(pendingCloses.length, 0);
    assert.doesNotThrow(releaseStat);
    assertStreamClosedOnce(thread);
    assert.equal(pendingCloses.length, 1);
    if (reuse) {
      completeClose(closeThread, true);
      assert.equal(FDState.getPos(fd), 99);
    } else {
      completeClose(closeThread, false);
      assert.throws(() => FDState.getPos(fd), TypeError);
    }
    scenarioCount += 1;
  });
}

function testRandomClosedOperations() {
  const natives = javaIoNatives['java/io/RandomAccessFile'];
  const descriptorOwner = makeOwner('java/io/RandomAccessFile');
  const operations = [
    ['read', (thread) => natives['read0()I'](thread, descriptorOwner.owner)],
    ['read-bytes', (thread) => natives['readBytes([BII)I'](
      thread,
      descriptorOwner.owner,
      {array: [0]},
      0,
      1
    )],
    ['write', (thread) => natives['write0(I)V'](thread, descriptorOwner.owner, 1)],
    ['write-bytes', (thread) => natives['writeBytes([BII)V'](
      thread,
      descriptorOwner.owner,
      {array: [1]},
      0,
      1
    )],
    ['file-pointer', (thread) => natives['getFilePointer()J'](thread, descriptorOwner.owner)],
    ['seek', (thread) => natives['seek0(J)V'](
      thread,
      descriptorOwner.owner,
      Long.fromNumber(0)
    )],
    ['length', (thread) => natives['length()J'](thread, descriptorOwner.owner)]
  ];

  resetState(18, false);
  const closeThread = closeDescriptor(natives, descriptorOwner);
  assert.equal(pendingCloses.length, 1);
  completeClose(closeThread, false);
  fs.read = function() {
    throw new Error('closed RandomAccessFile dispatched read');
  };
  fs.write = function() {
    throw new Error('closed RandomAccessFile dispatched write');
  };
  fs.fstat = function() {
    throw new Error('closed RandomAccessFile dispatched fstat');
  };

  operations.forEach((operation) => {
    const thread = makeThread();
    assert.doesNotThrow(() => operation[1](thread), operation[0]);
    assertIOExceptionOnce(thread, 'Bad file descriptor');
    scenarioCount += 1;
  });
}

fs.close = function(fdArg, callback) {
  assert.equal(fdArg, fd);
  pendingCloses.push({fd: fdArg, callback});
};

try {
  testInputRead();
  testInputReadBytes();
  testInputSkip();
  testInputAvailable();
  testOutputAppendWrite();
  testRandomRead();
  testRandomReadBytes();
  testRandomWrite();
  testRandomWriteBytes();
  testRandomLength();
  testRandomTruncate();
  testOutputAppendStat();
  testRandomClosedOperations();
  console.log(`legacy-fd-generation:${scenarioCount}:ok`);
} finally {
  FDState.close(fd);
  fs.close = originalClose;
  fs.fstat = originalFstat;
  fs.ftruncate = originalFtruncate;
  fs.read = originalRead;
  fs.write = originalWrite;
}
