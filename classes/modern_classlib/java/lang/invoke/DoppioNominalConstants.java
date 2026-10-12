package java.lang.invoke;

import java.lang.constant.ClassDesc;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.Objects;
import java.util.Optional;

/** Nominal descriptions derived from held runtime identities, never a trusted guest Lookup. */
public final class DoppioNominalConstants {
  private DoppioNominalConstants() {}

  public static Optional<ClassDesc> describeClass(Class<?> type) {
    return describeClass0(Objects.requireNonNull(type));
  }

  public static Optional<MethodTypeDesc> describeMethodType(MethodType type) {
    Objects.requireNonNull(type);
    Optional<ClassDesc> result = describeClass(type.returnType());
    if (!result.isPresent()) return Optional.empty();
    Class<?>[] parameters = type.parameterArray();
    ClassDesc[] descriptors = new ClassDesc[parameters.length];
    for (int i = 0; i < parameters.length; i++) {
      Optional<ClassDesc> parameter = describeClass(parameters[i]);
      if (!parameter.isPresent()) return Optional.empty();
      descriptors[i] = parameter.get();
    }
    return Optional.of(MethodTypeDesc.of(result.get(), descriptors));
  }

  public static Optional<MethodHandleDesc> describeMethodHandle(MethodHandle handle) {
    Objects.requireNonNull(handle);
    int referenceKind = referenceKind(handle);
    if (referenceKind < 1 || referenceKind > 9) return Optional.empty();
    Class<?> declaringClass = declaringClass(handle);
    if (declaringClass == null) return Optional.empty();
    Optional<ClassDesc> owner = describeClass(declaringClass);
    if (!owner.isPresent() || !describeMethodType(handle.type()).isPresent()) return Optional.empty();
    String name = memberName(handle), descriptor = memberDescriptor(handle);
    if (name == null || descriptor == null) return Optional.empty();
    DirectMethodHandleDesc.Kind kind = DirectMethodHandleDesc.Kind.valueOf(referenceKind, declaringClass.isInterface());
    return Optional.of(MethodHandleDesc.of(kind, owner.get(), name, descriptor));
  }

  // Fixed read-only queries into canonical VM-held DirectMethodHandle.member.
  // They expose no MemberName, VM target, Lookup or caller-selected member search.
  private static native int referenceKind(MethodHandle handle);
  private static native Class<?> declaringClass(MethodHandle handle);
  private static native String memberName(MethodHandle handle);
  private static native String memberDescriptor(MethodHandle handle);
  // Registered as the existing Class description implementation, preserving
  // exact hidden/component policy without requiring an unavailable SDK9 API.
  private static native Optional<ClassDesc> describeClass0(Class<?> type);
}
