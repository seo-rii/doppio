// Independent behavioral oracles for unchanged genuine final javac21/25 output.
// Instruction/bootstrap obligations describe the selected locked javac lowering,
// not a claim that JLS mandates that lowering or every source-index unit is closed.
const mainClass = 'classes.modern_test.JavaFinalPatterns';
const name = short => `${mainClass}$${short}`;
const object = 'Ljava/lang/Object;', string = 'Ljava/lang/String;', throwable = 'Ljava/lang/Throwable;';
const box = `L${name('Box').replaceAll('.', '/')};`;
const numberBox = `L${name('NumberBox').replaceAll('.', '/')};`;
const explosive = `L${name('Explosive').replaceAll('.', '/')};`;
const bootstrapDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;';
const member = (owner, name, descriptor, opcode = 'invokevirtual', tag = 10) => ({opcode, tag, owner, name, descriptor});
const local = (name, descriptor) => member(mainClass, name, descriptor, 'invokestatic');
const classOperand = (opcode, value) => ({opcode, tag: 7, value});
const probe = (method, descriptor, requiredOpcodes, symbolicOperands = [], extra = {}) => ({method, descriptor, requiredOpcodes,
  ...(symbolicOperands.length ? {symbolicOperands} : {}), ...extra});
const switchProbe = (method, descriptor, labels, operands = [], opcodes = ['invokedynamic']) => probe(method, descriptor, opcodes,
  operands, {bootstrapSites: [{siteName: 'typeSwitch', siteDescriptor: `(${object}I)I`, bootstrap: {
    kind: 6, tag: 10, owner: 'java.lang.runtime.SwitchBootstraps', name: 'typeSwitch', descriptor: bootstrapDescriptor,
  }, arguments: labels.map(value => ({tag: 7, value}))}]});
const bounded = 'Selected genuine final Java21/25 pattern semantics only; not complete language, source-unit, JVM-008, C bootstrap, or compiler conformance. No preview or heap-pollution contract.';
const makeCase = (id, entryMethod, trace, JLS, probes, JVMS = ['4.7.3', '6.5.invokevirtual']) => ({
  id: `fp-${id}`, entryMethod, entryDescriptor: '()V', trace: [trace], anchors: {JLS, JVMS},
  probes: [probe(entryMethod, '()V', ['invokestatic', 'return']), ...probes], oracleKind: 'specification',
  limitations: [bounded, 'Decoded CP/Code/bootstrap obligations are pinned external-javac evidence; no dynamic branch/JIT or whole-source-unit proof.'],
});
const switchJVMS = ['4.4.10', '4.7.3', '4.7.23', '5.4.3.6', '6.5.invokedynamic'];
const selectorProbe = probe('selector', `(${object})${object}`, ['invokestatic', 'areturn']);
const nullGuardProbe = probe('nullGuard', `(${string})Ljava/lang/Boolean;`, ['aconst_null', 'areturn']);
const unbox = member('java.lang.Boolean', 'booleanValue', '()Z');
const boxGetter = probe('value', `()${object}`, ['getfield', 'areturn'],
  [member(name('Box'), 'value', object, 'getfield', 9)], {className: name('Box')});
const explosiveGetter = probe('value', '()I', ['getstatic', 'athrow'],
  [member(mainClass, 'ACCESSOR_ERROR', 'Ljava/lang/Error;', 'getstatic', 9)], {className: name('Explosive')});
const cause = probe('causeIs', `(${throwable}${throwable})Z`, ['invokevirtual', 'ireturn'],
  [member('java.lang.Throwable', 'getCause', `()${throwable}`)]);
const wrap = [classOperand('new', 'java.lang.MatchException'),
  member('java.lang.MatchException', '<init>', `(${string}${throwable})V`, 'invokespecial')];
const stringLength = member('java.lang.String', 'length', '()I');

export default {
  id: 'final-patterns', source: 'classes/modern_fixture/JavaFinalPatterns.java', mainClass,
  completionMarker: 'FINAL_PATTERNS_OK', driverClassNames: [mainClass, ...['Box', 'NumberBox', 'Explosive', 'Envelope'].map(name)],
  releases: [21, 25],
  cases: [
    makeCase('selector-statement-throw', 'caseSelectorStatementThrow', 'selector,catch;same;guards=0;bodies=0',
      ['14.11.3', '15.6'], [switchProbe('selectorStatement', '()V', ['java.lang.String'], [local('selectorRuntime', `()${object}`)]),
        probe('selectorRuntime', `()${object}`, ['getstatic', 'athrow'],
          [member(mainClass, 'SELECTOR_RUNTIME', 'Ljava/lang/RuntimeException;', 'getstatic', 9)])], switchJVMS),
    makeCase('selector-expression-throw', 'caseSelectorExpressionThrow', 'selector,catch;same;guards=0;bodies=0',
      ['15.28.2', '15.6'], [switchProbe('selectorExpression', '()I', ['java.lang.String'], [local('selectorError', `()${object}`)]),
        probe('selectorError', `()${object}`, ['getstatic', 'athrow'],
          [member(mainClass, 'SELECTOR_ERROR', 'Ljava/lang/Error;', 'getstatic', 9)])], switchJVMS),
    makeCase('guard-statement-runtime', 'caseGuardStatementRuntime', 'selector,guard,catch;same;fallback=0;body=0',
      ['14.11.1.2', '14.11.3'], [switchProbe('runtimeGuardStatement', `(${object})V`, ['java.lang.String', 'java.lang.String'],
        [local('runtimeGuard', `(${string})Z`)]), selectorProbe,
      probe('runtimeGuard', `(${string})Z`, ['getstatic', 'athrow'],
        [member(mainClass, 'GUARD_RUNTIME', 'Ljava/lang/RuntimeException;', 'getstatic', 9)])], switchJVMS),
    makeCase('guard-expression-error', 'caseGuardExpressionError', 'selector,guard,catch;same;fallback=0;body=0',
      ['14.11.1.2', '15.28.2'], [switchProbe('errorGuardExpression', `(${object})I`, ['java.lang.String', 'java.lang.String'],
        [local('errorGuard', `(${string})Z`)]), selectorProbe,
      probe('errorGuard', `(${string})Z`, ['getstatic', 'athrow'],
        [member(mainClass, 'GUARD_ERROR', 'Ljava/lang/Error;', 'getstatic', 9)])], switchJVMS),
    makeCase('guard-statement-null-unbox', 'caseGuardStatementNullUnbox', 'selector,guard,catch;NullPointerException;fallback=0;body=0',
      ['5.1.8', '14.11.1.2', '14.11.3'], [switchProbe('nullGuardStatement', `(${object})V`, ['java.lang.String', 'java.lang.String'],
        [local('nullGuard', `(${string})Ljava/lang/Boolean;`), unbox]), selectorProbe, nullGuardProbe], switchJVMS),
    makeCase('guard-expression-null-unbox', 'caseGuardExpressionNullUnbox', 'selector,guard,catch;NullPointerException;fallback=0;body=0',
      ['5.1.8', '14.11.1.2', '15.28.2'], [switchProbe('nullGuardExpression', `(${object})I`, ['java.lang.String', 'java.lang.String'],
        [local('nullGuard', `(${string})Ljava/lang/Boolean;`), unbox]), selectorProbe, nullGuardProbe], switchJVMS),
    makeCase('boxed-false-restart', 'caseBoxedFalseRestart', 'selector,guard1,guard2,body2;bound=same;selectors=1',
      ['5.1.8', '14.11.1.2', '15.28.2'], [switchProbe('boxedRestart', `(${object}${string})I`,
        ['java.lang.String', 'java.lang.String', 'java.lang.String'],
        [local('boxedGuard', `(${string}${string}IZ)Ljava/lang/Boolean;`), unbox], ['invokedynamic', 'goto']), selectorProbe,
      probe('boxedGuard', `(${string}${string}IZ)Ljava/lang/Boolean;`, ['invokestatic', 'areturn'],
        [member('java.lang.Boolean', 'valueOf', '(Z)Ljava/lang/Boolean;', 'invokestatic')])], switchJVMS),
    makeCase('type-mismatch-skips-guard', 'caseTypeMismatchSkipsGuard', 'selector,default;guards=0',
      ['14.11.1.2', '15.28.2'], [switchProbe('mismatchingGuard', `(${object})I`, ['java.lang.String'],
        [local('acceptingGuard', `(${string})Z`)]), selectorProbe,
      probe('acceptingGuard', `(${string})Z`, ['invokevirtual', 'ireturn'], [stringLength])], switchJVMS),
    makeCase('instanceof-accessor-error', 'caseInstanceofAccessorError', 'accessor,catch;MatchException;cause=same;body=0',
      ['14.30.2', '15.20.2'], [probe('instanceofExplosive', `(${object})I`, ['instanceof', 'invokevirtual', 'athrow'],
        [classOperand('instanceof', name('Explosive')), member(name('Explosive'), 'value', '()I'), ...wrap]), explosiveGetter, cause],
      ['4.7.3', '2.10', '6.5.instanceof', '6.5.invokevirtual', '6.5.athrow']),
    makeCase('switch-accessor-error', 'caseSwitchAccessorError', 'accessor,catch;MatchException;cause=same;body=0',
      ['14.30.2', '14.11.1.2', '15.28.2'], [switchProbe('switchExplosive', `(${object})I`, [name('Explosive')],
        [member(name('Explosive'), 'value', '()I'), ...wrap], ['invokedynamic', 'invokevirtual', 'athrow']), explosiveGetter, cause], switchJVMS),
    makeCase('nested-accessor-error', 'caseNestedAccessorError', 'outer,accessor,catch;MatchException;cause=same;body=0',
      ['14.30.2', '14.11.1.2', '15.28.2'], [switchProbe('nestedExplosive', `(${object})I`, [name('Envelope')],
        [member(name('Envelope'), 'value', `()${explosive}`), member(name('Explosive'), 'value', '()I'), ...wrap],
        ['invokedynamic', 'invokevirtual', 'athrow']), explosiveGetter, cause,
      probe('value', `()${explosive}`, ['getfield', 'areturn'], [member(name('Envelope'), 'value', explosive, 'getfield', 9)],
        {className: name('Envelope')})], switchJVMS),
    makeCase('generic-explicit', 'caseGenericExplicit', 'value=6;binding=String;record=Box',
      ['14.30.1', '14.30.2', '15.20.2'], [probe('explicit', `(${box})I`, ['invokevirtual', 'ireturn'],
        [member(name('Box'), 'value', `()${object}`), stringLength]), boxGetter]),
    makeCase('generic-nested-inferred', 'caseGenericNestedInferred', 'value=6;binding=String;nested=Box',
      ['14.30.1', '14.30.2', '18.5.5', '15.20.2'], [probe('nestedInferred', `(${box})I`, ['checkcast', 'invokevirtual', 'ireturn'],
        [classOperand('checkcast', name('Box')), member(name('Box'), 'value', `()${object}`), stringLength]), boxGetter]),
    makeCase('erased-wildcard-mismatch', 'caseErasedWildcardMismatch', 'string=6;integer=miss;no-abrupt',
      ['14.30.1', '14.30.2', '18.5.5', '15.20.2'], [probe('wildcard', `(${box})I`, ['instanceof', 'invokevirtual', 'ireturn'],
        [classOperand('instanceof', 'java.lang.String'), member(name('Box'), 'value', `()${object}`), stringLength]), boxGetter]),
    makeCase('null-component-vs-null-record', 'caseNullComponentVsNullRecord', 'component-null=match;record-null=miss;narrow-null=miss',
      ['14.30.1', '14.30.2', '18.5.5', '15.20.2'], [probe('nullComponent', `(${box})Z`, ['invokevirtual', 'ireturn'],
        [member(name('Box'), 'value', `()${object}`)]), probe('narrowComponent', `(${box})Z`, ['instanceof', 'invokevirtual', 'ireturn'],
        [classOperand('instanceof', 'java.lang.String'), member(name('Box'), 'value', `()${object}`)]), boxGetter]),
    makeCase('bounded-component-mismatch', 'caseBoundedComponentMismatch', 'integer=miss;double=match;no-abrupt',
      ['14.30.1', '14.30.2', '18.5.5', '15.20.2'], [probe('bounded', `(${numberBox})Z`, ['instanceof', 'invokevirtual', 'ireturn'],
        [classOperand('instanceof', 'java.lang.Double'), member(name('NumberBox'), 'value', '()Ljava/lang/Number;'),
          member('java.lang.Double', 'doubleValue', '()D')]),
      probe('value', '()Ljava/lang/Number;', ['getfield', 'areturn'],
        [member(name('NumberBox'), 'value', 'Ljava/lang/Number;', 'getfield', 9)], {className: name('NumberBox')})]),
  ],
};
