'use strict';

const assert = require('assert');
const fs = require('fs');
const doppio = require('../build/release-cli/src/doppiojvm');
const natives = require('../build/release-cli/src/natives/sun_nio').default();

const FDState = doppio.VM.FDState;
const Long = doppio.VM.Long;
const fileChannel = natives['sun/nio/ch/FileChannelImpl'];
const unixCopyFile = natives['sun/nio/fs/UnixCopyFile'];
const unixDispatcher = natives['sun/nio/fs/UnixNativeDispatcher'];
const originalFs = {
  fchmod: fs.fchmod,
  fchown: fs.fchown,
  fstat: fs.fstat,
  futimes: fs.futimes,
  read: fs.read,
  write: fs.write
};
const openedFds = [];

class FakeUnixException {
}

function FakeUnixConstants() {
}

FakeUnixConstants['sun/nio/fs/UnixConstants/EBADF'] = 9;
FakeUnixConstants['sun/nio/fs/UnixConstants/EIO'] = 5;

function openState(fd, position = 0, append = false) {
  FDState.open(fd, position, append, 0, `/nio-operation-${fd}`);
  openedFds.push(fd);
}

function makeChannelThread(events) {
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
      events.push('return');
    },
    throwNewException(type, message) {
      this.exceptions.push({type, message});
      events.push('exception');
    }
  };
}

function makeUnixThread(events, delayedConversion = false) {
  const pendingInitializers = [];
  const initialize = (className, callback) => {
    if (className === 'Lsun/nio/fs/UnixException;') {
      callback({getConstructor: () => FakeUnixException});
    } else if (className === 'Lsun/nio/fs/UnixConstants;') {
      callback({getConstructor: () => FakeUnixConstants});
    } else {
      throw new Error(`Unexpected class initialization: ${className}`);
    }
  };
  const thread = {
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
    getBsCl() {
      return {
        initializeClass(innerThread, className, callback) {
          if (delayedConversion) {
            pendingInitializers.push(() => initialize(className, callback));
          } else {
            initialize(className, callback);
          }
        }
      };
    },
    asyncReturn(value) {
      this.returns.push(value);
      events.push('return');
    },
    throwException(exception) {
      this.exceptions.push(exception);
      events.push('exception');
    },
    advanceConversion() {
      assert.notEqual(pendingInitializers.length, 0);
      pendingInitializers.shift()();
    },
    pendingConversions() {
      return pendingInitializers.length;
    }
  };
  return thread;
}

function makeFailingUnixThread(events, failedClassName) {
  const thread = makeUnixThread(events);
  thread.getBsCl = function() {
    return {
      initializeClass(innerThread, className, callback) {
        if (className === failedClassName) {
          callback(null);
        } else if (className === 'Lsun/nio/fs/UnixException;') {
          callback({getConstructor: () => FakeUnixException});
        } else if (className === 'Lsun/nio/fs/UnixConstants;') {
          callback({getConstructor: () => FakeUnixConstants});
        } else {
          throw new Error(`Unexpected class initialization: ${className}`);
        }
      }
    };
  };
  return thread;
}

function requestDrain(fd, name, events) {
  let drained = 0;
  assert.equal(FDState.requestClose(fd, () => {
    drained += 1;
    events.push(`${name}-drain`);
  }), true);
  return () => drained;
}

function testFileChannelTransferPair() {
  const sourceFd = 12400;
  const destinationFd = 12401;
  const events = [];
  const thread = makeChannelThread(events);
  let readCallback = null;
  let writes = 0;
  openState(sourceFd);
  openState(destinationFd, 7);
  fs.read = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, sourceFd);
    assert.equal(position, 3);
    readCallback = callback;
  };
  fs.write = function() {
    writes += 1;
  };

  fileChannel['transferTo0(Ljava/io/FileDescriptor;JJLjava/io/FileDescriptor;)J'](
    thread,
    {},
    {'java/io/FileDescriptor/fd': sourceFd},
    Long.fromNumber(3),
    Long.fromNumber(4),
    {'java/io/FileDescriptor/fd': destinationFd}
  );
  assert.equal(typeof readCallback, 'function');
  const sourceDrained = requestDrain(sourceFd, 'source', events);
  const destinationDrained = requestDrain(destinationFd, 'destination', events);
  assert.equal(sourceDrained(), 0);
  assert.equal(destinationDrained(), 0);

  readCallback(null, 4);
  assert.equal(writes, 0);
  assert.deepEqual(thread.returns, []);
  assert.deepEqual(thread.exceptions, [{
    type: 'Ljava/io/IOException;',
    message: 'Stream Closed'
  }]);
  assert.equal(sourceDrained(), 1);
  assert.equal(destinationDrained(), 1);
  assert.deepEqual(events, ['exception', 'destination-drain', 'source-drain']);
}

function testFileChannelPairRollback() {
  const sourceFd = 12402;
  const missingDestinationFd = 12403;
  const events = [];
  const thread = makeChannelThread(events);
  openState(sourceFd);

  fileChannel['transferTo0(Ljava/io/FileDescriptor;JJLjava/io/FileDescriptor;)J'](
    thread,
    {},
    {'java/io/FileDescriptor/fd': sourceFd},
    Long.ZERO,
    Long.ONE,
    {'java/io/FileDescriptor/fd': missingDestinationFd}
  );
  assert.deepEqual(thread.exceptions, [{
    type: 'Ljava/io/IOException;',
    message: 'Stream Closed'
  }]);
  const sourceDrained = requestDrain(sourceFd, 'source', events);
  assert.equal(sourceDrained(), 1);
}

function testFileChannelTransferAppendTail() {
  const sourceFd = 12430;
  const destinationFd = 12431;
  const events = [];
  const thread = makeChannelThread(events);
  let readCallback = null;
  let writeCallback = null;
  let appendFstatCallback = null;
  openState(sourceFd);
  openState(destinationFd, 7, true);
  fs.read = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, sourceFd);
    readCallback = callback;
  };
  fs.write = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, destinationFd);
    assert.equal(position, null);
    writeCallback = callback;
  };
  fs.fstat = function(fd, callback) {
    assert.equal(fd, destinationFd);
    appendFstatCallback = callback;
  };

  fileChannel['transferTo0(Ljava/io/FileDescriptor;JJLjava/io/FileDescriptor;)J'](
    thread,
    {},
    {'java/io/FileDescriptor/fd': sourceFd},
    Long.ZERO,
    Long.fromNumber(4),
    {'java/io/FileDescriptor/fd': destinationFd}
  );
  readCallback(null, 4);
  assert.equal(typeof writeCallback, 'function');
  writeCallback(null, 4);
  assert.equal(typeof appendFstatCallback, 'function');

  const sourceDrained = requestDrain(sourceFd, 'source', events);
  const destinationDrained = requestDrain(destinationFd, 'destination', events);
  appendFstatCallback(null, {size: 11});
  assert.deepEqual(thread.returns, []);
  assert.deepEqual(thread.exceptions, [{
    type: 'Ljava/io/IOException;',
    message: 'Stream Closed'
  }]);
  assert.equal(sourceDrained(), 1);
  assert.equal(destinationDrained(), 1);
  assert.deepEqual(events, ['exception', 'destination-drain', 'source-drain']);
}

function testUnixCopyPairConversion() {
  const sourceFd = 12404;
  const destinationFd = 12405;
  const events = [];
  const thread = makeUnixThread(events, true);
  let readCallback = null;
  let writes = 0;
  openState(sourceFd);
  openState(destinationFd);
  fs.read = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, sourceFd);
    readCallback = callback;
  };
  fs.write = function() {
    writes += 1;
  };

  unixCopyFile['transfer(IIJ)V'](
    thread,
    destinationFd,
    sourceFd,
    Long.ZERO
  );
  const sourceDrained = requestDrain(sourceFd, 'source', events);
  const destinationDrained = requestDrain(destinationFd, 'destination', events);
  readCallback(null, 2);
  assert.equal(writes, 0);
  assert.equal(thread.pendingConversions(), 1);
  assert.equal(sourceDrained(), 0);
  assert.equal(destinationDrained(), 0);

  thread.advanceConversion();
  assert.equal(thread.pendingConversions(), 1);
  assert.equal(sourceDrained(), 0);
  assert.equal(destinationDrained(), 0);
  thread.advanceConversion();
  assert.equal(thread.exceptions.length, 1);
  assert.equal(
    thread.exceptions[0]['sun/nio/fs/UnixException/errno'],
    9
  );
  assert.equal(sourceDrained(), 1);
  assert.equal(destinationDrained(), 1);
  assert.deepEqual(events, ['exception', 'destination-drain', 'source-drain']);
}

function testUnixCopyHostErrorPrecedence() {
  const sourceFd = 12406;
  const destinationFd = 12407;
  const events = [];
  const thread = makeUnixThread(events);
  let readCallback = null;
  openState(sourceFd);
  openState(destinationFd);
  fs.read = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, sourceFd);
    readCallback = callback;
  };

  unixCopyFile['transfer(IIJ)V'](
    thread,
    destinationFd,
    sourceFd,
    Long.ZERO
  );
  const sourceDrained = requestDrain(sourceFd, 'source', events);
  const destinationDrained = requestDrain(destinationFd, 'destination', events);
  const readError = new Error('injected copy read failure');
  readError.code = 'EIO';
  readCallback(readError, 0);

  assert.equal(thread.exceptions.length, 1);
  assert.equal(
    thread.exceptions[0]['sun/nio/fs/UnixException/errno'],
    5
  );
  assert.equal(sourceDrained(), 1);
  assert.equal(destinationDrained(), 1);
  assert.deepEqual(events, ['exception', 'destination-drain', 'source-drain']);
}

function testUnixCopyStopsAfterSourceClose() {
  const sourceFd = 12432;
  const destinationFd = 12433;
  const events = [];
  const thread = makeUnixThread(events);
  let readCallback = null;
  let writeCallback = null;
  let reads = 0;
  openState(sourceFd);
  openState(destinationFd);
  fs.read = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, sourceFd);
    reads += 1;
    readCallback = callback;
  };
  fs.write = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, destinationFd);
    writeCallback = callback;
  };

  unixCopyFile['transfer(IIJ)V'](
    thread,
    destinationFd,
    sourceFd,
    Long.ZERO
  );
  readCallback(null, 2);
  assert.equal(typeof writeCallback, 'function');
  const sourceDrained = requestDrain(sourceFd, 'source', events);
  writeCallback(null, 2);

  assert.equal(reads, 1);
  assert.equal(thread.exceptions.length, 1);
  assert.equal(
    thread.exceptions[0]['sun/nio/fs/UnixException/errno'],
    9
  );
  assert.equal(sourceDrained(), 1);
  const destinationDrained = requestDrain(destinationFd, 'destination', events);
  assert.equal(destinationDrained(), 1);
  assert.deepEqual(events, ['exception', 'source-drain', 'destination-drain']);
}

function testUnixCopyPairRollback() {
  const sourceFd = 12434;
  const missingDestinationFd = 12435;
  const events = [];
  const thread = makeUnixThread(events);
  openState(sourceFd);

  unixCopyFile['transfer(IIJ)V'](
    thread,
    missingDestinationFd,
    sourceFd,
    Long.ZERO
  );
  assert.equal(thread.exceptions.length, 1);
  assert.equal(
    thread.exceptions[0]['sun/nio/fs/UnixException/errno'],
    9
  );
  const sourceDrained = requestDrain(sourceFd, 'source', events);
  assert.equal(sourceDrained(), 1);
}

function testUnixCompletionSentinels() {
  const singleFd = 12420;
  const sourceFd = 12421;
  const destinationFd = 12422;
  const singleSentinel = new Error('single Unix completion sentinel');
  const pairSentinel = new Error('paired Unix completion sentinel');
  const singleThread = makeUnixThread([]);
  const pairThread = makeUnixThread([]);
  openState(singleFd);
  openState(sourceFd);
  openState(destinationFd);
  singleThread.throwException = function() {
    throw singleSentinel;
  };
  pairThread.throwException = function() {
    throw pairSentinel;
  };
  fs.fchown = function(fd, uid, gid, callback) {
    const err = new Error('injected synchronous fchown failure');
    err.code = 'EIO';
    callback(err);
  };
  assert.throws(
    () => unixDispatcher['fchown(III)V'](singleThread, singleFd, 0, 0),
    (err) => err === singleSentinel
  );
  const singleDrained = requestDrain(singleFd, 'single', []);
  assert.equal(singleDrained(), 1);

  fs.read = function(fd, data, offset, length, position, callback) {
    const err = new Error('injected synchronous copy failure');
    err.code = 'EIO';
    callback(err, 0);
  };
  assert.throws(
    () => unixCopyFile['transfer(IIJ)V'](
      pairThread,
      destinationFd,
      sourceFd,
      Long.ZERO
    ),
    (err) => err === pairSentinel
  );
  const sourceDrained = requestDrain(sourceFd, 'source', []);
  const destinationDrained = requestDrain(destinationFd, 'destination', []);
  assert.equal(sourceDrained(), 1);
  assert.equal(destinationDrained(), 1);
}

function testUnixConversionInitializationFailures() {
  const singleFd = 12423;
  const sourceFd = 12424;
  const destinationFd = 12425;
  const singleEvents = [];
  const pairEvents = [];
  const singleThread = makeFailingUnixThread(
    singleEvents,
    'Lsun/nio/fs/UnixException;'
  );
  const pairThread = makeFailingUnixThread(
    pairEvents,
    'Lsun/nio/fs/UnixConstants;'
  );
  let fstatCallback = null;
  let readCallback = null;
  openState(singleFd);
  openState(sourceFd);
  openState(destinationFd);
  fs.fstat = function(fd, callback) {
    assert.equal(fd, singleFd);
    fstatCallback = callback;
  };
  unixDispatcher['fstat(ILsun/nio/fs/UnixFileAttributes;)V'](
    singleThread,
    singleFd,
    {}
  );
  const singleDrained = requestDrain(singleFd, 'single', singleEvents);
  const singleError = new Error('single conversion setup failure');
  singleError.code = 'EIO';
  fstatCallback(singleError, null);
  assert.equal(singleDrained(), 1);
  assert.deepEqual(singleEvents, ['single-drain']);

  fs.read = function(fd, data, offset, length, position, callback) {
    assert.equal(fd, sourceFd);
    readCallback = callback;
  };
  unixCopyFile['transfer(IIJ)V'](
    pairThread,
    destinationFd,
    sourceFd,
    Long.ZERO
  );
  const sourceDrained = requestDrain(sourceFd, 'source', pairEvents);
  const destinationDrained = requestDrain(
    destinationFd,
    'destination',
    pairEvents
  );
  const pairError = new Error('paired conversion setup failure');
  pairError.code = 'EIO';
  readCallback(pairError, 0);
  assert.equal(sourceDrained(), 1);
  assert.equal(destinationDrained(), 1);
  assert.deepEqual(pairEvents, ['destination-drain', 'source-drain']);
}

function testUnixSingleDescriptorOperations() {
  const cases = [
    {
      name: 'fstat',
      nativeName: 'fstat(ILsun/nio/fs/UnixFileAttributes;)V',
      invoke(thread, fd) {
        unixDispatcher[this.nativeName](thread, fd, {});
      },
      install(fd, setCallback) {
        fs.fstat = (actualFd, callback) => {
          assert.equal(actualFd, fd);
          setCallback(() => callback(null, {}));
        };
      }
    },
    {
      name: 'fchown',
      nativeName: 'fchown(III)V',
      invoke(thread, fd) {
        unixDispatcher[this.nativeName](thread, fd, 0, 0);
      },
      install(fd, setCallback) {
        fs.fchown = (actualFd, uid, gid, callback) => {
          assert.equal(actualFd, fd);
          setCallback(() => callback(null));
        };
      }
    },
    {
      name: 'fchmod',
      nativeName: 'fchmod(II)V',
      invoke(thread, fd) {
        unixDispatcher[this.nativeName](thread, fd, 0o600);
      },
      install(fd, setCallback) {
        fs.fchmod = (actualFd, mode, callback) => {
          assert.equal(actualFd, fd);
          setCallback(() => callback(null));
        };
      }
    },
    {
      name: 'futimes',
      nativeName: 'futimes(IJJ)V',
      invoke(thread, fd) {
        unixDispatcher[this.nativeName](thread, fd, Long.ZERO, Long.ZERO);
      },
      install(fd, setCallback) {
        fs.futimes = (actualFd, atime, mtime, callback) => {
          assert.equal(actualFd, fd);
          setCallback(() => callback(null));
        };
      }
    },
    {
      name: 'read',
      nativeName: 'read(IJI)I',
      invoke(thread, fd) {
        unixDispatcher[this.nativeName](thread, fd, Long.ZERO, 1);
      },
      install(fd, setCallback) {
        fs.read = (actualFd, data, offset, length, position, callback) => {
          assert.equal(actualFd, fd);
          setCallback(() => callback(null, 1));
        };
      }
    },
    {
      name: 'write',
      nativeName: 'write(IJI)I',
      invoke(thread, fd) {
        unixDispatcher[this.nativeName](thread, fd, Long.ZERO, 1);
      },
      install(fd, setCallback) {
        fs.write = (actualFd, data, offset, length, position, callback) => {
          assert.equal(actualFd, fd);
          setCallback(() => callback(null, 1));
        };
      }
    }
  ];

  cases.forEach((testCase, index) => {
    const fd = 12410 + index;
    const events = [];
    const thread = makeUnixThread(events);
    let completeHostOperation = null;
    openState(fd);
    testCase.install(fd, (callback) => {
      completeHostOperation = callback;
    });
    testCase.invoke(thread, fd);
    assert.equal(typeof completeHostOperation, 'function');
    const drained = requestDrain(fd, testCase.name, events);
    assert.equal(drained(), 0);
    completeHostOperation();
    assert.deepEqual(thread.returns, []);
    assert.equal(thread.exceptions.length, 1);
    assert.equal(
      thread.exceptions[0]['sun/nio/fs/UnixException/errno'],
      9
    );
    assert.equal(drained(), 1);
    assert.deepEqual(events, ['exception', `${testCase.name}-drain`]);
  });
}

function testUnixReadSuccess() {
  const fd = 12436;
  const events = [];
  const destination = Buffer.alloc(1);
  const thread = makeUnixThread(events);
  thread.getJVM = function() {
    return {
      getHeap() {
        return {
          get_buffer(address, length) {
            assert.equal(address, 17);
            assert.equal(length, 1);
            return destination;
          }
        };
      }
    };
  };
  openState(fd);
  fs.read = function(actualFd, scratch, offset, length, position, callback) {
    assert.equal(actualFd, fd);
    scratch[0] = 0x5a;
    callback(null, 1);
  };

  unixDispatcher['read(IJI)I'](
    thread,
    fd,
    Long.fromNumber(17),
    1
  );
  assert.deepEqual(thread.returns, [1]);
  assert.deepEqual(thread.exceptions, []);
  assert.equal(destination[0], 0x5a);
  assert.equal(FDState.getPos(fd), 1);
  const drained = requestDrain(fd, 'read', events);
  assert.equal(drained(), 1);
}

try {
  testFileChannelTransferPair();
  testFileChannelPairRollback();
  testFileChannelTransferAppendTail();
  testUnixCopyPairConversion();
  testUnixCopyHostErrorPrecedence();
  testUnixCopyStopsAfterSourceClose();
  testUnixCopyPairRollback();
  testUnixCompletionSentinels();
  testUnixConversionInitializationFailures();
  testUnixSingleDescriptorOperations();
  testUnixReadSuccess();
  console.log('nio-fd-operation-leases:18:ok');
} finally {
  Object.keys(originalFs).forEach((name) => {
    fs[name] = originalFs[name];
  });
  openedFds.forEach((fd) => FDState.close(fd));
}
