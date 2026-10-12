package java.lang.classfile;

import java.io.BufferedInputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.lang.constant.ClassDesc;
import java.util.Set;

/** Metadata only: resolver lookup never defines or initializes a generated class. */
final class DoppioClassHierarchy {
  private static final String OBJECT = "Ljava/lang/Object;";
  private static final String CLONEABLE = "Ljava/lang/Cloneable;";
  private static final String SERIALIZABLE = "Ljava/io/Serializable;";
  static final Info UNKNOWN = new Info(null, true);
  static final ClassHierarchyResolver DEFAULT_RESOLVER =
      ClassHierarchyResolver.ofClassLoading(ClassLoader.getSystemClassLoader());

  static final class Info implements ClassHierarchyResolver.ClassHierarchyInfo {
    final ClassDesc superclass;
    final boolean isInterface;
    Info(ClassDesc superclass, boolean isInterface) {
      this.superclass = superclass; this.isInterface = isInterface;
    }
  }

  private final ClassHierarchyResolver resolver;
  private final String owner;
  private final Info ownerInfo;

  DoppioClassHierarchy(ClassHierarchyResolver resolver, ClassDesc owner,
      ClassDesc superclass, int flags) {
    this.resolver = resolver.cached();
    this.owner = owner.descriptorString();
    this.ownerInfo = new Info(superclass, (flags & ClassFile.ACC_INTERFACE) != 0);
  }

  static String binaryName(ClassDesc descriptor) {
    if (!descriptor.isClassOrInterface()) throw new IllegalArgumentException("Expected a class or interface descriptor");
    String name = descriptor.descriptorString();
    return name.substring(1, name.length() - 1).replace('/', '.');
  }

  static Info fromClass(Class<?> type) {
    if (type.isInterface()) return new Info(ClassDesc.of("java.lang.Object"), true);
    Class<?> parent = type.getSuperclass();
    return new Info(parent == null ? null : ClassDesc.of(parent.getName()), false);
  }

  static Info read(InputStream stream) {
    if (stream == null) return null;
    try (DataInputStream input = new DataInputStream(new BufferedInputStream(stream))) {
      if (input.readInt() != 0xcafebabe) throw new IllegalArgumentException("Invalid hierarchy class-file header");
      input.readUnsignedShort(); input.readUnsignedShort();
      int count = input.readUnsignedShort();
      String[] utf8 = new String[count]; int[] classes = new int[count];
      for (int index = 1; index < count; index++) {
        int tag = input.readUnsignedByte();
        switch (tag) {
          case 1: utf8[index] = input.readUTF(); break;
          case 7: classes[index] = input.readUnsignedShort(); break;
          case 8: case 16: case 19: case 20: input.readUnsignedShort(); break;
          case 3: case 4: case 9: case 10: case 11: case 12: case 17: case 18: input.readInt(); break;
          case 5: case 6: input.readLong(); index++; break;
          case 15: input.readUnsignedByte(); input.readUnsignedShort(); break;
          default: throw new IllegalStateException("Bad hierarchy constant-pool tag " + tag + " at " + index);
        }
      }
      int flags = input.readUnsignedShort(); input.readUnsignedShort();
      int parent = input.readUnsignedShort(); ClassDesc superclass = null;
      if (parent != 0) {
        if (parent >= count || classes[parent] <= 0 || classes[parent] >= count || utf8[classes[parent]] == null)
          throw new IllegalArgumentException("Invalid hierarchy superclass constant");
        superclass = ClassDesc.ofInternalName(utf8[classes[parent]]);
      }
      return new Info(superclass, (flags & ClassFile.ACC_INTERFACE) != 0);
    } catch (IOException failed) { throw new UncheckedIOException(failed); }
  }

  private Info info(String descriptor) {
    if (owner.equals(descriptor)) return ownerInfo;
    if (OBJECT.equals(descriptor)) return new Info(null, false);
    ClassHierarchyResolver.ClassHierarchyInfo result = resolver.getClassInfo(ClassDesc.ofDescriptor(descriptor));
    if (result == null) throw new IllegalArgumentException("Could not resolve class hierarchy for " + descriptor);
    if (!(result instanceof Info)) throw new UnsupportedOperationException("Unrecognized hierarchy metadata implementation");
    Info information = (Info) result;
    if (information.superclass != null && !information.superclass.isClassOrInterface())
      throw new IllegalArgumentException("Superclass must be a class or interface: " + descriptor);
    return information;
  }

  /** JVM verification permits an arbitrary non-array reference at an interface use. */
  boolean assignable(String actual, String expected) {
    if (actual.equals(expected) || OBJECT.equals(expected)) return true;
    boolean sourceArray = actual.charAt(0) == '[', targetArray = expected.charAt(0) == '[';
    if (sourceArray) {
      if (!targetArray) return CLONEABLE.equals(expected) || SERIALIZABLE.equals(expected);
      String source = actual.substring(1), target = expected.substring(1);
      if (source.length() == 1 || target.length() == 1) return source.equals(target);
      return assignable(source, target);
    }
    if (targetArray) return false;
    if (info(expected).isInterface) return true;
    if (info(actual).isInterface) return false;
    return ancestry(actual).contains(expected);
  }

  String commonAncestor(String left, String right) {
    if (left.equals(right)) return left;
    boolean leftArray = left.charAt(0) == '[', rightArray = right.charAt(0) == '[';
    if (leftArray || rightArray) {
      if (!leftArray || !rightArray) return OBJECT;
      String a = left.substring(1), b = right.substring(1);
      if (a.length() == 1 || b.length() == 1) return OBJECT;
      return '[' + commonAncestor(a, b);
    }
    if (info(left).isInterface || info(right).isInterface) return OBJECT;
    Set<String> rightAncestors = ancestry(right);
    for (String candidate : ancestry(left)) if (rightAncestors.contains(candidate)) return candidate;
    throw new IllegalArgumentException("Class hierarchies have no common root: " + left + ", " + right);
  }

  private Set<String> ancestry(String descriptor) {
    // Preserve nearest-parent order and reject cycles rather than looping forever.
    Set<String> visited = new java.util.LinkedHashSet<>();
    String current = descriptor;
    while (current != null) {
      if (!visited.add(current)) throw new IllegalArgumentException("Cyclic class hierarchy at " + current);
      if (visited.size() > 1024) throw new IllegalArgumentException("Class hierarchy exceeds supported depth");
      Info information = info(current);
      if (information.isInterface) throw new IllegalArgumentException("Interface in superclass chain: " + current);
      current = information.superclass == null ? null : information.superclass.descriptorString();
    }
    if (!visited.contains(OBJECT)) throw new IllegalArgumentException("Class hierarchy does not reach java.lang.Object: " + descriptor);
    return visited;
  }
}
