package java.lang.classfile.constantpool;

public interface PoolEntry {
  int TAG_UTF8 = 1, TAG_INTEGER = 3, TAG_FLOAT = 4, TAG_LONG = 5, TAG_DOUBLE = 6;
  int TAG_CLASS = 7, TAG_STRING = 8, TAG_FIELDREF = 9, TAG_METHODREF = 10;
  int TAG_INTERFACE_METHODREF = 11, TAG_NAME_AND_TYPE = 12, TAG_METHOD_HANDLE = 15;
  int TAG_METHOD_TYPE = 16, TAG_DYNAMIC = 17, TAG_INVOKE_DYNAMIC = 18, TAG_MODULE = 19, TAG_PACKAGE = 20;
  ConstantPool constantPool();
  int tag();
  int index();
  int width();
}
