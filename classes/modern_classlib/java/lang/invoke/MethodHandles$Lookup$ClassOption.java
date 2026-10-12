package java.lang.invoke;

/** Exact binary-name shim; the bootstrap overlay supplies the nested enum
 * metadata because the release-9 compiler has no Lookup.ClassOption type. */
public enum MethodHandles$Lookup$ClassOption {
  NESTMATE,
  STRONG
}
