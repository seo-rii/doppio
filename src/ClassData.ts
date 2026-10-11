import {ext_classname, Flags, descriptor2typestr, boxClassName, asyncForEach, typedArraysSupported, jvmName2JSName, initialValue} from './util';
import * as util from './util';
import ByteStream from './ByteStream';
import {ConstantPool, ClassReference, ConstString, MethodHandle, IConstantPoolItem, DynamicConstant, InvokeDynamic} from './ConstantPool';
import {IAttribute, IRecordComponentInfo, makeAttributes, BootstrapMethods, ConstantValue, NestHost, NestMembers, PermittedSubclasses, RecordAttribute} from './attributes';
import {JVMThread, InternalStackFrame, NativeStackFrame, BytecodeStackFrame} from './threading';
import * as logging from './logging';
import {Method, Field, canOverrideMethod, invokeExactMethod, invokeVirtualMethod} from './methods';
import {ClassLoader, CustomClassLoader} from './ClassLoader';
import {ClassState, ConstantPoolItemType, ThreadStatus} from './enums';
import ClassLock from './ClassLock';
import assert from './assert';
import gLong from './gLong';
import JVM from './jvm';
import StringOutputStream from './StringOutputStream';
import Monitor from './Monitor';
import * as JVMTypes from '../includes/JVMTypes';
import {setImmediate} from 'browserfs';
import {validateBinaryClassName} from './classfile_validation';
import {ClassVerification} from './ClassVerification';
import {ClassPreparation} from './ClassPreparation';
import {canAccessReflectionSuperclass} from './ReflectionAdapters';
import {isKnownNestmate} from './ClassAccess';

const trace = logging.trace;
const debug = logging.debug;
const MIN_SUPPORTED_CLASSFILE_MAJOR = 45;
const MAX_SUPPORTED_CLASSFILE_MAJOR = 70;

/** Pure selection keeps abstract declarations and their exact owner intact.
 * Missing implementations and conflicts become errors only at invocation. */
export type MethodSelection = {kind: 'selected'; method: Method} |
  {kind: 'missing' | 'conflict'; candidates: Method[]};

/** Distinguishes unsupported class versions from malformed class structures. */
export class ClassFileVersionError extends Error {
  constructor(message: string) {
    super(message);
    // Release CLI builds still downlevel classes to ES5; Error returns a fresh
    // object, so restore the subclass prototype for reliable typed dispatch.
    Object.setPrototypeOf(this, ClassFileVersionError.prototype);
    this.name = 'ClassFileVersionError';
  }
}

import global from './global';

declare var RELEASE: boolean;
if (typeof RELEASE === 'undefined') global.RELEASE = false;

/**
 * Auto-incrementing reference number. Uniquely identifies each object allocated
 * by the JVM. Started at 1 because we use 0 to identify NULL.
 */
var ref: number = 1;
function getRef() {
  return ref++;
}

/**
 * Defines special JVM-injected fields. The map stores the TypeScript type of
 * the field and the default value for the field, which will be assigned in the
 * JavaScript constructor for the class.
 */
var injectedFields: {[className: string]: {[fieldName: string]: [string, string]}} = {
  'Ljava/lang/invoke/MemberName;': {
    vmtarget: ["(thread: JVMThread, descriptor: string, args: any[], cb?: (e?: JVMTypes.java_lang_Throwable, rv?: any) => void) => void", "null"],
    vmindex: ["number", "-1"]
  },
  'Ljava/lang/Object;': {
    'ref': ["number", "getRef()"],
    '$monitor': ["Monitor", "null"]
  },
  'Ljava/net/PlainSocketImpl;': {
    '$is_shutdown': ['boolean', 'false'],
    '$ws': ['Interfaces.IWebsock', 'null']
  },
  'Ljava/lang/Class;': {
    '$cls': ['ClassData', 'null'],
    'signers': ['JVMTypes.java_lang_Object[]', 'null']
  },
  'Ljava/lang/ClassLoader;': {
    '$loader': ['ClassLoader', 'new CustomClassLoader(thread.getBsCl(), this);']
  },
  'Ljava/lang/Thread;': {
    // Note: Need to handle initial case when thread is NULL.
    '$thread': ['JVMThread', 'thread ? new thread.constructor(thread.getJVM(), thread.getThreadPool(), this) : null']
  }
};

/**
 * Defines special JVM-injected method. The map stores the TypeScript type
 * signature of the method and the JavaScript body of the method, keyed on the
 * method's name. These are all instance methods (e.g. non-static).
 */
var injectedMethods: {[className: string]: {[methodName: string]: string[]}} = {
  'Ljava/lang/Object;': {
    'getClass': ["(): ClassData", `function() { return this.constructor.cls }`],
    'getMonitor': ["(): Monitor", `function() {
  if (this.$monitor === null) {
    this.$monitor = new Monitor();
  }
  return this.$monitor;
}`]
  },
  'Ljava/lang/String;': {
    'toString': ["(): string", `function() { return util.chars2jsStr(this['java/lang/String/value']); }`]
  },
  'Ljava/lang/Byte;': {
    'unbox': ["(): number", `function() { return this['java/lang/Byte/value']; }`]
  },
  'Ljava/lang/Character;': {
    'unbox': ["(): number", `function() { return this['java/lang/Character/value']; }`]
  },
  'Ljava/lang/Double;': {
    'unbox': ["(): number", `function() { return this['java/lang/Double/value']; }`]
  },
  'Ljava/lang/Float;': {
    'unbox': ["(): number", `function() { return this['java/lang/Float/value']; }`]
  },
  'Ljava/lang/Integer;': {
    'unbox': ["(): number", `function() { return this['java/lang/Integer/value']; }`]
  },
  'Ljava/lang/Long;': {
    'unbox': ["(): Long", `function() { return this['java/lang/Long/value']; }`]
  },
  'Ljava/lang/Short;': {
    'unbox': ["(): number", `function() { return this['java/lang/Short/value']; }`]
  },
  'Ljava/lang/Boolean;': {
    'unbox': ["(): number", `function() { return this['java/lang/Boolean/value']; }`]
  },
  // To catch any errors. Should never actually happen; Voids don't show up in arg lists.
  'Ljava/lang/Void;': {
    'unbox': ["(): number", `function() { throw new Error("Cannot unbox a Void type."); }`]
  },
  'Ljava/lang/invoke/MethodType;': {
    'toString': ["(): string", `function() { return "(" + this['java/lang/invoke/MethodType/ptypes'].array.map(function (type) { return type.$cls.getInternalName(); }).join("") + ")" + this['java/lang/invoke/MethodType/rtype'].$cls.getInternalName(); }`]
  }
};

function makeSyntheticClassLoaderResourcesMethod(cls: ReferenceClassData<JVMTypes.java_lang_Object>, slot: number): Method {
  var signature = 'resources(Ljava/lang/String;)Ljava/util/stream/Stream;',
    fullSignature = `${descriptor2typestr(cls.getInternalName())}/${signature}`,
    method: any = {
      cls: cls,
      slot: slot,
      accessFlags: new Flags(util.FlagMasks.PUBLIC | util.FlagMasks.NATIVE),
      name: 'resources',
      rawDescriptor: '(Ljava/lang/String;)Ljava/util/stream/Stream;',
      attrs: [],
      signature: signature,
      fullSignature: fullSignature,
      parameterTypes: ['Ljava/lang/String;'],
      returnType: 'Ljava/util/stream/Stream;',
      isStatic: false,
      isSynchronized: false,
      isNative: true,
      hasWideParameters: false,
      isSignaturePolymorphicMethod: false,
      getParamWordSize: function(): number {
        return 1;
      },
      convertArgs: function(thread: JVMThread, params: any[]): any[] {
        return [thread, params[0], params[1]];
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
      isDefault: function(): boolean {
        return false;
      },
      getFullSignature: function(): string {
        return fullSignature;
      },
      getAttribute: function(): IAttribute {
        return null;
      },
      getAnnotationType: function(): JVMTypes.JVMArray<number> {
        return null;
      },
      methodLock: function(thread: JVMThread, frame: BytecodeStackFrame): Monitor {
        return frame.locals[0].getMonitor();
      },
      outputJavaScriptFunction: function(jsConsName: string, outStream: StringOutputStream, nonVirtualOnly: boolean = false, methodExpression?: string): void {
        var methodExpr = methodExpression || `cls.getSpecificMethod("Ljava/lang/ClassLoader;", "${signature}")`;
        if (!nonVirtualOnly) {
          outStream.write(`${jsConsName}.prototype["${signature}"] = `);
        }
        outStream.write(`${jsConsName}.prototype["${fullSignature}"] = `);
        outStream.write(`(function(method) {
  return function(thread, args, cb) {
    if (typeof cb === 'function') {
      thread.stack.push(new InternalStackFrame(cb));
    }
    thread.stack.push(new NativeStackFrame(method, [this, args[0]]));
    if (thread.status !== ${ThreadStatus.RUNNABLE}) {
      thread.setStatus(${ThreadStatus.RUNNABLE});
    }
  };
})(${methodExpr});\n`);
      },
      reflector: function(thread: JVMThread, cb: (reflectedMethod: JVMTypes.java_lang_reflect_Method) => void): void {
        var bsCl = thread.getBsCl();
        cls.getLoader().resolveClasses(thread, ['Ljava/lang/String;', 'Ljava/util/stream/Stream;'], (classes: {[className: string]: ClassData}) => {
          if (classes === null) {
            return cb(null);
          }
          thread.getBsCl().resolveClasses(thread, ['Ljava/lang/reflect/Method;'], (reflectClasses: {[className: string]: ClassData}) => {
            if (reflectClasses === null) {
              return cb(null);
            }
            var methodCons = (<ReferenceClassData<JVMTypes.java_lang_reflect_Method>> reflectClasses['Ljava/lang/reflect/Method;']).getConstructor(thread),
              clazzArray = (<ArrayClassData<JVMTypes.java_lang_Class>> bsCl.getInitializedClass(thread, '[Ljava/lang/Class;')).getConstructor(thread),
              methodObj = new methodCons(thread),
              parameterTypes = new clazzArray(thread, 0),
              exceptionTypes = new clazzArray(thread, 0);
            parameterTypes.array = [classes['Ljava/lang/String;'].getClassObject(thread)];
            methodObj['java/lang/reflect/Method/clazz'] = cls.getClassObject(thread);
            methodObj['java/lang/reflect/Method/name'] = thread.getJVM().internString('resources');
            methodObj['java/lang/reflect/Method/parameterTypes'] = parameterTypes;
            methodObj['java/lang/reflect/Method/returnType'] = classes['Ljava/util/stream/Stream;'].getClassObject(thread);
            methodObj['java/lang/reflect/Method/exceptionTypes'] = exceptionTypes;
            methodObj['java/lang/reflect/Method/modifiers'] = method.accessFlags.getRawByte();
            methodObj['java/lang/reflect/Method/slot'] = slot;
            methodObj['java/lang/reflect/Method/signature'] = null;
            methodObj['java/lang/reflect/Method/annotations'] = null;
            methodObj['java/lang/reflect/Method/annotationDefault'] = null;
            methodObj['java/lang/reflect/Method/parameterAnnotations'] = null;
            cb(methodObj);
          });
        });
      }
    };
  return <Method> method;
}

/**
 * Same as injected methods, but these are static.
 */
var injectedStaticMethods: {[className: string]: {[methodName: string]: [string, string]}} = {
  'Ljava/lang/Byte;': {
    'box': ["(val: number): java_lang_Byte", `function(val) { var rv = new this(null); rv['java/lang/Byte/value'] = val; return rv; }`]
  },
  'Ljava/lang/Character;': {
    'box': ["(val: number): java_lang_Character", `function(val) { var rv = new this(null); rv['java/lang/Character/value'] = val; return rv; }`]
  },
  'Ljava/lang/Double;': {
    'box': ["(val: number): java_lang_Double", `function(val) { var rv = new this(null); rv['java/lang/Double/value'] = val; return rv; }`]
  },
  'Ljava/lang/Float;': {
    'box': ["(val: number): java_lang_Float", `function(val) { var rv = new this(null); rv['java/lang/Float/value'] = val; return rv; }`]
  },
  'Ljava/lang/Integer;': {
    'box': ["(val: number): java_lang_Integer", `function(val) { var rv = new this(null); rv['java/lang/Integer/value'] = val; return rv; }`]
  },
  'Ljava/lang/Long;': {
    'box': ["(val: Long): java_lang_Long", `function(val) { var rv = new this(null); rv['java/lang/Long/value'] = val; return rv; }`]
  },
  'Ljava/lang/Short;': {
    'box': ["(val: number): java_lang_Short", `function(val) { var rv = new this(null); rv['java/lang/Short/value'] = val; return rv; }`]
  },
  'Ljava/lang/Boolean;': {
    'box': ["(val: number): java_lang_Boolean", `function(val) { var rv = new this(null); rv['java/lang/Boolean/value'] = val; return rv; }`]
  },
  'Ljava/lang/Void;': {
    'box': ["(): java_lang_Void", `function() { return new this(null); }`]
  }
};

export interface IJVMConstructor<T extends JVMTypes.java_lang_Object> {
  /**
   * Constructs a new object in the same manner as the JVM's "new" opcode.
   * Does *NOT* run the JVM constructor!
   * @param jvm The thread that is constructing the object.
   * @param lengths... If this is an array type, the length of each dimension of the array. (Required if an array type.)
   */
  new(thread: JVMThread, lengths?: number[] | number): T;
}

/**
 * Extends a JVM class by making its prototype a blank instantiation of an
 * object with the super class's prototype as its prototype. Inspired from
 * TypeScript's __extend function.
 */
function extendClass(cls: any, superCls: any) {
  function __() { this.constructor = cls; }
  __.prototype = superCls.prototype;
  cls.prototype = new (<any> __)();
}

/**
 * Represents a single class in the JVM.
 */
export abstract class ClassData {
  protected loader: ClassLoader;
  public accessFlags: Flags = null;
  /**
   * We make this private to *enforce* call sites to use our getter functions.
   * A state query must not complete initialization: even a class without a
   * static initializer may still be waiting for a superinterface initializer.
   */
  private state: ClassState = ClassState.LOADED;
  private jco: JVMTypes.java_lang_Class = null;
  /**
   * The class's canonical name, in internal form.
   * Ljava/lang/Foo;
   */
  protected className: string;
  private jsClassName: string = null;
  protected superClass: ReferenceClassData<JVMTypes.java_lang_Object> = null;

  /**
   * Responsible for setting up all of the fields that are guaranteed to be
   * present on any ClassData object.
   */
  constructor(loader: ClassLoader) {
    this.loader = loader;
  }

  /**
   * Get the external form of this class's name (e.g. java.lang.String).
   */
  public getExternalName(): string {
    return ext_classname(this.className);
  }

  /**
   * Get the internal form of this class's name (e.g. Ljava/lang/String;).
   */
  public getInternalName(): string {
    return this.className;
  }

  protected getJSClassName(): string {
    if (this.jsClassName === null) {
      this.jsClassName = jvmName2JSName(this.className);
    }
    return this.jsClassName;
  }

  /**
   * Get the name of the package that this class belongs to (e.g. java.lang).
   */
  public getPackageName(): string {
    var extName = this.getExternalName(), i: number;
    // Find the index of the last '.' in the name.
    for (i = extName.length - 1; i >= 0 && extName[i] !== '.'; i--) {}
    if (i >= 0) {
      return extName.slice(0, i);
    } else {
      return "";
    }
  }

  /**
   * Returns the ClassLoader object of the classloader that initialized this
   * class. Returns null for the default classloader.
   */
  public getLoader(): ClassLoader {
    return this.loader;
  }

  /**
   * Get the class's super class, which is always going to be a reference
   * class.
   */
  public getSuperClass(): ReferenceClassData<JVMTypes.java_lang_Object> {
    return this.superClass;
  }

  /**
   * Get all of the interfaces that the class implements.
   */
  public getInterfaces(): ReferenceClassData<JVMTypes.java_lang_Object>[] {
    return [];
  }

  /**
   * Get all of the injected fields for this class. The value for each field
   * in the returned map is its type.
   */
  public getInjectedFields(): { [fieldName: string]: string } {
    var rv: { [fieldName: string]: string } = {};
    if (injectedFields[this.getInternalName()] !== undefined) {
      var fields = injectedFields[this.getInternalName()];
      Object.keys(fields).forEach((fieldName: string) => {
        rv[fieldName] = fields[fieldName][0];
      });
    }
    return rv;
  }

  /**
   * Get all of the injected methods for this class. The value for each method
   * in the returned map is its type.
   */
  public getInjectedMethods(): { [methodName: string]: string } {
    var rv: { [methodName: string]: string } = {},
      lookupName = this.getInternalName();
    // All array classes share the same injected methods.
    if (lookupName[0] === '[') {
      lookupName = '[';
    }

    if (injectedMethods[lookupName] !== undefined) {
      var methods = injectedMethods[lookupName];
      Object.keys(methods).forEach((methodName: string) => {
        rv[methodName] = methods[methodName][0];
      });
    }
    return rv;
  }

  /**
   * Get all of the injected static methods for this class. The value for each
   * method in the returned map is its type.
   */
  public getInjectedStaticMethods(): { [methodName: string]: string } {
    var rv: { [methodName: string]: string } = {},
      lookupName = this.getInternalName();
    // All array classes share the same injected methods.
    if (lookupName[0] === '[') {
      lookupName = '[';
    }

    if (injectedStaticMethods[lookupName] !== undefined) {
      var methods = injectedStaticMethods[lookupName];
      Object.keys(methods).forEach((methodName: string) => {
        rv[methodName] = methods[methodName][0];
      });
    }
    return rv;
  }

  /**
   * Get a java.lang.Class object corresponding to this class.
   */
  public getClassObject(thread: JVMThread): JVMTypes.java_lang_Class {
    if (this.jco === null) {
      this.jco = new ((<ReferenceClassData<JVMTypes.java_lang_Class>> thread.getBsCl().getResolvedClass('Ljava/lang/Class;')).getConstructor(thread))(thread);
      this.jco.$cls = this;
      this.jco['java/lang/Class/classLoader'] = this.getLoader().getLoaderObject();
    }
    return this.jco;
  }

  /**
   * Get the protection domain of this class.
   * This value is NULL for all but reference classes loaded by app classloaders.
   */
  public getProtectionDomain(): JVMTypes.java_security_ProtectionDomain {
    return null;
  }

  /**
   * Retrieves the method defined in this particular class by the given method
   * signature *without* invoking method lookup.
   * @param methodSignature The method's full signature, e.g. <clinit>()V
   */
  public getMethod(methodSignature: string): Method {
    return null;
  }

  /**
   * Retrieve all of the methods defined on this class.
   */
  public getMethods(): Method[] {
    return [];
  }

  /**
   * Retrieve the set of fields defined on this class.
   */
  public getFields(): Field[] {
    return [];
  }

  /**
   * Attempt to synchronously resolve this class using its loader. Should only
   * be called on ClassData in the LOADED state.
   */
  public abstract tryToResolve(): boolean;

  /**
   * Attempt to synchronously initialize this class.
   */
  public abstract tryToInitialize(): boolean;

  /**
   * Set the state of this particular class.
   */
  public setState(state: ClassState): void {
    this.state = state;
  }

  /**
   * Gets the current state of this class.
   */
  protected getState(): ClassState {
    return this.state;
  }

  /**
   * Check if the class is initialized.
   * @param thread The thread that is performing the check. If initialization
   *   is in progress on that thread, then the class is, for all intents and
   *   purposes, initialized.
   */
  public isInitialized(thread: JVMThread): boolean {
    return this.getState() === ClassState.INITIALIZED;
  }
  // Convenience function.
  public isResolved(): boolean { return this.getState() !== ClassState.LOADED; }

  public isSubinterface(target: ClassData): boolean {
    return false;
  }

  public isSubclass(target: ClassData): boolean {
    if (this === target) {
      return true;
    }
    if (this.getSuperClass() === null) {
      return false;
    }
    return this.getSuperClass().isSubclass(target);
  }

  public abstract isCastable(target: ClassData): boolean;

  public resolve(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    throw new Error("Unimplemented.");
  }

  public initialize(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    throw new Error("Unimplemented.");
  }

  protected outputInjectedMethods(jsClassName: string, outputStream: StringOutputStream) {
    var lookupName = this.getInternalName();
    if (lookupName[0] === '[') {
      lookupName = '[';
    }
    if (injectedMethods[lookupName] !== undefined) {
      var methods = injectedMethods[lookupName];
      Object.keys(methods).forEach((methodName: string) => {
        outputStream.write(`  ${jsClassName}.prototype.${methodName} = ${methods[methodName][1]};\n`);
      });
    }

    if (injectedStaticMethods[lookupName] !== undefined) {
      var staticMethods = injectedStaticMethods[lookupName];
      Object.keys(staticMethods).forEach((methodName: string) => {
        outputStream.write(`  ${jsClassName}.${methodName} = ${staticMethods[methodName][1]};\n`);
      });
    }
  }
}

export class PrimitiveClassData extends ClassData {
  constructor(className: string, loader: ClassLoader) {
    super(loader);
    this.className = className;
    // PrimitiveClassData objects are ABSTRACT, FINAL, and PUBLIC.
    this.accessFlags = new Flags(0x411);
    this.setState(ClassState.INITIALIZED);
  }

  /**
   * Returns a boolean indicating if this class is an instance of the target class.
   * "target" is a ClassData object.
   * The ClassData objects do not need to be initialized; just loaded.
   */
  public isCastable(target: ClassData): boolean {
    return this.className === target.getInternalName();
  }

  /**
   * Returns the internal class name for the corresponding boxed type.
   */
  public boxClassName(): string {
    return boxClassName(this.className);
  }

  /**
   * Returns a boxed version of the given primitive.
   */
  public createWrapperObject(thread: JVMThread, value: any): JVMTypes.java_lang_Object {
    var boxName = this.boxClassName();
    var boxCls = <ReferenceClassData<JVMTypes.java_lang_Object>> thread.getBsCl().getInitializedClass(thread, boxName);
    // these are all initialized in preinit (for the BSCL, at least)
    var boxCons = boxCls.getConstructor(thread);
    var wrapped = new boxCons(thread);
    if (boxName !== 'V') {
      // XXX: all primitive wrappers store their value in a private static final field named 'value'
      (<any> wrapped)[descriptor2typestr(boxName) + '/value'] = value;
      assert(typeof value === "number" || typeof value === "boolean" || typeof value.low_ === "number", `Invalid primitive value: ${value}`);
    }
    return wrapped;
  }

  public tryToResolve(): boolean {
    return true;
  }

  public tryToInitialize(): boolean {
    return true;
  }

  /**
   * Primitive classes are already resolved.
   */
  public resolve(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    setImmediate(() => cb(this));
  }
}

export class ArrayClassData<T> extends ClassData {
  private componentClassName: string;
  private componentClass: ClassData;
  private _constructor: IJVMConstructor<JVMTypes.JVMArray<T>> = null;
  private jsArrayConstructor: string = null;

  constructor(componentType: string, loader: ClassLoader) {
    super(loader);
    this.className = `[${componentType}`;
    // ArrayClassData objects are ABSTRACT, FINAL, and PUBLIC.
    this.accessFlags = new Flags(0x411);
    this.componentClassName = componentType;
  }

  /**
   * Looks up a method with the given signature. Returns null if no method
   * found.
   */
  public methodLookup(signature: string): Method {
    return this.superClass.methodLookup(signature);
  }

  public fieldLookup(name: string, descriptor?: string): Field {
    return this.superClass.fieldLookup(name, descriptor);
  }

  /** Array metadata does not verify or initialize its component class. */
  public resolve(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    if (this.isResolved()) {
      // Short circuit.
      setImmediate(() => cb(this));
      return;
    }
    this.loader.bootstrap.loadClass(thread, 'Ljava/lang/Object;', superclass => {
      if (superclass === null) { cb(null); return; }
      this.loader.loadClass(thread, this.componentClassName, component => {
        if (component === null) { cb(null); return; }
        var complete = (metadata: ClassData) => {
          if (metadata === null) { cb(null); return; }
          this.setResolved(<ReferenceClassData<JVMTypes.java_lang_Object>> superclass, metadata);
          cb(this);
        };
        // Each rank needs its own component pointer, but an element's Code and
        // initializer are irrelevant to creation of an array of that element.
        if (component instanceof ArrayClassData) component.resolve(thread, complete, explicit);
        else complete(component);
      }, explicit);
    }, explicit);
  }

  public getComponentClass(): ClassData {
    return this.componentClass;
  }

  /**
   * Resolved and initialized are the same for array types.
   */
  public setResolved<T extends JVMTypes.java_lang_Object>(super_class_cdata: ReferenceClassData<T>, component_class_cdata: ClassData): void {
    this.superClass = super_class_cdata;
    this.componentClass = component_class_cdata;
    this.setState(ClassState.INITIALIZED);
  }

  public tryToResolve(): boolean {
    var loader = this.loader,
      superClassCdata = <ReferenceClassData<JVMTypes.java_lang_Object>> loader.bootstrap.getLoadedClass("Ljava/lang/Object;"),
      componentClassCdata = loader.getLoadedClass(this.componentClassName);

    if (superClassCdata === null || componentClassCdata === null ||
        componentClassCdata instanceof ArrayClassData && !componentClassCdata.tryToResolve()) {
      return false;
    } else {
      this.setResolved(superClassCdata, componentClassCdata);
      return true;
    }
  }

  public tryToInitialize(): boolean {
    // Arrays are initialized once resolved.
    return this.tryToResolve();
  }

  /**
   * Returns a boolean indicating if this class is an instance of the target class.
   * "target" is a ClassData object.
   * The ClassData objects do not need to be initialized; just loaded.
   * See §2.6.7 for casting rules.
   */
  public isCastable(target: ClassData): boolean {
    if (!(target instanceof ArrayClassData)) {
      if (target instanceof PrimitiveClassData) {
        return false;
      }
      // Must be a reference type.
      if (target.accessFlags.isInterface()) {
        // Interface reference type
        var type = target.getInternalName();
        return (type === 'Ljava/lang/Cloneable;' || type === 'Ljava/io/Serializable;') &&
          target === this.loader.bootstrap.getLoadedClass(type);
      }
      // Non-interface reference type
      return target === this.loader.bootstrap.getLoadedClass('Ljava/lang/Object;');
    }
    // We are both array types, so it only matters if my component type can be
    // cast to its component type.
    return this.getComponentClass().isCastable((<ArrayClassData<any>> target).getComponentClass());
  }

  public initialize(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    this.resolve(thread, cb, explicit);
  }

  /**
   * Get the array constructor for this particular JVM array class.
   * Uses typed arrays when available for primitive arrays.
   */
  private getJSArrayConstructor(): string {
    if (this.jsArrayConstructor !== null) {
      return this.jsArrayConstructor;
    }

    if (!typedArraysSupported) {
      this.jsArrayConstructor = 'Array';
      return this.jsArrayConstructor;
    }
    switch (this.componentClassName) {
      case 'B':
        this.jsArrayConstructor = 'Int8Array';
        break;
      case 'C':
        this.jsArrayConstructor = 'Uint16Array';
        break;
      case 'S':
        this.jsArrayConstructor = 'Int16Array';
        break;
      case 'I':
        this.jsArrayConstructor = 'Int32Array';
        break;
      case 'F':
        this.jsArrayConstructor = 'Float32Array';
        break;
      case 'D':
        this.jsArrayConstructor = 'Float64Array';
        break;
      default:
        this.jsArrayConstructor = 'Array';
        break;
    }
    return this.jsArrayConstructor;
  }

  /**
   * Get the initial value placed into each array element.
   */
  private getJSDefaultArrayElement(): string {
    switch(this.componentClassName[0]) {
      case '[':
        return `new (cls.getComponentClass().getConstructor())(thread, otherLengths)`;
      case 'L':
        return "null";
      case 'J':
        return "gLongZero";
      default:
        return "0";
    }
  }

  /**
   * Creates a specialized `slice` method that creates a shallow slice of this
   * array. Specialized to the type of array (JS or Typed).
   */
  private _getSliceMethod(): string {
    var output = new StringOutputStream(),
      jsArrCons = this.getJSArrayConstructor();
    output.write(`function(start, end) {
    var newObj = new this.constructor(null, 0);\n`);
    if (jsArrCons === 'Array') {
      output.write(`    newObj.array = this.array.slice(start, end);\n`);
    } else {
      var elementSize: number;
      switch (jsArrCons) {
        case 'Int8Array':
          elementSize = 1;
          break;
        case 'Int16Array':
        case 'Uint16Array':
          elementSize = 2;
          break;
        case 'Int32Array':
        case 'Float32Array':
          elementSize = 4;
          break;
        case 'Float64Array':
          elementSize = 8;
          break;
        default:
          assert(false, "Illegal array type returned??");
      }
      // Although ArrayBuffer.slice has an optional end argument, we need to
      // multiply it if it does exist.
      output.write(`    if (end === undefined) end = this.array.length;
      ${elementSize > 1 ? `start *= ${elementSize};\nend *= ${elementSize};` : ''}
      newObj.array = new ${jsArrCons}(this.array.buffer.slice(start, end));\n`);
    }
    output.write(`    return newObj;
  }`);
    return output.flush();
  }

  private _constructConstructor(thread: JVMThread): IJVMConstructor<JVMTypes.JVMArray<T>> {
    assert(this._constructor === null, `Tried to construct constructor twice for ${this.getExternalName()}!`);
    var outputStream = new StringOutputStream(),
      jsClassName = this.getJSClassName(),
      jsArrCons = this.getJSArrayConstructor(),
      defaultElement = this.getJSDefaultArrayElement();
    // Arguments: extendClass, cls, superCls, gLongZero, thread
    outputStream.write(`extendClass(${jsClassName}, superCls.getConstructor(thread));
  function ${jsClassName}(thread, lengths) {\n`);
    this.superClass.outputInjectedFields(outputStream);
    // Initialize array.
    if (this.componentClassName[0] !== '[') {
      // Array elements are a non-array type.
      outputStream.write(`    this.array = new ${jsArrCons}(lengths);\n`)
      if (jsArrCons === 'Array') {
        // TypedArrays are already initialized to 0, so this check skips array
        // initialization in that case.
        outputStream.write(`    for (var i = 0; i < lengths; i++) {
      this.array[i] = ${defaultElement};
    }\n`)
      }
    } else {
      // Multi-dimensional array.
      outputStream.write(`    if (typeof lengths === 'number') {
        this.array = new ${jsArrCons}(lengths);
        for (var i = 0; i < lengths; i++) {
          this.array[i] = null;
        }
      } else {
        var length = lengths[0], otherLengths = lengths.length > 2 ? lengths.slice(1) : lengths[1];
        this.array = new ${jsArrCons}(length);
        for (var i = 0; i < length; i++) {
          this.array[i] = ${defaultElement};
        }
      }\n`)
    }
    outputStream.write(`  }

  ${jsClassName}.prototype.slice = ${this._getSliceMethod()};
  ${jsClassName}.cls = cls;\n`);
    this.outputInjectedMethods(jsClassName, outputStream);
    outputStream.write(`
  return ${jsClassName};`);
    // All arrays extend java/lang/Object
    // function _create(extendClass, cls, superCls, gLongZero, thread) {
    const fcn = new Function("extendClass", "cls", "superCls", "gLongZero", "thread", "getRef", "util", outputStream.flush());
    return fcn(extendClass, this, this.superClass, gLong.ZERO, thread, getRef, util);
  }

  public getConstructor(thread: JVMThread): IJVMConstructor<JVMTypes.JVMArray<T>> {
    assert(this.isResolved(), `Tried to get constructor for class ${this.getInternalName()} before it was resolved.`);
    if (this._constructor === null) {
      this._constructor = this._constructConstructor(thread);
    }
    return this._constructor;
  }
}

/**
 * Represents a "reference" Class -- that is, a class that neither represents a
 * primitive nor an array.
 */
export class ReferenceClassData<T extends JVMTypes.java_lang_Object> extends ClassData {
  private verification: ClassVerification = new ClassVerification(this);
  private preparation: ClassPreparation = new ClassPreparation(this);
  private minorVersion: number;
  public majorVersion: number;
  public constantPool: ConstantPool;
  /**
   * All of the fields directly defined by this class.
   */
  private fields: Field[];
  /**
   * All of the methods directly defined by this class.
   */
  private methods: Method[];
  private attrs: IAttribute[];
  private interfaceClasses: ReferenceClassData<JVMTypes.java_lang_Object>[] = null;
  private superClassRef: ClassReference = null;
  private interfaceRefs: ClassReference[];
  /**
   * Initialization lock.
   */
  private initLock: ClassLock = new ClassLock();
  /**
   * Stores the JavaScript constructor for this class.
   */
  private _constructor: IJVMConstructor<T> = null;
  /**
   * Virtual field table
   */
  private _fieldLookup: { [name: string]: Field } = {};
  /**
   * All fields in object instantiations. Fields from super classes are in front
   * of fields from this class. A field's offset in the array is its *vmindex*.
   */
  protected _objectFields: Field[] = [];
  /**
   * All static fields in this particular class. The field's offset in this
   * array is its *vmindex*.
   */
  protected _staticFields: Field[] = [];
  /** Explicit VM overlays are not class-file declarations or reflection slots. */
  private vmMethods: { [signature: string]: Method } = Object.create(null);
  /** Stable slots are anchored to declarations, not ambiguous signatures. */
  private vmOrigins: Method[] = [];
  /**
   * The ProtectionDomain for this class, specified by the application class
   * loader. NULL for bootstrap classloaded items.
   */
  protected _protectionDomain: JVMTypes.java_security_ProtectionDomain;

  constructor(buffer: Buffer, protectionDomain?: JVMTypes.java_security_ProtectionDomain, loader?: ClassLoader, cpPatches?: JVMTypes.JVMArray<JVMTypes.java_lang_Object>) {
    super(loader);
    this._protectionDomain = protectionDomain ? protectionDomain : null;
    var byteStream = new ByteStream(buffer),
      i: number = 0;
    if ((byteStream.getUint32()) !== 0xCAFEBABE) {
      throw new Error("Magic number invalid");
    }
    this.minorVersion = byteStream.getUint16();
    this.majorVersion = byteStream.getUint16();
    if (!(MIN_SUPPORTED_CLASSFILE_MAJOR <= this.majorVersion && this.majorVersion <= MAX_SUPPORTED_CLASSFILE_MAJOR)) {
      throw new ClassFileVersionError("Major version invalid: " + this.majorVersion +
        " (supported range: " + MIN_SUPPORTED_CLASSFILE_MAJOR + "-" + MAX_SUPPORTED_CLASSFILE_MAJOR + ")");
    }
    // JVMS 4.1 permits arbitrary minors only for historical majors 45-55.
    // No preview execution mode exists in this final-feature runtime profile.
    if (this.majorVersion >= 56 && this.minorVersion !== 0) {
      throw new ClassFileVersionError(this.minorVersion === 65535 ?
        "Preview class files are not supported: " + this.majorVersion + ".65535" :
        "Minor version invalid: " + this.majorVersion + "." + this.minorVersion);
    }
    this.constantPool = new ConstantPool();
    this.constantPool.parse(byteStream, cpPatches, this.majorVersion);
    // bitmask for {public,final,super,interface,abstract} class modifier
    this.accessFlags = new Flags(byteStream.getUint16());
    // Native JVMs supply ACC_ABSTRACT for pre-Java-6 interfaces.
    if (this.majorVersion < 50 && this.accessFlags.isInterface()) {
      this.accessFlags = new Flags(this.accessFlags.getRawByte() | 0x0400);
    }
    var classFlags = this.accessFlags.getRawByte(), isModule = this.majorVersion >= 53 && (classFlags & 0x8000) !== 0;
    if (isModule ? classFlags !== 0x8000 :
        this.accessFlags.isInterface() ? !this.accessFlags.isAbstract() || (classFlags & (this.majorVersion >= 49 ? 0x4030 : 0x0010)) !== 0 :
        this.majorVersion >= 49 && (classFlags & 0x2000) !== 0 || this.accessFlags.isFinal() && this.accessFlags.isAbstract()) {
      throw new Error('Invalid class access flags');
    }
    this.className = this.constantPool.getTyped<ClassReference>(byteStream.getUint16(), ConstantPoolItemType.CLASS).name;
    if (this.className[0] !== 'L') throw new Error('this_class cannot be an array');
    validateBinaryClassName(this.className.slice(1, -1));
    // super reference is 0 when there's no super (basically just java.lang.Object)
    var superRef = byteStream.getUint16();
    if (superRef !== 0) {
      this.superClassRef = this.constantPool.getTyped<ClassReference>(superRef, ConstantPoolItemType.CLASS);
      if (this.superClassRef.name[0] !== 'L') throw new Error('super_class cannot be an array');
    }
    if (!isModule && ((this.className === 'Ljava/lang/Object;') !== (superRef === 0) ||
        this.accessFlags.isInterface() && this.superClassRef.name !== 'Ljava/lang/Object;')) {
      throw new Error('Invalid superclass in class header');
    }
    // direct interfaces of this class
    var isize = byteStream.getUint16();
    this.interfaceRefs = new Array<ClassReference>(isize);
    var interfaceNames: {[name: string]: boolean} = Object.create(null);
    for (i = 0; i < isize; ++i) {
      var interfaceRef = this.constantPool.getTyped<ClassReference>(byteStream.getUint16(), ConstantPoolItemType.CLASS);
      if (interfaceRef.name[0] !== 'L' || interfaceNames[interfaceRef.name]) throw new Error('Invalid or duplicate direct interface');
      interfaceNames[interfaceRef.name] = true;
      this.interfaceRefs[i] = interfaceRef;
    }
    // fields of this class
    var numFields = byteStream.getUint16();
    this.fields = new Array<Field>(numFields);
    var fieldNames: {[name: string]: boolean} = Object.create(null);
    for (i = 0; i < numFields; ++i) {
      var field = new Field(this, this.constantPool, i, byteStream), fieldKey = JSON.stringify([field.name, field.rawDescriptor]);
      if (fieldNames[fieldKey]) throw new Error('Duplicate field: ' + field.name);
      fieldNames[fieldKey] = true;
      this.fields[i] = field;
    }
    // class methods
    var numMethods = byteStream.getUint16();
    this.methods = new Array<Method>(numMethods);
    var methodNames: {[name: string]: boolean} = Object.create(null);
    for (i = 0; i < numMethods; i++) {
      var m = new Method(this, this.constantPool, i, byteStream);
      if (methodNames[m.signature]) throw new Error('Duplicate method: ' + m.signature);
      methodNames[m.signature] = true;
      this.methods[i] = m;
    }
    if (this.className === 'Ljava/lang/ClassLoader;' &&
        this.methods.every((m: Method) => m.signature !== 'resources(Ljava/lang/String;)Ljava/util/stream/Stream;')) {
      this.methods.push(makeSyntheticClassLoaderResourcesMethod(this, this.methods.length));
    }
    // class attributes
    this.attrs = makeAttributes(byteStream, this.constantPool, 'class', this.majorVersion);
    if (isModule && (this.className !== 'Lmodule-info;' || superRef !== 0 || isize !== 0 || numFields !== 0 || numMethods !== 0)) {
      throw new Error('Invalid module-info class structure');
    }
    var bootstrapAttribute = <BootstrapMethods> this.getAttribute('BootstrapMethods');
    this.constantPool.each((index: number, item: IConstantPoolItem) => {
      if (item.getType() === ConstantPoolItemType.CLASS) (<ClassReference> item).setOwner(this);
      if (!isModule && (item.getType() === ConstantPoolItemType.MODULE || item.getType() === ConstantPoolItemType.PACKAGE)) {
        throw new Error('Module/package constant in a non-module class');
      }
      if ((item.getType() === ConstantPoolItemType.DYNAMIC || item.getType() === ConstantPoolItemType.INVOKE_DYNAMIC) &&
          (bootstrapAttribute === null || (<DynamicConstant | InvokeDynamic> item).bootstrapMethodAttrIndex >= bootstrapAttribute.bootstrapMethods.length)) {
        throw new Error('Invalid bootstrap method attribute index');
      }
    });
    if (byteStream.hasBytes()) {
      throw `Leftover bytes in classfile: ${byteStream}`;
    }
  }

  public getSuperClassReference(): ClassReference {
    return this.superClassRef;
  }

  public getInterfaceClassReferences(): ClassReference[] {
    return this.interfaceRefs.slice(0);
  }

  /**
   * Retrieve the set of interfaces that this class implements.
   * DO NOT MUTATE!
   */
  public getInterfaces(): ReferenceClassData<JVMTypes.java_lang_Object>[] {
    return this.interfaceClasses;
  }

  /**
   * The set of fields that this class has.
   * DO NOT MUTATE!
   */
  public getFields(): Field[] {
    return this.fields;
  }

  /**
   * Get the Virtual Method table for this class.
   */
  public getVMTable(): Method[] {
    return this.vmOrigins.map(origin => {
      var selected = this.selectMethod(origin);
      return selected.kind === 'selected' ? selected.method : null;
    });
  }

  /**
   * Returns the VM index for the given method. Returns -1 if not present in the
   * instance method table (e.g. is static or a constructor). Private methods
   * retain exact declaration indices for MemberName's dispatch metadata; they
   * never become override candidates in selectMethod.
   */
  public getVMIndexForMethod(m: Method): number {
    if (m.accessFlags.isStatic() || m.name[0] === '<') return -1;
    var index = this.vmOrigins.indexOf(m);
    if (index === -1 && (this.isSubclass(m.cls) || this.isSubinterface(m.cls))) {
      // VM overlays can be registered after this receiver's hierarchy was
      // assembled. Append their exact origin without changing earlier slots.
      index = this.vmOrigins.length;
      this.vmOrigins.push(m);
    }
    return index;
  }

  /**
   * Returns the method corresponding to the given VMIndex.
   */
  public getMethodFromVMIndex(i: number): Method {
    var origin = this.vmOrigins[i];
    if (origin !== undefined) {
      var selected = this.selectMethod(origin);
      return selected.kind === 'selected' ? selected.method : null;
    }
    return null;
  }

  /**
   * Get the VM index for the given field
   * NOTE: A static and non-static field can have the same vmindex! Caller must
   * be able to differentiate between static and non-static behavior!
   */
  public getVMIndexForField(f: Field): number {
    if (f.isStatic) {
      assert(f.cls === this, "Looks like we actually need to support static field lookups!");
      return this._staticFields.indexOf(f);
    } else {
      return this._objectFields.indexOf(f);
    }
  }

  public getStaticFieldFromVMIndex(index: number): Field {
    var f = this._staticFields[index];
    if (f !== undefined) {
      return f;
    }
    return null;
  }

  public getObjectFieldFromVMIndex(index: number): Field {
    var f = this._objectFields[index];
    if (f !== undefined) {
      return f;
    }
    return null;
  }

  /**
   * Get a field from its "slot". A "slot" is just the field's index in its
   * defining class's field array.
   */
  public getFieldFromSlot(slot: number): Field {
    return this.fields[slot];
  }

  /**
   * Get a method from its "slot". A "slot" is just the method's index in its
   * defining class's method array.
   */
  public getMethodFromSlot(slot: number): Method {
    return this.methods[slot];
  }

  /**
   * Retrieve a method with the given signature from this particular class.
   * Does not search superclasses / interfaces.
   */
  public getMethod(sig: string): Method {
    return this.getDeclaredMethod(sig);
  }

  /** Available immediately after parsing, independent of inherited tables. */
  public getDeclaredMethod(signature: string): Method {
    for (var i = 0; i < this.methods.length; i++) {
      if (this.methods[i].signature === signature) return this.methods[i];
    }
    return null;
  }

  /** Register only an explicit VM-created native declaration. Multiple CP
   * references share one canonical identity; parsed declarations stay intact. */
  public registerVMMethod(method: Method): Method {
    if (method.cls !== this || method.slot !== -1 || !method.accessFlags.isNative()) {
      throw new Error('Invalid VM method registration');
    }
    var previous = this.vmMethods[method.signature];
    if (previous !== undefined) return previous;
    this.vmMethods[method.signature] = method;
    return method;
  }

  private getEffectiveMethod(signature: string): Method {
    return this.vmMethods[signature] || this.getDeclaredMethod(signature);
  }

  /** All eligible superinterface declarations, preserving loader identity. */
  private getSuperinterfaceMethods(signature?: string): Method[] {
    var seen = new Set<ReferenceClassData<JVMTypes.java_lang_Object>>(), result: Method[] = [];
    var visit = (cls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
      if (seen.has(cls)) return;
      seen.add(cls);
      var declarations = cls.getMethods().filter(method => cls.vmMethods[method.signature] === undefined)
        .concat(Object.keys(cls.vmMethods).map(signature => cls.vmMethods[signature]));
      declarations.forEach(method => {
        if (method.name[0] !== '<' && !method.accessFlags.isStatic() && !method.accessFlags.isPrivate() &&
            (signature === undefined || method.signature === signature)) result.push(method);
      });
      (cls.getInterfaces() || []).forEach(visit);
    };
    var current: ReferenceClassData<JVMTypes.java_lang_Object> = this;
    while (current !== null) {
      (current.getInterfaces() || []).forEach(visit);
      current = current.getSuperClass();
    }
    return result;
  }

  public getMaximallySpecificInterfaceMethods(signature: string): Method[] {
    var methods = this.getSuperinterfaceMethods(signature);
    return methods.filter(method => !methods.some(other => other !== method &&
      other.cls !== method.cls && other.cls.isSubinterface(method.cls)));
  }

  /** JVMS 5.4.6. The resolved declaration, not its signature alone, anchors
   * selection. This query never resolves, verifies or initializes a class. */
  public selectMethod(resolved: Method): MethodSelection {
    if (resolved.accessFlags.isPrivate()) return {kind: 'selected', method: resolved};
    var current: ReferenceClassData<JVMTypes.java_lang_Object> = this;
    while (current !== null) {
      var declared = current.getEffectiveMethod(resolved.signature);
      if (declared !== null && canOverrideMethod(declared, resolved)) return {kind: 'selected', method: declared};
      current = current.getSuperClass();
    }
    var candidates = this.getMaximallySpecificInterfaceMethods(resolved.signature),
      concrete = candidates.filter(method => !method.accessFlags.isAbstract());
    if (concrete.length === 1) return {kind: 'selected', method: concrete[0]};
    return {kind: concrete.length > 1 ? 'conflict' : 'missing', candidates};
  }

  /** JVMS 6.5.invokespecial: selection starts at the symbolic owner or the
   * caller's direct superclass, never at the receiver's class. Resolution and
   * its declaring-loader constraints stay attached to the original Method. */
  public selectSpecialMethod(symbolicOwner: ClassData, resolved: Method): MethodSelection {
    var start = symbolicOwner instanceof ArrayClassData ? symbolicOwner.getSuperClass() :
      symbolicOwner instanceof ReferenceClassData ? symbolicOwner : null;
    // Java SE 8+ treats ACC_SUPER as set, regardless of the class-file bit/version.
    if (resolved.name !== '<init>' && symbolicOwner instanceof ReferenceClassData &&
        !symbolicOwner.accessFlags.isInterface() && symbolicOwner !== this && this.isSubclass(symbolicOwner)) {
      start = this.getSuperClass();
    }
    if (start === null) return {kind: 'missing', candidates: []};
    var current: ReferenceClassData<JVMTypes.java_lang_Object> = start;
    while (current !== null) {
      var declared = current.getEffectiveMethod(resolved.signature);
      if (declared !== null && !declared.accessFlags.isStatic()) return {kind: 'selected', method: declared};
      if (start.accessFlags.isInterface()) break;
      current = current.getSuperClass();
    }
    if (start.accessFlags.isInterface()) {
      var object = <ReferenceClassData<JVMTypes.java_lang_Object>> this.loader.bootstrap.getLoadedClass('Ljava/lang/Object;');
      var objectMethod = object === null ? null : object.getEffectiveMethod(resolved.signature);
      if (objectMethod !== null && objectMethod.accessFlags.isPublic() && !objectMethod.accessFlags.isStatic()) {
        return {kind: 'selected', method: objectMethod};
      }
    }
    var candidates = start.getMaximallySpecificInterfaceMethods(resolved.signature),
      concrete = candidates.filter(method => !method.accessFlags.isAbstract());
    if (concrete.length === 1) return {kind: 'selected', method: concrete[0]};
    return {kind: concrete.length > 1 ? 'conflict' : 'missing', candidates};
  }

  public getSpecificMethod(definingCls: string, sig: string): Method {
    if (this.getInternalName() === definingCls) {
      return this.getMethod(sig);
    }
    var searchClasses = this.interfaceClasses.slice(0), m: Method;
    if (this.superClass) {
      searchClasses.push(this.superClass);
    }
    for (var i = 0; i < searchClasses.length; i++) {
      if (null !== (m = searchClasses[i].getSpecificMethod(definingCls, sig))) {
        return m;
      }
    }
    return null;
  }

  /**
   * Get the methods belonging to this particular class.
   * DO NOT MUTATE!
   */
  public getMethods(): Method[] {
    return this.methods;
  }

  /**
   * Get the set of default methods that are invocable on this object, but were
   * not inherited in the virtual method table.
   * DO NOT MUTATE!
   */
  public getUninheritedDefaultMethods(): Method[] {
    // VM overlays may be registered after hierarchy linking. Preserve their
    // exact special-call aliases without adding them to parsed declarations.
    return this.getSuperinterfaceMethods().filter(method => method.accessFlags.isPublic() &&
      !method.accessFlags.isAbstract());
  }

  public getProtectionDomain(): JVMTypes.java_security_ProtectionDomain {
    return this._protectionDomain;
  }

  /**
   * Resolves this class's virtual method table according to the JVM
   * specification:
   * http://docs.oracle.com/javase/specs/jvms/se8/html/jvms-5.html#jvms-5.4.3.3
   */
  private _resolveMethods(): void {
    this.vmOrigins = this.superClass === null ? [] : this.superClass.vmOrigins.slice();
    var interfaceMethods = this.getSuperinterfaceMethods(), seen = new Set(this.vmOrigins);
    this.methods.concat(interfaceMethods).forEach(method => {
      if (!method.accessFlags.isStatic() && method.name[0] !== '<' && !seen.has(method)) {
        seen.add(method);
        this.vmOrigins.push(method);
      }
    });
  }

  /**
   * Resolves all of the fields for this class according to the JVM
   * specification:
   * http://docs.oracle.com/javase/specs/jvms/se8/html/jvms-5.html#jvms-5.4.3.2
   */
  private _resolveFields(): void {
    if (this.superClass !== null) {
      // Start off w/ my parent class' fields.
      this._objectFields = this._objectFields.concat(this.superClass._objectFields);
      Object.keys(this.superClass._fieldLookup).forEach((f: string) => {
        this._fieldLookup[f] = this.superClass._fieldLookup[f];
      });
    }

    // Superinterface fields trump superclass fields.
    this.interfaceClasses.forEach((iface: ReferenceClassData<JVMTypes.java_lang_Object>) => {
      Object.keys(iface._fieldLookup).forEach((ifaceFieldName: string) => {
        var ifaceF = iface._fieldLookup[ifaceFieldName];
        assert(ifaceF.isStatic, "Interface fields must be static.");
        this._fieldLookup[ifaceFieldName] = ifaceF;
      });
    });

    // My fields override all other fields.
    this.fields.forEach((f: Field) => {
      this._fieldLookup[f.name] = f;
      if (f.isStatic) {
        this._staticFields.push(f);
      } else {
        this._objectFields.push(f);
      }
    });
  }

  /**
   * Looks up a method with the given signature. Returns null if no method
   * found.
   */
  public methodLookup(signature: string): Method {
    var method = this.getEffectiveMethod(signature);
    if (method !== null || signature[0] === '<') return method;
    if (!this.accessFlags.isInterface()) {
      var parent = this.superClass;
      while (parent !== null) {
        method = parent.getEffectiveMethod(signature);
        if (method !== null) return method;
        parent = parent.getSuperClass();
      }
    } else {
      var object = <ReferenceClassData<JVMTypes.java_lang_Object>> this.loader.bootstrap.getLoadedClass('Ljava/lang/Object;');
      method = object === null ? null : object.getEffectiveMethod(signature);
      if (method !== null && method.accessFlags.isPublic() && !method.accessFlags.isStatic()) return method;
    }
    var candidates = this.getMaximallySpecificInterfaceMethods(signature),
      concrete = candidates.filter(candidate => !candidate.accessFlags.isAbstract());
    // Resolution may choose an arbitrary eligible interface declaration when
    // there is no unique concrete maximal method. Invocation selects again.
    return concrete.length === 1 ? concrete[0] : candidates.length ? candidates[0] : null;
  }

  /**
   * Performs method lookup, and includes signature polymorphic results if
   * the method is signature polymorphic.
   */
  public signaturePolymorphicAwareMethodLookup(signature: string): Method {
    var m: Method;
    if (null !== (m = this.methodLookup(signature))) {
      return m;
    } else if (this.className === 'Ljava/lang/invoke/MethodHandle;') {
      // Check if this is a signature polymorphic method.
      // From S2.9:
      // A method is signature polymorphic if and only if all of the following conditions hold :
      // * It is declared in the java.lang.invoke.MethodHandle class.
      // * It has a single formal parameter of type Object[].
      // * It has a return type of Object.
      // * It has the ACC_VARARGS and ACC_NATIVE flags set.
      var polySig = `${signature.slice(0, signature.indexOf('('))}([Ljava/lang/Object;)Ljava/lang/Object;`,
        m = this.getEffectiveMethod(polySig);
      if (m !== null && m.accessFlags.isNative() && m.accessFlags.isVarArgs() && m.cls === this) {
        return m;
      }
    } else if (this.superClass !== null) {
      return this.superClass.signaturePolymorphicAwareMethodLookup(signature);
    }
    return null;
  }

  /**
   * Symbolic field lookup matches both name and descriptor (JVMS 5.4.3.2).
   * Name-only callers retain the existing metadata convenience query.
   */
  public fieldLookup(name: string, descriptor?: string): Field {
    if (descriptor === undefined) return this._fieldLookup[name] || null;
    var seen = new Set<ReferenceClassData<JVMTypes.java_lang_Object>>();
    var visit = (cls: ReferenceClassData<JVMTypes.java_lang_Object>): Field => {
      if (cls === null || seen.has(cls)) return null;
      seen.add(cls);
      var fields = cls.getFields();
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].name === name && fields[i].rawDescriptor === descriptor) return fields[i];
      }
      var interfaces = cls.getInterfaces() || [];
      for (var j = 0; j < interfaces.length; j++) {
        var field = visit(interfaces[j]);
        if (field !== null) return field;
      }
      return visit(cls.getSuperClass());
    };
    return visit(this);
  }

  public getAttribute(name: string): IAttribute {
    var attrs = this.attrs;
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      if (attr.getName() === name) {
        return attr;
      }
    }
    return null;
  }

  public getAttributes(name: string): IAttribute[] {
    var attrs = this.attrs;
    var results : IAttribute[] = [];
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      if (attr.getName() === name) {
        results.push(attr);
      }
    }
    return results;
  }

  public getNestHostReference(): ClassReference {
    var host = <NestHost> this.getAttribute('NestHost');
    return host === null ? null : host.hostClass;
  }

  /** Raw attribute spelling for metadata inspection, not proof of nest access. */
  public getNestHostName(): string {
    var host = this.getNestHostReference();
    return host === null ? this.className : host.name;
  }

  public getNestMemberReferences(): ClassReference[] {
    var members = <NestMembers> this.getAttribute('NestMembers');
    return members === null ? [] : members.classes.slice();
  }

  public getNestMemberNames(): string[] {
    return this.getNestMemberReferences().map((clsRef: ClassReference) => clsRef.name);
  }

  public isNestmateOf(other: ReferenceClassData<JVMTypes.java_lang_Object>): boolean {
    return isKnownNestmate(this, other);
  }

  public getPermittedSubclassNames(): string[] {
    var subclasses = <PermittedSubclasses> this.getAttribute('PermittedSubclasses');
    if (subclasses === null) {
      return [];
    }
    return subclasses.classes.map((clsRef: ClassReference) => clsRef.name);
  }

  public isRecord(): boolean {
    return this.getAttribute('Record') !== null;
  }

  public getRecordComponentNames(): string[] {
    var record = <RecordAttribute> this.getAttribute('Record');
    if (record === null) {
      return [];
    }
    return record.components.map((component) => component.name);
  }

  public getRecordComponents(): IRecordComponentInfo[] {
    var record = <RecordAttribute> this.getAttribute('Record');
    if (record === null) {
      return [];
    }
    return record.components.slice();
  }

  private getUnpermittedSealedSupertype(superClazz: ReferenceClassData<JVMTypes.java_lang_Object>, interfaceClazzes: ReferenceClassData<JVMTypes.java_lang_Object>[]): ReferenceClassData<JVMTypes.java_lang_Object> {
    var directSupertypes = interfaceClazzes.slice(0),
      permittedSubclasses: string[];
    if (superClazz !== null) {
      directSupertypes.push(superClazz);
    }
    for (var i = 0; i < directSupertypes.length; i++) {
      permittedSubclasses = directSupertypes[i].getPermittedSubclassNames();
      if (permittedSubclasses.length > 0 && permittedSubclasses.indexOf(this.className) === -1) {
        return directSupertypes[i];
      }
    }
    return null;
  }

  /**
   * Get the bootstrap method information for an InvokeDynamic opcode.
   */
  public getBootstrapMethod(idx: number): [MethodHandle, IConstantPoolItem[]] {
    var bms = <BootstrapMethods> this.getAttribute('BootstrapMethods');
    return bms.bootstrapMethods[idx];
  }

  /**
   * Returns the initial value for a given static field in the class. Should
   * only be called when the constructor is created.
   */
  private _getInitialStaticFieldValue(thread: JVMThread, name: string): any {
    var f: Field = this.fieldLookup(name);
    if (f !== null && f.accessFlags.isStatic()) {
      var cva = <ConstantValue> f.getAttribute('ConstantValue');
      if (cva !== null) {
        switch (cva.value.getType()) {
          case ConstantPoolItemType.STRING:
            var stringCPI = <ConstString> cva.value;
            if (stringCPI.value === null) {
              stringCPI.value = thread.getJVM().internString(stringCPI.stringValue);
            }
            return stringCPI.value;
          default:
            // TODO: Type better.
            return (<any> cva.value).value;
        }
      } else {
        return initialValue(f.rawDescriptor);
      }
    }
    assert(false, `Tried to construct a static field value that ${f !== null ? "isn't static" : "doesn't exist"}: ${f !== null ? f.cls.getInternalName() : this.getInternalName()} ${name}`);
  }

  public setResolved(superClazz: ReferenceClassData<JVMTypes.java_lang_Object>, interfaceClazzes: ReferenceClassData<JVMTypes.java_lang_Object>[]): void {
    this.superClass = superClazz;
    trace(`Class ${this.getInternalName()} is now resolved.`);
    this.interfaceClasses = interfaceClazzes;
    // TODO: Assert we are not already resolved or initialized?
    this._resolveMethods();
    this._resolveFields();
    this.setState(ClassState.RESOLVED);
  }

  public isVerified(): boolean {
    return this.verification.isVerified();
  }

  private getPreparation(): ClassPreparation {
    // Preparation state is lazy for VM-created metadata as well as parsed
    // classes; observing it performs no loading or descriptor checks.
    if (!this.preparation) this.preparation = new ClassPreparation(this);
    return this.preparation;
  }

  public isPrepared(): boolean { return this.getPreparation().isPrepared(); }

  public isResolved(): boolean {
    // Metadata, verification and preparation are separate gates.
    return super.isResolved() && this.verification.isVerified() && this.isPrepared();
  }

  public isHierarchyResolved(): boolean { return super.isResolved(); }

  /** JVMS 5.3.5 admission, without linking or initializing a parent. */
  private hierarchyParentError(parent: ReferenceClassData<JVMTypes.java_lang_Object>,
      isInterface: boolean): [string, string] {
    var samePackage = this.loader === parent.getLoader() && this.getPackageName() === parent.getPackageName();
    if (!parent.accessFlags.isPublic() && !samePackage &&
        (isInterface || !canAccessReflectionSuperclass(this, parent))) {
      return ['Ljava/lang/IllegalAccessError;', this.getExternalName() + ' cannot access ' + parent.getExternalName()];
    }
    if (parent.accessFlags.isInterface() !== isInterface || !isInterface && parent.accessFlags.isFinal()) {
      return ['Ljava/lang/IncompatibleClassChangeError;', this.getExternalName() + ' has invalid ' +
        (isInterface ? 'superinterface ' : 'superclass ') + parent.getExternalName()];
    }
    return null;
  }

  /** Loading metadata must not recursively verify the referenced classes. */
  public tryToResolveHierarchy(ancestors: Set<ReferenceClassData<JVMTypes.java_lang_Object>> = new Set()): boolean {
    if (this.isHierarchyResolved()) return true;
    if (ancestors.has(this)) return false;
    var path = new Set(ancestors), refs = this.interfaceRefs.slice(), parents: ReferenceClassData<JVMTypes.java_lang_Object>[] = [];
    path.add(this);
    if (this.superClassRef !== null) refs.unshift(this.superClassRef);
    for (var i = 0; i < refs.length; i++) {
      var parent = <ReferenceClassData<JVMTypes.java_lang_Object>> (refs[i].cls || this.loader.getLoadedClass(refs[i].name));
      if (parent === null || !(parent instanceof ReferenceClassData) ||
          this.hierarchyParentError(parent, this.superClassRef === null || i !== 0) !== null ||
          !parent.tryToResolveHierarchy(path)) return false;
      parents.push(parent);
    }
    var superClazz = this.superClassRef !== null ? parents.shift() : null;
    if (this.getUnpermittedSealedSupertype(superClazz, parents) !== null) return false;
    this.setResolved(superClazz, parents);
    return true;
  }

  public tryToResolve(): boolean {
    if (!this.tryToResolveHierarchy()) return false;
    if (this.superClass !== null && !this.superClass.tryToResolve()) return false;
    for (var i = 0; i < this.interfaceClasses.length; i++) {
      if (!this.interfaceClasses[i].tryToResolve()) return false;
    }
    return this.verification.tryToVerify() && this.getPreparation().tryToPrepare();
  }

  /**
   * JVMS 5.5: initialize a class's superclass, then the superinterfaces that
   * declare non-abstract, non-static methods. Enumerate interface ancestors
   * before their children, in class-file declaration order. The JVM predicate
   * includes private and synthetic instance bodies, not only source defaults.
   * Direct initialization of an interface has no such prerequisites.
   */
  private getInitializationDependencies(): ReferenceClassData<JVMTypes.java_lang_Object>[] {
    var dependencies: ReferenceClassData<JVMTypes.java_lang_Object>[] = [],
      visited = new Set<ReferenceClassData<JVMTypes.java_lang_Object>>();
    if (this.accessFlags.isInterface()) {
      return dependencies;
    }
    if (this.superClass !== null) {
      dependencies.push(this.superClass);
    }
    var visit = (iface: ReferenceClassData<JVMTypes.java_lang_Object>): void => {
      if (visited.has(iface)) {
        return;
      }
      visited.add(iface);
      // Do not prune initialized interfaces: direct interface initialization
      // does not initialize their ancestors, which may still be prerequisites.
      iface.getInterfaces().forEach(visit);
      if (iface.getMethods().some((method: Method) => !method.accessFlags.isAbstract() && !method.isStatic)) {
        dependencies.push(iface);
      }
    };
    this.interfaceClasses.forEach(visit);
    return dependencies;
  }

  /**
   * Attempt to synchronously initialize. This is possible if there is no
   * static initializer, and all initialization prerequisites can be completed
   * without executing Java code or waiting for another initialization owner.
   */
  public tryToInitialize(): boolean {
    if (this.getState() === ClassState.INITIALIZED) {
      // Already initialized.
      return this.tryToResolve();
    }
    if (this.getState() === ClassState.ERRONEOUS || this.initLock.getOwner() !== null) {
      return false;
    }

    if (this.tryToResolve()) {
      var dependencies = this.getInitializationDependencies();
      for (var i = 0; i < dependencies.length; i++) {
        if (!dependencies[i].tryToInitialize()) {
          // A prerequisite needs asynchronous initialization or is erroneous.
          return false;
        }
      }

      // Check if this class has a static initializer.
      var clinit = this.getMethod('<clinit>()V');
      if (clinit !== null) {
        // Nope; this class needs to do the full initialization song-and-dance.
        return false;
      } else {
        // No static initializer! This class is initialized!
        this.setState(ClassState.INITIALIZED);
        return true;
      }
    }

    // This class is not resolved.
    return false;
  }

  /**
   * Returns a boolean indicating if this class is an instance of the target class.
   * "target" is a ClassData object.
   * The ClassData objects do not need to be initialized; just loaded.
   * See §2.6.7 for casting rules.
   * @todo Determine this statically to make this a constant time operation.
   */
  public isCastable(target: ClassData): boolean {
    if (!(target instanceof ReferenceClassData)) {
      return false;
    }
    if (this.accessFlags.isInterface()) {
      // We are both interfaces
      if (target.accessFlags.isInterface()) {
        return this.isSubinterface(target);
      }
      // Only I am an interface
      if (!target.accessFlags.isInterface()) {
        return target === this.loader.bootstrap.getLoadedClass('Ljava/lang/Object;');
      }
    } else {
      // I am a regular class, target is an interface
      if (target.accessFlags.isInterface()) {
        return this.isSubinterface(target);
      }
      // We are both regular classes
      return this.isSubclass(target);
    }
  }

  /**
   * Returns 'true' if I implement the target interface.
   */
  public isSubinterface(target: ClassData): boolean {
    if (this === target) {
      return true;
    }
    var ifaces = this.getInterfaces();
    for (var i = 0; i < ifaces.length; i++) {
      var superIface = ifaces[i];
      if (superIface.isSubinterface(target)) {
        return true;
      }
    }
    if (this.getSuperClass() == null) {
      return false;
    }
    return this.getSuperClass().isSubinterface(target);
  }

  /**
   * Asynchronously *initializes* the class and its initialization prerequisites.
   * Throws a Java exception on the thread if initialization fails.
   * @param thread The thread that is performing the initialization.
   * @param cb Callback to invoke when completed. Contains a reference to the
   *   class if it succeeds, or NULL if a failure occurs.
   * @param [explicit] Defaults to true. If true, this class is being
   *   *explicitly* initialized by a user. If false, the JVM is implicitly
   *   initializing the class.
   */
  public initialize(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    if (this.isResolved()) {
      if (this.isInitialized(thread)) {
        // Nothing to do! Either resolution failed and an exception has already
        // been thrown, cdata is already initialized, or the current thread is
        // initializing the class.
        setImmediate(() => {
          cb(this);
        });
      } else if (this.getState() === ClassState.ERRONEOUS) {
        thread.throwNewException(
          'Ljava/lang/NoClassDefFoundError;',
          `Could not initialize class ${this.getExternalName()}`);
        cb(null);
      } else {
        var ownsInitialization = false,
          completion = (cdata: ClassData) => {
            if (cdata === null && this.getState() === ClassState.ERRONEOUS && !ownsInitialization) {
              thread.throwNewException(
                'Ljava/lang/NoClassDefFoundError;',
                `Could not initialize class ${this.getExternalName()}`);
            }
            cb(cdata);
          };
        ownsInitialization = this.initLock.tryLock(thread, completion);
        if (!ownsInitialization) {
          return;
        }
        asyncForEach(this.getInitializationDependencies(), (dependency: ReferenceClassData<JVMTypes.java_lang_Object>, next: (err?: any) => void) => {
          dependency.initialize(thread, (cdata: ClassData) => {
            next(cdata === null);
          }, explicit);
        }, (err?: any) => {
          if (err) {
            // A failed superclass or qualifying superinterface poisons this
            // class too, even if this class has no initializer of its own.
            this.setState(ClassState.ERRONEOUS);
            this.initLock.unlock(null);
          } else {
            this._initialize(thread, (cdata: ClassData) => {
              this.initLock.unlock(cdata);
            });
          }
        });
      }
    } else {
      // Resolve first, then initialize.
      this.resolve(thread, (cdata: ClassData) => {
        if (cdata !== null) {
          this.initialize(thread, cb, explicit);
        } else {
          // Else: An exception was thrown.
          cb(cdata);
        }
      }, explicit);
    }
  }

  /**
   * Helper function. Initializes this class alone. Assumes its initialization
   * prerequisites have already completed.
   */
  private _initialize(thread: JVMThread, cb: (cdata: ClassData) => void): void {
    var cons = <typeof JVMTypes.java_lang_Object> <any> this.getConstructor(thread);
    if (cons['<clinit>()V'] !== undefined) {
      debug(`T${thread.getRef()} Running static initialization for class ${this.className}...`);
      cons['<clinit>()V'](thread, null, (e?: JVMTypes.java_lang_Throwable) => {
        if (e) {
          debug(`Initialization of class ${this.className} failed.`);
          this.setState(ClassState.ERRONEOUS);
          /**
           * "The class or interface initialization method must have completed
           *  abruptly by throwing some exception E. If the class of E is not
           *  Error or one of its subclasses, then create a new instance of the
           *  class ExceptionInInitializerError with E as the argument, and use
           *  this object in place of E."
           * @url http://docs.oracle.com/javase/specs/jvms/se7/html/jvms-5.html#jvms-5.5
           */
          if (e.getClass().isCastable(thread.getBsCl().getResolvedClass('Ljava/lang/Error;'))) {
            // 'e' is 'Error or one of its subclasses'.
            thread.throwException(e);
            cb(null);
          } else {
            // Wrap the error.
            thread.getBsCl().initializeClass(thread, 'Ljava/lang/ExceptionInInitializerError;', (cdata: ReferenceClassData<JVMTypes.java_lang_ExceptionInInitializerError>) => {
              if (cdata == null) {
                // Exceptional failure right here: *We failed to construct ExceptionInInitializerError*!
                // initializeClass will throw an exception on our behalf;
                // nothing to do.
                cb(null);
              } else {
                // Construct the object!
                var eCons = cdata.getConstructor(thread),
                  e2 = new eCons(thread);
                // Construct the ExceptionInInitializerError!
                e2["<init>(Ljava/lang/Throwable;)V"](thread, [e], (e?: JVMTypes.java_lang_Throwable) => {
                  // Throw the newly-constructed error!
                  thread.throwException(e2);
                  cb(null);
                });
              }
            });
          }
        } else {
          this.setState(ClassState.INITIALIZED);
          debug(`Initialization of class ${this.className} succeeded.`);
          // Normal case! Initialization succeeded.
          cb(this);
        }
      });
    } else {
      // Class doesn't have a static initializer.
      this.setState(ClassState.INITIALIZED);
      cb(this);
    }
  }

  /**
   * A reference class can be treated as initialized in a thread if that thread
   * is in the process of initializing it.
   */
  public isInitialized(thread: JVMThread): boolean {
    var state = this.getState();
    // Completion callbacks run before the lock's queue is cleared. A failed
    // initializer must not look initialized to its former owner during that
    // interval, or an immediate retry could bypass the cached failure.
    return this.verification.isVerified() && this.isPrepared() && (state === ClassState.INITIALIZED ||
      (state === ClassState.RESOLVED && thread !== null && this.initLock.getOwner() === thread));
  }

  /**
   * Assemble metadata and dispatch tables without verification. In particular,
   * defining B extends A while A's verifier loads B must not re-enter A's gate.
   * Do not publish these raw parents as resolved constant-pool references.
   */
  public resolveHierarchy(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true,
      ancestors: Set<ReferenceClassData<JVMTypes.java_lang_Object>> = new Set()): void {
    if (this.isHierarchyResolved()) { cb(this); return; }
    var fail = (name: string, message: string) => {
      if (thread === null) logging.error('JVM bootstrap hierarchy failed: ' + message);
      else thread.throwNewException(name, message);
      cb(null);
    };
    if (ancestors.has(this)) { fail('Ljava/lang/ClassCircularityError;', this.getExternalName()); return; }
    var path = new Set(ancestors), refs = this.interfaceRefs.slice(), parents: ReferenceClassData<JVMTypes.java_lang_Object>[] = [];
    path.add(this);
    if (this.superClassRef !== null) refs.unshift(this.superClassRef);
    asyncForEach(refs, (ref: ClassReference, next: (err?: any) => void) => {
      var loaded = (parent: ClassData) => {
        if (parent === null) { next(true); return; }
        if (!(parent instanceof ReferenceClassData)) {
          if (thread !== null) thread.throwNewException('Ljava/lang/IncompatibleClassChangeError;', ref.name);
          next(true);
          return;
        }
        // One constant-pool entry can appear in both super_class and interfaces.
        // The header position, not ClassReference identity, determines its role.
        var admissionError = this.hierarchyParentError(parent, this.superClassRef === null || parents.length !== 0);
        if (admissionError !== null) {
          if (thread === null) logging.error('JVM bootstrap hierarchy failed: ' + admissionError[1]);
          else thread.throwNewException(admissionError[0], admissionError[1]);
          next(true);
          return;
        }
        parent.resolveHierarchy(thread, linked => {
          if (linked === null) next(true);
          else { parents.push(parent); next(); }
        }, explicit, path);
      };
      if (ref.cls !== null) loaded(ref.cls);
      else this.loader.loadClass(thread, ref.name, loaded, explicit, path);
    }, (err?: any) => {
      if (err) { cb(null); return; }
      var superClazz = this.superClassRef !== null ? parents.shift() : null,
        sealedSupertype = this.getUnpermittedSealedSupertype(superClazz, parents);
      if (sealedSupertype !== null) {
        fail('Ljava/lang/IncompatibleClassChangeError;', `${this.getExternalName()} cannot inherit from sealed ${sealedSupertype.getExternalName()}`);
        return;
      }
      if (!this.isHierarchyResolved()) this.setResolved(superClazz, parents);
      cb(this);
    });
  }

  /** Full linking, including hierarchy verification and preparation gates. */
  public resolve(thread: JVMThread, cb: (cdata: ClassData) => void, explicit: boolean = true): void {
    this.resolveHierarchy(thread, hierarchy => {
      if (hierarchy === null) { cb(null); return; }
      var parents = this.interfaceClasses.slice();
      if (this.superClass !== null) parents.push(this.superClass);
      asyncForEach(parents, (parent: ReferenceClassData<JVMTypes.java_lang_Object>, next: (err?: any) => void) => {
        if (parent.isResolved()) next();
        else parent.resolve(thread, linked => next(linked === null ? true : undefined), explicit);
      }, err => {
        if (err) cb(null);
        else this.verification.verify(thread, success => {
          if (!success) cb(null);
          else this.getPreparation().prepare(thread, prepared => cb(prepared ? this : null));
        });
      });
    }, explicit);
  }

  /**
   * Supply native-call aliases for inherited interface signatures. Conflicting
   * or entirely abstract candidates still need an alias that reports the
   * guest error at invocation; constructing a class must not choose a body.
   */
  public getMirandaAndDefaultMethods(): Method[] {
    if (this.interfaceClasses.length === 0) {
      return [];
    }
    var seen = new Set<string>(), aliases: Method[] = [];
    this.getSuperinterfaceMethods().forEach(method => {
      var own = this.getEffectiveMethod(method.signature);
      if (seen.has(method.signature) || own !== null && !own.accessFlags.isStatic()) return;
      seen.add(method.signature);
      var selection = this.selectMethod(method);
      aliases.push(selection.kind === 'selected' ? selection.method : method);
    });
    return aliases;
  }

  public outputInjectedFields(outputStream: StringOutputStream) {
    if (this.superClass !== null) {
      this.superClass.outputInjectedFields(outputStream);
    }
    var injected = injectedFields[this.getInternalName()];
    if (injected !== undefined) {
      Object.keys(injected).forEach((fieldName: string) => {
        outputStream.write(`this.${fieldName} = ${injected[fieldName][1]};\n`);
      });
    }
  }

  protected _constructConstructor(thread: JVMThread): IJVMConstructor<T> {
    assert(this._constructor === null, `Attempted to construct constructor twice for class ${this.getExternalName()}!`);

    var jsClassName = this.getJSClassName(),
      outputStream = new StringOutputStream(),
      methods = this.getMethods().filter(method => this.vmMethods[method.signature] === undefined)
        .concat(Object.keys(this.vmMethods).map(signature => this.vmMethods[signature])),
      mirandaAndDefaultMethods = this.getMirandaAndDefaultMethods(),
      uninheritedDefaultMethods = this.getUninheritedDefaultMethods();

    // Expects args: extendClass, cls, InternalStackFrame, NativeStackFrame, BytecodeStackFrame, gLongZero, ClassLoader, Monitor, thread
    outputStream.write(`if (cls.superClass !== null) {
    extendClass(${jsClassName}, cls.superClass.getConstructor(thread));
  }
  function ${jsClassName}(thread) {\n`);
    // Injected fields.
    this.outputInjectedFields(outputStream);

    // Output instance field assignments.
    this._objectFields.forEach((f: Field) => f.outputJavaScriptField(jsClassName, outputStream));
    outputStream.write(`  }
  ${jsClassName}.cls = cls;\n`);

    // Injected methods.
    this.outputInjectedMethods(jsClassName, outputStream);

    // Static fields.
    this._staticFields.forEach((f: Field) => f.outputJavaScriptField(jsClassName, outputStream));

    // Static and instance methods.
    methods.forEach((m: Method, index: number) => Method.prototype.outputJavaScriptFunction.call(m, jsClassName, outputStream, false, `methods[${index}]`));

    // Miranda and default interface methods.
    mirandaAndDefaultMethods.forEach((m: Method, index: number) => Method.prototype.outputJavaScriptFunction.call(m, jsClassName, outputStream, false, `mirandaAndDefaultMethods[${index}]`));

    // Uninherited default methods.
    uninheritedDefaultMethods.forEach((m: Method, index: number) => Method.prototype.outputJavaScriptFunction.call(m, jsClassName, outputStream, true, `uninheritedDefaultMethods[${index}]`));

    outputStream.write(`  return ${jsClassName};`);

    var evalText = outputStream.flush();
    // NOTE: Thread will be null during system bootstrapping.
    if (!RELEASE && thread !== null && thread.getJVM().shouldDumpCompiledCode()) {
      thread.getJVM().dumpObjectDefinition(this, evalText);
    }
    const fcn = new Function("extendClass", "cls", "InternalStackFrame", "NativeStackFrame", "BytecodeStackFrame", "gLongZero", "CustomClassLoader", "Monitor", "thread", "getRef", "util", "methods", "mirandaAndDefaultMethods", "uninheritedDefaultMethods", "invokeExactMethod", "invokeVirtualMethod", evalText);
    return fcn(extendClass, this, InternalStackFrame, NativeStackFrame, BytecodeStackFrame, gLong.ZERO, CustomClassLoader, Monitor, thread, getRef, util, methods, mirandaAndDefaultMethods, uninheritedDefaultMethods, invokeExactMethod, invokeVirtualMethod);
  }

  public getConstructor(thread: JVMThread): IJVMConstructor<T> {
    if (this._constructor == null) {
      assert(this.isResolved(), `Cannot construct ${this.getInternalName()}'s constructor until it is resolved.`);
      this._constructor = this._constructConstructor(thread);
    }
    return this._constructor;
  }
}
