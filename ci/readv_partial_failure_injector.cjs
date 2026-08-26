'use strict';

const fs = require('fs');
const path = require('path');

const failureMode = process.env.DOPPIO_READV_FAILURE_MODE;
const supportedModes = new Set(['fallback-read', 'fallback-eof', 'native-read']);
if (!supportedModes.has(failureMode)) {
  throw new Error(`Unsupported DOPPIO_READV_FAILURE_MODE: ${failureMode}`);
}

const targetPath = path.resolve(
  'build',
  'modern-filechannel-readv-partial',
  'readv-partial-progress.txt'
);
const targetFds = new Set();
const readCounts = new Map();
let nativeReadvCompleted = false;

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
  fs.readv = undefined;
} else {
  const originalReadv = fs.readv;
  fs.readv = function(...args) {
    const target = targetFds.has(args[0]);
    if (target) {
      const callbackIndex = args.length - 1;
      const callback = args[callbackIndex];
      args[callbackIndex] = function() {
        nativeReadvCompleted = true;
        callback.apply(this, arguments);
      };
    }
    return originalReadv.apply(this, args);
  };
}

const originalRead = fs.read;
fs.read = function(...args) {
  const fd = args[0];
  if (failureMode === 'native-read' && targetFds.has(fd) && !nativeReadvCompleted) {
    const callback = args[args.length - 1];
    const error = new Error('expected native readv before scalar read');
    error.code = 'EIO';
    process.nextTick(() => callback(error));
    return;
  }
  if (failureMode === 'fallback-read' && targetFds.has(fd)) {
    const count = (readCounts.get(fd) || 0) + 1;
    readCounts.set(fd, count);
    if (count === 2) {
      const callback = args[args.length - 1];
      const error = new Error('injected second-vector read failure');
      error.code = 'EIO';
      process.nextTick(() => callback(error));
      return;
    }
  }
  return originalRead.apply(this, args);
};
