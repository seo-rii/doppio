'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/VerificationRelations.ts');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS},
  reportDiagnostics: true
});
assert.deepEqual(compiled.diagnostics, []);
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.require = name => assert.fail(`Pure metadata checker attempted to import ${name}`);
loaded._compile(compiled.outputText, filename);
const {
  verifierAssignable, sameRuntimePackage, checkSpecialOwner, checkProtectedReceiver, requiresProtectedReceiver,
  checkDeclaredField, checkVerificationObligation
} = loaded.exports;

const member = (name, descriptor, flags = 0x0004) => Object.freeze({name, descriptor, flags});
function metadata(name, options = {}) {
  return Object.freeze({
    identity: options.identity || Object.freeze({}),
    definingLoader: options.definingLoader || Object.freeze({}),
    name,
    isInterface: options.isInterface || false,
    superclass: options.superclass || null,
    interfaces: Object.freeze((options.interfaces || []).slice()),
    fields: Object.freeze((options.fields || []).slice()),
    methods: Object.freeze((options.methods || []).slice())
  });
}
const ref = classInfo => Object.freeze({kind: 'class', classInfo});
const primitive = name => Object.freeze({kind: 'primitive', name});
const array = component => Object.freeze({kind: 'array', component});
const nullType = Object.freeze({kind: 'null'});
function world() {
  const bootstrapLoader = Object.freeze({}), app = Object.freeze({}), plugin = Object.freeze({});
  const object = metadata('Ljava/lang/Object;', {
    definingLoader: bootstrapLoader, methods: [member('clone', '()Ljava/lang/Object;'), member('finalize', '()V')]
  });
  const cloneable = metadata('Ljava/lang/Cloneable;', {definingLoader: bootstrapLoader, superclass: object, isInterface: true});
  const serializable = metadata('Ljava/io/Serializable;', {definingLoader: bootstrapLoader, superclass: object, isInterface: true});
  const rootInterface = metadata('Lapi/Root;', {definingLoader: app, superclass: object, isInterface: true});
  const directInterface = metadata('Lapi/Direct;', {
    definingLoader: app, superclass: object, isInterface: true, interfaces: [rootInterface]
  });
  const base = metadata('Lbase/Base;', {
    definingLoader: app, superclass: object,
    fields: [member('value', 'I'), member('publicValue', 'I', 1), member('privateValue', 'I', 2)],
    methods: [member('step', '()V'), member('visible', '()V', 1), member('<init>', '()V')]
  });
  const current = metadata('Lsub/Current;', {
    definingLoader: app, superclass: base, interfaces: [directInterface],
    fields: [member('own', 'I', 2), member('staticOwn', 'I', 8)], methods: [member('self', '()V')]
  });
  const child = metadata('Lsub/Child;', {definingLoader: app, superclass: current});
  const other = metadata('Lother/Other;', {definingLoader: app, superclass: object});
  return {bootstrapLoader, app, plugin, object, cloneable, serializable, rootInterface, directInterface, base, current, child, other};
}
function protectedInput(w, overrides = {}) {
  return {currentClass: w.current, bootstrapLoader: w.bootstrapLoader, owner: ref(w.base),
    receiver: ref(w.current), memberName: 'value', memberDescriptor: 'I', opcode: 0xb4, ...overrides};
}
function ok(result) { assert.deepEqual(result, {ok: true}); }
function bad(result, pattern) {
  assert.equal(result.ok, false);
  assert.equal(typeof result.reason, 'string');
  if (pattern) assert.match(result.reason, pattern);
}
function obligation(kind, sourceType, targetType, extra = {}) {
  return {kind, pc: 17, sourceType, targetType, ...extra};
}
function context(w, sourceType, targetType) {
  return {currentClass: w.current, bootstrapLoader: w.bootstrapLoader, source: sourceType, target: targetType};
}

test('module has only pure relation exports and no runtime imports', () => {
  assert.deepEqual(Object.keys(loaded.exports).sort(), [
    'checkDeclaredField', 'checkProtectedReceiver', 'checkSpecialOwner', 'checkVerificationObligation',
    'requiresProtectedReceiver', 'sameRuntimePackage', 'verifierAssignable'
  ]);
});

test('module typechecks against the actual type-engine obligation interface without a shared build', () => {
  const engine = fs.readFileSync(path.join(__dirname, '../src/BytecodeTypeVerifier.ts'), 'utf8');
  const declaration = engine.match(/export interface VerificationObligation \{[\s\S]*?\n\}/);
  assert.ok(declaration, 'Type engine must retain its public obligation interface');
  const stubname = path.resolve(__dirname, '../src/verification-obligation.unit.d.ts');
  const options = {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS,
    noEmit: true, noImplicitAny: true, types: [], skipLibCheck: true};
  const host = ts.createCompilerHost(options), originalSource = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => name === stubname ?
    ts.createSourceFile(name, declaration[0], options.target, true) : originalSource(name, ...args);
  host.resolveModuleNames = names => names.map(name => name === './BytecodeTypeVerifier' ?
    {resolvedFileName: stubname, extension: ts.Extension.Dts} : undefined);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
  assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
});

test('class assignability uses actual identity across separate initiating-loader views', () => {
  const w = world(), view = Object.freeze({...w.current});
  assert.notEqual(view, w.current);
  assert.equal(verifierAssignable(ref(view), ref(w.current), w.bootstrapLoader), true);
  assert.equal(verifierAssignable(ref(w.current), ref(view), w.bootstrapLoader), true);
});

test('class assignability follows direct and transitive superclass identities', () => {
  const w = world();
  for (const target of [w.current, w.base, w.object]) {
    assert.equal(verifierAssignable(ref(w.child), ref(target), w.bootstrapLoader), true);
  }
  assert.equal(verifierAssignable(ref(w.base), ref(w.current), w.bootstrapLoader), false);
  assert.equal(verifierAssignable(ref(w.other), ref(w.current), w.bootstrapLoader), false);
});

test('same descriptor is not identity, even if metadata reports a matching defining loader', () => {
  const w = world();
  for (const definingLoader of [w.plugin, w.app]) {
    const collision = metadata(w.current.name, {definingLoader, superclass: w.base});
    assert.equal(verifierAssignable(ref(collision), ref(w.current), w.bootstrapLoader), false);
    assert.equal(verifierAssignable(ref(w.current), ref(collision), w.bootstrapLoader), false);
  }
});

test('verifier deliberately allows unrelated classes and interfaces to an interface target', () => {
  const w = world();
  for (const sourceType of [w.object, w.other, w.directInterface]) {
    assert.equal(verifierAssignable(ref(sourceType), ref(w.rootInterface), w.bootstrapLoader), true);
  }
  assert.equal(verifierAssignable(ref(w.rootInterface), ref(w.object), w.bootstrapLoader), true);
  assert.equal(verifierAssignable(ref(w.rootInterface), ref(w.other), w.bootstrapLoader), false);
});

test('null is assignable to every reference kind, never a primitive', () => {
  const w = world();
  for (const target of [ref(w.current), ref(w.directInterface), array(primitive('I')), nullType]) {
    assert.equal(verifierAssignable(nullType, target, w.bootstrapLoader), true);
  }
  assert.equal(verifierAssignable(nullType, primitive('I'), w.bootstrapLoader), false);
  assert.equal(verifierAssignable(ref(w.object), nullType, w.bootstrapLoader), false);
});

test('arrays widen only to bootstrap Object, Cloneable and Serializable class metadata', () => {
  const w = world(), sourceType = array(primitive('I'));
  for (const target of [w.object, w.cloneable, w.serializable]) {
    assert.equal(verifierAssignable(sourceType, ref(target), w.bootstrapLoader), true);
    const collision = metadata(target.name, {definingLoader: w.plugin, isInterface: target.isInterface});
    assert.equal(verifierAssignable(sourceType, ref(collision), w.bootstrapLoader), false);
  }
  assert.equal(verifierAssignable(sourceType, ref(w.rootInterface), w.bootstrapLoader), false);
  assert.equal(verifierAssignable(ref(w.object), sourceType, w.bootstrapLoader), false);
});

test('reference arrays are covariant and preserve the loose interface component rule', () => {
  const w = world();
  assert.equal(verifierAssignable(array(ref(w.child)), array(ref(w.base)), w.bootstrapLoader), true);
  assert.equal(verifierAssignable(array(ref(w.base)), array(ref(w.child)), w.bootstrapLoader), false);
  assert.equal(verifierAssignable(array(ref(w.object)), array(ref(w.rootInterface)), w.bootstrapLoader), true);
  const collision = metadata(w.current.name, {definingLoader: w.plugin, superclass: w.object});
  assert.equal(verifierAssignable(array(ref(collision)), array(ref(w.current)), w.bootstrapLoader), false);
});

test('primitive array components retain all eight exact primitive identities', () => {
  const w = world();
  for (const sourceName of 'BCDFIJSZ') for (const targetName of 'BCDFIJSZ') {
    assert.equal(verifierAssignable(array(primitive(sourceName)), array(primitive(targetName)), w.bootstrapLoader),
      sourceName === targetName, `${sourceName}[] -> ${targetName}[]`);
  }
  assert.equal(verifierAssignable(primitive('I'), ref(w.object), w.bootstrapLoader), false);
});

test('nested arrays preserve primitive component rules and reference array supertypes', () => {
  const w = world(), ints = array(array(primitive('I')));
  for (const target of [array(ref(w.object)), array(ref(w.cloneable)), array(ref(w.serializable))]) {
    assert.equal(verifierAssignable(ints, target, w.bootstrapLoader), true);
  }
  assert.equal(verifierAssignable(ints, array(array(ref(w.object))), w.bootstrapLoader), false);
  assert.equal(verifierAssignable(array(primitive('I')), array(ref(w.object)), w.bootstrapLoader), false);
  assert.equal(verifierAssignable(ints, array(array(primitive('J'))), w.bootstrapLoader), false);
});

test('array metadata at 255 dimensions terminates and cyclic or overdeep input fails cleanly', () => {
  const w = world();
  let deepest = primitive('I');
  for (let i = 0; i < 255; i++) deepest = array(deepest);
  assert.equal(verifierAssignable(deepest, deepest, w.bootstrapLoader), true);
  assert.equal(verifierAssignable(array(deepest), ref(w.object), w.bootstrapLoader), false);
  const cycle = {kind: 'array'};
  cycle.component = cycle;
  assert.equal(verifierAssignable(cycle, cycle, w.bootstrapLoader), false);
});

test('runtime packages use descriptor package and defining loader, including default packages', () => {
  const w = world();
  const peer = metadata('Lsub/Peer;', {definingLoader: w.app});
  const pluginPeer = metadata('Lsub/Peer;', {definingLoader: w.plugin});
  assert.equal(sameRuntimePackage(w.current, peer), true);
  assert.equal(sameRuntimePackage(w.current, pluginPeer), false);
  assert.equal(sameRuntimePackage(w.current, w.base), false);
  assert.equal(sameRuntimePackage(metadata('LA;', {definingLoader: w.app}), metadata('LB;', {definingLoader: w.app})), true);
  assert.equal(sameRuntimePackage(metadata('LA;', {definingLoader: w.app}), metadata('LB;', {definingLoader: w.plugin})), false);
  assert.equal(sameRuntimePackage(metadata('LsubExtra/A;', {definingLoader: w.app}), peer), false);
});

test('invokespecial accepts current, any superclass, and exactly direct superinterfaces', () => {
  const w = world();
  for (const owner of [w.current, w.base, w.object, w.directInterface]) ok(checkSpecialOwner(w.current, owner));
  bad(checkSpecialOwner(w.current, w.rootInterface), /invokespecial/);
  bad(checkSpecialOwner(w.current, w.other), /invokespecial/);
  bad(checkSpecialOwner(w.child, w.directInterface), /invokespecial/);
  ok(checkSpecialOwner(w.directInterface, w.rootInterface));
});

test('invokespecial direct-owner checks do not confuse same-named classes from another loader', () => {
  const w = world();
  for (const owner of [w.current, w.base, w.directInterface]) {
    bad(checkSpecialOwner(w.current, metadata(owner.name, {definingLoader: w.plugin, isInterface: owner.isInterface})));
    ok(checkSpecialOwner(w.current, Object.freeze({...owner})));
  }
});

test('protected superclass fields require current-or-subclass receiver across packages', () => {
  const w = world();
  for (const receiver of [ref(w.current), ref(w.child), nullType]) {
    ok(checkProtectedReceiver(protectedInput(w, {receiver})));
  }
  for (const receiver of [ref(w.base), ref(w.other), array(primitive('I'))]) {
    bad(checkProtectedReceiver(protectedInput(w, {receiver})), /receiver/);
  }
});

test('protected same-package access permits a superclass receiver only in the same defining loader', () => {
  const w = world();
  const peer = metadata('Lbase/Peer;', {definingLoader: w.app, superclass: w.base});
  const pluginPeer = metadata('Lbase/PluginPeer;', {definingLoader: w.plugin, superclass: w.base});
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: peer, receiver: ref(w.base)})));
  bad(checkProtectedReceiver(protectedInput(w, {currentClass: pluginPeer, receiver: ref(w.base)})));
});

test('protected checks use the declaration holder, not a same-package intermediate owner', () => {
  const w = world();
  const middle = metadata('Lsub/Middle;', {definingLoader: w.app, superclass: w.base});
  const current = metadata('Lsub/Current2;', {definingLoader: w.app, superclass: middle});
  bad(checkProtectedReceiver(protectedInput(w, {currentClass: current, owner: ref(middle), receiver: ref(middle)})));
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: current, owner: ref(middle), receiver: ref(current)})));
});

test('non-protected, missing, unrelated and same-name-other-loader members defer to resolution', () => {
  const w = world();
  for (const memberName of ['publicValue', 'privateValue', 'missing']) {
    ok(checkProtectedReceiver(protectedInput(w, {memberName, receiver: ref(w.base)})));
  }
  const unrelated = metadata('Lother/Protected;', {superclass: w.object, fields: [member('value', 'I')]});
  const collision = metadata(w.base.name, {definingLoader: w.plugin, superclass: w.object, fields: [member('value', 'I')]});
  for (const owner of [unrelated, collision]) {
    ok(checkProtectedReceiver(protectedInput(w, {owner: ref(owner), receiver: ref(owner)})));
  }
  ok(checkProtectedReceiver(protectedInput(w, {memberDescriptor: 'J', receiver: ref(w.base)})));
  ok(checkProtectedReceiver(protectedInput(w, {owner: array(primitive('I')), receiver: array(primitive('I'))})));
});

test('protected applicability uses member and loader identity without receiver metadata', () => {
  const w = world();
  const input = protectedInput(w);
  delete input.receiver;
  assert.equal(requiresProtectedReceiver(input), true);
  for (const memberName of ['publicValue', 'privateValue', 'missing']) {
    assert.equal(requiresProtectedReceiver({...input, memberName}), false);
  }
  for (const opcode of [0xb2, 0xb3, 0xb8]) {
    assert.equal(requiresProtectedReceiver({...input, opcode}), false);
  }
  const peer = metadata('Lbase/Peer;', {definingLoader: w.app, superclass: w.base});
  const foreignPeer = metadata('Lbase/Peer;', {definingLoader: w.plugin, superclass: w.base});
  assert.equal(requiresProtectedReceiver({...input, currentClass: peer}), false);
  assert.equal(requiresProtectedReceiver({...input, currentClass: foreignPeer}), true);
  const collision = metadata(w.base.name, {definingLoader: w.plugin, fields: [member('value', 'I')]});
  assert.equal(requiresProtectedReceiver({...input, owner: ref(collision)}), false);
});

test('nearer declarations hide protected fields and override protected methods', () => {
  const w = world();
  const middle = metadata('Lother/Middle;', {definingLoader: w.app, superclass: w.base,
    fields: [member('value', 'I', 1)], methods: [member('step', '()V', 1)]});
  const current = metadata('Lsub/Current2;', {definingLoader: w.app, superclass: middle});
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: current, owner: ref(middle), receiver: ref(middle)})));
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: current, owner: ref(middle), receiver: ref(middle),
    memberName: 'step', memberDescriptor: '()V', opcode: 0xb6})));
});

test('field lookup considers directly inherited interface fields before superclass fields', () => {
  const w = world();
  const iface = metadata('Lapi/Field;', {definingLoader: w.app, superclass: w.object, isInterface: true,
    fields: [member('value', 'I', 0x0019)]});
  const middle = metadata('Lother/Middle;', {definingLoader: w.app, superclass: w.base, interfaces: [iface]});
  const current = metadata('Lsub/Current2;', {definingLoader: w.app, superclass: middle});
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: current, owner: ref(middle), receiver: ref(middle)})));
});

test('protected instance methods use the same declaration-holder receiver rule', () => {
  const w = world(), memberInput = {memberName: 'step', memberDescriptor: '()V', opcode: 0xb6};
  ok(checkProtectedReceiver(protectedInput(w, memberInput)));
  bad(checkProtectedReceiver(protectedInput(w, {...memberInput, receiver: ref(w.base)})));
  ok(checkProtectedReceiver(protectedInput(w, {...memberInput, memberName: 'missing', receiver: ref(w.base)})));
  for (const opcode of [0xb2, 0xb3, 0xb8]) {
    ok(checkProtectedReceiver(protectedInput(w, {...memberInput, opcode, receiver: ref(w.base)})));
  }
});

test('protected superclass constructors reject new superclass receivers but not current receivers', () => {
  const w = world(), init = {memberName: '<init>', memberDescriptor: '()V', opcode: 0xb7};
  bad(checkProtectedReceiver(protectedInput(w, {...init, receiver: ref(w.base)})));
  ok(checkProtectedReceiver(protectedInput(w, init)));
  ok(checkProtectedReceiver(protectedInput(w, {...init, memberDescriptor: '(I)V', receiver: ref(w.base)})));
});

test('constructors are never inherited by metadata lookup', () => {
  const w = world(), middle = metadata('Lother/Middle;', {definingLoader: w.app, superclass: w.base});
  const current = metadata('Lsub/Current2;', {definingLoader: w.app, superclass: middle});
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: current, owner: ref(middle), receiver: ref(middle),
    memberName: '<init>', memberDescriptor: '()V', opcode: 0xb7})));
});

test('array Object.clone is exempt but no other Object method or opcode gains that exemption', () => {
  const w = world(), clone = {owner: ref(w.object), receiver: array(primitive('I')),
    memberName: 'clone', memberDescriptor: '()Ljava/lang/Object;', opcode: 0xb6};
  ok(checkProtectedReceiver(protectedInput(w, clone)));
  bad(checkProtectedReceiver(protectedInput(w, {...clone, memberName: 'finalize', memberDescriptor: '()V'})));
  bad(checkProtectedReceiver(protectedInput(w, {...clone, opcode: 0xb7})));
});

test('uninitializedThis putfield requires exact owner identity and an own field declaration', () => {
  const w = world();
  ok(checkDeclaredField(w.current, w.current, 'own', 'I'));
  ok(checkDeclaredField(w.current, Object.freeze({...w.current}), 'own', 'I'));
  bad(checkDeclaredField(w.current, w.base, 'value', 'I'), /owner/);
  bad(checkDeclaredField(w.current, w.current, 'value', 'I'), /declared/);
  bad(checkDeclaredField(w.current, w.current, 'own', 'J'), /declared/);
  bad(checkDeclaredField(w.current, w.current, 'self', '()V'), /declared/);
  bad(checkDeclaredField(w.current, metadata(w.current.name, {fields: [member('own', 'I')]}), 'own', 'I'), /owner/);
});

test('own static-field mismatch is retained for execution-time resolution, not rejected here', () => {
  const w = world();
  ok(checkDeclaredField(w.current, w.current, 'staticOwn', 'I'));
});

test('cyclic metadata hierarchy and inherited member searches terminate without mutation', () => {
  const w = world();
  const a = {...metadata('La/A;', {definingLoader: w.app})};
  const b = {...metadata('Lb/B;', {definingLoader: w.app, superclass: a})};
  a.superclass = b;
  Object.freeze(a);
  Object.freeze(b);
  assert.equal(verifierAssignable(ref(a), ref(w.other), w.bootstrapLoader), false);
  bad(checkSpecialOwner(a, w.other));
  ok(checkProtectedReceiver(protectedInput(w, {currentClass: a, owner: ref(b), receiver: ref(b), memberName: 'missing'})));
  assert.equal(a.superclass, b);
  assert.equal(b.superclass, a);
});

test('obligation dispatcher binds descriptors without confusing equal names with class identity', () => {
  const w = world(), assign = obligation('assignable', w.child.name, w.base.name);
  ok(checkVerificationObligation(assign, context(w, ref(w.child), ref(w.base))));
  bad(checkVerificationObligation(assign, context(w, ref(w.child), ref(w.object))), /descriptors/);
  const collision = metadata(w.current.name, {definingLoader: w.plugin, superclass: w.object});
  bad(checkVerificationObligation(obligation('assignable', w.current.name, w.current.name),
    context(w, ref(collision), ref(w.current))), /not assignable/);
});

test('obligation dispatcher checks protected, special-owner and own-field results', () => {
  const w = world();
  const protectedField = obligation('protected', w.base.name, w.base.name,
    {memberName: 'value', memberDescriptor: 'I', opcode: 0xb4});
  bad(checkVerificationObligation(protectedField, context(w, ref(w.base), ref(w.base))), /receiver/);
  ok(checkVerificationObligation({...protectedField, sourceType: 'null'}, context(w, nullType, ref(w.base))));
  const special = obligation('special-owner', w.current.name, w.directInterface.name, {opcode: 0xb7});
  ok(checkVerificationObligation(special, context(w, ref(w.current), ref(w.directInterface))));
  const field = obligation('declared-field', w.current.name, w.current.name,
    {memberName: 'own', memberDescriptor: 'I', opcode: 0xb5});
  ok(checkVerificationObligation(field, context(w, ref(w.current), ref(w.current))));
  bad(checkVerificationObligation({...field, memberName: 'value'}, context(w, ref(w.current), ref(w.current))), /declared/);
});

test('obligation dispatcher rejects missing member details and inconsistent current-class identity', () => {
  const w = world();
  for (const kind of ['protected', 'declared-field']) {
    bad(checkVerificationObligation(obligation(kind, w.current.name, w.current.name),
      context(w, ref(w.current), ref(w.current))), /missing/);
  }
  const collision = metadata(w.current.name, {definingLoader: w.plugin});
  for (const kind of ['special-owner', 'declared-field']) {
    bad(checkVerificationObligation(obligation(kind, w.current.name, w.current.name),
      context(w, ref(collision), ref(w.current))), /identities/);
  }
  bad(checkVerificationObligation(obligation('unrecognized', w.current.name, w.current.name),
    context(w, ref(w.current), ref(w.current))), /Unknown/);
});
