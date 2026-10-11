import {BytecodeMethodInput, DecodedMethod, DecodedInstruction, BytecodeVerificationError, BytecodeFormatError} from './BytecodeVerifier';
import {IVerificationTypeInfo} from './attributes';
import {ClassReference, DynamicConstant, IConstantPoolReference, InvokeDynamic} from './ConstantPool';
import {ConstantPoolItemType as CP, StackMapTableEntryType as Frame} from './enums';
import {getTypes} from './util';

/** Reference unions are only used by the legacy inference verifier. They retain
 * every possible incoming type until a use can be checked with loader metadata.
 */
type Value = string | ReadonlyArray<string>;
interface State { locals: Value[]; stack: Value[]; uninitializedThis: boolean; }

export interface VerificationObligation {
  kind: 'assignable' | 'protected' | 'special-owner' | 'declared-field';
  pc: number;
  sourceType: string;
  targetType: string;
  memberName?: string;
  memberDescriptor?: string;
  opcode?: number;
}

export interface TypeVerificationResult {
  obligations: VerificationObligation[];
  policy: 'stack-map' | 'inference';
  checkedInstructions: number;
}

/** Pure type checking. Obligations MUST be discharged by the linking layer;
 * a successful result alone is not permission to execute a class.
 */
export function verifyMethodTypes(input: BytecodeMethodInput, decoded: DecodedMethod): TypeVerificationResult {
  var maxLocals = input.declaredCode.getMaxLocals(), maxStack = input.declaredCode.getMaxStack();
  var methodTypes = getTypes(input.descriptor), returnType = methodTypes.pop();
  var modern = input.majorVersion >= 51;
  var obligations: VerificationObligation[] = [], obligationKeys: {[key: string]: boolean} = Object.create(null);
  var checked: {[pc: number]: boolean} = Object.create(null);
  var label = input.className + '.' + input.name + input.descriptor;
  function fail(pc: number, message: string): never { throw new BytecodeVerificationError(label + ' at bytecode ' + pc + ': ' + message); }
  function format(message: string): never { throw new BytecodeFormatError(label + ': ' + message); }
  function normalized(type: string): string { return 'BCISZ'.indexOf(type) !== -1 && type.length === 1 ? 'int' :
    type === 'F' ? 'float' : type === 'J' ? 'long' : type === 'D' ? 'double' : type; }
  function wide(type: Value): boolean { return type === 'long' || type === 'double'; }
  function width(type: Value): number { return wide(type) ? 2 : 1; }
  function ref(type: Value): boolean { return typeof type !== 'string' || type[0] === 'L' || type[0] === '['; }
  function uninit(type: Value): boolean { return type === 'uninitializedThis' || typeof type === 'string' && type.indexOf('new:') === 0; }
  function address(type: Value): boolean { return typeof type === 'string' && type.indexOf('address:') === 0; }
  function alternatives(type: Value): ReadonlyArray<string> { return typeof type === 'string' ? [type] : type; }
  function equal(a: Value, b: Value): boolean { return a === b || JSON.stringify(a) === JSON.stringify(b); }
  function copy(state: State): State { return {locals: state.locals.slice(), stack: state.stack.slice(), uninitializedThis: state.uninitializedThis}; }
  function obligation(entry: VerificationObligation): void {
    var key = JSON.stringify(entry);
    if (!obligationKeys[key]) { obligationKeys[key] = true; obligations.push(entry); }
  }
  function assign(actual: Value, expected: Value, pc: number): void {
    // Top may discard either word of a value in a declared frame, but it is
    // not itself a usable category-1 operand (see words below).
    if (equal(actual, expected) || expected === 'top') return;
    if (expected === 'tail' || actual === 'tail') fail(pc, 'Incompatible category-2 local slots');
    if (ref(expected) && actual === 'null') return;
    if (ref(actual) && ref(expected) && typeof expected === 'string') {
      alternatives(actual).forEach(source => {
        if (source !== expected && expected !== 'Ljava/lang/Object;') obligation({kind: 'assignable', pc, sourceType: source, targetType: expected});
      });
      return;
    }
    fail(pc, 'Incompatible verification types ' + JSON.stringify(actual) + ' -> ' + JSON.stringify(expected));
  }
  function wordTypes(types: Value[]): Value[] {
    var result: Value[] = [];
    types.forEach(type => { result.push(type); if (wide(type)) result.push('tail'); });
    return result;
  }
  function slots(types: Value[]): Value[] {
    var result = wordTypes(types);
    if (result.length > maxLocals) format('StackMapTable locals exceed max_locals');
    while (result.length < maxLocals) result.push('top');
    return result;
  }
  var initialValues: Value[] = methodTypes.map(normalized);
  var constructor = input.name === '<init>' && input.className !== 'Ljava/lang/Object;';
  if ((input.declaredAccessFlags & 8) === 0) initialValues.unshift(constructor ? 'uninitializedThis' : input.className);
  var initial: State = {locals: slots(initialValues), stack: [], uninitializedThis: constructor};
  function frameType(type: IVerificationTypeInfo, pc: number): Value {
    switch (type.tag) {
      case 0: return 'top';
      case 1: return 'int';
      case 2: return 'float';
      case 3: return 'double';
      case 4: return 'long';
      case 5: return 'null';
      case 6:
        if (!constructor) fail(pc, 'UninitializedThis outside an instance initializer');
        return 'uninitializedThis';
      case 7: return type.className;
      case 8: return 'new:' + type.newOffset;
      default: return format('Invalid StackMapTable verification type');
    }
  }
  function stackSize(stack: Value[]): number { return stack.reduce((size: number, type: Value) => size + width(type), 0); }
  function checkLimit(state: State, pc: number): void { if (stackSize(state.stack) > maxStack) fail(pc, 'Operand stack exceeds max_stack'); }
  // Method entry uses the implicit initial state, but even PC 0 needs an
  // explicitly declared frame when reached as a branch or handler target.
  var frames: {[pc: number]: State} = Object.create(null);
  if (modern) {
    var currentLocals = initialValues.slice();
    decoded.stackMapFrames.forEach(frame => {
      var entry = frame.entry, stack: Value[] = [];
      if (entry.type === Frame.CHOP_FRAME) {
        if (entry.k > currentLocals.length) format('StackMapTable chop underflows locals');
        currentLocals = currentLocals.slice(0, currentLocals.length - entry.k);
      } else if (entry.type === Frame.APPEND_FRAME) {
        currentLocals = currentLocals.concat((entry.localsTypes || []).map(type => frameType(type, frame.pc)));
      } else if (entry.type === Frame.FULL_FRAME) {
        currentLocals = (entry.localsTypes || []).map(type => frameType(type, frame.pc));
      }
      if (entry.stackTypes) stack = entry.stackTypes.map(type => frameType(type, frame.pc));
      // StackMapTable has no independent flag field: only an uninitializedThis
      // local represents flagThisUninit, not a value solely on the stack.
      var state = {locals: slots(currentLocals), stack, uninitializedThis: currentLocals.indexOf('uninitializedThis') !== -1};
      if (stackSize(stack) > maxStack) format('StackMapTable stack exceeds max_stack');
      frames[frame.pc] = state;
    });
  }
  function match(actual: State, expected: State, pc: number): void {
    var actualWords = wordTypes(actual.stack), expectedWords = wordTypes(expected.stack);
    if (actualWords.length !== expectedWords.length) fail(pc, 'Inconsistent operand stack height');
    actualWords.forEach((type, index) => assign(type, expectedWords[index], pc));
    actual.locals.forEach((type, index) => assign(type, expected.locals[index], pc));
    if (actual.uninitializedThis && !expected.uninitializedThis) fail(pc, 'Constructor initialization state lost at a frame');
  }
  function initializedReference(type: Value, pc: number): void { if (type !== 'null' && !ref(type)) fail(pc, 'Expected initialized reference'); }
  function step(instruction: DecodedInstruction, before: State, context: number[]): State {
    var state = copy(before), pc = instruction.pc, op = instruction.opcode;
    checked[pc] = true;
    function pop(expected?: Value): Value {
      if (state.stack.length === 0) fail(pc, 'Operand stack underflow');
      var value = state.stack.pop();
      if (expected !== undefined) assign(value, expected, pc);
      return value;
    }
    function push(value: Value): void { state.stack.push(value); checkLimit(state, pc); }
    function reference(allowUninitialized: boolean = false, allowAddress: boolean = false): Value {
      var value = pop();
      if (!(allowUninitialized && uninit(value)) && !(allowAddress && address(value))) initializedReference(value, pc);
      return value;
    }
    function clearSlot(index: number): void {
      if (state.locals[index] === 'tail' && index > 0) state.locals[index - 1] = 'top';
      if (wide(state.locals[index]) && index + 1 < maxLocals) state.locals[index + 1] = 'top';
      state.locals[index] = 'top';
    }
    function store(index: number, value: Value): void {
      clearSlot(index);
      if (wide(value)) { clearSlot(index + 1); state.locals[index + 1] = 'tail'; }
      state.locals[index] = value;
    }
    function load(index: number, expected: string): void {
      var value = state.locals[index];
      if (expected === 'reference') {
        if (!uninit(value)) initializedReference(value, pc);
      } else assign(value, expected, pc);
      if (wide(value) && state.locals[index + 1] !== 'tail') fail(pc, 'Broken category-2 local');
      push(value);
    }
    function words(count: number): Value[] {
      var values: Value[] = [], remaining = count;
      while (remaining > 0) {
        var value = pop();
        if (value === 'top' || value === 'tail') fail(pc, 'Unusable type in stack manipulation');
        remaining -= width(value); values.unshift(value);
      }
      if (remaining !== 0) fail(pc, 'Invalid category-2 stack manipulation');
      return values;
    }
    function append(values: Value[]): void { values.forEach(push); }
    var value: Value, other: Value, first: Value[], second: Value[], index: number, type: string;
    if (op === 0) return state;
    if (op === 1) push('null');
    else if (op >= 2 && op <= 8 || op === 0x10 || op === 0x11) push('int');
    else if (op === 9 || op === 10) push('long');
    else if (op >= 11 && op <= 13) push('float');
    else if (op === 14 || op === 15) push('double');
    else if (op >= 0x12 && op <= 0x14) {
      var constant = input.constantPool.get(instruction.cpIndex);
      switch (constant.getType()) {
        case CP.INTEGER: type = 'int'; break;
        case CP.FLOAT: type = 'float'; break;
        case CP.LONG: type = 'long'; break;
        case CP.DOUBLE: type = 'double'; break;
        case CP.STRING: type = 'Ljava/lang/String;'; break;
        case CP.CLASS: type = 'Ljava/lang/Class;'; break;
        case CP.METHOD_TYPE: type = 'Ljava/lang/invoke/MethodType;'; break;
        case CP.METHOD_HANDLE: type = 'Ljava/lang/invoke/MethodHandle;'; break;
        case CP.DYNAMIC: type = normalized((<DynamicConstant> constant).nameAndTypeInfo.descriptor); break;
        default: return fail(pc, 'Invalid constant load');
      }
      push(type);
    } else if (op >= 0x15 && op <= 0x2d) {
      index = op <= 0x19 ? op - 0x15 : Math.floor((op - 0x1a) / 4);
      load(instruction.localIndex, ['int', 'long', 'float', 'double', 'reference'][index]);
    } else if (op >= 0x36 && op <= 0x4e) {
      index = op <= 0x3a ? op - 0x36 : Math.floor((op - 0x3b) / 4);
      value = index === 4 ? reference(true, true) : pop(['int', 'long', 'float', 'double'][index]);
      store(instruction.localIndex, value);
    } else if (op >= 0x2e && op <= 0x35 || op >= 0x4f && op <= 0x56) {
      var isStore = op >= 0x4f, arrayKind = op - (isStore ? 0x4f : 0x2e);
      var element = ['int', 'long', 'float', 'double', 'reference', 'int', 'int', 'int'][arrayKind];
      value = isStore ? element === 'reference' ? reference() : pop(element) : null;
      pop('int');
      var array = reference(), components: string[] = [];
      if (array === 'null') components.push(arrayKind === 4 ? 'null' : element);
      else alternatives(array).forEach(arrayType => {
        var component = arrayType.substring(1), primitive = ['I', 'J', 'F', 'D', '', 'BZ', 'C', 'S'][arrayKind];
        if (arrayType[0] !== '[' || (arrayKind === 4 ? !ref(component) : component.length !== 1 || primitive.indexOf(component) === -1)) {
          fail(pc, 'Array opcode does not match component type');
        }
        components.push(normalized(component));
      });
      // aastore performs its covariant value check at run time, not verification.
      if (!isStore) push(components.length === 1 ? components[0] : Array.from(new Set(components)));
    } else if (op >= 0x57 && op <= 0x5f) {
      switch (op) {
        case 0x57: words(1); break;
        case 0x58: words(2); break;
        case 0x59: first = words(1); append(first.concat(first)); break;
        case 0x5a: first = words(1); second = words(1); append(first.concat(second, first)); break;
        case 0x5b: first = words(1); second = words(2); append(first.concat(second, first)); break;
        case 0x5c: first = words(2); append(first.concat(first)); break;
        case 0x5d: first = words(2); second = words(1); append(first.concat(second, first)); break;
        case 0x5e: first = words(2); second = words(2); append(first.concat(second, first)); break;
        case 0x5f: first = words(1); second = words(1); append(first.concat(second)); break;
      }
    } else if (op >= 0x60 && op <= 0x77) {
      type = ['int', 'long', 'float', 'double'][(op - 0x60) % 4];
      pop(type); if (op < 0x74) pop(type); push(type);
    } else if (op >= 0x78 && op <= 0x83) {
      type = op % 2 === 0 ? 'int' : 'long';
      pop(op < 0x7e ? 'int' : type); pop(type); push(type);
    } else if (op === 0x84) assign(state.locals[instruction.localIndex], 'int', pc);
    else if (op >= 0x85 && op <= 0x93) {
      var conversion = [['int','long'],['int','float'],['int','double'],['long','int'],['long','float'],['long','double'],
        ['float','int'],['float','long'],['float','double'],['double','int'],['double','long'],['double','float'],
        ['int','int'],['int','int'],['int','int']][op - 0x85];
      pop(conversion[0]); push(conversion[1]);
    } else if (op >= 0x94 && op <= 0x98) {
      type = op === 0x94 ? 'long' : op < 0x97 ? 'float' : 'double'; pop(type); pop(type); push('int');
    } else if (op >= 0x99 && op <= 0x9e || op === 0xaa || op === 0xab) pop('int');
    else if (op >= 0x9f && op <= 0xa4) { pop('int'); pop('int'); }
    else if (op === 0xa5 || op === 0xa6) { reference(true); reference(true); }
    else if (op === 0xc6 || op === 0xc7) reference(true);
    else if (op === 0xa7 || op === 0xc8) { /* No stack transition. */ }
    else if (op === 0xa8 || op === 0xc9) push('address:' + instruction.returnAddressPC);
    else if (op === 0xa9) {
      if (context.length === 0 || state.locals[instruction.localIndex] !== 'address:' + context[context.length - 1]) fail(pc, 'ret does not match the current subroutine');
    } else if (op >= 0xac && op <= 0xb1) {
      var expectedReturn = normalized(returnType);
      if (op === 0xb1) { if (returnType !== 'V') fail(pc, 'Void return in non-void method'); }
      else if (op === 0xb0) {
        if (!ref(expectedReturn)) fail(pc, 'Reference return in non-reference method');
        assign(reference(), expectedReturn, pc);
      } else {
        type = ['int','long','float','double'][op - 0xac];
        if (type !== expectedReturn) fail(pc, 'Return opcode does not match descriptor'); pop(type);
      }
      if (state.uninitializedThis) fail(pc, 'Constructor returns before initialization');
    } else if (op >= 0xb2 && op <= 0xb5) {
      var field = <IConstantPoolReference> input.constantPool.get(instruction.cpIndex), fieldType = normalized(field.nameAndTypeInfo.descriptor);
      if (op === 0xb3 || op === 0xb5) pop(fieldType);
      if (op === 0xb4 || op === 0xb5) {
        value = reference(op === 0xb5);
        if (value === 'uninitializedThis' && field.classInfo.name === input.className) {
          obligation({kind: 'declared-field', pc, sourceType: input.className, targetType: input.className,
            memberName: field.nameAndTypeInfo.name, memberDescriptor: field.nameAndTypeInfo.descriptor, opcode: op});
        } else {
          assign(value, field.classInfo.name, pc);
          alternatives(value).forEach(receiver => obligation({kind: 'protected', pc, sourceType: receiver, targetType: field.classInfo.name,
            memberName: field.nameAndTypeInfo.name, memberDescriptor: field.nameAndTypeInfo.descriptor, opcode: op}));
        }
      }
      if (op === 0xb2 || op === 0xb4) push(fieldType);
    } else if (op >= 0xb6 && op <= 0xba) {
      var method = <IConstantPoolReference | InvokeDynamic> input.constantPool.get(instruction.cpIndex);
      var invocation = getTypes(method.nameAndTypeInfo.descriptor), result = invocation.pop();
      for (index = invocation.length - 1; index >= 0; index--) pop(normalized(invocation[index]));
      if (op !== 0xb8 && op !== 0xba) {
        var owner = (<IConstantPoolReference> method).classInfo.name;
        if (op === 0xb7 && method.nameAndTypeInfo.name === '<init>') {
          value = reference(true);
          if (!uninit(value)) fail(pc, 'Constructor receiver is already initialized');
          var initialized = value === 'uninitializedThis' ? input.className : decoded.newSites[Number((<string> value).slice(4))];
          if (value === 'uninitializedThis' ? owner !== input.className && owner !== input.superClassName : owner !== initialized) {
            fail(pc, 'Constructor does not match the uninitialized receiver');
          }
          if (value !== 'uninitializedThis') obligation({kind: 'protected', pc, sourceType: initialized, targetType: owner,
            memberName: method.nameAndTypeInfo.name, memberDescriptor: method.nameAndTypeInfo.descriptor, opcode: op});
          state.locals = state.locals.map(local => local === value ? initialized : local);
          state.stack = state.stack.map(item => item === value ? initialized : item);
          if (value === 'uninitializedThis') state.uninitializedThis = false;
        } else {
          value = reference(); assign(value, op === 0xb7 ? input.className : owner, pc);
          if (op === 0xb7) obligation({kind: 'special-owner', pc, sourceType: input.className, targetType: owner,
            memberName: method.nameAndTypeInfo.name, memberDescriptor: method.nameAndTypeInfo.descriptor, opcode: op});
          if (op !== 0xb9) alternatives(value).forEach(receiver => obligation({kind: 'protected', pc, sourceType: receiver, targetType: owner,
            memberName: method.nameAndTypeInfo.name, memberDescriptor: method.nameAndTypeInfo.descriptor, opcode: op}));
        }
      }
      if (result !== 'V') push(normalized(result));
    } else if (op === 0xbb) push('new:' + pc);
    else if (op === 0xbc || op === 0xbd || op === 0xc5) {
      for (index = 0; index < (op === 0xc5 ? instruction.dimensions : 1); index++) pop('int');
      type = op === 0xbc ? '[' + 'ZCFDBSIJ'[instruction.arrayType - 4] : (<ClassReference> input.constantPool.get(instruction.cpIndex)).name;
      push(op === 0xbd ? '[' + type : type);
    } else if (op === 0xbe) {
      value = reference();
      if (value !== 'null') alternatives(value).forEach(array => { if (array[0] !== '[') fail(pc, 'arraylength receiver is not an array'); });
      push('int');
    } else if (op === 0xbf) assign(reference(), 'Ljava/lang/Throwable;', pc);
    else if (op === 0xc0 || op === 0xc1) {
      reference(); push(op === 0xc1 ? 'int' : (<ClassReference> input.constantPool.get(instruction.cpIndex)).name);
    } else if (op === 0xc2 || op === 0xc3) reference(true);
    else fail(pc, 'Unsupported verification opcode ' + op);
    return state;
  }
  function exceptionState(before: State, instruction: DecodedInstruction, catchType: string): State {
    var state = copy(before);
    state.stack = [catchType === '<any>' ? 'Ljava/lang/Throwable;' : catchType];
    if (instruction.opcode === 0xb7) {
      var called = <IConstantPoolReference> input.constantPool.get(instruction.cpIndex);
      if (called.nameAndTypeInfo.name === '<init>') {
        var receiver = before.stack[before.stack.length - getTypes(called.nameAndTypeInfo.descriptor).length];
        state.locals = state.locals.map(type => type === receiver ? 'top' : type);
      }
    }
    checkLimit(state, instruction.pc);
    return state;
  }
  // Catch types constrain the whole exception table, including ranges which
  // legacy inference never reaches. Keep their loader checks explicit.
  decoded.exceptionHandlers.forEach(handler => {
    if (handler.catchType !== '<any>') obligation({kind: 'assignable', pc: handler.handlerPC,
      sourceType: handler.catchType, targetType: 'Ljava/lang/Throwable;'});
  });
  if (modern) {
    var state: State = initial;
    decoded.instructions.forEach(instruction => {
      var pc = instruction.pc;
      if (frames[pc] !== undefined) { if (state !== null) match(state, frames[pc], pc); state = copy(frames[pc]); }
      if (state === null) fail(pc, 'Expected a StackMapTable frame after an unconditional control transfer');
      decoded.exceptionHandlers.forEach(handler => {
        if (pc >= handler.startPC && pc < handler.endPC) {
          if (!frames[handler.handlerPC]) fail(pc, 'Missing exception handler stack-map frame');
          match(exceptionState(state, instruction, handler.catchType), frames[handler.handlerPC], handler.handlerPC);
        }
      });
      var next = step(instruction, state, []);
      instruction.branchTargets.forEach(target => {
        if (!frames[target]) fail(pc, 'Missing branch target stack-map frame');
        match(next, frames[target], target);
      });
      state = instruction.hasFallthrough ? next : null;
      if (state !== null && instruction.nextPC === decoded.code.length) fail(pc, 'Execution falls off the end of Code');
    });
  } else {
    // A separate subroutine context retains each caller's untouched locals.
    // Merging all jsr callers at one PC would incorrectly destroy their types.
    var states: {[key: string]: State} = Object.create(null), queue: {pc: number; context: number[]}[] = [];
    var mergeValue = function(a: Value, b: Value, pc: number, stack: boolean): Value {
      if (equal(a, b)) return a;
      if (a === 'null' && ref(b)) return b;
      if (b === 'null' && ref(a)) return a;
      if (ref(a) && ref(b)) return Array.from(new Set(alternatives(a).concat(alternatives(b)))).sort();
      if (stack) fail(pc, 'Inconsistent inferred stack types');
      return 'top';
    };
    var enqueue = function(pc: number, incoming: State, context: number[]): void {
      if (!decoded.instructionAt[pc]) fail(pc, 'Control flow falls outside Code');
      var key = pc + ':' + context.join(','), existing = states[key];
      if (!existing) { states[key] = copy(incoming); queue.push({pc, context}); return; }
      if (existing.stack.length !== incoming.stack.length) fail(pc, 'Inconsistent inferred stack height');
      var merged: State = {locals: existing.locals.map((type, index) => mergeValue(type, incoming.locals[index], pc, false)),
        stack: existing.stack.map((type, index) => mergeValue(type, incoming.stack[index], pc, true)),
        uninitializedThis: existing.uninitializedThis || incoming.uninitializedThis};
      for (var index = 0; index < merged.locals.length; index++) {
        if (wide(merged.locals[index]) && merged.locals[index + 1] !== 'tail') merged.locals[index] = 'top';
        if (merged.locals[index] === 'tail' && (index === 0 || !wide(merged.locals[index - 1]))) merged.locals[index] = 'top';
      }
      if (JSON.stringify(existing) !== JSON.stringify(merged)) { states[key] = merged; queue.push({pc, context}); }
    };
    enqueue(0, initial, []);
    for (var head = 0; head < queue.length; head++) {
      var work = queue[head], instruction = decoded.instructionAt[work.pc], before = states[work.pc + ':' + work.context.join(',')];
      decoded.exceptionHandlers.forEach(handler => {
        if (work.pc >= handler.startPC && work.pc < handler.endPC) enqueue(handler.handlerPC, exceptionState(before, instruction, handler.catchType), work.context);
      });
      var next = step(instruction, before, work.context), context = work.context;
      if (instruction.opcode === 0xa8 || instruction.opcode === 0xc9) {
        if (context.indexOf(instruction.returnAddressPC) !== -1) fail(work.pc, 'Recursive jsr subroutine');
        context = context.concat(instruction.returnAddressPC);
      }
      if (instruction.opcode === 0xa9) enqueue(context[context.length - 1], next, context.slice(0, -1));
      else {
        instruction.branchTargets.forEach(target => enqueue(target, next, context));
        if (instruction.hasFallthrough) enqueue(instruction.nextPC, next, context);
      }
    }
  }
  return {obligations, policy: modern ? 'stack-map' : 'inference', checkedInstructions: Object.keys(checked).length};
}
