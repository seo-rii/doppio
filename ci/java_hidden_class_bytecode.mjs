import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode, inspectCoreClasses} from './java_core_bytecode.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const option = '[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const prefix = 'classes.modern_test.HiddenClass';
const resource = (method, descriptor, name, payload) => ({method, descriptor, name, payload});
const payload = (name, role, fields, methods) => ({name, role, fields, methods});
const field = (name, descriptor, flags) => ({name, descriptor, flags});
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};

// Independent literal payload/resource inventory. A case catalogue cannot
// silently omit a malformed payload, replace a resource or describe generated
// carrier bytes as original javac output.
export const hiddenPayloadContracts = freeze({
  'hidden-class-definition': {
    mainClass: prefix + 'DefinitionFinal',
    payloads: [
      payload(prefix + 'DefinitionFinal$Payload', 'accepted-class', [field('number', 'I', 0x12)],
        ['<init>()V', 'value()I', 'staticValue()I', '<clinit>()V']),
      payload(prefix + 'DefinitionFinal$InterfacePayload', 'accepted-interface', [], ['value()I']),
      payload(prefix + 'DefinitionFinal$BadSelf', 'hidden-verifier-rejection', [],
        ['<init>()V', 'self()Lclasses/modern_test/HiddenClassDefinitionFinal$BadSelf;']),
      payload('classes.modern_hidden_foreign.ForeignPayload', 'foreign-package-rejection', [],
        ['<init>()V', 'value()I'])
    ],
    resources: [
      resource('payload', '()[B', 'HiddenClassDefinitionFinal$Payload.class', prefix + 'DefinitionFinal$Payload'),
      resource('caseInterfaceDefinition', '()V', 'HiddenClassDefinitionFinal$InterfacePayload.class', prefix + 'DefinitionFinal$InterfacePayload'),
      resource('caseSelfReturnVerification', '()V', 'HiddenClassDefinitionFinal$BadSelf.class', prefix + 'DefinitionFinal$BadSelf'),
      resource('caseForeignPackageDenied', '()V', '/classes/modern_hidden_foreign/ForeignPayload.class', 'classes.modern_hidden_foreign.ForeignPayload')
    ]
  },
  'hidden-class-identity': {
    mainClass: prefix + 'IdentityFinal',
    payloads: [
      payload(prefix + 'IdentityFinal$Payload', 'accepted-class', [
        field('number', 'I', 1), field('ordinarySelf', 'Lclasses/modern_test/HiddenClassIdentityFinal$Payload;', 1),
        ...[['finalBoolean', 'Z'], ['finalByte', 'B'], ['finalChar', 'C'], ['finalShort', 'S'], ['finalInt', 'I'],
          ['finalLong', 'J'], ['finalFloat', 'F'], ['finalDouble', 'D'], ['finalReference', 'Ljava/lang/Object;']]
          .map(([name, descriptor]) => field(name, descriptor, 0x11))
      ], ['<init>()V', 'nominalSelf()Lclasses/modern_test/HiddenClassIdentityFinal$Payload;', 'mirror()Ljava/lang/Class;']),
      payload(prefix + 'IdentityFinal$NestPayload', 'accepted-nest-access-class', [], ['<init>()V', 'readSecret()J'])
    ],
    resources: [
      resource('define', '(' + option + ')' + lookup, 'HiddenClassIdentityFinal$Payload.class', prefix + 'IdentityFinal$Payload'),
      resource('defineNest', '(' + option + ')' + lookup, 'HiddenClassIdentityFinal$NestPayload.class', prefix + 'IdentityFinal$NestPayload')
    ]
  },
  'hidden-class-data': {
    mainClass: prefix + 'DataFinal',
    payloads: [payload(prefix + 'DataFinal$Payload', 'accepted-class-data-class', [],
      ['<init>()V', 'selfData()Ljava/lang/Object;', '<clinit>()V'])],
    resources: [resource('payload', '()[B', 'HiddenClassDataFinal$Payload.class', prefix + 'DataFinal$Payload')]
  }
});

function contract(group) {
  const expected = hiddenPayloadContracts[group.id];
  assert.ok(expected, 'Independent mandatory hidden payload group');
  assert.equal(group.mainClass, expected.mainClass);
  assert.deepEqual(group.hiddenPayloads, expected.payloads.map(item => item.name),
    'No missing/reordered/substituted hidden definition input');
  return expected;
}

function decodePayload(classFile, bytes, expected, mainClass) {
  assert.deepEqual(Object.keys(classFile).sort(), ['path', 'size', 'sha256', 'major', 'minor'].sort());
  assert.equal(classFile.path, expected.name.replaceAll('.', '/') + '.class');
  assert.equal(bytes.length, classFile.size); assert.equal(sha(bytes), classFile.sha256);
  assert.equal(bytes.readUInt16BE(6), classFile.major); assert.equal(bytes.readUInt16BE(4), classFile.minor);
  assert.ok([65, 69].includes(classFile.major) && classFile.minor === 0, 'Original non-preview21/25 payload');
  const layout = readStructureLayout(bytes), utf = index => {
    assert.equal(layout.pool[index]?.tag, 1); return layout.pool[index].value;
  };
  const className = index => {
    assert.equal(layout.pool[index]?.tag, 7); return utf(layout.pool[index].first).replaceAll('/', '.');
  };
  assert.equal(className(layout.thisClass), expected.name, 'Original named this_class, not hidden suffix rewriting');
  const fields = layout.fields.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags}));
  assert.deepEqual(fields.slice().sort((a, b) => a.name.localeCompare(b.name)),
    expected.fields.slice().sort((a, b) => a.name.localeCompare(b.name)), 'Original exact field/finality/descriptor inventory');
  assert.deepEqual(layout.methods.entries.map(item => item.name + item.descriptor).sort(), expected.methods.slice().sort(),
    'Original exact executable payload methods');
  assert.equal((layout.flags & 0x200) !== 0, expected.role === 'accepted-interface');
  const nest = layout.attributes.entries.filter(item => item.name === 'NestHost');
  assert.equal(nest.length, expected.role === 'foreign-package-rejection' ? 0 : 1);
  const originalNestHost = nest.length ? className(bytes.readUInt16BE(nest[0].body)) : null;
  if (nest.length) assert.equal(originalNestHost, mainClass, 'Original nest attribute must not become hidden authority');
  const methods = layout.methods.entries.map(method => {
    assert.ok(method.code, 'Every selected payload member has original Code');
    const raw = bytes.subarray(method.code.instructionsOffset, method.code.instructionsOffset + method.code.codeLength);
    const instructions = decodeCoreCode(raw, layout.pool, bytes);
    return {name: method.name, descriptor: method.descriptor, flags: method.flags,
      codeSha256: sha(raw), codeHex: raw.toString('hex'), instructions,
      maxStack: method.code.maxStack, maxLocals: method.code.maxLocals};
  });
  if (expected.role === 'hidden-verifier-rejection') {
    const self = methods.find(item => item.name === 'self');
    assert.equal(self.codeHex, '2ab0', 'Actual hidden-this return to unchanged ordinary N descriptor');
  }
  if (expected.name === prefix + 'IdentityFinal$Payload') {
    const mirror = methods.find(item => item.name === 'mirror');
    assert.ok(mirror.instructions.some(item => ['ldc', 'ldc_w'].includes(item.name) && item.cp?.index === layout.thisClass),
      'Actual ldc uses precisely original this_class entry');
    assert.equal(methods.find(item => item.name === 'nominalSelf').codeHex, '01b0', 'Ordinary return descriptor with null value');
  }
  if (expected.role === 'accepted-nest-access-class') {
    const method = methods.find(item => item.name === 'readSecret');
    const secret = method.instructions.find(item => item.name === 'getstatic' && item.cp?.owner === mainClass &&
      item.cp.name === 'secret' && item.cp.descriptor === 'J');
    const effect = method.instructions.find(item => item.name === 'putstatic' && item.cp?.owner === mainClass && item.cp.name === 'secretReads');
    assert.ok(secret && effect && secret.pc < effect.pc, 'Real private wide field read precedes effects');
  }
  if (expected.role === 'accepted-class-data-class') {
    const method = methods.find(item => item.name === 'selfData');
    assert.ok(method.instructions.some(item => item.name === 'invokestatic' && item.cp?.owner === 'java.lang.invoke.MethodHandles' &&
      item.cp.name === 'lookup' && item.cp.descriptor === '()' + lookup));
    assert.ok(method.instructions.some(item => item.name === 'invokestatic' && item.cp?.owner === 'java.lang.invoke.MethodHandles' &&
      item.cp.name === 'classData' && item.cp.descriptor === '(' + lookup + 'Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;'));
  }
  return {classFile, binaryName: expected.name, role: expected.role, originalThisClassIndex: layout.thisClass,
    originalNestHost, flags: layout.flags, fields, methods, originalBytesBase64: bytes.toString('base64')};
}

export function proveHiddenClassGroup(group, output, classFiles) {
  const expected = contract(group), classes = inspectCoreClasses(output, classFiles);
  const payloads = expected.payloads.map(item => {
    const classFile = classFiles.find(file => file.path === item.name.replaceAll('.', '/') + '.class');
    assert.ok(classFile, 'Original compiler payload file exists');
    return decodePayload(classFile, fs.readFileSync(path.join(output, classFile.path)), item, group.mainClass);
  });
  const resources = expected.resources.map(item => {
    const method = classes.get(group.mainClass).methods.get(item.method + item.descriptor);
    assert.ok(method, 'Actual original driver resource method');
    const instructions = method.instructions;
    const index = instructions.findIndex((ins, i) => ['ldc', 'ldc_w'].includes(ins.name) && ins.cp?.tag === 7 &&
      ins.cp.value === group.mainClass && ['ldc', 'ldc_w'].includes(instructions[i + 1]?.name) &&
      instructions[i + 1].cp?.tag === 8 && instructions[i + 1].cp.value === item.name &&
      instructions[i + 2]?.name === 'invokestatic' && instructions[i + 2].cp?.owner === 'classes.modern_test.HiddenClassSupport' &&
      instructions[i + 2].cp.name === 'bytes' && instructions[i + 2].cp.descriptor === '(Ljava/lang/Class;Ljava/lang/String;)[B');
    assert.ok(index >= 0, 'Exact adjacent anchor/resource/reader Code operands');
    const resolved = item.name.startsWith('/') ? item.name.slice(1) : group.mainClass.slice(0, group.mainClass.lastIndexOf('.') + 1)
      .replaceAll('.', '/') + item.name;
    assert.equal(resolved, item.payload.replaceAll('.', '/') + '.class');
    return {...item, driverClassFile: classes.get(group.mainClass).file, codeSha256: method.codeSha256,
      instructions: instructions.slice(index, index + 3), runtimePath: resolved};
  });
  return {schemaVersion: 1, group: group.id, payloads, resources, compilerBytesTransformed: false,
    runtimeNameSuffixComparison: false, dynamicBranchCoverageProven: false, fullHiddenClassConformanceProven: false};
}

export function assertHiddenClassProofs(record, group) {
  const expected = contract(group), proof = record.hiddenPayloadProofs;
  assert.deepEqual(Object.keys(proof || {}).sort(), ['schemaVersion', 'group', 'payloads', 'resources',
    'compilerBytesTransformed', 'runtimeNameSuffixComparison', 'dynamicBranchCoverageProven', 'fullHiddenClassConformanceProven'].sort());
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.group, group.id);
  for (const flag of ['compilerBytesTransformed', 'runtimeNameSuffixComparison', 'dynamicBranchCoverageProven', 'fullHiddenClassConformanceProven'])
    assert.equal(proof[flag], false);
  assert.equal(proof.payloads.length, expected.payloads.length); assert.equal(proof.resources.length, expected.resources.length);
  for (const [n, item] of proof.payloads.entries()) {
    assert.equal(typeof item.originalBytesBase64, 'string'); assert.ok(item.originalBytesBase64.length < 100000);
    const bytes = Buffer.from(item.originalBytesBase64, 'base64');
    assert.equal(bytes.toString('base64'), item.originalBytesBase64, 'Canonical original byte receipt');
    const classFile = record.classFiles.find(file => file.path === expected.payloads[n].name.replaceAll('.', '/') + '.class');
    assert.ok(classFile && classFile.major === record.release + 44);
    assert.deepEqual(item, decodePayload(classFile, bytes, expected.payloads[n], group.mainClass),
      'Independent original payload bytes replay rejects omitted or invented metadata/Code');
  }
  for (const [n, item] of proof.resources.entries()) {
    assert.deepEqual(Object.keys(item).sort(), ['method', 'descriptor', 'name', 'payload', 'driverClassFile',
      'codeSha256', 'instructions', 'runtimePath'].sort());
    for (const [key, value] of Object.entries(expected.resources[n])) assert.equal(item[key], value);
    assert.deepEqual(item.driverClassFile, record.classFiles.find(file => file.path === group.mainClass.replaceAll('.', '/') + '.class'));
    assert.match(item.codeSha256, /^[a-f0-9]{64}$/); assert.equal(item.instructions.length, 3);
    assert.equal(item.instructions[0].cp.value, group.mainClass); assert.equal(item.instructions[0].cp.tag, 7);
    assert.ok(['ldc', 'ldc_w'].includes(item.instructions[0].name));
    assert.equal(item.instructions[1].cp.value, item.name); assert.equal(item.instructions[1].cp.tag, 8);
    assert.ok(['ldc', 'ldc_w'].includes(item.instructions[1].name));
    assert.equal(item.instructions[1].pc, item.instructions[0].pc + item.instructions[0].length);
    assert.equal(item.instructions[2].pc, item.instructions[1].pc + item.instructions[1].length);
    assert.equal(item.instructions[2].name, 'invokestatic');
    assert.equal(item.instructions[2].cp.owner, 'classes.modern_test.HiddenClassSupport');
    assert.equal(item.instructions[2].cp.name, 'bytes');
    assert.equal(item.instructions[2].cp.descriptor, '(Ljava/lang/Class;Ljava/lang/String;)[B');
    assert.equal(item.runtimePath, item.payload.replaceAll('.', '/') + '.class');
  }
}
