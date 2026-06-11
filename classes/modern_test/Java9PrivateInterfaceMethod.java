package classes.modern_test;

public class Java9PrivateInterfaceMethod {
  public static void main(String[] args) {
    Formatter formatter = new FormatterImpl();
    System.out.println(formatter.format("alpha"));
    System.out.println(Formatter.staticFormat("beta"));
  }

  interface Formatter {
    default String format(String input) {
      return new StringBuilder()
        .append(instancePrefix())
        .append(":")
        .append(normalize(input))
        .toString();
    }

    static String staticFormat(String input) {
      return new StringBuilder()
        .append("static:")
        .append(normalize(input))
        .toString();
    }

    private String instancePrefix() {
      return "instance";
    }

    private static String normalize(String input) {
      return new StringBuilder()
        .append("[")
        .append(input.toUpperCase())
        .append("]")
        .toString();
    }
  }

  static class FormatterImpl implements Formatter {
  }
}
