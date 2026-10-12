package java.lang.classfile.constantpool;

public interface StringEntry extends ConstantValueEntry {
  Utf8Entry utf8();
  String stringValue();
  boolean equalsString(String value);
}
