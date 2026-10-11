// Hand-authored public Type/AnnotatedType shapes and class-file metadata,
// independent of native output. Helpers format declarative expectations;
// they never inspect native output or derive an oracle from emitted classes.
// Ordinary Field pairs distinguish record transport/scope defects from shared
// Java reflection behavior. This does not close generic reflection in general.
const mainClass = 'classes.modern_test.JavaRecordTypes';
const binary = name => `${mainClass}$${name}`;
const internal = name => binary(name).replaceAll('.', '/');
const descriptor = name => `L${internal(name)};`;
const C = name => `C(${name})`;
const V = 'V(T)';
const A = component => `A(${component})`;
const P = (raw, args, owner = '-') => `P(${C(raw)};owner=${owner};args=[${args.join(',')}])`;
const W = (upper, lower = []) => `W(upper=[${upper.join(',')}];lower=[${lower.join(',')}])`;
const string = C('java.lang.String'), integer = C('java.lang.Integer');
const number = C('java.lang.Number'), object = C('java.lang.Object'), long = C('java.lang.Long');
const list = argument => P('java.util.List', [argument]);
const listString = list(string), listInteger = list(integer);
const nested = P('java.util.Map', [string, listInteger]);
const upper = list(W([number])), lower = list(W([object], [integer])), any = list(W([object]));
const variableBounds = [number, P('java.lang.Comparable', [V])];
const owner = P('Outer', [string], C('JavaRecordTypes'));
const inner = P('Outer$Inner', [integer], owner);
const middle = P('Outer$Middle', [integer], owner);
const leaf = P('Outer$Middle$Leaf', [long], middle);
const statik = P('Outer$StaticNested', [long], C('Outer'));
const listStringSignature = 'Ljava/util/List<Ljava/lang/String;>;';
const nestedSignature = 'Ljava/util/Map<Ljava/lang/String;Ljava/util/List<Ljava/lang/Integer;>;>;';
const upperSignature = 'Ljava/util/List<+Ljava/lang/Number;>;';
const lowerSignature = 'Ljava/util/List<-Ljava/lang/Integer;>;';
const anySignature = 'Ljava/util/List<*>;';
const variableSignature = '<T:Ljava/lang/Number;:Ljava/lang/Comparable<TT;>;>Ljava/lang/Record;';
const ownerSignature = `L${internal('Outer')}<Ljava/lang/String;>;`;
const innerSignature = `${ownerSignature.slice(0, -1)}.Inner<Ljava/lang/Integer;>;`;
const deepSignature = `${ownerSignature.slice(0, -1)}.Middle<Ljava/lang/Integer;>.Leaf<Ljava/lang/Long;>;`;
const staticSignature = `L${internal('Outer$StaticNested')}<Ljava/lang/Long;>;`;

function annotated(kind, type, {tag, owner = '-', component, args, upper, lower, bounds} = {}) {
  let text = `${kind}(${type};ann=[${tag ? `Use:${tag}` : ''}];owner=${owner}`;
  if (component !== undefined) text += `;component=${component}`;
  if (args !== undefined) text += `;args=[${args.join(',')}]`;
  if (upper !== undefined) text += `;upper=[${upper.join(',')}]`;
  if (lower !== undefined) text += `;lower=[${lower.join(',')}]`;
  if (bounds !== undefined) text += bounds === '<recursive>' ? ';bounds=<recursive>' : `;bounds=[${bounds.join(',')}]`;
  return text + ')';
}
const plain = (type, tag, owner = '-') => annotated('plain', type, {tag, owner});
const param = (type, tag, args, owner = '-') => annotated('parameterized', type, {tag, args, owner});
const array = (type, tag, component) => annotated('array', type, {tag, component});
const wildcard = (type, tag, upper, lower = []) => annotated('wildcard', type, {tag, upper, lower});
const annotatedVariable = tag => annotated('variable', V, {tag, bounds: [
  plain(number, 'bound-number'),
  param(P('java.lang.Comparable', [V]), 'bound-comparable', [
    annotated('variable', V, {tag: 'self-bound', bounds: '<recursive>'})
  ])
]});
const mainOwner = plain(C('JavaRecordTypes'));
const annotatedOwner = (tag, argumentTag) => param(owner, tag, [plain(string, argumentTag)], mainOwner);
const annotatedInner = param(inner, 'inner', [plain(integer, 'inner-argument')],
  annotatedOwner('owner', 'owner-argument'));
const annotatedDeepOwner = annotatedOwner('deep-owner', 'deep-owner-argument');
const annotatedMiddle = param(middle, 'middle', [plain(integer, 'middle-argument')], annotatedDeepOwner);
const annotatedLeaf = param(leaf, 'leaf', [plain(long, 'leaf-argument')], annotatedMiddle);
const annotatedStatic = param(statik, 'static', [plain(long, 'static-argument')], plain(C('Outer'), undefined, mainOwner));
const annotatedRaw = plain(C('Outer$RawInner'), 'raw-inner', plain(C('Outer'), 'raw-owner', mainOwner));

const typeAnnotation = (value, path = [], {visible = true, name = 'Use'} = {}) => ({
  descriptor: descriptor(name), visible, path, values: {value}
});
const declaration = (name, value) => ({descriptor: descriptor(name), visible: true, values: {value}});
const component = (name, descriptor, signature, raw, shape, options = {}) => ({
  name, descriptor, signature, raw, shape, ...options
});
const records = {
  RawData: {fieldClass: 'RawFields', classSignature: null, components: [
    component('count', 'I', null, 'int', C('int')),
    component('text', 'Ljava/lang/String;', null, 'java.lang.String', string),
    component('numbers', '[I', null, 'int[]', C('int[]')),
    component('names', '[[Ljava/lang/String;', null, 'java.lang.String[][]', C('java.lang.String[][]'))
  ]},
  ParameterizedData: {fieldClass: 'ParameterizedFields', classSignature: null, components: [
    component('strings', 'Ljava/util/List;', listStringSignature, 'java.util.List', listString),
    component('nested', 'Ljava/util/Map;', nestedSignature, 'java.util.Map', nested),
    component('upper', 'Ljava/util/List;', upperSignature, 'java.util.List', upper),
    component('lower', 'Ljava/util/List;', lowerSignature, 'java.util.List', lower),
    component('any', 'Ljava/util/List;', anySignature, 'java.util.List', any),
    component('array', '[Ljava/util/List;', '[' + listStringSignature, 'java.util.List[]', A(listString))
  ]},
  VariableData: {fieldClass: 'VariableFields', classSignature: variableSignature, components: [
    component('item', 'Ljava/lang/Number;', 'TT;', 'java.lang.Number', V, {variable: true, bounds: variableBounds}),
    component('array', '[Ljava/lang/Number;', '[TT;', 'java.lang.Number[]', A(V), {variable: true}),
    component('matrix', '[[Ljava/lang/Number;', '[[TT;', 'java.lang.Number[][]', A(A(V)), {variable: true}),
    component('list', 'Ljava/util/List;', 'Ljava/util/List<TT;>;', 'java.util.List', list(V), {variable: true}),
    component('wildcard', 'Ljava/util/List;', 'Ljava/util/List<+[TT;>;', 'java.util.List', list(W([A(V)])), {variable: true})
  ]},
  'ShadowOuter$Shadow': {fieldClass: 'ShadowFields', classSignature: '<T::Ljava/lang/CharSequence;>Ljava/lang/Record;', components: [
    component('value', 'Ljava/lang/CharSequence;', 'TT;', 'java.lang.CharSequence', V,
      {variable: true, bounds: [C('java.lang.CharSequence')]})
  ]},
  OwnerData: {fieldClass: 'OwnerFields', classSignature: null, components: [
    component('member', descriptor('Outer$Inner'), innerSignature, 'Outer$Inner', inner),
    component('deep', descriptor('Outer$Middle$Leaf'), deepSignature, 'Outer$Middle$Leaf', leaf),
    component('statik', descriptor('Outer$StaticNested'), staticSignature, 'Outer$StaticNested', statik),
    component('raw', descriptor('Outer$RawInner'), null, 'Outer$RawInner', C('Outer$RawInner'))
  ]},
  AnnotatedData: {fieldClass: 'AnnotatedFields', classSignature: variableSignature, components: [
    component('scalar', 'Ljava/lang/String;', null, 'java.lang.String', string, {
      annotated: plain(string, 'scalar'),
      typeAnnotations: [typeAnnotation('scalar'), typeAnnotation('invisible', [], {visible: false, name: 'HiddenUse'})]
    }),
    component('list', 'Ljava/util/List;', listStringSignature, 'java.util.List', listString, {
      annotated: param(listString, 'list', [plain(string, 'argument')]),
      typeAnnotations: [typeAnnotation('list'), typeAnnotation('argument', [[3, 0]])]
    }),
    component('nested', 'Ljava/util/Map;', nestedSignature, 'java.util.Map', nested, {
      annotated: param(nested, 'map', [plain(string, 'key'), param(listInteger, 'nested-list', [plain(integer, 'nested-argument')])]),
      typeAnnotations: [typeAnnotation('map'), typeAnnotation('key', [[3, 0]]),
        typeAnnotation('nested-list', [[3, 1]]), typeAnnotation('nested-argument', [[3, 1], [3, 0]])]
    }),
    component('matrix', '[[Ljava/lang/String;', null, 'java.lang.String[][]', C('java.lang.String[][]'), {
      annotated: array(C('java.lang.String[][]'), 'outer-array', array(C('java.lang.String[]'), 'inner-array', plain(string, 'element'))),
      typeAnnotations: [typeAnnotation('outer-array'), typeAnnotation('inner-array', [[0, 0]]),
        typeAnnotation('element', [[0, 0], [0, 0]])]
    }),
    component('array', '[Ljava/util/List;', '[' + listStringSignature, 'java.util.List[]', A(listString), {
      annotated: array(A(listString), 'generic-array', param(listString, 'generic-list', [plain(string, 'generic-argument')])),
      typeAnnotations: [typeAnnotation('generic-array'), typeAnnotation('generic-list', [[0, 0]]),
        typeAnnotation('generic-argument', [[0, 0], [3, 0]])]
    }),
    component('variable', 'Ljava/lang/Number;', 'TT;', 'java.lang.Number', V, {
      variable: true, bounds: variableBounds, annotated: annotatedVariable('variable-use'),
      typeAnnotations: [typeAnnotation('variable-use')]
    }),
    component('variableArray', '[Ljava/lang/Number;', '[TT;', 'java.lang.Number[]', A(V), {
      variable: true, annotated: array(A(V), 'variable-array', annotatedVariable('variable-element')),
      typeAnnotations: [typeAnnotation('variable-array'), typeAnnotation('variable-element', [[0, 0]])]
    }),
    component('upper', 'Ljava/util/List;', upperSignature, 'java.util.List', upper, {
      annotated: param(upper, undefined, [wildcard(W([number]), 'upper-wildcard', [plain(number, 'upper-bound')])]),
      typeAnnotations: [typeAnnotation('upper-wildcard', [[3, 0]]), typeAnnotation('upper-bound', [[3, 0], [2, 0]])]
    }),
    component('lower', 'Ljava/util/List;', lowerSignature, 'java.util.List', lower, {
      annotated: param(lower, undefined, [wildcard(W([object], [integer]), 'lower-wildcard', [plain(object)], [plain(integer, 'lower-bound')])]),
      typeAnnotations: [typeAnnotation('lower-wildcard', [[3, 0]]), typeAnnotation('lower-bound', [[3, 0], [2, 0]])]
    }),
    component('any', 'Ljava/util/List;', anySignature, 'java.util.List', any, {
      annotated: param(any, undefined, [wildcard(W([object]), 'unbounded-wildcard', [plain(object)])]),
      typeAnnotations: [typeAnnotation('unbounded-wildcard', [[3, 0]])]
    })
  ]},
  AnnotatedOwners: {fieldClass: 'AnnotatedOwnerFields', classSignature: null, components: [
    component('member', descriptor('Outer$Inner'), innerSignature, 'Outer$Inner', inner, {
      annotated: annotatedInner, typeAnnotations: [typeAnnotation('owner'),
        typeAnnotation('owner-argument', [[3, 0]]), typeAnnotation('inner', [[1, 0]]),
        typeAnnotation('inner-argument', [[1, 0], [3, 0]])]
    }),
    component('deep', descriptor('Outer$Middle$Leaf'), deepSignature, 'Outer$Middle$Leaf', leaf, {
      annotated: annotatedLeaf, typeAnnotations: [typeAnnotation('deep-owner'),
        typeAnnotation('deep-owner-argument', [[3, 0]]), typeAnnotation('middle', [[1, 0]]),
        typeAnnotation('middle-argument', [[1, 0], [3, 0]]), typeAnnotation('leaf', [[1, 0], [1, 0]]),
        typeAnnotation('leaf-argument', [[1, 0], [1, 0], [3, 0]])]
    }),
    component('statik', descriptor('Outer$StaticNested'), staticSignature, 'Outer$StaticNested', statik, {
      annotated: annotatedStatic, typeAnnotations: [typeAnnotation('static'), typeAnnotation('static-argument', [[3, 0]])]
    }),
    component('raw', descriptor('Outer$RawInner'), null, 'Outer$RawInner', C('Outer$RawInner'), {
      annotated: annotatedRaw, typeAnnotations: [typeAnnotation('raw-owner'), typeAnnotation('raw-inner', [[1, 0]])]
    })
  ]},
  ImplicitData: {fieldClass: 'ImplicitFields', classSignature: null, components: [
    component('values', 'Ljava/util/List;', listStringSignature, 'java.util.List', listString, {
      annotated: param(listString, 'implicit-type', [plain(string, 'implicit-argument')]),
      typeAnnotations: [typeAnnotation('implicit-type'), typeAnnotation('implicit-argument', [[3, 0]])],
      annotations: [declaration('ComponentTag', 'component-only'), declaration('Route', 'implicit-declaration')],
      fieldAnnotations: [declaration('Route', 'implicit-declaration')]
    })
  ]},
  ExplicitData: {fieldClass: 'ExplicitFields', classSignature: null, components: [
    component('values', 'Ljava/util/List;', listStringSignature, 'java.util.List', listString, {
      annotated: param(listString, 'component-type', [plain(string, 'component-argument')]),
      typeAnnotations: [typeAnnotation('component-type'), typeAnnotation('component-argument', [[3, 0]])],
      annotations: [declaration('ComponentTag', 'component-only'), declaration('Route', 'component-declaration')],
      fieldAnnotations: [declaration('Route', 'component-declaration')]
    })
  ]}
};

function metadata(value, field = false) {
  return {name: value.name, descriptor: value.descriptor, signature: value.signature,
    typeAnnotations: value.typeAnnotations || [],
    annotations: (field ? value.fieldAnnotations : value.annotations) || []};
}
function genericEvents(value) {
  const {name, raw, signature, shape, variable, bounds} = value;
  const events = [`${name}.raw=${raw}`, `${name}.signature=${signature}`, `${name}.record=${shape}`,
    `${name}.field=${shape}`, `${name}.equal=${!variable}`, `${name}.record-scope=true`, `${name}.field-scope=true`];
  if (bounds) events.push(`${name}.record-bounds=[${bounds.join(',')}]`, `${name}.field-bounds=[${bounds.join(',')}]`,
    `${name}.record-bound-scope=true`, `${name}.field-bound-scope=true`);
  return events;
}
function makeCase(id, entryMethod, recordName, selectedNames, {annotated = false, declaration = false, extra = []} = {}) {
  const record = records[recordName], values = selectedNames.map(name => record.components.find(value => value.name === name));
  const trace = values.flatMap(value => genericEvents(value).concat(annotated ? [
    `${value.name}.record-annotated=${value.annotated}`, `${value.name}.field-annotated=${value.annotated}`
  ] : []));
  trace.push(...extra);
  const anchors = {JLS: ['8.10', '8.10.1', '8.10.3', '4.4', '4.5'], JVMS: ['4.7.30', '4.7.9.1']};
  if (annotated) {
    anchors.JLS.push('9.7.4');
    anchors.JVMS.push('4.7.20', '4.7.20.2', '4.7.21');
  }
  if (declaration) anchors.JVMS.push('4.7.16', '4.7.18');
  return {id, entryMethod, entryDescriptor: '()V', trace, anchors,
    probes: [{method: declaration ? 'declarationPair' : annotated ? 'annotatedPair' : 'genericPair',
      descriptor: declaration ? '(Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Class;)V' :
        '(Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Class;Ljava/lang/String;)V',
      requiredOpcodes: ['invokevirtual']}],
    recordProofs: [{kind: 'components', className: binary(recordName), classSignature: record.classSignature,
      components: record.components.map(value => metadata(value))},
    ...values.map(value => ({kind: 'field', className: binary(record.fieldClass), ...metadata(value, true)}))]
  };
}

export default {
  id: 'record-types',
  source: 'classes/modern_fixture/JavaRecordTypes.java',
  mainClass,
  completionMarker: 'RECORD_TYPES_OK',
  recordClassNames: Object.keys(records).map(binary),
  cases: [
    makeCase('rt-raw-primitive', 'caseRawPrimitive', 'RawData', ['count']),
    makeCase('rt-raw-reference', 'caseRawReference', 'RawData', ['text']),
    makeCase('rt-raw-arrays', 'caseRawArrays', 'RawData', ['numbers', 'names']),
    makeCase('rt-parameterized', 'caseParameterized', 'ParameterizedData', ['strings']),
    makeCase('rt-nested-parameterized', 'caseNestedParameterized', 'ParameterizedData', ['nested']),
    makeCase('rt-wildcards', 'caseWildcards', 'ParameterizedData', ['upper', 'lower', 'any']),
    makeCase('rt-generic-array', 'caseGenericArray', 'ParameterizedData', ['array']),
    makeCase('rt-type-variable', 'caseTypeVariable', 'VariableData', ['item']),
    makeCase('rt-variable-arrays', 'caseVariableArrays', 'VariableData', ['array', 'matrix']),
    makeCase('rt-variable-arguments', 'caseVariableArguments', 'VariableData', ['list', 'wildcard']),
    makeCase('rt-variable-scope', 'caseVariableScope', 'ShadowOuter$Shadow', ['value'], {extra: ['value.outer-distinct=true']}),
    makeCase('rt-parameterized-owner', 'caseParameterizedOwner', 'OwnerData', ['member']),
    makeCase('rt-owner-forms', 'caseOwnerForms', 'OwnerData', ['deep', 'statik', 'raw']),
    makeCase('rt-annotated-scalar', 'caseAnnotatedScalar', 'AnnotatedData', ['scalar'], {annotated: true}),
    makeCase('rt-annotated-argument', 'caseAnnotatedArgument', 'AnnotatedData', ['list'], {annotated: true}),
    makeCase('rt-annotated-nested', 'caseAnnotatedNested', 'AnnotatedData', ['nested'], {annotated: true}),
    makeCase('rt-annotated-array', 'caseAnnotatedArray', 'AnnotatedData', ['matrix'], {annotated: true}),
    makeCase('rt-annotated-generic-array', 'caseAnnotatedGenericArray', 'AnnotatedData', ['array'], {annotated: true}),
    makeCase('rt-annotated-variable', 'caseAnnotatedVariable', 'AnnotatedData', ['variable'], {annotated: true}),
    makeCase('rt-annotated-variable-array', 'caseAnnotatedVariableArray', 'AnnotatedData', ['variableArray'], {annotated: true}),
    makeCase('rt-annotated-wildcard-upper', 'caseAnnotatedWildcardUpper', 'AnnotatedData', ['upper'], {annotated: true}),
    makeCase('rt-annotated-wildcard-lower', 'caseAnnotatedWildcardLower', 'AnnotatedData', ['lower'], {annotated: true}),
    makeCase('rt-annotated-wildcard-unbounded', 'caseAnnotatedWildcardUnbounded', 'AnnotatedData', ['any'], {annotated: true}),
    makeCase('rt-annotated-owner', 'caseAnnotatedOwner', 'AnnotatedOwners', ['member'], {annotated: true}),
    makeCase('rt-annotated-deep-owner', 'caseAnnotatedDeepOwner', 'AnnotatedOwners', ['deep'], {annotated: true}),
    makeCase('rt-annotated-static-owner', 'caseAnnotatedStaticOwner', 'AnnotatedOwners', ['statik'], {annotated: true}),
    makeCase('rt-annotated-raw-owner', 'caseAnnotatedRawOwner', 'AnnotatedOwners', ['raw'], {annotated: true}),
    makeCase('rt-implicit-annotations', 'caseImplicitAnnotations', 'ImplicitData', ['values'], {
      annotated: true, declaration: true, extra: [
        'values.component-declarations=[ComponentTag:component-only,Route:implicit-declaration]',
        'values.field-declarations=[Route:implicit-declaration]',
        'values.accessor-declarations=[Route:implicit-declaration]',
        `values.accessor-type=${records.ImplicitData.components[0].annotated}`,
        `values.constructor-type=${records.ImplicitData.components[0].annotated}`,
        'values.constructor-declarations=[Route:implicit-declaration]'
      ]
    }),
    makeCase('rt-explicit-annotations', 'caseExplicitAnnotations', 'ExplicitData', ['values'], {
      annotated: true, declaration: true, extra: [
        'values.component-declarations=[ComponentTag:component-only,Route:component-declaration]',
        'values.field-declarations=[Route:component-declaration]',
        'values.accessor-declarations=[Route:accessor-declaration]',
        `values.accessor-type=${param(listString, 'accessor-type', [plain(string, 'accessor-argument')])}`,
        `values.constructor-type=${records.ExplicitData.components[0].annotated}`,
        'values.constructor-declarations=[Route:component-declaration]'
      ]
    })
  ]
};
