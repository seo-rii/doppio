package classes.modern_test;

public class Java11Nestmates {
  private int secret = 40;
  private static int staticSecret = 2;

  private int reveal() {
    return secret;
  }

  static class Reader {
    int read(Java11Nestmates target) {
      return target.secret + target.reveal() + Java11Nestmates.staticSecret;
    }
  }

  public static void main(String[] args) {
    System.out.println(new Reader().read(new Java11Nestmates()));
  }
}
