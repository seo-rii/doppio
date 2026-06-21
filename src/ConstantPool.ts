import gLong from './gLong';
import ByteStream from './ByteStream';
import * as fs from 'fs';
import * as util from './util';
import {ConstantPoolItemType, MethodHandleReferenceKind, ThreadStatus} from './enums';
import assert from './assert';
import {ClassData, ReferenceClassData, ArrayClassData, IJVMConstructor, PrimitiveClassData} from './ClassData';
import {Method, Field} from './methods';
import {ClassLoader} from './ClassLoader';
// For type information.
import {JVMThread, BytecodeStackFrame, InternalStackFrame, NativeStackFrame} from './threading';
import * as JVMTypes from '../includes/JVMTypes';
import {setImmediate} from 'browserfs';

/**
 * Represents a constant pool item. Use the item's type to discriminate among them.
 */
export interface IConstantPoolItem {
  getType(): ConstantPoolItemType;
  /**
   * Is this constant pool item resolved? Use to discriminate among resolved
   * and unresolved reference types.
   */
  isResolved(): boolean;
  /**
   * Returns the constant associated with the constant pool item. The item *must*
   * be resolved.
   * Only defined on constant pool items that return values through LDC.
   */
  getConstant?(thread: JVMThread): any;
  /**
   * Resolves an unresolved constant pool item. Can only be called if
   * isResolved() returns false.
   */
  resolve?(thread: JVMThread, cl: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void, explicit?: boolean): void;
}

/**
 * All constant pool items have a static constructor function.
 */
export interface IConstantPoolType {
  fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem;
  /**
   * The resulting size in the constant pool, in machine words.
   */
  size: number;
  /**
   * The bytesize on disk of the item's information past the tag byte.
   */
  infoByteSize: number;
}
/**
 * Stores all of the constant pool classes, keyed on their enum value.
 */
var CP_CLASSES: { [n: number]: IConstantPoolType } = {};

// #region Tier 0

/**
 * Represents a constant UTF-8 string.
 * ```
 * CONSTANT_Utf8_info {
 *   u1 tag;
 *   u2 length;
 *   u1 bytes[length];
 * }
 * ```
 */
export class ConstUTF8 implements IConstantPoolItem {
  public value: string;
  constructor(rawBytes: Buffer) {
    this.value = this.bytes2str(rawBytes);
  }

  /**
   * Parse Java's pseudo-UTF-8 strings into valid UTF-16 codepoints (spec 4.4.7)
   * Note that Java uses UTF-16 internally by default for string representation,
   * and the pseudo-UTF-8 strings are *only* used for serialization purposes.
   * Thus, there is no reason for other parts of the code to call this routine!
   * TODO: To avoid copying, create a character array for this data.
   * http://docs.oracle.com/javase/specs/jvms/se8/html/jvms-4.html#jvms-4.4.7
   */
  private bytes2str(bytes: Buffer): string {
    var y: number, z: number, v: number, w: number, x: number, charCode: number, idx = 0, rv = '';
    while (idx < bytes.length) {
      x = bytes[idx++] & 0xff;
      // While the standard specifies that surrogate pairs should be handled, it seems like
      // they are by default with the three byte format. See parsing code here:
      // http://hg.openjdk.java.net/jdk8u/jdk8u-dev/jdk/file/3623f1b29b58/src/share/classes/java/io/DataInputStream.java#l618

      // One UTF-16 character.
      if (x <= 0x7f) {
        // One character, one byte.
        charCode = x;
      } else if (x <= 0xdf) {
        // One character, two bytes.
        y = bytes[idx++];
        charCode = ((x & 0x1f) << 6) + (y & 0x3f);
      } else {
        // One character, three bytes.
        y = bytes[idx++];
        z = bytes[idx++];
        charCode = ((x & 0xf) << 12) + ((y & 0x3f) << 6) + (z & 0x3f);
      }
      rv += String.fromCharCode(charCode);
    }

    return rv;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.UTF8;
  }

  public getConstant(thread: JVMThread) { return this.value; }

  public isResolved() { return true; }

  public static size: number = 1;
  // Variable-size.
  public static infoByteSize: number = 0;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var strlen = byteStream.getUint16();
    return new this(byteStream.read(strlen));
  }
}
CP_CLASSES[ConstantPoolItemType.UTF8] = ConstUTF8;

/**
 * Represents a constant 32-bit integer.
 * ```
 * CONSTANT_Integer_info {
 *   u1 tag;
 *   u4 bytes;
 * }
 * ```
 */
export class ConstInt32 implements IConstantPoolItem {
  public value: number;
  constructor(value: number) {
    this.value = value;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.INTEGER;
  }

  public getConstant(thread: JVMThread) { return this.value; }

  public isResolved() { return true; }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    return new this(byteStream.getInt32());
  }
}
CP_CLASSES[ConstantPoolItemType.INTEGER] = ConstInt32;

/**
 * Represents a constant 32-bit floating point number.
 * ```
 * CONSTANT_Float_info {
 *   u1 tag;
 *   u4 bytes;
 * }
 * ```
 */
export class ConstFloat implements IConstantPoolItem {
  public value: number;
  constructor(value: number) {
    this.value = value;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.FLOAT;
  }

  public getConstant(thread: JVMThread) { return this.value; }

  public isResolved() { return true; }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    return new this(byteStream.getFloat());
  }
}
CP_CLASSES[ConstantPoolItemType.FLOAT] = ConstFloat;

/**
 * Represents a constant 64-bit integer.
 * ```
 * CONSTANT_Long_info {
 *   u1 tag;
 *   u4 high_bytes;
 *   u4 low_bytes;
 * }
 * ```
 */
export class ConstLong implements IConstantPoolItem {
  public value: gLong;
  constructor(value: gLong) {
    this.value = value;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.LONG;
  }

  public getConstant(thread: JVMThread) { return this.value; }

  public isResolved() { return true; }

  public static size: number = 2;
  public static infoByteSize: number = 8;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    return new this(byteStream.getInt64());
  }
}
CP_CLASSES[ConstantPoolItemType.LONG] = ConstLong;

/**
 * Represents a constant 64-bit floating point number.
 * ```
 * CONSTANT_Double_info {
 *   u1 tag;
 *   u4 high_bytes;
 *   u4 low_bytes;
 * }
 * ```
 */
export class ConstDouble implements IConstantPoolItem {
  public value: number;
  constructor(value: number) {
    this.value = value;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.DOUBLE;
  }

  public getConstant(thread: JVMThread) { return this.value; }

  public isResolved() { return true; }

  public static size: number = 2;
  public static infoByteSize: number = 8;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    return new this(byteStream.getDouble());
  }
}
CP_CLASSES[ConstantPoolItemType.DOUBLE] = ConstDouble;

// #endregion

// #region Tier 1

/**
 * Represents a class or interface.
 * ```
 * CONSTANT_Class_info {
 *   u1 tag;
 *   u2 name_index;
 * }
 * ```
 * @todo Have a classloader-local cache of class reference objects.
 */
export class ClassReference implements IConstantPoolItem {
  /**
   * The name of the class, in full descriptor form, e.g.:
   * Lfoo/bar/Baz;
   */
  public name: string;
  /**
   * The resolved class reference.
   */
  public cls: ReferenceClassData<JVMTypes.java_lang_Object> | ArrayClassData<any> = null;
  /**
   * The JavaScript constructor for the referenced class.
   */
  public clsConstructor: IJVMConstructor<JVMTypes.java_lang_Object> = null;
  /**
   * The array class for the resolved class reference.
   */
  public arrayClass: ArrayClassData<any> = null;
  /**
   * The JavaScript constructor for the array class.
   */
  public arrayClassConstructor: IJVMConstructor<JVMTypes.JVMArray<any>> = null;
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Attempt to synchronously resolve.
   */
  public tryResolve(loader: ClassLoader): boolean {
    if (this.cls === null) {
      this.cls = <ReferenceClassData<JVMTypes.java_lang_Object>> loader.getResolvedClass(this.name);
    }
    return this.cls !== null;
  }

  /**
   * Resolves the class reference by resolving the class. Does not run
   * class initialization.
   */
  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void, explicit: boolean = true) {
    // Because of Java 8 anonymous classes, THIS CHECK IS REQUIRED FOR CORRECTNESS.
    // (ClassLoaders do not know about anonymous classes, hence they are
    //  'anonymous')
    // (Anonymous classes are an 'Unsafe' feature, and are not part of the standard,
    //  but they are employed for lambdas and such.)
    // NOTE: Thread is 'null' during JVM bootstrapping.
    if (thread !== null) {
      var currentMethod = thread.currentMethod();
      // The stack might be empty during resolution, which occurs during JVM bootup.
      if (currentMethod !== null && this.name === currentMethod.cls.getInternalName()) {
        this.setResolved(thread, currentMethod.cls);
        return cb(true);
      }
    }

    loader.resolveClass(thread, this.name, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
      this.setResolved(thread, cdata);
      cb(cdata !== null);
    }, explicit);
  }

  private setResolved(thread: JVMThread, cls: ReferenceClassData<JVMTypes.java_lang_Object>) {
    this.cls = cls;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.CLASS;
  }

  public getConstant(thread: JVMThread) { return this.cls.getClassObject(thread); }

  public isResolved() { return this.cls !== null; }

  public static size: number = 1;
  public static infoByteSize: number = 2;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var nameIndex = byteStream.getUint16(),
      cpItem = constantPool.get(nameIndex);
    assert(cpItem.getType() === ConstantPoolItemType.UTF8,
      'ConstantPool ClassReference type != UTF8');
    // The ConstantPool stores class names without the L...; descriptor stuff
    return new this(util.typestr2descriptor((<ConstUTF8> cpItem).value));
  }
}
CP_CLASSES[ConstantPoolItemType.CLASS] = ClassReference;

/**
 * Represents a field or method without indicating which class or interface
 * type it belongs to.
 * ```
 * CONSTANT_NameAndType_info {
 *   u1 tag;
 *   u2 name_index;
 *   u2 descriptor_index;
 * }
 * ```
 */
export class NameAndTypeInfo implements IConstantPoolItem {
  public name: string;
  public descriptor: string;
  constructor(name: string, descriptor: string) {
    this.name = name;
    this.descriptor = descriptor;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.NAME_AND_TYPE;
  }

  public isResolved() { return true; }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var nameIndex = byteStream.getUint16(),
      descriptorIndex = byteStream.getUint16(),
      nameConst = <ConstUTF8> constantPool.get(nameIndex),
      descriptorConst = <ConstUTF8> constantPool.get(descriptorIndex);
    assert(nameConst.getType() === ConstantPoolItemType.UTF8 &&
      descriptorConst.getType() === ConstantPoolItemType.UTF8,
      'ConstantPool NameAndTypeInfo types != UTF8');
    return new this(nameConst.value, descriptorConst.value);
  }
}
CP_CLASSES[ConstantPoolItemType.NAME_AND_TYPE] = NameAndTypeInfo;

/**
 * Represents constant objects of the type java.lang.String.
 * ```
 * CONSTANT_String_info {
 *   u1 tag;
 *   u2 string_index;
 * }
 * ```
 */
export class ConstString implements IConstantPoolItem {
  public stringValue: string;
  public value: JVMTypes.java_lang_String = null;
  constructor(stringValue: string) {
    this.stringValue = stringValue;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.STRING;
  }

  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void) {
    this.value = thread.getJVM().internString(this.stringValue);
    setImmediate(() => cb(true));
  }

  public getConstant(thread: JVMThread) { return this.value; }

  public isResolved() { return this.value !== null; }

  public static size: number = 1;
  public static infoByteSize: number = 2;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var stringIndex = byteStream.getUint16(),
      utf8Info = <ConstUTF8> constantPool.get(stringIndex);
    assert(utf8Info.getType() === ConstantPoolItemType.UTF8,
      'ConstantPool ConstString type != UTF8');
    return new this(utf8Info.value);
  }
}
CP_CLASSES[ConstantPoolItemType.STRING] = ConstString;

/**
 * Represents a given method type.
 * ```
 * CONSTANT_MethodType_info {
 *   u1 tag;
 *   u2 descriptor_index;
 * }
 * ```
 */
export class MethodType implements IConstantPoolItem {
  public descriptor: string;
  public methodType: JVMTypes.java_lang_invoke_MethodType = null;
  constructor(descriptor: string) {
    this.descriptor = descriptor;
  }

  public resolve(thread: JVMThread, cl: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void) {
    util.createMethodType(thread, cl, this.descriptor, (e: JVMTypes.java_lang_Throwable, type: JVMTypes.java_lang_invoke_MethodType) => {
      if (e) {
        thread.throwException(e);
        cb(false);
      } else {
        this.methodType = type;
        cb(true);
      }
    });
  }

  public getConstant(thread: JVMThread) { return this.methodType; }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.METHOD_TYPE;
  }

  public isResolved() { return this.methodType !== null; }

  public static size: number = 1;
  public static infoByteSize: number = 2;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var descriptorIndex = byteStream.getUint16(),
      utf8Info = <ConstUTF8> constantPool.get(descriptorIndex);
    assert(utf8Info.getType() === ConstantPoolItemType.UTF8,
      'ConstantPool MethodType type != UTF8');
    return new this(utf8Info.value);
  }
}
CP_CLASSES[ConstantPoolItemType.METHOD_TYPE] = MethodType;

/**
 * Represents a module name in Java 9+ class files.
 * ```
 * CONSTANT_Module_info {
 *   u1 tag;
 *   u2 name_index;
 * }
 * ```
 */
export class ModuleReference implements IConstantPoolItem {
  public name: string;
  constructor(name: string) {
    this.name = name;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.MODULE;
  }

  public isResolved() { return true; }

  public static size: number = 1;
  public static infoByteSize: number = 2;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var nameIndex = byteStream.getUint16(),
      utf8Info = <ConstUTF8> constantPool.get(nameIndex);
    assert(utf8Info.getType() === ConstantPoolItemType.UTF8,
      'ConstantPool ModuleReference type != UTF8');
    return new this(utf8Info.value);
  }
}
CP_CLASSES[ConstantPoolItemType.MODULE] = ModuleReference;

/**
 * Represents a package name in Java 9+ class files.
 * ```
 * CONSTANT_Package_info {
 *   u1 tag;
 *   u2 name_index;
 * }
 * ```
 */
export class PackageReference implements IConstantPoolItem {
  public name: string;
  constructor(name: string) {
    this.name = name;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.PACKAGE;
  }

  public isResolved() { return true; }

  public static size: number = 1;
  public static infoByteSize: number = 2;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var nameIndex = byteStream.getUint16(),
      utf8Info = <ConstUTF8> constantPool.get(nameIndex);
    assert(utf8Info.getType() === ConstantPoolItemType.UTF8,
      'ConstantPool PackageReference type != UTF8');
    return new this(utf8Info.value);
  }
}
CP_CLASSES[ConstantPoolItemType.PACKAGE] = PackageReference;

// #endregion

// #region Tier 2

/**
 * Represents a particular method.
 * ```
 * CONSTANT_Methodref_info {
 *   u1 tag;
 *   u2 class_index;
 *   u2 name_and_type_index;
 * }
 * ```
 */
export class MethodReference implements IConstantPoolItem {
  public classInfo: ClassReference;
  public nameAndTypeInfo: NameAndTypeInfo;
  public method: Method = null;
  /**
   * The signature of the method, without the owning class.
   * e.g. foo(IJ)V
   */
  public signature: string;
  /**
   * The signature of the method, including the owning class.
   * e.g. bar/Baz/foo(IJ)V
   */
  public fullSignature: string = null;
  public paramWordSize: number = -1;
  /**
   * Contains a reference to the MemberName object for the method that invokes
   * the desired function.
   */
  public memberName: JVMTypes.java_lang_invoke_MemberName = null;
  /**
   * Contains an object that needs to be pushed onto the stack before invoking
   * memberName.
   */
  public appendix: JVMTypes.java_lang_Object = null;
  /**
   * The JavaScript constructor for the class that the method belongs to.
   */
  public jsConstructor: any = null;

  constructor(classInfo: ClassReference, nameAndTypeInfo: NameAndTypeInfo) {
    this.classInfo = classInfo;
    this.nameAndTypeInfo = nameAndTypeInfo;
    this.signature = this.nameAndTypeInfo.name + this.nameAndTypeInfo.descriptor;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.METHODREF;
  }

  /**
   * Checks the method referenced by this constant pool item in the specified
   * bytecode context.
   * Returns null if an error occurs.
   * - Throws a NoSuchFieldError if missing.
   * - Throws an IllegalAccessError if field is inaccessible.
   * - Throws an IncompatibleClassChangeError if the field is an incorrect type
   *   for the field access.
   */
  public hasAccess(thread: JVMThread, frame: BytecodeStackFrame, isStatic: boolean): boolean {
    var method = this.method, accessingCls = frame.method.cls;
    if (method.accessFlags.isStatic() !== isStatic) {
      thread.throwNewException('Ljava/lang/IncompatibleClassChangeError;', `Method ${method.name} from class ${method.cls.getExternalName()} is ${isStatic ? 'not ' : ''}static.`);
      frame.returnToThreadLoop = true;
      return false;
    } else if (!util.checkAccess(accessingCls, method.cls, method.accessFlags)) {
      thread.throwNewException('Ljava/lang/IllegalAccessError;', `${accessingCls.getExternalName()} cannot access ${method.cls.getExternalName()}.${method.name}`);
      frame.returnToThreadLoop = true;
      return false;
    }
    return true;
  }

  private resolveMemberName(method: Method, thread: JVMThread, cl: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void): void {
    var memberHandleNatives = <typeof JVMTypes.java_lang_invoke_MethodHandleNatives>  (<ReferenceClassData<JVMTypes.java_lang_invoke_MethodHandleNatives>> thread.getBsCl().getInitializedClass(thread, 'Ljava/lang/invoke/MethodHandleNatives;')).getConstructor(thread),
      appendix = new ((<ArrayClassData<JVMTypes.java_lang_Object>> thread.getBsCl().getInitializedClass(thread, '[Ljava/lang/Object;')).getConstructor(thread))(thread, 1);

    util.createMethodType(thread, cl, this.nameAndTypeInfo.descriptor, (e: JVMTypes.java_lang_Throwable, type: JVMTypes.java_lang_invoke_MethodType) => {
      if (e) {
        thread.throwException(e);
        cb(false);
      } else {
        /* MemberName linkMethod( int refKind, Class<?> defc,
           String name, Object type,
           Object[] appendixResult) */
        memberHandleNatives['java/lang/invoke/MethodHandleNatives/linkMethod(Ljava/lang/Class;ILjava/lang/Class;Ljava/lang/String;Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/invoke/MemberName;'](
          thread,
          // Class callerClass
          [caller.getClassObject(thread),
          // int refKind
           MethodHandleReferenceKind.INVOKEVIRTUAL,
          // Class defc
           this.classInfo.cls.getClassObject(thread),
          // String name
           thread.getJVM().internString(this.nameAndTypeInfo.name),
          // Object type, Object[] appendixResult
           type, appendix],
        (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_invoke_MemberName) => {
          if (e !== null) {
            thread.throwException(e);
            cb(false);
          } else {
            this.appendix = appendix.array[0];
            this.memberName = rv;
            cb(true);
          }
        });
      }
    });
  }

  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void, explicit: boolean = true) {
    if (!this.classInfo.isResolved()) {
      this.classInfo.resolve(thread, loader, caller, (status: boolean) => {
        if (!status) {
          cb(false);
        } else {
          this.resolve(thread, loader, caller, cb, explicit);
        }
      }, explicit);
    } else {
      var cls = this.classInfo.cls,
        method = cls.methodLookup(this.signature);
      if (method === null || (cls.getInternalName() === 'Ljava/lang/StackTraceElement;' &&
          (this.signature === 'toString()Ljava/lang/String;' ||
           this.signature === 'equals(Ljava/lang/Object;)Z' ||
           this.signature === 'hashCode()I')) ||
	          (cls.getInternalName() === 'Ljava/nio/file/FileSystems;' &&
	          (this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;' ||
	           this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;')) ||
	          (cls.getInternalName() === 'Ljava/util/Scanner;' &&
	          (this.signature === '<init>(Ljava/io/InputStream;Ljava/nio/charset/Charset;)V' ||
	           this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
	           this.signature === '<init>(Ljava/nio/file/Path;Ljava/nio/charset/Charset;)V' ||
	           this.signature === '<init>(Ljava/nio/channels/ReadableByteChannel;Ljava/nio/charset/Charset;)V'))) {
        var syntheticCls = <ReferenceClassData<JVMTypes.java_lang_Object>> cls,
          syntheticAccessFlags = new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.STATIC | util.FlagMasks.NATIVE),
          syntheticFullSignature = util.descriptor2typestr(cls.getInternalName()) + '/' + this.signature,
          syntheticMethod: any,
          syntheticBulkBufferInfo = (<{[name: string]: string[]}> {
            'Ljava/nio/ByteBuffer;': ['[B', 'B'],
            'Ljava/nio/CharBuffer;': ['[C', 'C'],
            'Ljava/nio/ShortBuffer;': ['[S', 'S'],
            'Ljava/nio/IntBuffer;': ['[I', 'I'],
            'Ljava/nio/LongBuffer;': ['[J', 'J'],
            'Ljava/nio/FloatBuffer;': ['[F', 'F'],
            'Ljava/nio/DoubleBuffer;': ['[D', 'D']
          })[syntheticCls.getInternalName()],
          syntheticBufferCovariantReturn = syntheticBulkBufferInfo !== undefined &&
            (this.signature === 'position(I)' + syntheticCls.getInternalName() ||
             this.signature === 'limit(I)' + syntheticCls.getInternalName() ||
             this.signature === 'mark()' + syntheticCls.getInternalName() ||
             this.signature === 'reset()' + syntheticCls.getInternalName() ||
             this.signature === 'clear()' + syntheticCls.getInternalName() ||
             this.signature === 'flip()' + syntheticCls.getInternalName() ||
             this.signature === 'rewind()' + syntheticCls.getInternalName());
        if (syntheticCls.getInternalName() === 'Ljava/lang/Thread;' && this.signature === 'threadId()J') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.FINAL | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'J',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): gLong {
                var tid = (<any> javaThis)['java/lang/Thread/tid'];
                return tid !== null && tid !== undefined ? tid : gLong.fromNumber(javaThis.$thread.getRef());
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/ClassLoader;' &&
            this.signature === 'getPlatformClassLoader()Ljava/lang/ClassLoader;') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'Ljava/lang/ClassLoader;',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread): JVMTypes.java_lang_ClassLoader {
                var systemLoader = thread.getJVM().getSystemClassLoader(),
                  systemObj = systemLoader === null ? null : systemLoader.getLoaderObject(),
                  platformObj = systemObj === null ? null : (<any> systemObj)['java/lang/ClassLoader/parent'],
                  classLoaderCons: any;
                if (platformObj !== null && platformObj !== undefined) {
                  (<any> platformObj)['java/lang/ClassLoader/doppioPlatform'] = true;
                  return platformObj;
                }
                classLoaderCons = syntheticCls.getConstructor(thread);
                platformObj = (<any> classLoaderCons).$doppioPlatformClassLoader;
                if (platformObj === null || platformObj === undefined) {
                  platformObj = new classLoaderCons(thread);
                  (<any> platformObj)['java/lang/ClassLoader/parent'] = null;
                  (<any> platformObj)['java/lang/ClassLoader/doppioPlatform'] = true;
                  (<any> classLoaderCons).$doppioPlatformClassLoader = platformObj;
                }
                return platformObj;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/ClassLoader;')) &&
            this.signature === 'getUnnamedModule()Ljava/lang/Module;') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.FINAL | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'Ljava/lang/Module;',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread].concat(params);
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader): any {
                thread.setStatus(ThreadStatus.ASYNC_WAITING);
                util.getClassLoaderUnnamedModule(thread, javaThis, (module: JVMTypes.java_lang_Object) => {
                  thread.asyncReturn(module);
                });
                return null;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/ClassLoader;')) &&
            this.signature === 'getName()Ljava/lang/String;') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'Ljava/lang/String;',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread].concat(params);
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader): JVMTypes.java_lang_String {
                var systemLoader = thread.getJVM().getSystemClassLoader(),
                  systemObj = systemLoader === null ? null : systemLoader.getLoaderObject(),
                  platformObj = systemObj === null ? null : (<any> systemObj)['java/lang/ClassLoader/parent'],
                  name: string = null;
                if ((<any> javaThis)['java/lang/ClassLoader/doppioPlatform'] === true || javaThis === platformObj) {
                  name = 'platform';
                } else if (javaThis === systemObj) {
                  name = 'app';
                }
                return name === null ? null : util.initString(thread.getBsCl(), name);
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/ClassLoader;')) &&
            this.signature === 'isRegisteredAsParallelCapable()Z') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.FINAL | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'Z',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread].concat(params);
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader): number {
                var systemLoader = thread.getJVM().getSystemClassLoader(),
                  systemObj = systemLoader === null ? null : systemLoader.getLoaderObject(),
                  platformObj = systemObj === null ? null : (<any> systemObj)['java/lang/ClassLoader/parent'];
                if ((<any> javaThis)['java/lang/ClassLoader/doppioPlatform'] === true ||
                    javaThis === systemObj ||
                    javaThis === platformObj) {
                  return 1;
                }
                return (<any> javaThis)['java/lang/ClassLoader/parallelLockMap'] === null ||
                  (<any> javaThis)['java/lang/ClassLoader/parallelLockMap'] === undefined ? 0 : 1;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/ClassLoader;')) &&
            (this.signature === 'getDefinedPackage(Ljava/lang/String;)Ljava/lang/Package;' ||
             this.signature === 'getDefinedPackages()[Ljava/lang/Package;')) {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.FINAL | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: this.signature === 'getDefinedPackage(Ljava/lang/String;)Ljava/lang/Package;' ? ['Ljava/lang/String;'] : [],
            returnType: this.signature === 'getDefinedPackage(Ljava/lang/String;)Ljava/lang/Package;' ? 'Ljava/lang/Package;' : '[Ljava/lang/Package;',
            getParamWordSize: function(): number {
              return this.parameterTypes.length;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread].concat(params);
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, name?: JVMTypes.java_lang_String): any {
                var classLoaderPackageSignature = syntheticMethod.signature,
                  entries = util.getClassLoaderDefinedPackageEntries(javaThis),
                  values: JVMTypes.java_lang_Package[] = [],
                  i: number;
                if (classLoaderPackageSignature === 'getDefinedPackage(Ljava/lang/String;)Ljava/lang/Package;' && name === null) {
                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
                  return null;
                }
                for (i = 0; i < entries.length; i++) {
                  if (classLoaderPackageSignature === 'getDefinedPackage(Ljava/lang/String;)Ljava/lang/Package;' &&
                      entries[i].name === name.toString()) {
                    return entries[i].pkg;
                  } else if (classLoaderPackageSignature === 'getDefinedPackages()[Ljava/lang/Package;') {
                    values.push(entries[i].pkg);
                  }
                }
                return classLoaderPackageSignature === 'getDefinedPackages()[Ljava/lang/Package;' ?
                  util.newArrayFromData<JVMTypes.java_lang_Package>(thread, thread.getBsCl(), '[Ljava/lang/Package;', values) :
                  null;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/ClassLoader;')) &&
            this.signature === 'resources(Ljava/lang/String;)Ljava/util/stream/Stream;') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: ['Ljava/lang/String;'],
            returnType: 'Ljava/util/stream/Stream;',
            getParamWordSize: function(): number {
              return 1;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread].concat(params);
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, name: JVMTypes.java_lang_String): any {
                thread.setStatus(ThreadStatus.ASYNC_WAITING);
                thread.getBsCl().initializeClass(thread, 'Ljava/lang/ClassLoader$DoppioResources;', (resourcesCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                  if (resourcesCls === null) {
                    return;
                  }
                  var resourcesCons = <any> resourcesCls.getConstructor(thread);
                  resourcesCons['java/lang/ClassLoader$DoppioResources/stream(Ljava/lang/ClassLoader;Ljava/lang/String;)Ljava/util/stream/Stream;'](thread, [javaThis, name], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
                    if (e) {
                      thread.throwException(e);
                    } else {
                      thread.asyncReturn(rv);
                    }
                  });
                });
                return null;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Thread;' && this.signature === 'isVirtual()Z') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.FINAL | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'Z',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): number {
                return 0;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Thread;' && this.signature === 'sleep(Ljava/time/Duration;)V') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: ['Ljava/time/Duration;'],
            returnType: 'V',
            getParamWordSize: function(): number {
              return 1;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, duration: JVMTypes.java_lang_Object): void {
                if (duration === null) {
                  thread.throwNewException('Ljava/lang/NullPointerException;', 'duration');
                  return;
                }
                var seconds = <gLong> (<any> duration)['java/time/Duration/seconds'],
                  nanos = <number> (<any> duration)['java/time/Duration/nanos'],
                  beforeMethod: Method,
                  millis: number;
                if (seconds.isNegative() || (seconds.isZero() && nanos === 0)) {
                  return;
                }
                millis = (seconds.toNumber() * 1000) + Math.floor(nanos / 1000000);
                if (nanos % 1000000 !== 0) {
                  millis++;
                }
                beforeMethod = thread.currentMethod();
                thread.setStatus(ThreadStatus.ASYNC_WAITING);
                setTimeout(() => {
                  if (beforeMethod === thread.currentMethod()) {
                    thread.setStatus(ThreadStatus.RUNNABLE);
                    thread.asyncReturn();
                  }
                }, millis);
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Thread;' && this.signature === 'onSpinWait()V') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'V',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread): void { };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/ref/Reference;' &&
            this.signature === 'reachabilityFence(Ljava/lang/Object;)V') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: ['Ljava/lang/Object;'],
            returnType: 'V',
            getParamWordSize: function(): number {
              return 1;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, ref: JVMTypes.java_lang_Object): void { };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if ((syntheticCls.getInternalName() === 'Ljava/lang/Math;' ||
            syntheticCls.getInternalName() === 'Ljava/lang/StrictMath;') &&
            (this.signature === 'multiplyFull(II)J' ||
             this.signature === 'multiplyHigh(JJ)J' ||
             this.signature === 'unsignedMultiplyHigh(JJ)J')) {
          var mathMultiplySignature = this.signature;
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: mathMultiplySignature === 'multiplyFull(II)J' ? ['I', 'I'] : ['J', 'J'],
            returnType: 'J',
            getParamWordSize: function(): number {
              return mathMultiplySignature === 'multiplyFull(II)J' ? 2 : 4;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return mathMultiplySignature === 'multiplyFull(II)J' ?
                [thread, params[0], params[1]] : [thread, params[0], params[2]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, left: any, right: any): gLong {
                if (mathMultiplySignature === 'multiplyFull(II)J') {
                  return gLong.fromInt(left).multiply(gLong.fromInt(right));
                }
                var leftLow = (<gLong> left).getLowBits(),
                  leftHigh = (<gLong> left).getHighBits(),
                  rightLow = (<gLong> right).getLowBits(),
                  rightHigh = (<gLong> right).getHighBits(),
                  leftParts = [leftLow & 0xffff, leftLow >>> 16, leftHigh & 0xffff, leftHigh >>> 16],
                  rightParts = [rightLow & 0xffff, rightLow >>> 16, rightHigh & 0xffff, rightHigh >>> 16],
                  resultParts = [0, 0, 0, 0, 0, 0, 0, 0],
                  highProduct: gLong,
                  i: number,
                  j: number;
                for (i = 0; i < 4; i++) {
                  var carry = 0;
                  for (j = 0; j < 4; j++) {
                    var resultIndex = i + j,
                      product = leftParts[i] * rightParts[j] + resultParts[resultIndex] + carry;
                    resultParts[resultIndex] = product & 0xffff;
                    carry = product >>> 16;
                  }
                  resultParts[i + 4] += carry;
                }
                highProduct = gLong.fromBits(
                  (resultParts[4] | (resultParts[5] << 16)) | 0,
                  (resultParts[6] | (resultParts[7] << 16)) | 0);
                if (mathMultiplySignature === 'unsignedMultiplyHigh(JJ)J') {
                  return highProduct;
                }
                if ((<gLong> left).isNegative()) {
                  highProduct = highProduct.subtract(<gLong> right);
                }
                if ((<gLong> right).isNegative()) {
                  highProduct = highProduct.subtract(<gLong> left);
                }
                return highProduct;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if ((syntheticCls.getInternalName() === 'Ljava/lang/Math;' ||
            syntheticCls.getInternalName() === 'Ljava/lang/StrictMath;') &&
            (this.signature === 'floorDiv(JI)J' ||
             this.signature === 'floorMod(JI)I')) {
          var mathFloorSignature = this.signature;
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: ['J', 'I'],
            returnType: mathFloorSignature === 'floorDiv(JI)J' ? 'J' : 'I',
            getParamWordSize: function(): number {
              return 3;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0], params[2]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, left: gLong, right: number): any {
                if (right === 0) {
                  thread.throwNewException('Ljava/lang/ArithmeticException;', '/ by zero');
                  return;
                }
                var divisor = gLong.fromInt(right),
                  quotient = left.div(divisor),
                  remainder = left.subtract(quotient.multiply(divisor));
                if (!remainder.isZero() && left.isNegative() !== divisor.isNegative()) {
                  quotient = quotient.subtract(gLong.ONE);
                  remainder = left.subtract(quotient.multiply(divisor));
                }
                return mathFloorSignature === 'floorDiv(JI)J' ? quotient : remainder.toInt();
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if ((syntheticCls.getInternalName() === 'Ljava/lang/Math;' ||
            syntheticCls.getInternalName() === 'Ljava/lang/StrictMath;') &&
            (this.signature === 'absExact(I)I' ||
             this.signature === 'absExact(J)J')) {
          var mathAbsExactSignature = this.signature;
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: mathAbsExactSignature === 'absExact(I)I' ? ['I'] : ['J'],
            returnType: mathAbsExactSignature === 'absExact(I)I' ? 'I' : 'J',
            getParamWordSize: function(): number {
              return mathAbsExactSignature === 'absExact(I)I' ? 1 : 2;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, value: any): any {
                if (mathAbsExactSignature === 'absExact(I)I') {
                  if (value === -2147483648) {
                    thread.throwNewException('Ljava/lang/ArithmeticException;', 'Overflow to represent absolute value of Integer.MIN_VALUE');
                    return;
                  }
                  return Math.abs(value);
                }
                if ((<gLong> value).equals(gLong.MIN_VALUE)) {
                  thread.throwNewException('Ljava/lang/ArithmeticException;', 'Overflow to represent absolute value of Long.MIN_VALUE');
                  return;
                }
                return (<gLong> value).isNegative() ? (<gLong> value).negate() : value;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Character;' &&
            this.signature === 'toString(I)Ljava/lang/String;') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: ['I'],
            returnType: 'Ljava/lang/String;',
            getParamWordSize: function(): number {
              return 1;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              return function(thread: JVMThread, codePoint: number): JVMTypes.java_lang_String {
                if (codePoint < 0 || codePoint > 0x10ffff) {
                  thread.throwNewException('Ljava/lang/IllegalArgumentException;', '');
                  return null;
                }
                if (codePoint <= 0xffff) {
                  return util.initString(thread.getBsCl(), String.fromCharCode(codePoint));
                }
                codePoint -= 0x10000;
                return util.initString(thread.getBsCl(), String.fromCharCode(
                  0xd800 + (codePoint >> 10),
                  0xdc00 + (codePoint & 0x3ff)
                ));
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/StackTraceElement;' &&
            (this.signature === '<init>(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V' ||
             this.signature === 'getClassLoaderName()Ljava/lang/String;' ||
             this.signature === 'getModuleName()Ljava/lang/String;' ||
             this.signature === 'getModuleVersion()Ljava/lang/String;' ||
             this.signature === 'toString()Ljava/lang/String;' ||
             this.signature === 'equals(Ljava/lang/Object;)Z' ||
             this.signature === 'hashCode()I')) {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: this.signature === '<init>(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V' ?
              ['Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'I'] :
              this.signature === 'equals(Ljava/lang/Object;)Z' ? ['Ljava/lang/Object;'] : [],
            returnType: this.signature === '<init>(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V' ? 'V' :
              this.signature === 'equals(Ljava/lang/Object;)Z' ? 'Z' :
              this.signature === 'hashCode()I' ? 'I' :
              'Ljava/lang/String;',
            getParamWordSize: function(): number {
              return this.parameterTypes.length;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread].concat(params);
            },
            getNativeFunction: function(): Function {
              var stackTraceElementSignature = this.signature;
              function stackTraceField(obj: JVMTypes.java_lang_Object, name: string): any {
                var value = (<any> obj)[name];
                return value === undefined ? null : value;
              }
              function stackTraceString(value: any): string {
                return value === null ? null : value.toString();
              }
              function stackTraceEqualString(left: any, right: any): boolean {
                if (left === null || right === null) {
                  return left === right;
                }
                return left.toString() === right.toString();
              }
              function stackTraceStringHash(value: any): number {
                if (value === null) {
                  return 0;
                }
                var text = value.toString(),
                  hash = 0;
                for (var i = 0; i < text.length; i++) {
                  hash = ((31 * hash) + text.charCodeAt(i)) | 0;
                }
                return hash;
              }
              function stackTraceHash(obj: JVMTypes.java_lang_Object): number {
                var hash = stackTraceStringHash(stackTraceField(obj, 'java/lang/StackTraceElement/classLoaderName'));
                hash = ((31 * hash) + stackTraceStringHash(stackTraceField(obj, 'java/lang/StackTraceElement/moduleName'))) | 0;
                hash = ((31 * hash) + stackTraceStringHash(stackTraceField(obj, 'java/lang/StackTraceElement/moduleVersion'))) | 0;
                hash = ((31 * hash) + stackTraceStringHash(stackTraceField(obj, 'java/lang/StackTraceElement/declaringClass'))) | 0;
                hash = ((31 * hash) + stackTraceStringHash(stackTraceField(obj, 'java/lang/StackTraceElement/methodName'))) | 0;
                hash = ((31 * hash) + stackTraceStringHash(stackTraceField(obj, 'java/lang/StackTraceElement/fileName'))) | 0;
                hash = ((31 * hash) + ((<any> obj)['java/lang/StackTraceElement/lineNumber'] | 0)) | 0;
                return hash;
              }
              function stackTraceEquals(left: JVMTypes.java_lang_Object, right: JVMTypes.java_lang_Object): boolean {
                return stackTraceEqualString(stackTraceField(left, 'java/lang/StackTraceElement/classLoaderName'), stackTraceField(right, 'java/lang/StackTraceElement/classLoaderName')) &&
                  stackTraceEqualString(stackTraceField(left, 'java/lang/StackTraceElement/moduleName'), stackTraceField(right, 'java/lang/StackTraceElement/moduleName')) &&
                  stackTraceEqualString(stackTraceField(left, 'java/lang/StackTraceElement/moduleVersion'), stackTraceField(right, 'java/lang/StackTraceElement/moduleVersion')) &&
                  stackTraceEqualString(stackTraceField(left, 'java/lang/StackTraceElement/declaringClass'), stackTraceField(right, 'java/lang/StackTraceElement/declaringClass')) &&
                  stackTraceEqualString(stackTraceField(left, 'java/lang/StackTraceElement/methodName'), stackTraceField(right, 'java/lang/StackTraceElement/methodName')) &&
                  stackTraceEqualString(stackTraceField(left, 'java/lang/StackTraceElement/fileName'), stackTraceField(right, 'java/lang/StackTraceElement/fileName')) &&
                  (<any> left)['java/lang/StackTraceElement/lineNumber'] === (<any> right)['java/lang/StackTraceElement/lineNumber'];
              }
              function stackTraceToText(obj: JVMTypes.java_lang_Object): string {
                var classLoaderName = stackTraceString(stackTraceField(obj, 'java/lang/StackTraceElement/classLoaderName')),
                  moduleName = stackTraceString(stackTraceField(obj, 'java/lang/StackTraceElement/moduleName')),
                  moduleVersion = stackTraceString(stackTraceField(obj, 'java/lang/StackTraceElement/moduleVersion')),
                  declaringClass = stackTraceString(stackTraceField(obj, 'java/lang/StackTraceElement/declaringClass')),
                  methodName = stackTraceString(stackTraceField(obj, 'java/lang/StackTraceElement/methodName')),
                  fileName = stackTraceString(stackTraceField(obj, 'java/lang/StackTraceElement/fileName')),
                  lineNumber = (<any> obj)['java/lang/StackTraceElement/lineNumber'],
                  prefix = '';
                if (classLoaderName !== null) {
                  prefix += classLoaderName + '/';
                }
                if (moduleName !== null) {
                  prefix += moduleName;
                  if (moduleVersion !== null) {
                    prefix += '@' + moduleVersion;
                  }
                  prefix += '/';
                }
                var source = 'Unknown Source';
                if (lineNumber === -2) {
                  source = 'Native Method';
                } else if (fileName !== null) {
                  source = lineNumber >= 0 ? fileName + ':' + lineNumber : fileName;
                }
                return prefix + declaringClass + '.' + methodName + '(' + source + ')';
              }
              return function(thread: JVMThread,
                  javaThis: JVMTypes.java_lang_Object,
                  classLoaderName?: JVMTypes.java_lang_String,
                  moduleName?: JVMTypes.java_lang_String,
                  moduleVersion?: JVMTypes.java_lang_String,
                  declaringClass?: JVMTypes.java_lang_String,
                  methodName?: JVMTypes.java_lang_String,
                  fileName?: JVMTypes.java_lang_String,
                  lineNumber?: number): any {
                if (stackTraceElementSignature === '<init>(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V') {
                  (<any> javaThis)['java/lang/StackTraceElement/classLoaderName'] = classLoaderName;
                  (<any> javaThis)['java/lang/StackTraceElement/moduleName'] = moduleName;
                  (<any> javaThis)['java/lang/StackTraceElement/moduleVersion'] = moduleVersion;
                  (<any> javaThis)['java/lang/StackTraceElement/declaringClass'] = declaringClass;
                  (<any> javaThis)['java/lang/StackTraceElement/methodName'] = methodName;
                  (<any> javaThis)['java/lang/StackTraceElement/fileName'] = fileName;
                  (<any> javaThis)['java/lang/StackTraceElement/lineNumber'] = lineNumber;
                  return;
                }
                if (stackTraceElementSignature === 'toString()Ljava/lang/String;') {
                  return util.initString(thread.getBsCl(), stackTraceToText(javaThis));
                }
                if (stackTraceElementSignature === 'equals(Ljava/lang/Object;)Z') {
                  var other = <JVMTypes.java_lang_Object> <any> classLoaderName;
                  return other !== null && typeof (<any> other).getClass === 'function' &&
                    (<any> other).getClass().isCastable(syntheticCls) && stackTraceEquals(javaThis, other) ? 1 : 0;
                }
                if (stackTraceElementSignature === 'hashCode()I') {
                  return stackTraceHash(javaThis);
                }
                var fieldName = stackTraceElementSignature === 'getClassLoaderName()Ljava/lang/String;' ? 'java/lang/StackTraceElement/classLoaderName' :
                  stackTraceElementSignature === 'getModuleName()Ljava/lang/String;' ? 'java/lang/StackTraceElement/moduleName' :
                  'java/lang/StackTraceElement/moduleVersion',
                  value = (<any> javaThis)[fieldName];
                return value === undefined ? null : value;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Runtime;' && this.signature === 'version()Ljava/lang/Runtime$Version;') {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: [],
            returnType: 'Ljava/lang/Runtime$Version;',
            getParamWordSize: function(): number {
              return 0;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return [thread];
            },
            getNativeFunction: function(): Function {
              var versionMethod = this;
              return function(thread: JVMThread): JVMTypes.java_lang_Object {
                var runtimeCons = versionMethod.cls.getConstructor(thread),
                  cachedVersion = runtimeCons['doppio/runtimeVersion'];
                if (cachedVersion !== undefined) {
                  return cachedVersion;
                }
                thread.setStatus(ThreadStatus.ASYNC_WAITING);
                thread.getBsCl().initializeClass(thread, 'Ljava/lang/Runtime$Version;', (versionCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                  if (versionCls === null) {
                    return;
                  }
                  var versionCons = <any> versionCls.getConstructor(thread),
                    parse = versionCons['java/lang/Runtime$Version/parse(Ljava/lang/String;)Ljava/lang/Runtime$Version;'];
                  parse(thread, [util.initString(thread.getBsCl(), '17')], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
                    if (e) {
                      thread.throwException(e);
                    } else {
                      runtimeCons['doppio/runtimeVersion'] = rv;
                      thread.asyncReturn(rv);
                    }
                  });
                });
                return null;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/System;' &&
	            (this.signature === 'getLogger(Ljava/lang/String;)Ljava/lang/System$Logger;' ||
	             this.signature === 'getLogger(Ljava/lang/String;Ljava/util/ResourceBundle;)Ljava/lang/System$Logger;')) {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: syntheticAccessFlags,
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: this.signature === 'getLogger(Ljava/lang/String;)Ljava/lang/System$Logger;' ?
              ['Ljava/lang/String;'] : ['Ljava/lang/String;', 'Ljava/util/ResourceBundle;'],
            returnType: 'Ljava/lang/System$Logger;',
            getParamWordSize: function(): number {
              return this.parameterTypes.length;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return params.length > 1 ? [thread, params[0], params[1]] : [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              var systemSignature = this.signature;
              return function(thread: JVMThread, name: JVMTypes.java_lang_String, bundle?: JVMTypes.java_lang_Object): any {
                if (name === null || (systemSignature === 'getLogger(Ljava/lang/String;Ljava/util/ResourceBundle;)Ljava/lang/System$Logger;' && bundle === null)) {
                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
                  return null;
                }
                thread.setStatus(ThreadStatus.ASYNC_WAITING);
                thread.getBsCl().initializeClass(thread, 'Ljava/lang/System$DoppioLogger;', (loggerCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                  if (loggerCls === null) {
                    return;
                  }
                  var logger = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, loggerCls);
                  (<any> logger)['<init>(Ljava/lang/String;)V'](thread, [name], (e?: JVMTypes.java_lang_Throwable) => {
                    if (e) {
                      thread.throwException(e);
                    } else {
                      thread.asyncReturn(logger);
                    }
                  });
                });
                return null;
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/concurrent/CompletableFuture;' &&
		            (this.signature === 'completedStage(Ljava/lang/Object;)Ljava/util/concurrent/CompletionStage;' ||
		             this.signature === 'delayedExecutor(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/Executor;' ||
		             this.signature === 'delayedExecutor(JLjava/util/concurrent/TimeUnit;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/Executor;' ||
		             this.signature === 'failedFuture(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'failedStage(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletionStage;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: syntheticAccessFlags,
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'delayedExecutor(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/Executor;' ?
		              ['J', 'Ljava/util/concurrent/TimeUnit;'] :
		              this.signature === 'delayedExecutor(JLjava/util/concurrent/TimeUnit;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/Executor;' ?
		                ['J', 'Ljava/util/concurrent/TimeUnit;', 'Ljava/util/concurrent/Executor;'] :
		                [this.signature === 'completedStage(Ljava/lang/Object;)Ljava/util/concurrent/CompletionStage;' ? 'Ljava/lang/Object;' : 'Ljava/lang/Throwable;'],
		            returnType: this.signature === 'failedFuture(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletableFuture;' ?
		              'Ljava/util/concurrent/CompletableFuture;' :
		              this.signature.indexOf('delayedExecutor(') === 0 ?
		                'Ljava/util/concurrent/Executor;' : 'Ljava/util/concurrent/CompletionStage;',
		            getParamWordSize: function(): number {
		              return util.getMethodDescriptorWordSize(this.rawDescriptor);
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var completableFutureSignature = this.signature;
		              return function(thread: JVMThread, arg1: any, arg2?: any, arg3?: JVMTypes.java_lang_Object, arg4?: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/util/concurrent/CompletableFuture$DoppioFactories;', (factoriesCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (factoriesCls === null) {
		                    return;
		                  }
		                  var factoriesCons = <any> factoriesCls.getConstructor(thread),
		                    helperArgs: any[],
		                    helperSignature: string;
		                  if (completableFutureSignature === 'completedStage(Ljava/lang/Object;)Ljava/util/concurrent/CompletionStage;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/completedStage(Ljava/lang/Object;)Ljava/util/concurrent/CompletionStage;';
		                    helperArgs = [arg1];
		                  } else if (completableFutureSignature === 'delayedExecutor(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/Executor;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/delayedExecutor(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/Executor;';
		                    helperArgs = [arg1, null, arg3 !== undefined ? arg3 : arg2];
		                  } else if (completableFutureSignature === 'delayedExecutor(JLjava/util/concurrent/TimeUnit;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/Executor;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/delayedExecutor(JLjava/util/concurrent/TimeUnit;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/Executor;';
		                    helperArgs = [arg1, null, arg3 !== undefined ? arg3 : arg2, arg3 !== undefined ? arg4 : arg3];
		                  } else if (completableFutureSignature === 'failedFuture(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/failedFuture(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs = [arg1];
		                  } else {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/failedStage(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletionStage;';
		                    helperArgs = [arg1];
		                  }
		                  factoriesCons[helperSignature](thread, helperArgs, (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(rv);
		                    }
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/concurrent/CompletableFuture;' &&
		            (this.signature === 'completeAsync(Ljava/util/function/Supplier;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'completeAsync(Ljava/util/function/Supplier;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'completeOnTimeout(Ljava/lang/Object;JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'copy()Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'defaultExecutor()Ljava/util/concurrent/Executor;' ||
		             this.signature === 'minimalCompletionStage()Ljava/util/concurrent/CompletionStage;' ||
		             this.signature === 'newIncompleteFuture()Ljava/util/concurrent/CompletableFuture;' ||
		             this.signature === 'orTimeout(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'completeAsync(Ljava/util/function/Supplier;)Ljava/util/concurrent/CompletableFuture;' ?
		              ['Ljava/util/function/Supplier;'] :
		              this.signature === 'completeAsync(Ljava/util/function/Supplier;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ?
		                ['Ljava/util/function/Supplier;', 'Ljava/util/concurrent/Executor;'] :
		                this.signature === 'completeOnTimeout(Ljava/lang/Object;JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;' ?
		                  ['Ljava/lang/Object;', 'J', 'Ljava/util/concurrent/TimeUnit;'] :
		                (this.signature === 'exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
		                 this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;') ?
		                  ['Ljava/util/function/Function;', 'Ljava/util/concurrent/Executor;'] :
		                  (this.signature === 'exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
		                   this.signature === 'exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
		                   this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;') ?
		                    ['Ljava/util/function/Function;'] :
		                    this.signature === 'orTimeout(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;' ?
		                      ['J', 'Ljava/util/concurrent/TimeUnit;'] : [],
		            returnType: this.signature === 'minimalCompletionStage()Ljava/util/concurrent/CompletionStage;' ?
		              'Ljava/util/concurrent/CompletionStage;' :
		              this.signature === 'defaultExecutor()Ljava/util/concurrent/Executor;' ?
		                'Ljava/util/concurrent/Executor;' : 'Ljava/util/concurrent/CompletableFuture;',
		            getParamWordSize: function(): number {
		              return util.getMethodDescriptorWordSize(this.rawDescriptor);
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var completableFutureSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, arg1?: JVMTypes.java_lang_Object, arg2?: any, arg3?: any, arg4?: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/util/concurrent/CompletableFuture$DoppioFactories;', (factoriesCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (factoriesCls === null) {
		                    return;
		                  }
		                  var factoriesCons = <any> factoriesCls.getConstructor(thread),
		                    helperArgs = [javaThis],
		                    helperSignature: string;
		                  if (completableFutureSignature === 'completeAsync(Ljava/util/function/Supplier;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/completeAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Supplier;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1);
		                  } else if (completableFutureSignature === 'completeAsync(Ljava/util/function/Supplier;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/completeAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Supplier;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1, arg2);
		                  } else if (completableFutureSignature === 'completeOnTimeout(Ljava/lang/Object;JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/completeOnTimeout(Ljava/util/concurrent/CompletableFuture;Ljava/lang/Object;JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1, arg2, null, arg4 !== undefined ? arg4 : arg3);
		                  } else if (completableFutureSignature === 'exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1);
		                  } else if (completableFutureSignature === 'exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1, arg2);
		                  } else if (completableFutureSignature === 'exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyCompose(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1);
		                  } else if (completableFutureSignature === 'exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyComposeAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1);
		                  } else if (completableFutureSignature === 'exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyComposeAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1, arg2);
		                  } else if (completableFutureSignature === 'copy()Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/copy(Ljava/util/concurrent/CompletableFuture;)Ljava/util/concurrent/CompletableFuture;';
		                  } else if (completableFutureSignature === 'defaultExecutor()Ljava/util/concurrent/Executor;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/defaultExecutor(Ljava/util/concurrent/CompletableFuture;)Ljava/util/concurrent/Executor;';
		                  } else if (completableFutureSignature === 'minimalCompletionStage()Ljava/util/concurrent/CompletionStage;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/minimalCompletionStage(Ljava/util/concurrent/CompletableFuture;)Ljava/util/concurrent/CompletionStage;';
		                  } else if (completableFutureSignature === 'orTimeout(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;') {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/orTimeout(Ljava/util/concurrent/CompletableFuture;JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;';
		                    helperArgs.push(arg1, null, arg3 !== undefined ? arg3 : arg2);
		                  } else {
		                    helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/newIncompleteFuture(Ljava/util/concurrent/CompletableFuture;)Ljava/util/concurrent/CompletableFuture;';
		                  }
		                  factoriesCons[helperSignature](thread, helperArgs, (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(rv);
		                    }
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/regex/Pattern;' &&
		            this.signature === 'asMatchPredicate()Ljava/util/function/Predicate;') {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: [],
		            returnType: 'Ljava/util/function/Predicate;',
		            getParamWordSize: function(): number {
		              return 0;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/util/regex/Pattern$DoppioMatchPredicate;', (predicateCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (predicateCls === null) {
		                    return;
		                  }
		                  var predicate = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, predicateCls);
		                  (<any> predicate)['<init>(Ljava/util/regex/Pattern;)V'](thread, [javaThis], (e?: JVMTypes.java_lang_Throwable) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(predicate);
		                    }
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/regex/Matcher;' &&
		            this.signature === 'results()Ljava/util/stream/Stream;') {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: [],
		            returnType: 'Ljava/util/stream/Stream;',
		            getParamWordSize: function(): number {
		              return 0;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/util/regex/Matcher$DoppioResults;', (resultsCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (resultsCls === null) {
		                    return;
		                  }
		                  var resultsCons = <any> resultsCls.getConstructor(thread);
		                  resultsCons['java/util/regex/Matcher$DoppioResults/stream(Ljava/util/regex/Matcher;)Ljava/util/stream/Stream;'](thread, [javaThis], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(rv);
		                    }
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/regex/Matcher;' &&
		            (this.signature === 'replaceAll(Ljava/util/function/Function;)Ljava/lang/String;' ||
		             this.signature === 'replaceFirst(Ljava/util/function/Function;)Ljava/lang/String;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: ['Ljava/util/function/Function;'],
		            returnType: 'Ljava/lang/String;',
		            getParamWordSize: function(): number {
		              return 1;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var matcherSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, replacer: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/util/regex/Matcher$DoppioReplacer;', (replacerCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (replacerCls === null) {
		                    return;
		                  }
		                  var replacerCons = <any> replacerCls.getConstructor(thread),
		                    helperSignature = matcherSignature === 'replaceAll(Ljava/util/function/Function;)Ljava/lang/String;' ?
		                      'java/util/regex/Matcher$DoppioReplacer/replaceAll(Ljava/util/regex/Matcher;Ljava/util/function/Function;)Ljava/lang/String;' :
		                      'java/util/regex/Matcher$DoppioReplacer/replaceFirst(Ljava/util/regex/Matcher;Ljava/util/function/Function;)Ljava/lang/String;';
		                  replacerCons[helperSignature](thread, [javaThis, replacer], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(rv);
		                    }
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/regex/Matcher;' &&
		            (this.signature === 'appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ||
		             this.signature === 'appendTail(Ljava/lang/StringBuilder;)Ljava/lang/StringBuilder;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ?
		              ['Ljava/lang/StringBuilder;', 'Ljava/lang/String;'] :
		              ['Ljava/lang/StringBuilder;'],
		            returnType: this.signature === 'appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ?
		              'Ljava/util/regex/Matcher;' :
		              'Ljava/lang/StringBuilder;',
		            getParamWordSize: function(): number {
		              return this.signature === 'appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ? 2 : 1;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var matcherSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, builder: JVMTypes.java_lang_Object, replacement?: JVMTypes.java_lang_String): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/util/regex/Matcher$DoppioStringBuilderAppend;', (appendCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (appendCls === null) {
		                    return;
		                  }
		                  var appendCons = <any> appendCls.getConstructor(thread),
		                    helperSignature = matcherSignature === 'appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ?
		                      'java/util/regex/Matcher$DoppioStringBuilderAppend/appendReplacement(Ljava/util/regex/Matcher;Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' :
		                      'java/util/regex/Matcher$DoppioStringBuilderAppend/appendTail(Ljava/util/regex/Matcher;Ljava/lang/StringBuilder;)Ljava/lang/StringBuilder;',
		                    helperArgs = matcherSignature === 'appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ?
		                      [javaThis, builder, replacement] :
		                      [javaThis, builder];
		                  appendCons[helperSignature](thread, helperArgs, (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(rv);
		                    }
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/Scanner;' &&
		            (this.signature === '<init>(Ljava/io/InputStream;Ljava/nio/charset/Charset;)V' ||
		             this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
		             this.signature === '<init>(Ljava/nio/file/Path;Ljava/nio/charset/Charset;)V' ||
		             this.signature === '<init>(Ljava/nio/channels/ReadableByteChannel;Ljava/nio/charset/Charset;)V')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === '<init>(Ljava/io/InputStream;Ljava/nio/charset/Charset;)V' ?
		              ['Ljava/io/InputStream;', 'Ljava/nio/charset/Charset;'] :
		              this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ?
		                ['Ljava/io/File;', 'Ljava/nio/charset/Charset;'] :
		                this.signature === '<init>(Ljava/nio/file/Path;Ljava/nio/charset/Charset;)V' ?
		                  ['Ljava/nio/file/Path;', 'Ljava/nio/charset/Charset;'] :
		                  ['Ljava/nio/channels/ReadableByteChannel;', 'Ljava/nio/charset/Charset;'],
		            returnType: 'V',
		            getParamWordSize: function(): number {
		              return 2;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var scannerCharsetSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, target: JVMTypes.java_lang_Object, charset: JVMTypes.java_lang_Object): any {
		                if (charset === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                var charsetName = (<any> charset)['java/nio/charset/Charset/name'];
		                if (scannerCharsetSignature === '<init>(Ljava/nio/file/Path;Ljava/nio/charset/Charset;)V') {
		                  if (target === null) {
		                    thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                    return null;
		                  }
		                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                  (<any> target)['toFile()Ljava/io/File;'](thread, [], (fileErr?: JVMTypes.java_lang_Throwable, file?: JVMTypes.java_lang_Object) => {
		                    if (fileErr) {
		                      thread.throwException(fileErr);
		                      return;
		                    }
		                    (<any> javaThis)['<init>(Ljava/io/File;Ljava/lang/String;)V'](thread, [file, charsetName], (e?: JVMTypes.java_lang_Throwable) => {
		                      if (e) {
		                        thread.throwException(e);
		                      } else {
		                        thread.asyncReturn();
		                      }
		                    });
		                  });
		                  return null;
		                }
		                var delegateSignature = scannerCharsetSignature === '<init>(Ljava/io/InputStream;Ljava/nio/charset/Charset;)V' ?
		                  '<init>(Ljava/io/InputStream;Ljava/lang/String;)V' :
		                  scannerCharsetSignature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ?
		                    '<init>(Ljava/io/File;Ljava/lang/String;)V' :
		                    '<init>(Ljava/nio/channels/ReadableByteChannel;Ljava/lang/String;)V';
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> javaThis)[delegateSignature](thread, [target, charsetName], (e?: JVMTypes.java_lang_Throwable) => {
		                  if (e) {
		                    thread.throwException(e);
		                  } else {
		                    thread.asyncReturn();
		                  }
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/util/Scanner;' &&
		            (this.signature === 'tokens()Ljava/util/stream/Stream;' ||
		             this.signature === 'findAll(Ljava/util/regex/Pattern;)Ljava/util/stream/Stream;' ||
		             this.signature === 'findAll(Ljava/lang/String;)Ljava/util/stream/Stream;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'tokens()Ljava/util/stream/Stream;' ? [] :
		              this.signature === 'findAll(Ljava/util/regex/Pattern;)Ljava/util/stream/Stream;' ? ['Ljava/util/regex/Pattern;'] : ['Ljava/lang/String;'],
		            returnType: 'Ljava/util/stream/Stream;',
		            getParamWordSize: function(): number {
		              return this.parameterTypes.length;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var scannerSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, pattern?: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                if (scannerSignature === 'tokens()Ljava/util/stream/Stream;') {
		                  thread.getBsCl().initializeClass(thread, 'Ljava/util/Scanner$DoppioTokens;', (tokensCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                    if (tokensCls === null) {
		                      return;
		                    }
		                    var tokensCons = <any> tokensCls.getConstructor(thread);
		                    tokensCons['java/util/Scanner$DoppioTokens/stream(Ljava/util/Scanner;)Ljava/util/stream/Stream;'](thread, [javaThis], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                      if (e) {
		                        thread.throwException(e);
		                      } else {
		                        thread.asyncReturn(rv);
		                      }
		                    });
		                  });
		                } else {
		                  thread.getBsCl().initializeClass(thread, 'Ljava/util/Scanner$DoppioFindAll;', (findAllCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                    if (findAllCls === null) {
		                      return;
		                    }
		                    var findAllCons = <any> findAllCls.getConstructor(thread),
		                      helperSignature = scannerSignature === 'findAll(Ljava/util/regex/Pattern;)Ljava/util/stream/Stream;' ?
		                        'java/util/Scanner$DoppioFindAll/stream(Ljava/util/Scanner;Ljava/util/regex/Pattern;)Ljava/util/stream/Stream;' :
		                        'java/util/Scanner$DoppioFindAll/stream(Ljava/util/Scanner;Ljava/lang/String;)Ljava/util/stream/Stream;';
		                    findAllCons[helperSignature](thread, [javaThis, pattern], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                      if (e) {
		                        thread.throwException(e);
		                      } else {
		                        thread.asyncReturn(rv);
		                      }
		                    });
		                  });
		                }
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/text/NumberFormat;' &&
		            (this.signature === 'getCompactNumberInstance()Ljava/text/NumberFormat;' ||
		             this.signature === 'getCompactNumberInstance(Ljava/util/Locale;Ljava/text/NumberFormat$Style;)Ljava/text/NumberFormat;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: syntheticAccessFlags,
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'getCompactNumberInstance()Ljava/text/NumberFormat;' ? [] :
		              ['Ljava/util/Locale;', 'Ljava/text/NumberFormat$Style;'],
		            returnType: 'Ljava/text/NumberFormat;',
		            getParamWordSize: function(): number {
		              return this.parameterTypes.length;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var numberFormatSignature = this.signature;
		              return function(thread: JVMThread, locale?: JVMTypes.java_lang_Object, style?: JVMTypes.java_lang_Object): any {
		                if (numberFormatSignature !== 'getCompactNumberInstance()Ljava/text/NumberFormat;' &&
		                    (locale === null || style === null)) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                var styleName = numberFormatSignature === 'getCompactNumberInstance()Ljava/text/NumberFormat;' ?
		                  'SHORT' : (<any> style)['java/lang/Enum/name'].toString(),
		                  patternsData = styleName === 'LONG' ?
		                    ['', '', '', '0 thousand', '00 thousand', '000 thousand', '0 million', '00 million', '000 million', '0 billion', '00 billion', '000 billion', '0 trillion', '00 trillion', '000 trillion'] :
		                    ['', '', '', '0K', '00K', '000K', '0M', '00M', '000M', '0B', '00B', '000B', '0T', '00T', '000T'];
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/text/DecimalFormatSymbols;', (symbolsCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (symbolsCls === null) {
		                    return;
		                  }
		                  var symbolsCons = <any> symbolsCls.getConstructor(thread),
		                    symbolsSignature = numberFormatSignature === 'getCompactNumberInstance()Ljava/text/NumberFormat;' ?
		                      'java/text/DecimalFormatSymbols/getInstance()Ljava/text/DecimalFormatSymbols;' :
		                      'java/text/DecimalFormatSymbols/getInstance(Ljava/util/Locale;)Ljava/text/DecimalFormatSymbols;',
		                    symbolsArgs = numberFormatSignature === 'getCompactNumberInstance()Ljava/text/NumberFormat;' ? [] : [locale];
		                  symbolsCons[symbolsSignature](thread, symbolsArgs, (symbolsErr?: JVMTypes.java_lang_Throwable, symbols?: JVMTypes.java_lang_Object) => {
		                    if (symbolsErr) {
		                      thread.throwException(symbolsErr);
		                      return;
		                    }
		                    thread.getBsCl().initializeClass(thread, 'Ljava/text/CompactNumberFormat;', (compactCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                      if (compactCls === null) {
		                        return;
		                      }
		                      var compact = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, compactCls),
		                        patternStrings: JVMTypes.java_lang_String[] = [],
		                        i: number;
		                      for (i = 0; i < patternsData.length; i++) {
		                        patternStrings.push(util.initString(thread.getBsCl(), patternsData[i]));
		                      }
		                      (<any> compact)['<init>(Ljava/lang/String;Ljava/text/DecimalFormatSymbols;[Ljava/lang/String;)V'](thread, [
		                        util.initString(thread.getBsCl(), '#,##0'),
		                        symbols,
		                        util.newArrayFromData<JVMTypes.java_lang_String>(thread, thread.getBsCl(), '[Ljava/lang/String;', patternStrings)
		                      ], (compactErr?: JVMTypes.java_lang_Throwable) => {
		                        if (compactErr) {
		                          thread.throwException(compactErr);
		                        } else {
		                          thread.asyncReturn(compact);
		                        }
		                      });
		                    });
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/nio/file/FileSystems;' &&
		            (this.signature === 'newFileSystem(Ljava/nio/file/Path;)Ljava/nio/file/FileSystem;' ||
		             this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;)Ljava/nio/file/FileSystem;' ||
		             this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;' ||
		             this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: syntheticAccessFlags,
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'newFileSystem(Ljava/nio/file/Path;)Ljava/nio/file/FileSystem;' ?
		              ['Ljava/nio/file/Path;'] :
		              this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;)Ljava/nio/file/FileSystem;' ?
		                ['Ljava/nio/file/Path;', 'Ljava/util/Map;'] :
		                this.signature === 'newFileSystem(Ljava/nio/file/Path;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;' ?
		                  ['Ljava/nio/file/Path;', 'Ljava/lang/ClassLoader;'] :
		                  ['Ljava/nio/file/Path;', 'Ljava/util/Map;', 'Ljava/lang/ClassLoader;'],
		            returnType: 'Ljava/nio/file/FileSystem;',
		            getParamWordSize: function(): number {
		              return this.parameterTypes.length;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var fileSystemsSignature = this.signature;
		              return function(thread: JVMThread, path: JVMTypes.java_lang_Object, envOrLoader?: JVMTypes.java_lang_Object): any {
		                var hasEnv = fileSystemsSignature === 'newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;)Ljava/nio/file/FileSystem;' ||
		                  fileSystemsSignature === 'newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;',
		                  env = hasEnv ? envOrLoader : null;
		                if (path === null || (hasEnv && env === null)) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return;
		                }
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> path)['toFile()Ljava/io/File;'](thread, [], (fileErr?: JVMTypes.java_lang_Throwable, file?: JVMTypes.java_lang_Object) => {
		                  if (fileErr) {
		                    thread.throwException(fileErr);
		                    return;
		                  }
		                  var filepath = (<any> file)['java/io/File/path'].toString();
		                  if (!fs.existsSync(filepath)) {
		                    thread.throwNewException('Ljava/nio/file/NoSuchFileException;', filepath);
		                  } else {
		                    thread.throwNewException('Ljava/nio/file/ProviderNotFoundException;', 'Provider not found');
		                  }
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/io/PrintWriter;' &&
		            (this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
		             this.signature === '<init>(Ljava/lang/String;Ljava/nio/charset/Charset;)V')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ?
		              ['Ljava/io/File;', 'Ljava/nio/charset/Charset;'] : ['Ljava/lang/String;', 'Ljava/nio/charset/Charset;'],
		            returnType: 'V',
		            getParamWordSize: function(): number {
		              return 2;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var printWriterCharsetSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, target: JVMTypes.java_lang_Object, charset: JVMTypes.java_lang_Object): any {
		                if (charset === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                var charsetName = (<any> charset)['java/nio/charset/Charset/name'],
		                  delegateSignature = printWriterCharsetSignature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ?
		                    '<init>(Ljava/io/File;Ljava/lang/String;)V' : '<init>(Ljava/lang/String;Ljava/lang/String;)V';
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> javaThis)[delegateSignature](thread, [target, charsetName], (e?: JVMTypes.java_lang_Throwable) => {
		                  if (e) {
		                    thread.throwException(e);
		                  } else {
		                    thread.asyncReturn();
		                  }
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/io/PrintWriter;' &&
		            this.signature === '<init>(Ljava/io/OutputStream;ZLjava/nio/charset/Charset;)V') {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: ['Ljava/io/OutputStream;', 'Z', 'Ljava/nio/charset/Charset;'],
		            returnType: 'V',
		            getParamWordSize: function(): number {
		              return 3;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, out: JVMTypes.java_lang_Object, autoFlush: number, charset: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/io/OutputStreamWriter;', (streamWriterCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (streamWriterCls === null) {
		                    return;
		                  }
		                  thread.getBsCl().initializeClass(thread, 'Ljava/io/BufferedWriter;', (bufferedWriterCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                    if (bufferedWriterCls === null) {
		                      return;
		                    }
		                    var streamWriter = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, streamWriterCls);
		                    (<any> streamWriter)['<init>(Ljava/io/OutputStream;Ljava/nio/charset/Charset;)V'](thread, [out, charset], (streamWriterErr?: JVMTypes.java_lang_Throwable) => {
		                      if (streamWriterErr) {
		                        thread.throwException(streamWriterErr);
		                        return;
		                      }
		                      var bufferedWriter = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, bufferedWriterCls);
		                      (<any> bufferedWriter)['<init>(Ljava/io/Writer;)V'](thread, [streamWriter], (bufferedWriterErr?: JVMTypes.java_lang_Throwable) => {
		                        if (bufferedWriterErr) {
		                          thread.throwException(bufferedWriterErr);
		                          return;
		                        }
		                        (<any> javaThis)['<init>(Ljava/io/Writer;Z)V'](thread, [bufferedWriter, autoFlush], (printWriterErr?: JVMTypes.java_lang_Throwable) => {
		                          if (printWriterErr) {
		                            thread.throwException(printWriterErr);
		                            return;
		                          }
		                          if (out === null) {
		                            thread.asyncReturn();
		                            return;
		                          }
		                          thread.getBsCl().resolveClass(thread, 'Ljava/io/PrintStream;', (printStreamCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                            if (printStreamCls === null) {
		                              return;
		                            }
		                            if (typeof (<any> out).getClass === 'function' && (<any> out).getClass().isCastable(printStreamCls)) {
		                              (<any> javaThis)['java/io/PrintWriter/psOut'] = out;
		                            }
		                            thread.asyncReturn();
		                          });
		                        });
		                      });
		                    });
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/io/PrintStream;' &&
		            (this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
		             this.signature === '<init>(Ljava/lang/String;Ljava/nio/charset/Charset;)V')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ?
		              ['Ljava/io/File;', 'Ljava/nio/charset/Charset;'] : ['Ljava/lang/String;', 'Ljava/nio/charset/Charset;'],
		            returnType: 'V',
		            getParamWordSize: function(): number {
		              return 2;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var printStreamCharsetSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, target: JVMTypes.java_lang_Object, charset: JVMTypes.java_lang_Object): any {
		                if (charset === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                var charsetName = (<any> charset)['java/nio/charset/Charset/name'],
		                  delegateSignature = printStreamCharsetSignature === '<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ?
		                    '<init>(Ljava/io/File;Ljava/lang/String;)V' : '<init>(Ljava/lang/String;Ljava/lang/String;)V';
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> javaThis)[delegateSignature](thread, [target, charsetName], (e?: JVMTypes.java_lang_Throwable) => {
		                  if (e) {
		                    thread.throwException(e);
		                  } else {
		                    thread.asyncReturn();
		                  }
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/io/PrintStream;' &&
		            this.signature === '<init>(Ljava/io/OutputStream;ZLjava/nio/charset/Charset;)V') {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: ['Ljava/io/OutputStream;', 'Z', 'Ljava/nio/charset/Charset;'],
		            returnType: 'V',
		            getParamWordSize: function(): number {
		              return 3;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, out: JVMTypes.java_lang_Object, autoFlush: number, charset: JVMTypes.java_lang_Object): any {
		                if (charset === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                var charsetName = (<any> charset)['java/nio/charset/Charset/name'];
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> javaThis)['<init>(Ljava/io/OutputStream;ZLjava/lang/String;)V'](thread, [out, autoFlush, charsetName], (e?: JVMTypes.java_lang_Throwable) => {
		                  if (e) {
		                    thread.throwException(e);
		                  } else {
		                    thread.asyncReturn();
		                  }
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/io/PrintStream;' &&
		            this.signature === 'writeBytes([B)V') {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: ['[B'],
		            returnType: 'V',
		            getParamWordSize: function(): number {
		              return 1;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, bytes: JVMTypes.JVMArray<number>): any {
		                if (bytes === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> javaThis)['write([BII)V'](thread, [bytes, 0, bytes.array.length], (e?: JVMTypes.java_lang_Throwable) => {
		                  if (e) {
		                    thread.throwException(e);
		                  } else {
		                    thread.asyncReturn();
		                  }
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticCls.getInternalName() === 'Ljava/io/ByteArrayOutputStream;' &&
		            (this.signature === 'toString(Ljava/nio/charset/Charset;)Ljava/lang/String;' ||
		             this.signature === 'writeBytes([B)V')) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'writeBytes([B)V' ? ['[B'] : ['Ljava/nio/charset/Charset;'],
		            returnType: this.signature === 'writeBytes([B)V' ? 'V' : 'Ljava/lang/String;',
		            getParamWordSize: function(): number {
		              return this.parameterTypes.length;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var byteArrayOutputStreamSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, arg: JVMTypes.java_lang_Object): any {
		                if (arg === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                if (byteArrayOutputStreamSignature === 'writeBytes([B)V') {
		                  var bytes = <JVMTypes.JVMArray<number>> arg;
		                  (<any> javaThis)['write([BII)V'](thread, [bytes, 0, bytes.array.length], (e?: JVMTypes.java_lang_Throwable) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn();
		                    }
		                  });
		                } else {
		                  var charsetName = (<any> arg)['java/nio/charset/Charset/name'];
		                  (<any> javaThis)['toString(Ljava/lang/String;)Ljava/lang/String;'](thread, [charsetName], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_String) => {
		                    if (e) {
		                      thread.throwException(e);
		                    } else {
		                      thread.asyncReturn(rv);
		                    }
		                  });
		                }
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (((syntheticCls.getInternalName() === 'Ljava/lang/StringBuilder;' &&
		            (this.signature === 'compareTo(Ljava/lang/StringBuilder;)I' ||
		             this.signature === 'compareTo(Ljava/lang/Object;)I')) ||
		            (syntheticCls.getInternalName() === 'Ljava/lang/StringBuffer;' &&
		            (this.signature === 'compareTo(Ljava/lang/StringBuffer;)I' ||
		             this.signature === 'compareTo(Ljava/lang/Object;)I')))) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'compareTo(Ljava/lang/Object;)I' ? ['Ljava/lang/Object;'] : [syntheticCls.getInternalName()],
		            returnType: 'I',
		            getParamWordSize: function(): number {
		              return 1;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, other: JVMTypes.java_lang_Object): any {
		                if (other === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                if (typeof other.getClass !== 'function' || !other.getClass().isCastable(syntheticCls)) {
		                  thread.throwNewException('Ljava/lang/ClassCastException;', other.getClass().getExternalName() + ' cannot be cast to ' + syntheticCls.getExternalName());
		                  return null;
		                }
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                (<any> javaThis)['toString()Ljava/lang/String;'](thread, [], (leftErr?: JVMTypes.java_lang_Throwable, left?: JVMTypes.java_lang_String) => {
		                  if (leftErr) {
		                    thread.throwException(leftErr);
		                    return;
		                  }
		                  (<any> other)['toString()Ljava/lang/String;'](thread, [], (rightErr?: JVMTypes.java_lang_Throwable, right?: JVMTypes.java_lang_String) => {
		                    if (rightErr) {
		                      thread.throwException(rightErr);
		                      return;
		                    }
		                    var leftValue = left.toString(),
		                      rightValue = right.toString(),
		                      limit = Math.min(leftValue.length, rightValue.length);
		                    for (var i = 0; i < limit; i++) {
		                      var difference = leftValue.charCodeAt(i) - rightValue.charCodeAt(i);
		                      if (difference !== 0) {
		                        thread.asyncReturn(difference);
		                        return;
		                      }
		                    }
		                    thread.asyncReturn(leftValue.length - rightValue.length);
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticBufferCovariantReturn) {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature[0] === 'p' || this.signature[0] === 'l' ? ['I'] : [],
		            returnType: syntheticCls.getInternalName(),
		            getParamWordSize: function(): number {
		              return this.parameterTypes.length;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var bufferSignature = this.signature;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, value?: number): any {
		                var position = (<any> javaThis)['java/nio/Buffer/position'],
		                  limit = (<any> javaThis)['java/nio/Buffer/limit'],
		                  capacity = (<any> javaThis)['java/nio/Buffer/capacity'],
		                  mark = (<any> javaThis)['java/nio/Buffer/mark'];
		                if (bufferSignature === 'position(I)' + syntheticCls.getInternalName()) {
		                  if (value > limit || value < 0) {
		                    thread.throwNewException('Ljava/lang/IllegalArgumentException;', '');
		                    return null;
		                  }
		                  (<any> javaThis)['java/nio/Buffer/position'] = value;
		                  if (mark > value) {
		                    (<any> javaThis)['java/nio/Buffer/mark'] = -1;
		                  }
		                  return javaThis;
		                }
		                if (bufferSignature === 'limit(I)' + syntheticCls.getInternalName()) {
		                  if (value > capacity || value < 0) {
		                    thread.throwNewException('Ljava/lang/IllegalArgumentException;', '');
		                    return null;
		                  }
		                  (<any> javaThis)['java/nio/Buffer/limit'] = value;
		                  if (position > value) {
		                    (<any> javaThis)['java/nio/Buffer/position'] = value;
		                  }
		                  if (mark > value) {
		                    (<any> javaThis)['java/nio/Buffer/mark'] = -1;
		                  }
		                  return javaThis;
		                }
		                if (bufferSignature === 'mark()' + syntheticCls.getInternalName()) {
		                  (<any> javaThis)['java/nio/Buffer/mark'] = position;
		                  return javaThis;
		                }
		                if (bufferSignature === 'reset()' + syntheticCls.getInternalName()) {
		                  if (mark < 0) {
		                    thread.throwNewException('Ljava/nio/InvalidMarkException;', '');
		                    return null;
		                  }
		                  (<any> javaThis)['java/nio/Buffer/position'] = mark;
		                  return javaThis;
		                }
		                if (bufferSignature === 'clear()' + syntheticCls.getInternalName()) {
		                  (<any> javaThis)['java/nio/Buffer/position'] = 0;
		                  (<any> javaThis)['java/nio/Buffer/limit'] = capacity;
		                  (<any> javaThis)['java/nio/Buffer/mark'] = -1;
		                  return javaThis;
		                }
		                if (bufferSignature === 'flip()' + syntheticCls.getInternalName()) {
		                  (<any> javaThis)['java/nio/Buffer/limit'] = position;
		                  (<any> javaThis)['java/nio/Buffer/position'] = 0;
		                  (<any> javaThis)['java/nio/Buffer/mark'] = -1;
		                  return javaThis;
		                }
		                (<any> javaThis)['java/nio/Buffer/position'] = 0;
		                (<any> javaThis)['java/nio/Buffer/mark'] = -1;
		                return javaThis;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (syntheticBulkBufferInfo !== undefined &&
		            (this.signature === 'get(I' + syntheticBulkBufferInfo[0] + 'II)' + syntheticCls.getInternalName() ||
		             this.signature === 'get(I' + syntheticBulkBufferInfo[0] + ')' + syntheticCls.getInternalName() ||
		             this.signature === 'put(I' + syntheticBulkBufferInfo[0] + 'II)' + syntheticCls.getInternalName() ||
		             this.signature === 'put(I' + syntheticBulkBufferInfo[0] + ')' + syntheticCls.getInternalName())) {
		          var syntheticBulkBufferArrayType = syntheticBulkBufferInfo[0],
		            syntheticBulkBufferElementType = syntheticBulkBufferInfo[1],
		            syntheticBulkBufferReturnType = syntheticCls.getInternalName();
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: this.signature === 'get(I' + syntheticBulkBufferArrayType + ')' + syntheticBulkBufferReturnType ||
		              this.signature === 'put(I' + syntheticBulkBufferArrayType + ')' + syntheticBulkBufferReturnType ? ['I', syntheticBulkBufferArrayType] : ['I', syntheticBulkBufferArrayType, 'I', 'I'],
		            returnType: syntheticBulkBufferReturnType,
		            getParamWordSize: function(): number {
		              return this.parameterTypes.length;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread].concat(params);
		            },
		            getNativeFunction: function(): Function {
		              var bulkBufferSignature = this.signature,
		                bulkBufferArrayType = syntheticBulkBufferArrayType,
		                bulkBufferElementType = syntheticBulkBufferElementType,
		                bulkBufferReturnType = syntheticBulkBufferReturnType,
		                bulkBufferGetSignature = 'get(I)' + syntheticBulkBufferElementType,
		                bulkBufferPutSignature = 'put(I' + syntheticBulkBufferElementType + ')' + syntheticBulkBufferReturnType;
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, index: number, elementArray: JVMTypes.JVMArray<any>, arrayOffset?: number, length?: number): any {
		                if (elementArray === null) {
		                  thread.throwNewException('Ljava/lang/NullPointerException;', '');
		                  return null;
		                }
		                if (bulkBufferSignature === 'get(I' + bulkBufferArrayType + ')' + bulkBufferReturnType ||
		                    bulkBufferSignature === 'put(I' + bulkBufferArrayType + ')' + bulkBufferReturnType) {
		                  arrayOffset = 0;
		                  length = elementArray.array.length;
		                }
		                if (arrayOffset < 0 || length < 0 || arrayOffset > elementArray.array.length - length) {
		                  thread.throwNewException('Ljava/lang/IndexOutOfBoundsException;', '');
		                  return null;
		                }
		                if (index < 0 || length > (<any> javaThis)['java/nio/Buffer/limit'] - index) {
		                  thread.throwNewException('Ljava/lang/IndexOutOfBoundsException;', '');
		                  return null;
		                }
		                if (length === 0) {
		                  return javaThis;
		                }
		                var i = 0,
		                  isPut = bulkBufferSignature[0] === 'p';
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                if (isPut) {
		                  var putNext = () => {
		                    if (i === length) {
		                      thread.asyncReturn(javaThis);
		                      return;
		                    }
		                    var putArgs = bulkBufferElementType === 'J' || bulkBufferElementType === 'D' ?
		                      [index + i, elementArray.array[arrayOffset + i], null] :
		                      [index + i, elementArray.array[arrayOffset + i]];
		                    (<any> javaThis)[bulkBufferPutSignature](thread, putArgs, (e?: JVMTypes.java_lang_Throwable) => {
		                      if (e) {
		                        thread.throwException(e);
		                      } else {
		                        i++;
		                        putNext();
		                      }
		                    });
		                  };
		                  putNext();
		                } else {
		                  var getNext = () => {
		                    if (i === length) {
		                      thread.asyncReturn(javaThis);
		                      return;
		                    }
		                    (<any> javaThis)[bulkBufferGetSignature](thread, [index + i], (e?: JVMTypes.java_lang_Throwable, rv?: any) => {
		                      if (e) {
		                        thread.throwException(e);
		                      } else {
		                        elementArray.array[arrayOffset + i] = rv;
		                        i++;
		                        getNext();
		                      }
		                    });
		                  };
		                  getNext();
		                }
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if (this.signature === 'describeConstable()Ljava/util/Optional;' &&
		            syntheticCls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/Enum;'))) {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Ljava/util/Optional;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): any {
		                var enumName = (<any> javaThis)['java/lang/Enum/name'],
	                  enumDescriptor = javaThis.getClass().getInternalName();
	                thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                thread.getBsCl().initializeClass(thread, 'Ljava/lang/constant/ClassDesc;', (classDescCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                  if (classDescCls === null) {
	                    return;
	                  }
	                  var classDescCons = <any> classDescCls.getConstructor(thread);
		                  classDescCons['java/lang/constant/ClassDesc/ofDescriptor(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;'](thread, [util.initString(thread.getBsCl(), enumDescriptor)], (descErr?: JVMTypes.java_lang_Throwable, enumClassDesc?: JVMTypes.java_lang_Object) => {
		                    if (descErr) {
		                      thread.throwException(descErr);
		                      return;
		                    }
		                    thread.getBsCl().initializeClass(thread, 'Ljava/lang/Enum$EnumDesc;', (enumDescCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                      if (enumDescCls === null) {
		                        return;
		                      }
		                      var enumDescCons = <any> enumDescCls.getConstructor(thread);
		                      enumDescCons['java/lang/Enum$EnumDesc/of(Ljava/lang/constant/ClassDesc;Ljava/lang/String;)Ljava/lang/Enum$EnumDesc;'](thread, [enumClassDesc, enumName], (enumDescErr?: JVMTypes.java_lang_Throwable, enumConstantDesc?: JVMTypes.java_lang_Object) => {
		                        if (enumDescErr) {
		                          thread.throwException(enumDescErr);
		                          return;
		                        }
		                          thread.getBsCl().initializeClass(thread, 'Ljava/util/Optional;', (optionalCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                            if (optionalCls === null) {
		                              return;
		                            }
		                            var optionalCons = <any> optionalCls.getConstructor(thread);
		                            optionalCons['java/util/Optional/of(Ljava/lang/Object;)Ljava/util/Optional;'](thread, [enumConstantDesc], (optionalErr?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                              if (optionalErr) {
		                                thread.throwException(optionalErr);
		                              } else {
		                                thread.asyncReturn(rv);
		                              }
		                            });
		                          });
		                      });
		                    });
		                  });
	                });
	                return null;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'isHidden()Z') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Z',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): number {
	                return 0;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'isRecord()Z') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Z',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): number {
	                return javaThis.$cls instanceof ReferenceClassData && javaThis.$cls.isRecord() ? 1 : 0;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            (this.signature === 'getNestHost()Ljava/lang/Class;' ||
	             this.signature === 'isNestmateOf(Ljava/lang/Class;)Z' ||
	             this.signature === 'getNestMembers()[Ljava/lang/Class;')) {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: this.signature === 'isNestmateOf(Ljava/lang/Class;)Z' ? ['Ljava/lang/Class;'] : [],
	            returnType: this.signature === 'isNestmateOf(Ljava/lang/Class;)Z' ? 'Z' :
	              this.signature === 'getNestMembers()[Ljava/lang/Class;' ? '[Ljava/lang/Class;' : 'Ljava/lang/Class;',
	            getParamWordSize: function(): number {
	              return this.parameterTypes.length;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread].concat(params);
	            },
	            getNativeFunction: function(): Function {
	              var classNestSignature = this.signature;
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, otherClass?: JVMTypes.java_lang_Class): any {
	                var cls = javaThis.$cls;
	                if (classNestSignature === 'getNestHost()Ljava/lang/Class;') {
	                  if (!(cls instanceof ReferenceClassData)) {
	                    return javaThis;
	                  }
	                  var nestHostName = cls.getNestHostName();
	                  if (nestHostName === cls.getInternalName()) {
	                    return javaThis;
	                  }
	                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                  cls.getLoader().resolveClass(thread, nestHostName, (nestHost: ClassData) => {
	                    if (nestHost !== null) {
	                      thread.asyncReturn(nestHost.getClassObject(thread));
	                    }
	                  });
	                  return null;
	                }
	                if (classNestSignature === 'isNestmateOf(Ljava/lang/Class;)Z') {
	                  if (otherClass === null) {
	                    thread.throwNewException('Ljava/lang/NullPointerException;', '');
	                    return null;
	                  }
	                  if (!(cls instanceof ReferenceClassData) || !(otherClass.$cls instanceof ReferenceClassData)) {
	                    return cls === otherClass.$cls ? 1 : 0;
	                  }
	                  return cls.getNestHostName() === otherClass.$cls.getNestHostName() ? 1 : 0;
	                }
	                if (!(cls instanceof ReferenceClassData)) {
	                  return util.newArrayFromData<JVMTypes.java_lang_Class>(thread, thread.getBsCl(), '[Ljava/lang/Class;', [javaThis]);
	                }
	                thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                var loader = cls.getLoader();
	                loader.resolveClass(thread, cls.getNestHostName(), (nestHost: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                  if (nestHost === null) {
	                    return;
	                  }
	                  var names = [nestHost.getInternalName()].concat(nestHost.getNestMemberNames()),
	                    seen: {[name: string]: boolean} = {},
	                    members: JVMTypes.java_lang_Class[] = [],
	                    i = 0,
	                    resolveNext = () => {
	                      while (i < names.length && seen[names[i]]) {
	                        i++;
	                      }
	                      if (i >= names.length) {
	                        thread.asyncReturn(util.newArrayFromData<JVMTypes.java_lang_Class>(thread, thread.getBsCl(), '[Ljava/lang/Class;', members));
	                        return;
	                      }
	                      var name = names[i++];
	                      seen[name] = true;
	                      loader.resolveClass(thread, name, (member: ClassData) => {
	                        if (member !== null) {
	                          members.push(member.getClassObject(thread));
	                          resolveNext();
	                        }
	                      });
	                    };
	                  resolveNext();
	                });
	                return null;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            (this.signature === 'isSealed()Z' ||
	             this.signature === 'getPermittedSubclasses()[Ljava/lang/Class;')) {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: this.signature === 'isSealed()Z' ? 'Z' : '[Ljava/lang/Class;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              var classSealedSignature = this.signature;
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): any {
	                var cls = javaThis.$cls;
	                if (!(cls instanceof ReferenceClassData)) {
	                  return classSealedSignature === 'isSealed()Z' ? 0 : null;
	                }
	                var permittedSubclassNames = cls.getPermittedSubclassNames();
	                if (classSealedSignature === 'isSealed()Z') {
	                  return permittedSubclassNames.length > 0 ? 1 : 0;
	                }
	                if (permittedSubclassNames.length === 0) {
	                  return null;
	                }
	                thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                var loader = cls.getLoader(),
	                  permittedSubclasses: JVMTypes.java_lang_Class[] = [],
	                  i = 0,
	                  resolveNext = () => {
	                    if (i >= permittedSubclassNames.length) {
	                      thread.asyncReturn(util.newArrayFromData<JVMTypes.java_lang_Class>(thread, thread.getBsCl(), '[Ljava/lang/Class;', permittedSubclasses));
	                      return;
	                    }
	                    loader.resolveClass(thread, permittedSubclassNames[i++], (permittedSubclass: ClassData) => {
	                      if (permittedSubclass !== null) {
	                        permittedSubclasses.push(permittedSubclass.getClassObject(thread));
	                        resolveNext();
	                      }
	                    });
	                  };
	                resolveNext();
	                return null;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'arrayType()Ljava/lang/Class;') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Ljava/lang/Class;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): any {
	                var internalName = javaThis.$cls.getInternalName(),
	                  arrayDepth = 0,
	                  loader = javaThis.$cls.getLoader();
	                while (arrayDepth < internalName.length && internalName[arrayDepth] === '[') {
	                  arrayDepth++;
	                }
	                if (internalName === 'V' || arrayDepth >= 255) {
	                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                  thread.getBsCl().initializeClass(thread, 'Ljava/lang/IllegalArgumentException;', (exceptionCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                    if (exceptionCls === null) {
	                      return;
	                    }
	                    var exception = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, exceptionCls);
	                    (<any> exception)['<init>()V'](thread, [], (e?: JVMTypes.java_lang_Throwable) => {
	                      if (e) {
	                        thread.throwException(e);
	                      } else {
	                        thread.throwException(<JVMTypes.java_lang_Throwable> exception);
	                      }
	                    });
	                  });
	                  return null;
	                }
	                thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                loader.resolveClass(thread, '[' + internalName, (arrayCls: ClassData) => {
	                  if (arrayCls !== null) {
	                    thread.asyncReturn(arrayCls.getClassObject(thread));
	                  }
	                });
	                return null;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'componentType()Ljava/lang/Class;') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Ljava/lang/Class;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_Class {
	                if (!(javaThis.$cls instanceof ArrayClassData)) {
	                  return null;
	                }
	                return (<ArrayClassData<any>> javaThis.$cls).getComponentClass().getClassObject(thread);
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'descriptorString()Ljava/lang/String;') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Ljava/lang/String;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_String {
	                return util.initString(thread.getBsCl(), javaThis.$cls.getInternalName());
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'getPackageName()Ljava/lang/String;') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Ljava/lang/String;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_String {
	                var internalName = javaThis.$cls.getInternalName(),
	                  packageName: string,
	                  externalName: string,
	                  lastDot: number;
	                while (internalName[0] === '[') {
	                  internalName = internalName.slice(1);
	                }
	                if (util.is_primitive_type(internalName)) {
	                  packageName = 'java.lang';
	                } else {
	                  externalName = util.ext_classname(internalName);
	                  lastDot = externalName.lastIndexOf('.');
	                  packageName = lastDot >= 0 ? externalName.slice(0, lastDot) : '';
	                }
	                return util.initString(thread.getBsCl(), packageName);
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/Class;' &&
	            this.signature === 'describeConstable()Ljava/util/Optional;') {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: [],
	            returnType: 'Ljava/util/Optional;',
	            getParamWordSize: function(): number {
	              return 0;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): any {
	                var descriptor = javaThis.$cls.getInternalName();
	                thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                thread.getBsCl().initializeClass(thread, 'Ljava/lang/constant/ClassDesc;', (classDescCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                  if (classDescCls === null) {
	                    return;
	                  }
	                  var classDescCons = <any> classDescCls.getConstructor(thread);
	                  classDescCons['java/lang/constant/ClassDesc/ofDescriptor(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;'](thread, [util.initString(thread.getBsCl(), descriptor)], (descErr?: JVMTypes.java_lang_Throwable, desc?: JVMTypes.java_lang_Object) => {
	                    if (descErr) {
	                      thread.throwException(descErr);
	                      return;
	                    }
	                    thread.getBsCl().initializeClass(thread, 'Ljava/util/Optional;', (optionalCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                      if (optionalCls === null) {
	                        return;
	                      }
	                      var optionalCons = <any> optionalCls.getConstructor(thread);
	                      optionalCons['java/util/Optional/of(Ljava/lang/Object;)Ljava/util/Optional;'](thread, [desc], (optionalErr?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
	                        if (optionalErr) {
	                          thread.throwException(optionalErr);
	                        } else {
	                          thread.asyncReturn(rv);
	                        }
	                      });
	                    });
	                  });
	                });
	                return null;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
		        } else if ((syntheticCls.getInternalName() === 'Ljava/lang/Boolean;' ||
		            syntheticCls.getInternalName() === 'Ljava/lang/Byte;' ||
		            syntheticCls.getInternalName() === 'Ljava/lang/Short;' ||
		            syntheticCls.getInternalName() === 'Ljava/lang/Character;') &&
		            this.signature === 'describeConstable()Ljava/util/Optional;') {
		          syntheticMethod = {
		            cls: syntheticCls,
		            slot: -1,
		            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
		            name: this.nameAndTypeInfo.name,
		            rawDescriptor: this.nameAndTypeInfo.descriptor,
		            attrs: [],
		            signature: this.signature,
		            fullSignature: syntheticFullSignature,
		            parameterTypes: [],
		            returnType: 'Ljava/util/Optional;',
		            getParamWordSize: function(): number {
		              return 0;
		            },
		            convertArgs: function(thread: JVMThread, params: any[]): any[] {
		              return [thread, params[0]];
		            },
		            getNativeFunction: function(): Function {
		              var smallWrapperClass = syntheticCls.getInternalName();
		              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): any {
		                thread.setStatus(ThreadStatus.ASYNC_WAITING);
		                thread.getBsCl().initializeClass(thread, 'Ljava/lang/constant/ConstantDescs;', (constantDescsCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                  if (constantDescsCls === null) {
		                    return;
		                  }
		                  var constantDescsCons = <any> constantDescsCls.getConstructor(thread),
		                    bootstrap: JVMTypes.java_lang_Object,
		                    constantName: JVMTypes.java_lang_String,
		                    constantType: JVMTypes.java_lang_Object,
		                    bootstrapArgsData: JVMTypes.java_lang_Object[] = [],
		                    primitiveValue: number;
		                  if (smallWrapperClass === 'Ljava/lang/Boolean;') {
		                    bootstrap = constantDescsCons['java/lang/constant/ConstantDescs/BSM_GET_STATIC_FINAL'];
		                    constantName = util.initString(thread.getBsCl(), (<any> javaThis)['java/lang/Boolean/value'] !== 0 ? 'TRUE' : 'FALSE');
		                    constantType = constantDescsCons['java/lang/constant/ConstantDescs/CD_Boolean'];
		                    bootstrapArgsData = [constantType];
		                  } else {
		                    bootstrap = constantDescsCons['java/lang/constant/ConstantDescs/BSM_EXPLICIT_CAST'];
		                    constantName = util.initString(thread.getBsCl(), '_');
		                    if (smallWrapperClass === 'Ljava/lang/Byte;') {
		                      constantType = constantDescsCons['java/lang/constant/ConstantDescs/CD_byte'];
		                      primitiveValue = (<any> javaThis)['java/lang/Byte/value'];
		                    } else if (smallWrapperClass === 'Ljava/lang/Short;') {
		                      constantType = constantDescsCons['java/lang/constant/ConstantDescs/CD_short'];
		                      primitiveValue = (<any> javaThis)['java/lang/Short/value'];
		                    } else {
		                      constantType = constantDescsCons['java/lang/constant/ConstantDescs/CD_char'];
		                      primitiveValue = (<any> javaThis)['java/lang/Character/value'];
		                    }
		                    bootstrapArgsData = [util.boxPrimitiveValue(thread, 'I', primitiveValue)];
		                  }
		                  thread.getBsCl().initializeClass(thread, 'Ljava/lang/constant/DynamicConstantDesc;', (dynamicDescCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                    if (dynamicDescCls === null) {
		                      return;
		                    }
		                    var dynamicDescCons = <any> dynamicDescCls.getConstructor(thread),
		                      bootstrapArgs = util.newArrayFromData<JVMTypes.java_lang_Object>(thread, thread.getBsCl(), '[Ljava/lang/constant/ConstantDesc;', bootstrapArgsData);
		                    dynamicDescCons['java/lang/constant/DynamicConstantDesc/ofNamed(Ljava/lang/constant/DirectMethodHandleDesc;Ljava/lang/String;Ljava/lang/constant/ClassDesc;[Ljava/lang/constant/ConstantDesc;)Ljava/lang/constant/DynamicConstantDesc;'](thread, [bootstrap, constantName, constantType, bootstrapArgs], (dynamicErr?: JVMTypes.java_lang_Throwable, dynamicDesc?: JVMTypes.java_lang_Object) => {
		                      if (dynamicErr) {
		                        thread.throwException(dynamicErr);
		                        return;
		                      }
		                      thread.getBsCl().initializeClass(thread, 'Ljava/util/Optional;', (optionalCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
		                        if (optionalCls === null) {
		                          return;
		                        }
		                        var optionalCons = <any> optionalCls.getConstructor(thread);
		                        optionalCons['java/util/Optional/of(Ljava/lang/Object;)Ljava/util/Optional;'](thread, [dynamicDesc], (optionalErr?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
		                          if (optionalErr) {
		                            thread.throwException(optionalErr);
		                          } else {
		                            thread.asyncReturn(rv);
		                          }
		                        });
		                      });
		                    });
		                  });
		                });
		                return null;
		              };
		            },
		            isSignaturePolymorphic: function(): boolean {
		              return false;
		            },
		            isHidden: function(): boolean {
		              return false;
		            },
		            isCallerSensitive: function(): boolean {
		              return false;
		            },
		            getFullSignature: function(): string {
		              return syntheticCls.getExternalName() + '.' + this.signature;
		            }
		          };
		          method = <Method> syntheticMethod;
		        } else if ((syntheticCls.getInternalName() === 'Ljava/lang/Integer;' ||
		            syntheticCls.getInternalName() === 'Ljava/lang/Long;' ||
		            syntheticCls.getInternalName() === 'Ljava/lang/Float;' ||
		            syntheticCls.getInternalName() === 'Ljava/lang/Double;') &&
	            (this.signature === 'describeConstable()Ljava/util/Optional;' ||
	             this.signature === 'resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)' + syntheticCls.getInternalName())) {
	          syntheticMethod = {
	            cls: syntheticCls,
	            slot: -1,
	            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
	            name: this.nameAndTypeInfo.name,
	            rawDescriptor: this.nameAndTypeInfo.descriptor,
	            attrs: [],
	            signature: this.signature,
	            fullSignature: syntheticFullSignature,
	            parameterTypes: this.signature === 'describeConstable()Ljava/util/Optional;' ? [] : ['Ljava/lang/invoke/MethodHandles$Lookup;'],
	            returnType: this.signature === 'describeConstable()Ljava/util/Optional;' ? 'Ljava/util/Optional;' : syntheticCls.getInternalName(),
	            getParamWordSize: function(): number {
	              return this.parameterTypes.length;
	            },
	            convertArgs: function(thread: JVMThread, params: any[]): any[] {
	              return params.length > 1 ? [thread, params[0], params[1]] : [thread, params[0]];
	            },
	            getNativeFunction: function(): Function {
	              var wrapperSignature = this.signature;
	              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): any {
	                if (wrapperSignature !== 'describeConstable()Ljava/util/Optional;') {
	                  return javaThis;
	                }
	                thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                thread.getBsCl().initializeClass(thread, 'Ljava/util/Optional;', (optionalCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                  if (optionalCls === null) {
	                    return;
	                  }
	                  var optionalCons = <any> optionalCls.getConstructor(thread);
	                  optionalCons['java/util/Optional/of(Ljava/lang/Object;)Ljava/util/Optional;'](thread, [javaThis], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
	                    if (e) {
	                      thread.throwException(e);
	                    } else {
	                      thread.asyncReturn(rv);
	                    }
	                  });
	                });
	                return null;
	              };
	            },
	            isSignaturePolymorphic: function(): boolean {
	              return false;
	            },
	            isHidden: function(): boolean {
	              return false;
	            },
	            isCallerSensitive: function(): boolean {
	              return false;
	            },
	            getFullSignature: function(): string {
	              return syntheticCls.getExternalName() + '.' + this.signature;
	            }
	          };
	          method = <Method> syntheticMethod;
	        } else if (syntheticCls.getInternalName() === 'Ljava/lang/String;' &&
	            (this.signature === 'isBlank()Z' ||
	             this.signature === 'strip()Ljava/lang/String;' ||
	             this.signature === 'stripLeading()Ljava/lang/String;' ||
	             this.signature === 'stripTrailing()Ljava/lang/String;' ||
	             this.signature === 'repeat(I)Ljava/lang/String;' ||
	             this.signature === 'indent(I)Ljava/lang/String;' ||
	             this.signature === 'transform(Ljava/util/function/Function;)Ljava/lang/Object;' ||
	             this.signature === 'formatted([Ljava/lang/Object;)Ljava/lang/String;' ||
	             this.signature === 'stripIndent()Ljava/lang/String;' ||
	             this.signature === 'translateEscapes()Ljava/lang/String;' ||
	             this.signature === 'lines()Ljava/util/stream/Stream;' ||
	             this.signature === 'describeConstable()Ljava/util/Optional;' ||
	             this.signature === 'resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/String;')) {
          syntheticMethod = {
            cls: syntheticCls,
            slot: -1,
            accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
            name: this.nameAndTypeInfo.name,
            rawDescriptor: this.nameAndTypeInfo.descriptor,
            attrs: [],
            signature: this.signature,
            fullSignature: syntheticFullSignature,
            parameterTypes: this.signature === 'repeat(I)Ljava/lang/String;' ||
	              this.signature === 'indent(I)Ljava/lang/String;' ? ['I'] :
	              this.signature === 'transform(Ljava/util/function/Function;)Ljava/lang/Object;' ? ['Ljava/util/function/Function;'] :
	              this.signature === 'formatted([Ljava/lang/Object;)Ljava/lang/String;' ? ['[Ljava/lang/Object;'] :
	              this.signature === 'resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/String;' ? ['Ljava/lang/invoke/MethodHandles$Lookup;'] : [],
	            returnType: this.signature === 'isBlank()Z' ? 'Z' :
	              this.signature === 'transform(Ljava/util/function/Function;)Ljava/lang/Object;' ? 'Ljava/lang/Object;' :
	              this.signature === 'lines()Ljava/util/stream/Stream;' ? 'Ljava/util/stream/Stream;' :
	              this.signature === 'describeConstable()Ljava/util/Optional;' ? 'Ljava/util/Optional;' : 'Ljava/lang/String;',
            getParamWordSize: function(): number {
              return this.parameterTypes.length;
            },
            convertArgs: function(thread: JVMThread, params: any[]): any[] {
              return params.length > 1 ? [thread, params[0], params[1]] : [thread, params[0]];
            },
            getNativeFunction: function(): Function {
              var stringSignature = this.signature,
                stringMethod = this;
              return function(thread: JVMThread, javaThis: JVMTypes.java_lang_String, count?: any): any {
                var value = javaThis.toString();
                if (stringSignature === 'isBlank()Z') {
                  return /^[\s\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]*$/.test(value);
                }
                if (stringSignature === 'strip()Ljava/lang/String;') {
                  return util.initString(thread.getBsCl(), value.replace(/^[\s\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\s\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g, ''));
                }
                if (stringSignature === 'stripLeading()Ljava/lang/String;') {
                  return util.initString(thread.getBsCl(), value.replace(/^[\s\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/, ''));
                }
	                if (stringSignature === 'stripTrailing()Ljava/lang/String;') {
	                  return util.initString(thread.getBsCl(), value.replace(/[\s\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/, ''));
	                }
	                if (stringSignature === 'describeConstable()Ljava/util/Optional;') {
	                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
	                  thread.getBsCl().initializeClass(thread, 'Ljava/util/Optional;', (optionalCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
	                    if (optionalCls === null) {
	                      return;
	                    }
	                    var optionalCons = <any> optionalCls.getConstructor(thread);
	                    optionalCons['java/util/Optional/of(Ljava/lang/Object;)Ljava/util/Optional;'](thread, [javaThis], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
	                      if (e) {
	                        thread.throwException(e);
	                      } else {
	                        thread.asyncReturn(rv);
	                      }
	                    });
	                  });
	                  return null;
	                }
	                if (stringSignature === 'resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/String;') {
	                  return javaThis;
	                }
	                if (stringSignature === 'transform(Ljava/util/function/Function;)Ljava/lang/Object;') {
	                  if (count === null) {
	                    thread.throwNewException('Ljava/lang/NullPointerException;', '');
                    return null;
                  }
                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
                  count['apply(Ljava/lang/Object;)Ljava/lang/Object;'](thread, [javaThis], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
                    if (e) {
                      thread.throwException(e);
                    } else {
                      thread.asyncReturn(rv);
                    }
                  });
                  return null;
                }
                if (stringSignature === 'formatted([Ljava/lang/Object;)Ljava/lang/String;') {
                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
                  var stringCons = <any> stringMethod.cls.getConstructor(thread);
                  stringCons['java/lang/String/format(Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/String;'](thread, [javaThis, count], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_String) => {
                    if (e) {
                      thread.throwException(e);
                    } else {
                      thread.asyncReturn(rv);
                    }
                  });
                  return null;
                }
                if (stringSignature === 'stripIndent()Ljava/lang/String;') {
                  if (value.length === 0) {
                    return util.initString(thread.getBsCl(), '');
                  }
                  var splitLines: string[] = [],
                    start = 0,
                    lastCode = value.charCodeAt(value.length - 1),
                    optOut = lastCode === 10 || lastCode === 13;
                  for (var i = 0; i < value.length; i++) {
                    var code = value.charCodeAt(i);
                    if (code === 10 || code === 13) {
                      splitLines.push(value.substring(start, i));
                      if (code === 13 && i + 1 < value.length && value.charCodeAt(i + 1) === 10) {
                        i++;
                      }
                      start = i + 1;
                    }
                  }
                  if (start < value.length) {
                    splitLines.push(value.substring(start));
                  }
                  var outdent = 0;
                  if (!optOut) {
                    outdent = 2147483647;
                    for (var lineIndex = 0; lineIndex < splitLines.length; lineIndex++) {
                      var line = splitLines[lineIndex],
                        firstNonWhitespace = 0;
                      while (firstNonWhitespace < line.length) {
                        var firstCode = line.charCodeAt(firstNonWhitespace);
                        if ((firstCode >= 9 && firstCode <= 13) || (firstCode >= 28 && firstCode <= 32) ||
                            firstCode === 0x1680 || (firstCode >= 0x2000 && firstCode <= 0x200a) ||
                            firstCode === 0x2028 || firstCode === 0x2029 || firstCode === 0x205f ||
                            firstCode === 0x3000) {
                          firstNonWhitespace++;
                        } else {
                          break;
                        }
                      }
                      if (firstNonWhitespace < line.length || lineIndex === splitLines.length - 1) {
                        outdent = Math.min(outdent, firstNonWhitespace);
                      }
                    }
                    if (outdent === 2147483647) {
                      outdent = 0;
                    }
                  }
                  var stripped = '';
                  for (var lineIndex = 0; lineIndex < splitLines.length; lineIndex++) {
                    var line = splitLines[lineIndex],
                      firstNonWhitespace = 0;
                    while (firstNonWhitespace < line.length) {
                      var firstCode = line.charCodeAt(firstNonWhitespace);
                      if ((firstCode >= 9 && firstCode <= 13) || (firstCode >= 28 && firstCode <= 32) ||
                          firstCode === 0x1680 || (firstCode >= 0x2000 && firstCode <= 0x200a) ||
                          firstCode === 0x2028 || firstCode === 0x2029 || firstCode === 0x205f ||
                          firstCode === 0x3000) {
                        firstNonWhitespace++;
                      } else {
                        break;
                      }
                    }
                    if (firstNonWhitespace === line.length) {
                      line = '';
                    } else {
                      line = line.substring(Math.min(outdent, firstNonWhitespace));
                      var trailing = line.length;
                      while (trailing > 0) {
                        var trailingCode = line.charCodeAt(trailing - 1);
                        if ((trailingCode >= 9 && trailingCode <= 13) || (trailingCode >= 28 && trailingCode <= 32) ||
                            trailingCode === 0x1680 || (trailingCode >= 0x2000 && trailingCode <= 0x200a) ||
                            trailingCode === 0x2028 || trailingCode === 0x2029 || trailingCode === 0x205f ||
                            trailingCode === 0x3000) {
                          trailing--;
                        } else {
                          break;
                        }
                      }
                      line = line.substring(0, trailing);
                    }
                    if (lineIndex > 0) {
                      stripped += '\n';
                    }
                    stripped += line;
                  }
                  if (optOut) {
                    stripped += '\n';
                  }
                  return util.initString(thread.getBsCl(), stripped);
                }
                if (stringSignature === 'translateEscapes()Ljava/lang/String;') {
                  var translated = '';
                  for (var i = 0; i < value.length; i++) {
                    var ch = value.charAt(i);
                    if (ch !== '\\') {
                      translated += ch;
                      continue;
                    }
                    if (++i >= value.length) {
                      thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'Invalid escape sequence.');
                      return null;
                    }
                    ch = value.charAt(i);
                    if (ch === 'b') {
                      translated += '\b';
                    } else if (ch === 't') {
                      translated += '\t';
                    } else if (ch === 'n') {
                      translated += '\n';
                    } else if (ch === 'f') {
                      translated += '\f';
                    } else if (ch === 'r') {
                      translated += '\r';
                    } else if (ch === 's') {
                      translated += ' ';
                    } else if (ch === '"' || ch === "'" || ch === '\\') {
                      translated += ch;
                    } else if (ch === '\n') {
                      continue;
                    } else if (ch === '\r') {
                      if (i + 1 < value.length && value.charAt(i + 1) === '\n') {
                        i++;
                      }
                    } else if (ch >= '0' && ch <= '7') {
                      var octal = ch;
                      if (i + 1 < value.length && value.charAt(i + 1) >= '0' && value.charAt(i + 1) <= '7') {
                        octal += value.charAt(++i);
                        if (ch >= '0' && ch <= '3' &&
                            i + 1 < value.length && value.charAt(i + 1) >= '0' && value.charAt(i + 1) <= '7') {
                          octal += value.charAt(++i);
                        }
                      }
                      translated += String.fromCharCode(parseInt(octal, 8));
                    } else {
                      thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'Invalid escape sequence.');
                      return null;
                    }
                  }
                  return util.initString(thread.getBsCl(), translated);
                }
                if (stringSignature === 'indent(I)Ljava/lang/String;') {
                  var indented = '',
                    start = 0;
                  while (start < value.length) {
                    var end = start;
                    while (end < value.length && value.charCodeAt(end) !== 10 && value.charCodeAt(end) !== 13) {
                      end++;
                    }
                    var line = value.substring(start, end);
                    if (count > 0) {
                      for (var i = 0; i < count; i++) {
                        indented += ' ';
                      }
                    } else if (count < 0) {
                      var removable = Math.min(-count, line.length),
                        removed = 0;
                      while (removed < removable) {
                        var code = line.charCodeAt(removed);
                        if ((code >= 9 && code <= 13) || (code >= 28 && code <= 32) ||
                            code === 0x1680 || (code >= 0x2000 && code <= 0x200a) ||
                            code === 0x2028 || code === 0x2029 || code === 0x205f ||
                            code === 0x3000) {
                          removed++;
                        } else {
                          break;
                        }
                      }
                      line = line.substring(removed);
                    }
                    indented += line + '\n';
                    if (end < value.length && value.charCodeAt(end) === 13 && end + 1 < value.length && value.charCodeAt(end + 1) === 10) {
                      start = end + 2;
                    } else {
                      start = end + 1;
                    }
                  }
                  return util.initString(thread.getBsCl(), indented);
                }
                if (stringSignature === 'lines()Ljava/util/stream/Stream;') {
                  var lines: JVMTypes.java_lang_Object[] = [],
                    start = 0;
                  for (var i = 0; i < value.length; i++) {
                    var code = value.charCodeAt(i);
                    if (code === 10 || code === 13) {
                      lines.push(util.initString(thread.getBsCl(), value.substring(start, i)));
                      if (code === 13 && i + 1 < value.length && value.charCodeAt(i + 1) === 10) {
                        i++;
                      }
                      start = i + 1;
                    }
                  }
                  if (start < value.length) {
                    lines.push(util.initString(thread.getBsCl(), value.substring(start)));
                  }
                  thread.setStatus(ThreadStatus.ASYNC_WAITING);
                  thread.getBsCl().initializeClass(thread, 'Ljava/util/stream/Stream;', (streamCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                    if (streamCls === null) {
                      return;
                    }
                    var streamCons = <any> streamCls.getConstructor(thread),
                      values = util.newArrayFromData<JVMTypes.java_lang_Object>(thread, thread.getBsCl(), '[Ljava/lang/Object;', lines);
                    streamCons['java/util/stream/Stream/of([Ljava/lang/Object;)Ljava/util/stream/Stream;'](thread, [values], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
                      if (e) {
                        thread.throwException(e);
                      } else {
                        thread.asyncReturn(rv);
                      }
                    });
                  });
                  return null;
                }
                if (count < 0) {
                  thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'count is negative');
                  return null;
                }
                var repeated = '';
                for (var i = 0; i < count; i++) {
                  repeated += value;
                }
                return util.initString(thread.getBsCl(), repeated);
              };
            },
            isSignaturePolymorphic: function(): boolean {
              return false;
            },
            isHidden: function(): boolean {
              return false;
            },
            isCallerSensitive: function(): boolean {
              return false;
            },
            getFullSignature: function(): string {
              return syntheticCls.getExternalName() + '.' + this.signature;
            }
          };
          method = <Method> syntheticMethod;
        }
      }
      if (method === null) {
        if (util.is_reference_type(cls.getInternalName())) {
          // Signature polymorphic lookup.
          method = (<ReferenceClassData<JVMTypes.java_lang_Object>> cls).signaturePolymorphicAwareMethodLookup(this.signature);
          if (method !== null && (method.name === 'invoke' || method.name === 'invokeExact')) {
            // In order to completely resolve the signature polymorphic function,
            // we need to resolve its MemberName object and Appendix.
            return this.resolveMemberName(method, thread, loader, caller, (status: boolean) => {
              if (status === true) {
                this.setResolved(thread, method);
              } else {
                thread.throwNewException('Ljava/lang/NoSuchMethodError;', `Method ${this.signature} does not exist in class ${this.classInfo.cls.getExternalName()}.`);
              }
              cb(status);
            });
          }
        }
      }
      if (method !== null) {
        if (caller !== null && !util.checkAccess(caller, method.cls, method.accessFlags)) {
          thread.throwNewException('Ljava/lang/IllegalAccessError;', `${caller.getExternalName()} cannot access ${method.cls.getExternalName()}.${method.name}`);
          cb(false);
        } else {
          this.setResolved(thread, method);
          cb(true);
        }
      } else {
        thread.throwNewException('Ljava/lang/NoSuchMethodError;', `Method ${this.signature} does not exist in class ${this.classInfo.cls.getExternalName()}.`);
        cb(false);
      }
    }
  }

  public setResolved(thread: JVMThread, method: Method): void {
    this.method = method;
    this.paramWordSize = util.getMethodDescriptorWordSize(this.nameAndTypeInfo.descriptor);
    this.fullSignature = this.method.fullSignature;
    this.jsConstructor = this.method.cls.getConstructor(thread);
    var resolvedBulkBufferInfo = (<{[name: string]: string[]}> {
        'Ljava/nio/ByteBuffer;': ['[B', 'B'],
        'Ljava/nio/CharBuffer;': ['[C', 'C'],
        'Ljava/nio/ShortBuffer;': ['[S', 'S'],
        'Ljava/nio/IntBuffer;': ['[I', 'I'],
        'Ljava/nio/LongBuffer;': ['[J', 'J'],
        'Ljava/nio/FloatBuffer;': ['[F', 'F'],
        'Ljava/nio/DoubleBuffer;': ['[D', 'D']
      })[this.method.cls.getInternalName()],
      resolvedBulkBufferClassName = this.method.cls.getInternalName(),
      resolvedBulkBufferFullPrefix = util.descriptor2typestr(resolvedBulkBufferClassName) + '/',
      resolvedBufferCovariantReturn = resolvedBulkBufferInfo !== undefined &&
        (this.fullSignature === resolvedBulkBufferFullPrefix + 'position(I)' + resolvedBulkBufferClassName ||
         this.fullSignature === resolvedBulkBufferFullPrefix + 'limit(I)' + resolvedBulkBufferClassName ||
         this.fullSignature === resolvedBulkBufferFullPrefix + 'mark()' + resolvedBulkBufferClassName ||
         this.fullSignature === resolvedBulkBufferFullPrefix + 'reset()' + resolvedBulkBufferClassName ||
         this.fullSignature === resolvedBulkBufferFullPrefix + 'clear()' + resolvedBulkBufferClassName ||
         this.fullSignature === resolvedBulkBufferFullPrefix + 'flip()' + resolvedBulkBufferClassName ||
         this.fullSignature === resolvedBulkBufferFullPrefix + 'rewind()' + resolvedBulkBufferClassName),
      resolvedNumberFormatCompact = this.fullSignature === 'java/text/NumberFormat/getCompactNumberInstance()Ljava/text/NumberFormat;' ||
        this.fullSignature === 'java/text/NumberFormat/getCompactNumberInstance(Ljava/util/Locale;Ljava/text/NumberFormat$Style;)Ljava/text/NumberFormat;',
      resolvedFileSystemsPathNewFileSystem = this.fullSignature === 'java/nio/file/FileSystems/newFileSystem(Ljava/nio/file/Path;)Ljava/nio/file/FileSystem;' ||
        this.fullSignature === 'java/nio/file/FileSystems/newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;)Ljava/nio/file/FileSystem;' ||
        this.fullSignature === 'java/nio/file/FileSystems/newFileSystem(Ljava/nio/file/Path;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;' ||
        this.fullSignature === 'java/nio/file/FileSystems/newFileSystem(Ljava/nio/file/Path;Ljava/util/Map;Ljava/lang/ClassLoader;)Ljava/nio/file/FileSystem;';
	    if ((this.fullSignature === 'java/lang/Thread/onSpinWait()V' ||
	        this.fullSignature === 'java/lang/Thread/sleep(Ljava/time/Duration;)V' ||
	        this.fullSignature === 'java/lang/ref/Reference/reachabilityFence(Ljava/lang/Object;)V' ||
	        this.fullSignature === 'java/lang/Math/multiplyFull(II)J' ||
	        this.fullSignature === 'java/lang/StrictMath/multiplyFull(II)J' ||
	        this.fullSignature === 'java/lang/Math/multiplyHigh(JJ)J' ||
	        this.fullSignature === 'java/lang/StrictMath/multiplyHigh(JJ)J' ||
	        this.fullSignature === 'java/lang/Math/unsignedMultiplyHigh(JJ)J' ||
	        this.fullSignature === 'java/lang/StrictMath/unsignedMultiplyHigh(JJ)J' ||
	        this.fullSignature === 'java/lang/Math/floorDiv(JI)J' ||
	        this.fullSignature === 'java/lang/StrictMath/floorDiv(JI)J' ||
	        this.fullSignature === 'java/lang/Math/floorMod(JI)I' ||
	        this.fullSignature === 'java/lang/StrictMath/floorMod(JI)I' ||
	        this.fullSignature === 'java/lang/Math/absExact(I)I' ||
	        this.fullSignature === 'java/lang/StrictMath/absExact(I)I' ||
	        this.fullSignature === 'java/lang/Math/absExact(J)J' ||
	        this.fullSignature === 'java/lang/StrictMath/absExact(J)J' ||
	        this.fullSignature === 'java/lang/Character/toString(I)Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/Runtime/version()Ljava/lang/Runtime$Version;' ||
	        this.fullSignature === 'java/lang/ClassLoader/getPlatformClassLoader()Ljava/lang/ClassLoader;' ||
	        this.fullSignature === 'java/lang/System/getLogger(Ljava/lang/String;)Ljava/lang/System$Logger;' ||
	        this.fullSignature === 'java/lang/System/getLogger(Ljava/lang/String;Ljava/util/ResourceBundle;)Ljava/lang/System$Logger;' ||
	        resolvedNumberFormatCompact ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/completedStage(Ljava/lang/Object;)Ljava/util/concurrent/CompletionStage;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/delayedExecutor(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/Executor;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/delayedExecutor(JLjava/util/concurrent/TimeUnit;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/Executor;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/failedFuture(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/failedStage(Ljava/lang/Throwable;)Ljava/util/concurrent/CompletionStage;' ||
	        resolvedFileSystemsPathNewFileSystem)
	        && (resolvedFileSystemsPathNewFileSystem || typeof this.jsConstructor[this.fullSignature] !== 'function')) {
	      var syntheticMethod = this.method;
	      this.jsConstructor[this.fullSignature] = this.jsConstructor[this.signature] = function(thread: JVMThread, args: any[]): void {
	        (<any> thread).stack.push(new NativeStackFrame(syntheticMethod, args));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/lang/Thread/threadId()J' ||
	        this.fullSignature === 'java/lang/Thread/isVirtual()Z') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticThreadMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticThreadMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/util/concurrent/CompletableFuture/completeAsync(Ljava/util/function/Supplier;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/completeAsync(Ljava/util/function/Supplier;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/completeOnTimeout(Ljava/lang/Object;JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/copy()Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/defaultExecutor()Ljava/util/concurrent/Executor;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/minimalCompletionStage()Ljava/util/concurrent/CompletionStage;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/newIncompleteFuture()Ljava/util/concurrent/CompletableFuture;' ||
	        this.fullSignature === 'java/util/concurrent/CompletableFuture/orTimeout(JLjava/util/concurrent/TimeUnit;)Ljava/util/concurrent/CompletableFuture;') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticCompletableFutureMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticCompletableFutureMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if (this.fullSignature === 'java/util/regex/Pattern/asMatchPredicate()Ljava/util/function/Predicate;' &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticPatternMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticPatternMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.signature === 'getName()Ljava/lang/String;' ||
	        this.signature === 'getUnnamedModule()Ljava/lang/Module;' ||
	        this.signature === 'isRegisteredAsParallelCapable()Z' ||
	        this.signature === 'getDefinedPackage(Ljava/lang/String;)Ljava/lang/Package;' ||
	        this.signature === 'getDefinedPackages()[Ljava/lang/Package;' ||
	        this.signature === 'resources(Ljava/lang/String;)Ljava/util/stream/Stream;') &&
	        this.method.cls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/ClassLoader;')) &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticClassLoaderMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticClassLoaderMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/util/regex/Matcher/results()Ljava/util/stream/Stream;' ||
	        this.fullSignature === 'java/util/regex/Matcher/replaceAll(Ljava/util/function/Function;)Ljava/lang/String;' ||
	        this.fullSignature === 'java/util/regex/Matcher/replaceFirst(Ljava/util/function/Function;)Ljava/lang/String;' ||
	        this.fullSignature === 'java/util/regex/Matcher/appendReplacement(Ljava/lang/StringBuilder;Ljava/lang/String;)Ljava/util/regex/Matcher;' ||
	        this.fullSignature === 'java/util/regex/Matcher/appendTail(Ljava/lang/StringBuilder;)Ljava/lang/StringBuilder;') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticMatcherMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticMatcherMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/lang/StackTraceElement/<init>(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V' ||
	        this.fullSignature === 'java/lang/StackTraceElement/getClassLoaderName()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/StackTraceElement/getModuleName()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/StackTraceElement/getModuleVersion()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/StackTraceElement/toString()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/StackTraceElement/equals(Ljava/lang/Object;)Z' ||
	        this.fullSignature === 'java/lang/StackTraceElement/hashCode()I')
	        && (this.method.cls.getInternalName() === 'Ljava/lang/StackTraceElement;' &&
	          (this.fullSignature === 'java/lang/StackTraceElement/toString()Ljava/lang/String;' ||
	           this.fullSignature === 'java/lang/StackTraceElement/equals(Ljava/lang/Object;)Z' ||
	           this.fullSignature === 'java/lang/StackTraceElement/hashCode()I') ||
	          typeof this.jsConstructor.prototype[this.fullSignature] !== 'function')) {
	      var syntheticStackTraceElementMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticStackTraceElementMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/util/Scanner/<init>(Ljava/io/InputStream;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/util/Scanner/<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/util/Scanner/<init>(Ljava/nio/file/Path;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/util/Scanner/<init>(Ljava/nio/channels/ReadableByteChannel;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/util/Scanner/tokens()Ljava/util/stream/Stream;' ||
	        this.fullSignature === 'java/util/Scanner/findAll(Ljava/util/regex/Pattern;)Ljava/util/stream/Stream;' ||
	        this.fullSignature === 'java/util/Scanner/findAll(Ljava/lang/String;)Ljava/util/stream/Stream;') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticScannerMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticScannerMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/io/PrintWriter/<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/io/PrintWriter/<init>(Ljava/lang/String;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/io/PrintWriter/<init>(Ljava/io/OutputStream;ZLjava/nio/charset/Charset;)V') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticPrintWriterMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticPrintWriterMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/io/PrintStream/<init>(Ljava/io/File;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/io/PrintStream/<init>(Ljava/lang/String;Ljava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/io/PrintStream/<init>(Ljava/io/OutputStream;ZLjava/nio/charset/Charset;)V' ||
	        this.fullSignature === 'java/io/PrintStream/writeBytes([B)V') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticPrintStreamMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticPrintStreamMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/io/ByteArrayOutputStream/toString(Ljava/nio/charset/Charset;)Ljava/lang/String;' ||
	        this.fullSignature === 'java/io/ByteArrayOutputStream/writeBytes([B)V')
	        && typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticByteArrayOutputStreamMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticByteArrayOutputStreamMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/lang/StringBuilder/compareTo(Ljava/lang/StringBuilder;)I' ||
	        this.fullSignature === 'java/lang/StringBuilder/compareTo(Ljava/lang/Object;)I' ||
	        this.fullSignature === 'java/lang/StringBuffer/compareTo(Ljava/lang/StringBuffer;)I' ||
	        this.fullSignature === 'java/lang/StringBuffer/compareTo(Ljava/lang/Object;)I')
	        && typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticAbstractStringBuilderMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticAbstractStringBuilderMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if (resolvedBufferCovariantReturn && typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticBufferCovariantReturnMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticBufferCovariantReturnMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if (resolvedBulkBufferInfo !== undefined &&
	        (this.fullSignature === resolvedBulkBufferFullPrefix + 'get(I' + resolvedBulkBufferInfo[0] + 'II)' + resolvedBulkBufferClassName ||
	        this.fullSignature === resolvedBulkBufferFullPrefix + 'get(I' + resolvedBulkBufferInfo[0] + ')' + resolvedBulkBufferClassName ||
	        this.fullSignature === resolvedBulkBufferFullPrefix + 'put(I' + resolvedBulkBufferInfo[0] + 'II)' + resolvedBulkBufferClassName ||
	        this.fullSignature === resolvedBulkBufferFullPrefix + 'put(I' + resolvedBulkBufferInfo[0] + ')' + resolvedBulkBufferClassName)
	        && typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticBulkBufferMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticBulkBufferMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/lang/Class/arrayType()Ljava/lang/Class;' ||
	        this.fullSignature === 'java/lang/Class/componentType()Ljava/lang/Class;' ||
	        this.fullSignature === 'java/lang/Class/descriptorString()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/Class/getPermittedSubclasses()[Ljava/lang/Class;' ||
	        this.fullSignature === 'java/lang/Class/getNestHost()Ljava/lang/Class;' ||
	        this.fullSignature === 'java/lang/Class/getNestMembers()[Ljava/lang/Class;' ||
	        this.fullSignature === 'java/lang/Class/getPackageName()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/Class/isSealed()Z' ||
	        this.fullSignature === 'java/lang/Class/isNestmateOf(Ljava/lang/Class;)Z' ||
	        this.fullSignature === 'java/lang/Class/isHidden()Z' ||
	        this.fullSignature === 'java/lang/Class/isRecord()Z' ||
	        this.fullSignature === 'java/lang/Class/describeConstable()Ljava/util/Optional;') &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticClassMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticClassMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if (this.method.signature === 'describeConstable()Ljava/util/Optional;' &&
	        this.method.cls.isSubclass(thread.getBsCl().getResolvedClass('Ljava/lang/Enum;')) &&
	        typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticEnumMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticEnumMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
		    } else if ((this.fullSignature === 'java/lang/Boolean/describeConstable()Ljava/util/Optional;' ||
		        this.fullSignature === 'java/lang/Byte/describeConstable()Ljava/util/Optional;' ||
		        this.fullSignature === 'java/lang/Short/describeConstable()Ljava/util/Optional;' ||
		        this.fullSignature === 'java/lang/Character/describeConstable()Ljava/util/Optional;' ||
		        this.fullSignature === 'java/lang/Integer/describeConstable()Ljava/util/Optional;' ||
	        this.fullSignature === 'java/lang/Integer/resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/Integer;' ||
	        this.fullSignature === 'java/lang/Long/describeConstable()Ljava/util/Optional;' ||
	        this.fullSignature === 'java/lang/Long/resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/Long;' ||
	        this.fullSignature === 'java/lang/Float/describeConstable()Ljava/util/Optional;' ||
	        this.fullSignature === 'java/lang/Float/resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/Float;' ||
	        this.fullSignature === 'java/lang/Double/describeConstable()Ljava/util/Optional;' ||
	        this.fullSignature === 'java/lang/Double/resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/Double;')
	        && typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
	      var syntheticWrapperMethod = this.method;
	      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
	        if (typeof cb === 'function') {
	          (<any> thread).stack.push(new InternalStackFrame(cb));
	        }
	        (<any> thread).stack.push(new NativeStackFrame(syntheticWrapperMethod, [this].concat(args)));
	        thread.setStatus(ThreadStatus.RUNNABLE);
	      };
	    } else if ((this.fullSignature === 'java/lang/String/isBlank()Z' ||
	        this.fullSignature === 'java/lang/String/strip()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/stripLeading()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/stripTrailing()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/repeat(I)Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/indent(I)Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/transform(Ljava/util/function/Function;)Ljava/lang/Object;' ||
	        this.fullSignature === 'java/lang/String/formatted([Ljava/lang/Object;)Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/stripIndent()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/translateEscapes()Ljava/lang/String;' ||
	        this.fullSignature === 'java/lang/String/lines()Ljava/util/stream/Stream;' ||
	        this.fullSignature === 'java/lang/String/describeConstable()Ljava/util/Optional;' ||
	        this.fullSignature === 'java/lang/String/resolveConstantDesc(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/String;')
	        && typeof this.jsConstructor.prototype[this.fullSignature] !== 'function') {
      var syntheticStringMethod = this.method;
      this.jsConstructor.prototype[this.fullSignature] = this.jsConstructor.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
        if (typeof cb === 'function') {
          (<any> thread).stack.push(new InternalStackFrame(cb));
        }
        (<any> thread).stack.push(new NativeStackFrame(syntheticStringMethod, [this].concat(args)));
        thread.setStatus(ThreadStatus.RUNNABLE);
      };
    }
  }

  public isResolved() { return this.method !== null; }
  public getParamWordSize(): number {
    if (this.paramWordSize === -1) {
      this.paramWordSize = util.getMethodDescriptorWordSize(this.nameAndTypeInfo.descriptor);
    }
    return this.paramWordSize;
  }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var classIndex = byteStream.getUint16(),
      nameAndTypeIndex = byteStream.getUint16(),
      classInfo = <ClassReference> constantPool.get(classIndex),
      nameAndTypeInfo = <NameAndTypeInfo> constantPool.get(nameAndTypeIndex);
    assert(classInfo.getType() === ConstantPoolItemType.CLASS &&
      nameAndTypeInfo.getType() === ConstantPoolItemType.NAME_AND_TYPE,
      'ConstantPool MethodReference types mismatch');
    return new this(classInfo, nameAndTypeInfo);
  }
}
CP_CLASSES[ConstantPoolItemType.METHODREF] = MethodReference;

/**
 * Represents a particular interface method.
 * ```
 * CONSTANT_InterfaceMethodref_info {
 *   u1 tag;
 *   u2 class_index;
 *   u2 name_and_type_index;
 * }
 * ```
 */
export class InterfaceMethodReference implements IConstantPoolItem {
  public classInfo: ClassReference;
  public nameAndTypeInfo: NameAndTypeInfo;
  /**
   * The signature of the method, without the owning class.
   * e.g. foo(IJ)V
   */
  public signature: string;
  /**
   * The signature of the method, including the owning class.
   * e.g. bar/Baz/foo(IJ)V
   */
  public fullSignature: string = null;
  public method: Method = null;
  public paramWordSize: number = -1;
  public jsConstructor: any = null;
  constructor(classInfo: ClassReference, nameAndTypeInfo: NameAndTypeInfo) {
    this.classInfo = classInfo;
    this.nameAndTypeInfo = nameAndTypeInfo;
    this.signature = this.nameAndTypeInfo.name + this.nameAndTypeInfo.descriptor;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.INTERFACE_METHODREF;
  }

  /**
   * Checks the method referenced by this constant pool item in the specified
   * bytecode context.
   * Returns null if an error occurs.
   * - Throws a NoSuchFieldError if missing.
   * - Throws an IllegalAccessError if field is inaccessible.
   * - Throws an IncompatibleClassChangeError if the field is an incorrect type
   *   for the field access.
   */
  public hasAccess(thread: JVMThread, frame: BytecodeStackFrame, isStatic: boolean): boolean {
    var method = this.method, accessingCls = frame.method.cls;
    if (method.accessFlags.isStatic() !== isStatic) {
      thread.throwNewException('Ljava/lang/IncompatibleClassChangeError;', `Method ${method.name} from class ${method.cls.getExternalName()} is ${isStatic ? 'not ' : ''}static.`);
      frame.returnToThreadLoop = true;
      return false;
    } else if (!util.checkAccess(accessingCls, method.cls, method.accessFlags)) {
      thread.throwNewException('Ljava/lang/IllegalAccessError;', `${accessingCls.getExternalName()} cannot access ${method.cls.getExternalName()}.${method.name}`);
      frame.returnToThreadLoop = true;
      return false;
    }
    return true;
  }

  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void, explicit: boolean = true) {
    if (!this.classInfo.isResolved()) {
      this.classInfo.resolve(thread, loader, caller, (status: boolean) => {
        if (!status) {
          cb(false);
        } else {
          this.resolve(thread, loader, caller, cb, explicit);
        }
      }, explicit);
    } else {
      var cls = this.classInfo.cls,
        method = cls.methodLookup(this.signature),
        syntheticMethod: any;
      this.paramWordSize = util.getMethodDescriptorWordSize(this.nameAndTypeInfo.descriptor);
      if (method === null && cls.getInternalName() === 'Ljava/util/concurrent/CompletionStage;' &&
          (this.signature === 'exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;' ||
           this.signature === 'exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;' ||
           this.signature === 'exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;' ||
           this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;' ||
           this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;')) {
        var syntheticCls = <ReferenceClassData<JVMTypes.java_lang_Object>> cls,
          syntheticFullSignature = util.descriptor2typestr(cls.getInternalName()) + '/' + this.signature;
        syntheticMethod = {
          cls: syntheticCls,
          slot: -1,
          accessFlags: new util.Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
          name: this.nameAndTypeInfo.name,
          rawDescriptor: this.nameAndTypeInfo.descriptor,
          attrs: [],
          signature: this.signature,
          fullSignature: syntheticFullSignature,
          parameterTypes: (this.signature === 'exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;' ||
            this.signature === 'exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;') ?
            ['Ljava/util/function/Function;', 'Ljava/util/concurrent/Executor;'] : ['Ljava/util/function/Function;'],
          returnType: 'Ljava/util/concurrent/CompletionStage;',
          getParamWordSize: function(): number {
            return util.getMethodDescriptorWordSize(this.rawDescriptor);
          },
          convertArgs: function(thread: JVMThread, params: any[]): any[] {
            return [thread].concat(params);
          },
          getNativeFunction: function(): Function {
            var completionStageSignature = this.signature;
            return function(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, arg1?: JVMTypes.java_lang_Object, arg2?: JVMTypes.java_lang_Object): any {
              thread.setStatus(ThreadStatus.ASYNC_WAITING);
              thread.getBsCl().initializeClass(thread, 'Ljava/util/concurrent/CompletableFuture$DoppioFactories;', (factoriesCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                if (factoriesCls === null) {
                  return;
                }
                var factoriesCons = <any> factoriesCls.getConstructor(thread),
                  helperArgs = [javaThis],
                  helperSignature: string;
                if (completionStageSignature === 'exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;') {
                  helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;';
                  helperArgs.push(arg1);
                } else if (completionStageSignature === 'exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;') {
                  helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;';
                  helperArgs.push(arg1, arg2);
                } else if (completionStageSignature === 'exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;') {
                  helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyCompose(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;';
                  helperArgs.push(arg1);
                } else if (completionStageSignature === 'exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;') {
                  helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyComposeAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;)Ljava/util/concurrent/CompletableFuture;';
                  helperArgs.push(arg1);
                } else {
                  helperSignature = 'java/util/concurrent/CompletableFuture$DoppioFactories/exceptionallyComposeAsync(Ljava/util/concurrent/CompletableFuture;Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletableFuture;';
                  helperArgs.push(arg1, arg2);
                }
                factoriesCons[helperSignature](thread, helperArgs, (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_Object) => {
                  if (e) {
                    thread.throwException(e);
                  } else {
                    thread.asyncReturn(rv);
                  }
                });
              });
              return null;
            };
          },
          isSignaturePolymorphic: function(): boolean {
            return false;
          },
          isHidden: function(): boolean {
            return false;
          },
          isCallerSensitive: function(): boolean {
            return false;
          },
          getFullSignature: function(): string {
            return syntheticCls.getExternalName() + '.' + this.signature;
          }
        };
        method = <Method> syntheticMethod;
      }
      if (method !== null) {
        if (caller !== null && !util.checkAccess(caller, method.cls, method.accessFlags)) {
          thread.throwNewException('Ljava/lang/IllegalAccessError;', `${caller.getExternalName()} cannot access ${method.cls.getExternalName()}.${method.name}`);
          cb(false);
        } else {
          this.setResolved(thread, method);
          cb(true);
        }
      } else {
        thread.throwNewException('Ljava/lang/NoSuchMethodError;', `Method ${this.signature} does not exist in class ${this.classInfo.cls.getExternalName()}.`);
        cb(false);
      }
    }
  }

  public setResolved(thread: JVMThread, method: Method): void {
    this.method = method;
    this.paramWordSize = util.getMethodDescriptorWordSize(this.nameAndTypeInfo.descriptor);
    this.fullSignature = this.method.fullSignature;
    this.jsConstructor = this.method.cls.getConstructor(thread);
    if ((this.fullSignature === 'java/util/concurrent/CompletionStage/exceptionallyAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;' ||
        this.fullSignature === 'java/util/concurrent/CompletionStage/exceptionallyAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;' ||
        this.fullSignature === 'java/util/concurrent/CompletionStage/exceptionallyCompose(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;' ||
        this.fullSignature === 'java/util/concurrent/CompletionStage/exceptionallyComposeAsync(Ljava/util/function/Function;)Ljava/util/concurrent/CompletionStage;' ||
        this.fullSignature === 'java/util/concurrent/CompletionStage/exceptionallyComposeAsync(Ljava/util/function/Function;Ljava/util/concurrent/Executor;)Ljava/util/concurrent/CompletionStage;')) {
      var completableFutureCls = <ReferenceClassData<JVMTypes.java_lang_Object>> thread.getBsCl().getInitializedClass(thread, 'Ljava/util/concurrent/CompletableFuture;');
      if (completableFutureCls !== null) {
        var syntheticCompletionStageMethod = this.method,
          completableFutureCons = <any> completableFutureCls.getConstructor(thread);
        completableFutureCons.prototype[this.fullSignature] = completableFutureCons.prototype[this.signature] = function(thread: JVMThread, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void): void {
          if (typeof cb === 'function') {
            (<any> thread).stack.push(new InternalStackFrame(cb));
          }
          (<any> thread).stack.push(new NativeStackFrame(syntheticCompletionStageMethod, [this].concat(args)));
          thread.setStatus(ThreadStatus.RUNNABLE);
        };
      }
    }
  }

  public getParamWordSize(): number {
    if (this.paramWordSize === -1) {
      this.paramWordSize = util.getMethodDescriptorWordSize(this.nameAndTypeInfo.descriptor);
    }
    return this.paramWordSize;
  }

  public isResolved() { return this.method !== null; }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var classIndex = byteStream.getUint16(),
      nameAndTypeIndex = byteStream.getUint16(),
      classInfo = <ClassReference> constantPool.get(classIndex),
      nameAndTypeInfo = <NameAndTypeInfo> constantPool.get(nameAndTypeIndex);
    assert(classInfo.getType() === ConstantPoolItemType.CLASS &&
      nameAndTypeInfo.getType() === ConstantPoolItemType.NAME_AND_TYPE,
      'ConstantPool InterfaceMethodReference types mismatch');
    return new this(classInfo, nameAndTypeInfo);
  }
}
CP_CLASSES[ConstantPoolItemType.INTERFACE_METHODREF] = InterfaceMethodReference;

/**
 * Represents a particular field.
 * ```
 * CONSTANT_Fieldref_info {
 *   u1 tag;
 *   u2 class_index;
 *   u2 name_and_type_index;
 * }
 * ```
 */
export class FieldReference implements IConstantPoolItem {
  public classInfo: ClassReference;
  public nameAndTypeInfo: NameAndTypeInfo;
  public field: Field = null;
  /**
   * The full name of the field, including the owning class.
   * e.g. java/lang/String/value
   */
  public fullFieldName: string = null;
  /**
   * The constructor for the field owner. Used for static fields.
   */
  public fieldOwnerConstructor: any = null;
  constructor(classInfo: ClassReference, nameAndTypeInfo: NameAndTypeInfo) {
    this.classInfo = classInfo;
    this.nameAndTypeInfo = nameAndTypeInfo;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.FIELDREF;
  }

  /**
   * Checks the field referenced by this constant pool item in the specified
   * bytecode context.
   * Returns null if an error occurs.
   * - Throws a NoSuchFieldError if missing.
   * - Throws an IllegalAccessError if field is inaccessible.
   * - Throws an IncompatibleClassChangeError if the field is an incorrect type
   *   for the field access.
   */
  public hasAccess(thread: JVMThread, frame: BytecodeStackFrame, isStatic: boolean): boolean {
    var field = this.field, accessingCls = frame.method.cls;
    if (field.accessFlags.isStatic() !== isStatic) {
      thread.throwNewException('Ljava/lang/IncompatibleClassChangeError;', `Field ${name} from class ${field.cls.getExternalName()} is ${isStatic ? 'not ' : ''}static.`);
      frame.returnToThreadLoop = true;
      return false;
    } else if (!util.checkAccess(accessingCls, field.cls, field.accessFlags)) {
      thread.throwNewException('Ljava/lang/IllegalAccessError;', `${accessingCls.getExternalName()} cannot access ${field.cls.getExternalName()}.${name}`);
      frame.returnToThreadLoop = true;
      return false;
    }
    return true;
  }

  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void, explicit: boolean = true) {
    if (!this.classInfo.isResolved()) {
      this.classInfo.resolve(thread, loader, caller, (status: boolean) => {
        if (!status) {
          cb(false);
        } else {
          this.resolve(thread, loader, caller, cb, explicit);
        }
      }, explicit);
    } else {
      var cls = this.classInfo.cls,
        field = cls.fieldLookup(this.nameAndTypeInfo.name);
      if (field !== null) {
        if (caller !== null && !util.checkAccess(caller, field.cls, field.accessFlags)) {
          thread.throwNewException('Ljava/lang/IllegalAccessError;', `${caller.getExternalName()} cannot access ${field.cls.getExternalName()}.${field.name}`);
          cb(false);
        } else {
          this.fullFieldName = `${util.descriptor2typestr(field.cls.getInternalName())}/${field.name}`;
          this.field = field;
          cb(true);
        }
      } else {
        thread.throwNewException('Ljava/lang/NoSuchFieldError;', `Field ${this.nameAndTypeInfo.name} does not exist in class ${this.classInfo.cls.getExternalName()}.`);
        cb(false);
      }
    }
  }

  public isResolved() { return this.field !== null; }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var classIndex = byteStream.getUint16(),
      nameAndTypeIndex = byteStream.getUint16(),
      classInfo = <ClassReference> constantPool.get(classIndex),
      nameAndTypeInfo = <NameAndTypeInfo> constantPool.get(nameAndTypeIndex);
    assert(classInfo.getType() === ConstantPoolItemType.CLASS &&
      nameAndTypeInfo.getType() === ConstantPoolItemType.NAME_AND_TYPE,
      'ConstantPool FieldReference types mismatch');
    return new this(classInfo, nameAndTypeInfo);
  }
}
CP_CLASSES[ConstantPoolItemType.FIELDREF] = FieldReference;

/**
 * Represents a dynamically-computed constant.
 * ```
 * CONSTANT_Dynamic_info {
 *   u1 tag;
 *   u2 bootstrap_method_attr_index;
 *   u2 name_and_type_index;
 * }
 * ```
 */
export class DynamicConstant implements IConstantPoolItem {
  public bootstrapMethodAttrIndex: number;
  public nameAndTypeInfo: NameAndTypeInfo;
  private value: any = null;
  private resolved: boolean = false;

  constructor(bootstrapMethodAttrIndex: number, nameAndTypeInfo: NameAndTypeInfo) {
    this.bootstrapMethodAttrIndex = bootstrapMethodAttrIndex;
    this.nameAndTypeInfo = nameAndTypeInfo;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.DYNAMIC;
  }

  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void) {
    var bootstrapMethod = caller.getBootstrapMethod(this.bootstrapMethodAttrIndex),
      bootstrapRef = bootstrapMethod[0].getReference();
    if (bootstrapRef.classInfo.name === 'Ljava/lang/invoke/ConstantBootstraps;' &&
        bootstrapRef.nameAndTypeInfo.name === 'nullConstant') {
      this.value = null;
      this.resolved = true;
      setImmediate(() => cb(true));
    } else if (bootstrapRef.classInfo.name === 'Ljava/lang/invoke/ConstantBootstraps;' &&
        bootstrapRef.nameAndTypeInfo.name === 'primitiveClass') {
      if (['Z', 'B', 'C', 'S', 'I', 'J', 'F', 'D', 'V'].indexOf(this.nameAndTypeInfo.name) === -1) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;',
          `Invalid primitive descriptor for CONSTANT_Dynamic: ${this.nameAndTypeInfo.name}`);
        cb(false);
      } else {
        this.value = loader.getInitializedClass(thread, this.nameAndTypeInfo.name).getClassObject(thread);
        this.resolved = true;
        setImmediate(() => cb(true));
      }
    } else if (bootstrapRef.classInfo.name === 'Ljava/lang/invoke/ConstantBootstraps;' &&
        bootstrapRef.nameAndTypeInfo.name === 'enumConstant') {
      loader.resolveClass(thread, this.nameAndTypeInfo.descriptor, (enumCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (enumCls === null) {
          cb(false);
        } else {
          enumCls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
            if (cdata === null) {
              cb(false);
            } else {
              var field = cdata.fieldLookup(this.nameAndTypeInfo.name);
              if (field === null || !field.accessFlags.isStatic() || !util.checkAccess(caller, field.cls, field.accessFlags)) {
                thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                  `Cannot resolve enum CONSTANT_Dynamic: ${cdata.getExternalName()}.${this.nameAndTypeInfo.name}`);
                cb(false);
              } else {
                this.value = (<any> cdata.getConstructor(thread))[field.fullName];
                this.resolved = true;
                cb(true);
              }
            }
          }, false);
        }
      }, false);
    } else if (bootstrapRef.classInfo.name === 'Ljava/lang/invoke/ConstantBootstraps;' &&
        bootstrapRef.nameAndTypeInfo.name === 'getStaticFinal') {
      var fieldOwner: ReferenceClassData<JVMTypes.java_lang_Object> = caller;
      if (bootstrapMethod[1].length > 0) {
        if (bootstrapMethod[1][0].getType() !== ConstantPoolItemType.CLASS) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'getStaticFinal CONSTANT_Dynamic requires a Class static argument');
          cb(false);
          return;
        }
        var classArg = <ClassReference> bootstrapMethod[1][0];
        if (!classArg.isResolved()) {
          classArg.resolve(thread, loader, caller, (status: boolean) => {
            if (status) {
              this.resolve(thread, loader, caller, cb);
            } else {
              cb(false);
            }
          }, false);
          return;
        }
        fieldOwner = <ReferenceClassData<JVMTypes.java_lang_Object>> classArg.cls;
      }
      fieldOwner.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (cdata === null) {
          cb(false);
        } else {
          var field = cdata.fieldLookup(this.nameAndTypeInfo.name);
          if (field === null || !field.accessFlags.isStatic() || !field.accessFlags.isFinal() ||
              !util.checkAccess(caller, field.cls, field.accessFlags)) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `Cannot resolve static final CONSTANT_Dynamic: ${cdata.getExternalName()}.${this.nameAndTypeInfo.name}`);
            cb(false);
          } else {
            this.value = (<any> cdata.getConstructor(thread))[field.fullName];
            this.resolved = true;
            cb(true);
          }
        }
      }, false);
    } else if (bootstrapRef.classInfo.name === 'Ljava/lang/invoke/ConstantBootstraps;' &&
        bootstrapRef.nameAndTypeInfo.name === 'explicitCast') {
      if (bootstrapMethod[1].length !== 1) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'explicitCast CONSTANT_Dynamic requires one static argument');
        cb(false);
        return;
      }
      var castArg = bootstrapMethod[1][0];
      if (!castArg.isResolved()) {
        castArg.resolve(thread, loader, caller, (status: boolean) => {
          if (status) {
            this.resolve(thread, loader, caller, cb);
          } else {
            cb(false);
          }
        }, false);
        return;
      }
      if (['Z', 'B', 'C', 'S', 'I', 'J', 'F', 'D'].indexOf(this.nameAndTypeInfo.descriptor) !== -1) {
        var argType = castArg.getType();
        if ([ConstantPoolItemType.INTEGER, ConstantPoolItemType.LONG, ConstantPoolItemType.FLOAT, ConstantPoolItemType.DOUBLE].indexOf(argType) === -1) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;',
            `primitive explicitCast CONSTANT_Dynamic requires a primitive constant argument, got ${ConstantPoolItemType[argType]}`);
          cb(false);
          return;
        }
        var argValue = castArg.getConstant(thread),
          intValue: number;
        switch (argType) {
          case ConstantPoolItemType.INTEGER:
            intValue = argValue | 0;
            break;
          case ConstantPoolItemType.LONG:
            intValue = (<gLong> argValue).toInt();
            break;
          case ConstantPoolItemType.FLOAT:
          case ConstantPoolItemType.DOUBLE:
            intValue = util.float2int(argValue);
            break;
        }
        switch (this.nameAndTypeInfo.descriptor) {
          case 'Z':
            this.value = (intValue & 1) === 1 ? 1 : 0;
            break;
          case 'B':
            this.value = (intValue << 24) >> 24;
            break;
          case 'C':
            this.value = intValue & 0xffff;
            break;
          case 'S':
            this.value = (intValue << 16) >> 16;
            break;
          case 'I':
            this.value = intValue;
            break;
          case 'J':
            if (argType === ConstantPoolItemType.LONG) {
              this.value = argValue;
            } else if (argValue === Number.POSITIVE_INFINITY) {
              this.value = gLong.MAX_VALUE;
            } else if (argValue === Number.NEGATIVE_INFINITY) {
              this.value = gLong.MIN_VALUE;
            } else if (argType === ConstantPoolItemType.INTEGER) {
              this.value = gLong.fromInt(argValue);
            } else {
              this.value = gLong.fromNumber(argValue);
            }
            break;
          case 'F':
            if (argType === ConstantPoolItemType.LONG) {
              this.value = util.wrapFloat((<gLong> argValue).toNumber());
            } else {
              this.value = util.wrapFloat(argValue);
            }
            break;
          case 'D':
            if (argType === ConstantPoolItemType.LONG) {
              this.value = (<gLong> argValue).toNumber();
            } else {
              this.value = argValue;
            }
            break;
        }
        this.resolved = true;
        setImmediate(() => cb(true));
        return;
      }
      var castValue = castArg.getConstant(thread);
      if (castValue === null) {
        this.value = null;
        this.resolved = true;
        setImmediate(() => cb(true));
      } else {
        loader.resolveClass(thread, this.nameAndTypeInfo.descriptor, (targetCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
          if (targetCls === null) {
            cb(false);
          } else if (!castValue.getClass().isCastable(targetCls)) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `Cannot cast CONSTANT_Dynamic value to ${targetCls.getExternalName()}`);
            cb(false);
          } else {
            this.value = castValue;
            this.resolved = true;
            cb(true);
          }
        }, false);
      }
    } else if (bootstrapRef.classInfo.name === 'Ljava/lang/invoke/ConstantBootstraps;' &&
        bootstrapRef.nameAndTypeInfo.name === 'invoke') {
      var invokeStaticArgs = bootstrapMethod[1];
      if (invokeStaticArgs.length < 1 || invokeStaticArgs[0].getType() !== ConstantPoolItemType.METHOD_HANDLE) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic requires a MethodHandle static argument');
        cb(false);
        return;
      }

      var targetHandle = <MethodHandle> invokeStaticArgs[0],
        targetRef = targetHandle.getReference(),
        targetRefKind = targetHandle.getReferenceType();
      if (targetRef.getType() === ConstantPoolItemType.FIELDREF) {
        if (targetRefKind !== MethodHandleReferenceKind.GETSTATIC &&
            targetRefKind !== MethodHandleReferenceKind.GETFIELD &&
            targetRefKind !== MethodHandleReferenceKind.PUTSTATIC &&
            targetRefKind !== MethodHandleReferenceKind.PUTFIELD) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic only supports field getter/setter handles');
          cb(false);
          return;
        }

        var targetFieldRef = <FieldReference> targetRef;
        if (!targetFieldRef.isResolved()) {
          targetFieldRef.resolve(thread, loader, caller, (status: boolean) => {
            if (status) {
              this.resolve(thread, loader, caller, cb);
            } else {
              cb(false);
            }
          }, false);
          return;
        }

        var targetField = targetFieldRef.field,
          fieldReturnDescriptor = this.nameAndTypeInfo.descriptor,
          referenceFieldReturn = (targetField.rawDescriptor[0] === 'L' || targetField.rawDescriptor[0] === '[') &&
            (fieldReturnDescriptor[0] === 'L' || fieldReturnDescriptor[0] === '['),
          primitiveFieldBoxReturn = ['Z', 'B', 'C', 'S', 'I', 'J', 'F', 'D'].indexOf(targetField.rawDescriptor) !== -1 &&
            (fieldReturnDescriptor[0] === 'L' || fieldReturnDescriptor[0] === '['),
          primitiveFieldReturnWiden = false;
        if (util.is_primitive_type(targetField.rawDescriptor) && util.is_primitive_type(fieldReturnDescriptor) &&
            targetField.rawDescriptor !== fieldReturnDescriptor) {
          switch (targetField.rawDescriptor) {
            case 'B':
              primitiveFieldReturnWiden = ['S', 'I', 'J', 'F', 'D'].indexOf(fieldReturnDescriptor) !== -1;
              break;
            case 'S':
              primitiveFieldReturnWiden = ['I', 'J', 'F', 'D'].indexOf(fieldReturnDescriptor) !== -1;
              break;
            case 'C':
              primitiveFieldReturnWiden = ['I', 'J', 'F', 'D'].indexOf(fieldReturnDescriptor) !== -1;
              break;
            case 'I':
              primitiveFieldReturnWiden = ['J', 'F', 'D'].indexOf(fieldReturnDescriptor) !== -1;
              break;
            case 'J':
              primitiveFieldReturnWiden = ['F', 'D'].indexOf(fieldReturnDescriptor) !== -1;
              break;
            case 'F':
              primitiveFieldReturnWiden = fieldReturnDescriptor === 'D';
              break;
            default:
              break;
          }
        }
        if (targetRefKind === MethodHandleReferenceKind.PUTSTATIC) {
          if (invokeStaticArgs.length !== 2) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic static field setter requires a value');
            cb(false);
            return;
          } else if (!targetField.accessFlags.isStatic()) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic target field must be static');
            cb(false);
            return;
          } else if (fieldReturnDescriptor[0] !== 'L' && fieldReturnDescriptor[0] !== '[') {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic field setter returns null and requires a reference dynamic constant');
            cb(false);
            return;
          }

          var putStaticArg = invokeStaticArgs[1];
          if (!putStaticArg.isResolved()) {
            putStaticArg.resolve(thread, loader, caller, (status: boolean) => {
              if (status) {
                this.resolve(thread, loader, caller, cb);
              } else {
                cb(false);
              }
            }, false);
            return;
          }

          var putStaticValue: any;
          switch (putStaticArg.getType()) {
          case ConstantPoolItemType.CLASS:
          case ConstantPoolItemType.DYNAMIC:
          case ConstantPoolItemType.METHOD_HANDLE:
          case ConstantPoolItemType.METHOD_TYPE:
          case ConstantPoolItemType.STRING:
          case ConstantPoolItemType.INTEGER:
          case ConstantPoolItemType.LONG:
          case ConstantPoolItemType.FLOAT:
          case ConstantPoolItemType.DOUBLE:
            putStaticValue = putStaticArg.getConstant(thread);
            break;
          default:
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `Unsupported invoke CONSTANT_Dynamic static field setter argument: ${ConstantPoolItemType[putStaticArg.getType()]}`);
            cb(false);
            return;
          }

          if (targetField.rawDescriptor[0] === 'L' || targetField.rawDescriptor[0] === '[') {
            if (putStaticValue !== null) {
              loader.resolveClass(thread, targetField.rawDescriptor, (targetCls: any) => {
                if (targetCls === null) {
                  cb(false);
                } else if (!putStaticValue.getClass().isCastable(targetCls)) {
                  thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                    `invoke CONSTANT_Dynamic field setter argument cannot be cast to ${targetCls.getExternalName()}`);
                  cb(false);
                } else {
                  targetField.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                    if (cdata === null) {
                      cb(false);
                    } else {
                      (<any> cdata.getConstructor(thread))[targetFieldRef.fullFieldName] = putStaticValue;
                      this.value = null;
                      this.resolved = true;
                      cb(true);
                    }
                  }, false);
                }
              }, false);
            } else {
              targetField.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
                if (cdata === null) {
                  cb(false);
                } else {
                  (<any> cdata.getConstructor(thread))[targetFieldRef.fullFieldName] = putStaticValue;
                  this.value = null;
                  this.resolved = true;
                  cb(true);
                }
              }, false);
            }
            return;
          }

          if (putStaticValue !== null && typeof putStaticValue === 'object' && typeof putStaticValue.unbox === 'function') {
            putStaticValue = putStaticValue.unbox();
          }
          if (targetField.rawDescriptor === 'J' && !(putStaticValue instanceof gLong)) {
            putStaticValue = gLong.fromNumber(putStaticValue);
          } else if (targetField.rawDescriptor === 'F') {
            putStaticValue = util.wrapFloat(putStaticValue instanceof gLong ? putStaticValue.toNumber() : putStaticValue);
          } else if (targetField.rawDescriptor === 'D' && putStaticValue instanceof gLong) {
            putStaticValue = putStaticValue.toNumber();
          }
          targetField.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
            if (cdata === null) {
              cb(false);
            } else {
              (<any> cdata.getConstructor(thread))[targetFieldRef.fullFieldName] = putStaticValue;
              this.value = null;
              this.resolved = true;
              cb(true);
            }
          }, false);
          return;
        }

        if (targetRefKind === MethodHandleReferenceKind.PUTFIELD) {
          if (invokeStaticArgs.length !== 3) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic instance field setter requires a receiver and value');
            cb(false);
            return;
          } else if (targetField.accessFlags.isStatic()) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic target field must be an instance field');
            cb(false);
            return;
          } else if (fieldReturnDescriptor[0] !== 'L' && fieldReturnDescriptor[0] !== '[') {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic field setter returns null and requires a reference dynamic constant');
            cb(false);
            return;
          }

          var putFieldReceiverArg = invokeStaticArgs[1];
          if (!putFieldReceiverArg.isResolved()) {
            putFieldReceiverArg.resolve(thread, loader, caller, (status: boolean) => {
              if (status) {
                this.resolve(thread, loader, caller, cb);
              } else {
                cb(false);
              }
            }, false);
            return;
          }

          var putFieldValueArg = invokeStaticArgs[2];
          if (!putFieldValueArg.isResolved()) {
            putFieldValueArg.resolve(thread, loader, caller, (status: boolean) => {
              if (status) {
                this.resolve(thread, loader, caller, cb);
              } else {
                cb(false);
              }
            }, false);
            return;
          }

          var putFieldReceiver: any;
          switch (putFieldReceiverArg.getType()) {
            case ConstantPoolItemType.CLASS:
            case ConstantPoolItemType.DYNAMIC:
            case ConstantPoolItemType.METHOD_HANDLE:
            case ConstantPoolItemType.METHOD_TYPE:
            case ConstantPoolItemType.STRING:
              putFieldReceiver = putFieldReceiverArg.getConstant(thread);
              break;
            default:
              thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                `Unsupported invoke CONSTANT_Dynamic field setter receiver argument: ${ConstantPoolItemType[putFieldReceiverArg.getType()]}`);
              cb(false);
              return;
          }

          if (putFieldReceiver === null) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic instance field setter receiver is null');
            cb(false);
            return;
          } else if (!putFieldReceiver.getClass().isCastable(targetField.cls)) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `invoke CONSTANT_Dynamic field setter receiver cannot be cast to ${targetField.cls.getExternalName()}`);
            cb(false);
            return;
          }

          var putFieldValue: any;
          switch (putFieldValueArg.getType()) {
          case ConstantPoolItemType.CLASS:
          case ConstantPoolItemType.DYNAMIC:
          case ConstantPoolItemType.METHOD_HANDLE:
          case ConstantPoolItemType.METHOD_TYPE:
          case ConstantPoolItemType.STRING:
          case ConstantPoolItemType.INTEGER:
          case ConstantPoolItemType.LONG:
          case ConstantPoolItemType.FLOAT:
          case ConstantPoolItemType.DOUBLE:
            putFieldValue = putFieldValueArg.getConstant(thread);
            break;
          default:
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `Unsupported invoke CONSTANT_Dynamic instance field setter argument: ${ConstantPoolItemType[putFieldValueArg.getType()]}`);
            cb(false);
            return;
          }

          if (targetField.rawDescriptor[0] === 'L' || targetField.rawDescriptor[0] === '[') {
            if (putFieldValue !== null) {
              loader.resolveClass(thread, targetField.rawDescriptor, (targetCls: any) => {
                if (targetCls === null) {
                  cb(false);
                } else if (typeof putFieldValue.getClass !== 'function' || !putFieldValue.getClass().isCastable(targetCls)) {
                  thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                    `invoke CONSTANT_Dynamic field setter argument cannot be cast to ${targetCls.getExternalName()}`);
                  cb(false);
                } else {
                  (<any> putFieldReceiver)[targetFieldRef.fullFieldName] = putFieldValue;
                  this.value = null;
                  this.resolved = true;
                  cb(true);
                }
              }, false);
            } else {
              (<any> putFieldReceiver)[targetFieldRef.fullFieldName] = putFieldValue;
              this.value = null;
              this.resolved = true;
              cb(true);
            }
            return;
          }

          if (putFieldValue !== null && typeof putFieldValue === 'object' && typeof putFieldValue.unbox === 'function') {
            putFieldValue = putFieldValue.unbox();
          }
          if (targetField.rawDescriptor === 'J' && !(putFieldValue instanceof gLong)) {
            putFieldValue = gLong.fromNumber(putFieldValue);
          } else if (targetField.rawDescriptor === 'F') {
            putFieldValue = util.wrapFloat(putFieldValue instanceof gLong ? putFieldValue.toNumber() : putFieldValue);
          } else if (targetField.rawDescriptor === 'D' && putFieldValue instanceof gLong) {
            putFieldValue = putFieldValue.toNumber();
          }
          (<any> putFieldReceiver)[targetFieldRef.fullFieldName] = putFieldValue;
          this.value = null;
          this.resolved = true;
          cb(true);
          return;
        }

        if (targetField.rawDescriptor !== fieldReturnDescriptor && !referenceFieldReturn && !primitiveFieldBoxReturn && !primitiveFieldReturnWiden) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;',
            `invoke CONSTANT_Dynamic target field ${targetField.rawDescriptor} does not match ${fieldReturnDescriptor}`);
          cb(false);
          return;
        }

        if (targetRefKind === MethodHandleReferenceKind.GETSTATIC) {
          if (invokeStaticArgs.length !== 1) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic static field getter does not accept static arguments');
            cb(false);
            return;
          } else if (!targetField.accessFlags.isStatic()) {
            thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic target field must be static');
            cb(false);
            return;
          }

          targetField.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
            if (cdata === null) {
              cb(false);
            } else {
              var staticFieldValue = (<any> cdata.getConstructor(thread))[targetFieldRef.fullFieldName];
              if (referenceFieldReturn && staticFieldValue !== null) {
                loader.resolveClass(thread, fieldReturnDescriptor, (targetCls: any) => {
                  if (targetCls === null) {
                    cb(false);
                  } else if (!staticFieldValue.getClass().isCastable(targetCls)) {
                    thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                      `invoke CONSTANT_Dynamic field result cannot be cast to ${targetCls.getExternalName()}`);
                    cb(false);
                  } else {
                    this.value = staticFieldValue;
                    this.resolved = true;
                    cb(true);
                  }
                }, false);
              } else if (primitiveFieldReturnWiden) {
                var widenedStaticFieldValue: any = staticFieldValue;
                switch (fieldReturnDescriptor) {
                  case 'J':
                    widenedStaticFieldValue = widenedStaticFieldValue instanceof gLong ? widenedStaticFieldValue : gLong.fromNumber(widenedStaticFieldValue);
                    break;
                  case 'F':
                    widenedStaticFieldValue = util.wrapFloat(widenedStaticFieldValue instanceof gLong ? widenedStaticFieldValue.toNumber() : widenedStaticFieldValue);
                    break;
                  case 'D':
                    widenedStaticFieldValue = widenedStaticFieldValue instanceof gLong ? widenedStaticFieldValue.toNumber() : widenedStaticFieldValue;
                    break;
                  default:
                    break;
                }
                this.value = widenedStaticFieldValue;
                this.resolved = true;
                cb(true);
              } else if (primitiveFieldBoxReturn) {
                var boxedStaticFieldValue = util.boxPrimitiveValue(thread, targetField.rawDescriptor, staticFieldValue);
                loader.resolveClass(thread, fieldReturnDescriptor, (targetCls: any) => {
                  if (targetCls === null) {
                    cb(false);
                  } else if (!boxedStaticFieldValue.getClass().isCastable(targetCls)) {
                    thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                      `invoke CONSTANT_Dynamic boxed field result cannot be cast to ${targetCls.getExternalName()}`);
                    cb(false);
                  } else {
                    this.value = boxedStaticFieldValue;
                    this.resolved = true;
                    cb(true);
                  }
                }, false);
              } else {
                this.value = staticFieldValue;
                this.resolved = true;
                cb(true);
              }
            }
          }, false);
          return;
        }

        if (invokeStaticArgs.length !== 2) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic instance field getter requires a receiver');
          cb(false);
          return;
        } else if (targetField.accessFlags.isStatic()) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic target field must be an instance field');
          cb(false);
          return;
        }

        var fieldReceiverArg = invokeStaticArgs[1];
        if (!fieldReceiverArg.isResolved()) {
          fieldReceiverArg.resolve(thread, loader, caller, (status: boolean) => {
            if (status) {
              this.resolve(thread, loader, caller, cb);
            } else {
              cb(false);
            }
          }, false);
          return;
        }

        var fieldReceiverValue: any;
        switch (fieldReceiverArg.getType()) {
          case ConstantPoolItemType.CLASS:
          case ConstantPoolItemType.DYNAMIC:
          case ConstantPoolItemType.METHOD_HANDLE:
          case ConstantPoolItemType.METHOD_TYPE:
          case ConstantPoolItemType.STRING:
            fieldReceiverValue = fieldReceiverArg.getConstant(thread);
            break;
          default:
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `Unsupported invoke CONSTANT_Dynamic field receiver argument: ${ConstantPoolItemType[fieldReceiverArg.getType()]}`);
            cb(false);
            return;
        }

        if (fieldReceiverValue === null) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic instance field getter receiver is null');
          cb(false);
          return;
        } else if (!fieldReceiverValue.getClass().isCastable(targetField.cls)) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;',
            `invoke CONSTANT_Dynamic field receiver cannot be cast to ${targetField.cls.getExternalName()}`);
          cb(false);
          return;
        } else {
          var instanceFieldValue = (<any> fieldReceiverValue)[targetFieldRef.fullFieldName];
          if (referenceFieldReturn && instanceFieldValue !== null) {
            loader.resolveClass(thread, fieldReturnDescriptor, (targetCls: any) => {
              if (targetCls === null) {
                cb(false);
              } else if (!instanceFieldValue.getClass().isCastable(targetCls)) {
                thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                  `invoke CONSTANT_Dynamic field result cannot be cast to ${targetCls.getExternalName()}`);
                cb(false);
              } else {
                this.value = instanceFieldValue;
                this.resolved = true;
                cb(true);
                }
              }, false);
          } else if (primitiveFieldReturnWiden) {
            var widenedInstanceFieldValue: any = instanceFieldValue;
            switch (fieldReturnDescriptor) {
              case 'J':
                widenedInstanceFieldValue = widenedInstanceFieldValue instanceof gLong ? widenedInstanceFieldValue : gLong.fromNumber(widenedInstanceFieldValue);
                break;
              case 'F':
                widenedInstanceFieldValue = util.wrapFloat(widenedInstanceFieldValue instanceof gLong ? widenedInstanceFieldValue.toNumber() : widenedInstanceFieldValue);
                break;
              case 'D':
                widenedInstanceFieldValue = widenedInstanceFieldValue instanceof gLong ? widenedInstanceFieldValue.toNumber() : widenedInstanceFieldValue;
                break;
              default:
                break;
            }
            this.value = widenedInstanceFieldValue;
            this.resolved = true;
            cb(true);
          } else if (primitiveFieldBoxReturn) {
            var boxedInstanceFieldValue = util.boxPrimitiveValue(thread, targetField.rawDescriptor, instanceFieldValue);
            loader.resolveClass(thread, fieldReturnDescriptor, (targetCls: any) => {
              if (targetCls === null) {
                cb(false);
              } else if (!boxedInstanceFieldValue.getClass().isCastable(targetCls)) {
                thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                  `invoke CONSTANT_Dynamic boxed field result cannot be cast to ${targetCls.getExternalName()}`);
                cb(false);
              } else {
                this.value = boxedInstanceFieldValue;
                this.resolved = true;
                cb(true);
              }
            }, false);
          } else {
            this.value = instanceFieldValue;
            this.resolved = true;
            cb(true);
          }
          return;
        }
      }

      if (targetRef.getType() !== ConstantPoolItemType.METHODREF &&
          targetRef.getType() !== ConstantPoolItemType.INTERFACE_METHODREF) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic only supports method handles');
        cb(false);
        return;
      } else if (targetRef.getType() === ConstantPoolItemType.INTERFACE_METHODREF &&
          targetRefKind !== MethodHandleReferenceKind.INVOKEINTERFACE &&
          targetRefKind !== MethodHandleReferenceKind.INVOKESTATIC) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic interface target must use INVOKEINTERFACE or INVOKESTATIC');
        cb(false);
        return;
      }

      var targetMethodRef = <MethodReference | InterfaceMethodReference> targetRef;
      if (!targetMethodRef.isResolved()) {
        targetMethodRef.resolve(thread, loader, caller, (status: boolean) => {
          if (status) {
            this.resolve(thread, loader, caller, cb);
          } else {
            cb(false);
          }
        }, false);
        return;
      }

      var unresolvedInvokeArgs = invokeStaticArgs.slice(1).filter((item: IConstantPoolItem) => !item.isResolved());
      if (unresolvedInvokeArgs.length > 0) {
        util.asyncForEach(unresolvedInvokeArgs, (cpItem: IConstantPoolItem, nextItem: (err?: any) => void) => {
          cpItem.resolve(thread, loader, caller, (status: boolean) => {
            nextItem(status ? undefined : 'Failed.');
          }, false);
        }, (err?: any) => {
          if (err) {
            cb(false);
          } else {
            this.resolve(thread, loader, caller, cb);
          }
        });
        return;
      }

      var targetMethod = targetMethodRef.method,
        targetParamTypes = targetMethod.parameterTypes,
        targetReturnType = targetMethod.returnType,
        returnDescriptor = this.nameAndTypeInfo.descriptor,
        referenceReturn = (targetReturnType[0] === 'L' || targetReturnType[0] === '[') &&
          (returnDescriptor[0] === 'L' || returnDescriptor[0] === '['),
        voidReferenceReturn = targetReturnType === 'V' &&
          (returnDescriptor[0] === 'L' || returnDescriptor[0] === '['),
        primitiveBoxReturn = ['Z', 'B', 'C', 'S', 'I', 'J', 'F', 'D'].indexOf(targetReturnType) !== -1 &&
          (returnDescriptor[0] === 'L' || returnDescriptor[0] === '['),
        virtualInvoke = targetRefKind === MethodHandleReferenceKind.INVOKEVIRTUAL ||
          targetRefKind === MethodHandleReferenceKind.INVOKEINTERFACE,
        specialInvoke = targetRefKind === MethodHandleReferenceKind.INVOKESPECIAL,
        receiverInvoke = virtualInvoke || specialInvoke,
        varargsInvoke = targetMethod.accessFlags.isVarArgs() && targetParamTypes.length > 0 &&
          targetParamTypes[targetParamTypes.length - 1][0] === '[',
        suppliedArgCount = invokeStaticArgs.length - 1,
        expectedArgCount = targetParamTypes.length + (receiverInvoke ? 1 : 0),
        minArgCount = varargsInvoke ? expectedArgCount - 1 : expectedArgCount,
        receiverArg: JVMTypes.java_lang_Object = null,
        targetArgs: any[] = [],
        varargsCollected = false;
      var primitiveReturnWiden = false;
      if (util.is_primitive_type(targetReturnType) && util.is_primitive_type(returnDescriptor) &&
          targetReturnType !== returnDescriptor) {
        switch (targetReturnType) {
          case 'B':
            primitiveReturnWiden = ['S', 'I', 'J', 'F', 'D'].indexOf(returnDescriptor) !== -1;
            break;
          case 'S':
            primitiveReturnWiden = ['I', 'J', 'F', 'D'].indexOf(returnDescriptor) !== -1;
            break;
          case 'C':
            primitiveReturnWiden = ['I', 'J', 'F', 'D'].indexOf(returnDescriptor) !== -1;
            break;
          case 'I':
            primitiveReturnWiden = ['J', 'F', 'D'].indexOf(returnDescriptor) !== -1;
            break;
          case 'J':
            primitiveReturnWiden = ['F', 'D'].indexOf(returnDescriptor) !== -1;
            break;
          case 'F':
            primitiveReturnWiden = returnDescriptor === 'D';
            break;
          default:
            break;
        }
      }

      if ((!varargsInvoke && expectedArgCount !== suppliedArgCount) ||
          (varargsInvoke && suppliedArgCount < minArgCount)) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;',
          `invoke CONSTANT_Dynamic target expects ${varargsInvoke ? 'at least ' : ''}${minArgCount} static arguments, got ${suppliedArgCount}`);
        cb(false);
        return;
      }

      for (var invokeArgIdx = 1; invokeArgIdx < invokeStaticArgs.length; invokeArgIdx++) {
        var invokeCpArg = invokeStaticArgs[invokeArgIdx],
          invokeCpType = invokeCpArg.getType(),
          invokeArgValue: any;
        switch (invokeCpType) {
          case ConstantPoolItemType.CLASS:
          case ConstantPoolItemType.DYNAMIC:
          case ConstantPoolItemType.METHOD_HANDLE:
          case ConstantPoolItemType.METHOD_TYPE:
          case ConstantPoolItemType.STRING:
          case ConstantPoolItemType.INTEGER:
          case ConstantPoolItemType.LONG:
          case ConstantPoolItemType.FLOAT:
          case ConstantPoolItemType.DOUBLE:
            invokeArgValue = invokeCpArg.getConstant(thread);
            break;
          default:
            thread.throwNewException('Ljava/lang/BootstrapMethodError;',
              `Unsupported invoke CONSTANT_Dynamic static argument: ${ConstantPoolItemType[invokeCpType]}`);
            cb(false);
            return;
        }

        if (receiverInvoke && invokeArgIdx === 1) {
          receiverArg = invokeArgValue;
          continue;
        }

        var targetParamIdx = receiverInvoke ? invokeArgIdx - 2 : invokeArgIdx - 1,
          targetParamType = targetParamTypes[targetParamIdx];
        if (varargsInvoke && targetParamIdx === targetParamTypes.length - 1) {
          var varargsDescriptor = targetParamType,
            varargsComponentType = util.get_component_type(varargsDescriptor),
            varargsValues: any[] = [];
          for (var varArgIdx = invokeArgIdx; varArgIdx < invokeStaticArgs.length; varArgIdx++) {
            var varCpArg = invokeStaticArgs[varArgIdx],
              varCpType = varCpArg.getType(),
              varArgValue: any;
            switch (varCpType) {
              case ConstantPoolItemType.CLASS:
              case ConstantPoolItemType.DYNAMIC:
              case ConstantPoolItemType.METHOD_HANDLE:
              case ConstantPoolItemType.METHOD_TYPE:
              case ConstantPoolItemType.STRING:
              case ConstantPoolItemType.INTEGER:
              case ConstantPoolItemType.LONG:
              case ConstantPoolItemType.FLOAT:
              case ConstantPoolItemType.DOUBLE:
                varArgValue = varCpArg.getConstant(thread);
                break;
              default:
                thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                  `Unsupported invoke CONSTANT_Dynamic varargs argument: ${ConstantPoolItemType[varCpType]}`);
                cb(false);
                return;
            }

            if (varargsComponentType[0] === 'L' || varargsComponentType[0] === '[') {
              switch (varCpType) {
              case ConstantPoolItemType.INTEGER:
                varArgValue = util.boxPrimitiveValue(thread, 'I', varArgValue);
                break;
              case ConstantPoolItemType.LONG:
                varArgValue = util.boxPrimitiveValue(thread, 'J', varArgValue);
                break;
              case ConstantPoolItemType.FLOAT:
                varArgValue = util.boxPrimitiveValue(thread, 'F', varArgValue);
                break;
              case ConstantPoolItemType.DOUBLE:
                varArgValue = util.boxPrimitiveValue(thread, 'D', varArgValue);
                break;
              default:
                break;
              }
            } else if (util.is_primitive_type(varargsComponentType) && varArgValue !== null &&
                typeof varArgValue === 'object' && typeof varArgValue.unbox === 'function') {
              varArgValue = varArgValue.unbox();
              if (varargsComponentType === 'J' && !(varArgValue instanceof gLong)) {
                varArgValue = gLong.fromNumber(varArgValue);
              }
            }
            if (util.is_primitive_type(varargsComponentType)) {
              switch (varargsComponentType) {
                case 'J':
                  if (varCpType === ConstantPoolItemType.INTEGER) {
                    varArgValue = gLong.fromNumber(varArgValue);
                  }
                  break;
                case 'F':
                  if (varCpType === ConstantPoolItemType.INTEGER) {
                    varArgValue = util.wrapFloat(varArgValue);
                  } else if (varArgValue instanceof gLong) {
                    varArgValue = util.wrapFloat(varArgValue.toNumber());
                  }
                  break;
                case 'D':
                  if (varArgValue instanceof gLong) {
                    varArgValue = varArgValue.toNumber();
                  }
                  break;
                default:
                  break;
              }
            }
            varargsValues.push(varArgValue);
          }
          targetArgs.push(util.newArrayFromData<any>(thread, loader, varargsDescriptor, varargsValues));
          varargsCollected = true;
          break;
        }

        if (targetParamType[0] === 'L' || targetParamType[0] === '[') {
          switch (invokeCpType) {
          case ConstantPoolItemType.INTEGER:
            invokeArgValue = util.boxPrimitiveValue(thread, 'I', invokeArgValue);
            break;
          case ConstantPoolItemType.LONG:
            invokeArgValue = util.boxPrimitiveValue(thread, 'J', invokeArgValue);
            break;
          case ConstantPoolItemType.FLOAT:
            invokeArgValue = util.boxPrimitiveValue(thread, 'F', invokeArgValue);
            break;
          case ConstantPoolItemType.DOUBLE:
            invokeArgValue = util.boxPrimitiveValue(thread, 'D', invokeArgValue);
            break;
          default:
            break;
          }
        } else if (util.is_primitive_type(targetParamType) && invokeArgValue !== null &&
            typeof invokeArgValue === 'object' && typeof invokeArgValue.unbox === 'function') {
          invokeArgValue = invokeArgValue.unbox();
          if (targetParamType === 'J' && !(invokeArgValue instanceof gLong)) {
            invokeArgValue = gLong.fromNumber(invokeArgValue);
          }
        }
        if (util.is_primitive_type(targetParamType)) {
          switch (targetParamType) {
            case 'J':
              if (invokeCpType === ConstantPoolItemType.INTEGER) {
                invokeArgValue = gLong.fromNumber(invokeArgValue);
              }
              break;
            case 'F':
              if (invokeCpType === ConstantPoolItemType.INTEGER) {
                invokeArgValue = util.wrapFloat(invokeArgValue);
              } else if (invokeCpType === ConstantPoolItemType.LONG) {
                invokeArgValue = util.wrapFloat((<gLong> invokeArgValue).toNumber());
              }
              break;
            case 'D':
              if (invokeCpType === ConstantPoolItemType.LONG) {
                invokeArgValue = (<gLong> invokeArgValue).toNumber();
              }
              break;
            default:
              break;
          }
        }

        targetArgs.push(invokeArgValue);
        if (targetParamType === 'J' || targetParamType === 'D') {
          targetArgs.push(null);
        }
      }
      if (varargsInvoke && !varargsCollected) {
        targetArgs.push(util.newArrayFromData<any>(thread, loader, targetParamTypes[targetParamTypes.length - 1], []));
      }

      if (targetHandle.getReferenceType() === MethodHandleReferenceKind.NEWINVOKESPECIAL) {
        var constructedDescriptor = targetMethod.cls.getInternalName(),
          referenceConstructorReturn = (constructedDescriptor[0] === 'L' || constructedDescriptor[0] === '[') &&
            (returnDescriptor[0] === 'L' || returnDescriptor[0] === '[');
        if (targetMethod.name !== '<init>') {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic constructor target must be <init>');
          cb(false);
          return;
        } else if (constructedDescriptor !== returnDescriptor && !referenceConstructorReturn) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;',
            `invoke CONSTANT_Dynamic constructor class ${constructedDescriptor} does not match ${returnDescriptor}`);
          cb(false);
          return;
        }

        targetMethod.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
          if (cdata === null) {
            cb(false);
          } else {
            var constructedValue = new (cdata.getConstructor(thread))(thread);
            thread.setStatus(ThreadStatus.ASYNC_WAITING);
            (<any> constructedValue)[targetMethod.fullSignature](thread, targetArgs, (e?: JVMTypes.java_lang_Throwable) => {
              if (e) {
                thread.throwException(e);
                cb(false);
              } else if (referenceConstructorReturn && constructedDescriptor !== returnDescriptor) {
                loader.resolveClass(thread, returnDescriptor, (targetCls: any) => {
                  if (targetCls === null) {
                    cb(false);
                  } else if (!constructedValue.getClass().isCastable(targetCls)) {
                    thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                      `invoke CONSTANT_Dynamic constructor result cannot be cast to ${targetCls.getExternalName()}`);
                    cb(false);
                  } else {
                    this.value = constructedValue;
                    this.resolved = true;
                    cb(true);
                  }
                }, false);
              } else {
                this.value = constructedValue;
                this.resolved = true;
                cb(true);
              }
            });
          }
        }, false);
        return;
      }

      if (receiverInvoke) {
        if (targetReturnType !== returnDescriptor && !referenceReturn && !voidReferenceReturn && !primitiveBoxReturn && !primitiveReturnWiden) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;',
            `invoke CONSTANT_Dynamic target return ${targetReturnType} does not match ${returnDescriptor}`);
          cb(false);
          return;
        } else if (receiverArg === null) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic receiver target requires a receiver');
          cb(false);
          return;
        } else if (specialInvoke && targetMethod.accessFlags.isStatic()) {
          thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic special target must not be static');
          cb(false);
          return;
        }

        targetMethod.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
          if (cdata === null) {
            cb(false);
          } else {
            thread.setStatus(ThreadStatus.ASYNC_WAITING);
            (<any> receiverArg)[specialInvoke ? targetMethod.fullSignature : targetMethod.signature](thread, targetArgs, (e?: JVMTypes.java_lang_Throwable, rv?: any) => {
              if (e) {
                thread.throwException(e);
                cb(false);
              } else if (voidReferenceReturn) {
                this.value = null;
                this.resolved = true;
                cb(true);
              } else if (referenceReturn && rv !== null) {
                loader.resolveClass(thread, returnDescriptor, (targetCls: any) => {
                  if (targetCls === null) {
                    cb(false);
                  } else if (!rv.getClass().isCastable(targetCls)) {
                    thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                      `invoke CONSTANT_Dynamic result cannot be cast to ${targetCls.getExternalName()}`);
                    cb(false);
                  } else {
                    this.value = rv;
                    this.resolved = true;
                    cb(true);
                  }
                }, false);
              } else if (primitiveReturnWiden) {
                var widenedVirtualValue: any = rv;
                switch (returnDescriptor) {
                  case 'J':
                    widenedVirtualValue = widenedVirtualValue instanceof gLong ? widenedVirtualValue : gLong.fromNumber(widenedVirtualValue);
                    break;
                  case 'F':
                    widenedVirtualValue = util.wrapFloat(widenedVirtualValue instanceof gLong ? widenedVirtualValue.toNumber() : widenedVirtualValue);
                    break;
                  case 'D':
                    widenedVirtualValue = widenedVirtualValue instanceof gLong ? widenedVirtualValue.toNumber() : widenedVirtualValue;
                    break;
                  default:
                    break;
                }
                this.value = widenedVirtualValue;
                this.resolved = true;
                cb(true);
              } else if (primitiveBoxReturn) {
                var boxedVirtualValue = util.boxPrimitiveValue(thread, targetReturnType, rv);
                loader.resolveClass(thread, returnDescriptor, (targetCls: any) => {
                  if (targetCls === null) {
                    cb(false);
                  } else if (!boxedVirtualValue.getClass().isCastable(targetCls)) {
                    thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                      `invoke CONSTANT_Dynamic boxed result cannot be cast to ${targetCls.getExternalName()}`);
                    cb(false);
                  } else {
                    this.value = boxedVirtualValue;
                    this.resolved = true;
                    cb(true);
                  }
                }, false);
              } else {
                this.value = rv;
                this.resolved = true;
                cb(true);
              }
            });
          }
        }, false);
        return;
      }

      if (!targetMethod.accessFlags.isStatic()) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'invoke CONSTANT_Dynamic target must be static');
        cb(false);
        return;
      } else if (targetReturnType !== returnDescriptor && !referenceReturn && !voidReferenceReturn && !primitiveBoxReturn && !primitiveReturnWiden) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;',
          `invoke CONSTANT_Dynamic target return ${targetReturnType} does not match ${returnDescriptor}`);
        cb(false);
        return;
      }

      targetMethod.cls.initialize(thread, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (cdata === null) {
          cb(false);
        } else {
          thread.setStatus(ThreadStatus.ASYNC_WAITING);
          (<any> cdata.getConstructor(thread))[targetMethod.fullSignature](thread, targetArgs, (e?: JVMTypes.java_lang_Throwable, rv?: any) => {
            if (e) {
              thread.throwException(e);
              cb(false);
            } else if (voidReferenceReturn) {
              this.value = null;
              this.resolved = true;
              cb(true);
            } else if (referenceReturn && rv !== null) {
              loader.resolveClass(thread, returnDescriptor, (targetCls: any) => {
                if (targetCls === null) {
                  cb(false);
                } else if (!rv.getClass().isCastable(targetCls)) {
                  thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                    `invoke CONSTANT_Dynamic result cannot be cast to ${targetCls.getExternalName()}`);
                  cb(false);
                } else {
                  this.value = rv;
                  this.resolved = true;
                  cb(true);
                }
              }, false);
            } else if (primitiveReturnWiden) {
              var widenedStaticValue: any = rv;
              switch (returnDescriptor) {
                case 'J':
                  widenedStaticValue = widenedStaticValue instanceof gLong ? widenedStaticValue : gLong.fromNumber(widenedStaticValue);
                  break;
                case 'F':
                  widenedStaticValue = util.wrapFloat(widenedStaticValue instanceof gLong ? widenedStaticValue.toNumber() : widenedStaticValue);
                  break;
                case 'D':
                  widenedStaticValue = widenedStaticValue instanceof gLong ? widenedStaticValue.toNumber() : widenedStaticValue;
                  break;
                default:
                  break;
              }
              this.value = widenedStaticValue;
              this.resolved = true;
              cb(true);
            } else if (primitiveBoxReturn) {
              var boxedStaticValue = util.boxPrimitiveValue(thread, targetReturnType, rv);
              loader.resolveClass(thread, returnDescriptor, (targetCls: any) => {
                if (targetCls === null) {
                  cb(false);
                } else if (!boxedStaticValue.getClass().isCastable(targetCls)) {
                  thread.throwNewException('Ljava/lang/BootstrapMethodError;',
                    `invoke CONSTANT_Dynamic boxed result cannot be cast to ${targetCls.getExternalName()}`);
                  cb(false);
                } else {
                  this.value = boxedStaticValue;
                  this.resolved = true;
                  cb(true);
                }
              }, false);
            } else {
              this.value = rv;
              this.resolved = true;
              cb(true);
            }
          });
        }
      }, false);
    } else {
      thread.throwNewException('Ljava/lang/BootstrapMethodError;',
        `Unsupported CONSTANT_Dynamic bootstrap: ${bootstrapRef.classInfo.name}.${bootstrapRef.nameAndTypeInfo.name}`);
      cb(false);
    }
  }

  public getConstant(thread: JVMThread) {
    return this.value;
  }

  public isResolved() {
    return this.resolved;
  }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var bootstrapMethodAttrIndex = byteStream.getUint16(),
      nameAndTypeIndex = byteStream.getUint16(),
      nameAndTypeInfo = <NameAndTypeInfo> constantPool.get(nameAndTypeIndex);
    assert(nameAndTypeInfo.getType() === ConstantPoolItemType.NAME_AND_TYPE,
      'ConstantPool DynamicConstant type != NAME_AND_TYPE');
    return new this(bootstrapMethodAttrIndex, nameAndTypeInfo);
  }
}
CP_CLASSES[ConstantPoolItemType.DYNAMIC] = DynamicConstant;

/**
 * Used by an invokedynamic instruction to specify a bootstrap method,
 * the dynamic invocation name, the argument and return types of the call,
 * and optionally, a sequence of additional constants called static arguments
 * to the bootstrap method.
 * ```
 * CONSTANT_InvokeDynamic_info {
 *   u1 tag;
 *   u2 bootstrap_method_attr_index;
 *   u2 name_and_type_index;
 * }
 * ```
 */
export class InvokeDynamic implements IConstantPoolItem {
  public bootstrapMethodAttrIndex: number;
  public nameAndTypeInfo: NameAndTypeInfo;
  /**
   * The parameter word size of the nameAndTypeInfo's descriptor.
   * Does not take appendix into account; this is the static paramWordSize.
   */
  public paramWordSize: number;
  /**
   * Once a CallSite is defined for a particular lexical occurrence of
   * InvokeDynamic, the CallSite will be reused for each future execution
   * of that particular occurrence.
   *
   * We store the CallSite objects here for future retrieval, along with an
   * optional 'appendix' argument.
   */
  private callSiteObjects: { [pc: number]: [JVMTypes.java_lang_invoke_MemberName, JVMTypes.java_lang_Object] } = {};
  private stringConcatRecipe: string = null;
  private stringConcatConstants: string[] = [];
  private objectMethodsMethodName: string = null;
  private objectMethodsRecordName: string = null;
  private objectMethodsComponents: { name: string; fieldName: string; descriptor: string; }[] = null;
  /**
   * A MethodType object corresponding to this InvokeDynamic call's
   * method descriptor.
   */
  private methodType: JVMTypes.java_lang_invoke_MethodType = null;

  constructor(bootstrapMethodAttrIndex: number, nameAndTypeInfo: NameAndTypeInfo) {
    this.bootstrapMethodAttrIndex = bootstrapMethodAttrIndex;
    this.nameAndTypeInfo = nameAndTypeInfo;
    this.paramWordSize = util.getMethodDescriptorWordSize(this.nameAndTypeInfo.descriptor);
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.INVOKE_DYNAMIC;
  }
  public isResolved(): boolean { return this.methodType !== null; }
  public resolve(thread: JVMThread, loader: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void) {
    util.createMethodType(thread, loader, this.nameAndTypeInfo.descriptor, (e: JVMTypes.java_lang_Throwable, rv: JVMTypes.java_lang_invoke_MethodType) => {
      if (e) {
        thread.throwException(e);
        cb(false);
      } else {
        this.methodType = rv;
        cb(true);
      }
    });
  }

  public getCallSiteObject(pc: number): [JVMTypes.java_lang_invoke_MemberName, JVMTypes.java_lang_Object] {
    var cso = this.callSiteObjects[pc]
    if (cso) {
      return cso;
    } else {
      return null;
    }
  }

  public isStringConcatCallSite(): boolean {
    return this.stringConcatRecipe !== null;
  }

  public isObjectMethodsCallSite(): boolean {
    return this.objectMethodsMethodName !== null;
  }

  public evaluateStringConcat(thread: JVMThread, args: any[]): JVMTypes.java_lang_String {
    var paramTypes = util.getTypes(this.nameAndTypeInfo.descriptor),
      recipe = this.stringConcatRecipe,
      result = '',
      argIdx = 0,
      rawArgIdx = 0,
      constIdx = 0;
    paramTypes.pop();
    for (var i = 0; i < recipe.length; i++) {
      var ch = recipe.charAt(i);
      if (ch === '\u0001') {
        var paramType = paramTypes[argIdx];
        result += this.stringifyConcatArg(thread, paramType, args[rawArgIdx]);
        rawArgIdx += paramType === 'J' || paramType === 'D' ? 2 : 1;
        argIdx++;
      } else if (ch === '\u0002') {
        result += this.stringConcatConstants[constIdx++];
      } else {
        result += ch;
      }
    }
    return util.initString(thread.getBsCl(), result);
  }

  public evaluateObjectMethods(thread: JVMThread, args: any[]): any {
    var self = args[0],
      components = this.objectMethodsComponents;

    if (this.objectMethodsMethodName === 'toString') {
      var parts: string[] = [];
      for (var i = 0; i < components.length; i++) {
        var component = components[i],
          value = self[component.fieldName];
        parts.push(component.name + '=' + this.stringifyObjectMethodValue(component.descriptor, value));
      }
      return util.initString(thread.getBsCl(), this.objectMethodsRecordName + '[' + parts.join(', ') + ']');
    } else if (this.objectMethodsMethodName === 'equals') {
      var other = args[1];
      if (self === other) {
        return 1;
      }
      if (other === null || other.getClass() !== self.getClass()) {
        return 0;
      }
      for (var j = 0; j < components.length; j++) {
        var equalsComponent = components[j];
        if (!this.objectMethodValuesEqual(equalsComponent.descriptor, self[equalsComponent.fieldName], other[equalsComponent.fieldName])) {
          return 0;
        }
      }
      return 1;
    } else if (this.objectMethodsMethodName === 'hashCode') {
      var hash = 1;
      for (var k = 0; k < components.length; k++) {
        var hashComponent = components[k];
        hash = ((31 * hash) + this.objectMethodValueHash(hashComponent.descriptor, self[hashComponent.fieldName])) | 0;
      }
      return hash;
    }
    thread.throwNewException('Ljava/lang/BootstrapMethodError;', `Unsupported ObjectMethods call site: ${this.objectMethodsMethodName}`);
    return null;
  }

  private stringifyConcatArg(thread: JVMThread, type: string, value: any): string {
    if (value === null) {
      return 'null';
    }
    switch (type) {
      case 'Z':
        return value !== 0 ? 'true' : 'false';
      case 'C':
        return String.fromCharCode(value);
      case 'J':
        return value.toString();
      case 'B':
      case 'S':
      case 'I':
        return '' + value;
      case 'F':
      case 'D':
        return this.stringifyFloatingPointValue(value);
      default:
        if (type === 'Ljava/lang/String;') {
          return value.toString();
        }
        if (value !== null && typeof value.getClass === 'function') {
          var valueClassName = value.getClass().getInternalName();
          switch (valueClassName) {
            case 'Ljava/lang/Boolean;':
              return value['java/lang/Boolean/value'] !== 0 ? 'true' : 'false';
            case 'Ljava/lang/Byte;':
              return '' + value['java/lang/Byte/value'];
            case 'Ljava/lang/Character;':
              return String.fromCharCode(value['java/lang/Character/value']);
            case 'Ljava/lang/Short;':
              return '' + value['java/lang/Short/value'];
            case 'Ljava/lang/Integer;':
              return '' + value['java/lang/Integer/value'];
            case 'Ljava/lang/Long;':
              return value['java/lang/Long/value'].toString();
            case 'Ljava/lang/Float;':
              return this.stringifyFloatingPointValue(value['java/lang/Float/value']);
            case 'Ljava/lang/Double;':
              return this.stringifyFloatingPointValue(value['java/lang/Double/value']);
          }
        }
        return value.toString();
    }
  }

  private stringifyFloatingPointValue(value: number): string {
    if (value === 0) {
      return 1 / value === Number.NEGATIVE_INFINITY ? '-0.0' : '0.0';
    }
    if (value === Number.POSITIVE_INFINITY) {
      return 'Infinity';
    }
    if (value === Number.NEGATIVE_INFINITY) {
      return '-Infinity';
    }
    var rendered = '' + value;
    return rendered.indexOf('.') === -1 && rendered.indexOf('e') === -1 && rendered.indexOf('E') === -1 && rendered !== 'NaN' ?
      rendered + '.0' : rendered;
  }

  private getStringConcatRecipe(bootstrapMethod: [MethodHandle, IConstantPoolItem[]]): string {
    var bootstrapRef = bootstrapMethod[0].getReference();
    if (bootstrapRef.classInfo.name !== 'Ljava/lang/invoke/StringConcatFactory;') {
      return null;
    }
    if (bootstrapRef.nameAndTypeInfo.name === 'makeConcat') {
      var paramTypes = util.getTypes(this.nameAndTypeInfo.descriptor),
        recipe = '';
      paramTypes.pop();
      for (var i = 0; i < paramTypes.length; i++) {
        recipe += '\u0001';
      }
      return recipe;
    } else if (bootstrapRef.nameAndTypeInfo.name === 'makeConcatWithConstants') {
      var recipeArg = bootstrapMethod[1][0];
      if (recipeArg !== undefined && recipeArg.getType() === ConstantPoolItemType.STRING) {
        return (<ConstString> recipeArg).stringValue;
      }
    }
    return null;
  }

  private stringifyObjectMethodValue(type: string, value: any): string {
    if (value === null) {
      return 'null';
    }
    switch (type) {
      case 'Z':
        return value !== 0 ? 'true' : 'false';
      case 'C':
        return String.fromCharCode(value);
      case 'J':
        return value.toString();
      case 'B':
      case 'S':
      case 'I':
        return '' + value;
      case 'F':
      case 'D':
        return this.stringifyFloatingPointValue(value);
      default:
        return value.toString();
    }
  }

  private objectMethodValuesEqual(type: string, left: any, right: any): boolean {
    if (type === 'F' || type === 'D') {
      if (isNaN(left) && isNaN(right)) {
        return true;
      }
      if (left === 0 && right === 0) {
        return 1 / left === 1 / right;
      }
      return left === right;
    }
    if (left === right) {
      return true;
    }
    if (left === null || right === null) {
      return false;
    }
    if (type === 'J') {
      return left.equals(right);
    }
    if (type === 'Ljava/lang/String;') {
      return left.toString() === right.toString();
    }
    return left === right;
  }

  private objectMethodValueHash(type: string, value: any): number {
    if (value === null) {
      return 0;
    }
    switch (type) {
      case 'Z':
        return value !== 0 ? 1231 : 1237;
      case 'B':
      case 'C':
      case 'S':
      case 'I':
        return value | 0;
      case 'J':
        return (value.getHighBits() ^ value.getLowBits()) | 0;
      case 'F':
        if (isNaN(value)) {
          return 0x7fc00000;
        }
        var floatBits = new Buffer(4);
        floatBits.writeFloatBE(value, 0);
        return floatBits.readInt32BE(0);
      case 'D':
        var highBits: number,
          lowBits: number;
        if (isNaN(value)) {
          highBits = 0x7ff80000;
          lowBits = 0;
        } else {
          var doubleBits = new Buffer(8);
          doubleBits.writeDoubleBE(value, 0);
          highBits = doubleBits.readInt32BE(0);
          lowBits = doubleBits.readInt32BE(4);
        }
        return (highBits ^ lowBits) | 0;
      default:
        var str = value.toString(),
          hash = 0;
        for (var i = 0; i < str.length; i++) {
          hash = (((hash << 5) - hash) + str.charCodeAt(i)) | 0;
        }
        return hash;
    }
  }

  private getStringConcatConstants(bootstrapMethod: [MethodHandle, IConstantPoolItem[]]): string[] {
    var constants: string[] = [];
    for (var i = 1; i < bootstrapMethod[1].length; i++) {
      var cpItem = bootstrapMethod[1][i];
      switch (cpItem.getType()) {
        case ConstantPoolItemType.STRING:
          constants.push((<ConstString> cpItem).stringValue);
          break;
        case ConstantPoolItemType.INTEGER:
          constants.push('' + (<ConstInt32> cpItem).value);
          break;
        case ConstantPoolItemType.LONG:
          constants.push((<ConstLong> cpItem).value.toString());
          break;
        case ConstantPoolItemType.FLOAT:
          constants.push('' + (<ConstFloat> cpItem).value);
          break;
        case ConstantPoolItemType.DOUBLE:
          constants.push('' + (<ConstDouble> cpItem).value);
          break;
        case ConstantPoolItemType.CLASS:
          var classRef = <ClassReference> cpItem;
          if (classRef.cls instanceof PrimitiveClassData) {
            constants.push(util.ext_classname(classRef.name));
          } else if (classRef.cls !== null && classRef.cls.accessFlags.isInterface()) {
            constants.push('interface ' + util.ext_classname(classRef.name));
          } else {
            constants.push('class ' + util.ext_classname(classRef.name));
          }
          break;
        case ConstantPoolItemType.METHOD_TYPE:
          var methodTypeDescriptor = (<MethodType> cpItem).descriptor,
            methodTypeParts = util.getTypes(methodTypeDescriptor),
            methodTypeReturn = methodTypeParts.pop(),
            formattedMethodTypeParts = methodTypeParts.concat([methodTypeReturn]).map(function(type: string): string {
              var arrayDepth = 0;
              while (type.charAt(arrayDepth) === '[') {
                arrayDepth++;
              }
              var elementType = type.slice(arrayDepth),
                typeName: string;
              switch (elementType) {
                case 'Z':
                  typeName = 'boolean';
                  break;
                case 'B':
                  typeName = 'byte';
                  break;
                case 'C':
                  typeName = 'char';
                  break;
                case 'S':
                  typeName = 'short';
                  break;
                case 'I':
                  typeName = 'int';
                  break;
                case 'J':
                  typeName = 'long';
                  break;
                case 'F':
                  typeName = 'float';
                  break;
                case 'D':
                  typeName = 'double';
                  break;
                case 'V':
                  typeName = 'void';
                  break;
                default:
                  typeName = util.ext_classname(elementType);
                  typeName = typeName.slice(typeName.lastIndexOf('.') + 1);
                  break;
              }
              while (arrayDepth > 0) {
                typeName += '[]';
                arrayDepth--;
              }
              return typeName;
            });
          constants.push('(' + formattedMethodTypeParts.slice(0, formattedMethodTypeParts.length - 1).join(',') + ')' + formattedMethodTypeParts[formattedMethodTypeParts.length - 1]);
          break;
        case ConstantPoolItemType.METHOD_HANDLE:
          var methodHandle = <MethodHandle> cpItem,
            methodHandleRef = methodHandle.getReference(),
            methodHandleRefKind = methodHandle.getReferenceType(),
            methodHandleDescriptorParts: string[];
          if (methodHandleRef.getType() === ConstantPoolItemType.FIELDREF) {
            var fieldDescriptor = methodHandleRef.nameAndTypeInfo.descriptor;
            if (methodHandleRefKind === MethodHandleReferenceKind.GETSTATIC) {
              methodHandleDescriptorParts = [fieldDescriptor];
            } else if (methodHandleRefKind === MethodHandleReferenceKind.GETFIELD) {
              methodHandleDescriptorParts = [methodHandleRef.classInfo.name, fieldDescriptor];
            } else if (methodHandleRefKind === MethodHandleReferenceKind.PUTSTATIC) {
              methodHandleDescriptorParts = [fieldDescriptor, 'V'];
            } else {
              methodHandleDescriptorParts = [methodHandleRef.classInfo.name, fieldDescriptor, 'V'];
            }
          } else {
            methodHandleDescriptorParts = util.getTypes(methodHandleRef.nameAndTypeInfo.descriptor);
            if (methodHandleRefKind === MethodHandleReferenceKind.NEWINVOKESPECIAL) {
              methodHandleDescriptorParts[methodHandleDescriptorParts.length - 1] = methodHandleRef.classInfo.name;
            } else if (methodHandleRefKind !== MethodHandleReferenceKind.INVOKESTATIC) {
              methodHandleDescriptorParts.unshift(methodHandleRef.classInfo.name);
            }
          }
          var formattedMethodHandleParts = methodHandleDescriptorParts.map(function(type: string): string {
            var arrayDepth = 0;
            while (type.charAt(arrayDepth) === '[') {
              arrayDepth++;
            }
            var elementType = type.slice(arrayDepth),
              typeName: string;
            switch (elementType) {
              case 'Z':
                typeName = 'boolean';
                break;
              case 'B':
                typeName = 'byte';
                break;
              case 'C':
                typeName = 'char';
                break;
              case 'S':
                typeName = 'short';
                break;
              case 'I':
                typeName = 'int';
                break;
              case 'J':
                typeName = 'long';
                break;
              case 'F':
                typeName = 'float';
                break;
              case 'D':
                typeName = 'double';
                break;
              case 'V':
                typeName = 'void';
                break;
              default:
                typeName = util.ext_classname(elementType);
                typeName = typeName.slice(typeName.lastIndexOf('.') + 1);
                break;
            }
            while (arrayDepth > 0) {
              typeName += '[]';
              arrayDepth--;
            }
            return typeName;
          });
          constants.push('MethodHandle(' + formattedMethodHandleParts.slice(0, formattedMethodHandleParts.length - 1).join(',') + ')' + formattedMethodHandleParts[formattedMethodHandleParts.length - 1]);
          break;
        default:
          constants.push('');
          break;
      }
    }
    return constants;
  }

  private constructStringConcatCallSiteObject(thread: JVMThread, cl: ClassLoader, clazz: ReferenceClassData<JVMTypes.java_lang_Object>, pc: number, bootstrapMethod: [MethodHandle, IConstantPoolItem[]], cb: (status: boolean) => void): boolean {
    var recipe = this.getStringConcatRecipe(bootstrapMethod);
    if (recipe === null) {
      return false;
    }
    var unresolvedClassArgs = bootstrapMethod[1].filter((item: IConstantPoolItem) => item.getType() === ConstantPoolItemType.CLASS && !item.isResolved());
    if (unresolvedClassArgs.length > 0) {
      util.asyncForEach(unresolvedClassArgs, (cpItem: IConstantPoolItem, nextItem: (err?: any) => void) => {
        (<ClassReference> cpItem).resolve(thread, cl, clazz, (status: boolean) => {
          nextItem(status ? undefined : "Failed.");
        }, false);
      }, (err?: any) => {
        if (err) {
          cb(false);
        } else {
          this.constructStringConcatCallSiteObject(thread, cl, clazz, pc, bootstrapMethod, cb);
        }
      });
      return true;
    }
    util.createMethodType(thread, cl, this.nameAndTypeInfo.descriptor, (e: JVMTypes.java_lang_Throwable, rv: JVMTypes.java_lang_invoke_MethodType) => {
      if (e) {
        thread.throwException(e);
        cb(false);
      } else {
        var memberName = <JVMTypes.java_lang_invoke_MemberName> <any> { vmtarget: function() {} };
        this.methodType = rv;
        this.stringConcatRecipe = recipe;
        this.stringConcatConstants = this.getStringConcatConstants(bootstrapMethod);
        this.setResolved(pc, [memberName, null]);
        cb(true);
      }
    });
    return true;
  }

  private constructObjectMethodsCallSiteObject(thread: JVMThread, cl: ClassLoader, pc: number, bootstrapMethod: [MethodHandle, IConstantPoolItem[]], cb: (status: boolean) => void): boolean {
    var bootstrapRef = bootstrapMethod[0].getReference();
    if (bootstrapRef.classInfo.name !== 'Ljava/lang/runtime/ObjectMethods;' || bootstrapRef.nameAndTypeInfo.name !== 'bootstrap') {
      return false;
    }

    if (['toString', 'hashCode', 'equals'].indexOf(this.nameAndTypeInfo.name) === -1) {
      thread.throwNewException('Ljava/lang/BootstrapMethodError;', `Unsupported ObjectMethods call site: ${this.nameAndTypeInfo.name}`);
      cb(false);
      return true;
    }

    var staticArgs = bootstrapMethod[1],
      recordClassArg = <ClassReference> staticArgs[0],
      namesArg = <ConstString> staticArgs[1];

    if (staticArgs.length < 2 || recordClassArg.getType() !== ConstantPoolItemType.CLASS || namesArg.getType() !== ConstantPoolItemType.STRING) {
      thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'ObjectMethods bootstrap requires record class and component names');
      cb(false);
      return true;
    }

    var recordInternalName = util.descriptor2typestr(recordClassArg.name),
      slashIdx = recordInternalName.lastIndexOf('/'),
      simpleRecordName = recordInternalName.slice(slashIdx + 1),
      dollarIdx = simpleRecordName.lastIndexOf('$'),
      componentNames = namesArg.stringValue.length > 0 ? namesArg.stringValue.split(';') : [],
      components: { name: string; fieldName: string; descriptor: string; }[] = [];

    if (dollarIdx !== -1) {
      simpleRecordName = simpleRecordName.slice(dollarIdx + 1);
    }

    if (componentNames.length !== staticArgs.length - 2) {
      thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'ObjectMethods component names and handles differ in length');
      cb(false);
      return true;
    }

    for (var i = 2; i < staticArgs.length; i++) {
      if (staticArgs[i].getType() !== ConstantPoolItemType.METHOD_HANDLE) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'ObjectMethods component handle is not a MethodHandle');
        cb(false);
        return true;
      }
      var fieldRef = (<MethodHandle> staticArgs[i]).getReference();
      if (fieldRef.getType() !== ConstantPoolItemType.FIELDREF) {
        thread.throwNewException('Ljava/lang/BootstrapMethodError;', 'ObjectMethods component handle is not a field getter');
        cb(false);
        return true;
      }
      components.push({
        name: componentNames[i - 2],
        fieldName: util.descriptor2typestr(fieldRef.classInfo.name) + '/' + fieldRef.nameAndTypeInfo.name,
        descriptor: fieldRef.nameAndTypeInfo.descriptor
      });
    }

    util.createMethodType(thread, cl, this.nameAndTypeInfo.descriptor, (e: JVMTypes.java_lang_Throwable, rv: JVMTypes.java_lang_invoke_MethodType) => {
      if (e) {
        thread.throwException(e);
        cb(false);
      } else {
        var memberName = <JVMTypes.java_lang_invoke_MemberName> <any> { vmtarget: function() {} };
        this.methodType = rv;
        this.objectMethodsMethodName = this.nameAndTypeInfo.name;
        this.objectMethodsRecordName = simpleRecordName;
        this.objectMethodsComponents = components;
        this.setResolved(pc, [memberName, null]);
        cb(true);
      }
    });
    return true;
  }

  public constructCallSiteObject(thread: JVMThread, cl: ClassLoader, clazz: ReferenceClassData<JVMTypes.java_lang_Object>, pc: number, cb: (status: boolean) => void, explicit: boolean = true): void {
    /**
     * A call site specifier gives a symbolic reference to a method handle which
     * is to serve as the bootstrap method for a dynamic call site (§4.7.23).
     * The method handle is resolved to obtain a reference to an instance of
     * java.lang.invoke.MethodHandle (§5.4.3.5).
     */
    var bootstrapMethod = clazz.getBootstrapMethod(this.bootstrapMethodAttrIndex),
      unresolvedItems: IConstantPoolItem[] = bootstrapMethod[1].concat(bootstrapMethod[0], this).filter((item: IConstantPoolItem) => !item.isResolved());

    if (this.constructStringConcatCallSiteObject(thread, cl, clazz, pc, bootstrapMethod, cb)) {
      return;
    }

    if (this.constructObjectMethodsCallSiteObject(thread, cl, pc, bootstrapMethod, cb)) {
      return;
    }

    if (unresolvedItems.length > 0) {
      // Resolve all needed constant pool items (including this one).
      return util.asyncForEach(unresolvedItems, (cpItem: IConstantPoolItem, nextItem: (err?: any) => void) => {
        cpItem.resolve(thread, cl, clazz, (status: boolean) => {
          if (!status) {
            nextItem("Failed.");
          } else {
            nextItem();
          }
        }, explicit);
      }, (err?: any) => {
        if (err) {
          cb(false);
        } else {
          // Rerun. This time, all items are resolved.
          this.constructCallSiteObject(thread, cl, clazz, pc, cb, explicit);
        }
      });
    }

    /**
     * A call site specifier gives zero or more static arguments, which
     * communicate application-specific metadata to the bootstrap method. Any
     * static arguments which are symbolic references to classes, method
     * handles, or method types are resolved, as if by invocation of the ldc
     * instruction (§ldc), to obtain references to Class objects,
     * java.lang.invoke.MethodHandle objects, and java.lang.invoke.MethodType
     * objects respectively. Any static arguments that are string literals are
     * used to obtain references to String objects.
     */
    function getArguments(): JVMTypes.JVMArray<JVMTypes.java_lang_Object> {
      var cpItems = bootstrapMethod[1],
        i: number, cpItem: IConstantPoolItem,
        rvObj = new ((<ArrayClassData<JVMTypes.java_lang_Object>> thread.getBsCl().getInitializedClass(thread, '[Ljava/lang/Object;')).getConstructor(thread))(thread, cpItems.length),
        rv = rvObj.array;
      for (i = 0; i < cpItems.length; i++) {
        cpItem = cpItems[i];
        switch (cpItem.getType()) {
          case ConstantPoolItemType.CLASS:
            rv[i] = (<ClassReference> cpItem).cls.getClassObject(thread);
            break;
          case ConstantPoolItemType.METHOD_HANDLE:
            rv[i] = (<MethodHandle> cpItem).methodHandle;
            break;
          case ConstantPoolItemType.METHOD_TYPE:
            rv[i] = (<MethodType> cpItem).methodType;
            break;
          case ConstantPoolItemType.STRING:
            rv[i] = (<ConstString> cpItem).value;
            break;
          case ConstantPoolItemType.UTF8:
            rv[i] = thread.getJVM().internString((<ConstUTF8> cpItem).value);
            break;
          case ConstantPoolItemType.INTEGER:
            rv[i] = (<PrimitiveClassData> cl.getInitializedClass(thread, 'I')).createWrapperObject(thread, (<ConstInt32> cpItem).value);
            break;
          case ConstantPoolItemType.LONG:
            rv[i] = (<PrimitiveClassData> cl.getInitializedClass(thread, 'J')).createWrapperObject(thread, (<ConstLong> cpItem).value);
            break;
          case ConstantPoolItemType.FLOAT:
            rv[i] = (<PrimitiveClassData> cl.getInitializedClass(thread, 'F')).createWrapperObject(thread, (<ConstFloat> cpItem).value);
            break;
          case ConstantPoolItemType.DOUBLE:
            rv[i] = (<PrimitiveClassData> cl.getInitializedClass(thread, 'D')).createWrapperObject(thread, (<ConstDouble> cpItem).value);
            break;
          default:
            assert(false, "Invalid CPItem for static args: " + ConstantPoolItemType[cpItem.getType()]);
            break;
        }
      }
      assert((() => {
        var status = true;
        cpItems.forEach((cpItem: IConstantPoolItem, i: number) => {
          if (rv[i] === undefined) {
            console.log("Undefined item at arg " + i + ": " + ConstantPoolItemType[cpItem.getType()]);
            status = false;
          } else if (rv[i] === null) {
            console.log("Null item at arg " + i + ": " + ConstantPoolItemType[cpItem.getType()]);
            status = false;
          }
        });
        return status;
      })(), "Arguments cannot be undefined or null.");

      return rvObj;
    }

    /**
     * A call site specifier gives a method descriptor, TD. A reference to an
     * instance of java.lang.invoke.MethodType is obtained as if by resolution
     * of a symbolic reference to a method type with the same parameter and
     * return types as TD (§5.4.3.5).
     *
     * Do what all OpenJDK-based JVMs do: Call
     * MethodHandleNatives.linkCallSite with:
     * - The class w/ the invokedynamic instruction
     * - The bootstrap method
     * - The name string from the nameAndTypeInfo
     * - The methodType object from the nameAndTypeInfo
     * - The static arguments from the bootstrap method.
     * - A 1-length appendix box.
     */
    var methodName = thread.getJVM().internString(this.nameAndTypeInfo.name),
      appendixArr = new ((<ArrayClassData<JVMTypes.java_lang_Object>> cl.getInitializedClass(thread, '[Ljava/lang/Object;')).getConstructor(thread))(thread, 1),
      staticArgs = getArguments(),
      mhn = <typeof JVMTypes.java_lang_invoke_MethodHandleNatives> (<ReferenceClassData<JVMTypes.java_lang_invoke_MethodHandleNatives>> cl.getInitializedClass(thread, 'Ljava/lang/invoke/MethodHandleNatives;')).getConstructor(thread);


    mhn['java/lang/invoke/MethodHandleNatives/linkCallSite(Ljava/lang/Object;Ljava/lang/Object;Ljava/lang/Object;Ljava/lang/Object;Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/invoke/MemberName;'](thread,
      [clazz.getClassObject(thread), bootstrapMethod[0].methodHandle, methodName, this.methodType, staticArgs, appendixArr], (e?: JVMTypes.java_lang_Throwable, rv?: JVMTypes.java_lang_invoke_MemberName) => {
      if (e) {
        thread.throwException(e);
        cb(false);
      } else {
        this.setResolved(pc, [rv, appendixArr.array[0]]);
        cb(true);
      }
    });
  }

  private setResolved(pc: number, cso: [JVMTypes.java_lang_invoke_MemberName, JVMTypes.java_lang_Object]) {
    // Prevent resolution races. It's OK to create multiple CSOs, but only one
    // should ever be used!
    if (this.callSiteObjects[pc] === undefined) {
      this.callSiteObjects[pc] = cso;
    }
  }

  public static size: number = 1;
  public static infoByteSize: number = 4;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var bootstrapMethodAttrIndex = byteStream.getUint16(),
      nameAndTypeIndex = byteStream.getUint16(),
      nameAndTypeInfo = <NameAndTypeInfo> constantPool.get(nameAndTypeIndex);
    assert(nameAndTypeInfo.getType() === ConstantPoolItemType.NAME_AND_TYPE,
      'ConstantPool InvokeDynamic types mismatch');
    return new this(bootstrapMethodAttrIndex, nameAndTypeInfo);
  }
}
CP_CLASSES[ConstantPoolItemType.INVOKE_DYNAMIC] = InvokeDynamic;

// #endregion

// #region Tier 3

export interface IConstantPoolReference extends IConstantPoolItem {
  classInfo: ClassReference;
  nameAndTypeInfo: NameAndTypeInfo;
  getMethodHandleType(thread: JVMThread, cl: ClassLoader, cb: (e: any, type: JVMTypes.java_lang_Object) => void): void;
}

/**
 * Represents a given method handle.
 * ```
 * CONSTANT_MethodHandle_info {
 *   u1 tag;
 *   u1 reference_kind;
 *   u2 reference_index;
 * }
 * ```
 */
export class MethodHandle implements IConstantPoolItem {
  private reference: FieldReference | MethodReference | InterfaceMethodReference;
  private referenceType: MethodHandleReferenceKind;
  /**
   * The resolved MethodHandle object.
   */
  public methodHandle: JVMTypes.java_lang_invoke_MethodHandle = null;
  constructor(reference: FieldReference | MethodReference | InterfaceMethodReference, referenceType: MethodHandleReferenceKind) {
    this.reference = reference;
    this.referenceType = referenceType;
  }

  public getType(): ConstantPoolItemType {
    return ConstantPoolItemType.METHOD_HANDLE;
  }
  public isResolved(): boolean { return this.methodHandle !== null; }
  public getConstant(thread: JVMThread) { return this.methodHandle; }
  public getReference(): FieldReference | MethodReference | InterfaceMethodReference {
    return this.reference;
  }
  public getReferenceType(): MethodHandleReferenceKind {
    return this.referenceType;
  }

  /**
   * Asynchronously constructs a JVM-visible MethodHandle object for this
   * MethodHandle.
   *
   * Requires producing the following, and passing it to a MethodHandle
   * constructor:
   * * [java.lang.Class] The defining class.
   * * [java.lang.String] The name of the field/method/etc.
   * * [java.lang.invoke.MethodType | java.lang.Class] The type of the field OR,
   *   if a method, the type of the method descriptor.
   *
   * If needed, this function will resolve needed classes.
   */
  public resolve(thread: JVMThread, cl: ClassLoader, caller: ReferenceClassData<JVMTypes.java_lang_Object>, cb: (status: boolean) => void, explicit: boolean) {
    if (!this.reference.isResolved()) {
      return this.reference.resolve(thread, cl, caller, (status: boolean) => {
        if (!status) {
          cb(false);
        } else {
          this.resolve(thread, cl, caller, cb, explicit);
        }
      }, explicit);
    }

    this.constructMethodHandleType(thread, cl, (type: JVMTypes.java_lang_Object) => {
      if (type === null) {
        cb(false);
      } else {
        var methodHandleNatives = <typeof JVMTypes.java_lang_invoke_MethodHandleNatives> (<ReferenceClassData<JVMTypes.java_lang_invoke_MethodHandleNatives>> cl.getInitializedClass(thread, 'Ljava/lang/invoke/MethodHandleNatives;')).getConstructor(thread);
        methodHandleNatives['linkMethodHandleConstant(Ljava/lang/Class;ILjava/lang/Class;Ljava/lang/String;Ljava/lang/Object;)Ljava/lang/invoke/MethodHandle;'](
          thread,
          [caller.getClassObject(thread), this.referenceType, this.getDefiningClassObj(thread), thread.getJVM().internString(this.reference.nameAndTypeInfo.name), type], (e?: JVMTypes.java_lang_Throwable, methodHandle?: JVMTypes.java_lang_invoke_MethodHandle) => {
          if (e) {
            thread.throwException(e);
            cb(false);
          } else {
            this.methodHandle = methodHandle;
            cb(true);
          }
        });
      }
    });
  }

  private getDefiningClassObj(thread: JVMThread): JVMTypes.java_lang_Class {
    if (this.reference.getType() === ConstantPoolItemType.FIELDREF) {
      return (<FieldReference> this.reference).field.cls.getClassObject(thread);
    } else {
      return (<MethodReference> this.reference).method.cls.getClassObject(thread);
    }
  }

  private constructMethodHandleType(thread: JVMThread, cl: ClassLoader, cb: (type: JVMTypes.java_lang_Object) => void): void {
    if (this.reference.getType() === ConstantPoolItemType.FIELDREF) {
      var resolveObj: string = this.reference.nameAndTypeInfo.descriptor;
      cl.resolveClass(thread, resolveObj, (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (cdata !== null) {
          cb(cdata.getClassObject(thread));
        } else {
          cb(null);
        }
      });
    } else {
      util.createMethodType(thread, cl, this.reference.nameAndTypeInfo.descriptor, (e: JVMTypes.java_lang_Throwable, rv: JVMTypes.java_lang_invoke_MethodType) => {
        if (e) {
          thread.throwException(e);
          cb(null);
        } else {
          cb(rv);
        }
      });
    }
  }

  public static size: number = 1;
  public static infoByteSize: number = 3;
  public static fromBytes(byteStream: ByteStream, constantPool: ConstantPool): IConstantPoolItem {
    var referenceKind: MethodHandleReferenceKind = byteStream.getUint8(),
      referenceIndex = byteStream.getUint16(),
      reference: FieldReference | MethodReference | InterfaceMethodReference = <any> constantPool.get(referenceIndex);

    assert(0 < referenceKind && referenceKind < 10,
      'ConstantPool MethodHandle invalid referenceKind: ' + referenceKind);
    // Sanity check.
    assert((() => {
      switch (referenceKind) {
        case MethodHandleReferenceKind.GETFIELD:
        case MethodHandleReferenceKind.GETSTATIC:
        case MethodHandleReferenceKind.PUTFIELD:
        case MethodHandleReferenceKind.PUTSTATIC:
          return reference.getType() === ConstantPoolItemType.FIELDREF;
        case MethodHandleReferenceKind.INVOKEINTERFACE:
          return reference.getType() === ConstantPoolItemType.INTERFACE_METHODREF
            && (<MethodReference>reference).nameAndTypeInfo.name[0] !== '<';
        case MethodHandleReferenceKind.INVOKEVIRTUAL:
        case MethodHandleReferenceKind.INVOKESTATIC:
        case MethodHandleReferenceKind.INVOKESPECIAL:
          // NOTE: Spec says METHODREF, but I've found instances where
          // INVOKESPECIAL is used on an INTERFACE_METHODREF.
          return (reference.getType() === ConstantPoolItemType.METHODREF
            || reference.getType() === ConstantPoolItemType.INTERFACE_METHODREF)
            && (<MethodReference>reference).nameAndTypeInfo.name[0] !== '<';
        case MethodHandleReferenceKind.NEWINVOKESPECIAL:
          return reference.getType() === ConstantPoolItemType.METHODREF
            && (<MethodReference>reference).nameAndTypeInfo.name === '<init>';
      }
      return true;
    })(), "Invalid constant pool reference for method handle reference type: " + MethodHandleReferenceKind[referenceKind]);

    return new this(reference, referenceKind);
  }
}
CP_CLASSES[ConstantPoolItemType.METHOD_HANDLE] = MethodHandle;

// #endregion

/**
 * Constant pool type *resolution tiers*. Value is the tier, key is the
 * constant pool type.
 * Tier 0 has no references to other constant pool items, and can be resolved
 * first.
 * Tier 1 refers to tier 0 items.
 * Tier n refers to tier n-1 items and below.
 * Initialized in the given fashion to give the JS engine a tasty type hint.
 */
var CONSTANT_POOL_TIER: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// Populate CONSTANT_POOL_TIER. Put into a closure to avoid scope pollution.
((tierInfos: ConstantPoolItemType[][]) => {
  tierInfos.forEach((tierInfo: ConstantPoolItemType[], index: number) => {
    tierInfo.forEach((type: ConstantPoolItemType) => {
      CONSTANT_POOL_TIER[type] = index;
    });
  });
})([
    // Tier 0
    [
      ConstantPoolItemType.UTF8,
      ConstantPoolItemType.INTEGER,
      ConstantPoolItemType.FLOAT,
      ConstantPoolItemType.LONG,
      ConstantPoolItemType.DOUBLE
    ],
    // Tier 1
    [
      ConstantPoolItemType.CLASS,
      ConstantPoolItemType.STRING,
      ConstantPoolItemType.NAME_AND_TYPE,
      ConstantPoolItemType.METHOD_TYPE,
      ConstantPoolItemType.MODULE,
      ConstantPoolItemType.PACKAGE
    ],
    // Tier 2
    [
      ConstantPoolItemType.FIELDREF,
      ConstantPoolItemType.METHODREF,
      ConstantPoolItemType.INTERFACE_METHODREF,
      ConstantPoolItemType.DYNAMIC,
      ConstantPoolItemType.INVOKE_DYNAMIC
    ],
    // Tier 3
    [
      ConstantPoolItemType.METHOD_HANDLE
    ]
  ]);

/**
 * Represents a constant pool for a particular class.
 */
export class ConstantPool {
  /**
   * The core constant pool array. Note that some indices are undefined.
   */
  private constantPool: IConstantPoolItem[];

  public parse(byteStream: ByteStream, cpPatches: JVMTypes.JVMArray<JVMTypes.java_lang_Object> = null): ByteStream {
    var cpCount = byteStream.getUint16(),
      // First key is the tier.
      deferredQueue: { offset: number; index: number }[][] = [[], [], []],
      // The ending offset of the constant pool items.
      endIdx = 0, idx = 1,
      // Tag of the currently-being-processed item.
      tag = 0,
      // Offset of the currently-being-processed item.
      itemOffset = 0,
      // Tier of the currently-being-processed item.
      itemTier = 0;
    this.constantPool = new Array<IConstantPoolItem>(cpCount);

    // Scan for tier info.
    while (idx < cpCount) {
      itemOffset = byteStream.pos();
      tag = byteStream.getUint8();
      assert(CP_CLASSES[tag] !== null && CP_CLASSES[tag] !== undefined,
        'Unknown ConstantPool tag: ' + tag);
      itemTier = CONSTANT_POOL_TIER[tag];
      if (itemTier > 0) {
        deferredQueue[itemTier - 1].push({ offset: itemOffset, index: idx });
        byteStream.skip(CP_CLASSES[tag].infoByteSize);
      } else {
        this.constantPool[idx] = CP_CLASSES[tag].fromBytes(byteStream, this);
      }
      idx += CP_CLASSES[tag].size;
    }
    endIdx = byteStream.pos();

    // Process tiers.
    deferredQueue.forEach((deferredItems: { offset: number; index: number; }[]) => {
      deferredItems.forEach((item: { offset: number; index: number; }) => {
        byteStream.seek(item.offset);
        tag = byteStream.getUint8();
        this.constantPool[item.index] = CP_CLASSES[tag].fromBytes(byteStream, this);
        if (cpPatches !== null && cpPatches.array[item.index] !== null && cpPatches.array[item.index] !== undefined) {
          /*
           * For each CP entry, the corresponding CP patch must either be null or have
           * the format that matches its tag:
           *
           * * Integer, Long, Float, Double: the corresponding wrapper object type from java.lang
           * * Utf8: a string (must have suitable syntax if used as signature or name)
           * * Class: any java.lang.Class object
           * * String: any object (not just a java.lang.String)
           * * InterfaceMethodRef: (NYI) a method handle to invoke on that call site's arguments
           */
          var patchObj: JVMTypes.java_lang_Object = cpPatches.array[item.index];
          switch (patchObj.getClass().getInternalName()) {
            case 'Ljava/lang/Integer;':
              assert(tag === ConstantPoolItemType.INTEGER);
              (<ConstInt32> this.constantPool[item.index]).value = (<JVMTypes.java_lang_Integer> patchObj)['java/lang/Integer/value'];
              break;
            case 'Ljava/lang/Long;':
              assert(tag === ConstantPoolItemType.LONG);
              (<ConstLong> this.constantPool[item.index]).value = (<JVMTypes.java_lang_Long> patchObj)['java/lang/Long/value'];
              break;
            case 'Ljava/lang/Float;':
              assert(tag === ConstantPoolItemType.FLOAT);
              (<ConstFloat> this.constantPool[item.index]).value = (<JVMTypes.java_lang_Float> patchObj)['java/lang/Float/value'];
              break;
            case 'Ljava/lang/Double;':
              assert(tag === ConstantPoolItemType.DOUBLE);
              (<ConstDouble> this.constantPool[item.index]).value = (<JVMTypes.java_lang_Double> patchObj)['java/lang/Double/value'];
              break;
            case 'Ljava/lang/String;':
              assert(tag === ConstantPoolItemType.UTF8);
              (<ConstUTF8> this.constantPool[item.index]).value = (<JVMTypes.java_lang_String> patchObj).toString();
              break;
            case 'Ljava/lang/Class;':
              assert(tag === ConstantPoolItemType.CLASS);
              (<ClassReference> this.constantPool[item.index]).name = (<JVMTypes.java_lang_Class> patchObj).$cls.getInternalName();
              (<ClassReference> this.constantPool[item.index]).cls = <ReferenceClassData<JVMTypes.java_lang_Object>> (<JVMTypes.java_lang_Class> patchObj).$cls;
              break;
            default:
              assert(tag === ConstantPoolItemType.STRING);
              (<ConstString> this.constantPool[item.index]).stringValue = "";
              // XXX: Not actually a string, but the JVM does this.
              (<ConstString> this.constantPool[item.index]).value = <JVMTypes.java_lang_String> patchObj;
              break;
          }
        }
      });
    });

    // Return to the correct offset, at the end of the CP data.
    byteStream.seek(endIdx);
    return byteStream;
  }

  public get(idx: number): IConstantPoolItem {
    assert(this.constantPool[idx] !== undefined, "Invalid ConstantPool reference.");
    return this.constantPool[idx];
  }

  public getUnchecked(idx: number): IConstantPoolItem {
    return this.constantPool[idx];
  }

  public each(fn: (idx: number, item: IConstantPoolItem) => void): void {
    this.constantPool.forEach((item: IConstantPoolItem, idx: number) => {
      if (item !== undefined) {
        fn(idx, item);
      }
    });
  }
}

/// Resolved forms of constant pool items.
