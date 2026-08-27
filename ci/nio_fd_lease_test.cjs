'use strict';

const assert = require('assert');
const fs = require('fs');
const doppio = require('../build/release-cli/src/doppiojvm');
const nioNatives = require('../build/release-cli/src/natives/sun_nio').default();

const FDState = doppio.VM.FDState;
const Long = doppio.VM.Long;
const dispatcher = nioNatives['sun/nio/ch/FileDispatcherImpl'];
const fd = 12361;
const appendFd = 12362;
const syncFd = 12363;
const statThrowFd = 12364;
const fsyncFd = 12365;
const fdatasyncFd = 12366;
const descriptor = {'java/io/FileDescriptor/fd': fd};
const originalClose = fs.close;
const originalFdatasync = fs.fdatasync;
const originalFstat = fs.fstat;
const originalFsync = fs.fsync;
const originalWrite = fs.write;
const events = [];
const closeCalls = [];
let fstatCallback = null;

function makeThread(name) {
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
              return Buffer.alloc(length);
            }
          };
        }
      };
    },
    asyncReturn(value) {
      this.returns.push(value);
      events.push(`${name}:return`);
    },
    throwNewException(type, message) {
      this.exceptions.push({type, message});
      events.push(`${name}:exception`);
    }
  };
}

function assertPending(thread) {
  assert.deepEqual(thread.returns, []);
  assert.deepEqual(thread.exceptions, []);
}

try {
  FDState.open(fd, 0, false, 0, '/nio-lease');
  fs.fstat = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    assert.equal(fstatCallback, null);
    fstatCallback = callback;
  };
  fs.close = function(fdArg, callback) {
    assert.equal(fdArg, fd);
    events.push('host-close');
    closeCalls.push(callback);
  };

  const sizeThread = makeThread('size');
  const closeThread = makeThread('close');
  dispatcher['size0(Ljava/io/FileDescriptor;)J'](
    sizeThread,
    descriptor
  );
  assert.equal(typeof fstatCallback, 'function');
  assertPending(sizeThread);

  dispatcher['close0(Ljava/io/FileDescriptor;)V'](
    closeThread,
    descriptor
  );
  assert.equal(descriptor['java/io/FileDescriptor/fd'], -1);
  assertPending(sizeThread);
  assertPending(closeThread);
  assert.equal(closeCalls.length, 0);
  assert.throws(
    () => FDState.open(fd, 99, false, 0, '/premature-replacement'),
    /already registered/
  );

  fstatCallback(null, {size: 23});
  assert.deepEqual(sizeThread.returns, []);
  assert.deepEqual(sizeThread.exceptions, [{
    type: 'Ljava/io/IOException;',
    message: 'Stream Closed'
  }]);
  assertPending(closeThread);
  assert.equal(closeCalls.length, 1);
  assert.deepEqual(events, ['size:exception', 'host-close']);

  closeCalls[0](null);
  assert.deepEqual(closeThread.exceptions, []);
  assert.equal(closeThread.returns.length, 1);
  assert.deepEqual(events, ['size:exception', 'host-close', 'close:return']);

  const appendDescriptor = {'java/io/FileDescriptor/fd': appendFd};
  const appendWriteThread = makeThread('append-write');
  const appendCloseThread = makeThread('append-close');
  const appendCloseCalls = [];
  let writeCallback = null;
  let appendFstatCallback = null;
  FDState.open(appendFd, 5, true, 0, '/nio-append-lease');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, appendFd);
    assert.equal(position, null);
    assert.equal(writeCallback, null);
    writeCallback = callback;
  };
  fs.fstat = function(fdArg, callback) {
    assert.equal(fdArg, appendFd);
    assert.equal(appendFstatCallback, null);
    appendFstatCallback = callback;
  };
  fs.close = function(fdArg, callback) {
    assert.equal(fdArg, appendFd);
    events.push('append-host-close');
    appendCloseCalls.push(callback);
  };

  dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
    appendWriteThread,
    appendDescriptor,
    Long.ZERO,
    1
  );
  assert.equal(typeof writeCallback, 'function');
  writeCallback(null, 1);
  assert.equal(typeof appendFstatCallback, 'function');
  assertPending(appendWriteThread);

  dispatcher['close0(Ljava/io/FileDescriptor;)V'](
    appendCloseThread,
    appendDescriptor
  );
  assert.equal(appendDescriptor['java/io/FileDescriptor/fd'], -1);
  assertPending(appendWriteThread);
  assertPending(appendCloseThread);
  assert.equal(appendCloseCalls.length, 0);

  appendFstatCallback(null, {size: 6});
  assert.deepEqual(appendWriteThread.returns, [1]);
  assert.deepEqual(appendWriteThread.exceptions, []);
  assert.equal(appendCloseCalls.length, 1);
  assert.doesNotThrow(() => appendFstatCallback(null, {size: 6}));
  assert.equal(appendWriteThread.returns.length, 1);
  assert.equal(appendCloseCalls.length, 1);
  assert.deepEqual(events.slice(-2), [
    'append-write:return',
    'append-host-close'
  ]);

  appendCloseCalls[0](null);
  assert.deepEqual(appendCloseThread.exceptions, []);
  assert.equal(appendCloseThread.returns.length, 1);
  assert.deepEqual(events.slice(-3), [
    'append-write:return',
    'append-host-close',
    'append-close:return'
  ]);

  const syncDescriptor = {'java/io/FileDescriptor/fd': syncFd};
  const syncWriteThread = makeThread('sync-write');
  const completionError = new Error('synchronous completion sentinel');
  let drained = 0;
  FDState.open(syncFd, 0, false, 0, '/nio-sync-callback');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, syncFd);
    assert.equal(position, 0);
    callback(null, 1);
  };
  syncWriteThread.asyncReturn = function() {
    throw completionError;
  };
  assert.throws(
    () => dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
      syncWriteThread,
      syncDescriptor,
      Long.ZERO,
      1
    ),
    (err) => err === completionError
  );
  assert.equal(FDState.getPos(syncFd), 1);
  assert.equal(FDState.requestClose(syncFd, () => {
    drained += 1;
  }), true);
  assert.equal(drained, 1);

  const statThrowDescriptor = {'java/io/FileDescriptor/fd': statThrowFd};
  const statThrowThread = makeThread('append-stat-throw');
  const statError = new Error('injected synchronous append fstat failure');
  statError.code = 'EIO';
  FDState.open(statThrowFd, 0, true, 0, '/nio-append-stat-throw');
  fs.write = function(fdArg, buffer, offset, length, position, callback) {
    assert.equal(fdArg, statThrowFd);
    assert.equal(position, null);
    callback(null, 1);
  };
  fs.fstat = function(fdArg) {
    assert.equal(fdArg, statThrowFd);
    throw statError;
  };
  assert.doesNotThrow(() => dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
    statThrowThread,
    statThrowDescriptor,
    Long.ZERO,
    1
  ));
  assert.deepEqual(statThrowThread.returns, [1]);
  assert.deepEqual(statThrowThread.exceptions, []);
  assert.equal(FDState.getPos(statThrowFd), 1);
  let statThrowDrained = 0;
  assert.equal(FDState.requestClose(statThrowFd, () => {
    statThrowDrained += 1;
  }), true);
  assert.equal(statThrowDrained, 1);

  for (const syncCase of [
    {fd: fsyncFd, mode: 1, method: 'fsync'},
    {fd: fdatasyncFd, mode: 2, method: 'fdatasync'}
  ]) {
    const syncFailureDescriptor = {'java/io/FileDescriptor/fd': syncCase.fd};
    const syncFailureThread = makeThread(`append-${syncCase.method}-failure`);
    const metadataError = new Error('injected append metadata failure');
    metadataError.code = 'EIO';
    const durabilityError = new Error(`injected ${syncCase.method} failure`);
    durabilityError.code = 'EIO';
    FDState.open(
      syncCase.fd,
      0,
      true,
      syncCase.mode,
      `/nio-append-${syncCase.method}-failure`
    );
    fs.write = function(fdArg, buffer, offset, length, position, callback) {
      assert.equal(fdArg, syncCase.fd);
      assert.equal(position, null);
      callback(null, 1);
    };
    fs.fstat = function(fdArg, callback) {
      assert.equal(fdArg, syncCase.fd);
      callback(metadataError);
    };
    fs.fsync = function(fdArg, callback) {
      assert.equal(syncCase.method, 'fsync');
      assert.equal(fdArg, syncCase.fd);
      callback(durabilityError);
    };
    fs.fdatasync = function(fdArg, callback) {
      assert.equal(syncCase.method, 'fdatasync');
      assert.equal(fdArg, syncCase.fd);
      callback(durabilityError);
    };
    dispatcher['write0(Ljava/io/FileDescriptor;JI)I'](
      syncFailureThread,
      syncFailureDescriptor,
      Long.ZERO,
      1
    );
    assert.deepEqual(syncFailureThread.returns, []);
    assert.deepEqual(syncFailureThread.exceptions, [{
      type: 'Ljava/io/IOException;',
      message: durabilityError.message
    }]);
    assert.equal(FDState.getPos(syncCase.fd), 1);
    let syncFailureDrained = 0;
    assert.equal(FDState.requestClose(syncCase.fd, () => {
      syncFailureDrained += 1;
    }), true);
    assert.equal(syncFailureDrained, 1);
  }

  console.log('nio-fd-leases:6:ok');
} finally {
  fs.close = originalClose;
  fs.fdatasync = originalFdatasync;
  fs.fstat = originalFstat;
  fs.fsync = originalFsync;
  fs.write = originalWrite;
  FDState.close(fd);
  FDState.close(appendFd);
  FDState.close(syncFd);
  FDState.close(statThrowFd);
  FDState.close(fsyncFd);
  FDState.close(fdatasyncFd);
}
