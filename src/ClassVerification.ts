import {ReferenceClassData} from './ClassData';
import {ClassLoader} from './ClassLoader';
import {JVMThread} from './threading';
import {BytecodeFormatError, BytecodeVerificationError, decodeMethodCode} from './BytecodeVerifier';
import {VerificationObligation, verifyMethodTypes} from './BytecodeTypeVerifier';
import {VerificationClassMetadata, VerificationMetadataType, checkVerificationObligation} from './VerificationRelations';
import * as JVMTypes from '../includes/JVMTypes';
import {setImmediate} from 'browserfs';
import {error as logError} from './logging';

interface PendingType { loader: ClassLoader; name: string; }
interface Failure { javaClassName: string; message: string; throwable?: JVMTypes.java_lang_Throwable; }
interface MethodObligation { method: string; value: VerificationObligation; }
class MissingMetadata {
  constructor(public request: PendingType) { }
}

/**
 * Verification is independent of initialization and of symbolic member
 * resolution. Metadata loads do not initialize or recursively verify the
 * classes they encounter, so A's verification may inspect B's hierarchy even
 * when B mentions A. Actual class and defining-loader identities are retained.
 */
export class ClassVerification {
  private state: 'unverified' | 'verifying' | 'verified' | 'failed' = 'unverified';
  private obligations: MethodObligation[] = null;
  private failure: Failure = null;
  private pending: PendingType = null;
  private waiters: {thread: JVMThread; callback: (success: boolean) => void}[] = [];

  constructor(private cls: ReferenceClassData<JVMTypes.java_lang_Object>) { }

  public isVerified(): boolean { return this.state === 'verified'; }

  private prepare(): void {
    if (this.obligations !== null) return;
    var obligations: MethodObligation[] = [], superRef = this.cls.getSuperClassReference();
    this.cls.getMethods().forEach(method => {
      // VM-injected native bridges have no original Code. Trapped bytecode
      // methods do: verify their retained declaration, not the replacement.
      if (!method.declaredCode) return;
      var input = {
        className: this.cls.getInternalName(), superClassName: superRef === null ? null : superRef.name,
        majorVersion: this.cls.majorVersion, name: method.name, descriptor: method.rawDescriptor,
        declaredAccessFlags: method.declaredAccessFlags, declaredCode: method.declaredCode,
        constantPool: this.cls.constantPool
      };
      verifyMethodTypes(input, decodeMethodCode(input)).obligations.forEach(value => {
        obligations.push({method: method.name + method.rawDescriptor, value});
      });
    });
    this.obligations = obligations;
  }

  private checkMetadata(): void {
    if (this.obligations.length === 0) return;
    var snapshots = new Map<ReferenceClassData<JVMTypes.java_lang_Object>, VerificationClassMetadata>(),
      building = new Set<ReferenceClassData<JVMTypes.java_lang_Object>>(), self = this.cls;
    function lookup(loader: ClassLoader, name: string): ReferenceClassData<JVMTypes.java_lang_Object> {
      // Lookup#defineClass and anonymous classes are not yet in a loader map.
      if (loader === self.getLoader() && name === self.getInternalName()) return self;
      var found = <ReferenceClassData<JVMTypes.java_lang_Object>> loader.getLoadedClass(name);
      if (found === null) throw new MissingMetadata({loader, name});
      return found;
    }
    function snapshot(cls: ReferenceClassData<JVMTypes.java_lang_Object>): VerificationClassMetadata {
      if (building.has(cls)) {
        // The ordinary hierarchy linker also diagnoses this. Do not loop
        // while inspecting a malformed hierarchy before it gets that far.
        throw {verificationHierarchyCycle: cls.getInternalName()};
      }
      var existing = snapshots.get(cls);
      if (existing) return existing;
      building.add(cls);
      var loader = cls.getLoader(), parent = cls.getSuperClassReference();
      var result: VerificationClassMetadata = {
        identity: cls, definingLoader: loader, name: cls.getInternalName(),
        isInterface: cls.accessFlags.isInterface(),
        superclass: parent === null ? null : snapshot(<ReferenceClassData<JVMTypes.java_lang_Object>> (parent.cls || lookup(loader, parent.name))),
        interfaces: cls.getInterfaceClassReferences().map(ref => snapshot(<ReferenceClassData<JVMTypes.java_lang_Object>> (ref.cls || lookup(loader, ref.name)))),
        fields: cls.getFields().map(field => ({name: field.name, descriptor: field.rawDescriptor, flags: field.accessFlags.getRawByte()})),
        methods: cls.getMethods().map(method => ({name: method.name, descriptor: method.rawDescriptor,
          flags: method.declaredAccessFlags === undefined ? method.accessFlags.getRawByte() : method.declaredAccessFlags}))
      };
      building.delete(cls);
      snapshots.set(cls, result);
      return result;
    }
    function type(name: string): VerificationMetadataType {
      if (name === 'null') return {kind: 'null'};
      if (name[0] === '[') return {kind: 'array', component: <any> type(name.slice(1))};
      if (name.length === 1) return {kind: 'primitive', name: <any> name};
      return {kind: 'class', classInfo: snapshot(lookup(self.getLoader(), name))};
    }
    var currentClass = snapshot(self);
    this.obligations.forEach(entry => {
      var result = checkVerificationObligation(entry.value, {
        currentClass, bootstrapLoader: self.getLoader().bootstrap,
        source: type(entry.value.sourceType), target: type(entry.value.targetType)
      });
      if (!result.ok) throw new BytecodeVerificationError(self.getInternalName() + '.' + entry.method +
        ' at bytecode ' + entry.value.pc + ': ' + result.reason);
    });
  }

  /** Returns false for both missing metadata and a cached verification failure. */
  private check(): boolean {
    this.pending = null;
    try {
      this.prepare();
      this.checkMetadata();
      return true;
    } catch (failure) {
      if (failure instanceof MissingMetadata) this.pending = failure.request;
      else if (failure instanceof BytecodeVerificationError || failure instanceof BytecodeFormatError) {
        this.failure = {javaClassName: failure.javaClassName, message: failure.message};
      } else if (failure && failure.verificationHierarchyCycle) {
        this.failure = {javaClassName: 'Ljava/lang/ClassCircularityError;', message: failure.verificationHierarchyCycle};
      } else throw failure;
      return false;
    }
  }

  public tryToVerify(): boolean {
    if (this.state === 'verified') return true;
    if (this.state !== 'unverified') return false;
    if (this.check()) { this.state = 'verified'; return true; }
    if (this.failure !== null) this.state = 'failed';
    return false;
  }

  private reportFailure(thread: JVMThread): void {
    if (thread === null) logError('JVM bootstrap verification failed: ' + this.failure.message);
    else if (this.failure.throwable) thread.throwException(this.failure.throwable);
    else thread.throwNewException(this.failure.javaClassName, this.failure.message);
  }

  /** Every caller receives a final result; a failed class is never retryable. */
  public verify(thread: JVMThread, callback: (success: boolean) => void): void {
    if (this.state === 'verified') { setImmediate(() => callback(true)); return; }
    if (this.state === 'failed') { this.reportFailure(thread); callback(false); return; }
    this.waiters.push({thread, callback});
    if (this.state === 'verifying') return;
    this.state = 'verifying';
    var complete = (success: boolean) => {
      this.state = success ? 'verified' : 'failed';
      var waiters = this.waiters, reported = new Set<JVMThread>();
      this.waiters = [];
      waiters.forEach(waiter => {
        if (!success && !reported.has(waiter.thread)) {
          reported.add(waiter.thread);
          this.reportFailure(waiter.thread);
        }
        waiter.callback(success);
      });
    };
    var attempt = () => {
      if (this.check()) return complete(true);
      if (this.failure !== null) return complete(false);
      var pending = this.pending;
      if (thread === null) {
        // Before the first java.lang.Thread exists, only the bootstrap loader
        // participates. Its failures cannot yet be materialized as Throwables.
        pending.loader.loadClass(null, pending.name, loaded => {
          if (loaded !== null) attempt();
          else {
            this.failure = {javaClassName: 'Ljava/lang/NoClassDefFoundError;', message: pending.name};
            complete(false);
          }
        }, false);
      } else {
        thread.runWithExceptionBoundary(done => {
          pending.loader.loadClass(thread, pending.name, loaded => { if (loaded !== null) done(loaded); }, false);
        }, failure => {
          if (failure) {
            this.failure = {javaClassName: failure.getClass().getInternalName(), message: pending.name, throwable: failure};
            complete(false);
          } else attempt();
        });
      }
    };
    attempt();
  }
}
