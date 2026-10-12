// Literal C7a contracts are independent of guest results and original source text.
const pkg = 'java.lang.classfile.', support = 'classes.modern_test.ClassFileSupport';
const text = 'Ljava/lang/String;', cls = 'Ljava/lang/Class;', list = 'Ljava/util/List;',
  model = 'Ljava/lang/classfile/ClassModel;', field = 'Ljava/lang/classfile/FieldModel;',
  method = 'Ljava/lang/classfile/MethodModel;', element = 'Ljava/lang/classfile/ClassElement;',
  cd = 'Ljava/lang/constant/ClassDesc;', utf8 = 'Ljava/lang/classfile/constantpool/Utf8Entry;';
const op = (owner, name, descriptor, static_ = false, interface_ = true) => ({
  opcode: static_ ? 'invokestatic' : interface_ ? 'invokeinterface' : 'invokevirtual',
  tag: interface_ ? 11 : 10, owner, name, descriptor});
const emit = op(support, 'emit', '(' + text + text + ')V', true, false);
const cf = (name, descriptor, static_ = false) => op(pkg + 'ClassFile', name, descriptor, static_);
const cm = (name, descriptor) => op(pkg + 'ClassModel', name, descriptor);
const pool = (name, descriptor) => op(pkg + 'constantpool.ConstantPool', name, descriptor);
const probe = (method, descriptor, symbolicOperands, className) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands,
  ...(className ? {className} : {})});
const resourceProbe = probe('model', '()' + model, [cf('of', '()Ljava/lang/classfile/ClassFile;', true),
  cf('parse', '([B)' + model), op(support, 'bytes', '(' + cls + text + ')[B', true, false)]);
const sources = ['ClassFile', 'ClassModel', 'FieldModel', 'MethodModel', 'AccessFlags', 'CodeModel', 'AttributedElement',
  'constantpool/ConstantPool', 'constantpool/PoolEntry', 'constantpool/ClassEntry', 'constantpool/Utf8Entry']
  .map(name => 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/' + name + '.html');
const limitations = [
  'Final Java25 public API only; Java21 is not applicable, not a skipped required host cell.',
  'Original javac25 class bytes are parsed without version/header rewriting or replacement carriers.',
  'Finite branch-free companion models, not all instruction/attribute/constant-pool or LIB-007 contracts.',
  'Input models are immutable but lazy; concurrency, caller-loader hierarchy and complete verifier behavior are unclaimed.',
  'The forEach callback has independent original Code/implementation-handle proof, not an inferred static reachability claim.'
];
const entry = (id, entryMethod, trace, local, helpers = [], callbackMethods = []) => ({id, entryMethod,
  entryDescriptor: '()V', trace: [trace], probes: [probe(entryMethod, '()V', [...local, emit]), resourceProbe, ...helpers],
  callbackMethods, artifacts: [], oracleKind: 'specification',
  anchors: {JVMS: ['4.1', '4.3.2', '4.3.3', '4.4', '4.5', '4.6', '4.7']},
  primarySources: sources, limitations});
const cases = [
  entry('cf-model-name-version', 'caseNameVersion',
    'original=ClassFileModelTarget;version=69/0;internal/symbol=exact;latest=69/0',
    [cm('majorVersion', '()I'), cm('minorVersion', '()I'), cm('thisClass', '()Ljava/lang/classfile/constantpool/ClassEntry;'),
      op(pkg + 'constantpool.ClassEntry', 'asInternalName', '()' + text),
      op(pkg + 'constantpool.ClassEntry', 'asSymbol', '()' + cd), cf('latestMajorVersion', '()I', true), cf('latestMinorVersion', '()I', true)]),
  entry('cf-model-flags-locations', 'caseFlagsLocations',
    'class=final/super;locations=CLASS/FIELD/METHOD;inapplicable=absent;enum-set=exact',
    [cm('flags', '()Ljava/lang/classfile/AccessFlags;'),
      op(pkg + 'AccessFlags', 'location', '()Ljava/lang/reflect/AccessFlag$Location;'),
      op(pkg + 'AccessFlags', 'has', '(Ljava/lang/reflect/AccessFlag;)Z'),
      op(pkg + 'AccessFlags', 'flagsMask', '()I'), op(pkg + 'AccessFlags', 'flags', '()Ljava/util/Set;'),
      op(pkg + 'FieldModel', 'flags', '()Ljava/lang/classfile/AccessFlags;'),
      op(pkg + 'MethodModel', 'flags', '()Ljava/lang/classfile/AccessFlags;')]),
  entry('cf-model-super-interfaces', 'caseSuperInterfaces',
    'super=java/lang/Object;interfaces=java/lang/Runnable;module-info=false',
    [cm('superclass', '()Ljava/util/Optional;'), cm('interfaces', '()' + list), cm('isModuleInfo', '()Z')]),
  entry('cf-model-field-symbols', 'caseFieldSymbols',
    'fields=number:I/label:String/wide:J/decimal:D;raw/symbolic=exact',
    [cm('fields', '()' + list), op(pkg + 'FieldModel', 'fieldName', '()' + utf8),
      op(pkg + 'FieldModel', 'fieldType', '()' + utf8), op(pkg + 'FieldModel', 'fieldTypeSymbol', '()' + cd),
      op(pkg + 'constantpool.Utf8Entry', 'stringValue', '()' + text)]),
  entry('cf-model-method-code', 'caseMethodCode',
    'overloads=(I)I/(J)J;native-body=absent;other-bodies=7;instruction-models=present',
    [cm('methods', '()' + list), op(pkg + 'MethodModel', 'methodName', '()' + utf8),
      op(pkg + 'MethodModel', 'methodType', '()' + utf8),
      op(pkg + 'MethodModel', 'methodTypeSymbol', '()Ljava/lang/constant/MethodTypeDesc;'),
      op(pkg + 'MethodModel', 'code', '()Ljava/util/Optional;'),
      op(pkg + 'CodeModel', 'iterator', '()Ljava/util/Iterator;')]),
  entry('cf-model-traversal-inventory', 'caseTraversalInventory',
    'iterator/forEach=identical;field+method-members=12;other-elements=retained',
    [cm('iterator', '()Ljava/util/Iterator;'), cm('forEach', '(Ljava/util/function/Consumer;)V'),
      cm('elementList', '()' + list)],
    [probe('collectMember', '(' + element + list + ')V', [op(pkg + 'FieldModel', 'fieldName', '()' + utf8),
      op(pkg + 'MethodModel', 'methodName', '()' + utf8)])],
    [probe('collectCallback', '(' + element + ')V',
      [op('classes.modern_test.ClassFileModelFinal', 'collectMember', '(' + element + list + ')V', true, false)])]),
  entry('cf-model-sourcefile-parent', 'caseSourcefileParent',
    'SourceFile=ClassFileModelFinal.java;typed-find=one;field/method/code-parent=identity',
    [cm('findAttribute', '(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;'),
      cm('findAttributes', '(Ljava/lang/classfile/AttributeMapper;)' + list),
      op(pkg + 'Attributes', 'sourceFile', '()Ljava/lang/classfile/AttributeMapper;', true, false),
      op(pkg + 'attribute.SourceFileAttribute', 'sourceFile', '()' + utf8),
      op(pkg + 'FieldModel', 'parent', '()Ljava/util/Optional;'),
      op(pkg + 'MethodModel', 'parent', '()Ljava/util/Optional;'), op(pkg + 'CodeModel', 'parent', '()Ljava/util/Optional;')]),
  entry('cf-model-constantpool', 'caseConstantpool',
    'long/double=2;unusable-slots=skipped;indexed-identity=exact;utf8/class-symbols=present;bootstrap=0',
    [cm('constantPool', '()Ljava/lang/classfile/constantpool/ConstantPool;'), pool('iterator', '()Ljava/util/Iterator;'),
      pool('entryByIndex', '(I)Ljava/lang/classfile/constantpool/PoolEntry;'), pool('size', '()I'),
      pool('bootstrapMethodCount', '()I'), op(pkg + 'constantpool.PoolEntry', 'index', '()I')]),
];
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const classfileModelGroup = freeze({id: 'classfile-model', source: 'classes/modern_fixture/ClassFileModelFinal.java',
  mainClass: 'classes.modern_test.ClassFileModelFinal', completionMarker: 'CLASSFILE_MODEL_OK', releases: [25],
  javacFlags: ['-g:source'], additionalSources: ['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames: ['classes.modern_test.ClassFileModelFinal', 'classes.modern_test.ClassFileModelTarget', support],
  resourceClassNames: ['classes.modern_test.ClassFileModelTarget'], cases});
export default classfileModelGroup;
