package java.lang.classfile;

public interface ClassFileVersion extends ClassElement {
  int majorVersion();
  int minorVersion();
  static ClassFileVersion of(int major, int minor) { return DoppioClassReader.version(major, minor); }
}
