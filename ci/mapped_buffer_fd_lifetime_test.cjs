'use strict';

const assert = require('assert');
const fs = require('fs');
const doppio = require('../build/release-cli/src/doppiojvm');
const createSunNatives = require('../build/release-cli/src/natives/sun_nio').default;
const sunNatives = createSunNatives();
const nioNatives = require('../build/release-cli/src/natives/java_nio').default();
const ioNatives = require('../build/release-cli/src/natives/java_io').default();

const FDState = doppio.VM.FDState;
const Long = doppio.VM.Long;
const Heap = require('../build/release-cli/src/heap').default;
const fileChannel = sunNatives['sun/nio/ch/FileChannelImpl'];
const fileDispatcher = sunNatives['sun/nio/ch/FileDispatcherImpl'];
const mappedByteBuffer = nioNatives['java/nio/MappedByteBuffer'];
const randomAccessFile = ioNatives['java/io/RandomAccessFile'];
const originalFs = {
  close: fs.close,
  fsync: fs.fsync,
  read: fs.read,
  write: fs.write
};
const openedFds = [];

function openState(fd) {
  FDState.open(fd, 0, false, 0, `/mapped-lifetime-${fd}`);
  openedFds.push(fd);
}

function makeHeap(baseAddress) {
  const alignedAddress = Math.max(4096, Math.ceil(baseAddress / 4096) * 4096);
  const storage = Buffer.alloc(64);
  const frees = [];
  return {
    alignedAddress,
    storage,
    frees,
    malloc(size) {
      assert(size >= 4097);
      return baseAddress;
    },
    get_buffer(address, length) {
      const offset = address - alignedAddress;
      assert(offset >= 0);
      assert(offset + length <= storage.length);
      return storage.slice(offset, offset + length);
    },
    free(address) {
      assert.equal(address, baseAddress);
      frees.push(address);
    }
  };
}

function makeThread(name, heap, events) {
  return {
    returns: [],
    exceptions: [],
    setStatus() {
    },
    getJVM() {
      return {getHeap: () => heap};
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

function completeRead(call, text, count) {
  if (text !== null) {
    call.buffer.write(text, call.offset, 'utf8');
  }
  call.callback(null, count);
}

function mapWritable(fd, heap, events, readCalls, channelNative = fileChannel) {
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread('map', heap, events);
  const channel = {'sun/nio/ch/FileChannelImpl/fd': descriptor};
  channelNative['map0(IJJ)J'](
    thread,
    channel,
    1,
    Long.ZERO,
    Long.fromNumber(4)
  );
  assert.equal(readCalls.length, 1);
  completeRead(readCalls[0], 'ab', 2);
  assert.equal(readCalls.length, 2);
  assert.equal(readCalls[1].position, 2);
  assert.equal(readCalls[1].offset, 2);
  completeRead(readCalls[1], 'cd', 2);
  assert.equal(thread.exceptions.length, 0);
  assert.equal(thread.returns.length, 1);
  assert.equal(thread.returns[0].toNumber(), heap.alignedAddress);
  assert.equal(heap.storage.slice(0, 4).toString(), 'abcd');
  return {descriptor, address: heap.alignedAddress};
}

function testWritableRetention() {
  const fd = 12500;
  const events = [];
  const heap = makeHeap(4097);
  const readCalls = [];
  const writeCalls = [];
  const syncCalls = [];
  const hostCloseCalls = [];
  openState(fd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    readCalls.push({buffer, offset, length, position, callback});
  };
  fs.write = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    writeCalls.push({
      buffer,
      offset,
      length,
      position,
      callback,
      bytes: Buffer.from(buffer.slice(offset, offset + length)).toString()
    });
  };
  fs.fsync = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    syncCalls.push(callback);
  };
  fs.close = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    events.push('host-close');
    hostCloseCalls.push(callback);
  };

  const mapping = mapWritable(fd, heap, events, readCalls);
  heap.storage.write('WXYZ', 0, 'utf8');
  const firstForceThread = makeThread('force-one', heap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    firstForceThread,
    {},
    mapping.descriptor,
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  assert.equal(writeCalls.length, 1);
  assert.equal(writeCalls[0].offset, 0);
  assert.equal(writeCalls[0].position, 0);
  assert.equal(writeCalls[0].bytes, 'WXYZ');

  const closeThread = makeThread('close', heap, events);
  fileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
    closeThread,
    mapping.descriptor
  );
  assert.equal(mapping.descriptor['java/io/FileDescriptor/fd'], -1);
  assert.equal(closeThread.returns.length, 1);
  assert.equal(hostCloseCalls.length, 0);
  assert.throws(
    () => FDState.open(fd, 99, false, 0, '/premature-replacement'),
    /already registered/
  );

  const firstWriteCallback = writeCalls[0].callback;
  firstWriteCallback(null, 2);
  assert.equal(writeCalls.length, 2);
  assert.equal(writeCalls[1].offset, 2);
  assert.equal(writeCalls[1].length, 2);
  assert.equal(writeCalls[1].position, 2);
  assert.equal(writeCalls[1].bytes, 'YZ');
  firstWriteCallback(null, 2);
  assert.equal(writeCalls.length, 2);
  writeCalls[1].callback(null, 2);
  assert.equal(syncCalls.length, 1);
  syncCalls[0](null);
  assert.equal(firstForceThread.returns.length, 1);
  assert.equal(hostCloseCalls.length, 0);

  heap.storage.write('QRST', 0, 'utf8');
  const secondForceThread = makeThread('force-two', heap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    secondForceThread,
    {},
    mapping.descriptor,
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  assert.equal(writeCalls.length, 3);
  assert.equal(writeCalls[2].bytes, 'QRST');
  const secondWriteCallback = writeCalls[2].callback;
  fileChannel['unmap0(JJ)I'](
    makeThread('unmap', heap, events),
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  assert.equal(heap.frees.length, 0);
  assert.equal(hostCloseCalls.length, 0);

  secondWriteCallback(null, 4);
  assert.equal(syncCalls.length, 2);
  const secondSyncCallback = syncCalls[1];
  secondSyncCallback(null);
  assert.equal(secondForceThread.returns.length, 1);
  assert.equal(heap.frees.length, 1);
  assert.equal(hostCloseCalls.length, 1);
  assert.deepEqual(events.slice(-2), ['force-two:return', 'host-close']);

  hostCloseCalls[0](null);
  assert.equal(closeThread.returns.length, 1);
  FDState.open(fd, 99, false, 0, '/replacement');
  secondWriteCallback(null, 4);
  secondSyncCallback(null);
  assert.equal(writeCalls.length, 3);
  assert.equal(syncCalls.length, 2);
  assert.equal(hostCloseCalls.length, 1);
  assert.equal(FDState.getPos(fd), 99);

  const staleForceThread = makeThread('stale-force', heap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    staleForceThread,
    {},
    mapping.descriptor,
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  assert.deepEqual(staleForceThread.exceptions, [{
    type: 'Ljava/io/IOException;',
    message: 'Mapped buffer is no longer available'
  }]);
  FDState.close(fd);
}

function testMapCloseRace() {
  const fd = 12501;
  const events = [];
  const heap = makeHeap(12289);
  const readCalls = [];
  const hostCloseCalls = [];
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const mapThread = makeThread('map-race', heap, events);
  const closeThread = makeThread('close-race', heap, events);
  openState(fd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    readCalls.push({buffer, offset, length, position, callback});
  };
  fs.close = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    events.push('host-close');
    hostCloseCalls.push(callback);
  };

  fileChannel['map0(IJJ)J'](
    mapThread,
    {'sun/nio/ch/FileChannelImpl/fd': descriptor},
    1,
    Long.ZERO,
    Long.fromNumber(4)
  );
  fileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
    closeThread,
    descriptor
  );
  assert.equal(closeThread.returns.length, 0);
  assert.equal(hostCloseCalls.length, 0);
  completeRead(readCalls[0], 'data', 4);
  assert.deepEqual(mapThread.exceptions, [{
    type: 'Ljava/io/IOException;',
    message: 'Stream Closed'
  }]);
  assert.equal(heap.frees.length, 1);
  assert.equal(hostCloseCalls.length, 1);
  assert.deepEqual(events, ['map-race:exception', 'host-close']);
  readCalls[0].callback(null, 4);
  assert.equal(mapThread.exceptions.length, 1);
  assert.equal(hostCloseCalls.length, 1);
  hostCloseCalls[0](null);
  assert.equal(closeThread.returns.length, 1);
  assert.deepEqual(events, [
    'map-race:exception',
    'host-close',
    'close-race:return'
  ]);
}

function testLegacyCloseDeferral() {
  const fd = 12502;
  const events = [];
  const heap = makeHeap(20481);
  const hostCloseCalls = [];
  const descriptor = {'java/io/FileDescriptor/fd': fd};
  const thread = makeThread('legacy-close', heap, events);
  openState(fd);
  const retention = FDState.retain(fd);
  const retainedOperation = FDState.acquireRetainedOperation(retention);
  fs.close = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    events.push('host-close');
    hostCloseCalls.push(callback);
  };

  randomAccessFile['close0()V'](
    thread,
    {'java/io/RandomAccessFile/fd': descriptor}
  );
  assert.equal(descriptor['java/io/FileDescriptor/fd'], -1);
  assert.equal(thread.returns.length, 1);
  assert.equal(hostCloseCalls.length, 0);
  FDState.releaseRetention(retention);
  assert.equal(hostCloseCalls.length, 0);
  FDState.releaseOperation(retainedOperation);
  assert.equal(hostCloseCalls.length, 1);
  hostCloseCalls[0](null);
  assert.equal(thread.returns.length, 1);
  assert.deepEqual(events, ['legacy-close:return', 'host-close']);
}

function testMapCompletionThrowCleanup() {
  const fd = 12503;
  const events = [];
  const heap = makeHeap(24577);
  const readCalls = [];
  const completionError = new Error('map completion sentinel');
  const thread = makeThread('map-completion-throw', heap, events);
  let drained = 0;
  openState(fd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    readCalls.push({buffer, offset, length, position, callback});
  };
  thread.asyncReturn = function() {
    throw completionError;
  };

  fileChannel['map0(IJJ)J'](
    thread,
    {'sun/nio/ch/FileChannelImpl/fd': {'java/io/FileDescriptor/fd': fd}},
    1,
    Long.ZERO,
    Long.fromNumber(4)
  );
  assert.throws(
    () => completeRead(readCalls[0], 'data', 4),
    (err) => err === completionError
  );
  assert.equal(heap.frees.length, 1);
  assert.equal(FDState.requestClose(fd, () => {
    drained += 1;
  }), true);
  assert.equal(drained, 1);

  const staleForceThread = makeThread('stale-map-completion', heap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    staleForceThread,
    {},
    {'java/io/FileDescriptor/fd': -1},
    Long.fromNumber(heap.alignedAddress),
    Long.fromNumber(4)
  );
  assert.equal(staleForceThread.exceptions.length, 1);
}

function testForceCleanupErrorReleasesRetention() {
  const fd = 12504;
  const events = [];
  const heap = makeHeap(28673);
  const readCalls = [];
  const writeCalls = [];
  const syncCalls = [];
  const freeError = new Error('mapped heap free sentinel');
  let freeCalls = 0;
  let drained = 0;
  let retainedClose = 0;
  openState(fd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    readCalls.push({buffer, offset, length, position, callback});
  };
  fs.write = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    writeCalls.push({buffer, offset, length, position, callback});
  };
  fs.fsync = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    syncCalls.push(callback);
  };

  const mapping = mapWritable(fd, heap, events, readCalls);
  assert.equal(FDState.requestClose(fd, () => {
    drained += 1;
  }, () => {
    retainedClose += 1;
  }), true);
  assert.equal(retainedClose, 1);
  assert.equal(drained, 0);

  const forceThread = makeThread('force-free-throw', heap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    forceThread,
    {},
    mapping.descriptor,
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  fileChannel['unmap0(JJ)I'](
    makeThread('unmap-free-throw', heap, events),
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  heap.free = function(address) {
    assert.equal(address, 28673);
    freeCalls += 1;
    throw freeError;
  };
  writeCalls[0].callback(null, 4);
  assert.equal(syncCalls.length, 1);
  assert.throws(
    () => syncCalls[0](null),
    (err) => err === freeError
  );
  assert.equal(forceThread.returns.length, 1);
  assert.equal(freeCalls, 1);
  assert.equal(drained, 1);
  assert.doesNotThrow(() => syncCalls[0](null));
  assert.equal(freeCalls, 1);
}

function testZeroBaseAddressMapping() {
  const fd = 12505;
  const events = [];
  const heap = makeHeap(0);
  const readCalls = [];
  let drained = 0;
  let retainedClose = 0;
  openState(fd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    readCalls.push({buffer, offset, length, position, callback});
  };

  const mapping = mapWritable(fd, heap, events, readCalls);
  assert.equal(mapping.address, 4096);
  assert.equal(FDState.requestClose(fd, () => {
    drained += 1;
  }, () => {
    retainedClose += 1;
  }), true);
  assert.equal(retainedClose, 1);
  assert.equal(drained, 0);
  fileChannel['unmap0(JJ)I'](
    makeThread('unmap-zero-base', heap, events),
    Long.fromNumber(mapping.address),
    Long.fromNumber(4)
  );
  assert.deepEqual(heap.frees, [0]);
  assert.equal(drained, 1);
}

function testMultipleMappingsAndConcurrentForces() {
  const fd = 12506;
  const events = [];
  const firstHeap = makeHeap(32769);
  const secondHeap = makeHeap(40961);
  const firstReadCalls = [];
  const secondReadCalls = [];
  const writeCalls = [];
  const syncCalls = [];
  const hostCloseCalls = [];
  openState(fd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    firstReadCalls.push({buffer, offset, length, position, callback});
  };
  const firstMapping = mapWritable(fd, firstHeap, events, firstReadCalls);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    secondReadCalls.push({buffer, offset, length, position, callback});
  };
  const secondMapping = mapWritable(fd, secondHeap, events, secondReadCalls);
  fs.write = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    writeCalls.push({buffer, offset, length, position, callback});
  };
  fs.fsync = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    syncCalls.push(callback);
  };
  fs.close = function(actualFd, callback) {
    assert.equal(actualFd, fd);
    events.push('multi-host-close');
    hostCloseCalls.push(callback);
  };

  const closeThread = makeThread('multi-close', firstHeap, events);
  fileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
    closeThread,
    firstMapping.descriptor
  );
  assert.equal(closeThread.returns.length, 1);
  assert.equal(hostCloseCalls.length, 0);

  const firstForceThread = makeThread('multi-force-one', firstHeap, events);
  const secondForceThread = makeThread('multi-force-two', firstHeap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    firstForceThread,
    {},
    firstMapping.descriptor,
    Long.fromNumber(firstMapping.address),
    Long.fromNumber(4)
  );
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    secondForceThread,
    {},
    firstMapping.descriptor,
    Long.fromNumber(firstMapping.address),
    Long.fromNumber(4)
  );
  assert.equal(writeCalls.length, 2);

  fileChannel['unmap0(JJ)I'](
    makeThread('multi-unmap-one', firstHeap, events),
    Long.fromNumber(firstMapping.address),
    Long.fromNumber(4)
  );
  fileChannel['unmap0(JJ)I'](
    makeThread('multi-unmap-two', secondHeap, events),
    Long.fromNumber(secondMapping.address),
    Long.fromNumber(4)
  );
  assert.equal(firstHeap.frees.length, 0);
  assert.deepEqual(secondHeap.frees, [40961]);
  assert.equal(hostCloseCalls.length, 0);

  writeCalls[0].callback(null, 4);
  assert.equal(syncCalls.length, 1);
  syncCalls[0](null);
  assert.equal(firstForceThread.returns.length, 1);
  assert.equal(firstHeap.frees.length, 0);
  assert.equal(hostCloseCalls.length, 0);

  writeCalls[1].callback(null, 4);
  assert.equal(syncCalls.length, 2);
  syncCalls[1](null);
  assert.equal(secondForceThread.returns.length, 1);
  assert.deepEqual(firstHeap.frees, [32769]);
  assert.equal(hostCloseCalls.length, 1);
  hostCloseCalls[0](null);
  assert.equal(closeThread.returns.length, 1);
}

function testJvmScopedMappingRegistry() {
  const firstFd = 12507;
  const secondFd = 12508;
  const events = [];
  const firstHeap = makeHeap(45057);
  const secondHeap = makeHeap(45057);
  const firstReadCalls = [];
  const secondReadCalls = [];
  const writeCalls = [];
  const syncCalls = [];
  const hostCloseCalls = [];
  const secondSunNatives = createSunNatives();
  const secondFileChannel = secondSunNatives['sun/nio/ch/FileChannelImpl'];
  const secondFileDispatcher = secondSunNatives['sun/nio/ch/FileDispatcherImpl'];
  openState(firstFd);
  openState(secondFd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    const calls = actualFd === firstFd ? firstReadCalls : secondReadCalls;
    assert(actualFd === firstFd || actualFd === secondFd);
    calls.push({buffer, offset, length, position, callback});
  };
  fs.write = function(actualFd, buffer, offset, length, position, callback) {
    assert.equal(actualFd, secondFd);
    writeCalls.push({buffer, offset, length, position, callback});
  };
  fs.fsync = function(actualFd, callback) {
    assert.equal(actualFd, secondFd);
    syncCalls.push(callback);
  };
  fs.close = function(actualFd, callback) {
    assert(actualFd === firstFd || actualFd === secondFd);
    hostCloseCalls.push({fd: actualFd, callback});
  };

  const firstMapping = mapWritable(
    firstFd,
    firstHeap,
    events,
    firstReadCalls,
    fileChannel
  );
  const secondMapping = mapWritable(
    secondFd,
    secondHeap,
    events,
    secondReadCalls,
    secondFileChannel
  );
  assert.equal(firstMapping.address, secondMapping.address);

  const firstCloseThread = makeThread('first-jvm-close', firstHeap, events);
  const secondCloseThread = makeThread('second-jvm-close', secondHeap, events);
  fileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
    firstCloseThread,
    firstMapping.descriptor
  );
  secondFileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
    secondCloseThread,
    secondMapping.descriptor
  );
  assert.equal(firstCloseThread.returns.length, 1);
  assert.equal(secondCloseThread.returns.length, 1);

  fileChannel['unmap0(JJ)I'](
    makeThread('first-jvm-unmap', firstHeap, events),
    Long.fromNumber(firstMapping.address),
    Long.fromNumber(4)
  );
  assert.deepEqual(firstHeap.frees, [45057]);
  assert.equal(secondHeap.frees.length, 0);
  assert.deepEqual(hostCloseCalls.map((call) => call.fd), [firstFd]);

  const secondForceThread = makeThread('second-jvm-force', secondHeap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    secondForceThread,
    {},
    secondMapping.descriptor,
    Long.fromNumber(secondMapping.address),
    Long.fromNumber(4)
  );
  assert.equal(writeCalls.length, 1);
  writeCalls[0].callback(null, 4);
  syncCalls[0](null);
  assert.equal(secondForceThread.returns.length, 1);
  secondFileChannel['unmap0(JJ)I'](
    makeThread('second-jvm-unmap', secondHeap, events),
    Long.fromNumber(secondMapping.address),
    Long.fromNumber(4)
  );
  assert.deepEqual(secondHeap.frees, [45057]);
  assert.deepEqual(hostCloseCalls.map((call) => call.fd), [firstFd, secondFd]);
  hostCloseCalls.forEach((call) => call.callback(null));
  assert.equal(firstCloseThread.returns.length, 1);
  assert.equal(secondCloseThread.returns.length, 1);
}

function testSynchronousCloseCompletionSentinels() {
  const channelFd = 12509;
  const legacyFd = 12510;
  const retainedFd = 12511;
  const events = [];
  const heap = makeHeap(53249);
  const channelSentinel = new Error('channel close completion sentinel');
  const legacySentinel = new Error('legacy close completion sentinel');
  const retainedSentinel = new Error('retained close completion sentinel');
  const hostCloseFds = [];
  openState(channelFd);
  openState(legacyFd);
  openState(retainedFd);
  fs.close = function(actualFd, callback) {
    hostCloseFds.push(actualFd);
    callback(null);
  };

  const channelDescriptor = {'java/io/FileDescriptor/fd': channelFd};
  const channelThread = makeThread('sync-channel-close', heap, events);
  channelThread.asyncReturn = function() {
    throw channelSentinel;
  };
  assert.throws(
    () => fileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
      channelThread,
      channelDescriptor
    ),
    (err) => err === channelSentinel
  );
  assert.equal(channelDescriptor['java/io/FileDescriptor/fd'], -1);

  const legacyDescriptor = {'java/io/FileDescriptor/fd': legacyFd};
  const legacyThread = makeThread('sync-legacy-close', heap, events);
  legacyThread.asyncReturn = function() {
    throw legacySentinel;
  };
  assert.throws(
    () => randomAccessFile['close0()V'](
      legacyThread,
      {'java/io/RandomAccessFile/fd': legacyDescriptor}
    ),
    (err) => err === legacySentinel
  );
  assert.equal(legacyDescriptor['java/io/FileDescriptor/fd'], -1);
  assert.deepEqual(hostCloseFds, [channelFd, legacyFd]);

  const retention = FDState.retain(retainedFd);
  const retainedDescriptor = {'java/io/FileDescriptor/fd': retainedFd};
  const retainedThread = makeThread('sync-retained-close', heap, events);
  retainedThread.asyncReturn = function() {
    throw retainedSentinel;
  };
  assert.throws(
    () => fileDispatcher['close0(Ljava/io/FileDescriptor;)V'](
      retainedThread,
      retainedDescriptor
    ),
    (err) => err === retainedSentinel
  );
  assert.equal(retainedDescriptor['java/io/FileDescriptor/fd'], -1);
  assert.deepEqual(hostCloseFds, [channelFd, legacyFd]);
  FDState.releaseRetention(retention);
  assert.deepEqual(hostCloseFds, [channelFd, legacyFd, retainedFd]);

  [channelFd, legacyFd, retainedFd].forEach((fd) => {
    FDState.open(fd, 91, false, 0, `/sync-close-replacement-${fd}`);
    FDState.close(fd);
  });
}

function testAdjacentRealHeapMappings() {
  const firstFd = 12512;
  const secondFd = 12513;
  const events = [];
  const heap = new Heap(32768);
  const frees = [];
  const writeCalls = [];
  const syncCalls = [];
  const originalFree = heap.free.bind(heap);
  heap.free = function(address) {
    frees.push(address);
    originalFree(address);
  };
  openState(firstFd);
  openState(secondFd);
  fs.read = function(actualFd, buffer, offset, length, position, callback) {
    assert(actualFd === firstFd || actualFd === secondFd);
    callback(null, 0);
  };
  fs.write = function(actualFd, buffer, offset, length, position, callback) {
    writeCalls.push({
      fd: actualFd,
      bytes: Buffer.from(buffer.slice(offset, offset + length)).toString(),
      callback
    });
  };
  fs.fsync = function(actualFd, callback) {
    syncCalls.push({fd: actualFd, callback});
  };

  const firstDescriptor = {'java/io/FileDescriptor/fd': firstFd};
  const firstMapThread = makeThread('adjacent-map-one', heap, events);
  fileChannel['map0(IJJ)J'](
    firstMapThread,
    {'sun/nio/ch/FileChannelImpl/fd': firstDescriptor},
    1,
    Long.ZERO,
    Long.fromNumber(4096)
  );
  const firstAddress = firstMapThread.returns[0].toNumber();
  assert.equal(firstAddress, 4096);

  const secondDescriptor = {'java/io/FileDescriptor/fd': secondFd};
  const secondMapThread = makeThread('adjacent-map-two', heap, events);
  fileChannel['map0(IJJ)J'](
    secondMapThread,
    {'sun/nio/ch/FileChannelImpl/fd': secondDescriptor},
    1,
    Long.ZERO,
    Long.fromNumber(4)
  );
  const secondAddress = secondMapThread.returns[0].toNumber();
  assert.equal(secondAddress, firstAddress + 4096);
  heap.get_buffer(secondAddress, 4).write('NEXT', 0, 'utf8');

  const forceThread = makeThread('adjacent-force-two', heap, events);
  mappedByteBuffer['force0(Ljava/io/FileDescriptor;JJ)V'](
    forceThread,
    {},
    secondDescriptor,
    Long.fromNumber(secondAddress),
    Long.fromNumber(4)
  );
  assert.equal(writeCalls.length, 1);
  assert.equal(writeCalls[0].fd, secondFd);
  assert.equal(writeCalls[0].bytes, 'NEXT');
  writeCalls[0].callback(null, 4);
  assert.equal(syncCalls.length, 1);
  assert.equal(syncCalls[0].fd, secondFd);
  syncCalls[0].callback(null);
  assert.equal(forceThread.returns.length, 1);

  fileChannel['unmap0(JJ)I'](
    makeThread('adjacent-unmap-one', heap, events),
    Long.fromNumber(firstAddress),
    Long.fromNumber(4096)
  );
  fileChannel['unmap0(JJ)I'](
    makeThread('adjacent-unmap-two', heap, events),
    Long.fromNumber(secondAddress),
    Long.fromNumber(4)
  );
  assert.deepEqual(frees, [0, 8192]);
  FDState.close(firstFd);
  FDState.close(secondFd);
}

try {
  const tests = [
    testWritableRetention,
    testMapCloseRace,
    testLegacyCloseDeferral,
    testMapCompletionThrowCleanup,
    testForceCleanupErrorReleasesRetention,
    testZeroBaseAddressMapping,
    testMultipleMappingsAndConcurrentForces,
    testJvmScopedMappingRegistry,
    testSynchronousCloseCompletionSentinels,
    testAdjacentRealHeapMappings
  ];
  tests.forEach((test) => test());
  console.log(`mapped-buffer-fd-lifetime:${tests.length}:ok`);
} finally {
  fs.close = originalFs.close;
  fs.fsync = originalFs.fsync;
  fs.read = originalFs.read;
  fs.write = originalFs.write;
  openedFds.forEach((fd) => FDState.close(fd));
}
