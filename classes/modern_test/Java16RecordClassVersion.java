package classes.modern_test;

import java.util.Arrays;
import java.util.List;

public record Java16RecordClassVersion(String name, int count) {
  private record NumericRecord(float ratio, double weight) {}
  private record ReferenceRecord(List<String> names, Object marker, String[] labels) {}

  private static final class ValueMarker {
    private final int value;

    private ValueMarker(int value) {
      this.value = value;
    }

    @Override
    public boolean equals(Object other) {
      return other instanceof ValueMarker && value == ((ValueMarker) other).value;
    }

    @Override
    public int hashCode() {
      return value * 31;
    }
  }

  public static void main(String[] args) {
    Java16RecordClassVersion value = new Java16RecordClassVersion("record", 16);
    Java16RecordClassVersion same = new Java16RecordClassVersion("record", 16);
    Java16RecordClassVersion different = new Java16RecordClassVersion("record", 17);
    System.out.println(value.name());
    System.out.println(value.count());
    System.out.println(value);
    System.out.println(value.equals(same));
    System.out.println(value.equals(different));
    System.out.println(value.hashCode() == same.hashCode());

    NumericRecord decimal = new NumericRecord(1.5f, 2.25d);
    NumericRecord nanA = new NumericRecord(Float.NaN, Double.NaN);
    NumericRecord nanB = new NumericRecord(Float.NaN, Double.NaN);
    NumericRecord positiveZero = new NumericRecord(0.0f, 0.0d);
    NumericRecord negativeZero = new NumericRecord(-0.0f, -0.0d);
    System.out.println(decimal);
    System.out.println(negativeZero);
    System.out.println(nanA.equals(nanB));
    System.out.println(positiveZero.equals(negativeZero));
    System.out.println(nanA.hashCode() == nanB.hashCode());
    System.out.println(positiveZero.hashCode() == negativeZero.hashCode());

    List<String> names = Arrays.asList("a", "bb");
    String[] labels = new String[] { "left" };
    ReferenceRecord reference = new ReferenceRecord(names, new ValueMarker(5), labels);
    ReferenceRecord sameReferenceValues = new ReferenceRecord(Arrays.asList("a", "bb"), new ValueMarker(5), labels);
    ReferenceRecord differentList = new ReferenceRecord(Arrays.asList("a", "cc"), new ValueMarker(5), labels);
    ReferenceRecord differentArray = new ReferenceRecord(names, new ValueMarker(5), new String[] { "left" });
    ReferenceRecord nullReference = new ReferenceRecord(null, null, null);
    ReferenceRecord sameNullReference = new ReferenceRecord(null, null, null);
    System.out.println(reference.equals(sameReferenceValues));
    System.out.println(reference.hashCode() == sameReferenceValues.hashCode());
    System.out.println(reference.equals(differentList));
    System.out.println(reference.equals(differentArray));
    System.out.println(nullReference.equals(sameNullReference));
    System.out.println(nullReference.hashCode() == sameNullReference.hashCode());
  }
}
