package java.lang;

import java.util.Objects;
import java.util.ResourceBundle;

final class DoppioSystem {
  private DoppioSystem() {
  }

  static System.Logger getLogger(String name) {
    return new System$DoppioLogger(Objects.requireNonNull(name));
  }

  static System.Logger getLogger(String name, ResourceBundle bundle) {
    Objects.requireNonNull(bundle);
    return getLogger(name);
  }
}
