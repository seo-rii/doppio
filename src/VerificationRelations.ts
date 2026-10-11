import {VerificationObligation} from './BytecodeTypeVerifier';

/** Metadata snapshots only: none of these interfaces contain loader callbacks. */
export interface VerificationMemberMetadata {
  readonly name: string;
  readonly descriptor: string;
  readonly flags: number;
}

export interface VerificationClassMetadata {
  /** The actual class identity, shared by every initiating-loader view. */
  readonly identity: object;
  readonly definingLoader: object;
  /** Class descriptor, for example Lpkg/Example; (not a Java source name). */
  readonly name: string;
  readonly isInterface: boolean;
  readonly superclass: VerificationClassMetadata | null;
  readonly interfaces: ReadonlyArray<VerificationClassMetadata>;
  readonly fields: ReadonlyArray<VerificationMemberMetadata>;
  readonly methods: ReadonlyArray<VerificationMemberMetadata>;
}

export interface VerificationPrimitiveType {
  readonly kind: 'primitive';
  readonly name: 'B' | 'C' | 'D' | 'F' | 'I' | 'J' | 'S' | 'Z';
}

export interface VerificationClassType {
  readonly kind: 'class';
  readonly classInfo: VerificationClassMetadata;
}

export interface VerificationArrayType {
  readonly kind: 'array';
  readonly component: VerificationPrimitiveType | VerificationClassType | VerificationArrayType;
}

export type VerificationMetadataType = VerificationPrimitiveType | VerificationClassType |
  VerificationArrayType | {readonly kind: 'null'};

export interface VerificationRelationResult {
  readonly ok: boolean;
  readonly reason?: string;
}

export interface VerificationRelationContext {
  readonly currentClass: VerificationClassMetadata;
  readonly bootstrapLoader: object;
  /** Caller-prepared metadata for this obligation, not a descriptor-only cache. */
  readonly source: VerificationMetadataType;
  readonly target: VerificationMetadataType;
}

export interface ProtectedReceiverInput {
  readonly currentClass: VerificationClassMetadata;
  readonly bootstrapLoader: object;
  readonly owner: VerificationMetadataType;
  readonly receiver: VerificationMetadataType;
  readonly memberName: string;
  readonly memberDescriptor: string;
  readonly opcode?: number;
}

interface MemberDeclaration {
  readonly owner: VerificationClassMetadata;
  readonly member: VerificationMemberMetadata;
}

function accepted(): VerificationRelationResult { return {ok: true}; }
function rejected(reason: string): VerificationRelationResult { return {ok: false, reason}; }

/** A snapshot can contain repeated views of one class. Compare identities, not
 * descriptors or the object containing the snapshot, and bound cyclic input.
 */
function superclasses(current: VerificationClassMetadata): VerificationClassMetadata[] {
  var result: VerificationClassMetadata[] = [], seen = new Set<object>();
  seen.add(current.identity);
  for (var next = current.superclass; next !== null && !seen.has(next.identity); next = next.superclass) {
    seen.add(next.identity);
    result.push(next);
  }
  return result;
}

/** Descriptors are used only to bind an obligation to its supplied metadata.
 * They never establish class identity. Primitive names remain distinct here:
 * in particular, byte[] and boolean[] are not interchangeable verification types.
 */
function metadataDescriptor(type: VerificationMetadataType): string | null {
  var prefix = '';
  while (type.kind === 'array') {
    if (prefix.length === 255) return null;
    prefix += '[';
    type = type.component;
  }
  switch (type.kind) {
    case 'class': return prefix + type.classInfo.name;
    case 'primitive': return prefix + type.name;
    case 'null': return prefix.length === 0 ? 'null' : null;
    default: return null;
  }
}

/** JVMS 4.10.1.2 verifier assignability, deliberately not runtime castability.
 * Any class/interface can widen to any interface; an array cannot use that
 * shortcut. Array supertypes must be the bootstrap-defined well-known classes.
 * The caller supplies already loaded metadata; this function never loads it.
 */
export function verifierAssignable(source: VerificationMetadataType, target: VerificationMetadataType,
  bootstrapLoader: object): boolean {
  if (metadataDescriptor(source) === null || metadataDescriptor(target) === null) return false;
  while (source.kind === 'array' && target.kind === 'array') {
    source = source.component;
    target = target.component;
  }
  if (source.kind === 'null') return target.kind !== 'primitive';
  if (source.kind === 'primitive' || target.kind === 'primitive') {
    return source.kind === 'primitive' && target.kind === 'primitive' && source.name === target.name;
  }
  if (target.kind !== 'class') return false;
  var expected = target.classInfo;
  if (source.kind === 'array') {
    return expected.definingLoader === bootstrapLoader &&
      (expected.name === 'Ljava/lang/Object;' || expected.name === 'Ljava/lang/Cloneable;' ||
       expected.name === 'Ljava/io/Serializable;');
  }
  if (source.kind !== 'class') return false;
  return source.classInfo.identity === expected.identity || expected.isInterface ||
    superclasses(source.classInfo).some(candidate => candidate.identity === expected.identity);
}

/** JVMS 4.10.1.8: package text alone does not determine a runtime package. */
export function sameRuntimePackage(a: VerificationClassMetadata, b: VerificationClassMetadata): boolean {
  return a.definingLoader === b.definingLoader &&
    a.name.slice(1, a.name.lastIndexOf('/') + 1) === b.name.slice(1, b.name.lastIndexOf('/') + 1);
}

/** The non-constructor invokespecial owner rule (JVMS 4.10.1.9).
 * Receiver -> currentClass is a separate assignability obligation, not implied
 * by this check; a transitive superinterface is not a valid direct owner.
 */
export function checkSpecialOwner(currentClass: VerificationClassMetadata,
  owner: VerificationClassMetadata): VerificationRelationResult {
  if (owner.identity === currentClass.identity ||
      superclasses(currentClass).some(candidate => candidate.identity === owner.identity) ||
      currentClass.interfaces.some(candidate => candidate.identity === owner.identity)) return accepted();
  return rejected('invokespecial owner is not the current class, a superclass, or a direct superinterface');
}

/** Metadata-only member search, not JVM member resolution: no access, loading,
 * initialization, default selection, or missing-member exception is performed.
 * A nearer declaration hides an inherited one. Constructors are not inherited.
 */
function memberDeclaration(owner: VerificationClassMetadata, name: string, descriptor: string): MemberDeclaration | null {
  var method = descriptor[0] === '(', pending = [owner], seen = new Set<object>();
  while (pending.length > 0) {
    var current = <VerificationClassMetadata> pending.pop();
    if (seen.has(current.identity)) continue;
    seen.add(current.identity);
    var declared = method ? current.methods : current.fields;
    for (var index = 0; index < declared.length; index++) {
      if (declared[index].name === name && declared[index].descriptor === descriptor) {
        return {owner: current, member: declared[index]};
      }
    }
    if (name === '<init>' || name === '<clinit>') continue;
    // Fields search superinterfaces before the superclass. Methods search the
    // class chain first; valid interface members cannot introduce protected access.
    if (!method && current.superclass !== null) pending.push(current.superclass);
    for (var iface = current.interfaces.length - 1; iface >= 0; iface--) pending.push(current.interfaces[iface]);
    if (method && current.superclass !== null) pending.push(current.superclass);
  }
  return null;
}

/** Protected instance receivers (JVMS 4.10.1.8/4.10.1.9), using the actual
 * declaration holder's package as in OpenJDK's verifier is_protected_access.
 * An unrelated owner or missing member is left to ordinary execution resolution.
 * Constructors pass their newly allocated class as the normalized receiver;
 * this()/super() initialization is checked by the type engine instead.
 */
export function checkProtectedReceiver(input: ProtectedReceiverInput): VerificationRelationResult {
  if (input.owner.kind === 'array') return accepted();
  if (input.owner.kind !== 'class') return rejected('Protected member owner must be a reference type');
  if (input.opcode === 0xb2 || input.opcode === 0xb3 || input.opcode === 0xb8) return accepted();
  var owner = input.owner.classInfo;
  if (!superclasses(input.currentClass).some(candidate => candidate.identity === owner.identity)) return accepted();
  var declaration = memberDeclaration(owner, input.memberName, input.memberDescriptor);
  if (declaration === null || (declaration.member.flags & 0x0004) === 0 ||
      sameRuntimePackage(input.currentClass, declaration.owner)) return accepted();
  // Arrays expose a public clone operation even when the constant-pool owner
  // names Object's protected clone method. Do not exempt other Object members.
  if (input.opcode === 0xb6 && input.receiver.kind === 'array' &&
      owner.name === 'Ljava/lang/Object;' && owner.definingLoader === input.bootstrapLoader &&
      input.memberName === 'clone' && input.memberDescriptor === '()Ljava/lang/Object;') return accepted();
  return verifierAssignable(input.receiver, {kind: 'class', classInfo: input.currentClass}, input.bootstrapLoader) ?
    accepted() : rejected('Protected instance receiver is not assignable to the current class');
}

/** The uninitializedThis putfield exception requires an own declaration. Static
 * mismatch and other ordinary member-access failures still belong to resolution,
 * as they do for initialized receivers; this does not resolve the field.
 */
export function checkDeclaredField(currentClass: VerificationClassMetadata, owner: VerificationClassMetadata,
  name: string, descriptor: string): VerificationRelationResult {
  if (owner.identity !== currentClass.identity) return rejected('UninitializedThis field owner is not the current class');
  return currentClass.fields.some(field => field.name === name && field.descriptor === descriptor) ?
    accepted() : rejected('UninitializedThis putfield requires a field declared by the current class');
}

/** Discharge one type-engine obligation using caller-prepared metadata only.
 * A result is not permission to execute a method: every obligation must pass,
 * and ordinary member resolution, access checks, and initialization remain later.
 */
export function checkVerificationObligation(obligation: VerificationObligation,
  context: VerificationRelationContext): VerificationRelationResult {
  var sourceName = metadataDescriptor(context.source), targetName = metadataDescriptor(context.target);
  if (sourceName === null || targetName === null || sourceName !== obligation.sourceType || targetName !== obligation.targetType) {
    return rejected('Supplied verification metadata does not match the obligation descriptors');
  }
  switch (obligation.kind) {
    case 'assignable':
      return verifierAssignable(context.source, context.target, context.bootstrapLoader) ? accepted() :
        rejected('Verification type ' + sourceName + ' is not assignable to ' + targetName);
    case 'protected':
      if (obligation.memberName === undefined || obligation.memberDescriptor === undefined) {
        return rejected('Protected receiver obligation is missing member metadata');
      }
      return checkProtectedReceiver({currentClass: context.currentClass, bootstrapLoader: context.bootstrapLoader,
        owner: context.target, receiver: context.source, memberName: obligation.memberName,
        memberDescriptor: obligation.memberDescriptor, opcode: obligation.opcode});
    case 'special-owner':
    case 'declared-field':
      if (context.source.kind !== 'class' || context.source.classInfo.identity !== context.currentClass.identity ||
          context.target.kind !== 'class') return rejected('Member owner obligation has inconsistent class identities');
      if (obligation.kind === 'special-owner') return checkSpecialOwner(context.currentClass, context.target.classInfo);
      if (obligation.memberName === undefined || obligation.memberDescriptor === undefined) {
        return rejected('Declared field obligation is missing member metadata');
      }
      return checkDeclaredField(context.currentClass, context.target.classInfo, obligation.memberName, obligation.memberDescriptor);
    default: return rejected('Unknown verification obligation');
  }
}
