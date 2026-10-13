package classes.modern_test;

import java.lang.classfile.Attributes;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.attribute.ModuleAttribute;
import java.lang.classfile.attribute.ModulePackagesAttribute;
import java.lang.classfile.attribute.ModuleRequireInfo;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.ModuleEntry;
import java.lang.classfile.constantpool.PackageEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.ModuleDesc;
import java.lang.constant.PackageDesc;
import java.util.Collections;

/** Unchanged native25/guest evidence for module/package descriptors and CP19/20. */
public final class ClassFileModulePoolRegression {
  private static int checks;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    checks++;
  }
  private static void fails(Class<? extends Throwable> type, Runnable operation, String message) {
    try { operation.run(); } catch (Throwable failure) {
      check(type.isInstance(failure), message + ": " + failure.getClass().getName());
      return;
    }
    throw new AssertionError(message + ": operation succeeded");
  }
  private static int namedHash(PoolEntry entry, Utf8Entry name) {
    return (entry.tag() * 0x13c4b2d1 + name.index()) | 0x40000000;
  }
  private static void moduleName(String name) {
    ModuleDesc first = ModuleDesc.of(name), second = ModuleDesc.of(new String(name));
    check(first.name().equals(name), "Module names are retained, not binary-name normalized");
    check(first != second && first.equals(second) && second.equals(first), "Module descriptor value equality");
    check(first.equals(first) && !first.equals(null) && !first.equals(name), "Module descriptor equality kind");
    check(first.hashCode() == name.hashCode(), "Native record module descriptor hash");
    check(first.toString().equals("ModuleDesc[" + name + "]"), "Module descriptor display");
  }
  private static void packageName(String binary, String internal) {
    PackageDesc first = PackageDesc.of(binary), second = PackageDesc.ofInternalName(internal);
    check(first.name().equals(binary) && first.internalName().equals(internal), "Binary package conversion");
    check(second.name().equals(binary) && second.internalName().equals(internal), "Internal package conversion");
    check(first != second && first.equals(second) && second.equals(first), "Package descriptor value equality");
    check(first.equals(first) && !first.equals(null) && !first.equals(binary), "Package descriptor equality kind");
    check(first.hashCode() == internal.hashCode() && second.hashCode() == first.hashCode(), "Native internal-name record hash");
    check(first.toString().equals("PackageDesc[" + binary + "]"), "Package descriptor display");
  }
  private static void moduleEntry(ModuleEntry entry, ConstantPool pool, ModuleDesc symbol) {
    check(entry.tag() == 19 && entry.width() == 1, "Actual CONSTANT_Module_info family and slot width");
    check(entry.constantPool() == pool, "Module entry pool ownership");
    check(entry.name().stringValue().equals(symbol.name()), "Module UTF child");
    check(entry.asSymbol().equals(symbol) && entry.matches(symbol), "Module symbol and reduced-parsing match");
    check(!entry.matches(ModuleDesc.of("different.module")), "Module unequal symbol match");
    check(entry.hashCode() == namedHash(entry, entry.name()), "Native module child-index hash");
    check(entry.toString().equals("19 " + symbol.name()), "Native module pool display");
    fails(NullPointerException.class, () -> entry.matches(null), "Module null symbol");
  }
  private static void packageEntry(PackageEntry entry, ConstantPool pool, PackageDesc symbol) {
    check(entry.tag() == 20 && entry.width() == 1, "Actual CONSTANT_Package_info family and slot width");
    check(entry.constantPool() == pool, "Package entry pool ownership");
    check(entry.name().stringValue().equals(symbol.internalName()), "Package UTF child uses internal form");
    check(entry.asSymbol().equals(symbol) && entry.matches(symbol), "Package symbol and reduced-parsing match");
    check(!entry.matches(PackageDesc.of("different.package")), "Package unequal symbol match");
    check(entry.hashCode() == namedHash(entry, entry.name()), "Native package child-index hash");
    check(entry.toString().equals("20 " + symbol.internalName()), "Native package pool display");
    fails(NullPointerException.class, () -> entry.matches(null), "Package null symbol");
  }
  public static void main(String[] arguments) {
    for (String name : new String[] {"", "java.base", "module/name", ";[name]", " name ", "\u007f", "\u03bb\ud83d\ude00",
        "a\\:b", "a\\@b", "a\\\\b", "\\\\\\@"}) moduleName(name);
    for (int value = 0; value < 32; value++) {
      final String name = "a" + (char) value + "b";
      fails(IllegalArgumentException.class, () -> ModuleDesc.of(name), "Module control character " + value);
    }
    for (String name : new String[] {"\\", ":", "@", "a:b", "a@b", "a\\b", "a\\\\\\b"})
      fails(IllegalArgumentException.class, () -> ModuleDesc.of(name), "Unescaped module special character");
    fails(NullPointerException.class, () -> ModuleDesc.of(null), "Module null name");
    packageName("", ""); packageName("java.lang", "java/lang"); packageName("one", "one");
    packageName("\u03bb.pkg", "\u03bb/pkg"); packageName("p.\ud83d\ude00", "p/\ud83d\ude00");
    packageName("a<: @\\>.b\u0000", "a<: @\\>/b\u0000");
    for (String name : new String[] {".a", "a.", "a..b", "a/b", "a;b", "a[b"})
      fails(IllegalArgumentException.class, () -> PackageDesc.of(name), "Malformed binary package name");
    for (String name : new String[] {"/a", "a/", "a//b", "a.b", "a;b", "a[b"})
      fails(IllegalArgumentException.class, () -> PackageDesc.ofInternalName(name), "Malformed internal package name");
    fails(NullPointerException.class, () -> PackageDesc.of(null), "Package null binary name");
    fails(NullPointerException.class, () -> PackageDesc.ofInternalName(null), "Package null internal name");
    check(!ModuleDesc.of("same").equals(PackageDesc.of("same")), "Descriptor families are not cross-type equal");
    check(!ModuleDesc.of("one").equals(ModuleDesc.of("two")) && !PackageDesc.of("one").equals(PackageDesc.of("two")), "Unequal descriptors");

    ModuleDesc module = ModuleDesc.of("selected.module"); PackageDesc pack = PackageDesc.of("selected.pkg");
    ConstantPoolBuilder first = ConstantPoolBuilder.of(), second = ConstantPoolBuilder.of();
    for (int index = 0; index < 5; index++) second.utf8Entry("prefix" + index);
    ModuleEntry firstModule = first.moduleEntry(module), secondModule = second.moduleEntry(firstModule.name());
    PackageEntry firstPackage = first.packageEntry(pack), secondPackage = second.packageEntry(firstPackage.name());
    moduleEntry(firstModule, first, module); moduleEntry(secondModule, second, module);
    packageEntry(firstPackage, first, pack); packageEntry(secondPackage, second, pack);
    check(firstModule == first.moduleEntry(firstModule.name()) && firstModule == first.moduleEntry(module), "Module semantic interning");
    check(firstPackage == first.packageEntry(firstPackage.name()) && firstPackage == first.packageEntry(pack), "Package semantic interning");
    check(firstModule.name() != secondModule.name() && secondModule.name().constantPool() == second, "Foreign module child is imported, not borrowed");
    check(firstPackage.name() != secondPackage.name() && secondPackage.name().constantPool() == second, "Foreign package child is imported, not borrowed");
    check(firstModule.equals(secondModule) && secondModule.equals(firstModule), "Module semantic equality across different pool indexes");
    check(firstPackage.equals(secondPackage) && secondPackage.equals(firstPackage), "Package semantic equality across different pool indexes");
    check(firstModule.name().index() != secondModule.name().index() && firstModule.hashCode() != secondModule.hashCode(), "Actual native equal module entries can have index-dependent unequal hashes");
    check(firstPackage.name().index() != secondPackage.name().index() && firstPackage.hashCode() != secondPackage.hashCode(), "Actual native equal package entries can have index-dependent unequal hashes");
    check(firstModule.equals(firstModule) && !firstModule.equals(null) && !firstModule.equals(firstPackage), "Module entry equality kind");
    check(firstPackage.equals(firstPackage) && !firstPackage.equals(null) && !firstPackage.equals(firstModule), "Package entry equality kind");
    fails(NullPointerException.class, () -> first.moduleEntry((Utf8Entry) null), "Module null UTF factory");
    fails(NullPointerException.class, () -> first.moduleEntry((ModuleDesc) null), "Module null descriptor factory");
    fails(NullPointerException.class, () -> first.packageEntry((Utf8Entry) null), "Package null UTF factory");
    fails(NullPointerException.class, () -> first.packageEntry((PackageDesc) null), "Package null descriptor factory");
    ModuleEntry malformedModule = first.moduleEntry(first.utf8Entry("bad:module"));
    PackageEntry malformedPackage = first.packageEntry(first.utf8Entry("bad.package"));
    check(malformedModule.name().stringValue().equals("bad:module") && malformedPackage.name().stringValue().equals("bad.package"), "Raw typed factories retain malformed names lazily");
    fails(IllegalArgumentException.class, () -> malformedModule.asSymbol(), "Malformed module fails only on symbol conversion");
    fails(IllegalArgumentException.class, () -> malformedPackage.asSymbol(), "Malformed package fails only on symbol conversion");
    moduleEntry(first.moduleEntry(ModuleDesc.of("")), first, ModuleDesc.of(""));
    packageEntry(first.packageEntry(PackageDesc.of("")), first, PackageDesc.of(""));

    ModuleEntry temporaryModule = ModuleRequireInfo.of(module, 0, null).requires();
    PackageEntry temporaryPackage = ModulePackagesAttribute.ofNames(pack).packages().get(0);
    moduleEntry(temporaryModule, temporaryModule.constantPool(), module);
    packageEntry(temporaryPackage, temporaryPackage.constantPool(), pack);
    check(temporaryModule.constantPool() == temporaryPackage.constantPool(), "Nominal module/package factories share the nonwritable temporary pool");
    check(temporaryModule.index() == -2 && temporaryModule.name().index() == -1 && temporaryPackage.index() == -2 && temporaryPackage.name().index() == -1, "Native unbound composite/child indexes");
    ModuleEntry otherTemporaryModule = ModuleRequireInfo.of(module, 0, null).requires();
    PackageEntry otherTemporaryPackage = ModulePackagesAttribute.ofNames(pack).packages().get(0);
    check(temporaryModule != otherTemporaryModule && temporaryModule.equals(otherTemporaryModule), "Temporary module entries are semantic but never interned");
    check(temporaryPackage != otherTemporaryPackage && temporaryPackage.equals(otherTemporaryPackage), "Temporary package entries are semantic but never interned");
    check(!first.canWriteDirect(temporaryModule.constantPool()), "Unbound entries never grant direct raw-copy authority");
    fails(UnsupportedOperationException.class, () -> temporaryModule.constantPool().size(), "Temporary module pool has no writable size");

    ClassFile classFile = ClassFile.of();
    ModuleAttribute attribute = ModuleAttribute.of(temporaryModule, 0, null, Collections.emptyList(),
      Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
    byte[] bytes = classFile.buildModule(attribute, builder -> {
      builder.withVersion(53, 0); builder.with(ModulePackagesAttribute.of(temporaryPackage));
      builder.constantPool().longEntry(123456789L);
    });
    ClassModel parsed = classFile.parse(bytes); ConstantPool sourcePool = parsed.constantPool();
    ModuleEntry parsedModule = parsed.findAttribute(Attributes.module()).get().moduleName();
    PackageEntry parsedPackage = parsed.findAttribute(Attributes.modulePackages()).get().packages().get(0);
    moduleEntry(parsedModule, sourcePool, module); packageEntry(parsedPackage, sourcePool, pack);
    check(parsedModule.index() > 0 && parsedPackage.index() > 0, "Serialized modules/packages are genuine positive indexed entries");
    check(sourcePool.entryByIndex(parsedModule.index(), ModuleEntry.class) == parsedModule &&
      sourcePool.entryByIndex(parsedPackage.index(), PackageEntry.class) == parsedPackage, "Reader returns genuine typed CP19/20, not opaque fallback entries");
    ConstantPoolBuilder copied = ConstantPoolBuilder.of(parsed);
    check(copied.canWriteDirect(sourcePool), "Shared pool remembers retained source identity");
    moduleEntry(copied.entryByIndex(parsedModule.index(), ModuleEntry.class), sourcePool, module);
    packageEntry(copied.entryByIndex(parsedPackage.index(), PackageEntry.class), sourcePool, pack);
    check(copied.entryByIndex(parsedModule.index()) == parsedModule && copied.entryByIndex(parsedPackage.index()) == parsedPackage,
      "Native shared pool reuses retained CP19/20 entry objects and their source ownership");
    check(copied.moduleEntry(module).index() == parsedModule.index() && copied.packageEntry(pack).index() == parsedPackage.index(), "Copied module/package pool retains canonical indexed entries");
    byte[] importedBytes = classFile.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(parsed, (builder, element) -> {
      for (int index = 0; index < 8; index++) builder.constantPool().utf8Entry("padding" + index);
      builder.with(element);
    });
    ClassModel imported = classFile.parse(importedBytes); ConstantPool importedPool = imported.constantPool();
    ModuleEntry importedModule = imported.findAttribute(Attributes.module()).get().moduleName();
    PackageEntry importedPackage = imported.findAttribute(Attributes.modulePackages()).get().packages().get(0);
    moduleEntry(importedModule, importedPool, module); packageEntry(importedPackage, importedPool, pack);
    check(importedModule.index() != parsedModule.index() && importedPackage.index() != parsedPackage.index(), "NEW_POOL actually relocates both module/package numeric indexes");
    check(importedModule.name().index() != parsedModule.name().index() && importedPackage.name().index() != parsedPackage.name().index(), "NEW_POOL also relocates both semantic UTF children");
    check(importedModule.equals(parsedModule) && importedPackage.equals(parsedPackage), "Relocated CP19/20 semantic values retain native equality");
    check(!copied.canWriteDirect(importedPool), "Semantic equal module pools never grant source-identity direct-copy authority");
    System.out.println("CLASSFILE_MODULE_POOL_REGRESSION_OK|" + checks);
  }
}
