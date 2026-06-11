package java.lang;

import java.lang.invoke.MethodType;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Stream;

public final class StackWalker {
  private final boolean retainClassRef;
  private final boolean showHiddenFrames;
  private final boolean showReflectFrames;

  private StackWalker(boolean retainClassRef, boolean showHiddenFrames, boolean showReflectFrames) {
    this.retainClassRef = retainClassRef;
    this.showHiddenFrames = showHiddenFrames;
    this.showReflectFrames = showReflectFrames;
  }

  public static StackWalker getInstance() {
    return new StackWalker(false, false, false);
  }

  public static StackWalker getInstance(Option option) {
    if (option == null) {
      throw new NullPointerException("option");
    }
    return new StackWalker(option == Option.RETAIN_CLASS_REFERENCE, option == Option.SHOW_HIDDEN_FRAMES, option == Option.SHOW_REFLECT_FRAMES);
  }

  public static StackWalker getInstance(Set<Option> options) {
    if (options == null) {
      throw new NullPointerException("options");
    }
    if (options.contains(null)) {
      throw new NullPointerException("options contains null");
    }
    return new StackWalker(
      options.contains(Option.RETAIN_CLASS_REFERENCE),
      options.contains(Option.SHOW_HIDDEN_FRAMES),
      options.contains(Option.SHOW_REFLECT_FRAMES));
  }

  public static StackWalker getInstance(Set<Option> options, int estimateDepth) {
    if (estimateDepth <= 0) {
      throw new IllegalArgumentException("estimateDepth must be > 0");
    }
    return getInstance(options);
  }

  public native Class<?> getCallerClass();

  private native StackFrame[] getStackFrames();

  public <T> T walk(Function<? super Stream<StackFrame>, ? extends T> function) {
    Objects.requireNonNull(function);
    try (Stream<StackFrame> stream = Arrays.stream(getStackFrames())) {
      return function.apply(stream);
    }
  }

  public void forEach(Consumer<? super StackFrame> action) {
    Objects.requireNonNull(action);
    for (StackFrame frame : getStackFrames()) {
      action.accept(frame);
    }
  }

  public enum Option {
    RETAIN_CLASS_REFERENCE,
    SHOW_REFLECT_FRAMES,
    SHOW_HIDDEN_FRAMES
  }

  public interface StackFrame {
    String getClassName();

    String getMethodName();

    Class<?> getDeclaringClass();

    default MethodType getMethodType() {
      throw new UnsupportedOperationException("StackFrame.getMethodType is not implemented");
    }

    default String getDescriptor() {
      throw new UnsupportedOperationException("StackFrame.getDescriptor is not implemented");
    }

    int getByteCodeIndex();

    String getFileName();

    int getLineNumber();

    boolean isNativeMethod();

    StackTraceElement toStackTraceElement();
  }

  private static final class StackFrameImpl implements StackFrame {
    boolean retainClassRef;
    String className;
    String methodName;
    Class<?> declaringClass;
    String descriptor;
    int byteCodeIndex;
    String fileName;
    int lineNumber;
    boolean nativeMethod;

    public String getClassName() {
      return className;
    }

    public String getMethodName() {
      return methodName;
    }

    public Class<?> getDeclaringClass() {
      if (!retainClassRef) {
        throw new UnsupportedOperationException("This stack frame does not retain class references");
      }
      return declaringClass;
    }

    public MethodType getMethodType() {
      if (!retainClassRef) {
        throw new UnsupportedOperationException("This stack frame does not retain class references");
      }
      return MethodType.fromMethodDescriptorString(descriptor, declaringClass.getClassLoader());
    }

    public String getDescriptor() {
      return descriptor;
    }

    public int getByteCodeIndex() {
      return byteCodeIndex;
    }

    public String getFileName() {
      return fileName;
    }

    public int getLineNumber() {
      return lineNumber;
    }

    public boolean isNativeMethod() {
      return nativeMethod;
    }

    public StackTraceElement toStackTraceElement() {
      return new StackTraceElement(className, methodName, fileName, lineNumber);
    }

    public String toString() {
      return toStackTraceElement().toString();
    }
  }
}
