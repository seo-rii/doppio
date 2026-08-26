import * as JVMTypes from '../../includes/JVMTypes';
import * as Doppio from '../doppiojvm';
import * as fs from 'fs';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import logging = Doppio.Debug.Logging;
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
  function forceMappedRange(thread: JVMThread, fdObj: JVMTypes.java_io_FileDescriptor, addressArg: Long, lenArg: Long, returnValue?: JVMTypes.java_lang_Object): boolean {
    if (fdObj === null || lenArg.lessThanOrEqual(Long.ZERO)) {
      return true;
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
      return true;
    }

    const fd = mapping.fd;
    if (fd === -1) {
      thread.throwNewException("Ljava/io/IOException;", "Bad file descriptor");
      return false;
    }

    const offset = address - baseAddress,
      writeLen = Math.min(len, Math.max(0, mapping.length - offset));
    if (writeLen <= 0) {
      return true;
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
          } else if (returnValue !== undefined) {
            thread.asyncReturn(returnValue);
          } else {
            thread.asyncReturn();
          }
        });
      }
    });
    return false;
  }

  interface TypedArrayCopy {
    array: JVMTypes.JVMArray<any>;
    component: string;
    byteOffset: number;
    byteLength: number;
    index: number;
    count: number;
  }

  function getTypedArrayCopy(thread: JVMThread, arrayObj: JVMTypes.java_lang_Object, byteOffsetArg: Long, byteLengthArg: Long, scale: number): TypedArrayCopy {
    if (arrayObj === null) {
      thread.throwNewException('Ljava/lang/NullPointerException;', '');
      return null;
    }

    const byteOffset = byteOffsetArg.toNumber(),
      byteLength = byteLengthArg.toNumber();

    if (byteOffset < 0 || byteLength < 0 || byteOffset % scale !== 0 || byteLength % scale !== 0) {
      thread.throwNewException('Ljava/lang/InternalError;', 'Unaligned java.nio.Bits primitive array copy.');
      return null;
    }

    const array = <JVMTypes.JVMArray<any>> arrayObj,
      index = byteOffset / scale,
      count = byteLength / scale;
    return {
      array,
      component: array.getClass().getInternalName()[1],
      byteOffset,
      byteLength,
      index,
      count
    };
  }

  class java_nio_Bits {

    public static 'copyFromShortArray(Ljava/lang/Object;JJJ)V'(thread: JVMThread, srcObj: JVMTypes.java_lang_Object, srcPos: Long, dstAddress: Long, byteLength: Long): void {
      const copy = getTypedArrayCopy(thread, srcObj, srcPos, byteLength, 2);
      if (copy === null) {
        return;
      }

      const dst = thread.getJVM().getHeap().get_buffer(dstAddress.toNumber(), copy.byteLength);
      for (let i = 0; i < copy.count; i++) {
        dst.writeUInt16BE(copy.array.array[copy.index + i] & 0xffff, i * 2);
      }
    }

    public static 'copyToShortArray(JLjava/lang/Object;JJ)V'(thread: JVMThread, srcAddress: Long, dstObj: JVMTypes.java_lang_Object, dstPos: Long, byteLength: Long): void {
      const copy = getTypedArrayCopy(thread, dstObj, dstPos, byteLength, 2);
      if (copy === null) {
        return;
      }

      const src = thread.getJVM().getHeap().get_buffer(srcAddress.toNumber(), copy.byteLength);
      for (let i = 0; i < copy.count; i++) {
        copy.array.array[copy.index + i] = copy.component === 'C' ? src.readUInt16BE(i * 2) : src.readInt16BE(i * 2);
      }
    }

    public static 'copyFromIntArray(Ljava/lang/Object;JJJ)V'(thread: JVMThread, srcObj: JVMTypes.java_lang_Object, srcPos: Long, dstAddress: Long, byteLength: Long): void {
      const copy = getTypedArrayCopy(thread, srcObj, srcPos, byteLength, 4);
      if (copy === null) {
        return;
      }

      const dst = thread.getJVM().getHeap().get_buffer(dstAddress.toNumber(), copy.byteLength);
      for (let i = 0; i < copy.count; i++) {
        if (copy.component === 'F') {
          dst.writeFloatBE(copy.array.array[copy.index + i], i * 4);
        } else {
          dst.writeInt32BE(copy.array.array[copy.index + i], i * 4);
        }
      }
    }

    public static 'copyToIntArray(JLjava/lang/Object;JJ)V'(thread: JVMThread, srcAddress: Long, dstObj: JVMTypes.java_lang_Object, dstPos: Long, byteLength: Long): void {
      const copy = getTypedArrayCopy(thread, dstObj, dstPos, byteLength, 4);
      if (copy === null) {
        return;
      }

      const src = thread.getJVM().getHeap().get_buffer(srcAddress.toNumber(), copy.byteLength);
      for (let i = 0; i < copy.count; i++) {
        copy.array.array[copy.index + i] = copy.component === 'F' ? src.readFloatBE(i * 4) : src.readInt32BE(i * 4);
      }
    }

    public static 'copyFromLongArray(Ljava/lang/Object;JJJ)V'(thread: JVMThread, srcObj: JVMTypes.java_lang_Object, srcPos: Long, dstAddress: Long, byteLength: Long): void {
      const copy = getTypedArrayCopy(thread, srcObj, srcPos, byteLength, 8);
      if (copy === null) {
        return;
      }

      const dst = thread.getJVM().getHeap().get_buffer(dstAddress.toNumber(), copy.byteLength);
      for (let i = 0; i < copy.count; i++) {
        if (copy.component === 'D') {
          dst.writeDoubleBE(copy.array.array[copy.index + i], i * 8);
        } else {
          const value = <Long> copy.array.array[copy.index + i];
          dst.writeInt32BE(value.getHighBits(), i * 8);
          dst.writeInt32BE(value.getLowBits(), (i * 8) + 4);
        }
      }
    }

    public static 'copyToLongArray(JLjava/lang/Object;JJ)V'(thread: JVMThread, srcAddress: Long, dstObj: JVMTypes.java_lang_Object, dstPos: Long, byteLength: Long): void {
      const copy = getTypedArrayCopy(thread, dstObj, dstPos, byteLength, 8);
      if (copy === null) {
        return;
      }

      const src = thread.getJVM().getHeap().get_buffer(srcAddress.toNumber(), copy.byteLength);
      for (let i = 0; i < copy.count; i++) {
        copy.array.array[copy.index + i] = copy.component === 'D' ?
          src.readDoubleBE(i * 8) :
          Long.fromBits(src.readInt32BE((i * 8) + 4), src.readInt32BE(i * 8));
      }
    }

  }

  class java_nio_MappedByteBuffer {

    public static 'isLoaded0(JJI)Z'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, address: Long, len: Long, pageCount: number): number {
      return 1;
    }

    public static 'load0(JJ)V'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, address: Long, len: Long): void {
    }

    public static 'force0(Ljava/io/FileDescriptor;JJ)V'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, fdObj: JVMTypes.java_io_FileDescriptor, addressArg: Long, lenArg: Long): void {
      forceMappedRange(thread, fdObj, addressArg, lenArg);
    }

    public static 'force(II)Ljava/nio/MappedByteBuffer;'(thread: JVMThread, javaThis: JVMTypes.java_nio_MappedByteBuffer, index: number, length: number): JVMTypes.java_nio_MappedByteBuffer | void {
      const fdObj = javaThis['java/nio/MappedByteBuffer/fd'],
        capacity = javaThis['java/nio/Buffer/capacity'],
        address = javaThis['java/nio/Buffer/address'];

      if (fdObj === null || address.isZero() || capacity === 0) {
        return javaThis;
      }
      if (index < 0 || length < 0 || index > capacity - length) {
        thread.throwNewException('Ljava/lang/IndexOutOfBoundsException;', '');
        return;
      }

      if (forceMappedRange(thread, fdObj, Long.fromNumber(address.toNumber() + index), Long.fromNumber(length), javaThis)) {
        return javaThis;
      }
    }

  }

  // Export line. This is what DoppioJVM sees.
  return {
    'java/nio/Bits': java_nio_Bits,
    'java/nio/MappedByteBuffer': java_nio_MappedByteBuffer
  };
};
