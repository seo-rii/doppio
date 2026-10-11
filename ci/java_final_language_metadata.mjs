import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {inspectCoreClasses, proveCoreGroup, coreOpcodeNames} from './java_core_bytecode.mjs';
import {readRecordClass} from './java_record_metadata.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const binaryName = value => typeof value === 'string' && /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(value);
const switchDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;';
function keys(value, expected, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), label);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), label);
}

export function validateFinalBootstrapSites(sites) {
  assert.ok(Array.isArray(sites) && sites.length > 0, 'Nonempty bootstrap site obligations');
  for (const site of sites) {
    keys(site, ['siteName', 'siteDescriptor', 'bootstrap', 'arguments'], 'Exact bootstrap site selector');
    assert.equal(site.siteName, 'typeSwitch', 'Selected final switch site');
    assert.ok(typeof site.siteDescriptor === 'string' && /^\(.+\)I$/.test(site.siteDescriptor), 'Actual switch site descriptor');
    keys(site.bootstrap, ['kind', 'tag', 'owner', 'name', 'descriptor'], 'Exact bootstrap member selector');
    assert.deepEqual(site.bootstrap, {kind: 6, tag: 10, owner: 'java.lang.runtime.SwitchBootstraps',
      name: 'typeSwitch', descriptor: switchDescriptor}, 'Selected compiler switch bootstrap');
    assert.ok(Array.isArray(site.arguments), 'Ordered bootstrap label obligations');
    for (const label of site.arguments) {
      keys(label, ['tag', 'value'], 'Exact bootstrap label selector');
      assert.equal(label.tag, 7, 'Selected Class labels only');
      assert.ok(binaryName(label.value), 'Actual Class label binary identity');
    }
  }
}

export function inspectFinalClasses(directory, files) {
  const core = inspectCoreClasses(directory, files), classes = new Map();
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(directory, file.path));
    assert.equal(sha(bytes), file.sha256, 'Immutable original final-language class bytes');
    const metadata = readRecordClass(bytes), {layout} = metadata;
    const className = index => {
      assert.equal(layout.pool[index]?.tag, 7, 'Actual interface Class constant');
      const utf = layout.pool[layout.pool[index].first]; assert.equal(utf?.tag, 1);
      return utf.value.replaceAll('/', '.');
    };
    metadata.interfaceNames = Array.from({length: layout.interfaceCount}, (_, i) =>
      className(bytes.readUInt16BE(layout.interfacesOffset + 2 * i)));
    assert.equal(file.path, metadata.name.replaceAll('.', '/') + '.class', 'Actual binary file identity');
    assert.ok(!classes.has(metadata.name), 'Unique final-language binary identity');
    classes.set(metadata.name, {...metadata, file, core: core.get(metadata.name)});
  }
  return classes;
}

// Follow an ACTUAL decoded instruction, not an unused constant-pool decoy.
export function readFinalBootstrapSite(metadata, instruction) {
  assert.equal(instruction.name, 'invokedynamic', 'Actual indy instruction');
  assert.equal(instruction.opcode, 186, 'Actual indy opcode');
  const {layout, bytes} = metadata, pool = layout.pool;
  const utf = index => { assert.equal(pool[index]?.tag, 1, 'Actual bootstrap UTF8'); return pool[index].value; };
  const cls = index => { assert.equal(pool[index]?.tag, 7, 'Actual bootstrap Class'); return utf(pool[index].first).replaceAll('/', '.'); };
  const entry = pool[instruction.cp?.index]; assert.equal(entry?.tag, 18, 'Actual indy CP entry');
  assert.equal(instruction.cp.tag, 18, 'Decoded indy CP tag');
  const nt = pool[entry.second]; assert.equal(nt?.tag, 12, 'Actual indy NameAndType');
  const bootstrap = metadata.bootstrapMethods[entry.first]; assert.ok(bootstrap, 'Actual BootstrapMethods index');
  assert.equal(bootstrap.index, entry.first, 'Actual selected bootstrap index');
  const handle = pool[bootstrap.methodRef]; assert.equal(handle?.tag, 15, 'Actual bootstrap MethodHandle');
  const kind = bytes[handle.start + 1], referenceIndex = bytes.readUInt16BE(handle.start + 2);
  const reference = pool[referenceIndex]; assert.ok([10, 11].includes(reference?.tag), 'Actual bootstrap method reference');
  const targetNt = pool[reference.second]; assert.equal(targetNt?.tag, 12, 'Actual bootstrap member NameAndType');
  const attribute = layout.attributes.entries.find(item => item.name === 'BootstrapMethods');
  assert.ok(attribute, 'Actual BootstrapMethods attribute');
  const offset = attribute.body + 2 + metadata.bootstrapMethods.slice(0, entry.first)
    .reduce((sum, item) => sum + 4 + 2 * item.arguments.length, 0);
  const arguments_ = bootstrap.arguments.map(index => ({tag: pool[index]?.tag, value: cls(index)}));
  return {siteName: utf(nt.first), siteDescriptor: utf(nt.second),
    bootstrap: {kind, tag: reference.tag, owner: cls(reference.first), name: utf(targetNt.first), descriptor: utf(targetNt.second)},
    arguments: arguments_, instructionPc: instruction.pc, cpIndex: entry.index, cpOffset: entry.start,
    nameAndTypeIndex: entry.second, bootstrapIndex: entry.first, bootstrapOffset: offset,
    methodHandleIndex: bootstrap.methodRef, methodHandleOffset: handle.start, referenceIndex,
    argumentIndices: [...bootstrap.arguments], argumentOffsets: bootstrap.arguments.map(index => pool[index].start),
    attributeSha256: sha(bytes.subarray(attribute.start, attribute.end))};
}

export function proveFinalBootstrapSites(probe, method, metadata) {
  if (probe.bootstrapSites === undefined) return [];
  validateFinalBootstrapSites(probe.bootstrapSites);
  assert.ok(probe.requiredOpcodes.includes('invokedynamic'), 'Bootstrap evidence requires the same decoded probe');
  const sites = method.instructions.filter(item => item.name === 'invokedynamic')
    .map(instruction => readFinalBootstrapSite(metadata, instruction));
  const used = new Set();
  return probe.bootstrapSites.map(expected => {
    const index = sites.findIndex((site, i) => !used.has(i) && site.siteName === expected.siteName &&
      site.siteDescriptor === expected.siteDescriptor &&
      ['kind', 'tag', 'owner', 'name', 'descriptor'].every(key => site.bootstrap[key] === expected.bootstrap[key]) &&
      site.arguments.length === expected.arguments.length &&
      site.arguments.every((argument, n) => argument.tag === expected.arguments[n].tag && argument.value === expected.arguments[n].value));
    assert.ok(index >= 0, 'Actual decoded bootstrap site, member and ordered labels');
    used.add(index); return sites[index];
  });
}

function flags(actual, expected, label) {
  keys(expected, ['required', 'forbidden'], 'Exact access flag selector');
  assert.ok(Number.isInteger(expected.required) && Number.isInteger(expected.forbidden) &&
    expected.required >= 0 && expected.forbidden >= 0 && expected.required <= 65535 && expected.forbidden <= 65535 &&
    (expected.required & expected.forbidden) === 0, 'Bounded non-overlapping access bits');
  assert.equal(actual & expected.required, expected.required, label);
  assert.equal(actual & expected.forbidden, 0, label);
}
function memberInventory(actual, expected, label) {
  assert.ok(Array.isArray(expected), 'Exact declared member inventory');
  assert.deepEqual(actual.map(item => item.descriptor).sort(), expected.map(item => item.descriptor).sort(), label);
  return expected.map(item => {
    keys(item, ['descriptor', 'flags', 'hasCode'], 'Exact member selector');
    assert.equal(typeof item.hasCode, 'boolean', 'Actual Code presence obligation');
    const found = actual.find(method => method.descriptor === item.descriptor);
    flags(found.flags, item.flags, label); assert.equal(!!found.code, item.hasCode, label);
    return {name: found.name, descriptor: found.descriptor, flags: found.flags, hasCode: !!found.code,
      start: found.start, end: found.end, ...(found.code ? {codeSha256: found.code.sha256} : {})};
  });
}

export function proveFinalLauncherClass(proof, metadata) {
  keys(proof, ['className', 'flags', 'superName', 'interfaceNames', 'declaredMainMethods', 'constructors', 'classInitializer'],
    'Exact launcher class selector');
  assert.equal(metadata.name, proof.className, 'Actual launcher header identity');
  flags(metadata.flags, proof.flags, 'Actual launcher class flags');
  assert.equal(metadata.superName, proof.superName, 'Actual launcher superclass');
  assert.deepEqual(metadata.interfaceNames, proof.interfaceNames, 'Actual launcher interfaces');
  const mains = memberInventory(metadata.methods.filter(method => method.name === 'main'), proof.declaredMainMethods, 'Exact declared main inventory');
  const constructors = memberInventory(metadata.methods.filter(method => method.name === '<init>'), proof.constructors, 'Exact declared constructor inventory');
  const initializers = memberInventory(metadata.methods.filter(method => method.name === '<clinit>'),
    proof.classInitializer === null ? [] : [proof.classInitializer], 'Exact declared class initializer inventory');
  return {className: metadata.name, classFile: metadata.file, flags: metadata.flags, superName: metadata.superName,
    interfaceNames: metadata.interfaceNames, mains, constructors, initializers};
}

function launcherProbe(probe, classes) {
  assert.ok(probe && Object.keys(probe).every(key =>
    ['className', 'method', 'descriptor', 'requiredOpcodes', 'symbolicOperands'].includes(key)), 'Known launcher probe selectors');
  assert.ok(binaryName(probe.className), 'Explicit actual launcher probe owner');
  const metadata = classes.get(probe.className); assert.ok(metadata, 'Actual launcher probe class');
  const method = metadata.core.methods.get(probe.method + probe.descriptor); assert.ok(method, 'Actual launcher probe Code');
  assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 &&
    probe.requiredOpcodes.every(opcode => coreOpcodeNames.includes(opcode)), 'Actual known launcher opcode obligations');
  const matches = probe.requiredOpcodes.map(opcode => {
    const instruction = method.instructions.find(item => item.name === opcode || item.modifiedOpcode === opcode);
    assert.ok(instruction, 'Actual decoded launcher opcode'); return instruction;
  });
  for (const operand of probe.symbolicOperands || []) {
    const fields = operand.tag === 7 ? ['value'] : ['owner', 'name', 'descriptor'];
    keys(operand, ['opcode', 'tag', ...fields], 'Exact launcher symbolic operand selector');
    assert.ok(coreOpcodeNames.includes(operand.opcode) && [7, 9, 10, 11].includes(operand.tag), 'Known launcher operand');
    assert.ok(fields.every(field => typeof operand[field] === 'string' && operand[field].length > 0), 'Complete launcher member operand');
    const instruction = method.instructions.find(item => item.name === operand.opcode && item.cp?.tag === operand.tag &&
      fields.every(field => item.cp[field] === operand[field]));
    assert.ok(instruction, 'Actual decoded launcher member operand'); matches.push(instruction);
  }
  return {owner: metadata.name, method: probe.method, descriptor: probe.descriptor, classFile: metadata.file,
    codeSha256: method.codeSha256, matches, handlers: method.handlers};
}

export function proveFinalGroup(group, classes) {
  if (group.id !== 'final-launcher') {
    const core = new Map([...classes].map(([name, metadata]) => [name, metadata.core]));
    const proofs = proveCoreGroup(group, core);
    for (const [index, entry] of group.cases.entries()) for (const [n, probe] of entry.probes.entries()) {
      const owner = probe.className || group.mainClass, metadata = classes.get(owner);
      const method = metadata.core.methods.get(probe.method + probe.descriptor);
      proofs[index].probes[n].bootstrapSites = proveFinalBootstrapSites(probe, method, metadata);
    }
    return proofs;
  }
  assert.ok(!classes.get(group.mainClass)?.methods.some(method => method.name === 'main'), 'Launcher container has no wrapper main');
  for (const metadata of classes.values()) for (const method of metadata.core.methods.values())
    assert.ok(!method.instructions.some(instruction => [182, 183, 184, 185].includes(instruction.opcode) && instruction.cp?.name === 'main'),
      'Actual startup only: no ordinary invocation of a main method');
  const related = (from, target, seen = new Set()) => {
    if (from === target) return true;
    if (seen.has(from)) return false; seen.add(from);
    const metadata = classes.get(from);
    return !!metadata && [metadata.superName, ...metadata.interfaceNames].some(name => name && related(name, target, seen));
  };
  return group.cases.map(entry => {
    assert.ok(classes.has(entry.mainClass), 'Actual launch target inventory');
    assert.ok(Array.isArray(entry.classProofs) && entry.classProofs.length > 0, 'Nonempty startup declaration proofs');
    const classProofs = entry.classProofs.map(proof => {
      const metadata = classes.get(proof.className); assert.ok(metadata, 'Actual declared startup proof class');
      return proveFinalLauncherClass(proof, metadata);
    });
    const selection = entry.launchSelection;
    if (selection !== null) {
      keys(selection, ['declaringClass', 'descriptor', 'isStatic', 'constructor'], 'Exact launcher selection selector');
      assert.ok(related(entry.mainClass, selection.declaringClass), 'Selected declaration in actual startup hierarchy');
      assert.ok(entry.classProofs.some(proof => proof.className === selection.declaringClass), 'Selected declaration independently bound');
      const selected = classes.get(selection.declaringClass)?.methods.find(method => method.name === 'main' && method.descriptor === selection.descriptor);
      assert.ok(selected && !(selected.flags & 2), 'Actual nonprivate startup declaration');
      assert.ok(['([Ljava/lang/String;)V', '()V'].includes(selected.descriptor), 'Actual eligible startup descriptor');
      assert.equal(typeof selection.isStatic, 'boolean'); assert.equal(!!(selected.flags & 8), selection.isStatic);
      if (selection.isStatic) assert.equal(selection.constructor, null, 'Static startup never constructs the initial class');
      else if (entry.outcome === 'success') {
        assert.ok(selection.constructor, 'Successful instance startup binds its constructor');
        assert.ok(!(classes.get(entry.mainClass).flags & (0x200 | 0x400)), 'Successful instance startup has a concrete initial class');
        assert.ok(selected.code, 'Successful selected main has actual Code');
      }
      if (selection.constructor !== null) {
        keys(selection.constructor, ['className', 'descriptor'], 'Exact startup constructor selector');
        assert.equal(selection.constructor.className, entry.mainClass); assert.equal(selection.constructor.descriptor, '()V');
        assert.ok(entry.classProofs.some(proof => proof.className === entry.mainClass), 'Initial class independently bound');
        const constructor = classes.get(entry.mainClass).methods.find(method => method.name === '<init>' && method.descriptor === '()V');
        assert.ok(constructor?.code && !(constructor.flags & 2), 'Actual nonprivate initial-class zero-argument constructor');
      }
    }
    return {id: entry.id, actualLaunchTarget: entry.mainClass, selection, classProofs,
      probes: entry.probes.map(probe => launcherProbe(probe, classes)),
      staticDeclarationBindingsProven: true, dynamicBranchCoverageProven: false, jitExecutionProven: false,
      fullSourceUnitConformanceProven: false, generalInitializationConformanceProven: false};
  });
}
