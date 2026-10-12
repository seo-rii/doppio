import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {inspectCoreClasses, proveCoreGroup} from './java_core_bytecode.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// Independent metadata reader: it reads the published original class bytes,
// never the generator's plan or Doppio's constant-pool/linker objects.
export function inspectUserBootstrapClasses(directory, files) {
  const classes = inspectCoreClasses(directory, files);
  for (const [className, decoded] of classes) {
    const bytes = fs.readFileSync(path.join(directory, decoded.file.path)), layout = readStructureLayout(bytes);
    assert.equal(sha(bytes), decoded.file.sha256);
    const attributes = layout.attributes.entries.filter(attribute => attribute.name === 'BootstrapMethods');
    assert.ok(attributes.length <= 1, 'Unique BootstrapMethods attribute');
    const utf = index => {assert.equal(layout.pool[index]?.tag, 1); return layout.pool[index].value;};
    const cls = index => {assert.equal(layout.pool[index]?.tag, 7); return utf(layout.pool[index].first).replaceAll('/', '.');};
    const argument = (index, visiting = new Set()) => {
      const entry = layout.pool[index]; assert.ok(entry, 'Actual bootstrap argument CP index');
      const value = {index, tag: entry.tag};
      if (entry.tag === 8) value.value = utf(entry.first);
      else if (entry.tag === 7) value.value = cls(index);
      else if (entry.tag === 16) value.descriptor = utf(entry.first);
      else if ([3, 4, 5, 6].includes(entry.tag)) value.value = entry.tag === 3 ? bytes.readInt32BE(entry.start + 1) :
        entry.tag === 4 ? bytes.readFloatBE(entry.start + 1) : entry.tag === 5 ? bytes.readBigInt64BE(entry.start + 1).toString() : bytes.readDoubleBE(entry.start + 1);
      else if ([9, 10, 11].includes(entry.tag)) {
        const nt = layout.pool[entry.second]; assert.equal(nt?.tag, 12);
        Object.assign(value, {owner: cls(entry.first), name: utf(nt.first), descriptor: utf(nt.second)});
      } else if (entry.tag === 15) {
        const kind = bytes[entry.start + 1], ref = argument(bytes.readUInt16BE(entry.start + 2), visiting);
        assert.ok(kind >= 1 && kind <= 9 && [9, 10, 11].includes(ref.tag), 'Actual bootstrap handle reference');
        Object.assign(value, {referenceKind: kind, reference: ref});
      } else if (entry.tag === 17) {
        assert.ok(!visiting.has(index), 'Bounded acyclic selected dynamic argument proof');
        const nested = new Set(visiting); nested.add(index);
        const nt = layout.pool[entry.second]; assert.equal(nt?.tag, 12);
        Object.assign(value, {name: utf(nt.first), descriptor: utf(nt.second), bootstrapIndex: entry.first,
          bootstrap: bootstrap(entry.first, nested)});
      } else assert.fail('Not a selected loadable bootstrap argument: ' + entry.tag);
      return value;
    };
    const rawBootstraps = [];
    if (attributes.length) {
      const attribute = attributes[0]; let offset = attribute.body;
      const read = () => {assert.ok(offset + 2 <= attribute.end); const result = bytes.readUInt16BE(offset); offset += 2; return result;};
      const count = read();
      for (let n = 0; n < count; n++) {
        const method = read(), length = read(), arguments_ = [];
        for (let a = 0; a < length; a++) arguments_.push(read());
        rawBootstraps.push({method, arguments: arguments_});
      }
      assert.equal(offset, attribute.end, 'Complete BootstrapMethods bytes');
    }
    const bootstrap = (index, visiting = new Set()) => {
      const entry = rawBootstraps[index]; assert.ok(entry, 'Declared bootstrap index');
      const method = argument(entry.method, visiting); assert.equal(method.tag, 15, 'Actual bootstrap method handle');
      return {index, method, arguments: entry.arguments.map(cpIndex => argument(cpIndex, visiting))};
    };
    decoded.bootstrapMethods = rawBootstraps.map((_, n) => bootstrap(n));
    for (const body of decoded.methods.values()) for (const instruction of body.instructions) if ([17, 18].includes(instruction.cp?.tag)) {
      assert.ok(instruction.cp.tag === 17 ? ['ldc', 'ldc_w', 'ldc2_w'].includes(instruction.name) : instruction.name === 'invokedynamic',
        'Dynamic metadata must be used by its actual executable opcode');
      instruction.cp.bootstrap = bootstrap(instruction.cp.bootstrapIndex);
    }
    decoded.className = className;
  }
  return classes;
}

const matches = (actual, expected) => Object.entries(expected).every(([key, value]) =>
  Array.isArray(value) ? Array.isArray(actual?.[key]) && actual[key].length === value.length && value.every((item, n) => matches(actual[key][n], item)) :
    value && typeof value === 'object' ? matches(actual?.[key], value) : actual?.[key] === value);

export function proveUserBootstrapGroup(group, classes) {
  const proofs = proveCoreGroup(group, classes);
  for (const [n, proof] of proofs.entries()) {
    const entry = group.cases[n];
    for (const [p, decoded] of proof.probes.entries()) {
      const requested = entry.probes[p], owner = requested.className || group.mainClass;
      const body = classes.get(owner).methods.get(requested.method + requested.descriptor);
      for (const target of requested.dynamicOperands || []) {
        const found = body.instructions.filter(instruction => instruction.name === target.opcode && matches(instruction.cp, target.cp));
        assert.equal(found.length, target.count || 1, 'Every independent actual Code + BootstrapMethods obligation');
        for (const item of found) if (!decoded.matches.some(match => match.pc === item.pc)) decoded.matches.push(item);
      }
      if (requested.sameConstantPoolAs) {
        const reference = requested.sameConstantPoolAs;
        const other = classes.get(reference.className || owner)?.methods.get(reference.method + reference.descriptor);
        assert.ok(other, 'Actual lexical comparison method');
        const selected = body.instructions.filter(instruction => instruction.cp?.tag === reference.tag);
        const previous = other.instructions.filter(instruction => instruction.cp?.tag === reference.tag);
        assert.ok(selected.length && previous.length && selected.every(instruction => instruction.cp.index === previous[0].cp.index),
          'The lexical/constant-pool identity proof binds the SAME original CP index');
      }
      if (requested.sameConstantPoolWithinMethod) {
        const selected = body.instructions.filter(instruction => instruction.cp?.tag === requested.sameConstantPoolWithinMethod.tag);
        assert.equal(selected.length, requested.sameConstantPoolWithinMethod.count);
        assert.ok(selected.every(instruction => instruction.cp.index === selected[0].cp.index), 'Same CP reused at distinct actual instruction PCs');
        assert.equal(new Set(selected.map(instruction => instruction.pc)).size, selected.length);
      }
    }
  }
  return proofs;
}

export function assertUserBootstrapProofs(record, group) {
  for (const [n, proof] of record.bytecodeProofs.entries()) for (const [p, decoded] of proof.probes.entries()) {
    const requested = group.cases[n].probes[p];
    for (const target of requested.dynamicOperands || []) {
      const selected = decoded.matches.filter(instruction => instruction.name === target.opcode && matches(instruction.cp, target.cp));
      assert.equal(selected.length, target.count || 1, 'Mandatory actual Code bootstrap operands in retained proof');
      assert.equal(new Set(selected.map(instruction => instruction.pc)).size, selected.length, 'No repeated evidence for one lexical instruction');
    }
    if (requested.sameConstantPoolWithinMethod) {
      const selected = decoded.matches.filter(instruction => instruction.cp?.tag === requested.sameConstantPoolWithinMethod.tag);
      assert.equal(selected.length, requested.sameConstantPoolWithinMethod.count);
      assert.ok(selected.every(instruction => instruction.cp.index === selected[0].cp.index));
      assert.equal(new Set(selected.map(instruction => instruction.pc)).size, selected.length);
    }
    if (requested.sameConstantPoolAs) {
      const reference = requested.sameConstantPoolAs;
      const other = proof.probes.find(probe => probe.owner === decoded.owner && probe.method === reference.method && probe.descriptor === reference.descriptor);
      assert.ok(other, 'Retained same-CP reference probe');
      const selected = decoded.matches.filter(instruction => instruction.cp?.tag === reference.tag);
      const previous = other.matches.filter(instruction => instruction.cp?.tag === reference.tag);
      assert.ok(selected.length && previous.length && selected.every(instruction => instruction.cp.index === previous[0].cp.index));
    }
  }
}
