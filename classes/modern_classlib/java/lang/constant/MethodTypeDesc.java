package java.lang.constant;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.TypeDescriptor;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public interface MethodTypeDesc extends ConstantDesc, TypeDescriptor.OfMethod<ClassDesc, MethodTypeDesc> {
  static MethodTypeDesc ofDescriptor(String descriptor) {
    Objects.requireNonNull(descriptor);
    return MethodTypeDescImpl.ofDescriptor(descriptor);
  }

  static MethodTypeDesc of(ClassDesc returnDesc, ClassDesc... paramDescs) {
    Objects.requireNonNull(returnDesc);
    Objects.requireNonNull(paramDescs);
    ClassDesc[] params = new ClassDesc[paramDescs.length];
    for (int i = 0; i < paramDescs.length; i++) {
      params[i] = MethodTypeDescImpl.requireParameter(paramDescs[i]);
    }
    return new MethodTypeDescImpl(returnDesc, params);
  }

  ClassDesc returnType();

  int parameterCount();

  ClassDesc parameterType(int index);

  List<ClassDesc> parameterList();

  ClassDesc[] parameterArray();

  MethodTypeDesc changeReturnType(ClassDesc returnType);

  MethodTypeDesc changeParameterType(int index, ClassDesc paramType);

  MethodTypeDesc dropParameterTypes(int start, int end);

  MethodTypeDesc insertParameterTypes(int pos, ClassDesc... paramTypes);

  default String descriptorString() {
    StringBuilder builder = new StringBuilder();
    builder.append('(');
    ClassDesc[] params = parameterArray();
    for (int i = 0; i < params.length; i++) {
      builder.append(params[i].descriptorString());
    }
    builder.append(')');
    builder.append(returnType().descriptorString());
    return builder.toString();
  }

  default String displayDescriptor() {
    StringBuilder builder = new StringBuilder();
    builder.append('(');
    ClassDesc[] params = parameterArray();
    for (int i = 0; i < params.length; i++) {
      if (i > 0) {
        builder.append(',');
      }
      builder.append(params[i].displayName());
    }
    builder.append(')');
    builder.append(returnType().displayName());
    return builder.toString();
  }
}

final class MethodTypeDescImpl implements MethodTypeDesc {
  private final ClassDesc returnType;
  private final ClassDesc[] parameters;

  MethodTypeDescImpl(ClassDesc returnType, ClassDesc[] parameters) {
    this.returnType = returnType;
    this.parameters = parameters;
  }

  static MethodTypeDesc ofDescriptor(String descriptor) {
    if (descriptor.length() < 3 || descriptor.charAt(0) != '(') {
      throw new IllegalArgumentException();
    }
    int index = 1;
    ClassDesc[] params = new ClassDesc[0];
    while (index < descriptor.length() && descriptor.charAt(index) != ')') {
      int next = skipFieldDescriptor(descriptor, index);
      ClassDesc param = ClassDesc.ofDescriptor(descriptor.substring(index, next));
      params = append(params, requireParameter(param));
      index = next;
    }
    if (index >= descriptor.length() || descriptor.charAt(index) != ')') {
      throw new IllegalArgumentException();
    }
    index++;
    int returnEnd = skipReturnDescriptor(descriptor, index);
    if (returnEnd != descriptor.length()) {
      throw new IllegalArgumentException();
    }
    ClassDesc returnType = ClassDesc.ofDescriptor(descriptor.substring(index, returnEnd));
    return new MethodTypeDescImpl(returnType, params);
  }

  static ClassDesc requireParameter(ClassDesc desc) {
    Objects.requireNonNull(desc);
    if ("V".equals(desc.descriptorString())) {
      throw new IllegalArgumentException();
    }
    return desc;
  }

  public ClassDesc returnType() {
    return returnType;
  }

  public int parameterCount() {
    return parameters.length;
  }

  public ClassDesc parameterType(int index) {
    return parameters[index];
  }

  public List<ClassDesc> parameterList() {
    return Collections.unmodifiableList(Arrays.asList(parameterArray()));
  }

  public ClassDesc[] parameterArray() {
    return parameters.clone();
  }

  public MethodTypeDesc changeReturnType(ClassDesc returnType) {
    return new MethodTypeDescImpl(Objects.requireNonNull(returnType), parameterArray());
  }

  public MethodTypeDesc changeParameterType(int index, ClassDesc paramType) {
    ClassDesc[] params = parameterArray();
    params[index] = requireParameter(paramType);
    return new MethodTypeDescImpl(returnType, params);
  }

  public MethodTypeDesc dropParameterTypes(int start, int end) {
    if (start < 0 || start > end || end > parameters.length) {
      throw new IndexOutOfBoundsException();
    }
    ClassDesc[] params = new ClassDesc[parameters.length - (end - start)];
    System.arraycopy(parameters, 0, params, 0, start);
    System.arraycopy(parameters, end, params, start, parameters.length - end);
    return new MethodTypeDescImpl(returnType, params);
  }

  public MethodTypeDesc insertParameterTypes(int pos, ClassDesc... paramTypes) {
    Objects.requireNonNull(paramTypes);
    if (pos < 0 || pos > parameters.length) {
      throw new IndexOutOfBoundsException();
    }
    ClassDesc[] params = new ClassDesc[parameters.length + paramTypes.length];
    System.arraycopy(parameters, 0, params, 0, pos);
    for (int i = 0; i < paramTypes.length; i++) {
      params[pos + i] = requireParameter(paramTypes[i]);
    }
    System.arraycopy(parameters, pos, params, pos + paramTypes.length, parameters.length - pos);
    return new MethodTypeDescImpl(returnType, params);
  }

  public Object resolveConstantDesc(MethodHandles.Lookup lookup) {
    Objects.requireNonNull(lookup);
    return MethodType.fromMethodDescriptorString(descriptorString(), lookup.lookupClass().getClassLoader());
  }

  public boolean equals(Object obj) {
    return obj instanceof MethodTypeDesc
      && descriptorString().equals(((MethodTypeDesc) obj).descriptorString());
  }

  public int hashCode() {
    return 31 * returnType.hashCode() + Arrays.hashCode(parameters);
  }

  public String toString() {
    return "MethodTypeDesc[" + displayDescriptor() + "]";
  }

  private static ClassDesc[] append(ClassDesc[] params, ClassDesc param) {
    ClassDesc[] next = new ClassDesc[params.length + 1];
    System.arraycopy(params, 0, next, 0, params.length);
    next[params.length] = param;
    return next;
  }

  private static int skipReturnDescriptor(String descriptor, int index) {
    if (index >= descriptor.length()) {
      throw new IllegalArgumentException();
    }
    if (descriptor.charAt(index) == 'V') {
      return index + 1;
    }
    return skipFieldDescriptor(descriptor, index);
  }

  private static int skipFieldDescriptor(String descriptor, int index) {
    if (index >= descriptor.length()) {
      throw new IllegalArgumentException();
    }
    int start = index;
    while (index < descriptor.length() && descriptor.charAt(index) == '[') {
      index++;
    }
    if (index >= descriptor.length()) {
      throw new IllegalArgumentException();
    }
    char ch = descriptor.charAt(index);
    if (ch == 'V') {
      throw new IllegalArgumentException();
    }
    if ("BCDFIJSZ".indexOf(ch) >= 0) {
      return index + 1;
    }
    if (ch == 'L') {
      int end = descriptor.indexOf(';', index);
      if (end < 0 || end == index + 1) {
        throw new IllegalArgumentException();
      }
      String field = descriptor.substring(start, end + 1);
      ClassDesc.ofDescriptor(field);
      return end + 1;
    }
    throw new IllegalArgumentException();
  }
}
