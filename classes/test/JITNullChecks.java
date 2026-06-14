package classes.test;

public class JITNullChecks {
  private int instanceValue;

  private static class Box {
    int value;

    int next() {
      return value + 1;
    }
  }

  private int privateValue() {
    return instanceValue + 3;
  }

  private static int readField(Box box) {
    return box.value;
  }

  private static void writeField(Box box, int value) {
    box.value = value;
  }

  private static int readArray(int[] values) {
    return values[0];
  }

  private static void writeArray(int[] values, int value) {
    values[0] = value;
  }

  private static int arrayLength(int[] values) {
    return values.length;
  }

  private static int callVirtual(Box box) {
    return box.next();
  }

  private static int callPrivate(JITNullChecks target) {
    return target.privateValue();
  }

  public static void main(String[] args) {
    Box box = new Box();
    box.value = 7;
    int[] values = new int[] {11};
    JITNullChecks target = new JITNullChecks();
    target.instanceValue = 13;

    for (int i = 0; i < 500; i++) {
      readField(box);
      writeField(box, i);
      readArray(values);
      writeArray(values, i + 1);
      arrayLength(values);
      callVirtual(box);
      callPrivate(target);
    }
    System.out.println("warm done");

    try {
      readField(null);
      System.out.println("read field missed");
    } catch (NullPointerException e) {
      System.out.println("read field caught");
    }

    try {
      writeField(null, 1);
      System.out.println("write field missed");
    } catch (NullPointerException e) {
      System.out.println("write field caught");
    }

    try {
      readArray(null);
      System.out.println("read array missed");
    } catch (NullPointerException e) {
      System.out.println("read array caught");
    }

    try {
      writeArray(null, 1);
      System.out.println("write array missed");
    } catch (NullPointerException e) {
      System.out.println("write array caught");
    }

    try {
      arrayLength(null);
      System.out.println("array length missed");
    } catch (NullPointerException e) {
      System.out.println("array length caught");
    }

    try {
      callVirtual(null);
      System.out.println("virtual call missed");
    } catch (NullPointerException e) {
      System.out.println("virtual call caught");
    }

    try {
      callPrivate(null);
      System.out.println("private call missed");
    } catch (NullPointerException e) {
      System.out.println("private call caught");
    }
  }
}
