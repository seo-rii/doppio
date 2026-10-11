// C2 selected argument routing. Public API behavior is fixed independently;
// indexed JLS/JVMS anchors are dependencies, not reassigned/full-unit coverage.
const object = 'Ljava/lang/Object;';
const text = 'Ljava/lang/String;';
const handle = 'Ljava/lang/invoke/MethodHandle;';
const type = 'Ljava/lang/invoke/MethodType;';
const cls = 'Ljava/lang/Class;';
const mainClass = 'classes.modern_test.MethodHandleRoutingFinal';
const operand = (owner, name, descriptor, opcode = 'invokevirtual') => ({opcode, tag: 10, owner, name, descriptor});
const mh = (name, descriptor) => operand('java.lang.invoke.MethodHandle', name, descriptor);
const exact = descriptor => mh('invokeExact', descriptor);
const invoke = descriptor => mh('invoke', descriptor);
const factory = (name, descriptor) => operand('java.lang.invoke.MethodHandles', name, descriptor, 'invokestatic');
const fixed = mh('asFixedArity', '()' + handle);
const collector = mh('asVarargsCollector', '(' + cls + ')' + handle);
const variable = mh('isVarargsCollector', '()Z');
const withVarargs = mh('withVarargs', '(Z)' + handle);
const invokeArray = mh('invokeWithArguments', '([' + object + ')' + object);
const invokeList = mh('invokeWithArguments', '(Ljava/util/List;)' + object);
const collect = factory('collectArguments', '(' + handle + 'I' + handle + ')' + handle);

const sources = [21, 25].flatMap(release => ['MethodHandle', 'MethodHandles', 'MethodHandles.Lookup'].map(name =>
  'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/' + name + '.html'));
const probe = (method, descriptor, symbolicOperands) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands});

function entry(id, entryMethod, trace, symbolicOperands, extraAnchors = []) {
  return {id, entryMethod, entryDescriptor: '()V', trace: Array.isArray(trace) ? trace : [trace],
    anchors: {JLS: ['15.12.3', '15.12.4.2'], JVMS: ['2.9.3', '5.4.3.5', '6.5.invokevirtual', ...extraAnchors]},
    probes: [probe(entryMethod, '()V', symbolicOperands),
      probe('handle', '(' + text + type + ')' + handle, [operand('java.lang.invoke.MethodHandles$Lookup', 'findStatic',
        '(' + cls + text + type + ')' + handle)])],
    oracleKind: 'specification',
    limitations: ['Selected unchanged javac 21/25 types and finite argument counts only; not complete routing/API conformance.',
      'No jumbo/255-slot boundary, named-module, bootstrap, loader-identity, hidden-class, or VarHandle claim.'],
    primarySources: sources};
}

const cases = [
  entry('routing-lookup-varargs-flags', 'caseLookupVarargsFlags',
    'reference/primitive-lookup=varargs;ordinary-array=fixed;same-reference-type=true;effects=0', [variable]),
  entry('routing-array-static-type-passthrough', 'caseArrayStaticTypePassthrough',
    'exact-Object-array=same;invoke-Object-array=same;invoke-String-array=same;effects=3',
    [exact('([' + object + ')' + object), invoke('([' + object + ')' + object), invoke('([' + text + ')' + object)]),
  entry('routing-object-array-single-element', 'caseObjectArraySingleElement',
    'Object-array=one-array-element;Object-null=one-null-element;typed-array-null=passthrough;effects=3',
    [invoke('(' + object + ')' + object), invoke('([' + object + ')' + object)]),
  entry('routing-zero-multiple-varargs', 'caseZeroMultipleVarargs',
    'lengths=0/3;collected-order/identities=same;effects=2',
    [invoke('()' + object), invoke('(' + object + object + object + ')' + object)]),
  entry('routing-fixed-arity-normalization', 'caseFixedArityNormalization',
    'mode=fixed;type=unchanged;already-fixed=identity;Object-array=cast-passthrough;effects=2',
    [fixed, variable, exact('([' + object + ')' + object), invoke('(' + object + ')' + object)]),
  entry('routing-fixed-arity-failure-timing', 'caseFixedArityFailureTiming',
    ['exact/arity=WrongMethodTypeException;Object-value=ClassCastException;effects=0',
      'typed-null-array=target-reached;return=null;effects=1'],
    [fixed, exact('(' + object + ')' + object), invoke('(' + object + object + ')' + object),
      invoke('(' + object + ')' + object), invoke('([' + object + ')' + object)]),
  entry('routing-reference-collector', 'caseReferenceCollector',
    'last-parameter=String-array;exact-array=same;collected-elements=same;effects=2',
    [collector, variable, exact('([' + text + ')' + object), invoke('(' + text + text + ')' + object)]),
  entry('routing-wide-primitive-collector', 'caseWidePrimitiveCollector',
    'long-array=varargs;int-to-long=widened;results=9007199254740994/9007199254740995;exact-array=same;effects=2',
    [collector, variable, invoke('(JI)J'), exact('([J)J')], ['2.6.1', '2.6.2']),
  entry('routing-with-varargs-toggle', 'caseWithVarargsToggle',
    'same-mode=identity;type=unchanged;variable=collect;fixed=cast;nonarray=rejected;effects=2',
    [withVarargs, variable, invoke('(' + object + ')' + object)]),
  entry('routing-invoke-with-arguments-array', 'caseInvokeWithArgumentsArray',
    'wide/negative-zero=unboxed;reference=same;varargs=array-as-element;fixed=array-passthrough;effects=3',
    [invokeArray], ['2.6.1', '2.6.2']),
  entry('routing-invoke-with-arguments-list', 'caseInvokeWithArgumentsList',
    'wide/negative-zero=unboxed;list-order/identities=same;null-list=NullPointerException;effects=2',
    [invokeList], ['2.6.1', '2.6.2']),
  entry('routing-invoke-with-arguments-empty', 'caseInvokeWithArgumentsEmpty',
    'null-array/empty-array/empty-list=zero-arguments;varargs-null-array=empty-collection;effects=4',
    [invokeArray, invokeList]),
  entry('routing-collect-value-nonzero-wide', 'caseCollectValueNonzeroWide',
    ['position=1;order=CT;double=-0.0;collected-long=9007199254740993;references=same;target/helper=1/1',
      'nested-positions=1/2;order=LRT;wide-values=exact;references=same;target/helper=1/2',
      'order=F;throwable=original;target=absent;target/helper=0/1'],
    [collect, exact('(' + object + 'D' + object + object + ')' + object),
      exact('(' + object + text + 'I' + object + ')' + object)], ['2.6.1', '2.6.2']),
  entry('routing-collect-void-order-failure', 'caseCollectVoidOrderFailure',
    ['position=1;void-inserts-one-argument;order=CT;long=9007199254740993;references=same;target/helper=1/1',
      'order=F;throwable=original;target=absent;target/helper=0/1'],
    [collect, exact('(' + object + object + 'J' + object + ')' + object)], ['2.6.1', '2.6.2']),
  entry('routing-spread-invoker-leading', 'caseSpreadInvokerLeading',
    'leading=1;type=handle/reference/Object-array;wide=unboxed;references=same;length/cast=rejected-before-target;effects=1',
    [factory('spreadInvoker', '(' + type + 'I)' + handle), exact('(' + handle + object + '[' + object + ')' + object)],
    ['2.6.1', '2.6.2']),
  entry('routing-permute-drop-insert-errors', 'casePermuteDropInsertErrors',
    'permute=wide-slot;insert-position=1;drop-match-position=1;references=same;factory-rejections=3;effects=3',
    [factory('permuteArguments', '(' + handle + type + '[I)' + handle),
      factory('insertArguments', '(' + handle + 'I[' + object + ')' + handle),
      factory('dropArgumentsToMatch', '(' + handle + 'ILjava/util/List;I)' + handle),
      exact('(J' + object + object + ')' + object), exact('(' + object + object + ')' + object),
      exact('(J' + object + 'D)' + object)], ['2.6.1', '2.6.2'])
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const routingGroups = deepFreeze([{id: 'methodhandle-routing',
  source: 'classes/modern_fixture/MethodHandleRoutingFinal.java', mainClass,
  completionMarker: 'METHODHANDLE_ROUTING_OK', releases: [21, 25],
  driverClassNames: [mainClass, mainClass + '$ProbeFailure'], cases}]);

export default routingGroups;
