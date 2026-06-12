package classes.test;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.lang.reflect.Method;
import java.util.Arrays;

public class DefineClassOffset {
  public static class Payload {
    public Payload() {}

    public String message() {
      return "payload ok";
    }
  }

  private static class OffsetLoader extends ClassLoader {
    public Class define(byte[] bytes, int offset, int length) {
      return defineClass(Payload.class.getName(), bytes, offset, length);
    }
  }

  private static byte[] readPayloadBytes() throws Exception {
    FileInputStream in = new FileInputStream("classes/test/DefineClassOffset$Payload.class");
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buffer = new byte[64];
    int read;
    while ((read = in.read(buffer)) != -1) {
      out.write(buffer, 0, read);
    }
    in.close();
    return out.toByteArray();
  }

  public static void main(String[] args) throws Exception {
    byte[] payload = readPayloadBytes();
    byte[] wrapped = new byte[payload.length + 11];
    Arrays.fill(wrapped, (byte) 85);
    System.arraycopy(payload, 0, wrapped, 5, payload.length);

    Class cls = new OffsetLoader().define(wrapped, 5, payload.length);
    Object obj = cls.newInstance();
    Method message = cls.getMethod("message");
    System.out.println(message.invoke(obj));
    System.out.println(cls.getName());
  }
}
