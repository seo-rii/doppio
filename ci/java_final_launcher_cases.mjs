export const launcherMainClass = 'classes.modern_test.JavaFinalLauncher';
export const launcherArguments = ['alpha', 'βeta'];
const binary = name => launcherMainClass + '$' + name;
const flags = required => ({required, forbidden: 0xffff ^ required});
const member = (descriptor, access, hasCode = true) => ({descriptor, flags: flags(access), hasCode});
const argsDescriptor = '([Ljava/lang/String;)V';
const main = (descriptor = argsDescriptor, access = 1, hasCode = true) => member(descriptor, access, hasCode);
const ctor = (descriptor = '()V', access = 1) => member(descriptor, access);
const declaration = (name, mains = [], constructors = [ctor()], superName = 'java.lang.Object', interfaces = [], access = 0x31, clinit = false) => ({
  className: name === '' ? launcherMainClass : binary(name), flags: flags(access), superName, interfaceNames: interfaces.map(binary),
  declaredMainMethods: mains, constructors, classInitializer: clinit ? member('()V', 8) : null
});
const declarations = {
  '': declaration('', [], [ctor('()V', 2)]),
  PublicStaticArgsBase: declaration('PublicStaticArgsBase', [main(argsDescriptor, 9)], [ctor()], 'java.lang.Object', [], 0x21),
  InheritedPublicStaticArgs: declaration('InheritedPublicStaticArgs', [], [ctor('()V', 2)], binary('PublicStaticArgsBase')),
  ProtectedStaticNoArgsBase: declaration('ProtectedStaticNoArgsBase', [main('()V', 0x0c)], [ctor()], 'java.lang.Object', [], 0x21),
  InheritedProtectedStaticNoArgs: declaration('InheritedProtectedStaticNoArgs', [], [ctor('()V', 2)], binary('ProtectedStaticNoArgsBase')),
  DefaultMain: declaration('DefaultMain', [main()], [], 'java.lang.Object', [], 0x601),
  SpecificDefaultMain: declaration('SpecificDefaultMain', [main()], [], 'java.lang.Object', ['DefaultMain'], 0x601),
  MostSpecificInterfaceDefault: declaration('MostSpecificInterfaceDefault', [], [ctor()], 'java.lang.Object', ['DefaultMain', 'SpecificDefaultMain']),
  InstanceMainBase: declaration('InstanceMainBase', [main()], [ctor()], 'java.lang.Object', [], 0x21),
  ClassInstanceOverride: declaration('ClassInstanceOverride', [main()], [ctor()], binary('InstanceMainBase'), ['SpecificDefaultMain']),
  AbstractStaticNoConstructor: declaration('AbstractStaticNoConstructor', [main(argsDescriptor, 9)], [ctor('(I)V')], 'java.lang.Object', [], 0x421),
  InitialInterfaceAbstract: declaration('InitialInterfaceAbstract', [main(argsDescriptor, 0x401, false)], [], 'java.lang.Object', [], 0x601),
  ClassInitializationFailure: declaration('ClassInitializationFailure', [main()], [ctor()], 'java.lang.Object', [], 0x31, true),
  InstanceInitializationFailure: declaration('InstanceInitializationFailure', [main()]),
  NonvoidArgsFallback: declaration('NonvoidArgsFallback', [main('([Ljava/lang/String;)I', 9), main('()V')]),
  ObjectArrayFallback: declaration('ObjectArrayFallback', [main('([Ljava/lang/Object;)V', 9), main('()V')]),
  TwoArgsFallback: declaration('TwoArgsFallback', [main('([Ljava/lang/String;I)V', 9), main('()V')]),
  InvalidOnly: declaration('InvalidOnly', [main('([Ljava/lang/String;)I', 9), main('([Ljava/lang/Object;)V', 9), main('([Ljava/lang/String;I)V', 9), main('()V', 2)])
};
export const launcherDriverClassNames = Object.values(declarations).map(proof => proof.className);

const operand = (name, descriptor) => ({opcode: 'invokestatic', tag: 10, owner: launcherMainClass, name, descriptor});
const callProbe = (className, method, descriptor, name, calledDescriptor, requiredOpcodes = ['invokestatic', 'return']) => ({
  className: className === '' ? launcherMainClass : binary(className), method, descriptor, requiredOpcodes,
  symbolicOperands: [operand(name, calledDescriptor)]
});
const emitProbe = (name, method = 'main', descriptor = argsDescriptor) => callProbe(name, method, descriptor, 'emit', '(Ljava/lang/String;Ljava/lang/String;)V');
const forbiddenProbe = (name, method = 'main', descriptor = argsDescriptor) => callProbe(name, method, descriptor,
  'forbidden', '(Ljava/lang/String;Ljava/lang/String;)V', descriptor.endsWith('I') ? ['invokestatic', 'ireturn'] : ['invokestatic', 'return']);
const constructedProbe = name => ({...emitProbe(name, '<init>', '()V'), requiredOpcodes: ['invokespecial', 'invokestatic', 'return']});
const select = (name, descriptor, isStatic, target) => ({declaringClass: binary(name), descriptor, isStatic,
  constructor: isStatic || target === null ? null : {className: binary(target), descriptor: '()V'}});
const definitions = [
  {id: 'fl-inherited-public-static-args', target: 'InheritedPublicStaticArgs', classes: ['InheritedPublicStaticArgs', 'PublicStaticArgsBase'],
    selection: select('PublicStaticArgsBase', argsDescriptor, true), trace: ['main=inherited-public-static', 'args=alpha|βeta'],
    probes: [emitProbe('PublicStaticArgsBase'), forbiddenProbe('InheritedPublicStaticArgs', '<init>', '()V')], anchors: ['8.4.8']},
  {id: 'fl-inherited-protected-static-noargs', target: 'InheritedProtectedStaticNoArgs', classes: ['InheritedProtectedStaticNoArgs', 'ProtectedStaticNoArgsBase'],
    selection: select('ProtectedStaticNoArgsBase', '()V', true), trace: ['main=inherited-protected-static-noargs'],
    probes: [emitProbe('ProtectedStaticNoArgsBase', 'main', '()V'), forbiddenProbe('InheritedProtectedStaticNoArgs', '<init>', '()V')], anchors: ['8.4.8']},
  {id: 'fl-most-specific-interface-default', target: 'MostSpecificInterfaceDefault', classes: ['MostSpecificInterfaceDefault', 'DefaultMain', 'SpecificDefaultMain'],
    selection: select('SpecificDefaultMain', argsDescriptor, false, 'MostSpecificInterfaceDefault'),
    trace: ['constructed', 'main=most-specific-default', 'args=alpha|βeta'],
    probes: [constructedProbe('MostSpecificInterfaceDefault'), emitProbe('SpecificDefaultMain'), forbiddenProbe('DefaultMain')], anchors: ['8.4.8', '9.4.1']},
  {id: 'fl-class-instance-override', target: 'ClassInstanceOverride', classes: ['ClassInstanceOverride', 'InstanceMainBase', 'SpecificDefaultMain', 'DefaultMain'],
    selection: select('ClassInstanceOverride', argsDescriptor, false, 'ClassInstanceOverride'), trace: ['constructed', 'main=class-override', 'args=alpha|βeta'],
    probes: [constructedProbe('ClassInstanceOverride'), emitProbe('ClassInstanceOverride'), forbiddenProbe('InstanceMainBase')], anchors: ['8.4.8.1', '9.4.1.1']},
  {id: 'fl-abstract-static-no-constructor', target: 'AbstractStaticNoConstructor', classes: ['AbstractStaticNoConstructor'],
    selection: select('AbstractStaticNoConstructor', argsDescriptor, true), trace: ['main=abstract-static', 'args=alpha|βeta'],
    probes: [emitProbe('AbstractStaticNoConstructor'), forbiddenProbe('AbstractStaticNoConstructor', '<init>', '(I)V')], anchors: ['8.1.1.1']},
  {id: 'fl-initial-interface-abstract-failure', target: 'InitialInterfaceAbstract', classes: ['InitialInterfaceAbstract'],
    selection: select('InitialInterfaceAbstract', argsDescriptor, false, null), trace: [], probes: [], outcome: 'failure', anchors: ['9.1.1.1', '9.4']},
  {id: 'fl-class-initialization-failure', target: 'ClassInitializationFailure', classes: ['ClassInitializationFailure'],
    selection: select('ClassInitializationFailure', argsDescriptor, false, 'ClassInitializationFailure'), trace: ['class-init-start'], outcome: 'failure',
    probes: [emitProbe('ClassInitializationFailure', '<clinit>', '()V'),
      callProbe('ClassInitializationFailure', '<clinit>', '()V', 'fail', '(Ljava/lang/String;)V'),
      forbiddenProbe('ClassInitializationFailure', '<init>', '()V'), forbiddenProbe('ClassInitializationFailure')], anchors: ['12.1.3', '12.4.2']},
  {id: 'fl-instance-initialization-failure', target: 'InstanceInitializationFailure', classes: ['InstanceInitializationFailure'],
    selection: select('InstanceInitializationFailure', argsDescriptor, false, 'InstanceInitializationFailure'), trace: ['instance-init-start'], outcome: 'failure',
    probes: [emitProbe('InstanceInitializationFailure', '<init>', '()V'),
      callProbe('InstanceInitializationFailure', '<init>', '()V', 'fail', '(Ljava/lang/String;)V'), forbiddenProbe('InstanceInitializationFailure')], anchors: ['12.5', '8.6']},
  {id: 'fl-nonvoid-args-fallback', target: 'NonvoidArgsFallback', classes: ['NonvoidArgsFallback'],
    selection: select('NonvoidArgsFallback', '()V', false, 'NonvoidArgsFallback'), trace: ['constructed', 'main=noargs-fallback'],
    probes: [constructedProbe('NonvoidArgsFallback'), emitProbe('NonvoidArgsFallback', 'main', '()V'), forbiddenProbe('NonvoidArgsFallback', 'main', '([Ljava/lang/String;)I')]},
  {id: 'fl-object-array-fallback', target: 'ObjectArrayFallback', classes: ['ObjectArrayFallback'],
    selection: select('ObjectArrayFallback', '()V', false, 'ObjectArrayFallback'), trace: ['constructed', 'main=noargs-fallback'],
    probes: [constructedProbe('ObjectArrayFallback'), emitProbe('ObjectArrayFallback', 'main', '()V'), forbiddenProbe('ObjectArrayFallback', 'main', '([Ljava/lang/Object;)V')]},
  {id: 'fl-two-args-fallback', target: 'TwoArgsFallback', classes: ['TwoArgsFallback'],
    selection: select('TwoArgsFallback', '()V', false, 'TwoArgsFallback'), trace: ['constructed', 'main=noargs-fallback'],
    probes: [constructedProbe('TwoArgsFallback'), emitProbe('TwoArgsFallback', 'main', '()V'), forbiddenProbe('TwoArgsFallback', 'main', '([Ljava/lang/String;I)V')]},
  {id: 'fl-invalid-only-failure', target: 'InvalidOnly', classes: ['InvalidOnly'], selection: null, trace: [], outcome: 'failure',
    probes: [forbiddenProbe('InvalidOnly', '<init>', '()V'), forbiddenProbe('InvalidOnly', 'main', '([Ljava/lang/String;)I'),
      forbiddenProbe('InvalidOnly', 'main', '([Ljava/lang/Object;)V'), forbiddenProbe('InvalidOnly', 'main', '([Ljava/lang/String;I)V'), forbiddenProbe('InvalidOnly', 'main', '()V')]}
];

// Source-authored literals reviewed against separate locked Corretto25 and
// unchanged B7 guest startup observations, never derived by the official gate.
// Every diagnostic line is required and allowed; unknown lines still fail.
const diagnostic = lines => {
  const patterns = lines.map(line => '^' + line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
  return {requiredPatterns: patterns, allowedPatterns: [...patterns]};
};
const streams = (stderr, stdout = []) => ({stdout: stdout.length ? diagnostic(stdout) : [], stderr: diagnostic(stderr)});
const classInitializationStderr = [
  'Exception in thread "main" java.lang.ExceptionInInitializerError',
  'Caused by: java.lang.IllegalStateException: fl-class-initialization-failure',
  '\tat classes.modern_test.JavaFinalLauncher.fail(JavaFinalLauncher.java:18)',
  '\tat classes.modern_test.JavaFinalLauncher$ClassInitializationFailure.<clinit>(JavaFinalLauncher.java:76)'
];
const instanceInitializationStderr = [
  'Exception in thread "main" java.lang.IllegalStateException: fl-instance-initialization-failure',
  '\tat classes.modern_test.JavaFinalLauncher.fail(JavaFinalLauncher.java:18)',
  '\tat classes.modern_test.JavaFinalLauncher$InstanceInitializationFailure.<init>(JavaFinalLauncher.java:86)'
];
const negativeDiagnostics = {
  'fl-initial-interface-abstract-failure': {
    native: streams(['Error: abstract class classes.modern_test.JavaFinalLauncher$InitialInterfaceAbstract can not be instantiated', 'please use a concrete class']),
    guest: streams(['Exception in thread "main" java.lang.InstantiationError: Cannot instantiate main class classes.modern_test.JavaFinalLauncher$InitialInterfaceAbstract.'])
  },
  'fl-class-initialization-failure': {
    native: streams(classInitializationStderr),
    guest: streams(classInitializationStderr, ['Error: Could not find or load main class classes.modern_test.JavaFinalLauncher$ClassInitializationFailure'])
  },
  'fl-instance-initialization-failure': {native: streams(instanceInitializationStderr), guest: streams(instanceInitializationStderr)},
  'fl-invalid-only-failure': {
    native: streams(['Error: Main method not found in class classes.modern_test.JavaFinalLauncher$InvalidOnly, please define the main method as:',
      '   public static void main(String[] args)', 'or a JavaFX application class must extend javafx.application.Application']),
    guest: streams(['Exception in thread "main" java.lang.NoSuchMethodError: Could not find a non-private main method in class classes.modern_test.JavaFinalLauncher$InvalidOnly.'])
  }
};

export const launcherCases = definitions.map(entry => ({id: entry.id, mainClass: binary(entry.target), arguments: [...launcherArguments],
  outcome: entry.outcome ?? 'success', trace: entry.trace, completionMarker: entry.outcome === 'failure' ? null : 'FINAL_LAUNCHER_OK',
  oracleKind: 'specification', oracleStatus: 'fixed',
  diagnosticsByHost: entry.outcome === 'failure' ? {native: structuredClone(negativeDiagnostics[entry.id].native),
    node: structuredClone(negativeDiagnostics[entry.id].guest), chromium: structuredClone(negativeDiagnostics[entry.id].guest)} :
    {native: {stdout: [], stderr: []}, node: {stdout: [], stderr: []}, chromium: {stdout: [], stderr: []}},
  anchors: {JLS: ['12.1.4', ...(entry.anchors ?? [])]},
  launchSelection: entry.selection, classProofs: ['', ...entry.classes].map(name => structuredClone(declarations[name])), probes: entry.probes,
  limitations: ['The actual VM initial-class route is executed, never an ordinary wrapper invocation of main.',
    'Selected final Java25 launch, inherited-member and initialization boundaries only; no complete source-unit, constructor or initialization conformance.',
    ...(entry.outcome === 'failure' ? ['Failure and original program prefix are specified; uncaught diagnostic text/type is a separately reviewed locked Corretto25 and common guest format regression, not normative exception-object identity.',
      'Chromium uses the source-fixed common JVM guest diagnostic format as an expectation; actual browser proof is required by the official gate.'] : [])]
}));

export default {id: 'final-launcher', kind: 'genuine-vm-startup', source: 'classes/modern_fixture/JavaFinalLauncher.java',
  mainClass: launcherMainClass, releases: [25], driverClassNames: launcherDriverClassNames, cases: launcherCases};
