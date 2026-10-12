package java.lang.classfile;

public interface AttributeMapper<A extends Attribute<A>> {
  enum AttributeStability { STATELESS, CP_REFS, LABELS, UNSTABLE, UNKNOWN }
  String name();
  A readAttribute(AttributedElement enclosing, ClassReader reader, int payloadStart);
  void writeAttribute(BufWriter writer, A attribute);
  default boolean allowMultiple() { return false; }
  AttributeStability stability();
}
