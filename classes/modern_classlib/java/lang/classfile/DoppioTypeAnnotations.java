package java.lang.classfile;

import java.lang.classfile.TypeAnnotation.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/** Native target-kind validation and immutable, real-label annotation placements. */
final class DoppioTypeAnnotations {
  private DoppioTypeAnnotations() { }
  private static <T> List<T> copyList(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }
  private static TargetType kind(TargetType type, int first, int last) {
    int tag = type.targetTypeValue();
    if (tag < first || tag > last) throw new IllegalArgumentException("Wrong target type specified " + type);
    return type;
  }
  static TypeAnnotation annotation(TargetInfo target, List<TypePathComponent> path, Annotation annotation) {
    return new AnnotationModel(Objects.requireNonNull(target), copyList(path), Objects.requireNonNull(annotation));
  }
  static TypeParameterTarget parameter(TargetType type, int index) { return new ParameterValue(kind(type, 0, 1), index); }
  static SupertypeTarget supertype(int index) { return new SupertypeValue(index); }
  static TypeParameterBoundTarget bound(TargetType type, int index, int bound) { return new BoundValue(kind(type, 0x11, 0x12), index, bound); }
  static EmptyTarget empty(TargetType type) { return new EmptyValue(kind(type, 0x13, 0x15)); }
  static FormalParameterTarget formal(int index) { return new FormalValue(index); }
  static ThrowsTarget throwsTarget(int index) { return new ThrowsValue(index); }
  static LocalVarTarget variable(TargetType type, List<LocalVarTargetInfo> table) { return new VariableValue(kind(type, 0x40, 0x41), copyList(table)); }
  static LocalVarTargetInfo local(Label start, Label end, int index) { return new LocalValue(Objects.requireNonNull(start), Objects.requireNonNull(end), index); }
  static CatchTarget catching(int index) { return new CatchValue(index); }
  static OffsetTarget offset(TargetType type, Label target) { return new OffsetValue(kind(type, 0x43, 0x46), Objects.requireNonNull(target)); }
  static TypeArgumentTarget argument(TargetType type, Label target, int index) { return new ArgumentValue(kind(type, 0x47, 0x4b), Objects.requireNonNull(target), index); }
  static TypePathComponent pathValue(TypePathComponent.Kind kind, int index) { return new PathValue(kind, index); }

  private static final class AnnotationModel implements TypeAnnotation {
    final TargetInfo target;
    final List<TypePathComponent> path;
    final Annotation annotation;
    AnnotationModel(TargetInfo target, List<TypePathComponent> path, Annotation annotation) { this.target = target; this.path = path; this.annotation = annotation; }
    public TargetInfo targetInfo() { return target; }
    public List<TypePathComponent> targetPath() { return path; }
    public Annotation annotation() { return annotation; }
    public boolean equals(Object other) {
      return other instanceof AnnotationModel && target.equals(((AnnotationModel) other).target)
        && path.equals(((AnnotationModel) other).path) && annotation.equals(((AnnotationModel) other).annotation);
    }
    public int hashCode() { return 31 * (31 * target.hashCode() + path.hashCode()) + annotation.hashCode(); }
    public String toString() { return "UnboundTypeAnnotation[targetInfo=" + target + ", targetPath=" + path + ", annotation=" + annotation + "]"; }
  }
  private abstract static class TypedTarget implements TargetInfo {
    final TargetType type;
    TypedTarget(TargetType type) { this.type = type; }
    public final TargetType targetType() { return type; }
  }
  private static final class ParameterValue extends TypedTarget implements TypeParameterTarget {
    final int index;
    ParameterValue(TargetType type, int index) { super(type); this.index = index; }
    public int typeParameterIndex() { return index; }
    public boolean equals(Object other) { return other instanceof ParameterValue && type == ((ParameterValue) other).type && index == ((ParameterValue) other).index; }
    public int hashCode() { return 31 * type.hashCode() + index; }
    public String toString() { return "TypeParameterTargetImpl[targetType=" + type + ", typeParameterIndex=" + index + "]"; }
  }
  private abstract static class SingleIndex implements TargetInfo {
    final int index;
    SingleIndex(int index) { this.index = index; }
    public final boolean equals(Object other) { return other != null && other.getClass() == getClass() && index == ((SingleIndex) other).index; }
    public final int hashCode() { return index; }
  }
  private static final class SupertypeValue extends SingleIndex implements SupertypeTarget {
    SupertypeValue(int index) { super(index); }
    public TargetType targetType() { return TargetType.CLASS_EXTENDS; }
    public int supertypeIndex() { return index; }
    public String toString() { return "SupertypeTargetImpl[supertypeIndex=" + index + "]"; }
  }
  private static final class BoundValue extends TypedTarget implements TypeParameterBoundTarget {
    final int index, bound;
    BoundValue(TargetType type, int index, int bound) { super(type); this.index = index; this.bound = bound; }
    public int typeParameterIndex() { return index; }
    public int boundIndex() { return bound; }
    public boolean equals(Object other) { return other instanceof BoundValue && type == ((BoundValue) other).type && index == ((BoundValue) other).index && bound == ((BoundValue) other).bound; }
    public int hashCode() { return 31 * (31 * type.hashCode() + index) + bound; }
    public String toString() { return "TypeParameterBoundTargetImpl[targetType=" + type + ", typeParameterIndex=" + index + ", boundIndex=" + bound + "]"; }
  }
  private static final class EmptyValue extends TypedTarget implements EmptyTarget {
    EmptyValue(TargetType type) { super(type); }
    public boolean equals(Object other) { return other instanceof EmptyValue && type == ((EmptyValue) other).type; }
    public int hashCode() { return type.hashCode(); }
    public String toString() { return "EmptyTargetImpl[targetType=" + type + "]"; }
  }
  private static final class FormalValue extends SingleIndex implements FormalParameterTarget {
    FormalValue(int index) { super(index); }
    public TargetType targetType() { return TargetType.METHOD_FORMAL_PARAMETER; }
    public int formalParameterIndex() { return index; }
    public String toString() { return "FormalParameterTargetImpl[formalParameterIndex=" + index + "]"; }
  }
  private static final class ThrowsValue extends SingleIndex implements ThrowsTarget {
    ThrowsValue(int index) { super(index); }
    public TargetType targetType() { return TargetType.THROWS; }
    public int throwsTargetIndex() { return index; }
    public String toString() { return "ThrowsTargetImpl[throwsTargetIndex=" + index + "]"; }
  }
  private static final class VariableValue extends TypedTarget implements LocalVarTarget {
    final List<LocalVarTargetInfo> table;
    VariableValue(TargetType type, List<LocalVarTargetInfo> table) { super(type); this.table = table; }
    public List<LocalVarTargetInfo> table() { return table; }
    public int size() { return 2 + 6 * table.size(); }
    public boolean equals(Object other) { return other instanceof VariableValue && type == ((VariableValue) other).type && table.equals(((VariableValue) other).table); }
    public int hashCode() { return 31 * type.hashCode() + table.hashCode(); }
    public String toString() { return "LocalVarTargetImpl[targetType=" + type + ", table=" + table + "]"; }
  }
  private static final class LocalValue implements LocalVarTargetInfo {
    final Label start, end;
    final int index;
    LocalValue(Label start, Label end, int index) { this.start = start; this.end = end; this.index = index; }
    public Label startLabel() { return start; }
    public Label endLabel() { return end; }
    public int index() { return index; }
    public boolean equals(Object other) { return other instanceof LocalValue && start.equals(((LocalValue) other).start) && end.equals(((LocalValue) other).end) && index == ((LocalValue) other).index; }
    public int hashCode() { return 31 * (31 * start.hashCode() + end.hashCode()) + index; }
    public String toString() { return "LocalVarTargetInfoImpl[startLabel=" + start + ", endLabel=" + end + ", index=" + index + "]"; }
  }
  private static final class CatchValue extends SingleIndex implements CatchTarget {
    CatchValue(int index) { super(index); }
    public TargetType targetType() { return TargetType.EXCEPTION_PARAMETER; }
    public int exceptionTableIndex() { return index; }
    public String toString() { return "CatchTargetImpl[exceptionTableIndex=" + index + "]"; }
  }
  private static final class OffsetValue extends TypedTarget implements OffsetTarget {
    final Label target;
    OffsetValue(TargetType type, Label target) { super(type); this.target = target; }
    public Label target() { return target; }
    public boolean equals(Object other) { return other instanceof OffsetValue && type == ((OffsetValue) other).type && target.equals(((OffsetValue) other).target); }
    public int hashCode() { return 31 * type.hashCode() + target.hashCode(); }
    public String toString() { return "OffsetTargetImpl[targetType=" + type + ", target=" + target + "]"; }
  }
  private static final class ArgumentValue extends TypedTarget implements TypeArgumentTarget {
    final Label target;
    final int index;
    ArgumentValue(TargetType type, Label target, int index) { super(type); this.target = target; this.index = index; }
    public Label target() { return target; }
    public int typeArgumentIndex() { return index; }
    public boolean equals(Object other) { return other instanceof ArgumentValue && type == ((ArgumentValue) other).type && target.equals(((ArgumentValue) other).target) && index == ((ArgumentValue) other).index; }
    public int hashCode() { return 31 * (31 * type.hashCode() + target.hashCode()) + index; }
    public String toString() { return "TypeArgumentTargetImpl[targetType=" + type + ", target=" + target + ", typeArgumentIndex=" + index + "]"; }
  }
  private static final class PathValue implements TypePathComponent {
    final TypePathComponent.Kind kind;
    final int index;
    PathValue(TypePathComponent.Kind kind, int index) { this.kind = kind; this.index = index; }
    public TypePathComponent.Kind typePathKind() { return kind; }
    public int typeArgumentIndex() { return index; }
    public boolean equals(Object other) { return other instanceof PathValue && kind == ((PathValue) other).kind && index == ((PathValue) other).index; }
    public int hashCode() { return 31 * kind.hashCode() + index; }
    public String toString() { return "TypePathComponentImpl[typePathKind=" + kind + ", typeArgumentIndex=" + index + "]"; }
  }
}
