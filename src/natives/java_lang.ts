import * as Doppio from '../doppiojvm';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import logging = Doppio.Debug.Logging;
import util = Doppio.VM.Util;
import ArrayClassData = Doppio.VM.ClassFile.ArrayClassData;
import ThreadStatus = Doppio.VM.Enums.ThreadStatus;
import Method = Doppio.VM.ClassFile.Method;
import Field = Doppio.VM.ClassFile.Field;
import AbstractMethodField = Doppio.VM.ClassFile.AbstractMethodField;
import Long = Doppio.VM.Long;
import assert = Doppio.Debug.Assert;
import ConstantPool = Doppio.VM.ClassFile.ConstantPool;
import PrimitiveClassData = Doppio.VM.ClassFile.PrimitiveClassData;
import MethodHandleReferenceKind = Doppio.VM.Enums.MethodHandleReferenceKind;
import attributes = Doppio.VM.ClassFile.Attributes;
import ClassData = Doppio.VM.ClassFile.ClassData;
import * as JVMTypes from '../../includes/JVMTypes';
import {setImmediate} from 'browserfs';

export default function (): any {
  var debug = logging.debug;

  function getThrowableBacktraceFrames(throwable: JVMTypes.java_lang_Throwable): any[] {
    var backtrace = (<any> throwable)['java/lang/Throwable/backtrace'];
    if (backtrace === null || backtrace === undefined) {
      return [];
    }
    if (backtrace.array !== undefined) {
      return backtrace.array;
    }
    return backtrace.frames;
  }

  function writeStackTraceElement(thread: JVMThread, element: JVMTypes.java_lang_StackTraceElement, frame: any): void {
    var bsCl = thread.getBsCl(),
      cls = frame.method.cls,
      ln = -1,
      sourceFile: string;
    if (frame.method.accessFlags.isNative()) {
      sourceFile = 'Native Method';
    } else {
      var srcAttr = <attributes.SourceFile> cls.getAttribute('SourceFile'),
        code = frame.method.getCodeAttribute(),
        table = <attributes.LineNumberTable> code.getAttribute('LineNumberTable');
      sourceFile = (srcAttr != null) ? srcAttr.filename : 'unknown';
      if (table != null) {
        ln = table.getLineNumber(frame.pc);
      }
    }
    element['java/lang/StackTraceElement/declaringClass'] = util.initString(bsCl, util.ext_classname(cls.getInternalName()));
    element['java/lang/StackTraceElement/methodName'] = util.initString(bsCl, frame.method.name != null ? frame.method.name : 'unknown');
    element['java/lang/StackTraceElement/fileName'] = util.initString(bsCl, sourceFile);
    element['java/lang/StackTraceElement/lineNumber'] = ln;
  }

  function arrayGet(thread: JVMThread, arr: JVMTypes.JVMArray<any>, idx: number): any {
    if (arr == null) {
      thread.throwNewException('Ljava/lang/NullPointerException;', '');
    } else {
      var array = arr.array;
      if (idx < 0 || idx >= array.length) {
        thread.throwNewException('Ljava/lang/ArrayIndexOutOfBoundsException;', 'Tried to access an illegal index in an array.');
      } else {
        return array[idx];
      }
    }
  }

  function isNotNull(thread: JVMThread, obj: JVMTypes.java_lang_Object): boolean {
    if (obj == null) {
      thread.throwNewException('Ljava/lang/NullPointerException;', '');
      return false;
    } else {
      return true;
    }
  }

  function verifyArray(thread: JVMThread, obj: JVMTypes.JVMArray<any>): boolean {
    if (!(obj.getClass() instanceof ArrayClassData)) {
      thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'Object is not an array.');
      return false;
    } else {
      return true;
    }
  }

  class java_lang_Class {

    public static 'forName0(Ljava/lang/String;ZLjava/lang/ClassLoader;Ljava/lang/Class;)Ljava/lang/Class;'(thread: JVMThread, jvmStr: JVMTypes.java_lang_String, initialize: number, jclo: JVMTypes.java_lang_ClassLoader, caller: JVMTypes.java_lang_Class): void {
      var classname = util.int_classname(jvmStr.toString());
      if (!util.verify_int_classname(classname)) {
        thread.throwNewException('Ljava/lang/ClassNotFoundException;', classname);
      } else {
        var loader = util.getLoader(thread, jclo);
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        if (initialize) {
          loader.initializeClass(thread, classname, (cls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
            if (cls != null) {
              thread.asyncReturn(cls.getClassObject(thread));
            }
          });
        } else {
          loader.resolveClass(thread, classname, (cls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
            if (cls != null) {
              thread.asyncReturn(cls.getClassObject(thread));
            }
          });
        }
      }
    }

    public static 'getModule()Ljava/lang/Module;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): any {
      var cachedModule = (<any> javaThis)['java/lang/Class/module'];
      if (cachedModule !== null && cachedModule !== undefined) {
        return cachedModule;
      }

      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      thread.getBsCl().initializeClass(thread, 'Ljava/lang/Module;', (moduleClass: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (moduleClass === null) {
          return;
        }
        var moduleCons = moduleClass.getConstructor(thread),
          module = new moduleCons(thread);
        (<any> module)['java/lang/Module/name'] = null;
        (<any> module)['java/lang/Module/loader'] = (<any> javaThis)['java/lang/Class/classLoader'];
        (<any> javaThis)['java/lang/Class/module'] = module;
        thread.asyncReturn(module);
      });
    }

    public static 'isInstance(Ljava/lang/Object;)Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, obj: JVMTypes.java_lang_Object): boolean {
      if (obj !== null) {
        return obj.getClass().isCastable(javaThis.$cls);
      } else {
        return false;
      }
    }

    public static 'isAssignableFrom(Ljava/lang/Class;)Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, cls: JVMTypes.java_lang_Class): boolean {
      return cls.$cls.isCastable(javaThis.$cls);
    }

    public static 'isInterface()Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): boolean {
      if (!(javaThis.$cls instanceof ReferenceClassData)) {
        return false;
      }
      return javaThis.$cls.accessFlags.isInterface();
    }

    public static 'isArray()Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): boolean {
      return javaThis.$cls instanceof ArrayClassData;
    }

    public static 'isPrimitive()Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): boolean {
      return javaThis.$cls instanceof PrimitiveClassData;
    }

    public static 'getName0()Ljava/lang/String;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_String {
      return util.initString(thread.getBsCl(), javaThis.$cls.getExternalName());
    }

    public static 'getSuperclass()Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_Class {
      if (javaThis.$cls instanceof PrimitiveClassData) {
        return null;
      }
      var cls = javaThis.$cls;
      if (cls.accessFlags.isInterface() || (cls.getSuperClass() == null)) {
        return null;
      }
      return cls.getSuperClass().getClassObject(thread);
    }

    public static 'getInterfaces0()[Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.JVMArray<JVMTypes.java_lang_Class> {
      return util.newArrayFromData<JVMTypes.java_lang_Class>(thread, thread.getBsCl(), '[Ljava/lang/Class;', javaThis.$cls.getInterfaces().map((iface) => iface.getClassObject(thread)));
    }

    public static 'getComponentType()Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_Class {
      if (!(javaThis.$cls instanceof ArrayClassData)) {
        return null;
      }
      // As this array type is loaded, the component type is guaranteed
      // to be loaded as well. No need for asynchronicity.
      return (<ArrayClassData<any>> javaThis.$cls).getComponentClass().getClassObject(thread);
    }

    public static 'getModifiers()I'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): number {
      return javaThis.$cls.accessFlags.getRawByte();
    }

    public static 'getSigners()[Ljava/lang/Object;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.JVMArray<JVMTypes.java_lang_Object> {
      const internalName = javaThis.$cls.getInternalName();
      const internalType = internalName[0];
      if (util.is_reference_type(internalType)) {
        return javaThis.signers == null ? null : util.newArrayFromData(thread, thread.getBsCl(), "[Ljava/lang/Object;", javaThis.signers);
      }
      return null;
    }

    public static 'setSigners([Ljava/lang/Object;)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, arg0: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): void {
      const internalName = javaThis.$cls.getInternalName();
      const internalType = internalName[0];
      if (util.is_reference_type(internalType)) {
        javaThis.signers = arg0 == null ? null : arg0.array.slice();
      }
    }

    public static 'getEnclosingMethod0()[Ljava/lang/Object;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.JVMArray<JVMTypes.java_lang_Object> {
      var encDesc: JVMTypes.java_lang_String = null,
        enc_name: JVMTypes.java_lang_String = null,
        bsCl = thread.getBsCl();

      if (javaThis.$cls instanceof ReferenceClassData) {
        var cls = <ReferenceClassData<JVMTypes.java_lang_Object>> javaThis.$cls,
          em: attributes.EnclosingMethod = <attributes.EnclosingMethod> cls.getAttribute('EnclosingMethod');
        if (em == null) {
          return null;
        }

        // array w/ 3 elements:
        // - the immediately enclosing class (java/lang/Class)
        // - the immediately enclosing method or constructor's name (can be null). (String)
        // - the immediately enclosing method or constructor's descriptor (null iff name is). (String)
        var rv = util.newArray<JVMTypes.java_lang_Object>(thread, bsCl, '[Ljava/lang/Object;', 3),
          encClassRef = em.encClass;
        if (em.encMethod != null) {
          rv.array[1] = util.initString(bsCl, em.encMethod.name);
          rv.array[2] = util.initString(bsCl, em.encMethod.descriptor);
        }

        if (encClassRef.isResolved()) {
          rv.array[0] = encClassRef.cls.getClassObject(thread);
          return rv;
        } else {
          thread.setStatus(ThreadStatus.ASYNC_WAITING);
          encClassRef.resolve(thread, cls.getLoader(), cls, (status: boolean) => {
            if (status) {
              rv.array[0] = encClassRef.cls.getClassObject(thread);
              thread.asyncReturn(rv);
            }
          });
        }
      }
      return null;
    }

    public static 'getDeclaringClass0()Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_Class {
      var declaringName: ConstantPool.ClassReference, entry: attributes.IInnerClassInfo,
        name: string, i: number, len: number;
      if (javaThis.$cls instanceof ReferenceClassData) {
        var cls = <ReferenceClassData<JVMTypes.java_lang_Object>> javaThis.$cls,
          icls = <attributes.InnerClasses> cls.getAttribute('InnerClasses');
        if (icls == null) {
          return null;
        }
        var myClass = cls.getInternalName(),
          innerClassInfo = icls.classes;
        for (i = 0, len = innerClassInfo.length; i < len; i++) {
          entry = innerClassInfo[i];
          if (entry.outerInfoIndex <= 0) {
            continue;
          }
          name = (<ConstantPool.ClassReference> cls.constantPool.get(entry.innerInfoIndex)).name;
          if (name !== myClass) {
            continue;
          }
          // XXX(jez): this assumes that the first enclosing entry is also
          // the immediate enclosing parent, and I'm not 100% sure this is
          // guaranteed by the spec
          declaringName = (<ConstantPool.ClassReference> cls.constantPool.get(entry.outerInfoIndex));
          if (declaringName.isResolved()) {
            return declaringName.cls.getClassObject(thread);
          } else {
            thread.setStatus(ThreadStatus.ASYNC_WAITING);
            declaringName.resolve(thread, cls.getLoader(), cls, (status: boolean) => {
              if (status) {
                thread.asyncReturn(declaringName.cls.getClassObject(thread));
              }
            });
          }
        }
      }
      return null;
    }

    public static 'getProtectionDomain0()Ljava/security/ProtectionDomain;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_security_ProtectionDomain {
      return javaThis.$cls.getProtectionDomain();
    }

    public static 'getPrimitiveClass(Ljava/lang/String;)Ljava/lang/Class;'(thread: JVMThread, jvmStr: JVMTypes.java_lang_String): JVMTypes.java_lang_Class {
      var type_desc = util.typestr2descriptor(jvmStr.toString()),
        prim_cls = thread.getBsCl().getInitializedClass(thread, type_desc);
      return prim_cls.getClassObject(thread);
    }

    public static 'getGenericSignature0()Ljava/lang/String;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.java_lang_String {
      var cls = javaThis.$cls;
      // TODO: What if it is a primitive type? What do I return?
      if (!util.is_primitive_type(cls.getInternalName())) {
        var sigAttr = <attributes.Signature> (<ReferenceClassData<JVMTypes.java_lang_Object>> cls).getAttribute('Signature');
        if (sigAttr != null && sigAttr.sig != null) {
          return util.initString(thread.getBsCl(), sigAttr.sig);
        }
      }
      return null;
    }

    public static 'getRecordComponents()[Ljava/lang/reflect/RecordComponent;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): any {
      var clsData = javaThis.$cls;
      if (!(clsData instanceof ReferenceClassData) || !clsData.isRecord()) {
        return null;
      }
      var cls = <ReferenceClassData<any>> clsData;

      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      thread.getBsCl().initializeClass(thread, 'Ljava/lang/reflect/RecordComponent;', (componentCls: ReferenceClassData<any>) => {
        if (componentCls === null) {
          thread.throwNewException('Ljava/lang/NoClassDefFoundError;', 'java/lang/reflect/RecordComponent');
          return;
        }
        var components = cls.getRecordComponents(),
          componentCons = componentCls.getConstructor(thread),
          rv = util.newArray<any>(thread, thread.getBsCl(), '[Ljava/lang/reflect/RecordComponent;', components.length),
          i = 0,
          finishComponent = (index: number, typeObj: JVMTypes.java_lang_Class, accessor: JVMTypes.java_lang_reflect_Method) => {
            var component = components[index],
              componentObj = new componentCons(thread);
            componentObj['java/lang/reflect/RecordComponent/name'] = util.initString(thread.getBsCl(), component.name);
            componentObj['java/lang/reflect/RecordComponent/type'] = typeObj;
            componentObj['java/lang/reflect/RecordComponent/accessor'] = accessor;
            componentObj['java/lang/reflect/RecordComponent/declaringRecord'] = javaThis;
            rv.array[index] = componentObj;
          },
          nextComponent = () => {
            if (i >= components.length) {
              thread.asyncReturn(rv);
              return;
            }
            var index = i++,
              component = components[index],
              accessor = cls.getMethod(component.name + '()' + component.descriptor);
            cls.getLoader().resolveClass(thread, component.descriptor, (typeData: ClassData) => {
              if (typeData === null || accessor === null) {
                thread.throwNewException('Ljava/lang/NoSuchMethodError;', component.name + '()' + component.descriptor);
                return;
              }
              accessor.reflector(thread, (accessorObj: JVMTypes.java_lang_reflect_Method) => {
                if (accessorObj === null) {
                  thread.throwNewException('Ljava/lang/NoSuchMethodError;', component.name + '()' + component.descriptor);
                  return;
                }
                finishComponent(index, typeData.getClassObject(thread), accessorObj);
                nextComponent();
              });
            });
          };
        nextComponent();
      });
    }

    /**
     * Returns RuntimeVisibleAnnotations defined on the class.
     */
    public static 'getRawAnnotations()[B'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.JVMArray<number> {
      var cls = <ReferenceClassData<JVMTypes.java_lang_Class>> javaThis.$cls,
        annotationsVisible = <attributes.RuntimeVisibleAnnotations> cls.getAttribute('RuntimeVisibleAnnotations'),
        methods: Method[], i: number, m: Method;

      if (annotationsVisible !== null) {
        // TODO: Use a typed array?
        var bytes = annotationsVisible.rawBytes, data: number[] = new Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) {
          data[i] = bytes.readInt8(i);
        }
        return util.newArrayFromData<number>(thread, thread.getBsCl(), '[B', data);
      }
      return null;
    }

    public static 'getConstantPool()Lsun/reflect/ConstantPool;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.sun_reflect_ConstantPool {
      var cls = <ReferenceClassData<JVMTypes.java_lang_Object>> javaThis.$cls,
        cpObj = util.newObject<JVMTypes.sun_reflect_ConstantPool>(thread, thread.getBsCl(), 'Lsun/reflect/ConstantPool;');
      // @todo Make this a proper JavaObject. I don't think the JCL uses it as such,
      // but right now this function fails any automated sanity checks on return values.
      cpObj['sun/reflect/ConstantPool/constantPoolOop'] = <any> cls.constantPool;
      return cpObj;
    }

    public static 'getDeclaredFields0(Z)[Ljava/lang/reflect/Field;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, publicOnly: number): void {
      var fields = javaThis.$cls.getFields();
      if (publicOnly) {
        fields = fields.filter((f) => f.accessFlags.isPublic());
      }
      var rv = util.newArray<JVMTypes.java_lang_reflect_Field>(thread, thread.getBsCl(), '[Ljava/lang/reflect/Field;', fields.length),
        i: number = 0;
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      util.asyncForEach<Field>(fields,
        (f, nextItem) => {
          f.reflector(thread, (fieldObj: JVMTypes.java_lang_reflect_Field) => {
            if (fieldObj !== null) {
              rv.array[i++] = fieldObj;
              nextItem();
            }
          });
        }, () => {
          thread.asyncReturn(rv);
        });
    }

    public static 'getDeclaredMethods0(Z)[Ljava/lang/reflect/Method;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, publicOnly: number): void {
      var methods: Method[] = javaThis.$cls.getMethods().filter((m: Method) => {
        return m.name[0] !== '<' && (m.accessFlags.isPublic() || !publicOnly);
      }), rv = util.newArray<JVMTypes.java_lang_reflect_Method>(thread, thread.getBsCl(), '[Ljava/lang/reflect/Method;', methods.length),
        i = 0;
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      util.asyncForEach<Method>(methods,
        (m, nextItem) => {
          m.reflector(thread, (methodObj) => {
            if (methodObj !== null) {
              rv.array[i++] = <JVMTypes.java_lang_reflect_Method> methodObj;
              nextItem()
            }
          });
        }, () => {
          thread.asyncReturn(rv);
        });
    }

    public static 'getDeclaredConstructors0(Z)[Ljava/lang/reflect/Constructor;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class, publicOnly: number): void {
      var methods: Method[] = javaThis.$cls.getMethods().filter((m: Method) => {
        return m.name === '<init>' && (!publicOnly || m.accessFlags.isPublic());
      }), rv = util.newArray<JVMTypes.java_lang_reflect_Constructor>(thread, thread.getBsCl(), '[Ljava/lang/reflect/Constructor;', methods.length),
        i = 0;
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      util.asyncForEach(methods,
        (m: Method, nextItem: (err?: any) => void) => {
          m.reflector(thread, (methodObj) => {
            if (methodObj !== null) {
              rv.array[i++] = <JVMTypes.java_lang_reflect_Constructor> methodObj;
              nextItem()
            }
          });
        }, () => {
          thread.asyncReturn(rv);
        });
    }

    public static 'getDeclaredClasses0()[Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Class): JVMTypes.JVMArray<JVMTypes.java_lang_Class> {
      let ret = util.newArray<JVMTypes.java_lang_Class>(thread, thread.getBsCl(), '[Ljava/lang/Class;', 0),
        cls = javaThis.$cls;
      if (cls instanceof ReferenceClassData) {
        let myClass = cls.getInternalName(),
          iclses = <attributes.InnerClasses[]> cls.getAttributes('InnerClasses'),
          flatNames: ConstantPool.ClassReference[] = [];
        if (iclses.length === 0) {
          return ret;
        }
        for (let i = 0; i < iclses.length; i++) {
          flatNames = flatNames.concat(iclses[i].classes.filter((c: attributes.IInnerClassInfo) =>
            // select inner classes where the enclosing class is my_class
            c.outerInfoIndex > 0 && (<ConstantPool.ClassReference> (<ReferenceClassData<any>> cls).constantPool.get(c.outerInfoIndex)).name === myClass)
            .map((c: attributes.IInnerClassInfo) => (<ConstantPool.ClassReference> (<ReferenceClassData<any>> cls).constantPool.get(c.innerInfoIndex))));
        }
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        util.asyncForEach(flatNames,
          (clsRef: ConstantPool.ClassReference, nextItem: () => void) => {
            if (clsRef.isResolved()) {
              ret.array.push(clsRef.cls.getClassObject(thread));
              nextItem();
            } else {
              clsRef.resolve(thread, cls.getLoader(), <ReferenceClassData<JVMTypes.java_lang_Object>> javaThis.getClass(), (status) => {
                if (status) {
                  ret.array.push(clsRef.cls.getClassObject(thread));
                  nextItem();
                }
              });
            }
          }, () => thread.asyncReturn(ret));
      } else {
        return ret;
      }
    }

    public static 'desiredAssertionStatus0(Ljava/lang/Class;)Z'(thread: JVMThread, arg0: JVMTypes.java_lang_Class): boolean {
      if (arg0.$cls.getLoader().getLoaderObject() === null) {
        return thread.getJVM().areSystemAssertionsEnabled();
      }
      return false;
    }

  }

  class java_lang_ClassLoader$NativeLibrary {

    public static 'load(Ljava/lang/String;Z)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader$NativeLibrary, name: JVMTypes.java_lang_String, isBuiltIn: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'find(Ljava/lang/String;)J'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader$NativeLibrary, arg0: JVMTypes.java_lang_String): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'unload(Ljava/lang/String;Z)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader$NativeLibrary, name: JVMTypes.java_lang_String): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

  }

  // Fun Note: The bootstrap classloader object is represented by null.
  class java_lang_ClassLoader {

    public static 'defineClass0(Ljava/lang/String;[BIILjava/security/ProtectionDomain;)Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, arg0: JVMTypes.java_lang_String, arg1: JVMTypes.JVMArray<number>, arg2: number, arg3: number, arg4: JVMTypes.java_security_ProtectionDomain): JVMTypes.java_lang_Class {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'defineClass1(Ljava/lang/String;[BIILjava/security/ProtectionDomain;Ljava/lang/String;)Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, name: JVMTypes.java_lang_String, bytes: JVMTypes.JVMArray<number>, offset: number, len: number, pd: JVMTypes.java_security_ProtectionDomain, source: JVMTypes.java_lang_String): JVMTypes.java_lang_Class {
      var loader = util.getLoader(thread, javaThis),
        type = util.int_classname(name.toString()),
        cls = loader.defineClass(thread, type, util.byteArray2Buffer(bytes.array, offset, len), pd);
      if (cls == null) {
        return null;
      }
      // Ensure that this class is resolved.
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      cls.resolve(thread, (status) => {
        // NULL status means resolution failed.
        if (status !== null) {
          thread.asyncReturn(cls.getClassObject(thread));
        }
      }, true);
    }

    public static 'defineClass2(Ljava/lang/String;Ljava/nio/ByteBuffer;IILjava/security/ProtectionDomain;Ljava/lang/String;)Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, name: JVMTypes.java_lang_String, b: JVMTypes.java_nio_ByteBuffer, off: number, len: number, pd: JVMTypes.java_security_ProtectionDomain, source: JVMTypes.java_lang_String): JVMTypes.java_lang_Class {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'resolveClass0(Ljava/lang/Class;)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, cls: JVMTypes.java_lang_Class): void {
      var loader = util.getLoader(thread, javaThis);
      if (cls.$cls.isResolved()) {
        return;
      }
      // Ensure that this class is resolved.
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      cls.$cls.resolve(thread, (cdata: ClassData) => {
        if (cdata !== null) {
          thread.asyncReturn();
        }
        // Else: An exception occurred.
      }, true);
    }

    public static 'findBootstrapClass(Ljava/lang/String;)Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, name: JVMTypes.java_lang_String): void {
      var type = util.int_classname(name.toString());
      // This returns null in OpenJDK7, but actually can throw an exception
      // in OpenJDK6.
      // TODO: Fix currently incorrect behavior for our JDK. Should return null, not throw an exception on failure.
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      thread.getBsCl().resolveClass(thread, type, (cls) => {
        if (cls != null) {
          thread.asyncReturn(cls.getClassObject(thread));
        }
      }, true);
    }

    public static 'findLoadedClass0(Ljava/lang/String;)Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_ClassLoader, name: JVMTypes.java_lang_String): JVMTypes.java_lang_Class {
      var loader = util.getLoader(thread, javaThis),
        type = util.int_classname(name.toString()),
        // Return JavaClassObject if loaded, or null otherwise.
        cls = loader.getResolvedClass(type);
      if (cls != null) {
        return cls.getClassObject(thread);
      } else {
        return null;
      }
    }

    public static 'retrieveDirectives()Ljava/lang/AssertionStatusDirectives;'(thread: JVMThread): void {
      let jvm = thread.getJVM(), bsCl = thread.getBsCl();
      thread.import('Ljava/lang/AssertionStatusDirectives;', (asd: typeof JVMTypes.java_lang_AssertionStatusDirectives) => {
        let directives = new asd();
        let enabledAssertions = jvm.getEnabledAssertions();
        // The classes for which assertions are to be enabled or disabled.
        let classes: string[] = [],
          // A parallel array to classes, indicating whether each class
          // is to have assertions enabled or disabled.
          classEnabled: number[] = [],
          // The package-trees for which assertions are to be enabled or disabled.
          packages: string[] = [],
          // A parallel array to packages, indicating whether each
          // package-tree is to have assertions enabled or disabled.
          packageEnabled: number[] = [],
          deflt: boolean = false,
          processAssertions = (enabled: number) => {
            return (name: string): void => {
              let dotIndex = name.indexOf('...');
              if (dotIndex === -1) {
                classes.push(name);
                classEnabled.push(enabled);
              } else {
                packages.push(name.slice(0, dotIndex));
                packageEnabled.push(enabled);
              }
            };
          };

        jvm.getDisabledAssertions().forEach(processAssertions(0));

        if (typeof(enabledAssertions) === 'boolean') {
          deflt = <boolean> enabledAssertions;
        } else if (Array.isArray(enabledAssertions)) {
          enabledAssertions.forEach(processAssertions(1));
        } else {
          return thread.throwNewException('Ljava/lang/InternalError;', `Expected enableAssertions option to be a boolean or an array of strings.`);
        }

        directives['java/lang/AssertionStatusDirectives/classes'] = util.newArrayFromData<JVMTypes.java_lang_String>(thread, bsCl, '[Ljava/lang/String;', classes.map((cls) => util.initString(bsCl, cls)));
        directives['java/lang/AssertionStatusDirectives/classEnabled'] = util.newArrayFromData<number>(thread, bsCl, '[Z', classEnabled);
        directives['java/lang/AssertionStatusDirectives/packages'] = util.newArrayFromData<JVMTypes.java_lang_String>(thread, bsCl, '[Ljava/lang/String;', packages.map((pkg) => util.initString(bsCl, pkg)));
        directives['java/lang/AssertionStatusDirectives/packageEnabled'] = util.newArrayFromData<number>(thread, bsCl, '[Z', packageEnabled);
        directives['java/lang/AssertionStatusDirectives/deflt'] = (<boolean> enabledAssertions) ? 1 : 0;

        thread.asyncReturn(directives);
      });
    }

  }

  class java_lang_Compiler {

    public static 'initialize()V'(thread: JVMThread): void {
      // NOP.
    }

    public static 'registerNatives()V'(thread: JVMThread): void {
      // NOP.
    }

    public static 'compileClass(Ljava/lang/Class;)Z'(thread: JVMThread, arg0: JVMTypes.java_lang_Class): number {
      // Return false: No compiler available.
      return 0;
    }

    public static 'compileClasses(Ljava/lang/String;)Z'(thread: JVMThread, arg0: JVMTypes.java_lang_String): number {
      // Return false: No compiler available.
      return 0;
    }

    public static 'command(Ljava/lang/Object;)Ljava/lang/Object;'(thread: JVMThread, arg0: JVMTypes.java_lang_Object): JVMTypes.java_lang_Object {
      // Return null; no compiler available.
      return null;
    }

    // NOP'd.
    public static 'enable()V'(thread: JVMThread): void {}
    public static 'disable()V'(thread: JVMThread): void {}

  }

  // Used for converting between numerical representations.
  var conversionBuffer = new Buffer(8);

  class java_lang_Double {

    public static 'doubleToRawLongBits(D)J'(thread: JVMThread, num: number): Long {
      conversionBuffer.writeDoubleLE(num, 0);
      return Long.fromBits(conversionBuffer.readUInt32LE(0), conversionBuffer.readUInt32LE(4));
    }

    public static 'longBitsToDouble(J)D'(thread: JVMThread, num: Long): number {
      conversionBuffer.writeInt32LE(num.getLowBits(), 0);
      conversionBuffer.writeInt32LE(num.getHighBits(), 4);
      return conversionBuffer.readDoubleLE(0);
    }

  }

  class java_lang_Float {

    public static 'floatToRawIntBits(F)I'(thread: JVMThread, num: number): number {
      conversionBuffer.writeFloatLE(num, 0);
      return conversionBuffer.readInt32LE(0);
    }

    public static 'intBitsToFloat(I)F'(thread: JVMThread, num: number): number {
      conversionBuffer.writeInt32LE(num, 0);
      return conversionBuffer.readFloatLE(0);
    }

  }

  class java_lang_Object {

    public static 'getClass()Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): JVMTypes.java_lang_Class {
      return javaThis.getClass().getClassObject(thread);
    }

    public static 'hashCode()I'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): number {
      return javaThis.ref;
    }

    public static 'clone()Ljava/lang/Object;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): JVMTypes.java_lang_Object {
      var cls = javaThis.getClass();
      if (cls.getInternalName()[0] === '[') {
        // Array clone. It's always a shallow clone.
        return (<JVMTypes.JVMArray<any>> javaThis).slice(0);
      } else {
        var clonedObj = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, <ReferenceClassData<JVMTypes.java_lang_Object>> javaThis.getClass());
        Object.keys(javaThis).forEach((fieldName: string) => {
          (<any> clonedObj)[fieldName] = (<any> javaThis)[fieldName];
        });
        return clonedObj;
      }
    }

    public static 'notify()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): void {
      debug("TE(notify): on lock *" + javaThis.ref);
      javaThis.getMonitor().notify(thread);
    }

    public static 'notifyAll()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): void {
      debug("TE(notifyAll): on lock *" + javaThis.ref);
      javaThis.getMonitor().notifyAll(thread);
    }

    public static 'wait(J)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object, timeout: Long): void {
      debug("TE(wait): on lock *" + javaThis.ref);
      javaThis.getMonitor().wait(thread, (fromTimer: boolean) => {
        thread.asyncReturn();
      }, timeout.toNumber());
    }

  }

  class java_lang_Package {

    public static 'getSystemPackage0(Ljava/lang/String;)Ljava/lang/String;'(thread: JVMThread, pkgNameObj: JVMTypes.java_lang_String): JVMTypes.java_lang_String {
      var pkgName = pkgNameObj.toString();
      // Slice off ending /
      pkgName = pkgName.slice(0, pkgName.length - 1);
      let pkgs = thread.getBsCl().getPackages();
      for (let i = 0; i < pkgs.length; i++) {
        if (pkgs[i][0] === pkgName) {
          // XXX: Ignore secondary load locations.
          return util.initString(thread.getBsCl(), pkgs[i][1][0]);
        }
      }
      // Could not find package.
      return null;
    }

    public static 'getSystemPackages0()[Ljava/lang/String;'(thread: JVMThread): JVMTypes.JVMArray<JVMTypes.java_lang_String> {
      var pkgNames = thread.getBsCl().getPackages();
      // Note: We add / to end of package name, since it appears that is what OpenJDK expects.
      return util.newArrayFromData<JVMTypes.java_lang_String>(thread, thread.getBsCl(), '[Ljava/lang/String;', pkgNames.map((pkgName) => util.initString(thread.getBsCl(), pkgName[0] + "/")));
    }
  }

  class java_lang_ProcessEnvironment {

    public static 'environ()[[B'(thread: JVMThread): JVMTypes.JVMArray<JVMTypes.JVMArray<number>> {
      var envArr = util.newArray<JVMTypes.JVMArray<number>>(thread, thread.getBsCl(), '[[B', 0),
        env = process.env, key: string, v: string, bArr: JVMTypes.JVMArray<number>;
      // convert to an array of strings of the form [key, value, key, value ...]
      for (key in env) {
        v = env[key];
        bArr = util.newArray<number>(thread, thread.getBsCl(), '[B', 0);
        bArr.array = util.bytestr2Array(key);
        envArr.array.push(bArr);
        bArr = util.newArray<number>(thread, thread.getBsCl(), '[B', 0);
        bArr.array = util.bytestr2Array(v);
        envArr.array.push(bArr);
      }
      return envArr;
    }

  }

  class java_lang_reflect_Array {

    public static 'getLength(Ljava/lang/Object;)I'(thread: JVMThread, arr: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): number {
      if (verifyArray(thread, arr)) {
        if (isNotNull(thread, arr)) {
          return arr.array.length;
        }
      }
    }

    public static 'get(Ljava/lang/Object;I)Ljava/lang/Object;'(thread: JVMThread, arr: JVMTypes.JVMArray<any>, idx: number): any {
      var val = arrayGet(thread, arr, idx);
      if (val != null) {
        var component = arr.getClass().getComponentClass();
        if (util.is_primitive_type(component.getInternalName())) {
          // Box primitive values.
          return (<PrimitiveClassData> component).createWrapperObject(thread, val);
        }
      }
      return val;
    }

    public static 'getBoolean(Ljava/lang/Object;I)Z': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;
    public static 'getByte(Ljava/lang/Object;I)B': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;
    public static 'getChar(Ljava/lang/Object;I)C': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;
    public static 'getShort(Ljava/lang/Object;I)S': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;
    public static 'getInt(Ljava/lang/Object;I)I': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;
    public static 'getLong(Ljava/lang/Object;I)J': (thread: JVMThread, arg0: JVMTypes.JVMArray<Long>, arg1: number) => Long = arrayGet;
    public static 'getFloat(Ljava/lang/Object;I)F': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;
    public static 'getDouble(Ljava/lang/Object;I)D': (thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number) => number = arrayGet;

    public static 'set(Ljava/lang/Object;ILjava/lang/Object;)V'(thread: JVMThread, arr: JVMTypes.JVMArray<any>, idx: number, val: JVMTypes.java_lang_Object): void {
      if (verifyArray(thread, arr) && isNotNull(thread, arr)) {
        if (idx < 0 || idx >= arr.array.length) {
          thread.throwNewException('Ljava/lang/ArrayIndexOutOfBoundsException;', 'Tried to write to an illegal index in an array.');
        } else {
          var ccls = arr.getClass().getComponentClass();
          if (ccls instanceof PrimitiveClassData) {
            if (val.getClass().isSubclass(thread.getBsCl().getInitializedClass(thread, (<PrimitiveClassData> ccls).boxClassName()))) {
              var ccname = ccls.getInternalName();
              (<JVMTypes.JVMFunction> (<any> val)[`${util.internal2external[ccname]}Value()${ccname}`])(thread, null, (e?: JVMTypes.java_lang_Throwable, rv?: any) => {
                if (e) {
                  thread.throwException(e);
                } else {
                  arr.array[idx] = rv;
                  thread.asyncReturn();
                }
              });
            } else {
              thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'argument type mismatch');
            }
          } else if (val.getClass().isSubclass(ccls)) {
            arr.array[idx] = val;
          } else {
            thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'argument type mismatch');
          }
        }
      }
    }

    public static 'setBoolean(Ljava/lang/Object;IZ)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setByte(Ljava/lang/Object;IB)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setChar(Ljava/lang/Object;IC)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setShort(Ljava/lang/Object;IS)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setInt(Ljava/lang/Object;II)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setLong(Ljava/lang/Object;IJ)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<Long>, arg1: number, arg2: Long): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setFloat(Ljava/lang/Object;IF)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'setDouble(Ljava/lang/Object;ID)V'(thread: JVMThread, arg0: JVMTypes.JVMArray<number>, arg1: number, arg2: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'newArray(Ljava/lang/Class;I)Ljava/lang/Object;'(thread: JVMThread, cls: JVMTypes.java_lang_Class, len: number): JVMTypes.JVMArray<any> {
      return util.newArray<any>(thread, cls.$cls.getLoader(), `[${cls.$cls.getInternalName()}`, len);
    }

    public static 'multiNewArray(Ljava/lang/Class;[I)Ljava/lang/Object;'(thread: JVMThread, jco: JVMTypes.java_lang_Class, lens: JVMTypes.JVMArray<number>): JVMTypes.JVMArray<any> {
      var typeStr = (new Array(lens.array.length + 1)).join('[') + jco.$cls.getInternalName();
      if (jco.$cls.isInitialized(thread)) {
        return util.multiNewArray<any>(thread, jco.$cls.getLoader(), typeStr, lens.array);
      } else {
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        jco.$cls.initialize(thread, (cls) => {
          thread.asyncReturn(util.multiNewArray<any>(thread, jco.$cls.getLoader(), typeStr, lens.array));
        });
      }
    }

  }

  class java_lang_reflect_Proxy {

    public static 'defineClass0(Ljava/lang/ClassLoader;Ljava/lang/String;[BII)Ljava/lang/Class;'(thread: JVMThread, cl: JVMTypes.java_lang_ClassLoader, name: JVMTypes.java_lang_String, bytes: JVMTypes.JVMArray<number>, offset: number, len: number): JVMTypes.java_lang_Class {
      var loader = util.getLoader(thread, cl),
        cls = loader.defineClass(thread, util.int_classname(name.toString()), util.byteArray2Buffer(bytes.array, offset, len), null);
      if (cls != null) {
        return cls.getClassObject(thread);
      }
    }

  }

  class java_lang_reflect_Executable {
    public static 'getParameters0()[Ljava/lang/reflect/Parameter;'(thread: JVMThread, javaThis: JVMTypes.java_lang_reflect_Executable): any {
      var executable = <any> javaThis,
        clazz: JVMTypes.java_lang_Class = null,
        slot: number = -1,
        method: Method,
        methodParameters: attributes.MethodParameters,
        i: number;

      if (executable['java/lang/reflect/Method/clazz'] !== undefined) {
        clazz = executable['java/lang/reflect/Method/clazz'];
        slot = executable['java/lang/reflect/Method/slot'];
      } else if (executable['java/lang/reflect/Constructor/clazz'] !== undefined) {
        clazz = executable['java/lang/reflect/Constructor/clazz'];
        slot = executable['java/lang/reflect/Constructor/slot'];
      }

      if (clazz === null || slot < 0) {
        return null;
      }

      method = (<ReferenceClassData<JVMTypes.java_lang_Object>> clazz.$cls).getMethodFromSlot(slot);
      methodParameters = <attributes.MethodParameters> method.getAttribute('MethodParameters');
      if (methodParameters === null) {
        return null;
      }

      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      thread.getBsCl().initializeClass(thread, 'Ljava/lang/reflect/Parameter;', (parameterCls: ReferenceClassData<JVMTypes.java_lang_reflect_Parameter>) => {
        var parameterCons = parameterCls.getConstructor(thread),
          rv = util.newArray<JVMTypes.java_lang_reflect_Parameter>(thread, thread.getBsCl(), '[Ljava/lang/reflect/Parameter;', methodParameters.parameters.length);
        for (i = 0; i < methodParameters.parameters.length; i++) {
          var info = methodParameters.parameters[i],
            parameter = new parameterCons(thread);
          parameter['java/lang/reflect/Parameter/name'] = info.name === null ? null : util.initString(thread.getBsCl(), info.name);
          parameter['java/lang/reflect/Parameter/modifiers'] = info.accessFlags;
          parameter['java/lang/reflect/Parameter/executable'] = javaThis;
          parameter['java/lang/reflect/Parameter/index'] = i;
          rv.array[i] = parameter;
        }
        thread.asyncReturn(rv);
      });
    }
  }

  class java_lang_Runtime {

    public static 'availableProcessors()I'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime): number {
      return 1;
    }

    public static 'freeMemory()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime): Long {
      return Long.MAX_VALUE;
    }

    public static 'totalMemory()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime): Long {
      return Long.MAX_VALUE;
    }

    /**
     * Returns the maximum amount of memory that the Java Virtual Machine will
     * attempt to use, in bytes, as a Long. If there is no inherent limit then the
     * value Long.MAX_VALUE will be returned.
     *
     * Currently returns Long.MAX_VALUE because unlike other JVMs Doppio has no
     * hard limit on the heap size.
     */
    public static 'maxMemory()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime): Long {
      return Long.MAX_VALUE;
    }

    /**
     * No universal way of forcing browser to GC, so we yield in hopes
     * that the browser will use it as an opportunity to GC.
     */
    public static 'gc()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      setImmediate(() => {
        thread.asyncReturn();
      });
    }

    public static 'runFinalization0()V'(thread: JVMThread): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'traceInstructions(Z)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime, arg0: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'traceMethodCalls(Z)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Runtime, arg0: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

  }

  class java_lang_SecurityManager {

    public static 'getClassContext()[Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_SecurityManager): JVMTypes.JVMArray<JVMTypes.java_lang_Class> {
      // return an array of classes for each method on the stack
      // starting with the current method and going up the call chain
      return util.newArrayFromData<JVMTypes.java_lang_Class>(thread, thread.getBsCl(), '[Ljava/lang/Class;', thread.getStackTrace().map((item) => item.method.cls.getClassObject(thread)));;
    }

    public static 'currentClassLoader0()Ljava/lang/ClassLoader;'(thread: JVMThread, javaThis: JVMTypes.java_lang_SecurityManager): JVMTypes.java_lang_ClassLoader {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'classDepth(Ljava/lang/String;)I'(thread: JVMThread, javaThis: JVMTypes.java_lang_SecurityManager, arg0: JVMTypes.java_lang_SecurityManager): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return 0;
    }

    public static 'classLoaderDepth0()I'(thread: JVMThread, javaThis: JVMTypes.java_lang_SecurityManager): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return 0;
    }

    public static 'currentLoadedClass0()Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_SecurityManager): JVMTypes.java_lang_Class {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

  }

  class java_lang_Shutdown {

    public static 'halt0(I)V'(thread: JVMThread, status: number): void {
      thread.getJVM().halt(status);
    }

    public static 'runAllFinalizers()V'(thread: JVMThread): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

  }

  class java_lang_StrictMath {

    public static 'sin(D)D'(thread: JVMThread, d_val: number): number {
      return Math.sin(d_val);
    }

    public static 'cos(D)D'(thread: JVMThread, d_val: number): number {
      return Math.cos(d_val);
    }

    public static 'tan(D)D'(thread: JVMThread, d_val: number): number {
      return Math.tan(d_val);
    }

    public static 'asin(D)D'(thread: JVMThread, d_val: number): number {
      return Math.asin(d_val);
    }

    public static 'acos(D)D'(thread: JVMThread, d_val: number): number {
      return Math.acos(d_val);
    }

    public static 'atan(D)D'(thread: JVMThread, d_val: number): number {
      return Math.atan(d_val);
    }

    public static 'exp(D)D'(thread: JVMThread, d_val: number): number {
      return Math.exp(d_val);
    }

    public static 'log(D)D'(thread: JVMThread, d_val: number): number {
      return Math.log(d_val);
    }

    public static 'log10(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).log10(d_val);
    }

    public static 'sqrt(D)D'(thread: JVMThread, d_val: number): number {
      return Math.sqrt(d_val);
    }

    public static 'cbrt(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).cbrt(d_val);
    }

    public static 'IEEEremainder(DD)D'(thread: JVMThread, x: number, y: number): number {
      // Purge off exception values.
      if (x == Number.NEGATIVE_INFINITY || !(x < Number.POSITIVE_INFINITY)
          || y == 0 || y != y)
        return Number.NaN;

      var TWO_1023 = 8.98846567431158e307; // Long bits 0x7fe0000000000000L.

      var negative = x < 0;
      x = Math.abs(x);
      y = Math.abs(y);
      if (x == y || x == 0)
        return 0 * x; // Get correct sign.

      // Achieve x < 2y, then take first shot at remainder.
      if (y < TWO_1023)
        x %= y + y;

      // Now adjust x to get correct precision.
      if (y < 4 / TWO_1023) {
        if (x + x > y) {
          x -= y;
          if (x + x >= y)
            x -= y;
        }
      } else {
        y *= 0.5;
        if (x > y) {
          x -= y;
          if (x >= y)
            x -= y;
        }
      }
      return negative ? -x : x;
    }

    public static 'atan2(DD)D'(thread: JVMThread, y: number, x: number): number {
      return Math.atan2(y, x);
    }

    public static 'pow(DD)D'(thread: JVMThread, base: number, exp: number): number {
      return Math.pow(base, exp);
    }

    public static 'sinh(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).sinh(d_val);
    }

    public static 'cosh(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).cosh(d_val);
    }

    public static 'tanh(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).tanh(d_val);
    }

    public static 'hypot(DD)D'(thread: JVMThread, arg0: number, arg1: number): number {
      return (<any> Math).hypot(arg0, arg1);
    }

    public static 'expm1(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).expm1(d_val);
    }

    public static 'log1p(D)D'(thread: JVMThread, d_val: number): number {
      return (<any> Math).log1p(d_val);
    }

  }

  class java_lang_StackWalker {

    public static 'getCallerClass()Ljava/lang/Class;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): JVMTypes.java_lang_Class {
      if ((<any> javaThis)['java/lang/StackWalker/retainClassRef'] === 0) {
        thread.throwNewException('Ljava/lang/UnsupportedOperationException;', 'This StackWalker does not retain class references');
        return;
      }
      var stack = thread.getStackTrace(),
        skippedImmediateCaller = false;
      for (var i = stack.length - 1; i >= 0; i--) {
        var method = stack[i].method,
          cls = method.cls,
          internalName = cls.getInternalName();
        if (internalName.indexOf('Ljava/lang/StackWalker;') === 0 || internalName.indexOf('Ljava/lang/StackWalker$') === 0) {
          continue;
        }
        if (method.isHidden() || internalName.indexOf('$$Lambda$') !== -1) {
          continue;
        }
        if (internalName.indexOf('Ljava/lang/reflect/') === 0 ||
            internalName.indexOf('Lsun/reflect/') === 0 ||
            internalName.indexOf('Ljdk/internal/reflect/') === 0) {
          continue;
        }
        if (!skippedImmediateCaller) {
          skippedImmediateCaller = true;
          continue;
        }
        return cls.getClassObject(thread);
      }
      thread.throwNewException('Ljava/lang/IllegalCallerException;', 'no caller frame');
      return;
    }

    public static 'getStackFrames()[Ljava/lang/StackWalker$StackFrame;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): void {
      var bsCl = thread.getBsCl(),
        retainClassRef = (<any> javaThis)['java/lang/StackWalker/retainClassRef'] !== 0,
        showHiddenFrames = (<any> javaThis)['java/lang/StackWalker/showHiddenFrames'] !== 0,
        showReflectFrames = (<any> javaThis)['java/lang/StackWalker/showReflectFrames'] !== 0;
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      bsCl.initializeClass(thread, 'Ljava/lang/StackWalker$StackFrameImpl;', (frameCls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (frameCls === null) {
          return;
        }
        bsCl.resolveClass(thread, '[Ljava/lang/StackWalker$StackFrame;', (arrayCls: ArrayClassData<JVMTypes.java_lang_Object>) => {
          if (arrayCls === null) {
            return;
          }
          var stack = thread.getStackTrace(),
            frames: JVMTypes.java_lang_Object[] = [];
          for (var i = stack.length - 1; i >= 0; i--) {
            var sf = stack[i],
              method = sf.method,
              cls = method.cls,
              internalName = cls.getInternalName();
            if (internalName.indexOf('Ljava/lang/StackWalker;') === 0 || internalName.indexOf('Ljava/lang/StackWalker$') === 0) {
              continue;
            }
            if (!showHiddenFrames && (method.isHidden() || internalName.indexOf('$$Lambda$') !== -1)) {
              continue;
            }
            if (!showReflectFrames &&
                (internalName.indexOf('Ljava/lang/reflect/') === 0 ||
                 internalName.indexOf('Lsun/reflect/') === 0 ||
                 internalName.indexOf('Ljdk/internal/reflect/') === 0)) {
              continue;
            }

            var sourceFile: string = null,
              lineNumber = -1,
              frame = util.newObjectFromClass<JVMTypes.java_lang_Object>(thread, frameCls);
            if (method.accessFlags.isNative()) {
              sourceFile = 'Native Method';
            } else {
              var srcAttr = <attributes.SourceFile> cls.getAttribute('SourceFile'),
                code = method.getCodeAttribute(),
                table = code !== null ? <attributes.LineNumberTable> code.getAttribute('LineNumberTable') : null;
              sourceFile = srcAttr !== null ? srcAttr.filename : null;
              lineNumber = table !== null ? table.getLineNumber(sf.pc) : -1;
            }
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/retainClassRef'] = retainClassRef ? 1 : 0;
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/className'] = util.initString(bsCl, util.ext_classname(internalName));
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/methodName'] = util.initString(bsCl, method.name != null ? method.name : 'unknown');
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/declaringClass'] = cls.getClassObject(thread);
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/descriptor'] = util.initString(bsCl, method.rawDescriptor);
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/byteCodeIndex'] = sf.pc;
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/fileName'] = sourceFile !== null ? util.initString(bsCl, sourceFile) : null;
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/lineNumber'] = lineNumber;
            (<any> frame)['java/lang/StackWalker$StackFrameImpl/nativeMethod'] = method.accessFlags.isNative() ? 1 : 0;
            frames.push(frame);
          }
          thread.asyncReturn(util.newArrayFromDataWithClass<JVMTypes.java_lang_Object>(thread, arrayCls, frames));
        });
      });
    }

  }

  class java_lang_ProcessHandle_CurrentProcessHandle {
    public static 'currentPid0()J'(thread: JVMThread): Long {
      return Long.fromNumber(typeof process !== 'undefined' && process.pid !== undefined ? process.pid : 1);
    }

    public static 'parentPid0()J'(thread: JVMThread): Long {
      return Long.fromNumber(typeof process !== 'undefined' && (<any> process).ppid !== undefined ? (<any> process).ppid : 0);
    }
  }

  class java_lang_ProcessHandle_CurrentProcessInfo {
    public static 'currentCommand0()Ljava/lang/String;'(thread: JVMThread): JVMTypes.java_lang_String {
      var bsCl = thread.getBsCl(),
        command = typeof process !== 'undefined' && process.argv !== undefined && process.argv.length > 0 ? process.argv[0] : 'doppio';
      return util.initString(bsCl, command);
    }

    public static 'currentCommandLine0()Ljava/lang/String;'(thread: JVMThread): JVMTypes.java_lang_String {
      var bsCl = thread.getBsCl(),
        commandLine = typeof process !== 'undefined' && process.argv !== undefined && process.argv.length > 0 ? process.argv.join(' ') : 'doppio';
      return util.initString(bsCl, commandLine);
    }

    public static 'currentArguments0()[Ljava/lang/String;'(thread: JVMThread): JVMTypes.JVMArray<JVMTypes.java_lang_String> {
      var bsCl = thread.getBsCl(),
        args = typeof process !== 'undefined' && process.argv !== undefined ? process.argv.slice(2) : [];
      return util.newArrayFromData<JVMTypes.java_lang_String>(thread, bsCl, '[Ljava/lang/String;', args.map((arg: string) => util.initString(bsCl, arg)));
    }

    public static 'currentStartMillis0()J'(thread: JVMThread): Long {
      var startMillis = Date.now();
      if (typeof process !== 'undefined' && (<any> process).uptime !== undefined) {
        startMillis -= (<any> process).uptime() * 1000;
      }
      return Long.fromNumber(Math.max(1, Math.floor(startMillis)));
    }

    public static 'currentTotalCpuNanos0()J'(thread: JVMThread): Long {
      var totalMicros = 1;
      if (typeof process !== 'undefined' && (<any> process).cpuUsage !== undefined) {
        var usage = (<any> process).cpuUsage();
        totalMicros = usage.user + usage.system;
      }
      return Long.fromNumber(Math.max(1, Math.floor(totalMicros * 1000)));
    }
  }

  class java_lang_StackTraceElement {

    public static 'initStackTraceElements([Ljava/lang/StackTraceElement;Ljava/lang/Throwable;)V'(thread: JVMThread, elements: JVMTypes.JVMArray<JVMTypes.java_lang_StackTraceElement>, throwable: JVMTypes.java_lang_Throwable): void {
      var backtrace = (<any> throwable)['java/lang/Throwable/backtrace'],
        frames = getThrowableBacktraceFrames(throwable);
      if (backtrace !== null && backtrace !== undefined && backtrace.array !== undefined) {
        for (var i = 0; i < elements.array.length; i++) {
          elements.array[i] = frames[i];
        }
      } else {
        for (var j = 0; j < elements.array.length; j++) {
          writeStackTraceElement(thread, elements.array[j], frames[j]);
        }
      }
    }

  }

  class java_lang_String {

    public static 'intern()Ljava/lang/String;'(thread: JVMThread, javaThis: JVMTypes.java_lang_String): JVMTypes.java_lang_String {
      return thread.getJVM().internString(javaThis.toString(), javaThis);
    }

  }

  class java_lang_System {

    public static 'setIn0(Ljava/io/InputStream;)V'(thread: JVMThread, stream: JVMTypes.java_io_InputStream): void {
      var sys = util.getStaticFields<typeof JVMTypes.java_lang_System>(thread, thread.getBsCl(), 'Ljava/lang/System;');
      sys['java/lang/System/in'] = stream;
    }

    public static 'setOut0(Ljava/io/PrintStream;)V'(thread: JVMThread, stream: JVMTypes.java_io_PrintStream): void {
      var sys = util.getStaticFields<typeof JVMTypes.java_lang_System>(thread, thread.getBsCl(), 'Ljava/lang/System;');
      sys['java/lang/System/out'] = stream;
    }

    public static 'setErr0(Ljava/io/PrintStream;)V'(thread: JVMThread, stream: JVMTypes.java_io_PrintStream): void {
      var sys = util.getStaticFields<typeof JVMTypes.java_lang_System>(thread, thread.getBsCl(), 'Ljava/lang/System;');
      sys['java/lang/System/err'] = stream;
    }

    public static 'currentTimeMillis()J'(thread: JVMThread): Long {
      return Long.fromNumber((new Date).getTime());
    }

    /**
     * @todo Use performance.now() if available.
     */
    public static 'nanoTime()J'(thread: JVMThread): Long {
      return Long.fromNumber((new Date).getTime()).multiply(Long.fromNumber(1000000));
    }

    public static 'arraycopy(Ljava/lang/Object;ILjava/lang/Object;II)V'(thread: JVMThread, src: JVMTypes.JVMArray<any>, srcPos: number, dest: JVMTypes.JVMArray<any>, destPos: number, length: number): void {
      // Needs to be checked *even if length is 0*.
      if ((src == null) || (dest == null)) {
        thread.throwNewException('Ljava/lang/NullPointerException;', 'Cannot copy to/from a null array.');
      }
      // Can't do this on non-array types. Need to check before I check bounds below, or else I'll get an exception.
      else if (!(src.getClass() instanceof ArrayClassData) || !(dest.getClass() instanceof ArrayClassData)) {
        thread.throwNewException('Ljava/lang/ArrayStoreException;', 'src and dest arguments must be of array type.');
      }
      // Also needs to be checked *even if length is 0*.
      else if (srcPos < 0 || (srcPos + length) > src.array.length || destPos < 0 || (destPos + length) > dest.array.length || length < 0) {
        // System.arraycopy requires IndexOutOfBoundsException, but Java throws an array variant of the exception in practice.
        thread.throwNewException('Ljava/lang/ArrayIndexOutOfBoundsException;', 'Tried to write to an illegal index in an array.');
      } else {
        var srcClass = src.getClass(), destClass = dest.getClass();
        if (srcClass.isCastable(destClass)) {
          // Fast path. arraycopyNoCheck preserves the Java overlap semantics
          // when src and dest are the same array.
          util.arraycopyNoCheck(src, srcPos, dest, destPos, length);
        } else {
          // Slow path
          // Absolutely cannot do this when two different primitive types, or a primitive type and a reference type.
          var srcCompCls = src.getClass().getComponentClass(),
            destCompCls = dest.getClass().getComponentClass();
          if ((srcCompCls instanceof PrimitiveClassData) || (destCompCls instanceof PrimitiveClassData)) {
            thread.throwNewException('Ljava/lang/ArrayStoreException;', 'If calling arraycopy with a primitive array, both src and dest must be of the same primitive type.');
          } else {
            // Must be two reference types.
            util.arraycopyCheck(thread, src, srcPos, dest, destPos, length);
          }
        }
      }
    }

    public static 'identityHashCode(Ljava/lang/Object;)I'(thread: JVMThread, x: JVMTypes.java_lang_Object): number {
      if (x != null && x.ref != null) {
        return x.ref;
      }
      return 0;
    }

    public static 'initProperties(Ljava/util/Properties;)Ljava/util/Properties;'(thread: JVMThread, props: JVMTypes.java_util_Properties): void {
      var jvm = thread.getJVM(),
        properties = jvm.getSystemPropertyNames();
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      util.asyncForEach(properties, (propertyName: string, nextItem: (err?: JVMTypes.java_lang_Throwable) => void) => {
        var propertyVal = jvm.getSystemProperty(propertyName);
        props["setProperty(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/Object;"](thread, [jvm.internString(propertyName), jvm.internString(propertyVal)], nextItem);
      }, (err?: JVMTypes.java_lang_Throwable) => {
        if (err) {
          thread.throwException(err);
        } else {
          thread.asyncReturn(props);
        }
      });
    }

    public static 'mapLibraryName(Ljava/lang/String;)Ljava/lang/String;'(thread: JVMThread, arg0: JVMTypes.java_lang_String): JVMTypes.java_lang_String {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

  }

  class java_lang_Thread {

    public static 'currentThread()Ljava/lang/Thread;'(thread: JVMThread): JVMTypes.java_lang_Thread {
      return thread.getJVMObject();
    }

    public static 'yield()V'(thread: JVMThread): void {
      // Force the thread scheduler to pick another thread by waiting for a short
      // amount of time.
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      setImmediate(() => {
        thread.setStatus(ThreadStatus.RUNNABLE);
        thread.asyncReturn();
      });
    }

    public static 'onSpinWait()V'(thread: JVMThread): void {
      // Java 9 defines this as a spin-loop hint. Doppio has no CPU hint to emit.
    }

    public static 'sleep(J)V'(thread: JVMThread, millis: Long): void {
      var beforeMethod = thread.currentMethod();
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      setTimeout(() => {
        // Check if the thread was interrupted during our sleep. Interrupting
        // sleep causes an exception, so we need to ignore the setTimeout
        // callback in this case.
        if (beforeMethod === thread.currentMethod()) {
          thread.setStatus(ThreadStatus.RUNNABLE);
          thread.asyncReturn();
        }
      }, millis.toNumber());
    }

    public static 'start0()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): void {
      javaThis['run()V'](javaThis.$thread, null);
    }

    public static 'setNativeName(Ljava/lang/String;)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread, name: JVMTypes.java_lang_String): void {
      // NOP. No need to do anything.
    }

    public static 'isInterrupted(Z)Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread, clearFlag: number): boolean {
      var isInterrupted = javaThis.$thread.isInterrupted();
      if (clearFlag) {
        javaThis.$thread.setInterrupted(false);
      }
      return isInterrupted;
    }

    public static 'isAlive()Z'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): boolean {
      var state = javaThis.$thread.getStatus();
      return state !== ThreadStatus.TERMINATED && state !== ThreadStatus.NEW;
    }

    public static 'countStackFrames()I'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): number {
      return javaThis.$thread.getStackTrace().length;
    }

    public static 'holdsLock(Ljava/lang/Object;)Z'(thread: JVMThread, obj: JVMTypes.java_lang_Object): boolean {
      var mon = obj.getMonitor();
      return mon.getOwner() === thread;
    }

    public static 'dumpThreads([Ljava/lang/Thread;)[[Ljava/lang/StackTraceElement;'(thread: JVMThread, arg0: JVMTypes.JVMArray<JVMTypes.java_lang_Thread>): JVMTypes.JVMArray<JVMTypes.JVMArray<JVMTypes.java_lang_StackTraceElement>> {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getThreads()[Ljava/lang/Thread;'(thread: JVMThread): JVMTypes.JVMArray<JVMTypes.java_lang_Thread> {
      return util.newArrayFromData<JVMTypes.java_lang_Thread>(thread, thread.getBsCl(), '[Ljava/lang/Thread;', thread.getThreadPool().getThreads().map((thread: JVMThread) => thread.getJVMObject()));
    }

    public static 'setPriority0(I)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread, arg0: number): void {
      thread.signalPriorityChange();
    }

    public static 'stop0(Ljava/lang/Object;)V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread, arg0: JVMTypes.java_lang_Object): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'suspend0()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'resume0()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    /**
     * Interrupts this thread.
     *
     * Unless the current thread is interrupting itself, which is always
     * permitted, the checkAccess method of this thread is invoked, which may
     * cause a SecurityException to be thrown.
     *
     * - If this thread is blocked in an invocation of the Object.wait(),
     *   wait(long), or Object.wait(long,int) methods of the Object class, or of
     *   the join(), join(long), join(long,int), sleep(long), or sleep(long,int),
     *   methods of this class, then its interrupt status will be cleared and it
     *   will receive an InterruptedException.
     *
     * - If this thread is blocked in an I/O operation upon an
     *   java.nio.channels.InterruptibleChannel then the channel will be closed,
     *   the thread's interrupt status will be set, and the thread will receive a
     *   java.nio.channels.ClosedByInterruptException.
     *
     * - If this thread is blocked in a java.nio.channels.Selector then the
     *   thread's interrupt status will be set and it will return immediately from
     *   the selection operation, possibly with a non-zero value, just as if the
     *   selector's java.nio.channels.Selector.wakeup() method were invoked.
     *
     * - If none of the previous conditions hold then this thread's interrupt
     *   status will be set.
     *
     * Interrupting a thread that is not alive need not have any effect.
     */
    public static 'interrupt0()V'(thread: JVMThread, javaThis: JVMTypes.java_lang_Thread): void {
      function throwInterruptedException() {
        javaThis.$thread.throwNewException('Ljava/lang/InterruptedException;', 'interrupt0 called');
      }

      var nativeThreadObj = javaThis.$thread;
      // See if we have access to modify this thread.
      javaThis['checkAccess()V'](thread, null, (e?: JVMTypes.java_lang_Throwable) => {
        if (e) {
          // SecurityException. Rethrow it.
          thread.throwException(e);
        } else {
          // Check if thread is alive.
          var status = nativeThreadObj.getStatus();
          switch (status) {
            case ThreadStatus.NEW:
            case ThreadStatus.TERMINATED:
              // Thread is not alive. NOP.
              return thread.asyncReturn();
            case ThreadStatus.BLOCKED:
            case ThreadStatus.WAITING:
            case ThreadStatus.TIMED_WAITING:
              // Thread is waiting or blocked on a monitor. Clear interrupted
              // status, and throw an interrupted exception.
              nativeThreadObj.setInterrupted(false);
              // Exit the monitor.
              var monitor = nativeThreadObj.getMonitorBlock();
              if (status === ThreadStatus.BLOCKED) {
                monitor.unblock(nativeThreadObj, true);
                throwInterruptedException();
              } else {
                monitor.unwait(nativeThreadObj, false, true, throwInterruptedException);
              }
              return thread.asyncReturn();
            case ThreadStatus.PARKED:
              // Parked threads become unparked when interrupted.
              thread.getJVM().getParker().completelyUnpark(nativeThreadObj);
              // FALL-THROUGH
            default:
              var threadCls = <ReferenceClassData<JVMTypes.java_lang_Thread>> thread.getBsCl().getInitializedClass(thread, 'Ljava/lang/Thread;'),
                // If we are in the following methods, we throw an InterruptedException:
                interruptMethods: Method[] = [
                  threadCls.methodLookup('join()V'),   // * Thread.join()
                  threadCls.methodLookup('join(J)V'),  // * Thread.join(long)
                  threadCls.methodLookup('join(JI)V'), // * Thread.join(long, int)
                  threadCls.methodLookup('sleep(J)V'), // * Thread.sleep(long)
                  threadCls.methodLookup('sleep(JI)V') // * Thread.sleep(long, int)
                ],
                stackTrace = nativeThreadObj.getStackTrace(),
                currentMethod = stackTrace[stackTrace.length - 1].method,
                currentFullSignature = currentMethod.fullSignature;
              if (interruptMethods.indexOf(currentMethod) !== -1 ||
                  currentFullSignature === 'java/lang/Thread/sleep(Ljava/time/Duration;)V') {
                // Clear interrupt state before throwing the exception.
                nativeThreadObj.setInterrupted(false);
                nativeThreadObj.throwNewException('Ljava/lang/InterruptedException;', 'interrupt0 called');
              } else {
                // Set the interrupted status.
                nativeThreadObj.setInterrupted(true);
              }
              return thread.asyncReturn();
          }
        }
      });
    }

  }

  class java_lang_Throwable {

    /**
     * NOTE: Integer is only there to distinguish this function from non-native fillInStackTrace()V.
     */
    public static 'fillInStackTrace(I)Ljava/lang/Throwable;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Throwable, dummy: number): JVMTypes.java_lang_Throwable {
      var frames: any[] = [],
        cstack = thread.getStackTrace(),
        i: number;
      /**
       * OK, so we need to toss the following stack frames:
       * - The stack frame for this method.
       * - If we're still constructing the throwable object, we need to toss any
       *   stack frames involved in constructing the throwable. But if we're not,
       *   then there's no other frames we should cut.
       */
      cstack.pop(); // The stack frame for this method.
      // Bytecode methods involved in constructing the throwable. We assume that
      // there are no native methods involved in the mix other than this one.
      while (cstack.length > 0 &&
        !cstack[cstack.length - 1].method.accessFlags.isNative() &&
        cstack[cstack.length - 1].locals[0] === javaThis) {
        cstack.pop();
      }

      // Construct the stack such that the method on top of the stack is at index
      // 0.
      for (i = cstack.length - 1; i >= 0; i--) {
        var sf = cstack[i];
        // Java 8: Ignore 'Hidden' methods. These are involved in constructing
        // Lambdas, and shouldn't be use-visible.
        if (sf.method.isHidden()) {
          continue;
        }
        frames.push({ method: sf.method, pc: sf.pc });
      }
      (<any> javaThis)['java/lang/Throwable/backtrace'] = { frames: frames };
      (<any> javaThis)['java/lang/Throwable/depth'] = frames.length;
      return javaThis;
    }

    public static 'getStackTraceDepth()I'(thread: JVMThread, javaThis: JVMTypes.java_lang_Throwable): number {
      // 'backtrace' is typed as an Object so JVMs have flexibility in what to store there.
      // We store either a lazy frame list or, for older objects, the materialized array.
      return getThrowableBacktraceFrames(javaThis).length;
    }

    public static 'getStackTraceElement(I)Ljava/lang/StackTraceElement;'(thread: JVMThread, javaThis: JVMTypes.java_lang_Throwable, depth: number): JVMTypes.java_lang_StackTraceElement {
      var backtrace = (<any> javaThis)['java/lang/Throwable/backtrace'],
        frames = getThrowableBacktraceFrames(javaThis);
      if (backtrace !== null && backtrace !== undefined && backtrace.array !== undefined) {
        return frames[depth];
      }
      var stackTraceElementCls = <ReferenceClassData<JVMTypes.java_lang_StackTraceElement>> thread.getBsCl().getInitializedClass(thread, 'Ljava/lang/StackTraceElement;'),
        element = util.newObjectFromClass<JVMTypes.java_lang_StackTraceElement>(thread, stackTraceElementCls);
      writeStackTraceElement(thread, element, frames[depth]);
      return element;
    }

  }

  class java_lang_UNIXProcess {

    public static 'waitForProcessExit(I)I'(thread: JVMThread, javaThis: JVMTypes.java_lang_UNIXProcess, arg0: number): number {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return 0;
    }

    public static 'forkAndExec(I[B[B[BI[BI[B[IZ)I'(thread: JVMThread, javaThis: JVMTypes.java_lang_UNIXProcess): void {
      thread.throwNewException('Ljava/lang/Error;', "Doppio doesn't support forking processes.");
    }

    public static 'destroyProcess(IZ)V'(thread: JVMThread, arg0: number): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

    public static 'init()V'(thread: JVMThread): void {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
    }

  }

  /**
   * Misc. MemberName-specific constants, enum'd so they get inlined.
   */
  enum MemberNameConstants {
    /* Bit masks for FLAGS for particular types */
    IS_METHOD           = 0x00010000, // method (not constructor)
    IS_CONSTRUCTOR      = 0x00020000, // constructor
    IS_FIELD            = 0x00040000, // field
    IS_TYPE             = 0x00080000, // nested type
    CALLER_SENSITIVE    = 0x00100000, // @CallerSensitive annotation detected
    /* Passed in in matchFlags argument of MHN.getMembers */
    SEARCH_SUPERCLASSES = 0x00100000,
    SEARCH_INTERFACES   = 0x00200000,
    /* Number of bits to shift over the reference kind into the MN's flags. */
    REFERENCE_KIND_SHIFT = 24,
    /* Mask to extract member type. */
    ALL_KINDS = (IS_METHOD | IS_CONSTRUCTOR | IS_FIELD | IS_TYPE)
  }

  /**
   * Given a MemberName object and a reflective field/method/constructor,
   * initializes the member name:
   * - name: Name of the field/method.
   * - clazz: Referenced class that contains the method.
   * - flags: Encodes the reference type of the member and the member's access flags.
   * - type: String encoding of the type (method descriptor, or class name of field type in descriptor form)
   * - vmtarget: Contains the VM-specific pointer to the member (in our case, a Method or Field object)
   * (set clazz, updates flags, sets vmtarget).
   */
  function initializeMemberName(thread: JVMThread, mn: JVMTypes.java_lang_invoke_MemberName, ref: AbstractMethodField) {
    var flags = mn['java/lang/invoke/MemberName/flags'],
      type = mn['java/lang/invoke/MemberName/type'],
      name = mn['java/lang/invoke/MemberName/name'],
      refKind: number,
      existingRefKind = flags >>> MemberNameConstants.REFERENCE_KIND_SHIFT;

    // Determine the reference type.
    if (ref instanceof Method) {
      flags = MemberNameConstants.IS_METHOD;
      if (ref.cls.accessFlags.isInterface()) {
        refKind = MethodHandleReferenceKind.INVOKEINTERFACE;
      } else if (ref.accessFlags.isStatic()) {
        refKind = MethodHandleReferenceKind.INVOKESTATIC;
      } else if (ref.name[0] === '<') {
        flags = MemberNameConstants.IS_CONSTRUCTOR;
        refKind = MethodHandleReferenceKind.INVOKESPECIAL;
      } else {
        refKind = MethodHandleReferenceKind.INVOKEVIRTUAL;
      }
      mn.vmtarget = ref.getVMTargetBridgeMethod(thread, existingRefKind ? existingRefKind : refKind);
      if (refKind === MethodHandleReferenceKind.INVOKEINTERFACE ||
        refKind === MethodHandleReferenceKind.INVOKEVIRTUAL) {
        mn.vmindex = ref.cls.getVMIndexForMethod(ref);
      }
      flags |= (refKind << MemberNameConstants.REFERENCE_KIND_SHIFT) | methodFlags(ref);
    } else {
      flags = MemberNameConstants.IS_FIELD;
      // Assume a GET.
      if (ref.accessFlags.isStatic()) {
        refKind = MethodHandleReferenceKind.GETSTATIC;
      } else {
        refKind = MethodHandleReferenceKind.GETFIELD;
      }
      mn.vmindex = ref.cls.getVMIndexForField(<Field> ref);
      flags |= (refKind << MemberNameConstants.REFERENCE_KIND_SHIFT) | ref.accessFlags.getRawByte();
    }
    // Initialize type if we need to.
    if (type === null) {
      type = thread.getJVM().internString(ref.rawDescriptor);
    }
    // Initialize name if we need to.
    if (name === null) {
      name = thread.getJVM().internString(ref.name);
    }
    mn['java/lang/invoke/MemberName/clazz'] = ref.cls.getClassObject(thread);
    mn['java/lang/invoke/MemberName/flags'] = flags;
    mn['java/lang/invoke/MemberName/type'] = type;
    mn['java/lang/invoke/MemberName/name'] = name;
  }

  /**
   * Returns the MemberName flags for the given method.
   */
  function methodFlags(method: Method): number {
    var flags = method.accessFlags.getRawByte();
    if (method.isCallerSensitive()) {
      flags |= MemberNameConstants.CALLER_SENSITIVE;
    }
    return flags;
  }

  class java_lang_invoke_MethodHandles {
    public static callDoppioHelper(
      thread: JVMThread,
      signature: string,
      args: any[]
    ): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      thread.getBsCl().initializeClass(thread, 'Ljava/lang/invoke/DoppioMethodHandles;', (cdata: ReferenceClassData<JVMTypes.java_lang_Object>) => {
        if (cdata === null) {
          thread.throwNewException('Ljava/lang/NoClassDefFoundError;', 'java.lang.invoke.DoppioMethodHandles');
          return;
        }
        (<any> cdata.getConstructor(thread))[signature](thread, args, (e?: JVMTypes.java_lang_Throwable, rv?: any) => {
          if (e) {
            thread.throwException(e);
          } else {
            thread.asyncReturn(rv);
          }
        });
      });
    }

    public static 'privateLookupIn(Ljava/lang/Class;Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/invoke/MethodHandles$Lookup;'(
      thread: JVMThread,
      targetClass: JVMTypes.java_lang_Class,
      callerLookup: JVMTypes.java_lang_invoke_MethodHandles$Lookup
    ): JVMTypes.java_lang_invoke_MethodHandles$Lookup {
      var targetClassData: ClassData,
        callerModes: number,
        lookupClass: ReferenceClassData<JVMTypes.java_lang_Object>,
        lookupCons: any,
        rv: JVMTypes.java_lang_invoke_MethodHandles$Lookup;

      if (targetClass === null || callerLookup === null) {
        thread.throwNewException('Ljava/lang/NullPointerException;', '');
        return;
      }

      targetClassData = targetClass.$cls;
      if (targetClassData instanceof PrimitiveClassData || targetClassData instanceof ArrayClassData) {
        thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'target class is not a reference class');
        return;
      }

      callerModes = callerLookup['java/lang/invoke/MethodHandles$Lookup/allowedModes'];
      if (callerModes !== -1 && (callerModes & 0x0002) === 0) {
        thread.throwNewException('Ljava/lang/IllegalAccessException;', 'caller does not have private lookup access');
        return;
      }

      lookupClass = <ReferenceClassData<JVMTypes.java_lang_Object>> callerLookup.getClass();
      lookupCons = lookupClass.getConstructor(thread);
      rv = new lookupCons(thread);
      rv['java/lang/invoke/MethodHandles$Lookup/lookupClass'] = targetClass;
      rv['java/lang/invoke/MethodHandles$Lookup/allowedModes'] = 0x000f;
      return rv;
    }

    public static 'zero(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      type: JVMTypes.java_lang_Class
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/zero(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;',
        [type]
      );
    }

    public static 'empty(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      type: JVMTypes.java_lang_invoke_MethodType
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/empty(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;',
        [type]
      );
    }

    public static 'arrayLength(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      arrayClass: JVMTypes.java_lang_Class
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/arrayLength(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;',
        [arrayClass]
      );
    }

    public static 'arrayConstructor(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      arrayClass: JVMTypes.java_lang_Class
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/arrayConstructor(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;',
        [arrayClass]
      );
    }

    public static 'dropArgumentsToMatch(Ljava/lang/invoke/MethodHandle;ILjava/util/List;I)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      target: JVMTypes.java_lang_invoke_MethodHandle,
      skip: number,
      newTypes: JVMTypes.java_util_List,
      pos: number
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/dropArgumentsToMatch(Ljava/lang/invoke/MethodHandle;ILjava/util/List;I)Ljava/lang/invoke/MethodHandle;',
        [target, skip, newTypes, pos]
      );
    }

    public static 'dropReturn(Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      target: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/dropReturn(Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [target]
      );
    }

    public static 'foldArguments(Ljava/lang/invoke/MethodHandle;ILjava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      target: JVMTypes.java_lang_invoke_MethodHandle,
      pos: number,
      combiner: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/foldArguments(Ljava/lang/invoke/MethodHandle;ILjava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [target, pos, combiner]
      );
    }

    public static 'whileLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      init: JVMTypes.java_lang_invoke_MethodHandle,
      pred: JVMTypes.java_lang_invoke_MethodHandle,
      body: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/whileLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [init, pred, body]
      );
    }

    public static 'doWhileLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      init: JVMTypes.java_lang_invoke_MethodHandle,
      body: JVMTypes.java_lang_invoke_MethodHandle,
      pred: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/doWhileLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [init, body, pred]
      );
    }

    public static 'countedLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      iterations: JVMTypes.java_lang_invoke_MethodHandle,
      init: JVMTypes.java_lang_invoke_MethodHandle,
      body: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/countedLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [iterations, init, body]
      );
    }

    public static 'countedLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      start: JVMTypes.java_lang_invoke_MethodHandle,
      end: JVMTypes.java_lang_invoke_MethodHandle,
      init: JVMTypes.java_lang_invoke_MethodHandle,
      body: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/countedLoop(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [start, end, init, body]
      );
    }

    public static 'tryFinally(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      target: JVMTypes.java_lang_invoke_MethodHandle,
      cleanup: JVMTypes.java_lang_invoke_MethodHandle
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/tryFinally(Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;',
        [target, cleanup]
      );
    }
  }

  class java_lang_invoke_MethodHandleNatives {
    /**
     * I'm going by JAMVM's implementation of this method, which is very easy
     * to understand:
     * http://sourceforge.net/p/jamvm/code/ci/master/tree/src/classlib/openjdk/mh.c#l388
     *
     * The second argument is a Reflection object for the specified member,
     * which is either a Field, Method, or Constructor.
     *
     * We need to:
     * * Set "clazz" field to item's declaring class in the reflection object.
     * * Set "flags" field to items's flags, OR'd with its type (method/field/
     *   constructor), and OR'd with its reference kind shifted up by 24.
     * * Set "vmtarget" if relevant.
     * * Set "vmindex" if relevant.
     *
     * This method "resolves" the MemberName unambiguously using the provided
     * reflection object.
     *
     */
    public static 'init(Ljava/lang/invoke/MemberName;Ljava/lang/Object;)V'(thread: JVMThread, self: JVMTypes.java_lang_invoke_MemberName, ref: JVMTypes.java_lang_Object): void {
      var clazz: JVMTypes.java_lang_Class,
        clazzData: ReferenceClassData<JVMTypes.java_lang_Class>,
        flags: number, m: Method, f: Field;
      switch (ref.getClass().getInternalName()) {
        case "Ljava/lang/reflect/Method;":
          var methodObj = <JVMTypes.java_lang_reflect_Method> ref, refKind:  number;
          clazz = methodObj['java/lang/reflect/Method/clazz'];
          clazzData = (<ReferenceClassData<JVMTypes.java_lang_Class>> clazz.$cls);
          m = clazzData.getMethodFromSlot(methodObj['java/lang/reflect/Method/slot']);
          flags = methodFlags(m) | MemberNameConstants.IS_METHOD;
          if (m.accessFlags.isStatic()) {
            refKind = MethodHandleReferenceKind.INVOKESTATIC;
          } else if (clazzData.accessFlags.isInterface()) {
            refKind = MethodHandleReferenceKind.INVOKEINTERFACE;
          } else {
            refKind = MethodHandleReferenceKind.INVOKEVIRTUAL;
          }
          flags |= refKind << MemberNameConstants.REFERENCE_KIND_SHIFT;

          self['java/lang/invoke/MemberName/clazz'] = clazz;
          self['java/lang/invoke/MemberName/flags'] = flags;
          self.vmtarget = m.getVMTargetBridgeMethod(thread, refKind);
          // Only set vmindex for virtual dispatch.
          if (refKind === MethodHandleReferenceKind.INVOKEVIRTUAL || refKind === MethodHandleReferenceKind.INVOKEINTERFACE) {
            self.vmindex = clazzData.getVMIndexForMethod(m);
          }
          break;
        case "Ljava/lang/reflect/Constructor;":
          var consObj = <JVMTypes.java_lang_reflect_Constructor> ref;
          clazz = consObj['java/lang/reflect/Constructor/clazz'];
          clazzData = (<ReferenceClassData<JVMTypes.java_lang_Class>> clazz.$cls);
          m = clazzData.getMethodFromSlot(consObj['java/lang/reflect/Constructor/slot']);
          flags = methodFlags(m) | MemberNameConstants.IS_CONSTRUCTOR | (MethodHandleReferenceKind.INVOKESPECIAL << MemberNameConstants.REFERENCE_KIND_SHIFT);
          self['java/lang/invoke/MemberName/clazz'] = clazz;
          self['java/lang/invoke/MemberName/flags'] = flags;
          self.vmtarget = m.getVMTargetBridgeMethod(thread, refKind);
          // vmindex not relevant; nonvirtual dispatch.
          break;
        case "Ljava/lang/reflect/Field;":
          var fieldObj = <JVMTypes.java_lang_reflect_Field> ref;
          clazz = fieldObj['java/lang/reflect/Field/clazz'];
          clazzData = (<ReferenceClassData<JVMTypes.java_lang_Class>> clazz.$cls);
          f = clazzData.getFieldFromSlot(fieldObj['java/lang/reflect/Field/slot']);
          flags = f.accessFlags.getRawByte() | MemberNameConstants.IS_FIELD;
          flags |= (f.accessFlags.isStatic() ? MethodHandleReferenceKind.GETSTATIC : MethodHandleReferenceKind.GETFIELD) << MemberNameConstants.REFERENCE_KIND_SHIFT;

          self['java/lang/invoke/MemberName/clazz'] = clazz;
          self['java/lang/invoke/MemberName/flags'] = flags;
          self.vmindex = clazzData.getVMIndexForField(f);
          // vmtarget not relevant.
          break;
        default:
          thread.throwNewException("Ljava/lang/InternalError;", "init: Invalid target.");
          break;
      }
    }

    public static 'getConstant(I)I'(thread: JVMThread, arg0: number): number {
      // I have no idea what the semantics are, but returning 0 disables some internal MH-related counting.
      return 0;
    }

    /**
     * I'm going by JAMVM's implementation of resolve:
     * http://sourceforge.net/p/jamvm/code/ci/master/tree/src/classlib/openjdk/mh.c#l1266
     * @todo It doesn't do anything with the lookupClass... is that for permission checks?
     *
     * Input: A MemberName object that already has a name, reference kind, and class set.
     * Uses that info to resolve a concrete method, and then updates the MemberName's flags,
     * sets "vmtarget", and sets "vmindex".
     */
    public static 'resolve(Ljava/lang/invoke/MemberName;Ljava/lang/Class;)Ljava/lang/invoke/MemberName;'(thread: JVMThread, memberName: JVMTypes.java_lang_invoke_MemberName, lookupClass: JVMTypes.java_lang_Class): JVMTypes.java_lang_invoke_MemberName {
      var type = memberName['java/lang/invoke/MemberName/type'],
        name = memberName['java/lang/invoke/MemberName/name'].toString(),
        clazz = <ReferenceClassData<JVMTypes.java_lang_Object>> memberName['java/lang/invoke/MemberName/clazz'].$cls,
        lookupCls = lookupClass !== null && lookupClass.$cls instanceof ReferenceClassData ?
          <ReferenceClassData<JVMTypes.java_lang_Object>> lookupClass.$cls : null,
        flags = memberName['java/lang/invoke/MemberName/flags'],
        refKind = flags >>> MemberNameConstants.REFERENCE_KIND_SHIFT;

      if (clazz == null || name == null || type == null) {
        thread.throwNewException("Ljava/lang/IllegalArgumentException;", "Invalid MemberName.");
        return;
      }

      assert((flags & MemberNameConstants.CALLER_SENSITIVE) === 0, "Not yet supported: Caller sensitive methods.");
      switch (flags & MemberNameConstants.ALL_KINDS) {
        case MemberNameConstants.IS_CONSTRUCTOR:
        case MemberNameConstants.IS_METHOD:
          // Need to perform method lookup.
          var methodTarget = clazz.signaturePolymorphicAwareMethodLookup(name + (<JVMTypes.java_lang_invoke_MethodType> type).toString());
          if (methodTarget !== null) {
            flags |= methodFlags(methodTarget);
            if (methodTarget.accessFlags.isPrivate() && lookupCls !== null &&
              lookupCls !== methodTarget.cls && lookupCls.isNestmateOf(methodTarget.cls)) {
              // Doppio's Java 8 MethodHandles.Lookup does not know Java 11 nestmates.
              flags = (flags & ~(util.FlagMasks.PUBLIC | util.FlagMasks.PRIVATE | util.FlagMasks.PROTECTED)) | util.FlagMasks.PUBLIC;
            }
            memberName['java/lang/invoke/MemberName/flags'] = flags;
            memberName.vmtarget = methodTarget.getVMTargetBridgeMethod(thread, flags >>> MemberNameConstants.REFERENCE_KIND_SHIFT);
            // vmindex is only relevant for virtual dispatch.
            if (refKind === MethodHandleReferenceKind.INVOKEINTERFACE || refKind === MethodHandleReferenceKind.INVOKEVIRTUAL) {
              memberName.vmindex = clazz.getVMIndexForMethod(methodTarget);
            }
            return memberName;
          } else {
            thread.throwNewException('Ljava/lang/NoSuchMethodError;', `Invalid method ${name + (<JVMTypes.java_lang_invoke_MethodType> type).toString()} in class ${clazz.getExternalName()}.`);
          }
          break;
        case MemberNameConstants.IS_FIELD:
          var fieldTarget = clazz.fieldLookup(name);
          if (fieldTarget !== null) {
            flags |= fieldTarget.accessFlags.getRawByte();
            if (fieldTarget.accessFlags.isPrivate() && lookupCls !== null &&
              lookupCls !== fieldTarget.cls && lookupCls.isNestmateOf(fieldTarget.cls)) {
              flags = (flags & ~(util.FlagMasks.PUBLIC | util.FlagMasks.PRIVATE | util.FlagMasks.PROTECTED)) | util.FlagMasks.PUBLIC;
            }
            memberName['java/lang/invoke/MemberName/flags'] = flags;
            memberName.vmindex = clazz.getVMIndexForField(fieldTarget);
            return memberName;
          } else {
            thread.throwNewException('Ljava/lang/NoSuchFieldError;', `Invalid method ${name} in class ${clazz.getExternalName()}.`);
          }
          break;
        default:
          thread.throwNewException('Ljava/lang/LinkageError;', 'resolve member name');
          break;
      }
    }

    /**
     * Follows the same logic as sun.misc.Unsafe's objectFieldOffset.
     */
    public static 'objectFieldOffset(Ljava/lang/invoke/MemberName;)J'(thread: JVMThread, memberName: JVMTypes.java_lang_invoke_MemberName): Long {
      if (memberName['vmindex'] === -1) {
        thread.throwNewException("Ljava/lang/IllegalStateException;", "Attempted to retrieve the object offset for an unresolved or non-object MemberName.");
      } else {
        return Long.fromNumber(memberName.vmindex);
      }
    }

    /**
     * Follows the same logic as sun.misc.Unsafe's staticFieldOffset.
     */
    public static 'staticFieldOffset(Ljava/lang/invoke/MemberName;)J'(thread: JVMThread, memberName: JVMTypes.java_lang_invoke_MemberName): Long {
      if (memberName['vmindex'] === -1) {
        thread.throwNewException("Ljava/lang/IllegalStateException;", "Attempted to retrieve the object offset for an unresolved or non-object MemberName.");
      } else {
        return Long.fromNumber(memberName.vmindex);
      }
    }

    /**
     * Follows the same logic as sun.misc.Unsafe's staticFieldBase.
     */
    public static 'staticFieldBase(Ljava/lang/invoke/MemberName;)Ljava/lang/Object;'(thread: JVMThread, memberName: JVMTypes.java_lang_invoke_MemberName): JVMTypes.java_lang_Object {
      // Return a special JVM object.
      // TODO: Actually create a special DoppioJVM class for this.
      var rv = new ((<ReferenceClassData<JVMTypes.java_lang_Object>> thread.getBsCl().getInitializedClass(thread, 'Ljava/lang/Object;')).getConstructor(thread))(thread);
      (<any> rv).$staticFieldBase = memberName['java/lang/invoke/MemberName/clazz'].$cls;
      return rv;
    }

    /**
     * Get the members of the given class that match the specified flags, skipping
     * the specified number of members. For each non-skipped matching member,
     * fill in the fields of a MemberName objects in the results array.
     * If there are more matches than can fit in the array, do *not* overrun
     * the array. Return the total number of matching non-skipped members.
     * TODO: Access checks?
     */
    public static 'getMembers(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/String;ILjava/lang/Class;I[Ljava/lang/invoke/MemberName;)I'(
      thread: JVMThread, defc: JVMTypes.java_lang_Class,
      matchName: JVMTypes.java_lang_String, matchSig: JVMTypes.java_lang_String,
      matchFlags: number, caller: JVMTypes.java_lang_Class, skip: number,
      results: JVMTypes.JVMArray<JVMTypes.java_lang_invoke_MemberName>
    ): number {
      // General search flags.
      var searchSuperclasses = 0 !== (matchFlags & MemberNameConstants.SEARCH_SUPERCLASSES),
        searchInterfaces = 0 !== (matchFlags & MemberNameConstants.SEARCH_INTERFACES),
        matched = 0, targetClass = defc.$cls, methods: Method[],
        fields: Field[], matchArray = results.array,
        name: string = matchName !== null ? matchName.toString() : null,
        sig: string = matchSig !== null ? matchSig.toString() : null;

      /**
       * Helper function: Adds matched items to the array once we've skipped
       * enough.
       */
      function addMatch(item: AbstractMethodField) {
        if (skip >= 0) {
          if (matched < matchArray.length) {
            initializeMemberName(thread, matchArray[matched], item);
          }
          matched++;
        } else {
          skip--;
        }
      }

      // TODO: Support these flags.
      assert(!searchSuperclasses && !searchInterfaces, "Unsupported: Non-local getMembers calls.");

      // Constructors
      if (0 !== (matchFlags & MemberNameConstants.IS_CONSTRUCTOR) && (name === null || name === "<init>")) {
        methods = targetClass.getMethods();
        methods.forEach((m: Method) => {
          if (m.name === "<init>" && (sig === null || sig === m.rawDescriptor)) {
            addMatch(m);
          }
        });
      }

      // Methods
      if (0 !== (matchFlags & MemberNameConstants.IS_METHOD)) {
        methods = targetClass.getMethods();
        methods.forEach((m: Method) => {
          if (m.name !== "<init>" && (name === null || name === m.name) && (sig === null || sig === m.rawDescriptor)) {
            addMatch(m);
          }
        });
      }

      // Fields
      if (0 !== (matchFlags & MemberNameConstants.IS_FIELD) && sig === null) {
        fields = targetClass.getFields();
        fields.forEach((f: Field) => {
          if (name === null || name === f.name) {
            addMatch(f);
          }
        });
      }

      // TODO: Inner types (IS_TYPE).
      assert(0 == (matchFlags & MemberNameConstants.IS_TYPE), "Unsupported: Getting inner type MemberNames.");
      return matched;
    }

    /**
     * Debug native in the JDK: Gets a named constant from MethodHandleNatives.Constants.
     */
    public static 'getNamedCon(I[Ljava/lang/Object;)I'(thread: JVMThread, fieldNum: number, args: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): void {
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      thread.getBsCl().initializeClass(thread, "Ljava/lang/invoke/MethodHandleNatives$Constants;", (constantsCls: ReferenceClassData<JVMTypes.java_lang_invoke_MethodHandleNatives$Constants>) => {
        if (constantsCls === null) {
          return;
        }
        var constants = constantsCls.getFields().filter((field: Field) => field.accessFlags.isStatic() && field.accessFlags.isFinal());
        if (fieldNum < constants.length) {
          var field = constants[fieldNum];
          args.array[0] = util.initString(thread.getBsCl(), field.name);
          thread.asyncReturn((<any> constantsCls.getConstructor(thread))[field.fullName]);
        } else {
          thread.asyncReturn(-1);
        }
      });
    }

    public static 'getMemberVMInfo(Ljava/lang/invoke/MemberName;)Ljava/lang/Object;'(thread: JVMThread, mname: JVMTypes.java_lang_invoke_MemberName): JVMTypes.java_lang_Object {
      var rv = util.newArray(thread, thread.getBsCl(), '[Ljava/lang/Object;', 2),
        flags = mname['java/lang/invoke/MemberName/flags'],
        refKind = flags >>> MemberNameConstants.REFERENCE_KIND_SHIFT,
        longCls = (<PrimitiveClassData> thread.getBsCl().getInitializedClass(thread, 'J'));

      // VMIndex of the target.
      rv.array[0] = longCls.createWrapperObject(thread, Long.fromNumber(mname.vmindex));
      // Class if field, membername if method
      rv.array[1] = (((flags & MemberNameConstants.ALL_KINDS) & MemberNameConstants.IS_FIELD) > 0) ? mname['java/lang/invoke/MemberName/clazz'] : mname;
      return rv;
    }

    public static 'setCallSiteTargetNormal(Ljava/lang/invoke/CallSite;Ljava/lang/invoke/MethodHandle;)V'(thread: JVMThread, callSite: JVMTypes.java_lang_invoke_CallSite, methodHandle: JVMTypes.java_lang_invoke_MethodHandle): void {
      callSite['java/lang/invoke/CallSite/target'] = methodHandle;
    }
  }

  class java_lang_invoke_MethodHandle {
    public static 'asCollector(ILjava/lang/Class;I)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      mh: JVMTypes.java_lang_invoke_MethodHandle,
      pos: number,
      arrayType: JVMTypes.java_lang_Class,
      arrayLength: number
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/asCollector(Ljava/lang/invoke/MethodHandle;ILjava/lang/Class;I)Ljava/lang/invoke/MethodHandle;',
        [mh, pos, arrayType, arrayLength]
      );
    }

    public static 'asSpreader(ILjava/lang/Class;I)Ljava/lang/invoke/MethodHandle;'(
      thread: JVMThread,
      mh: JVMTypes.java_lang_invoke_MethodHandle,
      pos: number,
      arrayType: JVMTypes.java_lang_Class,
      arrayLength: number
    ): void {
      java_lang_invoke_MethodHandles.callDoppioHelper(
        thread,
        'java/lang/invoke/DoppioMethodHandles/asSpreader(Ljava/lang/invoke/MethodHandle;ILjava/lang/Class;I)Ljava/lang/invoke/MethodHandle;',
        [mh, pos, arrayType, arrayLength]
      );
    }

    /**
     * Invokes the method handle, allowing any caller type descriptor, but requiring an exact type match.
     *
     * If this native method is invoked directly via java.lang.reflect.Method.invoke,
     * via JNI, or indirectly via java.lang.invoke.MethodHandles.Lookup.unreflect,
     * it will throw an UnsupportedOperationException.
     *
     * @throws WrongMethodTypeException if the target's type is not identical with the caller's symbolic type descriptor
     * @throws Throwable anything thrown by the underlying method propagates unchanged through the method handle call
     */
    public static 'invokeExact([Ljava/lang/Object;)Ljava/lang/Object;'(thread: JVMThread, mh: JVMTypes.java_lang_invoke_MethodHandle, args: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): void {
      // Like other JVMs, we bake the semantics of invoke/invokeExact directly
      // into the bytecode. Thus, this version of the method will *only* be
      // invoked via reflection, causing this exception.
      thread.throwNewException("Ljava/lang/UnsupportedOperationException;", "MethodHandle.invokeExact cannot be invoked reflectively");
    }

    public static 'invoke([Ljava/lang/Object;)Ljava/lang/Object;'(thread: JVMThread, mh: JVMTypes.java_lang_invoke_MethodHandle, args: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): void {
      // Like other JVMs, we bake the semantics of invoke/invokeExact directly
      // into the bytecode. Thus, this version of the method will *only* be
      // invoked via reflection, causing this exception.
      thread.throwNewException("Ljava/lang/UnsupportedOperationException;", "MethodHandle.invoke cannot be invoked reflectively");
    }

    /**
     * Unlike invoke and invokeExact, invokeBasic *can* be invoked reflectively,
     * and thus it has an implementation here. Note that invokeBasic is private,
     * and thus can only be invoked by trusted OpenJDK code.
     *
     * When invoked reflectively, arguments to invokeBasic will be boxed.
     *
     * The return value is *never* boxed. Yes, this is weird. It's only called by
     * trusted code, though.
     */
    public static 'invokeBasic([Ljava/lang/Object;)Ljava/lang/Object;'(thread: JVMThread, mh: JVMTypes.java_lang_invoke_MethodHandle, argsBoxed: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): void {
      var lmbdaForm = mh['java/lang/invoke/MethodHandle/form'],
        mn = lmbdaForm['java/lang/invoke/LambdaForm/vmentry'],
        descriptor: string, paramTypes: string[];

      assert(mh.getClass().isCastable(thread.getBsCl().getInitializedClass(thread, 'Ljava/lang/invoke/MethodHandle;')), "First argument to invokeBasic must be a method handle.");
      assert(mn.vmtarget !== null && mn.vmtarget !== undefined, "vmtarget must be defined");

      assert(mn['java/lang/invoke/MemberName/type'].getClass().getInternalName() === 'Ljava/lang/invoke/MethodType;', "Expected a MethodType object.");
      descriptor = (<JVMTypes.java_lang_invoke_MethodType> mn['java/lang/invoke/MemberName/type']).toString();
      paramTypes = util.getTypes(descriptor);
      // Remove return value.
      paramTypes.pop();
      // Remove method handle; it's not boxed.
      paramTypes.shift();
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      // Need to include methodhandle in the arguments to vmtarget, which handles
      // invoking it appropriately.
      mn.vmtarget(thread, descriptor, [mh].concat(util.unboxArguments(thread, paramTypes, argsBoxed.array)), (e: JVMTypes.java_lang_Throwable, rv: any) => {
        if (e) {
          thread.throwException(e);
        } else {
          thread.asyncReturn(rv);
        }
      });
    }
  }

  return {
    'java/lang/Class': java_lang_Class,
    'java/lang/ClassLoader$NativeLibrary': java_lang_ClassLoader$NativeLibrary,
    'java/lang/ClassLoader': java_lang_ClassLoader,
    'java/lang/Compiler': java_lang_Compiler,
    'java/lang/Double': java_lang_Double,
    'java/lang/Float': java_lang_Float,
    'java/lang/Object': java_lang_Object,
    'java/lang/Package': java_lang_Package,
    'java/lang/ProcessHandle$CurrentProcessHandle': java_lang_ProcessHandle_CurrentProcessHandle,
    'java/lang/ProcessHandle$CurrentProcessInfo': java_lang_ProcessHandle_CurrentProcessInfo,
    'java/lang/ProcessEnvironment': java_lang_ProcessEnvironment,
    'java/lang/reflect/Array': java_lang_reflect_Array,
    'java/lang/reflect/Executable': java_lang_reflect_Executable,
    'java/lang/reflect/Proxy': java_lang_reflect_Proxy,
    'java/lang/Runtime': java_lang_Runtime,
    'java/lang/SecurityManager': java_lang_SecurityManager,
    'java/lang/Shutdown': java_lang_Shutdown,
    'java/lang/StrictMath': java_lang_StrictMath,
    'java/lang/StackWalker': java_lang_StackWalker,
    'java/lang/StackTraceElement': java_lang_StackTraceElement,
    'java/lang/String': java_lang_String,
    'java/lang/System': java_lang_System,
    'java/lang/Thread': java_lang_Thread,
    'java/lang/Throwable': java_lang_Throwable,
    'java/lang/UNIXProcess': java_lang_UNIXProcess,
    'java/lang/invoke/MethodHandles': java_lang_invoke_MethodHandles,
    'java/lang/invoke/MethodHandleNatives': java_lang_invoke_MethodHandleNatives,
    'java/lang/invoke/MethodHandle': java_lang_invoke_MethodHandle
  };
};
