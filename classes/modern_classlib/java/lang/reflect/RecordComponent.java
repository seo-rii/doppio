package java.lang.reflect;

public final class RecordComponent implements AnnotatedElement {
  private String name;
  private Class<?> type;
  private Method accessor;
  private Class<?> declaringRecord;

  RecordComponent() {
  }

  public String getName() {
    return name;
  }

  public Class<?> getType() {
    return type;
  }

  public Method getAccessor() {
    return accessor;
  }

  public Class<?> getDeclaringRecord() {
    return declaringRecord;
  }

  public <T extends java.lang.annotation.Annotation> T getAnnotation(Class<T> annotationClass) {
    if (annotationClass == null) {
      throw new NullPointerException();
    }
    return null;
  }

  public java.lang.annotation.Annotation[] getAnnotations() {
    return new java.lang.annotation.Annotation[0];
  }

  public java.lang.annotation.Annotation[] getDeclaredAnnotations() {
    return new java.lang.annotation.Annotation[0];
  }

  public String toString() {
    return type.getTypeName() + " " + name;
  }
}
