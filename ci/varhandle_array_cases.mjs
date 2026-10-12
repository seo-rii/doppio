// C3 genuine array calls: unchanged javac 21/25 Code and independent literal
// outcomes. All memory-order suffixes below establish single-thread values
// only; they are not concurrency, visibility, or whole-API conformance claims.
const owner = 'java.lang.invoke.VarHandle';
const handle = 'Ljava/lang/invoke/VarHandle;';
const object = 'Ljava/lang/Object;';
const objectArray = '[' + object;
const call = (name, descriptor) => ({opcode: 'invokevirtual', tag: 10, owner, name, descriptor});
const get = (name, array, value) => call(name, '(' + array + 'I)' + value);
const set = (name, array, value) => call(name, '(' + array + 'I' + value + ')V');
const update = (name, array, value) => call(name, '(' + array + 'I' + value + ')' + value);
const compare = (name, array, value, result = value) =>
  call(name, '(' + array + 'I' + value + value + ')' + result);
const factory = {opcode: 'invokestatic', tag: 10, owner: 'java.lang.invoke.MethodHandles',
  name: 'arrayElementVarHandle', descriptor: '(Ljava/lang/Class;)' + handle};
const primarySources = [21, 25].flatMap(release => [
  'https://docs.oracle.com/en/java/javase/' + release +
    '/docs/api/java.base/java/lang/invoke/MethodHandles.html#arrayElementVarHandle(java.lang.Class)',
  'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/VarHandle.html'
]);
const noOrdering = 'Selected single-thread values/failures only. Plain, opaque, acquire/release and volatile suffixes do not prove Java memory ordering, concurrent visibility, atomicity under contention, or fence behavior.';

function entry(id, entryMethod, trace, symbolicOperands, extraLimitations = [], opcodes = ['invokevirtual']) {
  return {id: 'vh-array-' + id, entryMethod, entryDescriptor: '()V',
    trace: Array.isArray(trace) ? trace : [trace],
    anchors: {JLS: ['15.10.4', '15.12.3', '15.12.4.2'],
      JVMS: ['2.9.3', '2.6.1', '2.6.2', '5.4.3.3', '6.5.invokevirtual']},
    probes: [
      {method: entryMethod, descriptor: '()V', requiredOpcodes: opcodes, symbolicOperands},
      {method: 'array', descriptor: '(Ljava/lang/Class;)' + handle,
        requiredOpcodes: ['invokestatic'], symbolicOperands: [factory]}
    ],
    oracleKind: 'specification', primarySources,
    limitations: ['Selected bounded unchanged javac 21/25 primitive, reference and nested-array calls; not full VarHandle API or source-unit conformance.',
      noOrdering, 'No array-view/byte-buffer/memory-segment handles, modules, custom-loader identity or general nominal descriptor resolution claim.',
      ...extraLimitations]};
}

const cases = [
  entry('int-read-write-modes', 'caseIntReadWriteModes',
    'coordinates=int[]/int;variable=int;plain/opaque/acquire-release/volatile=10/11/12/13;neighbors=unchanged;ordering=unclaimed',
    [set('set', '[I', 'I'), get('get', '[I', 'I'), set('setOpaque', '[I', 'I'), get('getOpaque', '[I', 'I'),
      set('setRelease', '[I', 'I'), get('getAcquire', '[I', 'I'),
      set('setVolatile', '[I', 'I'), get('getVolatile', '[I', 'I'),
      call('varType', '()Ljava/lang/Class;'), call('coordinateTypes', '()Ljava/util/List;')]),
  entry('long-add-overflow', 'caseLongAddOverflow',
    'wide-old=9007199254740993;wide-new=9007199254740996;max+1=min;min-1=max;neighbors=unchanged',
    [update('getAndAdd', '[J', 'J'), update('getAndAddAcquire', '[J', 'J'),
      update('getAndAddRelease', '[J', 'J'), set('set', '[J', 'J')]),
  entry('narrow-add-wrap', 'caseNarrowAddWrap',
    'byte=127/-128;short=32767/-32768;char=65535/0;neighbors=unchanged',
    [update('getAndAdd', '[B', 'B'), update('getAndAddAcquire', '[S', 'S'), update('getAndAddRelease', '[C', 'C')]),
  entry('boolean-bitwise', 'caseBooleanBitwise',
    'or=false/true;and=true/false;xor=false/true;neighbors=unchanged',
    [update('getAndBitwiseOr', '[Z', 'Z'), update('getAndBitwiseAndAcquire', '[Z', 'Z'),
      update('getAndBitwiseXorRelease', '[Z', 'Z')]),
  entry('integral-bitwise-wide', 'caseIntegralBitwiseWide',
    'int-or/and/xor=wrapped;long=9007199254740992;byte=-127;short=-32768;char=32766;neighbors=unchanged',
    [update('getAndBitwiseOr', '[I', 'I'), update('getAndBitwiseAndAcquire', '[I', 'I'),
      update('getAndBitwiseXorRelease', '[I', 'I'), update('getAndBitwiseOr', '[J', 'J'),
      update('getAndBitwiseAndAcquire', '[J', 'J'), update('getAndBitwiseXorRelease', '[J', 'J'),
      update('getAndBitwiseOr', '[B', 'B'), update('getAndBitwiseAnd', '[S', 'S'), update('getAndBitwiseXor', '[C', 'C')]),
  entry('float-raw-comparison', 'caseFloatRawComparison',
    'signed-zero=distinct;exchange-witness=negative-zero;quiet-NaN-same-bits=matches;failed-exchange=unchanged;add=binary32-rounded;neighbors=unchanged',
    [compare('compareAndSet', '[F', 'F', 'Z'), compare('compareAndExchange', '[F', 'F'),
      compare('compareAndExchangeRelease', '[F', 'F'), set('set', '[F', 'F'), update('getAndAddAcquire', '[F', 'F')],
    ['Only canonical quiet NaN and signed-zero raw comparison paths; no signaling NaN or arbitrary payload-preservation guarantee.']),
  entry('double-raw-comparison', 'caseDoubleRawComparison',
    'signed-zero=distinct;exchange-witness=negative-zero;quiet-NaN-same-bits=matches;failed-exchange=unchanged;add=2.5/3.0;neighbors=unchanged',
    [compare('compareAndSet', '[D', 'D', 'Z'), compare('compareAndExchangeAcquire', '[D', 'D'),
      compare('compareAndExchangeRelease', '[D', 'D'), set('set', '[D', 'D'), update('getAndAddRelease', '[D', 'D')],
    ['Only canonical quiet NaN and signed-zero raw comparison paths; no signaling NaN or arbitrary payload-preservation guarantee.']),
  entry('reference-cas-exchange', 'caseReferenceCasExchange',
    'equal-not-identical=does-not-match;identity=matches;null-exchange=exact;failed-exchange=witness-null;neighbors=unchanged',
    [compare('compareAndSet', objectArray, object, 'Z'), compare('compareAndExchange', objectArray, object),
      compare('compareAndExchangeAcquire', objectArray, object)]),
  entry('get-set-witness', 'caseGetSetWitness',
    'int-old/new=9/10;long-old=9007199254740993/new=min;reference-old=same/new=null;neighbors=unchanged',
    [update('getAndSet', '[I', 'I'), update('getAndSetAcquire', '[J', 'J'), update('getAndSetRelease', objectArray, object)]),
  entry('weak-cas-safe-outcomes', 'caseWeakCasSafeOutcomes',
    'four-modes=return/write-consistent;wrong-expected=false;spurious-or-success=accepted;neighbors=unchanged;progress=unclaimed',
    ['weakCompareAndSet', 'weakCompareAndSetPlain', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease']
      .map(name => compare(name, '[I', 'I', 'Z')),
    ['At most eight uncontended attempts per mode; either success or all-spurious-false outcomes are accepted. No first-attempt success, mandatory progress, contention or exact attempt-count claim.']),
  entry('null-bounds-before-update', 'caseNullBoundsBeforeUpdate',
    ['null-set:java.lang.NullPointerException;storage=unchanged',
      'null-get:java.lang.NullPointerException;storage=unchanged',
      'negative-cas:java.lang.ArrayIndexOutOfBoundsException;storage=unchanged',
      'upper-exchange:java.lang.ArrayIndexOutOfBoundsException;storage=unchanged',
      'negative-add:java.lang.ArrayIndexOutOfBoundsException;storage=unchanged',
      'null-get-set:java.lang.NullPointerException;storage=unchanged'],
    [set('set', '[I', 'I'), get('get', '[I', 'I'), compare('compareAndSet', '[I', 'I', 'Z'),
      compare('compareAndExchange', '[I', 'I'), update('getAndAdd', '[I', 'I'), update('getAndSet', '[I', 'I')]),
  entry('reference-covariant-store', 'caseReferenceCovariantStore',
    ['set:java.lang.ArrayStoreException;storage=unchanged',
      'mismatched-cas:java.lang.ArrayStoreException;storage=unchanged',
      'mismatched-exchange:java.lang.ArrayStoreException;storage=unchanged',
      'get-set:java.lang.ArrayStoreException;storage=unchanged',
      'valid-subtype-store=identity-preserved;neighbors=unchanged'],
    [set('set', '[Ljava/lang/String;', object), compare('compareAndSet', '[Ljava/lang/String;', object, 'Z'),
      compare('compareAndExchangeAcquire', '[Ljava/lang/String;', object),
      update('getAndSetRelease', '[Ljava/lang/String;', object), set('setRelease', '[Ljava/lang/String;', object)]),
  entry('nested-reference-elements', 'caseNestedReferenceElements',
    'component=int[];get/cas/exchange/get-set=reference-identity;equal-elements-not-identity=does-not-match;inner/outer-neighbors=unchanged',
    [get('get', '[[I', '[I'), compare('compareAndSet', '[[I', '[I', 'Z'),
      compare('compareAndExchangeRelease', '[[I', '[I'), update('getAndSet', '[[I', '[I')]),
  entry('unsupported-update-types', 'caseUnsupportedUpdateTypes',
    ['reference-add:java.lang.UnsupportedOperationException;storage=unchanged',
      'boolean-add:java.lang.UnsupportedOperationException;storage=unchanged',
      'float-bitwise:java.lang.UnsupportedOperationException;storage=unchanged',
      'double-bitwise:java.lang.UnsupportedOperationException;storage=unchanged',
      'unsupported-queries=24-false;neighbors/raw-zero=unchanged'],
    [update('getAndAdd', objectArray, object), update('getAndAddAcquire', '[Z', 'Z'),
      update('getAndBitwiseOrRelease', '[F', 'F'), update('getAndBitwiseAnd', '[D', 'D')]),
  entry('factory-rejections', 'caseFactoryRejections',
    ['nonarray:java.lang.IllegalArgumentException;storage=unchanged',
      'primitive:java.lang.IllegalArgumentException;storage=unchanged',
      'void:java.lang.IllegalArgumentException;storage=unchanged',
      'null:java.lang.NullPointerException;storage=unchanged',
      'nested-array=accepted;variable=int[];coordinate=int[][]/int'],
    [call('varType', '()Ljava/lang/Class;'), call('coordinateTypes', '()Ljava/util/List;')]),
  entry('call-descriptor-errors', 'caseCallDescriptorErrors',
    ['wrong-return:java.lang.invoke.WrongMethodTypeException;storage=unchanged',
      'wrong-arity:java.lang.invoke.WrongMethodTypeException;storage=unchanged',
      'wrong-runtime-array:java.lang.ClassCastException;storage=unchanged',
      'wrong-box:java.lang.ClassCastException;storage=unchanged',
      'null-box:java.lang.NullPointerException;storage=unchanged',
      'primitive-narrowing:java.lang.invoke.WrongMethodTypeException;storage=unchanged',
      'exact-return:java.lang.invoke.WrongMethodTypeException;storage=unchanged',
      'invoke-behavior=boxed-read/primitive-widen-accepted;neighbors=unchanged'],
    [get('get', '[I', 'Ljava/lang/String;'), call('get', '([I)I'), get('get', object, 'I'),
      set('set', '[I', object), set('set', '[I', 'D'), get('get', '[I', 'J'),
      call('withInvokeExactBehavior', '()' + handle), get('get', '[I', object), set('set', '[I', 'B')])
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const arrayGroups = deepFreeze([{id: 'varhandle-arrays',
  source: 'classes/modern_fixture/VarHandleArraysFinal.java',
  mainClass: 'classes.modern_test.VarHandleArraysFinal', completionMarker: 'VARHANDLE_ARRAYS_OK',
  releases: [21, 25], driverClassNames: ['classes.modern_test.VarHandleArraysFinal'], cases}]);

export default arrayGroups;
