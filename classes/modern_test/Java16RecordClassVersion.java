package classes.modern_test;

public record Java16RecordClassVersion(String name, int count) {
  private record NumericRecord(float ratio, double weight) {}

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
  }
}
