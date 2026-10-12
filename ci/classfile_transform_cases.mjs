const pkg = 'java.lang.classfile.', owner = 'classes.modern_test.ClassFileTransformFinal',
  support = 'classes.modern_test.ClassFileSupport';
const text = 'Ljava/lang/String;', cls = 'Ljava/lang/Class;', cd = 'Ljava/lang/constant/ClassDesc;',
  cm = 'Ljava/lang/classfile/ClassModel;', cb = 'Ljava/lang/classfile/ClassBuilder;',
  element = 'Ljava/lang/classfile/ClassElement;', code = 'Ljava/lang/classfile/CodeBuilder;',
  codeElement = 'Ljava/lang/classfile/CodeElement;', methodModel = 'Ljava/lang/classfile/MethodModel;',
  ct = 'Ljava/lang/classfile/ClassTransform;', cot = 'Ljava/lang/classfile/CodeTransform;',
  cfb = 'Ljava/lang/classfile/ClassFileBuilder;';
const op = (type, name, descriptor, static_ = false, interface_ = true) => ({
  opcode: static_ ? 'invokestatic' : interface_ ? 'invokeinterface' : 'invokevirtual',
  tag: interface_ ? 11 : 10, owner: type, name, descriptor});
const cf = (name, descriptor, static_ = false) => op(pkg + 'ClassFile', name, descriptor, static_);
const transform = cf('transformClass', '(' + cm + cd + ct + ')[B');
const emit = op(support, 'emit', '(' + text + text + ')V', true, false);
const artifact = op(support, 'artifact', '(' + text + text + '[B)V', true, false);
const define = op('java.lang.invoke.MethodHandles$Lookup', 'defineClass', '([B)' + cls, false, false);
const invoke = op('java.lang.invoke.MethodHandle', 'invokeExact', '()I', false, false);
const staticHandle = op('java.lang.invoke.MethodHandles$Lookup', 'findStatic',
  '(' + cls + text + 'Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;', false, false);
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const resource = probe('model', '()' + cm, [cf('of', '()Ljava/lang/classfile/ClassFile;', true), cf('parse', '([B)' + cm),
  op(support, 'bytes', '(' + cls + text + ')[B', true, false)]);
const callback = (method, descriptor, operands, extraOpcodes = []) => ({...probe(method, descriptor, operands),
  requiredOpcodes: [...new Set([...operands.map(item => item.opcode), ...extraOpcodes])]});
const select = callback('selectAnswer', '(' + methodModel + ')Z',
  [op(pkg + 'MethodModel', 'methodName', '()Ljava/lang/classfile/constantpool/Utf8Entry;')]);
const constantOperands = [op(pkg + 'instruction.ConstantInstruction', 'constantValue', '()Ljava/lang/constant/ConstantDesc;'),
  op(pkg + 'CodeBuilder', 'loadConstant', '(I)' + code), op(pkg + 'CodeBuilder', 'with', '(Ljava/lang/classfile/ClassFileElement;)' + cfb)];
const method = (name, descriptor, opcodes, flags = 0x0009) => ({name, descriptor, flags, opcodes});
const constructor = method('<init>', '()V', ['aload_0', 'invokespecial', 'return'], 0x0000);
const answer = method('answer', '()I', ['bipush', 'ireturn']), unused = method('debugUnused', '()I', ['bipush', 'ireturn']);
const generated = (id, name, methods, sourceFile = 'ClassFileTransformFinal.java') => ({id, kind: 'valid-generated',
  className: 'classes.modern_test.' + name, major: 69, minor: 0, flags: 0x0030,
  definition: 'define-and-invoke', fields: [], methods, sourceFile, branches: false, handlers: false});
const sources = ['ClassFile', 'ClassTransform', 'ClassFileTransform', 'ClassFileBuilder', 'CodeTransform', 'CodeBuilder',
  'instruction/ConstantInstruction', 'attribute/SourceFileAttribute'].map(type =>
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/' + type + '.html');
const limitations = [
  'Finite Java25 public transforms of original javac25 owner-free target bytes; Java21 is not applicable.',
  'Successful returned byte arrays are emitted, defined and invoked in the same producing JVM without header rewriting.',
  'Rename selects a simple class without self-owner references; general remapping and loader/module identity are unclaimed.',
  'Original callback Code/implementation handles are independently bound, not evidence of general opaque callback reachability.',
  'No branch/handler/indy/condy creation, hierarchy merge, custom mapper, new-pool or full verification claims.',
  'The callback exception-identity trace is a pinned-native regression, not invented specification wording or an exception whitelist.'
];
const entry = (id, entryMethod, trace, local, callbackMethods, artifactContract, transformed = transform) => ({id, entryMethod,
  entryDescriptor: '()V', trace: [trace], probes: [probe(entryMethod, '()V', [...local, transformed, emit,
    ...(artifactContract ? [cf('verify', '([B)Ljava/util/List;'), artifact, define, staticHandle, invoke] : [])]), resource],
  callbackMethods, artifacts: artifactContract ? [artifactContract] : [],
  oracleKind: artifactContract ? 'specification' : 'pinned-native-regression',
  anchors: {JVMS: ['4.1', '4.3.3', '4.4', '4.6', '4.7.3', '4.7.10', '4.10']},
  primarySources: sources, limitations});
const cases = [
  entry('cf-transform-accept-all', 'caseAcceptAll',
    'original-owner=retained;methods=3;verify=empty;defined/invoked=same-bytes;result=42', [], [],
    generated('transformed-accept-all', 'ClassFileTransformTarget', [constructor, answer, unused]),
    cf('transformClass', '(' + cm + ct + ')[B')),
  entry('cf-transform-drop-method', 'caseDropMethod',
    'unused-method=removed;methods=2;verify=empty;defined/invoked=same-bytes;survivor=42',
    [op(pkg + 'ClassTransform', 'dropping', '(Ljava/util/function/Predicate;)' + ct, true)],
    [callback('isUnused', '(' + element + ')Z',
      [op(pkg + 'MethodModel', 'methodName', '()Ljava/lang/classfile/constantpool/Utf8Entry;')])],
    generated('transformed-dropped', 'CfTransformDropped', [constructor, answer])),
  entry('cf-transform-rename-ownerfree', 'caseRenameOwnerfree',
    'simple-owner=renamed;self-references=absent;verify=empty;defined/invoked=same-bytes;result=42', [], [],
    generated('transformed-renamed', 'CfTransformRenamed', [constructor, answer, unused])),
  entry('cf-transform-sourcefile', 'caseSourcefile',
    'SourceFile=Transformed.java;singleton=one;verify=empty;defined/invoked=same-bytes;result=42', [],
    [callback('replaceSourcefile', '(' + cb + element + ')V', [
      op(pkg + 'attribute.SourceFileAttribute', 'of', '(' + text + ')Ljava/lang/classfile/attribute/SourceFileAttribute;', true),
      op(pkg + 'ClassBuilder', 'with', '(Ljava/lang/classfile/ClassFileElement;)' + cfb)])],
    generated('transformed-sourcefile', 'CfTransformSourcefile', [constructor, answer, unused], 'Transformed.java')),
  entry('cf-transform-constant', 'caseConstant',
    'selected-constant=42-to-73;unselected=13;verify=empty;defined/invoked=same-bytes;targeted-code=exact',
    [op(pkg + 'ClassTransform', 'transformingMethodBodies', '(Ljava/util/function/Predicate;' + cot + ')' + ct, true)],
    [select, callback('replaceConstant', '(' + code + codeElement + ')V', constantOperands)],
    generated('transformed-constant', 'CfTransformConstant', [constructor, answer, unused])),
  entry('cf-transform-end-handler', 'caseEndHandler',
    'methods=4;existing=42;added=101;verify=empty;defined/invoked=same-bytes;finisher=effective',
    [op(pkg + 'ClassTransform', 'endHandler', '(Ljava/util/function/Consumer;)' + ct, true)],
    [callback('addMethod', '(' + cb + ')V', [op(pkg + 'ClassBuilder', 'withMethodBody',
      '(' + text + 'Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)' + cb)]),
      callback('codeAdded', '(' + code + ')V', [op(pkg + 'CodeBuilder', 'bipush', '(I)' + code),
        op(pkg + 'CodeBuilder', 'ireturn', '()' + code)])],
    generated('transformed-added', 'CfTransformAdded', [constructor, answer, unused, method('added', '()I', ['bipush', 'ireturn'])])),
  entry('cf-transform-composition', 'caseComposition',
    'upstream=7;downstream=9;produced-element-observed=once;verify=empty;defined/invoked=same-bytes;result=9',
    [op(pkg + 'CodeTransform', 'andThen', '(' + cot + ')' + cot),
      op(pkg + 'ClassTransform', 'transformingMethodBodies', '(Ljava/util/function/Predicate;' + cot + ')' + ct, true)],
    [select, callback('firstConstant', '(' + code + codeElement + ')V', constantOperands),
      callback('secondConstant', '(' + code + codeElement + ')V', constantOperands, ['putstatic'])],
    generated('transformed-composed', 'CfTransformComposed', [constructor, answer, unused])),
  entry('cf-transform-callback-identity', 'caseCallbackIdentity',
    'callback=once;throwable=original-IllegalStateException;output/definition=absent', [],
    [callback('throwCallback', '(' + cb + element + ')V', [], ['getstatic', 'putstatic', 'athrow'])], null),
];
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const classfileTransformGroup = freeze({id: 'classfile-transform', source: 'classes/modern_fixture/ClassFileTransformFinal.java',
  mainClass: owner, completionMarker: 'CLASSFILE_TRANSFORM_OK', releases: [25], javacFlags: ['-g:source'],
  additionalSources: ['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames: [owner, 'classes.modern_test.ClassFileTransformTarget', support],
  resourceClassNames: ['classes.modern_test.ClassFileTransformTarget'], cases});
export default classfileTransformGroup;
