package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.*;
import java.lang.reflect.AccessFlag;
import java.nio.file.*;
import java.util.*;
import java.util.function.Consumer;

/** Finite module-metadata codec checks; no module definition, resolution, exports or opens execution. */
public class ClassFileModuleAttributeRegression {
  private static int passed;
  private static final ModuleDesc OWN = ModuleDesc.of("metadata.module");
  private static final ModuleDesc BASE = ModuleDesc.of("java.base"), OTHER = ModuleDesc.of("metadata.other");
  private static final PackageDesc PKG = PackageDesc.of("metadata.api"), IMPL = PackageDesc.of("metadata.impl");
  private static final ClassDesc SERVICE = ClassDesc.of("metadata.api.Service"), FIRST = ClassDesc.of("metadata.impl.First"), SECOND = ClassDesc.of("metadata.impl.Second");
  private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); passed++; }
  private static void expect(Class<? extends Throwable> type, Runnable operation, String message) {
    Throwable failure = null; try { operation.run(); } catch (Throwable caught) { failure = caught; }
    check(failure != null && type.isInstance(failure), message);
  }
  private static void factories() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of(); ModuleEntry own = pool.moduleEntry(OWN), other = pool.moduleEntry(OTHER);
    PackageEntry pkg = pool.packageEntry(PKG); ClassEntry service = pool.classEntry(SERVICE), impl = pool.classEntry(FIRST);
    Utf8Entry version = pool.utf8Entry("25"), algorithm = pool.utf8Entry("SHA-256");
    ModuleRequireInfo rawRequire = ModuleRequireInfo.of(other, 0x10000, version);
    check(rawRequire.requires() == other && rawRequire.requiresVersion().get() == version && rawRequire.requiresFlagsMask() == 0x10000, "Raw require preserves entries and signed int flags before wire narrowing");
    expect(IllegalArgumentException.class, () -> rawRequire.requiresFlags(), "Invalid raw require flags fail only in typed view");
    ModuleRequireInfo require = ModuleRequireInfo.of(BASE, Arrays.asList(AccessFlag.MANDATED, AccessFlag.TRANSITIVE), "9");
    check(require.requires().asSymbol().equals(BASE) && require.requiresFlagsMask() == 0x8020 && require.requiresVersion().get().stringValue().equals("9"), "Nominal require flags collection and version");
    check(require.has(AccessFlag.TRANSITIVE) && !require.has(AccessFlag.OPEN), "Require has checks native flag location despite shared bit");
    check(ModuleRequireInfo.of(other, Arrays.asList(AccessFlag.SYNTHETIC), (Utf8Entry) null).requiresVersion().isEmpty(), "Raw flags overload preserves absent version");
    check(ModuleRequireInfo.of(BASE, 0, (String) null).requiresVersion().isEmpty(), "Nominal int overload preserves absent version");
    check(require.equals(ModuleRequireInfo.of(BASE, 0x8020, "9")) && require.hashCode() == ModuleRequireInfo.of(BASE, 0x8020, "9").hashCode(), "Native require record structural equality/hash");
    List<ModuleEntry> targets = new ArrayList<ModuleEntry>(); targets.add(other);
    ModuleExportInfo export = ModuleExportInfo.of(pkg, 0, targets); ModuleOpenInfo open = ModuleOpenInfo.of(pkg, 0, targets); targets.clear();
    check(export.exportedPackage() == pkg && export.exportsTo().get(0) == other && open.openedPackage() == pkg && open.opensTo().get(0) == other, "Export/open copy lists but preserve supplied CP identities");
    expect(UnsupportedOperationException.class, () -> export.exportsTo().clear(), "Export target list is immutable");
    expect(UnsupportedOperationException.class, () -> open.opensTo().clear(), "Open target list is immutable");
    check(ModuleExportInfo.of(pkg, Arrays.asList(AccessFlag.SYNTHETIC), Arrays.asList(other)).exportsFlagsMask() == 0x1000, "Raw export flags/list overload");
    check(ModuleExportInfo.of(pkg, 0, other).exportsTo().size() == 1, "Raw export int/varargs overload");
    check(ModuleExportInfo.of(pkg, Arrays.asList(AccessFlag.MANDATED), other).has(AccessFlag.MANDATED), "Raw export flags/varargs overload");
    check(ModuleExportInfo.of(PKG, 0, Arrays.asList(OTHER)).exportedPackage().asSymbol().equals(PKG), "Nominal export int/list overload");
    check(ModuleExportInfo.of(PKG, Arrays.asList(AccessFlag.SYNTHETIC), Arrays.asList(OTHER)).exportsFlagsMask() == 0x1000, "Nominal export flags/list overload");
    check(ModuleExportInfo.of(PKG, 0, OTHER).exportsTo().get(0).asSymbol().equals(OTHER), "Nominal export int/varargs overload");
    check(ModuleExportInfo.of(PKG, Arrays.asList(AccessFlag.MANDATED), OTHER).has(AccessFlag.MANDATED), "Nominal export flags/varargs overload");
    check(ModuleOpenInfo.of(pkg, Arrays.asList(AccessFlag.SYNTHETIC), Arrays.asList(other)).opensFlagsMask() == 0x1000, "Raw open flags/list overload");
    check(ModuleOpenInfo.of(pkg, 0, other).opensTo().size() == 1, "Raw open int/varargs overload");
    check(ModuleOpenInfo.of(pkg, Arrays.asList(AccessFlag.MANDATED), other).has(AccessFlag.MANDATED), "Raw open flags/varargs overload");
    check(ModuleOpenInfo.of(PKG, 0, Arrays.asList(OTHER)).openedPackage().asSymbol().equals(PKG), "Nominal open int/list overload");
    check(ModuleOpenInfo.of(PKG, Arrays.asList(AccessFlag.SYNTHETIC), Arrays.asList(OTHER)).opensFlagsMask() == 0x1000, "Nominal open flags/list overload");
    check(ModuleOpenInfo.of(PKG, 0, OTHER).opensTo().get(0).asSymbol().equals(OTHER), "Nominal open int/varargs overload");
    check(ModuleOpenInfo.of(PKG, Arrays.asList(AccessFlag.MANDATED), OTHER).has(AccessFlag.MANDATED), "Nominal open flags/varargs overload");
    check(ModuleExportInfo.of(PKG, 0, OTHER).equals(ModuleExportInfo.of(PKG, 0, OTHER)) && ModuleOpenInfo.of(PKG, 0, OTHER).equals(ModuleOpenInfo.of(PKG, 0, OTHER)), "Export/open records use structural fields");
    List<ClassEntry> implementations = new ArrayList<ClassEntry>(); implementations.add(impl);
    ModuleProvideInfo provide = ModuleProvideInfo.of(service, implementations); implementations.clear();
    check(provide.provides() == service && provide.providesWith().get(0) == impl, "Provide copies caller list with exact CP identities");
    expect(UnsupportedOperationException.class, () -> provide.providesWith().clear(), "Provide implementation list is immutable");
    check(ModuleProvideInfo.of(service, impl).providesWith().size() == 1 && ModuleProvideInfo.of(SERVICE, Arrays.asList(FIRST)).providesWith().get(0).asSymbol().equals(FIRST), "Provide raw varargs and nominal list overloads");
    ModuleProvideInfo nominalProvide = ModuleProvideInfo.of(SERVICE, FIRST);
    int serviceHash = (7 * 0x13c4b2d1 + SERVICE.descriptorString().hashCode()) | 0x40000000;
    int implementationHash = (7 * 0x13c4b2d1 + FIRST.descriptorString().hashCode()) | 0x40000000;
    check(nominalProvide.equals(ModuleProvideInfo.of(SERVICE, FIRST)) && nominalProvide.hashCode() == 31 * serviceHash + 31 + implementationHash,
        "Provide nominal varargs structural equality and native descriptor-derived record hash");
    check(ModuleProvideInfo.of(SERVICE, Collections.<ClassDesc>emptyList()).providesWith().isEmpty(), "Native metadata model permits empty provides list without a runtime validity claim");
    byte[] bytes = new byte[] {1, 2}; ModuleHashInfo hash = ModuleHashInfo.of(own, bytes);
    check(hash.moduleName() == own && hash.hash() == bytes, "Native hash record retains actual byte array identity");
    bytes[0] = 9; check(hash.hash()[0] == 9, "Hash array getter is the native mutable array view");
    check(hash.equals(ModuleHashInfo.of(own, bytes)) && hash.hashCode() == ModuleHashInfo.of(own, bytes).hashCode(), "Hash record uses array identity in equality/hash");
    check(!hash.equals(ModuleHashInfo.of(own, new byte[] {9, 2})), "Equal byte contents are not native record array identity");
    check(ModuleHashInfo.of(OWN, bytes).moduleName().asSymbol().equals(OWN), "Nominal hash factory creates actual module entry");
    List<PackageEntry> packages = new ArrayList<PackageEntry>(); packages.add(pkg);
    ModulePackagesAttribute packageAttr = ModulePackagesAttribute.of(packages); packages.clear();
    check(packageAttr.packages().get(0) == pkg && ModulePackagesAttribute.of(pkg).packages().get(0) == pkg, "Package attrs copy lists and retain raw entries");
    check(ModulePackagesAttribute.ofNames(Arrays.asList(PKG)).packages().get(0).asSymbol().equals(PKG) && ModulePackagesAttribute.ofNames(PKG).packages().size() == 1, "Both nominal package-list factories");
    expect(UnsupportedOperationException.class, () -> packageAttr.packages().clear(), "Package attr list is immutable");
    check(ModuleMainClassAttribute.of(service).mainClass() == service && ModuleMainClassAttribute.of(SERVICE).mainClass().asSymbol().equals(SERVICE), "MainClass raw/nominal factories");
    check(ModuleTargetAttribute.of(version).targetPlatform() == version && ModuleTargetAttribute.of("linux-amd64").targetPlatform().stringValue().equals("linux-amd64"), "Target raw/text factories");
    check(ModuleResolutionAttribute.of(-1).resolutionFlags() == -1, "Resolution factory preserves signed integer flags before wire narrowing");
    List<ModuleHashInfo> hashes = new ArrayList<ModuleHashInfo>(); hashes.add(hash); ModuleHashesAttribute hashAttr = ModuleHashesAttribute.of(algorithm, hashes); hashes.clear();
    check(hashAttr.algorithm() == algorithm && hashAttr.hashes().get(0) == hash, "Hash attr copies only caller list and retains algorithm/hash records");
    check(ModuleHashesAttribute.of(algorithm, hash).hashes().get(0) == hash && ModuleHashesAttribute.of("SHA-256", Arrays.asList(hash)).algorithm().stringValue().equals("SHA-256") && ModuleHashesAttribute.of("SHA-256", hash).hashes().size() == 1, "All hash attr raw/text list/varargs factories");
    expect(UnsupportedOperationException.class, () -> hashAttr.hashes().clear(), "Hash attr list is immutable");
    List<ModuleRequireInfo> requires = new ArrayList<ModuleRequireInfo>(); requires.add(require);
    ModuleAttribute module = ModuleAttribute.of(own, -1, version, requires, Arrays.asList(export), Arrays.asList(open), Arrays.asList(service), Arrays.asList(provide)); requires.clear();
    check(module.moduleName() == own && module.moduleVersion().get() == version && module.moduleFlagsMask() == -1 && module.requires().get(0) == require, "Module raw factory preserves entries/flags and copies collections");
    expect(UnsupportedOperationException.class, () -> module.requires().clear(), "Module requires list is immutable");
    expect(IllegalArgumentException.class, () -> module.moduleFlags(), "Invalid raw module mask fails typed flag view");
    check(module.has(AccessFlag.OPEN) && !module.has(AccessFlag.TRANSITIVE), "Module has observes actual module flag location");
    boolean mappers = true;
    for (Attribute<?> attr : Arrays.<Attribute<?>>asList(module, packageAttr, ModuleMainClassAttribute.of(service), ModuleTargetAttribute.of(version), hashAttr))
      mappers &= !attr.attributeMapper().allowMultiple() && attr.attributeMapper().stability() == AttributeMapper.AttributeStability.CP_REFS;
    check(mappers && !ModuleResolutionAttribute.of(0).attributeMapper().allowMultiple() && ModuleResolutionAttribute.of(0).attributeMapper().stability() == AttributeMapper.AttributeStability.STATELESS, "Six native single-attribute stability policies");
    check(module instanceof ClassElement && !(((Object) module) instanceof MethodElement), "Module attrs are class metadata only");
    expect(NullPointerException.class, () -> ModuleHashInfo.of(OWN, null), "Hash requires nonnull actual byte array");
    expect(NullPointerException.class, () -> ModuleExportInfo.of(PKG, 0, Arrays.asList((ModuleDesc) null)), "Export requires nonnull target symbols");
    expect(NullPointerException.class, () -> ModulePackagesAttribute.of(Arrays.asList((PackageEntry) null)), "Package list rejects null entries");
    expect(IllegalArgumentException.class, () -> ModuleRequireInfo.of(BASE, Arrays.asList(AccessFlag.OPEN), (String) null), "Require flags reject wrong native location");
    expect(IllegalArgumentException.class, () -> ModuleExportInfo.of(PKG, Arrays.asList(AccessFlag.PUBLIC), OTHER), "Export flags reject wrong native location");
    expect(IllegalArgumentException.class, () -> ModuleOpenInfo.of(PKG, Arrays.asList(AccessFlag.PUBLIC), OTHER), "Open flags reject wrong native location");
    expect(IllegalArgumentException.class, () -> ModuleMainClassAttribute.of(ConstantDescs.CD_int), "Nominal main class rejects primitive class symbol");
    check(ModuleRequireInfo.of(BASE, 0, null).requires().index() == -2 && ModuleRequireInfo.of(BASE, 0, null).requires().name().index() == -1, "Nominal factories use native unbound temporary pool entry provenance");
  }
  private static ModuleAttribute builderModule() {
    ModuleRequireInfo require = ModuleRequireInfo.of(BASE, 0x8000, "9");
    ModuleExportInfo export = ModuleExportInfo.of(PKG, 0x1000, OTHER);
    ModuleOpenInfo open = ModuleOpenInfo.of(IMPL, 0x8000, OTHER);
    ModuleProvideInfo provide = ModuleProvideInfo.of(SERVICE, FIRST, SECOND);
    return ModuleAttribute.of(OWN, builder -> builder.moduleName(OWN).moduleFlags(AccessFlag.SYNTHETIC, AccessFlag.MANDATED).moduleVersion("25")
        .requires(BASE, Arrays.asList(AccessFlag.MANDATED), "9").requires(require)
        .exports(PKG, Arrays.asList(AccessFlag.SYNTHETIC), OTHER).exports(export)
        .opens(IMPL, Arrays.asList(AccessFlag.MANDATED), OTHER).opens(open)
        .uses(SERVICE).uses(ModuleMainClassAttribute.of(SERVICE).mainClass()).provides(SERVICE, FIRST, SECOND).provides(provide));
  }
  private static void builders() {
    ModuleAttribute module = builderModule();
    check(module.moduleName().asSymbol().equals(OWN) && module.moduleFlagsMask() == 0x9000 && module.moduleVersion().get().stringValue().equals("25"), "Builder scalar fields and typed flags");
    check(module.requires().size() == 1 && module.exports().size() == 1 && module.opens().size() == 1 && module.uses().size() == 1 && module.provides().size() == 1, "Builder insertion-ordered native sets de-duplicate structurally equal entries");
    ConstantPoolBuilder pool = ConstantPoolBuilder.of(); ModuleEntry raw = pool.moduleEntry(OWN);
    ModuleAttribute builtRaw = ModuleAttribute.of(raw, builder -> builder.moduleVersion("temporary").moduleVersion(null).moduleFlags(0));
    check(builtRaw.moduleName() == raw && builtRaw.moduleVersion().isEmpty() && builtRaw.requires().isEmpty(), "Raw module builder preserves entry and null version clears prior state");
    ModuleAttribute ordered = ModuleAttribute.of(OWN, builder -> builder.requires(BASE, 0, null).requires(OTHER, 0, null).requires(BASE, 0, null)
        .exports(PKG, 0).opens(IMPL, 0).uses(SERVICE).uses(FIRST).provides(SERVICE));
    check(ordered.requires().size() == 2 && ordered.requires().get(0).requires().asSymbol().equals(BASE) && ordered.requires().get(1).requires().asSymbol().equals(OTHER), "Builder de-duplication preserves first insertion order");
    check(ordered.exports().get(0).exportsTo().isEmpty() && ordered.opens().get(0).opensTo().isEmpty() && ordered.provides().get(0).providesWith().isEmpty(), "Builder permits unqualified target lists and raw empty provider vector");
    expect(IllegalArgumentException.class, () -> ModuleAttribute.of(OWN, builder -> builder.moduleFlags(AccessFlag.PUBLIC)), "Builder typed module flags reject wrong location");
    expect(NullPointerException.class, () -> ModuleAttribute.of(OWN, builder -> builder.requires((ModuleRequireInfo) null)), "Builder rejects null require info");
    expect(NullPointerException.class, () -> ModuleAttribute.of(OWN, builder -> builder.exports((ModuleExportInfo) null)), "Builder rejects null export info");
    expect(NullPointerException.class, () -> ModuleAttribute.of(OWN, builder -> builder.opens((ModuleOpenInfo) null)), "Builder rejects null open info");
    expect(NullPointerException.class, () -> ModuleAttribute.of(OWN, builder -> builder.uses((ClassEntry) null)), "Builder rejects null service entry");
    expect(NullPointerException.class, () -> ModuleAttribute.of(OWN, builder -> builder.provides((ModuleProvideInfo) null)), "Builder rejects null provides info");
    expect(NullPointerException.class, () -> ModuleAttribute.of(OWN, builder -> builder.moduleName(null)), "Builder requires nonnull renamed module descriptor");
    expect(IllegalArgumentException.class, () -> ModuleAttribute.of(OWN, builder -> builder.uses(ConstantDescs.CD_int)), "Builder nominal service rejects primitive");
    check(ModuleAttribute.of((ModuleEntry) null, builder -> builder.moduleName(OWN)).moduleName().asSymbol().equals(OWN), "Native raw-name builder permits handler to replace initial null entry");
  }
  private static byte[] fixture(ClassFile context) {
    ModuleAttribute module = ModuleAttribute.of(OWN, builder -> builder.moduleFlags(AccessFlag.SYNTHETIC).moduleVersion("25")
        .requires(BASE, 0x8000, "9").requires(OTHER, 0, null)
        .exports(PKG, 0x1000, OTHER, BASE).exports(IMPL, 0)
        .opens(IMPL, 0x8000, BASE, OTHER).opens(PKG, 0)
        .uses(SERVICE).uses(FIRST).provides(SERVICE, FIRST, SECOND).provides(FIRST, SECOND));
    return context.buildModule(module, builder -> builder.with(ModulePackagesAttribute.ofNames(PKG, IMPL))
        .with(ModuleMainClassAttribute.of(FIRST)).with(ModuleTargetAttribute.of("linux-amd64"))
        .with(ModuleResolutionAttribute.of(0x10009)).with(ModuleHashesAttribute.of("SHA-256",
            ModuleHashInfo.of(BASE, new byte[] {0, 1, -1, 127}), ModuleHashInfo.of(OTHER, new byte[0]))));
  }
  private static boolean owned(PoolEntry entry, ConstantPool pool) {
    if (entry.constantPool() != pool) return false;
    if (entry instanceof ModuleEntry) return ((ModuleEntry) entry).name().constantPool() == pool;
    if (entry instanceof PackageEntry) return ((PackageEntry) entry).name().constantPool() == pool;
    if (entry instanceof ClassEntry) return ((ClassEntry) entry).name().constantPool() == pool;
    return true;
  }
  private static void metadata(ClassModel model) {
    ConstantPool pool = model.constantPool(); ModuleAttribute module = model.findAttribute(Attributes.module()).get();
    check(model.isModuleInfo() && model.thisClass().asInternalName().equals("module-info") && model.superclass().isEmpty() && model.interfaces().isEmpty() && model.fields().isEmpty() && model.methods().isEmpty(), "Actual module-info header has flags and zero implicit superclass");
    check(module.moduleName().asSymbol().equals(OWN) && module.moduleFlagsMask() == 0x1000 && module.moduleVersion().get().stringValue().equals("25"), "Typed module scalar metadata");
    check(module.moduleFlags().contains(AccessFlag.SYNTHETIC) && module.has(AccessFlag.SYNTHETIC) && !module.has(AccessFlag.OPEN), "Typed module flag views");
    check(owned(module.moduleName(), pool) && owned(module.moduleVersion().get(), pool), "Module name and version belong to parsed destination pool");
    check(module.requires().size() == 2 && module.requires().get(0).requires().asSymbol().equals(BASE) && module.requires().get(1).requires().asSymbol().equals(OTHER), "Ordered complete requires vector");
    check(module.requires().get(0).requiresFlagsMask() == 0x8000 && module.requires().get(0).requiresVersion().get().stringValue().equals("9") && module.requires().get(1).requiresVersion().isEmpty(), "Requires flags and optional nonzero/zero version indexes");
    check(owned(module.requires().get(0).requires(), pool) && owned(module.requires().get(1).requires(), pool) && owned(module.requires().get(0).requiresVersion().get(), pool), "Requires recursive references use destination pool");
    check(module.exports().size() == 2 && module.exports().get(0).exportedPackage().asSymbol().equals(PKG) && module.exports().get(1).exportedPackage().asSymbol().equals(IMPL), "Ordered full export packages");
    ModuleExportInfo export = module.exports().get(0);
    check(export.exportsFlagsMask() == 0x1000 && export.exportsTo().size() == 2 && export.exportsTo().get(0).asSymbol().equals(OTHER) && export.exportsTo().get(1).asSymbol().equals(BASE) && module.exports().get(1).exportsTo().isEmpty(), "Qualified and unqualified exports target vectors");
    check(owned(export.exportedPackage(), pool) && owned(export.exportsTo().get(0), pool) && owned(export.exportsTo().get(1), pool) && owned(module.exports().get(1).exportedPackage(), pool), "Export references and UTF children belong to destination pool");
    ModuleOpenInfo open = module.opens().get(0);
    check(module.opens().size() == 2 && open.openedPackage().asSymbol().equals(IMPL) && module.opens().get(1).openedPackage().asSymbol().equals(PKG), "Ordered full opens packages");
    check(open.opensFlagsMask() == 0x8000 && open.opensTo().size() == 2 && open.opensTo().get(0).asSymbol().equals(BASE) && open.opensTo().get(1).asSymbol().equals(OTHER) && module.opens().get(1).opensTo().isEmpty(), "Qualified and unqualified opens target vectors");
    check(owned(open.openedPackage(), pool) && owned(open.opensTo().get(0), pool) && owned(open.opensTo().get(1), pool), "Open references and UTF children use destination pool");
    check(module.uses().size() == 2 && module.uses().get(0).asSymbol().equals(SERVICE) && module.uses().get(1).asSymbol().equals(FIRST), "Full ordered service uses vector");
    check(owned(module.uses().get(0), pool) && owned(module.uses().get(1), pool), "Service uses class references use destination pool");
    ModuleProvideInfo provide = module.provides().get(0);
    check(module.provides().size() == 2 && provide.provides().asSymbol().equals(SERVICE) && provide.providesWith().size() == 2 && provide.providesWith().get(0).asSymbol().equals(FIRST) && provide.providesWith().get(1).asSymbol().equals(SECOND), "Full ordered services/providesWith vectors");
    check(module.provides().get(1).provides().asSymbol().equals(FIRST) && module.provides().get(1).providesWith().get(0).asSymbol().equals(SECOND), "Second service provider row is decoded");
    check(owned(provide.provides(), pool) && owned(provide.providesWith().get(0), pool) && owned(provide.providesWith().get(1), pool), "Provider class references and UTF children use destination pool");
    List<PackageEntry> packages = model.findAttribute(Attributes.modulePackages()).get().packages();
    check(packages.size() == 2 && packages.get(0).asSymbol().equals(PKG) && packages.get(1).asSymbol().equals(IMPL) && owned(packages.get(0), pool) && owned(packages.get(1), pool), "Complete typed packages vector imported to destination pool");
    ClassEntry main = model.findAttribute(Attributes.moduleMainClass()).get().mainClass();
    check(main.asSymbol().equals(FIRST) && owned(main, pool), "Typed main class and UTF child destination ownership");
    Utf8Entry target = model.findAttribute(Attributes.moduleTarget()).get().targetPlatform();
    check(target.stringValue().equals("linux-amd64") && owned(target, pool), "Typed target platform entry import");
    check(model.findAttribute(Attributes.moduleResolution()).get().resolutionFlags() == 9, "Resolution wire narrows integer to actual unsigned short");
    ModuleHashesAttribute hashes = model.findAttribute(Attributes.moduleHashes()).get();
    check(hashes.algorithm().stringValue().equals("SHA-256") && hashes.hashes().size() == 2 && owned(hashes.algorithm(), pool), "Typed hash algorithm and vector count");
    check(hashes.hashes().get(0).moduleName().asSymbol().equals(BASE) && Arrays.equals(hashes.hashes().get(0).hash(), new byte[] {0, 1, -1, 127}), "Module hashes preserve actual raw byte values");
    check(hashes.hashes().get(1).moduleName().asSymbol().equals(OTHER) && hashes.hashes().get(1).hash().length == 0 && owned(hashes.hashes().get(0).moduleName(), pool) && owned(hashes.hashes().get(1).moduleName(), pool), "Empty hash vector and both module references use destination pool");
    expect(UnsupportedOperationException.class, () -> module.exports().clear(), "Parsed module vector is immutable");
    expect(UnsupportedOperationException.class, () -> provide.providesWith().clear(), "Parsed nested provider vector is immutable");
    expect(UnsupportedOperationException.class, () -> hashes.hashes().clear(), "Parsed hash vector is immutable");
  }
  private static void rawMasks() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    ModuleAttribute module = ModuleAttribute.of(pool.moduleEntry(OWN), 0x11000, null,
        Arrays.asList(ModuleRequireInfo.of(pool.moduleEntry(BASE), 0x18000, null)),
        Arrays.asList(ModuleExportInfo.of(pool.packageEntry(PKG), 0x11000, Collections.<ModuleEntry>emptyList())),
        Arrays.asList(ModuleOpenInfo.of(pool.packageEntry(IMPL), 0x18000, Collections.<ModuleEntry>emptyList())),
        Collections.<ClassEntry>emptyList(), Collections.<ModuleProvideInfo>emptyList());
    ClassFile context = ClassFile.of(); ModuleAttribute parsed = context.parse(context.buildModule(module)).findAttribute(Attributes.module()).get();
    check(parsed.moduleFlagsMask() == 0x1000 && parsed.requires().get(0).requiresFlagsMask() == 0x8000 && parsed.exports().get(0).exportsFlagsMask() == 0x1000 && parsed.opens().get(0).opensFlagsMask() == 0x8000, "Four raw module masks narrow only at actual wire write");
    check(parsed.moduleVersion().isEmpty() && parsed.requires().get(0).requiresVersion().isEmpty(), "Raw absent module and require versions use zero indexes");
  }
  private static void output() throws Exception {
    ClassFile context = ClassFile.of(); ModuleAttribute module = builderModule();
    ClassModel plain = context.parse(context.buildModule(module));
    check(plain.superclass().isEmpty() && plain.flags().flagsMask() == ClassFile.ACC_MODULE, "No-handler module overload sets only ACC_MODULE and implicit zero superclass");
    ClassModel explicit = context.parse(context.buildModule(module, builder -> builder.withSuperclass(ConstantDescs.CD_Object)));
    check(explicit.superclass().get().asSymbol().equals(ConstantDescs.CD_Object), "Caller explicit superclass is preserved as raw module metadata without claiming validity");
    int[] calls = {0}; Consumer<ClassBuilder> handler = builder -> { calls[0]++; builder.with(ModuleTargetAttribute.of("module-io")); };
    Path directory = Files.createTempDirectory("doppio-module-output-"); Path file = directory.resolve("module-info.class");
    try {
      context.buildModuleTo(file, module, handler); byte[] bytes = Files.readAllBytes(file);
      check(calls[0] == 1 && context.parse(bytes).findAttribute(Attributes.moduleTarget()).get().targetPlatform().equalsString("module-io"), "Actual module file overload invokes handler and writes typed output");
      check(Arrays.equals(bytes, context.buildModule(module, handler)), "Module file output equals complete real builder byte array");
      Files.write(file, Arrays.copyOf(bytes, bytes.length + 100)); context.buildModuleTo(file, module, handler);
      check(Arrays.equals(bytes, Files.readAllBytes(file)), "Module file output replaces and truncates its owned existing file");
      context.buildModuleTo(file, module);
      check(context.parse(Files.readAllBytes(file)).findAttribute(Attributes.module()).get().moduleName().asSymbol().equals(OWN), "No-handler module file overload writes genuine module attribute");
      byte[] prior = Files.readAllBytes(file); int before = calls[0];
      try { context.buildModuleTo(null, module, handler); throw new AssertionError("Missing null path failure"); }
      catch (NullPointerException expected) { check(calls[0] == before + 1, "Native module null-path order builds and invokes handler before Files.write"); }
      before = calls[0];
      try { context.buildModuleTo(file, module, null); throw new AssertionError("Missing null module handler failure"); }
      catch (NullPointerException expected) { check(calls[0] == before && Arrays.equals(prior, Files.readAllBytes(file)), "Failed module builder does not overwrite prior output file"); }
      before = calls[0];
      try { context.buildModule(null, handler); throw new AssertionError("Missing null module attribute failure"); }
      catch (NullPointerException expected) { check(calls[0] == before, "Null module attribute fails before caller handler"); }
    } finally { Files.deleteIfExists(file); Files.delete(directory); }
  }
  public static void main(String[] args) throws Exception {
    factories(); builders(); rawMasks();
    output();
    ClassFile context = ClassFile.of(); byte[] bytes = fixture(context); ClassModel model = context.parse(bytes); metadata(model);
    ClassFile fresh = context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    ClassModel copy = fresh.parse(fresh.transformClass(model, ClassTransform.ACCEPT_ALL));
    check(copy.constantPool() != model.constantPool(), "Module NEW_POOL transform creates independent destination pool"); metadata(copy);
    ClassModel shared = context.parse(context.transformClass(model, ClassTransform.ACCEPT_ALL)); metadata(shared);
    byte[] boundHash = model.findAttribute(Attributes.moduleHashes()).get().hashes().get(0).hash(); boundHash[0] = 99;
    ClassModel rawCopy = context.parse(context.transformClass(model, ClassTransform.ACCEPT_ALL));
    check(rawCopy.findAttribute(Attributes.moduleHashes()).get().hashes().get(0).hash()[0] == 0, "SHARED native bound payload preservation does not rewrite mutable hash model view");
    ClassModel semanticCopy = fresh.parse(fresh.transformClass(model, ClassTransform.ACCEPT_ALL));
    check(semanticCopy.findAttribute(Attributes.moduleHashes()).get().hashes().get(0).hash()[0] == 99, "NEW_POOL semantic writer observes native mutable hash view and imports module references");
    System.out.println("CLASSFILE_MODULE_ATTRIBUTE_REGRESSION_OK|" + passed);
  }
}
