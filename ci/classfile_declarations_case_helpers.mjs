export function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const prefix='classes.modern_test.';
export const entry=(id,method,trace,callbackMethods,artifacts,probes)=>({id,entryMethod:method,entryDescriptor:'()V',trace:[trace],callbackMethods,artifacts,probes,
  oracleKind:'pinned-native-regression',anchors:{JVMS:['4.7.1','4.7.3','4.7.4','4.7.9','4.7.16','4.7.17','4.7.18','4.7.19','4.7.20','4.7.21','4.7.22','4.7.23','4.7.24','4.7.25','4.7.30','4.7.31']},
  primarySources:[
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/Signature.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassSignature.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/MethodSignature.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/Annotation.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/AnnotationValue.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/TypeAnnotation.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeBuilder.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassTransform.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/RecordAttribute.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/ModuleAttribute.html'],
  limitations:[
    'Finite selected C7d4 declaration/signature/annotation/type/record/module and builder/stateful-transform profile, not full C7.',
    'Untouched original javac25 -g -parameters sources, natural major69 compiler rows and independently host-produced public output arrays.',
    'Eligible arrays are defined and invoked in their own producer host; default interfaces, sealed metadata and module-info arrays are explicitly never defined.',
    'All recursive selected output metadata and actual Code/CP/labels/exception indices are proven; no opaque-copy annotation or native-output substitution claim.',
    'Native195 public-API sealing source/classfile/reflection topology and217 nominal facade ABI remain separate axes.',
    'No named-module runtime, full source-unit/API/verifier/stack-map/attribute/version/opcode or byte-for-byte native parity claim.'
  ]});
export const group=(id,name,completionMarker,additional,cases)=>freeze({id,source:'classes/modern_fixture/'+name+'.java',mainClass:prefix+name,completionMarker,
  releases:[25],javacFlags:['-g','-parameters'],additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames:[prefix+name,...additional.map(name=>prefix+name),prefix+'ClassFileSupport'],resourceClassNames:[],cases});
