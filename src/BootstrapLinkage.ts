import assert from './assert';
import {JVMThread} from './threading';
import {ReferenceClassData} from './ClassData';
import {ClassLoader} from './ClassLoader';
import {ConstantPoolItemType, ThreadStatus} from './enums';
import * as util from './util';
import * as JVMTypes from '../includes/JVMTypes';
import {IConstantPoolItem} from './ConstantPool';

/** JVMS 5.4.3 and 5.4.3.6 cache every Error, not just LinkageError.
 * CONSTANT_Dynamic owns one gate; invokedynamic owns one per lexical instruction.
 * A recursive request on the resolving thread cannot wait for itself. */
export class BootstrapResolution {
  private state: 'unresolved' | 'resolving' | 'resolved' | 'failed' = 'unresolved';
  private owner: JVMThread = null;
  private failure: JVMTypes.java_lang_Throwable = null;
  private waiters: {thread: JVMThread; callback: (success: boolean) => void}[] = [];

  public resolve(thread: JVMThread, operation: (done: (success: boolean) => void) => void,
      callback: (success: boolean) => void): void {
    if (this.state === 'resolved') { callback(true); return; }
    if (this.state === 'failed') { thread.throwException(this.failure); callback(false); return; }
    if (this.state === 'resolving' && thread === this.owner) {
      thread.throwNewException('Ljava/lang/StackOverflowError;', 'Recursive bootstrap resolution');
      callback(false);
      return;
    }
    this.waiters.push({thread, callback});
    if (this.state === 'resolving') return;
    this.state = 'resolving';
    this.owner = thread;
    thread.runWithExceptionBoundary<boolean>(done => {
      operation(success => {
        // A false metadata callback may precede construction and unwinding of
        // its Java Throwable. Only success completes the boundary directly.
        if (success) done(true);
      });
    }, (failure, success) => {
      assert(this.state === 'resolving', 'Bootstrap resolution completed twice');
      var succeeded = failure === null && success === true,
        errorClass = thread.getBsCl().getLoadedClass('Ljava/lang/Error;'),
        permanent = failure !== null && errorClass !== null && failure.getClass().isSubclass(errorClass),
        waiters = this.waiters, reported = new Set<JVMThread>();
      this.waiters = [];
      this.owner = null;
      this.failure = permanent ? failure : null;
      this.state = succeeded ? 'resolved' : permanent ? 'failed' : 'unresolved';
      waiters.forEach(waiter => {
        if (!succeeded && !reported.has(waiter.thread)) {
          reported.add(waiter.thread);
          waiter.thread.throwException(failure);
        }
        waiter.callback(succeeded);
      });
    });
  }
}

/** Materialize the specified cause through the actual bootstrap class.
 * The VM never forges a guest Throwable or substitutes a JS exception. */
export function throwBootstrapMethodError(thread: JVMThread, cause: JVMTypes.java_lang_Throwable,
    message: string, callback: (success: boolean) => void): void {
  thread.getBsCl().initializeClass(thread, 'Ljava/lang/BootstrapMethodError;',
    (cls: ReferenceClassData<JVMTypes.java_lang_Throwable>) => {
      if (cls === null) { callback(false); return; }
      var exception = new (cls.getConstructor(thread))(thread);
      exception['<init>(Ljava/lang/String;Ljava/lang/Throwable;)V'](thread,
        [thread.getJVM().internString(message), cause], (error?: JVMTypes.java_lang_Throwable) => {
          thread.throwException(error || exception);
          callback(false);
        });
    }, false);
}

/** Validation failures have ordinary Java causes, captured before wrapping so
 * no pending exception is replaced or reported to the caller twice. */
export function throwInvalidBootstrapResult(thread: JVMThread, javaClassName: string,
    message: string, callback: (success: boolean) => void): void {
  thread.runWithExceptionBoundary<boolean>(() => thread.throwNewException(javaClassName, message),
    cause => throwBootstrapMethodError(thread, cause, message, callback));
}

/** The only owner is the VM's exact constant-pool class. The private constructor
 * grants ordinary caller modes, never IMPL_LOOKUP/TRUSTED capabilities. */
export function createBootstrapLookup(thread: JVMThread,
    caller: ReferenceClassData<JVMTypes.java_lang_Object>,
    callback: (error: JVMTypes.java_lang_Throwable, lookup?: JVMTypes.java_lang_invoke_MethodHandles$Lookup) => void): void {
  var bootstrap = thread.getBsCl(), name = 'Ljava/lang/invoke/MethodHandles$Lookup;';
  bootstrap.initializeClass(thread, name, (cls: ReferenceClassData<JVMTypes.java_lang_invoke_MethodHandles$Lookup>) => {
    if (cls === null) return;
    assert(cls === bootstrap.getLoadedClass(name) && cls.getLoader() === bootstrap,
      'Bootstrap Lookup must preserve its defining class identity');
    var lookup = new (cls.getConstructor(thread))(thread);
    lookup['<init>(Ljava/lang/Class;I)V'](thread, [caller.getClassObject(thread), 0x000f],
      (error?: JVMTypes.java_lang_Throwable) => {
        if (error) callback(error);
        else {
          (<any> lookup)['java/lang/invoke/MethodHandles$Lookup/doppioModernModes'] = 0x005f;
          callback(null, lookup);
        }
      });
  }, false);
}

/** Resolve and encode static arguments one at a time in their declared order.
 * Nested nulls are valid; primitive condy values use their field descriptor,
 * while numeric CP entries use their own numeric category. */
export function resolveBootstrapArguments(thread: JVMThread, loader: ClassLoader,
    caller: ReferenceClassData<JVMTypes.java_lang_Object>, items: IConstantPoolItem[],
    callback: (success: boolean, values?: JVMTypes.java_lang_Object[]) => void): void {
  var values: JVMTypes.java_lang_Object[] = [], numeric: {[type: number]: string} = {};
  numeric[ConstantPoolItemType.INTEGER] = 'I';
  numeric[ConstantPoolItemType.LONG] = 'J';
  numeric[ConstantPoolItemType.FLOAT] = 'F';
  numeric[ConstantPoolItemType.DOUBLE] = 'D';
  util.asyncForEach(items, (item: IConstantPoolItem, next: (error?: any) => void) => {
    var append = () => {
      var descriptor = numeric[item.getType()], value = item.getConstant(thread);
      if (item.getType() === ConstantPoolItemType.DYNAMIC) {
        var dynamicDescriptor: string = (<any> item).nameAndTypeInfo.descriptor;
        if (dynamicDescriptor.length === 1) descriptor = dynamicDescriptor;
      }
      values.push(descriptor === undefined ? value : util.boxPrimitiveValue(thread, descriptor, value));
      next();
    };
    if (item.isResolved()) append();
    else item.resolve(thread, loader, caller, success => {
      if (success) append();
      else next('Bootstrap static argument resolution failed');
    }, false);
  }, (error?: any) => callback(!error, error ? undefined : values));
}

/** The retained Java 8 CallSite.makeSite wraps arbitrary Errors. Modern linkage
 * therefore invokes the real user handle directly, with its real adaptations,
 * and applies the JVMS Error/non-Error boundary before linker publication. */
export function invokeBootstrap(thread: JVMThread, caller: ReferenceClassData<JVMTypes.java_lang_Object>,
    handle: JVMTypes.java_lang_invoke_MethodHandle, name: string, type: JVMTypes.java_lang_Object,
    values: JVMTypes.java_lang_Object[], callback: (success: boolean, value?: JVMTypes.java_lang_Object) => void): void {
  createBootstrapLookup(thread, caller, (lookupError, lookup) => {
    if (lookupError) { thread.throwException(lookupError); callback(false); return; }
    var args = util.newArrayFromData<JVMTypes.java_lang_Object>(thread, thread.getBsCl(),
      '[Ljava/lang/Object;', [lookup, thread.getJVM().internString(name), type].concat(values));
    thread.setStatus(ThreadStatus.ASYNC_WAITING);
    handle['invokeWithArguments([Ljava/lang/Object;)Ljava/lang/Object;'](thread, [args],
      (error?: JVMTypes.java_lang_Throwable, value?: JVMTypes.java_lang_Object) => {
        if (!error) { callback(true, value); return; }
        var errorClass = thread.getBsCl().getLoadedClass('Ljava/lang/Error;');
        if (errorClass !== null && error.getClass().isSubclass(errorClass)) {
          thread.throwException(error);
          callback(false);
        } else throwBootstrapMethodError(thread, error, 'Bootstrap method invocation failed', callback);
      });
  });
}

/** Use the retained MethodHandle conversion machinery, including reference
 * casts and permitted unbox/widen conversions, rather than a JS coercion. */
export function convertBootstrapConstant(thread: JVMThread, type: ClassDataForBootstrap,
    value: JVMTypes.java_lang_Object, callback: (success: boolean, converted?: any) => void): void {
  var bootstrap = thread.getBsCl();
  bootstrap.initializeClass(thread, 'Ljava/lang/invoke/MethodHandles;',
    (cls: ReferenceClassData<JVMTypes.java_lang_Object>) => {
      if (cls === null) { callback(false); return; }
      (<any> cls.getConstructor(thread))[
        'java/lang/invoke/MethodHandles/identity(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'](
        thread, [type.getClassObject(thread)], (error?: JVMTypes.java_lang_Throwable,
          identity?: JVMTypes.java_lang_invoke_MethodHandle) => {
          if (error) { thread.throwException(error); callback(false); return; }
          var args = util.newArrayFromData<JVMTypes.java_lang_Object>(thread, bootstrap,
            '[Ljava/lang/Object;', [value]);
          identity['invokeWithArguments([Ljava/lang/Object;)Ljava/lang/Object;'](thread, [args],
            (conversionError?: JVMTypes.java_lang_Throwable, converted?: JVMTypes.java_lang_Object) => {
              if (conversionError) {
                var nullClass = bootstrap.getLoadedClass('Ljava/lang/NullPointerException;'),
                  castClass = bootstrap.getLoadedClass('Ljava/lang/ClassCastException;');
                if ((nullClass !== null && conversionError.getClass().isSubclass(nullClass)) ||
                    (castClass !== null && conversionError.getClass().isSubclass(castClass))) {
                  throwBootstrapMethodError(thread, conversionError, 'Bootstrap constant conversion failed', callback);
                } else { thread.throwException(conversionError); callback(false); }
              } else {
                callback(true, type.getInternalName().length === 1 ? (<any> converted).unbox() : converted);
              }
            });
        });
    }, false);
}

// Structural type keeps primitive, reference and array ClassData available
// without importing the constant-pool's runtime classes back into this helper.
interface ClassDataForBootstrap {
  getClassObject(thread: JVMThread): JVMTypes.java_lang_Class;
  getInternalName(): string;
}
