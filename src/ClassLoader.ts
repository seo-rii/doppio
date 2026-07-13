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
    getModuleNameIndex = cp.count,
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
      ])
    ]),
    withConstants = Buffer.concat([
      data.slice(0, 8),
      u2(cp.count + 34),
      data.slice(10, cp.offset),
      extraConstants,
      data.slice(cp.offset)
    ]),
    methods = methodsInfo(withConstants, cp.offset + extraConstants.length),
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
    ]);

  return Buffer.concat([
    withConstants.slice(0, methods.countOffset),
    u2(methods.count + 8),
    withConstants.slice(methods.countOffset + 2, methods.endOffset),
    getModuleMethod,
    getRecordComponentsMethod,
    isHiddenMethod,
    isRecordMethod,
    isSealedMethod,
    getPermittedSubclassesMethod,
    getPackageNameMethod,
    descriptorStringMethod,
    withConstants.slice(methods.endOffset)
  ]);
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
    overlays = [
      ['previousLookupClass', '()Ljava/lang/Class;'],
      ['hasFullPrivilegeAccess', '()Z'],
      ['dropLookupMode', '(I)Ljava/lang/invoke/MethodHandles$Lookup;']
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
