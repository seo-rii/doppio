// Literal C6 type contracts are independent of guest execution. Both pinned
// native releases must validate these traces before a full-host gate can pass.
const cls = 'Ljava/lang/Class;', text = 'Ljava/lang/String;', object = 'Ljava/lang/Object;';
const cd = 'Ljava/lang/constant/ClassDesc;', mt = 'Ljava/lang/constant/MethodTypeDesc;';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;', methodType = 'Ljava/lang/invoke/MethodType;';
const support = 'classes.modern_test.NominalConstantSupport';
const operation = (owner, name, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name, descriptor});
const c = (name, descriptor, static_ = false) => operation('java.lang.constant.ClassDesc', name, descriptor,
  static_ ? 'invokestatic' : 'invokeinterface', 11);
const m = (name, descriptor, static_ = false) => operation('java.lang.constant.MethodTypeDesc', name, descriptor,
  static_ ? 'invokestatic' : 'invokeinterface', 11);
const l = (name, descriptor) => operation('java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const t = (name, descriptor) => operation('java.lang.invoke.MethodType', name, descriptor);
const j = (name, descriptor) => operation('java.lang.Class', name, descriptor);
const emit = operation(support, 'emit', '(' + text + text + ')V', 'invokestatic');
const classFactory = c('of', '(' + text + ')' + cd, true);
const classDescriptor = c('ofDescriptor', '(' + text + ')' + cd, true);
const classResolve = c('resolveConstantDesc', '(' + lookup + ')' + cls);
const methodDescriptor = m('ofDescriptor', '(' + text + ')' + mt, true);
const methodResolve = m('resolveConstantDesc', '(' + lookup + ')' + methodType);
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const rejectClassDescriptor = probe('rejectClassDescriptor', '(' + text + cls + ')V', [classDescriptor]);
const rejectClassName = probe('rejectClassName', '(' + text + 'Z' + cls + ')V',
  [classFactory, c('ofInternalName', '(' + text + ')' + cd, true)]);
const rejectNested = probe('rejectNested', '(' + cd + text + cls + ')V', [c('nested', '(' + text + ')' + cd)]);
const rejectRank = probe('rejectRank', '(' + cd + 'IZ' + cls + ')V', [c('arrayType', '()' + cd), c('arrayType', '(I)' + cd)]);
const rejectClassResolution = probe('rejectClassResolution', '(' + cd + lookup + cls + ')V', [classResolve]);
const rejectMethodDescriptor = probe('rejectMethodDescriptor', '(' + text + cls + ')V', [methodDescriptor]);
const rejectMethodArray = probe('rejectMethodArray', '(' + cd + '[' + cd + cls + ')V', [m('of', '(' + cd + '[' + cd + ')' + mt, true)]);
const rejectMethodList = probe('rejectMethodList', '(' + cd + 'Ljava/util/List;' + cls + ')V', [m('of', '(' + cd + 'Ljava/util/List;)' + mt, true)]);
const rejectMethodBounds = probe('rejectMethodBounds', '(' + mt + 'III)V',
  [m('parameterType', '(I)' + cd), m('changeParameterType', '(I' + cd + ')' + mt),
    m('dropParameterTypes', '(II)' + mt), m('insertParameterTypes', '(I[' + cd + ')' + mt)]);
const rejectMethodResolution = probe('rejectMethodResolution', '(' + mt + lookup + cls + ')V', [methodResolve]);
const erasedResolve = operation('java.lang.constant.ConstantDesc', 'resolveConstantDesc', '(' + lookup + ')' + object, 'invokeinterface', 11);
const lowerLookup = l('dropLookupMode', '(I)' + lookup);
const ensureInitialized = l('ensureInitialized', '(' + cls + ')' + cls);
const sources = [21, 25].flatMap(release => ['constant/ClassDesc', 'constant/MethodTypeDesc', 'constant/ConstantDesc',
  'invoke/MethodHandles.Lookup', 'invoke/MethodType', 'Class'].map(owner =>
  'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/' + owner + '.html'));
const limits = [
  'Finite original javac21/25 nominal type contracts, not full LIB-007/Phase C/API or sealed-interface conformance.',
  'ClassDesc array rank255 is descriptor validation only; allocating maximum-rank arrays or exhaustive MethodType slot limits is not claimed.',
  'Access tests retain the caller defining loader and reduce Lookup.PACKAGE; bootstrap publicLookup is used only for bootstrap-visible public types.',
  'Only API-specified IndexOutOfBoundsException-family errors allow concrete subclasses; all other selected errors are exact classes.',
  'The driver explicitly initializes ConstantDescs.CD_int before its16 selected cases. Primitive-factory-first cold initialization is unclaimed after a retained native25 ExceptionInInitializerError baseline.',
  'Empty MethodTypeDesc descriptors and missing member-type exception categories are outside the shared21/25 matrix: retained original native diagnostics observed25 StringIndexOutOfBoundsException for empty, and21 TypeNotPresentException versus25 ClassNotFoundException for missing. No exceptions are normalized or whitelisted.',
  'Primitive resolution with null Lookup, mixed-invalid-input priority, named modules, SecurityManager, concurrency and hidden-class GC remain unclaimed.'
];
const entry = (id, entryMethod, trace, local = [], helpers = []) => ({id, entryMethod, entryDescriptor: '()V', trace: [trace],
  probes: [probe(entryMethod, '()V', [...local, emit]), ...helpers], oracleKind: 'specification',
  anchors: {JLS: ['12.4.1', '12.4.2'], JVMS: ['4.3.2', '4.3.3', '5.4.3.1', '5.4.3.5', '5.4.4', '5.5']},
  primarySources: sources, limitations: limits});

const cases = [
  entry('nc-type-class-factories', 'caseClassFactories',
    'binary/internal/package=same;unnamed=LPlain;equal/hash=consistent',
    [classFactory, c('ofInternalName', '(' + text + ')' + cd, true), c('of', '(' + text + text + ')' + cd, true), c('descriptorString', '()' + text)]),
  entry('nc-type-class-metadata', 'caseClassMetadata',
    'unnamed=Plain;member=Map$Entry;primitive/void=9;flags/components=exact',
    [c('displayName', '()' + text), c('packageName', '()' + text), c('isClassOrInterface', '()Z'),
      c('isPrimitive', '()Z'), c('isArray', '()Z'), c('componentType', '()' + cd)]),
  entry('nc-type-class-arrays', 'caseClassArrays',
    'reference/unnamed/primitive=String[][]/Plain[][]/long[];package=empty;components=exact',
    [c('arrayType', '(I)' + cd), c('arrayType', '()' + cd), c('componentType', '()' + cd),
      c('packageName', '()' + text), c('displayName', '()' + text)]),
  entry('nc-type-class-nested', 'caseClassNested',
    'nested-levels=1/3;invalid=IllegalArgumentException;null=NullPointerException;nonclass=IllegalStateException',
    [c('nested', '(' + text + ')' + cd), c('nested', '(' + text + '[' + text + ')' + cd)], [rejectNested]),
  entry('nc-type-class-validation', 'caseClassValidation',
    'descriptor/binary/internal/package/member=IllegalArgumentException;null=NullPointerException;rejections=17',
    [c('of', '(' + text + text + ')' + cd, true)], [rejectClassDescriptor, rejectClassName]),
  entry('nc-type-class-rank', 'caseClassRank',
    'rank255=accepted;noarg-overflow=IllegalStateException;rank/void=IllegalArgumentException;allocation=unclaimed',
    [c('arrayType', '(I)' + cd), c('arrayType', '()' + cd), c('descriptorString', '()' + text)], [rejectRank]),
  entry('nc-type-class-access-passive', 'caseClassAccessPassive',
    'lookup/erased/arrays=exact;reduced=IllegalAccessException;missing=ClassNotFoundException;resolve=passive;explicit-init=once',
    [classResolve, erasedResolve, lowerLookup, ensureInitialized], [rejectClassResolution]),
  entry('nc-type-class-hidden-nonnominal', 'caseClassHiddenNonnominal',
    'original-payload=self-mirror;hidden/array/methodtype=non-nominal;runtime-name/descriptor=IllegalArgumentException',
    [l('defineHiddenClass', '([BZ[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;)' + lookup), l('lookupClass', '()' + cls),
      l('findStatic', '(' + cls + text + methodType + ')Ljava/lang/invoke/MethodHandle;'),
      operation('java.lang.invoke.MethodHandle', 'invokeExact', '()' + cls), j('describeConstable', '()Ljava/util/Optional;'),
      j('descriptorString', '()' + text), t('describeConstable', '()Ljava/util/Optional;')],
    [rejectClassName, rejectClassDescriptor, rejectMethodDescriptor, probe('payload', '()[B',
      [operation(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')])]),
  entry('nc-type-method-factories', 'caseMethodFactories',
    'noarg/List/varargs/descriptor=exact;equal/hash=consistent;empty=()I',
    [m('of', '(' + cd + ')' + mt, true), m('of', '(' + cd + 'Ljava/util/List;)' + mt, true),
      m('of', '(' + cd + '[' + cd + ')' + mt, true), methodDescriptor]),
  entry('nc-type-method-components', 'caseMethodComponents',
    'return=void;parameters=long/String[]/int;count=3;display=(long,String[],int)void',
    [m('returnType', '()' + cd), m('parameterType', '(I)' + cd), m('parameterCount', '()I'),
      m('parameterList', '()Ljava/util/List;'), m('parameterArray', '()[' + cd), m('displayDescriptor', '()' + text)]),
  entry('nc-type-method-immutability', 'caseMethodImmutability',
    'input/returned-arrays=isolated;input-list=isolated;parameter-list=immutable;original=(IJ)I',
    [m('of', '(' + cd + '[' + cd + ')' + mt, true), m('of', '(' + cd + 'Ljava/util/List;)' + mt, true),
      m('parameterArray', '()[' + cd), m('parameterList', '()Ljava/util/List;'),
      operation('java.util.List', 'set', '(I' + object + ')' + object, 'invokeinterface', 11),
      operation('java.util.List', 'add', '(' + object + ')Z', 'invokeinterface', 11)]),
  entry('nc-type-method-changes', 'caseMethodChanges',
    'return/parameter/insert/drop=exact;zero-drop=identity-by-value;original=unchanged',
    [m('changeReturnType', '(' + cd + ')' + mt), m('changeParameterType', '(I' + cd + ')' + mt),
      m('insertParameterTypes', '(I[' + cd + ')' + mt), m('dropParameterTypes', '(II)' + mt)]),
  entry('nc-type-method-validation', 'caseMethodValidation',
    'descriptor/void=IllegalArgumentException;return/array/List/element/change-null=NullPointerException;rejections=19',
    [m('of', '(' + cd + ')' + mt, true), m('changeReturnType', '(' + cd + ')' + mt),
      m('changeParameterType', '(I' + cd + ')' + mt), m('insertParameterTypes', '(I[' + cd + ')' + mt)],
    [rejectMethodDescriptor, rejectMethodArray, rejectMethodList]),
  entry('nc-type-method-bounds', 'caseMethodBounds',
    'parameter/change/drop/insert=IndexOutOfBoundsException-family;drop-start-is-half-open;rejections=11', [], [rejectMethodBounds]),
  entry('nc-type-method-resolution', 'caseMethodResolution',
    'covariant/erased=MethodType;roundtrip/Constable=exact;public-array=resolved;null-lookup=NullPointerException',
    [methodResolve, erasedResolve, t('describeConstable', '()Ljava/util/Optional;'), t('descriptorString', '()' + text),
      t('toMethodDescriptorString', '()' + text), methodDescriptor], [rejectMethodResolution]),
  entry('nc-type-method-access-passive', 'caseMethodAccessPassive',
    'private-return/parameter/array=lookup-checked;reduced=IllegalAccessException;resolution=passive;explicit-init=once',
    [methodResolve, lowerLookup, ensureInitialized], [rejectMethodResolution])
];

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}
export const nominalTypeGroup = freeze({id: 'nominal-type', source: 'classes/modern_fixture/NominalTypeFinal.java',
  mainClass: 'classes.modern_test.NominalTypeFinal', completionMarker: 'NOMINAL_TYPE_OK', releases: [21, 25],
  additionalSources: ['classes/modern_fixture/nominalconstant/NominalConstantSupport.java'],
  driverClassNames: ['classes.modern_test.NominalTypeFinal', 'classes.modern_test.NominalTypeFinal$ClassPassiveType',
    'classes.modern_test.NominalTypeFinal$MethodPassiveType', 'classes.modern_test.NominalTypeFinal$HiddenPayload', support],
  hiddenPayloads: ['classes.modern_test.NominalTypeFinal$HiddenPayload'], cases});
export default nominalTypeGroup;
