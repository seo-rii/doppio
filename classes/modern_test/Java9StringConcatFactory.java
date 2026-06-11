package classes.modern_test;

public class Java9StringConcatFactory {
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
    long big = 1234567890123L;
    long negative = -9876543210L;
    Integer boxedInt = Integer.valueOf(42);
    Long boxedLong = Long.valueOf(9876543210L);
    Boolean boxedBoolean = Boolean.TRUE;
    Character boxedChar = Character.valueOf('Z');
    System.out.println("count=" + count + ", label=" + label);
    System.out.println(label + ":" + enabled + ":" + weight);
    System.out.println("big=" + big + ", negative=" + negative);
    System.out.println(big + ":" + label);
    System.out.println("boxed=" + boxedInt + ":" + boxedLong + ":" + boxedBoolean + ":" + boxedChar);
    Object observable = new ObservableValue("alpha");
    Object missing = null;
    System.out.println("object=" + observable);
    System.out.println("calls=" + ObservableValue.calls);
    System.out.println("missing=" + missing);
  }
}
