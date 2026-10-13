package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.AttributedElement;
import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.util.Arrays;
import java.util.List;

/** A real attributed record component, not a field or compound element. */
public interface RecordComponentInfo extends AttributedElement {
  Utf8Entry name();
  Utf8Entry descriptor();
  default ClassDesc descriptorSymbol() { return ClassDesc.ofDescriptor(descriptor().stringValue()); }
  static RecordComponentInfo of(Utf8Entry name, Utf8Entry descriptor, List<Attribute<?>> attributes) {
    return DoppioMetadataAttributes.recordComponent(name, descriptor, attributes);
  }
  static RecordComponentInfo of(Utf8Entry name, Utf8Entry descriptor, Attribute<?>... attributes) {
    return of(name, descriptor, Arrays.asList(attributes));
  }
  static RecordComponentInfo of(String name, ClassDesc descriptor, List<Attribute<?>> attributes) {
    return DoppioMetadataAttributes.recordComponent(name, descriptor, attributes);
  }
  static RecordComponentInfo of(String name, ClassDesc descriptor, Attribute<?>... attributes) {
    return of(name, descriptor, Arrays.asList(attributes));
  }
}
