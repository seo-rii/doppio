package classes.modern_test;

import java.io.StringReader;
import java.io.StringWriter;

public class Java10ReaderTransferTo {
  public static void main(String[] args) throws Exception {
    StringReader reader = new StringReader("abcdef");
    StringWriter writer = new StringWriter();
    long transferred = reader.transferTo(writer);
    System.out.println(transferred);
    System.out.println(writer.toString());

    try {
      new StringReader("x").transferTo(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
