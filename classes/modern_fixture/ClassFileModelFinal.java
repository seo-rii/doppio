package classes.modern_test;

import java.lang.classfile.AccessFlags;
import java.lang.classfile.Attributes;
import java.lang.classfile.ClassElement;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.FieldModel;
import java.lang.classfile.Instruction;
import java.lang.classfile.MethodModel;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.DoubleEntry;
import java.lang.classfile.constantpool.LongEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ConstantDescs;
import java.lang.reflect.AccessFlag;
import java.util.ArrayList;
import java.util.List;

import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;

/** Public API calls on original javac25 resource bytes, without carriers. */
public final class ClassFileModelFinal {
  private static List<String> traversalSink;

  private static ClassModel model() throws Exception {
    return ClassFile.of().parse(ClassFileSupport.bytes(ClassFileModelFinal.class, "ClassFileModelTarget.class"));
  }

  private static void caseNameVersion() throws Exception {
    ClassModel model = model();
    check(model.majorVersion() == 69 && model.minorVersion() == 0);
    check("classes/modern_test/ClassFileModelTarget".equals(model.thisClass().asInternalName()));
    check("Lclasses/modern_test/ClassFileModelTarget;".equals(model.thisClass().asSymbol().descriptorString()));
    check(ClassFile.latestMajorVersion() == 69 && ClassFile.latestMinorVersion() == 0);
    emit("cf-model-name-version", "original=ClassFileModelTarget;version=69/0;internal/symbol=exact;latest=69/0");
  }

  private static void caseFlagsLocations() throws Exception {
    ClassModel model = model();
    AccessFlags flags = model.flags();
    check(flags.location() == AccessFlag.Location.CLASS && flags.has(AccessFlag.FINAL));
    check(flags.flagsMask() == (ClassFile.ACC_FINAL | ClassFile.ACC_SUPER));
    check(!flags.has(AccessFlag.VOLATILE));
    FieldModel field = model.fields().get(0);
    check(field.flags().location() == AccessFlag.Location.FIELD && field.flags().has(AccessFlag.PUBLIC));
    MethodModel method = model.methods().get(0);
    check(method.flags().location() == AccessFlag.Location.METHOD);
    check(flags.flags().contains(AccessFlag.FINAL));
    emit("cf-model-flags-locations", "class=final/super;locations=CLASS/FIELD/METHOD;inapplicable=absent;enum-set=exact");
  }

  private static void caseSuperInterfaces() throws Exception {
    ClassModel model = model();
    check(model.superclass().isPresent());
    check("Ljava/lang/Object;".equals(model.superclass().get().asSymbol().descriptorString()));
    check(model.interfaces().size() == 1);
    check("java/lang/Runnable".equals(model.interfaces().get(0).asInternalName()));
    check(!model.isModuleInfo());
    emit("cf-model-super-interfaces", "super=java/lang/Object;interfaces=java/lang/Runnable;module-info=false");
  }

  private static void caseFieldSymbols() throws Exception {
    ClassModel model = model();
    String[] names = {"number", "label", "wide", "decimal"};
    String[] descriptors = {"I", "Ljava/lang/String;", "J", "D"};
    check(model.fields().size() == names.length);
    for (int index = 0; index < names.length; index++) {
      FieldModel field = model.fields().get(index);
      check(names[index].equals(field.fieldName().stringValue()));
      check(descriptors[index].equals(field.fieldType().stringValue()));
      check(descriptors[index].equals(field.fieldTypeSymbol().descriptorString()));
    }
    emit("cf-model-field-symbols", "fields=number:I/label:String/wide:J/decimal:D;raw/symbolic=exact");
  }

  private static void caseMethodCode() throws Exception {
    ClassModel model = model();
    int overloads = 0, nativeMethods = 0, bodies = 0;
    for (MethodModel method : model.methods()) {
      check(method.methodType().stringValue().equals(method.methodTypeSymbol().descriptorString()));
      if ("value".equals(method.methodName().stringValue())) {
        check("(I)I".equals(method.methodType().stringValue()) || "(J)J".equals(method.methodType().stringValue()));
        overloads++;
      }
      if ("missing".equals(method.methodName().stringValue())) {
        check(!method.code().isPresent() && method.flags().has(AccessFlag.NATIVE));
        nativeMethods++;
      } else {
        check(method.code().isPresent());
        int instructions = 0;
        for (var element : method.code().get()) if (element instanceof Instruction) instructions++;
        check(instructions != 0);
        bodies++;
      }
    }
    check(overloads == 2 && nativeMethods == 1 && bodies == 7);
    emit("cf-model-method-code", "overloads=(I)I/(J)J;native-body=absent;other-bodies=7;instruction-models=present");
  }

  private static void collectMember(ClassElement element, List<String> members) {
    if (element instanceof FieldModel field) members.add(new StringBuilder().append("F:")
        .append(field.fieldName().stringValue()).append(field.fieldType().stringValue()).toString());
    if (element instanceof MethodModel method) members.add(new StringBuilder().append("M:")
        .append(method.methodName().stringValue()).append(method.methodType().stringValue()).toString());
  }

  private static void collectCallback(ClassElement element) {
    collectMember(element, traversalSink);
  }

  private static void caseTraversalInventory() throws Exception {
    ClassModel model = model();
    List<String> iteration = new ArrayList<>(), callbacks = new ArrayList<>();
    for (ClassElement element : model) collectMember(element, iteration);
    traversalSink = callbacks;
    model.forEach(ClassFileModelFinal::collectCallback);
    traversalSink = null;
    check(iteration.equals(callbacks));
    check(iteration.size() == model.fields().size() + model.methods().size());
    check(iteration.size() == 12);
    check(model.elementList().size() >= iteration.size());
    emit("cf-model-traversal-inventory", "iterator/forEach=identical;field+method-members=12;other-elements=retained");
  }

  private static void caseSourcefileParent() throws Exception {
    ClassModel model = model();
    check(model.findAttribute(Attributes.sourceFile()).isPresent());
    check("ClassFileModelFinal.java".equals(model.findAttribute(Attributes.sourceFile()).get().sourceFile().stringValue()));
    check(model.findAttributes(Attributes.sourceFile()).size() == 1);
    check(model.fields().get(0).parent().get() == model);
    check(model.methods().get(0).parent().get() == model);
    check(model.methods().get(0).code().get().parent().get() == model.methods().get(0));
    emit("cf-model-sourcefile-parent", "SourceFile=ClassFileModelFinal.java;typed-find=one;field/method/code-parent=identity");
  }

  private static void caseConstantpool() throws Exception {
    ConstantPool pool = model().constantPool();
    int entries = 0, wide = 0, utf8 = 0, classes = 0;
    for (PoolEntry entry : pool) {
      check(pool.entryByIndex(entry.index()) == entry);
      entries++;
      if (entry instanceof LongEntry || entry instanceof DoubleEntry) wide++;
      if (entry instanceof Utf8Entry value) {
        check(value.stringValue() != null);
        utf8++;
      }
      if (entry instanceof ClassEntry value) {
        check(value.asSymbol() != null && value.asInternalName() != null);
        classes++;
      }
    }
    check(wide == 2 && utf8 != 0 && classes != 0);
    check(entries + wide + 1 == pool.size());
    check(pool.bootstrapMethodCount() == 0);
    emit("cf-model-constantpool", "long/double=2;unusable-slots=skipped;indexed-identity=exact;utf8/class-symbols=present;bootstrap=0");
  }

  public static void main(String[] arguments) throws Exception {
    check(ConstantDescs.CD_int != null);
    caseNameVersion();
    caseFlagsLocations();
    caseSuperInterfaces();
    caseFieldSymbols();
    caseMethodCode();
    caseTraversalInventory();
    caseSourcefileParent();
    caseConstantpool();
    System.out.println("CLASSFILE_MODEL_OK");
  }
}

final class ClassFileModelTarget implements Runnable {
  public int number;
  public String label;
  public long wide;
  public double decimal;
  public void run() {}
  public native int missing();
  public static int value(int value) { return value; }
  public static long value(long value) { return value; }
  public static long wideLiteral() { return 9007199254740993L; }
  public static double doubleLiteral() { return 12.5; }
  public int instanceValue() { return number; }
}
