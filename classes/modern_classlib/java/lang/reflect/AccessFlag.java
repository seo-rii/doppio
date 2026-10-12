package java.lang.reflect;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/** Selected current-format location contracts; historical version overloads are unclaimed. */
public enum AccessFlag {
  PUBLIC(1, true, Location.CLASS, Location.FIELD, Location.METHOD, Location.INNER_CLASS),
  PRIVATE(2, true, Location.FIELD, Location.METHOD, Location.INNER_CLASS),
  PROTECTED(4, true, Location.FIELD, Location.METHOD, Location.INNER_CLASS),
  STATIC(8, true, Location.FIELD, Location.METHOD, Location.INNER_CLASS),
  FINAL(16, true, Location.CLASS, Location.FIELD, Location.METHOD, Location.INNER_CLASS, Location.METHOD_PARAMETER),
  SUPER(32, false, Location.CLASS), OPEN(32, false, Location.MODULE),
  TRANSITIVE(32, false, Location.MODULE_REQUIRES), SYNCHRONIZED(32, true, Location.METHOD),
  STATIC_PHASE(64, false, Location.MODULE_REQUIRES), VOLATILE(64, true, Location.FIELD), BRIDGE(64, false, Location.METHOD),
  TRANSIENT(128, true, Location.FIELD), VARARGS(128, false, Location.METHOD), NATIVE(256, true, Location.METHOD),
  INTERFACE(512, false, Location.CLASS, Location.INNER_CLASS),
  ABSTRACT(1024, true, Location.CLASS, Location.METHOD, Location.INNER_CLASS), STRICT(2048, true),
  SYNTHETIC(4096, false, Location.CLASS, Location.FIELD, Location.METHOD, Location.INNER_CLASS,
    Location.METHOD_PARAMETER, Location.MODULE, Location.MODULE_REQUIRES, Location.MODULE_EXPORTS, Location.MODULE_OPENS),
  ANNOTATION(8192, false, Location.CLASS, Location.INNER_CLASS),
  ENUM(16384, false, Location.CLASS, Location.FIELD, Location.INNER_CLASS),
  MANDATED(32768, false, Location.METHOD_PARAMETER, Location.MODULE, Location.MODULE_REQUIRES, Location.MODULE_EXPORTS, Location.MODULE_OPENS),
  MODULE(32768, false, Location.CLASS);
  public enum Location {
    CLASS, FIELD, METHOD, INNER_CLASS, METHOD_PARAMETER, MODULE, MODULE_REQUIRES, MODULE_EXPORTS, MODULE_OPENS;
    public int flagsMask() {
      int result = 0;
      for (AccessFlag flag : AccessFlag.values()) if (flag.locations().contains(this)) result |= flag.mask();
      return result;
    }
    public Set<AccessFlag> flags() { return AccessFlag.maskToAccessFlags(flagsMask(), this); }
  }
  private final int mask;
  private final boolean modifier;
  private final Set<Location> locations;
  AccessFlag(int mask, boolean modifier, Location... locations) {
    this.mask = mask; this.modifier = modifier;
    EnumSet<Location> set = EnumSet.noneOf(Location.class);
    Collections.addAll(set, locations);
    this.locations = Collections.unmodifiableSet(set);
  }
  public int mask() { return mask; }
  public boolean sourceModifier() { return modifier; }
  public Set<Location> locations() { return locations; }
  public static Set<AccessFlag> maskToAccessFlags(int mask, Location location) {
    Objects.requireNonNull(location);
    if ((mask & ~location.flagsMask()) != 0) throw new IllegalArgumentException("Unknown access flag for location");
    EnumSet<AccessFlag> flags = EnumSet.noneOf(AccessFlag.class);
    for (AccessFlag flag : values()) if (flag.locations().contains(location) && (mask & flag.mask()) != 0) flags.add(flag);
    return Collections.unmodifiableSet(flags);
  }
}
