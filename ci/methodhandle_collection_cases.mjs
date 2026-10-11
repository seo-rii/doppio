/**
 * C2 selected fixed-arity collectors/spreaders. The literal contract is not
 * native output capture. Probes bind main -> case -> actual javac CP operands;
 * target bodies reached dynamically through a MethodHandle are not claimed
 * statically reached. Empty collector array sharing is deliberately unclaimed.
 */
const mh = 'java.lang.invoke.MethodHandle';
const handle = 'Ljava/lang/invoke/MethodHandle;';
const object = 'Ljava/lang/Object;';
const objectArray = `[${object}`;
const operand = (name, descriptor) => ({opcode: 'invokevirtual', tag: 10, owner: mh, name, descriptor});
const collector = operand('asCollector', `(Ljava/lang/Class;I)${handle}`);
const collectorPosition = operand('asCollector', `(ILjava/lang/Class;I)${handle}`);
const spreader = operand('asSpreader', `(Ljava/lang/Class;I)${handle}`);
const spreaderPosition = operand('asSpreader', `(ILjava/lang/Class;I)${handle}`);
const asType = operand('asType', `(Ljava/lang/invoke/MethodType;)${handle}`);
const invoke = descriptor => operand('invokeExact', descriptor);
const primarySources = [21, 25].map(release =>
  `https://docs.oracle.com/en/java/javase/${release}/docs/api/java.base/java/lang/invoke/MethodHandle.html`);

function selectedCase(id, entryMethod, trace, operands, requiredOpcodes = ['invokevirtual']) {
  return {
    id, entryMethod, entryDescriptor: '()V', trace: Array.isArray(trace) ? trace : [trace],
    anchors: {JLS: ['15.12.4.4'], JVMS: ['2.9.3', '2.6.1', '2.6.2', '5.4.3.3', '6.5.invokevirtual']},
    probes: [
      {method: entryMethod, descriptor: '()V', requiredOpcodes, symbolicOperands: operands},
      {method: 'handle', descriptor: '(Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;',
        requiredOpcodes: ['invokevirtual'], symbolicOperands: [{opcode: 'invokevirtual', tag: 10,
          owner: 'java.lang.invoke.MethodHandles$Lookup', name: 'findStatic',
          descriptor: '(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'}]}
    ],
    oracleKind: 'specification', primarySources,
    limitations: ['Selected unchanged javac 21/25 fixed-arity Object[], int[], long[] and double[] paths only; not full API conformance.',
      'No full conversion cross-product, maximum arity, varargs, modules, class-loader identity, allocation implementation or empty-array sharing claim.']
  };
}

const unsealedGroups = [{
  id: 'methodhandle-arrays',
  source: 'classes/modern_fixture/MethodHandleArraysFinal.java',
  mainClass: 'classes.modern_test.MethodHandleArraysFinal',
  completionMarker: 'METHODHANDLE_ARRAYS_OK',
  driverClassNames: ['classes.modern_test.MethodHandleArraysFinal'],
  releases: [21, 25],
  cases: [
    selectedCase('collector-reference-trailing', 'caseCollectorReferenceTrailing',
      'type=two-references;fixed=true;arrays=fresh;elements=same;return=target-array;effects=2',
      [collector, invoke(`(${object}${object})${objectArray}`)], ['invokevirtual', 'aaload']),
    selectedCase('collector-reference-position-wide', 'caseCollectorReferencePositionWide',
      'position=1;wide-prefix/suffix=exact;elements=same;tail=same;return=target-array;effects=1',
      [collectorPosition, invoke(`(J${object}${object}D${object})${objectArray}`)], ['invokevirtual', 'aaload']),
    selectedCase('collector-zero-reference', 'caseCollectorZeroReference',
      'trailing/position=empty-nonnull;wide-routing=exact;empty-array-sharing=unclaimed;effects=2',
      [collector, collectorPosition, invoke(`()${objectArray}`), invoke(`(JD${object})${objectArray}`)], ['invokevirtual', 'arraylength']),
    selectedCase('collector-primitive-int', 'caseCollectorPrimitiveInt',
      'array=int[];values=-7/16777217;return=target-array;effects=1',
      [collector, invoke('(II)[I')], ['invokevirtual', 'iaload']),
    selectedCase('collector-primitive-long-wide', 'caseCollectorPrimitiveLongWide',
      'position=1;array=long[];values=9007199254740993/min;wide-prefix/suffix=exact;tail=same;effects=1',
      [collectorPosition, invoke(`(DJJJ${object})[J`)], ['invokevirtual', 'laload']),
    selectedCase('collector-primitive-double-wide', 'caseCollectorPrimitiveDoubleWide',
      'position=1;array=double[];bits=negative-zero/min-subnormal;wide-prefix=exact;tail=same;effects=1',
      [collectorPosition, invoke(`(JDD${object})[D`)], ['invokevirtual', 'daload']),
    selectedCase('spreader-reference-trailing', 'caseSpreaderReferenceTrailing',
      'elements/return=same;source-array=unchanged;later-element-mutation=observed;effects=2',
      [spreader, invoke(`(${objectArray})${object}`)], ['invokevirtual', 'aaload', 'aastore']),
    selectedCase('spreader-reference-position-wide', 'caseSpreaderReferencePositionWide',
      'position=1;elements/return=same;wide-prefix/suffix=exact;tail=same;effects=1',
      [spreaderPosition, invoke(`(J${objectArray}D${object})${object}`)]),
    selectedCase('spreader-zero-null', 'caseSpreaderZeroNull',
      ['trailing/position=null-or-empty-accepted;wide-routing=exact;return=same;effects=4',
        'nonempty:java.lang.IllegalArgumentException,effects=4'],
      [spreader, spreaderPosition, invoke(`(J${object}${objectArray})${object}`), invoke(`(J${objectArray}${object})${object}`)]),
    selectedCase('spreader-primitive-int', 'caseSpreaderPrimitiveInt',
      'array=int[];elements=-7/16777217;return=16777217;source-array=unchanged;effects=1',
      [spreader, invoke('([I)I')], ['invokevirtual', 'iaload']),
    selectedCase('spreader-primitive-long-double-wide', 'caseSpreaderPrimitiveLongDoubleWide',
      'position=1;long[]/double[]=exact;wide-prefix=exact;tail/return=same;source-arrays=unchanged;effects=2',
      [spreaderPosition, invoke(`(D[J${object})${object}`), invoke(`(J[D${object})${object}`)], ['invokevirtual', 'laload', 'daload']),
    selectedCase('spreader-length-null-before-target', 'caseSpreaderLengthNull',
      ['short:java.lang.IllegalArgumentException,effects=0', 'long:java.lang.IllegalArgumentException,effects=0',
        'null:java.lang.NullPointerException,effects=0'], [spreader, invoke(`(${objectArray})${object}`)]),
    selectedCase('spreader-cast-before-target', 'caseSpreaderCast',
      ['element:java.lang.ClassCastException,effects=0', 'array:java.lang.ClassCastException,effects=0',
        'valid-reference/null=accepted;return=same;effects=1'],
      [spreader, asType, invoke(`(${objectArray})${object}`), invoke(`(${object})${object}`)]),
    selectedCase('arrays-target-throwable-identity', 'caseTargetThrowableIdentity',
      ['collector:throwable=original;elements=same;finally=executed;effects=11',
        'spreader:throwable=original;elements=same;finally=executed;effects=11'],
      [collector, spreader, invoke(`(${object}${object})${object}`), invoke(`(${objectArray})${object}`)]),
    selectedCase('collector-factory-rejections', 'caseCollectorFactoryRejections',
      ['negative-length:java.lang.IllegalArgumentException,effects=0',
        'negative-position:java.lang.IllegalArgumentException,effects=0',
        'missing-position:java.lang.IllegalArgumentException,effects=0',
        'nonarray:java.lang.IllegalArgumentException,effects=0',
        'incompatible-array:java.lang.IllegalArgumentException,effects=0',
        'null-array-class:java.lang.NullPointerException,effects=0'], [collector, collectorPosition]),
    selectedCase('spreader-factory-rejections', 'caseSpreaderFactoryRejections',
      ['negative-length:java.lang.IllegalArgumentException,effects=0',
        'negative-position:java.lang.IllegalArgumentException,effects=0',
        'missing-position:java.lang.IllegalArgumentException,effects=0',
        'excess-length:java.lang.IllegalArgumentException,effects=0',
        'nonarray:java.lang.IllegalArgumentException,effects=0',
        'incompatible-elements:java.lang.invoke.WrongMethodTypeException,effects=0',
        'null-array-class:java.lang.NullPointerException,effects=0'], [spreader, spreaderPosition])
  ]
}];

function deepFreeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
  return Object.freeze(value);
}
export const collectionGroups = deepFreeze(unsealedGroups);
export default collectionGroups;
