package classes.modern_test;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

/**
 * Twenty selected sealed-reflection contracts, compiled unchanged by javac 21/25.
 * Permitted classes are compared by unordered Class identity, not names/order.
 * Fresh arrays, mutation isolation and passive loading timing are explicitly
 * pinned-native regressions rather than API-wide implementation guarantees.
 */
public final class JavaSealedReflection {
  private static String activeCase;
  private static int passiveMarks;

  private static abstract sealed class ClassRoot permits OpenLeaf, SealedChild, FinalLeaf { }
  private static final class FinalLeaf extends ClassRoot { }
  private static non-sealed class OpenLeaf extends ClassRoot { }
  private static final class OpenGrandchild extends OpenLeaf { }
  private static sealed class SealedChild extends ClassRoot permits ChildLeaf { }
  private static final class ChildLeaf extends SealedChild { }

  private sealed interface InterfaceRoot permits DirectInterface, InterfaceLeaf { }
  private non-sealed interface DirectInterface extends InterfaceRoot { }
  private static final class InterfaceLeaf implements InterfaceRoot { }
  private static final class IndirectLeaf implements DirectInterface { }

  // Same-compilation-unit inference; neither declaration has a permits clause.
  private static abstract sealed class InferredClass { }
  private static final class InferredFinal extends InferredClass { }
  private static non-sealed class InferredOpen extends InferredClass { }
  private sealed interface InferredInterface { }
  private record InferredRecord(int value) implements InferredInterface { }
  // No constant-specific bodies: this enum is implicitly final, not sealed.
  private enum InferredEnum implements InferredInterface { ONE, TWO }

  private static final class OrdinaryClass { }
  private interface OrdinaryInterface { }

  // Only casePassiveMetadata actively initializes these isolated declarations.
  private static sealed class PassiveRoot permits PassiveLeaf {
    static { noteInitialization(1); }
  }
  private static final class PassiveLeaf extends PassiveRoot {
    static { noteInitialization(2); }
  }

  private static void begin(String id) { activeCase = id; }
  private static void emit(String event) {
    System.out.print(activeCase);
    System.out.print('=');
    System.out.println(event);
  }
  private static void flags(String label, boolean... values) {
    StringBuilder text = new StringBuilder(label).append('=');
    for (int i = 0; i < values.length; i++) {
      if (i != 0) text.append(',');
      text.append(values[i]);
    }
    emit(text.toString());
  }
  private static void numbers(String label, long... values) {
    StringBuilder text = new StringBuilder(label).append('=');
    for (int i = 0; i < values.length; i++) {
      if (i != 0) text.append(',');
      text.append(values[i]);
    }
    emit(text.toString());
  }
  private static boolean sealed(Class<?> type) { return type.isSealed(); }
  private static Class<?>[] permitted(Class<?> type) { return type.getPermittedSubclasses(); }
  private static int length(Class<?>[] values) { return values == null ? -1 : values.length; }
  private static boolean plain(Class<?> type) { return !sealed(type) && permitted(type) == null; }

  private static boolean identicalSet(Class<?>[] actual, Class<?>... expected) {
    if (actual == null || actual.length != expected.length) return false;
    for (int i = 0; i < actual.length; i++) {
      if (actual[i] == null) return false;
      for (int earlier = 0; earlier < i; earlier++) {
        if (actual[i] == actual[earlier]) return false;
      }
      int matches = 0;
      for (Class<?> candidate : expected) if (actual[i] == candidate) matches++;
      if (matches != 1) return false;
    }
    return true;
  }
  private static boolean contains(Class<?>[] values, Class<?> target) {
    if (values == null) return false;
    for (Class<?> value : values) if (value == target) return true;
    return false;
  }
  private static boolean directMembers(Class<?> parent, Class<?>[] children) {
    if (children == null) return false;
    for (Class<?> child : children) {
      if (child == null) return false;
      if (parent.isInterface()) {
        if (!contains(child.getInterfaces(), parent)) return false;
      } else if (child.getSuperclass() != parent) return false;
    }
    return true;
  }
  private static void noteInitialization(int bit) { passiveMarks |= bit; }
  private static boolean api(Method method, String name, Class<?> returnType) {
    return method.getDeclaringClass() == Class.class && method.getName().equals(name)
      && method.getReturnType() == returnType && method.getParameterTypes().length == 0
      && Modifier.isPublic(method.getModifiers()) && !Modifier.isStatic(method.getModifiers());
  }

  public static void caseClassList() {
    begin("sf-class-list");
    Class<?> owner = ClassRoot.class;
    Class<?>[] children = permitted(owner);
    flags("sealed", sealed(owner));
    numbers("permitted", length(children));
    flags("identities", identicalSet(children, FinalLeaf.class, OpenLeaf.class, SealedChild.class));
    flags("direct", directMembers(owner, children));
  }
  public static void caseInterfaceList() {
    begin("sf-interface-list");
    Class<?> owner = InterfaceRoot.class;
    Class<?>[] children = permitted(owner);
    flags("sealed", sealed(owner));
    numbers("permitted", length(children));
    flags("identities", identicalSet(children, DirectInterface.class, InterfaceLeaf.class));
    flags("direct", directMembers(owner, children));
  }
  public static void caseInferredClass() {
    begin("sf-inferred-class");
    Class<?> owner = InferredClass.class;
    Class<?>[] children = permitted(owner);
    flags("sealed", sealed(owner));
    numbers("permitted", length(children));
    flags("identities", identicalSet(children, InferredFinal.class, InferredOpen.class));
    flags("direct", directMembers(owner, children));
  }
  public static void caseInferredInterface() {
    begin("sf-inferred-interface");
    Class<?> owner = InferredInterface.class;
    Class<?>[] children = permitted(owner);
    flags("sealed", sealed(owner));
    numbers("permitted", length(children));
    flags("identities", identicalSet(children, InferredRecord.class, InferredEnum.class));
    flags("direct", directMembers(owner, children));
  }
  public static void caseFinalLeaf() {
    begin("sf-final-leaf");
    Class<?> type = FinalLeaf.class;
    flags("sealed", sealed(type));
    flags("permitted-null", permitted(type) == null);
    flags("final", Modifier.isFinal(type.getModifiers()));
    flags("parent", type.getSuperclass() == ClassRoot.class);
  }
  public static void caseOpenLeaf() {
    begin("sf-open-leaf");
    Class<?> type = OpenLeaf.class;
    flags("sealed", sealed(type));
    flags("permitted-null", permitted(type) == null);
    flags("final", Modifier.isFinal(type.getModifiers()));
    flags("parent", type.getSuperclass() == ClassRoot.class);
    flags("descendant-parent", OpenGrandchild.class.getSuperclass() == type);
  }
  public static void caseOrdinaryClass() {
    begin("sf-ordinary-class");
    Class<?> type = OrdinaryClass.class;
    flags("sealed", sealed(type));
    flags("permitted-null", permitted(type) == null);
    flags("interface", type.isInterface());
  }
  public static void caseOrdinaryInterface() {
    begin("sf-ordinary-interface");
    Class<?> type = OrdinaryInterface.class;
    flags("sealed", sealed(type));
    flags("permitted-null", permitted(type) == null);
    flags("interface", type.isInterface());
  }
  public static void casePrimitive() {
    begin("sf-primitive");
    Class<?>[] types = {boolean.class, byte.class, char.class, short.class,
      int.class, long.class, float.class, double.class};
    boolean primitives = true;
    boolean state = plain(OrdinaryClass.class);
    for (Class<?> type : types) {
      primitives &= type.isPrimitive();
      state &= plain(type);
    }
    numbers("types", types.length);
    flags("primitive", primitives);
    flags("state", state);
  }
  public static void caseVoid() {
    begin("sf-void");
    flags("sealed", sealed(void.class));
    flags("permitted-null", permitted(void.class) == null);
    flags("control", plain(OrdinaryClass.class));
  }
  public static void caseArray() {
    begin("sf-array");
    Class<?>[] types = {ClassRoot[].class, InterfaceRoot[][].class, int[].class, String[][].class};
    boolean arrays = true;
    boolean state = plain(OrdinaryClass.class);
    for (Class<?> type : types) {
      arrays &= type.isArray();
      state &= plain(type);
    }
    numbers("types", types.length);
    flags("arrays", arrays);
    flags("state", state);
  }
  public static void caseRecordFinal() {
    begin("sf-record-final");
    Class<?> type = InferredRecord.class;
    flags("sealed", sealed(type));
    flags("permitted-null", permitted(type) == null);
    flags("record", type.isRecord());
    flags("final", Modifier.isFinal(type.getModifiers()));
    flags("direct-interface", identicalSet(type.getInterfaces(), InferredInterface.class));
  }
  public static void caseEnumFinal() {
    begin("sf-enum-final");
    Class<?> type = InferredEnum.class;
    flags("sealed", sealed(type));
    flags("permitted-null", permitted(type) == null);
    flags("enum", type.isEnum());
    flags("final", Modifier.isFinal(type.getModifiers()));
    flags("direct-interface", identicalSet(type.getInterfaces(), InferredInterface.class));
  }
  public static void caseFreshArray() {
    begin("sf-fresh-array");
    Class<?>[] first = permitted(ClassRoot.class);
    Class<?>[] second = permitted(ClassRoot.class);
    flags("identities", identicalSet(first, FinalLeaf.class, OpenLeaf.class, SealedChild.class)
      && identicalSet(second, FinalLeaf.class, OpenLeaf.class, SealedChild.class));
    flags("fresh", first != null && second != null && first != second);
  }
  public static void caseMutationIsolation() {
    begin("sf-mutation-isolation");
    Class<?>[] changed = permitted(ClassRoot.class);
    Class<?>[] retained = permitted(ClassRoot.class);
    flags("before", identicalSet(changed, FinalLeaf.class, OpenLeaf.class, SealedChild.class)
      && identicalSet(retained, FinalLeaf.class, OpenLeaf.class, SealedChild.class));
    if (changed != null) {
      for (int i = 0; i < changed.length; i++) changed[i] = i % 2 == 0 ? null : OrdinaryClass.class;
    }
    flags("retained", identicalSet(retained, FinalLeaf.class, OpenLeaf.class, SealedChild.class));
    flags("new-query", identicalSet(permitted(ClassRoot.class), FinalLeaf.class, OpenLeaf.class, SealedChild.class));
  }
  public static void caseDefiningIdentity() throws Exception {
    begin("sf-defining-identity");
    ClassLoader loader = JavaSealedReflection.class.getClassLoader();
    Class<?> owner = ClassRoot.class;
    flags("owner", Class.forName(owner.getName(), false, loader) == owner);
    Class<?>[] children = permitted(owner);
    boolean defining = identicalSet(children, FinalLeaf.class, OpenLeaf.class, SealedChild.class);
    boolean reloaded = defining;
    if (children != null) {
      for (Class<?> child : children) {
        defining &= child.getClassLoader() == owner.getClassLoader();
        reloaded &= Class.forName(child.getName(), false, loader) == child;
      }
    }
    flags("children", defining);
    flags("reload", reloaded);
  }
  public static void casePassiveMetadata() throws Exception {
    begin("sf-passive-metadata");
    passiveMarks = 0;
    ClassLoader loader = JavaSealedReflection.class.getClassLoader();
    Class<?> owner = Class.forName("classes.modern_test.JavaSealedReflection$PassiveRoot", false, loader);
    flags("owner", owner == PassiveRoot.class);
    flags("sealed", sealed(owner));
    Class<?>[] children = permitted(owner);
    numbers("permitted", length(children));
    flags("identities", identicalSet(children, PassiveLeaf.class));
    numbers("metadata-marker", passiveMarks);
    Class.forName(owner.getName(), true, loader);
    numbers("owner-active-marker", passiveMarks);
    Class.forName("classes.modern_test.JavaSealedReflection$PassiveLeaf", true, loader);
    numbers("child-active-marker", passiveMarks);
  }
  public static void caseReflectiveApi() throws Exception {
    begin("sf-reflective-api");
    Method isSealed = Class.class.getDeclaredMethod("isSealed", new Class<?>[0]);
    Method getPermitted = Class.class.getDeclaredMethod("getPermittedSubclasses", new Class<?>[0]);
    flags("is-sealed-api", api(isSealed, "isSealed", boolean.class));
    flags("permits-api", api(getPermitted, "getPermittedSubclasses", Class[].class));
    flags("sealed-result", ((Boolean) isSealed.invoke(ClassRoot.class, new Object[0])).booleanValue(),
      ((Boolean) isSealed.invoke(OrdinaryClass.class, new Object[0])).booleanValue());
    Class<?>[] children = (Class<?>[]) getPermitted.invoke(ClassRoot.class, new Object[0]);
    flags("permits-result", identicalSet(children, FinalLeaf.class, OpenLeaf.class, SealedChild.class),
      getPermitted.invoke(OrdinaryClass.class, new Object[0]) == null);
  }
  public static void caseInterfaceDirectOnly() {
    begin("sf-interface-direct-only");
    Class<?>[] children = permitted(InterfaceRoot.class);
    flags("members", identicalSet(children, DirectInterface.class, InterfaceLeaf.class));
    flags("indirect-assignable", InterfaceRoot.class.isAssignableFrom(IndirectLeaf.class));
    flags("indirect-listed", contains(children, IndirectLeaf.class));
    flags("direct-interfaces", identicalSet(DirectInterface.class.getInterfaces(), InterfaceRoot.class)
      && identicalSet(InterfaceLeaf.class.getInterfaces(), InterfaceRoot.class)
      && identicalSet(IndirectLeaf.class.getInterfaces(), DirectInterface.class));
  }
  public static void caseSealedChild() {
    begin("sf-sealed-child");
    Class<?> owner = SealedChild.class;
    Class<?>[] children = permitted(owner);
    flags("sealed", sealed(owner));
    numbers("permitted", length(children));
    flags("identities", identicalSet(children, ChildLeaf.class));
    flags("parent", owner.getSuperclass() == ClassRoot.class);
    Class<?>[] rootChildren = permitted(ClassRoot.class);
    flags("root-direct-only", identicalSet(rootChildren, FinalLeaf.class, OpenLeaf.class, SealedChild.class)
      && !contains(rootChildren, ChildLeaf.class) && !contains(rootChildren, OpenGrandchild.class));
  }

  public static void main(String[] args) throws Exception {
    caseClassList();
    caseInterfaceList();
    caseInferredClass();
    caseInferredInterface();
    caseFinalLeaf();
    caseOpenLeaf();
    caseOrdinaryClass();
    caseOrdinaryInterface();
    casePrimitive();
    caseVoid();
    caseArray();
    caseRecordFinal();
    caseEnumFinal();
    caseFreshArray();
    caseMutationIsolation();
    caseDefiningIdentity();
    casePassiveMetadata();
    caseReflectiveApi();
    caseInterfaceDirectOnly();
    caseSealedChild();
    System.out.println("SEALED_REFLECTION_OK");
  }
}
