import * as Doppio from '../doppiojvm';
import * as JVMTypes from '../../includes/JVMTypes';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ClassData = Doppio.VM.ClassFile.ClassData;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import ArrayClassData = Doppio.VM.ClassFile.ArrayClassData;
import ThreadStatus = Doppio.VM.Enums.ThreadStatus;
import util = Doppio.VM.Util;
import {VarHandleStorageCapability, captureVarHandleField, operateVarHandleStorage,
  varHandleStorageMode, isVarHandleStorageModeSupported} from '../VarHandleStorage';

interface StoredVarHandle extends JVMTypes.java_lang_Object {
  $varHandleCapability?: VarHandleStorageCapability;
}

export default function (): any {
  function capture(thread: JVMThread, owner: JVMTypes.java_lang_Class,
      name: JVMTypes.java_lang_String, valueType: JVMTypes.java_lang_Class, isStatic: number) {
    if (owner === null || name === null || valueType === null) {
      thread.throwNewException('Ljava/lang/NullPointerException;', 'Null VarHandle field metadata');
      return null;
    }
    var field = owner.$cls instanceof ReferenceClassData ? captureVarHandleField(
      <ReferenceClassData<JVMTypes.java_lang_Object>> owner.$cls,
      name.toString(), valueType.$cls.getInternalName(), isStatic !== 0) : null;
    if (field === null) thread.throwNewException('Ljava/lang/InternalError;', 'Unresolved VarHandle field capability');
    return field;
  }

  function install(thread: JVMThread, handle: StoredVarHandle, capability: VarHandleStorageCapability): void {
    if (handle === null) {
      thread.throwNewException('Ljava/lang/NullPointerException;', 'Null VarHandle');
      return;
    }
    if (Object.prototype.hasOwnProperty.call(handle, '$varHandleCapability')) {
      if (handle.$varHandleCapability !== capability) {
        thread.throwNewException('Ljava/lang/InternalError;', 'VarHandle capability is already captured');
      }
      return;
    }
    // This is private VM metadata, not a declared/reflected Java field. Views
    // retain the same exact declaration/array identity and readonly policy.
    Object.defineProperty(handle, '$varHandleCapability', {value: capability});
  }

  class DoppioVarHandles {
    public static 'fieldIsFinal(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)Z'(
        thread: JVMThread, owner: JVMTypes.java_lang_Class, name: JVMTypes.java_lang_String,
        valueType: JVMTypes.java_lang_Class, isStatic: number): boolean {
      var field = capture(thread, owner, name, valueType, isStatic);
      return field === null ? undefined : field.accessFlags.isFinal();
    }

    public static 'captureField(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)V'(
        thread: JVMThread, handle: StoredVarHandle, owner: JVMTypes.java_lang_Class,
        name: JVMTypes.java_lang_String, valueType: JVMTypes.java_lang_Class, isStatic: number): void {
      var field = capture(thread, owner, name, valueType, isStatic);
      if (field !== null) install(thread, handle, Object.freeze({field, readonly: field.accessFlags.isFinal()}));
    }

    public static 'captureArray(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;)V'(
        thread: JVMThread, handle: StoredVarHandle, arrayType: JVMTypes.java_lang_Class): void {
      if (arrayType === null) {
        thread.throwNewException('Ljava/lang/NullPointerException;', 'Null VarHandle array class');
        return;
      }
      if (!(arrayType.$cls instanceof ArrayClassData)) {
        thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'Not a VarHandle array class');
        return;
      }
      install(thread, handle, Object.freeze({arrayClass: arrayType.$cls, readonly: false}));
    }

    public static 'copyStorage(Ljava/lang/invoke/VarHandle;Ljava/lang/invoke/VarHandle;)V'(
        thread: JVMThread, original: StoredVarHandle, copy: StoredVarHandle): void {
      if (original === null || copy === null) {
        thread.throwNewException('Ljava/lang/NullPointerException;', 'Null VarHandle view');
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(original, '$varHandleCapability')) {
        thread.throwNewException('Ljava/lang/InternalError;', 'VarHandle storage was not captured');
        return;
      }
      install(thread, copy, original.$varHandleCapability);
    }

    public static 'operate(Ljava/lang/invoke/VarHandle;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/Object;'(
        thread: JVMThread, handle: StoredVarHandle, modeName: JVMTypes.java_lang_String,
        values: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): JVMTypes.java_lang_Object {
      if (handle === null || modeName === null || values === null) {
        thread.throwNewException('Ljava/lang/NullPointerException;', 'Null VarHandle operation argument');
        return;
      }
      var capability = Object.prototype.hasOwnProperty.call(handle, '$varHandleCapability') ?
          handle.$varHandleCapability : null,
        name = modeName.toString(), mode = varHandleStorageMode(name);
      if (capability === null) {
        thread.throwNewException('Ljava/lang/InternalError;', 'VarHandle storage was not captured');
        return;
      }
      if (mode === null) {
        thread.throwNewException('Ljava/lang/IllegalArgumentException;', 'Unknown VarHandle access mode');
        return;
      }
      if (!isVarHandleStorageModeSupported(capability, name)) {
        thread.throwNewException('Ljava/lang/UnsupportedOperationException;', 'Unsupported VarHandle access mode');
        return;
      }
      var field = capability.field,
        descriptor = field ? field.rawDescriptor : capability.arrayClass.getComponentClass().getInternalName(),
        parameters: string[] = field ? (field.accessFlags.isStatic() ? [] : [field.cls.getInternalName()]) :
          [capability.arrayClass.getInternalName(), 'I'];
      for (var argument = 0; argument < mode.valueArity; argument++) parameters.push(descriptor);
      if (values.array.length !== parameters.length) {
        thread.throwNewException('Ljava/lang/invoke/WrongMethodTypeException;', 'Incorrect VarHandle argument count');
        return;
      }
      for (var parameter = 0; parameter < parameters.length; parameter++) {
        if (util.is_primitive_type(parameters[parameter])) {
          if (values.array[parameter] === null) {
            thread.throwNewException('Ljava/lang/NullPointerException;', 'Null canonical VarHandle primitive');
            return;
          }
          if (typeof (<any> values.array[parameter]).unbox !== 'function') {
            thread.throwNewException('Ljava/lang/ClassCastException;', 'Incorrect canonical VarHandle primitive');
            return;
          }
        }
      }
      var padded = util.unboxArguments(thread, parameters, values.array), logical: any[] = [], slot = 0;
      for (var logicalParameter = 0; logicalParameter < parameters.length; logicalParameter++) {
        logical.push(padded[slot]);
        slot += parameters[logicalParameter] === 'J' || parameters[logicalParameter] === 'D' ? 2 : 1;
      }
      var resultDescriptor = mode.family === 'set' ? 'V' : mode.family === 'compareAndSet' ? 'Z' : descriptor,
        wrapperType = resultDescriptor !== 'V' && util.is_primitive_type(resultDescriptor) ? util.boxClassName(resultDescriptor) : null,
        boxedResult: JVMTypes.java_lang_Object = null,
        boxedValueField = wrapperType === null ? null : util.descriptor2typestr(wrapperType) + '/value',
        asynchronous = false, finished = false, synchronousResult: JVMTypes.java_lang_Object;
      var finish = () => {
        if (finished) return;
        finished = true;
        var result = operateVarHandleStorage(thread, capability, name, logical);
        // Never return normally through a pending guest exception boundary.
        if (!result.ok) return;
        var value: JVMTypes.java_lang_Object;
        if (boxedResult !== null) {
          (<any> boxedResult)[boxedValueField] = result.value;
          value = boxedResult;
        } else value = result.value;
        if (asynchronous) thread.asyncReturn(value);
        else synchronousResult = value;
      };
      var initializeDeclaration = () => {
        if (finished) return;
        if (field && field.accessFlags.isStatic() && !field.cls.isInitialized(thread)) {
          asynchronous = true;
          thread.setStatus(ThreadStatus.ASYNC_WAITING);
          field.cls.initialize(thread, initialized => {
            if (finished) return;
            if (initialized === null) { finished = true; return; }
            finish();
          });
        } else finish();
      };
      var prepareResult = (wrapper: ClassData) => {
        if (finished) return;
        if (wrapper === null) { finished = true; return; }
        if (!wrapper.isInitialized(thread)) {
          finished = true;
          thread.throwNewException('Ljava/lang/InternalError;', 'VarHandle result wrapper is not initialized');
          return;
        }
        // Prepare and allocate BEFORE the storage mutation. No wrapper class
        // lookup/initialization can then fail after an atomic update succeeds.
        boxedResult = new ((<ReferenceClassData<JVMTypes.java_lang_Object>> wrapper).getConstructor(thread))(thread);
        initializeDeclaration();
      };
      if (wrapperType !== null) {
        var bootstrap = thread.getBsCl(), wrapper = bootstrap.getLoadedClass(wrapperType);
        if (wrapper !== null && wrapper.isInitialized(thread)) prepareResult(wrapper);
        else {
          asynchronous = true;
          thread.setStatus(ThreadStatus.ASYNC_WAITING);
          bootstrap.initializeClass(thread, wrapperType, prepareResult);
        }
      } else initializeDeclaration();
      return synchronousResult;
    }

    public static 'findVirtualBase(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'(
        thread: JVMThread, lookup: JVMTypes.java_lang_invoke_MethodHandles$Lookup,
        owner: JVMTypes.java_lang_Class, name: JVMTypes.java_lang_String,
        type: JVMTypes.java_lang_invoke_MethodType): void {
      if (lookup === null) {
        thread.throwNewException('Ljava/lang/NullPointerException;', 'Null MethodHandles Lookup');
        return;
      }
      var alias = (<any> lookup)[
        'java/lang/invoke/MethodHandles$Lookup/doppioFindVirtualBase(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'
      ];
      if (typeof alias !== 'function') {
        thread.throwNewException('Ljava/lang/InternalError;', 'Original Lookup.findVirtual body is missing');
        return;
      }
      var finished = false;
      thread.setStatus(ThreadStatus.ASYNC_WAITING);
      alias.call(lookup, thread, [owner, name, type], (failure?: JVMTypes.java_lang_Throwable,
          value?: JVMTypes.java_lang_invoke_MethodHandle) => {
        if (finished) return;
        finished = true;
        if (failure) thread.throwException(failure);
        else thread.asyncReturn(value);
      });
    }
  }

  var placeholders: {[signature: string]: Function} = Object.create(null);
  ['get', 'set', 'getVolatile', 'setVolatile', 'getAcquire', 'setRelease', 'getOpaque', 'setOpaque',
    'compareAndSet', 'compareAndExchange', 'compareAndExchangeAcquire', 'compareAndExchangeRelease',
    'weakCompareAndSetPlain', 'weakCompareAndSet', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease',
    'getAndSet', 'getAndSetAcquire', 'getAndSetRelease', 'getAndAdd', 'getAndAddAcquire', 'getAndAddRelease',
    'getAndBitwiseOr', 'getAndBitwiseOrRelease', 'getAndBitwiseOrAcquire',
    'getAndBitwiseAnd', 'getAndBitwiseAndRelease', 'getAndBitwiseAndAcquire',
    'getAndBitwiseXor', 'getAndBitwiseXorRelease', 'getAndBitwiseXorAcquire'].forEach(name => {
      var family = varHandleStorageMode(name).family,
        result = family === 'set' ? 'V' : family === 'compareAndSet' ? 'Z' : 'Ljava/lang/Object;';
      placeholders[name + '([Ljava/lang/Object;)' + result] = (thread: JVMThread) => {
        // Actual invokevirtual linkage uses its lexical call descriptor. Core
        // reflection/unreflection must never execute a guessed generic shape.
        thread.throwNewException('Ljava/lang/UnsupportedOperationException;', 'Signature-polymorphic VarHandle invocation is required');
      };
    });
  return {'java/lang/invoke/DoppioVarHandles': DoppioVarHandles, 'java/lang/invoke/VarHandle': placeholders};
}
