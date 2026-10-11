'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');

// These are pure registry contract tests with deliberately fake metadata
// identities. They are neither genuine javac fixtures nor native/host evidence.
// Always compile the source in memory; do not use or rebuild shared artifacts.
const filename = path.resolve(__dirname, '../src/LoadingConstraints.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'},
  reportDiagnostics: true
});
assert.deepEqual(compiled.diagnostics, []);
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.require = name => assert.fail(`Pure loading-constraint registry imported ${name}`);
loaded._compile(compiled.outputText, filename);
const {LoadingConstraints, getLoadingConstraints} = loaded.exports;

const forbidden = name => () => assert.fail(`Loading constraints called ${name}`);
function loader() {
  // Equal labels and Java-level loader representations are not namespace keys.
  // Even obtaining a Java loader mirror is unnecessary for this pure registry.
  return Object.freeze({
    name: 'identical loader label',
    getLoaderObject: forbidden('getLoaderObject'),
    getLoadedClass: forbidden('getLoadedClass'),
    loadClass: forbidden('loadClass'),
    resolveClass: forbidden('resolveClass'),
    initializeClass: forbidden('initializeClass')
  });
}
function cls(name, definingLoader) {
  return Object.freeze({
    getInternalName: () => name,
    getLoader: () => definingLoader,
    getComponentClass: forbidden('getComponentClass'),
    getSuperClass: forbidden('getSuperClass'),
    getInterfaces: forbidden('getInterfaces'),
    getClassObject: forbidden('getClassObject'),
    resolve: forbidden('resolve'),
    tryToResolve: forbidden('tryToResolve'),
    resolveHierarchy: forbidden('resolveHierarchy'),
    tryToResolveHierarchy: forbidden('tryToResolveHierarchy'),
    initialize: forbidden('initialize'),
    tryToInitialize: forbidden('tryToInitialize'),
    verification: Object.freeze({verify: forbidden('verify'), tryToVerify: forbidden('tryToVerify')})
  });
}
function ok(result) {
  assert.equal(result, null);
}
function violation(result, name, expected, actual) {
  assert.notEqual(result, null, 'the conflicting identities must produce a violation');
  assert.equal(result.name, name, 'violation names use the normalized reference leaf');
  assert.equal(result.expected, expected, 'expected must retain the exact existing class identity');
  assert.equal(result.actual, actual, 'actual must retain the exact conflicting class identity');
}

test('production registry is shared by actual bootstrap identity, not the Java null loader mirror', () => {
  const bootstrap = {...loader()};
  bootstrap.bootstrap = bootstrap;
  const a = {...loader(), bootstrap}, b = {...loader(), bootstrap};
  assert.equal(getLoadingConstraints(a), getLoadingConstraints(b));
  assert.equal(getLoadingConstraints(a), getLoadingConstraints(bootstrap));
  const otherBootstrap = {...loader()};
  otherBootstrap.bootstrap = otherBootstrap;
  assert.notEqual(getLoadingConstraints(bootstrap), getLoadingConstraints(otherBootstrap));
});

test('per-VM registry retains records across different initiating loader callers', () => {
  const bootstrap = {...loader()};
  bootstrap.bootstrap = bootstrap;
  const a = {...loader(), bootstrap}, b = {...loader(), bootstrap};
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(getLoadingConstraints(a).record(a, first));
  ok(getLoadingConstraints(b).record(b, second));
  violation(getLoadingConstraints(bootstrap).impose('Lp/Token;', a, b), 'Lp/Token;', first, second);
});

test('reference records made before a constraint detect conflicts in left/right order', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(registry.record(a, first));
  ok(registry.record(b, second));
  violation(registry.impose('Lp/Token;', a, b), 'Lp/Token;', first, second);
  violation(registry.impose('Lp/Token;', b, a), 'Lp/Token;', second, first);
});

test('a constraint made before either record checks whichever side records second', () => {
  for (const reverse of [false, true]) {
    const registry = new LoadingConstraints(), a = loader(), b = loader();
    const [firstLoader, secondLoader] = reverse ? [b, a] : [a, b];
    const first = cls('Lp/Token;', firstLoader), second = cls('Lp/Token;', secondLoader);
    ok(registry.impose('Lp/Token;', a, b));
    ok(registry.record(firstLoader, first));
    violation(registry.record(secondLoader, second), 'Lp/Token;', first, second);
    ok(registry.record(secondLoader, first));
  }
});

test('a constraint added between the first and second record preserves the first identity', () => {
  for (const reverse of [false, true]) {
    const registry = new LoadingConstraints(), a = loader(), b = loader();
    const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
    ok(registry.record(a, first));
    ok(registry.impose('Lp/Token;', reverse ? b : a, reverse ? a : b));
    violation(registry.record(b, second), 'Lp/Token;', first, second);
    ok(registry.record(b, first));
  }
});

test('three-loader constraints are transitive before any identity is recorded', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader(), c = loader();
  const first = cls('Lp/Token;', c), second = cls('Lp/Token;', a);
  ok(registry.impose('Lp/Token;', a, b));
  ok(registry.impose('Lp/Token;', b, c));
  ok(registry.record(c, first));
  violation(registry.record(a, second), 'Lp/Token;', first, second);
  violation(registry.record(b, second), 'Lp/Token;', first, second);
  ok(registry.record(a, first));
  ok(registry.record(b, first));
});

test('merging transitive groups checks identities already recorded at remote endpoints', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader(), c = loader();
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', c);
  ok(registry.record(a, first));
  ok(registry.record(c, second));
  ok(registry.impose('Lp/Token;', a, b));
  violation(registry.impose('Lp/Token;', b, c), 'Lp/Token;', first, second);
  violation(registry.impose('Lp/Token;', c, b), 'Lp/Token;', second, first);
});

test('equal loader labels do not collapse distinct initiating namespaces', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  assert.notEqual(a, b);
  assert.equal(a.name, b.name);
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(registry.record(a, first));
  ok(registry.record(b, second));
  violation(registry.impose('Lp/Token;', a, b), 'Lp/Token;', first, second);
});

test('class identity is not reconstructed from descriptor and defining-loader metadata', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader(), defining = loader();
  const first = cls('Lp/Token;', defining), second = cls('Lp/Token;', defining);
  assert.notEqual(first, second);
  assert.equal(first.getInternalName(), second.getInternalName());
  assert.equal(first.getLoader(), second.getLoader());
  ok(registry.record(a, first));
  ok(registry.record(b, second));
  violation(registry.impose('Lp/Token;', a, b), 'Lp/Token;', first, second);
});

test('separate initiating loaders may record the same delegated class identity', () => {
  for (const constrainFirst of [false, true]) {
    const registry = new LoadingConstraints(), a = loader(), b = loader(), defining = loader();
    const shared = cls('Lp/Token;', defining);
    if (constrainFirst) ok(registry.impose('Lp/Token;', a, b));
    ok(registry.record(a, shared));
    ok(registry.record(b, shared));
    if (!constrainFirst) ok(registry.impose('Lp/Token;', a, b));
    ok(registry.impose('Lp/Token;', b, a));
    ok(registry.record(a, shared));
    ok(registry.record(b, shared));
  }
});

test('same-loader constraints and repeated records are idempotent', () => {
  const registry = new LoadingConstraints(), a = loader();
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', a);
  ok(registry.impose('Lp/Token;', a, a));
  ok(registry.impose('[[Lp/Token;', a, a));
  ok(registry.record(a, first));
  ok(registry.record(a, first));
  ok(registry.impose('Lp/Token;', a, a));
  violation(registry.record(a, second), 'Lp/Token;', first, second);
  ok(registry.record(a, first));
});

test('constraints are scoped by reference name, not just by loader pairs', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  const first = cls('Lp/Other;', a), second = cls('Lp/Other;', b);
  ok(registry.impose('Lp/Token;', a, b));
  ok(registry.record(a, first));
  ok(registry.record(b, second));
  violation(registry.impose('Lp/Other;', a, b), 'Lp/Other;', first, second);
  const shared = cls('Lp/Token;', a);
  ok(registry.record(a, shared));
  ok(registry.record(b, shared));
});

test('independent registries do not share records or equivalence groups', () => {
  const firstRegistry = new LoadingConstraints(), secondRegistry = new LoadingConstraints();
  const a = loader(), b = loader(), first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(firstRegistry.impose('Lp/Token;', a, b));
  ok(firstRegistry.record(a, first));
  ok(secondRegistry.record(a, second));
  ok(secondRegistry.record(b, second));
  ok(secondRegistry.impose('Lp/Token;', a, b));
  violation(firstRegistry.record(b, second), 'Lp/Token;', first, second);
});

test('a failed edge does not merge groups and both groups can still extend and retry', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader(), c = loader();
  const d = loader(), e = loader(), first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(registry.record(a, first));
  ok(registry.record(b, second));
  ok(registry.impose('Lp/Token;', a, c));
  violation(registry.impose('Lp/Token;', c, b), 'Lp/Token;', first, second);

  // Reusing the rejected endpoints must preserve two independent namespaces.
  ok(registry.impose('Lp/Token;', c, d));
  ok(registry.record(d, first));
  ok(registry.impose('Lp/Token;', b, e));
  ok(registry.record(e, second));
  ok(registry.record(c, first));
  violation(registry.impose('Lp/Token;', c, b), 'Lp/Token;', first, second);
  violation(registry.impose('Lp/Token;', e, d), 'Lp/Token;', second, first);
});

test('a failed record does not occupy an initiating slot or poison its equivalence group', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader(), c = loader();
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(registry.impose('Lp/Token;', a, b));
  ok(registry.record(a, first));
  violation(registry.record(b, second), 'Lp/Token;', first, second);
  ok(registry.impose('Lp/Token;', b, c));
  ok(registry.record(c, first));
  ok(registry.record(b, first));
  violation(registry.record(c, second), 'Lp/Token;', first, second);
});

test('a failed replacement record does not overwrite a previously accepted identity', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', a);
  ok(registry.record(a, first));
  violation(registry.record(a, second), 'Lp/Token;', first, second);
  ok(registry.impose('Lp/Token;', a, b));
  violation(registry.record(b, second), 'Lp/Token;', first, second);
  ok(registry.record(a, first));
  ok(registry.record(b, first));
});

test('reference array names normalize every rank to the same reference leaf', () => {
  for (const rank of [1, 2, 7, 255]) {
    const registry = new LoadingConstraints(), a = loader(), b = loader();
    const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
    ok(registry.impose('['.repeat(rank) + 'Lp/Token;', a, b));
    ok(registry.record(a, first));
    violation(registry.record(b, second), 'Lp/Token;', first, second);
    ok(registry.impose('Lp/Token;', b, a));
  }
});

test('primitive and void names and primitive arrays impose no identity constraints', () => {
  for (const name of [...'BCDFIJSZV', ...[1, 2, 255].flatMap(rank =>
    [...'BCDFIJSZ'].map(primitive => '['.repeat(rank) + primitive))]) {
    const registry = new LoadingConstraints(), a = loader(), b = loader();
    ok(registry.impose(name, a, b));
    ok(registry.record(a, cls(name, a)));
    ok(registry.record(a, cls(name, a)));
    ok(registry.record(b, cls(name, b)));
    ok(registry.impose(name, b, a));
  }
});

test('array records are ignored without traversing or substituting array mirrors for leaves', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
  ok(registry.impose('Lp/Token;', a, b));
  for (const name of ['[Lp/Token;', '[[Lp/Token;', '[[I']) {
    ok(registry.record(a, cls(name, a)));
    ok(registry.record(a, cls(name, a)));
    ok(registry.record(b, cls(name, b)));
  }
  ok(registry.record(a, first));
  violation(registry.record(b, second), 'Lp/Token;', first, second);
  ok(registry.record(b, first));
});

test('field descriptors impose reference-leaf constraints and ignore primitive leaves', () => {
  for (const descriptor of ['Lp/Token;', '[Lp/Token;', '[[Lp/Token;']) {
    const registry = new LoadingConstraints(), a = loader(), b = loader();
    const first = cls('Lp/Token;', a), second = cls('Lp/Token;', b);
    ok(registry.imposeDescriptor(descriptor, a, b));
    ok(registry.record(a, first));
    violation(registry.record(b, second), 'Lp/Token;', first, second);
  }
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  for (const descriptor of ['I', 'J', 'D', '[I', '[[J']) {
    ok(registry.imposeDescriptor(descriptor, a, b));
  }
  ok(registry.record(a, cls('Lp/Token;', a)));
  ok(registry.record(b, cls('Lp/Token;', b)));
});

test('method descriptors cover all argument and return leaves, including repeated arrays', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  ok(registry.imposeDescriptor('([[Larg/First;Larg/Second;[Larg/First;[[IJDZ)[[[Lresult/Return;', a, b));
  for (const name of ['Larg/First;', 'Larg/Second;', 'Lresult/Return;']) {
    const first = cls(name, a), second = cls(name, b);
    ok(registry.record(a, first));
    violation(registry.record(b, second), name, first, second);
    ok(registry.record(b, first));
  }
});

test('return-only references and repeated argument/return leaves are not skipped', () => {
  for (const descriptor of ['()Lp/Token;', '(Lp/Token;[Lp/Token;[[Lp/Token;)Lp/Token;']) {
    const registry = new LoadingConstraints(), a = loader(), b = loader(), defining = loader();
    const shared = cls('Lp/Token;', defining);
    ok(registry.record(a, shared));
    ok(registry.record(b, shared));
    ok(registry.imposeDescriptor(descriptor, a, b));
    ok(registry.imposeDescriptor(descriptor, b, a));
    const c = loader(), other = cls('Lp/Token;', c);
    ok(registry.record(c, other));
    violation(registry.imposeDescriptor(descriptor, b, c), 'Lp/Token;', shared, other);
  }
});

test('earlier descriptor constraints survive a later leaf conflict without merging the bad edge', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  const conflictA = cls('Lp/Conflict;', a), conflictB = cls('Lp/Conflict;', b);
  ok(registry.record(a, conflictA));
  ok(registry.record(b, conflictB));
  violation(registry.imposeDescriptor('(Lp/First;[[Lp/Conflict;)Lp/Return;', a, b),
    'Lp/Conflict;', conflictA, conflictB);

  const firstA = cls('Lp/First;', a), firstB = cls('Lp/First;', b);
  ok(registry.record(a, firstA));
  violation(registry.record(b, firstB), 'Lp/First;', firstA, firstB);
  ok(registry.record(b, firstA));
  ok(registry.record(a, conflictA));
  ok(registry.record(b, conflictB));
  violation(registry.impose('Lp/Conflict;', b, a), 'Lp/Conflict;', conflictB, conflictA);
});

test('constraints do not load missing descriptor classes or verify or initialize recorded metadata', () => {
  const registry = new LoadingConstraints(), a = loader(), b = loader();
  ok(registry.imposeDescriptor('(Lmissing/Argument;[[Lmissing/Argument;[I)Lmissing/Return;', a, b));
  ok(registry.imposeDescriptor('(BCDFIJSZ[I[[J)V', a, b));
  ok(registry.imposeDescriptor('()V', a, b));
  for (const name of ['Lmissing/Argument;', 'Lmissing/Return;']) {
    const shared = cls(name, a);
    ok(registry.record(a, shared));
    ok(registry.record(b, shared));
  }
});
