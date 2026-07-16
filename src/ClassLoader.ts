import {ClassData, ReferenceClassData, ArrayClassData, PrimitiveClassData} from './ClassData';
import {JVMThread} from './threading';
import ClassLock from './ClassLock';
import {IClasspathItem, ClasspathFactory} from './classpath';
import {TriState} from './enums';
import {get_component_type, is_array_type, is_primitive_type, is_reference_type, asyncForEach, ext_classname, descriptor2typestr, asyncFind, initString} from './util';
import * as logging from './logging';
import assert from './assert';
import JAR from './jar';
import * as path from 'path';
import * as fs from 'fs';
import * as JVMTypes from '../includes/JVMTypes';
import {setImmediate} from 'browserfs';
const debug = logging.debug;
const error = logging.error;

function u2(value: number): Buffer {
  var rv = Buffer.alloc(2);
  rv.writeUInt16BE(value, 0);
  return rv;
}

function u4(value: number): Buffer {
  var rv = Buffer.alloc(4);
  rv.writeUInt32BE(value, 0);
  return rv;
}

function utf8Constant(value: string): Buffer {
  var text = Buffer.from(value, 'utf8'),
    rv = Buffer.alloc(3 + text.length);
  rv.writeUInt8(1, 0);
  rv.writeUInt16BE(text.length, 1);
  text.copy(rv, 3);
  return rv;
}

function constantPoolEnd(data: Buffer): { count: number; offset: number } {
  var count = data.readUInt16BE(8),
    offset = 10;
  for (var i = 1; i < count; i++) {
    var tag = data.readUInt8(offset++);
    switch (tag) {
      case 1:
        offset += 2 + data.readUInt16BE(offset);
        break;
      case 3:
      case 4:
      case 9:
      case 10:
      case 11:
      case 12:
      case 17:
      case 18:
        offset += 4;
        break;
      case 5:
      case 6:
        offset += 8;
        i++;
        break;
      case 7:
      case 8:
      case 16:
      case 19:
      case 20:
        offset += 2;
        break;
      case 15:
        offset += 3;
        break;
      default:
        throw new Error('Unknown constant-pool tag ' + tag);
    }
  }
  return { count: count, offset: offset };
}

function skipMember(data: Buffer, offset: number): number {
  var attributesCount: number;
  offset += 6;
  attributesCount = data.readUInt16BE(offset);
  offset += 2;
  for (var i = 0; i < attributesCount; i++) {
    offset += 2;
    offset += 4 + data.readUInt32BE(offset);
  }
  return offset;
}

function methodsInfo(data: Buffer, cpEnd: number): { countOffset: number; count: number; endOffset: number } {
  var offset = cpEnd + 6,
    interfacesCount = data.readUInt16BE(offset);
  offset += 2 + interfacesCount * 2;

  var fieldsCount = data.readUInt16BE(offset);
  offset += 2;
  for (var i = 0; i < fieldsCount; i++) {
    offset = skipMember(data, offset);
  }

  var countOffset = offset,
    methodsCount = data.readUInt16BE(offset);
  offset += 2;
  for (i = 0; i < methodsCount; i++) {
    offset = skipMember(data, offset);
  }

  return { countOffset: countOffset, count: methodsCount, endOffset: offset };
}

function replaceMethodCode(data: Buffer, cpEnd: number, name: string, descriptor: string,
    codeNameIndex: number, maxStack: number, maxLocals: number, code: Buffer,
    accessFlags?: number, additionalAttributes?: Buffer[]): Buffer {
  var cp = constantPoolEnd(data),
    utf8Constants: {[index: number]: string} = {},
    constantOffset = 10,
    constantLength: number,
    constantTag: number;
  for (var constantIndex = 1; constantIndex < cp.count; constantIndex++) {
    constantTag = data.readUInt8(constantOffset++);
    switch (constantTag) {
      case 1:
        constantLength = data.readUInt16BE(constantOffset);
        utf8Constants[constantIndex] = data.toString(
          'utf8', constantOffset + 2, constantOffset + 2 + constantLength);
        constantOffset += 2 + constantLength;
        break;
      case 3:
      case 4:
      case 9:
      case 10:
      case 11:
      case 12:
      case 17:
      case 18:
        constantOffset += 4;
        break;
      case 5:
      case 6:
        constantOffset += 8;
        constantIndex++;
        break;
      case 7:
      case 8:
      case 16:
      case 19:
      case 20:
        constantOffset += 2;
        break;
      case 15:
        constantOffset += 3;
        break;
      default:
        throw new Error('Unknown constant-pool tag ' + constantTag);
    }
  }

  var methods = methodsInfo(data, cpEnd),
    methodOffset = methods.countOffset + 2;
  for (var methodIndex = 0; methodIndex < methods.count; methodIndex++) {
    var methodStart = methodOffset,
      methodNameIndex = data.readUInt16BE(methodStart + 2),
      methodDescriptorIndex = data.readUInt16BE(methodStart + 4),
      attributesCount = data.readUInt16BE(methodStart + 6),
      attributeOffset = methodStart + 8,
      replacementAttributes: Buffer[] = [],
      foundCode = false;
    for (var attributeIndex = 0; attributeIndex < attributesCount; attributeIndex++) {
      var attributeStart = attributeOffset,
        attributeNameIndex = data.readUInt16BE(attributeStart),
        attributeLength = data.readUInt32BE(attributeStart + 2);
      attributeOffset += 6 + attributeLength;
      if (utf8Constants[attributeNameIndex] === 'Code') {
        replacementAttributes.push(Buffer.concat([
          u2(codeNameIndex),
          u4(12 + code.length),
          u2(maxStack),
          u2(maxLocals),
          u4(code.length),
          code,
          u2(0),
          u2(0)
        ]));
        foundCode = true;
      } else {
        replacementAttributes.push(data.slice(attributeStart, attributeOffset));
      }
    }
    methodOffset = attributeOffset;
    if (utf8Constants[methodNameIndex] === name &&
        utf8Constants[methodDescriptorIndex] === descriptor) {
      if (!foundCode) {
        throw new Error(name + descriptor + ' is missing its Code attribute');
      }
      if (additionalAttributes !== undefined) {
        replacementAttributes = replacementAttributes.concat(additionalAttributes);
      }
      var replacement = Buffer.concat([
        accessFlags === undefined ? data.slice(methodStart, methodStart + 2) : u2(accessFlags),
        data.slice(methodStart + 2, methodStart + 6),
        u2(replacementAttributes.length),
        Buffer.concat(replacementAttributes)
      ]);
      return Buffer.concat([
        data.slice(0, methodStart),
        replacement,
        data.slice(methodOffset)
      ]);
    }
  }
  throw new Error('Missing method ' + name + descriptor);
}

function addJavaLangReflectExecutableReceiverModernOverlays(data: Buffer,
    constructor: boolean): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMemberRef(tag: number, ownerIndex: number, name: string,
      descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([tag]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var codeNameIndex = addUtf8('Code'),
    signatureNameIndex = addUtf8('Signature'),
    parameterizeNameIndex = addUtf8('parameterize'),
    parameterizeDescriptorIndex = addUtf8('(Ljava/lang/Class;)Ljava/lang/reflect/Type;'),
    parameterizeSignatureIndex = addUtf8('(Ljava/lang/Class<*>;)Ljava/lang/reflect/Type;'),
    executableClassIndex = addClass('java/lang/reflect/Executable'),
    classClassIndex = addClass('java/lang/Class'),
    modifierClassIndex = addClass('java/lang/reflect/Modifier'),
    sharedSecretsClassIndex = addClass('sun/misc/SharedSecrets'),
    javaLangAccessClassIndex = addClass('sun/misc/JavaLangAccess'),
    receiverTargetClassIndex = addClass(
      'sun/reflect/annotation/TypeAnnotation$TypeAnnotationTarget'),
    typeAnnotationParserClassIndex = addClass('sun/reflect/annotation/TypeAnnotationParser'),
    parameterizedTypeImplClassIndex = addClass(
      'sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl'),
    getModifiersMethodIndex = addMemberRef(
      10, executableClassIndex, 'getModifiers', '()I'),
    isStaticMethodIndex = addMemberRef(
      10, modifierClassIndex, 'isStatic', '(I)Z'),
    getTypeAnnotationBytesMethodIndex = addMemberRef(
      10, executableClassIndex, 'getTypeAnnotationBytes0', '()[B'),
    getJavaLangAccessMethodIndex = addMemberRef(
      10, sharedSecretsClassIndex, 'getJavaLangAccess', '()Lsun/misc/JavaLangAccess;'),
    getDeclaringClassMethodIndex = addMemberRef(
      10, executableClassIndex, 'getDeclaringClass', '()Ljava/lang/Class;'),
    getConstantPoolMethodIndex = addMemberRef(
      11, javaLangAccessClassIndex, 'getConstantPool',
      '(Ljava/lang/Class;)Lsun/reflect/ConstantPool;'),
    parameterizeMethodIndex = addMemberRef(
      10, executableClassIndex, 'parameterize',
      '(Ljava/lang/Class;)Ljava/lang/reflect/Type;'),
    receiverTargetFieldIndex = addMemberRef(
      9, receiverTargetClassIndex, 'METHOD_RECEIVER',
      'Lsun/reflect/annotation/TypeAnnotation$TypeAnnotationTarget;'),
    buildAnnotatedTypeMethodIndex = addMemberRef(
      10, typeAnnotationParserClassIndex, 'buildAnnotatedType',
      '([BLsun/reflect/ConstantPool;Ljava/lang/reflect/AnnotatedElement;Ljava/lang/Class;Ljava/lang/reflect/Type;Lsun/reflect/annotation/TypeAnnotation$TypeAnnotationTarget;)Ljava/lang/reflect/AnnotatedType;'),
    classGetDeclaringClassMethodIndex = addMemberRef(
      10, classClassIndex, 'getDeclaringClass', '()Ljava/lang/Class;'),
    classGetEnclosingClassMethodIndex = addMemberRef(
      10, classClassIndex, 'getEnclosingClass', '()Ljava/lang/Class;'),
    classGetTypeParametersMethodIndex = addMemberRef(
      10, classClassIndex, 'getTypeParameters', '()[Ljava/lang/reflect/TypeVariable;'),
    classGetModifiersMethodIndex = addMemberRef(
      10, classClassIndex, 'getModifiers', '()I'),
    makeParameterizedTypeMethodIndex = addMemberRef(
      10, parameterizedTypeImplClassIndex, 'make',
      '(Ljava/lang/Class;[Ljava/lang/reflect/Type;Ljava/lang/reflect/Type;)Lsun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl;'),
    extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    receiverCode: Buffer;

  if (constructor) {
    receiverCode = Buffer.concat([
      Buffer.from([0x2a, 0xb6]), u2(getDeclaringClassMethodIndex), Buffer.from([0x4c]),
      Buffer.from([0x2b, 0xb6]), u2(classGetEnclosingClassMethodIndex), Buffer.from([0x4d]),
      Buffer.from([0x2c, 0xc7, 0x00, 0x05, 0x01, 0xb0]),
      Buffer.from([0x2b, 0xb6]), u2(classGetDeclaringClassMethodIndex), Buffer.from([0x4e]),
      Buffer.from([0x2d, 0xc7, 0x00, 0x05, 0x01, 0xb0]),
      Buffer.from([0x2b, 0xb6]), u2(classGetModifiersMethodIndex),
      Buffer.from([0xb8]), u2(isStaticMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x01, 0xb0]),
      Buffer.from([0x2a, 0xb6]), u2(getTypeAnnotationBytesMethodIndex),
      Buffer.from([0xb8]), u2(getJavaLangAccessMethodIndex),
      Buffer.from([0x2b, 0xb9]), u2(getConstantPoolMethodIndex), Buffer.from([0x02, 0x00]),
      Buffer.from([0x2a, 0x2b, 0x2a, 0x2c, 0xb6]), u2(parameterizeMethodIndex),
      Buffer.from([0xb2]), u2(receiverTargetFieldIndex),
      Buffer.from([0xb8]), u2(buildAnnotatedTypeMethodIndex),
      Buffer.from([0xb0])
    ]);
  } else {
    receiverCode = Buffer.concat([
      Buffer.from([0x2a, 0xb6]), u2(getModifiersMethodIndex),
      Buffer.from([0xb8]), u2(isStaticMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x01, 0xb0]),
      Buffer.from([0x2a, 0xb6]), u2(getTypeAnnotationBytesMethodIndex),
      Buffer.from([0xb8]), u2(getJavaLangAccessMethodIndex),
      Buffer.from([0x2a, 0xb6]), u2(getDeclaringClassMethodIndex),
      Buffer.from([0xb9]), u2(getConstantPoolMethodIndex), Buffer.from([0x02, 0x00]),
      Buffer.from([0x2a, 0x2a, 0xb6]), u2(getDeclaringClassMethodIndex),
      Buffer.from([0x2a, 0x2a, 0xb6]), u2(getDeclaringClassMethodIndex),
      Buffer.from([0xb6]), u2(parameterizeMethodIndex),
      Buffer.from([0xb2]), u2(receiverTargetFieldIndex),
      Buffer.from([0xb8]), u2(buildAnnotatedTypeMethodIndex),
      Buffer.from([0xb0])
    ]);
  }

  var withReceiver = replaceMethodCode(
    withConstants,
    cp.offset + extraConstants.length,
    'getAnnotatedReceiverType',
    '()Ljava/lang/reflect/AnnotatedType;',
    codeNameIndex,
    6,
    constructor ? 4 : 1,
    receiverCode);
  if (constructor) {
    return withReceiver;
  }

  var parameterizeCode = Buffer.concat([
      Buffer.from([0x2b, 0xb6]), u2(classGetDeclaringClassMethodIndex), Buffer.from([0x4d]),
      Buffer.from([0x2b, 0xb6]), u2(classGetTypeParametersMethodIndex), Buffer.from([0x4e]),
      Buffer.from([0x2c, 0xc6, 0x00, 0x0d]),
      Buffer.from([0x2b, 0xb6]), u2(classGetModifiersMethodIndex),
      Buffer.from([0xb8]), u2(isStaticMethodIndex),
      Buffer.from([0x99, 0x00, 0x11]),
      Buffer.from([0x2d, 0xbe, 0x9a, 0x00, 0x05, 0x2b, 0xb0]),
      Buffer.from([0x2b, 0x2d, 0x01, 0xb8]), u2(makeParameterizedTypeMethodIndex),
      Buffer.from([0xb0, 0x2a, 0x2c, 0xb6]), u2(parameterizeMethodIndex),
      Buffer.from([0x3a, 0x04, 0x19, 0x04, 0xc1]), u2(classClassIndex),
      Buffer.from([0x99, 0x00, 0x0a, 0x2d, 0xbe, 0x9a, 0x00, 0x05, 0x2b, 0xb0]),
      Buffer.from([0x2b, 0x2d, 0x19, 0x04, 0xb8]), u2(makeParameterizedTypeMethodIndex),
      Buffer.from([0xb0])
    ]),
    methods = methodsInfo(withReceiver, cp.offset + extraConstants.length),
    parameterizeMethod = Buffer.concat([
      u2(0),
      u2(parameterizeNameIndex),
      u2(parameterizeDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + parameterizeCode.length),
      u2(3),
      u2(5),
      u4(parameterizeCode.length),
      parameterizeCode,
      u2(0),
      u2(0),
      u2(signatureNameIndex),
      u4(2),
      u2(parameterizeSignatureIndex)
    ]);

  return Buffer.concat([
    withReceiver.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withReceiver.slice(methods.countOffset + 2, methods.endOffset),
    parameterizeMethod,
    withReceiver.slice(methods.endOffset)
  ]);
}

function addJavaLangReflectAccessibleObjectModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMemberRef(tag: number, ownerIndex: number, name: string,
      descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([tag]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var codeNameIndex = addUtf8('Code'),
    annotationsNameIndex = addUtf8('RuntimeVisibleAnnotations'),
    callerSensitiveDescriptorIndex = addUtf8('Ljdk/internal/reflect/CallerSensitive;'),
    canAccessNameIndex = addUtf8('canAccess'),
    canAccessDescriptorIndex = addUtf8('(Ljava/lang/Object;)Z'),
    trySetAccessibleNameIndex = addUtf8('trySetAccessible'),
    trySetAccessibleDescriptorIndex = addUtf8('()Z'),
    accessibleObjectClassIndex = addClass('java/lang/reflect/AccessibleObject'),
    memberClassIndex = addClass('java/lang/reflect/Member'),
    methodClassIndex = addClass('java/lang/reflect/Method'),
    fieldClassIndex = addClass('java/lang/reflect/Field'),
    constructorClassIndex = addClass('java/lang/reflect/Constructor'),
    classClassIndex = addClass('java/lang/Class'),
    modifierClassIndex = addClass('java/lang/reflect/Modifier'),
    illegalArgumentExceptionClassIndex = addClass('java/lang/IllegalArgumentException'),
    reflectionClassIndex = addClass('sun/reflect/Reflection'),
    isAccessibleMethodIndex = addMemberRef(
      10, accessibleObjectClassIndex, 'isAccessible', '()Z'),
    memberGetDeclaringClassMethodIndex = addMemberRef(
      11, memberClassIndex, 'getDeclaringClass', '()Ljava/lang/Class;'),
    memberGetModifiersMethodIndex = addMemberRef(
      11, memberClassIndex, 'getModifiers', '()I'),
    modifierIsStaticMethodIndex = addMemberRef(
      10, modifierClassIndex, 'isStatic', '(I)Z'),
    classIsInstanceMethodIndex = addMemberRef(
      10, classClassIndex, 'isInstance', '(Ljava/lang/Object;)Z'),
    illegalArgumentExceptionConstructorIndex = addMemberRef(
      10, illegalArgumentExceptionClassIndex, '<init>', '()V'),
    reflectionGetCallerClassMethodIndex = addMemberRef(
      10, reflectionClassIndex, 'getCallerClass', '()Ljava/lang/Class;'),
    modifierIsPrivateMethodIndex = addMemberRef(
      10, modifierClassIndex, 'isPrivate', '(I)Z'),
    classIsNestmateOfMethodIndex = addMemberRef(
      10, classClassIndex, 'isNestmateOf', '(Ljava/lang/Class;)Z'),
    reflectionVerifyMemberAccessMethodIndex = addMemberRef(
      10, reflectionClassIndex, 'verifyMemberAccess',
      '(Ljava/lang/Class;Ljava/lang/Class;Ljava/lang/Object;I)Z'),
    setAccessibleMethodIndex = addMemberRef(
      10, accessibleObjectClassIndex, 'setAccessible', '(Z)V'),
    constructorGetDeclaringClassMethodIndex = addMemberRef(
      10, constructorClassIndex, 'getDeclaringClass', '()Ljava/lang/Class;'),
    extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    canAccessCode = Buffer.concat([
      Buffer.from([0x2a, 0x4d, 0x2c, 0xc1]), u2(memberClassIndex),
      Buffer.from([0x9a, 0x00, 0x08, 0x2a, 0xb6]), u2(isAccessibleMethodIndex),
      Buffer.from([0xac, 0x2c, 0xc0]), u2(memberClassIndex),
      Buffer.from([0x4e, 0x2d, 0xb9]), u2(memberGetDeclaringClassMethodIndex),
      Buffer.from([0x01, 0x00, 0x3a, 0x04, 0x2d, 0xb9]),
      u2(memberGetModifiersMethodIndex), Buffer.from([0x01, 0x00, 0x36, 0x05]),
      Buffer.from([0x15, 0x05, 0xb8]), u2(modifierIsStaticMethodIndex),
      Buffer.from([0x9a, 0x00, 0x2c, 0x2c, 0xc1]), u2(methodClassIndex),
      Buffer.from([0x9a, 0x00, 0x0a, 0x2c, 0xc1]), u2(fieldClassIndex),
      Buffer.from([0x99, 0x00, 0x1e, 0x2b, 0xc6, 0x00, 0x0c, 0x19, 0x04, 0x2b, 0xb6]),
      u2(classIsInstanceMethodIndex),
      Buffer.from([0x9a, 0x00, 0x0b, 0xbb]), u2(illegalArgumentExceptionClassIndex),
      Buffer.from([0x59, 0xb7]), u2(illegalArgumentExceptionConstructorIndex),
      Buffer.from([0xbf, 0x2b, 0x3a, 0x06, 0xa7, 0x00, 0x12, 0x2b, 0xc6, 0x00, 0x0b,
        0xbb]), u2(illegalArgumentExceptionClassIndex),
      Buffer.from([0x59, 0xb7]), u2(illegalArgumentExceptionConstructorIndex),
      Buffer.from([0xbf, 0x01, 0x3a, 0x06, 0x2a, 0xb6]), u2(isAccessibleMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x04, 0xac, 0xb8]),
      u2(reflectionGetCallerClassMethodIndex),
      Buffer.from([0x3a, 0x07, 0x15, 0x05, 0xb8]), u2(modifierIsPrivateMethodIndex),
      Buffer.from([0x99, 0x00, 0x0f, 0x19, 0x07, 0x19, 0x04, 0xb6]),
      u2(classIsNestmateOfMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x04, 0xac, 0x19, 0x07, 0x19, 0x04, 0x19, 0x06,
        0x15, 0x05, 0xb8]), u2(reflectionVerifyMemberAccessMethodIndex),
      Buffer.from([0xac])
    ]),
    trySetAccessibleCode = Buffer.concat([
      Buffer.from([0x2a, 0x2a, 0xb6]), u2(isAccessibleMethodIndex),
      Buffer.from([0xb6]), u2(setAccessibleMethodIndex),
      Buffer.from([0x2a, 0xb6]), u2(isAccessibleMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x04, 0xac, 0x2a, 0x4c, 0x2b, 0xc1]),
      u2(constructorClassIndex),
      Buffer.from([0x99, 0x00, 0x12, 0x2b, 0xc0]), u2(constructorClassIndex),
      Buffer.from([0xb6]), u2(constructorGetDeclaringClassMethodIndex),
      Buffer.from([0x13]), u2(classClassIndex),
      Buffer.from([0xa6, 0x00, 0x05, 0x03, 0xac, 0x2a, 0x04, 0xb6]),
      u2(setAccessibleMethodIndex), Buffer.from([0x04, 0xac])
    ]),
    callerSensitiveAnnotation = Buffer.concat([
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(callerSensitiveDescriptorIndex),
      u2(0)
    ]),
    canAccessMethod = Buffer.concat([
      u2(0x0011),
      u2(canAccessNameIndex),
      u2(canAccessDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + canAccessCode.length),
      u2(4),
      u2(8),
      u4(canAccessCode.length),
      canAccessCode,
      u2(0),
      u2(0),
      callerSensitiveAnnotation
    ]),
    trySetAccessibleMethod = Buffer.concat([
      u2(0x0011),
      u2(trySetAccessibleNameIndex),
      u2(trySetAccessibleDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + trySetAccessibleCode.length),
      u2(2),
      u2(2),
      u4(trySetAccessibleCode.length),
      trySetAccessibleCode,
      u2(0),
      u2(0),
      callerSensitiveAnnotation
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 2),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    canAccessMethod,
    trySetAccessibleMethod,
    withConstants.slice(methods.endOffset)
  ]);
}

function addAnnotatedOwnerTypeModernOverlay(data: Buffer, typeStr: string): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMemberRef(tag: number, ownerIndex: number, name: string,
      descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([tag]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var ownerNameIndex = addUtf8('getAnnotatedOwnerType'),
    ownerDescriptorIndex = addUtf8('()Ljava/lang/reflect/AnnotatedType;'),
    method: Buffer;

  if (typeStr === 'Ljava/lang/reflect/AnnotatedType;') {
    var interfaceCodeNameIndex = addUtf8('Code'),
      interfaceCode = Buffer.from([0x01, 0xb0]);
    method = Buffer.concat([
      u2(0x0001),
      u2(ownerNameIndex),
      u2(ownerDescriptorIndex),
      u2(1),
      u2(interfaceCodeNameIndex),
      u4(12 + interfaceCode.length),
      u2(1),
      u2(1),
      u4(interfaceCode.length),
      interfaceCode,
      u2(0),
      u2(0)
    ]);
  } else if (typeStr.indexOf('Ljava/lang/reflect/Annotated') === 0) {
    method = Buffer.concat([
      u2(0x0401),
      u2(ownerNameIndex),
      u2(ownerDescriptorIndex),
      u2(0)
    ]);
  } else {
    var codeNameIndex = addUtf8('Code');
    if (typeStr ===
        'Lsun/reflect/annotation/AnnotatedTypeFactory$AnnotatedArrayTypeImpl;' ||
        typeStr ===
        'Lsun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeVariableImpl;' ||
        typeStr ===
        'Lsun/reflect/annotation/AnnotatedTypeFactory$AnnotatedWildcardTypeImpl;') {
      var nullCode = Buffer.from([0x01, 0xb0]);
      method = Buffer.concat([
        u2(0x0001),
        u2(ownerNameIndex),
        u2(ownerDescriptorIndex),
        u2(1),
        u2(codeNameIndex),
        u4(12 + nullCode.length),
        u2(1),
        u2(1),
        u4(nullCode.length),
        nullCode,
        u2(0),
        u2(0)
      ]);
    } else {
      var baseImplClassIndex = addClass(
          'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeBaseImpl'),
        parameterizedImplClassIndex = addClass(
          'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedParameterizedTypeImpl'),
        classClassIndex = addClass('java/lang/Class'),
        parameterizedTypeClassIndex = addClass('java/lang/reflect/ParameterizedType'),
        illegalStateExceptionClassIndex = addClass('java/lang/IllegalStateException'),
        locationInfoClassIndex = addClass(
          'sun/reflect/annotation/TypeAnnotation$LocationInfo'),
        typeAnnotationClassIndex = addClass('sun/reflect/annotation/TypeAnnotation'),
        cannotComputeOwnerStringIndex = addConstant(Buffer.concat([
          Buffer.from([8]),
          u2(addUtf8("Can't compute owner"))
        ])),
        getTypeMethodIndex = addMemberRef(
          10, baseImplClassIndex, 'getType', '()Ljava/lang/reflect/Type;'),
        getLocationMethodIndex = addMemberRef(
          10, baseImplClassIndex, 'getLocation',
          '()Lsun/reflect/annotation/TypeAnnotation$LocationInfo;'),
        getTypeAnnotationsMethodIndex = addMemberRef(
          10, baseImplClassIndex, 'getTypeAnnotations',
          '()[Lsun/reflect/annotation/TypeAnnotation;'),
        getDeclMethodIndex = addMemberRef(
          10, baseImplClassIndex, 'getDecl', '()Ljava/lang/reflect/AnnotatedElement;'),
        classGetDeclaringClassMethodIndex = addMemberRef(
          10, classClassIndex, 'getDeclaringClass', '()Ljava/lang/Class;'),
        parameterizedGetOwnerTypeMethodIndex = addMemberRef(
          11, parameterizedTypeClassIndex, 'getOwnerType', '()Ljava/lang/reflect/Type;'),
        popLocationMethodIndex = addMemberRef(
          10, locationInfoClassIndex, 'popLocation',
          '(B)Lsun/reflect/annotation/TypeAnnotation$LocationInfo;'),
        filterMethodIndex = addMemberRef(
          10, locationInfoClassIndex, 'filter',
          '([Lsun/reflect/annotation/TypeAnnotation;)[Lsun/reflect/annotation/TypeAnnotation;'),
        baseLocationFieldIndex = addMemberRef(
          9, locationInfoClassIndex, 'BASE_LOCATION',
          'Lsun/reflect/annotation/TypeAnnotation$LocationInfo;'),
        baseConstructorIndex = addMemberRef(
          10, baseImplClassIndex, '<init>',
          '(Ljava/lang/reflect/Type;Lsun/reflect/annotation/TypeAnnotation$LocationInfo;[Lsun/reflect/annotation/TypeAnnotation;[Lsun/reflect/annotation/TypeAnnotation;Ljava/lang/reflect/AnnotatedElement;)V'),
        parameterizedConstructorIndex = addMemberRef(
          10, parameterizedImplClassIndex, '<init>',
          '(Ljava/lang/reflect/ParameterizedType;Lsun/reflect/annotation/TypeAnnotation$LocationInfo;[Lsun/reflect/annotation/TypeAnnotation;[Lsun/reflect/annotation/TypeAnnotation;Ljava/lang/reflect/AnnotatedElement;)V'),
        illegalStateConstructorIndex = addMemberRef(
          10, illegalStateExceptionClassIndex, '<init>', '(Ljava/lang/String;)V'),
        ownerCode: Buffer;

      if (typeStr ===
          'Lsun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeBaseImpl;') {
        ownerCode = Buffer.concat([
          Buffer.from([0x2a, 0xb6]), u2(getTypeMethodIndex), Buffer.from([0x4c, 0x2b, 0xc1]),
          u2(classClassIndex), Buffer.from([0x9a, 0x00, 0x0e, 0xbb]),
          u2(illegalStateExceptionClassIndex), Buffer.from([0x59, 0x13]),
          u2(cannotComputeOwnerStringIndex), Buffer.from([0xb7]),
          u2(illegalStateConstructorIndex), Buffer.from([0xbf, 0x2b, 0xc0]),
          u2(classClassIndex), Buffer.from([0xb6]), u2(classGetDeclaringClassMethodIndex),
          Buffer.from([0x4d, 0x2c, 0xc7, 0x00, 0x05, 0x01, 0xb0, 0x2a, 0xb6]),
          u2(getLocationMethodIndex), Buffer.from([0x04, 0xb6]), u2(popLocationMethodIndex),
          Buffer.from([0x4e, 0x2d, 0xc7, 0x00, 0x14, 0xb2]), u2(baseLocationFieldIndex),
          Buffer.from([0x4e, 0x03, 0xbd]), u2(typeAnnotationClassIndex),
          Buffer.from([0x3a, 0x04, 0x19, 0x04, 0x3a, 0x05, 0xa7, 0x00, 0x11,
            0x2a, 0xb6]), u2(getTypeAnnotationsMethodIndex),
          Buffer.from([0x3a, 0x04, 0x2d, 0x19, 0x04, 0xb6]), u2(filterMethodIndex),
          Buffer.from([0x3a, 0x05, 0xbb]), u2(baseImplClassIndex),
          Buffer.from([0x59, 0x2c, 0x2d, 0x19, 0x05, 0x19, 0x04, 0x2a, 0xb6]),
          u2(getDeclMethodIndex), Buffer.from([0xb7]), u2(baseConstructorIndex),
          Buffer.from([0xb0])
        ]);
      } else {
        ownerCode = Buffer.concat([
          Buffer.from([0x2a, 0xb6]), u2(getTypeMethodIndex), Buffer.from([0xc0]),
          u2(parameterizedTypeClassIndex), Buffer.from([0x4c, 0x2b, 0xb9]),
          u2(parameterizedGetOwnerTypeMethodIndex), Buffer.from([0x01, 0x00, 0x4d,
            0x2c, 0xc7, 0x00, 0x05, 0x01, 0xb0, 0x2a, 0xb6]),
          u2(getLocationMethodIndex), Buffer.from([0x04, 0xb6]), u2(popLocationMethodIndex),
          Buffer.from([0x4e, 0x2d, 0xc7, 0x00, 0x14, 0xb2]), u2(baseLocationFieldIndex),
          Buffer.from([0x4e, 0x03, 0xbd]), u2(typeAnnotationClassIndex),
          Buffer.from([0x3a, 0x04, 0x19, 0x04, 0x3a, 0x05, 0xa7, 0x00, 0x11,
            0x2a, 0xb6]), u2(getTypeAnnotationsMethodIndex),
          Buffer.from([0x3a, 0x04, 0x2d, 0x19, 0x04, 0xb6]), u2(filterMethodIndex),
          Buffer.from([0x3a, 0x05, 0x2c, 0xc1]), u2(parameterizedTypeClassIndex),
          Buffer.from([0x99, 0x00, 0x18, 0xbb]), u2(parameterizedImplClassIndex),
          Buffer.from([0x59, 0x2c, 0xc0]), u2(parameterizedTypeClassIndex),
          Buffer.from([0x2d, 0x19, 0x05, 0x19, 0x04, 0x2a, 0xb6]),
          u2(getDeclMethodIndex), Buffer.from([0xb7]), u2(parameterizedConstructorIndex),
          Buffer.from([0xb0, 0xbb]), u2(baseImplClassIndex),
          Buffer.from([0x59, 0x2c, 0x2d, 0x19, 0x05, 0x19, 0x04, 0x2a, 0xb6]),
          u2(getDeclMethodIndex), Buffer.from([0xb7]), u2(baseConstructorIndex),
          Buffer.from([0xb0])
        ]);
      }

      method = Buffer.concat([
        u2(0x0001),
        u2(ownerNameIndex),
        u2(ownerDescriptorIndex),
        u2(1),
        u2(codeNameIndex),
        u4(12 + ownerCode.length),
        u2(7),
        u2(6),
        u4(ownerCode.length),
        ownerCode,
        u2(0),
        u2(0)
      ]);
    }
  }

  var extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    method,
    withConstants.slice(methods.endOffset)
  ]);
}

function addTypeAnnotationLocationInfoModernOverlay(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMemberRef(tag: number, ownerIndex: number, name: string,
      descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([tag]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var codeNameIndex = addUtf8('Code'),
    popNameIndex = addUtf8('popLocation'),
    popDescriptorIndex = addUtf8(
      '(B)Lsun/reflect/annotation/TypeAnnotation$LocationInfo;'),
    locationInfoClassIndex = addClass(
      'sun/reflect/annotation/TypeAnnotation$LocationInfo'),
    locationClassIndex = addClass(
      'sun/reflect/annotation/TypeAnnotation$LocationInfo$Location'),
    systemClassIndex = addClass('java/lang/System'),
    depthFieldIndex = addMemberRef(9, locationInfoClassIndex, 'depth', 'I'),
    locationsFieldIndex = addMemberRef(
      9, locationInfoClassIndex, 'locations',
      '[Lsun/reflect/annotation/TypeAnnotation$LocationInfo$Location;'),
    tagFieldIndex = addMemberRef(9, locationClassIndex, 'tag', 'B'),
    arraycopyMethodIndex = addMemberRef(
      10, systemClassIndex, 'arraycopy', '(Ljava/lang/Object;ILjava/lang/Object;II)V'),
    constructorIndex = addMemberRef(
      10, locationInfoClassIndex, '<init>',
      '(I[Lsun/reflect/annotation/TypeAnnotation$LocationInfo$Location;)V'),
    popCode = Buffer.concat([
      Buffer.from([0x2a, 0xb4]), u2(depthFieldIndex),
      Buffer.from([0x99, 0x00, 0x15, 0x2a, 0xb4]), u2(locationsFieldIndex),
      Buffer.from([0x2a, 0xb4]), u2(depthFieldIndex),
      Buffer.from([0x04, 0x64, 0x32, 0xb4]), u2(tagFieldIndex),
      Buffer.from([0x1b, 0x9f, 0x00, 0x05, 0x01, 0xb0, 0x2a, 0xb4]),
      u2(depthFieldIndex), Buffer.from([0x04, 0x64, 0xbd]), u2(locationClassIndex),
      Buffer.from([0x4d, 0x2a, 0xb4]), u2(locationsFieldIndex),
      Buffer.from([0x03, 0x2c, 0x03, 0x2a, 0xb4]), u2(depthFieldIndex),
      Buffer.from([0x04, 0x64, 0xb8]), u2(arraycopyMethodIndex),
      Buffer.from([0xbb]), u2(locationInfoClassIndex), Buffer.from([0x59, 0x2a, 0xb4]),
      u2(depthFieldIndex), Buffer.from([0x04, 0x64, 0x2c, 0xb7]),
      u2(constructorIndex), Buffer.from([0xb0])
    ]),
    method = Buffer.concat([
      u2(0x0001),
      u2(popNameIndex),
      u2(popDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + popCode.length),
      u2(6),
      u2(3),
      u4(popCode.length),
      popCode,
      u2(0),
      u2(0)
    ]),
    extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    method,
    withConstants.slice(methods.endOffset)
  ]);
}

function addAnnotatedTypeFactoryNestingModernOverlay(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMemberRef(tag: number, ownerIndex: number, name: string,
      descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([tag]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var codeNameIndex = addUtf8('Code'),
    factoryClassIndex = addClass('sun/reflect/annotation/AnnotatedTypeFactory'),
    classClassIndex = addClass('java/lang/Class'),
    parameterizedTypeClassIndex = addClass('java/lang/reflect/ParameterizedType'),
    modifierClassIndex = addClass('java/lang/reflect/Modifier'),
    locationInfoClassIndex = addClass(
      'sun/reflect/annotation/TypeAnnotation$LocationInfo'),
    isArrayMethodIndex = addMemberRef(
      10, factoryClassIndex, 'isArray', '(Ljava/lang/reflect/Type;)Z'),
    addNestingMethodIndex = addMemberRef(
      10, factoryClassIndex, 'addNesting',
      '(Ljava/lang/reflect/Type;Lsun/reflect/annotation/TypeAnnotation$LocationInfo;)Lsun/reflect/annotation/TypeAnnotation$LocationInfo;'),
    classGetEnclosingClassMethodIndex = addMemberRef(
      10, classClassIndex, 'getEnclosingClass', '()Ljava/lang/Class;'),
    classGetModifiersMethodIndex = addMemberRef(
      10, classClassIndex, 'getModifiers', '()I'),
    modifierIsStaticMethodIndex = addMemberRef(
      10, modifierClassIndex, 'isStatic', '(I)Z'),
    pushInnerMethodIndex = addMemberRef(
      10, locationInfoClassIndex, 'pushInner',
      '()Lsun/reflect/annotation/TypeAnnotation$LocationInfo;'),
    getOwnerTypeMethodIndex = addMemberRef(
      11, parameterizedTypeClassIndex, 'getOwnerType', '()Ljava/lang/reflect/Type;'),
    getRawTypeMethodIndex = addMemberRef(
      11, parameterizedTypeClassIndex, 'getRawType', '()Ljava/lang/reflect/Type;'),
    nestingCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]), u2(isArrayMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x2b, 0xb0, 0x2a, 0xc1]), u2(classClassIndex),
      Buffer.from([0x99, 0x00, 0x29, 0x2a, 0xc0]), u2(classClassIndex),
      Buffer.from([0x4d, 0x2c, 0xb6]), u2(classGetEnclosingClassMethodIndex),
      Buffer.from([0xc7, 0x00, 0x05, 0x2b, 0xb0, 0x2c, 0xb6]),
      u2(classGetModifiersMethodIndex), Buffer.from([0xb8]), u2(modifierIsStaticMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x2b, 0xb0, 0x2c, 0xb6]),
      u2(classGetEnclosingClassMethodIndex), Buffer.from([0x2b, 0xb6]),
      u2(pushInnerMethodIndex), Buffer.from([0xb8]), u2(addNestingMethodIndex),
      Buffer.from([0xb0, 0x2a, 0xc1]), u2(parameterizedTypeClassIndex),
      Buffer.from([0x99, 0x00, 0x41, 0x2a, 0xc0]), u2(parameterizedTypeClassIndex),
      Buffer.from([0x4d, 0x2c, 0xb9]), u2(getOwnerTypeMethodIndex),
      Buffer.from([0x01, 0x00, 0xc7, 0x00, 0x05, 0x2b, 0xb0, 0x2c, 0xb9]),
      u2(getRawTypeMethodIndex), Buffer.from([0x01, 0x00, 0xc1]), u2(classClassIndex),
      Buffer.from([0x99, 0x00, 0x17, 0x2c, 0xb9]), u2(getRawTypeMethodIndex),
      Buffer.from([0x01, 0x00, 0xc0]), u2(classClassIndex), Buffer.from([0xb6]),
      u2(classGetModifiersMethodIndex), Buffer.from([0xb8]), u2(modifierIsStaticMethodIndex),
      Buffer.from([0x99, 0x00, 0x05, 0x2b, 0xb0, 0x2c, 0xb9]),
      u2(getOwnerTypeMethodIndex), Buffer.from([0x01, 0x00, 0x2b, 0xb6]),
      u2(pushInnerMethodIndex), Buffer.from([0xb8]), u2(addNestingMethodIndex),
      Buffer.from([0xb0, 0x2b, 0xb0])
    ]),
    extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]);

  return replaceMethodCode(
    withConstants,
    cp.offset + extraConstants.length,
    'addNesting',
    '(Ljava/lang/reflect/Type;Lsun/reflect/annotation/TypeAnnotation$LocationInfo;)Lsun/reflect/annotation/TypeAnnotation$LocationInfo;',
    codeNameIndex,
    2,
    3,
    nestingCode);
}

function addParameterizedTypeImplModernOverlay(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addString(value: string): number {
    var valueIndex = addUtf8(value);
    return addConstant(Buffer.concat([Buffer.from([8]), u2(valueIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMemberRef(tag: number, ownerIndex: number, name: string,
      descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([tag]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var codeNameIndex = addUtf8('Code'),
    dollarStringIndex = addString('$'),
    emptyStringIndex = addString(''),
    separatorStringIndex = addString(', '),
    prefixStringIndex = addString('<'),
    suffixStringIndex = addString('>'),
    parameterizedTypeImplClassIndex = addClass(
      'sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl'),
    stringBuilderClassIndex = addClass('java/lang/StringBuilder'),
    typeClassIndex = addClass('java/lang/reflect/Type'),
    classClassIndex = addClass('java/lang/Class'),
    stringClassIndex = addClass('java/lang/String'),
    stringJoinerClassIndex = addClass('java/util/StringJoiner'),
    stringBuilderConstructorIndex = addMemberRef(
      10, stringBuilderClassIndex, '<init>', '()V'),
    ownerTypeFieldIndex = addMemberRef(
      9, parameterizedTypeImplClassIndex, 'ownerType', 'Ljava/lang/reflect/Type;'),
    typeNameMethodIndex = addMemberRef(
      11, typeClassIndex, 'getTypeName', '()Ljava/lang/String;'),
    stringBuilderAppendIndex = addMemberRef(
      10, stringBuilderClassIndex, 'append',
      '(Ljava/lang/String;)Ljava/lang/StringBuilder;'),
    rawTypeFieldIndex = addMemberRef(
      9, parameterizedTypeImplClassIndex, 'rawType', 'Ljava/lang/Class;'),
    classGetNameMethodIndex = addMemberRef(
      10, classClassIndex, 'getName', '()Ljava/lang/String;'),
    stringBuilderToStringIndex = addMemberRef(
      10, stringBuilderClassIndex, 'toString', '()Ljava/lang/String;'),
    stringReplaceMethodIndex = addMemberRef(
      10, stringClassIndex, 'replace',
      '(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Ljava/lang/String;'),
    classGetSimpleNameMethodIndex = addMemberRef(
      10, classClassIndex, 'getSimpleName', '()Ljava/lang/String;'),
    actualTypeArgumentsFieldIndex = addMemberRef(
      9, parameterizedTypeImplClassIndex, 'actualTypeArguments',
      '[Ljava/lang/reflect/Type;'),
    stringJoinerConstructorIndex = addMemberRef(
      10, stringJoinerClassIndex, '<init>',
      '(Ljava/lang/CharSequence;Ljava/lang/CharSequence;Ljava/lang/CharSequence;)V'),
    stringJoinerSetEmptyValueIndex = addMemberRef(
      10, stringJoinerClassIndex, 'setEmptyValue',
      '(Ljava/lang/CharSequence;)Ljava/util/StringJoiner;'),
    stringJoinerAddIndex = addMemberRef(
      10, stringJoinerClassIndex, 'add',
      '(Ljava/lang/CharSequence;)Ljava/util/StringJoiner;'),
    stringJoinerToStringIndex = addMemberRef(
      10, stringJoinerClassIndex, 'toString', '()Ljava/lang/String;');

  if (dollarStringIndex > 255 || emptyStringIndex > 255 ||
      separatorStringIndex > 255 || prefixStringIndex > 255 || suffixStringIndex > 255) {
    throw new Error('ParameterizedTypeImpl string constants exceed ldc range');
  }

  var extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    code = Buffer.concat([
      Buffer.from([0xbb]), u2(stringBuilderClassIndex),
      Buffer.from([0x59, 0xb7]), u2(stringBuilderConstructorIndex),
      Buffer.from([0x4c, 0x2a, 0xb4]), u2(ownerTypeFieldIndex),
      Buffer.from([0xc6, 0x00, 0x64, 0x2b, 0x2a, 0xb4]), u2(ownerTypeFieldIndex),
      Buffer.from([0xb9]), u2(typeNameMethodIndex), Buffer.from([0x01, 0x00]),
      Buffer.from([0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x57, 0x2b, 0x12, dollarStringIndex, 0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x57, 0x2a, 0xb4]), u2(ownerTypeFieldIndex),
      Buffer.from([0xc1]), u2(parameterizedTypeImplClassIndex),
      Buffer.from([0x99, 0x00, 0x36, 0x2b, 0x2a, 0xb4]), u2(rawTypeFieldIndex),
      Buffer.from([0xb6]), u2(classGetNameMethodIndex),
      Buffer.from([0xbb]), u2(stringBuilderClassIndex),
      Buffer.from([0x59, 0xb7]), u2(stringBuilderConstructorIndex),
      Buffer.from([0x2a, 0xb4]), u2(ownerTypeFieldIndex),
      Buffer.from([0xc0]), u2(parameterizedTypeImplClassIndex),
      Buffer.from([0xb4]), u2(rawTypeFieldIndex),
      Buffer.from([0xb6]), u2(classGetNameMethodIndex),
      Buffer.from([0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x12, dollarStringIndex, 0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0xb6]), u2(stringBuilderToStringIndex),
      Buffer.from([0x12, emptyStringIndex, 0xb6]), u2(stringReplaceMethodIndex),
      Buffer.from([0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x57, 0xa7, 0x00, 0x1e, 0x2b, 0x2a, 0xb4]), u2(rawTypeFieldIndex),
      Buffer.from([0xb6]), u2(classGetSimpleNameMethodIndex),
      Buffer.from([0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x57, 0xa7, 0x00, 0x0f, 0x2b, 0x2a, 0xb4]), u2(rawTypeFieldIndex),
      Buffer.from([0xb6]), u2(classGetNameMethodIndex),
      Buffer.from([0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x57, 0x2a, 0xb4]), u2(actualTypeArgumentsFieldIndex),
      Buffer.from([0xc6, 0x00, 0x4c, 0xbb]), u2(stringJoinerClassIndex),
      Buffer.from([0x59, 0x12, separatorStringIndex, 0x12, prefixStringIndex,
        0x12, suffixStringIndex, 0xb7]), u2(stringJoinerConstructorIndex),
      Buffer.from([0x4d, 0x2c, 0x12, emptyStringIndex, 0xb6]), u2(stringJoinerSetEmptyValueIndex),
      Buffer.from([0x57, 0x2a, 0xb4]), u2(actualTypeArgumentsFieldIndex),
      Buffer.from([0x4e, 0x2d, 0xbe, 0x36, 0x04, 0x03, 0x36, 0x05,
        0x15, 0x05, 0x15, 0x04, 0xa2, 0x00, 0x1b, 0x2d, 0x15, 0x05,
        0x32, 0x3a, 0x06, 0x2c, 0x19, 0x06, 0xb9]),
      u2(typeNameMethodIndex), Buffer.from([0x01, 0x00, 0xb6]), u2(stringJoinerAddIndex),
      Buffer.from([0x57, 0x84, 0x05, 0x01, 0xa7, 0xff, 0xe4, 0x2b, 0x2c, 0xb6]),
      u2(stringJoinerToStringIndex), Buffer.from([0xb6]), u2(stringBuilderAppendIndex),
      Buffer.from([0x57, 0x2b, 0xb6]), u2(stringBuilderToStringIndex),
      Buffer.from([0xb0])
    ]);

  return replaceMethodCode(
    withConstants,
    cp.offset + extraConstants.length,
    'toString',
    '()Ljava/lang/String;',
    codeNameIndex,
    5,
    7,
    code);
}

function addStaticNoopModernOverlay(data: Buffer, name: string, descriptor: string,
    maxLocals: number, annotationDescriptor: string): Buffer {
  var cp = constantPoolEnd(data),
    nameIndex = cp.count,
    descriptorIndex = cp.count + 1,
    codeNameIndex = cp.count + 2,
    annotationsNameIndex = cp.count + 3,
    annotationTypeIndex = cp.count + 4,
    extraConstants = Buffer.concat([
      utf8Constant(name),
      utf8Constant(descriptor),
      utf8Constant('Code'),
      utf8Constant('RuntimeVisibleAnnotations'),
      utf8Constant(annotationDescriptor)
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 5),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    method = Buffer.concat([
      u2(0x0009),
      u2(nameIndex),
      u2(descriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(13),
      u2(0),
      u2(maxLocals),
      u4(1),
      Buffer.from([0xb1]),
      u2(0),
      u2(0),
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(annotationTypeIndex),
      u2(0)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    method,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangClassModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    existingSignatureNameIndex = 0,
    constantOffset = 10,
    constantLength: number,
    constantTag: number;
  for (var constantIndex = 1; constantIndex < cp.count; constantIndex++) {
    constantTag = data.readUInt8(constantOffset++);
    switch (constantTag) {
      case 1:
        constantLength = data.readUInt16BE(constantOffset);
        if (data.toString('utf8', constantOffset + 2, constantOffset + 2 + constantLength) === 'Signature') {
          existingSignatureNameIndex = constantIndex;
        }
        constantOffset += 2 + constantLength;
        break;
      case 3:
      case 4:
      case 9:
      case 10:
      case 11:
      case 12:
      case 17:
      case 18:
        constantOffset += 4;
        break;
      case 5:
      case 6:
        constantOffset += 8;
        constantIndex++;
        break;
      case 7:
      case 8:
      case 16:
      case 19:
      case 20:
        constantOffset += 2;
        break;
      case 15:
        constantOffset += 3;
        break;
      default:
        throw new Error('Unknown constant-pool tag ' + constantTag);
    }
  }
  if (existingSignatureNameIndex === 0) {
    throw new Error('java.lang.Class is missing its Signature constant');
  }

  var getModuleNameIndex = cp.count,
    getModuleDescriptorIndex = cp.count + 1,
    getRecordComponentsNameIndex = cp.count + 2,
    getRecordComponentsDescriptorIndex = cp.count + 3,
    isHiddenNameIndex = cp.count + 4,
    isHiddenDescriptorIndex = cp.count + 5,
    annotationsNameIndex = cp.count + 6,
    annotationTypeIndex = cp.count + 7,
    isRecordNameIndex = cp.count + 8,
    codeNameIndex = cp.count + 9,
    helperNameIndex = cp.count + 10,
    helperClassIndex = cp.count + 11,
    helperDescriptorIndex = cp.count + 12,
    helperNameAndTypeIndex = cp.count + 13,
    helperMethodIndex = cp.count + 14,
    isSealedNameIndex = cp.count + 15,
    getPermittedSubclassesNameIndex = cp.count + 16,
    getPermittedSubclassesDescriptorIndex = cp.count + 17,
    getPermittedSubclassesHelperDescriptorIndex = cp.count + 18,
    isSealedHelperNameAndTypeIndex = cp.count + 19,
    isSealedHelperMethodIndex = cp.count + 20,
    getPermittedSubclassesHelperNameAndTypeIndex = cp.count + 21,
    getPermittedSubclassesHelperMethodIndex = cp.count + 22,
    signatureNameIndex = cp.count + 23,
    getPermittedSubclassesSignatureIndex = cp.count + 24,
    callerSensitiveTypeIndex = cp.count + 25,
    getPackageNameIndex = cp.count + 26,
    getPackageNameDescriptorIndex = cp.count + 27,
    getPackageNameHelperDescriptorIndex = cp.count + 28,
    getPackageNameHelperNameAndTypeIndex = cp.count + 29,
    getPackageNameHelperMethodIndex = cp.count + 30,
    descriptorStringNameIndex = cp.count + 31,
    descriptorStringHelperNameAndTypeIndex = cp.count + 32,
    descriptorStringHelperMethodIndex = cp.count + 33,
    ofFieldNameIndex = cp.count + 34,
    ofFieldClassIndex = cp.count + 35,
    classNameIndex = cp.count + 36,
    classClassIndex = cp.count + 37,
    componentTypeNameIndex = cp.count + 38,
    classReturnDescriptorIndex = cp.count + 39,
    classHelperDescriptorIndex = cp.count + 40,
    componentTypeHelperNameAndTypeIndex = cp.count + 41,
    componentTypeHelperMethodIndex = cp.count + 42,
    ofFieldReturnDescriptorIndex = cp.count + 43,
    componentTypeNameAndTypeIndex = cp.count + 44,
    componentTypeMethodIndex = cp.count + 45,
    classReturnSignatureIndex = cp.count + 46,
    arrayTypeNameIndex = cp.count + 47,
    arrayTypeHelperNameAndTypeIndex = cp.count + 48,
    arrayTypeHelperMethodIndex = cp.count + 49,
    arrayTypeNameAndTypeIndex = cp.count + 50,
    arrayTypeMethodIndex = cp.count + 51,
    classSignatureIndex = cp.count + 52,
    constableNameIndex = cp.count + 53,
    constableClassIndex = cp.count + 54,
    describeConstableNameIndex = cp.count + 55,
    optionalDescriptorIndex = cp.count + 56,
    describeConstableHelperDescriptorIndex = cp.count + 57,
    describeConstableHelperNameAndTypeIndex = cp.count + 58,
    describeConstableHelperMethodIndex = cp.count + 59,
    describeConstableSignatureIndex = cp.count + 60,
    extraConstants = Buffer.concat([
      utf8Constant('getModule'),
      utf8Constant('()Ljava/lang/Module;'),
      utf8Constant('getRecordComponents'),
      utf8Constant('()[Ljava/lang/reflect/RecordComponent;'),
      utf8Constant('isHidden'),
      utf8Constant('()Z'),
      utf8Constant('RuntimeVisibleAnnotations'),
      utf8Constant('Ljdk/internal/vm/annotation/IntrinsicCandidate;'),
      utf8Constant('isRecord'),
      utf8Constant('Code'),
      utf8Constant('java/lang/DoppioClass'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      utf8Constant('(Ljava/lang/Class;)Z'),
      Buffer.concat([
        Buffer.from([12]),
        u2(isRecordNameIndex),
        u2(helperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(helperNameAndTypeIndex)
      ]),
      utf8Constant('isSealed'),
      utf8Constant('getPermittedSubclasses'),
      utf8Constant('()[Ljava/lang/Class;'),
      utf8Constant('(Ljava/lang/Class;)[Ljava/lang/Class;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(isSealedNameIndex),
        u2(helperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(isSealedHelperNameAndTypeIndex)
      ]),
      Buffer.concat([
        Buffer.from([12]),
        u2(getPermittedSubclassesNameIndex),
        u2(getPermittedSubclassesHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(getPermittedSubclassesHelperNameAndTypeIndex)
      ]),
      utf8Constant('Signature'),
      utf8Constant('()[Ljava/lang/Class<*>;'),
      utf8Constant('Ljdk/internal/reflect/CallerSensitive;'),
      utf8Constant('getPackageName'),
      utf8Constant('()Ljava/lang/String;'),
      utf8Constant('(Ljava/lang/Class;)Ljava/lang/String;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(getPackageNameIndex),
        u2(getPackageNameHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(getPackageNameHelperNameAndTypeIndex)
      ]),
      utf8Constant('descriptorString'),
      Buffer.concat([
        Buffer.from([12]),
        u2(descriptorStringNameIndex),
        u2(getPackageNameHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(descriptorStringHelperNameAndTypeIndex)
      ]),
      utf8Constant('java/lang/invoke/TypeDescriptor$OfField'),
      Buffer.concat([Buffer.from([7]), u2(ofFieldNameIndex)]),
      utf8Constant('java/lang/Class'),
      Buffer.concat([Buffer.from([7]), u2(classNameIndex)]),
      utf8Constant('componentType'),
      utf8Constant('()Ljava/lang/Class;'),
      utf8Constant('(Ljava/lang/Class;)Ljava/lang/Class;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(componentTypeNameIndex),
        u2(classHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(componentTypeHelperNameAndTypeIndex)
      ]),
      utf8Constant('()Ljava/lang/invoke/TypeDescriptor$OfField;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(componentTypeNameIndex),
        u2(classReturnDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(classClassIndex),
        u2(componentTypeNameAndTypeIndex)
      ]),
      utf8Constant('()Ljava/lang/Class<*>;'),
      utf8Constant('arrayType'),
      Buffer.concat([
        Buffer.from([12]),
        u2(arrayTypeNameIndex),
        u2(classHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(arrayTypeHelperNameAndTypeIndex)
      ]),
      Buffer.concat([
        Buffer.from([12]),
        u2(arrayTypeNameIndex),
        u2(classReturnDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(classClassIndex),
        u2(arrayTypeNameAndTypeIndex)
      ]),
      utf8Constant('<T:Ljava/lang/Object;>Ljava/lang/Object;Ljava/io/Serializable;Ljava/lang/reflect/GenericDeclaration;Ljava/lang/reflect/Type;Ljava/lang/reflect/AnnotatedElement;Ljava/lang/invoke/TypeDescriptor$OfField<Ljava/lang/Class<*>;>;Ljava/lang/constant/Constable;'),
      utf8Constant('java/lang/constant/Constable'),
      Buffer.concat([Buffer.from([7]), u2(constableNameIndex)]),
      utf8Constant('describeConstable'),
      utf8Constant('()Ljava/util/Optional;'),
      utf8Constant('(Ljava/lang/Class;)Ljava/util/Optional;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(describeConstableNameIndex),
        u2(describeConstableHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(describeConstableHelperNameAndTypeIndex)
      ]),
      utf8Constant('()Ljava/util/Optional<Ljava/lang/constant/ClassDesc;>;')
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 61),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    interfacesCountOffset = cp.offset + extraConstants.length + 6,
    interfacesCount = withConstants.readUInt16BE(interfacesCountOffset),
    interfacesEndOffset = interfacesCountOffset + 2 + interfacesCount * 2,
    withInterface = Buffer.concat([
      withConstants.slice(0, interfacesCountOffset),
      u2(interfacesCount + 2),
      withConstants.slice(interfacesCountOffset + 2, interfacesEndOffset),
      u2(ofFieldClassIndex),
      u2(constableClassIndex),
      withConstants.slice(interfacesEndOffset)
    ]),
    methods = methodsInfo(withInterface, cp.offset + extraConstants.length),
    getModuleMethod = Buffer.concat([
      u2(0x0101),
      u2(getModuleNameIndex),
      u2(getModuleDescriptorIndex),
      u2(0)
    ]),
    getRecordComponentsMethod = Buffer.concat([
      u2(0x0101),
      u2(getRecordComponentsNameIndex),
      u2(getRecordComponentsDescriptorIndex),
      u2(0)
    ]),
    isHiddenMethod = Buffer.concat([
      u2(0x0101),
      u2(isHiddenNameIndex),
      u2(isHiddenDescriptorIndex),
      u2(1),
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(annotationTypeIndex),
      u2(0)
    ]),
    isRecordCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(helperMethodIndex),
      Buffer.from([0xac])
    ]),
    isRecordMethod = Buffer.concat([
      u2(0x0001),
      u2(isRecordNameIndex),
      u2(isHiddenDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + isRecordCode.length),
      u2(1),
      u2(1),
      u4(isRecordCode.length),
      isRecordCode,
      u2(0),
      u2(0)
    ]),
    isSealedCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(isSealedHelperMethodIndex),
      Buffer.from([0xac])
    ]),
    isSealedMethod = Buffer.concat([
      u2(0x0001),
      u2(isSealedNameIndex),
      u2(isHiddenDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + isSealedCode.length),
      u2(1),
      u2(1),
      u4(isSealedCode.length),
      isSealedCode,
      u2(0),
      u2(0)
    ]),
    getPermittedSubclassesCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(getPermittedSubclassesHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    getPermittedSubclassesMethod = Buffer.concat([
      u2(0x0001),
      u2(getPermittedSubclassesNameIndex),
      u2(getPermittedSubclassesDescriptorIndex),
      u2(3),
      u2(codeNameIndex),
      u4(12 + getPermittedSubclassesCode.length),
      u2(1),
      u2(1),
      u4(getPermittedSubclassesCode.length),
      getPermittedSubclassesCode,
      u2(0),
      u2(0),
      u2(signatureNameIndex),
      u4(2),
      u2(getPermittedSubclassesSignatureIndex),
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(callerSensitiveTypeIndex),
      u2(0)
    ]),
    getPackageNameCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(getPackageNameHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    getPackageNameMethod = Buffer.concat([
      u2(0x0001),
      u2(getPackageNameIndex),
      u2(getPackageNameDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + getPackageNameCode.length),
      u2(1),
      u2(1),
      u4(getPackageNameCode.length),
      getPackageNameCode,
      u2(0),
      u2(0)
    ]),
    descriptorStringCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(descriptorStringHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    descriptorStringMethod = Buffer.concat([
      u2(0x0001),
      u2(descriptorStringNameIndex),
      u2(getPackageNameDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + descriptorStringCode.length),
      u2(1),
      u2(1),
      u4(descriptorStringCode.length),
      descriptorStringCode,
      u2(0),
      u2(0)
    ]),
    componentTypeCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(componentTypeHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    componentTypeMethod = Buffer.concat([
      u2(0x0001),
      u2(componentTypeNameIndex),
      u2(classReturnDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + componentTypeCode.length),
      u2(1),
      u2(1),
      u4(componentTypeCode.length),
      componentTypeCode,
      u2(0),
      u2(0),
      u2(signatureNameIndex),
      u4(2),
      u2(classReturnSignatureIndex)
    ]),
    componentTypeBridgeCode = Buffer.concat([
      Buffer.from([0x2a, 0xb6]),
      u2(componentTypeMethodIndex),
      Buffer.from([0xb0])
    ]),
    componentTypeBridgeMethod = Buffer.concat([
      u2(0x1041),
      u2(componentTypeNameIndex),
      u2(ofFieldReturnDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + componentTypeBridgeCode.length),
      u2(1),
      u2(1),
      u4(componentTypeBridgeCode.length),
      componentTypeBridgeCode,
      u2(0),
      u2(0)
    ]),
    arrayTypeCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(arrayTypeHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    arrayTypeMethod = Buffer.concat([
      u2(0x0001),
      u2(arrayTypeNameIndex),
      u2(classReturnDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + arrayTypeCode.length),
      u2(1),
      u2(1),
      u4(arrayTypeCode.length),
      arrayTypeCode,
      u2(0),
      u2(0),
      u2(signatureNameIndex),
      u4(2),
      u2(classReturnSignatureIndex)
    ]),
    arrayTypeBridgeCode = Buffer.concat([
      Buffer.from([0x2a, 0xb6]),
      u2(arrayTypeMethodIndex),
      Buffer.from([0xb0])
    ]),
    arrayTypeBridgeMethod = Buffer.concat([
      u2(0x1041),
      u2(arrayTypeNameIndex),
      u2(ofFieldReturnDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + arrayTypeBridgeCode.length),
      u2(1),
      u2(1),
      u4(arrayTypeBridgeCode.length),
      arrayTypeBridgeCode,
      u2(0),
      u2(0)
    ]),
    describeConstableCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(describeConstableHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    describeConstableMethod = Buffer.concat([
      u2(0x0001),
      u2(describeConstableNameIndex),
      u2(optionalDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + describeConstableCode.length),
      u2(1),
      u2(1),
      u4(describeConstableCode.length),
      describeConstableCode,
      u2(0),
      u2(0),
      u2(signatureNameIndex),
      u4(2),
      u2(describeConstableSignatureIndex)
    ]);

  var withMethods = Buffer.concat([
    withInterface.slice(0, methods.countOffset),
    u2(methods.count + 13),
    withInterface.slice(methods.countOffset + 2, methods.endOffset),
    getModuleMethod,
    getRecordComponentsMethod,
    isHiddenMethod,
    isRecordMethod,
    isSealedMethod,
    getPermittedSubclassesMethod,
    getPackageNameMethod,
    descriptorStringMethod,
    componentTypeMethod,
    componentTypeBridgeMethod,
    arrayTypeMethod,
    arrayTypeBridgeMethod,
    describeConstableMethod,
    withInterface.slice(methods.endOffset)
  ]),
    overlaidMethods = methodsInfo(withMethods, cp.offset + extraConstants.length),
    classAttributesOffset = overlaidMethods.endOffset,
    classAttributesCount = withMethods.readUInt16BE(classAttributesOffset),
    classSignaturePatched = false;
  classAttributesOffset += 2;
  for (var attributeIndex = 0; attributeIndex < classAttributesCount; attributeIndex++) {
    var attributeNameIndex = withMethods.readUInt16BE(classAttributesOffset),
      attributeLength = withMethods.readUInt32BE(classAttributesOffset + 2);
    if (attributeNameIndex === existingSignatureNameIndex && attributeLength === 2) {
      withMethods.writeUInt16BE(classSignatureIndex, classAttributesOffset + 6);
      classSignaturePatched = true;
      break;
    }
    classAttributesOffset += 6 + attributeLength;
  }
  if (!classSignaturePatched) {
    throw new Error('java.lang.Class is missing its Signature attribute');
  }
  return withMethods;
}

// Inject a parsed method so direct calls and reflection share exact metadata.
function addJavaLangRuntimeModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    versionNameIndex = cp.count,
    versionDescriptorIndex = cp.count + 1,
    codeNameIndex = cp.count + 2,
    helperNameIndex = cp.count + 3,
    helperClassIndex = cp.count + 4,
    helperNameAndTypeIndex = cp.count + 5,
    helperMethodIndex = cp.count + 6,
    extraConstants = Buffer.concat([
      utf8Constant('version'),
      utf8Constant('()Ljava/lang/Runtime$Version;'),
      utf8Constant('Code'),
      utf8Constant('java/lang/DoppioRuntime'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      Buffer.concat([
        Buffer.from([12]),
        u2(versionNameIndex),
        u2(versionDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(helperNameAndTypeIndex)
      ])
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 7),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    code = Buffer.concat([
      Buffer.from([0xb8]),
      u2(helperMethodIndex),
      Buffer.from([0xb0])
    ]),
    versionMethod = Buffer.concat([
      u2(0x0009),
      u2(versionNameIndex),
      u2(versionDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + code.length),
      u2(1),
      u2(0),
      u4(code.length),
      code,
      u2(0),
      u2(0)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    versionMethod,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangDeprecatedModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    sinceNameIndex = cp.count,
    stringDescriptorIndex = cp.count + 1,
    annotationDefaultNameIndex = cp.count + 2,
    emptyStringIndex = cp.count + 3,
    forRemovalNameIndex = cp.count + 4,
    booleanDescriptorIndex = cp.count + 5,
    falseIntegerIndex = cp.count + 6,
    extraConstants = Buffer.concat([
      utf8Constant('since'),
      utf8Constant('()Ljava/lang/String;'),
      utf8Constant('AnnotationDefault'),
      utf8Constant(''),
      utf8Constant('forRemoval'),
      utf8Constant('()Z'),
      Buffer.concat([Buffer.from([3]), u4(0)])
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 7),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    sinceMethod = Buffer.concat([
      u2(0x0401),
      u2(sinceNameIndex),
      u2(stringDescriptorIndex),
      u2(1),
      u2(annotationDefaultNameIndex),
      u4(3),
      Buffer.from([0x73]),
      u2(emptyStringIndex)
    ]),
    forRemovalMethod = Buffer.concat([
      u2(0x0401),
      u2(forRemovalNameIndex),
      u2(booleanDescriptorIndex),
      u2(1),
      u2(annotationDefaultNameIndex),
      u4(3),
      Buffer.from([0x5a]),
      u2(falseIntegerIndex)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 2),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    sinceMethod,
    forRemovalMethod,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangCharacterModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    methodNameIndex = cp.count,
    methodDescriptorIndex = cp.count + 1,
    codeNameIndex = cp.count + 2,
    helperNameIndex = cp.count + 3,
    helperClassIndex = cp.count + 4,
    helperNameAndTypeIndex = cp.count + 5,
    helperMethodIndex = cp.count + 6,
    extraConstants = Buffer.concat([
      utf8Constant('toString'),
      utf8Constant('(I)Ljava/lang/String;'),
      utf8Constant('Code'),
      utf8Constant('java/lang/DoppioCharacter'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      Buffer.concat([
        Buffer.from([12]),
        u2(methodNameIndex),
        u2(methodDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(helperNameAndTypeIndex)
      ])
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 7),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    code = Buffer.concat([
      Buffer.from([0x1a, 0xb8]),
      u2(helperMethodIndex),
      Buffer.from([0xb0])
    ]),
    method = Buffer.concat([
      u2(0x0009),
      u2(methodNameIndex),
      u2(methodDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + code.length),
      u2(1),
      u2(1),
      u4(code.length),
      code,
      u2(0),
      u2(0)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    method,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangClassLoaderModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    methodNameIndex = cp.count,
    methodDescriptorIndex = cp.count + 1,
    codeNameIndex = cp.count + 2,
    helperNameIndex = cp.count + 3,
    helperClassIndex = cp.count + 4,
    helperNameAndTypeIndex = cp.count + 5,
    helperMethodIndex = cp.count + 6,
    annotationsNameIndex = cp.count + 7,
    annotationTypeIndex = cp.count + 8,
    extraConstants = Buffer.concat([
      utf8Constant('getPlatformClassLoader'),
      utf8Constant('()Ljava/lang/ClassLoader;'),
      utf8Constant('Code'),
      utf8Constant('java/lang/DoppioClassLoader'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      Buffer.concat([
        Buffer.from([12]),
        u2(methodNameIndex),
        u2(methodDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(helperNameAndTypeIndex)
      ]),
      utf8Constant('RuntimeVisibleAnnotations'),
      utf8Constant('Ljdk/internal/reflect/CallerSensitive;')
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 9),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    code = Buffer.concat([
      Buffer.from([0xb8]),
      u2(helperMethodIndex),
      Buffer.from([0xb0])
    ]),
    method = Buffer.concat([
      u2(0x0009),
      u2(methodNameIndex),
      u2(methodDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + code.length),
      u2(1),
      u2(0),
      u4(code.length),
      code,
      u2(0),
      u2(0),
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(annotationTypeIndex),
      u2(0)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 1),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    method,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangClassLoaderPackageModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    definedPackageNameIndex = cp.count,
    definedPackageDescriptorIndex = cp.count + 1,
    definedPackagesNameIndex = cp.count + 2,
    definedPackagesDescriptorIndex = cp.count + 3,
    codeNameIndex = cp.count + 4,
    helperNameIndex = cp.count + 5,
    helperClassIndex = cp.count + 6,
    definedPackageHelperDescriptorIndex = cp.count + 7,
    definedPackageNameAndTypeIndex = cp.count + 8,
    definedPackageHelperMethodIndex = cp.count + 9,
    definedPackagesHelperDescriptorIndex = cp.count + 10,
    definedPackagesNameAndTypeIndex = cp.count + 11,
    definedPackagesHelperMethodIndex = cp.count + 12,
    extraConstants = Buffer.concat([
      utf8Constant('getDefinedPackage'),
      utf8Constant('(Ljava/lang/String;)Ljava/lang/Package;'),
      utf8Constant('getDefinedPackages'),
      utf8Constant('()[Ljava/lang/Package;'),
      utf8Constant('Code'),
      utf8Constant('java/lang/DoppioClassLoader'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      utf8Constant('(Ljava/lang/ClassLoader;Ljava/lang/String;)Ljava/lang/Package;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(definedPackageNameIndex),
        u2(definedPackageHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(definedPackageNameAndTypeIndex)
      ]),
      utf8Constant('(Ljava/lang/ClassLoader;)[Ljava/lang/Package;'),
      Buffer.concat([
        Buffer.from([12]),
        u2(definedPackagesNameIndex),
        u2(definedPackagesHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(definedPackagesNameAndTypeIndex)
      ])
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 13),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    definedPackageCode = Buffer.concat([
      Buffer.from([0x2a, 0x2b, 0xb8]),
      u2(definedPackageHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    definedPackagesCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(definedPackagesHelperMethodIndex),
      Buffer.from([0xb0])
    ]),
    definedPackageMethod = Buffer.concat([
      u2(0x0011),
      u2(definedPackageNameIndex),
      u2(definedPackageDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + definedPackageCode.length),
      u2(2),
      u2(2),
      u4(definedPackageCode.length),
      definedPackageCode,
      u2(0),
      u2(0)
    ]),
    definedPackagesMethod = Buffer.concat([
      u2(0x0011),
      u2(definedPackagesNameIndex),
      u2(definedPackagesDescriptorIndex),
      u2(1),
      u2(codeNameIndex),
      u4(12 + definedPackagesCode.length),
      u2(1),
      u2(1),
      u4(definedPackagesCode.length),
      definedPackagesCode,
      u2(0),
      u2(0)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 2),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    definedPackageMethod,
    definedPackagesMethod,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangSystemModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    methodNameIndex = cp.count,
    singleDescriptorIndex = cp.count + 1,
    bundledDescriptorIndex = cp.count + 2,
    singleHelperDescriptorIndex = cp.count + 3,
    bundledHelperDescriptorIndex = cp.count + 4,
    codeNameIndex = cp.count + 5,
    helperNameIndex = cp.count + 6,
    helperClassIndex = cp.count + 7,
    singleNameAndTypeIndex = cp.count + 8,
    singleHelperMethodIndex = cp.count + 9,
    bundledNameAndTypeIndex = cp.count + 10,
    bundledHelperMethodIndex = cp.count + 11,
    loggerNameIndex = cp.count + 12,
    loggerClassIndex = cp.count + 13,
    annotationsNameIndex = cp.count + 14,
    annotationTypeIndex = cp.count + 15,
    extraConstants = Buffer.concat([
      utf8Constant('getLogger'),
      utf8Constant('(Ljava/lang/String;)Ljava/lang/System$Logger;'),
      utf8Constant('(Ljava/lang/String;Ljava/util/ResourceBundle;)Ljava/lang/System$Logger;'),
      utf8Constant('(Ljava/lang/String;)Ljava/lang/Object;'),
      utf8Constant('(Ljava/lang/String;Ljava/util/ResourceBundle;)Ljava/lang/Object;'),
      utf8Constant('Code'),
      utf8Constant('java/lang/DoppioSystem'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      Buffer.concat([
        Buffer.from([12]),
        u2(methodNameIndex),
        u2(singleHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(singleNameAndTypeIndex)
      ]),
      Buffer.concat([
        Buffer.from([12]),
        u2(methodNameIndex),
        u2(bundledHelperDescriptorIndex)
      ]),
      Buffer.concat([
        Buffer.from([10]),
        u2(helperClassIndex),
        u2(bundledNameAndTypeIndex)
      ]),
      utf8Constant('java/lang/System$Logger'),
      Buffer.concat([Buffer.from([7]), u2(loggerNameIndex)]),
      utf8Constant('RuntimeVisibleAnnotations'),
      utf8Constant('Ljdk/internal/reflect/CallerSensitive;')
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 16),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    singleCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(singleHelperMethodIndex),
      Buffer.from([0xc0]),
      u2(loggerClassIndex),
      Buffer.from([0xb0])
    ]),
    bundledCode = Buffer.concat([
      Buffer.from([0x2a, 0x2b, 0xb8]),
      u2(bundledHelperMethodIndex),
      Buffer.from([0xc0]),
      u2(loggerClassIndex),
      Buffer.from([0xb0])
    ]),
    singleMethod = Buffer.concat([
      u2(0x0009),
      u2(methodNameIndex),
      u2(singleDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + singleCode.length),
      u2(1),
      u2(1),
      u4(singleCode.length),
      singleCode,
      u2(0),
      u2(0),
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(annotationTypeIndex),
      u2(0)
    ]),
    bundledMethod = Buffer.concat([
      u2(0x0009),
      u2(methodNameIndex),
      u2(bundledDescriptorIndex),
      u2(2),
      u2(codeNameIndex),
      u4(12 + bundledCode.length),
      u2(2),
      u2(2),
      u4(bundledCode.length),
      bundledCode,
      u2(0),
      u2(0),
      u2(annotationsNameIndex),
      u4(6),
      u2(1),
      u2(annotationTypeIndex),
      u2(0)
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 2),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    singleMethod,
    bundledMethod,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangMathModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    overlays = [
      ['ceilDiv', '(II)I'],
      ['ceilDiv', '(JI)J'],
      ['ceilDiv', '(JJ)J'],
      ['ceilMod', '(II)I'],
      ['ceilMod', '(JI)I'],
      ['ceilMod', '(JJ)J'],
      ['divideExact', '(II)I'],
      ['divideExact', '(JJ)J'],
      ['floorDivExact', '(II)I'],
      ['floorDivExact', '(JJ)J'],
      ['ceilDivExact', '(II)I'],
      ['ceilDivExact', '(JJ)J'],
      ['multiplyFull', '(II)J'],
      ['multiplyHigh', '(JJ)J'],
      ['unsignedMultiplyHigh', '(JJ)J'],
      ['floorDiv', '(JI)J'],
      ['floorMod', '(JI)I'],
      ['absExact', '(I)I'],
      ['absExact', '(J)J'],
      ['clamp', '(JII)I'],
      ['clamp', '(JJJ)J'],
      ['clamp', '(DDD)D'],
      ['clamp', '(FFF)F']
    ],
    helperNameIndex = cp.count,
    helperClassIndex = cp.count + 1,
    codeNameIndex = cp.count + 2,
    extraConstants = Buffer.concat([
      utf8Constant('java/lang/DoppioMath'),
      Buffer.concat([Buffer.from([7]), u2(helperNameIndex)]),
      utf8Constant('Code')
    ].concat(overlays.reduce((constants: Buffer[], overlay: string[], index: number) => {
      var nameIndex = cp.count + 3 + index * 4,
        descriptorIndex = nameIndex + 1,
        nameAndTypeIndex = nameIndex + 2;
      constants.push(
        utf8Constant(overlay[0]),
        utf8Constant(overlay[1]),
        Buffer.concat([Buffer.from([12]), u2(nameIndex), u2(descriptorIndex)]),
        Buffer.concat([Buffer.from([10]), u2(helperClassIndex), u2(nameAndTypeIndex)])
      );
      return constants;
    }, []))),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 3 + overlays.length * 4),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    methodData = Buffer.concat(overlays.map((overlay: string[], index: number) => {
      var nameIndex = cp.count + 3 + index * 4,
        descriptorIndex = nameIndex + 1,
        helperMethodIndex = nameIndex + 3,
        descriptor = overlay[1],
        code: Buffer,
        maxStack: number,
        maxLocals: number;
      if (descriptor === '(II)I') {
        code = Buffer.concat([Buffer.from([0x1a, 0x1b, 0xb8]), u2(helperMethodIndex), Buffer.from([0xac])]);
        maxStack = 2;
        maxLocals = 2;
      } else if (descriptor === '(II)J') {
        code = Buffer.concat([Buffer.from([0x1a, 0x1b, 0xb8]), u2(helperMethodIndex), Buffer.from([0xad])]);
        maxStack = 2;
        maxLocals = 2;
      } else if (descriptor === '(JI)J') {
        code = Buffer.concat([Buffer.from([0x1e, 0x1c, 0xb8]), u2(helperMethodIndex), Buffer.from([0xad])]);
        maxStack = 3;
        maxLocals = 3;
      } else if (descriptor === '(JI)I') {
        code = Buffer.concat([Buffer.from([0x1e, 0x1c, 0xb8]), u2(helperMethodIndex), Buffer.from([0xac])]);
        maxStack = 3;
        maxLocals = 3;
      } else if (descriptor === '(I)I') {
        code = Buffer.concat([Buffer.from([0x1a, 0xb8]), u2(helperMethodIndex), Buffer.from([0xac])]);
        maxStack = 1;
        maxLocals = 1;
      } else if (descriptor === '(J)J') {
        code = Buffer.concat([Buffer.from([0x1e, 0xb8]), u2(helperMethodIndex), Buffer.from([0xad])]);
        maxStack = 2;
        maxLocals = 2;
      } else if (descriptor === '(JJ)J') {
        code = Buffer.concat([Buffer.from([0x1e, 0x20, 0xb8]), u2(helperMethodIndex), Buffer.from([0xad])]);
        maxStack = 4;
        maxLocals = 4;
      } else if (descriptor === '(JII)I') {
        code = Buffer.concat([Buffer.from([0x1e, 0x1c, 0x1d, 0xb8]), u2(helperMethodIndex), Buffer.from([0xac])]);
        maxStack = 4;
        maxLocals = 4;
      } else if (descriptor === '(JJJ)J') {
        code = Buffer.concat([Buffer.from([0x1e, 0x20, 0x16, 0x04, 0xb8]), u2(helperMethodIndex), Buffer.from([0xad])]);
        maxStack = 6;
        maxLocals = 6;
      } else if (descriptor === '(DDD)D') {
        code = Buffer.concat([Buffer.from([0x26, 0x28, 0x18, 0x04, 0xb8]), u2(helperMethodIndex), Buffer.from([0xaf])]);
        maxStack = 6;
        maxLocals = 6;
      } else if (descriptor === '(FFF)F') {
        code = Buffer.concat([Buffer.from([0x22, 0x23, 0x24, 0xb8]), u2(helperMethodIndex), Buffer.from([0xae])]);
        maxStack = 3;
        maxLocals = 3;
      } else {
        throw new Error('Unsupported java.lang.Math overlay descriptor: ' + descriptor);
      }
      return Buffer.concat([
        u2(0x0009),
        u2(nameIndex),
        u2(descriptorIndex),
        u2(1),
        u2(codeNameIndex),
        u4(12 + code.length),
        u2(maxStack),
        u2(maxLocals),
        u4(code.length),
        code,
        u2(0),
        u2(0)
      ]);
    }));

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + overlays.length),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    methodData,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangInvokeMethodHandlesModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    overlays = [
      ['privateLookupIn', '(Ljava/lang/Class;Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/invoke/MethodHandles$Lookup;'],
      ['zero', '(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'],
      ['empty', '(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'],
      ['arrayLength', '(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'],
      ['arrayConstructor', '(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'],
      ['dropArgumentsToMatch', '(Ljava/lang/invoke/MethodHandle;ILjava/util/List;I)Ljava/lang/invoke/MethodHandle;'],
      ['dropReturn', '(Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['foldArguments', '(Ljava/lang/invoke/MethodHandle;ILjava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['loop', '([[Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['whileLoop', '(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['doWhileLoop', '(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['countedLoop', '(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['countedLoop', '(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['iteratedLoop', '(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['tryFinally', '(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'],
      ['tableSwitch', '(Ljava/lang/invoke/MethodHandle;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;']
    ],
    extraConstants = Buffer.concat(overlays.reduce((constants: Buffer[], overlay: string[]) => {
      constants.push(utf8Constant(overlay[0]), utf8Constant(overlay[1]));
      return constants;
    }, [])),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + overlays.length * 2),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    methodData = Buffer.concat(overlays.map((overlay: string[], index: number) => {
      var nameIndex = cp.count + index * 2,
        descriptorIndex = nameIndex + 1;
      return Buffer.concat([
        u2(0x0109),
        u2(nameIndex),
        u2(descriptorIndex),
        u2(0)
      ]);
    }));

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + overlays.length),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    methodData,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangInvokeMethodHandleModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    overlays = [
      ['asCollector', '(ILjava/lang/Class;I)Ljava/lang/invoke/MethodHandle;'],
      ['asSpreader', '(ILjava/lang/Class;I)Ljava/lang/invoke/MethodHandle;']
    ],
    extraConstants = Buffer.concat(overlays.reduce((constants: Buffer[], overlay: string[]) => {
      constants.push(utf8Constant(overlay[0]), utf8Constant(overlay[1]));
      return constants;
    }, [])),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + overlays.length * 2),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    methodData = Buffer.concat(overlays.map((overlay: string[], index: number) => {
      var nameIndex = cp.count + index * 2,
        descriptorIndex = nameIndex + 1;
      return Buffer.concat([
        u2(0x0101),
        u2(nameIndex),
        u2(descriptorIndex),
        u2(0)
      ]);
    }));

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + overlays.length),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    methodData,
    withConstants.slice(methods.endOffset)
  ]);
}

function addJavaLangInvokeMethodHandlesLookupModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    constants: Buffer[] = [],
    nextIndex = cp.count;

  function addConstant(constant: Buffer): number {
    constants.push(constant);
    return nextIndex++;
  }

  function addUtf8(value: string): number {
    return addConstant(utf8Constant(value));
  }

  function addClass(name: string): number {
    var nameIndex = addUtf8(name);
    return addConstant(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
  }

  function addNameAndType(name: string, descriptor: string): number {
    var nameIndex = addUtf8(name),
      descriptorIndex = addUtf8(descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([12]),
      u2(nameIndex),
      u2(descriptorIndex)
    ]));
  }

  function addMethodRef(ownerIndex: number, name: string, descriptor: string): number {
    var nameAndTypeIndex = addNameAndType(name, descriptor);
    return addConstant(Buffer.concat([
      Buffer.from([10]),
      u2(ownerIndex),
      u2(nameAndTypeIndex)
    ]));
  }

  var nativeOverlays = [
      ['previousLookupClass', '()Ljava/lang/Class;'],
      ['hasFullPrivilegeAccess', '()Z'],
      ['dropLookupMode', '(I)Ljava/lang/invoke/MethodHandles$Lookup;']
    ],
    nativeIndexes = nativeOverlays.map((overlay: string[]): number[] => [
      addUtf8(overlay[0]),
      addUtf8(overlay[1])
    ]),
    codeNameIndex = addUtf8('Code'),
    exceptionsNameIndex = addUtf8('Exceptions'),
    signatureNameIndex = addUtf8('Signature'),
    deprecatedNameIndex = addUtf8('Deprecated'),
    runtimeVisibleAnnotationsNameIndex = addUtf8('RuntimeVisibleAnnotations'),
    deprecatedDescriptorIndex = addUtf8('Ljava/lang/Deprecated;'),
    sinceNameIndex = addUtf8('since'),
    sinceValueIndex = addUtf8('14'),
    helperClassIndex = addClass('java/lang/invoke/DoppioMethodHandles'),
    verifyAccessClassIndex = addClass('sun/invoke/util/VerifyAccess'),
    lookupClassIndex = addClass('java/lang/invoke/MethodHandles$Lookup'),
    hasFullPrivilegeAccessMethodIndex = addMethodRef(
      lookupClassIndex, 'hasFullPrivilegeAccess', '()Z'),
    lookupToStringMethodIndex = addMethodRef(
      helperClassIndex, 'lookupToString',
      '(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/String;'),
    illegalAccessExceptionClassIndex = addClass('java/lang/IllegalAccessException'),
    classNotFoundExceptionClassIndex = addClass('java/lang/ClassNotFoundException'),
    parsedOverlays: Array<{
      name: string;
      descriptor: string;
      helperClassIndex: number;
      helperDescriptor: string;
      signature: string;
      exceptionIndexes: number[];
    }> = [
      {
        name: 'defineClass',
        descriptor: '([B)Ljava/lang/Class;',
        helperClassIndex: helperClassIndex,
        helperDescriptor: '(Ljava/lang/invoke/MethodHandles$Lookup;[B)Ljava/lang/Class;',
        signature: '([B)Ljava/lang/Class<*>;',
        exceptionIndexes: [illegalAccessExceptionClassIndex]
      },
      {
        name: 'findClass',
        descriptor: '(Ljava/lang/String;)Ljava/lang/Class;',
        helperClassIndex: helperClassIndex,
        helperDescriptor: '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;)Ljava/lang/Class;',
        signature: '(Ljava/lang/String;)Ljava/lang/Class<*>;',
        exceptionIndexes: [classNotFoundExceptionClassIndex, illegalAccessExceptionClassIndex]
      },
      {
        name: 'accessClass',
        descriptor: '(Ljava/lang/Class;)Ljava/lang/Class;',
        helperClassIndex: verifyAccessClassIndex,
        helperDescriptor: '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;)Ljava/lang/Class;',
        signature: '(Ljava/lang/Class<*>;)Ljava/lang/Class<*>;',
        exceptionIndexes: [illegalAccessExceptionClassIndex]
      },
      {
        name: 'ensureInitialized',
        descriptor: '(Ljava/lang/Class;)Ljava/lang/Class;',
        helperClassIndex: helperClassIndex,
        helperDescriptor: '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;)Ljava/lang/Class;',
        signature: '(Ljava/lang/Class<*>;)Ljava/lang/Class<*>;',
        exceptionIndexes: [illegalAccessExceptionClassIndex]
      }
    ],
    parsedIndexes = parsedOverlays.map((overlay): {
      nameIndex: number;
      descriptorIndex: number;
      signatureIndex: number;
      helperMethodIndex: number;
    } => ({
      nameIndex: addUtf8(overlay.name),
      descriptorIndex: addUtf8(overlay.descriptor),
      signatureIndex: addUtf8(overlay.signature),
      helperMethodIndex: addMethodRef(
        overlay.helperClassIndex, overlay.name, overlay.helperDescriptor)
    })),
    extraConstants = Buffer.concat(constants),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(nextIndex),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    hasPrivateAccessCode = Buffer.concat([
      Buffer.from([0x2a, 0xb6]),
      u2(hasFullPrivilegeAccessMethodIndex),
      Buffer.from([0xac])
    ]),
    hasPrivateAccessAttributes = [
      Buffer.concat([
        u2(deprecatedNameIndex),
        u4(0)
      ]),
      Buffer.concat([
        u2(runtimeVisibleAnnotationsNameIndex),
        u4(11),
        u2(1),
        u2(deprecatedDescriptorIndex),
        u2(1),
        u2(sinceNameIndex),
        Buffer.from([0x73]),
        u2(sinceValueIndex)
      ])
    ],
    withPrivateAccess = replaceMethodCode(
      withConstants,
      cp.offset + extraConstants.length,
      'hasPrivateAccess',
      '()Z',
      codeNameIndex,
      1,
      1,
      hasPrivateAccessCode,
      0x0001,
      hasPrivateAccessAttributes),
    lookupToStringCode = Buffer.concat([
      Buffer.from([0x2a, 0xb8]),
      u2(lookupToStringMethodIndex),
      Buffer.from([0xb0])
    ]),
    withLookupToString = replaceMethodCode(
      withPrivateAccess,
      cp.offset + extraConstants.length,
      'toString',
      '()Ljava/lang/String;',
      codeNameIndex,
      1,
      1,
      lookupToStringCode),
    methods = methodsInfo(withLookupToString, cp.offset + extraConstants.length),
    nativeMethodData = Buffer.concat(nativeIndexes.map((indexes: number[]) => {
      return Buffer.concat([
        u2(0x0101),
        u2(indexes[0]),
        u2(indexes[1]),
        u2(0)
      ]);
    })),
    parsedMethodData = Buffer.concat(parsedOverlays.map((overlay, index: number) => {
      var indexes = parsedIndexes[index],
        code = Buffer.concat([
          Buffer.from([0x2a, 0x2b, 0xb8]),
          u2(indexes.helperMethodIndex),
          Buffer.from([0xb0])
        ]);
      return Buffer.concat([
        u2(0x0001),
        u2(indexes.nameIndex),
        u2(indexes.descriptorIndex),
        u2(3),
        u2(codeNameIndex),
        u4(12 + code.length),
        u2(2),
        u2(2),
        u4(code.length),
        code,
        u2(0),
        u2(0),
        u2(exceptionsNameIndex),
        u4(2 + overlay.exceptionIndexes.length * 2),
        u2(overlay.exceptionIndexes.length),
        Buffer.concat(overlay.exceptionIndexes.map((exceptionIndex: number) => u2(exceptionIndex))),
        u2(signatureNameIndex),
        u4(2),
        u2(indexes.signatureIndex)
      ]);
    }));

  return Buffer.concat([
    withLookupToString.slice(0, methods.countOffset),
    u2(methods.count + nativeOverlays.length + parsedOverlays.length),
    withLookupToString.slice(methods.countOffset + 2, methods.endOffset),
    nativeMethodData,
    parsedMethodData,
    withLookupToString.slice(methods.endOffset)
  ]);
}

function addJavaNioMappedByteBufferModernOverlays(data: Buffer): Buffer {
  var cp = constantPoolEnd(data),
    overlays = [
      ['force', '(II)Ljava/nio/MappedByteBuffer;']
    ],
    extraConstants = Buffer.concat(overlays.reduce((constants: Buffer[], overlay: string[]) => {
      constants.push(utf8Constant(overlay[0]), utf8Constant(overlay[1]));
      return constants;
    }, [])),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + overlays.length * 2),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
    methodData = Buffer.concat(overlays.map((overlay: string[], index: number) => {
      var nameIndex = cp.count + index * 2,
        descriptorIndex = nameIndex + 1;
      return Buffer.concat([
        u2(0x0111),
        u2(nameIndex),
        u2(descriptorIndex),
        u2(0)
      ]);
    }));

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + overlays.length),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    methodData,
    withConstants.slice(methods.endOffset)
  ]);
}

/**
 * Used to lock classes for loading.
 */
class ClassLocks {
  /**
   * typrStr => array of callbacks to trigger when operation completes.
   */
  private locks: { [typeStr: string]: ClassLock } = {};

  constructor() {}

  /**
   * Checks if the lock for the given class is already taken. If not, it takes
   * the lock. If it is taken, we enqueue the callback.
   * NOTE: For convenience, will handle triggering the owner's callback as well.
   */
  public tryLock(typeStr: string, thread: JVMThread, cb: (cdata: ClassData) => void): boolean {
    if (typeof this.locks[typeStr] === 'undefined') {
      this.locks[typeStr] = new ClassLock();
    }
    return this.locks[typeStr].tryLock(thread, cb);
  }

  /**
   * Releases the lock on the given string.
   */
  public unlock(typeStr: string, cdata: ClassData): void {
    this.locks[typeStr].unlock(cdata);
    // No need for this lock to remain.
    delete this.locks[typeStr];
  }

  /**
   * Returns the owning thread of a given lock. Returns null if the specified
   * type string is not locked.
   */
  public getOwner(typeStr: string): JVMThread {
    if (this.locks[typeStr]) {
      return this.locks[typeStr].getOwner();
    }
    return null;
  }
}

/**
 * Base classloader class. Contains common class resolution and instantiation
 * logic.
 */
export abstract class ClassLoader {
  /**
   * Stores loaded *reference* and *array* classes.
   */
  private loadedClasses: { [typeStr: string]: ClassData } = {};
  /**
   * Stores callbacks that are waiting for another thread to finish loading
   * the specified class.
   */
  private loadClassLocks: ClassLocks = new ClassLocks();

  /**
   * @param bootstrap The JVM's bootstrap classloader. ClassLoaders use it
   *   to retrieve primitive types.
   */
  constructor(public bootstrap: BootstrapClassLoader) { }

  /**
   * Retrieve a listing of classes that are loaded in this class loader.
   */
  public getLoadedClassNames(): string[] {
    return Object.keys(this.loadedClasses);
  }

  /**
   * Adds the specified class to the classloader. As opposed to defineClass,
   * which defines a new class from bytes with the classloader.
   *
   * What's the difference?
   * * Classes created with defineClass are defined by this classloader.
   * * Classes added with addClass may have been defined by a different
   *   classloader. This happens when a custom class loader's loadClass
   *   function proxies classloading to a different classloader.
   *
   * @param typeStr The type string of the class.
   * @param classData The class data object representing the class.
   */
  public addClass(typeStr: string, classData: ClassData): void {
    // If the class is already added, ensure it is the same class we are adding again.
    assert(this.loadedClasses[typeStr] != null ? this.loadedClasses[typeStr] === classData : true);
    this.loadedClasses[typeStr] = classData;
  }

  /**
   * No-frills. Get the class if it's defined in the class loader, no matter
   * what shape it is in.
   *
   * Should only be used internally by ClassLoader subclasses.
   */
  protected getClass(typeStr: string): ClassData {
    return this.loadedClasses[typeStr];
  }

  /**
   * Defines a new class with the class loader from an array of bytes.
   * @param thread The thread that is currently in control when this class is
   *   being defined. An exception may be thrown if there is an issue parsing
   *   the class file.
   * @param typeStr The type string of the class (e.g. "Ljava/lang/Object;")
   * @param data The data associated with the class as a binary blob.
   * @param protectionDomain The protection domain for the class (can be NULL).
   * @return The defined class, or null if there was an issue.
   */
  public defineClass<T extends JVMTypes.java_lang_Object>(thread: JVMThread, typeStr: string, data: Buffer, protectionDomain: JVMTypes.java_security_ProtectionDomain): ReferenceClassData<T> {
    if (this.getClass(typeStr) != null) {
      if (thread === null) {
        error(`JVM initialization failed: duplicate class definition ${typeStr}`);
      } else {
        thread.throwNewException('Ljava/lang/LinkageError;', `Duplicate class definition: ${ext_classname(typeStr)}`);
      }
      return null;
    }
    try {
      var classData = new ReferenceClassData<T>(data, protectionDomain, this);
      this.addClass(typeStr, classData);
      if (this instanceof BootstrapClassLoader) {
        debug(`[BOOTSTRAP] Defining class ${typeStr}`);
      } else {
        debug(`[CUSTOM] Defining class ${typeStr}`);
      }
      return classData;
    } catch (e) {
      if (thread === null) {
        // This will only happen when we're loading java/lang/Thread for
        // the very first time.
        error(`JVM initialization failed: ${e}`);
        error(e.stack);
      } else {
        thread.throwNewException('Ljava/lang/ClassFormatError;', e);
      }
      return null;
    }
  }

  /**
   * Defines a new array class with this loader.
   */
  protected defineArrayClass<T>(typeStr: string): ArrayClassData<T> {
    assert(this.getLoadedClass(get_component_type(typeStr)) != null);
    var arrayClass = new ArrayClassData<T>(get_component_type(typeStr), this);
    this.addClass(typeStr, arrayClass);
    return arrayClass;
  }

  /**
   * Attempts to retrieve the given loaded class.
   * @param typeStr The name of the class.
   * @return Returns the loaded class, or null if no such class is currently
   *   loaded.
   */
  public getLoadedClass(typeStr: string): ClassData {
    var cls = this.loadedClasses[typeStr];
    if (cls != null) {
      return cls;
    } else {
      if (is_primitive_type(typeStr)) {
        // Primitive classes must be fetched from the bootstrap classloader.
        return this.bootstrap.getPrimitiveClass(typeStr);
      } else if (is_array_type(typeStr)) {
        // We might be able to load this array class synchronously.
        // Component class must be loaded. And we must define the array class
        // with the component class's loader.
        var component = this.getLoadedClass(get_component_type(typeStr));
        if (component != null) {
          var componentCl = component.getLoader();
          if (componentCl === this) {
            // We're responsible for defining the array class.
            return this.defineArrayClass(typeStr);
          } else {
            // Delegate to the other loader, then add the class to our loaded
            // roster.
            cls = componentCl.getLoadedClass(typeStr);
            this.addClass(typeStr, cls);
            return cls;
          }
        }
      }
      return null;
    }
  }

  /**
   * Attempts to retrieve the given resolved class.
   * @param typeStr The name of the class.
   * @return Returns the class if it is both loaded and resolved. Returns null
   *   if this is not the case.
   */
  public getResolvedClass(typeStr: string): ClassData {
    var cls = this.getLoadedClass(typeStr);
    if (cls !== null) {
      if (cls.isResolved() || cls.tryToResolve()) {
        return cls;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * Attempts to retrieve the given initialized class.
   * @param typeStr The name of the class.
   * @return Returns the class if it is initialized. Returns null if this is
   *   not the case.
   */
  public getInitializedClass(thread: JVMThread, typeStr: string): ClassData {
    var cls = this.getLoadedClass(typeStr);
    if (cls !== null) {
      if (cls.isInitialized(thread) || cls.tryToInitialize()) {
        return cls;
      } else {
        return null;
      }
    } else {
      return cls;
    }
  }

  /**
   * Asynchronously loads the given class.
   */
  public loadClass(thread: JVMThread, typeStr: string, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    // See if we can grab this synchronously first.
    var cdata = this.getLoadedClass(typeStr);
    if (cdata) {
      setImmediate(() => {
        cb(cdata);
      });
    } else {
      // Check the loadClass lock for this class.
      if (this.loadClassLocks.tryLock(typeStr, thread, cb)) {
        // Async it is!
        if (is_reference_type(typeStr)) {
          this._loadClass(thread, typeStr, (cdata) => {
            this.loadClassLocks.unlock(typeStr, cdata);
          }, explicit);
        } else {
          // Array
          this.loadClass(thread, get_component_type(typeStr), (cdata) => {
            if (cdata != null) {
              // Synchronously will work now.
              this.loadClassLocks.unlock(typeStr, this.getLoadedClass(typeStr));
            }
          }, explicit);
        }
      }
    }
  }

  /**
   * Asynchronously loads the given class. Works differently for bootstrap and
   * custom class loaders.
   *
   * Should never be invoked directly! Use loadClass.
   */
  protected abstract _loadClass(thread: JVMThread, typeStr: string, cb: (cdata: ClassData) => void, explicit?: boolean): void;

  /**
   * Convenience function: Resolve many classes. Calls cb with null should
   * an error occur.
   */
  public resolveClasses(thread: JVMThread, typeStrs: string[], cb: (classes: { [typeStr: string]: ClassData }) => void) {
    var classes: { [typeStr: string]: ClassData } = {};
    asyncForEach<string>(typeStrs, (typeStr: string, next_item: (err?: any) => void) => {
      this.resolveClass(thread, typeStr, (cdata) => {
        if (cdata === null) {
          next_item(`Error resolving class: ${typeStr}`);
        } else {
          classes[typeStr] = cdata;
          next_item();
        }
      });
    }, (err?: any): void => {
      if (err) {
        cb(null);
      } else {
        cb(classes);
      }
    });
  }

  /**
   * Asynchronously *resolves* the given class by loading the class and
   * resolving its super class, interfaces, and/or component classes.
   */
  public resolveClass(thread: JVMThread, typeStr: string, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    this.loadClass(thread, typeStr, (cdata: ClassData) => {
      if (cdata === null || cdata.isResolved()) {
        // Nothing to do! Either cdata is null, an exception triggered, and we
        // failed, or cdata is already resolved.
        setImmediate(() => { cb(cdata); });
      } else {
        cdata.resolve(thread, cb, explicit);
      }
    }, explicit);
  }

  /**
   * Asynchronously *initializes* the given class and its super classes.
   */
  public initializeClass(thread: JVMThread, typeStr: string, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    // Get the resolved class.
    this.resolveClass(thread, typeStr, (cdata: ClassData) => {
      if (cdata === null || cdata.isInitialized(thread)) {
        // Nothing to do! Either resolution failed and an exception has already
        // been thrown, cdata is already initialized, or the current thread is
        // initializing the class.
        setImmediate(() => {
          cb(cdata);
        });
      } else {
        assert(is_reference_type(typeStr));
        (<ReferenceClassData<JVMTypes.java_lang_Object>> cdata).initialize(thread, cb, explicit);
      }
    }, explicit);
  }

  /**
   * Throws the appropriate exception/error for a class not being found.
   * If loading was implicitly triggered by the JVM, we call NoClassDefFoundError.
   * If the program explicitly called loadClass, then we throw the ClassNotFoundException.
   */
  protected throwClassNotFoundException(thread: JVMThread, typeStr: string, explicit: boolean): void {
    thread.throwNewException(explicit ? 'Ljava/lang/ClassNotFoundException;' : 'Ljava/lang/NoClassDefFoundError;', `Cannot load class: ${ext_classname(typeStr)}`);
  }

  /**
   * Returns the JVM object corresponding to this ClassLoader.
   */
  public abstract getLoaderObject(): JVMTypes.java_lang_ClassLoader;
}

/**
 * The JVM's bootstrap class loader. Loads classes directly from files on the
 * file system.
 */
export class BootstrapClassLoader extends ClassLoader {
  /**
   * The classpath. The first path in the array is the first searched.
   * Meaning: The *end* of this array is the bootstrap class loader, and the
   *   *beginning* of the array is the classpath item added last.
   */
  private classpath: IClasspathItem[];
  /**
   * Keeps track of all loaded packages, and the classpath item(s) from
   * whence their packages came.
   *
   * Note: Package separators are specified with slashes ('/'), not periods ('.').
   */
  private loadedPackages: {[pkgString: string]: IClasspathItem[]};

  /**
   * Constructs the bootstrap classloader with the given classpath.
   * @param classPath The classpath, where the *first* item is the *last*
   *   classpath searched. Meaning, the classPath[0] should be the bootstrap
   *   class path.
   * @param extractionPath The path where jar files should be extracted.
   * @param cb Called once all of the classpath items have been checked.
   *   Passes an error if one occurs.
   */
  constructor(javaHome: string, classpath: string[], cb: (e?: any) => void) {
    // The correct way to do this would be super(this), but we cannot reference this before calling super()
    super(null);
    this.bootstrap = this;

    this.classpath = null;
    this.loadedPackages = {};

    ClasspathFactory(javaHome, classpath, (items) => {
      this.classpath = items.reverse();
      cb();
    });
  }

  /**
   * Registers that a given class has successfully been loaded from the specified
   * classpath item.
   */
  private _registerLoadedClass(clsType: string, cpItem: IClasspathItem): void {
    let pkgName = clsType.slice(0, clsType.lastIndexOf('/')),
      itemLoader = this.loadedPackages[pkgName];
    if (!itemLoader) {
      this.loadedPackages[pkgName] = [cpItem];
    } else if (itemLoader[0] !== cpItem && itemLoader.indexOf(cpItem) === -1) {
      // Common case optimization: Simply check the first array element.
      itemLoader.push(cpItem);
    }
  }

  /**
   * Returns a listing of tuples containing:
   * * The package name (e.g. java/lang)
   * * Classpath locations where classes in the package were loaded.
   */
  public getPackages(): [string, string[]][] {
    return Object.keys(this.loadedPackages).map((pkgName: string): [string, string[]] => {
      return [pkgName, this.loadedPackages[pkgName].map((item) => item.getPath())];
    });
  }

  /**
   * Retrieves or defines the specified primitive class.
   */
  public getPrimitiveClass(typeStr: string): PrimitiveClassData {
    var cdata = <PrimitiveClassData> this.getClass(typeStr);
    if (cdata == null) {
      cdata = new PrimitiveClassData(typeStr, this);
      this.addClass(typeStr, cdata);
    }
    return cdata;
  }

  /**
   * Asynchronously load the given class from the classpath.
   *
   * SHOULD ONLY BE INVOKED INTERNALLY BY THE CLASSLOADER.
   */
  protected _loadClass(thread: JVMThread, typeStr: string, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    debug(`[BOOTSTRAP] Loading class ${typeStr}`);
    // This method is only valid for reference types!
    assert(is_reference_type(typeStr));
    // Search the class path for the class.
    let clsFilePath = descriptor2typestr(typeStr),
      cPathLen = this.classpath.length,
      toSearch: IClasspathItem[] = [],
      clsData: Buffer;

    searchLoop:
    for (let i = 0; i < cPathLen; i++) {
      let item = this.classpath[i];
      switch (item.hasClass(clsFilePath)) {
        case TriState.INDETERMINATE:
          toSearch.push(item);
          break;
        case TriState.TRUE:
          // Break out of the loop; TRUE paths are guaranteed to have the class.
          toSearch.push(item);
          break searchLoop;
      }
    }

    asyncFind<IClasspathItem>(toSearch, (pItem: IClasspathItem, callback: (success: boolean) => void): void => {
      pItem.loadClass(clsFilePath, (err: Error, data?: Buffer) => {
        if (err) {
          callback(false);
        } else {
          clsData = data;
          callback(true);
        }
      });
    }, (pItem?: IClasspathItem) => {
      if (pItem) {
        if (typeStr === 'Ljava/lang/Thread;') {
          clsData = addStaticNoopModernOverlay(clsData, 'onSpinWait', '()V', 0,
            'Ljdk/internal/vm/annotation/IntrinsicCandidate;');
        }
        if (typeStr === 'Ljava/lang/ref/Reference;') {
          clsData = addStaticNoopModernOverlay(clsData, 'reachabilityFence', '(Ljava/lang/Object;)V', 1,
            'Ljdk/internal/vm/annotation/ForceInline;');
        }
        if (typeStr === 'Ljava/lang/Class;') {
          clsData = addJavaLangClassModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/reflect/Executable;') {
          clsData = addJavaLangReflectExecutableReceiverModernOverlays(clsData, false);
        }
        if (typeStr === 'Ljava/lang/reflect/Constructor;') {
          clsData = addJavaLangReflectExecutableReceiverModernOverlays(clsData, true);
        }
        if (typeStr === 'Ljava/lang/reflect/AccessibleObject;') {
          clsData = addJavaLangReflectAccessibleObjectModernOverlays(clsData);
        }
        if ((typeStr.indexOf('Ljava/lang/reflect/Annotated') === 0 &&
            typeStr !== 'Ljava/lang/reflect/AnnotatedElement;') ||
            typeStr.indexOf(
              'Lsun/reflect/annotation/AnnotatedTypeFactory$Annotated') === 0) {
          clsData = addAnnotatedOwnerTypeModernOverlay(clsData, typeStr);
        }
        if (typeStr ===
            'Lsun/reflect/annotation/TypeAnnotation$LocationInfo;') {
          clsData = addTypeAnnotationLocationInfoModernOverlay(clsData);
        }
        if (typeStr === 'Lsun/reflect/annotation/AnnotatedTypeFactory;') {
          clsData = addAnnotatedTypeFactoryNestingModernOverlay(clsData);
        }
        if (typeStr ===
            'Lsun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl;') {
          clsData = addParameterizedTypeImplModernOverlay(clsData);
        }
        if (typeStr === 'Ljava/lang/ClassLoader;') {
          clsData = addJavaLangClassLoaderModernOverlays(clsData);
          clsData = addJavaLangClassLoaderPackageModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/System;') {
          clsData = addJavaLangSystemModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/Runtime;') {
          clsData = addJavaLangRuntimeModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/Deprecated;') {
          clsData = addJavaLangDeprecatedModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/Character;') {
          clsData = addJavaLangCharacterModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/Math;' || typeStr === 'Ljava/lang/StrictMath;') {
          clsData = addJavaLangMathModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/invoke/MethodHandles;') {
          clsData = addJavaLangInvokeMethodHandlesModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/invoke/MethodHandle;') {
          clsData = addJavaLangInvokeMethodHandleModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/lang/invoke/MethodHandles$Lookup;') {
          clsData = addJavaLangInvokeMethodHandlesLookupModernOverlays(clsData);
        }
        if (typeStr === 'Ljava/nio/MappedByteBuffer;') {
          clsData = addJavaNioMappedByteBufferModernOverlays(clsData);
        }
        let cls = this.defineClass(thread, typeStr, clsData, null);
        if (cls !== null) {
          this._registerLoadedClass(clsFilePath, pItem);
        }
        cb(cls);
      } else {
        if (typeStr === 'Ljava/lang/Record;') {
          let cls = this.defineClass(thread, typeStr, Buffer.from([
            0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x34, 0x00, 0x0a,
            0x07, 0x00, 0x02,
            0x01, 0x00, 0x10, 0x6a, 0x61, 0x76, 0x61, 0x2f, 0x6c, 0x61, 0x6e, 0x67, 0x2f, 0x52, 0x65, 0x63, 0x6f, 0x72, 0x64,
            0x07, 0x00, 0x04,
            0x01, 0x00, 0x10, 0x6a, 0x61, 0x76, 0x61, 0x2f, 0x6c, 0x61, 0x6e, 0x67, 0x2f, 0x4f, 0x62, 0x6a, 0x65, 0x63, 0x74,
            0x01, 0x00, 0x06, 0x3c, 0x69, 0x6e, 0x69, 0x74, 0x3e,
            0x01, 0x00, 0x03, 0x28, 0x29, 0x56,
            0x01, 0x00, 0x04, 0x43, 0x6f, 0x64, 0x65,
            0x0a, 0x00, 0x03, 0x00, 0x09,
            0x0c, 0x00, 0x05, 0x00, 0x06,
            0x04, 0x21, 0x00, 0x01, 0x00, 0x03,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
            0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x01,
            0x00, 0x07, 0x00, 0x00, 0x00, 0x11,
            0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05,
            0x2a, 0xb7, 0x00, 0x08, 0xb1,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00
          ]), null);
          cb(cls);
          return;
        }
        // No such class.
        debug(`Could not find class ${typeStr}`);
        this.throwClassNotFoundException(thread, typeStr, explicit);
        cb(null);
      }
    });
  }

  /**
   * Returns a listing of reference classes loaded in the bootstrap loader.
   */
  public getLoadedClassFiles(): string[] {
    var loadedClasses = this.getLoadedClassNames();
    return loadedClasses.filter((clsName: string) => is_reference_type(clsName));
  }

  /**
   * Returns the JVM object corresponding to this ClassLoader.
   * @todo Represent the bootstrap by something other than 'null'.
   * @todo These should be one-in-the-same.
   */
  public getLoaderObject(): JVMTypes.java_lang_ClassLoader {
    return null;
  }

  /**
   * Returns the current classpath.
   */
  public getClassPath(): string[] {
    let cpLen = this.classpath.length,
      cpStrings: string[] = new Array<string>(cpLen);
    for (let i = 0; i < cpLen; i++) {
      // Reverse it so it is the expected order (last item is first search target)
      cpStrings[i] = this.classpath[cpLen - i - 1].getPath();
    }
    return cpStrings;
  }

  /**
   * Returns the classpath item objects in the classpath.
   */
  public getClassPathItems(): IClasspathItem[] {
    return this.classpath.slice(0);
  }
}

/**
 * A Custom ClassLoader. Loads classes by calling loadClass on the user-defined
 * loader.
 */
export class CustomClassLoader extends ClassLoader {
  constructor(bootstrap: BootstrapClassLoader,
    private loaderObj: JVMTypes.java_lang_ClassLoader) {
    super(bootstrap);
  }

  /**
   * Asynchronously load the given class from the classpath. Calls the
   * classloader's loadClass method.
   *
   * SHOULD ONLY BE INVOKED BY THE CLASS LOADER.
   *
   * @param thread The thread that triggered the loading.
   * @param typeStr The type string of the class.
   * @param cb The callback that will be called with the loaded class. It will
   *   be passed a null if there is an error -- which also indicates that it
   *   threw an exception on the JVM thread.
   * @param explicit 'True' if loadClass was explicitly invoked by the program,
   *   false otherwise. This changes the exception/error that we throw.
   */
  protected _loadClass(thread: JVMThread, typeStr: string, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    debug(`[CUSTOM] Loading class ${typeStr}`);
    // This method is only valid for reference types!
    assert(is_reference_type(typeStr));
    // Invoke the custom class loader.
    this.loaderObj['loadClass(Ljava/lang/String;)Ljava/lang/Class;'](thread, [initString(this.bootstrap, ext_classname(typeStr))], (e?: JVMTypes.java_lang_Throwable, jco?: JVMTypes.java_lang_Class) => {
      if (e) {
        // Exception! There was an issue defining the class.
        this.throwClassNotFoundException(thread, typeStr, explicit);
        cb(null);
      } else {
        // Add the class returned by loadClass, in case the classloader
        // proxied loading to another classloader.
        var cls = jco.$cls;
        this.addClass(typeStr, cls);
        cb(cls);
      }
    });
  }

  /**
   * Returns the JVM object corresponding to this ClassLoader.
   * @todo These should be one-in-the-same.
   */
  public getLoaderObject(): JVMTypes.java_lang_ClassLoader {
    return this.loaderObj;
  }
}
