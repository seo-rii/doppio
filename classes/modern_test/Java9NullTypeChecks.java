package classes.modern_test;

public class Java9NullTypeChecks {
  public static void main(String[] args) {
    Object checked = Java9NullTypeChecksGenerated.nullCheckcast();
    System.out.println(checked == null);
    System.out.println(Java9NullTypeChecksGenerated.nullInstanceOf());
  }
}
