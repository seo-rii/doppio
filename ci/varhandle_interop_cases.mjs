// C3 selected VarHandle metadata, invocation behavior and MH interoperation.
// Reflection placeholders are explicit metadata/negative checks, not substitutes
// for the genuine invokevirtual/access-mode executions in the other cases.
const object = 'Ljava/lang/Object;';
const text = 'Ljava/lang/String;';
const cls = 'Ljava/lang/Class;';
const type = 'Ljava/lang/invoke/MethodType;';
const handle = 'Ljava/lang/invoke/MethodHandle;';
const variable = 'Ljava/lang/invoke/VarHandle;';
const accessMode = 'Ljava/lang/invoke/VarHandle$AccessMode;';
const field = 'Ljava/lang/reflect/Field;';
const cell = 'Lclasses/modern_test/VarHandleInteropFinal$Cell;';
const mainClass = 'classes.modern_test.VarHandleInteropFinal';
const operand = (owner, name, descriptor, opcode = 'invokevirtual') => ({opcode, tag: 10, owner, name, descriptor});
const vh = (name, descriptor) => operand('java.lang.invoke.VarHandle', name, descriptor);
const exact = descriptor => operand('java.lang.invoke.MethodHandle', 'invokeExact', descriptor);
const invoke = descriptor => operand('java.lang.invoke.MethodHandle', 'invoke', descriptor);
const factory = (name, descriptor) => operand('java.lang.invoke.MethodHandles', name, descriptor, 'invokestatic');
const lookup = (name, descriptor) => operand('java.lang.invoke.MethodHandles$Lookup', name, descriptor);
const mode = (name, descriptor, opcode = 'invokevirtual') => operand('java.lang.invoke.VarHandle$AccessMode', name, descriptor, opcode);
const queryType = vh('accessModeType', '(' + accessMode + ')' + type);
const supported = vh('isAccessModeSupported', '(' + accessMode + ')Z');
const bound = vh('toMethodHandle', '(' + accessMode + ')' + handle);
const arrayFactory = factory('arrayElementVarHandle', '(' + cls + ')' + variable);
const genericFactory = factory('varHandleInvoker', '(' + accessMode + type + ')' + handle);
const exactFactory = factory('varHandleExactInvoker', '(' + accessMode + type + ')' + handle);
const virtual = lookup('findVirtual', '(' + cls + text + type + ')' + handle);
const unreflect = lookup('unreflectVarHandle', '(' + field + ')' + variable);
const probe = (method, descriptor, symbolicOperands) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands});
const arrayProbe = probe('arrayHandle', '(' + cls + ')' + variable, [arrayFactory]);
const fieldProbe = probe('fieldHandle', '(' + text + cls + ')' + variable,
  [lookup('findVarHandle', '(' + cls + text + cls + ')' + variable)]);

function sources(owners) {
  return [21, 25].flatMap(release => owners.map(owner =>
    'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/' + owner + '.html'));
}

function entry(id, method, trace, symbolicOperands, helpers = [arrayProbe], owners = ['VarHandle', 'MethodHandles'], pinned = false, caseLimits = []) {
  return {id, entryMethod: method, entryDescriptor: '()V', trace: [trace],
    anchors: {JLS: ['15.12.3', '15.12.4.2'], JVMS: ['2.9.3', '5.4.3.5', '6.5.invokevirtual']},
    probes: [probe(method, '()V', symbolicOperands), ...helpers],
    oracleKind: pinned ? 'pinned-native-regression' : 'specification',
    limitations: ['Selected final javac 21/25 field/array query and invocation shapes only; not complete VarHandle or JVM-003 conformance.',
      'No named-module, custom-loader, hidden-class, off-heap/view, maximal-arity, memory-order or concurrent-visibility claim.',
      ...(pinned ? ['Mixed unsupported-mode and type-mismatch error precedence is a pinned native 21/25 regression, not a normative priority claim.'] : []),
      ...caseLimits],
    primarySources: sources(owners)};
}

const cases = [
  entry('vh-query-coordinate-value-immutable', 'caseQueryCoordinateValueImmutable',
    'value=long;array=long-array/int;field=Cell;static=empty;immutable=3;coordinates=unchanged',
    [vh('varType', '()' + cls), vh('coordinateTypes', '()Ljava/util/List;')]),
  entry('vh-query-access-mode-types', 'caseQueryAccessModeTypes',
    'modes=31;array/field/static/reference/final=typed;read=T;write=void;compare-set=boolean;exchange/update=T;unsupported=still-typed',
    [queryType, supported], [probe('checkModeTypes', '(' + variable + ')V', [queryType,
      vh('varType', '()' + cls), vh('coordinateTypes', '()Ljava/util/List;')])]),
  entry('vh-query-supported-type-matrix', 'caseQuerySupportedTypeMatrix',
    'array-types=10;integral=31;boolean=28;floating=22;reference=19;final-read-only=4;all-mode-masks=checked',
    [supported, vh('varType', '()' + cls)], [arrayProbe], ['VarHandle', 'VarHandle.AccessMode', 'MethodHandles']),
  entry('vh-access-mode-name-roundtrip', 'caseAccessModeNameRoundtrip',
    'modes=31;method-name/enum-name=roundtrip;values-array=defensive;invalid=2;null=1',
    [mode('values', '()[' + accessMode, 'invokestatic'), mode('valueFromMethodName', '(' + text + ')' + accessMode, 'invokestatic'),
      mode('methodName', '()' + text)], [], ['VarHandle.AccessMode']),
  entry('vh-behavior-toggle-identity', 'caseBehaviorToggleIdentity',
    'default=invoke;toggle=exact/invoke;same-mode=identity;coordinate/value-types=same;variable-family=shared;wide=9007199254740994',
    [vh('withInvokeExactBehavior', '()' + variable), vh('withInvokeBehavior', '()' + variable),
      vh('hasInvokeExactBehavior', '()Z'), vh('set', '([JIJ)V'), vh('get', '([JI)J')]),
  entry('vh-invoke-adaptation-box-wide', 'caseInvokeAdaptationBoxWide',
    'Object-coordinate=cast;index/value=unbox/widen;return=box/widen;long=9007199254740994;reference-old/new=identity',
    [vh('set', '(' + object + 'Ljava/lang/Integer;Ljava/lang/Integer;)V'),
      vh('get', '(' + object + 'Ljava/lang/Integer;)' + object), vh('get', '([JI)D'),
      vh('getAndAdd', '([JII)J'), vh('getAndSet', '(' + object + 'Ljava/lang/Integer;' + object + ')' + object)]),
  entry('vh-invoke-exact-rejections', 'caseInvokeExactRejections',
    'coordinate/index/value/return/void/arity=WrongMethodTypeException;rejections=6;failed-writes=absent;exact-long=9007199254740994',
    [vh('withInvokeExactBehavior', '()' + variable), vh('get', '(' + object + 'I)J'),
      vh('get', '([JLjava/lang/Integer;)J'), vh('get', '([JI)' + object), vh('get', '([JI)V'),
      vh('get', '()J'), vh('set', '([JII)V'), vh('set', '([JIJ)V')]),
  entry('vh-invoke-adaptation-errors', 'caseInvokeAdaptationErrors',
    'cast=3;null-unbox/coordinate/handle=3;null-handle-before-bad-index=NullPointerException;arity=WrongMethodTypeException;failed-writes=absent;long=9007199254740993',
    [vh('get', '(' + object + 'I)J'), vh('set', '([JI' + object + ')V'),
      vh('get', '([' + object + 'I)' + text), vh('get', '([JI)J'), vh('get', '(' + object + text + ')' + object), vh('get', '([J)J')]),
  entry('vh-to-method-handle-bound', 'caseToMethodHandleBound',
    'receiver=bound;coordinates=unbound;array/field/static=exact-types;fixed-arity=true;exact-VH-to-MH=adaptable;long=9007199254740995',
    [bound, exact('([JI)J'), exact('([JIJ)V'), exact('(' + cell + ')J'), exact('()J'),
      invoke('(' + object + 'Ljava/lang/Integer;)' + object)], [fieldProbe], ['VarHandle', 'MethodHandle', 'MethodHandles']),
  entry('vh-exact-invoker-wide', 'caseExactInvokerWide',
    'leading-coordinate=VarHandle;fixed-arity=true;two-wide-values=preserved;compare=success/failure;replace-witness=9007199254740994;type-rejection=no-write',
    [exactFactory, exact('(' + variable + '[JIJJ)Z'), exact('(' + variable + '[JIJ)J'),
      exact('(' + variable + object + 'IJ)V')], [arrayProbe], ['VarHandle', 'MethodHandle', 'MethodHandles']),
  entry('vh-adaptable-invoker-box-wide', 'caseAdaptableInvokerBoxWide',
    'leading-coordinate=VarHandle;Object/Integer=cast/unbox;long=box;before/after=9007199254740993/9007199254740994;exact-VH=mismatch-rejected',
    [genericFactory, exact('(' + variable + object + 'Ljava/lang/Integer;)' + object),
      exact('(' + variable + object + 'Ljava/lang/Integer;' + object + ')V')],
    [arrayProbe], ['VarHandle', 'MethodHandle', 'MethodHandles']),
  entry('vh-lookup-virtual-access-mode', 'caseLookupVirtualAccessMode',
    'arbitrary-symbolic-type=resolved;receiver=VarHandle;fixed-arity=true;get/set=9007199254740994;generic=adaptable;exact-VH=mismatch-rejected',
    [virtual, exact('(' + variable + '[JI)J'), exact('(' + variable + '[JIJ)V'),
      exact('(' + variable + object + 'Ljava/lang/Integer;)' + object)],
    [arrayProbe], ['VarHandle', 'MethodHandle', 'MethodHandles.Lookup']),
  entry('vh-unreflect-accessible-ignored', 'caseUnreflectAccessibleIgnored',
    'public-lookup/private-field=denied-with-accessible-true/false;owner-lookup=allowed;public-field=allowed-with-accessible-true/false;values=12/8',
    [unreflect, vh('get', '(' + cell + ')I'), vh('set', '(' + cell + 'I)V')], [], ['VarHandle', 'MethodHandles.Lookup']),
  entry('vh-reflective-access-placeholders', 'caseReflectiveAccessPlaceholders',
    'get/set/compare-set=public-final-native-varargs;erased-returns=Object/void/boolean;unreflected-fixed-placeholders=UnsupportedOperationException;direct-get=9007199254740993;writes=absent',
    [vh('get', '([JI)J')], [probe('checkPlaceholder', '(' + text + cls + variable + '[' + object + ')V',
      [operand('java.lang.Class', 'getDeclaredMethod', '(' + text + '[' + cls + ')Ljava/lang/reflect/Method;'),
        operand('java.lang.reflect.Method', 'getReturnType', '()' + cls),
        lookup('unreflect', '(Ljava/lang/reflect/Method;)' + handle),
        operand('java.lang.invoke.MethodHandle', 'asFixedArity', '()' + handle),
        exact('(' + variable + '[' + object + ')' + object), exact('(' + variable + '[' + object + ')V'),
        exact('(' + variable + '[' + object + ')Z')])], ['VarHandle', 'MethodHandle', 'MethodHandles.Lookup'], false,
    ['This negative reflection case covers only Lookup.unreflect(Method).asFixedArity() placeholders and exact erased Object[] signatures, not direct access-mode value execution.',
      'Method.invoke is excluded: the separately archived pinned native 21 implementation wraps UnsatisfiedLinkError while 25 wraps the documented UnsupportedOperationException; no cross-release exception waiver is applied.']),
  entry('vh-interop-unsupported-modes', 'caseInteropUnsupportedModes',
    'unsupported-to-MH=construction-succeeds;bound/exact/generic=UnsupportedOperationException;pinned-mixed-priority=unsupported-before-normal-mismatch/exact-VH-mismatch-before-unsupported;counts=5/1;writes=absent',
    [bound, exactFactory, genericFactory, exact('(' + cell + 'J)V'), exact('(' + variable + cell + 'J)V'),
      exact('(' + variable + object + 'J)V')], [fieldProbe], ['VarHandle', 'MethodHandle', 'MethodHandles'], true),
  entry('vh-interop-factory-errors', 'caseInteropFactoryErrors',
    'null=12;non-array=IllegalArgumentException;unknown-virtual-mode=NoSuchMethodException;execution=absent',
    [arrayFactory, genericFactory, exactFactory, queryType, supported, bound, unreflect, virtual])
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const interopGroups = deepFreeze([{id: 'varhandle-interop',
  source: 'classes/modern_fixture/VarHandleInteropFinal.java', mainClass,
  completionMarker: 'VARHANDLE_INTEROP_OK', releases: [21, 25],
  driverClassNames: [mainClass, mainClass + '$Cell'], cases}]);

export default interopGroups;
