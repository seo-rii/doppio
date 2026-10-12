// C6 selected original-source contracts; expectations are fixed before guest execution.
const main = 'classes.modern_test.NominalHandleFinal';
const support = 'classes.modern_test.NominalConstantSupport';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;', handle = 'Ljava/lang/invoke/MethodHandle;';
const desc = 'Ljava/lang/constant/MethodHandleDesc;', direct = 'Ljava/lang/constant/DirectMethodHandleDesc;';
const kind = 'Ljava/lang/constant/DirectMethodHandleDesc$Kind;', cd = 'Ljava/lang/constant/ClassDesc;';
const mtd = 'Ljava/lang/constant/MethodTypeDesc;', mt = 'Ljava/lang/invoke/MethodType;';
const cls = 'Ljava/lang/Class;', text = 'Ljava/lang/String;', object = 'Ljava/lang/Object;';
const target = 'Lclasses/modern_test/NominalHandleFinal$Target;';
const iface = 'Lclasses/modern_test/NominalHandleFinal$WideInterface;';
const call = (owner, name, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name, descriptor});
const factory = (name, descriptor) => call('java.lang.constant.MethodHandleDesc', name, descriptor, 'invokestatic', 11);
const method = factory('ofMethod', '(' + kind + cd + text + mtd + ')' + direct);
const field = factory('ofField', '(' + kind + cd + text + cd + ')' + direct);
const constructor = factory('ofConstructor', '(' + cd + '[' + cd + ')' + direct);
const of = factory('of', '(' + kind + cd + text + text + ')' + direct);
const resolve = (owner = 'java.lang.constant.DirectMethodHandleDesc') =>
  call(owner, 'resolveConstantDesc', '(' + lookup + ')' + handle, 'invokeinterface', 11);
const adapted = call('java.lang.constant.MethodHandleDesc', 'asType', '(' + mtd + ')' + desc, 'invokeinterface', 11);
const invoke = descriptor => call('java.lang.invoke.MethodHandle', 'invokeExact', descriptor);
const l = (name, descriptor) => call('java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const find = name => l(name, '(' + cls + text + (name.includes('Getter') || name.includes('Setter') ? cls : mt) + ')' + handle);
const describe = call('java.lang.invoke.MethodHandle', 'describeConstable', '()Ljava/util/Optional;');
const emit = call(support, 'emit', '(' + text + text + ')V', 'invokestatic');
const probe = (name, descriptor, symbolicOperands, className) => ({method: name, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const sources = [21, 25].flatMap(release => [
  'constant/MethodHandleDesc', 'constant/DirectMethodHandleDesc', 'constant/DirectMethodHandleDesc.Kind',
  'constant/ConstantDesc', 'invoke/MethodHandle', 'invoke/MethodHandles.Lookup'
].map(owner => 'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/' + owner + '.html'));
const limitations = [
  'Selected original javac21/25 unnamed-module nominal method-handle contracts; not full LIB-007, Phase C or API conformance.',
  'Eleven explicitly selected kind metadata families and nine direct runtime description families; not exhaustive member/access/error-priority or maximal-arity behavior.',
  'Class-special and interface-special invocation are tested with their actual caller-specific receiver types; general special-receiver narrowing or special-description round trips are not claimed.',
  'Exception classes specify API families; no concrete implementation exception subclass, mixed-invalid-argument priority or throwable message/identity claim.',
  'Hidden-owner, bindTo and primitive-identity empty descriptions are selected restrictions; arbitrary adapters, named modules, custom loaders, GC and concurrency are not claimed.'
];
const entry = (id, entryMethod, trace, operands, helpers = []) => ({id, entryMethod, entryDescriptor: '()V', trace: [trace],
  oracleKind: 'specification', anchors: {JVMS: ['4.2.2', '4.3.2', '4.3.3', '4.4.8', '5.4.3', '5.4.4']},
  primarySources: sources, limitations,
  probes: [probe(entryMethod, '()V', [...operands, emit]), ...helpers]});
const roundtrip = probe('roundtrip', '(' + handle + desc + lookup + ')' + handle,
  [describe, resolve('java.lang.constant.MethodHandleDesc'),
    call('java.lang.constant.ConstantDesc', 'resolveConstantDesc', '(' + lookup + ')' + object, 'invokeinterface', 11)]);
const cases = [
  entry('nc-handle-kind-metadata', 'caseKindMetadata',
    'kinds=11;reference/interface/owner/lookup/invocation=exact;invalid-reference=2',
    [of, call('java.lang.constant.DirectMethodHandleDesc', 'kind', '()' + kind, 'invokeinterface', 11),
      call('java.lang.constant.DirectMethodHandleDesc', 'refKind', '()I', 'invokeinterface', 11),
      call('java.lang.constant.DirectMethodHandleDesc', 'isOwnerInterface', '()Z', 'invokeinterface', 11),
      call('java.lang.constant.DirectMethodHandleDesc$Kind', 'valueOf', '(IZ)' + kind, 'invokestatic')]),
  entry('nc-handle-factory-equality', 'caseFactoryEquality',
    'of/ofMethod=equal/hash;constructor-name=null/invalid-ignored;invocation=receiver-result;identity-asType=true',
    [method, of, constructor, call('java.lang.constant.DirectMethodHandleDesc', 'methodName', '()' + text, 'invokeinterface', 11)]),
  entry('nc-handle-factory-validation', 'caseFactoryValidation',
    'invalid-name=11;owner/kind/descriptor=9;null=9;families=IllegalArgumentException/NullPointerException', [of, field],
    [probe('rejectInvalidFactory', '(I)V', [of, method, field]),
      probe('rejectNullFactory', '(I)V', [of, method, field, constructor,
        call('java.lang.constant.DirectMethodHandleDesc', 'asType', '(' + mtd + ')' + desc, 'invokeinterface', 11)])]),
  entry('nc-handle-static-wide', 'caseStaticWide',
    'kind=STATIC;value=9007199254740994;calls=1;type=(J)J', [method, resolve(), invoke('(J)J')]),
  entry('nc-handle-interface-static-wide', 'caseInterfaceStaticWide',
    'kind=INTERFACE_STATIC;value=9007199254740997;calls=1;type=(J)J', [method, resolve(), invoke('(J)J')]),
  entry('nc-handle-virtual-dispatch', 'caseVirtualDispatch',
    'owner=Target;receiver=Derived;override=true;value=9007199254741010;calls=1', [method, resolve(), invoke('(' + target + 'J)J')]),
  entry('nc-handle-interface-virtual-dispatch', 'caseInterfaceVirtualDispatch',
    'owner=WideInterface;receiver=InterfaceCaller;value=9007199254740999;calls=1', [method, resolve(), invoke('(' + iface + 'J)J')]),
  entry('nc-handle-class-special-dispatch', 'caseClassSpecialDispatch',
    'owner=Target;caller/receiver=Derived;base-body=true;value=9007199254741002;calls=1',
    [method, resolve(), invoke('(Lclasses/modern_test/NominalHandleFinal$Derived;J)J')]),
  entry('nc-handle-interface-special-dispatch', 'caseInterfaceSpecialDispatch',
    'owner=WideInterface;caller/receiver=InterfaceCaller;default-body=true;value=9007199254740998;calls=1',
    [method, resolve(), invoke('(Lclasses/modern_test/NominalHandleFinal$InterfaceCaller;J)J')]),
  entry('nc-handle-constructor-wide', 'caseConstructorWide',
    'argument=9007199254740993;fields=exact;calls=1;typed/erased-resolution=MethodHandle',
    [constructor, resolve('java.lang.constant.MethodHandleDesc'), invoke('(J)' + target),
      call('java.lang.constant.ConstantDesc', 'resolveConstantDesc', '(' + lookup + ')' + object, 'invokeinterface', 11)]),
  entry('nc-handle-instance-field-wide', 'caseInstanceFieldWide',
    'get/set=exact;before=7;after=9007199254740993;receiver=Target;store-visible=true',
    [field, resolve(), invoke('(' + target + ')J'), invoke('(' + target + 'J)V')]),
  entry('nc-handle-static-field-wide', 'caseStaticFieldWide',
    'get/set=exact;before=11;after=9007199254740993;types=()J/(J)V;store-visible=true',
    [field, resolve(), invoke('()J'), invoke('(J)V')]),
  entry('nc-handle-as-type-adaptation', 'caseAsTypeAdaptation',
    'descriptor=equal/hash;identity=true;Long-unbox/result-box=exact;int-widen=8;calls=2;impossible=WrongMethodTypeException',
    [method, adapted, resolve('java.lang.constant.MethodHandleDesc'), invoke('(Ljava/lang/Long;)' + object), invoke('(I)J')]),
  entry('nc-handle-resolution-failures', 'caseResolutionFailures',
    'missing/type=NoSuchMethodException:2/NoSuchFieldException:2;private/final=IllegalAccessException:3;null-lookup=NullPointerException',
    [method, field, l('dropLookupMode', '(I)' + lookup)],
    [probe('rejectResolution', '(' + desc + lookup + cls + ')V', [resolve('java.lang.constant.MethodHandleDesc')])]),
  entry('nc-handle-direct-description-roundtrip', 'caseDirectDescriptionRoundtrip',
    'direct-kinds=9;Constable/metadata/typed-erased-resolution=exact;wide-invocation/stores=true;calls=5',
    [find('findStatic'), find('findVirtual'), l('findConstructor', '(' + cls + mt + ')' + handle),
      find('findGetter'), find('findSetter'), find('findStaticGetter'), find('findStaticSetter'),
      invoke('(J)J'), invoke('(' + target + 'J)J'), invoke('(' + iface + 'J)J'), invoke('(J)' + target),
      invoke('(' + target + ')J'), invoke('(' + target + 'J)V'), invoke('()J'), invoke('(J)V')], [roundtrip]),
  entry('nc-handle-hidden-bound-description', 'caseHiddenBoundDescription',
    'hidden-owner/mirror/bound/identity=Optional.empty;hidden-ldc=exact-owner;wide-invocation=true;bound-calls=1',
    [l('defineHiddenClass', '([BZ[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;)' + lookup), find('findStatic'), find('findVirtual'),
      describe, call('java.lang.invoke.MethodHandle', 'bindTo', '(' + object + ')' + handle),
      call('java.lang.invoke.MethodHandles', 'identity', '(' + cls + ')' + handle, 'invokestatic'), invoke('(J)J'), invoke('()' + cls)],
    [probe('hiddenPayload', '()[B', [call(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')])])
];
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
};
export default deepFreeze([{id: 'nominal-handle', source: 'classes/modern_fixture/NominalHandleFinal.java',
  additionalSources: ['classes/modern_fixture/nominalconstant/NominalConstantSupport.java'], mainClass: main,
  completionMarker: 'NOMINAL_HANDLE_OK', releases: [21, 25],
  driverClassNames: [main, main + '$Target', main + '$Derived', main + '$WideInterface', main + '$InterfaceCaller',
    main + '$HiddenPayload', support], hiddenPayloads: [main + '$HiddenPayload'], cases}]);
