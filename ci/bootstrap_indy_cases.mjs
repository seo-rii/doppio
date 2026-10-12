import {bootstrapEntry, bootstrapGroup, bootstrap, dynamic, siteLeading, text, object, type, handle, callSite, support,
  methodHandle, variableArguments} from './bootstrap_case_helpers.mjs';
const call = (method, name, descriptor, bsm = 'site', bsmDescriptor = siteLeading + ')' + callSite, args = [], kind = 6, owner = support) =>
  ({method, descriptor, cp: dynamic(name, descriptor, bootstrap(bsm, bsmDescriptor, args, kind, owner), 18)});
const entry = (id, method, trace, calls, limits = []) => bootstrapEntry('indy', id, method, trace, calls, limits);
const cases = [
  entry('bootstrap-indy-exact-site', 'caseExactSite', 'value=19;site=ConstantCallSite;bootstrap=1;cached=true', [call('exact', 'i_exact', '()I')]),
  entry('bootstrap-indy-adapted-leading', 'caseAdaptedLeading', 'lookup/name/type=Object-adapted;return=Object-adapted-CallSite;value=19;bootstrap=1',
    [call('adaptedLeading', 'i_adapt', '()I', 'siteAdapted', '(' + object + object + object + ')' + object)]),
  entry('bootstrap-indy-variable-arguments', 'caseVariableArguments', 'arguments=String/int/long/float/double/Class/MethodType/MethodHandle/nested-null;count=9;wide=exact;bootstrap=1',
    [call('variableArguments', 'i_varargs', '()' + text, 'siteVarargs', siteLeading + '[' + object + ')' + callSite, variableArguments('i_var_null'))]),
  entry('bootstrap-indy-narrow-parameters', 'caseNarrowParameters', 'descriptor=(byte,int)int;values=5/7;bootstrap=1', [call('narrow', 'i_narrow', '(BI)I')]),
  entry('bootstrap-indy-wide-parameters', 'caseWideParameters', 'descriptor=(long,double)long;value=9007199254740994;wide-slots=preserved;bootstrap=1', [call('wide', 'i_wide', '(JD)J')]),
  entry('bootstrap-indy-reference-adaptation', 'caseReferenceAdaptation', 'target=String-to-String;site=Object-to-String;reference=identity;bad-argument=ClassCastException;bootstrap=1',
    [call('reference', 'i_reference', '(' + object + ')' + text)]),
  entry('bootstrap-indy-void-result', 'caseVoidResult', 'descriptor=(int)void;state=31/32;bootstrap=1', [call('voidResult', 'i_void', '(I)V')]),
  entry('bootstrap-indy-null-reference', 'caseNullReference', 'null=preserved;non-null=identity;bootstrap=1', [call('nullReference', 'i_null', '(' + text + ')' + text)]),
  entry('bootstrap-indy-private-lookup', 'casePrivateLookup', 'lookup-owner=constant-pool-class;private-target=allowed;value=private:indy;bootstrap=1', [call('privateLookup', 'i_private', '()' + text)]),
  entry('bootstrap-indy-constructor-bootstrap', 'caseConstructorBootstrap', 'bootstrap-reference-kind=newInvokeSpecial;site=constructed-ConstantCallSite;value=29;bootstrap=1',
    [call('constructor', 'i_constructor', '()I', '<init>', siteLeading + 'I)V', [{tag: 3, value: 29}], 8, support + '$ConstructedSite')]),
  entry('bootstrap-indy-methodtype-handle-arguments', 'caseMethodTypeHandleArguments', 'static-arguments=MethodType/MethodHandle;target-type=exact-site-type;value=9007199254740993;bootstrap=1',
    [call('methodTypeHandle', 'i_mh', '(J)J', 'siteHandle', siteLeading + type + handle + ')' + callSite, [{tag: 16, descriptor: '(J)J'}, methodHandle('identityLong', '(J)J')])]),
  entry('bootstrap-indy-lexical-two-instructions', 'caseLexicalTwice', 'same-cp=two-instructions;site-targets=1/2;sum=3/3;bootstrap=2',
    [{...call('lexicalTwice', 'i_lex_twice', '()I'), count: 2, sameConstantPoolWithinMethod: {tag: 18, count: 2}}]),
  entry('bootstrap-indy-lexical-two-methods', 'caseLexicalMethods', 'same-cp=two-methods;values=1/2/1/2;bootstrap=2',
    [call('lexicalLeft', 'i_lex_methods', '()I'), {...call('lexicalRight', 'i_lex_methods', '()I'), sameConstantPoolAs: {tag: 18, method: 'lexicalLeft', descriptor: '()I'}}]),
  entry('bootstrap-indy-mutable-target', 'caseMutableTarget', 'same-site=retained;values=1/2;bootstrap=1;single-thread=true;visibility=unclaimed',
    [call('mutable', 'i_mutable', '()I')], ['MutableCallSite target changes are observed on one thread only; no syncAll or cross-thread visibility proof.']),
  entry('bootstrap-indy-volatile-target', 'caseVolatileTarget', 'same-site=retained;values=3/4;bootstrap=1;single-thread=true;visibility=unclaimed',
    [call('volatileSite', 'i_volatile', '()I')], ['VolatileCallSite target changes are observed on one thread only; no volatile memory-order proof.']),
  entry('bootstrap-indy-target-error-identity', 'caseTargetErrorIdentity', 'target-error=original-identity;not-bootstrap-wrapped=true;target-invocations=2;bootstrap=1',
    [call('targetError', 'i_target_error', '()I')])
];
export default bootstrapGroup('indy', cases);
