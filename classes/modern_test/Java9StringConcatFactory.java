package classes.modern_test;

public class Java9StringConcatFactory {
  private enum Choice {
    ALPHA
  }

  private static class ObservableValue {
    static int calls = 0;
    private final String label;

    ObservableValue(String label) {
      this.label = label;
    }

    public String toString() {
      calls++;
      return "observable:" + label + ":" + calls;
    }
  }

  public static void main(String[] args) {
    int count = 7;
    String label = "items";
    boolean enabled = true;
    double weight = 3.5d;
    float wholeFloat = 1.0f;
    float nanFloat = Float.NaN;
    double negativeZero = -0.0d;
    double positiveInfinity = Double.POSITIVE_INFINITY;
    long big = 1234567890123L;
    long negative = -9876543210L;
    Byte boxedByte = Byte.valueOf((byte) -8);
    Short boxedShort = Short.valueOf((short) 1234);
    Integer boxedInt = Integer.valueOf(42);
    Long boxedLong = Long.valueOf(9876543210L);
    Boolean boxedBoolean = Boolean.TRUE;
    Character boxedChar = Character.valueOf('Z');
    Float boxedFloat = Float.valueOf(-0.0f);
    Double boxedDouble = Double.valueOf(1.0d);
    System.out.println("count=" + count + ", label=" + label);
    System.out.println(label + ":" + enabled + ":" + weight);
    System.out.println("floating=" + wholeFloat + ":" + negativeZero);
    System.out.println("floating-special=" + nanFloat + ":" + positiveInfinity);
    System.out.println("big=" + big + ", negative=" + negative);
    System.out.println(big + ":" + label);
    System.out.println("boxed=" + boxedInt + ":" + boxedLong + ":" + boxedBoolean + ":" + boxedChar);
    System.out.println("boxed-more=" + boxedByte + ":" + boxedShort);
    System.out.println("boxed-floating=" + boxedFloat + ":" + boxedDouble);
    Object observable = new ObservableValue("alpha");
    Object missing = null;
    System.out.println("object=" + observable);
    System.out.println("calls=" + ObservableValue.calls);
    System.out.println("missing=" + missing);
    System.out.println("object-direct=" + (Object) new StringBuilder("builder"));
    System.out.println("enum-direct=" + Choice.ALPHA);
    System.out.println("class-direct=" + Java9StringConcatFactory.class);
    String intArrayConcat = "int-array=" + (Object) new int[] { 1, 2 };
    String objectArrayConcat = "object-array=" + (Object) new String[] { "a", "b" };
    System.out.println(intArrayConcat.startsWith("int-array=[I@"));
    System.out.println(objectArrayConcat.startsWith("object-array=[Ljava.lang.String;@"));
  }
}
