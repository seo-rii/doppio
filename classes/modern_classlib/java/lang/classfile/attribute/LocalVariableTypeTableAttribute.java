package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioDebugAttributes;
import java.util.List;

/** Encoded generic local-variable signatures; not a CodeElement. */
public interface LocalVariableTypeTableAttribute extends Attribute<LocalVariableTypeTableAttribute> {
  List<LocalVariableTypeInfo> localVariableTypes();
  static LocalVariableTypeTableAttribute of(List<LocalVariableTypeInfo> locals) {
    return DoppioDebugAttributes.localVariableTypeTable(locals);
  }
}
