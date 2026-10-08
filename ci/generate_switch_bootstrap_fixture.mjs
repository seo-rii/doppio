import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const companion = 'classes/modern_test/Java21SwitchBootstrapCalls';
const switchBootstrapDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;' +
  'Ljava/lang/invoke/MethodType;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;';

/** Generate call sites that Java source cannot express, at the selected release's class version. */
export function generateSwitchBootstrapFixture(release) {
  if (release !== 21 && release !== 25) throw new Error('Switch bootstrap fixtures require release 21 or 25.');
  const u1 = (value) => Buffer.from([value]);
  const u2 = (value) => { const data = Buffer.alloc(2); data.writeUInt16BE(value); return data; };
  const u4 = (value) => { const data = Buffer.alloc(4); data.writeUInt32BE(value >>> 0); return data; };
  const pool = [];
  const entry = (tag, ...parts) => { pool.push(Buffer.concat([u1(tag), ...parts])); return pool.length; };
  const utf8 = (value) => { const data = Buffer.from(value, 'utf8'); return entry(1, u2(data.length), data); };
  const cls = (name) => entry(7, u2(utf8(name)));
  const nameAndType = (name, descriptor) => entry(12, u2(utf8(name)), u2(utf8(descriptor)));
  const methodRef = (owner, name, descriptor) => entry(10, u2(cls(owner)), u2(nameAndType(name, descriptor)));
  const methodHandle = (owner, name, descriptor) => entry(15, u1(6), u2(methodRef(owner, name, descriptor)));
  const string = (value) => entry(8, u2(utf8(value)));
  const thisClass = cls(companion);
  const superClass = cls('java/lang/Object');
  const codeName = utf8('Code');
  const bootstrapName = utf8('BootstrapMethods');
  const typeSwitch = methodHandle('java/lang/runtime/SwitchBootstraps', 'typeSwitch', switchBootstrapDescriptor);
  const enumSwitch = methodHandle('java/lang/runtime/SwitchBootstraps', 'enumSwitch', switchBootstrapDescriptor);
  const nullConstant = methodHandle('java/lang/invoke/ConstantBootstraps', 'nullConstant',
    '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;');
  const bootstrapMethods = [];
  const bootstrap = (handle, args = []) => {
    bootstrapMethods.push(Buffer.concat([u2(handle), u2(args.length), ...args.map(u2)]));
    return bootstrapMethods.length - 1;
  };
  const labels = [string('target'), entry(3, u4(65)), cls('java/lang/CharSequence'), cls('java/lang/Number')];
  const valid = bootstrap(typeSwitch, labels);
  const invalidMethodType = bootstrap(typeSwitch, [entry(16, u2(utf8('()V')))]);
  const nullLabel = entry(17, u2(bootstrap(nullConstant)), u2(nameAndType('_', 'Ljava/lang/Object;')));
  const invalidNull = bootstrap(typeSwitch, [nullLabel]);
  const invalidEnumType = bootstrap(enumSwitch, [string('RED')]);
  const invalidEnumLabel = bootstrap(enumSwitch, [cls('java/lang/String')]);
  const methods = [];
  const method = (name, descriptor, bootstrapIndex, loads = [0x2a, 0x1b], maxWords = 2) => {
    const dynamic = entry(18, u2(bootstrapIndex), u2(nameAndType(name, descriptor)));
    const code = Buffer.from([...loads, 0xba, dynamic >>> 8, dynamic & 255, 0, 0,
      descriptor.endsWith('Ljava/lang/Object;') ? 0xb0 : 0xac]);
    const body = Buffer.concat([u2(Math.max(1, maxWords)), u2(maxWords), u4(code.length), code, u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(0x0008), u2(utf8(name)), u2(utf8(descriptor)), u2(1),
      u2(codeName), u4(body.length), body]));
  };
  method('select', '(Ljava/lang/Object;I)I', valid);
  method('invalidMethodTypeLabel', '(Ljava/lang/Object;I)I', invalidMethodType);
  method('invalidNullLabel', '(Ljava/lang/Object;I)I', invalidNull);
  method('invalidRestartType', '(Ljava/lang/Object;J)I', valid, [0x2a, 0x1f], 3);
  method('invalidReturnType', '(Ljava/lang/Object;I)Ljava/lang/Object;', valid);
  method('invalidArity', '(Ljava/lang/Object;II)I', valid, [0x2a, 0x1b, 0x1c], 3);
  method('invalidEnumType', '(Ljava/lang/Object;I)I', invalidEnumType);
  method('invalidEnumLabel', '(Lclasses/modern_test/Java21SwitchBootstrapContracts$Shade;I)I', invalidEnumLabel);
  const bootstrapBody = Buffer.concat([u2(bootstrapMethods.length), ...bootstrapMethods]);
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(release + 44), u2(pool.length + 1), ...pool,
    u2(0x0030), u2(thisClass), u2(superClass), u2(0), u2(0), u2(methods.length), ...methods,
    u2(1), u2(bootstrapName), u4(bootstrapBody.length), bootstrapBody]);
}

function main(args) {
  if (args.length !== 4 || args[0] !== '--classes' || args[2] !== '--release' ||
      !['21', '25'].includes(args[3])) {
    throw new Error('Usage: node ci/generate_switch_bootstrap_fixture.mjs --classes <directory> --release 21|25');
  }
  const release = Number(args[3]);
  const target = path.resolve(args[1], `${companion}.class`);
  if (!fs.lstatSync(target).isFile()) throw new Error('The javac companion must be a regular file.');
  const previous = fs.readFileSync(target);
  if (previous.length < 8 || previous.readUInt32BE(0) !== 0xcafebabe ||
      previous.readUInt16BE(6) !== release + 44) {
    throw new Error('The javac companion does not match the selected class-file version.');
  }
  const bytes = generateSwitchBootstrapFixture(release);
  fs.writeFileSync(target, bytes);
  console.log(`Generated ${companion}.class: major=${release + 44}, bytes=${bytes.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
