const prefix = 'sealedloader.';
const driver = 'classes.modern_test.JavaSealedLoading';
const B = prefix + 'p.Base', C = prefix + 'p.Child', I = prefix + 'p.I', M = prefix + 'p.Impl';
const initialize = `static { ${driver}.noteInitialization(); }`;

function source(name, declaration, initialization = true) {
  const packageName = name.slice(0, name.lastIndexOf('.'));
  return {binaryName: prefix + name, text: `package ${prefix + packageName}; ${declaration} { ${initialization ? initialize : ''} }\n`};
}
function unit(id, sources, driverClasspath = true, compilerMode = 'ordinary-classpath', moduleName) {
  return {id, compilerMode, ...(moduleName ? {moduleName} : {}), driverClasspath, sources,
    expectedClassNames: sources.map(item => item.binaryName).sort()};
}

export function loadingCompilationUnits() {
  return [
    unit('loading-original', [
      source('p.Base', 'public class Base'), source('p.Child', 'public class Child extends Base'),
      source('p.Other', 'public class Other extends Base'), source('p.I', 'public interface I', false),
      source('p.Impl', 'public class Impl extends Base implements I'),
      source('p.OtherImpl', 'public class OtherImpl implements I'), source('p.SubI', 'public interface SubI extends I', false),
      source('p.PackageChild', 'class PackageChild extends Base'), source('p.PackageImpl', 'class PackageImpl implements I'),
      source('q.PublicChild', 'public class PublicChild extends sealedloader.p.Base'),
      source('q.PackageChild', 'class PackageChild extends sealedloader.p.Base'),
      source('q.PublicImpl', 'public class PublicImpl implements sealedloader.p.I'),
      source('q.PackageImpl', 'class PackageImpl implements sealedloader.p.I')
    ]),
    unit('loading-permitted', [
      source('p.Base', 'public sealed class Base permits Child, Impl, PackageChild'),
      source('p.I', 'public sealed interface I permits Impl, SubI, PackageImpl', false),
      source('p.Child', 'public final class Child extends Base'),
      source('p.Impl', 'public final class Impl extends Base implements I'),
      source('p.SubI', 'public non-sealed interface SubI extends I', false),
      source('p.PackageChild', 'final class PackageChild extends Base'),
      source('p.PackageImpl', 'final class PackageImpl implements I')
    ]),
    unit('loading-unlisted', [
      source('p.Base', 'public sealed class Base permits Other'), source('p.Other', 'public final class Other extends Base'),
      source('p.I', 'public sealed interface I permits OtherImpl', false),
      source('p.OtherImpl', 'public final class OtherImpl implements I')
    ]),
    unit('loading-crosspackage', [
      {binaryName: 'module-info', text: 'module b7.sealed { }\n'},
      source('p.Base', 'public sealed class Base permits sealedloader.q.PublicChild, sealedloader.q.PackageChild', false),
      source('p.I', 'public sealed interface I permits sealedloader.q.PublicImpl, sealedloader.q.PackageImpl', false),
      source('q.PublicChild', 'public final class PublicChild extends sealedloader.p.Base', false),
      source('q.PackageChild', 'public final class PackageChild extends sealedloader.p.Base', false),
      source('q.PublicImpl', 'public final class PublicImpl implements sealedloader.p.I', false),
      source('q.PackageImpl', 'public final class PackageImpl implements sealedloader.p.I', false)
    ], false, 'named-module-source', 'b7.sealed')
  ];
}

const classParents = {
  [B]: ['java.lang.Object', []], [I]: ['java.lang.Object', []], [C]: [B, []], [M]: [B, [I]],
  [prefix + 'p.Other']: [B, []], [prefix + 'p.OtherImpl']: ['java.lang.Object', [I]],
  [prefix + 'p.SubI']: ['java.lang.Object', [I]], [prefix + 'p.PackageChild']: [B, []],
  [prefix + 'p.PackageImpl']: ['java.lang.Object', [I]], [prefix + 'q.PublicChild']: [B, []],
  [prefix + 'q.PackageChild']: [B, []], [prefix + 'q.PublicImpl']: ['java.lang.Object', [I]],
  [prefix + 'q.PackageImpl']: ['java.lang.Object', [I]]
};
const permits = {
  'loading-original': {[B]: null, [I]: null},
  'loading-permitted': {[B]: [C, M, prefix + 'p.PackageChild'], [I]: [M, prefix + 'p.SubI', prefix + 'p.PackageImpl']},
  'loading-unlisted': {[B]: [prefix + 'p.Other'], [I]: [prefix + 'p.OtherImpl']},
  'loading-crosspackage': {[B]: [prefix + 'q.PublicChild', prefix + 'q.PackageChild'], [I]: [prefix + 'q.PublicImpl', prefix + 'q.PackageImpl']}
};
const isInterface = name => [I, prefix + 'p.SubI'].includes(name);
const isPackage = name => name.includes('.Package');
function binding(id, tree, name, compilationUnitId) {
  return {id: `${id}:${tree}:${name}`, binaryName: name, compilationUnitId, loaderTree: tree,
    resourcePath: `sealed-payloads/sealed-loading/${id}/${tree}/${name.replaceAll('.', '/')}.bin`};
}
function proof(payload) {
  const [superName, interfaceNames] = classParents[payload.binaryName];
  return {kind: 'class', payloadId: payload.id, flags: {required: (isPackage(payload.binaryName) ? 0 : 1) | (isInterface(payload.binaryName) ? 0x600 : 0),
    forbidden: (isPackage(payload.binaryName) ? 1 : 0) | (isInterface(payload.binaryName) ? 0 : 0x200)},
  superName, interfaceNames, permits: permits[payload.compilationUnitId][payload.binaryName] ?? null,
  ...(payload.compilationUnitId !== 'loading-crosspackage' && !isInterface(payload.binaryName) ? {
    passiveInitializer: {owner: driver, name: 'noteInitialization', descriptor: '()V'}
  } : {})};
}

const descriptions = [
  ['sl-class-control', 'caseClassControl', B, C, false, false, true],
  ['sl-interface-control', 'caseInterfaceControl', I, M, false, false, true],
  ['sl-class-permitted', 'caseClassPermitted', B, C, true, false, true],
  ['sl-interface-permitted', 'caseInterfacePermitted', I, M, true, false, true],
  ['sl-subinterface-permitted', 'caseSubinterfacePermitted', I, prefix + 'p.SubI', true, false, true],
  ['sl-class-unlisted', 'caseClassUnlisted', B, C, true, true, true],
  ['sl-interface-unlisted', 'caseInterfaceUnlisted', I, M, true, true, true],
  ['sl-subinterface-unlisted', 'caseSubinterfaceUnlisted', I, prefix + 'p.SubI', true, true, true],
  ['sl-class-loader-split', 'caseClassLoaderSplit', B, C, true, true, true],
  ['sl-interface-loader-split', 'caseInterfaceLoaderSplit', I, M, true, true, true],
  ['sl-loader-delegation', 'caseLoaderDelegation', B, C, true, false, true],
  ['sl-class-unseal-owner', 'caseClassUnsealOwner', B, C, false, false, true],
  ['sl-interface-unseal-owner', 'caseInterfaceUnsealOwner', I, M, false, false, true],
  ['sl-public-crosspackage-class', 'casePublicCrosspackageClass', B, prefix + 'q.PublicChild', true, false, true],
  ['sl-public-crosspackage-interface', 'casePublicCrosspackageInterface', I, prefix + 'q.PublicImpl', true, false, true],
  ['sl-nonpublic-crosspackage-class', 'caseNonpublicCrosspackageClass', B, prefix + 'q.PackageChild', true, true, false],
  ['sl-nonpublic-crosspackage-interface', 'caseNonpublicCrosspackageInterface', I, prefix + 'q.PackageImpl', true, true, false],
  ['sl-nonpublic-samepackage-class', 'caseNonpublicSamepackageClass', B, prefix + 'p.PackageChild', true, false, false],
  ['sl-nonpublic-samepackage-interface', 'caseNonpublicSamepackageInterface', I, prefix + 'p.PackageImpl', true, false, false],
  ['sl-foreign-parent-identity', 'caseForeignParentIdentity', B, C, true, false, true]
];

function entry([id, entryMethod, owner, child, sealed, denied, publicChild]) {
  const payloads = [];
  const add = (tree, name, compilation) => {
    if (!payloads.some(item => item.loaderTree === tree && item.binaryName === name)) payloads.push(binding(id, tree, name, compilation));
  };
  let ownerCompilation = !sealed ? 'loading-original' : denied && id.includes('unlisted') ? 'loading-unlisted' : 'loading-permitted';
  if (id.includes('crosspackage')) ownerCompilation = 'loading-crosspackage';
  let trace = [sealed ? 'owner=sealed' : 'owner=ordinary', ...(denied ? ['child=java.lang.IncompatibleClassChangeError', 'published=false'] :
    ['child=passive', 'identity=direct-parent', publicChild ? 'access=public' : 'access=package', 'published=true']), 'init=0'];
  if (id.endsWith('loader-split')) {
    add('primary', owner, 'loading-permitted'); add('foreign', child, 'loading-original');
    if (child === M) add('foreign', B, 'loading-original');
    trace = ['owner=sealed', 'child=java.lang.IncompatibleClassChangeError', 'published=false', 'modules=different-defining-loaders', 'init=0'];
  } else if (id.endsWith('unseal-owner')) {
    add('primary', owner, 'loading-unlisted'); add('primary', child, 'loading-original');
    add('foreign', owner, 'loading-original'); add('foreign', child, 'loading-original');
    if (child === M) { add('primary', B, 'loading-permitted'); add('foreign', B, 'loading-original'); }
    trace = ['baseline=sealed', 'before=java.lang.IncompatibleClassChangeError', 'after=passive', 'parent=unsealed', 'identity=direct-parent', 'init=0'];
  } else if (id === 'sl-foreign-parent-identity') {
    add('primary', B, 'loading-permitted'); add('foreign', B, 'loading-permitted'); add('foreign', C, 'loading-original');
    trace = ['owner=sealed', 'same-name=distinct-owners', 'child=foreign-direct-parent', 'permitted=empty', 'init=0'];
  } else {
    add('primary', owner, ownerCompilation); add('primary', child, 'loading-original');
    if (child === M) add('primary', B, id === 'sl-interface-control' ? 'loading-original' : 'loading-permitted');
    if (id === 'sl-loader-delegation') trace = ['owner=sealed', 'child=passive', 'identity=same-defining-loader', 'initiating=delegated', 'init=0'];
  }
  const helper = id.endsWith('loader-split') ? 'split' : id.endsWith('unseal-owner') ? 'unseal' :
    ['sl-loader-delegation', 'sl-foreign-parent-identity'].includes(id) ? entryMethod : 'inspect';
  const helperDescriptor = helper === 'inspect' ? '(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;ZZZ)V' :
    ['split', 'unseal'].includes(helper) ? '(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V' : '()V';
  const classAnchor = owner === B;
  return {id, entryMethod, entryDescriptor: '()V', kind: 'genuine-binary-evolution-and-resource-only-loader',
    oracleKind: 'specification', oracleStatus: 'fixed', trace, payloads,
    anchors: {JLS: classAnchor ? ['8.1.1.2', '8.1.6', '13.4.2', '13.4.2.1'] : ['9.1.1.4', '9.1.4', '13.5.2'],
      JVMS: ['4.7.31', '5.3.2', '5.3.5', '5.3.6']},
    probes: [{method: helper, descriptor: helperDescriptor, requiredOpcodes: ['invokestatic', 'invokevirtual']},
      {method: 'passive', descriptor: '(Ljava/lang/String;Lclasses/modern_test/JavaSealedLoading$PayloadLoader;)Ljava/lang/Class;',
        requiredOpcodes: ['invokestatic', 'areturn'], symbolicOperands: [{opcode: 'invokestatic', tag: 10, owner: 'java.lang.Class', name: 'forName',
          descriptor: '(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;'}]}],
    sealedProofs: payloads.map(proof),
    limitations: ['Selected genuine/evolved binaries, not complete sealed source acceptance or package conformance.',
      'Class identity and defining-loader policy are checked by genuine Java == operations, never inferred from names.',
      ...(id.includes('crosspackage') ? ['Named-module compiler input executes only as ordinary class bytes in an unnamed loader; named-module runtime conformance is not proven.'] : []),
      'No permitted-array order, loader call order, SecurityManager or arbitrary named-module behavior assertion.']};
}

export default {
  id: 'sealed-loading', source: 'classes/modern_fixture/JavaSealedLoading.java', mainClass: driver,
  completionMarker: 'SEALED_LOADING_OK', kind: 'genuine-evolution-and-resource-only-loading',
  driverClassNames: [driver, driver + '$PayloadLoader'].sort(), sealedClassNames: [],
  compilationUnits: loadingCompilationUnits, cases: descriptions.map(entry)
};
