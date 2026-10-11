// Fixed, source-authored final-JLS-25 unnamed-resource oracles. Suppression is
// asserted by actual Throwable reference identity, never messages or names.
const mainClass = 'classes.modern_test.JavaFinalResources';
const resourceClass = `${mainClass}$Resource`;
const resource = `L${resourceClass.replaceAll('.', '/')};`;
const throwable = 'Ljava/lang/Throwable;', exception = 'Ljava/lang/Exception;';
const operand = (owner, member, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name: member, descriptor});
const probe = (method, descriptor, requiredOpcodes, symbolicOperands, className) => ({method, descriptor, requiredOpcodes,
  ...(symbolicOperands ? {symbolicOperands} : {}), ...(className ? {className} : {})});
const closeOperand = operand(resourceClass, 'close', '()V');
const suppressionOperand = operand('java.lang.Throwable', 'addSuppressed', `(${throwable})V`);
const identityProbe = probe('same', `(${throwable}${throwable})Z`, ['if_acmpne', 'ireturn']);
const suppressedProbe = probe('expectSuppressed', `(${throwable}[${throwable})V`, ['invokevirtual', 'arraylength', 'aaload'],
  [operand('java.lang.Throwable', 'getSuppressed', `()[${throwable}`)]);
const openProbe = probe('open', `(Ljava/lang/String;${exception}${exception})${resource}`, ['athrow', 'new', 'invokespecial', 'areturn'],
  [operand(resourceClass, '<init>', `(Ljava/lang/String;${exception})V`, 'invokespecial')]);
const closeProbe = probe('close', '()V', ['getfield', 'athrow', 'return'],
  [operand(resourceClass, 'failure', exception, 'getfield', 9)], resourceClass);
const bounded = 'Selected genuine final Java 25 unnamed-resource paths only; decoded probes prove static call reachability, not dynamic branch coverage or full source-unit conformance. No C bootstrap, G named-module or D scheduler coverage claim.';
const makeCase = (id, entryMethod, trace, {identity = true, probes = [], extended = false} = {}) => ({
  id, entryMethod, entryDescriptor: '()V', trace,
  anchors: {JLS: ['14.4', '14.20.3', '14.20.3.1', ...(extended ? ['14.20.1', '14.20.2', '14.20.3.2'] : [])],
    JVMS: ['2.10', '4.7.3', '6.5.athrow', '6.5.invokevirtual']},
  probes: [probe(entryMethod, '()V', ['invokestatic', 'invokevirtual', 'athrow', 'return'], [closeOperand, suppressionOperand]),
    openProbe, closeProbe, ...(identity ? [identityProbe, suppressedProbe] : []), ...probes],
  oracleKind: 'specification', limitations: [bounded,
    'Fresh enabled-suppression Exception instances are compared element-by-element; no suppressed-array allocation or implementation timing guarantee.'],
});

export default {
  id: 'final-resources', releases: [25], source: 'classes/modern_fixture/JavaFinalResources.java', mainClass,
  completionMarker: 'FINAL_RESOURCES_OK', driverClassNames: [mainClass, resourceClass],
  cases: [
    makeCase('fr-body-primary', 'caseBodyPrimary', ['order=L+,R+,body!,R-,L-', 'primary=same', 'suppressed=R:same,L:same']),
    makeCase('fr-close-primary', 'caseClosePrimary', ['order=L+,R+,body,R-,L-', 'primary=same', 'suppressed=L:same']),
    makeCase('fr-second-acquire-throw', 'caseSecondAcquireThrow', ['order=L+,R+!,L-', 'primary=same', 'suppressed=L:same']),
    makeCase('fr-null-resource', 'caseNullResource', ['order=N=null,R+,body,R-', 'completion=normal', 'closes=1'],
      {identity: false, probes: [probe('nullResource', `()${resource}`, ['aconst_null', 'areturn'])]}),
    makeCase('fr-extended-catch-finally', 'caseExtendedCatchFinally', [
      'order=L+,R+,body!,R-,L-,catch,finally,outer-catch', 'primary=same', 'suppressed=R:same,L:same',
    ], {extended: true}),
    makeCase('fr-first-acquire-throw', 'caseFirstAcquireThrow', ['order=L+!', 'primary=same', 'suppressed=none']),
  ],
};
