package java.lang.reflect;

import java.lang.annotation.Annotation;

public final class RecordComponent implements AnnotatedElement {
  private String name;
  private Class<?> type;
  private Method accessor;
  private Class<?> declaringRecord;
  private String signature;

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
    return null;
  }

  public Annotation[] getAnnotations() {
    return new Annotation[0];
  }

  public Annotation[] getDeclaredAnnotations() {
    return new Annotation[0];
  }

  public String toString() {
    return type.getTypeName() + " " + name;
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
