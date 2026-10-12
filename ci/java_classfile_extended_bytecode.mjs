import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode, proveCoreGroup} from './java_core_bytecode.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const prefix = 'classes.modern_test.';
const support = prefix + 'ClassFileSupport';
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const cb=(name,descriptor,bootstrap=true)=>({name,descriptor,flags:10,bootstrap});
const builder='(Ljava/lang/classfile/ClassBuilder;)V',codeBuilder='(Ljava/lang/classfile/CodeBuilder;)V',fieldBuilder='(Ljava/lang/classfile/FieldBuilder;)V',
  methodBuilder='(Ljava/lang/classfile/MethodBuilder;)V',transform='(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V';
const input=(name,marker,callbacks,{nested=[],target=null}={})=>({
  source:'classes/modern_fixture/'+name+'.java',mainClass:prefix+name,completionMarker:marker,
  additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames:[prefix+name,...nested.map(suffix=>prefix+name+'$'+suffix),...(target?[prefix+target]:[]),support],
  javacFlags:['-g:source'],resourceClassNames:target?[prefix+target]:[],callbacks,
  codecs:nested.filter(suffix=>suffix.endsWith('Mapper')).flatMap(suffix=>{
    const attribute=suffix==='ProbeMapper'?'ProbeAttribute':'ReferenceAttribute',owner=prefix+name+'$'+suffix;
    const type='Lclasses/modern_test/'+name+'$'+attribute+';';
    return [{owner,name:'readAttribute',descriptor:'(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)'+type,flags:1},
      {owner,name:'writeAttribute',descriptor:'(Ljava/lang/classfile/BufWriter;'+type+')V',flags:1}];
  }),
  resource:target?{method:'model',descriptor:'()Ljava/lang/classfile/ClassModel;',name:target+'.class',target:prefix+target}:null
});
// Mandatory original source and named javac bootstrap callback inventory.
// These are fixed independently of any selected host's results.
export const classFileInputContracts=freeze({
  'classfile-attributes':input('ClassFileAttributesFinal','CLASSFILE_ATTRIBUTES_OK',[
    ...['Constants','Signatures','Exceptions','NestHost','NestMembers','Stateless','Reference','ProcessingSource'].map(name=>cb('build'+name,builder)),
    ...['Int','Long','Float','Double','String','Signature'].map(name=>cb('field'+name,fieldBuilder)),
    ...['Signature','Exceptions'].map(name=>cb('method'+name,methodBuilder)),
    ...['Value','Identity'].map(name=>cb('code'+name,codeBuilder)),
    cb('copyElement',transform),cb('mapper','(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/AttributeMapper;'),
    cb('methodValue',builder,false)
  ],{nested:['ProbeAttribute','ProbeMapper']}),
  'classfile-bootstrap':input('ClassFileBootstrapFinal','CLASSFILE_BOOTSTRAP_OK',[
    ...['Handles','BootstrapArguments','Null','Int','Wide','IndyEntry','IndyNominal'].map(name=>cb('build'+name,builder)),
    ...['Handle','Type','Value','Null','Int','Long','Double','IndyEntry','IndyNominal'].map(name=>cb('code'+name,codeBuilder)),cb('flags',builder,false)
  ],{target:'ClassFileBootstrapTarget'}),
  'classfile-poolremap':input('ClassFilePoolRemapFinal','CLASSFILE_POOL_REMAP_OK',[
    ...['copyClass','widenClass','seedBootstrap'].map(name=>cb(name,transform)),
    ...['UnusedSource','ForeignMember','WideImports','ReferenceSource'].map(name=>cb('build'+name,builder)),
    ...['Value','ForeignMember','WideLong','WideDouble'].map(name=>cb('code'+name,codeBuilder)),
    cb('fieldValue',fieldBuilder),cb('mapper','(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/AttributeMapper;')
  ],{nested:['ReferenceAttribute','ReferenceMapper'],target:'ClassFilePoolRemapTarget'})
});
const method=(name,descriptor,code,nativeOpcodes,{flags=9,frames=[],handlers=[],maxStack=1,maxLocals=0,metadata={}}={})=>
  ({name,descriptor,flags,code,nativeOpcodes,frames,handlers,maxStack,maxLocals,metadata});
const field=(name,descriptor,value)=>({name,descriptor,flags:25,metadata:{ConstantValue:value}});
const value=(number=17)=>method('value','()I',['int:'+number,'ireturn'],['bipush','ireturn']);
const frame=(target,locals,stack=[])=>({target,locals,stack}),I='INTEGER',D='DOUBLE';
const generated=(id,name,methods,{origin='public-build',flags=33,fields=[],metadata={},bootstraps=[],sourceFile=null,extra={}}={})=>({
  id,className:prefix+name,origin,flags,fields,methods,sourceFile,definition:'define-and-invoke',metadata,bootstraps,extra,
  branches:methods.some(m=>m.code.some(op=>/^(?:if|goto|table|lookup)/.test(op))),handlers:methods.some(m=>m.handlers.length>0)
});
const descriptorNull='(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;';
const descriptorCast='(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Object;)Ljava/lang/Object;';
const descriptorConcat='(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;';
const cp=(tag,value)=>({tag,value}),handle=(owner,name,descriptor)=>({tag:15,referenceKind:6,reference:{tag:10,owner,name,descriptor}});
const nullHandle=handle('java.lang.invoke.ConstantBootstraps','nullConstant',descriptorNull);
const castHandle=handle('java.lang.invoke.ConstantBootstraps','explicitCast',descriptorCast);
const concatHandle=handle('java.lang.invoke.StringConcatFactory','makeConcatWithConstants',descriptorConcat);
const bsm=(method,arguments_=[])=>({method,arguments:arguments_});
const originalFields=[field('I','I',cp(3,7)),field('W','J',cp(5,'9000000000'))];
const originalMethods=(wide=false,index=0)=>[
  method('<init>','()V',['aload:0','invokespecial:java.lang.Object#<init>()V','return'],['aload_0','invokespecial','return'],{flags:0,maxLocals:1}),
  method('choose','(I)Ljava/lang/String;',['iload:0','ifne:4','string:zero','areturn','string:kept','areturn'],
    ['iload_0','ifne',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn'],{maxLocals:1,frames:[frame(4,[I])]}),
  method('dense','(I)Ljava/lang/String;',['iload:0','tableswitch:1..3;default=8;cases=1:2,2:4,3:6','string:one','areturn','string:two','areturn','string:three','areturn','string:other','areturn'],
    ['iload_0','tableswitch',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn'],
    {maxLocals:1,frames:[frame(2,[I]),frame(4,[I]),frame(6,[I]),frame(8,[I])]}),
  method('concat','(I)Ljava/lang/String;',['iload:0','invokedynamic:makeConcatWithConstants(I)Ljava/lang/String;@'+index,'areturn'],['iload_0','invokedynamic','areturn'],{maxLocals:1}),
  method('wide','()J',['long:9000000000','lreturn'],['ldc2_w','lreturn'],{maxStack:2})
];
const sourceFile='ClassFilePoolRemapFinal.java',originalMetadata={
  Signature:'<T:Ljava/lang/Object;>Ljava/lang/Object;',SourceFile:sourceFile,
  InnerClasses:[{innerClass:'java.lang.invoke.MethodHandles$Lookup',outerClass:'java.lang.invoke.MethodHandles',innerName:'Lookup',flags:25}]
};
const original=(id,name,{wide=false,reindex=false}={})=>generated(id,name,originalMethods(wide,reindex?1:0),{
  origin:'public-transform',flags:48,fields:originalFields,metadata:originalMetadata,sourceFile,
  bootstraps:[...(reindex?[bsm(nullHandle)]:[]),bsm(concatHandle,[cp(8,'pool=\u0001')])],extra:wide?{prefilledStrings:300}:{}
});
export const classFileArtifactContracts=freeze({
  'cf-attributes-constant-values':[generated('attributes-constants','C7cConstants',[value()],{fields:[
    field('I','I',cp(3,42)),field('J','J',cp(5,'9000000000')),field('F','F',cp(4,1.25)),field('D','D',cp(6,2.5)),field('S','Ljava/lang/String;',cp(8,'C7c'))]})],
  'cf-attributes-signatures':[generated('attributes-signatures','C7cSignatures',[
    method('identity','(Ljava/lang/Object;)Ljava/lang/Object;',['aload:0','areturn'],['aload_0','areturn'],{maxLocals:1,metadata:{Signature:'<U:Ljava/lang/Object;>(TU;)TU;'}})],{
    fields:[{name:'items',descriptor:'Ljava/util/List;',flags:9,metadata:{Signature:'Ljava/util/List<TT;>;'}}],metadata:{Signature:'<T:Ljava/lang/Object;>Ljava/lang/Object;'}})],
  'cf-attributes-exceptions':[generated('attributes-exceptions','C7cExceptions',[{...value(),metadata:{Exceptions:['java.io.IOException','java.lang.ReflectiveOperationException']}}])],
  'cf-attributes-nest-host':[generated('attributes-nest-host','C7cNestHost',[value()],{metadata:{NestHost:'classes.modern_test.C7cExternalHost'}})],
  'cf-attributes-nest-members':[generated('attributes-nest-members','C7cNestMembers',[value()],{metadata:{NestMembers:['classes.modern_test.C7cMemberA','classes.modern_test.C7cMemberB']}})],
  'cf-attributes-custom-stateless':[generated('attributes-stateless','C7cStateless',[value()],{metadata:{C7cStateless:{value:37}}})],
  'cf-attributes-custom-reference':[generated('attributes-reference','C7cReference',[value()],{metadata:{C7cReference:{value:53,reference:cp(8,'attribute-reference')}}})],
  'cf-attributes-processing-options':[generated('attributes-processing','C7cProcessing',[value()],{origin:'public-transform'})],
  'cf-bootstrap-handle-type':[generated('bootstrap-handles','C7cHandles',[
    method('handle','()Ljava/lang/invoke/MethodHandle;',['handle:6:java.lang.Math#abs(I)I','areturn'],['ldc','areturn']),
    method('type','()Ljava/lang/invoke/MethodType;',['type:(I)I','areturn'],['ldc','areturn'])])],
  'cf-bootstrap-arguments-dedup':[generated('bootstrap-arguments','C7cBootstrapArguments',[value()],{bootstraps:[bsm(castHandle,[
    cp(8,'bootstrap-text'),cp(3,7),cp(5,'11'),cp(6,2.5),{tag:16,descriptor:'()I'},cp(7,'java.lang.String'),castHandle])]})],
  'cf-bootstrap-condy-null':[generated('bootstrap-condy-null','C7cCondyNull',[
    method('value','()Ljava/lang/String;',['condy:nullValue:Ljava/lang/String;@0','areturn'],['ldc','areturn'])],{bootstraps:[bsm(nullHandle)]})],
  'cf-bootstrap-condy-int':[generated('bootstrap-condy-int','C7cCondyInt',[
    method('value','()I',['condy:integerValue:I@0','ireturn'],['ldc','ireturn'])],{bootstraps:[bsm(castHandle,[cp(3,42)])]})],
  'cf-bootstrap-condy-wide':[generated('bootstrap-condy-wide','C7cCondyWide',[
    method('longValue','()J',['condy:longValue:J@0','lreturn'],['ldc2_w','lreturn'],{maxStack:2}),
    method('doubleValue','()D',['condy:doubleValue:D@1','dreturn'],['ldc2_w','dreturn'],{maxStack:2})],
    {bootstraps:[bsm(castHandle,[cp(5,'9000000000')]),bsm(castHandle,[cp(6,3.5)])]})],
  'cf-bootstrap-invokedynamic-entry':[generated('bootstrap-indy-entry','C7cIndyEntry',[
    method('concat','(I)Ljava/lang/String;',['iload:0','invokedynamic:makeConcatWithConstants(I)Ljava/lang/String;@0','areturn'],['iload_0','invokedynamic','areturn'],{maxLocals:1})],
    {bootstraps:[bsm(concatHandle,[cp(8,'v=\u0001')])]})],
  'cf-bootstrap-invokedynamic-nominal':[generated('bootstrap-indy-nominal','C7cIndyNominal',[
    method('concat','(I)Ljava/lang/String;',['iload:0','invokedynamic:makeConcatWithConstants(I)Ljava/lang/String;@0','areturn'],['iload_0','invokedynamic','areturn'],{maxLocals:1})],
    {bootstraps:[bsm(concatHandle,[cp(8,'nom=\u0001')])]})],
  'cf-bootstrap-original-typed':[],
  'cf-pool-original-fresh':[original('pool-original','C7cFreshOriginal')],
  'cf-pool-ldc-widening':[original('pool-widening','C7cWideOriginal',{wide:true})],
  'cf-pool-unused-dropped':[generated('pool-unused','C7cUnusedDropped',[value(23)],{origin:'public-transform',extra:{unusedStringsDropped:true}})],
  'cf-pool-foreign-member':[generated('pool-foreign-member','C7cForeignMember',[
    method('read','()I',['getstatic:classes.modern_test.C7cForeignMember#valueI','ireturn'],['getstatic','ireturn'])],{fields:[field('value','I',cp(3,44))]})],
  'cf-pool-wide-imports':[generated('pool-wide-imports','C7cWideImports',[
    method('longValue','()J',['long:1234567890123','lreturn'],['ldc2_w','lreturn'],{maxStack:2}),
    method('doubleValue','(I)D',['iload:0','ifeq:4','double:1.25','goto:5','double:2.5','dreturn'],
      ['iload_0','ifeq','ldc2_w','goto','ldc2_w','dreturn'],{maxStack:2,maxLocals:1,frames:[frame(4,[I]),frame(5,[I],[D])]})])],
  'cf-pool-custom-reference-remap':[generated('pool-reference-remap','C7cReferenceRemapped',[value(23)],{
    origin:'public-transform',metadata:{C7cPoolReference:cp(8,'remapped-reference')},extra:{smallCustomReferenceIndex:true}})],
  'cf-pool-bootstrap-reindex':[original('pool-bootstrap-reindex','C7cBootstrapReindexed',{reindex:true})],
  'cf-pool-index-validation':[]
});

function decodeClass(bytes, file = null) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 10 && bytes.length <= 256 * 1024, 'Bounded complete class bytes');
  const layout = readStructureLayout(bytes), pool = layout.pool;
  const utf = index => {assert.equal(pool[index]?.tag, 1); return pool[index].value;};
  const cls = index => {assert.equal(pool[index]?.tag, 7); return utf(pool[index].first).replaceAll('/', '.');};
  const constant = index => {
    const entry = pool[index]; assert.ok(entry);
    const item = {index, tag: entry.tag};
    if (entry.tag === 1) item.value = entry.value;
    else if (entry.tag === 7) item.value = cls(index);
    else if (entry.tag === 8) item.value = utf(entry.first);
    else if (entry.tag === 3) item.value = bytes.readInt32BE(entry.start + 1);
    else if (entry.tag === 4) item.value = bytes.readFloatBE(entry.start + 1);
    else if (entry.tag === 5) item.value = bytes.readBigInt64BE(entry.start + 1).toString();
    else if (entry.tag === 6) item.value = bytes.readDoubleBE(entry.start + 1);
    else if (entry.tag === 16) item.descriptor = utf(entry.first);
    else if ([9, 10, 11].includes(entry.tag)) {
      const nt = pool[entry.second]; assert.equal(nt?.tag, 12);
      Object.assign(item, {owner: cls(entry.first), name: utf(nt.first), descriptor: utf(nt.second)});
    } else if (entry.tag === 15) {
      item.referenceKind = bytes[entry.start + 1]; item.reference = constant(bytes.readUInt16BE(entry.start + 2));
    } else if ([17, 18].includes(entry.tag)) {
      const nt = pool[entry.second]; assert.equal(nt?.tag, 12);
      Object.assign(item, {bootstrapIndex: entry.first, name: utf(nt.first), descriptor: utf(nt.second)});
    }
    return item;
  };
  const attrs = entries => entries.map(attr => ({name: attr.name, length: attr.length,
    bodyHex: bytes.subarray(attr.body, attr.end).toString('hex')}));
  const methods = layout.methods.entries.map(method => {
    const item = {name: method.name, descriptor: method.descriptor, flags: method.flags, attributes: attrs(method.attributes.entries)};
    if (method.code) {
      const code = method.code, raw = bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength);
      const handlers = [];
      for (let n = 0; n < code.handlerCount; n++) {
        const at = code.handlersOffset + n * 8, catchIndex = bytes.readUInt16BE(at + 6);
        handlers.push({start: bytes.readUInt16BE(at), end: bytes.readUInt16BE(at + 2), target: bytes.readUInt16BE(at + 4),
          catchType: catchIndex ? cls(catchIndex) : null});
      }
      Object.assign(item, {codeHex: raw.toString('hex'), codeSha256: sha(raw), codeLength: raw.length,
        maxStack: code.maxStack, maxLocals: code.maxLocals, instructions: decodeCoreCode(raw, pool, bytes), handlers,
        codeAttributes: attrs(code.attributes.entries)});
      item.stackMapFrames = decodeStackMaps(item, cls(layout.thisClass), constant);
    }
    return item;
  });
  const bootstrapMethods = [];
  const attribute = layout.attributes.entries.find(attr => attr.name === 'BootstrapMethods');
  if (attribute) {
    let at = attribute.body;
    const u2 = () => {assert.ok(at + 2 <= attribute.end); const value = bytes.readUInt16BE(at); at += 2; return value;};
    const count = u2();
    for (let n = 0; n < count; n++) {
      const method = constant(u2()); assert.equal(method.tag, 15); const length = u2(), args = [];
      for (let p = 0; p < length; p++) args.push(constant(u2()));
      bootstrapMethods.push({index: n, method, arguments: args});
    }
    assert.equal(at, attribute.end);
  }
  const className = cls(layout.thisClass);
  if (file) {
    assert.equal(file.path, className.replaceAll('.', '/') + '.class'); assert.equal(file.sha256, sha(bytes)); assert.equal(file.size, bytes.length);
    assert.equal(file.major, bytes.readUInt16BE(6)); assert.equal(file.minor, bytes.readUInt16BE(4));
  }
  return {className, classFile: file, size: bytes.length, sha256: sha(bytes), originalBytesBase64: bytes.toString('base64'),
    major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4), flags: layout.flags, originalThisClassIndex: layout.thisClass,
    superclass: bytes.readUInt16BE(layout.superClassOffset) ? cls(bytes.readUInt16BE(layout.superClassOffset)) : null,
    interfaces: Array.from({length: layout.interfaceCount}, (_, n) => cls(bytes.readUInt16BE(layout.interfacesOffset + n * 2))),
    fields: layout.fields.entries.map(field => ({name: field.name, descriptor: field.descriptor, flags: field.flags, attributes: attrs(field.attributes.entries)})),
    methods, attributes: attrs(layout.attributes.entries), bootstrapMethods,
    constants: pool.filter(Boolean).map(entry => constant(entry.index))};
}

function localIndex(instruction, kind) {
  if (instruction.name === kind || instruction.modifiedOpcode === kind) return instruction.localIndex;
  const match = instruction.name.match(new RegExp('^' + kind + '_([0-3])$')); return match ? Number(match[1]) : null;
}

function canonicalOperation(instruction) {
  const name = instruction.name;
  for (const kind of ['iload', 'lload', 'fload', 'dload', 'aload', 'istore', 'lstore', 'fstore', 'dstore', 'astore']) {
    const index = localIndex(instruction, kind); if (index !== null) return kind + ':' + index;
  }
  if (/^iconst_(?:m1|[0-5])$/.test(name)) return 'int:' + (name === 'iconst_m1' ? -1 : Number(name.at(-1)));
  if (['bipush', 'sipush'].includes(name)) return 'int:' + instruction.value;
  if (/^[lfd]const_[0-2]$/.test(name)) return ({l: 'long', f: 'float', d: 'double'})[name[0]] + ':' + name.at(-1);
  if (['ldc', 'ldc_w', 'ldc2_w'].includes(name)) {
    if(instruction.cp?.tag===15)return 'handle:'+instruction.cp.referenceKind+':'+instruction.cp.reference.owner+'#'+instruction.cp.reference.name+instruction.cp.reference.descriptor;
    if(instruction.cp?.tag===16)return 'type:'+instruction.cp.descriptor;
    if(instruction.cp?.tag===17)return 'condy:'+instruction.cp.name+':'+instruction.cp.descriptor+'@'+instruction.cp.bootstrapIndex;
    const type = {3: 'int', 4: 'float', 5: 'long', 6: 'double', 8: 'string'}[instruction.cp?.tag];
    assert.ok(type, 'Selected literal constant category'); return type + ':' + instruction.cp.value;
  }
  if(instruction.name==='invokedynamic'){assert.equal(instruction.cp?.tag,18);return 'invokedynamic:'+instruction.cp.name+instruction.cp.descriptor+'@'+instruction.cp.bootstrapIndex;}
  if (instruction.cp && [9, 10, 11].includes(instruction.cp.tag))
    return name + ':' + instruction.cp.owner + '#' + instruction.cp.name + instruction.cp.descriptor;
  assert.ok(!instruction.cp, 'No ignored generated symbolic operand'); return name;
}

function returnedArrayRoute(entry, group, classes, contract) {
  const owner = classes.find(item => item.className === group.mainClass);
  const body = owner.methods.find(method => method.name === entry.entryMethod && method.descriptor === entry.entryDescriptor);
  assert.ok(body?.instructions);
  const instructions = body.instructions;
  const producers = instructions.filter(ins => ins.cp?.owner === 'java.lang.classfile.ClassFile' &&
    ins.cp.name === (contract.origin === 'public-transform' ? 'transformClass' : 'build') && ins.cp.descriptor.endsWith('[B'));
  assert.equal(producers.length, 1, 'One selected public returned-byte producer in the original case');
  const producerIndex = instructions.indexOf(producers[0]), store = instructions[producerIndex + 1];
  const byteArrayLocal = localIndex(store, 'astore'); assert.notEqual(byteArrayLocal, null, 'Actual returned array stored in a local');
  assert.equal(instructions.filter(ins => localIndex(ins, 'astore') === byteArrayLocal).length, 1, 'No replacement byte array in that local');
  // The genuine cases also construct Class<?>[] and Option[] arguments.
  // Their aastore is not a byte[] mutation; the typed returned [B local can
  // only be changed by bastore, which is excluded after its producer.
  assert.ok(!instructions.slice(producerIndex + 2).some(ins => ins.name === 'bastore'), 'No rewriting selected returned class bytes');
  const transportIndex = instructions.findIndex(ins => ins.cp?.owner === support && ins.cp.name === 'artifact' &&
    ins.cp.descriptor === '(Ljava/lang/String;Ljava/lang/String;[B)V');
  assert.ok(transportIndex > producerIndex + 2, 'Artifact comes after actual public returned-byte operation');
  assert.equal(instructions[transportIndex - 3].cp?.value, entry.id); assert.equal(instructions[transportIndex - 3].cp?.tag, 8);
  assert.equal(instructions[transportIndex - 2].cp?.value, contract.id); assert.equal(instructions[transportIndex - 2].cp?.tag, 8);
  assert.equal(localIndex(instructions[transportIndex - 1], 'aload'), byteArrayLocal, 'Transport uses actual returned array local');
  const definitions = instructions.filter(ins => ins.cp?.owner === 'java.lang.invoke.MethodHandles$Lookup' &&
    ins.cp.name === 'defineClass' && ins.cp.descriptor === '([B)Ljava/lang/Class;');
  let definition = null;
  if (contract.definition === 'forbidden') assert.deepEqual(definitions, [], 'Typed-invalid output is never defined');
  else {
    assert.equal(definitions.length, 1); const index = instructions.indexOf(definitions[0]);
    assert.ok(index > transportIndex); assert.equal(localIndex(instructions[index - 1], 'aload'), byteArrayLocal,
      'Same original case defines the exact public returned byte-array local');
    definition = definitions[0];
    if (contract.definition === 'define-and-invoke') assert.ok(instructions.slice(index + 1).some(ins =>
      ins.cp?.owner === 'java.lang.invoke.MethodHandle' && ['invoke', 'invokeExact'].includes(ins.cp.name)),
    'Original case actually invokes a held method handle after same-JVM definition');
  }
  return {caseId: entry.id, artifactId: contract.id, originalClassFile: owner.classFile,
    originalCaseCodeSha256: body.codeSha256, producer: producers[0], byteArrayLocal, transport: instructions[transportIndex], definition,
    sameLocalStaticBindingProven: true, dynamicBranchCoverageProven: false, generalDataFlowConformanceProven: false};
}

function inputProof(group, classes) {
  const expected = classFileInputContracts[group.id]; assert.ok(expected);
  const classPath=name=>name.replaceAll('.','/')+'.class';
  assert.deepEqual(classes.map(item => item.className), expected.driverClassNames.slice().sort((a,b)=>classPath(a)<classPath(b)?-1:classPath(a)>classPath(b)?1:0));
  for (const item of classes) {
    assert.equal(item.major,69);assert.equal(item.minor,0);
    const attributeClass=/\$(?:Probe|Reference)Attribute$/.test(item.className);
    assert.equal(item.superclass,attributeClass?'java.lang.classfile.CustomAttribute':'java.lang.Object');
    assert.equal(item.flags,item.className.endsWith('Target')?48:49);
    assert.equal(new Set(item.methods.map(method => method.name + method.descriptor)).size, item.methods.length);
  }
  const owner = classes.find(item => item.className === group.mainClass);
  const callbackProofs = expected.callbacks.map(callback => {
    const method = owner.methods.find(item => item.name === callback.name && item.descriptor === callback.descriptor);
    assert.ok(method?.instructions); assert.equal(method.flags, callback.flags);
    const bindings = owner.bootstrapMethods.filter(item => item.arguments.some(argument => argument.tag === 15 &&
      argument.referenceKind === 6 && argument.reference?.owner === group.mainClass &&
      argument.reference.name === callback.name && argument.reference.descriptor === callback.descriptor));
    if (callback.bootstrap) assert.ok(bindings.length > 0, 'Named callback has a real original bootstrap implementation handle');
    else {
      assert.deepEqual(bindings, [], 'Shared named helper is a direct method, not an opaque factory callback');
      assert.ok(owner.methods.some(body => body.instructions?.some(ins => ins.cp?.owner === group.mainClass &&
        ins.cp.name === callback.name && ins.cp.descriptor === callback.descriptor)), 'Original wrappers directly invoke selected named helper');
    }
    for (const binding of bindings) assert.ok(binding.method.referenceKind === 6 &&
      binding.method.reference?.owner === 'java.lang.invoke.LambdaMetafactory' && binding.method.reference.name === 'metafactory');
    return {...callback, originalClassFile: owner.classFile, codeSha256: method.codeSha256, codeHex: method.codeHex,
      instructions: method.instructions, bootstrapBindings: bindings, callbackExecutionCoverageProven: false};
  });
  const utility = classes.find(item => item.className === support);
  const bytesMethod = utility.methods.find(item => item.name === 'bytes' && item.descriptor === '(Ljava/lang/Class;Ljava/lang/String;)[B');
  const artifactMethod = utility.methods.find(item => item.name === 'artifact' && item.descriptor === '(Ljava/lang/String;Ljava/lang/String;[B)V');
  assert.ok(bytesMethod?.instructions && artifactMethod?.instructions);
  assert.ok(bytesMethod.instructions.some(ins => ins.cp?.owner === 'java.lang.Class' && ins.cp.name === 'getResourceAsStream' &&
    ins.cp.descriptor === '(Ljava/lang/String;)Ljava/io/InputStream;'));
  assert.ok(bytesMethod.instructions.some(ins => ins.cp?.owner === 'java.io.InputStream' && ins.cp.name === 'readAllBytes' && ins.cp.descriptor === '()[B'));
  assert.ok(artifactMethod.instructions.some(ins => ins.cp?.owner === 'java.util.Base64$Encoder' &&
    ins.cp.name === 'encodeToString' && ins.cp.descriptor === '([B)Ljava/lang/String;'));
  const encodedArray = artifactMethod.instructions.findIndex(ins => ins.cp?.owner === 'java.util.Base64$Encoder' &&
    ins.cp.name === 'encodeToString' && ins.cp.descriptor === '([B)Ljava/lang/String;');
  assert.equal(localIndex(artifactMethod.instructions[encodedArray - 1], 'aload'), 2,
    'Artifact helper encodes its actual byte[] parameter, not precomputed native bytes');
  let resourceProof = null;
  if (expected.resource) {
    const body = owner.methods.find(method => method.name === expected.resource.method && method.descriptor === expected.resource.descriptor);
    assert.ok(body?.instructions);
    const at = body.instructions.findIndex((ins, i) => ins.cp?.tag === 7 && ins.cp.value === group.mainClass &&
      body.instructions[i + 1]?.cp?.tag === 8 && body.instructions[i + 1].cp.value === expected.resource.name &&
      body.instructions[i + 2]?.cp?.owner === support && body.instructions[i + 2].cp.name === 'bytes' &&
      body.instructions[i + 2].cp.descriptor === '(Ljava/lang/Class;Ljava/lang/String;)[B');
    assert.ok(at >= 0, 'Original anchor and literal resource use the unchanged reader');
    resourceProof = {...expected.resource, targetClassFile: classes.find(item => item.className === expected.resource.target).classFile,
      originalClassFile: owner.classFile, codeSha256: body.codeSha256, codeHex: body.codeHex, resourceInstructionIndex: at,
      instructions: body.instructions, runtimePath: expected.resource.target.replaceAll('.', '/') + '.class'};
  }
  const map = new Map(classes.map(item => [item.className, {file: item.classFile,
    methods: new Map(item.methods.filter(method => method.instructions).map(method => [method.name + method.descriptor, method]))}]));
  const caseProofs = proveCoreGroup(group, map).map(proof => ({...proof, fullSourceUnitConformanceProven: false}));
  const codecProofs=expected.codecs.map(codec=>{
    const clazz=classes.find(item=>item.className===codec.owner);
    assert.deepEqual(clazz.interfaces,['java.lang.classfile.AttributeMapper']);
    const method=clazz.methods.find(item=>item.name===codec.name&&item.descriptor===codec.descriptor);assert.ok(method?.instructions);assert.equal(method.flags,codec.flags);
    return {...codec,originalClassFile:clazz.classFile,codeSha256:method.codeSha256,codeHex:method.codeHex,instructions:method.instructions,mapperDispatchExecutionCoverageProven:false};
  });
  const caseCallbackProofs = group.cases.map(entry => ({id: entry.id, probes: entry.callbackMethods.map(probe => {
    const probeOwner=probe.className||group.mainClass;
    assert.ok(probeOwner===group.mainClass?expected.callbacks.some(callback=>callback.name===probe.method&&callback.descriptor===probe.descriptor):
      expected.codecs.some(codec=>codec.owner===probeOwner&&codec.name===probe.method&&codec.descriptor===probe.descriptor),'Independently selected named callback or mapper codec signature');
    const clazz=classes.find(item=>item.className===probeOwner);
    const method = clazz.methods.find(item => item.name === probe.method && item.descriptor === probe.descriptor);
    const matches = [];
    for (const opcode of probe.requiredOpcodes) {
      const found = method.instructions.find(ins => ins.name === opcode || ins.modifiedOpcode === opcode);
      assert.ok(found, 'Actual selected callback opcode'); matches.push(found);
    }
    for (const operand of probe.symbolicOperands || []) {
      const keys = operand.tag === 7 ? ['value'] : ['owner', 'name', 'descriptor'];
      const found = method.instructions.find(ins => ins.name === operand.opcode && ins.cp?.tag === operand.tag &&
        keys.every(key => ins.cp[key] === operand[key]));
      assert.ok(found, 'Actual exact callback public method/field operand '+probe.method+' '+JSON.stringify(operand)); matches.push(found);
    }
    return {owner: probeOwner, method: probe.method, descriptor: probe.descriptor, originalClassFile: clazz.classFile,
      codeSha256: method.codeSha256, matches, opaqueCallbackStaticReachabilityProven: false};
  })}));
  const returnedArrayRoutes = group.cases.flatMap(entry => classFileArtifactContracts[entry.id].map(contract => returnedArrayRoute(entry, group, classes, contract)));
  return {schemaVersion: 1, group: group.id, classes, caseProofs, callbackProofs, codecProofs, caseCallbackProofs, resourceProof, returnedArrayRoutes,
    compilerBytesTransformed: false, generatedArtifactsAreCompilerInputs: false, dynamicBranchCoverageProven: false,
    opaqueCallbackStaticReachabilityProven: false, fullSourceUnitConformanceProven: false, fullPublicClassFileApiConformanceProven: false};
}

export function proveClassFileInputGroup(group, directory, classFiles) {
  const classes = classFiles.map(file => decodeClass(fs.readFileSync(path.join(directory, file.path)), file));
  return inputProof(group, classes);
}

export function assertClassFileInputProofs(record, group) {
  assert.equal(record.release, 25); const proof = record.inputProofs;
  assert.ok(proof && Array.isArray(proof.classes));
  assert.deepEqual(proof.classes.map(item => item.classFile), record.classFiles);
  const classes = proof.classes.map(item => {
    assert.ok(typeof item.originalBytesBase64 === 'string'); const bytes = Buffer.from(item.originalBytesBase64, 'base64');
    assert.equal(bytes.toString('base64'), item.originalBytesBase64); return decodeClass(bytes, item.classFile);
  });
  assert.deepEqual(proof, inputProof(group, classes), 'Every original byte, Code/callback/resource/returned-array claim independently replays');
}

// Evidence reader only: never supplies or substitutes guest public API class bytes.
function methodInitialLocals(method, className) {
  const locals=(method.flags&8)?[]:[method.name==='<init>'?'UNINITIALIZED_THIS':'Object:'+className];
  const descriptor=method.descriptor; assert.equal(descriptor[0],'(');
  for(let at=1;descriptor[at]!==')';) {
    const first=descriptor[at++]; assert.ok(first);
    if(first==='L') {const end=descriptor.indexOf(';',at);assert.ok(end>=at);locals.push('Object:'+descriptor.slice(at,end).replaceAll('/','.'));at=end+1;}
    else if(first==='[') {
      const start=at-1;while(descriptor[at]==='[')at++;
      if(descriptor[at]==='L'){const end=descriptor.indexOf(';',at);assert.ok(end>=at);at=end+1;}else at++;
      locals.push('Object:'+descriptor.slice(start,at));
    } else {const type={B:'INTEGER',C:'INTEGER',I:'INTEGER',S:'INTEGER',Z:'INTEGER',F:'FLOAT',J:'LONG',D:'DOUBLE'}[first];assert.ok(type);locals.push(type);}
  }
  return locals;
}
function decodeStackMaps(method,className,constant) {
  const attributes=method.codeAttributes.filter(attribute=>attribute.name==='StackMapTable');assert.ok(attributes.length<=1,'Singleton StackMapTable');
  if(!attributes.length)return [];
  const bytes=Buffer.from(attributes[0].bodyHex,'hex');let at=0,previous=-1,locals=methodInitialLocals(method,className);const frames=[];
  const u1=()=>{assert.ok(at<bytes.length,'Complete frame tag');return bytes[at++];};
  const u2=()=>{assert.ok(at+2<=bytes.length,'Complete frame operands');const v=bytes.readUInt16BE(at);at+=2;return v;};
  const type=()=>{
    const tag=u1(),simple=['TOP','INTEGER','FLOAT','DOUBLE','LONG','NULL','UNINITIALIZED_THIS'];
    if(tag<7)return simple[tag];
    if(tag===7){const value=constant(u2());assert.equal(value.tag,7);return 'Object:'+value.value;}
    assert.equal(tag,8,'Known verification type');const offset=u2();
    assert.ok(method.instructions.some(ins=>ins.pc===offset&&ins.name==='new'),'Uninitialized identity targets NEW boundary');
    return 'Uninitialized:'+offset;
  };
  const list=count=>Array.from({length:count},type),count=u2();
  for(let n=0;n<count;n++) {
    const frameType=u1();let delta,stack=[];
    if(frameType<=63)delta=frameType;
    else if(frameType<=127){delta=frameType-64;stack=list(1);}
    else if(frameType===247){delta=u2();stack=list(1);}
    else if(frameType>=248&&frameType<=250){delta=u2();assert.ok(locals.length>=251-frameType);locals=locals.slice(0,locals.length-(251-frameType));}
    else if(frameType===251)delta=u2();
    else if(frameType>=252&&frameType<=254){delta=u2();locals=[...locals,...list(frameType-251)];}
    else {assert.equal(frameType,255,'Reserved frame type rejected');delta=u2();locals=list(u2());stack=list(u2());}
    const offset=previous+delta+1;assert.ok(offset>previous,'Strict ordered frame targets');
    const target=method.instructions.findIndex(instruction=>instruction.pc===offset);
    assert.ok(target>=0,'Frame target is an actual Code boundary');
    const slots=values=>values.reduce((sum,value)=>sum+(value==='LONG'||value==='DOUBLE'?2:1),0);
    assert.ok(slots(locals)<=method.maxLocals && slots(stack)<=method.maxStack,'Frame slots fit real Code maxima');
    frames.push({frameType,offsetDelta:delta,offset,target,locals:[...locals],stack});previous=offset;
  }
  assert.equal(at,bytes.length,'Complete StackMapTable with no ignored trailing bytes');return frames;
}
function canonicalControlFlow(method) {
  const index=pc=>{if(pc===method.codeLength)return method.instructions.length;const result=method.instructions.findIndex(ins=>ins.pc===pc);assert.ok(result>=0);return result;};
  return method.instructions.map(instruction=>{
    if(instruction.branchTarget!==undefined)return instruction.name+':'+index(instruction.branchTarget);
    if(instruction.defaultTarget!==undefined) {
      const keys=instruction.keys.map((key,n)=>key+':'+index(instruction.targets[n])).join(',');
      const span=instruction.name==='tableswitch'?instruction.low+'..'+instruction.high+';':'';
      const paddingStart=instruction.pc+1,paddingEnd=(instruction.pc+4)&~3,raw=Buffer.from(method.codeHex,'hex');
      for(let at=paddingStart;at<paddingEnd;at++)assert.equal(raw[at],0,'Switch alignment padding is real zero bytes');
      return instruction.name+':'+span+'default='+index(instruction.defaultTarget)+';cases='+keys;
    }
    return canonicalOperation(instruction);
  });
}
function semanticConstant(item) {
  const {index,...value}=item; if(value.reference)value.reference=semanticConstant(value.reference);return value;
}
function attributeMetadata(attributes,decoded) {
  const result={},constant=index=>{const entry=decoded.constants.find(item=>item.index===index);assert.ok(entry);return semanticConstant(entry);};
  const utf=index=>{const entry=constant(index);assert.equal(entry.tag,1);return entry.value;};
  const cls=index=>{const entry=constant(index);assert.equal(entry.tag,7);return entry.value;};
  for(const attribute of attributes) {
    assert.ok(!Object.hasOwn(result,attribute.name),'No duplicate selected singleton attributes');
    const bytes=Buffer.from(attribute.bodyHex,'hex');const u2=at=>{assert.ok(at+2<=bytes.length);return bytes.readUInt16BE(at);};
    let value;
    if(['Signature','SourceFile'].includes(attribute.name)){assert.equal(bytes.length,2);value=utf(u2(0));}
    else if(attribute.name==='ConstantValue'){assert.equal(bytes.length,2);value=constant(u2(0));}
    else if(attribute.name==='NestHost'){assert.equal(bytes.length,2);value=cls(u2(0));}
    else if(['Exceptions','NestMembers'].includes(attribute.name)){const count=u2(0);assert.equal(bytes.length,2+count*2);value=Array.from({length:count},(_,n)=>cls(u2(2+n*2)));}
    else if(attribute.name==='InnerClasses'){const count=u2(0);assert.equal(bytes.length,2+count*8);value=Array.from({length:count},(_,n)=>{const at=2+n*8;return {innerClass:cls(u2(at)),outerClass:u2(at+2)?cls(u2(at+2)):null,innerName:u2(at+4)?utf(u2(at+4)):null,flags:u2(at+6)};});}
    else if(attribute.name==='C7cStateless'){assert.equal(bytes.length,4);value={value:bytes.readInt32BE(0)};}
    else if(attribute.name==='C7cReference'){assert.equal(bytes.length,6);value={value:bytes.readInt32BE(0),reference:constant(u2(4))};}
    else if(attribute.name==='C7cPoolReference'){assert.equal(bytes.length,2);value=constant(u2(0));}
    else assert.fail('Unselected output metadata '+attribute.name);
    result[attribute.name]=value;
  }
  return result;
}

export function inspectClassFileArtifactBytes(bytes, contract) {
  const decoded=decodeClass(bytes);assert.equal(decoded.className,contract.className);assert.equal(decoded.major,69);assert.equal(decoded.minor,0);
  assert.equal(decoded.flags,contract.flags);assert.equal(decoded.superclass,'java.lang.Object');assert.deepEqual(decoded.interfaces,[]);
  assert.deepEqual(decoded.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),contract.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})));
  assert.deepEqual(decoded.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),
    contract.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Exact generated member inventory');
  for(const [n,method] of decoded.methods.entries()) {
    const expected=contract.methods[n];assert.ok(method.instructions);
    assert.ok(method.instructions.every(ins=>!['ret','jsr','jsr_w'].includes(ins.name)),'No unselected obsolete/dynamic instructions');
    assert.deepEqual(canonicalControlFlow(method),expected.code,'Real complete generated operands and target graph');
    for(const instruction of method.instructions)if(instruction.name==='invokedynamic'){const raw=Buffer.from(method.codeHex,'hex');assert.equal(raw[instruction.pc+3],0);assert.equal(raw[instruction.pc+4],0);}
    if(contract.extra.prefilledStrings)assert.deepEqual(method.instructions.map(item=>item.name),expected.nativeOpcodes,'Actual remapping must widen every selected LDC');
    assert.equal(method.maxStack,expected.maxStack);assert.equal(method.maxLocals,expected.maxLocals);
    const index=pc=>{if(pc===method.codeLength)return method.instructions.length;const result=method.instructions.findIndex(ins=>ins.pc===pc);assert.ok(result>=0);return result;};
    assert.deepEqual(method.handlers.map(handler=>{
      assert.ok(handler.start<handler.end&&handler.end<=method.codeLength&&handler.target<method.codeLength,'Nonempty bounded protected interval');
      return {...handler,start:index(handler.start),end:index(handler.end),target:index(handler.target)};
    }),expected.handlers,'Real ordered typed/catch-all handler boundaries');
    assert.deepEqual(method.stackMapFrames.map(({target,locals,stack})=>({target,locals,stack})),expected.frames,'Complete expanded frame state vectors independent of compression');
    assert.deepEqual(method.codeAttributes.map(attribute=>attribute.name),expected.frames.length?['StackMapTable']:[],'No retained stale Code metadata');
  }
  assert.deepEqual(decoded.bootstrapMethods.map(item=>({method:semanticConstant(item.method),arguments:item.arguments.map(semanticConstant)})),contract.bootstraps,'Typed complete bootstrap method and static argument vectors');
  for(const constant of decoded.constants.filter(item=>[17,18].includes(item.tag)))assert.ok(constant.bootstrapIndex>=0&&constant.bootstrapIndex<decoded.bootstrapMethods.length,'Dynamic bootstrap index is bounded');
  for(const [n,field] of decoded.fields.entries())assert.deepEqual(attributeMetadata(field.attributes,decoded),contract.fields[n].metadata,'Complete typed field attributes');
  for(const [n,method] of decoded.methods.entries())assert.deepEqual(attributeMetadata(method.attributes.filter(item=>item.name!=='Code'),decoded),contract.methods[n].metadata,'Complete typed method attributes');
  assert.deepEqual(attributeMetadata(decoded.attributes.filter(item=>item.name!=='BootstrapMethods'),decoded),contract.metadata,'Complete typed class/custom attribute payload vectors');
  if(contract.extra.prefilledStrings){const strings=decoded.constants.filter(item=>item.tag===8&&/^C7c-widen-unused-/.test(item.value));assert.equal(strings.length,300);assert.deepEqual(strings.map(item=>item.value),Array.from({length:300},(_,n)=>'C7c-widen-unused-'+n));}
  if(contract.extra.unusedStringsDropped)assert.ok(!decoded.constants.some(item=>item.tag===8&&/^unused-/.test(item.value)),'Unused source string entries really omitted');
  if(contract.extra.smallCustomReferenceIndex){const attr=decoded.attributes.find(item=>item.name==='C7cPoolReference');assert.ok(Buffer.from(attr.bodyHex,'hex').readUInt16BE(0)<255);}
  const sourceFiles=decoded.attributes.filter(attribute=>attribute.name==='SourceFile');
  assert.equal(sourceFiles.length,contract.sourceFile===null?0:1);
  assert.deepEqual(decoded.attributes.map(attribute=>attribute.name).slice().sort(),[...Object.keys(contract.metadata),...(contract.bootstraps.length?['BootstrapMethods']:[])].sort(),'No ignored output attributes');
  if(contract.sourceFile!==null){assert.equal(sourceFiles[0].length,2);const index=Buffer.from(sourceFiles[0].bodyHex,'hex').readUInt16BE(0);
    assert.equal(decoded.constants.find(item=>item.index===index)?.value,contract.sourceFile);assert.equal(decoded.constants.find(item=>item.index===index)?.tag,1);}
  return decoded;
}

export function proveClassFileArtifact(bytes, contract, {host, caseId, record}) {
  assert.ok(['native', 'node', 'chromium'].includes(host));
  const expected = classFileArtifactContracts[caseId].find(item => item.id === contract.id); assert.deepEqual(contract, expected);
  const decoded = inspectClassFileArtifactBytes(bytes, contract);
  assertClassFileInputProofs(record, {...classFileInputContracts[record.group], id: record.group, cases: record.cases});
  const route = record.inputProofs.returnedArrayRoutes.find(item => item.caseId === caseId && item.artifactId === contract.id);
  assert.ok(route, 'Artifact operation is bound to the original source/Code route');
  let regeneration = null;
  if (caseId === 'cf-pool-ldc-widening') {
    const original=record.inputProofs.classes.find(item=>item.className===prefix+'ClassFilePoolRemapTarget');
    const before=original.methods.find(method=>method.name==='choose'),after=decoded.methods.find(method=>method.name==='choose');
    assert.ok(after.codeLength>before.codeLength && after.codeSha256!==before.codeSha256,'Fresh-pool LDC widening changes actual Code bytes and offsets');
    assert.ok(after.stackMapFrames[0].offset>before.stackMapFrames[0].offset,'Regenerated frame target advances with actual LDC width changes');
    regeneration={originalCodeSha256:before.codeSha256,generatedCodeSha256:after.codeSha256,
      originalFrameOffset:before.stackMapFrames[0].offset,generatedFrameOffset:after.stackMapFrames[0].offset,
      actualOffsetsChanged:true,canonicalTypedTargetGraphPreserved:true};
  }
  return {schemaVersion: 1, caseId, artifactId: contract.id, producerHost: host, origin: contract.origin, regeneration,
    genuineCompilerBytes: false, originalInputClassFiles: record.classFiles, originalCaseCodeSha256: route.originalCaseCodeSha256,
    selectedDefinitionRequirement: contract.definition, returnedArrayStaticRoute: route, bytesBase64: bytes.toString('base64'),
    size: bytes.length, sha256: sha(bytes), decoded,
    nativeBytesSubstituted: false, byteForByteNativeParityProven: false, dynamicBranchCoverageProven: false,
    sameJvmDefinitionGeneralConformanceProven: false, fullPublicClassFileApiConformanceProven: false,
    fullBytecodeVerifierConformanceProven: false, fullStackMapConformanceProven: false, selectedCanonicalControlFlowProven: true, selectedExpandedFrameVectorsProven: true};
}
