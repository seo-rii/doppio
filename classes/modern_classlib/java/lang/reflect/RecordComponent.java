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
    return type;
  }

  public AnnotatedType getAnnotatedType() {
    return new DoppioAnnotatedType(type);
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
    try {
      return parseAnnotations("jdk.internal.access.SharedSecrets", "jdk.internal.reflect.ConstantPool");
    } catch (ClassNotFoundException e) {
      try {
        return parseAnnotations("sun.misc.SharedSecrets", "sun.reflect.ConstantPool");
      } catch (ClassNotFoundException e2) {
        throw new AnnotationFormatError(e2.toString());
      } catch (ReflectiveOperationException e2) {
        throw new AnnotationFormatError(e2.toString());
      }
    } catch (ReflectiveOperationException e) {
      throw new AnnotationFormatError(e.toString());
    }
  }

  private Map<Class<? extends Annotation>, Annotation> parseAnnotations(String sharedSecretsName, String constantPoolName)
      throws ReflectiveOperationException {
    Class<?> sharedSecretsClass = Class.forName(sharedSecretsName);
    Object javaLangAccess = sharedSecretsClass.getMethod("getJavaLangAccess").invoke(null);
    Object constantPool = sharedSecretsClass.getMethod("getJavaLangAccess").getReturnType()
      .getMethod("getConstantPool", Class.class)
      .invoke(javaLangAccess, declaringRecord);
    Class<?> annotationParserClass = Class.forName("sun.reflect.annotation.AnnotationParser");
    try {
      return (Map<Class<? extends Annotation>, Annotation>) annotationParserClass
        .getMethod("parseAnnotations", byte[].class, Class.forName(constantPoolName), Class.class)
        .invoke(null, annotations, constantPool, declaringRecord);
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

  private static final class DoppioAnnotatedType implements AnnotatedType {
    private final Type type;

    DoppioAnnotatedType(Type type) {
      this.type = type;
    }

    public Type getType() {
      return type;
    }

    public AnnotatedType getAnnotatedOwnerType() {
      return null;
    }

    public <T extends Annotation> T getAnnotation(Class<T> annotationClass) {
      if (annotationClass == null) {
        throw new NullPointerException();
      }
      return null;
    }

    public Annotation[] getAnnotations() {
      return new Annotation[0];
    }

    public Annotation[] getDeclaredAnnotations() {
      return new Annotation[0];
    }
  }
}
