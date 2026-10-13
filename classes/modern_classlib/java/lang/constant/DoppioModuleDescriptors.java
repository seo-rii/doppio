package java.lang.constant;

import java.util.Objects;

/** Immutable module/package descriptor values with the native name grammar. */
final class DoppioModuleDescriptors {
  private DoppioModuleDescriptors() {}

  static ModuleDesc module(String name) {
    Objects.requireNonNull(name);
    for (int index = name.length() - 1; index >= 0; index--) {
      char value = name.charAt(index);
      if (value <= 31 || ((value == '\\' || value == ':' || value == '@') &&
          (index == 0 || name.charAt(--index) != '\\')))
        throw new IllegalArgumentException("Invalid module name: " + name);
    }
    return new ModuleValue(name);
  }

  static PackageDesc packageName(String name, boolean internal) {
    Objects.requireNonNull(name);
    if (!name.isEmpty()) {
      int afterSeparator = 0;
      for (int index = 0; index < name.length(); index++) {
        char value = name.charAt(index);
        if (value == ';' || value == '[')
          throw new IllegalArgumentException("Invalid package name: " + name);
        if (value == '/' || value == '.') {
          if ((value == '/') != internal || index == afterSeparator)
            throw new IllegalArgumentException("Invalid package name: " + name);
          afterSeparator = index + 1;
        }
      }
      if (afterSeparator == name.length())
        throw new IllegalArgumentException("Invalid package name: " + name);
    }
    return new PackageValue(internal ? name : name.replace('.', '/'));
  }

  private static final class ModuleValue implements ModuleDesc {
    private final String name;
    ModuleValue(String name) { this.name = name; }
    public String name() { return name; }
    public boolean equals(Object other) {
      return this == other || other instanceof ModuleValue && name.equals(((ModuleValue) other).name);
    }
    public int hashCode() { return name.hashCode(); }
    public String toString() { return "ModuleDesc[" + name + "]"; }
  }

  private static final class PackageValue implements PackageDesc {
    private final String internalName;
    PackageValue(String internalName) { this.internalName = internalName; }
    public String internalName() { return internalName; }
    public boolean equals(Object other) {
      return this == other || other instanceof PackageValue && internalName.equals(((PackageValue) other).internalName);
    }
    public int hashCode() { return internalName.hashCode(); }
    public String toString() { return "PackageDesc[" + name() + "]"; }
  }
}
