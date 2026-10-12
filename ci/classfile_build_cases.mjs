const pkg = 'java.lang.classfile.', owner = 'classes.modern_test.ClassFileBuildFinal',
  support = 'classes.modern_test.ClassFileSupport';
const text = 'Ljava/lang/String;', cls = 'Ljava/lang/Class;', cd = 'Ljava/lang/constant/ClassDesc;',
  cb = 'Ljava/lang/classfile/ClassBuilder;', code = 'Ljava/lang/classfile/CodeBuilder;',
  cfb = 'Ljava/lang/classfile/ClassFileBuilder;', consumer = 'Ljava/util/function/Consumer;',
  mt = 'Ljava/lang/constant/MethodTypeDesc;', cpb = 'Ljava/lang/classfile/constantpool/ConstantPoolBuilder;',
  utf8 = 'Ljava/lang/classfile/constantpool/Utf8Entry;';
const op = (type, name, descriptor, static_ = false, interface_ = true) => ({
  opcode: static_ ? 'invokestatic' : interface_ ? 'invokeinterface' : 'invokevirtual',
  tag: interface_ ? 11 : 10, owner: type, name, descriptor});
const cf = (name, descriptor, static_ = false) => op(pkg + 'ClassFile', name, descriptor, static_);
const b = (name, descriptor) => op(pkg + 'ClassBuilder', name, descriptor);
const c = (name, descriptor) => op(pkg + 'CodeBuilder', name, descriptor);
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const callback = (method, parameter, operands) => probe(method, '(' + parameter + ')V', operands);
const publicFlags = b('withFlags', '(I)' + cb);
const methodBody = b('withMethodBody', '(' + text + mt + 'I' + consumer + ')' + cb);
const build = cf('build', '(' + cd + consumer + ')[B');
const define = op('java.lang.invoke.MethodHandles$Lookup', 'defineClass', '([B)' + cls, false, false);
const emit = op(support, 'emit', '(' + text + text + ')V', true, false);
const artifact = op(support, 'artifact', '(' + text + text + '[B)V', true, false);
const verify = cf('verify', '([B)Ljava/util/List;');
const staticHandle = op('java.lang.invoke.MethodHandles$Lookup', 'findStatic',
  '(' + cls + text + 'Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;', false, false);
const invoke = descriptor => op('java.lang.invoke.MethodHandle', 'invokeExact', descriptor, false, false);
const codeInt = callback('codeInt', code, [c('bipush', '(I)' + code), c('ireturn', '()' + code)]);
const buildInt = callback('buildInt', cb, [publicFlags, methodBody]);
const sources = ['ClassFile', 'ClassBuilder', 'ClassFileBuilder', 'MethodBuilder', 'CodeBuilder',
  'attribute/SourceFileAttribute', 'constantpool/ConstantPoolBuilder'].map(type =>
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/' + type + '.html');
const limitations = [
  'Finite branch-free public Java25 building and same-returned-byte definition/execution; Java21 is not applicable.',
  'The empty structural output is define-only; the other seven outputs are defined and invoked in the producing JVM.',
  'No branches, switches, handlers, indy/condy creation, custom attributes, hierarchy callbacks or general stack-map claims.',
  'Exact named original-javac callback Code/implementation handles are proven separately from direct case-body calls.',
  'Builder outputs are genuinely produced by the public API, not precomputed native replacements or header-lowered carriers.',
  'Public sealed-interface topology, full validation/slot/loader/module/verification families and LIB-007 conformance remain unclaimed.'
];
const generated = (id, name, fields, methods, definition = 'define-and-invoke', sourceFile = null) => ({
  id, kind: 'valid-generated', className: 'classes.modern_test.' + name, major: 69, minor: 0, flags: 0x0021,
  definition, fields, methods, sourceFile, branches: false, handlers: false});
const method = (name, descriptor, opcodes, flags = 0x0009) => ({name, descriptor, flags, opcodes});
const entry = (id, entryMethod, trace, local, callbackMethods, artifactContract, exactBuild = build) => ({id, entryMethod,
  entryDescriptor: '()V', trace: [trace], probes: [probe(entryMethod, '()V', [cf('of', '()Ljava/lang/classfile/ClassFile;', true),
    exactBuild, verify, artifact, define, ...local, emit])], callbackMethods, artifacts: [artifactContract],
  oracleKind: 'specification', anchors: {JVMS: ['4.1', '4.3.2', '4.3.3', '4.4', '4.5', '4.6', '4.7.3', '4.10']},
  primarySources: sources, limitations});
const cases = [
  entry('cf-build-empty-model', 'caseEmptyModel',
    'members=0/0;version=69/0;flags=public/super;verify=empty;defined=same-bytes', [],
    [callback('buildEmpty', cb, [publicFlags])], generated('built-empty', 'CfBuiltEmpty', [], [], 'define-only')),
  entry('cf-build-int-execute', 'caseIntExecute',
    'descriptor=()I;verify=empty;defined/invoked=same-bytes;result=42', [staticHandle, invoke('()I')],
    [buildInt, codeInt], generated('built-int', 'CfBuiltInt', [], [method('answer', '()I', ['bipush', 'ireturn'])])),
  entry('cf-build-long-execute', 'caseLongExecute',
    'descriptor=(JJ)J;slots=0/2;verify=empty;defined/invoked=same-bytes;result=9007199254741002',
    [staticHandle, invoke('(JJ)J')],
    [callback('buildLong', cb, [publicFlags, methodBody]), callback('codeLong', code,
      [c('lload', '(I)' + code), c('ladd', '()' + code), c('lreturn', '()' + code)])],
    generated('built-long', 'CfBuiltLong', [], [method('wide', '(JJ)J', ['lload_0', 'lload_2', 'ladd', 'lreturn'])])),
  entry('cf-build-double-execute', 'caseDoubleExecute',
    'descriptor=(D)D;wide-constant=0.5;verify=empty;defined/invoked=same-bytes;result=12.5',
    [staticHandle, invoke('(D)D')],
    [callback('buildDouble', cb, [publicFlags, methodBody]), callback('codeDouble', code,
      [c('dload', '(I)' + code), c('ldc', '(Ljava/lang/constant/ConstantDesc;)' + code), c('dadd', '()' + code), c('dreturn', '()' + code)])],
    generated('built-double', 'CfBuiltDouble', [], [method('decimal', '(D)D', ['dload_0', 'ldc2_w', 'dadd', 'dreturn'])])),
  entry('cf-build-reference-execute', 'caseReferenceExecute',
    'descriptor=()String;constant=public-classfile;verify=empty;defined/invoked=same-bytes;reference-return=exact',
    [staticHandle, invoke('()' + text)],
    [callback('buildReference', cb, [publicFlags, methodBody]), callback('codeReference', code,
      [c('ldc', '(Ljava/lang/constant/ConstantDesc;)' + code), c('areturn', '()' + code)])],
    generated('built-reference', 'CfBuiltReference', [], [method('text', '()' + text, ['ldc', 'areturn'])])),
  entry('cf-build-constructor-field', 'caseConstructorField',
    'field=value:J;constructor=(J)V;getter=()J;verify=empty;defined/invoked=same-bytes;result=9007199254740993',
    [op('java.lang.invoke.MethodHandles$Lookup', 'findConstructor',
      '(' + cls + 'Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;', false, false),
    op('java.lang.invoke.MethodHandles$Lookup', 'findVirtual',
      '(' + cls + text + 'Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;', false, false),
    op('java.lang.invoke.MethodHandle', 'invoke', '(J)Ljava/lang/Object;', false, false),
    op('java.lang.invoke.MethodHandle', 'invoke', '(Ljava/lang/Object;)J', false, false)],
    [callback('buildConstructor', cb, [publicFlags, b('withField', '(' + text + cd + 'I)' + cb), methodBody]),
      callback('codeConstructor', code, [c('aload', '(I)' + code), c('invokespecial', '(' + cd + text + mt + ')' + code),
        c('lload', '(I)' + code), c('putfield', '(' + cd + text + cd + ')' + code), c('return_', '()' + code)]),
      callback('codeGetter', code, [c('aload', '(I)' + code), c('getfield', '(' + cd + text + cd + ')' + code), c('lreturn', '()' + code)])],
    generated('built-constructor', 'CfBuiltConstructor', [{name: 'value', descriptor: 'J', flags: 0x0001}],
      [method('<init>', '(J)V', ['aload_0', 'invokespecial', 'aload_0', 'lload_1', 'putfield', 'return'], 0x0001),
        method('value', '()J', ['aload_0', 'getfield', 'lreturn'], 0x0001)])),
  entry('cf-build-sourcefile-last', 'caseSourcefileLast',
    'SourceFile=Selected.java;singleton=last-wins;verify=empty;defined/invoked=same-bytes;result=42',
    [staticHandle, invoke('()I')],
    [callback('buildSourcefile', cb, [op(owner, 'buildInt', '(' + cb + ')V', true, false),
      b('with', '(Ljava/lang/classfile/ClassFileElement;)' + cfb),
      op(pkg + 'attribute.SourceFileAttribute', 'of', '(' + text + ')Ljava/lang/classfile/attribute/SourceFileAttribute;', true)]),
    buildInt, codeInt], generated('built-sourcefile', 'CfBuiltSourcefile', [], [method('answer', '()I', ['bipush', 'ireturn'])],
      'define-and-invoke', 'Selected.java')),
  entry('cf-build-explicit-pool', 'caseExplicitPool',
    'raw-ClassEntry/UTF8=exact;field=wide:J;verify=empty;defined/invoked=same-bytes;result=9',
    [op(pkg + 'constantpool.ConstantPoolBuilder', 'of', '()' + cpb, true),
      op(pkg + 'constantpool.ConstantPoolBuilder', 'utf8Entry', '(' + text + ')' + utf8),
      op(pkg + 'constantpool.ConstantPoolBuilder', 'classEntry', '(' + utf8 + ')Ljava/lang/classfile/constantpool/ClassEntry;'),
      staticHandle, invoke('()I')],
    [callback('buildExplicitPool', cb, [publicFlags, b('constantPool', '()' + cpb),
      b('withField', '(' + utf8 + utf8 + 'I)' + cb), b('withMethodBody', '(' + utf8 + utf8 + 'I' + consumer + ')' + cb)]),
      callback('codeExplicitPool', code, [c('bipush', '(I)' + code), c('ireturn', '()' + code)])],
    generated('built-explicit-pool', 'CfBuiltExplicitPool', [{name: 'wide', descriptor: 'J', flags: 0x0001}],
      [method('answer', '()I', ['bipush', 'ireturn'])]),
    cf('build', '(Ljava/lang/classfile/constantpool/ClassEntry;' + cpb + consumer + ')[B')),
];
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const classfileBuildGroup = freeze({id: 'classfile-build', source: 'classes/modern_fixture/ClassFileBuildFinal.java',
  mainClass: owner, completionMarker: 'CLASSFILE_BUILD_OK', releases: [25], javacFlags: ['-g:source'],
  additionalSources: ['classes/modern_fixture/classfile/ClassFileSupport.java'], driverClassNames: [owner, support],
  resourceClassNames: [], cases});
export default classfileBuildGroup;
