package java.lang.invoke;

import java.util.List;

public interface TypeDescriptor {
  String descriptorString();

  public interface OfField<F extends OfField<F>> extends TypeDescriptor {
    boolean isArray();

    boolean isPrimitive();

    F componentType();

    F arrayType();
  }

  public interface OfMethod<F extends OfField<F>, M extends OfMethod<F, M>> extends TypeDescriptor {
    int parameterCount();

    F parameterType(int index);

    F returnType();

    F[] parameterArray();

    List<F> parameterList();

    M changeReturnType(F returnType);

    M changeParameterType(int index, F paramType);

    M dropParameterTypes(int start, int end);

    M insertParameterTypes(int pos, F... paramTypes);
  }
}
