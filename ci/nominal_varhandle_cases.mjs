// C6 nominal VarHandle contracts resolve executable storage capabilities.
// These single-thread value/identity checks make no memory-order guarantee.
const main = 'classes.modern_test.NominalVarHandleFinal', support = 'classes.modern_test.NominalConstantSupport';
const text = 'Ljava/lang/String;', object = 'Ljava/lang/Object;', cls = 'Ljava/lang/Class;';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;', vh = 'Ljava/lang/invoke/VarHandle;';
const desc = 'Ljava/lang/invoke/VarHandle$VarHandleDesc;', cd = 'Ljava/lang/constant/ClassDesc;';
const constant = 'Ljava/lang/constant/ConstantDesc;', direct = 'Ljava/lang/constant/DirectMethodHandleDesc;';
const call = (owner, name, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name, descriptor});
const d = (name, descriptor, static_ = false) => call('java.lang.invoke.VarHandle$VarHandleDesc', name, descriptor,
  static_ ? 'invokestatic' : 'invokevirtual');
const v = (name, descriptor) => call('java.lang.invoke.VarHandle', name, descriptor);
const l = (name, descriptor) => call('java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const field = d('ofField', '(' + cd + text + cd + ')' + desc, true);
const staticField = d('ofStaticField', '(' + cd + text + cd + ')' + desc, true);
const array = d('ofArray', '(' + cd + ')' + desc, true);
const resolve = d('resolveConstantDesc', '(' + lookup + ')' + vh);
const describe = v('describeConstable', '()Ljava/util/Optional;');
const emit = call(support, 'emit', '(' + text + text + ')V', 'invokestatic');
const target = 'Lclasses/modern_test/NominalVarHandleFinal$Target;';
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const fieldHelper = probe('field', '()' + desc, [field]);
const staticHelper = probe('staticField', '()' + desc, [staticField]);
const roundtrip = probe('roundtrip', '(' + vh + desc + lookup + ')' + vh,
  [describe, resolve, v('varType', '()' + cls), v('coordinateTypes', '()Ljava/util/List;'),
    call('java.lang.constant.ConstantDesc', 'resolveConstantDesc', '(' + lookup + ')' + object, 'invokeinterface', 11)]);
const sources = [21, 25].flatMap(release => ['invoke/VarHandle.VarHandleDesc', 'invoke/VarHandle', 'invoke/MethodHandles.Lookup',
  'invoke/MethodHandles', 'constant/DynamicConstantDesc', 'constant/ConstantDesc', 'constant/ConstantDescs', 'constant/ClassDesc', 'Class']
  .map(owner => 'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/' + owner + '.html'));
const limitations = [
  'Finite original javac21/25 nominal field/static/array VarHandles with actual executable get/set and alias checks, not full LIB-007/Phase C/API conformance.',
  'Single-thread wide/reference values, read-only denial and nominal round trips do not establish the Java memory model, ordering, fences or concurrent visibility.',
  'The covariant VarHandle resolver and erased ConstantDesc bridge are checked against their actual symbolic descriptors; descriptor metadata alone is not execution.',
  'Original passive/hidden companion bytes and Code are bound independently; API static reachability is not implicit-initializer or opaque-dispatch branch coverage.',
  'Only selected canonical VarHandle projection and held hidden-capability restrictions are claimed; arbitrary modes/storage shapes, custom loaders, named modules, mixed-invalid-input priority and hidden-class GC/lifetime remain unclaimed.',
  'ConstantDescs.CD_int is the explicit canonical initialization entry; primitive-factory-first cold native25 initialization remains a separately retained failure boundary.'
];
const entry = (id, entryMethod, trace, operands, helpers = []) => ({id, entryMethod, entryDescriptor: '()V', trace: [trace],
  oracleKind: 'specification', anchors: {JVMS: ['4.2.2', '4.3.2', '5.4.3.1', '5.4.3.2', '5.4.4', '5.5'], JLS: ['12.4.1', '12.4.2']},
  primarySources: sources, limitations, probes: [probe(entryMethod, '()V', [...operands, emit]), ...helpers]});
const cases = [
  entry('nc-varhandle-factory-metadata', 'caseFactoryMetadata',
    'kinds=field/static/array;type/name/bootstrap/args=exact;equal/hash=true',
    [array, d('varType', '()' + cd), d('constantType', '()' + cd), d('constantName', '()' + text),
      d('bootstrapMethod', '()' + direct), d('bootstrapArgs', '()[' + constant)], [fieldHelper, staticHelper]),
  entry('nc-varhandle-factory-validation', 'caseFactoryValidation',
    'invalid-name/array=IllegalArgumentException:7;null=NullPointerException:4', [field, staticField, array]),
  entry('nc-varhandle-instance-wide', 'caseInstanceWide',
    'before=7;after=9007199254740993;alias=true;coordinates=Target',
    [resolve, v('get', '(' + target + ')J'), v('set', '(' + target + 'J)V'), v('varType', '()' + cls),
      v('coordinateTypes', '()Ljava/util/List;')], [fieldHelper]),
  entry('nc-varhandle-static-wide', 'caseStaticWide',
    'before=11;after=9007199254740993;alias=true;coordinates=empty',
    [resolve, v('get', '()J'), v('set', '(J)V'), v('coordinateTypes', '()Ljava/util/List;')], [staticHelper]),
  entry('nc-varhandle-array-wide', 'caseArrayWide',
    'index=1;value=9007199254740993;neighbors=3/7;coordinates=long[]/int',
    [array, resolve, v('get', '([JI)J'), v('set', '([JIJ)V'), v('coordinateTypes', '()Ljava/util/List;')]),
  entry('nc-varhandle-reference-array', 'caseReferenceArray',
    'identity/alias=true;neighbor=null;covariant-store=ArrayStoreException',
    [array, resolve, v('get', '([' + object + 'I)' + object), v('set', '([' + object + 'I' + object + ')V'),
      v('set', '([' + text + 'I' + object + ')V')]),
  entry('nc-varhandle-private-access', 'casePrivateAccess',
    'reduced=IllegalAccessException;denied-store=unchanged;own-store=wide',
    [field, resolve, l('dropLookupMode', '(I)' + lookup), v('set', '(' + target + 'J)V')], []),
  entry('nc-varhandle-resolution-failures', 'caseResolutionFailures',
    'missing/type=NoSuchFieldException:2;staticness=IllegalAccessException:2;null=NullPointerException',
    [field, staticField, resolve], [fieldHelper]),
  entry('nc-varhandle-final-readonly', 'caseFinalReadonly',
    'get=wide;set-supported=false;set=UnsupportedOperationException;unchanged=true',
    [field, resolve, v('get', '(' + target + ')J'), v('set', '(' + target + 'J)V'),
      v('isAccessModeSupported', '(Ljava/lang/invoke/VarHandle$AccessMode;)Z')]),
  entry('nc-varhandle-field-roundtrip', 'caseFieldRoundtrip',
    'Optional=field;typed/erased=VarHandle;source/copy/storage=wide-alias',
    [l('findVarHandle', '(' + cls + text + cls + ')' + vh), v('get', '(' + target + ')J'), v('set', '(' + target + 'J)V')],
    [fieldHelper, roundtrip]),
  entry('nc-varhandle-static-roundtrip', 'caseStaticRoundtrip',
    'Optional=static;typed/erased=VarHandle;source/copy/storage=wide-alias',
    [l('findStaticVarHandle', '(' + cls + text + cls + ')' + vh), v('get', '()J'), v('set', '(J)V')], [staticHelper, roundtrip]),
  entry('nc-varhandle-array-roundtrip', 'caseArrayRoundtrip',
    'Optional=array;typed/erased=VarHandle;source/copy/storage=wide-alias',
    [array, call('java.lang.invoke.MethodHandles', 'arrayElementVarHandle', '(' + cls + ')' + vh, 'invokestatic'),
      v('get', '([JI)J'), v('set', '([JIJ)V')], [roundtrip]),
  entry('nc-varhandle-view-roundtrip', 'caseViewRoundtrip',
    'exact/loose=stable-descriptor;copy=executable;capability-alias=wide',
    [v('withInvokeExactBehavior', '()' + vh), v('withInvokeBehavior', '()' + vh), v('hasInvokeExactBehavior', '()Z'),
      describe, v('get', '(' + target + ')J'), v('set', '(' + target + 'J)V')], [fieldHelper, roundtrip]),
  entry('nc-varhandle-canonical-projection', 'caseCanonicalProjection',
    'field/static/array=VarHandleDesc;equal=true;resolved=executable:3',
    [array, d('bootstrapMethod', '()' + direct), d('constantName', '()' + text), d('constantType', '()' + cd),
      d('bootstrapArgs', '()[' + constant), call('java.lang.constant.DynamicConstantDesc', 'ofCanonical',
        '(' + direct + text + cd + '[' + constant + ')' + constant, 'invokestatic'),
      call('java.lang.constant.ConstantDesc', 'resolveConstantDesc', '(' + lookup + ')' + object, 'invokeinterface', 11)], [fieldHelper, staticHelper]),
  entry('nc-varhandle-passive-resolution', 'casePassiveResolution',
    'instance-descriptor=resolved;initialization=0;ensureInitialized=1',
    [field, resolve, v('varType', '()' + cls), v('coordinateTypes', '()Ljava/util/List;'), l('ensureInitialized', '(' + cls + ')' + cls)]),
  entry('nc-varhandle-hidden-description', 'caseHiddenDescription',
    'hidden-owner/field/array=Optional.empty;held-field=executable-wide',
    [l('defineHiddenClass', '([BZ[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;)' + lookup), l('lookupClass', '()' + cls),
      l('findVarHandle', '(' + cls + text + cls + ')' + vh), describe,
      call('java.lang.invoke.MethodHandles', 'arrayElementVarHandle', '(' + cls + ')' + vh, 'invokestatic'),
      v('set', '(' + object + 'J)V'), v('get', '(' + object + ')J')],
    [probe('hiddenPayload', '()[B', [call(support, 'bytes', '(' + cls + text + ')[B', 'invokestatic')])])
];
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
export const nominalVarHandleGroup = freeze({id: 'nominal-varhandle', source: 'classes/modern_fixture/NominalVarHandleFinal.java',
  additionalSources: ['classes/modern_fixture/nominalconstant/NominalConstantSupport.java'], mainClass: main,
  completionMarker: 'NOMINAL_VARHANDLE_OK', releases: [21, 25],
  driverClassNames: [main, main + '$Target', main + '$Passive', main + '$HiddenPayload', support], hiddenPayloads: [main + '$HiddenPayload'], cases});
export default nominalVarHandleGroup;
