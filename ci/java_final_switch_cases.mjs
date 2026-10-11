// Selected final source-level switch flow, independently authored before native
// execution. Actual pinned javac Code/CP/bootstrap evidence is not JLS-wide proof.
const mainClass = 'classes.modern_test.JavaFinalSwitchFlow';
const empty = `${mainClass}$Empty`, object = 'Ljava/lang/Object;';
const bootstrapDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;';
const member = (owner, name, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name, descriptor});
const local = (name, descriptor) => member(mainClass, name, descriptor, 'invokestatic');
const probe = (method, descriptor, requiredOpcodes, symbolicOperands = [], extra = {}) => ({method, descriptor, requiredOpcodes,
  ...(symbolicOperands.length ? {symbolicOperands} : {}), ...extra});
const switchProbe = (method, descriptor, labels) => probe(method, descriptor, ['invokedynamic'],
  [member('java.lang.String', 'length', '()I')], {bootstrapSites: [{siteName: 'typeSwitch', siteDescriptor: `(${object}I)I`, bootstrap: {
    kind: 6, tag: 10, owner: 'java.lang.runtime.SwitchBootstraps', name: 'typeSwitch', descriptor: bootstrapDescriptor,
  }, arguments: labels.map(value => ({tag: 7, value}))}]});
const bounded = 'Selected genuine final Java21/25 switch flow only; not complete language, source-unit, JVM-008, compiler, category2, or C bootstrap conformance. No preview selectors/patterns.';
const makeCase = (id, entryMethod, trace, JLS, probes, JVMS = ['4.7.3', '2.10', '6.5.athrow']) => ({
  id: `fs-${id}`, entryMethod, entryDescriptor: '()V', trace: [trace], anchors: {JLS, JVMS},
  probes: [probe(entryMethod, '()V', ['invokestatic', 'return']), ...probes], oracleKind: 'specification',
  limitations: [bounded, 'Decoded CP/Code/bootstrap obligations are pinned external-javac evidence; no dynamic branch/JIT or whole-source-unit proof.'],
});
const switchJVMS = ['4.4.10', '4.7.3', '4.7.23', '5.4.3.6', '6.5.invokedynamic'];
const valueProbe = probe('value', '(I)I', ['invokestatic', 'ireturn']);

export default {
  id: 'final-switch-flow', source: 'classes/modern_fixture/JavaFinalSwitchFlow.java', mainClass,
  completionMarker: 'FINAL_SWITCH_FLOW_OK', driverClassNames: [mainClass, empty], releases: [21, 25],
  cases: [
    makeCase('null-default-combined', 'caseNullDefaultCombined', 'null=combined;other=combined;string=string',
      ['14.11.1.2', '15.28.2'], [switchProbe('combined', `(${object})I`, ['java.lang.String'])], switchJVMS),
    makeCase('default-alone-null-rejection', 'caseDefaultAloneNullRejection', 'string=string;other=default;null=NullPointerException;null-body=absent',
      ['14.11.1.2', '15.28.2'], [switchProbe('defaultAlone', `(${object})I`, ['java.lang.String'])], switchJVMS),
    makeCase('colon-zero-record-fallthrough', 'caseColonZeroRecordFallthrough', 'string=string,empty,default;empty=empty,default;other=default',
      ['14.11.1', '14.11.3', '14.30.2'], [switchProbe('colonRecords', `(${object})V`, ['java.lang.String', empty])], switchJVMS),
    makeCase('arrow-no-fallthrough', 'caseArrowNoFallthrough', 'string=string;empty=empty;other=default;after=3',
      ['14.11.3', '14.30.2'], [switchProbe('arrowRecords', `(${object})V`, ['java.lang.String', empty])], switchJVMS),
    makeCase('colon-multiple-constants', 'caseColonMultipleConstants', '1=multi,tail;1000=multi,tail;2000=tail;other=default',
      ['14.11.1', '14.11.3'], [probe('colonConstants', '(I)V', ['lookupswitch', 'invokestatic', 'return'])],
      ['4.7.3', '6.5.lookupswitch', '6.5.goto']),
    makeCase('yield-normal-finally', 'caseYieldNormalFinally', 'try,value,finally,after;value=17',
      ['14.21', '14.20.2', '15.28.2'], [probe('normalFinally', '(I)I', ['invokestatic', 'athrow', 'ireturn'], [local('value', '(I)I')]), valueProbe]),
    makeCase('yield-finally-throw', 'caseYieldFinallyThrow', 'try,value,finally,catch;same;result=absent',
      ['14.21', '14.20.2', '15.28.2'], [probe('finallyThrow', '(I)I', ['invokestatic', 'getstatic', 'athrow'],
        [local('value', '(I)I'), member(mainClass, 'FINALLY_FAILURE', 'Ljava/lang/RuntimeException;', 'getstatic', 9)]), valueProbe]),
    makeCase('yield-expression-throw', 'caseYieldExpressionThrow', 'try,value!,finally,catch;same;result=absent',
      ['14.21', '14.20.2', '15.28.2'], [probe('expressionThrow', '(I)I', ['invokestatic', 'athrow'], [local('throwingValue', '()I')]),
        probe('throwingValue', '()I', ['getstatic', 'athrow'],
          [member(mainClass, 'VALUE_FAILURE', 'Ljava/lang/RuntimeException;', 'getstatic', 9)])]),
    makeCase('nested-yield-target', 'caseNestedYieldTarget', 'outer,inner,value,inner-finally,outer-value,outer-finally,after;value=7',
      ['14.21', '14.20.2', '15.28.2'], [probe('nestedYield', '(I)I', ['invokestatic', 'iadd', 'athrow', 'ireturn'], [local('value', '(I)I')]), valueProbe]),
    makeCase('labeled-break-finally', 'caseLabeledBreakFinally', 'body,finally,after;value=7;tail=absent',
      ['14.7', '14.11.3', '14.15', '14.20.2'], [probe('labeledBreak', '(I)I', ['goto', 'athrow', 'ireturn'])]),
    makeCase('labeled-continue-finally', 'caseLabeledContinueFinally', 'body0,finally0,body1,tail,after;iterations=2',
      ['14.7', '14.11.3', '14.14.1.3', '14.16', '14.20.2'], [probe('labeledContinue', '()I', ['iinc', 'goto', 'athrow', 'ireturn'])]),
    makeCase('return-finally', 'caseReturnFinally', 'value,finally,after;value=17',
      ['14.11.3', '14.17', '14.20.2'], [probe('returnFinally', '(I)I', ['invokestatic', 'athrow', 'ireturn'], [local('value', '(I)I')]), valueProbe]),
    makeCase('category2-yield', 'caseCategory2Yield', 'long:value,finally,after;double:value,finally,after;long=9007199254740993;double=-3.25',
      ['14.21', '14.20.2', '15.28.2'], [probe('yieldLong', '(I)J', ['ldc2_w', 'invokestatic', 'athrow', 'lreturn'], [local('longValue', '(J)J')]),
        probe('longValue', '(J)J', ['lload_0', 'lreturn']),
        probe('yieldDouble', '(I)D', ['ldc2_w', 'invokestatic', 'athrow', 'dreturn'], [local('doubleValue', '(D)D')]),
        probe('doubleValue', '(D)D', ['dload_0', 'dreturn'])], ['4.7.3', '2.6.2', '6.5.lreturn', '6.5.dreturn']),
    makeCase('reference-null-yield-identity', 'caseReferenceNullYieldIdentity', 'reference:value,finally,after;same;null:value,finally,after;null',
      ['14.21', '14.20.2', '15.21.3', '15.28.2'], [probe('referenceYield', `(${object}I)${object}`, ['aconst_null', 'invokestatic', 'athrow', 'areturn'],
        [local('referenceValue', `(${object})${object}`)]), probe('referenceValue', `(${object})${object}`, ['aload_0', 'areturn'])],
      ['4.7.3', '2.6.4', '6.5.areturn']),
  ],
};
