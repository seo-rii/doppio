'use strict';

const fs = require('fs');
const path = require('path');
const fsConstants = fs.constants || require('constants');

const failureMode = process.env.DOPPIO_FILECHANNEL_IOEXCEPTION_MODE;
const supportedModes = new Set([
  'operations',
  'operations-fallback',
  'read-close-fallback',
  'read-close-native',
  'legacy-close-input',
  'legacy-close-output',
  'legacy-close-random'
]);
if (!supportedModes.has(failureMode)) {
  throw new Error(`Unsupported DOPPIO_FILECHANNEL_IOEXCEPTION_MODE: ${failureMode}`);
}

const targetPath = path.resolve(
  'build',
  'modern-filechannel-ioexception',
  'channel-errors.txt'
);
const originalReadv = fs.readv;
const originalWritev = fs.writev;
const operationsMode = failureMode.startsWith('operations');
const legacyCloseMode = failureMode.startsWith('legacy-close-');
const nativeWritevEnabled = failureMode !== 'operations-fallback' &&
  typeof originalWritev === 'function';
const doppio = require('../build/release-cli/src/doppiojvm');
const FDState = doppio.VM.FDState;
const Heap = require('../build/release-cli/src/heap').default;
const originalFDStateRequestClose = FDState.requestClose;
const originalHeapMalloc = Heap.prototype.malloc;
let targetFd = null;
let targetActive = false;
let targetClosed = false;
let targetGeneration = 0;
let targetTrackingComplete = false;
let targetReadCalls = 0;
let targetWriteCalls = 0;
let targetFstatFailures = 0;
let appendFstatCalls = 0;
let appendOpenObserved = false;
let appendWriteCommitted = false;
let committedWritePositionObserved = false;
let targetTruncateFailures = 0;
let targetWritevFailures = 0;
let targetFsyncFailures = 0;
let mapReadFailureInjected = false;
let mapMallocFailures = 0;
let targetCloseCalls = 0;
let targetRetireCalls = 0;
let targetRetireTracking = false;
let providerStatFailures = 0;

FDState.requestClose = function(fd) {
  const trackRetirement = targetRetireTracking && fd === targetFd;
  const requested = originalFDStateRequestClose.apply(this, arguments);
  if (trackRetirement && requested) {
    targetRetireCalls += 1;
  }
  return requested;
};

Heap.prototype.malloc = function(size) {
  if (operationsMode && mapReadFailureInjected && size === 4097 &&
      mapMallocFailures < 2) {
    mapMallocFailures += 1;
    throw 'out of memory';
  }
  return originalHeapMalloc.apply(this, arguments);
};

function isTargetPath(filePath) {
  return path.resolve(String(filePath)) === targetPath;
}

function injectError(args, message, code = 'EIO') {
  const callback = args[args.length - 1];
  const error = new Error(message);
  error.code = code;
  process.nextTick(() => callback(error));
}

const originalOpen = fs.open;
fs.open = function(...args) {
  const filePath = String(args[0]);
  const numericFlags = typeof args[1] === 'number';
  const appendOpen = numericFlags && typeof fsConstants.O_APPEND === 'number' &&
    (args[1] & fsConstants.O_APPEND) !== 0;
  const callbackIndex = args.length - 1;
  const callback = args[callbackIndex];
  args[callbackIndex] = function(err, fd) {
    const expectedGeneration = !legacyCloseMode && targetGeneration === 0 && !appendOpen ||
      operationsMode && targetGeneration === 1 && appendOpen ||
      failureMode.startsWith('read-close-') && targetGeneration === 1 && !appendOpen ||
      legacyCloseMode && targetGeneration === 0 && !numericFlags;
    const expectedFlagShape = legacyCloseMode ? !numericFlags : numericFlags;
    if (!err && !targetActive && !targetTrackingComplete && expectedFlagShape &&
        expectedGeneration && isTargetPath(filePath)) {
      targetFd = fd;
      targetActive = true;
      targetRetireTracking = true;
      targetClosed = false;
      targetGeneration += 1;
      appendOpenObserved = appendOpen;
    }
    callback.apply(this, arguments);
  };
  return originalOpen.apply(this, args);
};

const originalFstat = fs.fstat;
fs.fstat = function(...args) {
  if (operationsMode && targetActive && args[0] === targetFd &&
      targetGeneration === 1 && targetFstatFailures === 0) {
    targetFstatFailures += 1;
    injectError(args, 'injected channel size failure');
    return;
  }
  if (operationsMode && targetActive && args[0] === targetFd &&
      targetGeneration === 2) {
    appendFstatCalls += 1;
    if (appendWriteCommitted && targetFstatFailures === 1) {
      targetFstatFailures += 1;
      committedWritePositionObserved = FDState.getPos(targetFd) === 4;
      injectError(args, 'injected post-write metadata failure');
      return;
    }
  }
  return originalFstat.apply(this, args);
};

const originalFtruncate = fs.ftruncate;
fs.ftruncate = function(...args) {
  if (operationsMode && targetActive && args[0] === targetFd &&
      targetTruncateFailures === 0) {
    targetTruncateFailures += 1;
    injectError(args, 'injected channel truncate failure');
    return;
  }
  return originalFtruncate.apply(this, args);
};

const originalRead = fs.read;
fs.read = function(...args) {
  if (targetActive && args[0] === targetFd) {
    targetReadCalls += 1;
    if (operationsMode && targetReadCalls <= 2) {
      if (targetReadCalls === 1) {
        mapReadFailureInjected = true;
      }
      injectError(args, targetReadCalls === 1 ?
        'injected channel map failure' : 'injected transfer-source failure');
      return;
    }
    if (failureMode === 'read-close-fallback' && targetReadCalls === 1) {
      injectError(args, 'injected fallback scatter-read failure');
      return;
    }
  }
  return originalRead.apply(this, args);
};

if (failureMode === 'read-close-fallback') {
  fs.readv = undefined;
} else if (typeof originalReadv === 'function') {
  fs.readv = function(...args) {
    if (failureMode === 'read-close-native' && targetActive && args[0] === targetFd) {
      targetReadCalls += 1;
      injectError(args, 'injected native scatter-read failure');
      return;
    }
    return originalReadv.apply(this, args);
  };
}

if (failureMode === 'operations-fallback') {
  fs.writev = undefined;
}

const originalWrite = fs.write;
fs.write = function(...args) {
  if (operationsMode && targetActive && args[0] === targetFd) {
    targetWriteCalls += 1;
    if (targetGeneration === 2) {
      const callbackIndex = args.length - 1;
      const callback = args[callbackIndex];
      args[callbackIndex] = function(err, bytesWritten) {
        if (!err && bytesWritten === 1) {
          appendWriteCommitted = true;
        }
        callback.apply(this, arguments);
      };
      return originalWrite.apply(this, args);
    }
    const fallbackGather = !nativeWritevEnabled;
    const transferWriteCall = fallbackGather ? 3 : 2;
    const committedWriteCall = transferWriteCall + 1;
    if (targetWriteCalls === 1) {
      injectError(args, 'injected scalar-write failure');
      return;
    }
    if (fallbackGather && targetWriteCalls === 2) {
      injectError(args, 'injected fallback gather-write failure');
      return;
    }
    if (targetWriteCalls === transferWriteCall) {
      injectError(args, 'injected transfer-target failure');
      return;
    }
    if (targetWriteCalls >= committedWriteCall) {
      injectError(args, 'unexpected target write call');
      return;
    }
  }
  return originalWrite.apply(this, args);
};

if (nativeWritevEnabled) {
  fs.writev = function(...args) {
    if (operationsMode && targetActive && args[0] === targetFd) {
      targetWritevFailures += 1;
      injectError(args, 'injected native gather-write failure');
      return;
    }
    return originalWritev.apply(this, args);
  };
}

const originalFsync = fs.fsync;
fs.fsync = function(...args) {
  if (operationsMode && targetActive && args[0] === targetFd &&
      targetFsyncFailures === 0) {
    targetFsyncFailures += 1;
    injectError(args, 'injected channel force failure');
    return;
  }
  return originalFsync.apply(this, args);
};

const originalClose = fs.close;
fs.close = function(...args) {
  const fd = args[0];
  if (targetActive && fd === targetFd) {
    targetCloseCalls += 1;
    const callbackIndex = args.length - 1;
    const callback = args[callbackIndex];
    args[callbackIndex] = function(err) {
      if (!err) {
        targetActive = false;
        targetClosed = true;
        if (targetGeneration === 2 || legacyCloseMode) {
          targetTrackingComplete = true;
        }
      }
      try {
        if (!err && (failureMode.startsWith('read-close-') && targetGeneration === 2 ||
            legacyCloseMode)) {
          const closeError = new Error('injected channel close failure');
          closeError.code = 'EIO';
          callback(closeError);
        } else {
          callback.apply(this, arguments);
        }
      } finally {
        targetRetireTracking = false;
      }
    };
  }
  return originalClose.apply(this, args);
};

const originalStat = fs.stat;
fs.stat = function(...args) {
  if (operationsMode && targetClosed && isTargetPath(args[0]) &&
      providerStatFailures === 0) {
    providerStatFailures += 1;
    injectError(args, 'injected provider access denial', 'EACCES');
    return;
  }
  return originalStat.apply(this, args);
};

process.on('exit', () => {
  let valid = targetFd !== null && targetClosed && targetTrackingComplete &&
    !targetRetireTracking;
  if (operationsMode) {
    const expectedWriteCalls = nativeWritevEnabled ? 3 : 4;
    valid = valid && targetGeneration === 2 && targetCloseCalls === 2 &&
      targetRetireCalls === 2 &&
      targetFstatFailures === 2 && appendFstatCalls === 3 && targetTruncateFailures === 1 &&
      appendOpenObserved && appendWriteCommitted && committedWritePositionObserved &&
      mapReadFailureInjected && mapMallocFailures === 2 &&
      targetReadCalls === 2 && targetWriteCalls === expectedWriteCalls &&
      targetFsyncFailures === 1 && providerStatFailures === 1;
    if (nativeWritevEnabled) {
      valid = valid && targetWritevFailures === 1;
    }
  } else if (legacyCloseMode) {
    valid = valid && targetGeneration === 1 && targetCloseCalls === 1 &&
      targetRetireCalls === 1;
  } else {
    valid = valid && targetGeneration === 2 && targetCloseCalls === 2 &&
      targetRetireCalls === 2 && targetReadCalls === 1;
  }
  if (!valid) {
    process.stderr.write('FileChannel IOException injector did not observe the expected lifecycle: ' +
      JSON.stringify({
        targetGeneration,
        targetActive,
        targetClosed,
        targetTrackingComplete,
        targetReadCalls,
        targetWriteCalls,
        targetFstatFailures,
        appendFstatCalls,
        appendOpenObserved,
        appendWriteCommitted,
        committedWritePositionObserved,
        targetTruncateFailures,
        targetWritevFailures,
        targetFsyncFailures,
        mapReadFailureInjected,
        mapMallocFailures,
        targetCloseCalls,
        targetRetireCalls,
        targetRetireTracking,
        providerStatFailures
      }) + '\n');
    process.exitCode = 1;
  }
});
