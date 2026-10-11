// Bounded C1 reference-side cases. API ownership is JVM-003; indexed JLS/JVMS
// anchors remain dependency evidence, never reassigned or full-unit claims.
const object = 'Ljava/lang/Object;';
const cls = 'Ljava/lang/Class;';
const text = 'Ljava/lang/String;';
const mh = 'Ljava/lang/invoke/MethodHandle;';
const mt = 'Ljava/lang/invoke/MethodType;';
const lookupType = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const lookupMain = 'classes.modern_test.MethodHandleLookupFinal';
const combinatorMain = 'classes.modern_test.MethodHandleCombinatorsFinal';
const target = 'Lclasses/modern_test/MethodHandleLookupFinal$Target;';
const override = 'Lclasses/modern_test/MethodHandleLookupFinal$OverrideTarget;';
const facet = 'Lclasses/modern_test/MethodHandleLookupFinal$Facet;';
const foreignSub = 'Lclasses/modern_test/MethodHandleLookupFinal$ForeignSub;';
const foreign = 'Lclasses/modern_test/methodhandle_lookup/LookupForeign;';

const member = (opcode, owner, name, descriptor) => ({opcode, tag: 10, owner, name, descriptor});
const lookup = (name, descriptor = '(' + cls + text + mt + ')' + mh) =>
  member('invokevirtual', 'java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const factory = (name, descriptor) => member('invokestatic', 'java.lang.invoke.MethodHandles', name, descriptor);
const invokeExact = descriptor => member('invokevirtual', 'java.lang.invoke.MethodHandle', 'invokeExact', descriptor);
const fieldLookup = name => lookup(name, '(' + cls + text + cls + ')' + mh);
const api = name => [21, 25].map(release =>
  'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/' + name + '.html');

function probe(method, symbolicOperands, extra = {}) {
  return {method, descriptor: '()V', requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))],
    symbolicOperands, ...extra};
}

function referenceCase(id, entryMethod, trace, probes, kind, extra = {}) {
  return {id, entryMethod, entryDescriptor: '()V', trace: [trace],
    anchors: {JLS: ['15.12.3', '15.12.4.2'], JVMS: ['5.4.3.5', '6.5.invokevirtual'], ...(extra.anchors || {})},
    probes, oracleKind: 'specification',
    limitations: ['Selected unchanged javac 21/25 unnamed-module case, not full API conformance.',
      ...(kind === 'lookup' ? ['No named-module teleportation, SecurityManager, hidden classes, or VarHandle execution.'] :
        ['Exact fixed-arity reference compositions only; no adaptation, collectors, spreaders, arbitrary loops, or VarHandles.'])],
    primarySources: [...api(kind === 'lookup' ? 'MethodHandles.Lookup' : 'MethodHandles'), ...api('MethodHandle')]};
}

const lookupCases = [
  referenceCase('lookup-authority', 'caseAuthority',
    'original=private/module/original;drop-private=package-retained;public=unconditional;denied=1;effects=0',
    [probe('caseAuthority', [lookup('lookupModes', '()I'), lookup('hasFullPrivilegeAccess', '()Z'),
      lookup('dropLookupMode', '(I)' + lookupType), lookup('findStatic')])], 'lookup',
    {anchors: {JLS: ['6.6.1'], JVMS: ['5.4.4']}}),
  referenceCase('lookup-static-wide', 'caseStaticWide',
    'reference=same;long=9007199254740993;double=-0.0;effects=1',
    [probe('caseStaticWide', [lookup('findStatic'), invokeExact('(JD' + object + ')' + object)])], 'lookup',
    {anchors: {JLS: ['15.12.3', '15.12.4.2'], JVMS: ['5.4.3.5', '2.6.1', '2.6.2', '6.5.invokevirtual']}}),
  referenceCase('lookup-virtual-dispatch', 'caseVirtualDispatch',
    'receiver=Target;dispatch=override;reference=same;effects=1',
    [probe('caseVirtualDispatch', [lookup('findVirtual'), invokeExact('(' + target + object + ')' + object)])], 'lookup',
    {anchors: {JLS: ['15.12.4.4'], JVMS: ['5.4.3.5', '6.5.invokevirtual']}}),
  referenceCase('lookup-interface-dispatch', 'caseInterfaceDispatch',
    'receiver=Facet;dispatch=override;reference=same;effects=1',
    [probe('caseInterfaceDispatch', [lookup('findVirtual'), invokeExact('(' + facet + object + ')' + object)])], 'lookup',
    {anchors: {JLS: ['15.12.4.4'], JVMS: ['5.4.3.5', '6.5.invokevirtual']}}),
  referenceCase('lookup-special-nonvirtual', 'caseSpecialNonvirtual',
    'receiver=OverrideTarget;dispatch=base;reference=same;effects=1',
    [probe('caseSpecialNonvirtual', [invokeExact('(' + override + object + ')' + object)]),
      probe('specialHandle', [lookup('findSpecial', '(' + cls + text + mt + cls + ')' + mh)],
        {descriptor: '()' + mh, className: lookupMain + '$OverrideTarget'})], 'lookup',
    {anchors: {JLS: ['15.12.4.4'], JVMS: ['5.4.3.5', '6.5.invokevirtual']}}),
  referenceCase('lookup-constructor-identity', 'caseConstructorIdentity',
    'result=Target;allocations=distinct;payload=same;constructors=2;calls=0',
    [probe('caseConstructorIdentity', [lookup('findConstructor', '(' + cls + mt + ')' + mh),
      invokeExact('(' + object + ')' + target)])], 'lookup',
    {anchors: {JLS: ['15.9.4'], JVMS: ['5.4.3.5', '6.5.invokevirtual']}}),
  referenceCase('lookup-instance-reference-fields', 'caseInstanceReferenceFields',
    'before=first;after=second;stored=same;calls=0',
    [probe('caseInstanceReferenceFields', [fieldLookup('findGetter'), fieldLookup('findSetter'),
      invokeExact('(' + target + ')' + object), invokeExact('(' + target + object + ')V')])], 'lookup'),
  referenceCase('lookup-instance-wide-fields', 'caseInstanceWideFields',
    'long=9007199254740993;stored=exact;calls=0',
    [probe('caseInstanceWideFields', [fieldLookup('findGetter'), fieldLookup('findSetter'),
      invokeExact('(' + target + ')J'), invokeExact('(' + target + 'J)V')])], 'lookup',
    {anchors: {JLS: ['15.12.3'], JVMS: ['5.4.3.5', '2.6.1', '2.6.2', '6.5.invokevirtual']}}),
  referenceCase('lookup-static-wide-fields', 'caseStaticWideFields',
    'long=9007199254740993;stored=exact;calls=0',
    [probe('caseStaticWideFields', [fieldLookup('findStaticGetter'), fieldLookup('findStaticSetter'),
      invokeExact('()J'), invokeExact('(J)V')])], 'lookup',
    {anchors: {JLS: ['15.12.3'], JVMS: ['5.4.3.5', '2.6.1', '2.6.2', '6.5.invokevirtual']}}),
  referenceCase('lookup-private-nest-capability', 'casePrivateNestCapability',
    'nest-creation=allowed;transferred-invocation=same;public-creation=denied;effects=1',
    [probe('casePrivateNestCapability', [lookup('findStatic'), invokeExact('(' + object + ')' + object)]),
      probe('capability', [lookup('findStatic')], {descriptor: '()' + mh, className: lookupMain + '$Nest'})], 'lookup',
    {anchors: {JLS: ['6.6.1'], JVMS: ['5.4.3.5', '5.4.4', '6.5.invokevirtual']}}),
  referenceCase('lookup-private-lookup-in', 'casePrivateLookupIn',
    'lookup-class=Target;private=enabled;reference=same;public-caller=denied;effects=1',
    [probe('casePrivateLookupIn', [factory('privateLookupIn', '(' + cls + lookupType + ')' + lookupType),
      lookup('findVirtual'), invokeExact('(' + target + object + ')' + object)])], 'lookup',
    {anchors: {JLS: ['6.6.1'], JVMS: ['5.4.3.5', '5.4.4', '6.5.invokevirtual']}}),
  referenceCase('lookup-package-access', 'casePackageAccess',
    'same-package=allowed;public-only=denied;reference=same;effects=1',
    [probe('casePackageAccess', [lookup('findStatic'), invokeExact('(' + object + ')' + object)])], 'lookup',
    {anchors: {JLS: ['6.6.1'], JVMS: ['5.4.3.5', '5.4.4', '6.5.invokevirtual']}}),
  referenceCase('lookup-protected-receiver', 'caseProtectedReceiver',
    'receiver=narrowed-ForeignSub;reference=same;wrong-exact-type=rejected;effects=1',
    [probe('caseProtectedReceiver', [invokeExact('(' + foreignSub + object + ')' + object),
      invokeExact('(' + foreign + object + ')' + object)]),
      probe('protectedHandle', [lookup('findVirtual')], {descriptor: '()' + mh, className: lookupMain + '$ForeignSub'})], 'lookup',
    {anchors: {JLS: ['6.6.2.1', '15.12.3'], JVMS: ['5.4.3.5', '5.4.4', '6.5.invokevirtual']}}),
  referenceCase('lookup-unreflect-identity', 'caseUnreflectIdentity',
    'virtual=override;private=same;constructor-payload=same;public-private=denied;calls=2;constructors=1',
    [probe('caseUnreflectIdentity', [lookup('unreflect', '(Ljava/lang/reflect/Method;)' + mh),
      lookup('unreflectConstructor', '(Ljava/lang/reflect/Constructor;)' + mh),
      invokeExact('(' + target + object + ')' + object), invokeExact('(' + object + ')' + target)])], 'lookup',
    {anchors: {JLS: ['6.6.1'], JVMS: ['5.4.3.5', '5.4.4', '6.5.invokevirtual']}}),
  referenceCase('lookup-creation-errors', 'caseCreationErrors',
    'missing=2;denied=2;effects=0;reference=unobserved',
    [probe('caseCreationErrors', [lookup('findStatic'), fieldLookup('findStaticSetter')])], 'lookup',
    {anchors: {JLS: ['6.6.1'], JVMS: ['5.4.4']}}),
  referenceCase('lookup-null-receiver', 'caseNullReceiver',
    'null-virtual/getter=rejected;effects=0;reference=unobserved',
    [probe('caseNullReceiver', [lookup('findVirtual'), fieldLookup('findGetter'),
      invokeExact('(' + target + object + ')' + object), invokeExact('(' + target + ')' + object)])], 'lookup')
];

const unary = '(' + object + ')' + object;
const guard = factory('guardWithTest', '(' + mh + mh + mh + ')' + mh);
const filterArguments = factory('filterArguments', '(' + mh + 'I[' + mh + ')' + mh);
const filterReturnValue = factory('filterReturnValue', '(' + mh + mh + ')' + mh);
const fold = factory('foldArguments', '(' + mh + mh + ')' + mh);
const catchException = factory('catchException', '(' + mh + cls + mh + ')' + mh);
const tryFinally = factory('tryFinally', '(' + mh + mh + ')' + mh);
const permute = factory('permuteArguments', '(' + mh + mt + '[I)' + mh);

function composition(id, method, trace, combinator, descriptor = unary, extra = {}) {
  const symbols = Array.isArray(combinator) ? combinator : [combinator];
  return referenceCase(id, method, trace,
    [probe(method, descriptor === null ? symbols : [...symbols, invokeExact(descriptor)]),
      probe('handle', [lookup('findStatic')], {descriptor: '(' + text + mt + ')' + mh})], 'combinator', extra);
}

const combinatorCases = [
  composition('combinator-guard-select', 'caseGuardSelect',
    'order=PAPB;branches=exclusive;references=same', guard),
  composition('combinator-guard-predicate-failure', 'caseGuardPredicateFailure',
    'order=P;throwable=original;branches=absent', guard),
  composition('combinator-filter-argument-order', 'caseFilterArgumentOrder',
    'order=LRT;argument-identities=same;return=first', filterArguments, '(' + object + object + ')' + object),
  composition('combinator-filter-argument-failure', 'caseFilterArgumentFailure',
    'order=F;throwable=original;later-filter/target=absent', filterArguments, '(' + object + object + ')' + object),
  composition('combinator-filter-return-order', 'caseFilterReturnOrder',
    'order=TR;target-result/filtered-return=same', filterReturnValue),
  composition('combinator-fold-value-wide', 'caseFoldValueWide',
    'order=CT;long=9007199254740993;reference=same', fold),
  composition('combinator-fold-void-order', 'caseFoldVoidOrder',
    'order=CT;void-does-not-add-argument;reference=same', fold),
  composition('combinator-catch-match', 'caseCatchMatch',
    'order=TH;handler-throwable=original;handler-argument/return=same', catchException),
  composition('combinator-catch-miss', 'caseCatchMiss',
    'order=T;throwable=original;handler=absent', catchException),
  composition('combinator-finally-success', 'caseFinallySuccess',
    'order=TC;throwable=null;cleanup-sees-original-result/argument;return=cleanup-reference', tryFinally),
  composition('combinator-finally-target-failure', 'caseFinallyTargetFailure',
    'order=TC;throwable=original;cleanup-result-placeholder=null;cleanup-return=ignored', tryFinally,
    unary, {anchors: {JLS: ['14.20.2'], JVMS: ['5.4.3.5', '6.5.invokevirtual']}}),
  composition('combinator-finally-cleanup-failure', 'caseFinallyCleanupFailure',
    'order=TC;throwable=cleanup-original;target-throwable=replaced;automatic-suppression=absent', tryFinally,
    unary, {anchors: {JLS: ['14.20.2'], JVMS: ['5.4.3.5', '6.5.invokevirtual']}}),
  composition('combinator-permute-wide-duplicates', 'casePermuteWideDuplicates',
    'order=T;duplicate-references=same;long=9007199254740993;return=same', permute, '(J' + object + ')' + object,
    {anchors: {JLS: ['15.12.3'], JVMS: ['5.4.3.5', '2.6.1', '2.6.2', '6.5.invokevirtual']}}),
  composition('combinator-insert-bound-wide', 'caseInsertBoundWide',
    'order=T;bound-reference=same;long=9007199254740993;argument=same',
    factory('insertArguments', '(' + mh + 'I[' + object + ')' + mh)),
  composition('combinator-drop-wide-slots', 'caseDropWideSlots',
    'order=T;unused=reference/long/double;remaining-reference=same',
    factory('dropArguments', '(' + mh + 'I[' + cls + ')' + mh), '(' + object + 'JD' + object + ')' + object,
    {anchors: {JLS: ['15.12.3'], JVMS: ['5.4.3.5', '2.6.1', '2.6.2', '6.5.invokevirtual']}}),
  composition('combinator-factory-rejections', 'caseFactoryRejections',
    'guard/permute/filter/finally=rejected;callbacks=absent', [guard, permute, filterArguments, tryFinally], null,
    {anchors: {JVMS: ['6.5.invokestatic']}})
];

function deeplyFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deeplyFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const referenceGroups = deeplyFreeze([
  {id: 'methodhandle-lookup', source: 'classes/modern_fixture/MethodHandleLookupFinal.java',
    additionalSources: ['classes/modern_fixture/methodhandle_lookup/LookupForeign.java'],
    mainClass: lookupMain, completionMarker: 'METHODHANDLE_LOOKUP_OK', releases: [21, 25],
    driverClassNames: [lookupMain, lookupMain + '$Facet', lookupMain + '$Target', lookupMain + '$OverrideTarget',
      lookupMain + '$Nest', lookupMain + '$ForeignSub', 'classes.modern_test.LookupPackagePeer',
      'classes.modern_test.methodhandle_lookup.LookupForeign'], cases: lookupCases},
  {id: 'methodhandle-combinators', source: 'classes/modern_fixture/MethodHandleCombinatorsFinal.java',
    mainClass: combinatorMain, completionMarker: 'METHODHANDLE_COMBINATORS_OK', releases: [21, 25],
    driverClassNames: [combinatorMain, combinatorMain + '$ProbeFailure'], cases: combinatorCases}
]);

export default referenceGroups;
