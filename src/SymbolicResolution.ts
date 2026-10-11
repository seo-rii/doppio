import assert from './assert';
import {JVMThread} from './threading';
import * as JVMTypes from '../includes/JVMTypes';
import {error as logError} from './logging';

interface ResolutionFailure {
  javaClassName: string;
  message: string;
  throwable?: JVMTypes.java_lang_Throwable;
}

/** One class/member constant-pool reference retains success or a LinkageError
 * (JVMS 5.4.3). Other Throwables permit retry. Execution-dependent receiver
 * checks do not belong to this gate. */
export class SymbolicResolution {
  private state: 'unresolved' | 'resolving' | 'resolved' | 'failed' = 'unresolved';
  private failure: ResolutionFailure = null;
  private waiters: {thread: JVMThread; callback: (success: boolean) => void}[] = [];

  public hasFailed(): boolean { return this.state === 'failed'; }

  /** A member cannot outlive the failed symbolic owner reference it depends on.
   * Also retain the category during pre-thread bootstrap, without a Throwable. */
  public inheritFailure(other: SymbolicResolution): void {
    if (this.failure === null && other.hasFailed()) this.failure = other.failure;
  }

  /** Retain diagnostic facts before Java has materialized the Throwable. */
  public throwFailure(thread: JVMThread, javaClassName: string, message: string): void {
    if (this.failure === null) this.failure = {javaClassName, message};
    if (thread === null) logError('JVM bootstrap symbolic resolution failed: ' + message);
    else thread.throwNewException(javaClassName, message);
  }

  private reportFailure(thread: JVMThread, failure: ResolutionFailure = this.failure): void {
    if (thread === null) logError('JVM bootstrap symbolic resolution failed: ' + failure.message);
    else if (failure.throwable) thread.throwException(failure.throwable);
    else thread.throwNewException(failure.javaClassName, failure.message);
  }

  public resolve(thread: JVMThread, operation: (done: (success: boolean) => void) => void,
      callback: (success: boolean) => void): void {
    if (this.state === 'resolved') { callback(true); return; }
    if (this.state === 'failed') { this.reportFailure(thread); callback(false); return; }
    this.waiters.push({thread, callback});
    if (this.state === 'resolving') return;
    this.state = 'resolving';
    var finish = (success: boolean, failure?: JVMTypes.java_lang_Throwable, alreadyReported: boolean = false) => {
      assert(this.state === 'resolving', 'Symbolic resolution completed more than once');
      if (failure) this.failure = {javaClassName: failure.getClass().getInternalName(),
        message: this.failure === null ? 'Symbolic reference resolution failed' : this.failure.message,
        throwable: failure};
      if (!success && this.failure === null) this.failure = {
        javaClassName: 'Ljava/lang/LinkageError;', message: 'Symbolic reference resolution failed'};
      // The defining bootstrap identity, not the Throwable's spelling, decides
      // whether this attempt poisons the CP entry. For example, OOME while
      // loading a class must not prevent a later successful resolution.
      var linkageError = failure && thread !== null ? thread.getBsCl().getLoadedClass('Ljava/lang/LinkageError;') : null;
      var permanent = !failure || (linkageError !== null && failure.getClass().isSubclass(linkageError));
      var completedFailure = this.failure;
      this.state = success ? 'resolved' : permanent ? 'failed' : 'unresolved';
      if (success || !permanent) this.failure = null;
      var waiters = this.waiters, reported = new Set<JVMThread>();
      this.waiters = [];
      if (alreadyReported) reported.add(thread);
      waiters.forEach(waiter => {
        if (!success && !reported.has(waiter.thread)) {
          reported.add(waiter.thread);
          // A callback may immediately start a new attempt after a transient
          // failure; every waiter still receives this attempt's exact error.
          this.reportFailure(waiter.thread, completedFailure);
        }
        waiter.callback(success);
      });
    };
    if (thread === null || typeof thread.runWithExceptionBoundary !== 'function') {
      // Bootstrap has no guest Throwable. Controlled metadata unit callers
      // may also use a diagnostic sink without a Java stack.
      operation(success => finish(success, undefined, !success && this.failure !== null));
    } else {
      thread.runWithExceptionBoundary<boolean>(done => {
        operation(success => {
          // A failed operation throws on the guest thread; its null/false
          // callback can precede construction and unwinding of that Throwable.
          if (success) done(true);
        });
      }, (failure, success) => finish(failure === null && success === true, failure));
    }
  }
}
