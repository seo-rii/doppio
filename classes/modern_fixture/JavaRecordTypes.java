package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.AnnotatedArrayType;
import java.lang.reflect.AnnotatedElement;
import java.lang.reflect.AnnotatedParameterizedType;
import java.lang.reflect.AnnotatedType;
import java.lang.reflect.AnnotatedTypeVariable;
import java.lang.reflect.AnnotatedWildcardType;
import java.lang.reflect.Field;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.lang.reflect.WildcardType;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Genuine javac record metadata. Ordinary fields independently exercise the
 * shared reflection library; only the component path is owned by this group.
 * StringBuilder avoids a dependency on invokedynamic string concatenation. */
public class JavaRecordTypes {
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.TYPE_USE)
  @interface Use { String value(); }

  @Retention(RetentionPolicy.CLASS)
  @Target(ElementType.TYPE_USE)
  @interface HiddenUse { String value(); }

  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.RECORD_COMPONENT)
  @interface ComponentTag { String value(); }

  @Retention(RetentionPolicy.RUNTIME)
  @Target({ElementType.RECORD_COMPONENT, ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER})
  @interface Route { String value(); }

  record RawData(int count, String text, int[] numbers, String[][] names) {}
  static class RawFields { int count; String text; int[] numbers; String[][] names; }

  record ParameterizedData(List<String> strings, Map<String, List<Integer>> nested,
      List<? extends Number> upper, List<? super Integer> lower, List<?> any,
      List<String>[] array) {}
  static class ParameterizedFields {
    List<String> strings;
    Map<String, List<Integer>> nested;
    List<? extends Number> upper;
    List<? super Integer> lower;
    List<?> any;
    List<String>[] array;
  }

  record VariableData<T extends Number & Comparable<T>>(T item, T[] array, T[][] matrix,
      List<T> list, List<? extends T[]> wildcard) {}
  static class VariableFields<T extends Number & Comparable<T>> {
    T item; T[] array; T[][] matrix; List<T> list; List<? extends T[]> wildcard;
  }

  static class ShadowOuter<T extends Number> {
    record Shadow<T extends CharSequence>(T value) {}
  }
  static class ShadowFields<T extends CharSequence> { T value; }

  static class Outer<O> {
    class Inner<I> {}
    class Middle<M> { class Leaf<L> {} }
    static class StaticNested<S> {}
    class RawInner {}
  }
  record OwnerData(Outer<String>.Inner<Integer> member,
      Outer<String>.Middle<Integer>.Leaf<Long> deep,
      Outer.StaticNested<Long> statik, Outer.RawInner raw) {}
  static class OwnerFields {
    Outer<String>.Inner<Integer> member;
    Outer<String>.Middle<Integer>.Leaf<Long> deep;
    Outer.StaticNested<Long> statik;
    Outer.RawInner raw;
  }

  record AnnotatedData<T extends @Use("bound-number") Number
      & @Use("bound-comparable") Comparable<@Use("self-bound") T>>(
      @Use("scalar") @HiddenUse("invisible") String scalar,
      @Use("list") List<@Use("argument") String> list,
      @Use("map") Map<@Use("key") String, @Use("nested-list") List<@Use("nested-argument") Integer>> nested,
      @Use("element") String @Use("outer-array") [] @Use("inner-array") [] matrix,
      @Use("generic-list") List<@Use("generic-argument") String> @Use("generic-array") [] array,
      @Use("variable-use") T variable,
      @Use("variable-element") T @Use("variable-array") [] variableArray,
      List<@Use("upper-wildcard") ? extends @Use("upper-bound") Number> upper,
      List<@Use("lower-wildcard") ? super @Use("lower-bound") Integer> lower,
      List<@Use("unbounded-wildcard") ?> any) {}
  static class AnnotatedFields<T extends @Use("bound-number") Number
      & @Use("bound-comparable") Comparable<@Use("self-bound") T>> {
    @Use("scalar") @HiddenUse("invisible") String scalar;
    @Use("list") List<@Use("argument") String> list;
    @Use("map") Map<@Use("key") String, @Use("nested-list") List<@Use("nested-argument") Integer>> nested;
    @Use("element") String @Use("outer-array") [] @Use("inner-array") [] matrix;
    @Use("generic-list") List<@Use("generic-argument") String> @Use("generic-array") [] array;
    @Use("variable-use") T variable;
    @Use("variable-element") T @Use("variable-array") [] variableArray;
    List<@Use("upper-wildcard") ? extends @Use("upper-bound") Number> upper;
    List<@Use("lower-wildcard") ? super @Use("lower-bound") Integer> lower;
    List<@Use("unbounded-wildcard") ?> any;
  }

  record AnnotatedOwners(
      @Use("owner") Outer<@Use("owner-argument") String>
          .@Use("inner") Inner<@Use("inner-argument") Integer> member,
      @Use("deep-owner") Outer<@Use("deep-owner-argument") String>
          .@Use("middle") Middle<@Use("middle-argument") Integer>
          .@Use("leaf") Leaf<@Use("leaf-argument") Long> deep,
      Outer.@Use("static") StaticNested<@Use("static-argument") Long> statik,
      @Use("raw-owner") Outer.@Use("raw-inner") RawInner raw) {}
  static class AnnotatedOwnerFields {
    @Use("owner") Outer<@Use("owner-argument") String>
        .@Use("inner") Inner<@Use("inner-argument") Integer> member;
    @Use("deep-owner") Outer<@Use("deep-owner-argument") String>
        .@Use("middle") Middle<@Use("middle-argument") Integer>
        .@Use("leaf") Leaf<@Use("leaf-argument") Long> deep;
    Outer.@Use("static") StaticNested<@Use("static-argument") Long> statik;
    @Use("raw-owner") Outer.@Use("raw-inner") RawInner raw;
  }

  record ImplicitData(@ComponentTag("component-only") @Route("implicit-declaration")
      @Use("implicit-type") List<@Use("implicit-argument") String> values) {}
  static class ImplicitFields {
    @Route("implicit-declaration")
    @Use("implicit-type") List<@Use("implicit-argument") String> values;
  }

  record ExplicitData(@ComponentTag("component-only") @Route("component-declaration")
      @Use("component-type") List<@Use("component-argument") String> values) {
    @Route("accessor-declaration")
    public @Use("accessor-type") List<@Use("accessor-argument") String> values() { return values; }
  }
  static class ExplicitFields {
    @Route("component-declaration")
    @Use("component-type") List<@Use("component-argument") String> values;
  }

  private static String text(String... pieces) {
    StringBuilder result = new StringBuilder();
    for (String piece : pieces) result.append(piece);
    return result.toString();
  }

  private static void emit(String id, String name, String property, String value) {
    System.out.println(text(id, "=", name, ".", property, "=", value));
  }

  private static String className(Class<?> cls) {
    if (cls.isArray()) return text(className(cls.getComponentType()), "[]");
    String name = cls.getName();
    String prefix = "classes.modern_test.JavaRecordTypes$";
    if (name.startsWith(prefix)) return name.substring(prefix.length());
    if (cls == JavaRecordTypes.class) return "JavaRecordTypes";
    return name;
  }

  private static String types(Type[] values) {
    StringBuilder result = new StringBuilder("[");
    for (int i = 0; i < values.length; i++) {
      if (i != 0) result.append(',');
      result.append(type(values[i]));
    }
    return result.append(']').toString();
  }

  private static String type(Type value) {
    if (value == null) return "-";
    if (value instanceof Class<?>) return text("C(", className((Class<?>) value), ")");
    if (value instanceof TypeVariable<?>) return text("V(", ((TypeVariable<?>) value).getName(), ")");
    if (value instanceof GenericArrayType)
      return text("A(", type(((GenericArrayType) value).getGenericComponentType()), ")");
    if (value instanceof ParameterizedType) {
      ParameterizedType parameterized = (ParameterizedType) value;
      return text("P(", type(parameterized.getRawType()), ";owner=", type(parameterized.getOwnerType()),
          ";args=", types(parameterized.getActualTypeArguments()), ")");
    }
    if (value instanceof WildcardType) {
      WildcardType wildcard = (WildcardType) value;
      return text("W(upper=", types(wildcard.getUpperBounds()), ";lower=", types(wildcard.getLowerBounds()), ")");
    }
    throw new AssertionError("Unexpected public Type shape");
  }

  private static boolean variablesBelongTo(Type value, Class<?> declaration) {
    if (value == null || value instanceof Class<?>) return true;
    if (value instanceof TypeVariable<?>) return ((TypeVariable<?>) value).getGenericDeclaration() == declaration;
    if (value instanceof GenericArrayType)
      return variablesBelongTo(((GenericArrayType) value).getGenericComponentType(), declaration);
    if (value instanceof ParameterizedType) {
      ParameterizedType parameterized = (ParameterizedType) value;
      return variablesBelongTo(parameterized.getOwnerType(), declaration)
          && variablesBelongTo(parameterized.getActualTypeArguments(), declaration);
    }
    WildcardType wildcard = (WildcardType) value;
    return variablesBelongTo(wildcard.getUpperBounds(), declaration)
        && variablesBelongTo(wildcard.getLowerBounds(), declaration);
  }

  private static boolean variablesBelongTo(Type[] values, Class<?> declaration) {
    for (Type value : values) if (!variablesBelongTo(value, declaration)) return false;
    return true;
  }

  private static String annotations(AnnotatedElement element) {
    Annotation[] values = element.getAnnotations();
    String[] labels = new String[values.length];
    for (int i = 0; i < values.length; i++) {
      Annotation annotation = values[i];
      if (annotation instanceof Use) labels[i] = text("Use:", ((Use) annotation).value());
      else if (annotation instanceof ComponentTag) labels[i] = text("ComponentTag:", ((ComponentTag) annotation).value());
      else if (annotation instanceof Route) labels[i] = text("Route:", ((Route) annotation).value());
      else throw new AssertionError("Unexpected or invisible annotation exposed");
    }
    Arrays.sort(labels);
    StringBuilder result = new StringBuilder("[");
    for (int i = 0; i < labels.length; i++) {
      if (i != 0) result.append(',');
      result.append(labels[i]);
    }
    return result.append(']').toString();
  }

  private static String annotatedTypes(AnnotatedType[] values, Set<TypeVariable<?>> active) {
    StringBuilder result = new StringBuilder("[");
    for (int i = 0; i < values.length; i++) {
      if (i != 0) result.append(',');
      result.append(annotated(values[i], active));
    }
    return result.append(']').toString();
  }

  private static String annotated(AnnotatedType value) {
    return annotated(value, new HashSet<TypeVariable<?>>());
  }

  private static String annotated(AnnotatedType value, Set<TypeVariable<?>> active) {
    if (value == null) return "-";
    String kind = value instanceof AnnotatedArrayType ? "array"
        : value instanceof AnnotatedParameterizedType ? "parameterized"
        : value instanceof AnnotatedTypeVariable ? "variable"
        : value instanceof AnnotatedWildcardType ? "wildcard" : "plain";
    StringBuilder result = new StringBuilder(kind).append('(').append(type(value.getType()))
        .append(";ann=").append(annotations(value))
        .append(";owner=").append(annotated(value.getAnnotatedOwnerType(), active));
    if (value instanceof AnnotatedArrayType) {
      result.append(";component=").append(annotated(((AnnotatedArrayType) value).getAnnotatedGenericComponentType(), active));
    } else if (value instanceof AnnotatedParameterizedType) {
      result.append(";args=").append(annotatedTypes(((AnnotatedParameterizedType) value).getAnnotatedActualTypeArguments(), active));
    } else if (value instanceof AnnotatedWildcardType) {
      AnnotatedWildcardType wildcard = (AnnotatedWildcardType) value;
      result.append(";upper=").append(annotatedTypes(wildcard.getAnnotatedUpperBounds(), active));
      result.append(";lower=").append(annotatedTypes(wildcard.getAnnotatedLowerBounds(), active));
    } else if (value instanceof AnnotatedTypeVariable) {
      TypeVariable<?> variable = (TypeVariable<?>) value.getType();
      if (!active.add(variable)) result.append(";bounds=<recursive>");
      else {
        result.append(";bounds=").append(annotatedTypes(((AnnotatedTypeVariable) value).getAnnotatedBounds(), active));
        active.remove(variable);
      }
    }
    return result.append(')').toString();
  }

  private static RecordComponent component(Class<?> record, String name) {
    for (RecordComponent component : record.getRecordComponents())
      if (component.getName().equals(name)) return component;
    throw new AssertionError("Missing genuine record component");
  }

  private static void genericPair(String id, Class<?> record, Class<?> fields, String name) throws Exception {
    RecordComponent component = component(record, name);
    Field field = fields.getDeclaredField(name);
    Type recordType = component.getGenericType(), fieldType = field.getGenericType();
    emit(id, name, "raw", className(component.getType()));
    emit(id, name, "signature", String.valueOf(component.getGenericSignature()));
    emit(id, name, "record", type(recordType));
    emit(id, name, "field", type(fieldType));
    emit(id, name, "equal", Boolean.toString(recordType.equals(fieldType)));
    emit(id, name, "record-scope", Boolean.toString(variablesBelongTo(recordType, record)));
    emit(id, name, "field-scope", Boolean.toString(variablesBelongTo(fieldType, fields)));
    if (recordType instanceof TypeVariable<?>) {
      emit(id, name, "record-bounds", types(((TypeVariable<?>) recordType).getBounds()));
      emit(id, name, "field-bounds", types(((TypeVariable<?>) fieldType).getBounds()));
      emit(id, name, "record-bound-scope", Boolean.toString(variablesBelongTo(((TypeVariable<?>) recordType).getBounds(), record)));
      emit(id, name, "field-bound-scope", Boolean.toString(variablesBelongTo(((TypeVariable<?>) fieldType).getBounds(), fields)));
    }
  }

  private static void annotatedPair(String id, Class<?> record, Class<?> fields, String name) throws Exception {
    genericPair(id, record, fields, name);
    emit(id, name, "record-annotated", annotated(component(record, name).getAnnotatedType()));
    emit(id, name, "field-annotated", annotated(fields.getDeclaredField(name).getAnnotatedType()));
  }

  private static void declarationPair(String id, Class<?> record, Class<?> fields) throws Exception {
    annotatedPair(id, record, fields, "values");
    RecordComponent component = component(record, "values");
    emit(id, "values", "component-declarations", annotations(component));
    emit(id, "values", "field-declarations", annotations(fields.getDeclaredField("values")));
    emit(id, "values", "accessor-declarations", annotations(component.getAccessor()));
    emit(id, "values", "accessor-type", annotated(component.getAccessor().getAnnotatedReturnType()));
    emit(id, "values", "constructor-type", annotated(record.getDeclaredConstructor(List.class).getAnnotatedParameterTypes()[0]));
    emit(id, "values", "constructor-declarations", annotations(record.getDeclaredConstructor(List.class).getParameters()[0]));
  }

  public static void caseRawPrimitive() throws Exception {
    genericPair("rt-raw-primitive", RawData.class, RawFields.class, "count");
  }
  public static void caseRawReference() throws Exception {
    genericPair("rt-raw-reference", RawData.class, RawFields.class, "text");
  }
  public static void caseRawArrays() throws Exception {
    genericPair("rt-raw-arrays", RawData.class, RawFields.class, "numbers");
    genericPair("rt-raw-arrays", RawData.class, RawFields.class, "names");
  }
  public static void caseParameterized() throws Exception {
    genericPair("rt-parameterized", ParameterizedData.class, ParameterizedFields.class, "strings");
  }
  public static void caseNestedParameterized() throws Exception {
    genericPair("rt-nested-parameterized", ParameterizedData.class, ParameterizedFields.class, "nested");
  }
  public static void caseWildcards() throws Exception {
    genericPair("rt-wildcards", ParameterizedData.class, ParameterizedFields.class, "upper");
    genericPair("rt-wildcards", ParameterizedData.class, ParameterizedFields.class, "lower");
    genericPair("rt-wildcards", ParameterizedData.class, ParameterizedFields.class, "any");
  }
  public static void caseGenericArray() throws Exception {
    genericPair("rt-generic-array", ParameterizedData.class, ParameterizedFields.class, "array");
  }
  public static void caseTypeVariable() throws Exception {
    genericPair("rt-type-variable", VariableData.class, VariableFields.class, "item");
  }
  public static void caseVariableArrays() throws Exception {
    genericPair("rt-variable-arrays", VariableData.class, VariableFields.class, "array");
    genericPair("rt-variable-arrays", VariableData.class, VariableFields.class, "matrix");
  }
  public static void caseVariableArguments() throws Exception {
    genericPair("rt-variable-arguments", VariableData.class, VariableFields.class, "list");
    genericPair("rt-variable-arguments", VariableData.class, VariableFields.class, "wildcard");
  }
  public static void caseVariableScope() throws Exception {
    genericPair("rt-variable-scope", ShadowOuter.Shadow.class, ShadowFields.class, "value");
    TypeVariable<?> variable = (TypeVariable<?>) component(ShadowOuter.Shadow.class, "value").getGenericType();
    emit("rt-variable-scope", "value", "outer-distinct",
        Boolean.toString(!variable.equals(ShadowOuter.class.getTypeParameters()[0])));
  }
  public static void caseParameterizedOwner() throws Exception {
    genericPair("rt-parameterized-owner", OwnerData.class, OwnerFields.class, "member");
  }
  public static void caseOwnerForms() throws Exception {
    genericPair("rt-owner-forms", OwnerData.class, OwnerFields.class, "deep");
    genericPair("rt-owner-forms", OwnerData.class, OwnerFields.class, "statik");
    genericPair("rt-owner-forms", OwnerData.class, OwnerFields.class, "raw");
  }
  public static void caseAnnotatedScalar() throws Exception {
    annotatedPair("rt-annotated-scalar", AnnotatedData.class, AnnotatedFields.class, "scalar");
  }
  public static void caseAnnotatedArgument() throws Exception {
    annotatedPair("rt-annotated-argument", AnnotatedData.class, AnnotatedFields.class, "list");
  }
  public static void caseAnnotatedNested() throws Exception {
    annotatedPair("rt-annotated-nested", AnnotatedData.class, AnnotatedFields.class, "nested");
  }
  public static void caseAnnotatedArray() throws Exception {
    annotatedPair("rt-annotated-array", AnnotatedData.class, AnnotatedFields.class, "matrix");
  }
  public static void caseAnnotatedGenericArray() throws Exception {
    annotatedPair("rt-annotated-generic-array", AnnotatedData.class, AnnotatedFields.class, "array");
  }
  public static void caseAnnotatedVariable() throws Exception {
    annotatedPair("rt-annotated-variable", AnnotatedData.class, AnnotatedFields.class, "variable");
  }
  public static void caseAnnotatedVariableArray() throws Exception {
    annotatedPair("rt-annotated-variable-array", AnnotatedData.class, AnnotatedFields.class, "variableArray");
  }
  public static void caseAnnotatedWildcardUpper() throws Exception {
    annotatedPair("rt-annotated-wildcard-upper", AnnotatedData.class, AnnotatedFields.class, "upper");
  }
  public static void caseAnnotatedWildcardLower() throws Exception {
    annotatedPair("rt-annotated-wildcard-lower", AnnotatedData.class, AnnotatedFields.class, "lower");
  }
  public static void caseAnnotatedWildcardUnbounded() throws Exception {
    annotatedPair("rt-annotated-wildcard-unbounded", AnnotatedData.class, AnnotatedFields.class, "any");
  }
  public static void caseAnnotatedOwner() throws Exception {
    annotatedPair("rt-annotated-owner", AnnotatedOwners.class, AnnotatedOwnerFields.class, "member");
  }
  public static void caseAnnotatedDeepOwner() throws Exception {
    annotatedPair("rt-annotated-deep-owner", AnnotatedOwners.class, AnnotatedOwnerFields.class, "deep");
  }
  public static void caseAnnotatedStaticOwner() throws Exception {
    annotatedPair("rt-annotated-static-owner", AnnotatedOwners.class, AnnotatedOwnerFields.class, "statik");
  }
  public static void caseAnnotatedRawOwner() throws Exception {
    annotatedPair("rt-annotated-raw-owner", AnnotatedOwners.class, AnnotatedOwnerFields.class, "raw");
  }
  public static void caseImplicitAnnotations() throws Exception {
    declarationPair("rt-implicit-annotations", ImplicitData.class, ImplicitFields.class);
  }
  public static void caseExplicitAnnotations() throws Exception {
    declarationPair("rt-explicit-annotations", ExplicitData.class, ExplicitFields.class);
  }

  public static void main(String[] args) throws Exception {
    // A bounded diagnostic can expose the pre-B6 erased-type regression without
    // running later cases. The official runner always executes the full group.
    if (args.length == 1 && args[0].equals("generic-only")) {
      caseParameterized();
      System.out.println("RECORD_TYPES_GENERIC_OK");
      return;
    }
    caseRawPrimitive();
    caseRawReference();
    caseRawArrays();
    caseParameterized();
    caseNestedParameterized();
    caseWildcards();
    caseGenericArray();
    caseTypeVariable();
    caseVariableArrays();
    caseVariableArguments();
    caseVariableScope();
    caseParameterizedOwner();
    caseOwnerForms();
    caseAnnotatedScalar();
    caseAnnotatedArgument();
    caseAnnotatedNested();
    caseAnnotatedArray();
    caseAnnotatedGenericArray();
    caseAnnotatedVariable();
    caseAnnotatedVariableArray();
    caseAnnotatedWildcardUpper();
    caseAnnotatedWildcardLower();
    caseAnnotatedWildcardUnbounded();
    caseAnnotatedOwner();
    caseAnnotatedDeepOwner();
    caseAnnotatedStaticOwner();
    caseAnnotatedRawOwner();
    caseImplicitAnnotations();
    caseExplicitAnnotations();
    System.out.println("RECORD_TYPES_OK");
  }
}
