'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before,after,test} = require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname,'..'), classlib = path.join(root,'classes/modern_classlib');
const units = new Map(), prefix = 'java/lang/classfile/', typePrefix = 'Ljava/lang/classfile/TypeAnnotation$';
const targets = ['TypeParameterTarget','SupertypeTarget','TypeParameterBoundTarget','EmptyTarget','FormalParameterTarget',
  'ThrowsTarget','LocalVarTarget','CatchTarget','OffsetTarget','TypeArgumentTarget'];
let temporary,output,receipt,decodeCoreCode;
function checked(command,args,cwd=root,timeout=60000) {
  const result = cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error)); assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-type-annotation-')); fs.chmodSync(temporary,0o700);
  output = path.join(temporary,'compiled'); const support = path.join(temporary,'support'); fs.mkdirSync(output); fs.mkdirSync(support);
  receipt = compileClassFileMetadata({root,classlib,output,support,checked});
  for (const relative of ['TypeAnnotation','DoppioTypeAnnotations',
    ...['TargetInfo','TargetType','LocalVarTargetInfo','TypePathComponent','TypePathComponent$Kind',...targets].map(value=>'TypeAnnotation$'+value),
    'DoppioTypeAnnotations$VariableValue','DoppioTypeAnnotations$OffsetValue','DoppioTypeAnnotations$ArgumentValue','DoppioTypeAnnotations$LocalValue']) {
    const filename = path.join(output,prefix,relative+'.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink()); const bytes=fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6),53,'Natural release9 type model output, not modified compiler/SDK bytes');
    units.set(relative,{bytes,layout:readStructureLayout(bytes)});
  }
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
function method(owner,name,descriptor) {
  const entries=units.get(owner).layout.methods.entries.filter(value=>value.name===name&&value.descriptor===descriptor);
  assert.equal(entries.length,1,owner+'.'+name+descriptor); return entries[0];
}
function instructions(owner,name,descriptor) {
  const unit=units.get(owner), entry=method(owner,name,descriptor); assert.ok(entry.code); assert.equal(entry.flags&0x100,0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,entry.code.instructionsOffset+entry.code.codeLength),unit.layout.pool,unit.bytes);
}
function interfaces(owner) {
  const {bytes,layout}=units.get(owner);
  return Array.from({length:layout.interfaceCount},(_,index)=>{
    const entry=layout.pool[bytes.readUInt16BE(layout.interfacesOffset+2*index)]; assert.equal(entry.tag,7); return layout.pool[entry.first].value;
  });
}
test('type annotations preserve exact native16 public type hierarchy without extra element markers',()=>{
  for(const owner of ['TypeAnnotation','TypeAnnotation$TargetInfo','TypeAnnotation$LocalVarTargetInfo','TypeAnnotation$TypePathComponent']) {
    assert.equal(units.get(owner).layout.flags,0x601); assert.deepEqual(interfaces(owner),[]);
  }
  for(const kind of targets) {
    assert.equal(units.get('TypeAnnotation$'+kind).layout.flags,0x601);
    assert.deepEqual(interfaces('TypeAnnotation$'+kind),[prefix+'TypeAnnotation$TargetInfo']);
  }
  for(const owner of ['TypeAnnotation$TargetType','TypeAnnotation$TypePathComponent$Kind']) assert.equal(units.get(owner).layout.flags,0x4031);
});
test('target and path enums expose exact numeric getters and native enum utility descriptors',()=>{
  for(const [owner,getters] of [['TypeAnnotation$TargetType',['targetTypeValue','sizeIfFixed']],['TypeAnnotation$TypePathComponent$Kind',['tag']]]) {
    for(const name of getters) {assert.equal(method(owner,name,'()I').flags,1); assert.ok(method(owner,name,'()I').code);}
    assert.equal(method(owner,'values','()[L'+prefix+owner+';').flags,9);
    assert.equal(method(owner,'valueOf','(Ljava/lang/String;)L'+prefix+owner+';').flags,9);
  }
  const constants=units.get('TypeAnnotation$TargetInfo').layout.fields.entries;
  assert.equal(constants.length,22);
  for(const entry of constants) {assert.ok(entry.name.startsWith('TARGET_')); assert.equal(entry.flags,0x19); assert.equal(entry.descriptor,'I');}
  assert.equal(method('TypeAnnotation$TargetInfo','targetType','()'+typePrefix+'TargetType;').flags,0x401);
  assert.equal(method('TypeAnnotation$TargetInfo','size','()I').flags,1);
  assert.ok(instructions('TypeAnnotation$TargetInfo','size','()I').some(value=>value.name==='invokevirtual'&&value.cp.name==='sizeIfFixed'));
});
test('all22 named target factories return their exact native typed target descriptor',()=>{
  const label='Ljava/lang/classfile/Label;', factories=[
    ['ofClassTypeParameter','I','TypeParameterTarget'],['ofMethodTypeParameter','I','TypeParameterTarget'],['ofClassExtends','I','SupertypeTarget'],
    ['ofClassTypeParameterBound','II','TypeParameterBoundTarget'],['ofMethodTypeParameterBound','II','TypeParameterBoundTarget'],
    ['ofField','','EmptyTarget'],['ofMethodReturn','','EmptyTarget'],['ofMethodReceiver','','EmptyTarget'],
    ['ofMethodFormalParameter','I','FormalParameterTarget'],['ofThrows','I','ThrowsTarget'],['ofLocalVariable','Ljava/util/List;','LocalVarTarget'],
    ['ofResourceVariable','Ljava/util/List;','LocalVarTarget'],['ofExceptionParameter','I','CatchTarget'],
    ...['ofInstanceofExpr','ofNewExpr','ofConstructorReference','ofMethodReference'].map(name=>[name,label,'OffsetTarget']),
    ...['ofCastExpr','ofConstructorInvocationTypeArgument','ofMethodInvocationTypeArgument','ofConstructorReferenceTypeArgument','ofMethodReferenceTypeArgument']
      .map(name=>[name,label+'I','TypeArgumentTarget'])];
  assert.equal(factories.length,22);
  for(const [name,parameters,result] of factories) {
    const descriptor='('+parameters+')'+typePrefix+result+';';
    assert.equal(method('TypeAnnotation$TargetInfo',name,descriptor).flags,9);
    assert.ok(instructions('TypeAnnotation$TargetInfo',name,descriptor).some(value=>value.name.startsWith('invoke')));
  }
});
test('generic target, local-row and type-path factories retain native parameter/getter shapes',()=>{
  const target=typePrefix+'TargetType;', label='Ljava/lang/classfile/Label;';
  for(const [name,parameters,result] of [['ofTypeParameter',target+'I','TypeParameterTarget'],['ofTypeParameterBound',target+'II','TypeParameterBoundTarget'],
    ['of',target,'EmptyTarget'],['ofVariable',target+'Ljava/util/List;','LocalVarTarget'],['ofOffset',target+label,'OffsetTarget'],
    ['ofTypeArgument',target+label+'I','TypeArgumentTarget']])
    assert.equal(method('TypeAnnotation$TargetInfo',name,'('+parameters+')'+typePrefix+result+';').flags,9);
  assert.equal(method('TypeAnnotation$LocalVarTargetInfo','of','('+label+label+'I)'+typePrefix+'LocalVarTargetInfo;').flags,9);
  const getters=[['TypeParameterTarget','typeParameterIndex','I'],['SupertypeTarget','supertypeIndex','I'],
    ['TypeParameterBoundTarget','typeParameterIndex','I'],['TypeParameterBoundTarget','boundIndex','I'],['FormalParameterTarget','formalParameterIndex','I'],
    ['ThrowsTarget','throwsTargetIndex','I'],['LocalVarTarget','table','Ljava/util/List;'],['CatchTarget','exceptionTableIndex','I'],
    ['OffsetTarget','target',label],['TypeArgumentTarget','target',label],['TypeArgumentTarget','typeArgumentIndex','I'],
    ['LocalVarTargetInfo','startLabel',label],['LocalVarTargetInfo','endLabel',label],['LocalVarTargetInfo','index','I'],
    ['TypePathComponent','typePathKind',typePrefix+'TypePathComponent$Kind;'],['TypePathComponent','typeArgumentIndex','I']];
  for(const [kind,name,result] of getters) assert.equal(method('TypeAnnotation$'+kind,name,'()'+result).flags,0x401);
  assert.equal(method('TypeAnnotation$TypePathComponent','of','('+typePrefix+'TypePathComponent$Kind;I)'+typePrefix+'TypePathComponent;').flags,9);
  for(const name of ['ARRAY','INNER_TYPE','WILDCARD']) {
    const field=units.get('TypeAnnotation$TypePathComponent').layout.fields.entries.find(value=>value.name===name);
    assert.equal(field.flags,0x19); assert.equal(field.descriptor,typePrefix+'TypePathComponent;');
  }
});
test('models have real label getters and dynamic local-target size without numeric placeholder carriers',()=>{
  assert.equal(method('TypeAnnotation','of','('+typePrefix+'TargetInfo;Ljava/util/List;Ljava/lang/classfile/Annotation;)Ljava/lang/classfile/TypeAnnotation;').flags,9);
  for(const [name,result] of [['targetInfo',typePrefix+'TargetInfo;'],['targetPath','Ljava/util/List;'],['annotation','Ljava/lang/classfile/Annotation;']])
    assert.equal(method('TypeAnnotation',name,'()'+result).flags,0x401);
  for(const [owner,name] of [['DoppioTypeAnnotations$OffsetValue','target'],['DoppioTypeAnnotations$ArgumentValue','target'],
    ['DoppioTypeAnnotations$LocalValue','startLabel'],['DoppioTypeAnnotations$LocalValue','endLabel']])
    assert.equal(method(owner,name,'()Ljava/lang/classfile/Label;').flags,1);
  assert.ok(instructions('DoppioTypeAnnotations$VariableValue','size','()I').some(value=>value.name==='invokeinterface'&&value.cp.owner==='java.util.List'&&value.cp.name==='size'));
});
test('all type-annotation sources remain in normal release9 phase without widening covariance exceptions',()=>{
  const [,narrow,normal]=receipt.operations;
  assert.deepEqual(normal.arguments.slice(0,4),['-J-Dfile.encoding=UTF8','--release','9','--patch-module']);
  for(const relative of ['java/lang/classfile/TypeAnnotation.java','java/lang/classfile/DoppioTypeAnnotations.java']) {
    assert.ok(normal.arguments.includes(path.join(classlib,relative))); assert.ok(!narrow.arguments.includes(path.join(classlib,relative)));
  }
  assert.equal(receipt.inputs.length,receipt.sourceHashes.length);
});
test('actual fresh guest executes all367 unchanged native type-target/path/factory/semantic import assertions',()=>{
  const diagnostic=path.join(temporary,'diagnostic'); fs.mkdirSync(diagnostic);
  // This unchanged native caller uses String's genuine post-9 ConstantDesc
  // parent in ldc(String). Keep natural target9 code against the real SDK,
  // without adding an overload, adapter, source rewrite or CP placeholder.
  checked('javac',['-source','9','-target','9','-implicit:none','--patch-module','java.base='+output+path.delimiter+path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileTypeAnnotationRegression.java')]);
  assert.equal(fs.readFileSync(path.join(diagnostic,'classes/modern_test/ClassFileTypeAnnotationRegression.class')).readUInt16BE(6),53);
  const result=runClassFileMetadataGuest({root,output,diagnostic,checked,className:'classes.modern_test.ClassFileTypeAnnotationRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/attribute']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'),'CLASSFILE_TYPE_ANNOTATION_REGRESSION_OK|367\n'); assert.equal(result.stderr,'');
});
