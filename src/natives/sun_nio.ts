import * as JVMTypes from '../../includes/JVMTypes';
import * as Doppio from '../doppiojvm';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import logging = Doppio.Debug.Logging;
import util = Doppio.VM.Util;
import Long = Doppio.VM.Long;
import ThreadStatus = Doppio.VM.Enums.ThreadStatus;
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as BrowserFS from 'browserfs';
import FDState = Doppio.VM.FDState;
import {FDCloseInfo, FDOperationLease, FDRetention} from '../fd_state';
import {
  mappedByteBufferMappings,
  MappedByteBufferMapping,
  MappedByteBufferMappingTable
} from './java_nio';
let BFSUtils = BrowserFS.BFSRequire('bfs_utils');

interface IOVec {
  base: number;
  len: number;
}

interface LeasedFDOperation {
  lease: FDOperationLease;
  finish: (action: () => void) => void;
  completionStarted: boolean;
}

interface HostCallbackState {
  callbackStarted: boolean;
}

interface LeasedFDPair {
  sourceLease: FDOperationLease;
  destinationLease: FDOperationLease;
  finish: (action: () => void) => void;
  completionStarted: boolean;
}

interface UnixOpenFlags {
  read: boolean;
  write: boolean;
  append: boolean;
  create: boolean;
  createNew: boolean;
  truncate: boolean;
  sync: boolean;
  dataSync: boolean;
  noFollow: boolean;
}

interface MountEntry {
  name: string;
  dir: string;
  fstype: string;
  opts: string;
  dev: number;
}

interface MountTable {
  entries: MountEntry[];
  pos: number;
}

interface BrowserFsIdentity {
  dev: number;
  ino: number;
}

interface BrowserFsLocation {
  fs: any;
  path: string;
}

interface BrowserFsBackendIdentity {
  dev: number;
  inodes: Map<string, number>;
}

const browserFsBackends = new WeakMap<object, BrowserFsBackendIdentity>();
const browserFsOpenFiles = new WeakMap<object, BrowserFsIdentity>();
let nextBrowserFsDevice = 1;
let nextBrowserFsInode = 1;

function makeLeasedFinisher(
    lease: FDOperationLease): (action: () => void) => void {
  let finished = false;
  return (action: () => void): void => {
    if (finished) {
      return;
    }
    finished = true;
    try {
      action();
    } finally {
      FDState.releaseOperation(lease);
    }
  };
}

function readIOVecs(thread: JVMThread, address: Long, len: number): IOVec[] {
  const heap = thread.getJVM().getHeap(),
    base = address.toNumber(),
    sizeOfIOVec = 8,
    vecs: IOVec[] = [];

  for (let i = 0; i < len; i++) {
    const offset = base + i * sizeOfIOVec,
      vecBase = heap.get_word(offset),
      vecLen = heap.get_word(offset + 4);
    if (vecLen > 0) {
      vecs.push({ base: vecBase, len: vecLen });
    }
  }
  return vecs;
}

export default function (): any {
  function beginFileDispatcherOperation(
      thread: JVMThread,
      fd: number): LeasedFDOperation {
    if (fd === -1) {
      thread.throwNewException('Ljava/io/IOException;', 'Bad file descriptor');
      return null;
    }
    const lease = FDState.acquireOperation(fd);
    if (lease === null) {
      thread.throwNewException('Ljava/io/IOException;', 'Stream Closed');
      return null;
    }
    thread.setStatus(ThreadStatus.ASYNC_WAITING);
    return {
      lease: lease,
      finish: makeLeasedFinisher(lease),
      completionStarted: false
    };
  }

  function closedDescriptorError(message: string = 'Bad file descriptor'): NodeJS.ErrnoException {
    const err = <NodeJS.ErrnoException> new Error(message);
    err.code = 'EBADF';
    return err;
  }

  function beginDescriptorPair(
      thread: JVMThread,
      sourceFd: number,
      destinationFd: number,
      unixErrors: boolean): LeasedFDPair {
    if (sourceFd === -1 || destinationFd === -1) {
      if (unixErrors) {
        throwUnixException(thread, closedDescriptorError());
      } else {
        thread.throwNewException('Ljava/io/IOException;', 'Bad file descriptor');
      }
      return null;
    }
    const sourceLease = FDState.acquireOperation(sourceFd);
    if (sourceLease === null) {
      if (unixErrors) {
        throwUnixException(thread, closedDescriptorError());
      } else {
        thread.throwNewException('Ljava/io/IOException;', 'Stream Closed');
      }
      return null;
    }
    const destinationLease = FDState.acquireOperation(destinationFd);
    if (destinationLease === null) {
      FDState.releaseOperation(sourceLease);
      if (unixErrors) {
        throwUnixException(thread, closedDescriptorError());
      } else {
        thread.throwNewException('Ljava/io/IOException;', 'Stream Closed');
      }
      return null;
    }
    let finished = false;
    const finish = (action: () => void): void => {
      if (finished) {
        return;
      }
      finished = true;
      try {
        action();
      } finally {
        let releaseError: any = null;
        const leases = [sourceLease, destinationLease];
        for (let i = leases.length - 1; i >= 0; i--) {
          try {
            FDState.releaseOperation(leases[i]);
          } catch (err) {
            if (releaseError === null) {
              releaseError = err;
            }
          }
        }
        if (releaseError !== null) {
          throw releaseError;
        }
      }
    };
    thread.setStatus(ThreadStatus.ASYNC_WAITING);
    return {
      sourceLease: sourceLease,
      destinationLease: destinationLease,
      finish: finish,
      completionStarted: false
    };
  }

  function finishFileDispatcherPair(
      thread: JVMThread,
      operation: LeasedFDPair,
      err: NodeJS.ErrnoException,
      success: () => void): void {
    if (operation.completionStarted) {
      return;
    }
    operation.completionStarted = true;
    operation.finish(() => {
      if (err) {
        throwChannelIOException(thread, err);
      } else if (!FDState.isCurrent(
          operation.sourceLease.fd,
          operation.sourceLease.generation) ||
          !FDState.isCurrent(
            operation.destinationLease.fd,
            operation.destinationLease.generation)) {
        thread.throwNewException('Ljava/io/IOException;', 'Stream Closed');
      } else {
        success();
      }
    });
  }

  function dispatchFileDispatcherPair(
      thread: JVMThread,
      operation: LeasedFDPair,
      dispatch: () => void): void {
    try {
      dispatch();
    } catch (err) {
      if (operation.sourceLease.released || operation.destinationLease.released) {
        throw err;
      }
      finishFileDispatcherPair(
        thread,
        operation,
        <NodeJS.ErrnoException> err,
        () => {}
      );
    }
  }

  function beginUnixDescriptorOperation(
      thread: JVMThread,
      fd: number): LeasedFDOperation {
    const lease = fd === -1 ? null : FDState.acquireOperation(fd);
    if (lease === null) {
      throwUnixException(thread, closedDescriptorError());
      return null;
    }
    thread.setStatus(ThreadStatus.ASYNC_WAITING);
    return {
      lease: lease,
      finish: makeLeasedFinisher(lease),
      completionStarted: false
    };
  }

  function finishUnixDescriptorOperation(
      thread: JVMThread,
      operation: LeasedFDOperation,
      err: NodeJS.ErrnoException,
      success: () => void): void {
    if (operation.completionStarted) {
      return;
    }
    operation.completionStarted = true;
    const completionError = err || (FDState.isCurrent(
      operation.lease.fd,
      operation.lease.generation
    ) ? null : closedDescriptorError());
    if (completionError === null) {
      operation.finish(success);
      return;
    }
    try {
      convertError(
        thread,
        completionError,
        (convertedErr) => {
          operation.finish(() => thread.throwException(convertedErr));
        },
        () => operation.finish(() => {})
      );
    } catch (conversionErr) {
      if (operation.lease.released) {
        throw conversionErr;
      }
      operation.finish(() => {
        throw conversionErr;
      });
    }
  }

  function dispatchUnixDescriptorOperation(
      thread: JVMThread,
      operation: LeasedFDOperation,
      dispatch: () => void): void {
    try {
      dispatch();
    } catch (err) {
      if (operation.lease.released || operation.completionStarted) {
        throw err;
      }
      finishUnixDescriptorOperation(
        thread,
        operation,
        <NodeJS.ErrnoException> err,
        () => {}
      );
    }
  }

  function finishUnixDescriptorPair(
      thread: JVMThread,
      operation: LeasedFDPair,
      err: NodeJS.ErrnoException,
      success: () => void): void {
    if (operation.completionStarted) {
      return;
    }
    operation.completionStarted = true;
    const descriptorsCurrent =
      FDState.isCurrent(
        operation.sourceLease.fd,
        operation.sourceLease.generation) &&
      FDState.isCurrent(
        operation.destinationLease.fd,
        operation.destinationLease.generation),
      completionError = err || (descriptorsCurrent ? null : closedDescriptorError());
    if (completionError === null) {
      operation.finish(success);
      return;
    }
    try {
      convertError(
        thread,
        completionError,
        (convertedErr) => {
          operation.finish(() => thread.throwException(convertedErr));
        },
        () => operation.finish(() => {})
      );
    } catch (conversionErr) {
      if (operation.sourceLease.released || operation.destinationLease.released) {
        throw conversionErr;
      }
      operation.finish(() => {
        throw conversionErr;
      });
    }
  }

  function dispatchUnixDescriptorPair(
      thread: JVMThread,
      operation: LeasedFDPair,
      dispatch: () => void): void {
    try {
      dispatch();
    } catch (err) {
      if (operation.sourceLease.released || operation.destinationLease.released ||
          operation.completionStarted) {
        throw err;
      }
      finishUnixDescriptorPair(
        thread,
        operation,
        <NodeJS.ErrnoException> err,
        () => {}
      );
    }
  }

  function finishFileDispatcherOperation(
      thread: JVMThread,
      operation: LeasedFDOperation,
      err: NodeJS.ErrnoException,
      success: () => void,
      ioStatusType?: 'int' | 'long'): void {
    if (operation.completionStarted) {
      return;
    }
    operation.completionStarted = true;
    operation.finish(() => {
      if (err) {
        let ioStatus: number = null;
        if (ioStatusType !== undefined) {
          if (err.code === 'EINTR') {
            ioStatus = -3;
          } else if (err.code === 'EAGAIN' || err.code === 'EWOULDBLOCK') {
            ioStatus = -2;
          }
        }
        if (ioStatus === null) {
          throwChannelIOException(thread, err);
        } else if (ioStatusType === 'long') {
          thread.asyncReturn(Long.fromNumber(ioStatus), null);
        } else {
          thread.asyncReturn(ioStatus);
        }
      } else if (!FDState.isCurrent(
          operation.lease.fd,
          operation.lease.generation)) {
        thread.throwNewException('Ljava/io/IOException;', 'Stream Closed');
      } else {
        success();
      }
    });
  }

  function dispatchFileDispatcherOperation(
      thread: JVMThread,
      operation: LeasedFDOperation,
      dispatch: () => void,
      ioStatusType?: 'int' | 'long',
      callbackState?: HostCallbackState,
      synchronousError?: (err: NodeJS.ErrnoException) => boolean): void {
    try {
      dispatch();
    } catch (err) {
      if (operation.lease.released || operation.completionStarted ||
          callbackState !== undefined && callbackState.callbackStarted) {
        throw err;
      }
      if (synchronousError !== undefined &&
          synchronousError(<NodeJS.ErrnoException> err)) {
        return;
      }
      finishFileDispatcherOperation(
        thread,
        operation,
        <NodeJS.ErrnoException> err,
        () => {},
        ioStatusType
      );
    }
  }

  function getBrowserFsModule(): any {
    return typeof (<any> fs).getFSModule === 'function' ? (<any> fs).getFSModule() : null;
  }

  function getBrowserFsIdentity(backend: any, backendPath: string): BrowserFsIdentity {
    if (backend === null || (typeof backend !== 'object' && typeof backend !== 'function')) {
      return null;
    }

    let backendIdentity = browserFsBackends.get(backend);
    if (backendIdentity === undefined) {
      backendIdentity = { dev: nextBrowserFsDevice++, inodes: new Map<string, number>() };
      browserFsBackends.set(backend, backendIdentity);
    }

    let inodeKey = `path:${backendPath}`;
    try {
      // BrowserFS key-value backends keep a stable internal inode across a
      // rename even though their public Stats objects hard-code dev/ino to 0.
      if (backend.store !== undefined && typeof backend.store.beginTransaction === 'function' &&
          typeof backend._findINode === 'function' && backend._findINode.length === 3) {
        const transaction = backend.store.beginTransaction('readonly'),
          metadataNodeId = backend._findINode(
            transaction,
            path.dirname(backendPath),
            path.basename(backendPath)
          );
        if (metadataNodeId !== null && metadataNodeId !== undefined) {
          inodeKey = `inode:${String(metadataNodeId)}`;
        }
      }
    } catch (err) {
      // Other BrowserFS backends do not expose synchronous inode metadata. The
      // path fallback is stable for the read-only backends used by the site.
    }

    let ino = backendIdentity.inodes.get(inodeKey);
    if (ino === undefined) {
      ino = nextBrowserFsInode++;
      backendIdentity.inodes.set(inodeKey, ino);
    }
    return { dev: backendIdentity.dev, ino: ino };
  }

  function getBrowserFsLocation(pathString: string): BrowserFsLocation {
    const fsModule = getBrowserFsModule(),
      root = fsModule !== null && typeof fsModule.getRootFS === 'function' ? fsModule.getRootFS() : null;
    if (root === null) {
      return null;
    }

    const normalizedPath = path.resolve(pathString),
      resolved = typeof root._getFs === 'function' ? root._getFs(normalizedPath) :
        { fs: root, path: normalizedPath };
    return { fs: resolved.fs, path: resolved.path };
  }

  function getBrowserFsPathIdentity(pathString: string): BrowserFsIdentity {
    const resolved = getBrowserFsLocation(pathString);
    return resolved === null ? null : getBrowserFsIdentity(resolved.fs, resolved.path);
  }

  function getBrowserFsFile(fd: number): any {
    const fsModule = getBrowserFsModule();
    if (fsModule === null || typeof fsModule.fd2file !== 'function') {
      return null;
    }

    try {
      return fsModule.fd2file(fd);
    } catch (err) {
      return null;
    }
  }

  function getBrowserFsFdIdentity(fd: number): BrowserFsIdentity {
    const file = getBrowserFsFile(fd);
    if (file === null) {
      return null;
    }

    try {
      let identity = browserFsOpenFiles.get(file);
      if (identity === undefined) {
        identity = getBrowserFsIdentity(
          file._fs,
          typeof file.getPath === 'function' ? file.getPath() : file._path
        );
        if (identity !== null) {
          browserFsOpenFiles.set(file, identity);
        }
      }
      return identity;
    } catch (err) {
      return null;
    }
  }

  function syncBrowserFsFile(
      file: any,
      cb: (err?: NodeJS.ErrnoException) => void): void {
    file._dirty = true;
    file.sync((err?: NodeJS.ErrnoException) => {
      cb(err);
    });
  }

  function finishWrite(
      thread: JVMThread,
      lease: FDOperationLease,
      numBytes: number,
      advancePosition: boolean,
      cb: (numBytes: number) => void,
      errorCb: (err: NodeJS.ErrnoException, committedBytes: number) => void,
      callbackState?: HostCallbackState,
      operationCompleted?: () => boolean): void {
    const fd = lease.fd,
      dispatchState = callbackState === undefined ?
        {callbackStarted: false} : callbackState,
      isOperationCompleted = operationCompleted === undefined ?
        () => false : operationCompleted;
    let finished = false,
      syncDispatched = false;
    const fail = (err: NodeJS.ErrnoException): void => {
      if (!finished && !isOperationCompleted()) {
        finished = true;
        errorCb(err, numBytes);
      }
    };
    const succeed = (): void => {
      if (!finished && !isOperationCompleted()) {
        finished = true;
        cb(numBytes);
      }
    };
    const syncAndReturn = (): void => {
      if (syncDispatched || isOperationCompleted()) {
        return;
      }
      if (!FDState.isCurrent(fd, lease.generation)) {
        fail(closedDescriptorError('Stream Closed'));
        return;
      }
      syncDispatched = true;
      const syncMode = FDState.getSyncMode(fd);
      if (syncMode === 2 && typeof (<any> fs).fdatasync === 'function') {
        let callbackStarted = false;
        try {
          (<any> fs).fdatasync(fd, (err?: NodeJS.ErrnoException) => {
            callbackStarted = true;
            dispatchState.callbackStarted = true;
            if (finished || isOperationCompleted()) {
              return;
            }
            if (err) {
              fail(err);
            } else {
              succeed();
            }
          });
        } catch (syncErr) {
          if (callbackStarted || finished || isOperationCompleted()) {
            throw syncErr;
          }
          fail(<NodeJS.ErrnoException> syncErr);
        }
      } else if (syncMode !== 0) {
        let callbackStarted = false;
        try {
          fs.fsync(fd, (err?: NodeJS.ErrnoException) => {
            callbackStarted = true;
            dispatchState.callbackStarted = true;
            if (finished || isOperationCompleted()) {
              return;
            }
            if (err) {
              fail(err);
            } else {
              succeed();
            }
          });
        } catch (syncErr) {
          if (callbackStarted || finished || isOperationCompleted()) {
            throw syncErr;
          }
          fail(<NodeJS.ErrnoException> syncErr);
        }
      } else {
        succeed();
      }
    };

    if (isOperationCompleted()) {
      return;
    }
    if (FDState.isAppend(fd)) {
      // Preserve at least this operation's progress even if the authoritative
      // post-append stat or sync fails. A successful stat also incorporates
      // growth from other append descriptors.
      if (!FDState.incrementPosIfCurrent(fd, lease.generation, numBytes)) {
        fail(closedDescriptorError('Stream Closed'));
        return;
      }
      let callbackStarted = false,
        callbackHandled = false;
      try {
        fs.fstat(fd, (err, stats) => {
          callbackStarted = true;
          dispatchState.callbackStarted = true;
          if (callbackHandled || finished || isOperationCompleted()) {
            return;
          }
          callbackHandled = true;
          if (err) {
            fail(err);
          } else if (!FDState.isCurrent(fd, lease.generation)) {
            fail(closedDescriptorError('Stream Closed'));
          } else {
            FDState.setPosIfCurrent(fd, lease.generation, stats.size);
            syncAndReturn();
          }
        });
      } catch (statErr) {
        if (callbackStarted || finished || isOperationCompleted()) {
          throw statErr;
        }
        fail(<NodeJS.ErrnoException> statErr);
      }
    } else {
      if (advancePosition) {
        if (!FDState.incrementPosIfCurrent(fd, lease.generation, numBytes)) {
          fail(closedDescriptorError('Stream Closed'));
          return;
        }
      }
      syncAndReturn();
    }
  }

  function writeBuffer(
      thread: JVMThread,
      lease: FDOperationLease,
      data: Buffer,
      offset: number,
      length: number,
      position: number,
      advancePosition: boolean,
      appendAtEnd: boolean,
      cb: (numBytes: number) => void,
      errorCb: (
        err: NodeJS.ErrnoException,
        committedBytes: number,
        ioStatusEligible: boolean
      ) => void,
      callbackState?: HostCallbackState,
      operationCompleted?: () => boolean): void {
    const fd = lease.fd,
      dispatchState = callbackState === undefined ?
        {callbackStarted: false} : callbackState,
      isOperationCompleted = operationCompleted === undefined ?
        () => false : operationCompleted;
    const append = FDState.isAppend(fd);
    let finished = false;
    const fail = (
        err: NodeJS.ErrnoException,
        committedBytes: number = 0,
        ioStatusEligible: boolean = false): void => {
      if (!finished && !isOperationCompleted()) {
        finished = true;
        errorCb(err, committedBytes, ioStatusEligible);
      }
    };
    const succeed = (numBytes: number): void => {
      if (!finished && !isOperationCompleted()) {
        finished = true;
        cb(numBytes);
      }
    };
    const writeAt = (writePosition: number | null): void => {
      if (finished || isOperationCompleted()) {
        return;
      }
      if (!FDState.isCurrent(fd, lease.generation)) {
        fail(closedDescriptorError('Stream Closed'));
        return;
      }
      let callbackStarted = false,
        callbackHandled = false;
      try {
        fs.write(fd, data, offset, length, writePosition, (err, numBytes) => {
          callbackStarted = true;
          dispatchState.callbackStarted = true;
          if (callbackHandled || finished || isOperationCompleted()) {
            return;
          }
          callbackHandled = true;
          if (err) {
            fail(err, 0, true);
          } else if (!FDState.isCurrent(fd, lease.generation)) {
            fail(closedDescriptorError('Stream Closed'), numBytes);
          } else {
            finishWrite(
              thread,
              lease,
              numBytes,
              advancePosition,
              succeed,
              fail,
              dispatchState,
              isOperationCompleted
            );
          }
        });
      } catch (writeErr) {
        if (callbackStarted || finished || isOperationCompleted()) {
          throw writeErr;
        }
        fail(<NodeJS.ErrnoException> writeErr, 0, true);
      }
    };

    if (isOperationCompleted()) {
      return;
    }
    if (append && util.are_in_browser()) {
      let callbackStarted = false,
        callbackHandled = false;
      try {
        fs.fstat(fd, (err, stats) => {
          callbackStarted = true;
          dispatchState.callbackStarted = true;
          if (callbackHandled || finished || isOperationCompleted()) {
            return;
          }
          callbackHandled = true;
          if (err) {
            fail(err);
          } else if (!FDState.isCurrent(fd, lease.generation)) {
            fail(closedDescriptorError('Stream Closed'));
          } else {
            FDState.setPosIfCurrent(fd, lease.generation, stats.size);
            writeAt(stats.size);
          }
        });
      } catch (statErr) {
        if (callbackStarted || finished || isOperationCompleted()) {
          throw statErr;
        }
        fail(<NodeJS.ErrnoException> statErr);
      }
    } else if (append && appendAtEnd) {
      writeAt(null);
    } else {
      writeAt(position);
    }
  }

  function closeFileDescriptor(
      fd: number,
      cb: (err?: NodeJS.ErrnoException) => void): void {
    let logicalCompleted = false;
    const completeLogicalClose = (err?: NodeJS.ErrnoException): void => {
      if (logicalCompleted) {
        if (err) {
          logging.error('Deferred mapped-descriptor close failed.', err);
        }
        return;
      }
      logicalCompleted = true;
      cb(err);
    };
    const requested = FDState.requestClose(fd, (closeInfo: FDCloseInfo) => {
      if (util.are_in_browser() && closeInfo.unlinked) {
        const browserFs = typeof (<any> fs).getFSModule === 'function' ?
          (<any> fs).getFSModule() : null;
        if (browserFs === null || typeof browserFs.closeFd !== 'function') {
          const unavailableError = <NodeJS.ErrnoException>
            new Error('Unable to discard an unlinked BrowserFS descriptor.');
          unavailableError.code = 'EIO';
          completeLogicalClose(unavailableError);
          return;
        }
        try {
          // BrowserFS flushes dirty handles by path, but a POSIX descriptor
          // remains valid after unlink. The file is already unreachable, so
          // discard only descriptors that unlink0 explicitly marked.
          browserFs.closeFd(fd);
        } catch (closeErr) {
          completeLogicalClose(<NodeJS.ErrnoException> closeErr);
          return;
        }
        completeLogicalClose();
        return;
      }
      let closeCallbackStarted = false;
      try {
        fs.close(fd, (err?: NodeJS.ErrnoException) => {
          closeCallbackStarted = true;
          completeLogicalClose(err);
        });
      } catch (closeErr) {
        if (closeCallbackStarted) {
          throw closeErr;
        }
        completeLogicalClose(<NodeJS.ErrnoException> closeErr);
      }
    }, () => completeLogicalClose());
    if (!requested) {
      completeLogicalClose();
    }
  }

  class sun_nio_ch_FileChannelImpl {
    private static mappedBases: { [address: number]: number } = {};

    private static map(thread: JVMThread, javaThis: JVMTypes.sun_nio_ch_FileChannelImpl, prot: number, positionArg: Long, lenArg: Long): void {
      const fdObj = (<any> javaThis)['sun/nio/ch/FileChannelImpl/fd'],
        fd = fdObj['java/io/FileDescriptor/fd'],
        position = positionArg.toNumber(),
        len = lenArg.toNumber(),
        heap = thread.getJVM().getHeap(),
        pageSize = 4096,
        lease = fd === -1 ? null : FDState.acquireOperation(fd);
      if (lease === null) {
        thread.throwNewException(
          'Ljava/io/IOException;',
          fd === -1 ? 'Bad file descriptor' : 'Stream Closed'
        );
        return;
      }
      const writable = prot === 1;
      let retention: FDRetention = writable && len > 0 ? FDState.retain(fd) : null;
      if (writable && len > 0 && retention === null) {
        FDState.releaseOperation(lease);
        thread.throwNewException('Ljava/io/IOException;', 'Stream Closed');
        return;
      }
      let baseAddr: number = 0,
        addr: number = 0,
        buf: Buffer = null,
        allocated = false,
        addressReady = false,
        disposed = false,
        finished = false,
        installedMapping: MappedByteBufferMapping = null;
      const dispose = (): void => {
        if (disposed) {
          return;
        }
        disposed = true;
        if (addressReady) {
          delete sun_nio_ch_FileChannelImpl.mappedBases[addr];
          const mappingTable = mappedByteBufferMappings.get(heap);
          if (mappingTable !== undefined && mappingTable[addr] === installedMapping) {
            delete mappingTable[addr];
            if (Object.keys(mappingTable).length === 0) {
              mappedByteBufferMappings.delete(heap);
            }
          }
        }
        let cleanupError: any = null;
        if (allocated) {
          try {
            heap.free(baseAddr);
          } catch (err) {
            cleanupError = err;
          }
        }
        try {
          FDState.releaseRetention(retention);
        } catch (err) {
          cleanupError = cleanupError || err;
        }
        if (cleanupError !== null) {
          throw cleanupError;
        }
      };
      const finish = (keepMapping: boolean, action: () => void): void => {
        if (finished) {
          return;
        }
        finished = true;
        let actionError: any = null,
          actionFailed = false,
          cleanupError: any = null,
          actionCompleted = false;
        try {
          action();
          actionCompleted = true;
        } catch (err) {
          actionFailed = true;
          actionError = err;
        }
        if (!keepMapping || !actionCompleted) {
          try {
            dispose();
          } catch (err) {
            cleanupError = err;
          }
        }
        try {
          FDState.releaseOperation(lease);
        } catch (err) {
          cleanupError = cleanupError || err;
        }
        if (actionFailed) {
          throw actionError;
        }
        if (cleanupError !== null) {
          throw cleanupError;
        }
      };
      try {
        baseAddr = heap.malloc((len === 0 ? 1 : len) + pageSize);
        allocated = true;
        addr = Math.max(pageSize, Math.ceil(baseAddr / pageSize) * pageSize);
        addressReady = true;
        buf = heap.get_buffer(addr, len);
        buf.fill(0);
      } catch (allocationErr) {
        finish(false, () => thread.throwNewException(
            'Ljava/lang/OutOfMemoryError;',
            typeof allocationErr === 'string' ? allocationErr : String(allocationErr)
          ));
        return;
      }
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      let bytesRead = 0;
      const succeed = (): void => {
        if (!FDState.isCurrent(fd, lease.generation)) {
          finish(false, () => thread.throwNewException(
            'Ljava/io/IOException;',
            'Stream Closed'
          ));
          return;
        }
        try {
          let mappingTable = mappedByteBufferMappings.get(heap);
          if (mappingTable === undefined) {
            mappingTable = <MappedByteBufferMappingTable> {};
            mappedByteBufferMappings.set(heap, mappingTable);
          }
          sun_nio_ch_FileChannelImpl.mappedBases[addr] = baseAddr;
          installedMapping = {
            position: position,
            length: len,
            writable: writable,
            retention: retention,
            pendingOperations: 0,
            unmapping: false,
            dispose: dispose
          };
          mappingTable[addr] = installedMapping;
          finish(true, () => thread.asyncReturn(Long.fromNumber(addr), null));
        } catch (err) {
          if (finished) {
            throw err;
          }
          finish(false, () => {
            throw err;
          });
        }
      };
      const readNext = (): void => {
        if (bytesRead === len) {
          succeed();
          return;
        }
        const remaining = len - bytesRead;
        let callbackHandled = false;
        try {
          fs.read(
            fd,
            buf,
            bytesRead,
            remaining,
            position + bytesRead,
            (err, count) => {
              if (callbackHandled) {
                return;
              }
              callbackHandled = true;
              if (err) {
                finish(false, () => throwChannelIOException(thread, err));
              } else if (!FDState.isCurrent(fd, lease.generation)) {
                finish(false, () => thread.throwNewException(
                  'Ljava/io/IOException;',
                  'Stream Closed'
                ));
              } else if (count === 0) {
                succeed();
              } else if (typeof count !== 'number' || count < 0 || count > remaining) {
                const invalidRead = <NodeJS.ErrnoException>
                  new Error('Invalid host read length while mapping a file.');
                invalidRead.code = 'EIO';
                finish(false, () => throwChannelIOException(thread, invalidRead));
              } else {
                bytesRead += count;
                readNext();
              }
            }
          );
        } catch (err) {
          if (finished) {
            throw err;
          }
          finish(false, () => throwChannelIOException(
            thread,
            <NodeJS.ErrnoException> err
          ));
        }
      };
      readNext();
    }

    public static 'map0(IJJ)J'(thread: JVMThread, javaThis: JVMTypes.sun_nio_ch_FileChannelImpl, arg0: number, arg1: Long, arg2: Long): void {
      sun_nio_ch_FileChannelImpl.map(thread, javaThis, arg0, arg1, arg2);
    }

    public static 'map0(IJJZ)J'(thread: JVMThread, javaThis: JVMTypes.sun_nio_ch_FileChannelImpl, arg0: number, arg1: Long, arg2: Long, arg3: boolean): void {
      sun_nio_ch_FileChannelImpl.map(thread, javaThis, arg0, arg1, arg2);
    }

    public static 'unmap0(JJ)I'(thread: JVMThread, arg0: Long, arg1: Long): number {
      if (!arg0.isZero()) {
        const addr = arg0.toNumber(),
          heap = thread.getJVM().getHeap(),
          mappingTable = mappedByteBufferMappings.get(heap),
          mapping = mappingTable === undefined ? undefined : mappingTable[addr];
        if (mapping !== undefined) {
          if (!mapping.unmapping) {
            mapping.unmapping = true;
            if (mapping.pendingOperations === 0) {
              mapping.dispose();
            }
          }
        } else if (sun_nio_ch_FileChannelImpl.mappedBases[addr] !== undefined) {
          const baseAddr = sun_nio_ch_FileChannelImpl.mappedBases[addr];
          delete sun_nio_ch_FileChannelImpl.mappedBases[addr];
          thread.getJVM().getHeap().free(baseAddr);
        }
      }
      return 0;
    }

    public static 'transferTo0(Ljava/io/FileDescriptor;JJLjava/io/FileDescriptor;)J'(thread: JVMThread, javaThis: JVMTypes.sun_nio_ch_FileChannelImpl, srcFdObj: JVMTypes.java_io_FileDescriptor, position: Long, count: Long, dstFdObj: JVMTypes.java_io_FileDescriptor): void {
      const srcFd = srcFdObj["java/io/FileDescriptor/fd"],
        dstFd = dstFdObj["java/io/FileDescriptor/fd"],
        len = count.toNumber();

      if (len <= 0) {
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        thread.asyncReturn(Long.ZERO, null);
        return;
      }

      const operation = beginDescriptorPair(thread, srcFd, dstFd, false);
      if (operation === null) {
        return;
      }
      dispatchFileDispatcherPair(thread, operation, () => {
        const data = Buffer.alloc(len);
        let callbackHandled = false;
        fs.read(srcFd, data, 0, len, position.toNumber(), (readErr, bytesRead) => {
          if (callbackHandled) {
            return;
          }
          callbackHandled = true;
          if (readErr || bytesRead === 0) {
            finishFileDispatcherPair(thread, operation, readErr, () => {
              thread.asyncReturn(Long.ZERO, null);
            });
            return;
          }
          if (!FDState.isCurrent(srcFd, operation.sourceLease.generation) ||
              !FDState.isCurrent(dstFd, operation.destinationLease.generation)) {
            finishFileDispatcherPair(thread, operation, null, () => {});
            return;
          }
          dispatchFileDispatcherPair(thread, operation, () => {
            writeBuffer(
              thread,
              operation.destinationLease,
              data,
              0,
              bytesRead,
              FDState.getPos(dstFd),
              true,
              true,
              (bytesWritten) => finishFileDispatcherPair(
                thread,
                operation,
                null,
                () => thread.asyncReturn(Long.fromNumber(bytesWritten), null)
              ),
              (writeErr) => finishFileDispatcherPair(
                thread,
                operation,
                writeErr,
                () => {}
              )
            );
          });
        });
      });
    }

    public static 'maxDirectTransferSize0()I'(thread: JVMThread): number {
      return 1024 * 1024;
    }

    public static 'position0(Ljava/io/FileDescriptor;J)J'(thread: JVMThread, javaThis: JVMTypes.sun_nio_ch_FileChannelImpl, fdObj: JVMTypes.java_io_FileDescriptor, offset: Long): Long {
      const fd = fdObj['java/io/FileDescriptor/fd'];
      let rv: number;
      if (offset.equals(Long.NEG_ONE)) {
        // Get current FD offset.
        rv = FDState.getPos(fd);
      } else {
        // Set FD offset.
        rv = offset.toNumber();
        FDState.setPos(fd, rv);
      }
      return Long.fromNumber(rv);
    }

    /**
     * this poorly-named method actually specifies the page size for mmap
     * This is the Mac name for sun/misc/Unsafe::pageSize. Apparently they
     * wanted to ensure page sizes can be > 2GB...
     */
    public static 'initIDs()J'(thread: JVMThread): Long {
      // Size of heap pages.
      return Long.fromNumber(4096);
    }

  }

  class sun_nio_ch_NativeThread {

    public static 'current()J'(thread: JVMThread): Long {
      // -1 means that we do not require signaling according to the
      // docs.
      return Long.fromNumber(-1);
    }

    public static 'signal(J)V'(thread: JVMThread, arg0: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'init()V'(thread: JVMThread): void {
      // NOP
    }

  }

  class sun_nio_ch_Net {

    public static 'pollinValue()S'(thread: JVMThread): number {
      return 0;
    }

    public static 'polloutValue()S'(thread: JVMThread): number {
      return 0;
    }

    public static 'pollerrValue()S'(thread: JVMThread): number {
      return 0;
    }

    public static 'pollhupValue()S'(thread: JVMThread): number {
      return 0;
    }

    public static 'pollnvalValue()S'(thread: JVMThread): number {
      return 0;
    }

    public static 'pollconnValue()S'(thread: JVMThread): number {
      return 0;
    }

    public static 'isExclusiveBindAvailable()I'(thread: JVMThread): number {
      return -1;
    }

    public static 'isIPv6Available0()Z'(thread: JVMThread): boolean {
      return true;
    }

    public static 'socket0(ZZZZ)I'(thread: JVMThread): number {
      return 0;
    }

  }

  class sun_nio_ch_IOUtil {
    public static 'iovMax()I'(thread: JVMThread): number {
      return 1024;
    }

    public static 'setfdVal(Ljava/io/FileDescriptor;I)V'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, fdVal: number): void {
      fdObj["java/io/FileDescriptor/fd"] = fdVal;
    }

    public static 'fdVal(Ljava/io/FileDescriptor;)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor): number {
      return fdObj["java/io/FileDescriptor/fd"];
    }
  }

  class sun_nio_fs_UnixCopyFile {
    public static 'transfer(IIJ)V'(
        thread: JVMThread,
        dstFd: number,
        srcFd: number,
        cancelAddress: Long): void {
      const heap = thread.getJVM().getHeap(),
        cancelAddressNumber = cancelAddress.isZero() ? 0 : cancelAddress.toNumber(),
        osConstants = (<any> os).constants,
        cancelErrno = osConstants !== undefined && osConstants !== null &&
          osConstants.errno !== undefined &&
          typeof osConstants.errno.ECANCELED === 'number' ?
          osConstants.errno.ECANCELED : 125;
      const operation = beginDescriptorPair(thread, srcFd, dstFd, true);
      if (operation === null) {
        return;
      }
      let buffer: Buffer;
      const descriptorsCurrent = (): boolean =>
        FDState.isCurrent(srcFd, operation.sourceLease.generation) &&
        FDState.isCurrent(dstFd, operation.destinationLease.generation),
        finishIfCancelled = (): boolean => {
          if (cancelAddressNumber === 0 || operation.completionStarted) {
            return operation.completionStarted;
          }
          let cancelWord: number;
          try {
            cancelWord = heap.get_word(cancelAddressNumber);
          } catch (pollErr) {
            finishUnixDescriptorPair(
              thread,
              operation,
              <NodeJS.ErrnoException> (pollErr instanceof Error ?
                pollErr : new Error(String(pollErr))),
              () => {}
            );
            return true;
          }
          if (cancelWord === 0) {
            return false;
          }
          const cancelError = <NodeJS.ErrnoException>
            new Error('Operation canceled');
          cancelError.code = 'ECANCELED';
          cancelError.errno = cancelErrno;
          finishUnixDescriptorPair(thread, operation, cancelError, () => {});
          return true;
        };

      const copyNext = (): void => {
        if (!descriptorsCurrent()) {
          finishUnixDescriptorPair(thread, operation, null, () => {});
          return;
        }
        if (finishIfCancelled()) {
          return;
        }
        let callbackHandled = false;
        dispatchUnixDescriptorPair(thread, operation, () => {
          fs.read(
            srcFd,
            buffer,
            0,
            buffer.length,
            FDState.getPos(srcFd),
            (readErr, bytesRead) => {
              if (callbackHandled) {
                return;
              }
              callbackHandled = true;
              if (readErr) {
                finishUnixDescriptorPair(thread, operation, readErr, () => {});
                return;
              }
              if (!descriptorsCurrent()) {
                finishUnixDescriptorPair(thread, operation, null, () => {});
                return;
              }
              if (bytesRead === 0) {
                finishUnixDescriptorPair(
                  thread,
                  operation,
                  null,
                  () => thread.asyncReturn()
                );
                return;
              }
              FDState.incrementPosIfCurrent(
                srcFd,
                operation.sourceLease.generation,
                bytesRead
              );

              let written = 0;
              const writeNext = (): void => {
                if (!descriptorsCurrent()) {
                  finishUnixDescriptorPair(thread, operation, null, () => {});
                  return;
                }
                if (finishIfCancelled()) {
                  return;
                }
                dispatchUnixDescriptorPair(thread, operation, () => {
                  writeBuffer(
                    thread,
                    operation.destinationLease,
                    buffer,
                    written,
                    bytesRead - written,
                    FDState.getPos(dstFd),
                    true,
                    false,
                    (bytesWritten) => {
                      if (!descriptorsCurrent()) {
                        finishUnixDescriptorPair(thread, operation, null, () => {});
                        return;
                      }
                      if (finishIfCancelled()) {
                        return;
                      }
                      if (bytesWritten === 0) {
                        const noProgress = <NodeJS.ErrnoException>
                          new Error('Unable to make progress while copying a file.');
                        noProgress.code = 'EIO';
                        finishUnixDescriptorPair(
                          thread,
                          operation,
                          noProgress,
                          () => {}
                        );
                        return;
                      }
                      written += bytesWritten;
                      if (written < bytesRead) {
                        writeNext();
                      } else {
                        copyNext();
                      }
                    },
                    (writeErr) => finishUnixDescriptorPair(
                      thread,
                      operation,
                      writeErr,
                      () => {}
                    )
                  );
                });
              };
              writeNext();
            }
          );
        });
      };

      dispatchUnixDescriptorPair(thread, operation, () => {
        buffer = Buffer.alloc(8192);
        copyNext();
      });
    }
  }

  class sun_nio_ch_FileDispatcherImpl {

    public static 'init()V'(thread: JVMThread): void {

    }

    public static 'read0(Ljava/io/FileDescriptor;JI)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, address: Long, len: number): void {
      const fd = fdObj["java/io/FileDescriptor/fd"],
        // read upto len bytes and store into mmap'd buffer at address
        addr = address.toNumber(),
        buf = thread.getJVM().getHeap().get_buffer(addr, len),
        operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      const position = FDState.getPos(fd);
      const callbackState: HostCallbackState = {callbackStarted: false};
      let callbackHandled = false;
      dispatchFileDispatcherOperation(thread, operation, () => {
        fs.read(fd, buf, 0, len, position, (err, bytesRead) => {
          callbackState.callbackStarted = true;
          if (callbackHandled || operation.completionStarted) {
            return;
          }
          callbackHandled = true;
          finishFileDispatcherOperation(thread, operation, err, () => {
            FDState.incrementPos(fd, bytesRead);
            // Return -1 if we reached the end of the file.
            thread.asyncReturn(bytesRead === 0 ? -1 : bytesRead);
          }, 'int');
        });
      }, 'int', callbackState);
    }

    public static 'pread0(Ljava/io/FileDescriptor;JIJ)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, address: Long, len: number, position: Long): void {
      const fd = fdObj["java/io/FileDescriptor/fd"],
        addr = address.toNumber(),
        buf = thread.getJVM().getHeap().get_buffer(addr, len),
        operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      const callbackState: HostCallbackState = {callbackStarted: false};
      let callbackHandled = false;
      dispatchFileDispatcherOperation(thread, operation, () => {
        fs.read(fd, buf, 0, len, position.toNumber(), (err, bytesRead) => {
          callbackState.callbackStarted = true;
          if (callbackHandled || operation.completionStarted) {
            return;
          }
          callbackHandled = true;
          finishFileDispatcherOperation(thread, operation, err, () => {
            thread.asyncReturn(bytesRead === 0 && len !== 0 ? -1 : bytesRead);
          }, 'int');
        });
      }, 'int', callbackState);
    }

    public static 'readv0(Ljava/io/FileDescriptor;JI)J'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, address: Long, len: number): void {
      const fd = fdObj["java/io/FileDescriptor/fd"],
        heap = thread.getJVM().getHeap(),
        vecs = readIOVecs(thread, address, len),
        buffers = vecs.map((vec) => heap.get_buffer(vec.base, vec.len)),
        requestedBytes = vecs.reduce((total, vec) => total + vec.len, 0),
        nativeReadv = !util.are_in_browser() ? (<any> fs).readv : null,
        operation = vecs.length === 0 ? null :
          beginFileDispatcherOperation(thread, fd);
      let total = 0,
        index = 0;

      if (vecs.length === 0) {
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        thread.asyncReturn(Long.ZERO, null);
        return;
      }
      if (operation === null) {
        return;
      }

      if (typeof nativeReadv === 'function') {
        const position = FDState.getPos(fd);
        const callbackState: HostCallbackState = {callbackStarted: false};
        let callbackHandled = false;
        dispatchFileDispatcherOperation(thread, operation, () => {
          nativeReadv.call(
            fs,
            fd,
            buffers,
            position,
            (err: NodeJS.ErrnoException, bytesRead: number) => {
              callbackState.callbackStarted = true;
              if (callbackHandled || operation.completionStarted) {
                return;
              }
              callbackHandled = true;
              finishFileDispatcherOperation(thread, operation, err, () => {
                FDState.incrementPos(fd, bytesRead);
                thread.asyncReturn(
                  Long.fromNumber(bytesRead === 0 && requestedBytes > 0 ? -1 : bytesRead),
                  null
                );
              }, 'long');
            }
          );
        }, 'long', callbackState);
        return;
      }

      const readNext = (): void => {
        if (operation.completionStarted) {
          return;
        }
        if (index >= vecs.length) {
          finishFileDispatcherOperation(thread, operation, null, () => {
            thread.asyncReturn(Long.fromNumber(total), null);
          });
          return;
        }

        const vec = vecs[index],
          buf = buffers[index];
        if (vec.len === 0) {
          index++;
          readNext();
          return;
        }
        const position = FDState.getPos(fd);
        const callbackState: HostCallbackState = {callbackStarted: false};
        let callbackHandled = false;
        dispatchFileDispatcherOperation(thread, operation, () => {
          fs.read(fd, buf, 0, vec.len, position, (err, bytesRead) => {
            callbackState.callbackStarted = true;
            if (callbackHandled || operation.completionStarted) {
              return;
            }
            callbackHandled = true;
            if (err) {
              if (total > 0) {
                finishFileDispatcherOperation(thread, operation, null, () => {
                  thread.asyncReturn(Long.fromNumber(total), null);
                });
              } else {
                finishFileDispatcherOperation(thread, operation, err, () => {}, 'long');
              }
            } else if (!FDState.isCurrent(fd, operation.lease.generation)) {
              finishFileDispatcherOperation(thread, operation, null, () => {});
            } else if (bytesRead === 0) {
              finishFileDispatcherOperation(thread, operation, null, () => {
                thread.asyncReturn(Long.fromNumber(total === 0 ? -1 : total), null);
              });
            } else {
              total += bytesRead;
              FDState.incrementPos(fd, bytesRead);
              if (bytesRead < vec.len) {
                finishFileDispatcherOperation(thread, operation, null, () => {
                  thread.asyncReturn(Long.fromNumber(total), null);
                });
              } else {
                index++;
                readNext();
              }
            }
          });
        }, 'long', callbackState, (err) => {
          if (total === 0) {
            return false;
          }
          finishFileDispatcherOperation(thread, operation, null, () => {
            thread.asyncReturn(Long.fromNumber(total), null);
          });
          return true;
        });
      };

      readNext();
    }

    public static 'preClose0(Ljava/io/FileDescriptor;)V'(thread: JVMThread, arg0: JVMTypes.java_io_FileDescriptor): void {
      // NOP, I think the actual fs.close is called later. If not, NBD.
    }

    public static 'close0(Ljava/io/FileDescriptor;)V'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor): void {
      const fd = fdObj["java/io/FileDescriptor/fd"];
      if (fd === -1) {
        return;
      }
      fdObj["java/io/FileDescriptor/fd"] = -1;
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      closeFileDescriptor(fd, (err) => {
        if (err) {
          throwChannelIOException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'size0(Ljava/io/FileDescriptor;)J'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor): void {
      const fd = fdObj["java/io/FileDescriptor/fd"],
        operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      dispatchFileDispatcherOperation(thread, operation, () => {
        fs.fstat(fd, (err, stats) => {
          finishFileDispatcherOperation(thread, operation, err, () => {
            thread.asyncReturn(Long.fromNumber(stats.size), null);
          });
        });
      });
    }

    public static 'truncate0(Ljava/io/FileDescriptor;J)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, size: Long): void {
      const fd = fdObj["java/io/FileDescriptor/fd"],
        operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      dispatchFileDispatcherOperation(thread, operation, () => {
        fs.ftruncate(fd, size.toNumber(), (err) => {
          finishFileDispatcherOperation(thread, operation, err, () => {
            // For some reason, this expects a return value.
            // Give it the success status code.
            thread.asyncReturn(0);
          });
        });
      });
    }

    public static 'force0(Ljava/io/FileDescriptor;Z)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, metaData: boolean): void {
      const fd = fdObj["java/io/FileDescriptor/fd"];
      const operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      dispatchFileDispatcherOperation(thread, operation, () => {
        fs.fsync(fd, (err) => {
          finishFileDispatcherOperation(thread, operation, err, () => {
            thread.asyncReturn(0);
          });
        });
      });
    }

    public static 'closeIntFD(I)V'(thread: JVMThread, fd: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      closeFileDescriptor(fd, (err) => {
        if (err) {
          throwChannelIOException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'write0(Ljava/io/FileDescriptor;JI)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, addr: Long, len: number): void {
      const fd = fdObj["java/io/FileDescriptor/fd"];
      const heap = thread.getJVM().getHeap();
      const data = heap.get_buffer(addr.toNumber(), len);
      const operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      const position = FDState.getPos(fd);
      const callbackState: HostCallbackState = {callbackStarted: false};
      dispatchFileDispatcherOperation(thread, operation, () => {
        writeBuffer(
          thread,
          operation.lease,
          data,
          0,
          len,
          position,
          true,
          true,
          (numBytes) => finishFileDispatcherOperation(
            thread,
            operation,
            null,
            () => thread.asyncReturn(numBytes)
          ),
          (err, committedBytes, ioStatusEligible) => finishFileDispatcherOperation(
            thread,
            operation,
            err,
            () => {},
            ioStatusEligible ? 'int' : undefined
          ),
          callbackState,
          () => operation.completionStarted
        );
      }, 'int', callbackState);
    }

    public static 'pwrite0(Ljava/io/FileDescriptor;JIJ)I'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, addr: Long, len: number, position: Long): void {
      const fd = fdObj["java/io/FileDescriptor/fd"];
      const heap = thread.getJVM().getHeap();
      const data = heap.get_buffer(addr.toNumber(), len);
      const operation = beginFileDispatcherOperation(thread, fd);
      if (operation === null) {
        return;
      }
      const callbackState: HostCallbackState = {callbackStarted: false};
      dispatchFileDispatcherOperation(thread, operation, () => {
        writeBuffer(
          thread,
          operation.lease,
          data,
          0,
          len,
          position.toNumber(),
          false,
          false,
          (numBytes) => finishFileDispatcherOperation(
            thread,
            operation,
            null,
            () => thread.asyncReturn(numBytes)
          ),
          (err, committedBytes, ioStatusEligible) => finishFileDispatcherOperation(
            thread,
            operation,
            err,
            () => {},
            ioStatusEligible ? 'int' : undefined
          ),
          callbackState,
          () => operation.completionStarted
        );
      }, 'int', callbackState);
    }

    public static 'writev0(Ljava/io/FileDescriptor;JI)J'(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, address: Long, len: number): void {
      const fd = fdObj["java/io/FileDescriptor/fd"],
        heap = thread.getJVM().getHeap(),
        vecs = readIOVecs(thread, address, len),
        buffers = vecs.map((vec) => heap.get_buffer(vec.base, vec.len)),
        nativeWritev = !util.are_in_browser() ? (<any> fs).writev : null,
        operation = vecs.length === 0 ? null :
          beginFileDispatcherOperation(thread, fd);
      let total = 0,
        index = 0;

      if (vecs.length === 0) {
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        thread.asyncReturn(Long.ZERO, null);
        return;
      }
      if (operation === null) {
        return;
      }

      if (typeof nativeWritev === 'function') {
        const position = FDState.isAppend(fd) ? null : FDState.getPos(fd);
        const callbackState: HostCallbackState = {callbackStarted: false};
        let callbackHandled = false;
        dispatchFileDispatcherOperation(thread, operation, () => {
          nativeWritev.call(
            fs,
            fd,
            buffers,
            position,
            (err: NodeJS.ErrnoException, numBytes: number) => {
              callbackState.callbackStarted = true;
              if (callbackHandled || operation.completionStarted) {
                return;
              }
              callbackHandled = true;
              if (err) {
                finishFileDispatcherOperation(thread, operation, err, () => {}, 'long');
              } else if (!FDState.isCurrent(fd, operation.lease.generation)) {
                finishFileDispatcherOperation(thread, operation, null, () => {});
              } else {
                const tailCallbackState: HostCallbackState = {callbackStarted: false};
                dispatchFileDispatcherOperation(thread, operation, () => {
                  finishWrite(
                    thread,
                    operation.lease,
                    numBytes,
                    true,
                    (written) => finishFileDispatcherOperation(
                      thread,
                      operation,
                      null,
                      () => thread.asyncReturn(Long.fromNumber(written), null)
                    ),
                    (writeErr) => finishFileDispatcherOperation(
                      thread,
                      operation,
                      writeErr,
                      () => {}
                    ),
                    tailCallbackState,
                    () => operation.completionStarted
                  );
                }, undefined, tailCallbackState);
              }
            }
          );
        }, 'long', callbackState);
        return;
      }

      const writeNext = (): void => {
        if (operation.completionStarted) {
          return;
        }
        if (index >= vecs.length) {
          finishFileDispatcherOperation(thread, operation, null, () => {
            thread.asyncReturn(Long.fromNumber(total), null);
          });
          return;
        }

        const vec = vecs[index],
          data = buffers[index];
        const position = FDState.getPos(fd);
        const callbackState: HostCallbackState = {callbackStarted: false};
        dispatchFileDispatcherOperation(thread, operation, () => {
          writeBuffer(
            thread,
            operation.lease,
            data,
            0,
            vec.len,
            position,
            true,
            true,
            (numBytes) => {
              if (operation.completionStarted) {
                return;
              }
              if (!FDState.isCurrent(fd, operation.lease.generation)) {
                finishFileDispatcherOperation(thread, operation, null, () => {});
                return;
              }
              total += numBytes;
              if (numBytes < vec.len) {
                finishFileDispatcherOperation(thread, operation, null, () => {
                  thread.asyncReturn(Long.fromNumber(total), null);
                });
              } else {
                index++;
                writeNext();
              }
            },
            (err, committedBytes, ioStatusEligible) => {
              if (operation.completionStarted) {
                return;
              }
              total += committedBytes;
              if (committedBytes === 0 && total > 0) {
                finishFileDispatcherOperation(thread, operation, null, () => {
                  thread.asyncReturn(Long.fromNumber(total), null);
                });
              } else {
                finishFileDispatcherOperation(
                  thread,
                  operation,
                  err,
                  () => {},
                  ioStatusEligible ? 'long' : undefined
                );
              }
            },
            callbackState,
            () => operation.completionStarted
          );
        }, 'long', callbackState);
      };

      writeNext();
    }

  }

  class DirFd {
    private _listing: string[];
    private _pos: number = 0;
    constructor(listing: string[]) {
      this._listing = listing;
    }

    public next(): string {
      var next = this._listing[this._pos++];
      if (next === undefined) {
        next = null;
      }
      return next;
    }
  }

  class FDMap<T> {
    private static _nextFd = 1;
    private _map: {[fd: number]: T} = {};

    public newEntry(entry: T): number {
      var fd = FDMap._nextFd++;
      this._map[fd] = entry;
      return fd;
    }

    public removeEntry(thread: JVMThread, fd: number, exceptionType: string): void {
      if (this._map[fd]) {
        delete this._map[fd];
      } else {
        thread.throwNewException(exceptionType, `Invalid file descriptor: ${fd}`);
      }
    }

    public getEntry(thread: JVMThread, exceptionType: string, fd: number): T {
      var entry = this._map[fd];
      if (!entry) {
        thread.throwNewException(exceptionType, `Invalid file descriptor: ${fd}`);
        return null;
      } else {
        return entry;
      }
    }
  }

  const dirMap = new FDMap<DirFd>();
  const mountMap = new FDMap<MountTable>();

  function getStringFromHeap(thread: JVMThread, ptrLong: Long): string {
    var heap = thread.getJVM().getHeap(),
        ptr = ptrLong.toNumber(),
        len = 0;
    while (heap.get_signed_byte(ptr + len) !== 0) {
      len++;
    }
    return heap.get_buffer(ptr, len).toString();
  }

  /**
   * Converts a string into a C string stored in a JVM array.
   * No NULL terminator needed, since arrays have length.
   */
  function stringToByteArray(thread: JVMThread, str: string): JVMTypes.JVMArray<number> {
    if (!str) {
      return null;
    }
    // NULL terminate the string.
    const buff = new Buffer(str, 'utf8');
    const len = buff.length;
    const i8 = new Int8Array(len);
    for (let i = 0; i < len; i++) {
      i8[i] = buff.readInt8(i);
    }
    return util.newArrayFromData<number>(thread, thread.getBsCl(), '[B', <number[]><any> i8);
  }

  function convertError(
      thread: JVMThread,
      err: NodeJS.ErrnoException,
      cb: (err: JVMTypes.java_lang_Exception) => void,
      failureCb: () => void = () => {}): void {
    thread.setStatus(ThreadStatus.ASYNC_WAITING);
    thread.getBsCl().initializeClass(thread, 'Lsun/nio/fs/UnixException;', (unixException) => {
      if (unixException === null) {
        failureCb();
        return;
      }
      thread.getBsCl().initializeClass(thread, 'Lsun/nio/fs/UnixConstants;', (unixConstants) => {
          if (unixConstants === null) {
            failureCb();
            return;
          }
          var cons = (<ReferenceClassData<JVMTypes.sun_nio_fs_UnixException>> unixException).getConstructor(thread),
            rv = new cons(thread),
            unixCons: typeof JVMTypes.sun_nio_fs_UnixConstants = <any> (<ReferenceClassData<JVMTypes.sun_nio_fs_UnixConstants>> unixConstants).getConstructor(thread),
            errCode: number = (<any> unixCons)[`sun/nio/fs/UnixConstants/${err.code}`];
          if (typeof(errCode) !== 'number' && err.code === 'ECANCELED' &&
              typeof err.errno === 'number') {
            errCode = Math.abs(err.errno);
          }
          if (typeof(errCode) !== 'number') {
            errCode = -1;
            rv['sun/nio/fs/UnixException/msg'] = util.initString(thread.getBsCl(), err.message);
          } else {
            rv['sun/nio/fs/UnixException/msg'] = null;
          }
          rv['sun/nio/fs/UnixException/errno'] = errCode;
          cb(rv);
      });
    });
  }

  function convertStats(
      stats: fs.Stats,
      jvmStats: JVMTypes.sun_nio_fs_UnixFileAttributes,
      browserIdentity: BrowserFsIdentity = null): void {
    const ino = browserIdentity !== null && stats.ino === 0 ? browserIdentity.ino : stats.ino,
      dev = browserIdentity !== null && stats.dev === 0 ? browserIdentity.dev : stats.dev;
    jvmStats['sun/nio/fs/UnixFileAttributes/st_mode'] = stats.mode;
    jvmStats['sun/nio/fs/UnixFileAttributes/st_ino'] = Long.fromNumber(ino);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_dev'] = Long.fromNumber(dev);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_rdev'] = Long.fromNumber(stats.rdev);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_nlink'] = stats.nlink;
    jvmStats['sun/nio/fs/UnixFileAttributes/st_uid'] = stats.uid;
    jvmStats['sun/nio/fs/UnixFileAttributes/st_gid'] = stats.gid;
    jvmStats['sun/nio/fs/UnixFileAttributes/st_size'] = Long.fromNumber(stats.size);
    let atime = date2components(stats.atime),
      mtime = date2components(stats.mtime),
      ctime = date2components(stats.ctime);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_atime_sec'] = Long.fromNumber(atime[0]);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_atime_nsec'] = Long.fromNumber(atime[1]);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_mtime_sec'] = Long.fromNumber(mtime[0]);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_mtime_nsec'] = Long.fromNumber(mtime[1]);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_ctime_sec'] = Long.fromNumber(ctime[0]);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_ctime_nsec'] = Long.fromNumber(ctime[1]);
    jvmStats['sun/nio/fs/UnixFileAttributes/st_birthtime_sec'] = Long.fromNumber(Math.floor(stats.birthtime.getTime() / 1000));
  }

  let UnixConstants: typeof JVMTypes.sun_nio_fs_UnixConstants = null;
  function flagTest(flag: number, mask: number, value: number = mask): boolean {
    return (flag & mask) === value;
  }

  function decodeUnixOpenFlags(thread: JVMThread, flag: number): UnixOpenFlags {
    if (UnixConstants === null) {
      let UCCls = <ReferenceClassData<JVMTypes.sun_nio_fs_UnixConstants>> thread.getBsCl().getInitializedClass(thread, 'Lsun/nio/fs/UnixConstants;');
      if (UCCls === null) {
        thread.throwNewException("Ljava/lang/InternalError;", "UnixConstants is not initialized?");
        return null;
      }
      UnixConstants = <any> UCCls.getConstructor(thread);
    }

    const O_ACCMODE = 0x3,
      accessMode = flag & O_ACCMODE,
      readOnly = UnixConstants['sun/nio/fs/UnixConstants/O_RDONLY'],
      writeOnly = UnixConstants['sun/nio/fs/UnixConstants/O_WRONLY'],
      readWrite = UnixConstants['sun/nio/fs/UnixConstants/O_RDWR'],
      syncMask = UnixConstants['sun/nio/fs/UnixConstants/O_SYNC'],
      dataSyncMask = UnixConstants['sun/nio/fs/UnixConstants/O_DSYNC'],
      create = flagTest(flag, UnixConstants['sun/nio/fs/UnixConstants/O_CREAT']),
      sync = flagTest(flag, syncMask);

    if (accessMode !== readOnly && accessMode !== writeOnly && accessMode !== readWrite) {
      thread.throwNewException('Lsun/nio/fs/UnixException;', `Invalid open flag: ${flag}.`);
      return null;
    }

    return {
      read: accessMode === readOnly || accessMode === readWrite,
      write: accessMode === writeOnly || accessMode === readWrite,
      append: flagTest(flag, UnixConstants['sun/nio/fs/UnixConstants/O_APPEND']),
      create: create,
      createNew: create && flagTest(flag, UnixConstants['sun/nio/fs/UnixConstants/O_EXCL']),
      truncate: flagTest(flag, UnixConstants['sun/nio/fs/UnixConstants/O_TRUNC']),
      sync: sync,
      dataSync: !sync && flagTest(flag, dataSyncMask),
      noFollow: flagTest(flag, UnixConstants['sun/nio/fs/UnixConstants/O_NOFOLLOW'])
    };
  }

  /**
   * Rebuilds the JDK's Unix open flags with the host's numeric constants. The
   * constants happen to match on many Linux hosts, but that is not portable.
   */
  function flag2nodeflag(thread: JVMThread, flag: number): number {
    const decoded = decodeUnixOpenFlags(thread, flag);
    if (decoded === null) {
      return null;
    }

    const constants = (<any> fs).constants;
    if (constants === undefined) {
      thread.throwNewException('Lsun/nio/fs/UnixException;', 'Numeric open flags are unavailable on this host.');
      return null;
    }

    let nodeFlag = decoded.read && decoded.write ? constants.O_RDWR :
      decoded.write ? constants.O_WRONLY : constants.O_RDONLY;
    const optionalFlags: Array<[boolean, string]> = [
      [decoded.append, 'O_APPEND'],
      [decoded.create, 'O_CREAT'],
      [decoded.createNew, 'O_EXCL'],
      [decoded.truncate, 'O_TRUNC'],
      [decoded.sync, 'O_SYNC'],
      [decoded.dataSync, 'O_DSYNC'],
      [decoded.noFollow, 'O_NOFOLLOW']
    ];
    for (let i = 0; i < optionalFlags.length; i++) {
      if (optionalFlags[i][0]) {
        const constantName = optionalFlags[i][1],
          constantValue = typeof constants[constantName] === 'number' ? constants[constantName] :
            constantName === 'O_DSYNC' ? constants.O_SYNC : undefined;
        if (typeof constantValue !== 'number') {
          thread.throwNewException('Lsun/nio/fs/UnixException;', `${constantName} is unavailable on this host.`);
          return null;
        }
        nodeFlag |= constantValue;
      }
    }
    return nodeFlag;
  }

  function throwUnixException(thread: JVMThread, err: NodeJS.ErrnoException): void {
    convertError(thread, err, (convertedErr) => {
      thread.throwException(convertedErr);
    });
  }

  function throwChannelIOException(thread: JVMThread, err: NodeJS.ErrnoException): void {
    thread.throwNewException(
      'Ljava/io/IOException;',
      err !== null && err !== undefined && typeof err.message === 'string' ?
        err.message : String(err)
    );
  }

  /**
   * Converts a Date object into [seconds, nanoseconds].
   */
  function date2components(date: Date): [number, number] {
    const dateInMs = date.getTime();
    const seconds = Math.floor(dateInMs / 1000);
    return [seconds, (dateInMs - seconds * 1000) * 1000000];
  }

  class sun_nio_fs_UnixNativeDispatcher {

    public static 'getcwd()[B'(thread: JVMThread): JVMTypes.JVMArray<number> {
      return stringToByteArray(thread, process.cwd());
    }

    public static 'dup(I)I'(thread: JVMThread, arg0: number): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return 0;
    }

    public static 'open0(JII)I'(thread: JVMThread, pathAddress: Long, flags: number, mode: number): number | void {
      const decoded = decodeUnixOpenFlags(thread, flags);
      if (decoded === null) {
        return -1;
      }

      const pathStr = getStringFromHeap(thread, pathAddress);

      if (!util.are_in_browser()) {
        const nodeFlags = flag2nodeflag(thread, flags);
        if (nodeFlags === null) {
          return -1;
        }
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        fs.open(pathStr, nodeFlags, mode, (err, fd) => {
          if (err) {
            throwUnixException(thread, err);
          } else if (decoded.append) {
            fs.fstat(fd, (statErr, stats) => {
              if (statErr) {
                fs.close(fd, () => throwUnixException(thread, statErr));
              } else {
                FDState.open(fd, stats.size, true, 0, pathStr);
                thread.asyncReturn(fd);
              }
            });
          } else {
            FDState.open(fd, 0, false, 0, pathStr);
            thread.asyncReturn(fd);
          }
        });
        return;
      }

      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      const syncMode = decoded.sync ? 1 : decoded.dataSync ? 2 : 0;
      const finishBrowserOpen = (fd: number): void => {
        const initialize = (): void => {
          fs.fstat(fd, (statErr, stats) => {
            if (statErr) {
              fs.close(fd, () => throwUnixException(thread, statErr));
            } else {
              getBrowserFsFdIdentity(fd);
              FDState.open(
                fd,
                decoded.append ? stats.size : 0,
                decoded.append,
                syncMode,
                pathStr
              );
              thread.asyncReturn(fd);
            }
          });
        };
        if (decoded.write && decoded.truncate && !decoded.append) {
          fs.ftruncate(fd, 0, (truncateErr) => {
            if (truncateErr) {
              fs.close(fd, () => throwUnixException(thread, truncateErr));
            } else {
              initialize();
            }
          });
        } else {
          initialize();
        }
      };
      const openBrowserFile = (): void => {
        if (!decoded.write) {
          fs.open(pathStr, 'r', mode, (err, fd) => err ? throwUnixException(thread, err) : finishBrowserOpen(fd));
        } else if (decoded.createNew) {
          fs.open(pathStr, 'wx+', mode, (err, fd) => err ? throwUnixException(thread, err) : finishBrowserOpen(fd));
        } else if (!decoded.create) {
          fs.open(pathStr, 'r+', mode, (err, fd) => err ? throwUnixException(thread, err) : finishBrowserOpen(fd));
        } else {
          let racesRemaining = 3;
          const openExisting = (): void => {
            fs.open(pathStr, 'r+', mode, (existingErr, existingFd) => {
              if (!existingErr) {
                finishBrowserOpen(existingFd);
              } else if (existingErr.code !== 'ENOENT') {
                throwUnixException(thread, existingErr);
              } else {
                fs.open(pathStr, 'wx+', mode, (createErr, createdFd) => {
                  if (!createErr) {
                    finishBrowserOpen(createdFd);
                  } else if (createErr.code === 'EEXIST' && racesRemaining-- > 0) {
                    openExisting();
                  } else {
                    throwUnixException(thread, createErr);
                  }
                });
              }
            });
          };
          openExisting();
        }
      };

      if (decoded.noFollow) {
        fs.lstat(pathStr, (err, stats) => {
          if (!err && stats.isSymbolicLink()) {
            const loopErr = <NodeJS.ErrnoException> new Error(`ELOOP: too many symbolic links encountered, open '${pathStr}'`);
            loopErr.code = 'ELOOP';
            loopErr.path = pathStr;
            throwUnixException(thread, loopErr);
          } else if (err && err.code !== 'ENOENT') {
            throwUnixException(thread, err);
          } else {
            openBrowserFile();
          }
        });
      } else {
        openBrowserFile();
      }
    }

    public static 'openat0(IJII)I'(thread: JVMThread, arg0: number, arg1: Long, arg2: number, arg3: number): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return 0;
    }

    public static 'close(I)V'(thread: JVMThread, fd: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      // UnixNativeDispatcher.close mirrors the JDK's raw close helper, which
      // retires the descriptor without surfacing close(2) failures.
      closeFileDescriptor(fd, () => thread.asyncReturn());
    }

    public static 'fopen0(JJ)J'(thread: JVMThread, pathAddress: Long, flagsAddress: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      let pathStr = getStringFromHeap(thread, pathAddress);
      let flagsStr = getStringFromHeap(thread, flagsAddress);
      fs.open(pathStr, flagsStr, (err, fd) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          if (flagsStr.indexOf('a') !== -1) {
            // Need to figure out file size to update file position.
            fs.fstat(fd, (err, stats) => {
              if (err) {
                throwUnixException(thread, err);
              } else {
                FDState.open(fd, stats.size, true, 0, pathStr);
                thread.asyncReturn(Long.fromNumber(fd), null);
              }
            });
          } else {
            FDState.open(fd, 0, false, 0, pathStr);
            thread.asyncReturn(Long.fromNumber(fd), null);
          }
        }
      });
    }

    public static 'fclose(J)V'(thread: JVMThread, fdLong: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      const fd = fdLong.toNumber();
      closeFileDescriptor(fd, (err) => {
        if (err && err.code !== 'EINTR') {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'link0(JJ)V'(thread: JVMThread, existingAddr: Long, linkAddr: Long): void {
      const existingPath = getStringFromHeap(thread, existingAddr),
        linkPath = getStringFromHeap(thread, linkAddr);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.link(existingPath, linkPath, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'unlink0(J)V'(thread: JVMThread, pathAddress: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      const pathStr = getStringFromHeap(thread, pathAddress);
      fs.unlink(pathStr, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          FDState.markUnlinked(pathStr);
          thread.asyncReturn();
        }
      });
    }

    public static 'unlinkat0(IJI)V'(thread: JVMThread, arg0: number, arg1: Long, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'mknod0(JIJ)V'(thread: JVMThread, arg0: Long, arg1: number, arg2: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'rename0(JJ)V'(thread: JVMThread, oldAddr: Long, newAddr: Long): void {
      const oldPath = getStringFromHeap(thread, oldAddr),
        newPath = getStringFromHeap(thread, newAddr);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      if (util.are_in_browser()) {
        const oldLocation = getBrowserFsLocation(oldPath),
          newLocation = getBrowserFsLocation(newPath);
        if (oldLocation !== null && newLocation !== null && oldLocation.fs !== newLocation.fs) {
          const crossDeviceError = <NodeJS.ErrnoException>
            new Error(`EXDEV: cross-device link not permitted, rename '${oldPath}' -> '${newPath}'`);
          crossDeviceError.code = 'EXDEV';
          crossDeviceError.path = oldPath;
          throwUnixException(thread, crossDeviceError);
          return;
        }
      }
      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'renameat0(IJIJ)V'(thread: JVMThread, arg0: number, arg1: Long, arg2: number, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'mkdir0(JI)V'(thread: JVMThread, pathAddr: Long, mode: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.mkdir(getStringFromHeap(thread, pathAddr), mode, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'rmdir0(J)V'(thread: JVMThread, pathAddr: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.rmdir(getStringFromHeap(thread, pathAddr), (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'readlink0(J)[B'(thread: JVMThread, pathAddr: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.readlink(getStringFromHeap(thread, pathAddr), (err, linkPath) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn(stringToByteArray(thread, linkPath));
        }
      });
    }

    public static 'realpath0(J)[B'(thread: JVMThread, pathAddress: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.realpath(getStringFromHeap(thread, pathAddress), (err, resolvedPath) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn(stringToByteArray(thread, resolvedPath));
        }
      });
    }

    public static 'symlink0(JJ)V'(thread: JVMThread, targetAddr: Long, linkAddr: Long): void {
      const targetPath = getStringFromHeap(thread, targetAddr),
        linkPath = getStringFromHeap(thread, linkAddr);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.symlink(targetPath, linkPath, 'file', (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'stat0(JLsun/nio/fs/UnixFileAttributes;)V'(thread: JVMThread, pathAddress: Long, jvmStats: JVMTypes.sun_nio_fs_UnixFileAttributes): void {
      const pathString = getStringFromHeap(thread, pathAddress);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.stat(pathString, (err, stats) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          convertStats(stats, jvmStats, util.are_in_browser() ? getBrowserFsPathIdentity(pathString) : null);
          thread.asyncReturn();
        }
      });
    }

    public static 'lstat0(JLsun/nio/fs/UnixFileAttributes;)V'(thread: JVMThread, pathAddress: Long, jvmStats: JVMTypes.sun_nio_fs_UnixFileAttributes): void {
      const pathString = getStringFromHeap(thread, pathAddress);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.lstat(pathString, (err, stats) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          convertStats(stats, jvmStats, util.are_in_browser() ? getBrowserFsPathIdentity(pathString) : null);
          thread.asyncReturn();
        }
      });
    }

    public static 'fstat(ILsun/nio/fs/UnixFileAttributes;)V'(thread: JVMThread, fd: number, jvmStats: JVMTypes.sun_nio_fs_UnixFileAttributes): void {
      const operation = beginUnixDescriptorOperation(thread, fd);
      if (operation === null) {
        return;
      }
      dispatchUnixDescriptorOperation(thread, operation, () => {
        fs.fstat(fd, (err, stats) => {
          finishUnixDescriptorOperation(thread, operation, err, () => {
            convertStats(
              stats,
              jvmStats,
              util.are_in_browser() ? getBrowserFsFdIdentity(fd) : null
            );
            thread.asyncReturn();
          });
        });
      });
    }

    public static 'fstatat0(IJILsun/nio/fs/UnixFileAttributes;)V'(thread: JVMThread, arg0: number, arg1: Long, arg2: number, arg3: JVMTypes.sun_nio_fs_UnixFileAttributes): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'chown0(JII)V'(thread: JVMThread, pathAddr: Long, uid: number, gid: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.chown(getStringFromHeap(thread, pathAddr), uid, gid, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'lchown0(JII)V'(thread: JVMThread, pathAddr: Long, uid: number, gid: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.lchown(getStringFromHeap(thread, pathAddr), uid, gid, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'fchown(III)V'(thread: JVMThread, fd: number, uid: number, gid: number): void {
      const operation = beginUnixDescriptorOperation(thread, fd);
      if (operation === null) {
        return;
      }
      if (util.are_in_browser()) {
        // BrowserFS models a single uid/gid (both zero) and cannot persist
        // ownership. Treat descriptor ownership copying as an accepted no-op.
        finishUnixDescriptorOperation(
          thread,
          operation,
          null,
          () => thread.asyncReturn()
        );
        return;
      }
      dispatchUnixDescriptorOperation(thread, operation, () => {
        fs.fchown(fd, uid, gid, (err) => {
          finishUnixDescriptorOperation(
            thread,
            operation,
            err,
            () => thread.asyncReturn()
          );
        });
      });
    }

    public static 'chmod0(JI)V'(thread: JVMThread, pathAddr: Long, mode: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.chmod(getStringFromHeap(thread, pathAddr), mode, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'fchmod(II)V'(thread: JVMThread, fd: number, mode: number): void {
      const operation = beginUnixDescriptorOperation(thread, fd);
      if (operation === null) {
        return;
      }
      if (util.are_in_browser()) {
        const file = getBrowserFsFile(fd);
        if (file !== null && typeof file.getStats === 'function' && typeof file.sync === 'function') {
          dispatchUnixDescriptorOperation(thread, operation, () => {
            const stats = file.getStats();
            if (typeof stats.chmod === 'function') {
              stats.chmod(mode);
            } else {
              stats.mode = (stats.mode & 0xF000) | mode;
            }
            syncBrowserFsFile(file, (err) => {
              finishUnixDescriptorOperation(
                thread,
                operation,
                err,
                () => thread.asyncReturn()
              );
            });
          });
          return;
        }
      }
      dispatchUnixDescriptorOperation(thread, operation, () => {
        fs.fchmod(fd, mode, (err) => {
          finishUnixDescriptorOperation(
            thread,
            operation,
            err,
            () => thread.asyncReturn()
          );
        });
      });
    }

    public static 'utimes0(JJJ)V'(thread: JVMThread, pathAddress: Long, times0: Long, times1: Long): void {
      const p = getStringFromHeap(thread, pathAddress);
      const t0 = new Date(times0.toNumber() / 1000);
      const t1 = new Date(times1.toNumber() / 1000);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      if (util.are_in_browser()) {
        const location = getBrowserFsLocation(p),
          backend = location === null ? null : location.fs;
        if (backend !== null && backend.store !== undefined &&
            typeof backend.store.beginTransaction === 'function' &&
            typeof backend._findINode === 'function' && backend._findINode.length === 3 &&
            typeof backend.getINode === 'function') {
          let transaction: any = null;
          try {
            transaction = backend.store.beginTransaction('readwrite');
            const metadataNodeId = backend._findINode(
                transaction,
                path.dirname(location.path),
                path.basename(location.path)
              ),
              inode = backend.getINode(transaction, location.path, metadataNodeId);
            inode.atime = t0.getTime();
            inode.mtime = t1.getTime();
            inode.ctime = Date.now();
            transaction.put(metadataNodeId, inode.toBuffer(), true);
            transaction.commit();
            thread.asyncReturn();
          } catch (err) {
            if (transaction !== null && typeof transaction.abort === 'function') {
              try {
                transaction.abort();
              } catch (abortErr) {
              }
            }
            throwUnixException(thread, <NodeJS.ErrnoException> err);
          }
          return;
        }
      }
      fs.utimes(p, t0, t1, (err) => {
        if (err) {
          throwUnixException(thread, err);
        } else {
          thread.asyncReturn();
        }
      });
    }

    public static 'futimes(IJJ)V'(thread: JVMThread, fd: number, times0: Long, times1: Long): void {
      const t0 = new Date(times0.toNumber() / 1000);
      const t1 = new Date(times1.toNumber() / 1000);
      const operation = beginUnixDescriptorOperation(thread, fd);
      if (operation === null) {
        return;
      }
      if (util.are_in_browser()) {
        const file = getBrowserFsFile(fd);
        if (file !== null && typeof file.getStats === 'function' && typeof file.sync === 'function') {
          dispatchUnixDescriptorOperation(thread, operation, () => {
            const stats = file.getStats();
            stats.atime = t0;
            stats.mtime = t1;
            stats.ctime = new Date();
            syncBrowserFsFile(file, (err) => {
              finishUnixDescriptorOperation(
                thread,
                operation,
                err,
                () => thread.asyncReturn()
              );
            });
          });
          return;
        }
      }
      dispatchUnixDescriptorOperation(thread, operation, () => {
        fs.futimes(fd, t0, t1, (err) => {
          finishUnixDescriptorOperation(
            thread,
            operation,
            err,
            () => thread.asyncReturn()
          );
        });
      });
    }

    public static 'opendir0(J)J'(thread: JVMThread, ptr: Long): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.readdir(getStringFromHeap(thread, ptr), (err, files) => {
        if (err) {
          convertError(thread, err, (errObj) => {
            thread.throwException(errObj);
          });
        } else {
          thread.asyncReturn(Long.fromNumber(dirMap.newEntry(new DirFd(files))), null);
        }
      });
    }

    public static 'fdopendir(I)J'(thread: JVMThread, arg0: number): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return null;
    }

    public static 'closedir(J)V'(thread: JVMThread, arg0: Long): void {
      dirMap.removeEntry(thread, arg0.toNumber(), 'Lsun/nio/fs/UnixException;');
    }

    public static 'readdir(J)[B'(thread: JVMThread, fd: Long): JVMTypes.JVMArray<number> {
      var dirFd = dirMap.getEntry(thread, 'Lsun/nio/fs/UnixException;', fd.toNumber());
      if (dirFd) {
        return stringToByteArray(thread, dirFd.next());
      }
    }

    public static 'read(IJI)I'(thread: JVMThread, fd: number, buf: Long, nbyte: number): void {
      const operation = beginUnixDescriptorOperation(thread, fd);
      if (operation === null) {
        return;
      }
      dispatchUnixDescriptorOperation(thread, operation, () => {
        const scratch = Buffer.alloc(nbyte),
          position = FDState.getPos(fd);
        fs.read(fd, scratch, 0, nbyte, position, (err, bytesRead) => {
          finishUnixDescriptorOperation(thread, operation, err, () => {
            const destination = thread.getJVM().getHeap().get_buffer(
              buf.toNumber(),
              nbyte
            );
            scratch.copy(destination, 0, 0, bytesRead);
            FDState.incrementPosIfCurrent(fd, operation.lease.generation, bytesRead);
            thread.asyncReturn(bytesRead);
          });
        });
      });
    }

    public static 'write(IJI)I'(thread: JVMThread, fd: number, buf: Long, nbyte: number): void {
      const operation = beginUnixDescriptorOperation(thread, fd);
      if (operation === null) {
        return;
      }
      dispatchUnixDescriptorOperation(thread, operation, () => {
        const buff = thread.getJVM().getHeap().get_buffer(buf.toNumber(), nbyte);
        writeBuffer(
          thread,
          operation.lease,
          buff,
          0,
          nbyte,
          FDState.getPos(fd),
          true,
          true,
          (bytesWritten) => finishUnixDescriptorOperation(
            thread,
            operation,
            null,
            () => thread.asyncReturn(bytesWritten)
          ),
          (err) => finishUnixDescriptorOperation(
            thread,
            operation,
            err,
            () => {}
          )
        );
      });
    }

    public static 'access0(JI)V'(thread: JVMThread, pathAddress: Long, arg1: number): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      const pathString = getStringFromHeap(thread, pathAddress);
      // TODO: fs.access() is better but not currently supported in browserfs: https://github.com/jvilk/BrowserFS/issues/128
      if (util.are_in_browser()) {
        fs.stat(pathString, (err: Error, stat: fs.Stats) => {
          if (err) {
            throwUnixException(thread, err);
          } else if ((((stat.mode >>> 6) & 7) & (arg1 & 7)) !== (arg1 & 7)) {
            const accessError = <NodeJS.ErrnoException>
              new Error(`EACCES: permission denied, access '${pathString}'`);
            accessError.code = 'EACCES';
            accessError.path = pathString;
            throwUnixException(thread, accessError);
          } else {
            thread.asyncReturn();
          }
        });
      } else {
        // Java and POSIX use the same read/write/execute access bits: 4/2/1.
        const mode = arg1 & 7;
        fs.access(pathString, mode, (err: Error) => {
          if (err) {
            throwUnixException(thread, err);
          } else {
            thread.asyncReturn();
          }
        });
      }
    }

    public static 'getpwuid(I)[B'(thread: JVMThread, arg0: number): JVMTypes.JVMArray<number> {
      // Make something up.
      return stringToByteArray(thread, 'doppio');
    }

    public static 'getgrgid(I)[B'(thread: JVMThread, arg0: number): JVMTypes.JVMArray<number> {
      // Make something up.
      return stringToByteArray(thread, 'doppio');
    }

    public static 'getpwnam0(J)I'(thread: JVMThread, arg0: Long): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return 0;
    }

    public static 'getgrnam0(J)I'(thread: JVMThread, arg0: Long): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return 0;
    }

    public static 'statvfs0(JLsun/nio/fs/UnixFileStoreAttributes;)V'(thread: JVMThread, pathAddress: Long, attrs: JVMTypes.sun_nio_fs_UnixFileStoreAttributes): void {
      const pathString = getStringFromHeap(thread, pathAddress),
        statfs = (<any> fs).statfs;
      if (typeof statfs !== 'function') {
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_frsize'] = Long.ZERO;
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_blocks'] = Long.ZERO;
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_bfree'] = Long.ZERO;
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_bavail'] = Long.ZERO;
        return;
      }

      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      statfs(pathString, (err: NodeJS.ErrnoException, stats: any) => {
        if (err) {
          throwUnixException(thread, err);
          return;
        }

        attrs['sun/nio/fs/UnixFileStoreAttributes/f_frsize'] =
          Long.fromNumber(Math.max(0, Math.floor(stats != null && typeof stats.bsize === 'number' ? stats.bsize : 0)));
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_blocks'] =
          Long.fromNumber(Math.max(0, Math.floor(stats != null && typeof stats.blocks === 'number' ? stats.blocks : 0)));
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_bfree'] =
          Long.fromNumber(Math.max(0, Math.floor(stats != null && typeof stats.bfree === 'number' ? stats.bfree : 0)));
        attrs['sun/nio/fs/UnixFileStoreAttributes/f_bavail'] =
          Long.fromNumber(Math.max(0, Math.floor(stats != null && typeof stats.bavail === 'number' ? stats.bavail : 0)));
        thread.asyncReturn();
      });
    }

    public static 'pathconf0(JI)J'(thread: JVMThread, arg0: Long, arg1: number): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return null;
    }

    public static 'fpathconf(II)J'(thread: JVMThread, arg0: number, arg1: number): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return null;
    }

    public static 'strerror(I)[B'(thread: JVMThread, arg0: number): JVMTypes.JVMArray<number> {
      const message = BrowserFS.Errors.ErrorStrings[arg0] || `Unix error ${arg0}`;
      return stringToByteArray(thread, message);
    }

    public static 'init()I'(thread: JVMThread): number {
      // Both Node and the BrowserFS bridge implement descriptor timestamp
      // updates, so expose the vendor SUPPORTS_FUTIMES capability bit.
      return 4;
    }

  }

  class sun_nio_fs_LinuxNativeDispatcher {

    private static readMountEntry(thread: JVMThread, handle: Long, entry: JVMTypes.sun_nio_fs_UnixMountEntry): number {
      const table = mountMap.getEntry(thread, 'Lsun/nio/fs/UnixException;', handle.toNumber());
      if (table === null || table.pos >= table.entries.length) {
        return -1;
      }

      const mountEntry = table.entries[table.pos++];
      entry['sun/nio/fs/UnixMountEntry/name'] = stringToByteArray(thread, mountEntry.name);
      entry['sun/nio/fs/UnixMountEntry/dir'] = stringToByteArray(thread, mountEntry.dir);
      entry['sun/nio/fs/UnixMountEntry/fstype'] = stringToByteArray(thread, mountEntry.fstype);
      entry['sun/nio/fs/UnixMountEntry/opts'] = stringToByteArray(thread, mountEntry.opts);
      entry['sun/nio/fs/UnixMountEntry/dev'] = Long.fromNumber(mountEntry.dev);
      entry['sun/nio/fs/UnixMountEntry/fstypeAsString'] = null;
      entry['sun/nio/fs/UnixMountEntry/optionsAsString'] = null;
      return 0;
    }

    public static 'init()V'(thread: JVMThread): void {
    }

    public static 'flistxattr(IJI)I'(thread: JVMThread, fd: number, address: Long, size: number): number {
      // Node and BrowserFS do not expose descriptor-based extended attributes.
      // Report an empty list so COPY_ATTRIBUTES can still preserve the basic
      // and POSIX attributes that these hosts do support.
      return 0;
    }

    public static 'setmntent0(JJ)J'(thread: JVMThread, pathAddress: Long, modeAddress: Long): Long {
      const filePath = getStringFromHeap(thread, pathAddress);
      let contents: string = null;
      try {
        contents = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        try {
          contents = fs.readFileSync('/proc/mounts', 'utf8');
        } catch (fallbackErr) {
          contents = 'doppio / doppiofs rw 0 0\n';
        }
      }

      const entries: MountEntry[] = [];
      contents.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.charAt(0) === '#') {
          return;
        }

        const parts = trimmed.split(/\s+/);
        if (parts.length < 4) {
          return;
        }

        const dir = parts[1].replace(/\\040/g, ' '),
          name = parts[0].replace(/\\040/g, ' '),
          fstype = parts[2],
          opts = parts[3];
        let dev = 0;
        try {
          dev = fs.statSync(dir).dev;
        } catch (statErr) {
          dev = 0;
        }
        entries.push({ name: name, dir: dir, fstype: fstype, opts: opts, dev: dev });
      });

      if (entries.length === 0) {
        let dev = 0;
        try {
          dev = fs.statSync('/').dev;
        } catch (statErr) {
          dev = 0;
        }
        entries.push({ name: 'doppio', dir: '/', fstype: 'doppiofs', opts: 'rw', dev: dev });
      }

      return Long.fromNumber(mountMap.newEntry({ entries: entries, pos: 0 }));
    }

    public static 'getlinelen(J)I'(thread: JVMThread, handle: Long): number {
      const table = mountMap.getEntry(thread, 'Lsun/nio/fs/UnixException;', handle.toNumber());
      if (table === null || table.pos >= table.entries.length) {
        return -1;
      }

      const entry = table.entries[table.pos++];
      return `${entry.name} ${entry.dir} ${entry.fstype} ${entry.opts}`.length;
    }

    public static 'rewind(J)V'(thread: JVMThread, handle: Long): void {
      const table = mountMap.getEntry(thread, 'Lsun/nio/fs/UnixException;', handle.toNumber());
      if (table !== null) {
        table.pos = 0;
      }
    }

    public static 'getmntent(JLsun/nio/fs/UnixMountEntry;)I'(thread: JVMThread, handle: Long, entry: JVMTypes.sun_nio_fs_UnixMountEntry): number {
      return sun_nio_fs_LinuxNativeDispatcher.readMountEntry(thread, handle, entry);
    }

    public static 'getmntent0(JLsun/nio/fs/UnixMountEntry;JI)I'(thread: JVMThread, handle: Long, entry: JVMTypes.sun_nio_fs_UnixMountEntry, lineAddress: Long, lineLength: number): number {
      return sun_nio_fs_LinuxNativeDispatcher.readMountEntry(thread, handle, entry);
    }

    public static 'endmntent(J)V'(thread: JVMThread, handle: Long): void {
      mountMap.removeEntry(thread, handle.toNumber(), 'Lsun/nio/fs/UnixException;');
    }

  }

  return {
    'sun/nio/ch/FileChannelImpl': sun_nio_ch_FileChannelImpl,
    'sun/nio/ch/NativeThread': sun_nio_ch_NativeThread,
    'sun/nio/ch/IOUtil': sun_nio_ch_IOUtil,
    'sun/nio/fs/UnixCopyFile': sun_nio_fs_UnixCopyFile,
    'sun/nio/ch/FileDispatcherImpl': sun_nio_ch_FileDispatcherImpl,
    'sun/nio/fs/LinuxNativeDispatcher': sun_nio_fs_LinuxNativeDispatcher,
    'sun/nio/fs/UnixNativeDispatcher': sun_nio_fs_UnixNativeDispatcher
  };
};
