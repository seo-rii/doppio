import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode,proveCoreGroup} from './java_core_bytecode.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),prefix='classes.modern_test.',support=prefix+'ClassFileSupport';
// JSON otherwise turns NaN/infinities into null and negative zero into zero.
// Preserve these decoded values explicitly; original class bytes and their
// hashes continue to bind the exact floating-point bit patterns.
export function canonicalClassFileProof(value) {
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0)))
    return {numericValue: Object.is(value, -0) ? '-0' : String(value)};
  if (Array.isArray(value)) return value.map(canonicalClassFileProof);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonicalClassFileProof(item)]));
  return value;
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cb=(name,descriptor,bootstrap=true)=>({name,descriptor,flags:10,bootstrap}),builder='(Ljava/lang/classfile/ClassBuilder;)V',codeBuilder='(Ljava/lang/classfile/CodeBuilder;)V';
const input=(name,marker,builders,codes,additional=[])=>({source:'classes/modern_fixture/'+name+'.java',mainClass:prefix+name,completionMarker:marker,
  additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],driverClassNames:[prefix+name,...additional.map(x=>prefix+x),support],
  resourceClassNames:[],javacFlags:['-g:source'],resource:null,codecs:[],callbacks:[
    ...builders.map(name=>cb('build'+name,builder)),...codes.map(name=>cb('code'+name,codeBuilder)),cb('flags',builder,false),cb('typed','(Ljava/lang/classfile/ClassFile;[B)V',false)]});
export const classFileInputContracts=freeze({
 'classfile-instruction-arrays':input('InstructionArraysFinal','CLASSFILE_INSTRUCTION_ARRAYS_OK',
   ['IntLong','FloatDouble','ByteBoolean','CharShort','Reference','Nested','MultiPrimitive','MultiReference'],
   ['Int','Long','Float','Double','Byte','Boolean','Char','Short','Reference','Nested','MultiIntFull','MultiIntPartial','MultiStringFull','MultiStringPartial']),
 'classfile-instruction-arithmetic':input('InstructionArithmeticFinal','CLASSFILE_INSTRUCTION_ARITHMETIC_OK',
   ['Arithmetic','Bits','Comparisons','DupSwap','DupX2','Dup2','Dup2X1','Dup2X2'],
   ['IntArithmetic','LongArithmetic','FloatArithmetic','DoubleArithmetic','IntBits','LongBits','Convert','CompareLong','CompareFloatLow','CompareFloatHigh','CompareDoubleLow','CompareDoubleHigh',
    'Dup','DupX1','Swap','DupX2Narrow','DupX2Wide','Dup2Narrow','Dup2Wide','Dup2X1Narrow','Dup2X1Wide','Dup2X2First','Dup2X2Second','Dup2X2Third','Dup2X2Fourth']),
 'classfile-instruction-members':input('InstructionMembersFinal','CLASSFILE_INSTRUCTION_MEMBERS_OK',
   ['Fields','Virtual','Interface','Special','TypeChecks','Monitor','MonitorHandler','Throw'],
   ['Constructor','Make','Fields','Virtual','Interface','Default','SpecialRun','Cast','InstanceOf','Monitor','MonitorHandler','Throw'],['InstructionMemberApi']),
 'classfile-instruction-frames':input('InstructionFramesFinal','CLASSFILE_INSTRUCTION_FRAMES_OK',
   ['Forward','Backward','Goto','Dead','Protected','Uninitialized','InterfaceJoin'],
   ['Forward','Backward','Goto','Dead','Protected','Uninitialized','InterfaceJoin'])
});
const nativeOpcode=op=>{
 const local=op.match(/^([ailfd](?:load|store)):(\d+)$/);if(local)return Number(local[2])<=3?local[1]+'_'+local[2]:local[1];
 if(op.startsWith('int:')){const n=Number(op.slice(4));return n>=-1&&n<=5?n===-1?'iconst_m1':'iconst_'+n:n>=-128&&n<=127?'bipush':n>=-32768&&n<=32767?'sipush':'ldc';}
 if(op.startsWith('long:'))return op==='long:1'?'lconst_1':op==='long:0'?'lconst_0':'ldc2_w';
 if(op.startsWith('float:'))return ['float:0','float:1','float:2'].includes(op)?'fconst_'+op.slice(6):'ldc';
 if(op.startsWith('double:'))return ['double:0','double:1'].includes(op)?'dconst_'+op.slice(7):'ldc2_w';
 if(op.startsWith('string:'))return 'ldc';return op.split(':')[0];
};
const method=(name,descriptor,code,{flags=9,maxStack=1,maxLocals=0,frames=[],handlers=[],opcodes=null}={})=>({name,descriptor,flags,code,nativeOpcodes:opcodes||code.map(nativeOpcode),maxStack,maxLocals,frames,handlers,metadata:{}});
const generated=(id,name,methods,{fields=[],interfaces=[],definition='define-and-invoke'}={})=>({id,className:prefix+name,origin:'public-build',flags:33,interfaces,fields,methods,sourceFile:null,definition,metadata:{},bootstraps:[],extra:{},
  branches:methods.some(m=>m.code.some(op=>/^(?:if|goto)/.test(op))),handlers:methods.some(m=>m.handlers.length>0)});
const frame=(target,locals,stack=[])=>({target,locals,stack}),I='INTEGER',O=name=>'Object:'+name,Throwable=O('java.lang.Throwable'),SB='java.lang.StringBuilder';
const primitive=(name,descriptor,atype,value,store,load,return_,maxStack=4)=>method(name,descriptor,
 ['int:2','newarray:'+atype,'dup','arraylength','pop','dup','int:1',value,store,'int:1',load,return_],{maxStack});
const arithmetic=(name,descriptor,prefix,slot,maxStack,maxLocals)=>method(name,descriptor,[prefix+'load:0',prefix+'load:'+slot,prefix+'add',prefix+'load:'+slot,prefix+'sub',prefix+'load:'+slot,prefix+'mul',prefix+'load:'+slot,prefix+'div',prefix+'load:'+slot,prefix+'rem',prefix+'neg',prefix+'return'],{maxStack,maxLocals});
const ctor=()=>method('<init>','()V',['aload:0','invokespecial:java.lang.Object#<init>()V','return'],{flags:1,maxLocals:1});
const make=name=>method('make','()Ljava/lang/Object;',['new:'+prefix+name,'dup','invokespecial:'+prefix+name+'#<init>()V','areturn'],{maxStack:2});
export const classFileArtifactContracts=freeze({
 'cf-array-int-long':[generated('array-int-long','C7dArrayIntLong',[primitive('intValue','()I',10,'int:42','iastore','iaload','ireturn'),primitive('longValue','()J',11,'long:1234567890123','lastore','laload','lreturn',5)])],
 'cf-array-float-double':[generated('array-float-double','C7dArrayFloatDouble',[primitive('floatValue','()F',6,'float:1.25','fastore','faload','freturn'),primitive('doubleValue','()D',7,'double:2.5','dastore','daload','dreturn',5)])],
 'cf-array-byte-boolean':[generated('array-byte-boolean','C7dArrayByteBoolean',[primitive('byteValue','()I',8,'int:-128','bastore','baload','ireturn'),primitive('booleanValue','()I',4,'int:1','bastore','baload','ireturn')])],
 'cf-array-char-short':[generated('array-char-short','C7dArrayCharShort',[primitive('charValue','()I',5,'int:65535','castore','caload','ireturn'),primitive('shortValue','()I',9,'int:-32768','sastore','saload','ireturn')])],
 'cf-array-reference':[generated('array-reference','C7dArrayReference',[method('value','()Ljava/lang/String;',['int:2','anewarray:java.lang.String','dup','arraylength','pop','dup','int:0','string:array-reference','aastore','int:0','aaload','areturn'],{maxStack:4})])],
 'cf-array-nested-reference':[generated('array-nested','C7dArrayNested',[method('value','()Ljava/lang/String;',['int:1','anewarray:[Ljava.lang.String;','dup','int:0','int:1','anewarray:java.lang.String','dup','int:0','string:nested-reference','aastore','aastore','int:0','aaload','int:0','aaload','areturn'],{maxStack:7})])],
 'cf-array-multi-primitive':[generated('array-multi-primitive','C7dMultiPrimitive',[
   method('full','()[[I',['int:2','int:3','multianewarray:[[I#2','areturn'],{maxStack:2}),method('partial','()[[[I',['int:2','int:3','multianewarray:[[[I#2','areturn'],{maxStack:2})])],
 'cf-array-multi-reference':[generated('array-multi-reference','C7dMultiReference',[
   method('full','()[[Ljava/lang/String;',['int:2','int:3','multianewarray:[[Ljava.lang.String;#2','areturn'],{maxStack:2}),method('partial','()[[[Ljava/lang/String;',['int:2','multianewarray:[[[Ljava.lang.String;#1','areturn'])])],
 'cf-arithmetic-operators':[generated('arithmetic-operators','C7dArithmetic',[
   arithmetic('intValue','(II)I','i',1,2,2),arithmetic('longValue','(JJ)J','l',2,4,4),arithmetic('floatValue','(FF)F','f',1,2,2),arithmetic('doubleValue','(DD)D','d',2,4,4)])],
 'cf-arithmetic-shifts-bits':[generated('arithmetic-bits','C7dBits',[
   method('intValue','(II)I',['iload:0','iload:1','ishl','iload:1','ishr','iload:1','iushr','int:7','iand','int:8','ior','int:3','ixor','ireturn'],{maxStack:2,maxLocals:2}),
   method('longValue','(JI)J',['lload:0','iload:2','lshl','iload:2','lshr','iload:2','lushr','long:7','land','long:8','lor','long:3','lxor','lreturn'],{maxStack:4,maxLocals:3})])],
 'cf-arithmetic-compare-convert':[generated('arithmetic-comparisons','C7dComparisons',[
   method('convert','(D)I',['dload:0','d2l','l2f','f2d','d2i','i2l','l2d','d2f','f2l','l2i','i2f','f2i','i2d','d2i','i2b','i2c','i2s','ireturn'],{maxStack:2,maxLocals:2}),
   method('longCompare','(JJ)I',['lload:0','lload:2','lcmp','ireturn'],{maxStack:4,maxLocals:4}),
   method('floatLow','(FF)I',['fload:0','fload:1','fcmpl','ireturn'],{maxStack:2,maxLocals:2}),method('floatHigh','(FF)I',['fload:0','fload:1','fcmpg','ireturn'],{maxStack:2,maxLocals:2}),
   method('doubleLow','(DD)I',['dload:0','dload:2','dcmpl','ireturn'],{maxStack:4,maxLocals:4}),method('doubleHigh','(DD)I',['dload:0','dload:2','dcmpg','ireturn'],{maxStack:4,maxLocals:4})])],
 'cf-arithmetic-dup-swap':[generated('arithmetic-dup-swap','C7dDupSwap',[
   method('dup','()I',['int:3','dup','iadd','ireturn'],{maxStack:2}),method('dupX1','()I',['int:2','int:3','dup_x1','iadd','iadd','ireturn'],{maxStack:3}),method('swap','()I',['int:2','int:3','swap','isub','ireturn'],{maxStack:2})])],
 'cf-arithmetic-dup-x2':[generated('arithmetic-dup-x2','C7dDupX2',[
   method('narrow','()I',['int:1','int:2','int:3','dup_x2','iadd','iadd','iadd','ireturn'],{maxStack:4}),method('wide','()I',['long:1','int:3','dup_x2','pop','pop2','ireturn'],{maxStack:4})])],
 'cf-arithmetic-dup2':[generated('arithmetic-dup2','C7dDup2',[
   method('narrow','()I',['int:2','int:3','dup2','iadd','iadd','iadd','ireturn'],{maxStack:4}),method('wide','()J',['long:1','dup2','ladd','lreturn'],{maxStack:4})])],
 'cf-arithmetic-dup2-x1':[generated('arithmetic-dup2-x1','C7dDup2X1',[
   method('narrow','()I',['int:1','int:2','int:3','dup2_x1','iadd','iadd','iadd','iadd','ireturn'],{maxStack:5}),method('wide','()J',['int:3','long:1','dup2_x1','pop2','pop','lreturn'],{maxStack:5})])],
 'cf-arithmetic-dup2-x2':[generated('arithmetic-dup2-x2','C7dDup2X2',[
   method('first','()I',['int:1','int:2','int:3','int:4','dup2_x2','iadd','iadd','iadd','iadd','iadd','ireturn'],{maxStack:6}),
   method('second','()I',['long:1','int:2','int:3','dup2_x2','pop','pop','pop2','iadd','ireturn'],{maxStack:6}),
   method('third','()J',['int:2','int:3','long:1','dup2_x2','pop2','pop','pop','lreturn'],{maxStack:6}),method('fourth','()J',['long:1','long:2','dup2_x2','ladd','ladd','lreturn'],{maxStack:6})])],
 'cf-member-fields':[generated('member-fields','C7dFields',[ctor(),make('C7dFields'),method('mutate','(Ljava/lang/Object;I)I',
   ['aload:0','checkcast:'+prefix+'C7dFields','astore:2','aload:2','iload:1','putfield:'+prefix+'C7dFields#valueI','iload:1','putstatic:'+prefix+'C7dFields#stateI','aload:2','getfield:'+prefix+'C7dFields#valueI','getstatic:'+prefix+'C7dFields#stateI','iadd','ireturn'],{maxStack:2,maxLocals:3})],
   {fields:[{name:'value',descriptor:'I',flags:1,metadata:{}},{name:'state',descriptor:'I',flags:9,metadata:{}}]})],
 'cf-member-virtual':[generated('member-virtual','C7dVirtual',[method('length','(Ljava/lang/String;)I',['aload:0','invokevirtual:java.lang.String#length()I','ireturn'],{maxLocals:1})])],
 'cf-member-interface':[generated('member-interface','C7dInterface',[method('length','(Ljava/lang/CharSequence;)I',['aload:0','invokeinterface:java.lang.CharSequence#length()I','ireturn'],{maxLocals:1})])],
 'cf-member-special-interface':[generated('member-special','C7dSpecial',[ctor(),make('C7dSpecial'),
   method('defaultCall','()I',['aload:0','invokespecial:'+prefix+'InstructionMemberApi#defaultValue()I','ireturn'],{flags:1,maxLocals:1}),
   method('run','(Ljava/lang/Object;)I',['aload:0','checkcast:'+prefix+'C7dSpecial','invokevirtual:'+prefix+'C7dSpecial#defaultCall()I','invokestatic:'+prefix+'InstructionMemberApi#staticValue()I','iadd','ireturn'],{maxStack:2,maxLocals:1})],
   {interfaces:[prefix+'InstructionMemberApi']})],
 'cf-member-typechecks':[generated('member-typechecks','C7dTypeChecks',[
   method('length','(Ljava/lang/Object;)I',['aload:0','checkcast:java.lang.String','invokevirtual:java.lang.String#length()I','ireturn'],{maxLocals:1}),
   method('isString','(Ljava/lang/Object;)Z',['aload:0','instanceof:java.lang.String','ireturn'],{maxLocals:1})])],
 'cf-member-monitor':[generated('member-monitor','C7dMonitor',[method('run','(Ljava/lang/Object;)I',['aload:0','dup','astore:1','monitorenter','int:7','istore:2','aload:1','monitorexit','iload:2','ireturn'],{maxStack:2,maxLocals:3})])],
 'cf-member-monitor-handler':[generated('member-monitor-handler','C7dMonitorHandler',[method('run','(Ljava/lang/Object;Ljava/lang/Throwable;)I',
   ['aload:0','dup','astore:2','monitorenter','aload:1','ifnull:8','aload:1','athrow','int:9','istore:3','aload:2','monitorexit','iload:3','ireturn','astore:4','aload:2','monitorexit','aload:4','athrow'],
   {maxStack:2,maxLocals:5,frames:[frame(8,[O('java.lang.Object'),Throwable,O('java.lang.Object')]),frame(14,[O('java.lang.Object'),Throwable,O('java.lang.Object')],[Throwable])],
    handlers:[{start:4,end:10,target:14,catchType:null}]})])],
 'cf-member-throw':[generated('member-throw','C7dThrow',[method('run','(Ljava/lang/Throwable;)V',['aload:0','athrow'],{maxLocals:1})])],
 'cf-frame-forward-wide':[generated('frame-forward','C7dForwardWide',[method('choose','(I)I',['iload:0','ifne:3','goto_w:33005',...Array(33000).fill('nop'),'int:1','ireturn','int:2','ireturn'],
   {maxLocals:1,frames:[frame(3,[I]),frame(33005,[I])]})])],
 'cf-frame-backward-wide':[generated('frame-backward','C7dBackwardWide',[method('run','(I)I',[...Array(33000).fill('nop'),'iinc:0,-1','iload:0','ifle:33004','goto_w:0','int:3','ireturn'],
   {maxLocals:1,frames:[frame(0,[I]),frame(33004,[I])]})])],
 'cf-frame-goto-wide':[generated('frame-goto','C7dGotoWide',[method('run','()I',['goto_w:33001',...Array(32999).fill('nop'),'athrow','int:7','ireturn'],
   {frames:[frame(1,[],[Throwable]),frame(33001,[])]})])],
 'cf-frame-dead-patch':[generated('frame-patch','C7dDeadPatched',[method('run','()I',['int:7','ireturn','nop','athrow'],{frames:[frame(2,[],[Throwable])]})])],
 'cf-frame-dead-keep':[generated('frame-keep','C7dDeadKept',[method('run','()I',['int:7','ireturn','int:3','ireturn'])],{definition:'forbidden'})],
 'cf-frame-protected-new':[generated('frame-protected','C7dProtectedAllocation',[method('make','(I)Ljava/lang/Object;',['new:'+SB,'dup','astore:1','iload:0','invokespecial:'+SB+'#<init>(I)V','aload:1','areturn','astore:2','aconst_null','areturn'],
   {maxStack:2,maxLocals:3,frames:[frame(7,[I],[O('java.lang.RuntimeException')])],handlers:[{start:0,end:5,target:7,catchType:'java.lang.RuntimeException'}]})])],
 'cf-frame-uninitialized-join':[generated('frame-uninitialized','C7dUninitializedJoin',[method('make','(I)Ljava/lang/Object;',['new:'+SB,'astore:1','iload:0','ifeq:6','nop','goto:7','nop','aload:1','dup','invokespecial:'+SB+'#<init>()V','areturn'],
   {maxStack:2,maxLocals:2,frames:[frame(6,[I,'Uninitialized:0']),frame(7,[I,'Uninitialized:0'])]})])],
 'cf-frame-interface-join':[generated('frame-interface','C7dInterfaceJoin',[method('length','(ILjava/lang/String;Ljava/lang/StringBuilder;)I',['iload:0','ifeq:4','aload:1','goto:5','aload:2','invokeinterface:java.lang.CharSequence#length()I','ireturn'],
   {maxLocals:3,frames:[frame(4,[I,O('java.lang.String'),O(SB)]),frame(5,[I,O('java.lang.String'),O(SB)],[O('java.lang.Object')])]})])]
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
    if(instruction.cp?.tag===7)return 'class:'+instruction.cp.value;
    if(instruction.cp?.tag===15)return 'handle:'+instruction.cp.referenceKind+':'+instruction.cp.reference.owner+'#'+instruction.cp.reference.name+instruction.cp.reference.descriptor;
    if(instruction.cp?.tag===16)return 'type:'+instruction.cp.descriptor;
    if(instruction.cp?.tag===17)return 'condy:'+instruction.cp.name+':'+instruction.cp.descriptor+'@'+instruction.cp.bootstrapIndex;
    const type = {3: 'int', 4: 'float', 5: 'long', 6: 'double', 8: 'string'}[instruction.cp?.tag];
    assert.ok(type, 'Selected literal constant category'); return type + ':' + instruction.cp.value;
  }
  if(name==='newarray')return 'newarray:'+instruction.arrayType;
  if(name==='iinc'||instruction.modifiedOpcode==='iinc')return 'iinc:'+instruction.localIndex+','+instruction.increment;
  if(instruction.cp?.tag===7)return name+':'+instruction.cp.value+(name==='multianewarray'?'#'+instruction.dimensions:'');
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
    assert.equal(item.flags,item.className===prefix+'InstructionMemberApi'?1536:49);
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
  return canonicalClassFileProof({schemaVersion: 1, group: group.id, classes, caseProofs, callbackProofs, codecProofs, caseCallbackProofs, resourceProof, returnedArrayRoutes,
    compilerBytesTransformed: false, generatedArtifactsAreCompilerInputs: false, dynamicBranchCoverageProven: false,
    opaqueCallbackStaticReachabilityProven: false, fullSourceUnitConformanceProven: false, fullPublicClassFileApiConformanceProven: false});
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
      locals.push('Object:'+descriptor.slice(start,at).replaceAll('/','.'));
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
    else assert.fail('Unselected output metadata '+attribute.name);
    result[attribute.name]=value;
  }
  return result;
}

export function inspectClassFileArtifactBytes(bytes, contract) {
  const decoded=decodeClass(bytes);assert.equal(decoded.className,contract.className);assert.equal(decoded.major,69);assert.equal(decoded.minor,0);
  assert.equal(decoded.flags,contract.flags);assert.equal(decoded.superclass,'java.lang.Object');assert.deepEqual(decoded.interfaces,contract.interfaces);
  assert.deepEqual(decoded.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),contract.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})));
  assert.deepEqual(decoded.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),
    contract.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Exact generated member inventory');
  for(const [n,method] of decoded.methods.entries()) {
    const expected=contract.methods[n];assert.ok(method.instructions);
    assert.ok(method.codeLength>0 && method.codeLength<=65535,'Real Code length remains within the JVM u2-sized limit');
    assert.ok(method.instructions.every(ins=>!['ret','jsr','jsr_w'].includes(ins.name)),'No unselected obsolete/dynamic instructions');
    assert.deepEqual(canonicalControlFlow(method),expected.code,'Real complete generated operands and target graph');
    assert.deepEqual(method.instructions.map(ins=>ins.name),expected.nativeOpcodes,
      'Selected modern instructions preserve actual complete opcode encodings and widths');
    const raw=Buffer.from(method.codeHex,'hex');
    for(const instruction of method.instructions){
      if(instruction.name==='invokedynamic'){assert.equal(raw[instruction.pc+3],0);assert.equal(raw[instruction.pc+4],0);}
      if(instruction.name==='invokeinterface'){assert.equal(instruction.cp.tag,11);assert.equal(raw[instruction.pc+3],1);assert.equal(raw[instruction.pc+4],0);}
      if(['invokevirtual','invokestatic','invokespecial'].includes(instruction.name))assert.equal(instruction.cp.tag,
        instruction.cp.owner==='classes.modern_test.InstructionMemberApi'?11:10,'Actual method reference class/interface category');
      if(['getfield','putfield','getstatic','putstatic'].includes(instruction.name))assert.equal(instruction.cp.tag,9);
      if(instruction.name==='newarray')assert.ok(instruction.arrayType>=4 && instruction.arrayType<=11);
      if(instruction.name==='multianewarray'){
        assert.equal(instruction.cp.tag,7);const rank=instruction.cp.value.match(/^\[+/)?.[0].length||0;
        assert.ok(instruction.dimensions>=1 && instruction.dimensions<=rank,'Actual multi-array dimensions fit the CP class descriptor');
      }
    }
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
  const regeneration = null;
  return {schemaVersion: 1, caseId, artifactId: contract.id, producerHost: host, origin: contract.origin, regeneration,
    genuineCompilerBytes: false, originalInputClassFiles: record.classFiles, originalCaseCodeSha256: route.originalCaseCodeSha256,
    selectedDefinitionRequirement: contract.definition, returnedArrayStaticRoute: route, bytesBase64: bytes.toString('base64'),
    size: bytes.length, sha256: sha(bytes), decoded,
    nativeBytesSubstituted: false, byteForByteNativeParityProven: false, dynamicBranchCoverageProven: false,
    sameJvmDefinitionGeneralConformanceProven: false, fullPublicClassFileApiConformanceProven: false,
    fullBytecodeVerifierConformanceProven: false, fullStackMapConformanceProven: false, selectedCanonicalControlFlowProven: true, selectedExpandedFrameVectorsProven: true};
}


