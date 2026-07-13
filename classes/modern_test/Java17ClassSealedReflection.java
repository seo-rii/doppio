package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.util.Arrays;

public class Java17ClassSealedReflection {
  private sealed interface Ordered permits PermitZulu, PermitAlpha, PermitMiddle {}

  private static final class PermitAlpha implements Ordered {}

  private static final class PermitMiddle implements Ordered {}

  private static final class PermitZulu implements Ordered {}

  private static final class Plain {}

  public static void main(String[] args) throws Throwable {
    Method isSealedDeclared = Class.class.getDeclaredMethod("isSealed");
    Method isSealedPublic = Class.class.getMethod("isSealed");
    Method permittedDeclared = Class.class.getDeclaredMethod("getPermittedSubclasses");
    Method permittedPublic = Class.class.getMethod("getPermittedSubclasses");
    Method[] declaredMethods = {isSealedDeclared, permittedDeclared};
    Method[] publicMethods = {isSealedPublic, permittedPublic};
    String[] methodLabels = {"is-sealed", "permitted"};

    for (int i = 0; i < declaredMethods.length; i++) {
      Method declared = declaredMethods[i];
      Method publicMethod = publicMethods[i];
      String label = methodLabels[i];
      MethodType descriptor = MethodType.methodType(
          declared.getReturnType(), declared.getParameterTypes());

      int declaredCount = 0;
      for (Method method : Class.class.getDeclaredMethods()) {
        if (method.equals(declared)) {
          declaredCount++;
        }
      }
      int publicCount = 0;
      for (Method method : Class.class.getMethods()) {
        if (method.equals(publicMethod)) {
          publicCount++;
        }
      }

      Annotation[] declaredAnnotations = declared.getDeclaredAnnotations();
      Annotation[] annotations = declared.getAnnotations();
      String[] declaredAnnotationTypes = new String[declaredAnnotations.length];
      for (int annotationIndex = 0;
          annotationIndex < declaredAnnotations.length; annotationIndex++) {
        declaredAnnotationTypes[annotationIndex] =
            declaredAnnotations[annotationIndex].annotationType().getName();
      }
      String[] annotationTypes = new String[annotations.length];
      for (int annotationIndex = 0;
          annotationIndex < annotations.length; annotationIndex++) {
        annotationTypes[annotationIndex] =
            annotations[annotationIndex].annotationType().getName();
      }
      Type[] genericParameterTypes = declared.getGenericParameterTypes();
      String[] genericParameterTypeNames = new String[genericParameterTypes.length];
      for (int parameterIndex = 0;
          parameterIndex < genericParameterTypes.length; parameterIndex++) {
        genericParameterTypeNames[parameterIndex] =
            genericParameterTypes[parameterIndex].getTypeName();
      }
      Type[] genericExceptionTypes = declared.getGenericExceptionTypes();
      String[] genericExceptionTypeNames = new String[genericExceptionTypes.length];
      for (int exceptionIndex = 0;
          exceptionIndex < genericExceptionTypes.length; exceptionIndex++) {
        genericExceptionTypeNames[exceptionIndex] =
            genericExceptionTypes[exceptionIndex].getTypeName();
      }
      TypeVariable<Method>[] typeParameters = declared.getTypeParameters();
      String[] typeParameterNames = new String[typeParameters.length];
      for (int parameterIndex = 0;
          parameterIndex < typeParameters.length; parameterIndex++) {
        typeParameterNames[parameterIndex] = typeParameters[parameterIndex].getTypeName();
      }

      System.out.println(label + "-declared-lookup=" + (declared != null));
      System.out.println(label + "-public-lookup=" + (publicMethod != null));
      System.out.println(label + "-lookup-equal=" + declared.equals(publicMethod));
      System.out.println(label + "-declaring-class=" +
          declared.getDeclaringClass().getName());
      System.out.println(label + "-return-type=" + declared.getReturnType().getName());
      System.out.println(label + "-generic-return-type=" +
          declared.getGenericReturnType().getTypeName());
      System.out.println(label + "-parameter-types=" +
          Arrays.toString(declared.getParameterTypes()));
      System.out.println(label + "-generic-parameter-types=" +
          Arrays.toString(genericParameterTypeNames));
      System.out.println(label + "-parameters=" +
          Arrays.toString(declared.getParameters()));
      System.out.println(label + "-type-parameters=" +
          Arrays.toString(typeParameterNames));
      System.out.println(label + "-descriptor=" + descriptor.toMethodDescriptorString());
      System.out.println(label + "-modifiers=" + declared.getModifiers() + ":" +
          Modifier.toString(declared.getModifiers()));
      System.out.println(label + "-native=" + Modifier.isNative(declared.getModifiers()));
      System.out.println(label + "-final=" + Modifier.isFinal(declared.getModifiers()));
      System.out.println(label + "-abstract=" +
          Modifier.isAbstract(declared.getModifiers()));
      System.out.println(label + "-synthetic=" + declared.isSynthetic());
      System.out.println(label + "-bridge=" + declared.isBridge());
      System.out.println(label + "-varargs=" + declared.isVarArgs());
      System.out.println(label + "-exceptions=" +
          Arrays.toString(declared.getExceptionTypes()));
      System.out.println(label + "-generic-exceptions=" +
          Arrays.toString(genericExceptionTypeNames));
      System.out.println(label + "-annotations=declared:" + declaredAnnotations.length +
          ",all:" + annotations.length +
          ",parameters:" + declared.getParameterAnnotations().length);
      System.out.println(label + "-annotation-types=declared:" +
          Arrays.toString(declaredAnnotationTypes) +
          ",all:" + Arrays.toString(annotationTypes));
      System.out.println(label + "-parameter-annotations=" +
          Arrays.deepToString(declared.getParameterAnnotations()));
      System.out.println(label + "-annotation-default=" + declared.getDefaultValue());
      System.out.println(label + "-default-method=" + declared.isDefault());
      System.out.println(label + "-enumeration=declared:" + declaredCount +
          ",public:" + publicCount);
    }

    Class<?>[] classes = {
      Ordered.class,
      PermitZulu.class,
      Plain.class,
      String.class,
      Integer.TYPE,
      Void.TYPE,
      Ordered[].class
    };
    String[] classLabels = {
      "sealed-interface",
      "final-permitted",
      "ordinary",
      "jdk",
      "primitive",
      "void",
      "array"
    };
    for (int i = 0; i < classes.length; i++) {
      Class<?> cls = classes[i];
      Class<?>[] directPermitted = cls.getPermittedSubclasses();
      Class<?>[] reflectedPermitted = (Class<?>[]) permittedDeclared.invoke(cls);
      System.out.println(classLabels[i] + "=is-sealed-direct:" + cls.isSealed() +
          ",is-sealed-invoke:" + isSealedDeclared.invoke(cls) +
          ",permitted-direct:" + Arrays.toString(directPermitted) +
          ",permitted-invoke:" + Arrays.toString(reflectedPermitted));
    }

    MethodHandle isSealedHandle = MethodHandles.lookup().unreflect(isSealedDeclared);
    MethodHandle permittedHandle = MethodHandles.lookup().unreflect(permittedDeclared);
    MethodType expectedIsSealedHandleType =
        MethodType.methodType(Boolean.TYPE, Class.class);
    MethodType expectedPermittedHandleType =
        MethodType.methodType(Class[].class, Class.class);
    System.out.println("is-sealed-handle-type=" + isSealedHandle.type());
    System.out.println("is-sealed-handle-type-exact=" +
        isSealedHandle.type().equals(expectedIsSealedHandleType));
    System.out.println("permitted-handle-type=" + permittedHandle.type());
    System.out.println("permitted-handle-type-exact=" +
        permittedHandle.type().equals(expectedPermittedHandleType));

    Class<?> sealedClass = Ordered.class;
    Class<?> unsealedClass = Plain.class;
    boolean handledSealed = (boolean) isSealedHandle.invokeExact(sealedClass);
    boolean handledUnsealed = (boolean) isSealedHandle.invokeExact(unsealedClass);
    Class<?>[] handledPermitted =
        (Class<?>[]) permittedHandle.invokeExact(sealedClass);
    Class<?>[] handledUnsealedPermitted =
        (Class<?>[]) permittedHandle.invokeExact(unsealedClass);
    System.out.println("is-sealed-handle-sealed=" + handledSealed);
    System.out.println("is-sealed-handle-unsealed=" + handledUnsealed);
    System.out.println("permitted-handle-sealed=" +
        Arrays.toString(handledPermitted));
    System.out.println("permitted-handle-unsealed=" +
        Arrays.toString(handledUnsealedPermitted));

    Class<?>[] directFirst = Ordered.class.getPermittedSubclasses();
    Class<?>[] directSecond = Ordered.class.getPermittedSubclasses();
    Class<?>[] reflected = (Class<?>[]) permittedDeclared.invoke(Ordered.class);
    Class<?>[] expectedOrder = {PermitZulu.class, PermitAlpha.class, PermitMiddle.class};
    String[] permittedOrder = new String[directFirst.length];
    for (int i = 0; i < directFirst.length; i++) {
      permittedOrder[i] = directFirst[i].getSimpleName();
    }
    System.out.println("permitted-order=" + Arrays.toString(permittedOrder));
    System.out.println("permitted-order-exact=" + Arrays.equals(directFirst, expectedOrder));

    boolean freshArrays = directFirst != directSecond &&
        directFirst != reflected && directFirst != handledPermitted &&
        directSecond != reflected && directSecond != handledPermitted &&
        reflected != handledPermitted;
    System.out.println("permitted-fresh-arrays=" + freshArrays);

    directFirst[0] = Plain.class;
    reflected[1] = Plain.class;
    handledPermitted[2] = Plain.class;
    Class<?>[] afterDirectMutation = Ordered.class.getPermittedSubclasses();
    Class<?>[] afterReflectedMutation =
        (Class<?>[]) permittedDeclared.invoke(Ordered.class);
    Class<?>[] afterHandledMutation =
        (Class<?>[]) permittedHandle.invokeExact(sealedClass);
    boolean mutationIsolation = Arrays.equals(directSecond, expectedOrder) &&
        Arrays.equals(afterDirectMutation, expectedOrder) &&
        Arrays.equals(afterReflectedMutation, expectedOrder) &&
        Arrays.equals(afterHandledMutation, expectedOrder);
    System.out.println("permitted-mutation-isolation=" + mutationIsolation);
  }
}
