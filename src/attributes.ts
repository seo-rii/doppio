import {descriptor2typestr} from './util';
import ByteStream from './ByteStream';
import {ConstantPool, ClassReference, ConstUTF8, IConstantPoolItem, MethodHandle, NameAndTypeInfo} from './ConstantPool';
import {StackMapTableEntryType, ConstantPoolItemType} from './enums';
import {validateUnqualifiedName, validateFieldDescriptor} from './classfile_validation';
export interface IAttributeClass {
  parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen: number, name: string, majorVersion?: number): IAttribute;
}

export type AttributeContext = 'class' | 'field' | 'method' | 'code' | 'record';

function attributeConstant(constantPool: ConstantPool, index: number, type: ConstantPoolItemType): IConstantPoolItem {
  var item = constantPool.get(index);
  if (item.getType() !== type) {
    throw new Error('Attribute constant pool entry ' + index + ' must be ' + ConstantPoolItemType[type]);
  }
  return item;
}

export interface IAttribute {
  getName(): string;
}

export interface IInnerClassInfo {
  innerInfoIndex: number;
  outerInfoIndex: number;
  innerNameIndex: number;
  innerAccessFlags: number;
}

export interface IRecordComponentInfo {
  name: string;
  descriptor: string;
  attrs: IAttribute[];
}

export interface IMethodParameterInfo {
  name: string;
  accessFlags: number;
}

export class ExceptionHandler implements IAttribute {
  public startPC: number;
  public endPC: number;
  public handlerPC: number;
  public catchType: string;
  constructor(startPC: number, endPC: number, handlerPC: number, catchType: string) {
    this.startPC = startPC;
    this.endPC = endPC;
    this.handlerPC = handlerPC;
    this.catchType = catchType;
  }
  public getName() {
    return 'ExceptionHandler';
  }
  public static parse(bytesArray: ByteStream, constantPool: ConstantPool): IAttribute {
    var startPC = bytesArray.getUint16(),
      endPC = bytesArray.getUint16(),
      handlerPC = bytesArray.getUint16(),
      cti = bytesArray.getUint16(),
      catchType = cti === 0 ? "<any>" : (<ClassReference> attributeConstant(constantPool, cti, ConstantPoolItemType.CLASS)).name;
    return new this(startPC, endPC, handlerPC, catchType);
  }
}

export class Code implements IAttribute {
  private maxStack: number;
  private maxLocals: number;
  public exceptionHandlers: ExceptionHandler[];
  private attrs: IAttribute[];
  private code: Buffer;

  constructor(maxStack: number, maxLocals: number, exceptionHandlers: ExceptionHandler[], attrs: IAttribute[], code: Buffer) {
    this.maxStack = maxStack;
    this.maxLocals = maxLocals;
    this.exceptionHandlers = exceptionHandlers;
    this.attrs = attrs;
    this.code = code;
  }

  public getName() {
    return 'Code';
  }

  public getMaxStack(): number {
    return this.maxStack;
  }

  public getMaxLocals(): number {
    return this.maxLocals;
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen?: number, name?: string, majorVersion?: number): IAttribute {
    var maxStack = byteStream.getUint16(),
      maxLocals = byteStream.getUint16(),
      codeLen = byteStream.getUint32();
    if (codeLen === 0 || codeLen >= 65536) {
      throw new Error('Code length must be between 1 and 65535: ' + codeLen);
    }
    var code = byteStream.slice(codeLen).getBuffer(),
      exceptLen = byteStream.getUint16(),
      exceptionHandlers: ExceptionHandler[] = [];
    for (var i = 0; i < exceptLen; i++) {
      var handler = <ExceptionHandler> ExceptionHandler.parse(byteStream, constantPool);
      if (handler.startPC >= handler.endPC || handler.endPC > codeLen || handler.handlerPC >= codeLen) {
        throw new Error('Invalid Code exception handler range');
      }
      exceptionHandlers.push(handler);
    }
    // yes, there are even attrs on attrs. BWOM... BWOM...
    var attrs = makeAttributes(byteStream, constantPool, 'code', majorVersion);
    return new this(maxStack, maxLocals, exceptionHandlers, attrs, code);
  }

  public getCode(): NodeBuffer {
    return this.code;
  }

  public getAttribute(name: string): IAttribute {
    for (var i = 0; i < this.attrs.length; i++) {
      var attr = this.attrs[i];
      if (attr.getName() === name) {
        return attr;
      }
    }
    return null;
  }
}

export interface ILineNumberTableEntry {
  startPC: number;
  lineNumber: number;
}

export class LineNumberTable implements IAttribute {
  private entries: ILineNumberTableEntry[];

  constructor(entries: ILineNumberTableEntry[]) {
    this.entries = entries;
  }

  public getName() {
    return 'LineNumberTable';
  }

  /**
   * Returns the relevant source code line number for the specified program
   * counter.
   */
  public getLineNumber(pc: number): number {
    var j: number, lineNumber = -1;
    // get the last line number before the stack frame's pc
    for (j = 0; j < this.entries.length; j++) {
      var entry = this.entries[j];
      if (entry.startPC <= pc) {
        lineNumber = entry.lineNumber;
      } else {
        // Further entries are past the PC.
        break;
      }
    }
    return lineNumber;
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var entries: ILineNumberTableEntry[] = [];
    var lntLen = byteStream.getUint16();
    for (var i = 0; i < lntLen; i++) {
      var spc = byteStream.getUint16();
      var ln = byteStream.getUint16();
      entries.push({
        'startPC': spc,
        'lineNumber': ln
      });
    }
    return new this(entries);
  }
}

export class SourceFile implements IAttribute {
  public filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  public getName() {
    return 'SourceFile';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    return new this((<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value);
  }
}

export interface IStackMapTableEntry {
  type: StackMapTableEntryType;
  offsetDelta: number;
  numLocals?: number;
  locals?: string[];
  numStackItems?: number;
  stack?: string[];
  localsTypes?: IVerificationTypeInfo[];
  stackTypes?: IVerificationTypeInfo[];
  k?: number;
}

export interface IVerificationTypeInfo {
  tag: number;
  className?: string;
  cpIndex?: number;
  newOffset?: number;
}

export class StackMapTable implements IAttribute {
  private entries: IStackMapTableEntry[];

  constructor(entries: IStackMapTableEntry[]) {
    this.entries = entries;
  }

  public getName() {
    return 'StackMapTable';
  }

  public getEntries(): IStackMapTableEntry[] {
    return this.entries;
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numEntries = byteStream.getUint16(),
      entries: IStackMapTableEntry[] = [];
    for (var i = 0; i < numEntries; i++) {
      entries.push(this.parseEntry(byteStream, constantPool));
    }
    return new this(entries);
  }

  private static parseEntry(byteStream: ByteStream, constantPool: ConstantPool): IStackMapTableEntry {
    var frameType = byteStream.getUint8(), locals: IVerificationTypeInfo[],
      offsetDelta: number, i: number, stackItem: IVerificationTypeInfo;
    if (frameType < 64) {
      return {
        type: StackMapTableEntryType.SAME_FRAME,
        offsetDelta: frameType
      };
    } else if (frameType < 128) {
      stackItem = this.parseVerificationTypeInfo(byteStream, constantPool);
      return {
        type: StackMapTableEntryType.SAME_LOCALS_1_STACK_ITEM_FRAME,
        offsetDelta: frameType - 64,
        stack: [this.verificationTypeName(stackItem)],
        stackTypes: [stackItem]
      };
    } else if (frameType < 247) {
      throw new Error('Reserved StackMapTable frame type: ' + frameType);
    } else if (frameType === 247) {
      offsetDelta = byteStream.getUint16();
      stackItem = this.parseVerificationTypeInfo(byteStream, constantPool);
      return {
        type: StackMapTableEntryType.SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED,
        offsetDelta: offsetDelta,
        stack: [this.verificationTypeName(stackItem)],
        stackTypes: [stackItem]
      };
    } else if (frameType < 251) {
      return {
        type: StackMapTableEntryType.CHOP_FRAME,
        offsetDelta: byteStream.getUint16(),
        k: 251 - frameType
      };
    } else if (frameType === 251) {
      return {
        type: StackMapTableEntryType.SAME_FRAME_EXTENDED,
        offsetDelta: byteStream.getUint16()
      };
    } else if (frameType < 255) {
      offsetDelta = byteStream.getUint16();
      locals = [];
      for (i = 0; i < frameType - 251; i++) {
        locals.push(this.parseVerificationTypeInfo(byteStream, constantPool));
      }
      return {
        type: StackMapTableEntryType.APPEND_FRAME,
        offsetDelta: offsetDelta,
        locals: locals.map(this.verificationTypeName),
        localsTypes: locals
      };
    } else if (frameType === 255) {
      offsetDelta = byteStream.getUint16();
      var numLocals = byteStream.getUint16();
      locals = [];
      for (i = 0; i < numLocals; i++) {
        locals.push(this.parseVerificationTypeInfo(byteStream, constantPool));
      }
      var numStackItems = byteStream.getUint16();
      var stack: IVerificationTypeInfo[] = [];
      for (i = 0; i < numStackItems; i++) {
        stack.push(this.parseVerificationTypeInfo(byteStream, constantPool));
      }
      return {
        type: StackMapTableEntryType.FULL_FRAME,
        offsetDelta: offsetDelta,
        numLocals: numLocals,
        locals: locals.map(this.verificationTypeName),
        localsTypes: locals,
        numStackItems: numStackItems,
        stack: stack.map(this.verificationTypeName),
        stackTypes: stack
      };
    }
  }

  private static parseVerificationTypeInfo(byteStream: ByteStream, constantPool: ConstantPool): IVerificationTypeInfo {
    var info: IVerificationTypeInfo = {tag: byteStream.getUint8()};
    if (info.tag === 7) {
      info.cpIndex = byteStream.getUint16();
      info.className = (<ClassReference> attributeConstant(constantPool, info.cpIndex, ConstantPoolItemType.CLASS)).name;
    } else if (info.tag === 8) {
      info.newOffset = byteStream.getUint16();
    } else if (info.tag > 8) {
      throw new Error('Invalid StackMapTable verification type: ' + info.tag);
    }
    return info;
  }

  private static verificationTypeName(info: IVerificationTypeInfo): string {
    if (info.tag === 7) {
      return 'class ' + (/\w/.test(info.className[0]) ? descriptor2typestr(info.className) : '"' + info.className + '"');
    } else if (info.tag === 8) {
      return 'uninitialized ' + info.newOffset;
    }
    return ['bogus', 'int', 'float', 'double', 'long', 'null', 'this'][info.tag];
  }
}

export interface ILocalVariableTableEntry {
  startPC: number;
  length: number;
  name: string;
  descriptor: string;
  ref: number;
}

export class LocalVariableTable implements IAttribute {
  private entries: ILocalVariableTableEntry[];

  constructor(entries: ILocalVariableTableEntry[]) {
    this.entries = entries;
  }

  public getName() {
    return 'LocalVariableTable';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numEntries = byteStream.getUint16(),
      entries: ILocalVariableTableEntry[] = [];
    for (var i = 0; i < numEntries; i++) {
      entries.push(this.parseEntries(byteStream, constantPool));
    }
    return new this(entries);
  }

  private static parseEntries(bytes_array: ByteStream, constant_pool: ConstantPool): ILocalVariableTableEntry {
    return {
      startPC: bytes_array.getUint16(),
      length: bytes_array.getUint16(),
      name: (<ConstUTF8> attributeConstant(constant_pool, bytes_array.getUint16(), ConstantPoolItemType.UTF8)).value,
      descriptor: (<ConstUTF8> attributeConstant(constant_pool, bytes_array.getUint16(), ConstantPoolItemType.UTF8)).value,
      ref: bytes_array.getUint16()
    };
  }
}

export interface ILocalVariableTypeTableEntry {
  startPC: number;
  length: number;
  name: string;
  signature: string;
  index: number;
}

export class LocalVariableTypeTable implements IAttribute {
  public entries: ILocalVariableTypeTableEntry[];
  constructor(entries: ILocalVariableTypeTableEntry[]) {
    this.entries = entries;
  }
  public getName(): string {
    return 'LocalVariableTypeTable';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numEntries = byteStream.getUint16(), i: number,
      entries: ILocalVariableTypeTableEntry[] = [];
    for (i = 0; i < numEntries; i++) {
      entries.push(this.parseTableEntry(byteStream, constantPool));
    }
    return new this(entries);
  }

  private static parseTableEntry(byteStream: ByteStream, constantPool: ConstantPool): ILocalVariableTypeTableEntry {
    return {
      startPC: byteStream.getUint16(),
      length: byteStream.getUint16(),
      name: (<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value,
      signature: (<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value,
      index: byteStream.getUint16()
    };
  }
}

export class Exceptions implements IAttribute {
  public exceptions: string[];

  constructor(exceptions: string[]) {
    this.exceptions = exceptions;
  }

  public getName() {
    return 'Exceptions';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numExceptions = byteStream.getUint16();
    var excRefs: number[] = [];
    for (var i = 0; i < numExceptions; i++) {
      excRefs.push(byteStream.getUint16());
    }
    return new this(excRefs.map((ref: number) => (<ClassReference> attributeConstant(constantPool, ref, ConstantPoolItemType.CLASS)).name));
  }
}

export class InnerClasses implements IAttribute {
  public classes: IInnerClassInfo[];

  constructor(classes: IInnerClassInfo[]) {
    this.classes = classes;
  }

  public getName() {
    return 'InnerClasses';
  }

  public static parse(bytes_array: ByteStream, constant_pool: ConstantPool): IAttribute {
    var numClasses = bytes_array.getUint16(),
      classes: IInnerClassInfo[] = [];
    for (var i = 0; i < numClasses; i++) {
      classes.push(this.parseClass(bytes_array, constant_pool));
    }
    return new this(classes);
  }

  public static parseClass(byteStream: ByteStream, constantPool: ConstantPool): IInnerClassInfo {
    var info = {
      innerInfoIndex: byteStream.getUint16(),
      outerInfoIndex: byteStream.getUint16(),
      innerNameIndex: byteStream.getUint16(),
      innerAccessFlags: byteStream.getUint16()
    };
    attributeConstant(constantPool, info.innerInfoIndex, ConstantPoolItemType.CLASS);
    if (info.outerInfoIndex !== 0) {
      attributeConstant(constantPool, info.outerInfoIndex, ConstantPoolItemType.CLASS);
    }
    if (info.innerNameIndex !== 0) {
      attributeConstant(constantPool, info.innerNameIndex, ConstantPoolItemType.UTF8);
    }
    return info;
  }
}

export class ConstantValue implements IAttribute {
  public value: IConstantPoolItem;

  constructor(value: IConstantPoolItem) {
    this.value = value;
  }

  public getName() {
    return 'ConstantValue';
  }

  public static parse(bytes_array: ByteStream, constant_pool: ConstantPool): IAttribute {
    var ref = bytes_array.getUint16(), item = constant_pool.get(ref), type = item.getType();
    if (type !== ConstantPoolItemType.INTEGER && type !== ConstantPoolItemType.FLOAT &&
        type !== ConstantPoolItemType.LONG && type !== ConstantPoolItemType.DOUBLE && type !== ConstantPoolItemType.STRING) {
      throw new Error('Invalid ConstantValue constant pool entry: ' + ref);
    }
    return new this(item);
  }
}

export class Synthetic implements IAttribute {
  public getName() {
    return 'Synthetic';
  }
  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    return new this();
  }
}

export class Deprecated implements IAttribute {
  public getName() {
    return 'Deprecated';
  }
  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    return new this();
  }
}

export class Signature implements IAttribute {
  public sig: string;

  constructor(sig: string) {
    this.sig = sig;
  }

  public getName() {
    return 'Signature';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    return new this((<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value);
  }
}

export class RuntimeVisibleAnnotations implements IAttribute {
  public rawBytes: Buffer;
  public isHidden: boolean;
  public isCallerSensitive: boolean;
  public isCompiled: boolean;

  constructor(rawBytes: Buffer, isHidden: boolean, isCallerSensitive: boolean, isCompiled: boolean) {
    this.rawBytes = rawBytes;
    this.isHidden = isHidden;
    this.isCallerSensitive = isCallerSensitive;
    this.isCompiled = isCompiled;
  }

  public getName() {
    return 'RuntimeVisibleAnnotations';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen: number): IAttribute {
    // No need to parse; OpenJDK parses these from within Java code from
    // the raw bytes.
    // ...but we need to look for the 'Hidden' annotation, which specifies if
    // the method should be omitted from stack frames.
    // And the 'compiled' annotation, which specifies if the method was
    // compiled.
    // And the 'CallerSensitive' annotation, which specifies that the function's
    // behavior differs depending on the caller.
    var rawBytes = byteStream.read(attrLen),
      annotationBytes = new ByteStream(rawBytes),
      isHidden = false, isCompiled = false, isCallerSensitive = false;

    /**
     * Skip the current RuntimeVisibleAnnotation.
     */
    function skipAnnotation() {
      annotationBytes.skip(2); // type index
      var numValuePairs = annotationBytes.getUint16(),
        i: number;
      for (i = 0; i < numValuePairs; i++) {
        annotationBytes.skip(2); // element name index
        skipElementValue();
      }
    }

    /**
     * Skip this particular element value.
     */
    function skipElementValue() {
      var tag = String.fromCharCode(annotationBytes.getUint8());
      switch(tag) {
        case 'e':
          // Fall-through.
          annotationBytes.skip(2);
        case 'Z':
        case 'B':
        case 'C':
        case 'S':
        case 'I':
        case 'F':
        case 'J':
        case 'D':
        case 's':
        case 'c':
          annotationBytes.skip(2);
          break;
        case '@':
          skipAnnotation();
          break;
        case '[':
          var numValues = annotationBytes.getUint16(), i: number;
          for (i = 0; i < numValues; i++) {
            skipElementValue();
          }
          break;
        default:
          throw new Error('Invalid annotation element value tag: ' + tag);
      }
    }

    try {
      var numAttributes = annotationBytes.getUint16(), i: number;
      for (i = 0; i < numAttributes; i++) {
        var typeName = <ConstUTF8> attributeConstant(constantPool, annotationBytes.getUint16(), ConstantPoolItemType.UTF8);
        // Rewind the isolated marker scan, never the class-file stream.
        annotationBytes.seek(annotationBytes.pos() - 2);
        skipAnnotation();
        switch (typeName.value) {
          case 'Ljava/lang/invoke/LambdaForm$Hidden;':
            isHidden = true;
            break;
          case 'Lsig/sun/reflect/CallerSensitive;':
          case 'Ljdk/internal/reflect/CallerSensitive;':
            isCallerSensitive = true;
            break;
          case 'Lsig/java/lang/invoke/LambdaForm$Compiled':
            isCompiled = true;
            break;
        }
      }
    } catch (e) {
      // Annotation structure is interpreted by Java reflection, which owns
      // AnnotationFormatError. Malformed opaque metadata must not become a
      // load-time ClassFormatError just because we inspect VM marker names.
      isHidden = isCompiled = isCallerSensitive = false;
    }

    return new this(rawBytes, isHidden, isCallerSensitive, isCompiled);
  }
}

export class RuntimeVisibleTypeAnnotations implements IAttribute {
  public rawBytes: Buffer;

  constructor(rawBytes: Buffer) {
    this.rawBytes = rawBytes;
  }

  public getName() {
    return 'RuntimeVisibleTypeAnnotations';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen: number): IAttribute {
    return new this(byteStream.read(attrLen));
  }

  public topLevelAnnotationBytes(): Buffer {
    function u2(value: number): Buffer {
      var rv = Buffer.alloc(2);
      rv.writeUInt16BE(value, 0);
      return rv;
    }

    function skipAnnotation(bytes: ByteStream): void {
      bytes.skip(2); // type_index
      var numElementValuePairs = bytes.getUint16(), i: number;
      for (i = 0; i < numElementValuePairs; i++) {
        bytes.skip(2); // element_name_index
        skipElementValue(bytes);
      }
    }

    function skipElementValue(bytes: ByteStream): void {
      var tag = String.fromCharCode(bytes.getUint8()), numValues: number, i: number;
      switch (tag) {
        case 'e':
          bytes.skip(4);
          break;
        case 'Z':
        case 'B':
        case 'C':
        case 'S':
        case 'I':
        case 'F':
        case 'J':
        case 'D':
        case 's':
        case 'c':
          bytes.skip(2);
          break;
        case '@':
          skipAnnotation(bytes);
          break;
        case '[':
          numValues = bytes.getUint16();
          for (i = 0; i < numValues; i++) {
            skipElementValue(bytes);
          }
          break;
        default:
          throw new Error('Unknown annotation element value tag: ' + tag);
      }
    }

    function skipTargetInfo(bytes: ByteStream, targetType: number): void {
      var tableLength: number;
      switch (targetType) {
        case 0x00:
        case 0x01:
        case 0x16:
          bytes.skip(1);
          break;
        case 0x10:
        case 0x17:
        case 0x42:
        case 0x43:
        case 0x44:
        case 0x45:
        case 0x46:
          bytes.skip(2);
          break;
        case 0x11:
        case 0x12:
          bytes.skip(2);
          break;
        case 0x13:
        case 0x14:
        case 0x15:
          break;
        case 0x40:
        case 0x41:
          tableLength = bytes.getUint16();
          bytes.skip(tableLength * 6);
          break;
        case 0x47:
        case 0x48:
        case 0x49:
        case 0x4A:
        case 0x4B:
          bytes.skip(3);
          break;
        default:
          throw new Error('Unknown type annotation target_type: ' + targetType);
      }
    }

    var bytes = new ByteStream(this.rawBytes),
      numAnnotations = bytes.getUint16(),
      annotations: Buffer[] = [],
      i: number;
    for (i = 0; i < numAnnotations; i++) {
      var targetType = bytes.getUint8(),
        annotationStart: number,
        annotationEnd: number,
        typePathLength: number;
      skipTargetInfo(bytes, targetType);
      typePathLength = bytes.getUint8();
      bytes.skip(typePathLength * 2);
      annotationStart = bytes.pos();
      skipAnnotation(bytes);
      annotationEnd = bytes.pos();
      if (typePathLength === 0) {
        annotations.push(this.rawBytes.slice(annotationStart, annotationEnd));
      }
    }

    if (annotations.length === 0) {
      return null;
    }
    return Buffer.concat([u2(annotations.length)].concat(annotations));
  }
}

export class AnnotationDefault implements IAttribute {
  public rawBytes: Buffer;
  constructor(rawBytes: Buffer) {
    this.rawBytes = rawBytes;
  }

  public getName() {
    return 'AnnotationDefault';
  }
  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen?: number): IAttribute {
    return new this(byteStream.read(attrLen));
  }
}

export class EnclosingMethod implements IAttribute {
  public encClass: ClassReference;
  /**
   * Note: Is NULL if the current class is not immediately enclosed by a method
   * or a constructor.
   */
  public encMethod: NameAndTypeInfo;
  constructor(encClass: ClassReference, encMethod: NameAndTypeInfo) {
    this.encClass = encClass;
    this.encMethod = encMethod;
  }

  public getName() {
    return 'EnclosingMethod';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var encClass = (<ClassReference> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.CLASS)),
      methodRef = byteStream.getUint16(), encMethod: NameAndTypeInfo = null;
    if (methodRef > 0) {
      encMethod = <NameAndTypeInfo> attributeConstant(constantPool, methodRef, ConstantPoolItemType.NAME_AND_TYPE);
    }
    return new this(encClass, encMethod);
  }
}

export class BootstrapMethods implements IAttribute {
  public bootstrapMethods: Array<[MethodHandle, IConstantPoolItem[]]>;
  constructor(bootstrapMethods: Array<[MethodHandle, IConstantPoolItem[]]>) {
    this.bootstrapMethods = bootstrapMethods;
  }

  public getName() {
    return 'BootstrapMethods';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numBootstrapMethods = byteStream.getUint16(),
      bootstrapMethods: Array<[MethodHandle, IConstantPoolItem[]]> = [];
    for (var i = 0; i < numBootstrapMethods; i++) {
      var methodHandle = <MethodHandle> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.METHOD_HANDLE);
      var numArgs = byteStream.getUint16();
      var args: IConstantPoolItem[] = [];
      for (var j = 0; j < numArgs; j++) {
        var argument = constantPool.get(byteStream.getUint16());
        switch (argument.getType()) {
          case ConstantPoolItemType.INTEGER:
          case ConstantPoolItemType.FLOAT:
          case ConstantPoolItemType.LONG:
          case ConstantPoolItemType.DOUBLE:
          case ConstantPoolItemType.CLASS:
          case ConstantPoolItemType.STRING:
          case ConstantPoolItemType.METHOD_HANDLE:
          case ConstantPoolItemType.METHOD_TYPE:
          case ConstantPoolItemType.DYNAMIC:
            args.push(argument);
            break;
          default:
            throw new Error('Invalid BootstrapMethods argument constant pool type');
        }
      }
      bootstrapMethods.push([methodHandle, args]);
    }
    return new this(bootstrapMethods);
  }
}

export class NestHost implements IAttribute {
  public hostClass: ClassReference;

  constructor(hostClass: ClassReference) {
    this.hostClass = hostClass;
  }

  public getName() {
    return 'NestHost';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    return new this(<ClassReference> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.CLASS));
  }
}

export class NestMembers implements IAttribute {
  public classes: ClassReference[];

  constructor(classes: ClassReference[]) {
    this.classes = classes;
  }

  public getName() {
    return 'NestMembers';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numClasses = byteStream.getUint16(),
      classes: ClassReference[] = [];
    for (var i = 0; i < numClasses; i++) {
      classes.push(<ClassReference> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.CLASS));
    }
    return new this(classes);
  }
}

export class PermittedSubclasses implements IAttribute {
  public classes: ClassReference[];

  constructor(classes: ClassReference[]) {
    this.classes = classes;
  }

  public getName() {
    return 'PermittedSubclasses';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var numClasses = byteStream.getUint16(),
      classes: ClassReference[] = [];
    for (var i = 0; i < numClasses; i++) {
      classes.push(<ClassReference> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.CLASS));
    }
    return new this(classes);
  }
}

export class RecordAttribute implements IAttribute {
  public components: IRecordComponentInfo[];

  constructor(components: IRecordComponentInfo[]) {
    this.components = components;
  }

  public getName() {
    return 'Record';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen?: number, name?: string, majorVersion?: number): IAttribute {
    var numComponents = byteStream.getUint16(),
      components: IRecordComponentInfo[] = [];
    for (var i = 0; i < numComponents; i++) {
      var componentName = (<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value,
        descriptor = (<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value;
      validateUnqualifiedName(componentName);
      validateFieldDescriptor(descriptor);
      components.push({
        name: componentName,
        descriptor: descriptor,
        attrs: makeAttributes(byteStream, constantPool, 'record', majorVersion)
      });
    }
    return new this(components);
  }
}

export class RuntimeVisibleParameterAnnotations implements IAttribute {
  public rawBytes: Buffer;
  constructor(rawBytes: Buffer) {
    this.rawBytes = rawBytes;
  }

  public getName() {
    return 'RuntimeVisibleParameterAnnotations';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen: number): IAttribute {
    return new this(byteStream.read(attrLen));
  }
}

export class MethodParameters implements IAttribute {
  public parameters: IMethodParameterInfo[];

  constructor(parameters: IMethodParameterInfo[]) {
    this.parameters = parameters;
  }

  public getName() {
    return 'MethodParameters';
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool): IAttribute {
    var parameterCount = byteStream.getUint8(),
      parameters: IMethodParameterInfo[] = [];
    for (var i = 0; i < parameterCount; i++) {
      var nameIndex = byteStream.getUint16();
      parameters.push({
        name: nameIndex === 0 ? null : (<ConstUTF8> attributeConstant(constantPool, nameIndex, ConstantPoolItemType.UTF8)).value,
        accessFlags: byteStream.getUint16()
      });
    }
    return new this(parameters);
  }
}

/** Metadata retained structurally but never exposed as runtime-visible annotations. */
class OpaqueAttribute implements IAttribute {
  constructor(private name: string, public rawBytes: Buffer) {}

  public getName(): string {
    return this.name;
  }

  public static parse(byteStream: ByteStream, constantPool: ConstantPool, attrLen: number, name: string): IAttribute {
    return new this(name, byteStream.read(attrLen));
  }
}

// Attribute recognition is location- and version-dependent (JVMS 4.7).
// Unknown names, including future standardized attributes, remain ignorable.
var attributeTypes: {[name: string]: {parser: IAttributeClass; contexts: AttributeContext[]; majorVersion: number; multiple?: boolean; multipleInCode?: boolean}} = {
  'Code': {parser: Code, contexts: ['method'], majorVersion: 45},
  'LineNumberTable': {parser: LineNumberTable, contexts: ['code'], majorVersion: 45, multiple: true},
  'SourceFile': {parser: SourceFile, contexts: ['class'], majorVersion: 45},
  'StackMapTable': {parser: StackMapTable, contexts: ['code'], majorVersion: 50},
  'LocalVariableTable': {parser: LocalVariableTable, contexts: ['code'], majorVersion: 45, multiple: true},
  'LocalVariableTypeTable': {parser: LocalVariableTypeTable, contexts: ['code'], majorVersion: 49, multiple: true},
  'ConstantValue': {parser: ConstantValue, contexts: ['field'], majorVersion: 45},
  'Exceptions': {parser: Exceptions, contexts: ['method'], majorVersion: 45},
  'InnerClasses': {parser: InnerClasses, contexts: ['class'], majorVersion: 45},
  'Synthetic': {parser: Synthetic, contexts: ['class', 'field', 'method'], majorVersion: 45, multiple: true},
  'Deprecated': {parser: Deprecated, contexts: ['class', 'field', 'method'], majorVersion: 45, multiple: true},
  'Signature': {parser: Signature, contexts: ['class', 'field', 'method', 'record'], majorVersion: 49},
  'RuntimeVisibleAnnotations': {parser: RuntimeVisibleAnnotations, contexts: ['class', 'field', 'method', 'record'], majorVersion: 49},
  'RuntimeInvisibleAnnotations': {parser: OpaqueAttribute, contexts: ['class', 'field', 'method', 'record'], majorVersion: 49},
  // Code-level type annotations are not interpreted by class loading. Preserve
  // their bytes without imposing a declaration-level singleton check: both
  // native controls accept repeated opaque Code-level annotation attributes.
  'RuntimeVisibleTypeAnnotations': {parser: RuntimeVisibleTypeAnnotations, contexts: ['class', 'field', 'method', 'code', 'record'], majorVersion: 52, multipleInCode: true},
  'RuntimeInvisibleTypeAnnotations': {parser: OpaqueAttribute, contexts: ['class', 'field', 'method', 'code', 'record'], majorVersion: 52, multipleInCode: true},
  'AnnotationDefault': {parser: AnnotationDefault, contexts: ['method'], majorVersion: 49},
  'EnclosingMethod': {parser: EnclosingMethod, contexts: ['class'], majorVersion: 49},
  'BootstrapMethods': {parser: BootstrapMethods, contexts: ['class'], majorVersion: 51},
  'NestHost': {parser: NestHost, contexts: ['class'], majorVersion: 55},
  'NestMembers': {parser: NestMembers, contexts: ['class'], majorVersion: 55},
  'PermittedSubclasses': {parser: PermittedSubclasses, contexts: ['class'], majorVersion: 61},
  'Record': {parser: RecordAttribute, contexts: ['class'], majorVersion: 60},
  'RuntimeVisibleParameterAnnotations': {parser: RuntimeVisibleParameterAnnotations, contexts: ['method'], majorVersion: 49},
  'RuntimeInvisibleParameterAnnotations': {parser: OpaqueAttribute, contexts: ['method'], majorVersion: 49},
  'MethodParameters': {parser: MethodParameters, contexts: ['method'], majorVersion: 52}
};

export function makeAttributes(byteStream: ByteStream, constantPool: ConstantPool, context?: AttributeContext, majorVersion?: number, isStaticField?: boolean): IAttribute[]{
  var numAttrs = byteStream.getUint16(),
    attrs: IAttribute[] = [],
    seen: {[name: string]: boolean} = Object.create(null);
  for (var i = 0; i < numAttrs; i++) {
    var name = (<ConstUTF8> attributeConstant(constantPool, byteStream.getUint16(), ConstantPoolItemType.UTF8)).value,
      attrLen = byteStream.getUint32(),
      type = Object.prototype.hasOwnProperty.call(attributeTypes, name) ? attributeTypes[name] : null;
    // JVMS 4.7.2 requires ignoring ConstantValue for instance fields. Its
    // payload (including duplicates) is opaque, but its envelope is bounded.
    if (type !== null && !(name === 'ConstantValue' && context === 'field' && isStaticField === false) &&
        (context === undefined || type.contexts.indexOf(context) !== -1) &&
        (majorVersion === undefined || majorVersion >= type.majorVersion)) {
      var payload = byteStream.slice(attrLen);
      if (seen[name] && !type.multiple && !(context === 'code' && type.multipleInCode)) {
        throw new Error('Duplicate ' + name + ' attribute');
      }
      seen[name] = true;
      if ((name === 'NestHost' && seen['NestMembers']) || (name === 'NestMembers' && seen['NestHost'])) {
        throw new Error('A class cannot have both NestHost and NestMembers attributes');
      }
      var attr = type.parser.parse(payload, constantPool, attrLen, name, majorVersion);
      if (payload.hasBytes()) {
        throw new Error('Invalid ' + name + ' attribute length: ' + payload.size() + ' unused bytes');
      }
      attrs.push(attr);
    } else {
      // Skip only a bounded payload: a truncated unknown attribute is still
      // a malformed class-file envelope, not a new optional feature.
      byteStream.skip(attrLen);
    }
  }
  return attrs;
}
