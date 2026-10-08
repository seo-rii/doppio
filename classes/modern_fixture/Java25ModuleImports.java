package classes.modern_test;

import module java.base;
import module java.base;
import module java.desktop;
import module java.sql;
import java.sql.*;
import java.util.List;

/** Source-import coverage over existing classes; this does not exercise a runtime module graph. */
public class Java25ModuleImports {
  private static int checks;

  private static void require(boolean condition, String label) {
    checks++;
    if (!condition) throw new AssertionError(label);
  }

  private static void basePackages() throws Exception {
    ArrayList<String> values = new ArrayList<>();
    values.add("alpha");
    values.add("beta");
    require(values.size() == 2 && values.get(1).equals("beta"), "module-imported java.util type");
    BigInteger integer = new BigInteger("12345678901234567890");
    require(integer.add(BigInteger.ONE).toString().equals("12345678901234567891"),
        "module-imported java.math type");
    ByteArrayInputStream bytes = new ByteArrayInputStream(new byte[] { 65, 66 });
    require(bytes.read() == 65 && bytes.read() == 66 && bytes.read() == -1,
        "module-imported java.io type");
    ByteBuffer buffer = ByteBuffer.allocate(8);
    buffer.putInt(17).putInt(-23);
    buffer.flip();
    require(buffer.getInt() == 17 && buffer.getInt() == -23,
        "module-imported java.nio type");
    IntUnaryOperator increment = value -> value + 1;
    require(increment.applyAsInt(41) == 42, "module-imported subpackage interface");
    Pattern pattern = Pattern.compile("[a-z]+[0-9]+");
    require(pattern.matcher("name17").matches() && !pattern.matcher("17name").matches(),
        "module-imported regex type");
    System.out.println("base-module-packages");
  }

  private static void importPrecedence() {
    List<String> values = new ArrayList<>();
    values.add("single-type");
    require(values instanceof java.util.List && values.get(0).equals("single-type"),
        "single-type import resolves java.util.List versus java.awt.List");
    require(List.class.getName().equals("java.util.List"), "single-type import identity");
    Date date = new Date(0L);
    require(date instanceof java.sql.Date && date.getTime() == 0L,
        "package import resolves java.sql.Date versus java.util.Date");
    require(Date.class.getName().equals("java.sql.Date"), "on-demand import identity");
    System.out.println("import-precedence");
  }

  public static void main(String[] args) throws Exception {
    basePackages();
    importPrecedence();
    System.out.println("checks=" + checks);
  }
}
