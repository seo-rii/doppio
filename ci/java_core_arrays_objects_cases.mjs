// Fixed semantic oracles for the B5 arrays/object clauses; these are not copied
// from a native run. Opcode probes bind real parameterized methods reachable
// from each dedicated entry; their presence is not dynamic-path coverage.
// Branches, handlers and initialization are dependencies, not JLS 14, B1,
// dynamic-bootstrap, monitor/memory, module or entire-chapter closure.
export default {
  id: "arrays-objects",
  source: "classes/modern_fixture/JavaCoreArraysObjects.java",
  mainClass: "classes.modern_test.JavaCoreArraysObjects",
  completionMarker: "CORE_ARRAYS_OBJECTS_OK",
  cases: [
    {
      id: "ao-boolean",
      entryMethod: "caseBoolean",
      entryDescriptor: "()V",
      trace: ["default=false","stored=true,false","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.baload","6.5.bastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateBoolean","descriptor":"(I)[Z","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadBoolean","descriptor":"([ZI)Z","requiredOpcodes":["baload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadBoolean","descriptor":"([ZIZ)Z","requiredOpcodes":["bastore","baload"]}
      ]
    },
    {
      id: "ao-byte",
      entryMethod: "caseByte",
      entryDescriptor: "()V",
      trace: ["default=0","stored=-128,-1","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.baload","6.5.bastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateByte","descriptor":"(I)[B","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadByte","descriptor":"([BI)I","requiredOpcodes":["baload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadByte","descriptor":"([BIB)I","requiredOpcodes":["bastore","baload"]}
      ]
    },
    {
      id: "ao-short",
      entryMethod: "caseShort",
      entryDescriptor: "()V",
      trace: ["default=0","stored=-32768,-1","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.saload","6.5.sastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateShort","descriptor":"(I)[S","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadShort","descriptor":"([SI)I","requiredOpcodes":["saload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadShort","descriptor":"([SIS)I","requiredOpcodes":["sastore","saload"]}
      ]
    },
    {
      id: "ao-char",
      entryMethod: "caseChar",
      entryDescriptor: "()V",
      trace: ["default=0","stored=32768,65535","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.caload","6.5.castore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateChar","descriptor":"(I)[C","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadChar","descriptor":"([CI)I","requiredOpcodes":["caload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadChar","descriptor":"([CIC)I","requiredOpcodes":["castore","caload"]}
      ]
    },
    {
      id: "ao-int",
      entryMethod: "caseInt",
      entryDescriptor: "()V",
      trace: ["default=0","stored=-2147483648,2147483647","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.iaload","6.5.iastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateInt","descriptor":"(I)[I","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadInt","descriptor":"([II)I","requiredOpcodes":["iaload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadInt","descriptor":"([III)I","requiredOpcodes":["iastore","iaload"]}
      ]
    },
    {
      id: "ao-long",
      entryMethod: "caseLong",
      entryDescriptor: "()V",
      trace: ["default=0","stored=-9223372036854775808,9223372036854775807","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.laload","6.5.lastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateLong","descriptor":"(I)[J","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadLong","descriptor":"([JI)J","requiredOpcodes":["laload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadLong","descriptor":"([JIJ)J","requiredOpcodes":["lastore","laload"]}
      ]
    },
    {
      id: "ao-float",
      entryMethod: "caseFloat",
      entryDescriptor: "()V",
      trace: ["default=0","stored=1069547520,-2147483648","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.faload","6.5.fastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateFloat","descriptor":"(I)[F","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadFloat","descriptor":"([FI)F","requiredOpcodes":["faload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadFloat","descriptor":"([FIF)F","requiredOpcodes":["fastore","faload"]}
      ]
    },
    {
      id: "ao-double",
      entryMethod: "caseDouble",
      entryDescriptor: "()V",
      trace: ["default=0","stored=4609434218613702656,-9223372036854775808","length=2"],
      anchors: {
        JLS: ["4.12.5","10.3","10.4"],
        JVMS: ["6.5.newarray","6.5.arraylength","6.5.daload","6.5.dastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateDouble","descriptor":"(I)[D","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadDouble","descriptor":"([DI)D","requiredOpcodes":["daload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadDouble","descriptor":"([DID)D","requiredOpcodes":["dastore","daload"]}
      ]
    },
    {
      id: "ao-reference",
      entryMethod: "caseReference",
      entryDescriptor: "()V",
      trace: ["default=null","first=true","second=true","distinct=true","null=true","length=2"],
      anchors: {
        JLS: ["4.12.2","4.12.5","10.4"],
        JVMS: ["6.5.anewarray","6.5.aaload","6.5.aastore","6.5.arraylength"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateReferences","descriptor":"(I)[Ljava/lang/Object;","requiredOpcodes":["anewarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"loadReference","descriptor":"([Ljava/lang/Object;I)Ljava/lang/Object;","requiredOpcodes":["aaload"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"storeLoadReference","descriptor":"([Ljava/lang/Object;ILjava/lang/Object;)Ljava/lang/Object;","requiredOpcodes":["aastore","aaload"]}
      ]
    },
    {
      id: "ao-read-order",
      entryMethod: "caseReadOrder",
      entryDescriptor: "()V",
      trace: ["A","I","value=7"],
      anchors: {
        JLS: ["15.10.4"],
        JVMS: ["6.5.iaload"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"readOrder","descriptor":"([IIZZ)I","requiredOpcodes":["iaload"]}
      ]
    },
    {
      id: "ao-array-abrupt",
      entryMethod: "caseArrayAbrupt",
      entryDescriptor: "()V",
      trace: ["A","error=classes.modern_test.JavaCoreArraysObjects$ProbeException"],
      anchors: {
        JLS: ["15.10.4"],
        JVMS: ["6.5.iaload"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"readOrder","descriptor":"([IIZZ)I","requiredOpcodes":["iaload"]}
      ]
    },
    {
      id: "ao-index-abrupt",
      entryMethod: "caseIndexAbrupt",
      entryDescriptor: "()V",
      trace: ["A","I","error=classes.modern_test.JavaCoreArraysObjects$ProbeException"],
      anchors: {
        JLS: ["15.10.4"],
        JVMS: ["6.5.iaload"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"readOrder","descriptor":"([IIZZ)I","requiredOpcodes":["iaload"]}
      ]
    },
    {
      id: "ao-null-before-bounds",
      entryMethod: "caseNullBeforeBounds",
      entryDescriptor: "()V",
      trace: ["A","I","error=java.lang.NullPointerException"],
      anchors: {
        JLS: ["15.10.4"],
        JVMS: ["6.5.iaload"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"readOrder","descriptor":"([IIZZ)I","requiredOpcodes":["iaload"]}
      ]
    },
    {
      id: "ao-read-bounds",
      entryMethod: "caseReadBounds",
      entryDescriptor: "()V",
      trace: ["negative:A","negative:I","negative:error=java.lang.ArrayIndexOutOfBoundsException","upper:A","upper:I","upper:error=java.lang.ArrayIndexOutOfBoundsException"],
      anchors: {
        JLS: ["15.10.4"],
        JVMS: ["6.5.iaload"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"readOrder","descriptor":"([IIZZ)I","requiredOpcodes":["iaload"]}
      ]
    },
    {
      id: "ao-simple-rhs",
      entryMethod: "caseSimpleRhs",
      entryDescriptor: "()V",
      trace: ["throw:A","throw:I","throw:R","throw:error=classes.modern_test.JavaCoreArraysObjects$ProbeException","null:A","null:I","null:R","null:error=java.lang.NullPointerException"],
      anchors: {
        JLS: ["15.26.1"],
        JVMS: ["6.5.iastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"simpleStore","descriptor":"([IIIZ)V","requiredOpcodes":["iastore"]}
      ]
    },
    {
      id: "ao-compound-early-check",
      entryMethod: "caseCompoundEarlyCheck",
      entryDescriptor: "()V",
      trace: ["null:A","null:I","null:error=java.lang.NullPointerException","bounds:A","bounds:I","bounds:error=java.lang.ArrayIndexOutOfBoundsException"],
      anchors: {
        JLS: ["15.26.2"],
        JVMS: ["6.5.iaload","6.5.iastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"compoundStore","descriptor":"([III)I","requiredOpcodes":["iaload","iastore"]}
      ]
    },
    {
      id: "ao-covariant-store",
      entryMethod: "caseCovariantStore",
      entryDescriptor: "()V",
      trace: ["valid:A","valid:I","valid:R","valid:same=true","null:A","null:I","null:R","null:value=true","fail:A","fail:I","fail:R","fail:error=java.lang.ArrayStoreException","unchanged=true","alias=true"],
      anchors: {
        JLS: ["4.10.3","10.5","15.26.1"],
        JVMS: ["6.5.aastore","6.5.aaload"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"referenceStore","descriptor":"([Ljava/lang/Object;ILjava/lang/Object;)V","requiredOpcodes":["aastore"]}
      ]
    },
    {
      id: "ao-bounds-before-store-type",
      entryMethod: "caseBoundsBeforeStoreType",
      entryDescriptor: "()V",
      trace: ["A","I","R","error=java.lang.ArrayIndexOutOfBoundsException","unchanged=true"],
      anchors: {
        JLS: ["10.5","15.26.1"],
        JVMS: ["6.5.aastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"referenceStore","descriptor":"([Ljava/lang/Object;ILjava/lang/Object;)V","requiredOpcodes":["aastore"]}
      ]
    },
    {
      id: "ao-partial-rank",
      entryMethod: "casePartialRank",
      entryDescriptor: "()V",
      trace: ["D1","D2","shape=2,3,true","rows-distinct=true","alias=true"],
      anchors: {
        JLS: ["4.12.5","15.10.2"],
        JVMS: ["6.5.multianewarray","6.5.aaload","6.5.aastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"partialMatrix","descriptor":"(II)[[[I","requiredOpcodes":["multianewarray"]}
      ]
    },
    {
      id: "ao-full-matrices",
      entryMethod: "caseFullMatrices",
      entryDescriptor: "()V",
      trace: ["int:D1","int:D2","int:shape=2,3","int:default=0","int:rows-distinct=true","int:other=0","ref:D1","ref:D2","ref:shape=2,2","ref:default=true","ref:rows-distinct=true"],
      anchors: {
        JLS: ["4.12.5","15.10.2"],
        JVMS: ["6.5.multianewarray","6.5.aaload","6.5.iaload","6.5.iastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"intMatrix","descriptor":"(IIZZ)[[I","requiredOpcodes":["multianewarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"referenceMatrix","descriptor":"(II)[[Ljava/lang/Object;","requiredOpcodes":["multianewarray"]}
      ]
    },
    {
      id: "ao-negative-dimensions",
      entryMethod: "caseNegativeDimensions",
      entryDescriptor: "()V",
      trace: ["single:D1","single:error=java.lang.NegativeArraySizeException","first:D1","first:D2","first:error=java.lang.NegativeArraySizeException","later:D1","later:D2","later:error=java.lang.NegativeArraySizeException","zero-negative:D1","zero-negative:D2","zero-negative:error=java.lang.NegativeArraySizeException","zero:D1","zero:D2","zero:length=0"],
      anchors: {
        JLS: ["15.10.2"],
        JVMS: ["6.5.newarray","6.5.multianewarray"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"allocateInt","descriptor":"(I)[I","requiredOpcodes":["newarray"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"intMatrix","descriptor":"(IIZZ)[[I","requiredOpcodes":["multianewarray"]}
      ]
    },
    {
      id: "ao-dimension-later-abrupt",
      entryMethod: "caseDimensionLaterAbrupt",
      entryDescriptor: "()V",
      trace: ["D1","D2","error=classes.modern_test.JavaCoreArraysObjects$ProbeException"],
      anchors: {
        JLS: ["15.10.2"],
        JVMS: ["6.5.multianewarray"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"intMatrix","descriptor":"(IIZZ)[[I","requiredOpcodes":["multianewarray"]}
      ]
    },
    {
      id: "ao-dimension-first-abrupt",
      entryMethod: "caseDimensionFirstAbrupt",
      entryDescriptor: "()V",
      trace: ["D1","error=classes.modern_test.JavaCoreArraysObjects$ProbeException"],
      anchors: {
        JLS: ["15.10.2"],
        JVMS: ["6.5.multianewarray"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"intMatrix","descriptor":"(IIZZ)[[I","requiredOpcodes":["multianewarray"]}
      ]
    },
    {
      id: "ao-field-defaults",
      entryMethod: "caseFieldDefaults",
      entryDescriptor: "()V",
      trace: ["defaults=0,0,0,0,0,0,0,false,true"],
      anchors: {
        JLS: ["4.12.5","12.5","15.11.1"],
        JVMS: ["6.5.new","6.5.getfield"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ObjectProbes","method":"defaultFields","descriptor":"(Lclasses/modern_test/JavaCoreArraysObjects$Fields;)Z","requiredOpcodes":["getfield"]}
      ]
    },
    {
      id: "ao-field-values",
      entryMethod: "caseFieldValues",
      entryDescriptor: "()V",
      trace: ["values=-7,-300,65535,41,4294967298,1069547520,4609434218613702656,true,true"],
      anchors: {
        JLS: ["12.5","15.11.1"],
        JVMS: ["6.5.getfield","6.5.putfield","2.9.1"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$Fields","method":"<init>","descriptor":"(BSCIJFDZLjava/lang/Object;)V","requiredOpcodes":["putfield"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ObjectProbes","method":"fieldValues","descriptor":"(Lclasses/modern_test/JavaCoreArraysObjects$Fields;Ljava/lang/Object;)Z","requiredOpcodes":["getfield"]}
      ]
    },
    {
      id: "ao-new-order",
      entryMethod: "caseNewOrder",
      entryDescriptor: "()V",
      trace: ["base-clinit","child-clinit","arg1","arg2","super-arg","base-field","base-body","child-field","child-body","values=3,7"],
      anchors: {
        JLS: ["12.5","15.9.4"],
        JVMS: ["6.5.new","2.9.1"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects","method":"caseNewOrder","descriptor":"()V","requiredOpcodes":["new","invokespecial"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$Ordered","method":"<init>","descriptor":"(II)V","requiredOpcodes":["invokespecial","putfield"]}
      ]
    },
    {
      id: "ao-new-argument-abrupt",
      entryMethod: "caseNewArgumentAbrupt",
      entryDescriptor: "()V",
      trace: ["abort-clinit","arg1","error=classes.modern_test.JavaCoreArraysObjects$ProbeException","body=false"],
      anchors: {
        JLS: ["15.9.4"],
        JVMS: ["6.5.new"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects","method":"caseNewArgumentAbrupt","descriptor":"()V","requiredOpcodes":["new","invokespecial"]}
      ]
    },
    {
      id: "ao-field-evaluation",
      entryMethod: "caseFieldEvaluation",
      entryDescriptor: "()V",
      trace: ["static-read:Q","static-read:value=7","static-write:Q","static-write:R","static-write:value=11","read-null:Q","read-null:error=java.lang.NullPointerException","write-null:Q","write-null:R","write-null:error=java.lang.NullPointerException"],
      anchors: {
        JLS: ["15.11.1","15.26.1"],
        JVMS: ["6.5.getfield","6.5.putfield","6.5.getstatic","6.5.putstatic"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ObjectProbes","method":"readStatic","descriptor":"(Lclasses/modern_test/JavaCoreArraysObjects$Fields;)I","requiredOpcodes":["getstatic"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ObjectProbes","method":"writeStatic","descriptor":"(Lclasses/modern_test/JavaCoreArraysObjects$Fields;I)V","requiredOpcodes":["putstatic"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ObjectProbes","method":"readField","descriptor":"(Lclasses/modern_test/JavaCoreArraysObjects$Fields;)I","requiredOpcodes":["getfield"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ObjectProbes","method":"writeField","descriptor":"(Lclasses/modern_test/JavaCoreArraysObjects$Fields;I)V","requiredOpcodes":["putfield"]}
      ]
    },
    {
      id: "ao-cast-identities",
      entryMethod: "caseCastIdentities",
      entryDescriptor: "()V",
      trace: ["base-same=true","role-same=true"],
      anchors: {
        JLS: ["5.1.5","5.1.6.3","15.16"],
        JVMS: ["6.5.checkcast"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castToken","descriptor":"(Ljava/lang/Object;)Lclasses/modern_test/JavaCoreArraysObjects$Token;","requiredOpcodes":["checkcast"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castRole","descriptor":"(Ljava/lang/Object;)Lclasses/modern_test/JavaCoreArraysObjects$Role;","requiredOpcodes":["checkcast"]}
      ]
    },
    {
      id: "ao-cast-failure",
      entryMethod: "caseCastFailure",
      entryDescriptor: "()V",
      trace: ["error=java.lang.ClassCastException","unchanged=true"],
      anchors: {
        JLS: ["5.1.6.3","15.16"],
        JVMS: ["6.5.checkcast"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castToken","descriptor":"(Ljava/lang/Object;)Lclasses/modern_test/JavaCoreArraysObjects$Token;","requiredOpcodes":["checkcast"]}
      ]
    },
    {
      id: "ao-cast-null",
      entryMethod: "caseCastNull",
      entryDescriptor: "()V",
      trace: ["base=true","interface=true","references=true","primitive-array=true"],
      anchors: {
        JLS: ["5.1.6.3","15.16"],
        JVMS: ["6.5.checkcast","6.5.aconst_null"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castToken","descriptor":"(Ljava/lang/Object;)Lclasses/modern_test/JavaCoreArraysObjects$Token;","requiredOpcodes":["checkcast"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castRole","descriptor":"(Ljava/lang/Object;)Lclasses/modern_test/JavaCoreArraysObjects$Role;","requiredOpcodes":["checkcast"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castObjects","descriptor":"(Ljava/lang/Object;)[Ljava/lang/Object;","requiredOpcodes":["checkcast"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castInts","descriptor":"(Ljava/lang/Object;)[I","requiredOpcodes":["checkcast"]}
      ]
    },
    {
      id: "ao-instanceof",
      entryMethod: "caseInstanceof",
      entryDescriptor: "()V",
      trace: ["class=true,false,false","interface=true,false,false"],
      anchors: {
        JLS: ["15.20.2"],
        JVMS: ["6.5.instanceof"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isToken","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isRole","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]}
      ]
    },
    {
      id: "ao-array-casts",
      entryMethod: "caseArrayCasts",
      entryDescriptor: "()V",
      trace: ["covariant=true","rank2-objects=true","primitive:error=java.lang.ClassCastException","contents-not-type:error=java.lang.ClassCastException"],
      anchors: {
        JLS: ["4.10.3","5.1.6.3","15.16"],
        JVMS: ["6.5.checkcast"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castObjects","descriptor":"(Ljava/lang/Object;)[Ljava/lang/Object;","requiredOpcodes":["checkcast"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"castTokens","descriptor":"(Ljava/lang/Object;)[Lclasses/modern_test/JavaCoreArraysObjects$Token;","requiredOpcodes":["checkcast"]}
      ]
    },
    {
      id: "ao-array-instanceof",
      entryMethod: "caseArrayInstanceof",
      entryDescriptor: "()V",
      trace: ["primitive-markers=true,true,true","reference-markers=true,true,true","object-array=true,false,true","rank2-object-array=false"],
      anchors: {
        JLS: ["4.10.3","10.7","15.20.2"],
        JVMS: ["6.5.instanceof"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isObject","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isCloneable","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isSerializable","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isObjectArray","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"isObjectMatrix","descriptor":"(Ljava/lang/Object;)Z","requiredOpcodes":["instanceof"]}
      ]
    },
    {
      id: "ao-reference-equality",
      entryMethod: "caseReferenceEquality",
      entryDescriptor: "()V",
      trace: ["same=true","distinct=false","null-null=true","null-object=false","neq=false,true,false,true"],
      anchors: {
        JLS: ["4.12.2","15.21.3"],
        JVMS: ["6.5.if_acmp_cond"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"same","descriptor":"(Ljava/lang/Object;Ljava/lang/Object;)Z","requiredOpcodes":["if_acmpne"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$CastProbes","method":"different","descriptor":"(Ljava/lang/Object;Ljava/lang/Object;)Z","requiredOpcodes":["if_acmpeq"]}
      ]
    },
    {
      id: "ao-class-literals",
      entryMethod: "caseClassLiterals",
      entryDescriptor: "()V",
      trace: ["passive=true","literal-repeat=true","reference-array=true","primitive-array=true","rank2=true","primitive=true","distinct=true"],
      anchors: {
        JLS: ["10.8","15.8.2"],
        JVMS: ["6.5.ldc","6.5.getstatic"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$LiteralProbes","method":"literalOnly","descriptor":"()Ljava/lang/Class;","requiredOpcodes":["ldc"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$LiteralProbes","method":"referenceArray","descriptor":"()Ljava/lang/Class;","requiredOpcodes":["ldc"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$LiteralProbes","method":"primitiveArray","descriptor":"()Ljava/lang/Class;","requiredOpcodes":["ldc"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$LiteralProbes","method":"primitive","descriptor":"()Ljava/lang/Class;","requiredOpcodes":["getstatic"]}
      ]
    },
    {
      id: "ao-initializer-order",
      entryMethod: "caseInitializerOrder",
      entryDescriptor: "()V",
      trace: ["ok:E1","ok:E2","ok:values=1,2","abrupt:E1","abrupt:error=classes.modern_test.JavaCoreArraysObjects$ProbeException","unchanged=true"],
      anchors: {
        JLS: ["10.6"],
        JVMS: ["6.5.newarray","6.5.iastore"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$OrderProbes","method":"initializer","descriptor":"(Z)[I","requiredOpcodes":["newarray","iastore"]}
      ]
    },
    {
      id: "ao-arraylength",
      entryMethod: "caseArraylength",
      entryDescriptor: "()V",
      trace: ["lengths=0,3,2","int-null:error=java.lang.NullPointerException","ref-null:error=java.lang.NullPointerException"],
      anchors: {
        JLS: ["10.7"],
        JVMS: ["6.5.arraylength"]
      },
      probes: [
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"lengthInts","descriptor":"([I)I","requiredOpcodes":["arraylength"]},
        {"className":"classes.modern_test.JavaCoreArraysObjects$ArrayProbes","method":"lengthReferences","descriptor":"([Ljava/lang/Object;)I","requiredOpcodes":["arraylength"]}
      ]
    },
  ]
};

