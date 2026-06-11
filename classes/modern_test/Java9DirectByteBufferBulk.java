package classes.modern_test;

import java.nio.BufferOverflowException;
import java.nio.BufferUnderflowException;
import java.nio.ByteBuffer;
import java.nio.ReadOnlyBufferException;

public class Java9DirectByteBufferBulk {
  public static void main(String[] args) {
    ByteBuffer fluent = ByteBuffer.allocateDirect(5);
    System.out.println(fluent.position(2) == fluent);
    System.out.println(fluent.mark() == fluent);
    System.out.println(fluent.position(4) == fluent);
    System.out.println(fluent.reset().position());
    System.out.println(fluent.limit(3).limit() + ":" + fluent.position());
    System.out.println(fluent.clear().position() + ":" + fluent.limit());
    System.out.println(fluent.position(2).flip().position() + ":" + fluent.limit());
    System.out.println(fluent.rewind().position() + ":" + fluent.limit());

    ByteBuffer direct = ByteBuffer.allocateDirect(12);
    for (int i = 0; i < 12; i++) {
      direct.put((byte) (i + 1));
    }
    direct.position(2);

    byte[] small = new byte[4];
    direct.get(small, 1, 3);
    printBytes(small);
    System.out.println(direct.position());

    direct.position(0);
    byte[] full = new byte[8];
    direct.get(full, 0, full.length);
    printBytes(full);
    System.out.println(direct.position());

    ByteBuffer write = ByteBuffer.allocateDirect(8);
    write.position(1);
    write.put(new byte[] { 20, 21, 22, 23 }, 1, 2);
    System.out.println(write.position());
    write.position(0);
    byte[] roundTrip = new byte[8];
    write.get(roundTrip, 0, roundTrip.length);
    printBytes(roundTrip);

    printFailure("underflow", () -> ByteBuffer.allocateDirect(2).get(new byte[3], 0, 3));
    printFailure("overflow", () -> ByteBuffer.allocateDirect(2).put(new byte[] { 1, 2, 3 }, 0, 3));
    printFailure("bounds", () -> ByteBuffer.allocateDirect(2).get(new byte[2], 1, 2));
    printFailure("position", () -> ByteBuffer.allocateDirect(2).position(3));
    printFailure("readonly", () -> ByteBuffer.allocateDirect(2).asReadOnlyBuffer().put(new byte[] { 1 }, 0, 1));
  }

  private static void printBytes(byte[] bytes) {
    for (int i = 0; i < bytes.length; i++) {
      if (i > 0) {
        System.out.print(",");
      }
      System.out.print(bytes[i]);
    }
    System.out.println();
  }

  private static void printFailure(String label, Runnable action) {
    try {
      action.run();
      System.out.println(label + ":missing");
    } catch (BufferUnderflowException e) {
      System.out.println(label + ":BufferUnderflowException");
    } catch (BufferOverflowException e) {
      System.out.println(label + ":BufferOverflowException");
    } catch (IndexOutOfBoundsException e) {
      System.out.println(label + ":IndexOutOfBoundsException");
    } catch (IllegalArgumentException e) {
      System.out.println(label + ":IllegalArgumentException");
    } catch (ReadOnlyBufferException e) {
      System.out.println(label + ":ReadOnlyBufferException");
    }
  }
}
