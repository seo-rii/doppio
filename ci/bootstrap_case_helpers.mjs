export const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
export const text = 'Ljava/lang/String;';
export const cls = 'Ljava/lang/Class;';
export const type = 'Ljava/lang/invoke/MethodType;';
export const object = 'Ljava/lang/Object;';
export const handle = 'Ljava/lang/invoke/MethodHandle;';
export const callSite = 'Ljava/lang/invoke/CallSite;';
export const support = 'classes.modern_test.BootstrapTestSupport';
export const constantLeading = '(' + lookup + text + cls;
export const siteLeading = '(' + lookup + text + type;
export const methodHandle = (name, descriptor, referenceKind = 6, owner = support) => ({tag: 15, referenceKind,
  reference: {tag: 10, owner, name, descriptor}});
export const bootstrap = (name, descriptor, arguments_ = [], referenceKind = 6, owner = support) =>
  ({method: methodHandle(name, descriptor, referenceKind, owner), arguments: arguments_});
export const dynamic = (name, descriptor, bootstrap_, tag = 17) => ({tag, name, descriptor, bootstrap: bootstrap_});
export const nullArgument = name => dynamic(name, object, bootstrap('constant', constantLeading + ')' + object));
export const wideArgument = name => dynamic(name, 'J', bootstrap('constantLong', constantLeading + ')J'));
export const variableArguments = name => [{tag: 8, value: 'static'}, {tag: 3, value: 7},
  {tag: 5, value: '9007199254740993'}, {tag: 4, value: 1.5}, {tag: 6, value: 2.25},
  {tag: 7, value: 'java.lang.String'}, {tag: 16, descriptor: '(J)J'}, methodHandle('identityLong', '(J)J'), nullArgument(name)];

export const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(deepFreeze); Object.freeze(value);}
  return value;
};

export function bootstrapEntry(group, id, entryMethod, trace, calls, limits = []) {
  const mainClass = 'classes.modern_test.Bootstrap' + {condy: 'Condy', indy: 'Indy', errors: 'Errors'}[group] + 'Final';
  const owner = mainClass.replace(/Final$/, 'Calls');
  return {id, entryMethod, entryDescriptor: '()V', trace: [trace], oracleKind: 'specification',
    anchors: {JVMS: ['4.4.10', '4.7.23', '5.4.3.6', group === 'condy' ? '6.5.ldc' : '6.5.invokedynamic']},
    limitations: ['Selected original final-version 65/69 user bootstrap execution only; not full JVM-004 or general bootstrap conformance.',
      'No concurrent linkage, races, maximal arity, custom loader, named module or memory-visibility claim.', ...limits],
    primarySources: [21, 25].flatMap(release => [
      'https://docs.oracle.com/javase/specs/jvms/se' + release + '/html/jvms-5.html#jvms-5.4.3.6',
      'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/CallSite.html',
      'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html']),
    probes: [{method: entryMethod, descriptor: '()V', requiredOpcodes: ['invokestatic'],
      symbolicOperands: calls.map(call => ({opcode: 'invokestatic', tag: 10, owner, name: call.method, descriptor: call.descriptor}))},
    ...calls.map(call => ({className: owner, method: call.method, descriptor: call.descriptor,
      requiredOpcodes: [call.opcode || (call.cp.tag === 18 ? 'invokedynamic' : ['J', 'D'].includes(call.cp.descriptor) ? 'ldc2_w' : 'ldc_w')],
      dynamicOperands: [{opcode: call.opcode || (call.cp.tag === 18 ? 'invokedynamic' : ['J', 'D'].includes(call.cp.descriptor) ? 'ldc2_w' : 'ldc_w'),
        cp: call.cp, ...(call.count ? {count: call.count} : {})}],
      ...(call.sameConstantPoolAs ? {sameConstantPoolAs: call.sameConstantPoolAs} : {}),
      ...(call.sameConstantPoolWithinMethod ? {sameConstantPoolWithinMethod: call.sameConstantPoolWithinMethod} : {})}))]};
}

export function bootstrapGroup(group, cases) {
  const title = {condy: 'Condy', indy: 'Indy', errors: 'Errors'}[group], mainClass = 'classes.modern_test.Bootstrap' + title + 'Final';
  return deepFreeze([{id: 'bootstrap-' + group, source: 'classes/modern_fixture/Bootstrap' + title + 'Final.java',
    additionalSources: ['classes/modern_fixture/BootstrapTestSupport.java'], mainClass,
    completionMarker: 'BOOTSTRAP_' + group.toUpperCase() + '_OK', releases: [21, 25],
    generatedClassFixture: {generator: 'ci/generate_user_bootstrap_fixtures.mjs', group, classNames: [mainClass.replace(/Final$/, 'Calls')]},
    driverClassNames: [mainClass, mainClass.replace(/Final$/, 'Calls'), support, support + '$ConstructedSite'], cases}]);
}
