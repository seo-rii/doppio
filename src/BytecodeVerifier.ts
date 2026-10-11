import {Code, IStackMapTableEntry, IVerificationTypeInfo, StackMapTable} from './attributes';
import {ClassReference, ConstantPool, DynamicConstant, IConstantPoolItem, MethodReference} from './ConstantPool';
import {ConstantPoolItemType as CPType} from './enums';
import {validateMethodDescriptor} from './classfile_validation';

/** A parsed method before traps or quickened bytecodes change its representation. */
export interface BytecodeMethodInput {
  className: string;
  superClassName?: string | null;
  majorVersion: number;
  name: string;
  descriptor: string;
  declaredAccessFlags: number;
  declaredCode: Code;
  constantPool: ConstantPool;
}

/** A class-file instruction, before the interpreter replaces opcodes with FAST forms. */
export interface DecodedInstruction {
  pc: number;
  /** The operation modified by wide, or the ordinary opcode. */
  opcode: number;
  rawOpcode: number;
  nextPC: number;
  wide: boolean;
  hasFallthrough: boolean;
  /** Absolute PCs, with a switch's default target first. */
  branchTargets: ReadonlyArray<number>;
  cpIndex?: number;
  localIndex?: number;
  localWidth?: number;
  immediate?: number;
  arrayType?: number;
  dimensions?: number;
  invokeCount?: number;
  switchKeys?: ReadonlyArray<number>;
  returnAddressPC?: number;
}

export interface DecodedStackMapFrame {
  pc: number;
  entry: IStackMapTableEntry;
}

export interface DecodedExceptionHandler {
  startPC: number;
  endPC: number;
  handlerPC: number;
  catchType: string;
}

export interface DecodedMethod {
  /** Frozen byte snapshot: later quickening cannot change the verification input. */
  code: ReadonlyArray<number>;
  instructions: ReadonlyArray<DecodedInstruction>;
  /** Sparse array: operands and wide's embedded opcode have no entry. */
  instructionAt: ReadonlyArray<DecodedInstruction>;
  stackMapFrames: ReadonlyArray<DecodedStackMapFrame>;
  exceptionHandlers: ReadonlyArray<DecodedExceptionHandler>;
  newSites: {readonly [pc: number]: string};
  hasLegacySubroutines: boolean;
}

export class BytecodeVerificationError extends Error {
  public readonly javaClassName: string = 'Ljava/lang/VerifyError;';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BytecodeVerificationError.prototype);
    this.name = 'BytecodeVerificationError';
  }
}

/** Malformed Code/StackMapTable metadata is not an instruction type error. */
export class BytecodeFormatError extends Error {
  public readonly javaClassName: string = 'Ljava/lang/ClassFormatError;';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BytecodeFormatError.prototype);
    this.name = 'BytecodeFormatError';
  }
}

/**
 * JVMS 4.9.1's static instruction constraints, plus instruction-boundary checks
 * for Code and StackMapTable. This deliberately never loads or resolves a class,
 * method, field, bootstrap, or dynamic constant. Stack/local type-flow belongs to
 * the subsequent verifier, including fall-through and branch frame matching.
 */
export function decodeMethodCode(input: BytecodeMethodInput): DecodedMethod {
  var attribute = input.declaredCode;
  var original = attribute.getCode();
  var code: number[] = new Array(original.length);
  for (var byteIndex = 0; byteIndex < original.length; byteIndex++) code[byteIndex] = original[byteIndex];
  var codeLength = code.length;
  var methodLabel = input.className + '.' + input.name + input.descriptor;
  if (codeLength === 0 || codeLength > 65535) {
    throw new BytecodeFormatError(methodLabel + ': Code length must be between 1 and 65535');
  }
  var instructions: DecodedInstruction[] = [];
  var instructionAt: DecodedInstruction[] = new Array(codeLength);
  var newSites: {[pc: number]: string} = Object.create(null);
  var hasLegacySubroutines = false;

  function fail(pc: number, reason: string): never {
    throw new BytecodeVerificationError(methodLabel + ' at bytecode ' + pc + ': ' + reason);
  }

  function need(offset: number, size: number, pc: number): void {
    if (size < 0 || offset < 0 || size > codeLength - offset) fail(pc, 'Truncated instruction');
  }

  function u2(offset: number): number {
    return (code[offset] << 8) | code[offset + 1];
  }

  function s2(offset: number): number {
    return (u2(offset) << 16) >> 16;
  }

  function s4(offset: number): number {
    return (code[offset] << 24) | (code[offset + 1] << 16) |
      (code[offset + 2] << 8) | code[offset + 3];
  }

  function constant(instruction: DecodedInstruction, allowed: CPType[]): IConstantPoolItem {
    var item = input.constantPool.getUnchecked(instruction.cpIndex);
    if (!item || allowed.indexOf(item.getType()) === -1) {
      fail(instruction.pc, 'Invalid constant pool operand ' + instruction.cpIndex);
    }
    return item;
  }

  for (var pc = 0; pc < codeLength;) {
    var rawOpcode = code[pc], opcode = rawOpcode, wide = rawOpcode === 0xc4;
    if (rawOpcode > 0xc9) fail(pc, 'Reserved or unknown opcode ' + rawOpcode);
    var instruction: DecodedInstruction = {
      pc: pc, opcode: opcode, rawOpcode: rawOpcode, nextPC: pc + 1,
      wide: wide, hasFallthrough: true, branchTargets: []
    };
    var targets: number[] = [], keys: number[];
    var operand = pc + 1, width = 1;
    if (wide) {
      need(pc, 2, pc);
      opcode = code[operand++];
      instruction.opcode = opcode;
      if (!((opcode >= 0x15 && opcode <= 0x19) ||
            (opcode >= 0x36 && opcode <= 0x3a) || opcode === 0x84 || opcode === 0xa9)) {
        fail(pc, 'Invalid wide opcode ' + opcode);
      }
      width = 2;
    }

    if ((opcode >= 0x15 && opcode <= 0x19) || (opcode >= 0x36 && opcode <= 0x3a) || opcode === 0xa9) {
      need(operand, width, pc);
      instruction.localIndex = wide ? u2(operand) : code[operand];
      instruction.localWidth = opcode === 0x16 || opcode === 0x18 || opcode === 0x37 || opcode === 0x39 ? 2 : 1;
      instruction.nextPC = operand + width;
    } else if ((opcode >= 0x1a && opcode <= 0x2d) || (opcode >= 0x3b && opcode <= 0x4e)) {
      var groupOffset = opcode - (opcode <= 0x2d ? 0x1a : 0x3b);
      var group = Math.floor(groupOffset / 4);
      instruction.localIndex = groupOffset % 4;
      instruction.localWidth = group === 1 || group === 3 ? 2 : 1;
    } else if (opcode === 0x84) {
      need(operand, 2 * width, pc);
      instruction.localIndex = wide ? u2(operand) : code[operand];
      instruction.localWidth = 1;
      instruction.immediate = wide ? s2(operand + width) : (code[operand + width] << 24) >> 24;
      instruction.nextPC = operand + 2 * width;
    } else if (opcode === 0x10 || opcode === 0x11) {
      var pushWidth = opcode === 0x10 ? 1 : 2;
      need(operand, pushWidth, pc);
      instruction.immediate = pushWidth === 1 ? (code[operand] << 24) >> 24 : s2(operand);
      instruction.nextPC = operand + pushWidth;
    } else if ((opcode >= 0x99 && opcode <= 0xa8) || opcode === 0xc6 || opcode === 0xc7 || opcode === 0xc8 || opcode === 0xc9) {
      var branchWidth = opcode === 0xc8 || opcode === 0xc9 ? 4 : 2;
      need(operand, branchWidth, pc);
      targets.push(pc + (branchWidth === 2 ? s2(operand) : s4(operand)));
      instruction.nextPC = operand + branchWidth;
    } else if (opcode === 0xaa || opcode === 0xab) {
      // Modern padding contents are unconstrained. Historical class formats
      // require zero bytes; alignment is always relative to code[0].
      var cursor = (pc + 4) & ~3;
      need(cursor, opcode === 0xaa ? 12 : 8, pc);
      if (input.majorVersion < 51) {
        for (var paddingPC = pc + 1; paddingPC < cursor; paddingPC++) {
          if (code[paddingPC] !== 0) fail(pc, 'Nonzero switch padding before class version 51');
        }
      }
      targets.push(pc + s4(cursor));
      keys = [];
      var count: number;
      if (opcode === 0xaa) {
        var low = s4(cursor + 4), high = s4(cursor + 8);
        if (high < low) fail(pc, 'tableswitch high is less than low');
        count = high - low + 1;
        cursor += 12;
        need(cursor, count * 4, pc);
        for (var tableIndex = 0; tableIndex < count; tableIndex++, cursor += 4) {
          keys.push(low + tableIndex);
          targets.push(pc + s4(cursor));
        }
      } else {
        count = s4(cursor + 4);
        cursor += 8;
        if (count < 0) fail(pc, 'Negative lookupswitch pair count');
        need(cursor, count * 8, pc);
        var previousKey: number;
        for (var pairIndex = 0; pairIndex < count; pairIndex++, cursor += 8) {
          var key = s4(cursor);
          if (pairIndex > 0 && key <= previousKey) fail(pc, 'lookupswitch keys are not strictly increasing');
          keys.push(key);
          targets.push(pc + s4(cursor + 4));
          previousKey = key;
        }
      }
      instruction.switchKeys = Object.freeze(keys);
      instruction.nextPC = cursor;
    } else if (opcode === 0x12 || opcode === 0x13 || opcode === 0x14 ||
               (opcode >= 0xb2 && opcode <= 0xbb) || opcode === 0xbd || opcode === 0xc0 || opcode === 0xc1 || opcode === 0xc5) {
      var operandLength = opcode === 0x12 ? 1 : opcode === 0xb9 || opcode === 0xba ? 4 : opcode === 0xc5 ? 3 : 2;
      need(operand, operandLength, pc);
      instruction.cpIndex = opcode === 0x12 ? code[operand] : u2(operand);
      instruction.nextPC = operand + operandLength;
      if (opcode === 0xb9) {
        instruction.invokeCount = code[operand + 2];
        if (code[operand + 3] !== 0) fail(pc, 'Nonzero invokeinterface reserved operand');
      } else if (opcode === 0xba) {
        if (code[operand + 2] !== 0 || code[operand + 3] !== 0) fail(pc, 'Nonzero invokedynamic reserved operand');
      } else if (opcode === 0xc5) {
        instruction.dimensions = code[operand + 2];
      }
    } else if (opcode === 0xbc) {
      need(operand, 1, pc);
      instruction.arrayType = code[operand];
      instruction.nextPC = operand + 1;
      if (instruction.arrayType < 4 || instruction.arrayType > 11) fail(pc, 'Invalid newarray primitive type');
    }

    if (instruction.localIndex !== undefined && instruction.localIndex + instruction.localWidth > attribute.getMaxLocals()) {
      fail(pc, 'Local variable operand exceeds max_locals');
    }
    if (opcode === 0xa8 || opcode === 0xa9 || opcode === 0xc9) {
      if (input.majorVersion >= 51) fail(pc, 'jsr/ret subroutines are forbidden from class version 51');
      hasLegacySubroutines = true;
      if (opcode !== 0xa9) instruction.returnAddressPC = instruction.nextPC;
    }
    instruction.hasFallthrough = !((opcode >= 0xac && opcode <= 0xb1) || opcode === 0xbf ||
      (opcode >= 0xa7 && opcode <= 0xab) || opcode === 0xc8 || opcode === 0xc9);

    if (opcode >= 0x12 && opcode <= 0x14) {
      var loaded = constant(instruction, [CPType.INTEGER, CPType.FLOAT, CPType.LONG, CPType.DOUBLE,
        CPType.STRING, CPType.CLASS, CPType.METHOD_HANDLE, CPType.METHOD_TYPE, CPType.DYNAMIC]);
      var tag = loaded.getType();
      var category2 = tag === CPType.LONG || tag === CPType.DOUBLE;
      if (tag === CPType.DYNAMIC) {
        var dynamicDescriptor = (<DynamicConstant> loaded).nameAndTypeInfo.descriptor;
        category2 = dynamicDescriptor === 'J' || dynamicDescriptor === 'D';
      }
      if (category2 !== (opcode === 0x14)) fail(pc, 'Wrong ldc constant category');
      if ((tag === CPType.CLASS && input.majorVersion < 49) ||
          ((tag === CPType.METHOD_HANDLE || tag === CPType.METHOD_TYPE) && input.majorVersion < 51) ||
          (tag === CPType.DYNAMIC && input.majorVersion < 55)) {
        fail(pc, 'Constant kind is not loadable in this class version');
      }
    } else if (opcode >= 0xb2 && opcode <= 0xb5) {
      constant(instruction, [CPType.FIELDREF]);
    } else if (opcode >= 0xb6 && opcode <= 0xba) {
      var allowed = opcode === 0xb9 ? [CPType.INTERFACE_METHODREF] : opcode === 0xba ? [CPType.INVOKE_DYNAMIC] :
        input.majorVersion >= 52 && (opcode === 0xb7 || opcode === 0xb8) ? [CPType.METHODREF, CPType.INTERFACE_METHODREF] : [CPType.METHODREF];
      var invoked = <MethodReference> constant(instruction, allowed);
      var nameAndType = invoked.nameAndTypeInfo;
      if (nameAndType.name[0] === '<' && !(opcode === 0xb7 && nameAndType.name === '<init>' && invoked.getType() === CPType.METHODREF)) {
        fail(pc, 'Invalid invocation of ' + nameAndType.name);
      }
      if (opcode === 0xb9 && instruction.invokeCount !== validateMethodDescriptor(nameAndType.descriptor) + 1) {
        fail(pc, 'invokeinterface count does not match argument words and receiver');
      }
      if (opcode === 0xba && input.majorVersion < 51) fail(pc, 'invokedynamic requires class version 51');
    } else if (opcode === 0xbb || opcode === 0xbd || opcode === 0xc0 || opcode === 0xc1 || opcode === 0xc5) {
      var className = (<ClassReference> constant(instruction, [CPType.CLASS])).name;
      var dimensions = 0;
      while (className[dimensions] === '[') dimensions++;
      if (opcode === 0xbb) {
        if (dimensions !== 0) fail(pc, 'new cannot allocate an array class');
        newSites[pc] = className;
      } else if (opcode === 0xbd && dimensions >= 255) {
        fail(pc, 'anewarray would exceed 255 dimensions');
      } else if (opcode === 0xc5 && (instruction.dimensions === 0 || instruction.dimensions > dimensions)) {
        fail(pc, 'Invalid multianewarray dimensions');
      }
    }

    instruction.branchTargets = Object.freeze(targets);
    instructions.push(Object.freeze(instruction));
    instructionAt[pc] = instruction;
    pc = instruction.nextPC;
  }

  for (var branchIndex = 0; branchIndex < instructions.length; branchIndex++) {
    var branch = instructions[branchIndex];
    for (var targetIndex = 0; targetIndex < branch.branchTargets.length; targetIndex++) {
      var target = branch.branchTargets[targetIndex];
      if (target < 0 || target >= codeLength || !instructionAt[target]) fail(branch.pc, 'Branch target is not an instruction: ' + target);
    }
  }

  var exceptionHandlers = attribute.exceptionHandlers.map((handler): DecodedExceptionHandler => {
    if (handler.startPC >= handler.endPC || !instructionAt[handler.startPC] ||
        (handler.endPC !== codeLength && !instructionAt[handler.endPC]) || !instructionAt[handler.handlerPC]) {
      throw new BytecodeFormatError(methodLabel + ': Exception handler does not identify instruction boundaries');
    }
    return Object.freeze({startPC: handler.startPC, endPC: handler.endPC,
      handlerPC: handler.handlerPC, catchType: handler.catchType});
  });

  function copyTypes(types: IVerificationTypeInfo[]): IVerificationTypeInfo[] {
    var copy = types.map((type): IVerificationTypeInfo => {
      if (type.tag === 8 && newSites[type.newOffset] === undefined) {
        throw new BytecodeFormatError(methodLabel + ': StackMapTable uninitialized offset does not identify new: ' + type.newOffset);
      }
      return Object.freeze(Object.assign({}, type));
    });
    Object.freeze(copy);
    return copy;
  }

  var stackMapFrames: DecodedStackMapFrame[] = [];
  var stackMap = <StackMapTable> attribute.getAttribute('StackMapTable');
  // Version 50 permits inference fallback. Parsed StackMap format is checked by
  // the attribute reader, but its frames must not reject otherwise valid legacy
  // code. The subsequent type verifier also uses inference for versions <= 50.
  if (stackMap && input.majorVersion >= 51) {
    var previousPC = -1;
    var entries = stackMap.getEntries();
    for (var frameIndex = 0; frameIndex < entries.length; frameIndex++) {
      var entry = entries[frameIndex];
      var framePC = previousPC + entry.offsetDelta + 1;
      if (framePC < 0 || framePC >= codeLength || !instructionAt[framePC]) {
        fail(framePC, 'StackMapTable offset does not identify an instruction');
      }
      var entryCopy = Object.assign({}, entry);
      if (entry.locals) { entryCopy.locals = entry.locals.slice(); Object.freeze(entryCopy.locals); }
      if (entry.stack) { entryCopy.stack = entry.stack.slice(); Object.freeze(entryCopy.stack); }
      if (entry.localsTypes) entryCopy.localsTypes = copyTypes(entry.localsTypes);
      if (entry.stackTypes) entryCopy.stackTypes = copyTypes(entry.stackTypes);
      stackMapFrames.push(Object.freeze({pc: framePC, entry: Object.freeze(entryCopy)}));
      previousPC = framePC;
    }
  }

  return Object.freeze({code: Object.freeze(code), instructions: Object.freeze(instructions),
    instructionAt: Object.freeze(instructionAt), stackMapFrames: Object.freeze(stackMapFrames),
    exceptionHandlers: Object.freeze(exceptionHandlers), newSites: Object.freeze(newSites),
    hasLegacySubroutines: hasLegacySubroutines});
}
