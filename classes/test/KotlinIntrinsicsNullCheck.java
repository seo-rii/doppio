package classes.test;

import kotlin.jvm.internal.Intrinsics;

public class KotlinIntrinsicsNullCheck {
  private static void checkParameter() {
    Intrinsics.checkNotNullParameter(null, "value");
  }

  private static void checkOldParameter() {
    Intrinsics.checkParameterIsNotNull(null, "legacy");
  }

  public static void main(String[] args) {
    Object value = new Object();
    Intrinsics.checkNotNull(value);
    Intrinsics.checkNotNull(value, "message");
    Intrinsics.checkNotNullParameter(value, "value");
    Intrinsics.checkParameterIsNotNull(value, "legacy");
    System.out.println("nonnull ok");

    try {
      Intrinsics.checkNotNull(null, "plain message");
    } catch (NullPointerException e) {
      System.out.println(e.getMessage());
    }

    try {
      checkParameter();
    } catch (NullPointerException e) {
      System.out.println(e.getMessage().contains("KotlinIntrinsicsNullCheck.checkParameter"));
      System.out.println(e.getMessage().contains("parameter value"));
    }

    try {
      checkOldParameter();
    } catch (IllegalArgumentException e) {
      System.out.println(e.getMessage().contains("KotlinIntrinsicsNullCheck.checkOldParameter"));
      System.out.println(e.getMessage().contains("parameter legacy"));
    }
  }
}
