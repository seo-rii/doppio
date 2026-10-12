import {ClassData, ReferenceClassData, ArrayClassData} from './ClassData';
import {JVMThread} from './threading';
import {Flags} from './util';
import {ThreadStatus} from './enums';
import * as JVMTypes from '../includes/JVMTypes';

type ReferenceClass = ReferenceClassData<JVMTypes.java_lang_Object>;

interface NestHostResolution {
  host: ReferenceClass | null;
  waiters: {thread: JVMThread; callback: (host: ReferenceClass | null) => void}[];
}

// A determination belongs to an actual class identity, never a binary name or
// an initiating loader. Ordinary host lookup failures determine self; a
// VirtualMachineError interrupts the determination and permits another attempt.
var nestHosts = new WeakMap<ReferenceClass, NestHostResolution>();

/** Fixed VM capability: the hidden defining path has resolved the Lookup's
 * actual host before the hidden candidate can execute. This does not add a
 * discoverable NestMembers name or make any caller-selected host authoritative. */
export function registerHiddenNestHost(cls: ReferenceClass, host: ReferenceClass): void {
  if (!cls.isHidden() || cls.getLoader() !== host.getLoader() ||
      cls.getPackageName() !== host.getPackageName() || nestHosts.has(cls)) {
    throw new Error('Invalid hidden nest registration');
  }
  nestHosts.set(cls, {host, waiters: []});
}

export function isVirtualMachineError(failure: JVMTypes.java_lang_Throwable, cls: ReferenceClass): boolean {
  // Exception taxonomy uses the actual bootstrap identity, not a same-named
  // class from another defining loader. This check must not load another class.
  var vme = cls.getLoader().bootstrap.getLoadedClass('Ljava/lang/VirtualMachineError;');
  return vme !== null && failure.getClass().isSubclass(vme);
}

export function sameRuntimePackage(a: ClassData, b: ClassData): boolean {
  return a.getLoader() === b.getLoader() && a.getPackageName() === b.getPackageName();
}

/** The unnamed-module class access rules. Array mirrors' public flags are not
 * authority to access a non-public element class. This predicate only reads
 * established array metadata; it never loads, verifies or initializes a type.
 * Module readability/exports remain outside this compatibility layer. */
export function canAccessClass(caller: ReferenceClass, target: ClassData): boolean {
  while (target !== null && target !== undefined && target.getInternalName().charAt(0) === '[') {
    target = (<ArrayClassData<any>> target).getComponentClass();
  }
  if (target === null || target === undefined) return false;
  return target.getInternalName().charAt(0) !== 'L' || target.accessFlags.isPublic() ||
    sameRuntimePackage(caller, target);
}

/** null means that host metadata has not yet been determined. In particular,
 * two unresolved NestHost spellings do not establish a relationship. */
export function getKnownNestHost(cls: ReferenceClass): ReferenceClass | null {
  var state = nestHosts.get(cls);
  if (state !== undefined) return state.host;
  if (cls.getNestHostReference() === null) {
    nestHosts.set(cls, {host: cls, waiters: []});
    return cls;
  }
  return null;
}

export function isKnownNestmate(a: ReferenceClass, b: ReferenceClass): boolean {
  if (a === b) return true;
  var host = getKnownNestHost(a);
  return host !== null && host === getKnownNestHost(b);
}

/** JVMS 5.4.4 nest determination suppresses ordinary host Class-reference
 * resolution failures and remembers self. VirtualMachineError is propagated
 * without determining a host (JVMS 6.3), allowing a later attempt to retry.
 * Separately, the Class reference retains only LinkageError failures. No path
 * initializes the host or triggers its bytecode verifier or preparation. */
export function resolveNestHost(thread: JVMThread, cls: ReferenceClass,
    callback: (host: ReferenceClass | null) => void): void {
  var known = getKnownNestHost(cls);
  if (known !== null) { callback(known); return; }
  var pending = nestHosts.get(cls);
  if (pending !== undefined) {
    if (thread !== null) thread.setStatus(ThreadStatus.ASYNC_WAITING);
    pending.waiters.push({thread, callback});
    return;
  }
  var state: NestHostResolution = {host: null, waiters: [{thread, callback}]};
  nestHosts.set(cls, state);
  var reference = cls.getNestHostReference();
  var complete = (loaded: ClassData) => {
    var host = cls;
    if (loaded !== null && loaded !== undefined && loaded.getInternalName().charAt(0) === 'L' &&
        sameRuntimePackage(cls, loaded)) {
      var candidate = <ReferenceClass> loaded;
      if (candidate.getNestMemberNames().indexOf(cls.getInternalName()) !== -1) host = candidate;
    }
    state.host = host;
    var waiters = state.waiters;
    state.waiters = [];
    waiters.forEach(waiter => waiter.callback(host));
  };
  if (thread === null) {
    // During bootstrap there is no Java Throwable to consume. The metadata
    // resolver still records its failure, while nest determination uses self.
    reference.resolveMetadata(null, cls.getLoader(), cls, success => complete(success ? reference.cls : null), false);
  } else {
    thread.runWithExceptionBoundary<ClassData>(done => {
      reference.resolveMetadata(thread, cls.getLoader(), cls, success => {
        // Failed resolution throws on this thread. Its false callback can run
        // before the Throwable reaches this boundary, and must not complete it.
        if (success) done(reference.cls);
      }, false);
    }, (failure, loaded) => {
      if (failure !== null && isVirtualMachineError(failure, cls)) {
        // Detach this attempt before invoking callbacks: a waiter may retry
        // immediately, while the remaining waiters still need this exact error.
        nestHosts.delete(cls);
        var waiters = state.waiters, reported = new Set<JVMThread>();
        state.waiters = [];
        waiters.forEach(waiter => {
          if (waiter.thread !== null && !reported.has(waiter.thread)) {
            reported.add(waiter.thread);
            waiter.thread.throwException(failure);
          }
          waiter.callback(null);
        });
      } else complete(failure === null ? loaded : null);
    });
  }
}

/** Class.getNestMembers examines the host's real constant-pool references,
 * retaining linkage failures even when a missing/invalid member is filtered out.
 * Both host determination and member resolution propagate VirtualMachineError
 * (OpenJDK JVM_GetNestMembers); enumeration returns no partial result on that
 * path. Generated hidden/anonymous helpers are not enumerated. */
export function resolveNestMembers(thread: JVMThread, cls: ReferenceClass,
    callback: (members: ReferenceClass[] | null) => void): void {
  resolveNestHost(thread, cls, host => {
    if (host === null) { callback(null); return; }
    var references = host.getNestMemberReferences(), members = [host], index = 0,
      advancing = false, advancePending = false, finished = false;
    var advance = () => {
      if (finished) return;
      // Cached CP entries and host determinations may complete synchronously.
      // Flatten their continuations instead of recursing once per member.
      if (advancing) { advancePending = true; return; }
      advancing = true;
      do {
        advancePending = false;
        if (index === references.length) {
          finished = true;
          callback(members);
          break;
        }
        var reference = references[index++];
        var accept = (loaded: ClassData) => {
          if (loaded === null || loaded === undefined || loaded.getInternalName().charAt(0) !== 'L') {
            advance();
            return;
          }
          var member = <ReferenceClass> loaded;
          resolveNestHost(thread, member, memberHost => {
            if (memberHost === null) { finished = true; callback(null); return; }
            if (memberHost === host) members.push(member);
            advance();
          });
        };
        if (thread === null) {
          reference.resolveMetadata(null, host.getLoader(), host,
            success => accept(success ? reference.cls : null), false);
        } else {
          thread.runWithExceptionBoundary<ClassData>(done => {
            reference.resolveMetadata(thread, host.getLoader(), host, success => {
              if (success) done(reference.cls);
            }, false);
          }, (failure, loaded) => {
            if (failure !== null) {
              if (isVirtualMachineError(failure, host)) {
                finished = true;
                thread.throwException(failure);
                callback(null);
                return;
              }
              accept(null);
            } else accept(loaded);
          });
        }
      } while (advancePending && !finished);
      advancing = false;
    };
    advance();
  });
}

/** Ordinary member access only. VM-produced adapter capabilities are checked
 * separately against exact members by their trusted producers. A false result
 * is reported by the resolving caller as IllegalAccessError. A null result
 * means an exact VirtualMachineError has already been thrown to the thread. */
export function resolveMemberAccess(thread: JVMThread, caller: ReferenceClass,
    declaring: ReferenceClass, flags: Flags, symbolicOwner: ClassData,
    callback: (allowed: boolean | null) => void): void {
  if (flags.isPublic()) { callback(true); return; }
  if (flags.isProtected()) {
    if (sameRuntimePackage(caller, declaring)) { callback(true); return; }
    var symbolic = symbolicOwner === null ? declaring : symbolicOwner;
    callback(caller.isSubclass(declaring) && (flags.isStatic() ||
      symbolic.isSubclass(caller) || caller.isSubclass(symbolic)));
    return;
  }
  if (!flags.isPrivate()) { callback(sameRuntimePackage(caller, declaring)); return; }
  if (caller === declaring) { callback(true); return; }
  // Referring class first, then declaring class: API-driven prior determinations
  // and class loader side effects must observe the same JVMS ordering.
  resolveNestHost(thread, caller, callerHost => {
    if (callerHost === null) { callback(null); return; }
    resolveNestHost(thread, declaring, declaringHost =>
      callback(declaringHost === null ? null : callerHost === declaringHost));
  });
}
