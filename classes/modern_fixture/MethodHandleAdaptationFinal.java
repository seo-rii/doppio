package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;

/** C1: fixed-arity asType, with independent expectations in the CI corpus. */
public class MethodHandleAdaptationFinal {
  private static int effects;

  private static byte echoByte(byte value) { effects++; return value; }
  private static short echoShort(short value) { effects++; return value; }
  private static char echoChar(char value) { effects++; return value; }
  private static int echoInt(int value) { effects++; return value; }
  private static long echoLong(long value) { effects++; return value; }
  private static float echoFloat(float value) { effects++; return value; }
  private static double echoDouble(double value) { effects++; return value; }
  private static boolean echoBoolean(boolean value) { effects++; return value; }
  private static Object echoObject(Object value) { effects++; return value; }
  private static String echoString(String value) { effects++; return value; }
  private static void touch() { effects++; }

  private static MethodHandle primitive(Class<?> type) throws ReflectiveOperationException {
    String name;
    if (type == byte.class) name = "echoByte";
    else if (type == short.class) name = "echoShort";
    else if (type == char.class) name = "echoChar";
    else if (type == int.class) name = "echoInt";
    else if (type == long.class) name = "echoLong";
    else if (type == float.class) name = "echoFloat";
    else if (type == double.class) name = "echoDouble";
    else if (type == boolean.class) name = "echoBoolean";
    else throw new AssertionError("unknown primitive");
    return MethodHandles.lookup().findStatic(MethodHandleAdaptationFinal.class, name,
        MethodType.methodType(type, type));
  }

  private static MethodHandle reference(boolean string) throws ReflectiveOperationException {
    Class<?> type = string ? String.class : Object.class;
    return MethodHandles.lookup().findStatic(MethodHandleAdaptationFinal.class,
        string ? "echoString" : "echoObject", MethodType.methodType(type, type));
  }

  private static MethodHandle touchHandle() throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleAdaptationFinal.class,
        "touch", MethodType.methodType(void.class));
  }

  private static void emit(String id, Object value) {
    System.out.println(new StringBuilder().append(id).append('=').append(value).toString());
  }

  private static String summary(boolean values, int pairs) {
    return new StringBuilder().append("pairs=").append(pairs).append(",values=").append(values)
        .append(",effects=").append(effects).toString();
  }

  private static String failure(Throwable failure) {
    return new StringBuilder().append(failure.getClass().getName()).append(",effects=")
        .append(effects).toString();
  }

  private static void caseSameIdentity() throws Throwable {
    effects = 0;
    MethodHandle target = primitive(long.class);
    MethodType equal = MethodType.methodType(long.class, long.class);
    MethodHandle adapted = target.asType(equal);
    long value = (long) adapted.invokeExact(0x100000001L);
    emit("astype-same-identity", new StringBuilder().append("same=").append(target == adapted)
        .append(",type=").append(adapted.type().equals(equal)).append(",value=").append(value)
        .append(",effects=").append(effects).toString());
  }

  private static void caseArgumentWidening() throws Throwable {
    effects = 0;
    boolean ok = true;
    int pairs = 0;
    byte b = -7;
    short s = -1025;
    char c = '\uffff';
    int i = 16777217;
    long l = 9007199254740993L;
    float f = -0.0f;
    MethodHandle bs = primitive(short.class).asType(MethodType.methodType(short.class, byte.class));
    ok &= (short) bs.invokeExact(b) == -7; pairs++;
    MethodHandle bi = primitive(int.class).asType(MethodType.methodType(int.class, byte.class));
    ok &= (int) bi.invokeExact(b) == -7; pairs++;
    MethodHandle bl = primitive(long.class).asType(MethodType.methodType(long.class, byte.class));
    ok &= (long) bl.invokeExact(b) == -7L; pairs++;
    MethodHandle bf = primitive(float.class).asType(MethodType.methodType(float.class, byte.class));
    ok &= (float) bf.invokeExact(b) == -7.0f; pairs++;
    MethodHandle bd = primitive(double.class).asType(MethodType.methodType(double.class, byte.class));
    ok &= (double) bd.invokeExact(b) == -7.0; pairs++;
    MethodHandle si = primitive(int.class).asType(MethodType.methodType(int.class, short.class));
    ok &= (int) si.invokeExact(s) == -1025; pairs++;
    MethodHandle sl = primitive(long.class).asType(MethodType.methodType(long.class, short.class));
    ok &= (long) sl.invokeExact(s) == -1025L; pairs++;
    MethodHandle sf = primitive(float.class).asType(MethodType.methodType(float.class, short.class));
    ok &= (float) sf.invokeExact(s) == -1025.0f; pairs++;
    MethodHandle sd = primitive(double.class).asType(MethodType.methodType(double.class, short.class));
    ok &= (double) sd.invokeExact(s) == -1025.0; pairs++;
    MethodHandle ci = primitive(int.class).asType(MethodType.methodType(int.class, char.class));
    ok &= (int) ci.invokeExact(c) == 65535; pairs++;
    MethodHandle cl = primitive(long.class).asType(MethodType.methodType(long.class, char.class));
    ok &= (long) cl.invokeExact(c) == 65535L; pairs++;
    MethodHandle cf = primitive(float.class).asType(MethodType.methodType(float.class, char.class));
    ok &= (float) cf.invokeExact(c) == 65535.0f; pairs++;
    MethodHandle cd = primitive(double.class).asType(MethodType.methodType(double.class, char.class));
    ok &= (double) cd.invokeExact(c) == 65535.0; pairs++;
    MethodHandle il = primitive(long.class).asType(MethodType.methodType(long.class, int.class));
    ok &= (long) il.invokeExact(i) == 16777217L; pairs++;
    MethodHandle iff = primitive(float.class).asType(MethodType.methodType(float.class, int.class));
    ok &= Float.floatToRawIntBits((float) iff.invokeExact(i)) == 0x4b800000; pairs++;
    MethodHandle id = primitive(double.class).asType(MethodType.methodType(double.class, int.class));
    ok &= (double) id.invokeExact(i) == 16777217.0; pairs++;
    MethodHandle lf = primitive(float.class).asType(MethodType.methodType(float.class, long.class));
    ok &= Float.floatToRawIntBits((float) lf.invokeExact(l)) == 0x5a000000; pairs++;
    MethodHandle ld = primitive(double.class).asType(MethodType.methodType(double.class, long.class));
    ok &= Double.doubleToRawLongBits((double) ld.invokeExact(l)) == 0x4340000000000000L; pairs++;
    MethodHandle fd = primitive(double.class).asType(MethodType.methodType(double.class, float.class));
    ok &= Double.doubleToRawLongBits((double) fd.invokeExact(f)) == 0x8000000000000000L; pairs++;
    emit("primitive-argument-widening-19", summary(ok, pairs));
  }

  private static void caseReturnWidening() throws Throwable {
    effects = 0;
    boolean ok = true;
    int pairs = 0;
    byte b = -7;
    short s = -1025;
    char c = '\uffff';
    int i = 16777217;
    long l = 9007199254740993L;
    float f = -0.0f;
    MethodHandle bs = primitive(byte.class).asType(MethodType.methodType(short.class, byte.class));
    ok &= (short) bs.invokeExact(b) == -7; pairs++;
    MethodHandle bi = primitive(byte.class).asType(MethodType.methodType(int.class, byte.class));
    ok &= (int) bi.invokeExact(b) == -7; pairs++;
    MethodHandle bl = primitive(byte.class).asType(MethodType.methodType(long.class, byte.class));
    ok &= (long) bl.invokeExact(b) == -7L; pairs++;
    MethodHandle bf = primitive(byte.class).asType(MethodType.methodType(float.class, byte.class));
    ok &= (float) bf.invokeExact(b) == -7.0f; pairs++;
    MethodHandle bd = primitive(byte.class).asType(MethodType.methodType(double.class, byte.class));
    ok &= (double) bd.invokeExact(b) == -7.0; pairs++;
    MethodHandle si = primitive(short.class).asType(MethodType.methodType(int.class, short.class));
    ok &= (int) si.invokeExact(s) == -1025; pairs++;
    MethodHandle sl = primitive(short.class).asType(MethodType.methodType(long.class, short.class));
    ok &= (long) sl.invokeExact(s) == -1025L; pairs++;
    MethodHandle sf = primitive(short.class).asType(MethodType.methodType(float.class, short.class));
    ok &= (float) sf.invokeExact(s) == -1025.0f; pairs++;
    MethodHandle sd = primitive(short.class).asType(MethodType.methodType(double.class, short.class));
    ok &= (double) sd.invokeExact(s) == -1025.0; pairs++;
    MethodHandle ci = primitive(char.class).asType(MethodType.methodType(int.class, char.class));
    ok &= (int) ci.invokeExact(c) == 65535; pairs++;
    MethodHandle cl = primitive(char.class).asType(MethodType.methodType(long.class, char.class));
    ok &= (long) cl.invokeExact(c) == 65535L; pairs++;
    MethodHandle cf = primitive(char.class).asType(MethodType.methodType(float.class, char.class));
    ok &= (float) cf.invokeExact(c) == 65535.0f; pairs++;
    MethodHandle cd = primitive(char.class).asType(MethodType.methodType(double.class, char.class));
    ok &= (double) cd.invokeExact(c) == 65535.0; pairs++;
    MethodHandle il = primitive(int.class).asType(MethodType.methodType(long.class, int.class));
    ok &= (long) il.invokeExact(i) == 16777217L; pairs++;
    MethodHandle iff = primitive(int.class).asType(MethodType.methodType(float.class, int.class));
    ok &= Float.floatToRawIntBits((float) iff.invokeExact(i)) == 0x4b800000; pairs++;
    MethodHandle id = primitive(int.class).asType(MethodType.methodType(double.class, int.class));
    ok &= (double) id.invokeExact(i) == 16777217.0; pairs++;
    MethodHandle lf = primitive(long.class).asType(MethodType.methodType(float.class, long.class));
    ok &= Float.floatToRawIntBits((float) lf.invokeExact(l)) == 0x5a000000; pairs++;
    MethodHandle ld = primitive(long.class).asType(MethodType.methodType(double.class, long.class));
    ok &= Double.doubleToRawLongBits((double) ld.invokeExact(l)) == 0x4340000000000000L; pairs++;
    MethodHandle fd = primitive(float.class).asType(MethodType.methodType(double.class, float.class));
    ok &= Double.doubleToRawLongBits((double) fd.invokeExact(f)) == 0x8000000000000000L; pairs++;
    emit("primitive-return-widening-19", summary(ok, pairs));
  }

  private static void caseReferenceArgument() throws Throwable {
    effects = 0;
    MethodHandle adapted = reference(true).asType(MethodType.methodType(String.class, Object.class));
    Object value = new String("identity");
    String result = (String) adapted.invokeExact(value);
    emit("reference-argument-cast-timing", new StringBuilder().append("identity=").append(result == value)
        .append(",effects=").append(effects).toString());
    try {
      String unexpected = (String) adapted.invokeExact(new Object());
      emit("reference-argument-cast-timing", "unexpected-success");
    } catch (ClassCastException expected) {
      emit("reference-argument-cast-timing", failure(expected));
    }
  }

  private static void caseReferenceReturn() throws Throwable {
    effects = 0;
    MethodHandle adapted = reference(false).asType(MethodType.methodType(String.class, Object.class));
    Object value = new String("identity");
    String result = (String) adapted.invokeExact(value);
    emit("reference-return-cast-timing", new StringBuilder().append("identity=").append(result == value)
        .append(",effects=").append(effects).toString());
    try {
      String unexpected = (String) adapted.invokeExact(new Object());
      emit("reference-return-cast-timing", "unexpected-success");
    } catch (ClassCastException expected) {
      emit("reference-return-cast-timing", failure(expected));
    }
  }

  private static void caseArgumentBoxing() throws Throwable {
    effects = 0;
    MethodHandle target = reference(false);
    Object b = (Object) target.asType(MethodType.methodType(Object.class, byte.class)).invokeExact((byte) -7);
    Object s = (Object) target.asType(MethodType.methodType(Object.class, short.class)).invokeExact((short) -1025);
    Object c = (Object) target.asType(MethodType.methodType(Object.class, char.class)).invokeExact('\uffff');
    Object i = (Object) target.asType(MethodType.methodType(Object.class, int.class)).invokeExact(16777217);
    Object l = (Object) target.asType(MethodType.methodType(Object.class, long.class)).invokeExact(0x100000001L);
    Object f = (Object) target.asType(MethodType.methodType(Object.class, float.class)).invokeExact(-0.0f);
    Object d = (Object) target.asType(MethodType.methodType(Object.class, double.class)).invokeExact(-0.0);
    Object z = (Object) target.asType(MethodType.methodType(Object.class, boolean.class)).invokeExact(true);
    boolean ok = b.getClass() == Byte.class && ((Byte) b).byteValue() == -7
        && s.getClass() == Short.class && ((Short) s).shortValue() == -1025
        && c.getClass() == Character.class && ((Character) c).charValue() == '\uffff'
        && i.getClass() == Integer.class && ((Integer) i).intValue() == 16777217
        && l.getClass() == Long.class && ((Long) l).longValue() == 0x100000001L
        && f.getClass() == Float.class && Float.floatToRawIntBits(((Float) f).floatValue()) == 0x80000000
        && d.getClass() == Double.class && Double.doubleToRawLongBits(((Double) d).doubleValue()) == 0x8000000000000000L
        && z.getClass() == Boolean.class && ((Boolean) z).booleanValue();
    emit("primitive-argument-boxing", summary(ok, 8));
  }

  private static void caseReturnBoxing() throws Throwable {
    effects = 0;
    Object b = (Object) primitive(byte.class).asType(MethodType.methodType(Object.class, byte.class)).invokeExact((byte) -7);
    Object s = (Object) primitive(short.class).asType(MethodType.methodType(Object.class, short.class)).invokeExact((short) -1025);
    Object c = (Object) primitive(char.class).asType(MethodType.methodType(Object.class, char.class)).invokeExact('\uffff');
    Object i = (Object) primitive(int.class).asType(MethodType.methodType(Object.class, int.class)).invokeExact(16777217);
    Object l = (Object) primitive(long.class).asType(MethodType.methodType(Object.class, long.class)).invokeExact(0x100000001L);
    Object f = (Object) primitive(float.class).asType(MethodType.methodType(Object.class, float.class)).invokeExact(-0.0f);
    Object d = (Object) primitive(double.class).asType(MethodType.methodType(Object.class, double.class)).invokeExact(-0.0);
    Object z = (Object) primitive(boolean.class).asType(MethodType.methodType(Object.class, boolean.class)).invokeExact(true);
    boolean ok = b.getClass() == Byte.class && ((Byte) b).byteValue() == -7
        && s.getClass() == Short.class && ((Short) s).shortValue() == -1025
        && c.getClass() == Character.class && ((Character) c).charValue() == '\uffff'
        && i.getClass() == Integer.class && ((Integer) i).intValue() == 16777217
        && l.getClass() == Long.class && ((Long) l).longValue() == 0x100000001L
        && f.getClass() == Float.class && Float.floatToRawIntBits(((Float) f).floatValue()) == 0x80000000
        && d.getClass() == Double.class && Double.doubleToRawLongBits(((Double) d).doubleValue()) == 0x8000000000000000L
        && z.getClass() == Boolean.class && ((Boolean) z).booleanValue();
    emit("primitive-return-boxing", summary(ok, 8));
  }

  private static void caseArgumentUnboxing() throws Throwable {
    effects = 0;
    boolean ok = true;
    Object b = Byte.valueOf((byte) -7), s = Short.valueOf((short) -1025), c = Character.valueOf('\uffff');
    Object i = Integer.valueOf(16777217), l = Long.valueOf(0x100000001L);
    Object f = Float.valueOf(-0.0f), d = Double.valueOf(-0.0), z = Boolean.TRUE;
    ok &= (byte) primitive(byte.class).asType(MethodType.methodType(byte.class, Object.class)).invokeExact(b) == -7;
    ok &= (short) primitive(short.class).asType(MethodType.methodType(short.class, Object.class)).invokeExact(s) == -1025;
    ok &= (char) primitive(char.class).asType(MethodType.methodType(char.class, Object.class)).invokeExact(c) == '\uffff';
    ok &= (int) primitive(int.class).asType(MethodType.methodType(int.class, Object.class)).invokeExact(i) == 16777217;
    ok &= (long) primitive(long.class).asType(MethodType.methodType(long.class, Object.class)).invokeExact(l) == 0x100000001L;
    ok &= Float.floatToRawIntBits((float) primitive(float.class).asType(MethodType.methodType(float.class, Object.class)).invokeExact(f)) == 0x80000000;
    ok &= Double.doubleToRawLongBits((double) primitive(double.class).asType(MethodType.methodType(double.class, Object.class)).invokeExact(d)) == 0x8000000000000000L;
    ok &= (boolean) primitive(boolean.class).asType(MethodType.methodType(boolean.class, Object.class)).invokeExact(z);
    Number number = Integer.valueOf(16777217);
    ok &= (long) primitive(long.class).asType(MethodType.methodType(long.class, Number.class)).invokeExact(number) == 16777217L;
    ok &= (int) primitive(int.class).asType(MethodType.methodType(int.class, Object.class)).invokeExact(b) == -7;
    ok &= (double) primitive(double.class).asType(MethodType.methodType(double.class, Object.class)).invokeExact(c) == 65535.0;
    emit("wrapper-argument-unboxing", summary(ok, 11));
  }

  private static void caseReturnUnboxing() throws Throwable {
    effects = 0;
    MethodHandle target = reference(false);
    boolean ok = true;
    Object b = Byte.valueOf((byte) -7), s = Short.valueOf((short) -1025), c = Character.valueOf('\uffff');
    Object i = Integer.valueOf(16777217), l = Long.valueOf(0x100000001L);
    Object f = Float.valueOf(-0.0f), d = Double.valueOf(-0.0), z = Boolean.TRUE;
    ok &= (byte) target.asType(MethodType.methodType(byte.class, Object.class)).invokeExact(b) == -7;
    ok &= (short) target.asType(MethodType.methodType(short.class, Object.class)).invokeExact(s) == -1025;
    ok &= (char) target.asType(MethodType.methodType(char.class, Object.class)).invokeExact(c) == '\uffff';
    ok &= (int) target.asType(MethodType.methodType(int.class, Object.class)).invokeExact(i) == 16777217;
    ok &= (long) target.asType(MethodType.methodType(long.class, Object.class)).invokeExact(l) == 0x100000001L;
    ok &= Float.floatToRawIntBits((float) target.asType(MethodType.methodType(float.class, Object.class)).invokeExact(f)) == 0x80000000;
    ok &= Double.doubleToRawLongBits((double) target.asType(MethodType.methodType(double.class, Object.class)).invokeExact(d)) == 0x8000000000000000L;
    ok &= (boolean) target.asType(MethodType.methodType(boolean.class, Object.class)).invokeExact(z);
    emit("wrapper-return-unboxing", summary(ok, 8));
  }

  private static void caseNullUnboxing() throws Throwable {
    effects = 0;
    MethodHandle adapted = primitive(long.class).asType(MethodType.methodType(long.class, Object.class));
    try {
      long unexpected = (long) adapted.invokeExact((Object) null);
      emit("null-unboxing-before-target", "unexpected-success");
    } catch (NullPointerException expected) {
      emit("null-unboxing-before-target", failure(expected));
    }
  }

  private static void caseWrongWrapper() throws Throwable {
    effects = 0;
    MethodHandle adapted = primitive(int.class).asType(MethodType.methodType(int.class, Object.class));
    try {
      int unexpected = (int) adapted.invokeExact((Object) Long.valueOf(7L));
      emit("wrong-wrapper-before-target", "unexpected-success");
    } catch (ClassCastException expected) {
      emit("wrong-wrapper-before-target", failure(expected));
    }
  }

  private static void caseRejectNarrowing() throws Throwable {
    effects = 0;
    MethodHandle target = primitive(int.class);
    try {
      target.asType(MethodType.methodType(int.class, long.class));
      emit("reject-primitive-narrowing", "unexpected-argument-success");
    } catch (WrongMethodTypeException expected) {
      emit("reject-primitive-narrowing", new StringBuilder().append("argument:").append(failure(expected)).toString());
    }
    try {
      target.asType(MethodType.methodType(byte.class, int.class));
      emit("reject-primitive-narrowing", "unexpected-return-success");
    } catch (WrongMethodTypeException expected) {
      emit("reject-primitive-narrowing", new StringBuilder().append("return:").append(failure(expected)).toString());
    }
  }

  private static void caseRejectArity() throws Throwable {
    effects = 0;
    MethodHandle target = primitive(int.class);
    try {
      target.asType(MethodType.methodType(int.class));
      emit("reject-fixed-arity-change", "unexpected-success");
    } catch (WrongMethodTypeException expected) {
      emit("reject-fixed-arity-change", failure(expected));
    }
  }

  private static void caseRejectBoolean() throws Throwable {
    effects = 0;
    try {
      primitive(boolean.class).asType(MethodType.methodType(boolean.class, int.class));
      emit("reject-boolean-numeric", "unexpected-argument-success");
    } catch (WrongMethodTypeException expected) {
      emit("reject-boolean-numeric", new StringBuilder().append("argument:").append(failure(expected)).toString());
    }
    try {
      primitive(boolean.class).asType(MethodType.methodType(int.class, boolean.class));
      emit("reject-boolean-numeric", "unexpected-return-success");
    } catch (WrongMethodTypeException expected) {
      emit("reject-boolean-numeric", new StringBuilder().append("return:").append(failure(expected)).toString());
    }
  }

  private static void caseDiscardReturn() throws Throwable {
    effects = 0;
    MethodHandle adapted = primitive(long.class).asType(MethodType.methodType(void.class, long.class));
    adapted.invokeExact(0x100000001L);
    MethodHandle reference = reference(false).asType(MethodType.methodType(void.class, Object.class));
    reference.invokeExact(new Object());
    emit("discard-return-after-target", new StringBuilder().append("effects=").append(effects)
        .append(",voidType=").append(adapted.type().returnType() == void.class).toString());
  }

  private static void caseVoidPrimitive() throws Throwable {
    effects = 0;
    MethodHandle target = touchHandle();
    boolean ok = true;
    ok &= (byte) target.asType(MethodType.methodType(byte.class)).invokeExact() == 0;
    ok &= (short) target.asType(MethodType.methodType(short.class)).invokeExact() == 0;
    ok &= (char) target.asType(MethodType.methodType(char.class)).invokeExact() == 0;
    ok &= (int) target.asType(MethodType.methodType(int.class)).invokeExact() == 0;
    ok &= (long) target.asType(MethodType.methodType(long.class)).invokeExact() == 0L;
    ok &= Float.floatToRawIntBits((float) target.asType(MethodType.methodType(float.class)).invokeExact()) == 0;
    ok &= Double.doubleToRawLongBits((double) target.asType(MethodType.methodType(double.class)).invokeExact()) == 0L;
    ok &= !(boolean) target.asType(MethodType.methodType(boolean.class)).invokeExact();
    emit("void-to-primitive-zero", summary(ok, 8));
  }

  private static void caseVoidReference() throws Throwable {
    effects = 0;
    MethodHandle target = touchHandle();
    Object value = (Object) target.asType(MethodType.methodType(Object.class)).invokeExact();
    String text = (String) target.asType(MethodType.methodType(String.class)).invokeExact();
    emit("void-to-reference-null", new StringBuilder().append("nulls=").append(value == null && text == null)
        .append(",effects=").append(effects).toString());
  }

  private static void caseUnrelatedReferenceNull() throws Throwable {
    effects = 0;
    MethodHandle adapted = reference(true).asType(MethodType.methodType(String.class, Integer.class));
    String value = (String) adapted.invokeExact((Integer) null);
    emit("unrelated-reference-null", new StringBuilder().append("null=").append(value == null)
        .append(",effects=").append(effects).toString());
    try {
      String unexpected = (String) adapted.invokeExact(Integer.valueOf(7));
      emit("unrelated-reference-null", "unexpected-success");
    } catch (ClassCastException expected) {
      emit("unrelated-reference-null", failure(expected));
    }
  }

  public static void main(String[] args) throws Throwable {
    caseSameIdentity();
    caseArgumentWidening();
    caseReturnWidening();
    caseReferenceArgument();
    caseReferenceReturn();
    caseArgumentBoxing();
    caseReturnBoxing();
    caseArgumentUnboxing();
    caseReturnUnboxing();
    caseNullUnboxing();
    caseWrongWrapper();
    caseRejectNarrowing();
    caseRejectArity();
    caseRejectBoolean();
    caseDiscardReturn();
    caseVoidPrimitive();
    caseVoidReference();
    caseUnrelatedReferenceNull();
    System.out.println("METHODHANDLE_ADAPTATION_OK");
  }
}
