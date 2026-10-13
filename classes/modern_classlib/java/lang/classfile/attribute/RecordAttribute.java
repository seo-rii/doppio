package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioMetadataAttributes;
import java.util.Arrays;
import java.util.List;

public interface RecordAttribute extends Attribute<RecordAttribute>, ClassElement {
  List<RecordComponentInfo> components();
  static RecordAttribute of(List<RecordComponentInfo> components) { return DoppioMetadataAttributes.record(components); }
  static RecordAttribute of(RecordComponentInfo... components) { return of(Arrays.asList(components)); }
}
