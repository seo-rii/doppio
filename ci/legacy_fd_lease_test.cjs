'use strict';

const assert = require('assert');
const fs = require('fs');
const originalGetFSModule = fs.getFSModule;
let injectedFSModule = null;
fs.getFSModule = function() {
  if (injectedFSModule !== null) {
    return injectedFSModule;
  }
  return originalGetFSModule === undefined ? null : originalGetFSModule();
};
const doppio = require('../build/release-cli/src/doppiojvm');
const javaIoNatives = require('../build/release-cli/src/natives/java_io').default();

const FDState = doppio.VM.FDState;
const util = doppio.VM.Util;
const originalAreInBrowser = util.are_in_browser;
const originalClose = fs.close;
const originalFstat = fs.fstat;
const originalFsync = fs.fsync;
const originalRead = fs.read;
const originalWrite = fs.write;

let closeCalls = [];
let events = [];
let scenarioCount = 0;

function makeThread(name) {
  return {
    returns: [],
    exceptions: [],
    setStatus() {
    },
    asyncReturn(value) {
      this.returns.push(value);
      events.push(`${name}:return`);
    },
    throwNewException(type, message) {
      this.exceptions.push({type, message});
      events.push(`${name}:exception:${type}:${message}`);
    },
    throwException(exception) {
      this.exceptions.push(exception);
      events.push(`${name}:exception-object`);
    }
  };
}

function makeOwner(className, fd) {
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const owner = {};
  owner[`${className}/fd`] = descriptor;
  return {descriptor, owner};
}

function resetScenario(fd, position, append, filePath) {
  FDState.close(fd);
  FDState.open(fd, position, append, 0, filePath);
  closeCalls = [];
  events = [];
}

function assertNoCompletion(thread) {
  assert.deepEqual(thread.returns, []);
  assert.deepEqual(thread.exceptions, []);
}

function assertReturnedOnce(thread) {
  assert.deepEqual(thread.exceptions, []);
  assert.equal(thread.returns.length, 1);
  return thread.returns[0];
}

function assertExceptionOnce(thread, type, message) {
  assert.deepEqual(thread.returns, []);
  assert.equal(thread.exceptions.length, 1);
  assert.equal(thread.exceptions[0].type, type);
  assert.equal(thread.exceptions[0].message, message);
}

function requestClose(nativeClass, descriptorOwner) {
  const closeThread = makeThread('close');
  nativeClass['close0()V'](closeThread, descriptorOwner.owner);
  assert.equal(descriptorOwner.descriptor['java/io/FileDescriptor/fd'], -1);
  assertNoCompletion(closeThread);
  return closeThread;
}

function completeClose(closeThread, error, replacementPosition, fd) {
  assert.equal(closeCalls.length, 1);
  const closeCall = closeCalls.shift();
  assert.equal(closeCall.fd, fd);
  if (replacementPosition !== null) {
    FDState.open(fd, replacementPosition, false, 0, '/replacement');
  }
  closeCall.callback(error);
  if (error) {
    assertExceptionOnce(closeThread, 'Ljava/io/IOException;', error.message);
  } else {
    assertReturnedOnce(closeThread);
  }
  if (replacementPosition !== null) {
    assert.equal(FDState.getPos(fd), replacementPosition);
  }
}

function assertBefore(first, second) {
  const firstIndex = events.indexOf(first);
  const secondIndex = events.indexOf(second);
  assert.notEqual(firstIndex, -1, first);
  assert.notEqual(secondIndex, -1, second);
  assert(firstIndex < secondIndex, `${first} must precede ${second}`);
}

function testMultipleMixedReuse() {
  const fd = 12351;
  const natives = javaIoNatives['java/io/FileInputStream'];
  const descriptorOwner = makeOwner('java/io/FileInputStream', fd);
  const firstThread = makeThread('first-read');
  const secondThread = makeThread('second-read');
  const readCalls = [];

  resetScenario(fd, 5, false, '/multiple');
  fs.read = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    assert.equal(position, 5);
    readCalls.push({buffer, callback});
  };

  natives['read0()I'](firstThread, descriptorOwner.owner);
  natives['read0()I'](secondThread, descriptorOwner.owner);
  assert.equal(readCalls.length, 2);
  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 0);
  assert.throws(
    () => FDState.open(fd, 99, false, 0, '/premature-replacement'),
    /already registered/
  );

  const secondCloseThread = makeThread('second-close');
  assert.doesNotThrow(() => natives['close0()V'](
    secondCloseThread,
    descriptorOwner.owner
  ));
  assertNoCompletion(secondCloseThread);
  assert.equal(closeCalls.length, 0);

  readCalls[0].buffer[0] = 65;
  readCalls[0].callback(null, 1, readCalls[0].buffer);
  assertExceptionOnce(
    firstThread,
    'Ljava/io/IOException;',
    'Stream Closed'
  );
  assert.equal(closeCalls.length, 0);

  const readError = new Error('injected pending read failure');
  readError.code = 'EIO';
  readCalls[1].callback(readError);
  assertExceptionOnce(
    secondThread,
    'Ljava/io/IOException;',
    'injected pending read failure'
  );
  assert.equal(closeCalls.length, 1);
  assertBefore(
    'second-read:exception:Ljava/io/IOException;:injected pending read failure',
    `host-close:${fd}`
  );
  assert.throws(() => FDState.getPos(fd), TypeError);

  completeClose(closeThread, null, 99, fd);
  FDState.close(fd);
  scenarioCount += 1;
}

function testAppendInnerStat() {
  const fd = 12352;
  const natives = javaIoNatives['java/io/FileOutputStream'];
  const descriptorOwner = makeOwner('java/io/FileOutputStream', fd);
  const writeThread = makeThread('append-write');
  let releaseWrite;
  let releaseStat;

  resetScenario(fd, 16, true, '/append');
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
    writeThread,
    descriptorOwner.owner,
    {array: [66]},
    0,
    1,
    1
  );
  releaseWrite();
  assertNoCompletion(writeThread);
  assert.equal(FDState.getPos(fd), 17);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 0);
  releaseStat();
  assertReturnedOnce(writeThread);
  assert.equal(closeCalls.length, 1);
  assertBefore(
    'append-write:return',
    `host-close:${fd}`
  );
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testAppendStatDispatchThrow() {
  const fd = 12364;
  const natives = javaIoNatives['java/io/FileOutputStream'];
  const descriptorOwner = makeOwner('java/io/FileOutputStream', fd);
  const writeThread = makeThread('append-stat-throw');
  const statError = new Error('injected synchronous append fstat failure');
  statError.code = 'EIO';

  resetScenario(fd, 4, true, '/append-stat-throw');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    assert.equal(position, null);
    callback(null, 1, buffer);
  };
  fs.fstat = function(fdArg) {
    assert.equal(fdArg, fd);
    throw statError;
  };

  assert.doesNotThrow(() => natives['writeBytes([BIIZ)V'](
    writeThread,
    descriptorOwner.owner,
    {array: [67]},
    0,
    1,
    1
  ));
  assertReturnedOnce(writeThread);
  assert.equal(FDState.getPos(fd), 5);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testDelayedCloseError() {
  const fd = 12353;
  const natives = javaIoNatives['java/io/RandomAccessFile'];
  const descriptorOwner = makeOwner('java/io/RandomAccessFile', fd);
  const writeThread = makeThread('random-write');
  let releaseWrite;

  resetScenario(fd, 8, false, '/close-error');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    assert.equal(position, 8);
    assert.equal(buffer[0], 255);
    releaseWrite = () => callback(null, 1, buffer);
  };

  assert.doesNotThrow(() => natives['write0(I)V'](
    writeThread,
    descriptorOwner.owner,
    255
  ));
  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 0);
  releaseWrite();
  assertExceptionOnce(
    writeThread,
    'Ljava/io/IOException;',
    'Stream Closed'
  );
  assert.equal(closeCalls.length, 1);

  const closeError = new Error('injected delayed close failure');
  closeError.code = 'EIO';
  completeClose(closeThread, closeError, null, fd);
  scenarioCount += 1;
}

function testSyncLease() {
  const fd = 12354;
  const descriptorOwner = makeOwner('java/io/FileInputStream', fd);
  const descriptorNatives = javaIoNatives['java/io/FileDescriptor'];
  const inputNatives = javaIoNatives['java/io/FileInputStream'];
  const syncThread = makeThread('sync');
  let releaseSync;

  resetScenario(fd, 0, false, '/sync');
  fs.fsync = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    releaseSync = () => callback(null);
  };

  descriptorNatives['sync()V'](
    syncThread,
    descriptorOwner.descriptor
  );
  const closeThread = requestClose(inputNatives, descriptorOwner);
  assert.equal(closeCalls.length, 0);
  releaseSync();
  assertExceptionOnce(
    syncThread,
    'Ljava/io/SyncFailedException;',
    'Stream Closed'
  );
  assert.equal(closeCalls.length, 1);
  assertBefore(
    'sync:exception:Ljava/io/SyncFailedException;:Stream Closed',
    `host-close:${fd}`
  );
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testBrowserUnlinkedDrainSnapshot() {
  const fd = 12355;
  const filePath = '/browser-unlinked';
  const natives = javaIoNatives['java/io/FileInputStream'];
  const descriptorOwner = makeOwner('java/io/FileInputStream', fd);
  const readThread = makeThread('browser-read');
  let releaseRead;
  let closeFdCalls = 0;

  resetScenario(fd, 0, false, filePath);
  util.are_in_browser = () => true;
  injectedFSModule = {
    closeFd(fdArg) {
      assert.equal(fdArg, fd);
      closeFdCalls += 1;
      events.push(`browser-close:${fd}`);
    }
  };
  fs.read = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    releaseRead = () => callback(null, 0, buffer);
  };

  natives['read0()I'](readThread, descriptorOwner.owner);
  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeFdCalls, 0);
  assert.equal(closeCalls.length, 0);
  FDState.markUnlinked(filePath);
  releaseRead();
  assertExceptionOnce(
    readThread,
    'Ljava/io/IOException;',
    'Stream Closed'
  );
  assert.equal(closeFdCalls, 1);
  assert.equal(closeCalls.length, 0);
  assertReturnedOnce(closeThread);
  assertBefore(
    'browser-read:exception:Ljava/io/IOException;:Stream Closed',
    `browser-close:${fd}`
  );
  assertBefore(`browser-close:${fd}`, 'close:return');
  scenarioCount += 1;

  util.are_in_browser = originalAreInBrowser;
  injectedFSModule = null;
}

function testSyncDispatchThrowReleasesLease() {
  const fd = 12356;
  const descriptorOwner = makeOwner('java/io/FileInputStream', fd);
  const descriptorNatives = javaIoNatives['java/io/FileDescriptor'];
  const inputNatives = javaIoNatives['java/io/FileInputStream'];
  const syncThread = makeThread('sync-throw');
  const syncError = new Error('injected synchronous sync failure');
  syncError.code = 'EIO';

  resetScenario(fd, 0, false, '/sync-throw');
  fs.fsync = function() {
    throw syncError;
  };
  assert.doesNotThrow(() => descriptorNatives['sync()V'](
    syncThread,
    descriptorOwner.descriptor
  ));
  assertExceptionOnce(
    syncThread,
    'Ljava/io/SyncFailedException;',
    'injected synchronous sync failure'
  );

  const closeThread = requestClose(inputNatives, descriptorOwner);
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testDuplicateCallbackIsIgnored() {
  const fd = 12357;
  const natives = javaIoNatives['java/io/FileInputStream'];
  const descriptorOwner = makeOwner('java/io/FileInputStream', fd);
  const readThread = makeThread('duplicate-read');
  let readCall;

  resetScenario(fd, 0, false, '/duplicate');
  fs.read = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    readCall = {buffer, callback};
  };
  natives['read0()I'](readThread, descriptorOwner.owner);
  readCall.buffer[0] = 68;
  readCall.callback(null, 1, readCall.buffer);
  readCall.callback(null, 1, readCall.buffer);
  assertReturnedOnce(readThread);
  assert.equal(readThread.returns[0], 68);
  assert.equal(FDState.getPos(fd), 1);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testInvalidBulkWriteProgress() {
  const scenarios = [
    {
      fd: 12358,
      className: 'java/io/FileOutputStream',
      progress: 0,
      invoke(natives, thread, owner) {
        natives['writeBytes([BIIZ)V'](
          thread,
          owner,
          {array: [65, 66, 67]},
          0,
          3,
          0
        );
      }
    },
    {
      fd: 12359,
      className: 'java/io/RandomAccessFile',
      progress: -1,
      invoke(natives, thread, owner) {
        natives['writeBytes([BII)V'](
          thread,
          owner,
          {array: [68, 69, 70]},
          0,
          3
        );
      }
    },
    {
      fd: 12360,
      className: 'java/io/FileOutputStream',
      progress: 4,
      invoke(natives, thread, owner) {
        natives['writeBytes([BIIZ)V'](
          thread,
          owner,
          {array: [71, 72, 73]},
          0,
          3,
          0
        );
      }
    }
  ];

  scenarios.forEach((scenario) => {
    const natives = javaIoNatives[scenario.className];
    const descriptorOwner = makeOwner(scenario.className, scenario.fd);
    const writeThread = makeThread(`invalid-write-${scenario.fd}`);
    let writeCallback;

    resetScenario(scenario.fd, 7, false, `/invalid-write-${scenario.fd}`);
    fs.write = function(fdArg, buffer, offset, length, position, callback) {
      assert.equal(fdArg, scenario.fd);
      assert.equal(offset, 0);
      assert.equal(length, 3);
      assert.equal(position, 7);
      writeCallback = callback;
    };

    scenario.invoke(natives, writeThread, descriptorOwner.owner);
    writeCallback(null, scenario.progress);
    assertExceptionOnce(
      writeThread,
      'Ljava/io/IOException;',
      'Invalid host write length.'
    );
    assert.equal(FDState.getPos(scenario.fd), 7);

    const closeThread = requestClose(natives, descriptorOwner);
    assert.equal(closeCalls.length, 1);
    writeCallback(null, scenario.progress);
    assertExceptionOnce(
      writeThread,
      'Ljava/io/IOException;',
      'Invalid host write length.'
    );
    assert.equal(closeCalls.length, 1);
    completeClose(closeThread, null, null, scenario.fd);
    scenarioCount += 1;
  });
}

function testOutputShortWritesFinishBeforeAppendStat() {
  const fd = 12361;
  const natives = javaIoNatives['java/io/FileOutputStream'];
  const descriptorOwner = makeOwner('java/io/FileOutputStream', fd);
  const writeThread = makeThread('short-append-write');
  const writeCalls = [];
  let statCalls = 0;
  let releaseStat;

  resetScenario(fd, 10, true, '/short-append-write');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    assert.equal(position, null);
    writeCalls.push({buffer, offset, length, callback});
  };
  fs.fstat = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    statCalls += 1;
    releaseStat = () => callback(null, {size: 19});
  };

  natives['writeBytes([BIIZ)V'](
    writeThread,
    descriptorOwner.owner,
    {array: [80, 81, 82, 83]},
    0,
    4,
    1
  );
  assert.equal(writeCalls.length, 1);
  assert.equal(writeCalls[0].offset, 0);
  assert.equal(writeCalls[0].length, 4);
  writeCalls[0].callback(null, 2);
  assertNoCompletion(writeThread);
  assert.equal(FDState.getPos(fd), 12);
  assert.equal(statCalls, 0);
  assert.equal(writeCalls.length, 2);
  assert.equal(writeCalls[1].offset, 2);
  assert.equal(writeCalls[1].length, 2);
  writeCalls[0].callback(null, 2);
  assert.equal(writeCalls.length, 2);
  assert.equal(FDState.getPos(fd), 12);
  assert.equal(statCalls, 0);

  writeCalls[1].callback(null, 2);
  assertNoCompletion(writeThread);
  assert.equal(FDState.getPos(fd), 14);
  assert.equal(statCalls, 1);
  releaseStat();
  assertReturnedOnce(writeThread);
  assert.equal(FDState.getPos(fd), 19);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testRandomAccessShortWrites() {
  const fd = 12362;
  const natives = javaIoNatives['java/io/RandomAccessFile'];
  const descriptorOwner = makeOwner('java/io/RandomAccessFile', fd);
  const writeThread = makeThread('short-random-write');
  const writeCalls = [];

  resetScenario(fd, 20, false, '/short-random-write');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    writeCalls.push({buffer, offset, length, position, callback});
  };

  natives['writeBytes([BII)V'](
    writeThread,
    descriptorOwner.owner,
    {array: [84, 85, 86, 87]},
    0,
    4
  );
  assert.equal(writeCalls.length, 1);
  assert.equal(writeCalls[0].offset, 0);
  assert.equal(writeCalls[0].length, 4);
  assert.equal(writeCalls[0].position, 20);
  writeCalls[0].callback(null, 1);
  assertNoCompletion(writeThread);
  assert.equal(FDState.getPos(fd), 21);
  assert.equal(writeCalls.length, 2);
  assert.equal(writeCalls[1].offset, 1);
  assert.equal(writeCalls[1].length, 3);
  assert.equal(writeCalls[1].position, 21);
  writeCalls[0].callback(null, 1);
  assert.equal(writeCalls.length, 2);
  assert.equal(FDState.getPos(fd), 21);

  writeCalls[1].callback(null, 3);
  assertReturnedOnce(writeThread);
  assert.equal(FDState.getPos(fd), 24);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, null, fd);
  scenarioCount += 1;
}

function testShortWriteLeaseFencesClose() {
  const fd = 12363;
  const natives = javaIoNatives['java/io/RandomAccessFile'];
  const descriptorOwner = makeOwner('java/io/RandomAccessFile', fd);
  const writeThread = makeThread('short-write-close');
  const writeCalls = [];

  resetScenario(fd, 30, false, '/short-write-close');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    writeCalls.push({offset, length, position, callback});
  };

  natives['writeBytes([BII)V'](
    writeThread,
    descriptorOwner.owner,
    {array: [88, 89]},
    0,
    2
  );
  writeCalls[0].callback(null, 1);
  assert.equal(FDState.getPos(fd), 31);
  assert.equal(writeCalls.length, 2);
  assertNoCompletion(writeThread);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 0);
  writeCalls[1].callback(null, 1);
  assertExceptionOnce(
    writeThread,
    'Ljava/io/IOException;',
    'Stream Closed'
  );
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, 99, fd);
  writeCalls[1].callback(null, 1);
  assert.equal(FDState.getPos(fd), 99);
  FDState.close(fd);
  scenarioCount += 1;
}

async function testSynchronousShortWritesRemainStackSafe() {
  const fd = 12400;
  const initialPosition = 40;
  const byteCount = 20000;
  const natives = javaIoNatives['java/io/RandomAccessFile'];
  const descriptorOwner = makeOwner('java/io/RandomAccessFile', fd);
  const writeThread = makeThread('synchronous-short-write');
  let writeCalls = 0;
  let resolveCompletion;
  const completion = new Promise((resolve) => {
    resolveCompletion = resolve;
  });
  const originalAsyncReturn = writeThread.asyncReturn;
  const originalThrowNewException = writeThread.throwNewException;

  writeThread.asyncReturn = function(value) {
    originalAsyncReturn.call(this, value);
    resolveCompletion();
  };
  writeThread.throwNewException = function(type, message) {
    originalThrowNewException.call(this, type, message);
    resolveCompletion();
  };

  resetScenario(fd, initialPosition, false, '/synchronous-short-write');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, fd);
    assert.equal(offset, writeCalls);
    assert.equal(length, byteCount - writeCalls);
    assert.equal(position, initialPosition + writeCalls);
    writeCalls += 1;
    callback(null, 1);
  };

  natives['writeBytes([BII)V'](
    writeThread,
    descriptorOwner.owner,
    {array: new Array(byteCount).fill(65)},
    0,
    byteCount
  );
  let timeout;
  try {
    await Promise.race([
      completion,
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(
          'Synchronous short writes did not complete.'
        )), 10000);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }

  assertReturnedOnce(writeThread);
  assert.equal(writeCalls, byteCount);
  assert.equal(FDState.getPos(fd), initialPosition + byteCount);

  const closeThread = requestClose(natives, descriptorOwner);
  assert.equal(closeCalls.length, 1);
  completeClose(closeThread, null, null, fd);

  const closeFenceFd = 12401;
  const closeFenceOwner = makeOwner(
    'java/io/RandomAccessFile',
    closeFenceFd
  );
  const closeFenceWriteThread = makeThread(
    'synchronous-short-write-close'
  );
  let closeFenceWriteCalls = 0;

  resetScenario(
    closeFenceFd,
    70,
    false,
    '/synchronous-short-write-close'
  );
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, closeFenceFd);
    closeFenceWriteCalls += 1;
    callback(null, 1);
  };
  natives['writeBytes([BII)V'](
    closeFenceWriteThread,
    closeFenceOwner.owner,
    {array: [66, 67, 68]},
    0,
    3
  );
  assert.equal(closeFenceWriteCalls, 1);
  const closeFenceCloseThread = requestClose(natives, closeFenceOwner);
  assert.equal(closeCalls.length, 0);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(closeFenceWriteCalls, 1);
  assertExceptionOnce(
    closeFenceWriteThread,
    'Ljava/io/IOException;',
    'Stream Closed'
  );
  assert.equal(closeCalls.length, 1);
  completeClose(
    closeFenceCloseThread,
    null,
    null,
    closeFenceFd
  );
  scenarioCount += 1;
}

fs.close = function(fdArg, callback) {
  events.push(`host-close:${fdArg}`);
  closeCalls.push({fd: fdArg, callback});
};

async function main() {
  try {
    testMultipleMixedReuse();
    testAppendInnerStat();
    testAppendStatDispatchThrow();
    testDelayedCloseError();
    testSyncLease();
    testBrowserUnlinkedDrainSnapshot();
    testSyncDispatchThrowReleasesLease();
    testDuplicateCallbackIsIgnored();
    testInvalidBulkWriteProgress();
    testOutputShortWritesFinishBeforeAppendStat();
    testRandomAccessShortWrites();
    testShortWriteLeaseFencesClose();
    await testSynchronousShortWritesRemainStackSafe();
    console.log(`legacy-fd-leases:${scenarioCount}:ok`);
  } finally {
    [
      12351, 12352, 12353, 12354, 12355, 12356,
      12357, 12358, 12359, 12360, 12361, 12362, 12363, 12364,
      12400, 12401
    ].forEach((fd) => {
      FDState.close(fd);
    });
    util.are_in_browser = originalAreInBrowser;
    fs.close = originalClose;
    fs.fstat = originalFstat;
    fs.fsync = originalFsync;
    if (originalGetFSModule === undefined) {
      delete fs.getFSModule;
    } else {
      fs.getFSModule = originalGetFSModule;
    }
    fs.read = originalRead;
    fs.write = originalWrite;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
