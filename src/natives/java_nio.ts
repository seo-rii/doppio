import * as JVMTypes from '../../includes/JVMTypes';
import * as Doppio from '../doppiojvm';
import * as fs from 'fs';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import logging = Doppio.Debug.Logging;
import util = Doppio.VM.Util;
import Long = Doppio.VM.Long;
import ClassData = Doppio.VM.ClassFile.ClassData;
import ThreadStatus = Doppio.VM.Enums.ThreadStatus;

export interface MappedByteBufferMapping {
  fd: number;
  position: number;
  length: number;
  writable: boolean;
}

export const mappedByteBufferMappings: { [address: number]: MappedByteBufferMapping } = {};

export default function (): any {
  class java_nio_Bits {

    public static 'copyFromShortArray(Ljava/lang/Object;JJJ)V'(thread: JVMThread, arg0: JVMTypes.java_lang_Object, arg1: Long, arg2: Long, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'copyToShortArray(JLjava/lang/Object;JJ)V'(thread: JVMThread, arg0: Long, arg1: JVMTypes.java_lang_Object, arg2: Long, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'copyFromIntArray(Ljava/lang/Object;JJJ)V'(thread: JVMThread, arg0: JVMTypes.java_lang_Object, arg1: Long, arg2: Long, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'copyToIntArray(JLjava/lang/Object;JJ)V'(thread: JVMThread, arg0: Long, arg1: JVMTypes.java_lang_Object, arg2: Long, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'copyFromLongArray(Ljava/lang/Object;JJJ)V'(thread: JVMThread, arg0: JVMTypes.java_lang_Object, arg1: Long, arg2: Long, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'copyToLongArray(JLjava/lang/Object;JJ)V'(thread: JVMThread, arg0: Long, arg1: JVMTypes.java_lang_Object, arg2: Long, arg3: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

  }

  class java_nio_MappedByteBuffer {

    public static 'isLoaded0(JJI)Z'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, address: Long, len: Long, pageCount: number): number {
      return 1;
    }

    public static 'load0(JJ)V'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, address: Long, len: Long): void {
    }

    public static 'force0(Ljava/io/FileDescriptor;JJ)V'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, fdObj: JVMTypes.java_io_FileDescriptor, addressArg: Long, lenArg: Long): void {
      if (fdObj === null || lenArg.lessThanOrEqual(Long.ZERO)) {
        return;
      }

      const address = addressArg.toNumber(),
        len = lenArg.toNumber();
      let mapping: MappedByteBufferMapping = null,
        baseAddress = 0;

      for (const key in mappedByteBufferMappings) {
        if (mappedByteBufferMappings.hasOwnProperty(key)) {
          const candidateBase = parseInt(key, 10),
            candidate = mappedByteBufferMappings[candidateBase];
          if (address >= candidateBase && address <= candidateBase + candidate.length) {
            mapping = candidate;
            baseAddress = candidateBase;
            break;
          }
        }
      }

      if (mapping === null || !mapping.writable) {
        return;
      }

      const fd = mapping.fd;
      if (fd === -1) {
        thread.throwNewException("Ljava/io/IOException;", "Bad file descriptor");
        return;
      }

      const offset = address - baseAddress,
        writeLen = Math.min(len, Math.max(0, mapping.length - offset));
      if (writeLen <= 0) {
        return;
      }

      const buf = thread.getJVM().getHeap().get_buffer(address, writeLen);
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      fs.write(fd, buf, 0, writeLen, mapping.position + offset, (writeErr) => {
        if (writeErr) {
          thread.throwNewException("Ljava/io/IOException;", 'Error forcing mapped buffer: ' + writeErr.message);
        } else {
          fs.fsync(fd, (syncErr) => {
            if (syncErr) {
              thread.throwNewException("Ljava/io/IOException;", 'Error syncing mapped buffer: ' + syncErr.message);
            } else {
              thread.asyncReturn();
            }
          });
        }
      });
    }

  }

  class java_nio_charset_Charset$3 {

    public static 'run()Ljava/lang/Object;'(thread: JVMThread, javaThis: JVMTypes.java_nio_charset_Charset$3): JVMTypes.java_lang_Object {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      return null;
    }

  }

  // Export line. This is what DoppioJVM sees.
  return {
    'java/nio/Bits': java_nio_Bits,
    'java/nio/MappedByteBuffer': java_nio_MappedByteBuffer,
    'java/nio/charset/Charset$3': java_nio_charset_Charset$3
  };
};
