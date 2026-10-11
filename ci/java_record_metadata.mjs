import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode, proveCoreGroup} from './java_core_bytecode.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const bootstrapDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;';

/** Bounded independent metadata evidence, not the guest parser or a verifier. */
export function readRecordClass(bytes) {
  const layout = readStructureLayout(bytes), pool = layout.pool;
  const utf = index => { assert.equal(pool[index]?.tag, 1, 'Actual UTF8 metadata index'); return pool[index].value; };
  const className = index => { assert.equal(pool[index]?.tag, 7, 'Actual Class metadata index'); return utf(pool[index].first).replaceAll('/', '.'); };
  const cursor = (start, end) => {
    let offset = start;
    const take = length => {
      assert.ok(Number.isInteger(length) && length >= 0 && offset + length <= end, 'Bounded nested metadata');
      const at = offset; offset += length; return at;
    };
    return {u1: () => bytes[take(1)], u2: () => bytes.readUInt16BE(take(2)),
      u4: () => bytes.readUInt32BE(take(4)), take, position: () => offset,
      finish: () => assert.equal(offset, end, 'Exact nested metadata length')};
  };
  const signature = attributes => {
    const found = attributes.filter(attribute => attribute.name === 'Signature');
    assert.ok(found.length <= 1, 'Unique Signature attribute');
    if (!found.length) return {signature: null, signatureIndex: null, signatureIndexOffset: null};
    assert.equal(found[0].length, 2, 'Exact Signature length');
    const index = bytes.readUInt16BE(found[0].body);
    return {signature: utf(index), signatureIndex: index, signatureIndexOffset: found[0].body};
  };
  const constant = (tag, index) => {
    const entry = pool[index]; assert.ok(entry, 'Annotation constant exists');
    if (tag === 's') return utf(index);
    if (tag === 'c') return {classDescriptor: utf(index)};
    if ('BCISZ'.includes(tag)) {
      assert.equal(entry.tag, 3); const value = bytes.readInt32BE(entry.start + 1);
      return tag === 'Z' ? value !== 0 : tag === 'C' ? String.fromCharCode(value) : value;
    }
    if (tag === 'J') { assert.equal(entry.tag, 5); return bytes.readBigInt64BE(entry.start + 1).toString(); }
    if (tag === 'F') { assert.equal(entry.tag, 4); return bytes.readFloatBE(entry.start + 1); }
    if (tag === 'D') { assert.equal(entry.tag, 6); return bytes.readDoubleBE(entry.start + 1); }
    assert.fail('Unknown annotation value tag ' + tag);
  };
  const annotation = reader => {
    const descriptor = utf(reader.u2()), count = reader.u2(), values = {};
    for (let i = 0; i < count; i++) {
      const name = utf(reader.u2()); assert.ok(!own(values, name), 'Unique annotation element');
      values[name] = value(reader);
    }
    return {descriptor, values};
  };
  const value = reader => {
    const tag = String.fromCharCode(reader.u1());
    if (tag === '@') return annotation(reader);
    if (tag === '[') return Array.from({length: reader.u2()}, () => value(reader));
    if (tag === 'e') return {enumType: utf(reader.u2()), constant: utf(reader.u2())};
    return constant(tag, reader.u2());
  };
  const annotations = (attributes, typeUse) => {
    const result = [];
    for (const visible of [true, false]) {
      const name = 'Runtime' + (visible ? 'Visible' : 'Invisible') + (typeUse ? 'TypeAnnotations' : 'Annotations');
      const found = attributes.filter(attribute => attribute.name === name);
      assert.ok(found.length <= 1, 'Unique annotation attribute');
      for (const attribute of found) {
        const reader = cursor(attribute.body, attribute.end), count = reader.u2();
        for (let i = 0; i < count; i++) {
          let targetType, target, typePath;
          if (typeUse) {
            targetType = reader.u1(); target = [];
            if ([0x00, 0x01, 0x16].includes(targetType)) target.push(reader.u1());
            else if ([0x10, 0x17, 0x42, 0x43, 0x44, 0x45, 0x46].includes(targetType)) target.push(reader.u2());
            else if ([0x11, 0x12].includes(targetType)) target.push(reader.u1(), reader.u1());
            else if ([0x40, 0x41].includes(targetType)) {
              const length = reader.u2();
              for (let item = 0; item < length; item++) target.push([reader.u2(), reader.u2(), reader.u2()]);
            } else if (targetType >= 0x47 && targetType <= 0x4b) target.push(reader.u2(), reader.u1());
            else assert.ok([0x13, 0x14, 0x15].includes(targetType), 'Known type-annotation target');
            typePath = Array.from({length: reader.u1()}, () => {
              const kind = reader.u1(), argument = reader.u1();
              assert.ok(kind <= 3 && (kind === 3 || argument === 0), 'Valid actual type path');
              return [kind, argument];
            });
          }
          result.push({...annotation(reader), visible,
            ...(typeUse ? {targetType, target, path: typePath} : {}), attributeOffset: attribute.start});
        }
        reader.finish();
      }
    }
    return result;
  };
  const memberMetadata = member => ({name: member.name, descriptor: member.descriptor, flags: member.flags,
    ...signature(member.attributes.entries), annotations: annotations(member.attributes.entries, false),
    typeAnnotations: annotations(member.attributes.entries, true), start: member.start, end: member.end});
  const fields = layout.fields.entries.map(memberMetadata);
  const methods = layout.methods.entries.map(method => {
    const result = memberMetadata(method);
    if (method.code) {
      const code = method.code, raw = bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength);
      result.code = {maxStack: code.maxStack, maxLocals: code.maxLocals, length: raw.length, sha256: sha(raw),
        instructions: decodeCoreCode(raw, pool, bytes)};
    }
    return result;
  });
  const recordAttributes = layout.attributes.entries.filter(attribute => attribute.name === 'Record');
  assert.ok(recordAttributes.length <= 1, 'Unique actual Record attribute');
  let record = null;
  if (recordAttributes.length) {
    const attribute = recordAttributes[0], reader = cursor(attribute.body, attribute.end), count = reader.u2();
    const components = Array.from({length: count}, () => {
      const start = reader.position(), nameIndex = reader.u2(), descriptorIndex = reader.u2(), attributes = [];
      const attributesCount = reader.u2();
      for (let i = 0; i < attributesCount; i++) {
        const at = reader.position(), name = reader.u2(), length = reader.u4(), body = reader.take(length);
        attributes.push({start: at, end: reader.position(), nameIndex: name, name: utf(name), length, body});
      }
      return {name: utf(nameIndex), descriptor: utf(descriptorIndex), nameIndex, descriptorIndex, start,
        end: reader.position(), attributes, ...signature(attributes), annotations: annotations(attributes, false),
        typeAnnotations: annotations(attributes, true)};
    });
    reader.finish(); record = {attributeOffset: attribute.start, attributeSha256: sha(bytes.subarray(attribute.start, attribute.end)), components};
  }
  const bootstrapAttributes = layout.attributes.entries.filter(attribute => attribute.name === 'BootstrapMethods');
  assert.ok(bootstrapAttributes.length <= 1, 'Unique BootstrapMethods');
  let bootstrapMethods = [];
  if (bootstrapAttributes.length) {
    const attribute = bootstrapAttributes[0], reader = cursor(attribute.body, attribute.end);
    bootstrapMethods = Array.from({length: reader.u2()}, (_, index) => ({index, methodRef: reader.u2(),
      arguments: Array.from({length: reader.u2()}, () => reader.u2())})); reader.finish();
  }
  return {name: className(layout.thisClass), major: bytes.readUInt16BE(6), flags: layout.flags,
    superName: bytes.readUInt16BE(layout.superClassOffset) === 0 ? null : className(bytes.readUInt16BE(layout.superClassOffset)),
    ...signature(layout.attributes.entries), record, fields, methods, bootstrapMethods, layout, bytes};
}

export function inspectRecordClasses(directory, files) {
  const classes = new Map();
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(directory, file.path));
    assert.equal(sha(bytes), file.sha256, 'Immutable independently inspected class bytes');
    const metadata = readRecordClass(bytes);
    assert.equal(file.path, metadata.name.replaceAll('.', '/') + '.class');
    assert.ok(!classes.has(metadata.name), 'Unique inspected class identity'); classes.set(metadata.name, metadata);
  }
  return classes;
}

const key = (owner, name, descriptor) => owner + '#' + name + descriptor;
function reachable(classes, owner, name, descriptor) {
  const found = new Set(), pending = [{owner, name, descriptor}];
  while (pending.length) {
    const target = pending.pop(), id = key(target.owner, target.name, target.descriptor);
    if (found.has(id)) continue;
    const method = classes.get(target.owner)?.methods.find(item => item.name === target.name && item.descriptor === target.descriptor);
    if (!method?.code) continue;
    found.add(id);
    for (const instruction of method.code.instructions) if ([182, 183, 184, 185].includes(instruction.opcode)) {
      const operand = instruction.cp;
      if (classes.has(operand.owner)) pending.push({owner: operand.owner, name: operand.name, descriptor: operand.descriptor});
    }
  }
  return found;
}

function annotationsMatch(actual, expected, typeUse) {
  assert.ok(Array.isArray(expected), 'Declarative annotation expectations');
  if (typeUse) for (const value of actual) assert.equal(value.targetType, 0x13, 'Component/field type-annotation target');
  const includeValues = expected.some(value => own(value, 'values'));
  const project = value => ({descriptor: value.descriptor, visible: value.visible,
    ...(typeUse ? {path: value.path} : {}), ...(includeValues ? {values: value.values || {}} : {})});
  const stable = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(stable) :
    Object.fromEntries(Object.keys(value).sort().map(name => [name, stable(value[name])])) : value;
  const normalized = values => values.map(value => JSON.stringify(stable(project(value)))).sort();
  assert.deepEqual(normalized(actual), normalized(expected), 'Exact sorted annotation multiset including actual type paths');
}

function matchMetadata(actual, expected) {
  for (const name of ['name', 'descriptor', 'signature']) assert.equal(actual[name], expected[name], 'Exact metadata ' + name);
  if (own(expected, 'annotations')) annotationsMatch(actual.annotations, expected.annotations, false);
  if (own(expected, 'typeAnnotations')) annotationsMatch(actual.typeAnnotations, expected.typeAnnotations, true);
  return {name: actual.name, descriptor: actual.descriptor, signature: actual.signature,
    signatureIndex: actual.signatureIndex, signatureIndexOffset: actual.signatureIndexOffset,
    annotations: actual.annotations, typeAnnotations: actual.typeAnnotations};
}

function objectMethodProof(metadata, method) {
  const pool = metadata.layout.pool, bytes = metadata.bytes, components = metadata.record.components;
  const utf = index => { assert.equal(pool[index]?.tag, 1); return pool[index].value; };
  const cls = index => { assert.equal(pool[index]?.tag, 7); return utf(pool[index].first).replaceAll('/', '.'); };
  const member = index => {
    const item = pool[index]; assert.ok([9, 10, 11].includes(item?.tag), 'Actual symbolic bootstrap member');
    const nt = pool[item.second]; assert.equal(nt?.tag, 12);
    return {cpIndex: index, tag: item.tag, owner: cls(item.first), name: utf(nt.first), descriptor: utf(nt.second)};
  };
  const handle = index => {
    const item = pool[index]; assert.equal(item?.tag, 15, 'Actual MethodHandle bootstrap operand');
    return {cpIndex: index, kind: bytes[item.start + 1], member: member(bytes.readUInt16BE(item.start + 2))};
  };
  const sites = method.code.instructions.filter(instruction => instruction.name === 'invokedynamic');
  assert.equal(sites.length, 1, 'One actual generated ObjectMethods invocation');
  const instruction = sites[0], cp = pool[instruction.cp.index]; assert.equal(cp?.tag, 18);
  const nt = pool[cp.second]; assert.equal(nt?.tag, 12);
  assert.equal(utf(nt.first), method.name);
  const ownerDescriptor = 'L' + metadata.name.replaceAll('.', '/') + ';';
  const siteDescriptor = '(' + ownerDescriptor + method.descriptor.slice(1);
  assert.equal(utf(nt.second), siteDescriptor, 'Exact generated receiver/argument/return site descriptor');
  const bootstrap = metadata.bootstrapMethods[cp.first]; assert.ok(bootstrap, 'Actual selected bootstrap index');
  const target = handle(bootstrap.methodRef);
  assert.equal(target.kind, 6, 'REF_invokeStatic ObjectMethods bootstrap');
  assert.deepEqual({...target.member, cpIndex: 0}, {cpIndex: 0, tag: 10, owner: 'java.lang.runtime.ObjectMethods',
    name: 'bootstrap', descriptor: bootstrapDescriptor});
  assert.equal(bootstrap.arguments.length, components.length + 2, 'Exact ordered component bootstrap operands');
  assert.equal(cls(bootstrap.arguments[0]), metadata.name);
  const namesConstant = pool[bootstrap.arguments[1]]; assert.equal(namesConstant?.tag, 8);
  assert.equal(utf(namesConstant.first), components.map(component => component.name).join(';'));
  const getters = bootstrap.arguments.slice(2).map((index, position) => {
    const result = handle(index), component = components[position];
    assert.equal(result.kind, 1, 'REF_getField component getter');
    assert.deepEqual({...result.member, cpIndex: 0}, {cpIndex: 0, tag: 9, owner: metadata.name,
      name: component.name, descriptor: component.descriptor});
    assert.ok(metadata.fields.some(field => field.name === component.name && field.descriptor === component.descriptor &&
      (field.flags & 0x0012) === 0x0012), 'Exact private final component field');
    return result;
  });
  return {pc: instruction.pc, invokeDynamicCpIndex: instruction.cp.index, siteDescriptor, bootstrapIndex: cp.first,
    bootstrap: target, recordClassCpIndex: bootstrap.arguments[0], componentNamesCpIndex: bootstrap.arguments[1], getters,
    selectedJavacFieldGetterShapeOnly: true, generalBootstrapConformanceProven: false};
}

/** Static byte evidence complements traces; it is not dynamic branch or JIT coverage. */
export function proveRecordGroup(group, metadataClasses, codeClasses, {payloadCase = null} = {}) {
  const bytecode = proveCoreGroup(payloadCase ? {...group, cases: [payloadCase]} : group, codeClasses);
  const actualRecords = [...metadataClasses.values()].filter(metadata => metadata.record).map(metadata => metadata.name).sort();
  if (!payloadCase) assert.deepEqual(actualRecords, [...group.recordClassNames].sort(), 'Exact genuine Record-class inventory');
  return (payloadCase ? [payloadCase] : group.cases).map((entry, index) => {
    const calls = reachable(metadataClasses, group.mainClass, entry.entryMethod, entry.entryDescriptor);
    assert.ok(Array.isArray(entry.recordProofs) && entry.recordProofs.length > 0, 'Nonempty independent Record proofs');
    const proofs = entry.recordProofs.map(proof => {
      const metadata = metadataClasses.get(proof.className); assert.ok(metadata, 'Actual proof class ' + proof.className);
      if (proof.kind === 'field') {
        const field = metadata.fields.find(item => item.name === proof.name && item.descriptor === proof.descriptor);
        assert.ok(field, 'Actual paired field'); return {...proof, evidence: matchMetadata(field, proof)};
      }
      assert.ok(metadata.record && metadata.superName === 'java.lang.Record', 'Actual record superclass and Record attribute');
      if (proof.kind === 'components') {
        if (own(proof, 'classSignature')) assert.equal(metadata.signature, proof.classSignature, 'Exact class generic signature');
        assert.equal(metadata.record.components.length, proof.components.length, 'Exact component count');
        let passiveInitializer;
        if (proof.passiveInitializer) {
          const initializer = metadata.methods.find(method => method.name === '<clinit>' && method.descriptor === '()V');
          assert.ok(initializer?.code, 'Actual passive record static initializer');
          const marker = proof.passiveInitializer;
          const call = initializer.code.instructions.find(instruction => instruction.name === 'invokestatic' &&
            instruction.cp.owner === marker.owner && instruction.cp.name === marker.name && instruction.cp.descriptor === marker.descriptor);
          assert.ok(call, 'Actual static initialization marker CP call');
          assert.ok(!calls.has(key(metadata.name, '<clinit>', '()V')), 'Passive initializer is not claimed as a direct call target');
          passiveInitializer = {descriptor: '()V', codeSha256: initializer.code.sha256, call,
            staticBodyDeclarationProven: true, dynamicInitializationExecutionProven: false};
        }
        return {...proof, evidence: {major: metadata.major, classSignature: metadata.signature,
          attributeSha256: metadata.record.attributeSha256,
          ...(passiveInitializer ? {passiveInitializer} : {}),
          components: proof.components.map((component, position) => matchMetadata(metadata.record.components[position], component))}};
      }
      const components = metadata.record.components;
      let name = proof.name, descriptor = proof.descriptor;
      if (proof.kind === 'canonical-constructor') { name = '<init>'; descriptor = '(' + components.map(item => item.descriptor).join('') + ')V'; }
      if (proof.kind === 'auxiliary-constructor') name = '<init>';
      if (proof.kind === 'accessor') {
        const component = components.find(item => item.name === name); assert.ok(component, 'Exact accessor component');
        descriptor = '()' + component.descriptor;
      }
      if (proof.kind === 'object-method') descriptor = {equals: '(Ljava/lang/Object;)Z', hashCode: '()I', toString: '()Ljava/lang/String;'}[name];
      assert.ok(descriptor, 'Exact method proof descriptor');
      const method = metadata.methods.find(item => item.name === name && item.descriptor === descriptor);
      assert.ok(method?.code, 'Actual executable record member');
      assert.ok(calls.has(key(metadata.name, name, descriptor)), 'Case reaches exact record proof method');
      let evidence;
      if (proof.kind === 'canonical-constructor') {
        const stores = method.code.instructions.filter(instruction => instruction.name === 'putfield' && instruction.cp.owner === metadata.name);
        assert.equal(stores.length, components.length, 'Every component is written exactly once in the canonical constructor');
        assert.deepEqual(stores.map(instruction => [instruction.cp.name, instruction.cp.descriptor]),
          components.map(component => [component.name, component.descriptor]), 'Exact own component field operands');
        let localIndex = 1;
        const parameters = components.map(component => {
          const result = {name: component.name, descriptor: component.descriptor, localIndex,
            words: ['J', 'D'].includes(component.descriptor) ? 2 : 1}; localIndex += result.words; return result;
        });
        assert.ok(method.code.maxLocals >= localIndex, 'Actual canonical category-two local capacity');
        evidence = {parameters, stores, maxLocals: method.code.maxLocals,
          transformedParameterExpressionsAllowed: true};
      } else if (proof.kind === 'accessor') {
        const component = components.find(item => item.name === name);
        const loads = method.code.instructions.filter(instruction => instruction.name === 'getfield');
        assert.equal(loads.length, 1, 'One implicit component load');
        assert.deepEqual([loads[0].cp.owner, loads[0].cp.name, loads[0].cp.descriptor], [metadata.name, name, component.descriptor]);
        const returnOpcode = ({J: 'lreturn', F: 'freturn', D: 'dreturn'})[component.descriptor] ||
          (/^[L[]/.test(component.descriptor) ? 'areturn' : 'ireturn');
        assert.equal(method.code.instructions.at(-1).name, returnOpcode, 'Component-specific return opcode');
        evidence = {load: loads[0], returnOpcode};
      } else if (proof.kind === 'object-method') evidence = objectMethodProof(metadata, method);
      else if (proof.kind === 'auxiliary-constructor') {
        const target = method.code.instructions.find(instruction => instruction.name === 'invokespecial' &&
          instruction.cp.owner === metadata.name && instruction.cp.name === '<init>' && instruction.cp.descriptor === proof.targetDescriptor);
        assert.ok(target, 'Actual auxiliary this-constructor dispatch'); evidence = {target};
      } else if (proof.kind === 'ordinary-method') {
        const objectBootstraps = method.code.instructions.filter(instruction => instruction.name === 'invokedynamic').filter(instruction => {
          const pool = metadata.layout.pool, site = pool[instruction.cp.index], bootstrap = metadata.bootstrapMethods[site.first];
          const handle = pool[bootstrap.methodRef], member = pool[metadata.bytes.readUInt16BE(handle.start + 2)];
          return pool[pool[member.first].first].value === 'java/lang/runtime/ObjectMethods';
        });
        assert.equal(objectBootstraps.length, 0, 'Explicit body is not silently counted as generated ObjectMethods');
        evidence = {codeSha256: method.code.sha256, instructions: method.code.instructions};
      } else assert.fail('Unknown Record proof kind ' + proof.kind);
      return {...proof, descriptor, evidence};
    });
    return {id: entry.id, bytecode: bytecode[index], recordProofs: proofs, staticCallReachabilityProven: true,
      staticCallReachabilityScope: 'driver main, case entry and declared executable probes',
      recordPayloadAccessRoute: payloadCase ? 'resource-only reflective metadata' : 'direct compiler calls',
      recordPayloadDirectCallsProven: !payloadCase,
      dynamicBranchCoverageProven: false, jitExecutionProven: false};
  });
}
