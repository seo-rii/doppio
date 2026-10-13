package classes.modern_test;

import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.attribute.ModuleProvideInfo;
import java.lang.classfile.attribute.PermittedSubclassesAttribute;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.constant.ClassDesc;
import java.util.Collections;

/** Unchanged native25/guest ClassEntry semantic equality, hash, and ownership assertions. */
public final class ClassFileClassEntryRegression {
  private static int checks;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    checks++;
  }
  private static int classHash(ClassDesc type) {
    return (7 * 0x13c4b2d1 + type.descriptorString().hashCode()) | 0x40000000;
  }
  private static void equal(ClassEntry left, ClassEntry right, ClassDesc type) {
    check(left != right, "Distinct ClassEntry objects are exercised");
    check(left.equals(right) && right.equals(left), "ClassEntry semantic equality across ownership");
    check(left.hashCode() == classHash(type) && right.hashCode() == classHash(type), "Exact native descriptor-content class hash");
    check(left.equals(left) && !left.equals(null) && !left.equals(new Object()), "ClassEntry identity and unrelated object equality");
    check(left.tag() == 7 && right.tag() == 7 && left.width() == 1 && right.width() == 1, "Actual CONSTANT_Class entry family");
    check(left.asSymbol().equals(type) && right.asSymbol().equals(type), "Raw semantic name agrees with nominal class symbol");
    check(left.equals(right) && left.hashCode() == right.hashCode(), "Symbol inflation leaves native equality and hash unchanged");
  }
  public static void main(String[] arguments) {
    ClassDesc[] types = {
      ClassDesc.of("java.lang.Object"), ClassDesc.of("classes.modern_test.EqualityService"),
      ClassDesc.of("classes.modern_test.\u03bb\ud83d\ude00"),
      ClassDesc.ofDescriptor("[I"), ClassDesc.ofDescriptor("[[J"),
      ClassDesc.ofDescriptor("[[Ljava/lang/String;")
    };
    ConstantPoolBuilder first = ConstantPoolBuilder.of(), second = ConstantPoolBuilder.of();
    for (int index = 0; index < 8; index++) second.utf8Entry("padding" + index);
    for (ClassDesc type : types) {
      ClassEntry left = first.classEntry(type), right = second.classEntry(left.name());
      equal(left, right, type);
      check(left.name().index() != right.name().index() && left.index() != right.index(), "Equal classes have genuinely different numeric pool indexes");
      check(left.name() != right.name() && right.name().constantPool() == second, "Foreign UTF child is semantically imported into receiving pool");
      check(left == first.classEntry(left.name()) && left == first.classEntry(type), "Factory interning is unchanged");
      check(!left.equals(left.name()) && !left.equals(first.stringEntry(left.name())), "Class equality never substitutes UTF or CONSTANT_String equality");
      check(!left.equals(first.classEntry(ClassDesc.of("different.Class"))), "Different internal names compare unequal");

      ClassEntry temporary = PermittedSubclassesAttribute.ofSymbols(type).permittedSubclasses().get(0);
      ClassEntry otherTemporary = PermittedSubclassesAttribute.ofSymbols(type).permittedSubclasses().get(0);
      equal(left, temporary, type); equal(temporary, otherTemporary, type);
      check(temporary.index() == -2 && temporary.name().index() == -1, "Native unbound class and child indexes");
      check(temporary.constantPool() == otherTemporary.constantPool() && !first.canWriteDirect(temporary.constantPool()), "Temporary semantic values grant no direct-copy authority");
    }
    check(!first.classEntry(ClassDesc.ofDescriptor("[I")).equals(second.classEntry(ClassDesc.ofDescriptor("[J"))), "Different primitive array descriptors compare unequal");
    check(!first.classEntry(ClassDesc.ofDescriptor("[Ljava/lang/String;")).equals(second.classEntry(ClassDesc.of("java.lang.String"))), "Array and element classes are not cross-type equal");

    ClassFile classFile = ClassFile.of();
    ClassEntry[] written = new ClassEntry[types.length];
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.ClassEntryEqualityOutput"), builder -> {
      builder.withVersion(53, 0);
      for (int index = 0; index < types.length; index++) written[index] = builder.constantPool().classEntry(types[index]);
    });
    ClassModel model = classFile.parse(bytes); ConstantPool parsed = model.constantPool();
    ConstantPoolBuilder shared = ConstantPoolBuilder.of(model), imported = ConstantPoolBuilder.of();
    for (int index = 0; index < 32; index++) imported.utf8Entry("relocationPadding" + index);
    for (int index = 0; index < types.length; index++) {
      ClassEntry raw = parsed.entryByIndex(written[index].index(), ClassEntry.class);
      equal(written[index], raw, types[index]);
      check(raw.constantPool() == parsed && raw.index() > 0, "Parsed classes retain their own raw indexed pool");
      ClassEntry copied = shared.entryByIndex(raw.index(), ClassEntry.class);
      check(raw.equals(copied) && copied.equals(raw) && raw.hashCode() == copied.hashCode(), "Shared pool class values retain native semantics");
      ClassEntry relocated = imported.classEntry(raw.name());
      equal(raw, relocated, types[index]);
      check(relocated.index() != raw.index() && relocated.name().index() != raw.name().index(), "Import actually relocates class and child numeric indexes");
      check(relocated.constantPool() == imported && relocated.name().constantPool() == imported, "Relocated class and child retain receiving pool ownership");
    }
    check(shared.canWriteDirect(parsed) && !shared.canWriteDirect(imported), "Class semantic equality does not change identity-based raw-copy authority");
    ClassDesc service = types[1], implementation = ClassDesc.of("classes.modern_test.EqualityImplementation");
    ModuleProvideInfo leftProvide = ModuleProvideInfo.of(service, implementation);
    ModuleProvideInfo rightProvide = ModuleProvideInfo.of(first.classEntry(service), Collections.singletonList(second.classEntry(implementation)));
    check(leftProvide.equals(rightProvide) && rightProvide.equals(leftProvide), "Native ModuleProvideInfo structural equality uses semantic ClassEntry children");
    check(leftProvide.hashCode() == rightProvide.hashCode(), "Native provide-record hash survives temporary and writable class entry ownership");
    System.out.println("CLASSFILE_CLASS_ENTRY_REGRESSION_OK|" + checks);
  }
}
