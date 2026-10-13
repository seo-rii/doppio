package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioDebugAttributes;
import java.util.List;

/** Encoded Code local-variable table; not a CodeElement. */
public interface LocalVariableTableAttribute extends Attribute<LocalVariableTableAttribute> {
  List<LocalVariableInfo> localVariables();
  static LocalVariableTableAttribute of(List<LocalVariableInfo> locals) {
    return DoppioDebugAttributes.localVariableTable(locals);
  }
}
