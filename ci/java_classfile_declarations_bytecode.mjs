import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode,proveCoreGroup} from './java_core_bytecode.mjs';
import {classFileInputContracts,classFileArtifactContracts,classFileResourceContracts} from './classfile_declarations_byte_contracts.mjs';
export {classFileInputContracts,classFileArtifactContracts,classFileResourceContracts} from './classfile_declarations_byte_contracts.mjs';
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
export function decodeClassFileEvidence(bytes, file = null) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 10 && bytes.length <= 256 * 1024, 'Bounded complete class bytes');
  const layout = readStructureLayout(bytes), pool = layout.pool;
  const utf = index => {assert.equal(pool[index]?.tag, 1); return pool[index].value;};
  const cls = index => {assert.equal(pool[index]?.tag, 7); return utf(pool[index].first).replaceAll('/', '.');};
  const constant = index => {
    const entry = pool[index]; assert.ok(entry);
    const item = {index, tag: entry.tag};
    if (entry.tag === 1) item.value = entry.value;
    else if (entry.tag === 7) item.value = cls(index);
    else if ([8,19,20].includes(entry.tag)) item.value = utf(entry.first);
    else if (entry.tag === 12) {item.name=utf(entry.first);item.descriptor=utf(entry.second);}
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

function codeBoundary(method,pc) {
  assert.ok(method?.instructions,'Code target requires actual Code');
  if(pc===method.codeLength)return method.instructions.length;
  const target=method.instructions.findIndex(item=>item.pc===pc);
  assert.ok(target>=0,'Actual instruction boundary, not interior/opaque BCI');return target;
}
function attributeMetadata(attributes,decoded,{scope='class',method=null,depth=0}={}) {
  assert.ok(depth<64,'Bounded recursive Record attribute nesting');
  const result={},constants=new Map(decoded.constants.map(item=>[item.index,item]));
  const constant=index=>{const item=constants.get(index);assert.ok(item,'Live nonreserved CP index');return semanticConstant(item);};
  const typed=(index,tag)=>{const item=constant(index);assert.equal(item.tag,tag,'Exact attribute CP category');return item;};
  const utf=index=>typed(index,1).value,cls=index=>typed(index,7).value;
  for(const attribute of attributes) {
    assert.ok(!Object.hasOwn(result,attribute.name),'No ignored duplicate selected singleton attribute');
    const bytes=Buffer.from(attribute.bodyHex,'hex');let at=0;
    const u1=()=>{assert.ok(at<bytes.length,'Complete attribute u1');return bytes[at++];};
    const u2=()=>{assert.ok(at+2<=bytes.length,'Complete attribute u2');const value=bytes.readUInt16BE(at);at+=2;return value;};
    const u4=()=>{assert.ok(at+4<=bytes.length,'Complete attribute u4');const value=bytes.readUInt32BE(at);at+=4;return value;};
    const vector=(count,fn)=>{assert.ok(count<=65535);return Array.from({length:count},fn);};
    const annotation=(level=0)=>{
      assert.ok(level<64,'Bounded recursive annotation tree');const type=utf(u2());assert.match(type,/^L[^;]+;$/,'Annotation class descriptor');
      return {type,elements:vector(u2(),()=>({name:utf(u2()),value:value(level+1)}))};
    };
    const value=(level=0)=>{
      assert.ok(level<64,'Bounded recursive annotation value');const tag=String.fromCharCode(u1());
      if('BCDFIJSZ'.includes(tag))return {tag,constant:typed(u2(),({D:6,F:4,J:5})[tag]||3)};
      if(tag==='s')return {tag,value:utf(u2())};
      if(tag==='c')return {tag,descriptor:utf(u2())};
      if(tag==='e')return {tag,type:utf(u2()),name:utf(u2())};
      if(tag==='@')return {tag,annotation:annotation(level+1)};
      assert.equal(tag,'[','Known annotation tag, no ignored values');return {tag,values:vector(u2(),()=>value(level+1))};
    };
    const annotations=()=>vector(u2(),()=>annotation());
    const typeAnnotation=()=>{
      const targetType=u1();let target;
      if(targetType===0x00||targetType===0x01)target={typeParameterIndex:u1()};
      else if(targetType===0x10)target={supertypeIndex:u2()};
      else if(targetType===0x11||targetType===0x12)target={typeParameterIndex:u1(),boundIndex:u1()};
      else if(targetType>=0x13&&targetType<=0x15)target={};
      else if(targetType===0x16)target={formalParameterIndex:u1()};
      else if(targetType===0x17)target={throwsIndex:u2()};
      else if(targetType===0x40||targetType===0x41)target={table:vector(u2(),()=>{
        const start=u2(),length=u2(),slot=u2();assert.ok(start+length<=method.codeLength&&slot<method.maxLocals,'Actual bounded local type range/slot');
        return {start:codeBoundary(method,start),end:codeBoundary(method,start+length),slot};
      })};
      else if(targetType===0x42){const exceptionTableIndex=u2();assert.ok(exceptionTableIndex<method.handlers.length,'Type annotation indexes actual ordered exception table');target={exceptionTableIndex};}
      else if(targetType>=0x43&&targetType<=0x46){const offset=u2();target={target:codeBoundary(method,offset)};}
      else {assert.ok(targetType>=0x47&&targetType<=0x4b,'Known type annotation target');target={target:codeBoundary(method,u2()),typeArgumentIndex:u1()};}
      const allowed={class:[0x00,0x10,0x11],field:[0x13],record:[0x13],method:[0x01,0x12,0x14,0x15,0x16,0x17],code:[0x40,0x41,0x42,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4a,0x4b]};
      assert.ok(allowed[scope]?.includes(targetType),'Type target occurs in its selected actual owner scope');
      if([0x43,0x44,0x47].includes(targetType)) {
        const opcode={0x43:'instanceof',0x44:'new',0x47:'checkcast'}[targetType];assert.equal(method.instructions[target.target]?.name,opcode,'Offset annotation labels the actual selected opcode');
      }
      const path=vector(u1(),()=>{const kind=u1(),argumentIndex=u1();assert.ok(kind<=3,'Known type-path kind');if(kind!==3)assert.equal(argumentIndex,0,'Non-argument type-path index is zero');return {kind,argumentIndex};});
      return {targetType,target,path,annotation:annotation()};
    };
    let output;
    if(['Signature','SourceFile','SourceID','CompilationID'].includes(attribute.name))output=utf(u2());
    else if(['Synthetic','Deprecated'].includes(attribute.name))output=true;
    else if(attribute.name==='ConstantValue')output=constant(u2());
    else if(attribute.name==='NestHost'||attribute.name==='ModuleMainClass')output=cls(u2());
    else if(['Exceptions','NestMembers','PermittedSubclasses'].includes(attribute.name))output=vector(u2(),()=>cls(u2()));
    else if(attribute.name==='InnerClasses')output=vector(u2(),()=>{const inner=u2(),outer=u2(),name=u2(),flags=u2();return {innerClass:cls(inner),outerClass:outer?cls(outer):null,innerName:name?utf(name):null,flags};});
    else if(attribute.name==='EnclosingMethod'){const owner=cls(u2()),index=u2();output={owner,method:index?typed(index,12):null};}
    else if(attribute.name==='MethodParameters')output=vector(u1(),()=>{const name=u2();return {name:name?utf(name):null,flags:u2()};});
    else if(attribute.name==='RuntimeVisibleAnnotations'||attribute.name==='RuntimeInvisibleAnnotations')output=annotations();
    else if(attribute.name==='RuntimeVisibleParameterAnnotations'||attribute.name==='RuntimeInvisibleParameterAnnotations')output=vector(u1(),annotations);
    else if(attribute.name==='AnnotationDefault')output=value();
    else if(attribute.name==='RuntimeVisibleTypeAnnotations'||attribute.name==='RuntimeInvisibleTypeAnnotations')output=vector(u2(),typeAnnotation);
    else if(attribute.name==='Record')output=vector(u2(),()=>{
      const name=utf(u2()),descriptor=utf(u2()),attrs=vector(u2(),()=>{const name=utf(u2()),length=u4();assert.ok(at+length<=bytes.length,'Complete nested component attribute');const bodyHex=bytes.subarray(at,at+length).toString('hex');at+=length;return {name,length,bodyHex};});
      return {name,descriptor,metadata:attributeMetadata(attrs,decoded,{scope:'record',depth:depth+1})};
    });
    else if(attribute.name==='Module') {
      const name=typed(u2(),19).value,flags=u2(),versionIndex=u2(),version=versionIndex?utf(versionIndex):null;
      const requires=vector(u2(),()=>{const name=typed(u2(),19).value,flags=u2(),version=u2();return {name,flags,version:version?utf(version):null};});
      const packages=()=>vector(u2(),()=>{const name=typed(u2(),20).value,flags=u2(),to=vector(u2(),()=>typed(u2(),19).value);return {name,flags,to};});
      const exports=packages(),opens=packages(),uses=vector(u2(),()=>cls(u2())),provides=vector(u2(),()=>({service:cls(u2()),implementations:vector(u2(),()=>cls(u2()))}));
      output={name,flags,version,requires,exports,opens,uses,provides};
    } else if(attribute.name==='ModulePackages')output=vector(u2(),()=>typed(u2(),20).value);
    else if(attribute.name==='LineNumberTable')output=vector(u2(),()=>({target:codeBoundary(method,u2()),line:u2()}));
    else if(attribute.name==='LocalVariableTable'||attribute.name==='LocalVariableTypeTable')output=vector(u2(),()=>{
      const start=u2(),length=u2(),name=utf(u2()),type=utf(u2()),slot=u2();assert.ok(start+length<=method.codeLength&&slot<method.maxLocals,'Bounded real debug scope/slot');
      return {start:codeBoundary(method,start),end:codeBoundary(method,start+length),name,[attribute.name==='LocalVariableTable'?'type':'signature']:type,slot};
    });
    else assert.fail('Unselected opaque attribute '+attribute.name);
    assert.equal(at,bytes.length,'Complete recursively decoded attribute without ignored suffix');result[attribute.name]=output;
  }
  return result;
}
export function classFileSemanticProfile(decoded) {
  const profile={className:decoded.className,major:decoded.major,minor:decoded.minor,flags:decoded.flags,superclass:decoded.superclass,interfaces:decoded.interfaces,
    fields:decoded.fields.map(field=>({name:field.name,descriptor:field.descriptor,flags:field.flags,metadata:attributeMetadata(field.attributes,decoded,{scope:'field'})})),
    methods:decoded.methods.map(method=>{
      const output={name:method.name,descriptor:method.descriptor,flags:method.flags,metadata:attributeMetadata(method.attributes.filter(a=>a.name!=='Code'),decoded,{scope:'method',method})};
      if(!method.instructions){assert.ok(method.flags&(0x100|0x400),'Only genuine abstract/native methods may omit Code');return {...output,code:null,nativeOpcodes:[]};}
      assert.ok(method.codeLength>0&&method.codeLength<=65535,'Actual JVM Code length bound');
      const raw=Buffer.from(method.codeHex,'hex');
      for(const ins of method.instructions){
        if(ins.name==='invokedynamic'){assert.equal(raw[ins.pc+3],0);assert.equal(raw[ins.pc+4],0);}
        if(ins.name==='invokeinterface'){assert.equal(ins.cp?.tag,11);assert.equal(raw[ins.pc+4],0);assert.ok(raw[ins.pc+3]>0,'Actual interface argument slot count');}
        if(['getfield','putfield','getstatic','putstatic'].includes(ins.name))assert.equal(ins.cp?.tag,9);
        if(['jsr','jsr_w','ret'].includes(ins.name))assert.fail('No obsolete selected generated instruction');
      }
      return {...output,code:canonicalControlFlow(method),nativeOpcodes:method.instructions.map(ins=>ins.name),maxStack:method.maxStack,maxLocals:method.maxLocals,
        handlers:method.handlers.map(handler=>{assert.ok(handler.start<handler.end&&handler.end<=method.codeLength&&handler.target<method.codeLength);return {...handler,start:codeBoundary(method,handler.start),end:codeBoundary(method,handler.end),target:codeBoundary(method,handler.target)};}),
        frames:method.stackMapFrames.map(({target,locals,stack})=>({target,locals,stack})),
        debug:attributeMetadata(method.codeAttributes.filter(a=>a.name!=='StackMapTable'),decoded,{scope:'code',method})};
    }),metadata:attributeMetadata(decoded.attributes.filter(a=>a.name!=='BootstrapMethods'),decoded),
    bootstraps:decoded.bootstrapMethods.map(item=>({method:semanticConstant(item.method),arguments:item.arguments.map(semanticConstant)}))};
  for(const constant of decoded.constants.filter(item=>[17,18].includes(item.tag)))assert.ok(constant.bootstrapIndex>=0&&constant.bootstrapIndex<decoded.bootstrapMethods.length,'Every dynamic operand resolves actual bootstrap');
  return canonicalClassFileProof(profile);
}
export function inspectClassFileArtifactBytes(bytes,contract) {
  const decoded=decodeClassFileEvidence(bytes),profile=classFileSemanticProfile(decoded);
  const expected={className:contract.className,major:69,minor:0,flags:contract.flags,superclass:contract.superclass,interfaces:contract.interfaces,fields:contract.fields,methods:contract.methods,metadata:contract.metadata,bootstraps:contract.bootstraps};
  assert.deepEqual(profile,expected,'Complete canonical Code/operands/frames/recursive metadata vectors');
  if(contract.id==='type-relocated') {
    const values=decoded.constants.filter(item=>item.tag===8&&item.value.startsWith('d4-type-unused-')).map(item=>item.value).sort();
    assert.deepEqual(values,Array.from({length:300},(_,n)=>'d4-type-unused-'+n).sort(),'Genuine selected fresh-pool prefill');
    const literals=decoded.methods.filter(m=>['caught','make'].includes(m.name)).flatMap(m=>m.instructions.filter(i=>i.name==='ldc_w'));
    assert.ok(literals.length>=3&&literals.every(i=>i.cp?.tag===8&&i.cp.index>255),'Actual imported source strings require u2-wide loads');
  }
  decoded.semanticProfile=profile;return decoded;
}
function returnedArrayRoute(entry,group,classes,contract) {
  const owner=classes.find(item=>item.className===group.mainClass),body=owner.methods.find(m=>m.name===entry.entryMethod&&m.descriptor===entry.entryDescriptor);
  assert.ok(body?.instructions);const instructions=body.instructions,name=contract.origin==='public-transform'?'transformClass':contract.origin==='public-build-module'?'buildModule':'build';
  const producers=instructions.filter(ins=>ins.cp?.owner==='java.lang.classfile.ClassFile'&&ins.cp.name===name&&ins.cp.descriptor.endsWith('[B'));
  const siblings=classFileArtifactContracts[entry.id].filter(c=>c.origin===contract.origin);assert.equal(producers.length,siblings.length,'Every returned producer is independently selected, including two-array cases');
  const producer=producers[contract.producerOrdinal];assert.ok(producer,'Literal selected producer ordinal');const producerIndex=instructions.indexOf(producer),byteArrayLocal=localIndex(instructions[producerIndex+1],'astore');
  assert.notEqual(byteArrayLocal,null,'Actual public returned array immediately stored in a local');
  assert.equal(instructions.slice(producerIndex+1).filter(ins=>localIndex(ins,'astore')===byteArrayLocal).length,1,'Selected returned-array local is not replaced after its producer');
  assert.ok(!instructions.slice(producerIndex+2).some(ins=>ins.name==='bastore'),'No returned class-byte rewriting');
  const transports=instructions.map((ins,n)=>({ins,n})).filter(({ins,n})=>ins.cp?.owner===support&&ins.cp.name==='artifact'&&ins.cp.descriptor==='(Ljava/lang/String;Ljava/lang/String;[B)V'&&
    instructions[n-3]?.cp?.tag===8&&instructions[n-3].cp.value===entry.id&&instructions[n-2]?.cp?.tag===8&&instructions[n-2].cp.value===contract.id);
  assert.equal(transports.length,1,'Exactly one literal artifact transport per selected returned array');const {ins:transport,n:transportIndex}=transports[0];
  assert.ok(transportIndex>producerIndex);assert.equal(localIndex(instructions[transportIndex-1],'aload'),byteArrayLocal,'Transport uses the actual selected returned array');
  const definitions=instructions.map((ins,n)=>({ins,n})).filter(({ins,n})=>ins.cp?.owner==='java.lang.invoke.MethodHandles$Lookup'&&ins.cp.name==='defineClass'&&ins.cp.descriptor==='([B)Ljava/lang/Class;'&&localIndex(instructions[n-1],'aload')===byteArrayLocal);
  let definition=null,generatedClassLocal=null,heldMethodRoutes=[];
  if(contract.definition==='metadata-only-neverdefine')assert.deepEqual(definitions,[],'This selected metadata-only array is never defined, even when a sibling array is eligible');
  else {
    assert.equal(contract.definition,'define-and-invoke');assert.equal(definitions.length,1);const {ins,n}=definitions[0];assert.ok(n>transportIndex);definition=ins;
    generatedClassLocal=localIndex(instructions[n+1],'astore');assert.notEqual(generatedClassLocal,null,'Own output definition result is held in a class local');
    assert.equal(instructions.slice(n+1).filter(i=>localIndex(i,'astore')===generatedClassLocal).length,1,'Defined class local is not substituted after definition');
    for(let p=n+2;p<instructions.length;p++){
      const lookup=instructions[p];if(lookup.cp?.owner!=='java.lang.invoke.MethodHandles$Lookup'||!['findStatic','findVirtual','findConstructor'].includes(lookup.cp.name))continue;
      let start=p-1;while(start>n&&!instructions[start].cp?.owner?.startsWith('java.lang.invoke.MethodHandles$Lookup'))start--;
      if(!instructions.slice(start+1,p).some(i=>localIndex(i,'aload')===generatedClassLocal))continue;
      const handleLocal=localIndex(instructions[p+1],'astore');if(handleLocal===null)continue;
      assert.equal(instructions.slice(p+1).filter(i=>localIndex(i,'astore')===handleLocal).length,1,'Selected held method handle is not replaced after lookup');
      const calls=instructions.map((call,q)=>({call,q})).filter(({call,q})=>q>p&&call.cp?.owner==='java.lang.invoke.MethodHandle'&&['invoke','invokeExact'].includes(call.cp.name)&&
        instructions.slice(p+2,q).some((load,r)=>localIndex(load,'aload')===handleLocal&&!instructions.slice(p+3+r,q).some(other=>other.cp?.owner==='java.lang.invoke.MethodHandle'&&['invoke','invokeExact'].includes(other.cp.name))));
      if(calls.length)heldMethodRoutes.push({lookup,handleLocal,invocations:calls.map(x=>x.call)});
    }
    assert.ok(heldMethodRoutes.length>0,'The method handle comes from this output-defined class and is actually invoked');
  }
  return {caseId:entry.id,artifactId:contract.id,originalClassFile:owner.classFile,originalCaseCodeSha256:body.codeSha256,producer,producerOrdinal:contract.producerOrdinal,byteArrayLocal,transport,definition,generatedClassLocal,heldMethodRoutes,
    sameLocalStaticBindingProven:true,dynamicBranchCoverageProven:false,generalDataFlowConformanceProven:false};
}
function inputProof(group,classes) {
  const expected=classFileInputContracts[group.id];assert.ok(expected);
  const byName=new Map(classes.map(item=>[item.className,item])),classPath=name=>name.replaceAll('.','/')+'.class';
  assert.deepEqual(classes.map(item=>item.className),expected.driverClassNames.slice().sort((a,b)=>classPath(a)<classPath(b)?-1:classPath(a)>classPath(b)?1:0),'Exact naturally emitted original compiler rows');
  for(const item of classes){
    const contract=expected.driverContracts.find(c=>c.className===item.className);assert.ok(contract);assert.equal(item.major,69);assert.equal(item.minor,0);
    for(const key of ['flags','superclass','interfaces'])assert.deepEqual(item[key],contract[key],'Exact original type/annotation/record/local/transform parent and flags');
    assert.equal(new Set(item.methods.map(m=>m.name+m.descriptor)).size,item.methods.length);
  }
  const owner=byName.get(group.mainClass),named=owner.methods.filter(m=>m.name!=='main'&&!m.name.startsWith('case')&&!m.name.startsWith('<'));
  assert.deepEqual(named.map(({name,descriptor,flags})=>({name,descriptor,flags})),expected.callbacks.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Complete named original helper inventory, not opaque positive traces');
  const callbackProofs=expected.callbacks.map(callback=>{
    const method=owner.methods.find(m=>m.name===callback.name&&m.descriptor===callback.descriptor);assert.ok(method?.instructions);assert.equal(method.flags,callback.flags);
    const bindings=owner.bootstrapMethods.filter(item=>item.arguments.some(a=>a.tag===15&&a.referenceKind===6&&a.reference?.owner===group.mainClass&&a.reference.name===callback.name&&a.reference.descriptor===callback.descriptor));
    if(callback.binding==='bootstrap'){assert.ok(bindings.length);for(const binding of bindings)assert.equal(binding.method.reference?.owner,'java.lang.invoke.LambdaMetafactory');}
    else {assert.deepEqual(bindings,[]);if(callback.binding==='direct')assert.ok(owner.methods.some(m=>m.instructions?.some(i=>i.cp?.owner===group.mainClass&&i.cp.name===callback.name&&i.cp.descriptor===callback.descriptor)),'Actual direct named helper call');else{
      assert.equal(callback.binding,'static-resource-origin');assert.equal(callback.name,'enclosing');assert.ok(method.instructions.some(i=>i.name==='new'&&i.cp?.value===group.mainClass+'$1D4Local'),'Genuine unused source method emitted the selected local-class resource');
    }}
    return {...callback,originalClassFile:owner.classFile,codeSha256:method.codeSha256,codeHex:method.codeHex,instructions:method.instructions,bootstrapBindings:bindings,callbackExecutionCoverageProven:false};
  });
  const codecProofs=expected.codecs.map(codec=>{
    const clazz=byName.get(codec.owner);assert.deepEqual(clazz.interfaces,[codec.interface]);const method=clazz.methods.find(m=>m.name===codec.name&&m.descriptor===codec.descriptor);assert.ok(method?.instructions);assert.equal(method.flags,codec.flags);
    return {...codec,originalClassFile:clazz.classFile,codeSha256:method.codeSha256,codeHex:method.codeHex,instructions:method.instructions,transformDispatchExecutionCoverageProven:false};
  });
  const utility=byName.get(support),bytesMethod=utility.methods.find(m=>m.name==='bytes'&&m.descriptor==='(Ljava/lang/Class;Ljava/lang/String;)[B'),artifactMethod=utility.methods.find(m=>m.name==='artifact'&&m.descriptor==='(Ljava/lang/String;Ljava/lang/String;[B)V');
  assert.ok(bytesMethod?.instructions&&artifactMethod?.instructions);
  assert.ok(bytesMethod.instructions.some(i=>i.cp?.owner==='java.lang.Class'&&i.cp.name==='getResourceAsStream'&&i.cp.descriptor==='(Ljava/lang/String;)Ljava/io/InputStream;'));
  assert.ok(bytesMethod.instructions.some(i=>i.cp?.owner==='java.io.InputStream'&&i.cp.name==='readAllBytes'&&i.cp.descriptor==='()[B'));
  const encoded=artifactMethod.instructions.findIndex(i=>i.cp?.owner==='java.util.Base64$Encoder'&&i.cp.name==='encodeToString'&&i.cp.descriptor==='([B)Ljava/lang/String;');assert.ok(encoded>0);assert.equal(localIndex(artifactMethod.instructions[encoded-1],'aload'),2,'Real transported byte-array parameter, not a native constant');
  const resourceProofs=expected.resources.map(resource=>{
    const method=owner.methods.find(m=>m.name===resource.method&&m.descriptor===resource.descriptor);assert.ok(method?.instructions);
    const at=method.instructions.findIndex((ins,n)=>ins.cp?.tag===7&&ins.cp.value===group.mainClass&&method.instructions[n+2]?.cp?.owner===support&&method.instructions[n+2].cp.name==='bytes'&&method.instructions[n+2].cp.descriptor==='(Ljava/lang/Class;Ljava/lang/String;)[B');
    assert.ok(at>=0,'Genuine recipe-class resource anchor');
    let caller=null;if(resource.caller){
      assert.equal(localIndex(method.instructions[at+1],'aload'),1,'Reader receives its actual resource-string parameter');const body=owner.methods.find(m=>m.name===resource.caller&&m.descriptor==='()V');
      const call=body.instructions.findIndex((ins,n)=>ins.cp?.owner===group.mainClass&&ins.cp.name===resource.method&&ins.cp.descriptor===resource.descriptor&&body.instructions[n-1]?.cp?.tag===8&&body.instructions[n-1].cp.value===resource.name);
      assert.ok(call>=0,'Exact original case passes the selected literal resource, not an adapter');caller={method:resource.caller,codeSha256:body.codeSha256,instruction:body.instructions[call],literal:body.instructions[call-1]};
    }else {assert.equal(method.instructions[at+1].cp?.tag,8);assert.equal(method.instructions[at+1].cp.value,resource.name);}
    const target=byName.get(resource.target);assert.ok(target);const profile=classFileSemanticProfile(target);assert.deepEqual(profile,classFileResourceContracts[resource.target],'Complete typed genuine compiler-resource profile');
    return {...resource,originalClassFile:owner.classFile,targetClassFile:target.classFile,codeSha256:method.codeSha256,resourceInstructionIndex:at,caller,profile,sourceResourceUnchanged:true};
  });
  const map=new Map(classes.map(item=>[item.className,{file:item.classFile,methods:new Map(item.methods.filter(m=>m.instructions).map(m=>[m.name+m.descriptor,m]))}]));
  const caseProofs=proveCoreGroup(group,map).map(proof=>({...proof,fullSourceUnitConformanceProven:false}));
  for(const entry of group.cases){
    const body=owner.methods.find(m=>m.name===entry.entryMethod&&m.descriptor===entry.entryDescriptor);
    const emits=body.instructions.filter((ins,n)=>ins.cp?.owner===support&&ins.cp.name==='emit'&&ins.cp.descriptor==='(Ljava/lang/String;Ljava/lang/String;)V'&&
      body.instructions[n-2]?.cp?.tag===8&&body.instructions[n-2].cp.value===entry.id&&body.instructions[n-1]?.cp?.tag===8&&body.instructions[n-1].cp.value===entry.trace[0]);
    assert.equal(emits.length,1,'The expected CASE tuple is the actual original source literal, not a producer-generated verdict');
  }
  const main=owner.methods.find(m=>m.name==='main'&&m.descriptor==='([Ljava/lang/String;)V');assert.ok(main?.instructions);
  assert.deepEqual(main.instructions.filter(i=>i.cp?.owner===group.mainClass&&i.cp.name.startsWith('case')).map(i=>i.cp.name),group.cases.map(c=>c.entryMethod),'Original entry point calls every fixed case in order');
  assert.ok(main.instructions.some(i=>i.cp?.tag===8&&i.cp.value===group.completionMarker),'Original completion marker literal');
  const caseCallbackProofs=group.cases.map(entry=>({id:entry.id,probes:entry.callbackMethods.map(probe=>{
    const clazz=byName.get(probe.className||group.mainClass),method=clazz.methods.find(m=>m.name===probe.method&&m.descriptor===probe.descriptor);assert.ok(method?.instructions);
    assert.ok(clazz.className===group.mainClass?expected.callbacks.some(c=>c.name===probe.method&&c.descriptor===probe.descriptor):expected.codecs.some(c=>c.owner===clazz.className&&c.name===probe.method&&c.descriptor===probe.descriptor),'Independently selected named helper/typed lifecycle body');
    const matches=[];for(const opcode of probe.requiredOpcodes){const found=method.instructions.find(i=>i.name===opcode||i.modifiedOpcode===opcode);assert.ok(found,'Original selected helper opcode');matches.push(found);}
    for(const operand of probe.symbolicOperands||[]){const keys=operand.tag===7?['value']:['owner','name','descriptor'];const found=method.instructions.find(i=>i.name===operand.opcode&&i.cp?.tag===operand.tag&&keys.every(k=>i.cp[k]===operand[k]));assert.ok(found,'Exact original helper public operand '+probe.method+' '+operand.name);matches.push(found);}
    return {owner:clazz.className,method:method.name,descriptor:method.descriptor,originalClassFile:clazz.classFile,codeSha256:method.codeSha256,matches,opaqueCallbackStaticReachabilityProven:false};
  })}));
  const returnedArrayRoutes=group.cases.flatMap(entry=>classFileArtifactContracts[entry.id].map(c=>returnedArrayRoute(entry,group,classes,c)));
  const apiOnlyRoutes=group.cases.filter(entry=>classFileArtifactContracts[entry.id].length===0).map(entry=>{
    const method=owner.methods.find(m=>m.name===entry.entryMethod&&m.descriptor===entry.entryDescriptor);assert.ok(!method.instructions.some(i=>i.cp?.owner===support&&i.cp.name==='artifact'));
    assert.ok(!method.instructions.some(i=>i.cp?.owner==='java.lang.invoke.MethodHandles$Lookup'&&i.cp.name==='defineClass'));return {caseId:entry.id,originalClassFile:owner.classFile,codeSha256:method.codeSha256,transportedArtifacts:0,definitions:0};
  });
  return canonicalClassFileProof({schemaVersion:1,group:group.id,classes,caseProofs,callbackProofs,codecProofs,caseCallbackProofs,resourceProofs,returnedArrayRoutes,apiOnlyRoutes,
    compilerBytesTransformed:false,generatedArtifactsAreCompilerInputs:false,dynamicBranchCoverageProven:false,opaqueCallbackStaticReachabilityProven:false,fullSourceUnitConformanceProven:false,fullPublicClassFileApiConformanceProven:false});
}
export function proveClassFileInputGroup(group,directory,classFiles) {
  return inputProof(group,classFiles.map(file=>decodeClassFileEvidence(fs.readFileSync(path.join(directory,file.path)),file)));
}
export function assertClassFileInputProofs(record,group) {
  assert.equal(record.release,25);const proof=record.inputProofs;assert.ok(proof&&Array.isArray(proof.classes));assert.deepEqual(proof.classes.map(c=>c.classFile),record.classFiles);
  const classes=proof.classes.map(item=>{assert.equal(typeof item.originalBytesBase64,'string');const bytes=Buffer.from(item.originalBytesBase64,'base64');assert.equal(bytes.toString('base64'),item.originalBytesBase64);return decodeClassFileEvidence(bytes,item.classFile);});
  assert.deepEqual(proof,inputProof(group,classes),'Original bytes, source helper/resource and each returned-array route independently replay');
}
export function proveClassFileArtifact(bytes,contract,{host,caseId,record}) {
  assert.ok(['native','node','chromium'].includes(host));assert.deepEqual(contract,classFileArtifactContracts[caseId].find(c=>c.id===contract.id));
  const decoded=inspectClassFileArtifactBytes(bytes,contract);assertClassFileInputProofs(record,{...classFileInputContracts[record.group],id:record.group,cases:record.cases});
  const route=record.inputProofs.returnedArrayRoutes.find(r=>r.caseId===caseId&&r.artifactId===contract.id);assert.ok(route);
  let regeneration=null;
  if(contract.id==='type-relocated'){
    const original=record.inputProofs.classes.find(c=>c.className===prefix+'D4TypeTarget'),names=['cast','checkType','make','caught','resource'],methods=[];
    for(const name of names){
      const before=original.methods.find(m=>m.name===name),after=decoded.methods.find(m=>m.name===name),prior=classFileSemanticProfile(original).methods.find(m=>m.name===name),current=decoded.semanticProfile.methods.find(m=>m.name===name);
      assert.ok(after.codeLength>before.codeLength&&after.codeSha256!==before.codeSha256,'Genuine selected output instructions grew after relocation');
      if(name==='caught'){const old=prior.debug.RuntimeVisibleTypeAnnotations.find(a=>a.targetType===0x42),now=current.debug.RuntimeVisibleTypeAnnotations.find(a=>a.targetType===0x42);assert.equal(old.target.exceptionTableIndex,0);assert.equal(now.target.exceptionTableIndex,1);assert.equal(after.handlers.length,2);}
      else {
        const type=name==='resource'?0x41:name==='cast'?0x47:name==='make'?0x44:0x43,old=prior.debug.RuntimeVisibleTypeAnnotations.find(a=>a.targetType===type),now=current.debug.RuntimeVisibleTypeAnnotations.find(a=>a.targetType===type);assert.ok(old&&now);
        if(type===0x41){assert.equal(old.target.table.length,now.target.table.length);for(let n=0;n<old.target.table.length;n++){assert.equal(old.target.table[n].slot,now.target.table[n].slot);for(const edge of ['start','end']){const b=old.target.table[n][edge],a=now.target.table[n][edge];assert.ok((a===after.instructions.length?after.codeLength:after.instructions[a].pc)>(b===before.instructions.length?before.codeLength:before.instructions[b].pc),'Actual resource scope BCI changed');}}}
        else assert.ok(after.instructions[now.target.target].pc>before.instructions[old.target.target].pc,'Actual CAST/NEW/INSTANCEOF target BCI moves, not merely renamed labels');
        if(name==='cast')for(const attribute of ['RuntimeVisibleTypeAnnotations','RuntimeInvisibleTypeAnnotations']){
          const localBefore=prior.debug[attribute].find(a=>a.targetType===0x40),localAfter=current.debug[attribute].find(a=>a.targetType===0x40);assert.equal(localBefore.target.table.length,localAfter.target.table.length);
          for(let n=0;n<localBefore.target.table.length;n++)for(const edge of ['start','end']){const b=localBefore.target.table[n][edge],a=localAfter.target.table[n][edge];assert.ok((a===after.instructions.length?after.codeLength:after.instructions[a].pc)>(b===before.instructions.length?before.codeLength:before.instructions[b].pc));}
        }
      }
      methods.push({name,originalCodeSha256:before.codeSha256,outputCodeSha256:after.codeSha256,originalCodeLength:before.codeLength,outputCodeLength:after.codeLength,originalTypeVectors:prior.debug,outputTypeVectors:current.debug});
    }
    regeneration={originalClassFile:original.classFile,methods,sourceResourceUnchanged:true,actualOutputTypeLabelRangesAndCatchIndexProven:true,nativeOutputSubstitution:false};
  }
  return {schemaVersion:1,caseId,artifactId:contract.id,producerHost:host,origin:contract.origin,regeneration,genuineCompilerBytes:false,originalInputClassFiles:record.classFiles,originalCaseCodeSha256:route.originalCaseCodeSha256,
    selectedDefinitionRequirement:contract.definition,returnedArrayStaticRoute:route,bytesBase64:bytes.toString('base64'),size:bytes.length,sha256:sha(bytes),decoded,
    nativeBytesSubstituted:false,byteForByteNativeParityProven:false,dynamicBranchCoverageProven:false,sameJvmDefinitionGeneralConformanceProven:false,
    fullPublicClassFileApiConformanceProven:false,fullBytecodeVerifierConformanceProven:false,fullStackMapConformanceProven:false,classFileApiSealingConformanceProven:false,
    selectedCanonicalControlFlowProven:true,selectedExpandedFrameVectorsProven:true,selectedRecursiveAnnotationMetadataVectorsProven:true,selectedModuleMetadataVectorsProven:true};
}

