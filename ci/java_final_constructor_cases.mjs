// Independently source-authored final-JLS-25 constructor oracles. Constructor
// 8.8.7/8.8.7.1 and creation 12.5 retain JVM-002 ownership, not JVM-008 closure.
const mainClass = 'classes.modern_test.JavaFinalConstructors';
const name = shortName => `${mainClass}$${shortName}`;
const reference = shortName => `L${name(shortName).replaceAll('.', '/')};`;
const throwable = 'Ljava/lang/Throwable;';
const operand = (owner, member, descriptor, opcode = 'invokestatic', tag = 10) => ({opcode, tag, owner, name: member, descriptor});
const probe = (method, descriptor, requiredOpcodes, symbolicOperands, className) => ({method, descriptor, requiredOpcodes,
  ...(symbolicOperands ? {symbolicOperands} : {}), ...(className ? {className} : {})});
const constructor = (shortName, descriptor, operands, opcodes = ['invokestatic', 'invokespecial', 'return']) =>
  probe('<init>', descriptor, opcodes, operands, name(shortName));
const argumentOperand = operand(mainClass, 'argument', `(Ljava/lang/String;I${throwable})I`);
const failOperand = operand(mainClass, 'fail', `(Ljava/lang/String;${throwable})V`);
const baseOperand = operand(name('PairBase'), '<init>', `(II${throwable})V`, 'invokespecial');
const argumentsProbe = probe('argument', `(Ljava/lang/String;I${throwable})I`, ['athrow', 'ireturn']);
const identityProbe = probe('same', `(${throwable}${throwable})Z`, ['if_acmpne', 'ireturn']);
const baseProbe = constructor('PairBase', `(II${throwable})V`,
  [operand('java.lang.Object', '<init>', '()V', 'invokespecial')], ['invokespecial', 'athrow', 'return']);
const superArgumentsProbe = constructor('SuperArguments', `(${throwable}${throwable})V`, [argumentOperand, baseOperand]);
const qualifiedProbe = constructor('Qualified', `(${reference('Outer')}${throwable})V`, [
  operand(mainClass, 'qualifier', `(${reference('Outer')}${throwable})${reference('Outer')}`),
  argumentOperand, operand(name('Outer$InnerBase'), '<init>', `(${reference('Outer')}II)V`, 'invokespecial'),
]);
const qualifierProbe = probe('qualifier', `(${reference('Outer')}${throwable})${reference('Outer')}`, ['athrow', 'areturn']);
const bounded = 'Selected genuine final Java 25 constructor paths only; decoded probes prove static call reachability, not dynamic branch coverage or full source-unit conformance. No C bootstrap, G named-module or D scheduler coverage claim.';
const makeCase = (id, entryMethod, trace, probes, {identity = true, JLS = ['8.8.7', '8.8.7.1', '12.5', '15.6', '15.7.4']} = {}) => ({
  id, entryMethod, entryDescriptor: '()V', trace, anchors: {JLS, JVMS: ['2.6.5', '2.10', '4.7.3', '6.5.invokespecial', '6.5.athrow']},
  probes: [probe(entryMethod, '()V', ['new', 'invokespecial', 'invokestatic', 'return']),
    ...(identity ? [identityProbe] : []), ...probes],
  oracleKind: 'specification', limitations: [bounded,
    'JLS 8.8.7/8.8.7.1/12.5 are JVM-002 dependencies; these constructor cases do not promote JVM-008 units.'],
});

export default {
  id: 'final-constructors', releases: [25], source: 'classes/modern_fixture/JavaFinalConstructors.java', mainClass,
  completionMarker: 'FINAL_CONSTRUCTORS_OK',
  driverClassNames: [mainClass, ...['PairBase', 'SuperArguments', 'ThisArgument', 'SuperFailure', 'DelegatedFailure',
    'Outer', 'Outer$InnerBase', 'Qualified', 'InitializerFailure', 'CleanupFailure'].map(name)],
  cases: [
    makeCase('fc-super-arg1-throw', 'caseSuperArg1Throw', ['order=prologue,arg1', 'primary=same', 'unreached=arg2,super,epilogue'],
      [superArgumentsProbe, argumentsProbe, baseProbe]),
    makeCase('fc-super-arg2-throw', 'caseSuperArg2Throw', ['order=prologue,arg1,arg2', 'primary=same', 'unreached=super,epilogue'],
      [superArgumentsProbe, argumentsProbe, baseProbe]),
    makeCase('fc-this-arg-throw', 'caseThisArgThrow', ['order=outer-prologue,this-arg', 'primary=same', 'unreached=target,outer-epilogue'], [
      constructor('ThisArgument', `(${throwable})V`, [argumentOperand,
        operand(name('ThisArgument'), '<init>', '(I)V', 'invokespecial')]),
      constructor('ThisArgument', '(I)V', [baseOperand]), argumentsProbe, baseProbe,
    ]),
    makeCase('fc-super-ctor-throw', 'caseSuperCtorThrow', ['order=prologue,arg1,arg2,super-body', 'primary=same', 'unreached=super-end,epilogue'],
      [constructor('SuperFailure', `(${throwable})V`, [argumentOperand, baseOperand]), argumentsProbe, baseProbe]),
    makeCase('fc-delegated-ctor-throw', 'caseDelegatedCtorThrow', [
      'order=outer-prologue,inner-prologue,super-body,super-end,inner-epilogue', 'primary=same', 'unreached=outer-epilogue',
    ], [constructor('DelegatedFailure', `(${throwable})V`,
      [operand(name('DelegatedFailure'), '<init>', `(I${throwable})V`, 'invokespecial')]),
      constructor('DelegatedFailure', `(I${throwable})V`, [baseOperand], ['invokestatic', 'invokespecial', 'athrow']), baseProbe]),
    makeCase('fc-qualified-primary-order', 'caseQualifiedPrimaryOrder', [
      'order=prologue,primary,arg1,arg2,super-body,super-end,epilogue', 'owner=same', 'values=11,22',
    ], [qualifiedProbe, qualifierProbe, argumentsProbe,
      probe('owner', `()${reference('Outer')}`, ['getfield', 'areturn'], undefined, name('Outer$InnerBase'))], {identity: false}),
    makeCase('fc-qualified-primary-throw', 'caseQualifiedPrimaryThrow', [
      'order=prologue,primary', 'primary=same', 'unreached=arg1,arg2,super,epilogue',
    ], [qualifiedProbe, qualifierProbe, argumentsProbe]),
    makeCase('fc-qualified-primary-null', 'caseQualifiedPrimaryNull', [
      'order=prologue,primary', 'failure=java.lang.NullPointerException', 'unreached=arg1,arg2,super,epilogue',
    ], [qualifiedProbe, qualifierProbe, argumentsProbe], {identity: false}),
    makeCase('fc-instance-initializer-throw', 'caseInstanceInitializerThrow', [
      'order=prologue,super-body,super-end,initializer-first,initializer-throw', 'primary=same', 'unreached=initializer-later,epilogue',
    ], [constructor('InitializerFailure', `(${throwable})V`, [baseOperand,
      operand(name('InitializerFailure'), 'original', throwable, 'putfield', 9), failOperand,
      operand(mainClass, 'initialize', '(Ljava/lang/String;)I')], ['putfield', 'getfield', 'invokespecial', 'invokestatic', 'return']),
      probe('initialize', '(Ljava/lang/String;)I', ['ireturn', 'invokestatic']),
      probe('fail', `(Ljava/lang/String;${throwable})V`, ['athrow', 'return']), baseProbe]),
    makeCase('fc-prologue-cleanup-throw', 'casePrologueCleanupThrow', [
      'order=prologue,prologue-work,prologue-cleanup', 'primary=same', 'unreached=super,epilogue',
    ], [constructor('CleanupFailure', `(${throwable})V`, [failOperand, baseOperand], ['invokestatic', 'invokespecial', 'athrow', 'return']),
      probe('fail', `(Ljava/lang/String;${throwable})V`, ['athrow', 'return']), baseProbe],
    {JLS: ['8.8.7', '8.8.7.1', '12.5', '14.20.2']}),
  ],
};
