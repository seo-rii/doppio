String initialized = "compact-initialized";

void main(String[] args) {
  // java.base's exported packages are implicitly imported in compact sources.
  var values = new ArrayList<String>();
  Collections.addAll(values, args);
  if (!"compact-initialized".equals(initialized)) {
    throw new AssertionError("compact instance initialization");
  }
  IO.print("compact-args=");
  IO.println(String.join("|", values));
  IO.println(initialized);
  IO.print(null);
  IO.println();
  IO.println(new Object() {
    @Override public String toString() { return "object-to-string"; }
  });
}
