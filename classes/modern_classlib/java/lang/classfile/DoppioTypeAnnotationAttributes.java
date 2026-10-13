package java.lang.classfile;

import java.lang.classfile.AttributeMapper.AttributeStability;
import java.lang.classfile.DoppioAnnotationAttributes.Cursor;
import java.lang.classfile.TypeAnnotation.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.function.UnaryOperator;

import static java.lang.classfile.TypeAnnotation.TargetInfo.*;

/** Genuine type-annotation targets, paths, and semantic annotation suffix codecs. */
public final class DoppioTypeAnnotationAttributes {
  private DoppioTypeAnnotationAttributes() {}
  private static final AttributeMapper<RuntimeVisibleTypeAnnotationsAttribute> VISIBLE =
      new Mapper<RuntimeVisibleTypeAnnotationsAttribute>("RuntimeVisibleTypeAnnotations") {
    void payload(BufWriter writer, RuntimeVisibleTypeAnnotationsAttribute value) { writeAnnotations(writer, value.annotations()); }
  };
  private static final AttributeMapper<RuntimeInvisibleTypeAnnotationsAttribute> INVISIBLE =
      new Mapper<RuntimeInvisibleTypeAnnotationsAttribute>("RuntimeInvisibleTypeAnnotations") {
    void payload(BufWriter writer, RuntimeInvisibleTypeAnnotationsAttribute value) { writeAnnotations(writer, value.annotations()); }
  };
  private abstract static class Mapper<A extends Attribute<A>> implements AttributeMapper<A> {
    final String name;
    Mapper(String name) { this.name = name; }
    public String name() { return name; }
    public AttributeStability stability() { return AttributeStability.UNSTABLE; }
    @SuppressWarnings("unchecked")
    public A readAttribute(AttributedElement owner, ClassReader reader, int start) {
      return (A) read(owner, reader, reader.readEntry(start - 6, Utf8Entry.class), start,
          reader.readBytes(start, reader.readInt(start - 4)));
    }
    public void writeAttribute(BufWriter writer, A value) {
      writer.writeIndex(value.attributeName()); int lengthAt = writer.size(); writer.writeInt(0);
      int start = writer.size(); payload(writer, value);
      writer.patchInt(lengthAt, 4, writer.size() - start);
    }
    abstract void payload(BufWriter writer, A value);
  }
  static AttributeMapper<RuntimeVisibleTypeAnnotationsAttribute> runtimeVisibleTypeAnnotationsMapper() { return VISIBLE; }
  static AttributeMapper<RuntimeInvisibleTypeAnnotationsAttribute> runtimeInvisibleTypeAnnotationsMapper() { return INVISIBLE; }
  static Attribute<?> read(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    String key = name.stringValue();
    boolean visible = "RuntimeVisibleTypeAnnotations".equals(key);
    if (!visible && !"RuntimeInvisibleTypeAnnotations".equals(key)) return null;
    if (!(owner instanceof ClassModel || owner instanceof MethodModel || owner instanceof FieldModel ||
        owner instanceof CodeModel || owner instanceof RecordComponentInfo))
      throw new IllegalArgumentException("Invalid enclosing element for " + key);
    Cursor cursor = new Cursor(reader, start, start + payload.length);
    int count = cursor.u2(); List<TypeAnnotation> annotations = new ArrayList<TypeAnnotation>();
    for (int index = 0; index < count; index++) annotations.add(readAnnotation(owner, cursor));
    cursor.finish();
    ConstantPool pool = DoppioClassReader.readerPool(reader);
    return visible ? new VisibleValue(name, annotations, pool, payload) : new InvisibleValue(name, annotations, pool, payload);
  }
  private static TypeAnnotation readAnnotation(AttributedElement owner, Cursor cursor) {
    int targetAt = cursor.at, tag = cursor.u1(); TargetInfo target;
    switch (tag) {
      case TARGET_CLASS_TYPE_PARAMETER: target = ofClassTypeParameter(cursor.u1()); break;
      case TARGET_METHOD_TYPE_PARAMETER: target = ofMethodTypeParameter(cursor.u1()); break;
      case TARGET_CLASS_EXTENDS: target = ofClassExtends(cursor.u2()); break;
      case TARGET_CLASS_TYPE_PARAMETER_BOUND: target = ofClassTypeParameterBound(cursor.u1(), cursor.u1()); break;
      case TARGET_METHOD_TYPE_PARAMETER_BOUND: target = ofMethodTypeParameterBound(cursor.u1(), cursor.u1()); break;
      case TARGET_FIELD: target = ofField(); break;
      case TARGET_METHOD_RETURN: target = ofMethodReturn(); break;
      case TARGET_METHOD_RECEIVER: target = ofMethodReceiver(); break;
      case TARGET_METHOD_FORMAL_PARAMETER: target = ofMethodFormalParameter(cursor.u1()); break;
      case TARGET_THROWS: target = ofThrows(cursor.u2()); break;
      case TARGET_LOCAL_VARIABLE: target = ofLocalVariable(readLocalVariables(owner, cursor)); break;
      case TARGET_RESOURCE_VARIABLE: target = ofResourceVariable(readLocalVariables(owner, cursor)); break;
      case TARGET_EXCEPTION_PARAMETER: target = ofExceptionParameter(cursor.u2()); break;
      case TARGET_INSTANCEOF: target = ofInstanceofExpr(label(owner, cursor.u2())); break;
      case TARGET_NEW: target = ofNewExpr(label(owner, cursor.u2())); break;
      case TARGET_CONSTRUCTOR_REFERENCE: target = ofConstructorReference(label(owner, cursor.u2())); break;
      case TARGET_METHOD_REFERENCE: target = ofMethodReference(label(owner, cursor.u2())); break;
      case TARGET_CAST: target = ofCastExpr(label(owner, cursor.u2()), cursor.u1()); break;
      case TARGET_CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT: target = ofConstructorInvocationTypeArgument(label(owner, cursor.u2()), cursor.u1()); break;
      case TARGET_METHOD_INVOCATION_TYPE_ARGUMENT: target = ofMethodInvocationTypeArgument(label(owner, cursor.u2()), cursor.u1()); break;
      case TARGET_CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT: target = ofConstructorReferenceTypeArgument(label(owner, cursor.u2()), cursor.u1()); break;
      case TARGET_METHOD_REFERENCE_TYPE_ARGUMENT: target = ofMethodReferenceTypeArgument(label(owner, cursor.u2()), cursor.u1()); break;
      default: throw new IllegalArgumentException("Unexpected targetType '" + tag + "' in TypeAnnotation, pos = " + targetAt);
    }
    int count = cursor.u1(); List<TypePathComponent> path = new ArrayList<TypePathComponent>();
    for (int index = 0; index < count; index++) {
      int kind = cursor.u1(), argument = cursor.u1();
      switch (kind) {
        case 0: path.add(TypePathComponent.ARRAY); break;
        case 1: path.add(TypePathComponent.INNER_TYPE); break;
        case 2: path.add(TypePathComponent.WILDCARD); break;
        case 3: path.add(TypePathComponent.of(TypePathComponent.Kind.TYPE_ARGUMENT, argument)); break;
        default: throw new IllegalArgumentException("Unknown type annotation path component kind: " + kind);
      }
    }
    return TypeAnnotation.of(target, path, DoppioAnnotationAttributes.readAnnotation(cursor));
  }
  private static List<LocalVarTargetInfo> readLocalVariables(AttributedElement owner, Cursor cursor) {
    int count = cursor.u2(); List<LocalVarTargetInfo> entries = new ArrayList<LocalVarTargetInfo>();
    for (int index = 0; index < count; index++) {
      int start = cursor.u2(), length = cursor.u2(), slot = cursor.u2();
      entries.add(LocalVarTargetInfo.of(label(owner, start), label(owner, start + length), slot));
    }
    return entries;
  }
  private static Label label(AttributedElement owner, int bci) { return DoppioClassReader.annotationLabel(owner, bci); }
  private static int labelToBci(BufWriter writer, Label label) {
    if (!(writer instanceof DoppioBufWriter) || !((DoppioBufWriter) writer).hasCodeLabels())
      throw new IllegalArgumentException("Illegal Code target in TypeAnnotation outside of Code attribute");
    return ((DoppioBufWriter) writer).annotationLabelToBci(label);
  }
  private static void writeAnnotations(BufWriter writer, List<TypeAnnotation> annotations) {
    writer.writeU2(annotations.size());
    for (TypeAnnotation annotation : annotations) writeAnnotation(writer, annotation);
  }
  private static void writeAnnotation(BufWriter writer, TypeAnnotation annotation) {
    TargetInfo target = annotation.targetInfo(); writer.writeU1(target.targetType().targetTypeValue());
    if (target instanceof TypeParameterTarget) writer.writeU1(((TypeParameterTarget) target).typeParameterIndex());
    else if (target instanceof SupertypeTarget) writer.writeU2(((SupertypeTarget) target).supertypeIndex());
    else if (target instanceof TypeParameterBoundTarget) {
      TypeParameterBoundTarget entry = (TypeParameterBoundTarget) target;
      writer.writeU1(entry.typeParameterIndex()); writer.writeU1(entry.boundIndex());
    } else if (target instanceof EmptyTarget) {
      // The field/return/receiver target payload is empty.
    } else if (target instanceof FormalParameterTarget) writer.writeU1(((FormalParameterTarget) target).formalParameterIndex());
    else if (target instanceof ThrowsTarget) writer.writeU2(((ThrowsTarget) target).throwsTargetIndex());
    else if (target instanceof LocalVarTarget) {
      List<LocalVarTargetInfo> entries = ((LocalVarTarget) target).table(); writer.writeU2(entries.size());
      for (LocalVarTargetInfo entry : entries) {
        int start = labelToBci(writer, entry.startLabel()), end = labelToBci(writer, entry.endLabel());
        writer.writeU2(start); writer.writeU2(end - start); writer.writeU2(entry.index());
      }
    } else if (target instanceof CatchTarget) writer.writeU2(((CatchTarget) target).exceptionTableIndex());
    else if (target instanceof OffsetTarget) writer.writeU2(labelToBci(writer, ((OffsetTarget) target).target()));
    else if (target instanceof TypeArgumentTarget) {
      TypeArgumentTarget entry = (TypeArgumentTarget) target;
      writer.writeU2(labelToBci(writer, entry.target())); writer.writeU1(entry.typeArgumentIndex());
    } else throw new IllegalArgumentException("Unknown TypeAnnotation target info");
    writer.writeU1(annotation.targetPath().size());
    for (TypePathComponent component : annotation.targetPath()) {
      writer.writeU1(component.typePathKind().tag()); writer.writeU1(component.typeArgumentIndex());
    }
    DoppioAnnotationAttributes.writeAnnotation(writer, annotation.annotation());
  }

  // Called after the original bound attribute's processing policy is checked.
  // Only Code labels change; indices (including catch indices), paths and CP
  // values retain the caller's native metadata semantics.
  static Attribute<?> remapCodeAttribute(Attribute<?> attribute, UnaryOperator<Label> labels) {
    if (!isTypeAnnotationAttribute(attribute)) return attribute;
    Objects.requireNonNull(labels);
    List<TypeAnnotation> source = attribute instanceof RuntimeVisibleTypeAnnotationsAttribute ?
        ((RuntimeVisibleTypeAnnotationsAttribute) attribute).annotations() : ((RuntimeInvisibleTypeAnnotationsAttribute) attribute).annotations();
    List<TypeAnnotation> annotations = new ArrayList<TypeAnnotation>();
    for (TypeAnnotation annotation : source) {
      TargetInfo target = annotation.targetInfo();
      if (target instanceof LocalVarTarget) {
        List<LocalVarTargetInfo> entries = new ArrayList<LocalVarTargetInfo>();
        for (LocalVarTargetInfo entry : ((LocalVarTarget) target).table())
          entries.add(LocalVarTargetInfo.of(labels.apply(entry.startLabel()), labels.apply(entry.endLabel()), entry.index()));
        target = ofVariable(target.targetType(), entries);
      } else if (target instanceof OffsetTarget) {
        target = ofOffset(target.targetType(), labels.apply(((OffsetTarget) target).target()));
      } else if (target instanceof TypeArgumentTarget) {
        TypeArgumentTarget entry = (TypeArgumentTarget) target;
        target = ofTypeArgument(target.targetType(), labels.apply(entry.target()), entry.typeArgumentIndex());
      }
      annotations.add(TypeAnnotation.of(target, annotation.targetPath(), annotation.annotation()));
    }
    return attribute instanceof RuntimeVisibleTypeAnnotationsAttribute ? visibleAnnotations(annotations) : invisibleAnnotations(annotations);
  }
  static boolean isTypeAnnotationAttribute(Attribute<?> attribute) {
    return attribute instanceof RuntimeVisibleTypeAnnotationsAttribute || attribute instanceof RuntimeInvisibleTypeAnnotationsAttribute;
  }
  static byte[] retainedPayload(Attribute<?> attribute) {
    return attribute instanceof Base && ((Base<?>) attribute).payload != null ? ((Base<?>) attribute).payload.clone() : null;
  }
  static ConstantPool sourcePool(Attribute<?> attribute) { return attribute instanceof Base ? ((Base<?>) attribute).pool : null; }
  public static RuntimeVisibleTypeAnnotationsAttribute visibleAnnotations(List<TypeAnnotation> annotations) {
    return new VisibleValue(name("RuntimeVisibleTypeAnnotations"), annotations, null, null);
  }
  public static RuntimeInvisibleTypeAnnotationsAttribute invisibleAnnotations(List<TypeAnnotation> annotations) {
    return new InvisibleValue(name("RuntimeInvisibleTypeAnnotations"), annotations, null, null);
  }
  private static Utf8Entry name(String value) { return new DoppioConstantPool().utf8Entry(value); }
  private static List<TypeAnnotation> immutable(List<TypeAnnotation> annotations) {
    List<TypeAnnotation> copy = new ArrayList<TypeAnnotation>(Objects.requireNonNull(annotations));
    for (TypeAnnotation annotation : copy) Objects.requireNonNull(annotation);
    return Collections.unmodifiableList(copy);
  }
  private abstract static class Base<A extends Attribute<A>> implements Attribute<A> {
    final Utf8Entry name; final ConstantPool pool; final byte[] payload; final List<TypeAnnotation> annotations;
    Base(Utf8Entry name, List<TypeAnnotation> annotations, ConstantPool pool, byte[] payload) {
      this.name = name; this.annotations = immutable(annotations); this.pool = pool; this.payload = payload == null ? null : payload.clone();
    }
    public Utf8Entry attributeName() { return name; }
    public List<TypeAnnotation> annotations() { return annotations; }
  }
  private static final class VisibleValue extends Base<RuntimeVisibleTypeAnnotationsAttribute> implements RuntimeVisibleTypeAnnotationsAttribute {
    VisibleValue(Utf8Entry name, List<TypeAnnotation> annotations, ConstantPool pool, byte[] payload) { super(name, annotations, pool, payload); }
    public AttributeMapper<RuntimeVisibleTypeAnnotationsAttribute> attributeMapper() { return VISIBLE; }
  }
  private static final class InvisibleValue extends Base<RuntimeInvisibleTypeAnnotationsAttribute> implements RuntimeInvisibleTypeAnnotationsAttribute {
    InvisibleValue(Utf8Entry name, List<TypeAnnotation> annotations, ConstantPool pool, byte[] payload) { super(name, annotations, pool, payload); }
    public AttributeMapper<RuntimeInvisibleTypeAnnotationsAttribute> attributeMapper() { return INVISIBLE; }
  }
}
