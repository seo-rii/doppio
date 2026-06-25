package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.security.ProtectionDomain;
import java.util.Arrays;

public class Java17ClassLoaderDefineByteBuffer {
  public static class Payload {
    public Payload() {}

    public String message() {
      return "bytebuffer payload";
    }
  }

  private static class ByteBufferLoader extends ClassLoader {
    public Class define(ByteBuffer buffer) {
      ProtectionDomain domain = Java17ClassLoaderDefineByteBuffer.class.getProtectionDomain();
      return defineClass(Payload.class.getName(), buffer, domain);
    }
  }

  private static byte[] readPayloadBytes() throws Exception {
    FileInputStream in = new FileInputStream("classes/modern_test/Java17ClassLoaderDefineByteBuffer$Payload.class");
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buffer = new byte[128];
    int read;
    while ((read = in.read(buffer)) != -1) {
      out.write(buffer, 0, read);
    }
    in.close();
    return out.toByteArray();
  }

  private static String defineAndInvoke(ByteBuffer buffer) throws Exception {
    int before = buffer.position();
    Class cls = new ByteBufferLoader().define(buffer);
    int after = buffer.position();
    Object obj = cls.newInstance();
    Method message = cls.getMethod("message");
    return message.invoke(obj) + ":" + cls.getName() + ":" + before + ":" + after + ":" + buffer.remaining();
  }

  public static void main(String[] args) throws Exception {
    byte[] payload = readPayloadBytes();
    byte[] wrapped = new byte[payload.length + 11];
    Arrays.fill(wrapped, (byte) 85);
    System.arraycopy(payload, 0, wrapped, 5, payload.length);

    ByteBuffer heap = ByteBuffer.wrap(wrapped);
    heap.position(5);
    heap.limit(5 + payload.length);
    System.out.println(defineAndInvoke(heap));

    ByteBuffer direct = ByteBuffer.allocateDirect(wrapped.length);
    direct.put(wrapped);
    direct.position(5);
    direct.limit(5 + payload.length);
    System.out.println(defineAndInvoke(direct));

    ByteBuffer directReadOnly = direct.asReadOnlyBuffer();
    directReadOnly.position(5);
    directReadOnly.limit(5 + payload.length);
    System.out.println(defineAndInvoke(directReadOnly));

    ByteBuffer directSliceSource = direct.duplicate();
    directSliceSource.position(5);
    directSliceSource.limit(5 + payload.length);
    ByteBuffer directSlice = directSliceSource.slice();
    directSlice.position(0);
    directSlice.limit(payload.length);
    System.out.println(defineAndInvoke(directSlice));

    ByteBuffer sliceSource = ByteBuffer.wrap(wrapped);
    sliceSource.position(5);
    sliceSource.limit(5 + payload.length);
    ByteBuffer slice = sliceSource.slice();
    slice.position(0);
    slice.limit(payload.length);
    System.out.println(defineAndInvoke(slice));
  }
}
