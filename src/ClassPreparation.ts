import {ReferenceClassData} from './ClassData';
import {JVMThread} from './threading';
import {canOverrideMethod} from './methods';
import {getLoadingConstraints, LoadingConstraintViolation} from './LoadingConstraints';
import * as JVMTypes from '../includes/JVMTypes';
import {setImmediate} from 'browserfs';
import {error as logError} from './logging';

/** Preparation is separate from hierarchy derivation and bytecode verification.
 * Its descriptor constraints inspect exact declaration identities without
 * loading, verifying or initializing any descriptor class (JVMS 5.4.2). */
export class ClassPreparation {
  private state: 'unprepared' | 'preparing' | 'prepared' | 'failed' = 'unprepared';
  private failure: LoadingConstraintViolation = null;
  private throwable: JVMTypes.java_lang_Throwable = null;
  private waiters: {thread: JVMThread; callback: (success: boolean) => void}[] = [];

  constructor(private cls: ReferenceClassData<JVMTypes.java_lang_Object>) { }

  public isPrepared(): boolean { return this.state === 'prepared'; }

  private check(): boolean {
    var cls = this.cls, registry = getLoadingConstraints(cls.getLoader()),
      ancestors: ReferenceClassData<JVMTypes.java_lang_Object>[] = [],
      seen = new Set<ReferenceClassData<JVMTypes.java_lang_Object>>();
    var visit = (parent: ReferenceClassData<JVMTypes.java_lang_Object>) => {
      if (!parent || seen.has(parent)) return;
      seen.add(parent);
      ancestors.push(parent);
      visit(parent.getSuperClass());
      (parent.getInterfaces() || []).forEach(visit);
    };
    visit(cls.getSuperClass());
    (cls.getInterfaces() || []).forEach(visit);
    var declared = cls.getMethods() || [];
    // Rule 1: an overriding declaration connects C to each actual ancestor
    // declaration owner, not the loader of an intermediary symbolic class.
    for (var i = 0; i < declared.length; i++) {
      var method = declared[i];
      for (var j = 0; j < ancestors.length; j++) {
        var base = ancestors[j].getDeclaredMethod(method.signature);
        if (base !== null && canOverrideMethod(method, base)) {
          this.failure = registry.imposeDescriptor(method.rawDescriptor, cls.getLoader(), base.cls.getLoader());
          if (this.failure !== null) return false;
        }
      }
    }
    // Rule 2: inherited selection connects the selected owner D to I. C's
    // loader need not participate. A selected abstract class method still has
    // an owner; unresolved/default conflicts remain invocation-time outcomes.
    for (var k = 0; k < ancestors.length; k++) {
      if (!ancestors[k].accessFlags.isInterface()) continue;
      var methods = ancestors[k].getMethods() || [];
      for (var m = 0; m < methods.length; m++) {
        var inherited = methods[m];
        if (inherited.accessFlags.isStatic() || inherited.accessFlags.isPrivate() || inherited.name[0] === '<' ||
            declared.some(own => canOverrideMethod(own, inherited))) continue;
        var selection = cls.selectMethod(inherited);
        if (selection.kind !== 'selected') continue;
        this.failure = registry.imposeDescriptor(inherited.rawDescriptor,
          selection.method.cls.getLoader(), inherited.cls.getLoader());
        if (this.failure !== null) return false;
      }
    }
    return true;
  }

  public tryToPrepare(): boolean {
    if (this.state === 'prepared') return true;
    if (this.state !== 'unprepared') return false;
    var success = this.check();
    this.state = success ? 'prepared' : 'failed';
    return success;
  }

  /** Retain one failure and one actual guest Throwable, including failures
   * first found synchronously. No retry can reimpose or change descriptor edges. */
  public prepare(thread: JVMThread, callback: (success: boolean) => void): void {
    if (this.state === 'prepared') { setImmediate(() => callback(true)); return; }
    this.waiters.push({thread, callback});
    if (this.state === 'preparing') return;
    if (this.state === 'unprepared' && this.check()) {
      this.complete(true);
      return;
    }
    this.state = 'preparing';
    if (thread === null || this.throwable !== null) this.complete(false);
    else thread.runWithExceptionBoundary(done => {
      thread.throwNewException('Ljava/lang/LinkageError;', 'Loading constraint violation for ' + this.failure.name);
    }, failure => {
      this.throwable = failure;
      this.complete(false);
    });
  }

  private complete(success: boolean): void {
    this.state = success ? 'prepared' : 'failed';
    var waiters = this.waiters, reported = new Set<JVMThread>();
    this.waiters = [];
    waiters.forEach(waiter => {
      if (!success && !reported.has(waiter.thread)) {
        reported.add(waiter.thread);
        if (waiter.thread === null) logError('JVM bootstrap preparation failed: ' + this.failure.name);
        else if (this.throwable !== null) waiter.thread.throwException(this.throwable);
        else waiter.thread.throwNewException('Ljava/lang/LinkageError;', 'Loading constraint violation for ' + this.failure.name);
      }
      waiter.callback(success);
    });
  }
}
