import {bootstrapEntry, bootstrapGroup, bootstrap, dynamic, constantLeading, lookup, text, object, cls, type, handle,
  methodHandle, nullArgument, wideArgument, variableArguments} from './bootstrap_case_helpers.mjs';
const call = (method, name, descriptor, bsm = 'constant', bsmDescriptor = constantLeading + ')' + object, arguments_ = []) =>
  ({method, descriptor: '()' + descriptor, cp: dynamic(name, descriptor, bootstrap(bsm, bsmDescriptor, arguments_))});
const entry = (id, method, trace, calls) => bootstrapEntry('condy', id, method, trace, calls);
const cached = (method, count = 1) => ({...call(method, 'c_cache', 'I'), ...(count === 1 ? {} : {count,
  sameConstantPoolWithinMethod: {tag: 17, count}})});
const cases = [
  entry('bootstrap-condy-int-exact', 'caseIntExact', 'value=41;primitive=int;bootstrap=1;cached=true', [call('exactInt', 'c_int', 'I', 'constantInt', constantLeading + ')I')]),
  entry('bootstrap-condy-long-exact', 'caseLongExact', 'value=9007199254740993;primitive=long;bootstrap=1;cached=true', [call('exactLong', 'c_long', 'J', 'constantLong', constantLeading + ')J')]),
  entry('bootstrap-condy-float-exact', 'caseFloatExact', 'value=1.5;primitive=float;bootstrap=1;cached=true', [call('exactFloat', 'c_float', 'F', 'constantFloat', constantLeading + ')F')]),
  entry('bootstrap-condy-double-exact', 'caseDoubleExact', 'value=2.25;primitive=double;bootstrap=1;cached=true', [call('exactDouble', 'c_double', 'D', 'constantDouble', constantLeading + ')D')]),
  entry('bootstrap-condy-reference-identity', 'caseReferenceIdentity', 'value=cached-reference;repeat=identity;bootstrap=1', [call('reference', 'c_ref', text)]),
  entry('bootstrap-condy-null-cached', 'caseNullCached', 'value=null;repeat=null;bootstrap=1', [call('nullReference', 'c_null', object)]),
  entry('bootstrap-condy-boxed-int-adaptation', 'caseBoxedIntAdaptation', 'bootstrap-return=Byte;constant=int;value=7;bootstrap=1', [call('boxedInt', 'c_box', 'I')]),
  entry('bootstrap-condy-boxed-long-adaptation', 'caseBoxedLongAdaptation', 'bootstrap-return=Integer;constant=long;value=9;bootstrap=1', [call('boxedLong', 'c_boxlong', 'J')]),
  entry('bootstrap-condy-methodtype-handle-arguments', 'caseMethodTypeHandleArgument', 'static-arguments=MethodType/MethodHandle;descriptor=(long)long;value=9007199254740993;bootstrap=1',
    [call('methodTypeHandle', 'c_mh', 'J', 'constantHandle', constantLeading + type + handle + ')J', [{tag: 16, descriptor: '(J)J'}, methodHandle('identityLong', '(J)J')])]),
  entry('bootstrap-condy-nested-null-argument', 'caseNestedNullArgument', 'inner=null;outer=nested:null;inner/outer-bootstrap=1/1',
    [call('nestedNull', 'c_nested_null', text, 'constantNested', constantLeading + object + ')' + object, [nullArgument('c_nested_null_leaf')])]),
  entry('bootstrap-condy-nested-wide-arguments', 'caseNestedWideArgument', 'inner-long=9007199254740993;double=2.25;outer-long=9007199254740994;inner/outer-bootstrap=1/1',
    [call('nestedWide', 'c_nested_wide', 'J', 'constantWide', constantLeading + 'JD)J', [wideArgument('c_nested_wide_leaf'), {tag: 6, value: 2.25}])]),
  entry('bootstrap-condy-variable-arguments', 'caseVariableArguments', 'arguments=String/int/long/float/double/Class/MethodType/MethodHandle/nested-null;count=9;wide=exact;bootstrap=1',
    [call('variableArguments', 'c_varargs', text, 'constantVarargs', constantLeading + '[' + object + ')' + object, variableArguments('c_var_null'))]),
  entry('bootstrap-condy-adapted-leading', 'caseAdaptedLeading', 'first=Lookup;name/type/value=Object-adapted;value=adapted;bootstrap=1',
    [call('adaptedLeading', 'c_adapt', text, 'constantAdapted', '(' + lookup + object + object + object + ')' + object, [{tag: 8, value: 'adapted'}])]),
  entry('bootstrap-condy-class-literal', 'caseClassLiteral', 'value=String.class;repeat=identity;bootstrap=1', [call('classLiteral', 'c_class', cls)]),
  entry('bootstrap-condy-private-lookup', 'casePrivateLookup', 'lookup-owner=constant-pool-class;private-target=allowed;value=private:condy;bootstrap=1',
    [call('privateLookup', 'c_private', text, 'constantPrivate')]),
  entry('bootstrap-condy-constant-pool-caching', 'caseConstantPoolCaching', 'same-cp=three-methods/four-ldc;values=73/73/146/73;bootstrap=1', [cached('cachedLeft'),
    {...cached('cachedRight'), sameConstantPoolAs: {tag: 17, method: 'cachedLeft', descriptor: '()I'}},
    {...cached('cachedTwice', 2), sameConstantPoolAs: {tag: 17, method: 'cachedLeft', descriptor: '()I'}}])
];
export default bootstrapGroup('condy', cases);
