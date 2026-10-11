// C2 finite loop/control-flow contracts. Indexed JLS/JVMS clauses remain
// dependent obligations, not reassigned or complete source-unit coverage.
const object = 'Ljava/lang/Object;';
const handle = 'Ljava/lang/invoke/MethodHandle;';
const cls = 'Ljava/lang/Class;';
const mainClass = 'classes.modern_test.MethodHandleControlFlowFinal';
const operand = (owner, name, descriptor, opcode = 'invokevirtual') => ({opcode, tag: 10, owner, name, descriptor});
const exact = descriptor => operand('java.lang.invoke.MethodHandle', 'invokeExact', descriptor);
const factory = (name, descriptor) => operand('java.lang.invoke.MethodHandles', name, descriptor, 'invokestatic');
const threeHandles = '(' + handle + handle + handle + ')' + handle;
const whileLoop = factory('whileLoop', threeHandles);
const doWhileLoop = factory('doWhileLoop', threeHandles);
const counted = factory('countedLoop', threeHandles);
const ranged = factory('countedLoop', '(' + handle + handle + handle + handle + ')' + handle);
const iterated = factory('iteratedLoop', threeHandles);
const general = factory('loop', '([[' + handle + ')' + handle);
const table = factory('tableSwitch', '(' + handle + '[' + handle + ')' + handle);
const member = 'java.lang.invoke.MethodHandle';
const apiFragments = {
  while: 'whileLoop(' + [member, member, member].join(',') + ')',
  doWhile: 'doWhileLoop(' + [member, member, member].join(',') + ')',
  counted: 'countedLoop(' + [member, member, member].join(',') + ')',
  ranged: 'countedLoop(' + [member, member, member, member].join(',') + ')',
  iterated: 'iteratedLoop(' + [member, member, member].join(',') + ')',
  general: 'loop(java.lang.invoke.MethodHandle%5B%5D...)',
  table: 'tableSwitch(java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle...)'
};
const primarySources = names => [21, 25].flatMap(release => [
  'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/MethodHandle.html',
  'https://docs.oracle.com/en/java/javase/' + release + '/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html',
  ...names.map(name => 'https://docs.oracle.com/en/java/javase/' + release +
    '/docs/api/java.base/java/lang/invoke/MethodHandles.html#' + apiFragments[name])
]);
const probe = (method, descriptor, symbolicOperands) => ({method, descriptor,
  requiredOpcodes: [...new Set(symbolicOperands.map(item => item.opcode))], symbolicOperands});
const rangeOrderingLimitation = 'The linked Java 21/25 four-handle countedLoop API section is internally inconsistent: ' +
  'its main pseudocode orders end, start, init, whereas its API Note generic-loop clauses order end, init, start. ' +
  'Only ranged-bound initialization and corresponding failure precedence are pinned-native-regression oracles; ' +
  'their literal end/init/start expectations require both pinned genuine JDK receipts, not a normative ordering claim.';

function entry(id, entryMethod, trace, symbolicOperands, apis, extraAnchors = [], pinnedRange = false) {
  return {id, entryMethod, entryDescriptor: '()V', trace: Array.isArray(trace) ? trace : [trace],
    anchors: {JLS: ['15.12.3', '15.12.4.2'], JVMS: ['2.9.3', '5.4.3.5', '6.5.invokevirtual', ...extraAnchors]},
    probes: [probe(entryMethod, '()V', symbolicOperands),
      probe('handle', '(Ljava/lang/String;' + cls + '[' + cls + ')' + handle,
        [operand('java.lang.invoke.MethodHandles$Lookup', 'findStatic',
          '(' + cls + 'Ljava/lang/String;Ljava/lang/invoke/MethodType;)' + handle)])],
    oracleKind: pinnedRange ? 'pinned-native-regression' : 'specification',
    limitations: ['Selected unchanged javac 21/25 finite clauses, bounded iteration counts and call shapes only; not complete loop/API conformance.',
      'No arbitrary loop graph, iterator hasNext/next exception, concurrency, jumbo slot, module, bootstrap, hidden-class, or VarHandle claim.',
      ...(pinnedRange ? [rangeOrderingLimitation] : [])],
    primarySources: primarySources(apis)};
}

const cases = [
  entry('cf-while-predicate-first', 'caseWhilePredicateFirst',
    'order=I,P0,B0,P1,B1,P2;result=2;body-count=2;terminal-body=absent',
    [whileLoop, exact('(I)I')], ['while']),
  entry('cf-while-zero-default-init', 'caseWhileZeroDefaultInit',
    ['primitive-default=0;order=P0;body=absent', 'reference-default=null;order=Pnull;body=absent'],
    [whileLoop, exact('(I)I'), exact('(I)' + object)], ['while']),
  entry('cf-do-while-body-first', 'caseDoWhileBodyFirst',
    ['zero-limit=one-body;order=I,B0,P1;result=1', 'order=I,B0,P1,B1,P2;result=2;body-count=2'],
    [doWhileLoop, exact('(I)I')], ['doWhile']),
  entry('cf-while-wide-state-arguments', 'caseWhileWideStateArguments',
    ['long=9007199254740995;external-long=9007199254740993;double=-0.0;reference=same;order=I,P0,B0,P1,B1,P2',
      'double-state=-0.0;external-long=9007199254740993;reference=same;order=I,P0,B0,P1,B1,P2'],
    [whileLoop, exact('(JD' + object + ')J'), exact('(DJ' + object + ')D')], ['while'], ['2.6.1', '2.6.2']),
  entry('cf-loop-void-side-effects', 'caseLoopVoidSideEffects',
    ['while=void;effects=2;order=I,P0,B0,P1,B1,P2', 'do-while=void;zero-limit-effects=1;order=I,B0,P1'],
    [whileLoop, doWhileLoop, exact('(I)V')], ['while', 'doWhile']),
  entry('cf-counted-iterations-order', 'caseCountedIterationsOrder',
    'order=N,I,B0,B1,B2;long=9007199254740996;indices=0/1/2;effects=3',
    [counted, exact('(IJ)J')], ['counted'], ['2.6.1', '2.6.2']),
  entry('cf-counted-range-wide-state', 'caseCountedRangeWideState',
    'pinned-order=E,I,S,B2,B3,B4;long=9007199254741002;indices=2/3/4;effects=3',
    [ranged, exact('(IIJ)J')], ['ranged'], ['2.6.1', '2.6.2'], true),
  entry('cf-counted-empty-reversed', 'caseCountedEmptyReversed',
    ['equal-bounds=pinned-order-E,I,S;result=9007199254740993;body=absent',
      'reversed-bounds=pinned-order-E,I,S;result=9007199254740993;body=absent',
      'negative-iterations=order-N,I;result=9007199254740993;body=absent'],
    [ranged, counted, exact('(IIJ)J'), exact('(IJ)J')], ['ranged', 'counted'], ['2.6.1', '2.6.2'], true),
  entry('cf-iterated-explicit-order', 'caseIteratedExplicitOrder',
    ['order=R,I,B0,B1;iterator-before-init;elements/states/return=identity-preserved;effects=2',
      'empty=order-R,I;result=initial-reference;body=absent'],
    [iterated, exact('(Ljava/util/List;' + object + ')' + object)], ['iterated']),
  entry('cf-iterated-default-empty', 'caseIteratedDefaultEmpty',
    ['iterator=Iterable-default;state=null-default;empty-return=null;body=absent',
      'iterator=Iterable-default;first-state=null;elements/return=same;order=B0,B1;effects=2'],
    [iterated, exact('(Ljava/lang/Iterable;)' + object)], ['iterated']),
  entry('cf-component-throwable-identity', 'caseComponentThrowableIdentity',
    ['while-role=I;order=I;throwable=original;later-components=absent',
      'while-role=P;order=I,P0;throwable=original;later-components=absent',
      'while-role=B;order=I,P0,B0;throwable=original;later-components=absent',
      'range-role=E;pinned-order=E;throwable=original;later-components=absent',
      'range-role=I;pinned-order=E,I;throwable=original;later-components=absent',
      'range-role=S;pinned-order=E,I,S;throwable=original;later-components=absent',
      'iterated-role=R;order=R;throwable=original;later-components=absent',
      'iterated-role=I;order=R,I;throwable=original;later-components=absent',
      'iterated-role=B;order=R,I,B0;throwable=original;later-components=absent',
      'general-fini=order-I,T1,P1,F1;throwable=original;body-completed=1'],
    [whileLoop, ranged, iterated, general, exact('(I)I'), exact('(IIJ)J'),
      exact('(Ljava/util/List;' + object + ')' + object)], ['while', 'ranged', 'iterated', 'general'],
    ['2.6.1', '2.6.2', '6.5.athrow'], true),
  entry('cf-general-one-clause-order', 'caseGeneralOneClauseOrder',
    'order=I,T1,P1,T2,P2,F2;step-before-predicate;result=2;fini=once',
    [general, exact('(I)I')], ['general']),
  entry('cf-general-dependent-clauses', 'caseGeneralDependentClauses',
    ['first-exit=order-IA,IB,A1,P1,B1,Q1,A2,P2,FA;long=9007199254740994;second-clause-after-false=absent',
      'second-exit=order-IA,IB,A1,P1,B1,Q1,A2,P2,B2,Q2,FB;long=9007199254740996;updated-earlier-state=visible;fini=selected'],
    [general, exact('(I)J')], ['general'], ['2.6.1', '2.6.2']),
  entry('cf-general-null-varargs-helpers', 'caseGeneralNullVarargsHelpers',
    ['null-init=0;helpers=varargs-normalized-fixed;array=original;order=T2,P2,T4,P4,F4;return=same',
      'null-step=identity-state;null-fini=void;order=I,P0;body=absent',
      'null-init=0;null-predicate=true;void-clause/all-null-clause=normalized;order=T1,N;return=void'],
    [general, operand('java.lang.invoke.MethodHandle', 'isVarargsCollector', '()Z'),
      exact('([' + object + ')' + object), exact('(I)V'), exact('()V')], ['general']),
  entry('cf-table-switch-wide-default', 'caseTableSwitchWideDefault',
    'order=F-1,A0,B1,F2;branches=exclusive;selector-forwarded;long=9007199254740993;double=-0.0;references=same',
    [table, exact('(IJD' + object + ')' + object)], ['table'], ['2.6.1', '2.6.2']),
  entry('cf-table-switch-void-errors', 'caseTableSwitchVoidErrors',
    ['void-order=F-1,A0,F1;selected-effects=3;references=same',
      'selected-target-order=A0;throwable=original;fallback/later-effects=absent',
      'factory-errors=null-fallback/null-array/null-element/empty/wrong-selector/mismatched-type;count=6;callbacks=absent'],
    [table, factory('empty', '(Ljava/lang/invoke/MethodType;)' + handle), exact('(I' + object + ')V')],
    ['table'], ['6.5.athrow'])
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const controlFlowGroups = deepFreeze([{id: 'methodhandle-control-flow',
  source: 'classes/modern_fixture/MethodHandleControlFlowFinal.java', mainClass,
  completionMarker: 'METHODHANDLE_CONTROL_FLOW_OK', releases: [21, 25],
  driverClassNames: [mainClass], cases}]);

export default controlFlowGroups;
