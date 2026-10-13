package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioDebugAttributes;
import java.util.List;

/** Raw character-range entries retain encoded inclusive end_pc values. */
public interface CharacterRangeTableAttribute extends Attribute<CharacterRangeTableAttribute> {
  List<CharacterRangeInfo> characterRangeTable();
  static CharacterRangeTableAttribute of(List<CharacterRangeInfo> ranges) {
    return DoppioDebugAttributes.characterRangeTable(ranges);
  }
}
