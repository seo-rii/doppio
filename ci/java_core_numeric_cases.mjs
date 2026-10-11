/**
 * Independently fixed numerical expectations, not captured native output.
 * Anchors identify limited tested clauses, not completeness of source units.
 * The common runner binds each ()V entry through decoded CP calls to the probes.
 * NaN is classified; unspecified NaN payload bits are never fixed here.
 */
const probe = (method, descriptor, ...requiredOpcodes) => ({method, descriptor, requiredOpcodes});
const conversion = (method, descriptor) => probe(method, descriptor, method);
const caseOf = (id, entryMethod, trace, JLS, JVMS, probes) => ({
  id, trace: Array.isArray(trace) ? trace : [trace], anchors: {JLS, JVMS},
  entryMethod, entryDescriptor: '()V', probes
});
const unboxing = [
  ['Byte', 'B'], ['Short', 'S'], ['Character', 'C'], ['Integer', 'I'],
  ['Long', 'J'], ['Float', 'F'], ['Double', 'D'], ['Boolean', 'Z']
].map(([wrapper, type]) => probe(`unbox${wrapper}`, `(Ljava/lang/${wrapper};)${type}`, 'invokevirtual'));

export default {
  id: 'numeric',
  source: 'classes/modern_fixture/JavaCoreNumeric.java',
  mainClass: 'classes.modern_test.JavaCoreNumeric',
  completionMarker: 'CORE_NUMERIC_OK',
  cases: [
    caseOf('i-overflow', 'caseIOverflow', '80000000,7fffffff,00000000,80000000',
      ['4.2.2', '15.15.4', '15.17.1', '15.18.2'], ['6.5.iadd', '6.5.isub', '6.5.imul', '6.5.ineg'],
      [probe('iadd', '(II)I', 'iadd'), probe('isub', '(II)I', 'isub'), probe('imul', '(II)I', 'imul'), probe('ineg', '(I)I', 'ineg')]),
    caseOf('l-overflow', 'caseLOverflow', '8000000000000000,7fffffffffffffff,0000000000000000,8000000000000000,0000000200000001',
      ['4.2.2', '15.15.4', '15.17.1', '15.18.2'], ['6.5.ladd', '6.5.lsub', '6.5.lmul', '6.5.lneg'],
      [probe('ladd', '(JJ)J', 'ladd'), probe('lsub', '(JJ)J', 'lsub'), probe('lmul', '(JJ)J', 'lmul'), probe('lneg', '(J)J', 'lneg')]),
    caseOf('i-division', 'caseIDivision', '80000000,fffffffe,fffffffe,00000002',
      ['15.17.2'], ['6.5.idiv'], [probe('idiv', '(II)I', 'idiv')]),
    caseOf('l-division', 'caseLDivision', '8000000000000000,fffffffffffffffe,fffffffffffffffe,0000000000000002',
      ['15.17.2'], ['6.5.ldiv'], [probe('ldiv', '(JJ)J', 'ldiv')]),
    caseOf('i-remainder', 'caseIRemainder', '00000000,ffffffff,00000001,ffffffff',
      ['15.17.3'], ['6.5.irem'], [probe('irem', '(II)I', 'irem')]),
    caseOf('l-remainder', 'caseLRemainder', '0000000000000000,ffffffffffffffff,0000000000000001,ffffffffffffffff',
      ['15.17.3'], ['6.5.lrem'], [probe('lrem', '(JJ)J', 'lrem')]),
    caseOf('integral-zero-divisors', 'caseIntegralZeroDivisors', [
      'idiv:java.lang.ArithmeticException@invoke', 'irem:java.lang.ArithmeticException@invoke',
      'ldiv:java.lang.ArithmeticException@invoke', 'lrem:java.lang.ArithmeticException@invoke'
    ], ['15.17.2', '15.17.3'], ['6.5.idiv', '6.5.irem', '6.5.ldiv', '6.5.lrem'],
    [probe('idiv', '(II)I', 'idiv'), probe('irem', '(II)I', 'irem'), probe('ldiv', '(JJ)J', 'ldiv'), probe('lrem', '(JJ)J', 'lrem')]),
    caseOf('i-shl-mask', 'caseIShlMask', '80000000,00000001,80000000,00000002',
      ['15.19'], ['6.5.ishl'], [probe('ishl', '(II)I', 'ishl')]),
    caseOf('i-shr-mask', 'caseIShrMask', 'ffffffff,80000000,ffffffff,3fffffff',
      ['15.19'], ['6.5.ishr'], [probe('ishr', '(II)I', 'ishr')]),
    caseOf('i-ushr-mask', 'caseIUshrMask', '00000001,7fffffff,ffffffff,00000001',
      ['15.19'], ['6.5.iushr'], [probe('iushr', '(II)I', 'iushr')]),
    caseOf('l-shl-mask', 'caseLShlMask', '8000000000000000,0000000000000001,8000000000000000,0000000000000002',
      ['15.19'], ['6.5.lshl'], [probe('lshl', '(JI)J', 'lshl')]),
    caseOf('l-shr-mask', 'caseLShrMask', 'ffffffffffffffff,8000000000000000,ffffffffffffffff,3fffffffffffffff',
      ['15.19'], ['6.5.lshr'], [probe('lshr', '(JI)J', 'lshr')]),
    caseOf('l-ushr-mask', 'caseLUshrMask', '0000000000000001,7fffffffffffffff,ffffffffffffffff,0000000000000001',
      ['15.19'], ['6.5.lushr'], [probe('lushr', '(JI)J', 'lushr')]),
    caseOf('i-bitwise', 'caseIBitwise', '05a005a0,5ffa5ffa,5a5a5a5a,aa55aa55',
      ['15.15.5', '15.22.1'], ['6.5.iand', '6.5.ior', '6.5.ixor'],
      [probe('iand', '(II)I', 'iand'), probe('ior', '(II)I', 'ior'), probe('ixor', '(II)I', 'ixor'), probe('inot', '(I)I', 'ixor')]),
    caseOf('l-bitwise', 'caseLBitwise', '05a005a005a005a0,5ffa5ffa5ffa5ffa,5a5a5a5a5a5a5a5a,aa55aa55aa55aa55',
      ['15.15.5', '15.22.1'], ['6.5.land', '6.5.lor', '6.5.lxor'],
      [probe('land', '(JJ)J', 'land'), probe('lor', '(JJ)J', 'lor'), probe('lxor', '(JJ)J', 'lxor'), probe('lnot', '(J)J', 'lxor')]),
    caseOf('i2l', 'caseI2L', 'ffffffff80000000,ffffffffffffffff,000000007fffffff',
      ['5.1.2'], ['6.5.i2l'], [conversion('i2l', '(I)J')]),
    caseOf('i2f', 'caseI2F', 'cf000000,4f000000,4b800000,4b800002,cb800000,cb800002',
      ['5.1.2'], ['6.5.i2f'], [conversion('i2f', '(I)F')]),
    caseOf('i2d', 'caseI2D', 'c1e0000000000000,41dfffffffc00000,4170000010000000',
      ['5.1.2'], ['6.5.i2d'], [conversion('i2d', '(I)D')]),
    caseOf('l2i', 'caseL2I', '00000000,ffffffff,87654321,00000000',
      ['5.1.3'], ['6.5.l2i'], [conversion('l2i', '(J)I')]),
    caseOf('l2f', 'caseL2F', 'df000000,5f000000,5e800001,de800001',
      ['5.1.2'], ['6.5.l2f'], [conversion('l2f', '(J)F')]),
    caseOf('l2d-53-ties', 'caseL2D53Ties', '433fffffffffffff,4340000000000000,4340000000000000,4340000000000002,c340000000000000,c340000000000002',
      ['5.1.2'], ['6.5.l2d'], [conversion('l2d', '(J)D')]),
    caseOf('l2d-endpoints', 'caseL2DEndpoints', 'c3e0000000000000,43e0000000000000,c3e0000000000000',
      ['5.1.2'], ['6.5.l2d'], [conversion('l2d', '(J)D')]),
    caseOf('f2i-specials', 'caseF2ISpecials', '00000000,7fffffff,80000000,00000000,00000000',
      ['5.1.3'], ['6.5.f2i'], [conversion('f2i', '(F)I')]),
    caseOf('f2i-finite', 'caseF2IFinite', '00000003,fffffffd,7fffff80,7fffffff,80000080,80000000,00000000,00000000',
      ['5.1.3'], ['6.5.f2i'], [conversion('f2i', '(F)I')]),
    caseOf('f2l-specials', 'caseF2LSpecials', '0000000000000000,7fffffffffffffff,8000000000000000,0000000000000000,0000000000000000',
      ['5.1.3'], ['6.5.f2l'], [conversion('f2l', '(F)J')]),
    caseOf('f2l-finite', 'caseF2LFinite', '0000000000000003,fffffffffffffffd,7fffff8000000000,7fffffffffffffff,8000008000000000,8000000000000000,0000000000000000,0000000000000000',
      ['5.1.3'], ['6.5.f2l'], [conversion('f2l', '(F)J')]),
    caseOf('f2d-zero-subnormal', 'caseF2DZeroSubnormal', '0000000000000000,8000000000000000,36a0000000000000,b6a0000000000000,380fffffc0000000,3810000000000000',
      ['5.1.2'], ['6.5.f2d'], [conversion('f2d', '(F)D')]),
    caseOf('f2d-endpoints', 'caseF2DEndpoints', ['47efffffe0000000,c7efffffe0000000,7ff0000000000000,fff0000000000000', 'nan=true'],
      ['5.1.2'], ['6.5.f2d'], [conversion('f2d', '(F)D')]),
    caseOf('d2i-specials', 'caseD2ISpecials', '00000000,7fffffff,80000000,00000000,00000000',
      ['5.1.3'], ['6.5.d2i'], [conversion('d2i', '(D)I')]),
    caseOf('d2i-finite', 'caseD2IFinite', '00000003,fffffffd,7ffffffe,7fffffff,80000001,80000000,00000000,00000000',
      ['5.1.3'], ['6.5.d2i'], [conversion('d2i', '(D)I')]),
    caseOf('d2l-specials', 'caseD2LSpecials', '0000000000000000,7fffffffffffffff,8000000000000000,0000000000000000,0000000000000000',
      ['5.1.3'], ['6.5.d2l'], [conversion('d2l', '(D)J')]),
    caseOf('d2l-finite', 'caseD2LFinite', '0000000000000003,fffffffffffffffd,7ffffffffffffc00,7fffffffffffffff,8000000000000400,8000000000000000,0000000000000000,0000000000000000',
      ['5.1.3'], ['6.5.d2l'], [conversion('d2l', '(D)J')]),
    caseOf('d2f-specials', 'caseD2FSpecials', ['nan=true', '7f800000,ff800000,00000000,80000000'],
      ['5.1.3'], ['6.5.d2f'], [conversion('d2f', '(D)F')]),
    caseOf('d2f-underflow', 'caseD2FUnderflow', '00000000,00000000,00000001,00000001,80000000,80000001,007fffff,00800000,00800000',
      ['5.1.3'], ['6.5.d2f'], [conversion('d2f', '(D)F')]),
    caseOf('d2f-rounding', 'caseD2FRounding', '3f800000,3f800002,3f800002,3f800000,bf800000,bf800002',
      ['5.1.3'], ['6.5.d2f'], [conversion('d2f', '(D)F')]),
    caseOf('d2f-overflow', 'caseD2FOverflow', '7f7fffff,7f800000,7f7fffff,ff7fffff,ff800000',
      ['5.1.3'], ['6.5.d2f'], [conversion('d2f', '(D)F')]),
    caseOf('i2b', 'caseI2B', '0000007f,ffffff80,0000007f,ffffff80,ffffffff,00000000,00000000,ffffffff',
      ['5.1.3'], ['6.5.i2b'], [conversion('i2b', '(I)B')]),
    caseOf('i2c', 'caseI2C', '0000ffff,00000000,0000ffff,00000000,00000000,0000ffff,00005678,0000ffff',
      ['5.1.3'], ['6.5.i2c'], [conversion('i2c', '(I)C')]),
    caseOf('i2s', 'caseI2S', '00007fff,ffff8000,00007fff,ffff8000,ffffffff,00000000,00000000,ffffffff',
      ['5.1.3'], ['6.5.i2s'], [conversion('i2s', '(I)S')]),
    caseOf('d2-small-two-stage', 'caseD2SmallTwoStage', [
      '00000000,00000000,00000000', 'ffffffff,0000ffff,ffffffff', '00000000,00000000,00000000',
      'ffffff80,00000080,00000080', '0000007f,0000ff7f,ffffff7f', 'ffffffff,0000ffff,ffffffff'
    ], ['5.1.3'], ['6.5.d2i', '6.5.i2b', '6.5.i2c', '6.5.i2s'],
    [probe('d2b', '(D)B', 'd2i', 'i2b'), probe('d2c', '(D)C', 'd2i', 'i2c'), probe('d2s', '(D)S', 'd2i', 'i2s')]),
    caseOf('i-comparisons', 'caseIComparisons', '35,44,35,44,26',
      ['15.20.1', '15.21.1'], ['6.5.if_icmp_cond'],
      [probe('compareI', '(II)I', 'if_icmpge', 'if_icmpgt', 'if_icmple', 'if_icmplt', 'if_icmpne', 'if_icmpeq')]),
    caseOf('l-comparisons', 'caseLComparisons', '35,44,44,35,26',
      ['15.20.1', '15.21.1'], ['6.5.lcmp'], [probe('compareL', '(JJ)I', 'lcmp')]),
    caseOf('f-comparisons', 'caseFComparisons', '32,32,32,26,35,44,44,35',
      ['15.20.1', '15.21.1'], ['6.5.fcmp_op'], [probe('compareF', '(FF)I', 'fcmpg', 'fcmpl')]),
    caseOf('d-comparisons', 'caseDComparisons', '32,32,32,26,35,44,44,35',
      ['15.20.1', '15.21.1'], ['6.5.dcmp_op'], [probe('compareD', '(DD)I', 'dcmpg', 'dcmpl')]),
    caseOf('f-zero-subnormal-arithmetic', 'caseFZeroSubnormalArithmetic', [
      '80000000,00000000,00000000,ff800000,00000000,00000002,00000001,80000000,00000000,80000001', 'nan=true'
    ], ['4.2.4', '15.15.4', '15.17.1', '15.17.2', '15.17.3', '15.18.2'],
    ['6.5.fadd', '6.5.fsub', '6.5.fmul', '6.5.fdiv', '6.5.frem', '6.5.fneg'],
    [probe('fadd', '(FF)F', 'fadd'), probe('fsub', '(FF)F', 'fsub'), probe('fmul', '(FF)F', 'fmul'),
      probe('fdiv', '(FF)F', 'fdiv'), probe('frem', '(FF)F', 'frem'), probe('fneg', '(F)F', 'fneg')]),
    caseOf('d-zero-subnormal-arithmetic', 'caseDZeroSubnormalArithmetic', [
      '8000000000000000,0000000000000000,0000000000000000,fff0000000000000,0000000000000000,0000000000000002,0000000000000001,8000000000000000,0000000000000000,8000000000000001', 'nan=true'
    ], ['4.2.4', '15.15.4', '15.17.1', '15.17.2', '15.17.3', '15.18.2'],
    ['6.5.dadd', '6.5.dsub', '6.5.dmul', '6.5.ddiv', '6.5.drem', '6.5.dneg'],
    [probe('dadd', '(DD)D', 'dadd'), probe('dsub', '(DD)D', 'dsub'), probe('dmul', '(DD)D', 'dmul'),
      probe('ddiv', '(DD)D', 'ddiv'), probe('drem', '(DD)D', 'drem'), probe('dneg', '(D)D', 'dneg')]),
    caseOf('null-unboxing', 'caseNullUnboxing', [
      'Byte:java.lang.NullPointerException@invoke', 'Short:java.lang.NullPointerException@invoke',
      'Character:java.lang.NullPointerException@invoke', 'Integer:java.lang.NullPointerException@invoke',
      'Long:java.lang.NullPointerException@invoke', 'Float:java.lang.NullPointerException@invoke',
      'Double:java.lang.NullPointerException@invoke', 'Boolean:java.lang.NullPointerException@invoke'
    ], ['5.1.8'], ['6.5.invokevirtual'], unboxing),
    caseOf('nonnull-unboxing', 'caseNonnullUnboxing', [
      'ffffff80,ffff8000,0000ffff,80000000', '8000000000000000', '80000000', '8000000000000000', 'true'
    ], ['5.1.8'], ['6.5.invokevirtual'], unboxing)
  ]
};
