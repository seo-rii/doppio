package java.lang.classfile;

import java.io.InputStream;
import java.lang.constant.ClassDesc;
import java.lang.invoke.MethodHandles;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;

/** Class and interface metadata used for verification and stack-map generation. */
@FunctionalInterface
public interface ClassHierarchyResolver {
  static ClassHierarchyResolver defaultResolver() {
    return DoppioClassHierarchy.DEFAULT_RESOLVER;
  }

  ClassHierarchyInfo getClassInfo(ClassDesc classDesc);

  default ClassHierarchyResolver orElse(ClassHierarchyResolver other) {
    Objects.requireNonNull(other);
    return descriptor -> {
      ClassHierarchyInfo information = getClassInfo(descriptor);
      return information != null ? information : other.getClassInfo(descriptor);
    };
  }

  default ClassHierarchyResolver cached(Supplier<Map<ClassDesc, ClassHierarchyInfo>> cacheFactory) {
    Map<ClassDesc, ClassHierarchyInfo> cache = Objects.requireNonNull(cacheFactory).get();
    return descriptor -> {
      ClassHierarchyInfo information = cache.computeIfAbsent(descriptor, key -> {
        ClassHierarchyInfo result = getClassInfo(key);
        return result == null ? DoppioClassHierarchy.UNKNOWN : result;
      });
      return information == DoppioClassHierarchy.UNKNOWN ? null : information;
    };
  }

  default ClassHierarchyResolver cached() {
    return cached(HashMap::new);
  }

  static ClassHierarchyResolver ofResourceParsing(Function<ClassDesc, InputStream> classStreamResolver) {
    Objects.requireNonNull(classStreamResolver);
    return descriptor -> DoppioClassHierarchy.read(classStreamResolver.apply(descriptor));
  }

  static ClassHierarchyResolver ofResourceParsing(ClassLoader loader) {
    Objects.requireNonNull(loader);
    return ofResourceParsing(descriptor -> loader.getResourceAsStream(
        DoppioClassHierarchy.binaryName(descriptor).replace('.', '/') + ".class"));
  }

  static ClassHierarchyResolver of(Collection<ClassDesc> interfaces,
      Map<ClassDesc, ClassDesc> classToSuperClass) {
    Objects.requireNonNull(interfaces); Objects.requireNonNull(classToSuperClass);
    Map<ClassDesc, ClassHierarchyInfo> information = new HashMap<>();
    information.put(ClassDesc.of("java.lang.Object"), ClassHierarchyInfo.ofClass(null));
    for (Map.Entry<ClassDesc, ClassDesc> entry : classToSuperClass.entrySet())
      information.put(Objects.requireNonNull(entry.getKey()), ClassHierarchyInfo.ofClass(entry.getValue()));
    for (ClassDesc descriptor : interfaces)
      information.put(Objects.requireNonNull(descriptor), ClassHierarchyInfo.ofInterface());
    return information::get;
  }

  static ClassHierarchyResolver ofClassLoading(ClassLoader loader) {
    Objects.requireNonNull(loader);
    return descriptor -> {
      if (!descriptor.isClassOrInterface()) return null;
      if ("Ljava/lang/Object;".equals(descriptor.descriptorString())) return ClassHierarchyInfo.ofClass(null);
      try {
        return DoppioClassHierarchy.fromClass(Class.forName(
            DoppioClassHierarchy.binaryName(descriptor), false, loader));
      } catch (ClassNotFoundException missing) { return null; }
    };
  }

  static ClassHierarchyResolver ofClassLoading(MethodHandles.Lookup lookup) {
    Objects.requireNonNull(lookup);
    return descriptor -> {
      if (!descriptor.isClassOrInterface()) return null;
      if ("Ljava/lang/Object;".equals(descriptor.descriptorString())) return ClassHierarchyInfo.ofClass(null);
      try { return DoppioClassHierarchy.fromClass(descriptor.resolveConstantDesc(lookup)); }
      catch (IllegalAccessException inaccessible) { throw new IllegalArgumentException(inaccessible); }
      catch (ReflectiveOperationException missing) { return null; }
    };
  }

  interface ClassHierarchyInfo {
    static ClassHierarchyInfo ofClass(ClassDesc superClass) {
      return new DoppioClassHierarchy.Info(superClass, false);
    }

    static ClassHierarchyInfo ofInterface() {
      return new DoppioClassHierarchy.Info(ClassDesc.of("java.lang.Object"), true);
    }
  }
}
