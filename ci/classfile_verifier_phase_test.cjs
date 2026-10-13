'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto'),
  fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {before,after,test}=require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest}=require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..'),prefix='java/lang/classfile',sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let temporary,output,readStructureLayout,decodeCoreCode;
// Fixed from the completed pinned-SDK native65 oracle; its original62 prefix is unchanged.
// No private receipt or native bytes are runtime inputs. A thrown callback has no returned error list.
const expected=[
  {"id":"phase-v49-valid","major":49,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_v49_valid","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,1,0,3]]},
  {"id":"phase-v49-ordinary-bad","major":49,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_v49_ordinary_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-v49-bridge-bad","major":49,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_v49_bridge_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v49-parser-bridge","major":49,"count":2,"categories":"parser-constant,inference","className":"classes/modern_test/Phase_phase_v49_parser_bridge","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v50-valid","major":50,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_v50_valid","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,1,0,3]]},
  {"id":"phase-v50-ordinary-bad","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_v50_ordinary_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-v50-bridge-bad","major":50,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_v50_bridge_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v50-parser-bridge","major":50,"count":1,"categories":"parser-constant","className":"classes/modern_test/Phase_phase_v50_parser_bridge","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v51-valid","major":51,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_v51_valid","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,1,0,3]]},
  {"id":"phase-v51-ordinary-bad","major":51,"count":1,"categories":"byte-underflow","className":"classes/modern_test/Phase_phase_v51_ordinary_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-v51-bridge-bad","major":51,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_v51_bridge_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v51-parser-bridge","major":51,"count":1,"categories":"parser-constant","className":"classes/modern_test/Phase_phase_v51_parser_bridge","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v69-valid","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_v69_valid","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,1,0,3]]},
  {"id":"phase-v69-ordinary-bad","major":69,"count":1,"categories":"byte-underflow","className":"classes/modern_test/Phase_phase_v69_ordinary_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-v69-bridge-bad","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_v69_bridge_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-v69-parser-bridge","major":69,"count":1,"categories":"parser-constant","className":"classes/modern_test/Phase_phase_v69_parser_bridge","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",73,0,0,1]]},
  {"id":"phase-bridge-no-code","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_no_code","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,null,null,null]]},
  {"id":"phase-synthetic-bad","major":69,"count":1,"categories":"byte-underflow","className":"classes/modern_test/Phase_phase_synthetic_bad","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",4105,0,0,1]]},
  {"id":"phase-bridge-lvt-operand","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_lvt_operand","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","(I)I",73,1,1,3]]},
  {"id":"phase-ordinary-lvt-operand","major":69,"count":1,"categories":"byte-lvt","className":"classes/modern_test/Phase_phase_ordinary_lvt_operand","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","(I)I",9,1,1,3]]},
  {"id":"phase-bridge-debug-initialization","major":69,"count":1,"categories":"initialization-debug","className":"classes/modern_test/Phase_phase_bridge_debug_initialization","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","(I)I",73,1,1,3]]},
  {"id":"phase-bridge-locals-short","major":69,"count":1,"categories":"parser-arguments","className":"classes/modern_test/Phase_phase_bridge_locals_short","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","(I)I",73,1,0,3]]},
  {"id":"phase-native-with-code","major":69,"count":1,"categories":"parser-code","className":"classes/modern_test/Phase_phase_native_with_code","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",265,1,0,3]]},
  {"id":"phase-abstract-with-code","major":69,"count":1,"categories":"parser-code","className":"classes/modern_test/Phase_phase_abstract_with_code","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",1025,1,1,3]]},
  {"id":"phase-native-no-code","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_native_no_code","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",265,null,null,null]]},
  {"id":"phase-abstract-no-code","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_abstract_no_code","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",1025,null,null,null]]},
  {"id":"phase-multi50","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_multi50","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["first","()I",9,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-multi50-bridge","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_multi50_bridge","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["first","()I",9,0,0,1],["bridgeBetween","()I",73,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-multi50-parser","major":50,"count":2,"categories":"parser-constant,inference","className":"classes/modern_test/Phase_phase_multi50_parser","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["first","()I",9,0,0,1],["bridgeBetween","()I",73,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-multi69","major":69,"count":2,"categories":"byte-underflow,byte-return","className":"classes/modern_test/Phase_phase_multi69","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["first","()I",9,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-multi69-bridge","major":69,"count":2,"categories":"byte-underflow,byte-return","className":"classes/modern_test/Phase_phase_multi69_bridge","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["first","()I",9,0,0,1],["bridgeBetween","()I",73,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-multi69-parser","major":69,"count":3,"categories":"parser-constant,byte-underflow,byte-return","className":"classes/modern_test/Phase_phase_multi69_parser","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["first","()I",9,0,0,1],["bridgeBetween","()I",73,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-parser-valid50","major":50,"count":1,"categories":"parser-constant","className":"classes/modern_test/Phase_phase_parser_valid50","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",9,1,0,3]]},
  {"id":"phase-bridge-jsr50","major":50,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_jsr50","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,2,1,8]]},
  {"id":"phase-mixed-jsr50","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_mixed_jsr50","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["first","()I",9,2,1,8],["bridgeBetween","()I",73,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-bridge-jsr69","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_jsr69","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,2,1,8]]},
  {"id":"phase-mixed-jsr69","major":69,"count":2,"categories":"byte-discontinued,byte-return","className":"classes/modern_test/Phase_phase_mixed_jsr69","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["first","()I",9,2,1,8],["bridgeBetween","()I",73,0,0,1],["second","()I",9,0,0,1]]},
  {"id":"phase-excluded-Object","major":69,"count":0,"categories":"empty","className":"java/lang/Object","flags":33,"superclass":null,"interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-parser-Object","major":69,"count":1,"categories":"parser-constant","className":"java/lang/Object","flags":33,"superclass":null,"interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-Class","major":69,"count":0,"categories":"empty","className":"java/lang/Class","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-parser-Class","major":69,"count":1,"categories":"parser-constant","className":"java/lang/Class","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-String","major":69,"count":0,"categories":"empty","className":"java/lang/String","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-parser-String","major":69,"count":1,"categories":"parser-constant","className":"java/lang/String","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-Throwable","major":69,"count":0,"categories":"empty","className":"java/lang/Throwable","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-excluded-parser-Throwable","major":69,"count":1,"categories":"parser-constant","className":"java/lang/Throwable","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[["wrongConstant","Ljava/lang/String;",25]],"methods":[["value","()I",9,0,0,1]]},
  {"id":"phase-resolver50-IllegalArgumentException","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_resolver50_IllegalArgumentException","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",9,1,1,2],["later","()I",9,0,0,1]]},
  {"id":"phase-resolver50-IllegalStateException","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_resolver50_IllegalStateException","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",9,1,1,2],["later","()I",9,0,0,1]]},
  {"id":"phase-resolver50-AssertionError","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_resolver50_AssertionError","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",9,1,1,2],["later","()I",9,0,0,1]]},
  {"id":"phase-resolver69-IllegalArgumentException","major":69,"count":2,"categories":"resolver-IllegalArgumentException,byte-underflow","className":"classes/modern_test/Phase_phase_resolver69_IllegalArgumentException","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",9,1,1,2],["later","()I",9,0,0,1]]},
  {"id":"phase-resolver69-IllegalStateException","major":69,"count":2,"categories":"resolver-IllegalStateException,byte-underflow","className":"classes/modern_test/Phase_phase_resolver69_IllegalStateException","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",9,1,1,2],["later","()I",9,0,0,1]]},
  {"id":"phase-resolver69-AssertionError","major":69,"count":2,"categories":"resolver-AssertionError,byte-underflow","className":"classes/modern_test/Phase_phase_resolver69_AssertionError","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",9,1,1,2],["later","()I",9,0,0,1]]},
  {"id":"phase-bridge-resolver50","major":50,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_resolver50","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",73,1,1,2]]},
  {"id":"phase-bridge-resolver69","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_resolver69","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["reference","(Ljava/lang/String;)Ljava/lang/Number;",73,1,1,2]]},
  {"id":"phase-parser-callback-VerifyError","major":69,"count":"throws-VerifyError","categories":"parser-VerifyError-identity","className":"classes/modern_test/Phase_phase_parser_callback_VerifyError","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[]},
  {"id":"phase-parser-callback-IAE","major":69,"count":1,"categories":"parser-IAE-singleton","className":"classes/modern_test/Phase_phase_parser_callback_IAE","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[]},
  {"id":"phase-parser-callback-IAE-after-duplicate","major":69,"count":1,"categories":"parser-IAE-singleton","className":"classes/modern_test/Phase_phase_parser_callback_IAE_after_duplicate","flags":33,"superclass":"java/lang/Object","interfaces":["java/io/Serializable","java/io/Serializable"],"fields":[],"methods":[]},
  {"id":"phase-jsr-lvt-first69","major":69,"count":1,"categories":"byte-lvt","className":"classes/modern_test/Phase_phase_jsr_lvt_first69","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,2,1,8]]},
  {"id":"phase-jsr-lvt-fallback50","major":50,"count":1,"categories":"inference","className":"classes/modern_test/Phase_phase_jsr_lvt_fallback50","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",9,2,1,8]]},
  {"id":"phase-bridge-jsr-lvt69","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_bridge_jsr_lvt69","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[["value","()I",73,2,1,8]]},
  {"id":"phase-object-ctor-auto","major":69,"count":0,"categories":"empty","className":"java/lang/Object","flags":33,"superclass":null,"interfaces":[],"fields":[],"methods":[["<init>","()V",1,0,1,1]]},
  {"id":"phase-object-ctor-generate","major":69,"count":0,"categories":"empty","className":"java/lang/Object","flags":33,"superclass":null,"interfaces":[],"fields":[],"methods":[["<init>","()V",1,0,1,1]]},
  {"id":"phase-object-ctor-drop","major":69,"count":0,"categories":"empty","className":"java/lang/Object","flags":33,"superclass":null,"interfaces":[],"fields":[],"methods":[["<init>","()V",1,0,1,1]]},
  {"id":"phase-parser-name-multiple","major":69,"count":0,"categories":"empty","className":"classes/modern_test/Phase_phase_parser_name_multiple","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[]},
  {"id":"phase-parser-name-short-circuit","major":69,"count":"throws-VerifyError","categories":"parser-VerifyError-identity","className":"classes/modern_test/Phase_phase_parser_name_short_circuit","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[]},
  {"id":"phase-parser-name-IAE","major":69,"count":1,"categories":"parser-IAE-singleton","className":"classes/modern_test/Phase_phase_parser_name_IAE","flags":33,"superclass":"java/lang/Object","interfaces":[],"fields":[],"methods":[]}
];
function checked(command,args,cwd=root,timeout=60000) {
  const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-6000));return result;
}
before(async()=>{
  ({readStructureLayout}=await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode}=await import('./java_core_bytecode.mjs'));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-verifier-phase-'));fs.chmodSync(temporary,0o700);
  output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  compileClassFileMetadata({root,classlib:path.join(root,'classes/modern_classlib'),output,support,checked});
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
function unit(name) {
  const bytes=fs.readFileSync(path.join(output,prefix,name+'.class'));
  assert.equal(bytes.readUInt16BE(6),53,'Natural source9/release9 phase implementation, never a changed SDK header');
  return {bytes,layout:readStructureLayout(bytes)};
}
function body(value,name,descriptor) {
  const entries=value.layout.methods.entries.filter(method=>method.name===name&&method.descriptor===descriptor);
  assert.equal(entries.length,1,'Exact real phase method '+name+descriptor);assert.ok(entries[0].code);
  const code=entries[0].code;
  return decodeCoreCode(value.bytes.subarray(code.instructionsOffset,code.instructionsOffset+code.codeLength),value.layout.pool,value.bytes);
}
test('compiled phase helper precedes configured traversal while ordinary verification retains purpose and no-definition seams',()=>{
  const parser=unit('DoppioClassFileParserVerifier'),verifier=unit('DoppioClassFileVerifier'),reader=unit('DoppioClassReader');
  const parserBody=body(parser,'verify','(Ljava/lang/classfile/ClassModel;)Ljava/util/List;');
  assert.ok(parserBody.some(instruction=>instruction.name.startsWith('invoke')),'Actual structural-parser Java body');
  const modelBody=body(verifier,'verify','(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/util/List;');
  const parserCall=modelBody.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.DoppioClassFileParserVerifier'&&
    instruction.cp.name==='verify'&&instruction.cp.descriptor==='(Ljava/lang/classfile/ClassModel;)Ljava/util/List;');
  const traversal=modelBody.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.DoppioClassReader'&&instruction.cp.name==='forEachForVerification');
  assert.ok(parserCall>=0&&traversal>parserCall,'Structural collection happens before configured Code traversal and bytecode selection');
  const ordinary=body(verifier,'verifyMethod','(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/MethodModel;Ljava/lang/classfile/ClassHierarchyResolver;)V');
  const lvtMapper=ordinary.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.Attributes'&&instruction.cp.name==='localVariableTable');
  const firstLvt=ordinary.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.CodeModel'&&instruction.cp.name==='findAttribute');
  const frameEntries=ordinary.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.attribute.StackMapTableAttribute'&&
    instruction.cp.name==='entries'&&instruction.cp.descriptor==='()Ljava/util/List;');
  const discontinued=ordinary.map((instruction,index)=>({instruction,index})).filter(({instruction})=>
    instruction.cp?.owner==='java.lang.classfile.DoppioClassReader'&&instruction.cp.name==='hasDiscontinuedForVerification'&&
    instruction.cp.descriptor==='(Ljava/lang/classfile/CodeModel;)Z');
  const flow=ordinary.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.DoppioCodeFlow'&&instruction.cp.name==='analyzeForVerification');
  assert.equal(discontinued.length,1,'One held discontinued marker query in the actual three-argument verifier method');
  assert.ok(lvtMapper>=0&&firstLvt>lvtMapper&&frameEntries>firstLvt&&discontinued[0].index>frameEntries&&flow>discontinued[0].index,
    'First LVT and StackMap entries precede discontinued rejection, which precedes verification-purpose flow');
  assert.ok(!ordinary.some(instruction=>instruction.cp?.owner==='java.lang.classfile.DoppioClassReader'&&instruction.cp.name==='forEachForVerification'),
    'Ordinary method verification never repeats the primary configured traversal');
  const marker=body(reader,'hasDiscontinuedForVerification','(Ljava/lang/classfile/CodeModel;)Z');
  assert.deepEqual(marker.filter(instruction=>instruction.name==='getfield').map(instruction=>
    [instruction.cp.owner,instruction.cp.name,instruction.cp.descriptor]),[
      ['java.lang.classfile.DoppioClassReader$CodeValue','instructionsDecoded','Z'],
      ['java.lang.classfile.DoppioClassReader$CodeValue','hasDiscontinuedInstructions','Z']
    ],'Reader getter checks completed required traversal, then reads its exact held opcode marker');
  assert.ok(!marker.some(instruction=>instruction.cp?.name==='instructions'||/^(?:iaload|baload|aaload)$/.test(instruction.name)),
    'Held marker getter has neither instruction factories nor a repeated raw-byte scan');
  const decoding=body(reader,'instructions','(Ljava/lang/classfile/DoppioClassReader$CodeValue;Z)Ljava/util/List;');
  const writes=decoding.map((instruction,index)=>({instruction,index})).filter(({instruction})=>instruction.name==='putfield'&&
    instruction.cp.owner==='java.lang.classfile.DoppioClassReader$CodeValue'&&instruction.cp.name==='hasDiscontinuedInstructions'&&instruction.cp.descriptor==='Z');
  assert.equal(writes.length,2,'Existing required instruction modeling records only its JSR and RET kinds');
  for(const {index}of writes)assert.equal(decoding[index-1].name,'iconst_1','Discontinued kind records a true marker');
  const jsrFactory=decoding.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction'&&instruction.cp.name==='of');
  const retFactory=decoding.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction'&&instruction.cp.name==='of');
  assert.ok(writes[0].index<jsrFactory&&jsrFactory<writes[1].index&&writes[1].index<retFactory,
    'Held opcode markers are bound to the actual existing JSR/RET modeling branches');
  const immutable=decoding.findIndex(instruction=>instruction.cp?.owner==='java.lang.classfile.DoppioClassReader'&&
    instruction.cp.name==='immutable'&&instruction.cp.descriptor==='(Ljava/util/List;)Ljava/util/List;');
  const decoded=decoding.map((instruction,index)=>({instruction,index})).filter(({instruction})=>instruction.name==='putfield'&&
    instruction.cp.owner==='java.lang.classfile.DoppioClassReader$CodeValue'&&instruction.cp.name==='instructionsDecoded'&&instruction.cp.descriptor==='Z');
  assert.equal(decoded.length,1);assert.ok(immutable>=0&&decoded[0].index>immutable);
  assert.equal(decoding[decoded[0].index-1].name,'iconst_1','Completed-traversal state is set only after successful immutable output');
  for(const value of [parser,verifier])for(const method of value.layout.methods.entries.filter(entry=>entry.code)) {
    const instructions=body(value,method.name,method.descriptor);
    assert.ok(!instructions.some(instruction=>instruction.cp&&/^(?:defineClass|defineHiddenClass|ensureClassInitialized|initialize)$/.test(instruction.cp.name)),
      'Library phase implementation never defines target arrays or initializes them for a verdict');
  }
});
test('fresh source executes unchanged stock25 native65 phase cases and reproduces every own metadata header/counter',()=>{
  const diagnostic=path.join(temporary,'diagnostic'),empty=path.join(temporary,'empty');fs.mkdirSync(diagnostic);fs.mkdirSync(empty);
  const sdk=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json'))).toolchains.find(item=>item.feature===25).home;
  const inputs=['ci/ClassFileVerifierPhaseRegression.java','classes/modern_fixture/classfile/ClassFileSupport.java'].map(relative=>path.join(root,relative));
  const hashes=inputs.map(filename=>[filename,sha(fs.readFileSync(filename))]);
  checked(path.join(sdk,'bin/javac'),['--release','25','-g','-parameters','-encoding','UTF-8','-proc:none','-sourcepath',empty,'-classpath',empty,'-d',diagnostic,...inputs]);
  assert.deepEqual(inputs.map(filename=>[filename,sha(fs.readFileSync(filename))]),hashes,'Original oracle source is never adapted per host');
  const originals=path.join(diagnostic,'classes/modern_test');
  const compilerNames=['ClassFileSupport.class','ClassFileVerifierPhaseRegression$NamedParserAttribute.class',
    'ClassFileVerifierPhaseRegression$NamedParserMapper.class','ClassFileVerifierPhaseRegression$ParserAttribute.class',
    'ClassFileVerifierPhaseRegression$ParserMapper.class','ClassFileVerifierPhaseRegression.class'];
  assert.deepEqual(fs.readdirSync(originals).sort(),compilerNames,'Exact six original stock-javac25 compiler rows');
  for(const name of compilerNames) {
    const original=fs.readFileSync(path.join(originals,name));
    assert.equal(original.readUInt16BE(6),69,'Genuine untouched original javac25 compiler row: '+name);
    assert.equal(original.readUInt16BE(4),0,'No preview or substituted original header: '+name);
  }
  const result=runClassFileMetadataGuest({root,output,diagnostic,checked,className:'classes.modern_test.ClassFileVerifierPhaseRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/attribute','java/lang/classfile/instruction','java/lang/classfile/constantpool','java/lang/constant']});
  assert.equal(result.stderr,'');const lines=result.stdout.replaceAll('\r\n','\n').trim().split('\n');
  assert.equal(expected.length,65);
  assert.deepEqual(lines.filter(line=>line.startsWith('PROFILE|')),expected.map(item=>
    'PROFILE|'+item.id+'|major='+item.major+'|bytes='+item.count+'|model='+item.count+'|categories='+item.categories));
  assert.deepEqual(lines.filter(line=>line.startsWith('CASE|')),expected.map(item=>
    'CASE|'+item.id+'|'+item.categories+';byte/model=equal;list=immutable;definition=never'));
  const artifacts=lines.filter(line=>line.startsWith('CF_ARTIFACT|'));assert.equal(artifacts.length,65);
  for(const [index,line]of artifacts.entries()) {
    const [marker,caseId,id,encoded]=line.split('|'),contract=expected[index];
    assert.equal(marker,'CF_ARTIFACT');assert.equal(caseId,contract.id);assert.equal(id,contract.id);
    const bytes=Buffer.from(encoded,'base64');assert.equal(bytes.toString('base64'),encoded,'Canonical actual returned-array transport');
    const layout=readStructureLayout(bytes),pool=layout.pool,cls=index=>index?pool[pool[index].first].value:null;
    assert.equal(bytes.readUInt16BE(6),contract.major);assert.equal(bytes.readUInt16BE(4),0);
    assert.deepEqual({className:cls(layout.thisClass),flags:layout.flags,superclass:cls(bytes.readUInt16BE(layout.superClassOffset)),
      interfaces:Array.from({length:layout.interfaceCount},(_,n)=>cls(bytes.readUInt16BE(layout.interfacesOffset+n*2))),
      fields:layout.fields.entries.map(field=>[field.name,field.descriptor,field.flags]),
      methods:layout.methods.entries.map(method=>[method.name,method.descriptor,method.flags,method.code?.maxStack??null,method.code?.maxLocals??null,method.code?.codeLength??null])},
      {className:contract.className,flags:contract.flags,superclass:contract.superclass,interfaces:contract.interfaces,fields:contract.fields,methods:contract.methods},
      'Own public output headers, method flags and Code counters: '+contract.id);
  }
  assert.equal(lines.at(-1),'CLASSFILE_VERIFIER_PHASE_REGRESSION_OK|cases=65|artifacts=65');
  const messages=lines.filter(line=>line.startsWith('VERIFY_MESSAGE|'));
  assert.equal(messages.length,50,'Completed native65 has 50 returned byte errors and two identity-preserving throws');
  assert.equal(messages.length,expected.reduce((count,item)=>count+(item.count==='throws-VerifyError'?0:item.count),0),
    'Exactly one raw message for every actual returned byte error');
  for(const item of expected)assert.equal(messages.filter(line=>line.startsWith('VERIFY_MESSAGE|'+item.id+'|')).length,
    item.count==='throws-VerifyError'?0:item.count);
  for(const id of ['phase-parser-callback-IAE','phase-parser-callback-IAE-after-duplicate'])
    assert.deepEqual(messages.filter(line=>line.startsWith('VERIFY_MESSAGE|'+id+'|')),['VERIFY_MESSAGE|'+id+'|phase-parser-held-IAE'],
      'Outer parser IAE singleton preserves the exact held message, not method-local toString');
  assert.deepEqual(messages.filter(line=>line.startsWith('VERIFY_MESSAGE|phase-parser-name-IAE|')),
    ['VERIFY_MESSAGE|phase-parser-name-IAE|phase-parser-held-name-IAE'],'Name getter IAE is the exact outer singleton diagnostic');
  assert.ok(lines.every(line=>/^(?:CF_ARTIFACT|PROFILE|CASE|VERIFY_MESSAGE|CLASSFILE_VERIFIER_PHASE_REGRESSION_OK)\|/.test(line)),
    'No unclassified extra output or substituted host summary');
});
