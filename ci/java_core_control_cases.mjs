// Genuine source-only probes. The shared runner materializes generated helpers
// in its private compilation directory; importing this module has no I/O.
const mainClass = 'classes.modern_test.JavaCoreControl';
const generatedClass = 'classes.modern_test.CoreControlWideHelpers';
const object = 'Ljava/lang/Object;', box = 'Lclasses/modern_test/JavaCoreControl$Box;';
const probe = (method, descriptor, requiredOpcodes, extra = {}) => ({method, descriptor, requiredOpcodes, ...extra});
const generated = (method, descriptor, requiredOpcodes, extra = {}) =>
  probe(method, descriptor, requiredOpcodes, {className: generatedClass, ...extra});
const entry = (id, entryMethod, trace, JLS, JVMS, probes) => ({id: 'control-' + id,
  entryMethod, entryDescriptor: '()V', trace: [trace], anchors: {JLS, JVMS}, probes});
const intBranches = ['ifeq', 'ifne', 'iflt', 'ifle', 'ifgt', 'ifge'];

const cases = [
  entry('if-zero', 'caseIfZero', '14,14,41,50,50', ['15.20.1', '15.21.1'], ['6.5.if_cond'],
    [probe('zeroMask', '(I)I', intBranches)]),
  entry('if-int', 'caseIfInt', '14,50,41,14,50', ['15.20.1', '15.21.1'], ['6.5.if_icmp_cond'],
    [probe('intMask', '(II)I', ['if_icmpeq', 'if_icmpne', 'if_icmplt', 'if_icmple', 'if_icmpgt', 'if_icmpge'])]),
  entry('if-reference', 'caseIfReference', '1,2,1,2', ['15.21.3'], ['6.5.if_acmp_cond'],
    [probe('refMask', '(' + object + object + ')I', ['if_acmpeq', 'if_acmpne'])]),
  entry('if-null', 'caseIfNull', '1,2', ['15.21.3'], ['6.5.ifnull', '6.5.ifnonnull'],
    [probe('nullMask', '(' + object + ')I', ['ifnull', 'ifnonnull'])]),
  entry('long-compare', 'caseLongCompare', '14,50,50,50,41', ['15.20.1', '15.21.1'], ['6.5.lcmp'],
    [probe('longMask', '(JJ)I', ['lcmp'])]),
  entry('float-compare', 'caseFloatCompare', '14,2,2,41,41', ['15.20.1', '15.21.1'], ['6.5.fcmp_op'],
    [probe('floatMask', '(FF)I', ['fcmpl', 'fcmpg'])]),
  entry('double-compare', 'caseDoubleCompare', '14,2,2,41,41', ['15.20.1', '15.21.1'], ['6.5.dcmp_op'],
    [probe('doubleMask', '(DD)I', ['dcmpl', 'dcmpg'])]),
  entry('dense-switch', 'caseDenseSwitch', '99,12,13,14,15,99', [], ['6.5.tableswitch'],
    [probe('dense', '(I)I', ['tableswitch'])]),
  entry('sparse-switch', 'caseSparseSwitch', '21,99,22,23,99,24,25', [], ['6.5.lookupswitch'],
    [probe('sparse', '(I)I', ['lookupswitch'])]),
  entry('short-circuit', 'caseShortCircuit', 'and=F/1,F/12,T/12;or=T/1,T/12,F/12',
    ['15.23', '15.24'], ['6.5.if_cond'], [probe('shortAnd', '(ZZ)Z', ['ifeq', 'invokestatic']),
      probe('shortOr', '(ZZ)Z', ['ifne', 'invokestatic'])]),
  entry('conditional', 'caseConditional', '11/1,22/2', ['15.25', '15.25.2'], ['6.5.if_cond', '6.5.goto'],
    [probe('conditional', '(Z)I', ['ifeq', 'goto'])]),
  entry('argument-order', 'caseArgumentOrder', 'order=1234;value=15;reference=same',
    ['15.7.4', '15.12.4.2'], ['2.6.1', '2.6.2'], [probe('argumentOrder', '()J', ['invokestatic', 'lreturn']),
      probe('mix', '(IJD' + object + ')J', ['lload_1', 'dload_3', 'lreturn'])]),
  entry('returns', 'caseReturns', 'I=-17;J=9007199254740993;F=3.5;D=-7.25;A=same/null;V=done', [],
    ['2.6.4', '6.5.ireturn', '6.5.lreturn', '6.5.freturn', '6.5.dreturn', '6.5.areturn', '6.5.return'],
    [probe('retI', '(I)I', ['ireturn']), probe('retJ', '(J)J', ['lreturn']), probe('retF', '(F)F', ['freturn']),
      probe('retD', '(D)D', ['dreturn']), probe('retA', '(' + object + ')' + object, ['areturn']), probe('retV', '()V', ['return'])]),
  entry('mixed-slots', 'caseMixedSlots', 'static=9007199254741002;instance=9007199254741002;caller=unchanged', [],
    ['2.6.1', '2.6.2', '2.6.4'], [probe('mixed', '(IJD' + object + 'I)J', ['lload_1', 'dload_3', 'lreturn']),
      probe('mixed', '(IJD' + object + 'I)J', ['lload_2', 'dload', 'lreturn'], {className: mainClass + '$Box'})]),
  entry('recursion', 'caseRecursion', '46,10;locals=preserved', [], ['2.6', '2.6.1', '2.6.4'],
    [probe('recurse', '(IJD)J', ['lstore', 'dstore', 'invokestatic', 'lreturn'])]),
  entry('fresh-locals', 'caseFreshLocals', 'outer=A;inner=B;repeat=A', [], ['2.6', '2.6.1'],
    [probe('outerLocal0', '()' + object, ['astore_0', 'aload_0', 'invokestatic', 'areturn']),
      probe('innerLocal0', '()V', ['astore_0', 'aload_0', 'return'])]),
  entry('wide-int', 'caseWideInt', '560,-42,33929;558,-44,33409', [], ['6.5.wide', '6.5.iinc'],
    [generated('wideInt', '(II)I', ['wide'], {wide: [
      {opcode: 'iinc', minIndex: 256, increment: 300}, {opcode: 'iinc', minIndex: 256, increment: -301},
      {opcode: 'iload', minIndex: 256}, {opcode: 'istore', minIndex: 256}]})]),
  entry('wide-reference', 'caseWideReference', 'same,null', [], ['6.5.wide', '6.5.aload', '6.5.astore'],
    [generated('wideReference', '(' + object + 'I)' + object, ['wide'],
      {wide: [{opcode: 'aload', minIndex: 256}, {opcode: 'astore', minIndex: 256}]})]),
  entry('wide-float', 'caseWideFloat', '3.5,-7.25', [], ['6.5.wide', '6.5.fload', '6.5.fstore'],
    [generated('wideFloat', '(FI)F', ['wide'],
      {wide: [{opcode: 'fload', minIndex: 256}, {opcode: 'fstore', minIndex: 256}]})]),
  entry('wide-category2', 'caseWideCategory2', '9007199254740993,1.25', [],
    ['6.5.wide', '2.6.1', '6.5.lload', '6.5.lstore', '6.5.dload', '6.5.dstore'],
    [generated('wideLong', '(JI)J', ['wide'], {wide: [{opcode: 'lload', minIndex: 256}, {opcode: 'lstore', minIndex: 256}]}),
      generated('wideDouble', '(DI)D', ['wide'], {wide: [{opcode: 'dload', minIndex: 256}, {opcode: 'dstore', minIndex: 256}]})]),
  entry('wide-constant', 'caseWideConstant', 'constant000,constant127,constant299,default', [], ['6.5.ldc_w'],
    [generated('constant', '(I)Ljava/lang/String;', ['ldc_w'],
      {constantLoads: [{opcode: 'ldc_w', minCpIndex: 256, value: 'constant299'}]})]),
  entry('wide-forward', 'caseWideForward', '7,12007', [], ['6.5.goto_w'],
    [generated('forward', '(Z)I', ['goto_w'], {branches: [{opcode: 'goto_w', minDistance: 32768, direction: 'forward'}]})]),
  entry('wide-backward', 'caseWideBackward', '7,12007,24007', [], ['6.5.goto_w'],
    [generated('backward', '(I)I', ['goto_w'], {branches: [{opcode: 'goto_w', minDistance: 32768, direction: 'backward'}]})]),
  entry('compound-category1', 'caseCompoundCategory1', 'field=3/4;array=5/6;reference=same',
    ['15.14.2', '15.26.1'], ['6.5.dup', '6.5.dup_x1', '6.5.dup_x2', '6.5.dup2'],
    [probe('fieldPost', '(' + box + ')I', ['dup', 'dup_x1']), probe('arrayPost', '([II)I', ['dup2', 'dup_x2']),
      probe('assignReference', '(' + box + object + ')' + object, ['dup_x1'])]),
  entry('compound-category2', 'caseCompoundCategory2', 'field=7/8;array=9/10;double=1.5/2.5',
    ['15.14.2'], ['6.5.dup2_x1', '6.5.dup2_x2', '2.6.2'],
    [probe('fieldPostLong', '(' + box + ')J', ['dup2_x1']), probe('arrayPostLong', '([JI)J', ['dup2_x2']),
      probe('fieldPostDouble', '(' + box + ')D', ['dup2_x1'])]),
  entry('discard', 'caseDiscard', 'order=IJDA;next-call=normal', ['15.1'], ['6.5.pop', '6.5.pop2'],
    [probe('discard', '(IJD' + object + ')V', ['pop', 'pop2', 'return'])])
];

function generatedSources() {
  const locals = Array.from({length: 260}, (_, index) => '    int v' + index + ' = seed + ' + index + ';').join('\n');
  const sum = Array.from({length: 260}, (_, index) => 'v' + index).join(' + ');
  const copy = (type, method) => '  public static ' + type + ' ' + method + '(' + type + ' value, int seed) {\n' +
    locals + '\n    ' + type + ' saved = value;\n    check(' + sum + ', seed * 260 + 33670);\n    return saved;\n  }\n';
  const increments = Array.from({length: 12000}, () => '      x++;').join('\n');
  const constants = Array.from({length: 300}, (_, index) => '      case ' + index + ': return "constant' +
    String(index).padStart(3, '0') + '";').join('\n');
  const text = 'package classes.modern_test;\npublic final class CoreControlWideHelpers {\n' +
    '  private static void check(int actual, int expected) { if (actual != expected) throw new AssertionError("wide checksum"); }\n' +
    '  public static int wideInt(int seed, int selector) {\n' + locals +
    '\n    v259 += 300;\n    v258 -= 301;\n    int sum = ' + sum + ';\n' +
    '    if (selector == 0) return v259;\n    if (selector == 1) return v258;\n    return sum;\n  }\n' +
    copy('Object', 'wideReference') + copy('float', 'wideFloat') + copy('long', 'wideLong') + copy('double', 'wideDouble') +
    '  public static String constant(int index) {\n    switch (index) {\n' + constants +
    '\n      default: return "default";\n    }\n  }\n' +
    '  public static int forward(boolean take) {\n    int x = 7;\n    if (take) {\n' + increments +
    '\n    }\n    return x;\n  }\n' +
    '  public static int backward(int iterations) {\n    int x = 7;\n    while (iterations-- > 0) {\n' + increments +
    '\n    }\n    return x;\n  }\n}\n';
  return [{binaryName: generatedClass, text}];
}

export default {id: 'control', source: 'classes/modern_fixture/JavaCoreControl.java', mainClass,
  completionMarker: 'CORE_CONTROL_OK', cases, generatedSources};
