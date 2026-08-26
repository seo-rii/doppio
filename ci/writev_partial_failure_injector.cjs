'use strict';

const fs = require('fs');
const path = require('path');

const failureMode = process.env.DOPPIO_WRITEV_FAILURE_MODE;
const supportedModes = new Set(['fallback-write', 'fallback-sync', 'fallback-stat', 'native-sync']);
if (!supportedModes.has(failureMode)) {
  throw new Error(`Unsupported DOPPIO_WRITEV_FAILURE_MODE: ${failureMode}`);
}

const targetPath = path.resolve(
  'build',
  'modern-filechannel-writev-partial',
  'writev-partial-progress.txt'
);
const targetFds = new Set();
const writeCounts = new Map();
const syncCounts = new Map();
const failedStats = new Set();
let nativeWritevObserved = false;

function isTargetPath(filePath) {
  return path.resolve(String(filePath)) === targetPath;
}

const originalOpen = fs.open;
fs.open = function(...args) {
  const filePath = String(args[0]);
  const callbackIndex = args.length - 1;
  const callback = args[callbackIndex];
  args[callbackIndex] = function(err, fd) {
    if (!err && isTargetPath(filePath)) {
      targetFds.add(fd);
    }
    callback.apply(this, arguments);
  };
  return originalOpen.apply(this, args);
};

if (failureMode.startsWith('fallback-')) {
  fs.writev = undefined;
} else {
  const originalWritev = fs.writev;
  fs.writev = function(...args) {
    if (targetFds.has(args[0])) {
      nativeWritevObserved = true;
    }
    return originalWritev.apply(this, args);
  };
}

const originalWrite = fs.write;
fs.write = function(...args) {
  const fd = args[0];
  if (failureMode === 'native-sync' && targetFds.has(fd) && !nativeWritevObserved) {
    const callback = args[args.length - 1];
    const error = new Error('expected native writev before scalar write');
    error.code = 'EIO';
    process.nextTick(() => callback(error));
    return;
  }
  if ((failureMode === 'fallback-write' || failureMode === 'fallback-stat') && targetFds.has(fd)) {
    const count = (writeCounts.get(fd) || 0) + 1;
    writeCounts.set(fd, count);
    if (failureMode === 'fallback-write' && count === 2) {
      const callback = args[args.length - 1];
      const error = new Error('injected second-vector write failure');
      error.code = 'EIO';
      process.nextTick(() => callback(error));
      return;
    }
  }
  return originalWrite.apply(this, args);
};

const originalFstat = fs.fstat;
fs.fstat = function(...args) {
  const fd = args[0];
  if (failureMode === 'fallback-stat' && targetFds.has(fd) &&
      (writeCounts.get(fd) || 0) > 0 && !failedStats.has(fd)) {
    failedStats.add(fd);
    const callback = args[args.length - 1];
    const error = new Error('injected post-append stat failure');
    error.code = 'EIO';
    process.nextTick(() => callback(error));
    return;
  }
  return originalFstat.apply(this, args);
};

const originalFsync = fs.fsync;
fs.fsync = function(...args) {
  const fd = args[0];
  if (failureMode.endsWith('sync') && targetFds.has(fd)) {
    const count = (syncCounts.get(fd) || 0) + 1;
    syncCounts.set(fd, count);
    if (count === 1) {
      const callback = args[args.length - 1];
      const error = new Error('injected post-write sync failure');
      error.code = 'EIO';
      process.nextTick(() => callback(error));
      return;
    }
  }
  return originalFsync.apply(this, args);
};

if (failureMode.endsWith('sync')) {
  const doppio = require('../build/release-cli/src/doppiojvm');
  const FDState = doppio.VM.FDState;
  const originalFDStateOpen = FDState.open;
  FDState.open = function(fd, initialPosition, append, syncMode, filePath) {
    if (isTargetPath(filePath)) {
      syncMode = 1;
    }
    return originalFDStateOpen.call(this, fd, initialPosition, append, syncMode, filePath);
  };
}
