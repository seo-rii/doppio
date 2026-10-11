// Pure data for genuine javac exception execution. JLS chapter 14 source forms
// remain B8; this group records the inherited JVM bytecode/handler slice only.
const mainClass = 'classes.modern_test.JavaCoreExceptions';
const throwable = 'Ljava/lang/Throwable;', marker = 'Lclasses/modern_test/JavaCoreExceptions$Marker;';
const probe = (method, descriptor, requiredOpcodes, extra = {}) => ({method, descriptor, requiredOpcodes, ...extra});
const entry = (id, entryMethod, trace, JVMS, probes, JLS = ['11.3']) => ({id: 'exceptions-' + id,
  entryMethod, entryDescriptor: '()V', trace: [trace], anchors: {JLS, JVMS}, probes});
const throwing = probe('throwExact', '(' + throwable + ')V', ['aload_0', 'athrow']);
const resourceProbes = [probe('resources', '(' + marker.repeat(4) + ')V', ['athrow', 'invokevirtual']),
  probe('close', '()V', ['athrow', 'getfield'], {className: mainClass + '$Resource'})];

const cases = [
  entry('identity', 'caseIdentity', 'same', ['2.10', '6.5.athrow'], [throwing]),
  entry('handler-order', 'caseHandlerOrder', '1,2,3,4', ['2.10', '4.7.3'],
    [probe('handlerOrder', '(' + throwable + ')I', ['invokestatic', 'ireturn']), throwing]),
  entry('multi-catch', 'caseMultiCatch', 'A=same;B=same', ['2.10', '4.7.3'],
    [probe('multiCatch', '(' + throwable + ')' + throwable, ['areturn', 'invokestatic']), throwing]),
  entry('rethrow', 'caseRethrow', 'inner,outer;same', ['2.10', '6.5.athrow'],
    [probe('rethrow', '(' + throwable + ')V', ['astore_1', 'aload_1', 'athrow']), throwing]),
  entry('unwind', 'caseUnwind', '3,2,1,0,catch;same;after-call=absent', ['2.6.5', '2.10', '6.5.athrow'],
    [probe('unwind', '(I' + throwable + ')V', ['invokestatic', 'ifeq']), throwing]),
  entry('null-throw', 'caseNullThrow', 'java.lang.NullPointerException;rethrow=same', ['6.5.athrow'], [throwing]),
  entry('stack-clear', 'caseStackClear', 'before,throw,catch;value=73;later-argument=absent',
    ['2.6.2', '2.6.5', '2.10', '6.5.athrow'], [probe('stackCleared', '(' + throwable + ')I', ['ldc2_w', 'astore_2', 'ireturn']),
      probe('explode', '(' + throwable + ')I', ['athrow'])], ['11.3', '15.6', '15.7.4']),
  entry('normal-finally', 'caseNormalFinally', 'try,finally,after', ['2.10', '6.5.goto', '6.5.athrow'],
    [probe('normalFinally', '()V', ['goto', 'athrow', 'return'])]),
  entry('return-finally', 'caseReturnFinally', 'finally;value=9007199254740993', ['2.6.4', '2.10', '6.5.lreturn'],
    [probe('keepReturn', '(J)J', ['lstore_2', 'lload_2', 'lreturn', 'athrow'])]),
  entry('return-wins', 'caseReturnWins', 'value=9', ['2.6.4', '2.10', '6.5.ireturn'],
    [probe('returnWins', '()I', ['ireturn'])]),
  entry('throw-over-return', 'caseThrowOverReturn', 'same-replacement;no-return', ['2.6.5', '2.10', '6.5.athrow'],
    [probe('throwOverReturn', '(' + throwable + ')I', ['athrow'])]),
  entry('return-over-throw', 'caseReturnOverThrow', 'value=9;original-suppressed=0', ['2.6.4', '2.10', '6.5.ireturn'],
    [probe('returnOverThrow', '(' + throwable + ')I', ['ireturn', 'invokestatic']), throwing]),
  entry('throw-over-throw', 'caseThrowOverThrow', 'replacement=same;suppressed=0', ['2.6.5', '2.10', '6.5.athrow'],
    [probe('throwOverThrow', '(' + throwable + throwable + ')V', ['athrow', 'invokestatic']), throwing]),
  entry('nested-finally', 'caseNestedFinally', 'try,inner-finally,outer-finally,catch;same', ['2.6.5', '2.10', '6.5.athrow'],
    [probe('nestedFinally', '(' + throwable + ')V', ['athrow', 'invokestatic']), throwing]),
  entry('resource-normal', 'caseResourceNormal', 'A+,B+,body,B-,A-;normal', ['2.10', '6.5.athrow'], resourceProbes),
  entry('resource-body', 'caseResourceBody', 'A+,B+,body!,B-,A-;primary=P;suppressed=B,A', ['2.10', '6.5.athrow'], resourceProbes),
  entry('resource-close', 'caseResourceClose', 'A+,B+,body,B-,A-;primary=B;suppressed=A', ['2.10', '6.5.athrow'], resourceProbes),
  entry('resource-acquire', 'caseResourceAcquire', 'A+,B+!,A-;primary=B;suppressed=A;body=absent', ['2.10', '6.5.athrow'],
    [...resourceProbes, probe('open', '(Ljava/lang/String;' + marker + marker + ')Lclasses/modern_test/JavaCoreExceptions$Resource;', ['athrow'])])
];

export default {id: 'exceptions', source: 'classes/modern_fixture/JavaCoreExceptions.java', mainClass,
  completionMarker: 'CORE_EXCEPTIONS_OK', cases};
