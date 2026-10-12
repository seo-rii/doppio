package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.util.List;

public interface StackMapTableAttribute extends Attribute<StackMapTableAttribute>, CodeElement {
  List<StackMapFrameInfo> entries();
  static StackMapTableAttribute of(List<StackMapFrameInfo> entries) {
    return DoppioClassReader.stackMapTable(entries);
  }
}
