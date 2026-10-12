import {bootstrapEntry, bootstrapGroup, bootstrap, dynamic, constantLeading, siteLeading, text, object, cls, callSite} from './bootstrap_case_helpers.mjs';
const constant = (method, name, descriptor, bsm = 'constant', bsmDescriptor = constantLeading + ')' + object, args = []) =>
  ({method, descriptor: '()' + descriptor, cp: dynamic(name, descriptor, bootstrap(bsm, bsmDescriptor, args))});
const site = (method, name, bsm = 'site', bsmDescriptor = siteLeading + ')' + callSite, args = []) =>
  ({method, descriptor: '()I', cp: dynamic(name, '()I', bootstrap(bsm, bsmDescriptor, args), 18)});
const entry = (id, method, trace, calls, limits = []) => {
  const result = bootstrapEntry('errors', id, method, trace, calls,
    ['BootstrapMethodError wrapper identity and repeated cause-object/detail identity are not claimed; first-call specified cause identity is checked explicitly.', ...limits]);
  const direct = ['caseConstantErrorPassThrough', 'caseSiteErrorPassThrough', 'caseLookupDenied'].includes(method);
  result.probes[0] = {method, descriptor: '()V', requiredOpcodes: ['invokestatic'], symbolicOperands: [{opcode: 'invokestatic', tag: 10,
    owner: 'classes.modern_test.BootstrapErrorsFinal', name: direct ? 'failure' : 'repeated',
    descriptor: direct ? '(I)Ljava/lang/Throwable;' : '(ILjava/lang/Class;Ljava/lang/Class;Ljava/lang/Throwable;)V'}]};
  return result;
};
const cases = [
  entry('bootstrap-error-condy-runtime-cause', 'caseConstantRuntimeCause', 'outer=BootstrapMethodError;cause=IllegalArgumentException;first-cause=original-identity;repeat-cause-class=same;bootstrap=1', [constant('runtimeFailure', 'e_c_runtime', 'I')]),
  entry('bootstrap-error-condy-error-passthrough', 'caseConstantErrorPassThrough', 'outer=AssertionError;first-error=original-identity;not-wrapped=true;retry-policy=unclaimed;bootstrap=1', [constant('errorFailure', 'e_c_error', 'I')],
    ['Unwrapped Error is invoked only once: pinned native 21/25 retries this bootstrap on repeat, unlike the JVMS non-reexecution obligation. No native cached-Error claim or retry waiver is introduced.']),
  entry('bootstrap-error-condy-null-primitive', 'caseNullPrimitive', 'outer=BootstrapMethodError;cause=NullPointerException;repeat=true;bootstrap=1', [constant('nullPrimitive', 'e_c_null', 'I')]),
  entry('bootstrap-error-condy-wrong-reference', 'caseWrongReference', 'outer=BootstrapMethodError;cause=ClassCastException;repeat=true;bootstrap=1', [constant('wrongReference', 'e_c_wrong', text)]),
  entry('bootstrap-error-condy-lookup-parameter', 'caseInvalidLookupParameter', 'outer=BootstrapMethodError;first-bootstrap-parameter=Object-rejected;bootstrap=0;cause-detail=unclaimed',
    [constant('invalidLookupParameter', 'e_c_lookup_parameter', object, 'constantInvalidLookup', '(' + object + text + cls + ')' + object)]),
  entry('bootstrap-error-condy-arity', 'caseConstantArity', 'outer=BootstrapMethodError;cause=WrongMethodTypeException;missing-static-argument=true;bootstrap=0',
    [constant('constantArity', 'e_c_arity', object, 'constantArity', constantLeading + 'I)' + object)]),
  entry('bootstrap-error-condy-lookup-denied', 'caseLookupDenied', 'outer=BootstrapMethodError;cause=IllegalAccessException;first-cause=original-identity;lookup=caller-not-bootstrap-owner;bootstrap=1',
    [constant('lookupDenied', 'e_c_access', object, 'constantDenied')]),
  entry('bootstrap-error-condy-nested-failure', 'caseNestedConstantFailure', 'outer=BootstrapMethodError;cause=IllegalArgumentException;first-cause=original-identity;inner/outer-bootstrap=1/0',
    [constant('nestedConstantFailure', 'e_c_nested', object, 'constantNestedFailure', constantLeading + object + ')' + object,
      [dynamic('e_c_nested_leaf', object, bootstrap('constant', constantLeading + ')' + object))])]),
  entry('bootstrap-error-indy-runtime-cause', 'caseSiteRuntimeCause', 'outer=BootstrapMethodError;first-cause=IllegalArgumentException/original-identity;repeat-outer-class=same;repeat-cause-detail=unclaimed;bootstrap=1',
    [site('runtimeSiteFailure', 'e_i_runtime')]),
  entry('bootstrap-error-indy-error-passthrough', 'caseSiteErrorPassThrough', 'outer=AssertionError;first-error=original-identity;not-wrapped=true;retry-policy=unclaimed;bootstrap=1', [site('errorSiteFailure', 'e_i_error')],
    ['Unwrapped Error is invoked only once: pinned native 21/25 retries this bootstrap on repeat, unlike the JVMS non-reexecution obligation. No native cached-Error claim or retry waiver is introduced.']),
  entry('bootstrap-error-indy-null-site', 'caseNullSite', 'outer=BootstrapMethodError;cause=ClassCastException;null-is-not-CallSite=true;bootstrap=1', [site('nullSite', 'e_i_null')]),
  entry('bootstrap-error-indy-wrong-site', 'caseWrongSite', 'outer=BootstrapMethodError;cause=ClassCastException;String-is-not-CallSite=true;bootstrap=1', [site('wrongSite', 'e_i_wrong', 'siteWrong', siteLeading + ')' + object)]),
  entry('bootstrap-error-indy-wrong-target', 'caseWrongTarget', 'outer=BootstrapMethodError;cause=WrongMethodTypeException;target-type-mismatch=true;bootstrap=1', [site('wrongTarget', 'e_i_target')]),
  entry('bootstrap-error-indy-arity', 'caseSiteArity', 'outer=BootstrapMethodError;cause=WrongMethodTypeException;missing-static-argument=true;bootstrap=0', [site('siteArity', 'e_i_arity', 'siteArity', siteLeading + 'I)' + callSite)]),
  entry('bootstrap-error-indy-lexical-failure-caching', 'caseLexicalFailureCaching', 'same-cp=two-methods;independent-failure-sites=2;each-repeat=cached;first-causes=original-identity;bootstrap=2',
    [site('lexicalFailureLeft', 'e_i_lexical'), {...site('lexicalFailureRight', 'e_i_lexical'), sameConstantPoolAs: {tag: 18, method: 'lexicalFailureLeft', descriptor: '()I'}}]),
  entry('bootstrap-error-indy-nested-constant-failure', 'caseNestedSiteFailure', 'outer=BootstrapMethodError;cause=IllegalArgumentException;first-cause=original-identity;inner/outer-bootstrap=1/0',
    [site('nestedSiteFailure', 'e_i_nested', 'siteNestedFailure', siteLeading + object + ')' + callSite,
      [dynamic('e_i_nested_leaf', object, bootstrap('constant', constantLeading + ')' + object))])])
];
export default bootstrapGroup('errors', cases);
