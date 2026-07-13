package java.lang;

import java.util.ResourceBundle;

final class DoppioSystem {
  private DoppioSystem() {
  }

  static native Object getLogger(String name);

  static native Object getLogger(String name, ResourceBundle bundle);
}
