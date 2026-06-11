package classes.modern_test;

public class Java9DefaultMethodSpecificity {
  public interface AbstractOwner {
    String value();
  }

  public interface LeftOwner extends AbstractOwner {
  }

  public interface DefaultOwner extends AbstractOwner {
    default String value() {
      return "default";
    }
  }

  public static final class Impl implements LeftOwner, DefaultOwner {
  }

  public interface BaseDefault {
    default String transform() {
      return "base";
    }
  }

  public abstract static class BaseDefaultCarrier implements BaseDefault {
  }

  public interface SpecificDefault extends BaseDefault {
    default String transform() {
      return "specific";
    }
  }

  public static final class SpecificImpl extends BaseDefaultCarrier implements SpecificDefault {
  }

  public static void main(String[] args) {
    AbstractOwner owner = new Impl();
    System.out.println(owner.value());
    BaseDefault specific = new SpecificImpl();
    System.out.println(specific.transform());
  }
}
