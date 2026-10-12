package classes.modern_test;

/** C4: selected linkage failures and caching, without incidental wrapper identity. */
public final class BootstrapErrorsFinal {
  private static void check(boolean value) {BootstrapTestSupport.check(value);}
  private static void emit(String id, String event) {BootstrapTestSupport.emit(id, event);}
  private static Throwable failure(int selector) {
    try {
      switch (selector) {
        case 1: BootstrapErrorsCalls.runtimeFailure(); break;
        case 2: BootstrapErrorsCalls.errorFailure(); break;
        case 3: BootstrapErrorsCalls.nullPrimitive(); break;
        case 4: BootstrapErrorsCalls.wrongReference(); break;
        case 5: BootstrapErrorsCalls.invalidLookupParameter(); break;
        case 6: BootstrapErrorsCalls.constantArity(); break;
        case 7: BootstrapErrorsCalls.lookupDenied(); break;
        case 8: BootstrapErrorsCalls.nestedConstantFailure(); break;
        case 9: BootstrapErrorsCalls.runtimeSiteFailure(); break;
        case 10: BootstrapErrorsCalls.errorSiteFailure(); break;
        case 11: BootstrapErrorsCalls.nullSite(); break;
        case 12: BootstrapErrorsCalls.wrongSite(); break;
        case 13: BootstrapErrorsCalls.wrongTarget(); break;
        case 14: BootstrapErrorsCalls.siteArity(); break;
        case 15: BootstrapErrorsCalls.lexicalFailureLeft(); break;
        case 16: BootstrapErrorsCalls.lexicalFailureRight(); break;
        case 17: BootstrapErrorsCalls.nestedSiteFailure(); break;
        default: throw new AssertionError("unknown failure selector");
      }
    } catch (Throwable error) {return error;}
    throw new AssertionError("missing linkage failure");
  }
  private static void repeated(int selector, Class<?> outer, Class<?> cause, Throwable firstCause) {
    Throwable first = failure(selector), second = failure(selector);
    check(first.getClass() == outer && second.getClass() == outer);
    if (cause != null) {
      check(first.getCause() != null && first.getCause().getClass() == cause);
      // Native HotSpot reconstitutes some cached errors. C4 claims the first
      // specified cause, repeated outer class and BSM non-reexecution only.
      if (selector <= 8) check(second.getCause() != null && second.getCause().getClass() == cause);
      if (firstCause != null) check(first.getCause() == firstCause);
    }
  }
  private static void count(String name, int expected) {check(BootstrapTestSupport.count(name) == expected);}
  private static void caseConstantRuntimeCause() {
    repeated(1, BootstrapMethodError.class, IllegalArgumentException.class, BootstrapTestSupport.RUNTIME); count("e_c_runtime", 1);
    emit("bootstrap-error-condy-runtime-cause", "outer=BootstrapMethodError;cause=IllegalArgumentException;first-cause=original-identity;repeat-cause-class=same;bootstrap=1");
  }
  private static void caseConstantErrorPassThrough() {
    check(failure(2) == BootstrapTestSupport.ERROR); count("e_c_error", 1);
    emit("bootstrap-error-condy-error-passthrough", "outer=AssertionError;first-error=original-identity;not-wrapped=true;retry-policy=unclaimed;bootstrap=1");
  }
  private static void caseNullPrimitive() {
    repeated(3, BootstrapMethodError.class, NullPointerException.class, null); count("e_c_null", 1);
    emit("bootstrap-error-condy-null-primitive", "outer=BootstrapMethodError;cause=NullPointerException;repeat=true;bootstrap=1");
  }
  private static void caseWrongReference() {
    repeated(4, BootstrapMethodError.class, ClassCastException.class, null); count("e_c_wrong", 1);
    emit("bootstrap-error-condy-wrong-reference", "outer=BootstrapMethodError;cause=ClassCastException;repeat=true;bootstrap=1");
  }
  private static void caseInvalidLookupParameter() {
    repeated(5, BootstrapMethodError.class, null, null); count("e_c_lookup_parameter", 0);
    emit("bootstrap-error-condy-lookup-parameter", "outer=BootstrapMethodError;first-bootstrap-parameter=Object-rejected;bootstrap=0;cause-detail=unclaimed");
  }
  private static void caseConstantArity() {
    repeated(6, BootstrapMethodError.class, java.lang.invoke.WrongMethodTypeException.class, null); count("e_c_arity", 0);
    emit("bootstrap-error-condy-arity", "outer=BootstrapMethodError;cause=WrongMethodTypeException;missing-static-argument=true;bootstrap=0");
  }
  private static void caseLookupDenied() {
    Throwable first = failure(7); check(first.getClass() == BootstrapMethodError.class);
    check(first.getCause() == BootstrapTestSupport.accessFailure && first.getCause().getClass() == IllegalAccessException.class);
    Throwable second = failure(7); check(second.getClass() == BootstrapMethodError.class && second.getCause().getClass() == IllegalAccessException.class);
    count("e_c_access", 1);
    emit("bootstrap-error-condy-lookup-denied", "outer=BootstrapMethodError;cause=IllegalAccessException;first-cause=original-identity;lookup=caller-not-bootstrap-owner;bootstrap=1");
  }
  private static void caseNestedConstantFailure() {
    repeated(8, BootstrapMethodError.class, IllegalArgumentException.class, BootstrapTestSupport.RUNTIME);
    count("e_c_nested_leaf", 1); count("e_c_nested", 0);
    emit("bootstrap-error-condy-nested-failure", "outer=BootstrapMethodError;cause=IllegalArgumentException;first-cause=original-identity;inner/outer-bootstrap=1/0");
  }
  private static void caseSiteRuntimeCause() {
    repeated(9, BootstrapMethodError.class, IllegalArgumentException.class, BootstrapTestSupport.RUNTIME); count("e_i_runtime", 1);
    emit("bootstrap-error-indy-runtime-cause", "outer=BootstrapMethodError;first-cause=IllegalArgumentException/original-identity;repeat-outer-class=same;repeat-cause-detail=unclaimed;bootstrap=1");
  }
  private static void caseSiteErrorPassThrough() {
    check(failure(10) == BootstrapTestSupport.ERROR); count("e_i_error", 1);
    emit("bootstrap-error-indy-error-passthrough", "outer=AssertionError;first-error=original-identity;not-wrapped=true;retry-policy=unclaimed;bootstrap=1");
  }
  private static void caseNullSite() {
    repeated(11, BootstrapMethodError.class, ClassCastException.class, null); count("e_i_null", 1);
    emit("bootstrap-error-indy-null-site", "outer=BootstrapMethodError;cause=ClassCastException;null-is-not-CallSite=true;bootstrap=1");
  }
  private static void caseWrongSite() {
    repeated(12, BootstrapMethodError.class, ClassCastException.class, null); count("e_i_wrong", 1);
    emit("bootstrap-error-indy-wrong-site", "outer=BootstrapMethodError;cause=ClassCastException;String-is-not-CallSite=true;bootstrap=1");
  }
  private static void caseWrongTarget() {
    repeated(13, BootstrapMethodError.class, java.lang.invoke.WrongMethodTypeException.class, null); count("e_i_target", 1);
    emit("bootstrap-error-indy-wrong-target", "outer=BootstrapMethodError;cause=WrongMethodTypeException;target-type-mismatch=true;bootstrap=1");
  }
  private static void caseSiteArity() {
    repeated(14, BootstrapMethodError.class, java.lang.invoke.WrongMethodTypeException.class, null); count("e_i_arity", 0);
    emit("bootstrap-error-indy-arity", "outer=BootstrapMethodError;cause=WrongMethodTypeException;missing-static-argument=true;bootstrap=0");
  }
  private static void caseLexicalFailureCaching() {
    repeated(15, BootstrapMethodError.class, IllegalArgumentException.class, BootstrapTestSupport.RUNTIME);
    repeated(16, BootstrapMethodError.class, IllegalArgumentException.class, BootstrapTestSupport.RUNTIME); count("e_i_lexical", 2);
    emit("bootstrap-error-indy-lexical-failure-caching", "same-cp=two-methods;independent-failure-sites=2;each-repeat=cached;first-causes=original-identity;bootstrap=2");
  }
  private static void caseNestedSiteFailure() {
    repeated(17, BootstrapMethodError.class, IllegalArgumentException.class, BootstrapTestSupport.RUNTIME);
    count("e_i_nested_leaf", 1); count("e_i_nested", 0);
    emit("bootstrap-error-indy-nested-constant-failure", "outer=BootstrapMethodError;cause=IllegalArgumentException;first-cause=original-identity;inner/outer-bootstrap=1/0");
  }
  public static void main(String[] args) {
    caseConstantRuntimeCause(); caseConstantErrorPassThrough(); caseNullPrimitive(); caseWrongReference(); caseInvalidLookupParameter();
    caseConstantArity(); caseLookupDenied(); caseNestedConstantFailure(); caseSiteRuntimeCause(); caseSiteErrorPassThrough();
    caseNullSite(); caseWrongSite(); caseWrongTarget(); caseSiteArity(); caseLexicalFailureCaching(); caseNestedSiteFailure();
    System.out.println("BOOTSTRAP_ERRORS_OK");
  }
}
