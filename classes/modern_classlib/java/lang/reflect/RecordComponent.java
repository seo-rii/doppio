package java.lang.reflect;

import java.lang.annotation.Annotation;
import java.lang.annotation.AnnotationFormatError;
import java.lang.reflect.InvocationTargetException;
import java.util.Collections;
import java.util.Map;

public final class RecordComponent implements AnnotatedElement {
  private String name;
  private Class<?> type;
  private Method accessor;
  private Class<?> declaringRecord;
  private String signature;
  private byte[] annotations;
  private byte[] typeAnnotations;
  private volatile transient Object genericInfo;
  private volatile transient Map<Class<? extends Annotation>, Annotation> declaredAnnotations;

  RecordComponent() {
  }

  public String getName() {
    return name;
  }

  public Class<?> getType() {
    return type;
  }

  public String getGenericSignature() {
    return signature;
  }

  public Type getGenericType() {
    if (signature == null) {
      return type;
    }
    try {
      // The release-9 shim cannot link Java-8-internal helper types at compile
      // time. Reuse the bootstrap Field parser with this record's class scope.
      Object repository = genericInfo;
      if (repository == null) {
        Class<?> scopeClass = Class.forName("sun.reflect.generics.scope.Scope");
        Class<?> classScopeClass = Class.forName("sun.reflect.generics.scope.ClassScope");
        Object scope = invoke(classScopeClass.getMethod("make", Class.class), null, declaringRecord);
        Class<?> factoryClass = Class.forName("sun.reflect.generics.factory.CoreReflectionFactory");
        Object factory = invoke(factoryClass.getMethod("make", GenericDeclaration.class, scopeClass),
          null, declaringRecord, scope);
        Class<?> repositoryClass = Class.forName("sun.reflect.generics.repository.FieldRepository");
        repository = invoke(repositoryClass.getMethod("make", String.class,
          Class.forName("sun.reflect.generics.factory.GenericsFactory")), null, signature, factory);
        genericInfo = repository;
      }
      return (Type) invoke(repository.getClass().getMethod("getGenericType"), repository);
    } catch (ReflectiveOperationException e) {
      throw new InternalError(e);
    }
  }

  public AnnotatedType getAnnotatedType() {
    try {
      // Preserve FIELD targets and complete paths into arrays, owners and type
      // arguments instead of flattening annotations onto the erased type.
      Object constantPool = getConstantPool(declaringRecord);
      Class<?> targetClass = Class.forName("sun.reflect.annotation.TypeAnnotation$TypeAnnotationTarget");
      Object fieldTarget = targetClass.getField("FIELD").get(null);
      Class<?> parserClass = Class.forName("sun.reflect.annotation.TypeAnnotationParser");
      return (AnnotatedType) invoke(parserClass.getMethod("buildAnnotatedType", byte[].class,
        constantPool.getClass(), AnnotatedElement.class, Class.class, Type.class, targetClass),
        null, typeAnnotations, constantPool, this, declaringRecord, getGenericType(), fieldTarget);
    } catch (ReflectiveOperationException e) {
      throw new InternalError(e);
    }
  }

  public Method getAccessor() {
    return accessor;
  }

  public Class<?> getDeclaringRecord() {
    return declaringRecord;
  }

  public <T extends Annotation> T getAnnotation(Class<T> annotationClass) {
    if (annotationClass == null) {
      throw new NullPointerException();
    }
    return (T) declaredAnnotations().get(annotationClass);
  }

  public Annotation[] getAnnotations() {
    return getDeclaredAnnotations();
  }

  public Annotation[] getDeclaredAnnotations() {
    return declaredAnnotations().values().toArray(new Annotation[0]);
  }

  public String toString() {
    return type.getTypeName() + " " + name;
  }

  private Map<Class<? extends Annotation>, Annotation> declaredAnnotations() {
    Map<Class<? extends Annotation>, Annotation> result = declaredAnnotations;
    if (result == null) {
      synchronized (this) {
        result = declaredAnnotations;
        if (result == null) {
          result = annotations == null ? Collections.<Class<? extends Annotation>, Annotation>emptyMap() : parseAnnotations();
          declaredAnnotations = result;
        }
      }
    }
    return result;
  }

  private Map<Class<? extends Annotation>, Annotation> parseAnnotations() {
    return parseAnnotations(declaringRecord, annotations);
  }

  private static Map<Class<? extends Annotation>, Annotation> parseAnnotations(Class<?> declaringClass, byte[] annotations) {
    try {
      Object constantPool = getConstantPool(declaringClass);
      Class<?> parserClass = Class.forName("sun.reflect.annotation.AnnotationParser");
      return (Map<Class<? extends Annotation>, Annotation>) invoke(parserClass
        .getMethod("parseAnnotations", byte[].class, constantPool.getClass(), Class.class),
        null, annotations, constantPool, declaringClass);
    } catch (ReflectiveOperationException e) {
      throw new AnnotationFormatError(e.toString());
    }
  }

  private static Object getConstantPool(Class<?> declaringClass) throws ReflectiveOperationException {
    Class<?> sharedSecretsClass;
    try {
      sharedSecretsClass = Class.forName("jdk.internal.access.SharedSecrets");
    } catch (ClassNotFoundException e) {
      sharedSecretsClass = Class.forName("sun.misc.SharedSecrets");
    }
    Method accessMethod = sharedSecretsClass.getMethod("getJavaLangAccess");
    Object javaLangAccess = invoke(accessMethod, null);
    return invoke(accessMethod.getReturnType().getMethod("getConstantPool", Class.class),
      javaLangAccess, declaringClass);
  }

  private static Object invoke(Method method, Object receiver, Object... arguments)
      throws ReflectiveOperationException {
    try {
      return method.invoke(receiver, arguments);
    } catch (InvocationTargetException e) {
      Throwable cause = e.getCause();
      if (cause instanceof RuntimeException) {
        throw (RuntimeException) cause;
      }
      if (cause instanceof Error) {
        throw (Error) cause;
      }
      throw e;
    }
  }
}
