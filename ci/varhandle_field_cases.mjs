/**
 * C3 fixed field/static value matrix. Literal traces are independent contracts,
 * not native-output capture. Real access-mode calls are proved in the original
 * javac Code bodies. No concurrent atomicity, visibility or ordering claim.
 */
const vh = 'java.lang.invoke.VarHandle';
const owner = 'classes.modern_test.VarHandleFieldsFinal';
const receiver = 'Lclasses/modern_test/VarHandleFieldsFinal;';
const object = 'Ljava/lang/Object;';
const varHandle = 'Ljava/lang/invoke/VarHandle;';
const mode = 'Ljava/lang/invoke/VarHandle$AccessMode;';
const lookup = 'java.lang.invoke.MethodHandles$Lookup';
const factoryDescriptor = `(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;)${varHandle}`;
const access = (name, descriptor) => ({opcode: 'invokevirtual', tag: 10, owner: vh, name, descriptor});
const instanceAccess = (name, value, trailing = '') => access(name, `(${receiver}${trailing})${value}`);
const factory = name => ({opcode: 'invokevirtual', tag: 10, owner: lookup, name, descriptor: factoryDescriptor});
const fieldRead = (name, descriptor) => ({opcode: 'getfield', tag: 9, owner, name, descriptor});
const primarySources = [21, 25].flatMap(release => [
  `https://docs.oracle.com/en/java/javase/${release}/docs/api/java.base/java/lang/invoke/VarHandle.html`,
  `https://docs.oracle.com/en/java/javase/${release}/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html`
]);

function selectedCase(id, entryMethod, trace, operands, helper = 'field', extraAnchors = {}, extraProbes = []) {
  const probes = [{method: entryMethod, descriptor: '()V', requiredOpcodes: ['invokevirtual'], symbolicOperands: operands}];
  if (helper) probes.push({method: helper,
    descriptor: helper === 'field' ? `(Ljava/lang/String;Ljava/lang/Class;)${varHandle}` : factoryDescriptor,
    requiredOpcodes: ['invokevirtual'], symbolicOperands: [factory(helper === 'field' ? 'findVarHandle' : 'findStaticVarHandle')]});
  probes.push(...extraProbes);
  return {
    id, entryMethod, entryDescriptor: '()V', trace: [trace],
    anchors: {
      JLS: ['15.12.4.4', ...(extraAnchors.JLS || [])],
      JVMS: ['2.9.3', '2.6.1', '2.6.2', '5.4.3.3', '6.5.invokevirtual', ...(extraAnchors.JVMS || [])]
    },
    probes, oracleKind: 'specification', primarySources,
    limitations: [
      'Selected unchanged javac 21/25 field/static single-thread value contracts only; not full API or source-unit conformance.',
      'No concurrent atomicity, visibility, memory-order/fence, module/protected-access lattice, class-loader, view/buffer or arbitrary NaN payload claim.',
      'Weak CAS equal-expected success or spurious failure is accepted only with its corresponding verified state; no first-call or bounded-retry success requirement.',
      'The static-field API guarantees initialization by operation, not a prohibition on earlier factory initialization; factory/query timing is deliberately unclaimed.'
    ]
  };
}

const addOperands = value => ['getAndAdd', 'getAndAddAcquire', 'getAndAddRelease']
  .map(name => instanceAccess(name, value, value));
const bitwiseOperands = value => ['Or', 'And', 'Xor'].flatMap(operation => ['', 'Acquire', 'Release']
  .map(suffix => instanceAccess('getAndBitwise' + operation + suffix, value, value)));
const exchangeOperands = value => ['', 'Acquire', 'Release']
  .map(suffix => instanceAccess('compareAndExchange' + suffix, value, value + value));
const getSetOperands = value => ['', 'Acquire', 'Release']
  .map(suffix => instanceAccess('getAndSet' + suffix, value, value));

const unsealedGroups = [{
  id: 'varhandle-fields',
  source: 'classes/modern_fixture/VarHandleFieldsFinal.java',
  mainClass: owner,
  completionMarker: 'VARHANDLE_FIELDS_OK',
  driverClassNames: [owner, owner + '$Base', owner + '$Child', owner + '$LazyOwner', owner + '$PrivateOwner'],
  releases: [21, 25],
  cases: [
    selectedCase('vh-field-int-read-write-modes', 'caseIntReadWriteModes',
      'reads=4;writes=4;values=-7/16777217/min/max;ordering=unclaimed',
      ['get', 'getVolatile', 'getOpaque', 'getAcquire'].map(name => instanceAccess(name, 'I'))
        .concat(['set', 'setVolatile', 'setOpaque', 'setRelease'].map(name => instanceAccess(name, 'V', 'I')),
          [fieldRead('integer', 'I')])),
    selectedCase('vh-field-long-add-overflow', 'caseLongAddOverflow',
      'forms=3;wide=9007199254740993;max+1=min;min-1=max;witness=old',
      [...addOperands('J'), fieldRead('wide', 'J')], 'field', {JLS: ['4.2.2']}),
    selectedCase('vh-field-narrow-add-wrap', 'caseNarrowAddWrap',
      'types=byte/short/char;forms=3-each;signed/unsigned-wrap=exact;witness=old',
      ['B', 'S', 'C'].flatMap(addOperands), 'field', {JLS: ['4.2.2']}),
    selectedCase('vh-field-boolean-bitwise', 'caseBooleanBitwise',
      'or/and/xor=logical;forms=9;witness=old;state=verified', bitwiseOperands('Z')),
    selectedCase('vh-field-integral-bitwise-wide', 'caseIntegralBitwiseWide',
      'types=int/long;forms=9-each;high-bit/wide-mask=exact;witness=old',
      [...bitwiseOperands('I'), ...bitwiseOperands('J')], 'field', {JLS: ['4.2.2']}),
    selectedCase('vh-field-reference-cas-exchange', 'caseReferenceCasExchange',
      'equals-distinct=miss;identity/null=match;exchange-forms=3;witness=original-reference',
      [instanceAccess('compareAndSet', 'Z', object + object), ...exchangeOperands(object), fieldRead('reference', object)]),
    selectedCase('vh-field-float-raw-comparison', 'caseFloatRawComparison',
      'positive/negative-zero=distinct;exchange-forms=3;observed-quiet-nan=match;add-forms=3;arbitrary-payload=unclaimed',
      [instanceAccess('compareAndSet', 'Z', 'FF'), instanceAccess('get', 'F'), ...exchangeOperands('F'), ...addOperands('F')]),
    selectedCase('vh-field-double-raw-comparison', 'caseDoubleRawComparison',
      'positive/negative-zero=distinct;exchange-forms=3;observed-quiet-nan=match;add-forms=3;arbitrary-payload=unclaimed',
      [instanceAccess('compareAndSet', 'Z', 'DD'), instanceAccess('get', 'D'), ...exchangeOperands('D'), ...addOperands('D')]),
    selectedCase('vh-field-get-set-witness', 'caseGetSetWitness',
      'types=reference/long;forms=3-each;old/null-identity/wide=exact;new-state=verified',
      [...getSetOperands(object), ...getSetOperands('J')]),
    selectedCase('vh-field-weak-cas-safe-outcomes', 'caseWeakCasSafeOutcomes',
      'forms=4;equal=allowed-outcome;miss=false;state=verified;first-success=unclaimed',
      ['weakCompareAndSetPlain', 'weakCompareAndSet', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease']
        .map(name => instanceAccess(name, 'Z', 'II'))),
    selectedCase('vh-field-static-zero-coordinates', 'caseStaticZeroCoordinates',
      'coordinates=empty;get/cas-types=exact;wide/cas/exchange/add=verified',
      [access('get', '()J'), access('set', '(J)V'), access('compareAndSet', '(JJ)Z'),
        access('compareAndExchange', '(JJ)J'), access('getAndAddRelease', '(J)J'),
        access('accessModeType', `(${mode})Ljava/lang/invoke/MethodType;`)], 'staticField'),
    selectedCase('vh-field-static-initialization', 'caseStaticInitialization',
      'class-literal=not-initialized;factory/query-timing=unclaimed;first-access=initialized-once;later-write/read=same-class',
      [access('getAcquire', '()J'), access('setRelease', '(J)V'), access('get', '()J'),
        {opcode: 'ldc_w', tag: 7, value: owner + '$LazyOwner'},
        {opcode: 'getstatic', tag: 9, owner, name: 'lazyInitializations', descriptor: 'I'}],
      'staticField', {JLS: ['12.4.1']}),
    selectedCase('vh-field-final-read-only', 'caseFinalReadOnly',
      'reads=4;supported=read-only;unsupported-types=queryable;rejected=9-UOE;value=unchanged',
      ['get', 'getVolatile', 'getOpaque', 'getAcquire'].map(name => instanceAccess(name, 'I'))
        .concat(['set', 'setVolatile', 'setOpaque', 'setRelease'].map(name => instanceAccess(name, 'V', 'I')),
          [instanceAccess('compareAndSet', 'Z', 'II'), instanceAccess('compareAndExchange', 'I', 'II'),
            instanceAccess('getAndSet', 'I', 'I'), instanceAccess('getAndAdd', 'I', 'I'),
            instanceAccess('getAndBitwiseAnd', 'I', 'I'), access('isAccessModeSupported', `(${mode})Z`),
            access('accessModeType', `(${mode})Ljava/lang/invoke/MethodType;`)])),
    selectedCase('vh-field-inherited-private-capability', 'caseInheritedPrivateCapability',
      'inherited-coordinate=subclass;private-capability=transferred;reads/writes=verified',
      [factory('findVarHandle'), access('get', '(Lclasses/modern_test/VarHandleFieldsFinal$Child;)I'),
        access('set', '(Lclasses/modern_test/VarHandleFieldsFinal$Child;I)V'),
        access('get', '(Lclasses/modern_test/VarHandleFieldsFinal$PrivateOwner;)J'),
        access('set', '(Lclasses/modern_test/VarHandleFieldsFinal$PrivateOwner;J)V')], null, {},
      [{className: owner + '$PrivateOwner', method: 'capability', descriptor: `()${varHandle}`,
        requiredOpcodes: ['invokevirtual'], symbolicOperands: [factory('findVarHandle')]}]),
    selectedCase('vh-field-factory-rejections', 'caseFactoryRejections',
      'missing/type=4-NoSuchFieldException;static/access=3-IllegalAccessException;null=6-NullPointerException',
      [factory('findVarHandle'), factory('findStaticVarHandle')], null),
    selectedCase('vh-field-receiver-type-errors', 'caseReceiverTypeErrors',
      'null=2-NPE;receiver=2-CCE;narrowing/arity=3-WMT;value=unchanged',
      [instanceAccess('get', 'I'), instanceAccess('set', 'V', 'I'), access('get', `(${object})I`),
        access('set', `(${object}I)V`), instanceAccess('set', 'V', 'J'), instanceAccess('get', 'I', 'I'), access('get', '()I')])
  ]
}];

function deepFreeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
  return Object.freeze(value);
}
export const fieldGroups = deepFreeze(unsealedGroups);
export default fieldGroups;
