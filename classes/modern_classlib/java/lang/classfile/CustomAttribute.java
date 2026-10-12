package java.lang.classfile;

import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;

/** Public extension point; mappers serialize the complete attribute header and payload. */
public abstract class CustomAttribute<T extends CustomAttribute<T>> implements Attribute<T>,
    CodeElement, ClassElement, MethodElement, FieldElement {
  private final AttributeMapper<T> mapper;
  protected CustomAttribute(AttributeMapper<T> mapper) { this.mapper = mapper; }
  public final AttributeMapper<T> attributeMapper() { return mapper; }
  public Utf8Entry attributeName() { return new DoppioConstantPool().utf8Entry(mapper.name()); }
  public String toString() { return "CustomAttribute[name=" + mapper.name() + "]"; }
}
