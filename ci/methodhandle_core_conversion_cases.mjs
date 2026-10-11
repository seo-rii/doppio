/**
 * C1 fixed-arity contracts. Traces are independently fixed from the public
 * 21/25 API, not captured native output. Each descriptor obligation names an
 * actual executable call in an entry reachable from its genuine javac main.
 * No claim is made about a complete source unit, modules, collectors or JMM.
 */
const mh = 'java.lang.invoke.MethodHandle';
const mhs = 'java.lang.invoke.MethodHandles';
const lookup = 'java.lang.invoke.MethodHandles$Lookup';
const methodType = 'Ljava/lang/invoke/MethodType;';
const handle = 'Ljava/lang/invoke/MethodHandle;';
const object = 'Ljava/lang/Object;';
const api = (release, type, fragment = '') =>
  `https://docs.oracle.com/en/java/javase/${release}/docs/api/java.base/java/lang/invoke/${type}.html${fragment}`;
const adaptationSources = [api(21, 'MethodHandle', '#asType(java.lang.invoke.MethodType)'),
  api(25, 'MethodHandle', '#asType(java.lang.invoke.MethodType)')];
const invocationSources = [api(21, 'MethodHandle'), api(25, 'MethodHandle'),
  api(21, 'MethodHandles'), api(25, 'MethodHandles')];

const operand = (owner, name, descriptor, opcode = 'invokevirtual') => ({
  opcode, tag: 10, owner, name, descriptor
});
const invoke = (descriptor, name = 'invokeExact') => operand(mh, name, descriptor);
const asType = operand(mh, 'asType', `(${methodType})${handle}`);
const entryProbe = (method, operands, requiredOpcodes = ['invokevirtual']) => ({
  method, descriptor: '()V', requiredOpcodes, symbolicOperands: operands
});
const adaptation = (id, entryMethod, trace, descriptors = [], extra = {}) => ({
  id, entryMethod, entryDescriptor: '()V', trace: Array.isArray(trace) ? trace : [trace],
  anchors: {JLS: ['5.1.2', '5.1.7', '5.1.8', '15.12.4.4'], JVMS: ['2.9.3', '5.4.3.3', '6.5.invokevirtual']},
  probes: [entryProbe(entryMethod, [asType, ...descriptors.map(descriptor => invoke(descriptor))])],
  oracleKind: 'specification',
  limitations: ['Selected fixed-arity asType behavior only; no explicitCastArguments, varargs, module or loader-identity claim.'],
  primarySources: adaptationSources,
  ...extra
});
const invocation = (id, entryMethod, trace, operands) => ({
  id, entryMethod, entryDescriptor: '()V', trace: Array.isArray(trace) ? trace : [trace],
  anchors: {JLS: ['15.12.4.4'], JVMS: ['2.9.3', '5.4.3.3', '6.5.invokevirtual']},
  probes: [entryProbe(entryMethod, operands, [...new Set(operands.map(operand => operand.opcode))])],
  oracleKind: 'specification',
  limitations: ['Selected signature-polymorphic calls and invokers only; no JNI, call-site cache, varargs or cross-loader claim.'],
  primarySources: invocationSources
});

// Every one of the 19 Java widening pairs has its own unconverted symbolic
// call descriptor in both independently executed argument/return cases.
const wideningDescriptors = ['(B)S', '(B)I', '(B)J', '(B)F', '(B)D',
  '(S)I', '(S)J', '(S)F', '(S)D', '(C)I', '(C)J', '(C)F', '(C)D',
  '(I)J', '(I)F', '(I)D', '(J)F', '(J)D', '(F)D'];
const primitives = ['B', 'S', 'C', 'I', 'J', 'F', 'D', 'Z'];
const conversionGroupsUnfrozen = [
  {
    id: 'methodhandle-adaptation',
    source: 'classes/modern_fixture/MethodHandleAdaptationFinal.java',
    mainClass: 'classes.modern_test.MethodHandleAdaptationFinal',
    completionMarker: 'METHODHANDLE_ADAPTATION_OK',
    driverClassNames: ['classes.modern_test.MethodHandleAdaptationFinal'],
    releases: [21, 25],
    cases: [
      adaptation('astype-same-identity', 'caseSameIdentity', 'same=true,type=true,value=4294967297,effects=1', ['(J)J']),
      adaptation('primitive-argument-widening-19', 'caseArgumentWidening', 'pairs=19,values=true,effects=19', wideningDescriptors),
      adaptation('primitive-return-widening-19', 'caseReturnWidening', 'pairs=19,values=true,effects=19', wideningDescriptors),
      adaptation('reference-argument-cast-timing', 'caseReferenceArgument',
        ['identity=true,effects=1', 'java.lang.ClassCastException,effects=1'], [`(${object})Ljava/lang/String;`]),
      adaptation('reference-return-cast-timing', 'caseReferenceReturn',
        ['identity=true,effects=1', 'java.lang.ClassCastException,effects=2'], [`(${object})Ljava/lang/String;`]),
      adaptation('primitive-argument-boxing', 'caseArgumentBoxing', 'pairs=8,values=true,effects=8',
        primitives.map(type => `(${type})${object}`)),
      adaptation('primitive-return-boxing', 'caseReturnBoxing', 'pairs=8,values=true,effects=8',
        primitives.map(type => `(${type})${object}`)),
      adaptation('wrapper-argument-unboxing', 'caseArgumentUnboxing', 'pairs=11,values=true,effects=11',
        [...primitives.map(type => `(${object})${type}`), '(Ljava/lang/Number;)J']),
      adaptation('wrapper-return-unboxing', 'caseReturnUnboxing', 'pairs=8,values=true,effects=8',
        primitives.map(type => `(${object})${type}`)),
      adaptation('null-unboxing-before-target', 'caseNullUnboxing', 'java.lang.NullPointerException,effects=0', [`(${object})J`]),
      adaptation('wrong-wrapper-before-target', 'caseWrongWrapper', 'java.lang.ClassCastException,effects=0', [`(${object})I`]),
      adaptation('reject-primitive-narrowing', 'caseRejectNarrowing',
        ['argument:java.lang.invoke.WrongMethodTypeException,effects=0',
          'return:java.lang.invoke.WrongMethodTypeException,effects=0']),
      adaptation('reject-fixed-arity-change', 'caseRejectArity', 'java.lang.invoke.WrongMethodTypeException,effects=0'),
      adaptation('reject-boolean-numeric', 'caseRejectBoolean',
        ['argument:java.lang.invoke.WrongMethodTypeException,effects=0',
          'return:java.lang.invoke.WrongMethodTypeException,effects=0']),
      adaptation('discard-return-after-target', 'caseDiscardReturn', 'effects=2,voidType=true', ['(J)V', `(${object})V`]),
      adaptation('void-to-primitive-zero', 'caseVoidPrimitive', 'pairs=8,values=true,effects=8',
        primitives.map(type => `()${type}`)),
      adaptation('void-to-reference-null', 'caseVoidReference', 'nulls=true,effects=2', [`()${object}`, '()Ljava/lang/String;']),
      adaptation('unrelated-reference-null', 'caseUnrelatedReferenceNull',
        ['null=true,effects=1', 'java.lang.ClassCastException,effects=1'], ['(Ljava/lang/Integer;)Ljava/lang/String;'])
    ]
  },
  {
    id: 'methodhandle-invocation',
    source: 'classes/modern_fixture/MethodHandleInvocationFinal.java',
    mainClass: 'classes.modern_test.MethodHandleInvocationFinal',
    completionMarker: 'METHODHANDLE_INVOCATION_OK',
    driverClassNames: ['classes.modern_test.MethodHandleInvocationFinal'],
    releases: [21, 25],
    cases: [
      invocation('exact-mixed-wide-identity', 'caseMixedWide', 'identity=true,wide=true,effects=1',
        [invoke(`(JD${object}I)${object}`)]),
      invocation('exact-argument-mismatch-before-target', 'caseExactArgumentMismatch',
        ['short:java.lang.invoke.WrongMethodTypeException,effects=0',
          'long:java.lang.invoke.WrongMethodTypeException,effects=0'], [invoke('(S)I'), invoke('(J)I')]),
      invocation('exact-return-mismatch-before-target', 'caseExactReturnMismatch',
        ['object:java.lang.invoke.WrongMethodTypeException,effects=0',
          'void:java.lang.invoke.WrongMethodTypeException,effects=0'], [invoke(`(I)${object}`), invoke('(I)V')]),
      invocation('exact-uncast-null-descriptor', 'caseUncastNull',
        ['java.lang.invoke.WrongMethodTypeException,effects=0', 'typedNull=true,effects=1'],
        [invoke(`(Ljava/lang/Void;)${object}`), invoke(`(${object})${object}`)]),
      invocation('invoke-as-type-equivalence', 'caseInvokeEquivalence', 'inexact=-7,adapted=-7,effects=2',
        [invoke('(B)J', 'invoke'), asType, invoke('(B)J')]),
      invocation('target-throwable-identity', 'caseThrowableIdentity',
        ['checked:identity=true,wide=true,effects=111', 'runtime:identity=true,wide=true,effects=111',
          'error:identity=true,wide=true,effects=111'], [invoke(`(J${object})${object}`)]),
      invocation('exact-invoker-descriptor', 'caseExactInvoker',
        ['type=true,value=4294967297,effects=1', 'java.lang.invoke.WrongMethodTypeException,effects=1'],
        [operand(mhs, 'exactInvoker', `(${methodType})${handle}`, 'invokestatic'), invoke(`(${handle}J)J`)]),
      invocation('inexact-invoker-adaptation', 'caseInexactInvoker',
        ['type=true,boxedLong=true,value=-7,effects=1', 'java.lang.ClassCastException,effects=1'],
        [operand(mhs, 'invoker', `(${methodType})${handle}`, 'invokestatic'), invoke(`(${handle}${object})${object}`)]),
      invocation('lookup-signature-polymorphic-invokers', 'caseLookupInvokers',
        ['exact=4294967297,inexact=-7,effects=2', 'java.lang.invoke.WrongMethodTypeException,effects=2'],
        [operand(lookup, 'findVirtual', `(Ljava/lang/Class;Ljava/lang/String;${methodType})${handle}`),
          invoke(`(${handle}J)J`), invoke(`(${handle}B)J`)]),
      invocation('reflective-invoker-placeholders', 'caseReflectivePlaceholders',
        ['invokeExact:java.lang.UnsupportedOperationException,effects=0',
          'invoke:java.lang.UnsupportedOperationException,effects=0',
          'unreflect:java.lang.UnsupportedOperationException,effects=0'],
        [operand('java.lang.Class', 'getDeclaredMethod', '(Ljava/lang/String;[Ljava/lang/Class;)Ljava/lang/reflect/Method;'),
          operand('java.lang.reflect.Method', 'invoke', `(${object}[${object})${object}`),
          operand(lookup, 'unreflect', `(Ljava/lang/reflect/Method;)${handle}`), invoke(`(${handle}[${object})${object}`)])
    ]
  }
];

function deepFreeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
  return Object.freeze(value);
}
export const conversionGroups = deepFreeze(conversionGroupsUnfrozen);
export default conversionGroups;
