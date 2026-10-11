// Independent property oracles, not copied hashes or complete native strings.
// JLS 8.10 is owned by JVM-006. Invocation/array/exception instructions remain
// JVM-002 dependencies. The selected javac ObjectMethods REF_getField bootstrap
// shape is a dependency, not general C bootstrap/condy or whole-JLS closure.
const mainClass = 'classes.modern_test.JavaRecordSemantics';
const name = shortName => `${mainClass}$${shortName}`;
const declarations = {
  Scalars: [['flag', 'Z'], ['byteValue', 'B'], ['charValue', 'C'], ['shortValue', 'S'],
    ['intValue', 'I'], ['longValue', 'J'], ['floatValue', 'F'], ['doubleValue', 'D']],
  Wide: [['first', 'J'], ['marker', 'I'], ['middle', 'D'], ['token', 'Ljava/lang/Object;'],
    ['second', 'J'], ['small', 'F'], ['last', 'D']],
  Explicit: [['left', 'I'], ['right', 'J'], ['label', 'Ljava/lang/String;']],
  Compact: [['low', 'I'], ['high', 'I'], ['label', 'Ljava/lang/String;']],
  Checked: [['value', 'I']],
  Auxiliary: [['value', 'I'], ['label', 'Ljava/lang/String;']],
  AuxChecked: [['value', 'I']],
  Varargs: [['label', 'Ljava/lang/String;'], ['values', '[I']],
  CompactVarargs: [['values', '[J']],
  CustomAccessor: [['value', 'Ljava/lang/String;']],
  ThrowingAccessor: [['value', 'Ljava/lang/String;']],
  Defensive: [['values', '[I']],
  Empty: [],
  EmptyTwin: [],
  Floating: [['single', 'F'], ['wide', 'D']],
  Refs: [['value', 'Ljava/lang/Object;']],
  OtherRefs: [['value', 'Ljava/lang/Object;']],
  Arrays: [['ints', '[I'], ['refs', '[Ljava/lang/Object;'], ['matrix', '[[Ljava/lang/Object;']],
  FloatText: [['value', 'F']],
  DoubleText: [['value', 'D']],
  ExplicitMethods: [['value', 'I']],
};
const componentProof = shortName => ({kind: 'components', className: name(shortName),
  components: declarations[shortName].map(([component, descriptor]) => ({name: component, descriptor, signature: null}))});
const constructorDescriptor = shortName => `(${declarations[shortName].map(([, descriptor]) => descriptor).join('')})V`;
const canonical = shortName => ({kind: 'canonical-constructor', className: name(shortName)});
const accessor = (shortName, member) => ({kind: 'accessor', className: name(shortName), name: member});
const objectMethod = (shortName, member) => ({kind: 'object-method', className: name(shortName), name: member});
const ordinary = (shortName, member, descriptor) => ({kind: 'ordinary-method', className: name(shortName), name: member, descriptor});
const auxiliary = (shortName, descriptor, targetDescriptor) => ({kind: 'auxiliary-constructor',
  className: name(shortName), descriptor, targetDescriptor});
const objectDescriptors = {equals: '(Ljava/lang/Object;)Z', hashCode: '()I', toString: '()Ljava/lang/String;'};
const typedReturn = descriptor => descriptor === 'J' ? 'lreturn' : descriptor === 'F' ? 'freturn' :
  descriptor === 'D' ? 'dreturn' : descriptor.startsWith('L') || descriptor.startsWith('[') ? 'areturn' : 'ireturn';
const probe = (shortName, method, descriptor, requiredOpcodes) => ({className: name(shortName), method, descriptor, requiredOpcodes});
const ctorProbe = shortName => probe(shortName, '<init>', constructorDescriptor(shortName),
  declarations[shortName].length ? ['invokespecial', 'putfield', 'return'] : ['invokespecial', 'return']);
const accessorProbe = (shortName, member) => {
  const descriptor = declarations[shortName].find(([candidate]) => candidate === member)[1];
  return probe(shortName, member, `()${descriptor}`, ['getfield', typedReturn(descriptor)]);
};
const objectProbe = (shortName, member) => probe(shortName, member, objectDescriptors[member],
  ['invokedynamic', member === 'toString' ? 'areturn' : 'ireturn']);
const scalarAccessors = () => declarations.Scalars.map(([member]) => accessor('Scalars', member));
const scalarAccessorProbes = () => declarations.Scalars.map(([member]) => accessorProbe('Scalars', member));
const makeCase = (id, entryMethod, trace, proofs, probes, jls = ['8.10.3'], jvms = ['6.5.invokedynamic']) => {
  const records = [...new Set(proofs.map(item => item.className.slice(mainClass.length + 1)))];
  return {id: `record-${id}`, entryMethod, entryDescriptor: '()V', trace,
    anchors: {JLS: jls, JVMS: jvms}, probes,
    recordProofs: [...records.map(componentProof), ...proofs]};
};

export default {
  id: 'record-semantics',
  source: 'classes/modern_fixture/JavaRecordSemantics.java',
  mainClass,
  completionMarker: 'RECORD_SEMANTICS_OK',
  recordClassNames: Object.keys(declarations).map(name),
  cases: [
    makeCase('ctor-implicit', 'caseCtorImplicit', ['fields=255'],
      [canonical('Scalars')], [ctorProbe('Scalars')], ['8.10.4'], ['6.5.invokespecial', '6.5.putfield']),
    makeCase('ctor-mixed-wide', 'caseCtorMixedWide', ['fields=true,true,true,true,true,true,true'],
      [canonical('Wide')], [ctorProbe('Wide')], ['8.10.4'], ['6.5.invokespecial', '6.5.putfield']),
    makeCase('ctor-explicit', 'caseCtorExplicit', ['fields=10,12', 'label=true'],
      [canonical('Explicit')], [ctorProbe('Explicit')], ['8.10.4.1'], ['6.5.invokespecial', '6.5.putfield']),
    makeCase('ctor-compact', 'caseCtorCompact', ['fields=2,9', 'label=true'],
      [canonical('Compact')], [ctorProbe('Compact')], ['8.10.4.2'], ['6.5.invokespecial', '6.5.putfield']),
    makeCase('ctor-compact-throw', 'caseCtorCompactThrow', ['outcome=true,true,true', 'effects=12'],
      [canonical('Checked')], [ctorProbe('Checked'), probe('Checked', '<init>', '(I)V', ['athrow'])],
      ['8.10.4.2'], ['6.5.invokespecial', '6.5.putfield', '6.5.athrow']),
    makeCase('ctor-auxiliary', 'caseCtorAuxiliary', ['order=123', 'fields=true,true'],
      [auxiliary('Auxiliary', '()V', '(I)V'), auxiliary('Auxiliary', '(I)V', '(ILjava/lang/String;)V'), canonical('Auxiliary')],
      [probe('Auxiliary', '<init>', '()V', ['invokespecial']), probe('Auxiliary', '<init>', '(I)V', ['invokespecial']), ctorProbe('Auxiliary')],
      ['8.10.4', '8.10.4.2'], ['6.5.invokespecial', '6.5.putfield']),
    makeCase('ctor-auxiliary-throw', 'caseCtorAuxiliaryThrow', ['identity=true', 'effects=1'],
      [auxiliary('AuxChecked', '()V', '(I)V'), canonical('AuxChecked')],
      [probe('AuxChecked', '<init>', '()V', ['invokespecial']), ctorProbe('AuxChecked'), probe('AuxChecked', '<init>', '(I)V', ['athrow'])],
      ['8.10.4', '8.10.4.2'], ['6.5.invokespecial', '6.5.athrow']),
    makeCase('ctor-varargs-packed', 'caseCtorVarargsPacked', ['values=0,2,3,4', 'labels=true,true'],
      [canonical('Varargs'), accessor('Varargs', 'values')], [ctorProbe('Varargs'), accessorProbe('Varargs', 'values')],
      ['8.10.1', '8.10.4'], ['6.5.invokespecial', '6.5.putfield', '6.5.getfield']),
    makeCase('ctor-varargs-alias', 'caseCtorVarargsAlias', ['alias=true,true,true'],
      [canonical('Varargs'), accessor('Varargs', 'values')], [ctorProbe('Varargs'), accessorProbe('Varargs', 'values')],
      ['8.10.1', '8.10.3', '8.10.4'], ['6.5.invokespecial', '6.5.getfield']),
    makeCase('ctor-varargs-compact', 'caseCtorVarargsCompact', ['copy=true,true,true,true,true'],
      [canonical('CompactVarargs'), accessor('CompactVarargs', 'values')],
      [ctorProbe('CompactVarargs'), probe('CompactVarargs', '<init>', '([J)V', ['invokevirtual', 'checkcast']), accessorProbe('CompactVarargs', 'values')],
      ['8.10.1', '8.10.4.2'], ['6.5.invokespecial', '6.5.invokevirtual', '6.5.putfield']),

    makeCase('accessors-all', 'caseAccessorsAll', ['returns=255'], scalarAccessors(), scalarAccessorProbes(),
      ['8.10.3'], ['6.5.getfield', '6.5.ireturn', '6.5.lreturn', '6.5.freturn', '6.5.dreturn']),
    makeCase('accessor-custom', 'caseAccessorCustom',
      ['direct=true', 'direct-calls=1', 'fields=true,true,true,true,true', 'implicit-accessor-calls=0'],
      [ordinary('CustomAccessor', 'value', '()Ljava/lang/String;'), ...['equals', 'hashCode', 'toString'].map(member => objectMethod('CustomAccessor', member))],
      [probe('CustomAccessor', 'value', '()Ljava/lang/String;', ['areturn']), ...['equals', 'hashCode', 'toString'].map(member => objectProbe('CustomAccessor', member))]),
    makeCase('accessor-throwing', 'caseAccessorThrowing',
      ['direct=true', 'direct-calls=1', 'fields=true,true,true', 'implicit-accessor-calls=0'],
      [ordinary('ThrowingAccessor', 'value', '()Ljava/lang/String;'), ...['equals', 'hashCode', 'toString'].map(member => objectMethod('ThrowingAccessor', member))],
      [probe('ThrowingAccessor', 'value', '()Ljava/lang/String;', ['athrow']), ...['equals', 'hashCode', 'toString'].map(member => objectProbe('ThrowingAccessor', member))],
      ['8.10.3'], ['6.5.invokedynamic', '6.5.athrow']),
    makeCase('accessor-defensive', 'caseAccessorDefensive',
      ['copy=true,true,true', 'direct-calls=1', 'fields=true,true', 'implicit-accessor-calls=0'],
      [ordinary('Defensive', 'values', '()[I'), objectMethod('Defensive', 'equals'), objectMethod('Defensive', 'hashCode')],
      [probe('Defensive', 'values', '()[I', ['getfield', 'invokevirtual', 'areturn']), objectProbe('Defensive', 'equals'), objectProbe('Defensive', 'hashCode')],
      ['8.10.3'], ['6.5.getfield', '6.5.invokevirtual', '6.5.invokedynamic']),

    makeCase('equals-exact-class', 'caseEqualsExactClass', ['equal=true,true,false,false,false,false'],
      [canonical('EmptyTwin'), canonical('OtherRefs'), objectMethod('Empty', 'equals'), objectMethod('Refs', 'equals')],
      [ctorProbe('EmptyTwin'), ctorProbe('OtherRefs'), objectProbe('Empty', 'equals'), objectProbe('Refs', 'equals')]),
    makeCase('equals-all-primitives', 'caseEqualsAllPrimitives', ['same=true', 'different=255'],
      [objectMethod('Scalars', 'equals')], [objectProbe('Scalars', 'equals')]),
    makeCase('equals-float-nan', 'caseEqualsFloatNan', ['nan=true,true,true'],
      [objectMethod('Floating', 'equals'), objectMethod('Floating', 'hashCode')],
      [objectProbe('Floating', 'equals'), objectProbe('Floating', 'hashCode')]),
    makeCase('equals-double-nan', 'caseEqualsDoubleNan', ['nan=true,true,true'],
      [objectMethod('Floating', 'equals'), objectMethod('Floating', 'hashCode')],
      [objectProbe('Floating', 'equals'), objectProbe('Floating', 'hashCode')]),
    makeCase('equals-float-zero', 'caseEqualsFloatZero', ['zero=false,false,true'],
      [objectMethod('Floating', 'equals')], [objectProbe('Floating', 'equals')]),
    makeCase('equals-double-zero', 'caseEqualsDoubleZero', ['zero=false,false,true'],
      [objectMethod('Floating', 'equals')], [objectProbe('Floating', 'equals')]),
    makeCase('equals-infinity', 'caseEqualsInfinity', ['infinity=true,false,false'],
      [objectMethod('Floating', 'equals')], [objectProbe('Floating', 'equals')]),
    makeCase('equals-null', 'caseEqualsNull', ['null=true,false,false'],
      [objectMethod('Refs', 'equals')], [objectProbe('Refs', 'equals')]),
    makeCase('equals-reference-value', 'caseEqualsReferenceValue', ['value=true,false,true'],
      [objectMethod('Refs', 'equals')], [objectProbe('Refs', 'equals')]),
    makeCase('equals-primitive-array', 'caseEqualsPrimitiveArray', ['identity=true,false', 'mutation=true'],
      [objectMethod('Arrays', 'equals')], [objectProbe('Arrays', 'equals')]),
    makeCase('equals-reference-array', 'caseEqualsReferenceArray', ['identity=true,false,false'],
      [objectMethod('Arrays', 'equals')], [objectProbe('Arrays', 'equals')]),
    makeCase('equals-component-throw', 'caseEqualsComponentThrow', ['throw=true,true'],
      [objectMethod('Refs', 'equals')], [objectProbe('Refs', 'equals')]),

    makeCase('hash-equal', 'caseHashEqual', ['consistent=true,true'],
      [objectMethod('Scalars', 'hashCode')], [objectProbe('Scalars', 'hashCode')]),
    makeCase('hash-null', 'caseHashNull', ['consistent=true,true,true'],
      [objectMethod('Refs', 'hashCode'), objectMethod('Empty', 'hashCode')],
      [objectProbe('Refs', 'hashCode'), objectProbe('Empty', 'hashCode')]),
    makeCase('hash-array-identity', 'caseHashArrayIdentity', ['identity=true,true,true'],
      [objectMethod('Arrays', 'hashCode')], [objectProbe('Arrays', 'hashCode')]),
    makeCase('hash-component-dispatch', 'caseHashComponentDispatch', ['dispatch=true,true'],
      [objectMethod('Refs', 'hashCode')], [objectProbe('Refs', 'hashCode')]),
    makeCase('hash-component-throw', 'caseHashComponentThrow', ['throw=true,true'],
      [objectMethod('Refs', 'hashCode')], [objectProbe('Refs', 'hashCode')]),

    makeCase('string-primitives', 'caseStringPrimitives', ['content=true,true'],
      [objectMethod('Scalars', 'toString')], [objectProbe('Scalars', 'toString')]),
    makeCase('string-floating', 'caseStringFloating', ['wrapper-content=255,255,255,255'],
      [objectMethod('FloatText', 'toString'), objectMethod('DoubleText', 'toString'), objectMethod('Refs', 'toString')],
      [objectProbe('FloatText', 'toString'), objectProbe('DoubleText', 'toString'), objectProbe('Refs', 'toString')]),
    makeCase('string-null', 'caseStringNull', ['content=true'],
      [objectMethod('Refs', 'toString')], [objectProbe('Refs', 'toString')]),
    makeCase('string-reference-dispatch', 'caseStringReferenceDispatch', ['dispatch=true,true'],
      [objectMethod('Refs', 'toString')], [objectProbe('Refs', 'toString')]),
    makeCase('string-array-identity', 'caseStringArrayIdentity', ['content=true,true'],
      [objectMethod('Arrays', 'toString')], [objectProbe('Arrays', 'toString')]),
    makeCase('string-component-throw', 'caseStringComponentThrow', ['throw=true,true'],
      [objectMethod('Refs', 'toString')], [objectProbe('Refs', 'toString')]),
    makeCase('string-empty-and-equal', 'caseStringEmptyAndEqual', ['consistent=true,true,true,true'],
      [objectMethod('Empty', 'toString'), objectMethod('Refs', 'equals'), objectMethod('Refs', 'toString')],
      [objectProbe('Empty', 'toString'), objectProbe('Refs', 'equals'), objectProbe('Refs', 'toString')]),

    makeCase('explicit-object-methods', 'caseExplicitObjectMethods', ['custom=true,true,true,true'],
      ['equals', 'hashCode', 'toString'].map(member => ordinary('ExplicitMethods', member, objectDescriptors[member])),
      [probe('ExplicitMethods', 'equals', objectDescriptors.equals, ['instanceof', 'getfield', 'ireturn']),
        probe('ExplicitMethods', 'hashCode', objectDescriptors.hashCode, ['getfield', 'ireturn']),
        probe('ExplicitMethods', 'toString', objectDescriptors.toString, ['areturn'])],
      ['8.10.3'], ['6.5.instanceof', '6.5.getfield', '6.5.ireturn', '6.5.areturn']),
    makeCase('copy-invariant', 'caseCopyInvariant', ['copy=true,true,true'],
      [canonical('Scalars'), ...scalarAccessors(), objectMethod('Scalars', 'equals'), objectMethod('Scalars', 'hashCode')],
      [ctorProbe('Scalars'), ...scalarAccessorProbes(), objectProbe('Scalars', 'equals'), objectProbe('Scalars', 'hashCode')],
      ['8.10.3', '8.10.4'], ['6.5.invokespecial', '6.5.getfield', '6.5.invokedynamic']),
  ],
};
