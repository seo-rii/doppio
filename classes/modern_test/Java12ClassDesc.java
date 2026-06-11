package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java12ClassDesc {
  public static void main(String[] args) throws ReflectiveOperationException {
    ClassDesc string = ClassDesc.of("java.lang", "String");
    System.out.println(string.descriptorString());
    System.out.println(string.packageName());
    System.out.println(string.displayName());
    System.out.println(string.isArray());
    System.out.println(string.isPrimitive());
    System.out.println(string.isClassOrInterface());

    ClassDesc integer = ClassDesc.ofDescriptor("I");
    System.out.println(integer.descriptorString());
    System.out.println(integer.packageName());
    System.out.println(integer.displayName());
    System.out.println(integer.isPrimitive());

    ClassDesc array = string.arrayType();
    System.out.println(array.descriptorString());
    System.out.println(array.displayName());
    System.out.println(array.componentType().descriptorString());

    ClassDesc matrix = integer.arrayType(2);
    System.out.println(matrix.descriptorString());
    System.out.println(matrix.displayName());
    System.out.println(matrix.componentType().descriptorString());

    ClassDesc maxRankArray = integer.arrayType(255);
    System.out.println(maxRankArray.descriptorString().length());

    ClassDesc nested = ClassDesc.of("java.util", "Map").nested("Entry");
    System.out.println(nested.descriptorString());
    System.out.println(nested.packageName());
    System.out.println(nested.displayName());

    System.out.println(string.equals(ClassDesc.ofDescriptor("Ljava/lang/String;")));
    System.out.println(((Class<?>) string.resolveConstantDesc(MethodHandles.lookup())).getName());
    System.out.println(((Class<?>) integer.resolveConstantDesc(MethodHandles.lookup())).getName());
    System.out.println(((Class<?>) array.resolveConstantDesc(MethodHandles.lookup())).getName());
    System.out.println(ConstantDescs.DEFAULT_NAME);
    System.out.println(ConstantDescs.CD_Object.descriptorString());
    System.out.println(ConstantDescs.CD_String.displayName());
    System.out.println(ConstantDescs.CD_MethodHandles_Lookup.descriptorString());
    System.out.println(ConstantDescs.CD_int.descriptorString());
    System.out.println(ConstantDescs.CD_void.displayName());
    System.out.println(ConstantDescs.NULL.resolveConstantDesc(MethodHandles.lookup()) == null);

    MethodTypeDesc methodType = MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_int, ConstantDescs.CD_Object);
    System.out.println(methodType.descriptorString());
    System.out.println(methodType.displayDescriptor());
    System.out.println(methodType.returnType().descriptorString());
    System.out.println(methodType.parameterCount());
    System.out.println(methodType.parameterType(1).descriptorString());
    System.out.println(methodType.parameterList().size());
    System.out.println(methodType.parameterArray()[0].descriptorString());
    System.out.println(methodType.changeReturnType(ConstantDescs.CD_void).descriptorString());
    System.out.println(methodType.changeParameterType(0, ConstantDescs.CD_long).descriptorString());
    System.out.println(methodType.dropParameterTypes(0, 1).descriptorString());
    System.out.println(methodType.insertParameterTypes(1, ConstantDescs.CD_double).descriptorString());
    System.out.println(MethodTypeDesc.ofDescriptor("(IJ)Ljava/lang/String;").descriptorString());
    System.out.println(MethodTypeDesc.ofDescriptor("()V").displayDescriptor());
    System.out.println(MethodTypeDesc.ofDescriptor("(I)V").equals(MethodTypeDesc.of(ConstantDescs.CD_void, ConstantDescs.CD_int)));
    System.out.println(((MethodType) methodType.resolveConstantDesc(MethodHandles.lookup())).toMethodDescriptorString());

    try {
      ClassDesc.ofDescriptor("Q");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.ofDescriptor("");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.of(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      string.arrayType(0);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.ofDescriptor("[V");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.CD_void.arrayType();
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.ofDescriptor("L/java/lang/String;");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.ofDescriptor("Ljava/lang//String;");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.ofDescriptor("Ljava/lang/String/;");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.of("java/lang/String");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.of("java/lang", "String");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.of("java.lang", "String/Bad");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.of("java.util", "Map").nested("Entry/Bad");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.of("java.util", "Map").nested("Entry", "Bad/Name");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.CD_int.arrayType(256);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ClassDesc.ofDescriptor("[I").arrayType(255);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      StringBuilder tooManyRanks = new StringBuilder();
      for (int i = 0; i < 256; i++) {
        tooManyRanks.append('[');
      }
      tooManyRanks.append('I');
      ClassDesc.ofDescriptor(tooManyRanks.toString());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodTypeDesc.ofDescriptor("I)V");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      methodType.parameterType(2);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      methodType.insertParameterTypes(-1, ConstantDescs.CD_int);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodTypeDesc.of(ConstantDescs.CD_void, new ClassDesc[] { null });
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
