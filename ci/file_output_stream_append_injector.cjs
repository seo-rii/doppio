'use strict';

const fs = require('fs');
const path = require('path');

const failureMode = process.env.DOPPIO_FOS_APPEND_MODE;
const supportedModes = new Set(['state', 'fstat-open', 'fstat-write']);
if (!supportedModes.has(failureMode)) {
  throw new Error(`Unsupported DOPPIO_FOS_APPEND_MODE: ${failureMode}`);
}

const targetPath = path.resolve(
  'build',
  'modern-file-output-stream-append',
  'append-channel.txt'
);
const targetFds = new Set();
const validRegistrations = new Set();
const failedOpenStats = new Set();
const failedWriteStats = new Set();
const closedTargetFds = new Set();
const targetFstatCounts = new Map();
let scalarWriteChecks = 0;
let vectorWriteChecks = 0;
let committedWriteProgressObserved = false;
let recoveredWritePositionObserved = false;

function isTargetPath(filePath) {
  return path.resolve(String(filePath)) === targetPath;
}

function isFileOutputStreamAppend(flags) {
  return typeof flags === 'string' && flags.indexOf('a') !== -1;
}

function rejectWrite(args, message) {
  const callback = args[args.length - 1];
  const error = new Error(message);
  error.code = 'EIO';
  process.nextTick(() => callback(error));
}

const originalOpen = fs.open;
fs.open = function(...args) {
  const filePath = String(args[0]);
  const append = isFileOutputStreamAppend(args[1]);
  const callbackIndex = args.length - 1;
  const callback = args[callbackIndex];
  args[callbackIndex] = function(err, fd) {
    if (!err && append && isTargetPath(filePath)) {
      targetFds.add(fd);
    }
    callback.apply(this, arguments);
  };
  return originalOpen.apply(this, args);
};

const doppio = require('../build/release-cli/src/doppiojvm');
const FDState = doppio.VM.FDState;
const originalFDStateOpen = FDState.open;
FDState.open = function(fd, initialPosition, append, syncMode, filePath) {
  if (targetFds.has(fd) && initialPosition === 1 && append === true &&
      syncMode === 0 && isTargetPath(filePath)) {
    validRegistrations.add(fd);
  }
  return originalFDStateOpen.call(this, fd, initialPosition, append, syncMode, filePath);
};

const originalFDStateSetPosIfCurrent = FDState.setPosIfCurrent;
FDState.setPosIfCurrent = function(fd, generation, newPosition) {
  const committed = originalFDStateSetPosIfCurrent.call(
    this,
    fd,
    generation,
    newPosition
  );
  if (committed && failureMode === 'fstat-write' && targetFds.has(fd) &&
      failedWriteStats.has(fd) && newPosition === 3 && FDState.getPos(fd) === 3) {
    recoveredWritePositionObserved = true;
  }
  return committed;
};

const originalFstat = fs.fstat;
fs.fstat = function(...args) {
  const fd = args[0];
  if (targetFds.has(fd)) {
    const count = (targetFstatCounts.get(fd) || 0) + 1;
    targetFstatCounts.set(fd, count);
    if (failureMode === 'fstat-open' && count === 1) {
      failedOpenStats.add(fd);
      const callback = args[args.length - 1];
      const error = new Error('injected append-open fstat failure');
      error.code = 'EIO';
      process.nextTick(() => callback(error));
      return;
    }
    if (failureMode === 'fstat-write' && count === 2) {
      failedWriteStats.add(fd);
      committedWriteProgressObserved = FDState.getPos(fd) === 2;
      const callback = args[args.length - 1];
      const error = new Error('injected post-write fstat failure');
      error.code = 'EIO';
      process.nextTick(() => callback(error));
      return;
    }
  }
  return originalFstat.apply(this, args);
};

const originalWrite = fs.write;
fs.write = function(...args) {
  const fd = args[0];
  if ((failureMode === 'state' || failureMode === 'fstat-write') && targetFds.has(fd)) {
    scalarWriteChecks += 1;
    if (!validRegistrations.has(fd) || !FDState.isAppend(fd) || args[4] !== null) {
      rejectWrite(args, 'append scalar write did not use registered append state');
      return;
    }
  }
  return originalWrite.apply(this, args);
};

const originalWritev = fs.writev;
if (typeof originalWritev === 'function') {
  fs.writev = function(...args) {
    const fd = args[0];
    if (failureMode === 'state' && targetFds.has(fd)) {
      vectorWriteChecks += 1;
      if (!validRegistrations.has(fd) || !FDState.isAppend(fd) || args[2] !== null) {
        rejectWrite(args, 'append vector write did not use registered append state');
        return;
      }
    }
    return originalWritev.apply(this, args);
  };
}

const originalClose = fs.close;
fs.close = function(...args) {
  const fd = args[0];
  const callbackIndex = args.length - 1;
  const callback = args[callbackIndex];
  args[callbackIndex] = function(err) {
    if (!err && targetFds.has(fd)) {
      closedTargetFds.add(fd);
    }
    callback.apply(this, arguments);
  };
  return originalClose.apply(this, args);
};

process.on('exit', () => {
  let valid = targetFds.size === 1;
  if (failureMode === 'state') {
    valid = valid && validRegistrations.size === 1 && scalarWriteChecks >= 3;
    if (typeof originalWritev === 'function') {
      valid = valid && vectorWriteChecks === 1;
    }
  } else if (failureMode === 'fstat-open') {
    valid = valid && failedOpenStats.size === 1 && closedTargetFds.size === 1;
  } else {
    valid = valid && validRegistrations.size === 1 && scalarWriteChecks === 2 &&
      failedWriteStats.size === 1 && committedWriteProgressObserved &&
      recoveredWritePositionObserved && closedTargetFds.size === 1;
  }
  if (!valid) {
    process.stderr.write('FileOutputStream append injector did not observe the expected lifecycle.\n');
    process.exitCode = 1;
  }
});
