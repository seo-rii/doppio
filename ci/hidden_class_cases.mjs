// C5 selected genuine-source contracts. Expected traces were authored separately
// from guest execution and checked against both pinned native JDKs.
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const options = '[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;';
const cls = 'Ljava/lang/Class;', object = 'Ljava/lang/Object;', text = 'Ljava/lang/String;';
const handle = 'Ljava/lang/invoke/MethodHandle;', type = 'Ljava/lang/invoke/MethodType;';
const support = 'classes.modern_test.HiddenClassSupport';
const operation = (owner, name, descriptor, opcode = 'invokevirtual') => ({opcode, tag: 10, owner, name, descriptor});
const l = (name, descriptor) => operation('java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const c = (name, descriptor) => operation('java.lang.Class', name, descriptor);
const m = (name, descriptor) => operation('java.lang.invoke.MethodHandles', name, descriptor, 'invokestatic');
const h = (name, descriptor) => operation('java.lang.invoke.MethodHandle', name, descriptor);
const f = (name, descriptor) => operation('java.lang.reflect.Field', name, descriptor);
const emit = operation(support, 'emit', '(' + text + text + ')V', 'invokestatic');
const defineHidden = l('defineHiddenClass', '([BZ' + options + ')' + lookup);
const defineData = l('defineHiddenClassWithClassData', '([B' + object + 'Z' + options + ')' + lookup);
const classData = m('classData', '(' + lookup + text + cls + ')' + object);
const classDataAt = m('classDataAt', '(' + lookup + text + cls + 'I)' + object);
const dropMode = l('dropLookupMode', '(I)' + lookup);
const constructor = l('findConstructor', '(' + cls + type + ')' + handle);
const staticHandle = l('findStatic', '(' + cls + text + type + ')' + handle);
const hidden = c('isHidden', '()Z');
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const resource = method => probe(method, '()[B', [operation(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')]);
const rejection = probe('rejectDefinition', '(' + lookup + '[BZ' + cls + options + ')Ljava/lang/Throwable;', [defineHidden], support);
const dataRejection = probe('rejectData', '(' + lookup + text + cls + cls + ')Ljava/lang/Throwable;', [classData], support);
const indexedRejection = probe('rejectDataAt', '(' + lookup + text + cls + 'I' + cls + ')Ljava/lang/Throwable;', [classDataAt], support);
const ordinaryDefine = probe('define', '(Z' + options + ')' + lookup, [defineHidden]);
const identityDefine = probe('define', '(' + options + ')' + lookup, [defineHidden]);
const nestDefine = probe('defineNest', '(' + options + ')' + lookup, [defineHidden]);
const dataDefine = probe('define', '(' + object + ')' + lookup, [defineData]);
const noDataDefine = probe('noData', '()' + lookup, [defineHidden]);
const instance = probe('instance', '(' + lookup + ')' + object, [constructor, h('invoke', '()' + object)]);
const sourceUrls = [21, 25].flatMap(release => ['invoke/MethodHandles.Lookup', 'invoke/MethodHandles', 'Class', 'reflect/Field']
  .map(owner => 'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/' + owner + '.html'));
const limits = [
  'Selected original javac21/25 unnamed-module definition, identity, class-data and reflection contracts, not full JVM-005/Phase C/API conformance.',
  'No GC/unloading/STRONG-lifetime, named-module/security-manager, concurrent definition or arbitrary malformed-class lattice claim.',
  'Generated hidden-name suffix values and mixed-invalid-argument error priority are not compared or normalized.',
  'Hidden payload this_class changes identity; original self field/method descriptors and InnerClasses attributes are not rewritten.',
  'Nominal constant resolution, public class-file APIs and hidden class-data CONSTANT_Dynamic consumers are not C5 exits.'
];
const entry = (id, entryMethod, trace, local = [], helpers = [], extra = []) => ({id, entryMethod, entryDescriptor: '()V', trace: [trace],
  probes: [probe(entryMethod, '()V', [...local, emit]), ...helpers], oracleKind: 'specification',
  anchors: {JLS: ['12.4.1', '12.4.2'], JVMS: ['5.3.5', '5.4.1', '5.4.4', '5.5']},
  primarySources: sourceUrls, limitations: [...limits, ...extra]});

const definitionCases = [
  entry('hc-definition-passive', 'casePassiveDefinition',
    'hidden=true;ordinary=false;lookup=95;loader/domain=same;initialization=absent',
    [hidden, l('lookupModes', '()I'), l('hasFullPrivilegeAccess', '()Z'), c('getClassLoader', '()Ljava/lang/ClassLoader;'),
      c('getProtectionDomain', '()Ljava/security/ProtectionDomain;'), c('getPackageName', '()' + text)], [ordinaryDefine, resource('payload')]),
  entry('hc-definition-eager', 'caseEagerDefinition', 'initialize=true;initializer=once;static-call=43',
    [staticHandle, h('invokeExact', '()I')], [ordinaryDefine]),
  entry('hc-definition-ensure-initialized', 'caseEnsureInitialized', 'passive=0;ensure=identity;repeated-ensure=once',
    [l('ensureInitialized', '(' + cls + ')' + cls)], [ordinaryDefine]),
  entry('hc-definition-private-constructor-handle', 'caseConstructorPrivateHandle',
    'constructor-return=hidden;private-method=41;receiver=exact-class',
    [constructor, l('findVirtual', '(' + cls + text + type + ')' + handle), h('invoke', '()' + object), h('invoke', '(' + object + ')I')], [ordinaryDefine]),
  entry('hc-definition-public-lookup-denied', 'casePublicLookupDenied', 'IllegalAccessException;initialization=absent',
    [m('publicLookup', '()' + lookup)], [rejection, resource('payload')]),
  entry('hc-definition-dropped-private-denied', 'caseDroppedPrivateDenied', 'PRIVATE-absent;full=false;IllegalAccessException',
    [dropMode, l('hasFullPrivilegeAccess', '()Z')], [rejection]),
  entry('hc-definition-dropped-module-denied', 'caseDroppedModuleDenied', 'MODULE-absent;full=false;IllegalAccessException',
    [dropMode, l('hasFullPrivilegeAccess', '()Z')], [rejection]),
  entry('hc-definition-dropped-original-allowed', 'caseDroppedOriginalAllowed',
    'caller-ORIGINAL=absent;full=true;defined-lookup=95', [dropMode, defineHidden, hidden, l('lookupModes', '()I')]),
  entry('hc-definition-foreign-package-denied', 'caseForeignPackageDenied', 'different-package=IllegalArgumentException',
    [operation(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')], [rejection]),
  entry('hc-definition-null-arguments', 'caseNullArguments', 'bytes/options/option-element=NullPointerException;rejections=3', [], [rejection]),
  entry('hc-definition-malformed-bytes', 'caseMalformedBytes', 'empty/truncated/bad-magic=ClassFormatError;original-bytes=unchanged', [], [rejection, resource('payload')],
    ['Only deliberately malformed in-memory API requests are changed; the original genuine classpath and valid definition bytes are immutable.']),
  entry('hc-definition-unsupported-version', 'caseUnsupportedVersion',
    'invalid-request-major=32767;UnsupportedClassVersionError;original-bytes=unchanged', [], [rejection, resource('payload')],
    ['The invalid API request changes major to unsupported32767; this is not a carrier or rewriting genuine21/25 execution inputs.']),
  entry('hc-definition-interface', 'caseInterfaceDefinition', 'hidden/interface=true;self-nest=true;static-value=59',
    [defineHidden, hidden, c('isInterface', '()Z'), staticHandle, h('invokeExact', '()I')]),
  entry('hc-definition-strong-option', 'caseStrongOption', 'definition=accepted;hidden=true;self-nest=true;GC-lifetime=unclaimed',
    [hidden, c('getNestHost', '()' + cls)], [ordinaryDefine]),
  entry('hc-definition-combined-options', 'caseNestmateStrongOptions',
    'NESTMATE/STRONG=accepted;duplicate=IllegalArgumentException;host=caller-nest;GC-lifetime=unclaimed',
    [c('isNestmateOf', '(' + cls + ')Z')], [ordinaryDefine, rejection]),
  entry('hc-definition-self-return-verification', 'caseSelfReturnVerification',
    'hidden-this-to-ordinary-return=VerifyError;subsequent-valid-definition=allowed',
    [operation(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')], [rejection, ordinaryDefine])
];

const rejectForName = probe('rejectForName', '(' + text + 'Ljava/lang/ClassLoader;)V',
  [operation('java.lang.Class', 'forName', '(' + text + 'ZLjava/lang/ClassLoader;)' + cls, 'invokestatic')]);
const rejectFind = probe('rejectFindClass', '(' + lookup + text + ')V', [l('findClass', '(' + text + ')' + cls)]);
const identityCases = [
  entry('hc-identity-distinct-definitions', 'caseDistinctDefinitions', 'same-source=distinct-classes/names;instances/casts=isolated',
    [c('isInstance', '(' + object + ')Z'), c('isAssignableFrom', '(' + cls + ')Z')], [identityDefine, instance]),
  entry('hc-identity-runtime-name-descriptor', 'caseRuntimeNameDescriptor',
    'name=GN/slash-suffix;descriptor=L-N-dot-suffix-semicolon;suffix-value=unclaimed',
    [c('getName', '()' + text), c('descriptorString', '()' + text), c('getTypeName', '()' + text)], [identityDefine]),
  entry('hc-identity-for-name-non-discovery', 'caseClassForNameNonDiscovery',
    'runtime-name=ClassNotFoundException;defining-loader=unchanged', [], [identityDefine, rejectForName]),
  entry('hc-identity-lookup-non-discovery', 'caseLookupNonDiscovery',
    'caller/hidden-lookups=ClassNotFoundException;rejections=2', [], [identityDefine, rejectFind]),
  entry('hc-identity-ordinary-twin-distinct', 'caseOrdinaryTwinDistinct',
    'original-name=ordinary-class;loader=same;hidden-twin=distinct/unassignable',
    [operation('java.lang.Class', 'forName', '(' + text + 'ZLjava/lang/ClassLoader;)' + cls, 'invokestatic'), hidden,
      c('isAssignableFrom', '(' + cls + ')Z')], [identityDefine]),
  entry('hc-identity-this-class-mirror', 'caseThisClassMirror', 'ldc-this-class=exact-hidden;method-handle/reflection=same-mirror',
    [staticHandle, h('invokeExact', '()' + cls), operation('java.lang.reflect.Method', 'invoke', '(' + object + '[' + object + ')' + object)], [identityDefine]),
  entry('hc-identity-ordinary-self-descriptors', 'caseOrdinarySelfDescriptors',
    'field/return-original-N=ordinary-class;descriptors=not-rewritten',
    [f('getType', '()' + cls), operation('java.lang.reflect.Method', 'getReturnType', '()' + cls)], [identityDefine]),
  entry('hc-identity-array-mirrors', 'caseHiddenArrays',
    'array-hidden=false;component=exact-hidden;cached=true;values=identity;dimensions=2x3',
    [c('arrayType', '()' + cls), c('getComponentType', '()' + cls), c('getPackageName', '()' + text),
      operation('java.lang.reflect.Array', 'newInstance', '(' + cls + 'I)' + object, 'invokestatic'),
      operation('java.lang.reflect.Array', 'newInstance', '(' + cls + '[I)' + object, 'invokestatic')], [identityDefine, instance]),
  entry('hc-identity-array-non-discovery', 'caseHiddenArrayNonDiscovery',
    'array-runtime-name=ClassNotFoundException;loader/lookup-rejections=2', [c('arrayType', '()' + cls)], [identityDefine, rejectForName, rejectFind]),
  entry('hc-identity-non-nominal-restrictions', 'caseNonNominalRestrictions',
    'hidden/array-canonical=null;hidden/array-constable=empty;C6-resolution=unclaimed',
    [c('getCanonicalName', '()' + text), c('describeConstable', '()Ljava/util/Optional;')], [identityDefine]),
  entry('hc-identity-default-nest-isolation', 'caseDefaultNestIsolation',
    'raw-NestHost=ignored;host=self;members=self-only;caller-nest=separate',
    [c('getNestHost', '()' + cls), c('getNestMembers', '()[' + cls), c('isNestmateOf', '(' + cls + ')Z')], [identityDefine]),
  entry('hc-identity-nestmate-non-enumeration', 'caseNestmateNonEnumeration',
    'host=caller-nest;nestmate=true;hidden-excluded-from-members=true',
    [c('getNestHost', '()' + cls), c('getNestMembers', '()[' + cls)], [identityDefine]),
  entry('hc-identity-nest-bytecode-access', 'caseNestBytecodeAccess',
    'without-option=IllegalAccessError/no-effect;NESTMATE=private-getstatic;wide=9007199254740993;effects=1',
    [staticHandle, h('invokeExact', '()J')], [nestDefine]),
  entry('hc-identity-nest-lookup-access', 'caseNestLookupAccess',
    'without-option=IllegalAccessException;NESTMATE=private-method/37', [staticHandle, h('invokeExact', '()I')], [identityDefine]),
  entry('hc-identity-final-field-reflection', 'caseFinalFieldReflection',
    'accessible=true;all-9-set-families/findSetter/unreflectSetter=IllegalAccessException;VarHandle=read-only;values=unchanged',
    [f('get', '(' + object + ')' + object), l('unreflectSetter', '(Ljava/lang/reflect/Field;)' + handle),
      l('findSetter', '(' + cls + text + cls + ')' + handle), l('findVarHandle', '(' + cls + text + cls + ')Ljava/lang/invoke/VarHandle;'),
      operation('java.lang.invoke.VarHandle', 'get', '(' + object + ')J'), operation('java.lang.invoke.VarHandle', 'set', '(' + object + 'J)V')],
    [identityDefine, instance, probe('rejectFinalWrite', '(Ljava/lang/reflect/Field;' + object + 'I)V',
      [f('setBoolean', '(' + object + 'Z)V'), f('setByte', '(' + object + 'B)V'), f('setChar', '(' + object + 'C)V'),
        f('setShort', '(' + object + 'S)V'), f('setInt', '(' + object + 'I)V'), f('setLong', '(' + object + 'J)V'),
        f('setFloat', '(' + object + 'F)V'), f('setDouble', '(' + object + 'D)V'), f('set', '(' + object + object + ')V')])]),
  entry('hc-identity-mutable-reflection', 'caseMutableReflection',
    'reflected-constructor=hidden;declaring-class=exact;ordinary-set/setInt=allowed;value=13',
    [operation('java.lang.reflect.Constructor', 'newInstance', '([' + object + ')' + object),
      f('getDeclaringClass', '()' + cls), f('set', '(' + object + object + ')V'), f('setInt', '(' + object + 'I)V'), f('getInt', '(' + object + ')I')], [identityDefine])
];

const dataCases = [
  entry('hc-data-reference-identity', 'caseReferenceIdentity', 'original-reference=identity;repeated-query=same;lookup=hidden', [classData], [dataDefine]),
  entry('hc-data-definition-isolation', 'caseDefinitionIsolation', 'same-payload=distinct-classes;data=isolated-identities', [classData], [dataDefine]),
  entry('hc-data-query-initializes', 'caseQueryInitializes', 'definition=passive;first-query=initializer-once;repeat=no-extra-init', [classData], [dataDefine]),
  entry('hc-data-indexed-query-initializes', 'caseIndexedQueryInitializes', 'list-element=identity;definition=passive;indexed-query=initializer-once', [classDataAt], [dataDefine]),
  entry('hc-data-missing-data', 'caseMissingData', 'hidden/ordinary=null;hidden-query=initializer-once', [classData], [noDataDefine]),
  entry('hc-data-missing-data-conversion-index', 'caseMissingDataConversionIndex',
    'absent-primitive=null;absent-negative/max-index=null;no-unbox/index-access', [classData, classDataAt], [noDataDefine]),
  entry('hc-data-reference-conversion', 'caseReferenceConversion', 'String/CharSequence/Object=original-identity', [classData], [dataDefine]),
  entry('hc-data-reference-conversion-failure', 'caseReferenceConversionFailure',
    'Object-to-String/List=ClassCastException;rejections=2', [], [dataDefine, dataRejection]),
  entry('hc-data-primitive-widening', 'casePrimitiveWidening',
    'Integer-to-int/long/double=11;wide-long=9007199254740993;char-to-int=97;boolean=true',
    [classData, operation('java.lang.Long', 'longValue', '()J'), operation('java.lang.Double', 'doubleValue', '()D')], [dataDefine]),
  entry('hc-data-primitive-conversion-failure', 'casePrimitiveConversionFailure',
    'narrowing/boolean=ClassCastException;void=IllegalArgumentException', [], [dataDefine, dataRejection]),
  entry('hc-data-list-identity-mutation', 'caseListIdentityAndMutation',
    'list=original-reference;elements=original-identities;caller-mutation=visible', [classData, classDataAt], [dataDefine]),
  entry('hc-data-list-bounds', 'caseListBounds', 'ArrayList-negative/size-index=IndexOutOfBoundsException;rejections=2', [], [dataDefine, indexedRejection]),
  entry('hc-data-list-conversion-null', 'caseListConversionAndNull',
    'element-Integer-to-long=11;null-reference=null;null-unbox=NullPointerException;non-list=ClassCastException',
    [classDataAt, operation('java.lang.Long', 'longValue', '()J')], [dataDefine, indexedRejection]),
  entry('hc-data-invalid-arguments', 'caseInvalidArguments',
    'name/wrong-null=IllegalArgumentException;type/caller/data-null=NullPointerException;rejections=9',
    [defineData], [dataDefine, dataRejection, indexedRejection]),
  entry('hc-data-original-authority-required', 'caseOriginalAuthorityRequired',
    'dropped/privateLookupIn=full-without-ORIGINAL;public=denied;data/indexed=IllegalAccessException;rejections=4',
    [dropMode, m('privateLookupIn', '(' + cls + lookup + ')' + lookup), l('lookupModes', '()I')],
    [dataDefine, dataRejection, indexedRejection]),
  entry('hc-data-originating-hidden-lookup', 'caseOriginatingHiddenLookup',
    'in-self=identity;lookup-from-hidden-bytecode=ORIGINAL/data-identity;in-other=denied',
    [l('in', '(' + cls + ')' + lookup), staticHandle, h('invokeExact', '()' + object)], [dataDefine, dataRejection])
];

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}
export const hiddenClassGroups = freeze([
  {id: 'hidden-class-definition', source: 'classes/modern_fixture/HiddenClassDefinitionFinal.java',
    mainClass: 'classes.modern_test.HiddenClassDefinitionFinal', completionMarker: 'HIDDEN_CLASS_DEFINITION_OK', releases: [21, 25],
    additionalSources: ['classes/modern_fixture/hiddenclass/HiddenClassSupport.java', 'classes/modern_fixture/hiddenclass/foreign/ForeignPayload.java'],
    driverClassNames: ['classes.modern_test.HiddenClassDefinitionFinal', 'classes.modern_test.HiddenClassDefinitionFinal$Payload',
      'classes.modern_test.HiddenClassDefinitionFinal$InterfacePayload', 'classes.modern_test.HiddenClassDefinitionFinal$BadSelf',
      support, 'classes.modern_hidden_foreign.ForeignPayload'],
    hiddenPayloads: ['classes.modern_test.HiddenClassDefinitionFinal$Payload', 'classes.modern_test.HiddenClassDefinitionFinal$InterfacePayload',
      'classes.modern_test.HiddenClassDefinitionFinal$BadSelf', 'classes.modern_hidden_foreign.ForeignPayload'], cases: definitionCases},
  {id: 'hidden-class-identity', source: 'classes/modern_fixture/HiddenClassIdentityFinal.java',
    mainClass: 'classes.modern_test.HiddenClassIdentityFinal', completionMarker: 'HIDDEN_CLASS_IDENTITY_OK', releases: [21, 25],
    additionalSources: ['classes/modern_fixture/hiddenclass/HiddenClassSupport.java'],
    driverClassNames: ['classes.modern_test.HiddenClassIdentityFinal', 'classes.modern_test.HiddenClassIdentityFinal$Payload',
      'classes.modern_test.HiddenClassIdentityFinal$NestPayload', support],
    hiddenPayloads: ['classes.modern_test.HiddenClassIdentityFinal$Payload', 'classes.modern_test.HiddenClassIdentityFinal$NestPayload'], cases: identityCases},
  {id: 'hidden-class-data', source: 'classes/modern_fixture/HiddenClassDataFinal.java',
    mainClass: 'classes.modern_test.HiddenClassDataFinal', completionMarker: 'HIDDEN_CLASS_DATA_OK', releases: [21, 25],
    additionalSources: ['classes/modern_fixture/hiddenclass/HiddenClassSupport.java'],
    driverClassNames: ['classes.modern_test.HiddenClassDataFinal', 'classes.modern_test.HiddenClassDataFinal$Payload', support],
    hiddenPayloads: ['classes.modern_test.HiddenClassDataFinal$Payload'], cases: dataCases}
]);

export default hiddenClassGroups;
