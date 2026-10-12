package java.lang.constant;

import java.lang.invoke.CallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.util.Arrays;
import java.util.Objects;

/** Immutable call-site description; creating a description never invokes its bootstrap. */
public final class DynamicCallSiteDesc {
  private final DirectMethodHandleDesc bootstrapMethod;
  private final String invocationName;
  private final MethodTypeDesc invocationType;
  private final ConstantDesc[] bootstrapArgs;

  private DynamicCallSiteDesc(DirectMethodHandleDesc bootstrap, String name, MethodTypeDesc type, ConstantDesc[] arguments) {
    invocationName = Objects.requireNonNull(name);
    if (name.length() == 0 || name.indexOf('.') >= 0 || name.indexOf(';') >= 0 || name.indexOf('[') >= 0 ||
        name.indexOf('/') >= 0 || (name.indexOf('<') >= 0 || name.indexOf('>') >= 0) &&
        !"<init>".equals(name) && !"<clinit>".equals(name))
      throw new IllegalArgumentException("Invalid invocation name");
    invocationType = Objects.requireNonNull(type);
    bootstrapMethod = Objects.requireNonNull(bootstrap);
    bootstrapArgs = Objects.requireNonNull(arguments).clone();
    for (ConstantDesc argument : bootstrapArgs) Objects.requireNonNull(argument);
  }
  public static DynamicCallSiteDesc of(DirectMethodHandleDesc bootstrap, String name, MethodTypeDesc type, ConstantDesc... arguments) {
    return new DynamicCallSiteDesc(bootstrap, name, type, arguments);
  }
  public static DynamicCallSiteDesc of(DirectMethodHandleDesc bootstrap, String name, MethodTypeDesc type) {
    return of(bootstrap, name, type, new ConstantDesc[0]);
  }
  public static DynamicCallSiteDesc of(DirectMethodHandleDesc bootstrap, MethodTypeDesc type) {
    return of(bootstrap, ConstantDescs.DEFAULT_NAME, type);
  }
  public DynamicCallSiteDesc withArgs(ConstantDesc... arguments) { return of(bootstrapMethod, invocationName, invocationType, arguments); }
  public DynamicCallSiteDesc withNameAndType(String name, MethodTypeDesc type) { return of(bootstrapMethod, name, type, bootstrapArgs); }
  public String invocationName() { return invocationName; }
  public MethodTypeDesc invocationType() { return invocationType; }
  public MethodHandleDesc bootstrapMethod() { return bootstrapMethod; }
  public ConstantDesc[] bootstrapArgs() { return bootstrapArgs.clone(); }
  public CallSite resolveCallSiteDesc(MethodHandles.Lookup lookup) throws Throwable {
    Objects.requireNonNull(lookup);
    MethodHandle bootstrap = bootstrapMethod.resolveConstantDesc(lookup);
    Object[] arguments = new Object[bootstrapArgs.length + 3];
    arguments[0] = lookup; arguments[1] = invocationName; arguments[2] = invocationType.resolveConstantDesc(lookup);
    System.arraycopy(bootstrapArgs, 0, arguments, 3, bootstrapArgs.length);
    return (CallSite) bootstrap.invokeWithArguments(arguments);
  }
  public final boolean equals(Object value) {
    if (this == value) return true;
    if (!(value instanceof DynamicCallSiteDesc)) return false;
    DynamicCallSiteDesc other = (DynamicCallSiteDesc) value;
    return bootstrapMethod.equals(other.bootstrapMethod) && invocationName.equals(other.invocationName) &&
      invocationType.equals(other.invocationType) && Arrays.equals(bootstrapArgs, other.bootstrapArgs);
  }
  public final int hashCode() {
    return 31 * Objects.hash(bootstrapMethod, invocationName, invocationType) + Arrays.hashCode(bootstrapArgs);
  }
  public String toString() {
    StringBuilder text = new StringBuilder("DynamicCallSiteDesc[");
    text.append(bootstrapMethod.owner().displayName()).append("::").append(bootstrapMethod.methodName()).append('(');
    if (!ConstantDescs.DEFAULT_NAME.equals(invocationName)) text.append(invocationName).append('/');
    for (int index = 0; index < bootstrapArgs.length; index++) {
      if (index != 0) text.append(',');
      text.append(bootstrapArgs[index]);
    }
    return text.append("):").append(invocationType.displayDescriptor()).append(']').toString();
  }
}
