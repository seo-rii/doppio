package classes.modern_test;

/** C4: direct ldc/ldc2_w execution of original user-bootstrap class files. */
public final class BootstrapCondyFinal {
  private static void check(boolean value) {BootstrapTestSupport.check(value);}
  private static void emit(String id, String event) {BootstrapTestSupport.emit(id, event);}
  private static void once(String name) {check(BootstrapTestSupport.count(name) == 1);}

  private static void caseIntExact() {
    check(BootstrapCondyCalls.exactInt() == 41 && BootstrapCondyCalls.exactInt() == 41); once("c_int");
    emit("bootstrap-condy-int-exact", "value=41;primitive=int;bootstrap=1;cached=true");
  }
  private static void caseLongExact() {
    check(BootstrapCondyCalls.exactLong() == 9007199254740993L && BootstrapCondyCalls.exactLong() == 9007199254740993L); once("c_long");
    emit("bootstrap-condy-long-exact", "value=9007199254740993;primitive=long;bootstrap=1;cached=true");
  }
  private static void caseFloatExact() {
    check(BootstrapCondyCalls.exactFloat() == 1.5f && BootstrapCondyCalls.exactFloat() == 1.5f); once("c_float");
    emit("bootstrap-condy-float-exact", "value=1.5;primitive=float;bootstrap=1;cached=true");
  }
  private static void caseDoubleExact() {
    check(BootstrapCondyCalls.exactDouble() == 2.25d && BootstrapCondyCalls.exactDouble() == 2.25d); once("c_double");
    emit("bootstrap-condy-double-exact", "value=2.25;primitive=double;bootstrap=1;cached=true");
  }
  private static void caseReferenceIdentity() {
    String first = BootstrapCondyCalls.reference(); check(first.equals("cached-reference") && first == BootstrapCondyCalls.reference()); once("c_ref");
    emit("bootstrap-condy-reference-identity", "value=cached-reference;repeat=identity;bootstrap=1");
  }
  private static void caseNullCached() {
    check(BootstrapCondyCalls.nullReference() == null && BootstrapCondyCalls.nullReference() == null); once("c_null");
    emit("bootstrap-condy-null-cached", "value=null;repeat=null;bootstrap=1");
  }
  private static void caseBoxedIntAdaptation() {
    check(BootstrapCondyCalls.boxedInt() == 7 && BootstrapCondyCalls.boxedInt() == 7); once("c_box");
    emit("bootstrap-condy-boxed-int-adaptation", "bootstrap-return=Byte;constant=int;value=7;bootstrap=1");
  }
  private static void caseBoxedLongAdaptation() {
    check(BootstrapCondyCalls.boxedLong() == 9L && BootstrapCondyCalls.boxedLong() == 9L); once("c_boxlong");
    emit("bootstrap-condy-boxed-long-adaptation", "bootstrap-return=Integer;constant=long;value=9;bootstrap=1");
  }
  private static void caseMethodTypeHandleArgument() {
    check(BootstrapCondyCalls.methodTypeHandle() == 9007199254740993L); once("c_mh");
    emit("bootstrap-condy-methodtype-handle-arguments", "static-arguments=MethodType/MethodHandle;descriptor=(long)long;value=9007199254740993;bootstrap=1");
  }
  private static void caseNestedNullArgument() {
    check(BootstrapCondyCalls.nestedNull().equals("nested:null")); once("c_nested_null_leaf"); once("c_nested_null");
    emit("bootstrap-condy-nested-null-argument", "inner=null;outer=nested:null;inner/outer-bootstrap=1/1");
  }
  private static void caseNestedWideArgument() {
    check(BootstrapCondyCalls.nestedWide() == 9007199254740994L); once("c_nested_wide_leaf"); once("c_nested_wide");
    emit("bootstrap-condy-nested-wide-arguments", "inner-long=9007199254740993;double=2.25;outer-long=9007199254740994;inner/outer-bootstrap=1/1");
  }
  private static void caseVariableArguments() {
    check(BootstrapCondyCalls.variableArguments().equals("varargs:9")); once("c_var_null"); once("c_varargs");
    emit("bootstrap-condy-variable-arguments", "arguments=String/int/long/float/double/Class/MethodType/MethodHandle/nested-null;count=9;wide=exact;bootstrap=1");
  }
  private static void caseAdaptedLeading() {
    check(BootstrapCondyCalls.adaptedLeading().equals("adapted")); once("c_adapt");
    emit("bootstrap-condy-adapted-leading", "first=Lookup;name/type/value=Object-adapted;value=adapted;bootstrap=1");
  }
  private static void caseClassLiteral() {
    check(BootstrapCondyCalls.classLiteral() == String.class && BootstrapCondyCalls.classLiteral() == String.class); once("c_class");
    emit("bootstrap-condy-class-literal", "value=String.class;repeat=identity;bootstrap=1");
  }
  private static void casePrivateLookup() {
    check(BootstrapCondyCalls.privateLookup().equals("private:condy")); once("c_private");
    emit("bootstrap-condy-private-lookup", "lookup-owner=constant-pool-class;private-target=allowed;value=private:condy;bootstrap=1");
  }
  private static void caseConstantPoolCaching() {
    check(BootstrapCondyCalls.cachedLeft() == 73 && BootstrapCondyCalls.cachedRight() == 73);
    check(BootstrapCondyCalls.cachedTwice() == 146 && BootstrapCondyCalls.cachedLeft() == 73); once("c_cache");
    emit("bootstrap-condy-constant-pool-caching", "same-cp=three-methods/four-ldc;values=73/73/146/73;bootstrap=1");
  }
  public static void main(String[] args) {
    caseIntExact(); caseLongExact(); caseFloatExact(); caseDoubleExact(); caseReferenceIdentity(); caseNullCached();
    caseBoxedIntAdaptation(); caseBoxedLongAdaptation(); caseMethodTypeHandleArgument(); caseNestedNullArgument();
    caseNestedWideArgument(); caseVariableArguments(); caseAdaptedLeading(); caseClassLiteral(); casePrivateLookup(); caseConstantPoolCaching();
    System.out.println("BOOTSTRAP_CONDY_OK");
  }
}
