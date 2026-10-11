import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode, proveCoreGroup} from './java_core_bytecode.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const permitMutations = new Set(['sm-empty-owner', 'sm-empty-reject-child', 'sm-duplicate-attribute',
  'sm-wrong-index-tag', 'sm-zero-index', 'sm-oob-index', 'sm-bad-length', 'sm-truncated-entries',
  'sm-extra-attribute-byte', 'sm-duplicate-entry', 'sm-array-entry']);

/** Independent byte evidence, not the guest parser, loader or type verifier.
 * The outer envelope must be complete. Malformed inner permits are observations,
 * not harness format errors: they are intentionally passed to native and guest. */
export function readSealedClass(bytes) {
  const layout = readStructureLayout(bytes), pool = layout.pool;
  const classReference = (index, offset, strict = false) => {
    const entry = pool[index], tag = entry?.tag ?? null;
    let internalName = null;
    if (tag === 7 && pool[entry.first]?.tag === 1) internalName = pool[entry.first].value;
    if (strict) assert.ok(internalName !== null, 'Actual header Class/UTF8 constant identity');
    return {index, tag, offset, indexOffset: offset, internalName,
      name: internalName === null ? null : internalName.replaceAll('/', '.'),
      isArray: internalName !== null && internalName.startsWith('['),
      indexStatus: index === 0 ? 'zero' : !entry ? 'out-of-range' : tag !== 7 || internalName === null ? 'wrong-tag' : 'class'};
  };
  const self = classReference(layout.thisClass, layout.thisClassOffset, true);
  const superIndex = bytes.readUInt16BE(layout.superClassOffset);
  const superReference = superIndex === 0 ? null : classReference(superIndex, layout.superClassOffset, true);
  const interfaceReferences = Array.from({length: layout.interfaceCount}, (_, index) => {
    const offset = layout.interfacesOffset + index * 2;
    return classReference(bytes.readUInt16BE(offset), offset, true);
  });
  const permittedAttributes = layout.attributes.entries.filter(attribute => attribute.name === 'PermittedSubclasses').map(attribute => {
    const numberOfClasses = attribute.length < 2 ? null : bytes.readUInt16BE(attribute.body);
    const availableEntries = Math.floor(Math.max(0, attribute.length - 2) / 2);
    const count = numberOfClasses === null ? 0 : Math.min(numberOfClasses, availableEntries);
    const entries = Array.from({length: count}, (_, position) => {
      const offset = attribute.body + 2 + position * 2;
      return classReference(bytes.readUInt16BE(offset), offset);
    });
    const consumed = numberOfClasses === null ? 0 : 2 + entries.length * 2;
    return {...attribute, sha256: sha(bytes.subarray(attribute.start, attribute.end)), countOffset: attribute.body,
      numberOfClasses, entries,
      nestedLengthMatches: numberOfClasses !== null && attribute.length === 2 + numberOfClasses * 2,
      missingEntryCount: numberOfClasses === null ? null : numberOfClasses - entries.length,
      extraBytesHex: bytes.subarray(attribute.body + consumed, attribute.end).toString('hex')};
  });
  const members = entries => entries.map(member => {
    let code = null;
    if (member.code) {
      const attr = member.code, instructions = bytes.subarray(attr.instructionsOffset, attr.instructionsOffset + attr.codeLength);
      code = {sha256: sha(instructions), codeAttributeSha256: sha(bytes.subarray(attr.start, attr.end)),
        maxStack: attr.maxStack, maxLocals: attr.maxLocals, codeLength: attr.codeLength,
        instructions: decodeCoreCode(instructions, pool, bytes), layout: attr};
    }
    return {...member, sha256: sha(bytes.subarray(member.start, member.end)), code};
  });
  return {name: self.name, internalName: self.internalName, classReference: self,
    major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4), flags: layout.flags,
    superName: superReference?.name ?? null, superReference,
    interfaceNames: interfaceReferences.map(reference => reference.name), interfaceReferences,
    permitsPresent: permittedAttributes.length > 0, permittedAttributes,
    fields: members(layout.fields.entries), methods: members(layout.methods.entries),
    attributes: layout.attributes.entries.map(attribute => ({...attribute,
      sha256: sha(bytes.subarray(attribute.start, attribute.end))})), layout, bytes, sha256: sha(bytes)};
}

export function inspectSealedClasses(directory, files) {
  const classes = new Map();
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(directory, file.path));
    assert.equal(sha(bytes), file.sha256, 'Immutable independently inspected sealed class bytes');
    const metadata = readSealedClass(bytes);
    assert.equal(file.path, metadata.internalName + '.class', 'Actual class-file binary identity');
    assert.ok(!classes.has(metadata.name), 'Unique driver class identity');
    classes.set(metadata.name, metadata);
  }
  return classes;
}

/** Replay uses original offsets; reported helper evidence cannot authorize edits. */
export function assertSealedMutationProvenance(original, mutation, entry, binding) {
  const pristine = Buffer.from(original), before = readSealedClass(original);
  assert.ok(binding.mutation && mutation && Buffer.isBuffer(mutation.bytes), 'Explicit selected sealed mutation');
  assert.equal(before.name, binding.binaryName, 'Actual selected genuine carrier identity');
  assert.equal(mutation.originalSha256, sha(original));
  assert.ok(Array.isArray(mutation.edits) && mutation.edits.length > 0, 'Nonempty original-offset mutation recipe');
  const ordered = mutation.edits.slice().sort((a, b) => b.offset - a.offset);
  let replay = Buffer.from(original), nextOffset = original.length + 1;
  for (const edit of ordered) {
    assert.ok(Number.isInteger(edit.offset) && Number.isInteger(edit.removeBytes) && edit.offset >= 0 && edit.removeBytes >= 0 &&
      edit.offset + edit.removeBytes <= original.length && edit.offset < nextOffset && edit.offset + edit.removeBytes <= nextOffset,
    'Bounded non-overlapping original-offset edits');
    assert.equal(edit.beforeHex, original.subarray(edit.offset, edit.offset + edit.removeBytes).toString('hex'));
    assert.ok(typeof edit.insertHex === 'string' && /^(?:[0-9a-f]{2})*$/.test(edit.insertHex), 'Exact inserted bytes');
    assert.ok(typeof edit.reason === 'string' && edit.reason.length > 0, 'Explicit mutation reason');
    replay = Buffer.concat([replay.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), replay.subarray(edit.offset + edit.removeBytes)]);
    nextOffset = edit.offset;
  }
  assert.deepEqual(original, pristine, 'Immutable original carrier');
  assert.deepEqual(replay, mutation.bytes, 'Independent exact sealed mutation replay');
  assert.equal(mutation.mutatedSha256, sha(replay));
  const after = readSealedClass(replay);
  assert.equal(after.name, before.name); assert.equal(after.minor, before.minor);
  assert.equal(after.layout.pool.length, before.layout.pool.length, 'Every existing CP index is retained; no fabricated constants');
  assert.deepEqual(replay.subarray(10, after.layout.flagsOffset), original.subarray(10, before.layout.flagsOffset),
    'Every original CP byte is retained');
  assert.deepEqual(replay.subarray(0, 6), original.subarray(0, 6));
  const finalMutation = entry.id === 'sm-final-with-permits', versionMutation = entry.id === 'sm-old-major-opaque';
  const codeMutation = entry.id === 'sm-invalid-child-code';
  assert.ok(permitMutations.has(entry.id) || finalMutation || versionMutation || codeMutation, 'Known bounded mutation scope');
  assert.equal(after.major, versionMutation ? 60 : before.major, 'Only the explicit opaque-old-major control changes the major');
  assert.equal(after.flags, finalMutation ? before.flags | 0x10 : before.flags, 'Only the explicit final control changes access flags');
  assert.deepEqual(replay.subarray(after.layout.flagsOffset + 2, after.layout.fields.countOffset),
    original.subarray(before.layout.flagsOffset + 2, before.layout.fields.countOffset), 'Original ClassCP parent/interface identities');
  assert.equal(after.fields.length, before.fields.length); assert.equal(after.methods.length, before.methods.length);
  const changedMethods = [];
  for (const [kind, previous, current] of [['field', before.fields, after.fields], ['method', before.methods, after.methods]]) {
    for (const [position, member] of previous.entries()) {
      const retained = current[position];
      assert.deepEqual([retained.name, retained.descriptor, retained.flags], [member.name, member.descriptor, member.flags]);
      const expected = Buffer.from(original.subarray(member.start, member.end));
      if (codeMutation && kind === 'method' && member.name === 'value' && member.descriptor === '()I') {
        const returns = member.code.instructions.filter(instruction => instruction.name === 'ireturn');
        assert.equal(returns.length, 1, 'One actual original int-return instruction');
        const offset = member.code.layout.instructionsOffset + returns[0].pc - member.start;
        expected[offset] = 0xb0;
        changedMethods.push({name: member.name, descriptor: member.descriptor, pc: returns[0].pc,
          beforeOpcode: 'ireturn', afterOpcode: 'areturn', originalCodeSha256: member.code.sha256, mutatedCodeSha256: retained.code.sha256});
      }
      assert.deepEqual(replay.subarray(retained.start, retained.end), expected, 'Preserve every unrelated member and complete Code byte');
    }
  }
  assert.equal(changedMethods.length, codeMutation ? 1 : 0, 'Exactly the declared invalid-child Code mutation');
  const otherAttributes = metadata => metadata.attributes.filter(attribute => attribute.name !== 'PermittedSubclasses')
    .map(attribute => metadata.bytes.subarray(attribute.start, attribute.end).toString('hex'));
  assert.deepEqual(otherAttributes(after), otherAttributes(before), 'All unrelated class attributes remain original');
  if (!permitMutations.has(entry.id)) {
    assert.deepEqual(replay.subarray(after.layout.attributes.countOffset), original.subarray(before.layout.attributes.countOffset),
      'Flag/version/Code controls leave complete original class attributes unchanged');
  }
  assert.notDeepEqual(replay, original, 'A selected mutation must actually change its target');
  return {originalSha256: sha(original), mutatedSha256: sha(replay), originalMajor: before.major, mutatedMajor: after.major,
    originalFlags: before.flags, mutatedFlags: after.flags, originalCpBytesPreserved: true,
    unrelatedHeaderAndMembersPreserved: true, unrelatedCodePreserved: true, unrelatedClassAttributesPreserved: true,
    changedMethods, edits: structuredClone(mutation.edits), fullClassFileConformanceProven: false};
}

/** Static declaration/CP/probe evidence is not dynamic branch, JIT or full-unit coverage. */
export function proveSealedGroup(group, metadataClasses, codeClasses) {
  const bytecode = proveCoreGroup(group, codeClasses);
  if (group.sealedClassNames) {
    const present = group.driverClassNames.filter(name => metadataClasses.get(name)?.permitsPresent).sort();
    assert.deepEqual(present, [...group.sealedClassNames].sort(), 'Exact genuine driver permits-attribute inventory');
  }
  return group.cases.map((entry, position) => {
    assert.ok(Array.isArray(entry.sealedProofs) && entry.sealedProofs.length > 0, 'Nonempty independent sealed proofs');
    const proofs = entry.sealedProofs.map(proof => {
      assert.notEqual(own(proof, 'className'), own(proof, 'payloadId'), 'Exactly one independent class/variant selector');
      const selected = proof.payloadId ?? proof.className, metadata = metadataClasses.get(selected);
      assert.ok(metadata, 'Actual independently selected metadata ' + selected);
      let evidence;
      if (proof.kind === 'class' || proof.kind === 'permitted-attribute') {
        assert.equal(metadata.flags & proof.flags.required, proof.flags.required, 'Required actual class access flags');
        assert.equal(metadata.flags & proof.flags.forbidden, 0, 'Forbidden actual class access flags');
        assert.equal(metadata.superName, proof.superName); assert.deepEqual(metadata.interfaceNames, proof.interfaceNames);
      }
      if (proof.kind === 'class') {
        if (proof.permits === null) assert.equal(metadata.permittedAttributes.length, 0, 'Actual absent PermittedSubclasses attribute');
        else {
          assert.equal(metadata.permittedAttributes.length, 1, 'Exact single genuine permits attribute');
          const attribute = metadata.permittedAttributes[0];
          assert.equal(attribute.nestedLengthMatches, true, 'Complete genuine permits count/length');
          assert.ok(attribute.entries.every(reference => reference.indexStatus === 'class' && !reference.isArray), 'Genuine nonarray permitted ClassCP entries');
          assert.deepEqual(attribute.entries.map(reference => reference.name), proof.permits, 'Exact original compiler permits metadata, not API array order');
        }
        evidence = {major: metadata.major, flags: metadata.flags, classReference: metadata.classReference,
          superReference: metadata.superReference, interfaceReferences: metadata.interfaceReferences,
          permittedAttributes: metadata.permittedAttributes};
        if (proof.passiveInitializer) {
          const initializer = metadata.methods.find(method => method.name === '<clinit>' && method.descriptor === '()V');
          assert.ok(initializer?.code, 'Actual genuine static initializer declaration');
          const target = proof.passiveInitializer;
          const call = initializer.code.instructions.find(instruction => instruction.name === 'invokestatic' &&
            instruction.cp.owner === target.owner && instruction.cp.name === target.name && instruction.cp.descriptor === target.descriptor);
          assert.ok(call, 'Actual initializer marker CP operand');
          let argument = null;
          if (own(target, 'argumentValue')) {
            argument = initializer.code.instructions[initializer.code.instructions.indexOf(call) - 1];
            assert.ok(argument && argument.pc + argument.length === call.pc, 'Actual immediately preceding marker argument');
            const argumentValue = argument.opcode >= 2 && argument.opcode <= 8 ? argument.opcode - 3 :
              argument.name === 'bipush' || argument.name === 'sipush' ? argument.value :
              ['ldc', 'ldc_w'].includes(argument.name) && argument.cp?.tag === 3 ? argument.cp.value : undefined;
            assert.equal(argumentValue, target.argumentValue, 'Exact decoded initializer marker argument');
          }
          evidence.passiveInitializer = {call, codeSha256: initializer.code.sha256,
            ...(argument ? {argument, argumentValue: target.argumentValue} : {}),
            staticDeclarationProven: true, fullInitializationConformanceProven: false};
        }
      } else if (proof.kind === 'permitted-attribute') {
        assert.equal(metadata.permittedAttributes.length, proof.attributeCount, 'Exact raw permits attribute count');
        assert.equal(proof.attributes.length, proof.attributeCount, 'Explicit raw attribute expectations');
        for (const [index, expected] of proof.attributes.entries()) {
          const actual = metadata.permittedAttributes[index];
          assert.equal(actual.length, expected.declaredLength); assert.equal(actual.numberOfClasses, expected.numberOfClasses);
          assert.equal(actual.entries.length, expected.entries.length);
          for (const [at, reference] of expected.entries.entries()) {
            for (const name of ['tag', 'name', 'internalName', 'indexStatus', 'isArray'])
              if (own(reference, name)) assert.equal(actual.entries[at][name], reference[name], 'Actual permitted ClassCP identity ' + name);
          }
          for (const name of ['nestedLengthMatches', 'missingEntryCount', 'extraBytesHex'])
            if (own(expected, name)) assert.equal(actual[name], expected[name], 'Actual bounded permits payload ' + name);
        }
        evidence = {major: metadata.major, flags: metadata.flags, classReference: metadata.classReference,
          superReference: metadata.superReference, interfaceReferences: metadata.interfaceReferences,
          permittedAttributes: metadata.permittedAttributes};
      } else if (proof.kind === 'method-code') {
        const method = metadata.methods.find(member => member.name === proof.name && member.descriptor === proof.descriptor);
        assert.ok(method?.code, 'Actual selected carrier Code');
        for (const opcode of proof.requiredOpcodes) assert.ok(method.code.instructions.some(instruction => instruction.name === opcode), 'Actual carrier opcode ' + opcode);
        evidence = {name: method.name, descriptor: method.descriptor, codeSha256: method.code.sha256,
          codeAttributeSha256: method.code.codeAttributeSha256, instructions: method.code.instructions,
          maxStack: method.code.maxStack, maxLocals: method.code.maxLocals};
      } else assert.fail('Known independent sealed proof kind');
      return {...proof, selectedMetadataSha256: metadata.sha256, evidence};
    });
    return {id: entry.id, bytecode: bytecode[position], sealedProofs: proofs,
      metadataRoute: entry.payloads?.length ? 'resource-only exact payload identity' : 'genuine direct compiler declarations',
      staticCallReachabilityProven: true, dynamicBranchCoverageProven: false, jitExecutionProven: false,
      fullSourceUnitConformanceProven: false, namedModuleRuntimeConformanceProven: false};
  });
}
