package classes.modern_test;

import java.lang.invoke.MethodHandles;

/** C4: user invokedynamic call sites, with lexical rather than CP identity. */
public final class BootstrapIndyFinal {
  private static void check(boolean value) {BootstrapTestSupport.check(value);}
  private static void emit(String id, String event) {BootstrapTestSupport.emit(id, event);}
  private static void once(String name) {check(BootstrapTestSupport.count(name) == 1);}
  private static void caseExactSite() {
    check(BootstrapIndyCalls.exact() == 19 && BootstrapIndyCalls.exact() == 19); once("i_exact");
    emit("bootstrap-indy-exact-site", "value=19;site=ConstantCallSite;bootstrap=1;cached=true");
  }
  private static void caseAdaptedLeading() {
    check(BootstrapIndyCalls.adaptedLeading() == 19); once("i_adapt");
    emit("bootstrap-indy-adapted-leading", "lookup/name/type=Object-adapted;return=Object-adapted-CallSite;value=19;bootstrap=1");
  }
  private static void caseVariableArguments() {
    check(BootstrapIndyCalls.variableArguments().equals("varargs:9")); once("i_var_null"); once("i_varargs");
    emit("bootstrap-indy-variable-arguments", "arguments=String/int/long/float/double/Class/MethodType/MethodHandle/nested-null;count=9;wide=exact;bootstrap=1");
  }
  private static void caseNarrowParameters() {
    check(BootstrapIndyCalls.narrow((byte) -7, 12) == 5 && BootstrapIndyCalls.narrow((byte) 3, 4) == 7); once("i_narrow");
    emit("bootstrap-indy-narrow-parameters", "descriptor=(byte,int)int;values=5/7;bootstrap=1");
  }
  private static void caseWideParameters() {
    check(BootstrapIndyCalls.wide(9007199254740993L, 2.25d) == 9007199254740994L); once("i_wide");
    emit("bootstrap-indy-wide-parameters", "descriptor=(long,double)long;value=9007199254740994;wide-slots=preserved;bootstrap=1");
  }
  private static void caseReferenceAdaptation() {
    Object value = new String("reference"); check(BootstrapIndyCalls.reference(value) == value);
    try {BootstrapIndyCalls.reference(Integer.valueOf(1)); throw new AssertionError("missing cast failure");}
    catch (ClassCastException expected) {once("i_reference");}
    emit("bootstrap-indy-reference-adaptation", "target=String-to-String;site=Object-to-String;reference=identity;bad-argument=ClassCastException;bootstrap=1");
  }
  private static void caseVoidResult() {
    BootstrapIndyCalls.voidResult(31); check(BootstrapTestSupport.recorded == 31);
    BootstrapIndyCalls.voidResult(32); check(BootstrapTestSupport.recorded == 32); once("i_void");
    emit("bootstrap-indy-void-result", "descriptor=(int)void;state=31/32;bootstrap=1");
  }
  private static void caseNullReference() {
    check(BootstrapIndyCalls.nullReference(null) == null); String value = new String("nullable");
    check(BootstrapIndyCalls.nullReference(value) == value); once("i_null");
    emit("bootstrap-indy-null-reference", "null=preserved;non-null=identity;bootstrap=1");
  }
  private static void casePrivateLookup() {
    check(BootstrapIndyCalls.privateLookup().equals("private:indy")); once("i_private");
    emit("bootstrap-indy-private-lookup", "lookup-owner=constant-pool-class;private-target=allowed;value=private:indy;bootstrap=1");
  }
  private static void caseConstructorBootstrap() {
    check(BootstrapIndyCalls.constructor() == 29 && BootstrapIndyCalls.constructor() == 29); once("i_constructor");
    emit("bootstrap-indy-constructor-bootstrap", "bootstrap-reference-kind=newInvokeSpecial;site=constructed-ConstantCallSite;value=29;bootstrap=1");
  }
  private static void caseMethodTypeHandleArguments() {
    check(BootstrapIndyCalls.methodTypeHandle(9007199254740993L) == 9007199254740993L); once("i_mh");
    emit("bootstrap-indy-methodtype-handle-arguments", "static-arguments=MethodType/MethodHandle;target-type=exact-site-type;value=9007199254740993;bootstrap=1");
  }
  private static void caseLexicalTwice() {
    check(BootstrapIndyCalls.lexicalTwice() == 3 && BootstrapIndyCalls.lexicalTwice() == 3);
    check(BootstrapTestSupport.count("i_lex_twice") == 2);
    emit("bootstrap-indy-lexical-two-instructions", "same-cp=two-instructions;site-targets=1/2;sum=3/3;bootstrap=2");
  }
  private static void caseLexicalMethods() {
    check(BootstrapIndyCalls.lexicalLeft() == 1 && BootstrapIndyCalls.lexicalRight() == 2);
    check(BootstrapIndyCalls.lexicalLeft() == 1 && BootstrapIndyCalls.lexicalRight() == 2);
    check(BootstrapTestSupport.count("i_lex_methods") == 2);
    emit("bootstrap-indy-lexical-two-methods", "same-cp=two-methods;values=1/2/1/2;bootstrap=2");
  }
  private static void caseMutableTarget() {
    check(BootstrapIndyCalls.mutable() == 1); BootstrapTestSupport.mutable.setTarget(MethodHandles.constant(int.class, Integer.valueOf(2)));
    check(BootstrapIndyCalls.mutable() == 2); once("i_mutable");
    emit("bootstrap-indy-mutable-target", "same-site=retained;values=1/2;bootstrap=1;single-thread=true;visibility=unclaimed");
  }
  private static void caseVolatileTarget() {
    check(BootstrapIndyCalls.volatileSite() == 3); BootstrapTestSupport.volatileSite.setTarget(MethodHandles.constant(int.class, Integer.valueOf(4)));
    check(BootstrapIndyCalls.volatileSite() == 4); once("i_volatile");
    emit("bootstrap-indy-volatile-target", "same-site=retained;values=3/4;bootstrap=1;single-thread=true;visibility=unclaimed");
  }
  private static void caseTargetErrorIdentity() {
    for (int i = 0; i < 2; i++) {
      try {BootstrapIndyCalls.targetError(); throw new AssertionError("missing target error");}
      catch (Error failure) {check(failure == BootstrapTestSupport.ERROR);}
    }
    once("i_target_error"); emit("bootstrap-indy-target-error-identity", "target-error=original-identity;not-bootstrap-wrapped=true;target-invocations=2;bootstrap=1");
  }
  public static void main(String[] args) {
    caseExactSite(); caseAdaptedLeading(); caseVariableArguments(); caseNarrowParameters(); caseWideParameters();
    caseReferenceAdaptation(); caseVoidResult(); caseNullReference(); casePrivateLookup(); caseConstructorBootstrap();
    caseMethodTypeHandleArguments(); caseLexicalTwice(); caseLexicalMethods(); caseMutableTarget(); caseVolatileTarget(); caseTargetErrorIdentity();
    System.out.println("BOOTSTRAP_INDY_OK");
  }
}
