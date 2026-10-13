package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioDebugAttributes;
import java.util.List;

/** Encoded Code line-number table; traversal exposes LineNumber pseudos instead. */
public interface LineNumberTableAttribute extends Attribute<LineNumberTableAttribute> {
  List<LineNumberInfo> lineNumbers();
  static LineNumberTableAttribute of(List<LineNumberInfo> lines) {
    return DoppioDebugAttributes.lineNumberTable(lines);
  }
}
