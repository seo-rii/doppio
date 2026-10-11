// Independently authored identity/property oracles, not copied native strings.
// JLS 8.1.1.2/8.1.6/9.1.1.4/9.1.4 belong to JVM-007. Reflection, record/enum
// controls and selected initialization dependencies do not close other groups.
// The three pinned regressions below are not API-wide implementation promises.
const mainClass = 'classes.modern_test.JavaSealedReflection';
const name = shortName => `${mainClass}$${shortName}`;
const FINAL = 0x0010, INTERFACE = 0x0200, ABSTRACT = 0x0400, ENUM = 0x4000;
const classFlags = (required = 0) => ({required,
  forbidden: INTERFACE | (required & FINAL ? 0 : FINAL) | (required & ABSTRACT ? 0 : ABSTRACT) | (required & ENUM ? 0 : ENUM)});
const interfaceFlags = {required: INTERFACE | ABSTRACT, forbidden: FINAL | ENUM};
const declaration = (shortName, flags, superName = 'java.lang.Object', interfaceNames = [], permits = null, passiveInitializer) => ({
  kind: 'class', className: name(shortName), flags, superName, interfaceNames,
  permits: permits === null ? null : permits.map(name),
  ...(passiveInitializer ? {passiveInitializer} : {}),
});
const initializer = {owner: mainClass, name: 'noteInitialization', descriptor: '(I)V'};
const declarations = {
  ClassRoot: declaration('ClassRoot', classFlags(ABSTRACT), 'java.lang.Object', [], ['OpenLeaf', 'SealedChild', 'FinalLeaf']),
  FinalLeaf: declaration('FinalLeaf', classFlags(FINAL), name('ClassRoot')),
  OpenLeaf: declaration('OpenLeaf', classFlags(), name('ClassRoot')),
  OpenGrandchild: declaration('OpenGrandchild', classFlags(FINAL), name('OpenLeaf')),
  SealedChild: declaration('SealedChild', classFlags(), name('ClassRoot'), [], ['ChildLeaf']),
  ChildLeaf: declaration('ChildLeaf', classFlags(FINAL), name('SealedChild')),
  InterfaceRoot: declaration('InterfaceRoot', interfaceFlags, 'java.lang.Object', [], ['DirectInterface', 'InterfaceLeaf']),
  DirectInterface: declaration('DirectInterface', interfaceFlags, 'java.lang.Object', [name('InterfaceRoot')]),
  InterfaceLeaf: declaration('InterfaceLeaf', classFlags(FINAL), 'java.lang.Object', [name('InterfaceRoot')]),
  IndirectLeaf: declaration('IndirectLeaf', classFlags(FINAL), 'java.lang.Object', [name('DirectInterface')]),
  InferredClass: declaration('InferredClass', classFlags(ABSTRACT), 'java.lang.Object', [], ['InferredFinal', 'InferredOpen']),
  InferredFinal: declaration('InferredFinal', classFlags(FINAL), name('InferredClass')),
  InferredOpen: declaration('InferredOpen', classFlags(), name('InferredClass')),
  InferredInterface: declaration('InferredInterface', interfaceFlags, 'java.lang.Object', [], ['InferredRecord', 'InferredEnum']),
  InferredRecord: declaration('InferredRecord', classFlags(FINAL), 'java.lang.Record', [name('InferredInterface')]),
  InferredEnum: declaration('InferredEnum', classFlags(FINAL | ENUM), 'java.lang.Enum', [name('InferredInterface')]),
  OrdinaryClass: declaration('OrdinaryClass', classFlags(FINAL)),
  OrdinaryInterface: declaration('OrdinaryInterface', interfaceFlags),
  PassiveRoot: declaration('PassiveRoot', classFlags(), 'java.lang.Object', [], ['PassiveLeaf'], initializer),
  PassiveLeaf: declaration('PassiveLeaf', classFlags(FINAL), name('PassiveRoot'), [], null, initializer),
};
const operand = (owner, member, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name: member, descriptor});
const classOperand = (member, descriptor) => operand('java.lang.Class', member, descriptor);
const probe = (method, descriptor, requiredOpcodes, symbolicOperands) => ({method, descriptor, requiredOpcodes,
  ...(symbolicOperands ? {symbolicOperands} : {})});
const apiProbes = {
  sealed: probe('sealed', '(Ljava/lang/Class;)Z', ['invokevirtual', 'ireturn'], [classOperand('isSealed', '()Z')]),
  permitted: probe('permitted', '(Ljava/lang/Class;)[Ljava/lang/Class;', ['invokevirtual', 'areturn'],
    [classOperand('getPermittedSubclasses', '()[Ljava/lang/Class;')]),
};
const identities = probe('identicalSet', '([Ljava/lang/Class;[Ljava/lang/Class;)Z', ['aaload', 'if_acmpne', 'ireturn']);
const direct = probe('directMembers', '(Ljava/lang/Class;[Ljava/lang/Class;)Z', ['invokevirtual', 'ireturn'],
  [classOperand('getSuperclass', '()Ljava/lang/Class;'), classOperand('getInterfaces', '()[Ljava/lang/Class;')]);
const rootProofs = ['ClassRoot', 'OpenLeaf', 'SealedChild', 'FinalLeaf'];
const classAnchors = ['8.1.1.2', '8.1.6'];
const interfaceAnchors = ['9.1.1.4', '9.1.4'];
const bounded = 'Selected genuine sealed-reflection cases only; no unspecified array order, general loading/error/evolution, C bootstrap, G module or D scheduler coverage claim.';
const makeCase = (id, entryMethod, trace, proofNames, {apis = ['sealed', 'permitted'], probes = [],
  jls = classAnchors, oracleKind = 'specification', limitations = []} = {}) => ({
  id: `sf-${id}`, entryMethod, entryDescriptor: '()V', trace,
  anchors: {JLS: jls, JVMS: ['4.1', '4.7.31']},
  probes: [probe(entryMethod, '()V', ['invokestatic', 'return']), ...apis.map(api => apiProbes[api]), ...probes],
  sealedProofs: proofNames.map(shortName => declarations[shortName]), oracleKind,
  limitations: [bounded, ...limitations],
});
const forName = operand('java.lang.Class', 'forName', '(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;', 'invokestatic');
const modifiers = classOperand('getModifiers', '()I');

export default {
  id: 'sealed-reflection',
  source: 'classes/modern_fixture/JavaSealedReflection.java',
  mainClass,
  completionMarker: 'SEALED_REFLECTION_OK',
  kind: 'genuine-compiler-reflection',
  driverClassNames: [mainClass, ...Object.keys(declarations).map(name)],
  sealedClassNames: Object.values(declarations).filter(item => item.permits !== null).map(item => item.className),
  cases: [
    makeCase('class-list', 'caseClassList', ['sealed=true', 'permitted=3', 'identities=true', 'direct=true'],
      rootProofs, {probes: [identities, direct]}),
    makeCase('interface-list', 'caseInterfaceList', ['sealed=true', 'permitted=2', 'identities=true', 'direct=true'],
      ['InterfaceRoot', 'DirectInterface', 'InterfaceLeaf'], {probes: [identities, direct], jls: interfaceAnchors}),
    makeCase('inferred-class', 'caseInferredClass', ['sealed=true', 'permitted=2', 'identities=true', 'direct=true'],
      ['InferredClass', 'InferredFinal', 'InferredOpen'], {probes: [identities, direct],
        limitations: ['Permits inference is bounded to the named direct descendants declared in this compilation unit.']}),
    makeCase('inferred-interface', 'caseInferredInterface', ['sealed=true', 'permitted=2', 'identities=true', 'direct=true'],
      ['InferredInterface', 'InferredRecord', 'InferredEnum'], {probes: [identities, direct], jls: interfaceAnchors,
        limitations: ['Permits inference includes the selected implicitly-final record and enum, not record/enum semantic closure.']}),
    makeCase('final-leaf', 'caseFinalLeaf', ['sealed=false', 'permitted-null=true', 'final=true', 'parent=true'],
      ['FinalLeaf', 'ClassRoot'], {probes: [probe('caseFinalLeaf', '()V', ['invokevirtual'],
        [modifiers, classOperand('getSuperclass', '()Ljava/lang/Class;')])]}),
    makeCase('open-leaf', 'caseOpenLeaf', ['sealed=false', 'permitted-null=true', 'final=false', 'parent=true', 'descendant-parent=true'],
      ['OpenLeaf', 'OpenGrandchild', 'ClassRoot'], {probes: [probe('caseOpenLeaf', '()V', ['invokevirtual'],
        [modifiers, classOperand('getSuperclass', '()Ljava/lang/Class;')])]}),
    makeCase('ordinary-class', 'caseOrdinaryClass', ['sealed=false', 'permitted-null=true', 'interface=false'],
      ['OrdinaryClass'], {probes: [probe('caseOrdinaryClass', '()V', ['invokevirtual'], [classOperand('isInterface', '()Z')])]}),
    makeCase('ordinary-interface', 'caseOrdinaryInterface', ['sealed=false', 'permitted-null=true', 'interface=true'],
      ['OrdinaryInterface'], {jls: interfaceAnchors,
        probes: [probe('caseOrdinaryInterface', '()V', ['invokevirtual'], [classOperand('isInterface', '()Z')])]}),
    makeCase('primitive', 'casePrimitive', ['types=8', 'primitive=true', 'state=true'], ['OrdinaryClass'],
      {probes: [probe('casePrimitive', '()V', ['getstatic', 'invokevirtual'],
        [classOperand('isPrimitive', '()Z'), operand('java.lang.Boolean', 'TYPE', 'Ljava/lang/Class;', 'getstatic', 9),
          operand('java.lang.Double', 'TYPE', 'Ljava/lang/Class;', 'getstatic', 9)])],
        limitations: ['Eight primitive Class objects plus a genuine ordinary declaration control; primitives have no Class-file metadata.']}),
    makeCase('void', 'caseVoid', ['sealed=false', 'permitted-null=true', 'control=true'], ['OrdinaryClass'],
      {probes: [probe('caseVoid', '()V', ['getstatic'], [operand('java.lang.Void', 'TYPE', 'Ljava/lang/Class;', 'getstatic', 9)])],
        limitations: ['The void Class object plus an ordinary declaration control; void has no Class-file metadata.']}),
    makeCase('array', 'caseArray', ['types=4', 'arrays=true', 'state=true'], ['OrdinaryClass'],
      {probes: [probe('caseArray', '()V', ['invokevirtual'], [classOperand('isArray', '()Z')])],
        limitations: ['Four selected reference/primitive and one/two-dimensional arrays plus an ordinary control; no array Class-file metadata.']}),
    makeCase('record-final', 'caseRecordFinal', ['sealed=false', 'permitted-null=true', 'record=true', 'final=true', 'direct-interface=true'],
      ['InferredRecord', 'InferredInterface'], {jls: [...interfaceAnchors, '8.10'], probes: [identities,
        probe('caseRecordFinal', '()V', ['invokevirtual'], [classOperand('isRecord', '()Z'), modifiers])],
        limitations: ['Final-record positive control only; Record component/constructor/ObjectMethods contracts remain JVM-006 dependencies.']}),
    makeCase('enum-final', 'caseEnumFinal', ['sealed=false', 'permitted-null=true', 'enum=true', 'final=true', 'direct-interface=true'],
      ['InferredEnum', 'InferredInterface'], {jls: [...interfaceAnchors, '8.9'], probes: [identities,
        probe('caseEnumFinal', '()V', ['invokevirtual'], [classOperand('isEnum', '()Z'), modifiers])],
        limitations: ['Final enum without constant-specific bodies only; broader enum execution remains a dependency.']}),
    makeCase('fresh-array', 'caseFreshArray', ['identities=true', 'fresh=true'], rootProofs,
      {apis: ['permitted'], probes: [identities, probe('caseFreshArray', '()V', ['if_acmpeq'])],
        oracleKind: 'pinned-native-regression',
        limitations: ['Selected locked native21/25 fresh-array identity observation, not an API-wide freshness guarantee.']}),
    makeCase('mutation-isolation', 'caseMutationIsolation', ['before=true', 'retained=true', 'new-query=true'],
      [...rootProofs, 'OrdinaryClass'], {apis: ['permitted'], probes: [identities, probe('caseMutationIsolation', '()V', ['aastore'])],
        oracleKind: 'pinned-native-regression',
        limitations: ['Selected locked native21/25 defensive-array regression; overwriting one result must not change a retained or newly queried result.']}),
    makeCase('defining-identity', 'caseDefiningIdentity', ['owner=true', 'children=true', 'reload=true'], rootProofs,
      {apis: ['permitted'], probes: [identities, probe('caseDefiningIdentity', '()V', ['invokestatic', 'invokevirtual'],
        [forName, classOperand('getClassLoader', '()Ljava/lang/ClassLoader;')])],
        limitations: ['Same defining-loader fixture identities only; no custom loader, missing class, loader-call count or initialization timing claim.']}),
    makeCase('passive-metadata', 'casePassiveMetadata', ['owner=true', 'sealed=true', 'permitted=1', 'identities=true',
      'metadata-marker=0', 'owner-active-marker=1', 'child-active-marker=3'], ['PassiveRoot', 'PassiveLeaf'],
      {probes: [identities, probe('casePassiveMetadata', '()V', ['invokestatic', 'getstatic', 'putstatic'], [forName])],
        jls: [...classAnchors, '12.4.1', '15.8.2'], oracleKind: 'pinned-native-regression',
        limitations: ['Selected locked native21/25 metadata-loading timing, not an API-wide no-initialization guarantee or full initialization coverage.',
          'Genuine marker calls prove real initializer code; only the native trace establishes the bounded observed 0→1→3 timing.']}),
    makeCase('reflective-api', 'caseReflectiveApi', ['is-sealed-api=true', 'permits-api=true',
      'sealed-result=true,false', 'permits-result=true,true'], [...rootProofs, 'OrdinaryClass'],
      {apis: [], probes: [identities, probe('caseReflectiveApi', '()V', ['invokevirtual'],
        [classOperand('getDeclaredMethod', '(Ljava/lang/String;[Ljava/lang/Class;)Ljava/lang/reflect/Method;'),
          operand('java.lang.reflect.Method', 'invoke', '(Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/Object;')]),
        probe('api', '(Ljava/lang/reflect/Method;Ljava/lang/String;Ljava/lang/Class;)Z', ['invokevirtual', 'ireturn'],
          [operand('java.lang.reflect.Method', 'getDeclaringClass', '()Ljava/lang/Class;'),
            operand('java.lang.reflect.Method', 'getReturnType', '()Ljava/lang/Class;')])],
        limitations: ['Public instance API signature and reflective results only; no native/final/synthetic/annotation or MethodHandle contract claim.']}),
    makeCase('interface-direct-only', 'caseInterfaceDirectOnly', ['members=true', 'indirect-assignable=true',
      'indirect-listed=false', 'direct-interfaces=true'], ['InterfaceRoot', 'DirectInterface', 'InterfaceLeaf', 'IndirectLeaf'],
      {apis: ['permitted'], jls: interfaceAnchors, probes: [identities,
        probe('caseInterfaceDirectOnly', '()V', ['invokevirtual'], [classOperand('isAssignableFrom', '(Ljava/lang/Class;)Z'),
          classOperand('getInterfaces', '()[Ljava/lang/Class;')])]}),
    makeCase('sealed-child', 'caseSealedChild', ['sealed=true', 'permitted=1', 'identities=true', 'parent=true', 'root-direct-only=true'],
      ['ClassRoot', 'SealedChild', 'ChildLeaf', 'OpenLeaf', 'OpenGrandchild', 'FinalLeaf'],
      {probes: [identities, probe('caseSealedChild', '()V', ['invokevirtual'], [classOperand('getSuperclass', '()Ljava/lang/Class;')])]}),
  ],
};
