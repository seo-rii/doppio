package java.lang.classfile.attribute;

import java.lang.classfile.DoppioDebugAttributes;

public interface LineNumberInfo {
  int startPc();
  int lineNumber();
  static LineNumberInfo of(int startPc, int lineNumber) {
    return DoppioDebugAttributes.lineNumberInfo(startPc, lineNumber);
  }
}
