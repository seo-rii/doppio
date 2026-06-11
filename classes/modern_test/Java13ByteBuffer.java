package classes.modern_test;

import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.ReadOnlyBufferException;
import java.util.Arrays;

public class Java13ByteBuffer {
  public static void main(String[] args) {
    ByteBuffer getBuffer = ByteBuffer.wrap(new byte[] { 10, 11, 12, 13, 14 });
    ((Buffer) getBuffer).position(1);
    ((Buffer) getBuffer).limit(4);
    byte[] target = new byte[] { 0, 0, 0, 0, 0 };
    System.out.println(getBuffer.get(1, target, 1, 3) == getBuffer);
    System.out.println(Arrays.toString(target));
    System.out.println(getBuffer.position());

    byte[] targetAll = new byte[] { 0, 0 };
    getBuffer.get(2, targetAll);
    System.out.println(Arrays.toString(targetAll));
    System.out.println(getBuffer.position());

    byte[] backing = new byte[] { 1, 2, 3, 4, 5 };
    ByteBuffer putBuffer = ByteBuffer.wrap(backing);
    ((Buffer) putBuffer).position(2);
    ((Buffer) putBuffer).limit(4);
    System.out.println(putBuffer.put(1, new byte[] { 9, 8, 7, 6 }, 1, 3) == putBuffer);
    System.out.println(Arrays.toString(backing));
    System.out.println(putBuffer.position());
    putBuffer.put(0, new byte[] { 42, 43 });
    System.out.println(Arrays.toString(backing));
    System.out.println(putBuffer.position());

    ByteBuffer direct = ByteBuffer.allocateDirect(4);
    direct.put(0, (byte) 5);
    direct.put(1, (byte) 6);
    direct.put(2, (byte) 7);
    direct.put(3, (byte) 8);
    ((Buffer) direct).position(1);
    ((Buffer) direct).limit(3);
    byte[] directTarget = new byte[] { 0, 0, 0 };
    direct.get(1, directTarget, 0, 2);
    System.out.println(Arrays.toString(directTarget));
    System.out.println(direct.position());
    direct.put(0, new byte[] { -1, -2 });
    System.out.println(direct.get(0) + ":" + direct.get(1) + ":" + direct.position());

    printFailure("get-null", () -> getBuffer.get(0, null, 0, 1));
    printFailure("get-array-range", () -> getBuffer.get(0, new byte[2], 1, 2));
    printFailure("get-buffer-range", () -> getBuffer.get(3, new byte[2], 0, 2));
    printFailure("put-null", () -> putBuffer.put(0, null, 0, 1));
    printFailure("put-array-range", () -> putBuffer.put(0, new byte[2], 1, 2));
    printFailure("put-buffer-range", () -> putBuffer.put(3, new byte[2], 0, 2));
    printFailure("put-read-only", () -> ByteBuffer.wrap(new byte[] { 1, 2 }).asReadOnlyBuffer().put(0, new byte[] { 3 }, 0, 1));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run();
  }
}
