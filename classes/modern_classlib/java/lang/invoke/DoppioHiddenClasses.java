package java.lang.invoke;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Objects;

/** Selected hidden-class operations. VM identities and data never use the
 * defining loader's discoverable namespace or expose a trusted Lookup. */
public final class DoppioHiddenClasses {
  private DoppioHiddenClasses() {}

  public static MethodHandles.Lookup defineHiddenClass(MethodHandles.Lookup lookup,
      byte[] bytes, boolean initialize, MethodHandles$Lookup$ClassOption... options)
      throws IllegalAccessException {
    Objects.requireNonNull(bytes);
    Objects.requireNonNull(options);
    return defineHiddenClass0(lookup, bytes, null, initialize, options);
  }

  public static MethodHandles.Lookup defineHiddenClassWithClassData(MethodHandles.Lookup lookup,
      byte[] bytes, Object classData, boolean initialize, MethodHandles$Lookup$ClassOption... options)
      throws IllegalAccessException {
    Objects.requireNonNull(bytes);
    Objects.requireNonNull(classData);
    Objects.requireNonNull(options);
    return defineHiddenClass0(lookup, bytes, classData, initialize, options);
  }

  private static native MethodHandles.Lookup defineHiddenClass0(MethodHandles.Lookup lookup,
      byte[] bytes, Object classData, boolean initialize, MethodHandles$Lookup$ClassOption[] options)
      throws IllegalAccessException;

  public static <T> T classData(MethodHandles.Lookup caller, String name, Class<T> type)
      throws IllegalAccessException {
    Objects.requireNonNull(caller);
    Objects.requireNonNull(type);
    if (!"_".equals(name)) throw new IllegalArgumentException("name must be _");
    if ((DoppioMethodHandles.lookupModes(caller) & 0x0040) == 0) {
      throw new IllegalAccessException("Lookup does not have ORIGINAL access");
    }
    Object value = classData0(caller);
    return value == null ? null : convert(value, type);
  }

  public static <T> T classDataAt(MethodHandles.Lookup caller, String name, Class<T> type, int index)
      throws IllegalAccessException {
    List<?> data = classData(caller, name, List.class);
    if (data == null) return null;
    return convert(data.get(index), type);
  }

  private static native Object classData0(MethodHandles.Lookup caller)
      throws IllegalAccessException;

  @SuppressWarnings("unchecked")
  private static <T> T convert(Object value, Class<T> type) {
    if (!type.isPrimitive()) return type.cast(value);
    try {
      return (T) MethodHandles.identity(type).invoke(value);
    } catch (RuntimeException | Error failure) {
      throw failure;
    } catch (Throwable failure) {
      throw new InternalError(failure);
    }
  }

  public static native void checkFieldWritable(Field field) throws IllegalAccessException;

  public static MethodHandle unreflectSetter(MethodHandles.Lookup lookup, Field field)
      throws IllegalAccessException {
    checkFieldWritable(field);
    return unreflectSetterBase(lookup, field);
  }

  private static native MethodHandle unreflectSetterBase(MethodHandles.Lookup lookup, Field field)
      throws IllegalAccessException;

  public static native String canonicalName(Class<?> type);
}
