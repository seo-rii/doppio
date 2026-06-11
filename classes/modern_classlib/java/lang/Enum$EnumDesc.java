package java.lang;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DynamicConstantDesc;
import java.lang.invoke.MethodHandles;
import java.util.Objects;

public final class Enum$EnumDesc<E extends Enum<E>> extends DynamicConstantDesc<E> {
  private Enum$EnumDesc(ClassDesc constantType, String constantName) {
    super(ConstantDescs.BSM_ENUM_CONSTANT, Objects.requireNonNull(constantName), Objects.requireNonNull(constantType));
  }

  public static <E extends Enum<E>> Enum$EnumDesc<E> of(ClassDesc enumClass, String constantName) {
    return new Enum$EnumDesc<E>(enumClass, constantName);
  }

  public E resolveConstantDesc(MethodHandles.Lookup lookup) throws ReflectiveOperationException {
    return super.resolveConstantDesc(lookup);
  }
}
