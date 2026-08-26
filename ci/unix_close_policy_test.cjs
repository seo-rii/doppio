'use strict';

const fs = require('fs');
const doppio = require('../build/release-cli/src/doppiojvm');
const unixNatives = require('../build/release-cli/src/natives/sun_nio')
  .default()['sun/nio/fs/UnixNativeDispatcher'];
const FDState = doppio.VM.FDState;
const Long = doppio.VM.Long;

class FakeUnixException {
}

function FakeUnixConstants() {
}

FakeUnixConstants['sun/nio/fs/UnixConstants/EIO'] = 5;
FakeUnixConstants['sun/nio/fs/UnixConstants/EINTR'] = 4;

function runClosePolicy(
    caseName,
    nativeName,
    argumentFactory,
    expectedResult,
    errorCode) {
  const fd = fs.openSync(process.platform === 'win32' ? 'NUL' : '/dev/null', 'r');
  const originalClose = fs.close;
  const originalFDStateClose = FDState.close;
  const originalFDStateRequestClose = FDState.requestClose;
  let hostCloseCalls = 0;
  let retireCalls = 0;
  let replacementRegistered = false;
  let hostCallbackFinished = false;
  let scheduleCompletionCheck = () => {};
  const initializedClasses = [];

  FDState.open(fd, 0, false, 0, '/dev/null');
  fs.close = function(fdArg, callback) {
    if (fdArg !== fd) {
      return originalClose.apply(this, arguments);
    }
    hostCloseCalls += 1;
    return originalClose.call(this, fdArg, (err) => {
      try {
        if (err) {
          callback(err);
          return;
        }
        FDState.open(fd, 99, false, 0, '/replacement');
        replacementRegistered = true;
        const injectedError = new Error(`injected ${caseName} close failure`);
        injectedError.code = errorCode;
        callback(injectedError);
      } finally {
        hostCallbackFinished = true;
        scheduleCompletionCheck();
      }
    });
  };
  FDState.requestClose = function(fdArg) {
    const requested = originalFDStateRequestClose.apply(this, arguments);
    if (fdArg === fd && requested) {
      retireCalls += 1;
    }
    return requested;
  };

  const cleanup = () => {
    fs.close = originalClose;
    FDState.requestClose = originalFDStateRequestClose;
    originalFDStateClose.call(FDState, fd);
  };
  const resultPromise = new Promise((resolve, reject) => {
    let completionCount = 0;
    let firstCompletion = null;
    let completionCheckScheduled = false;
    let settled = false;
    let timeout;
    const fail = (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    };
    timeout = setTimeout(
      () => fail(new Error(`${caseName} did not complete.`)),
      5000
    );
    scheduleCompletionCheck = () => {
      if (settled || completionCheckScheduled || !hostCallbackFinished ||
          completionCount === 0) {
        return;
      }
      completionCheckScheduled = true;
      setImmediate(() => {
        if (completionCount !== 1) {
          fail(new Error(
            `${caseName} completed ${completionCount} times instead of exactly once.`
          ));
        } else if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(firstCompletion);
        }
      });
    };
    const finish = (value) => {
      completionCount += 1;
      if (completionCount === 1) {
        firstCompletion = value;
      }
      scheduleCompletionCheck();
    };
    const classLoader = {
      initializeClass(thread, className, callback) {
        initializedClasses.push(className);
        if (className === 'Lsun/nio/fs/UnixException;') {
          callback({ getConstructor: () => FakeUnixException });
        } else if (className === 'Lsun/nio/fs/UnixConstants;') {
          callback({ getConstructor: () => FakeUnixConstants });
        } else {
          fail(new Error(`Unexpected class initialization: ${className}`));
        }
      }
    };
    const thread = {
      setStatus() {
      },
      getBsCl() {
        return classLoader;
      },
      asyncReturn() {
        finish({ kind: 'returned' });
      },
      throwException(exception) {
        finish({ kind: 'unix-exception', exception });
      }
    };

    try {
      unixNatives[nativeName](thread, argumentFactory(fd));
    } catch (err) {
      fail(err);
    }
  });

  return resultPromise.then((result) => {
    try {
      if (result.kind !== expectedResult || hostCloseCalls !== 1 || retireCalls !== 1) {
        throw new Error(
          `${caseName} policy mismatch: ${JSON.stringify({
            result: result.kind,
            hostCloseCalls,
            retireCalls,
            initializedClasses
          })}`
        );
      }
      if (!replacementRegistered || FDState.getPos(fd) !== 99) {
        throw new Error(`${caseName} removed state registered after the host close.`);
      }
      if (expectedResult === 'returned' && initializedClasses.length !== 0) {
        throw new Error(`${caseName} unexpectedly converted the suppressed close error.`);
      }
      if (expectedResult === 'unix-exception') {
        const exception = result.exception;
        if (!(exception instanceof FakeUnixException) ||
            exception['sun/nio/fs/UnixException/errno'] !== 5 ||
            initializedClasses.join(',') !==
              'Lsun/nio/fs/UnixException;,Lsun/nio/fs/UnixConstants;') {
          throw new Error(`${caseName} did not use the UnixException bridge.`);
        }
      }

      console.log(`${caseName}:${result.kind}:${hostCloseCalls}:${retireCalls}`);
    } finally {
      cleanup();
    }
  }, (err) => {
    cleanup();
    throw err;
  });
}

function main() {
  return runClosePolicy(
    'close-eio', 'close(I)V', (fd) => fd, 'returned', 'EIO'
  ).then(() => runClosePolicy(
    'fclose-eio', 'fclose(J)V', (fd) => Long.fromNumber(fd), 'unix-exception', 'EIO'
  )).then(() => runClosePolicy(
    'fclose-eintr', 'fclose(J)V', (fd) => Long.fromNumber(fd), 'returned', 'EINTR'
  ));
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exitCode = 1;
});
