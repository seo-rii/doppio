package java.lang.classfile.attribute;

import java.lang.classfile.DoppioDebugAttributes;

public interface CharacterRangeInfo {
  int startPc();
  int endPc();
  int characterRangeStart();
  int characterRangeEnd();
  int flags();
  static CharacterRangeInfo of(int startPc, int endPc, int rangeStart, int rangeEnd, int flags) {
    return DoppioDebugAttributes.characterRangeInfo(startPc, endPc, rangeStart, rangeEnd, flags);
  }
}
