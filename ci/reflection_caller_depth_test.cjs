'use strict';

const assert = require('assert');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['doppiojvm', 'VM', 'ClassFile', 'ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods', 'util',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations',
  'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'SymbolicResolution', 'ClassAccess', 'natives/sun_reflect']);
const cache = new Map();
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = new Module(filename, module);
  cache.set(name, loaded); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), id));
    return id.startsWith('.') && sourceModules.has(dependency) ? load(dependency) : original(id);
  };
  loaded._compile(require('typescript').transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'),
    {compilerOptions: {target: 1, module: 1}}).outputText, filename);
  return loaded.exports;
}
const reflectionNatives = load('natives/sun_reflect').default();
const util = load('util');

const reflection = reflectionNatives['sun/reflect/Reflection'];

const bootstrapClasses = new Map(), bootstrap = {getLoadedClass: name => bootstrapClasses.get(name) || null};
bootstrap.bootstrap = bootstrap;
function makeClass(name, superClass = null, loader = bootstrap) {
  const cls = {
    getInternalName() {
      return name;
    },
    getSuperClass() {
      return superClass;
    },
    getClassObject() {
      return name;
    },
    getLoader: () => loader,
    getPackageName: () => name.slice(1, name.lastIndexOf('/')),
    getNestHostReference: () => null,
    isSubclass(parent) { return this === parent || superClass !== null && superClass.isSubclass(parent); }
  };
  if (loader === bootstrap && !bootstrapClasses.has(name)) bootstrapClasses.set(name, cls);
  return cls;
}

function makeFrame(classData, fullSignature, hidden = false) {
  return {
    method: {
      cls: classData,
      fullSignature,
      isHidden() {
        return hidden;
      }
    }
  };
}

const outerClass = makeClass('Lfixture/Outer;');
const callerClass = makeClass('Lfixture/Caller;');
const magicBase = makeClass('Lsun/reflect/MagicAccessorImpl;');
const magicClass = makeClass('Lsun/reflect/GeneratedMethodAccessor1;', magicBase);
const methodClass = makeClass('Ljava/lang/reflect/Method;');
const reflectionClass = makeClass('Lsun/reflect/Reflection;');
const stack = [
  makeFrame(outerClass, 'fixture/Outer/entry()V'),
  makeFrame(callerClass, 'fixture/Caller/call()V'),
  makeFrame(magicClass, 'sun/reflect/GeneratedMethodAccessor1/invoke()V'),
  makeFrame(methodClass, 'java/lang/reflect/Method/invoke(Ljava/lang/Object;)Ljava/lang/Object;'),
  makeFrame(reflectionClass, 'sun/reflect/Reflection/getCallerClass()Ljava/lang/Class;')
];
const thread = {
  getStackTrace() {
    return stack;
  }
};

assert.equal(
  reflection['getCallerClass()Ljava/lang/Class;'](thread),
  'Lfixture/Caller;',
  'the no-arg intrinsic must apply its physical depth before skipping reflection frames'
);
assert.equal(
  reflection['getCallerClass(I)Ljava/lang/Class;'](thread, 0),
  'Lsun/reflect/Reflection;',
  'logical depth zero must identify Reflection itself'
);
assert.equal(
  reflection['getCallerClass(I)Ljava/lang/Class;'](thread, 1),
  'Lfixture/Caller;',
  'logical depth must not count Method.invoke or MagicAccessor frames'
);
assert.equal(
  reflection['getCallerClass(I)Ljava/lang/Class;'](thread, 2),
  'Lfixture/Outer;',
  'the deprecated overload must count only logical security frames'
);
assert.equal(
  reflection['getCallerClass(I)Ljava/lang/Class;'](thread, 3),
  null,
  'a caller depth beyond the logical stack must return null'
);

const applicationLoader = {bootstrap}, foreignCaller = makeClass('Lfixture/Foreign;', null, applicationLoader);
const privateFlags = new util.Flags(2), packageFlags = new util.Flags(0), protectedFlags = new util.Flags(4);
assert.equal(util.checkAccess(callerClass, outerClass, packageFlags), true);
assert.equal(util.checkAccess(foreignCaller, outerClass, packageFlags), false, 'Package spelling must not cross defining loaders');
assert.equal(util.checkAccess(foreignCaller, outerClass, protectedFlags), false);
const subclass = makeClass('Lother/Subclass;', outerClass, applicationLoader);
assert.equal(util.checkAccess(subclass, outerClass, protectedFlags), true);
const forgedLambda = makeClass('Lfixture/Outer$$Lambda$Forged;', null, applicationLoader);
assert.equal(util.checkAccess(forgedLambda, outerClass, privateFlags), false, 'A lambda name grants no private access');
const fakeMagicBase = makeClass('Lsun/reflect/MagicAccessorImpl;', null, applicationLoader);
const fakeMagic = makeClass('Lsun/reflect/GeneratedMethodAccessor1;', fakeMagicBase, applicationLoader);
assert.equal(util.isMagicAccessor(fakeMagic), false, 'Stack filtering requires a real bootstrap or producer identity');
assert.equal(util.checkAccess(fakeMagic, outerClass, privateFlags), false, 'A MagicAccessor name grants no member access');
assert.equal(util.checkAccess(magicClass, outerClass, privateFlags), false, 'Even real reflection ancestry is not blanket member authority');
stack[2] = makeFrame(fakeMagic, 'sun/reflect/GeneratedMethodAccessor1/invoke()V');
assert.equal(reflection['getCallerClass(I)Ljava/lang/Class;'](thread, 1), fakeMagic.getClassObject(),
  'A forged reflection frame must remain visible to the security caller walk');

console.log('reflection-caller-depth:5:ok');
