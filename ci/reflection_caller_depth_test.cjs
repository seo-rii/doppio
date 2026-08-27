'use strict';

const assert = require('assert');
const reflectionNatives = require('../build/release-cli/src/natives/sun_reflect').default();

const reflection = reflectionNatives['sun/reflect/Reflection'];

function makeClass(name, superClass = null) {
  return {
    getInternalName() {
      return name;
    },
    getSuperClass() {
      return superClass;
    },
    getClassObject() {
      return name;
    }
  };
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

console.log('reflection-caller-depth:5:ok');
