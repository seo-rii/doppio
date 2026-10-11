import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';

// Independent evidence reader, not the guest's decoder/verifier. Decode actual
// instruction boundaries before making any opcode, operand or call-graph claim.
export const coreOpcodeNames = (`nop aconst_null iconst_m1 iconst_0 iconst_1 iconst_2 iconst_3 iconst_4 iconst_5
 lconst_0 lconst_1 fconst_0 fconst_1 fconst_2 dconst_0 dconst_1 bipush sipush ldc ldc_w ldc2_w
 iload lload fload dload aload iload_0 iload_1 iload_2 iload_3 lload_0 lload_1 lload_2 lload_3
 fload_0 fload_1 fload_2 fload_3 dload_0 dload_1 dload_2 dload_3 aload_0 aload_1 aload_2 aload_3
 iaload laload faload daload aaload baload caload saload istore lstore fstore dstore astore
 istore_0 istore_1 istore_2 istore_3 lstore_0 lstore_1 lstore_2 lstore_3 fstore_0 fstore_1 fstore_2 fstore_3
 dstore_0 dstore_1 dstore_2 dstore_3 astore_0 astore_1 astore_2 astore_3 iastore lastore fastore dastore
 aastore bastore castore sastore pop pop2 dup dup_x1 dup_x2 dup2 dup2_x1 dup2_x2 swap
 iadd ladd fadd dadd isub lsub fsub dsub imul lmul fmul dmul idiv ldiv fdiv ddiv irem lrem frem drem
 ineg lneg fneg dneg ishl lshl ishr lshr iushr lushr iand land ior lor ixor lxor iinc
 i2l i2f i2d l2i l2f l2d f2i f2l f2d d2i d2l d2f i2b i2c i2s lcmp fcmpl fcmpg dcmpl dcmpg
 ifeq ifne iflt ifge ifgt ifle if_icmpeq if_icmpne if_icmplt if_icmpge if_icmpgt if_icmple if_acmpeq if_acmpne
 goto jsr ret tableswitch lookupswitch ireturn lreturn freturn dreturn areturn return
 getstatic putstatic getfield putfield invokevirtual invokespecial invokestatic invokeinterface invokedynamic
 new newarray anewarray arraylength athrow checkcast instanceof monitorenter monitorexit wide multianewarray
 ifnull ifnonnull goto_w jsr_w`).trim().split(/\s+/);
assert.equal(coreOpcodeNames.length, 202);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

export function decodeCoreCode(code, pool = [], classBytes = null) {
  assert.ok(Buffer.isBuffer(code) && code.length > 0 && code.length < 65536, 'Complete bounded Code bytes');
  const instructions = [];
  const need = (at, count) => assert.ok(at >= 0 && at + count <= code.length, 'Truncated instruction operand');
  const utf = index => { assert.equal(pool[index]?.tag, 1, 'CP UTF8 operand'); return pool[index].value; };
  const cls = index => { assert.equal(pool[index]?.tag, 7, 'CP Class operand'); return utf(pool[index].first).replaceAll('/', '.'); };
  const cpOperand = index => {
    const entry = pool[index];
    assert.ok(entry, `CP operand ${index} exists`);
    const result = {index, tag: entry.tag};
    if ([9, 10, 11].includes(entry.tag)) {
      const nt = pool[entry.second]; assert.equal(nt?.tag, 12, 'CP NameAndType operand');
      Object.assign(result, {owner: cls(entry.first), name: utf(nt.first), descriptor: utf(nt.second)});
    } else if (entry.tag === 8) result.value = utf(entry.first);
    else if (entry.tag === 7) result.value = cls(index);
    else if (classBytes && [3, 4, 5, 6].includes(entry.tag)) {
      const offset = entry.start + 1;
      result.value = entry.tag === 3 ? classBytes.readInt32BE(offset) : entry.tag === 4 ? classBytes.readFloatBE(offset) :
        entry.tag === 5 ? classBytes.readBigInt64BE(offset).toString() : classBytes.readDoubleBE(offset);
    }
    return result;
  };
  for (let pc = 0; pc < code.length;) {
    const opcode = code[pc], name = coreOpcodeNames[opcode];
    assert.ok(name, `Reserved instruction at ${pc}`);
    const item = {pc, opcode, name};
    let length = 1;
    if (opcode === 170 || opcode === 171) {
      const base = (pc + 4) & ~3;
      need(base, opcode === 170 ? 12 : 8);
      item.defaultOffset = code.readInt32BE(base); item.defaultTarget = pc + item.defaultOffset;
      item.keys = []; item.targets = [];
      if (opcode === 170) {
        item.low = code.readInt32BE(base + 4); item.high = code.readInt32BE(base + 8);
        const count = item.high - item.low + 1;
        assert.ok(count > 0 && count <= (code.length - base - 12) / 4, 'Bounded tableswitch');
        for (let n = 0; n < count; n++) {
          item.keys.push(item.low + n); item.targets.push(pc + code.readInt32BE(base + 12 + n * 4));
        }
        length = base + 12 + count * 4 - pc;
      } else {
        const count = code.readInt32BE(base + 4);
        assert.ok(count >= 0 && count <= (code.length - base - 8) / 8, 'Bounded lookupswitch');
        for (let n = 0; n < count; n++) {
          item.keys.push(code.readInt32BE(base + 8 + n * 8));
          item.targets.push(pc + code.readInt32BE(base + 12 + n * 8));
        }
        assert.ok(item.keys.every((key, i) => i === 0 || key > item.keys[i - 1]), 'Ordered lookup keys');
        length = base + 8 + count * 8 - pc;
      }
    } else if (opcode === 196) {
      need(pc, 4);
      const modified = code[pc + 1];
      assert.ok([21, 22, 23, 24, 25, 54, 55, 56, 57, 58, 132, 169].includes(modified), 'Valid wide instruction');
      item.modifiedOpcode = coreOpcodeNames[modified]; item.localIndex = code.readUInt16BE(pc + 2);
      if (modified === 132) { length = 6; need(pc, length); item.increment = code.readInt16BE(pc + 4); }
      else length = 4;
    } else if (opcode === 16 || opcode === 18 || (opcode >= 21 && opcode <= 25) ||
      (opcode >= 54 && opcode <= 58) || opcode === 169 || opcode === 188) length = 2;
    else if (opcode === 17 || opcode === 19 || opcode === 20 || opcode === 132 ||
      (opcode >= 153 && opcode <= 168) || (opcode >= 178 && opcode <= 184) ||
      [187, 189, 192, 193, 198, 199].includes(opcode)) length = 3;
    else if (opcode === 197) length = 4;
    else if ([185, 186, 200, 201].includes(opcode)) length = 5;
    need(pc, length); item.length = length;
    if (opcode === 16) item.value = code.readInt8(pc + 1);
    if (opcode === 17) item.value = code.readInt16BE(pc + 1);
    if ((opcode >= 21 && opcode <= 25) || (opcode >= 54 && opcode <= 58) || opcode === 169 || opcode === 132)
      item.localIndex = code[pc + 1];
    if (opcode === 132) item.increment = code.readInt8(pc + 2);
    if ((opcode >= 153 && opcode <= 168) || opcode === 198 || opcode === 199) item.branchOffset = code.readInt16BE(pc + 1);
    if (opcode === 200 || opcode === 201) item.branchOffset = code.readInt32BE(pc + 1);
    if (item.branchOffset !== undefined) item.branchTarget = pc + item.branchOffset;
    if (opcode === 18 || opcode === 19 || opcode === 20 || (opcode >= 178 && opcode <= 189 && opcode !== 188) ||
      opcode === 192 || opcode === 193 || opcode === 197) item.cp = cpOperand(opcode === 18 ? code[pc + 1] : code.readUInt16BE(pc + 1));
    if (opcode === 197) item.dimensions = code[pc + 3];
    if (opcode === 188) item.arrayType = code[pc + 1];
    instructions.push(item); pc += length;
  }
  const boundaries = new Set(instructions.map(item => item.pc));
  for (const item of instructions) for (const target of [item.branchTarget, item.defaultTarget, ...(item.targets || [])]) {
    if (target !== undefined) assert.ok(boundaries.has(target), 'Branch target must be an instruction boundary');
  }
  return instructions;
}

export function inspectCoreClasses(directory, files) {
  const classes = new Map();
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(directory, file.path));
    assert.equal(sha(bytes), file.sha256, 'Original class hash');
    const layout = readStructureLayout(bytes);
    const self = layout.pool[layout.thisClass]; assert.equal(self?.tag, 7);
    const name = layout.pool[self.first].value.replaceAll('/', '.');
    assert.equal(file.path, name.replaceAll('.', '/') + '.class', 'Actual class binary name');
    const methods = new Map();
    for (const method of layout.methods.entries) if (method.code) {
      const code = method.code, raw = bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength);
      const instructions = decodeCoreCode(raw, layout.pool, bytes), handlers = [];
      for (let h = 0; h < code.handlerCount; h++) {
        const offset = code.handlersOffset + h * 8, index = bytes.readUInt16BE(offset + 6);
        handlers.push({start: bytes.readUInt16BE(offset), end: bytes.readUInt16BE(offset + 2), target: bytes.readUInt16BE(offset + 4),
          catchType: index === 0 ? null : layout.pool[layout.pool[index].first].value.replaceAll('/', '.')});
      }
      const key = method.name + method.descriptor;
      assert.ok(!methods.has(key), 'Unique method signature');
      methods.set(key, {name: method.name, descriptor: method.descriptor, flags: method.flags, codeSha256: sha(raw),
        maxStack: code.maxStack, maxLocals: code.maxLocals, codeLength: raw.length, instructions, handlers});
    }
    assert.ok(!classes.has(name), 'Unique class name'); classes.set(name, {file, methods});
  }
  return classes;
}

// This is STATIC call reachability and decoded bytes, not branch coverage, JIT
// execution coverage, or a proof that an entire source-index unit is satisfied.
export function proveCoreGroup(group, classes) {
  const key = (owner, method, descriptor) => owner + '#' + method + descriptor;
  const lookup = (owner, method, descriptor) => classes.get(owner)?.methods.get(method + descriptor);
  const reachable = (owner, method, descriptor) => {
    const found = new Set(), edges = [], pending = [{owner, method, descriptor}];
    while (pending.length) {
      const call = pending.pop(), id = key(call.owner, call.method, call.descriptor);
      if (found.has(id)) continue;
      const body = lookup(call.owner, call.method, call.descriptor);
      if (!body) continue;
      found.add(id);
      for (const ins of body.instructions) if ([182, 183, 184, 185].includes(ins.opcode)) {
        const cp = ins.cp;
        assert.ok([10, 11].includes(cp.tag), 'Actual method-call CP tag');
        if (lookup(cp.owner, cp.name, cp.descriptor)) {
          edges.push({from: id, pc: ins.pc, opcode: ins.name, cp});
          pending.push({owner: cp.owner, method: cp.name, descriptor: cp.descriptor});
        }
      }
    }
    return {found, edges};
  };
  assert.ok(lookup(group.mainClass, 'main', '([Ljava/lang/String;)V'), 'Genuine main method');
  const main = reachable(group.mainClass, 'main', '([Ljava/lang/String;)V');
  return group.cases.map(entry => {
    const entryKey = key(group.mainClass, entry.entryMethod, entry.entryDescriptor);
    assert.ok(main.found.has(entryKey), `Main reaches ${entry.id}`);
    const calls = reachable(group.mainClass, entry.entryMethod, entry.entryDescriptor);
    const proofs = entry.probes.map(probe => {
      assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 &&
        probe.requiredOpcodes.every(opcode => typeof opcode === 'string' && coreOpcodeNames.includes(opcode)),
      `Nonempty known opcode obligations ${entry.id}:${probe.method}`);
      const owner = probe.className || group.mainClass;
      assert.ok(calls.found.has(key(owner, probe.method, probe.descriptor)), `Entry reaches probe ${entry.id}:${probe.method}`);
      const method = lookup(owner, probe.method, probe.descriptor), matches = [];
      for (const opcode of probe.requiredOpcodes) {
        assert.ok(coreOpcodeNames.includes(opcode), `Known required opcode ${opcode}`);
        const match = method.instructions.find(ins => ins.name === opcode || ins.modifiedOpcode === opcode);
        assert.ok(match, `Decoded opcode ${entry.id}:${probe.method}:${opcode}`); matches.push(match);
      }
      for (const constraint of probe.wide || []) {
        const match = method.instructions.find(ins => ins.name === 'wide' && ins.modifiedOpcode === constraint.opcode &&
          ins.localIndex >= constraint.minIndex && (constraint.increment === undefined || ins.increment === constraint.increment));
        assert.ok(match, `Actual wide operands ${entry.id}:${probe.method}`); matches.push(match);
      }
      for (const constraint of probe.constantLoads || []) {
        const match = method.instructions.find(ins => ins.name === constraint.opcode && ins.cp?.index >= constraint.minCpIndex &&
          ins.cp.value === constraint.value);
        assert.ok(match, `Actual constant operand ${entry.id}:${probe.method}`); matches.push(match);
      }
      for (const constraint of probe.branches || []) {
        const match = method.instructions.find(ins => ins.name === constraint.opcode && Math.abs(ins.branchOffset) >= constraint.minDistance &&
          (constraint.direction === 'forward' ? ins.branchOffset > 0 : ins.branchOffset < 0));
        assert.ok(match, `Actual branch operand ${entry.id}:${probe.method}`); matches.push(match);
      }
      const opcodeCounts = {};
      for (const ins of method.instructions) opcodeCounts[ins.name] = (opcodeCounts[ins.name] || 0) + 1;
      return {owner, method: probe.method, descriptor: probe.descriptor, classFile: classes.get(owner).file,
        codeSha256: method.codeSha256, codeLength: method.codeLength, maxStack: method.maxStack, maxLocals: method.maxLocals,
        matches, opcodeCounts, handlers: method.handlers};
    });
    return {id: entry.id, entry: entryKey, staticCallEdges: calls.edges, probes: proofs,
      dynamicBranchCoverageProven: false, jitExecutionProven: false};
  });
}
