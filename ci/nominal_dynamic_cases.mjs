// C6 literal DynamicConstantDesc API contracts. These do not reuse the C4
// constant-pool cache oracle, and do not derive expected traces from a guest.
const main = 'classes.modern_test.NominalDynamicFinal';
const support = 'classes.modern_test.NominalConstantSupport';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;', text = 'Ljava/lang/String;', object = 'Ljava/lang/Object;';
const cls = 'Ljava/lang/Class;', cd = 'Ljava/lang/constant/ClassDesc;', constant = 'Ljava/lang/constant/ConstantDesc;';
const direct = 'Ljava/lang/constant/DirectMethodHandleDesc;', dynamic = 'Ljava/lang/constant/DynamicConstantDesc;';
const type = 'Ljava/lang/constant/MethodTypeDesc;', kind = 'Ljava/lang/constant/DirectMethodHandleDesc$Kind;';
const call = (owner, name, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name, descriptor});
const d = (name, descriptor, static_ = false) => call('java.lang.constant.DynamicConstantDesc', name, descriptor,
  static_ ? 'invokestatic' : 'invokevirtual');
const named = d('ofNamed', '(' + direct + text + cd + '[' + constant + ')' + dynamic, true);
const defaults = d('of', '(' + direct + ')' + dynamic, true);
const canonical = d('ofCanonical', '(' + direct + text + cd + '[' + constant + ')' + constant, true);
const resolve = d('resolveConstantDesc', '(' + lookup + ')' + object);
const erased = call('java.lang.constant.ConstantDesc', 'resolveConstantDesc', '(' + lookup + ')' + object, 'invokeinterface', 11);
const l = (name, descriptor) => call('java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const emit = call(support, 'emit', '(' + text + text + ')V', 'invokestatic');
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const bootstrap = probe('bootstrap', '(' + text + 'Z)' + direct,
  [call('java.lang.constant.MethodHandleDesc', 'ofMethod', '(' + kind + cd + text + type + ')' + direct, 'invokestatic', 11),
    call('java.lang.constant.MethodTypeDesc', 'of', '(' + cd + '[' + cd + ')' + type, 'invokestatic', 11)]);
const descriptor = probe('descriptor', '(' + text + text + cd + '[' + constant + ')' + dynamic, [named]);
const descriptorHelpers = [descriptor, bootstrap];
const sources = [21, 25].flatMap(release => ['constant/DynamicConstantDesc', 'constant/ConstantDesc', 'constant/ConstantDescs',
  'constant/MethodHandleDesc', 'constant/DirectMethodHandleDesc', 'Enum.EnumDesc', 'invoke/MethodHandles.Lookup', 'invoke/MethodHandles']
  .map(owner => 'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/' + owner + '.html'));
const limitations = [
  'Finite original javac21/25 DynamicConstantDesc API resolution, not full LIB-007/Phase C/API or arbitrary-bootstrap conformance.',
  'API resolveConstantDesc reinvokes the bootstrap with no cache. C4 CONSTANT_Dynamic CP-entry caching is a distinct runtime path and is not reclassified by these cases.',
  'Opaque user bootstrap bodies are bound to independent original companion Code proofs; static API reachability is not bootstrap branch-execution coverage.',
  'The erased-result case is a pinned-native regression, not a normative claim that CP ldc may return a value outside its declared constant type.',
  'Canonical projection selects null, primitive and enum forms; all other well-known or user canonicalizers, mixed-invalid-input priority, custom loaders, named modules, GC and concurrency remain unclaimed.',
  'ConstantDescs.CD_int is the explicit canonical initialization entry; primitive-factory-first cold native25 initialization remains a separately retained failure boundary.'
];
const entry = (id, entryMethod, trace, operands, helpers = [], oracleKind = 'specification') => ({id, entryMethod,
  entryDescriptor: '()V', trace: [trace], oracleKind,
  anchors: {JVMS: ['4.2.2', '4.3.2', '4.4.10', '5.4.3', '5.4.4', '5.4.3.6']},
  primarySources: sources, limitations, probes: [probe(entryMethod, '()V', [...operands, emit]), ...helpers]});
const cases = [
  entry('nc-dynamic-factory-metadata', 'caseFactoryMetadata',
    'clones=2;list=immutable;equal/hash=true;name/type/bootstrap/defaults=exact',
    [named, defaults, d('bootstrapArgs', '()[' + constant), d('bootstrapArgsList', '()Ljava/util/List;'),
      d('bootstrapMethod', '()' + direct), d('constantName', '()' + text), d('constantType', '()' + cd),
      call('java.util.List', 'set', '(I' + object + ')' + object, 'invokeinterface', 11)], [bootstrap]),
  entry('nc-dynamic-factory-validation', 'caseFactoryValidation',
    'bad-name=IllegalArgumentException:5;null=NullPointerException:4', [named], [bootstrap]),
  entry('nc-dynamic-canonical-null-primitive', 'caseCanonicalNullPrimitive',
    'null=name/type-independent;primitive=ClassDesc;resolved=null/long.class', [canonical, erased]),
  entry('nc-dynamic-canonical-enum', 'caseCanonicalEnum',
    'canonical=EnumDesc;equal=true;resolved=ALPHA-identity', [canonical, erased,
      call('java.lang.Enum$EnumDesc', 'of', '(' + cd + text + ')Ljava/lang/Enum$EnumDesc;', 'invokestatic')]),
  entry('nc-dynamic-user-lookup-name-type', 'caseUserLookupNameType',
    'caller-lookup=identity;name=named;type=Integer;value=17;calls=1', [resolve], descriptorHelpers),
  entry('nc-dynamic-private-bootstrap-access', 'casePrivateBootstrapAccess',
    'reduced=BootstrapMethodError/IllegalAccessException;effects=0;own=wide;calls=1',
    [resolve, l('dropLookupMode', '(I)' + lookup), call('java.lang.BootstrapMethodError', 'getCause', '()Ljava/lang/Throwable;')], descriptorHelpers),
  entry('nc-dynamic-nested-order', 'caseNestedOrder',
    'argument-order=AB;outer-last=C;result=AB;calls=3', [resolve], descriptorHelpers),
  entry('nc-dynamic-no-cache-identity', 'caseNoCacheIdentity',
    'same-descriptor=reinvoked;results=distinct;calls=2', [resolve], descriptorHelpers),
  entry('nc-dynamic-null-result', 'caseNullResult', 'null=preserved;calls=1', [resolve], descriptorHelpers),
  entry('nc-dynamic-wide-varargs', 'caseWideVarargs',
    'args=Long/Double/String;collector=3;value=9007199254740994;calls=1', [resolve,
      call('java.lang.Long', 'longValue', '()J'), call('java.lang.Double', 'valueOf', '(D)Ljava/lang/Double;', 'invokestatic')], descriptorHelpers),
  entry('nc-dynamic-erased-result', 'caseErasedResult',
    'API-not-CP-ldc;declared=String;erased-result=Integer:17;calls=1', [erased], descriptorHelpers, 'pinned-native-regression'),
  entry('nc-dynamic-error-passthrough', 'caseErrorPassthrough',
    'Error=exact-identity;wrapper=none;calls=1', [resolve], descriptorHelpers),
  entry('nc-dynamic-exception-wrapper', 'caseExceptionWrapper',
    'checked=BootstrapMethodError;cause=exact-identity;calls=1', [resolve,
      call('java.lang.BootstrapMethodError', 'getCause', '()Ljava/lang/Throwable;')], descriptorHelpers),
  entry('nc-dynamic-nested-failure-barrier', 'caseNestedFailureBarrier',
    'first-arg-error=identity;later/outer-effects=0;calls=1', [resolve], descriptorHelpers),
  entry('nc-dynamic-bootstrap-shape', 'caseBootstrapShape',
    'wrong-first/arity=BootstrapMethodError:2;effects=0', [defaults, resolve,
      call('java.lang.constant.MethodHandleDesc', 'ofMethod', '(' + kind + cd + text + type + ')' + direct, 'invokestatic', 11)]),
  entry('nc-dynamic-hidden-class-data', 'caseHiddenClassData',
    'ORIGINAL-required;denied-init=0;data=identity;init=1;calls=2', [resolve,
      l('defineHiddenClassWithClassData', '([B' + object + 'Z[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;)' + lookup),
      l('dropLookupMode', '(I)' + lookup), l('lookupClass', '()' + cls), call('java.lang.Class', 'isHidden', '()Z')],
    [...descriptorHelpers, probe('hiddenPayload', '()[B', [call(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')])])
];
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
export const nominalDynamicGroup = freeze({id: 'nominal-dynamic', source: 'classes/modern_fixture/NominalDynamicFinal.java',
  additionalSources: ['classes/modern_fixture/nominalconstant/NominalConstantSupport.java'], mainClass: main,
  completionMarker: 'NOMINAL_DYNAMIC_OK', releases: [21, 25],
  driverClassNames: [main, main + '$Mode', main + '$HiddenPayload', support], hiddenPayloads: [main + '$HiddenPayload'], cases});
export default nominalDynamicGroup;
