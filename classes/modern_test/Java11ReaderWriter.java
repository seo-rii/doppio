package classes.modern_test;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;

public class Java11ReaderWriter {
  public static void main(String[] args) throws Exception {
    Reader reader = Reader.nullReader();
    System.out.println(reader.read());
    System.out.println(reader.read(new char[3]));
    System.out.println(reader.read(new char[3], 1, 1));
    System.out.println(reader.ready());
    System.out.println(reader.skip(3));
    System.out.println(reader.skip(-1));
    reader.close();
    try {
      reader.read();
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      reader.ready();
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      reader.skip(-1);
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }

    Writer writer = Writer.nullWriter();
    writer.write('a');
    writer.write("bc");
    writer.write(new char[] { 'd', 'e' }, 0, 2);
    writer.append('f');
    writer.flush();
    System.out.println("written");

    try {
      writer.write((String) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      writer.write(new char[1], -1, 1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    writer.close();
    try {
      writer.write('x');
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      writer.flush();
      System.out.println("flushed");
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
