import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const support = 'classes/modern_test/BootstrapTestSupport';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const stringType = 'Ljava/lang/String;';
const classType = 'Ljava/lang/Class;';
const methodType = 'Ljava/lang/invoke/MethodType;';
const object = 'Ljava/lang/Object;';
const handleType = 'Ljava/lang/invoke/MethodHandle;';
const callSite = 'Ljava/lang/invoke/CallSite;';
const constantLeading = '(' + lookup + stringType + classType;
const siteLeading = '(' + lookup + stringType + methodType;

// These are original class-file inputs: no javac output, carrier class, class
// version patch, or bytecode transformation participates in their construction.
export function generateUserBootstrapFixtures(group, release) {
  assert.ok(['condy', 'indy', 'errors'].includes(group));
  assert.ok([21, 25].includes(release));
  const binary = 'classes.modern_test.Bootstrap' + {condy: 'Condy', indy: 'Indy', errors: 'Errors'}[group] + 'Calls';
  const u1 = value => Buffer.from([value]);
  const u2 = value => {const data = Buffer.alloc(2); data.writeUInt16BE(value); return data;};
  const u4 = value => {const data = Buffer.alloc(4); data.writeUInt32BE(value >>> 0); return data;};
  const pool = [], cache = new Map();
  const entry = (key, tag, parts, wide = false) => {
    if (cache.has(key)) return cache.get(key);
    const index = pool.length + 1; pool.push(Buffer.concat([u1(tag), ...parts]));
    if (wide) pool.push(null);
    cache.set(key, index); return index;
  };
  const utf = value => {const bytes = Buffer.from(value); return entry('utf:' + value, 1, [u2(bytes.length), bytes]);};
  const cls = value => entry('class:' + value, 7, [u2(utf(value))]);
  const nt = (name, descriptor) => entry('nt:' + name + descriptor, 12, [u2(utf(name)), u2(utf(descriptor))]);
  const ref = (owner, name, descriptor) => entry('ref:' + owner + '#' + name + descriptor, 10, [u2(cls(owner)), u2(nt(name, descriptor))]);
  const mh = (name, descriptor, kind = 6, owner = support) => entry('mh:' + kind + owner + '#' + name + descriptor,
    15, [u1(kind), u2(ref(owner, name, descriptor))]);
  const str = value => entry('str:' + value, 8, [u2(utf(value))]);
  const integer = value => entry('int:' + value, 3, [u4(value)]);
  const long = value => {const bytes = Buffer.alloc(8); bytes.writeBigInt64BE(BigInt(value)); return entry('long:' + value, 5, [bytes], true);};
  const float = value => {const bytes = Buffer.alloc(4); bytes.writeFloatBE(value); return entry('float:' + value, 4, [bytes]);};
  const double = value => {const bytes = Buffer.alloc(8); bytes.writeDoubleBE(value); return entry('double:' + value, 6, [bytes], true);};
  const mt = descriptor => entry('mt:' + descriptor, 16, [u2(utf(descriptor))]);
  const bootstraps = [], bootstrapCache = new Map();
  const bootstrap = (method, args = []) => {
    const key = JSON.stringify([method, args]);
    if (bootstrapCache.has(key)) return bootstrapCache.get(key);
    const index = bootstraps.length; bootstraps.push({method, args}); bootstrapCache.set(key, index); return index;
  };
  const dynamic = (tag, name, descriptor, method, args = []) => {
    const bsm = bootstrap(method, args);
    return entry('dyn:' + tag + ':' + name + descriptor + ':' + bsm, tag, [u2(bsm), u2(nt(name, descriptor))]);
  };
  const codeName = utf('Code'), bootstrapName = utf('BootstrapMethods');
  const thisClass = cls(binary.replaceAll('.', '/')), superClass = cls('java/lang/Object');
  const methods = [];
  const method = (name, descriptor, code, maxStack, maxLocals, flags = 0x0009) => {
    const body = Buffer.concat([u2(maxStack), u2(maxLocals), u4(code.length), Buffer.from(code), u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(flags), u2(utf(name)), u2(utf(descriptor)), u2(1), u2(codeName), u4(body.length), body]));
  };
  const load = (index, descriptor) => [descriptor === 'J' || descriptor === 'D' ? 0x14 : 0x13, index >>> 8, index & 255];
  const returns = descriptor => descriptor === 'J' ? 0xad : descriptor === 'F' ? 0xae : descriptor === 'D' ? 0xaf :
    descriptor === 'V' ? 0xb1 : descriptor.startsWith('L') || descriptor.startsWith('[') ? 0xb0 : 0xac;
  const constant = (methodName, name, descriptor, bsmName = 'constant', bsmDescriptor = constantLeading + ')' + object, args = []) => {
    const index = dynamic(17, name, descriptor, mh(bsmName, bsmDescriptor), args);
    method(methodName, '()' + descriptor, [...load(index, descriptor), returns(descriptor)], descriptor === 'J' || descriptor === 'D' ? 2 : 1, 0);
    return index;
  };
  const site = (methodName, name, descriptor, loads = [], words = 0, bsmName = 'site', bsmDescriptor = siteLeading + ')' + callSite, args = [], kind = 6, owner = support) => {
    const index = dynamic(18, name, descriptor, mh(bsmName, bsmDescriptor, kind, owner), args);
    const result = descriptor.slice(descriptor.indexOf(')') + 1);
    method(methodName, descriptor, [...loads, 0xba, index >>> 8, index & 255, 0, 0, returns(result)], Math.max(words, result === 'J' || result === 'D' ? 2 : 1), words);
    return index;
  };
  const nullArgument = name => dynamic(17, name, object, mh('constant', constantLeading + ')' + object));
  const wideArgument = name => dynamic(17, name, 'J', mh('constantLong', constantLeading + ')J'));
  const varargs = () => [str('static'), integer(7), long('9007199254740993'), float(1.5), double(2.25),
    cls('java/lang/String'), mt('(J)J'), mh('identityLong', '(J)J'), nullArgument(group === 'condy' ? 'c_var_null' : 'i_var_null')];

  if (group === 'condy') {
    constant('exactInt', 'c_int', 'I', 'constantInt', constantLeading + ')I');
    constant('exactLong', 'c_long', 'J', 'constantLong', constantLeading + ')J');
    constant('exactFloat', 'c_float', 'F', 'constantFloat', constantLeading + ')F');
    constant('exactDouble', 'c_double', 'D', 'constantDouble', constantLeading + ')D');
    constant('reference', 'c_ref', stringType);
    constant('nullReference', 'c_null', object);
    constant('boxedInt', 'c_box', 'I');
    constant('boxedLong', 'c_boxlong', 'J');
    constant('methodTypeHandle', 'c_mh', 'J', 'constantHandle', constantLeading + methodType + handleType + ')J', [mt('(J)J'), mh('identityLong', '(J)J')]);
    constant('nestedNull', 'c_nested_null', stringType, 'constantNested', constantLeading + object + ')' + object, [nullArgument('c_nested_null_leaf')]);
    constant('nestedWide', 'c_nested_wide', 'J', 'constantWide', constantLeading + 'JD)J', [wideArgument('c_nested_wide_leaf'), double(2.25)]);
    constant('variableArguments', 'c_varargs', stringType, 'constantVarargs', constantLeading + '[' + object + ')' + object, varargs());
    constant('adaptedLeading', 'c_adapt', stringType, 'constantAdapted', '(' + lookup + object + object + object + ')' + object, [str('adapted')]);
    constant('classLiteral', 'c_class', classType);
    constant('privateLookup', 'c_private', stringType, 'constantPrivate', constantLeading + ')' + object);
    const cached = constant('cachedLeft', 'c_cache', 'I');
    method('cachedRight', '()I', [...load(cached, 'I'), 0xac], 1, 0);
    method('cachedTwice', '()I', [...load(cached, 'I'), ...load(cached, 'I'), 0x60, 0xac], 2, 0);
  } else if (group === 'indy') {
    site('exact', 'i_exact', '()I');
    site('adaptedLeading', 'i_adapt', '()I', [], 0, 'siteAdapted', '(' + object + object + object + ')' + object);
    site('variableArguments', 'i_varargs', '()' + stringType, [], 0, 'siteVarargs', siteLeading + '[' + object + ')' + callSite, varargs());
    site('narrow', 'i_narrow', '(BI)I', [0x1a, 0x1b], 2);
    site('wide', 'i_wide', '(JD)J', [0x1e, 0x28], 4);
    site('reference', 'i_reference', '(' + object + ')' + stringType, [0x2a], 1);
    site('voidResult', 'i_void', '(I)V', [0x1a], 1);
    site('nullReference', 'i_null', '(' + stringType + ')' + stringType, [0x2a], 1);
    site('privateLookup', 'i_private', '()' + stringType);
    site('constructor', 'i_constructor', '()I', [], 0, '<init>', siteLeading + 'I)V', [integer(29)], 8, support + '$ConstructedSite');
    site('methodTypeHandle', 'i_mh', '(J)J', [0x1e], 2, 'siteHandle', siteLeading + methodType + handleType + ')' + callSite, [mt('(J)J'), mh('identityLong', '(J)J')]);
    const twice = dynamic(18, 'i_lex_twice', '()I', mh('site', siteLeading + ')' + callSite));
    method('lexicalTwice', '()I', [0xba, twice >>> 8, twice & 255, 0, 0, 0xba, twice >>> 8, twice & 255, 0, 0, 0x60, 0xac], 2, 0);
    const shared = dynamic(18, 'i_lex_methods', '()I', mh('site', siteLeading + ')' + callSite));
    for (const name of ['lexicalLeft', 'lexicalRight']) method(name, '()I', [0xba, shared >>> 8, shared & 255, 0, 0, 0xac], 1, 0);
    site('mutable', 'i_mutable', '()I');
    site('volatileSite', 'i_volatile', '()I');
    site('targetError', 'i_target_error', '()I');
  } else {
    constant('runtimeFailure', 'e_c_runtime', 'I');
    constant('errorFailure', 'e_c_error', 'I');
    constant('nullPrimitive', 'e_c_null', 'I');
    constant('wrongReference', 'e_c_wrong', stringType);
    constant('invalidLookupParameter', 'e_c_lookup_parameter', object, 'constantInvalidLookup', '(' + object + stringType + classType + ')' + object);
    constant('constantArity', 'e_c_arity', object, 'constantArity', constantLeading + 'I)' + object);
    constant('lookupDenied', 'e_c_access', object, 'constantDenied', constantLeading + ')' + object);
    const leaf = dynamic(17, 'e_c_nested_leaf', object, mh('constant', constantLeading + ')' + object));
    constant('nestedConstantFailure', 'e_c_nested', object, 'constantNestedFailure', constantLeading + object + ')' + object, [leaf]);
    site('runtimeSiteFailure', 'e_i_runtime', '()I');
    site('errorSiteFailure', 'e_i_error', '()I');
    site('nullSite', 'e_i_null', '()I');
    site('wrongSite', 'e_i_wrong', '()I', [], 0, 'siteWrong', siteLeading + ')' + object);
    site('wrongTarget', 'e_i_target', '()I');
    site('siteArity', 'e_i_arity', '()I', [], 0, 'siteArity', siteLeading + 'I)' + callSite);
    const shared = dynamic(18, 'e_i_lexical', '()I', mh('site', siteLeading + ')' + callSite));
    for (const name of ['lexicalFailureLeft', 'lexicalFailureRight']) method(name, '()I', [0xba, shared >>> 8, shared & 255, 0, 0, 0xac], 1, 0);
    const indyLeaf = dynamic(17, 'e_i_nested_leaf', object, mh('constant', constantLeading + ')' + object));
    site('nestedSiteFailure', 'e_i_nested', '()I', [], 0, 'siteNestedFailure', siteLeading + object + ')' + callSite, [indyLeaf]);
  }
  if (group !== 'errors') method('secret', '()' + stringType, [...load(str('private:' + group), stringType), 0xb0], 1, 0, 0x000a);
  const bootstrapBody = Buffer.concat([u2(bootstraps.length), ...bootstraps.map(item => Buffer.concat([u2(item.method), u2(item.args.length), ...item.args.map(u2)]))]);
  const bytes = Buffer.concat([u4(0xcafebabe), u2(0), u2(release + 44), u2(pool.length + 1), ...pool.filter(Boolean),
    u2(0x0031), u2(thisClass), u2(superClass), u2(0), u2(0), u2(methods.length), ...methods,
    u2(1), u2(bootstrapName), u4(bootstrapBody.length), bootstrapBody]);
  return [{className: binary, bytes}];
}

function main(args) {
  assert.equal(args.length, 6, 'Usage: --group condy|indy|errors --release 21|25 --output directory');
  assert.deepEqual([args[0], args[2], args[4]], ['--group', '--release', '--output']);
  for (const file of generateUserBootstrapFixtures(args[1], Number(args[3]))) {
    const target = path.join(path.resolve(args[5]), file.className.replaceAll('.', '/') + '.class');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, file.bytes, {flag: 'wx'});
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {main(process.argv.slice(2));} catch (error) {console.error(error.stack || error.message); process.exitCode = 1;}
}
