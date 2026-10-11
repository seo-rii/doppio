/** Pure class-file grammar checks shared by members and constant-pool entries.
 * These do not resolve symbolic references or initialize guest classes.
 */
export function validateUnqualifiedName(name: string, method: boolean = false): void {
  if (name.length === 0 || /[.;\[/]/.test(name) || (method && /[<>]/.test(name))) {
    throw new Error('Invalid ' + (method ? 'method' : 'unqualified') + ' name: ' + name);
  }
}

export function validateBinaryClassName(name: string): void {
  name.split('/').forEach((part: string) => validateUnqualifiedName(part));
}

/** End index of one field type; arrays are iterative to bound parser depth. */
function fieldTypeEnd(descriptor: string, start: number): number {
  var index = start, dimensions = 0;
  while (descriptor[index] === '[') {
    dimensions++;
    index++;
  }
  if (dimensions > 255) throw new Error('Array descriptor exceeds 255 dimensions');
  var type = descriptor[index];
  if (type === 'L') {
    var end = descriptor.indexOf(';', index + 1);
    if (end < 0) throw new Error('Unterminated class descriptor: ' + descriptor);
    validateBinaryClassName(descriptor.substring(index + 1, end));
    return end + 1;
  }
  if (type !== undefined && 'BCDFIJSZ'.indexOf(type) !== -1) return index + 1;
  throw new Error('Invalid field descriptor: ' + descriptor);
}

export function validateFieldDescriptor(descriptor: string): void {
  if (fieldTypeEnd(descriptor, 0) !== descriptor.length) {
    throw new Error('Trailing data in field descriptor: ' + descriptor);
  }
}

/** Returns argument words (excluding a receiver) after checking the grammar. */
export function validateMethodDescriptor(descriptor: string): number {
  if (descriptor[0] !== '(') throw new Error('Invalid method descriptor: ' + descriptor);
  var index = 1, words = 0;
  while (descriptor[index] !== ')') {
    words += descriptor[index] === 'J' || descriptor[index] === 'D' ? 2 : 1;
    index = fieldTypeEnd(descriptor, index);
    if (words > 255) throw new Error('Method descriptor exceeds 255 parameter words');
  }
  index++;
  index = descriptor[index] === 'V' ? index + 1 : fieldTypeEnd(descriptor, index);
  if (index !== descriptor.length) throw new Error('Trailing data in method descriptor: ' + descriptor);
  return words;
}

/** CONSTANT_Class stores either an internal binary name or an array descriptor. */
export function validateConstantClassName(name: string): void {
  if (name[0] === '[') validateFieldDescriptor(name);
  else validateBinaryClassName(name);
}

export function validateMemberNameAndType(name: string, descriptor: string, method: boolean, allowInit: boolean): void {
  if (method) {
    validateMethodDescriptor(descriptor);
    if (allowInit && name === '<init>') {
      if (descriptor[descriptor.length - 1] !== 'V') throw new Error('Constructor must return void');
    } else validateUnqualifiedName(name, true);
  } else {
    validateUnqualifiedName(name);
    validateFieldDescriptor(descriptor);
  }
}

export function validateVisibility(flags: number): void {
  var visibility = flags & 7;
  if (visibility !== 0 && visibility !== 1 && visibility !== 2 && visibility !== 4) {
    throw new Error('Conflicting member visibility flags');
  }
}
