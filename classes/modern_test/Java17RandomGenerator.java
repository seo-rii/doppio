package classes.modern_test;

import java.util.Arrays;
import java.util.Spliterator;
import java.util.random.RandomGenerator;
import java.util.random.RandomGeneratorFactory;
import java.util.stream.Stream;

public class Java17RandomGenerator {
  private static final class SequenceGenerator implements RandomGenerator {
    private final long[] values;
    private int index;

    SequenceGenerator(long... values) {
      this.values = values;
    }

    public long nextLong() {
      return values[index++ % values.length];
    }
  }

  private static final class StreamableSequence implements RandomGenerator.StreamableGenerator {
    private long value;

    StreamableSequence(long value) {
      this.value = value;
    }

    public long nextLong() {
      return value;
    }

    public Stream<RandomGenerator> rngs() {
      return Stream.generate(() -> new StreamableSequence(++value));
    }
  }

  private static class JumpSequence implements RandomGenerator.JumpableGenerator {
    protected long value;
    protected int jumps;

    JumpSequence(long value) {
      this.value = value;
    }

    public long nextLong() {
      return value;
    }

    public JumpSequence copy() {
      JumpSequence copy = new JumpSequence(value);
      copy.jumps = jumps;
      return copy;
    }

    public void jump() {
      jumps++;
      value += 10L;
    }

    public double jumpDistance() {
      return 10.0d;
    }
  }

  private static final class LeapSequence implements RandomGenerator.LeapableGenerator {
    private long value;
    private int jumps;
    private int leaps;

    LeapSequence(long value) {
      this.value = value;
    }

    public long nextLong() {
      return value;
    }

    public LeapSequence copy() {
      LeapSequence copy = new LeapSequence(value);
      copy.jumps = jumps;
      copy.leaps = leaps;
      return copy;
    }

    public void jump() {
      jumps++;
      value += 10L;
    }

    public double jumpDistance() {
      return 10.0d;
    }

    public void leap() {
      leaps++;
      value += 100L;
    }

    public double leapDistance() {
      return 100.0d;
    }
  }

  private static final class ArbitrarySequence implements RandomGenerator.ArbitrarilyJumpableGenerator {
    private long value;
    private double distanceSum;
    private int powers;
    private int distanceCalls;

    ArbitrarySequence(long value) {
      this.value = value;
    }

    public long nextLong() {
      return value;
    }

    public ArbitrarySequence copy() {
      ArbitrarySequence copy = new ArbitrarySequence(value);
      copy.distanceSum = distanceSum;
      copy.powers = powers;
      copy.distanceCalls = distanceCalls;
      return copy;
    }

    public void jumpPowerOfTwo(int logDistance) {
      powers += logDistance;
      value += logDistance;
    }

    public void jump(double distance) {
      distanceCalls++;
      distanceSum += distance;
      value += (long) distance;
    }

    public double jumpDistance() {
      return 10.0d;
    }

    public double leapDistance() {
      return 100.0d;
    }
  }

  public static void main(String[] args) {
    RandomGeneratorFactory<RandomGenerator> factory = RandomGeneratorFactory.of("Random");
    System.out.println(factory.name());
    System.out.println(factory.group());
    System.out.println(factory.isDeprecated());
    System.out.println(factory.isSplittable());
    System.out.println(factory.isStreamable());
    System.out.println(factory.isStatistical());
    System.out.println(factory.stateBits());
    System.out.println(factory.equidistribution());
    System.out.println(factory.period());
    System.out.println(factory.isStochastic());
    System.out.println(factory.isHardware());
    System.out.println(factory.isArbitrarilyJumpable());
    System.out.println(factory.isJumpable());
    System.out.println(factory.isLeapable());

    RandomGenerator generator = factory.create(123L);
    System.out.println(generator.nextInt());
    System.out.println(generator.nextInt(10));
    System.out.println(generator.nextInt(5, 10));
    System.out.println(generator.nextLong());
    System.out.println(generator.nextBoolean());
    byte[] bytes = new byte[4];
    generator.nextBytes(bytes);
    System.out.println(Arrays.toString(bytes));

    RandomGenerator bounded = factory.create(456L);
    System.out.println(bounded.nextLong(100L));
    System.out.println(bounded.nextLong(5L, 10L));
    System.out.println(bounded.nextDouble(2.0d));
    System.out.println(bounded.nextDouble(2.0d, 4.0d));
    System.out.println(bounded.nextFloat(2.0f));
    System.out.println(bounded.nextFloat(2.0f, 4.0f));
    System.out.println(factory.create(456L).nextGaussian(10.0d, 0.0d));
    System.out.println(factory.create(456L).nextExponential() >= 0.0d);
    System.out.println(Double.doubleToRawLongBits(new SequenceGenerator(0L).nextExponential()));
    System.out.println(Double.doubleToRawLongBits(new SequenceGenerator(1L).nextExponential()));
    System.out.println(factory.create(789L).ints(3, 2, 5).sum());
    System.out.println(factory.create(789L).longs(3, 2L, 5L).sum());
    System.out.println(factory.create(789L).doubles(3, 2.0d, 5.0d).count());
    printSized("ints", factory.create(789L).ints(3).spliterator());
    printSized("ints-range", factory.create(789L).ints(3, 2, 5).spliterator());
    printSized("longs", factory.create(789L).longs(3).spliterator());
    printSized("longs-range", factory.create(789L).longs(3, 2L, 5L).spliterator());
    printSized("doubles", factory.create(789L).doubles(3).spliterator());
    printSized("doubles-range", factory.create(789L).doubles(3, 2.0d, 5.0d).spliterator());

    System.out.println(factory.create().nextInt(1) == 0);
    System.out.println(factory.create(new byte[] {}).nextInt(1) == 0);
    System.out.println(factory.create(new byte[] { 1, 2, 3, 4 }).nextInt(1) == 0);
    System.out.println(RandomGenerator.getDefault().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("Random").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("Random")));
    System.out.println(factory == RandomGeneratorFactory.of("Random"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("Random")).findFirst().get() == factory);
    System.out.println(RandomGeneratorFactory.getDefault() == RandomGeneratorFactory.getDefault());

    RandomGeneratorFactory<RandomGenerator> secureFactory = RandomGeneratorFactory.of("SecureRandom");
    System.out.println(secureFactory.name());
    System.out.println(secureFactory.group());
    System.out.println(secureFactory.stateBits());
    System.out.println(secureFactory.equidistribution());
    System.out.println(secureFactory.period());
    System.out.println(secureFactory.isStatistical());
    System.out.println(secureFactory.isStochastic());
    System.out.println(secureFactory.isHardware());
    System.out.println(secureFactory.isArbitrarilyJumpable());
    System.out.println(secureFactory.isJumpable());
    System.out.println(secureFactory.isLeapable());
    System.out.println(secureFactory.isSplittable());
    System.out.println(secureFactory.isStreamable());
    System.out.println(secureFactory.isDeprecated());
    RandomGenerator secureGenerator = secureFactory.create();
    System.out.println(secureGenerator.getClass().getName().contains("SecureRandom"));
    System.out.println(secureGenerator.nextInt(1) == 0);
    System.out.println(secureFactory.create(123L).nextInt(1) == 0);
    System.out.println(secureFactory.create(new byte[] {}).nextInt(1) == 0);
    System.out.println(secureFactory.create(new byte[] { 1, 2, 3, 4 }).nextInt(1) == 0);
    System.out.println(RandomGenerator.of("SecureRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("SecureRandom")));

    RandomGeneratorFactory<RandomGenerator> splitFactory = RandomGeneratorFactory.of("SplittableRandom");
    System.out.println(splitFactory.name());
    System.out.println(splitFactory.group());
    System.out.println(splitFactory.stateBits());
    System.out.println(splitFactory.equidistribution());
    System.out.println(splitFactory.period());
    System.out.println(splitFactory.isStatistical());
    System.out.println(splitFactory.isStochastic());
    System.out.println(splitFactory.isHardware());
    System.out.println(splitFactory.isArbitrarilyJumpable());
    System.out.println(splitFactory.isSplittable());
    System.out.println(splitFactory.isStreamable());
    System.out.println(splitFactory.isJumpable());
    System.out.println(splitFactory.isLeapable());
    System.out.println(splitFactory.isDeprecated());
    RandomGenerator splitGenerator = splitFactory.create(123L);
    System.out.println(splitGenerator.nextInt());
    System.out.println(splitGenerator.nextInt(10));
    System.out.println(splitGenerator.nextLong());
    System.out.println(splitGenerator.nextDouble());
    System.out.println(splitGenerator.nextBoolean());
    System.out.println(splitFactory.create(new byte[] {}).nextInt(1) == 0);
    System.out.println(splitFactory.create(new byte[] { 1, 2, 3, 4 }).nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("SplittableRandom")));
    System.out.println(splitFactory == RandomGeneratorFactory.of("SplittableRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("SplittableRandom")).findFirst().get() == splitFactory);
    RandomGenerator.SplittableGenerator namedSplit = RandomGenerator.SplittableGenerator.of("SplittableRandom");
    System.out.println(namedSplit.getClass().getName().contains("SplittableRandom"));
    System.out.println(namedSplit.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator seededSplit =
        (RandomGenerator.SplittableGenerator) splitFactory.create(123L);
    RandomGenerator.SplittableGenerator childSplit = seededSplit.split();
    System.out.println(seededSplit.nextInt());
    System.out.println(childSplit.nextInt());
    System.out.println(((RandomGenerator.SplittableGenerator) splitFactory.create(123L))
        .splits(2)
        .mapToInt(g -> g.nextInt())
        .sum());
    printSized("split-rngs", ((RandomGenerator.SplittableGenerator) splitFactory.create(123L))
        .rngs(2)
        .spliterator());
    printSized("split-splits", ((RandomGenerator.SplittableGenerator) splitFactory.create(123L))
        .splits(2)
        .spliterator());
    printSized("split-splits-source", ((RandomGenerator.SplittableGenerator) splitFactory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) splitFactory.create(456L))
        .spliterator());
    RandomGenerator.SplittableGenerator splitTarget =
        (RandomGenerator.SplittableGenerator) splitFactory.create(123L);
    RandomGenerator.SplittableGenerator splitSource =
        (RandomGenerator.SplittableGenerator) splitFactory.create(456L);
    RandomGenerator.SplittableGenerator sourceChild = splitTarget.split(splitSource);
    System.out.println(sourceChild.nextInt());
    System.out.println(splitTarget.nextInt());
    System.out.println(splitSource.nextInt());
    try {
      splitTarget.split(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      splitTarget.splits(-1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      splitTarget.rngs(-1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      splitTarget.splits((RandomGenerator.SplittableGenerator) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      splitTarget.splits(2L, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      splitTarget.splits(0L, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      splitTarget.splits(-1L, null);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(splitTarget.splits(0L, splitSource).count());
    System.out.println(splitTarget.rngs(0L).count());
    printSized("split-splits-zero", splitTarget.splits(0L, splitSource).spliterator());
    printSized("split-rngs-zero", splitTarget.rngs(0L).spliterator());

    RandomGeneratorFactory<RandomGenerator> lxmFactory = RandomGeneratorFactory.of("L32X64MixRandom");
    System.out.println(lxmFactory.name());
    System.out.println(lxmFactory.group());
    System.out.println(lxmFactory.stateBits());
    System.out.println(lxmFactory.equidistribution());
    System.out.println(lxmFactory.period());
    System.out.println(lxmFactory.isStatistical());
    System.out.println(lxmFactory.isStochastic());
    System.out.println(lxmFactory.isHardware());
    System.out.println(lxmFactory.isArbitrarilyJumpable());
    System.out.println(lxmFactory.isSplittable());
    System.out.println(lxmFactory.isStreamable());
    System.out.println(lxmFactory.isJumpable());
    System.out.println(lxmFactory.isLeapable());
    System.out.println(lxmFactory.isDeprecated());
    RandomGenerator lxmGenerator = lxmFactory.create(123L);
    System.out.println(lxmGenerator.getClass().getName().contains("L32X64MixRandom"));
    System.out.println(lxmGenerator.nextInt());
    System.out.println(lxmGenerator.nextInt(10));
    System.out.println(lxmGenerator.nextLong());
    System.out.println(lxmGenerator.nextDouble());
    System.out.println(lxmGenerator.nextBoolean());
    RandomGenerator lxmEmptySeed = lxmFactory.create(new byte[] {});
    System.out.println(lxmEmptySeed.nextInt());
    System.out.println(lxmEmptySeed.nextInt(10));
    System.out.println(lxmEmptySeed.nextLong());
    System.out.println(lxmEmptySeed.nextDouble());
    RandomGenerator lxmByteSeed = lxmFactory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(lxmByteSeed.nextInt());
    System.out.println(lxmByteSeed.nextInt(10));
    System.out.println(lxmByteSeed.nextLong());
    System.out.println(lxmByteSeed.nextDouble());
    System.out.println(lxmFactory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L32X64MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.getDefault().name());
    System.out.println(RandomGenerator.getDefault().getClass().getName().contains("L32X64MixRandom"));
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L32X64MixRandom")));
    System.out.println(lxmFactory == RandomGeneratorFactory.of("L32X64MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L32X64MixRandom")).findFirst().get() == lxmFactory);
    RandomGenerator.SplittableGenerator namedLxm =
        RandomGenerator.SplittableGenerator.of("L32X64MixRandom");
    System.out.println(namedLxm.getClass().getName().contains("L32X64MixRandom"));
    System.out.println(namedLxm.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator lxmSeededSplit =
        (RandomGenerator.SplittableGenerator) lxmFactory.create(123L);
    RandomGenerator.SplittableGenerator lxmChild = lxmSeededSplit.split();
    System.out.println(lxmSeededSplit.nextInt());
    System.out.println(lxmChild.nextInt());
    RandomGenerator.SplittableGenerator lxmTarget =
        (RandomGenerator.SplittableGenerator) lxmFactory.create(123L);
    RandomGenerator.SplittableGenerator lxmSource =
        (RandomGenerator.SplittableGenerator) lxmFactory.create(456L);
    RandomGenerator.SplittableGenerator lxmSourceChild = lxmTarget.split(lxmSource);
    System.out.println(lxmSourceChild.nextInt());
    System.out.println(lxmTarget.nextInt());
    System.out.println(lxmSource.nextInt());
    System.out.println(((RandomGenerator.SplittableGenerator) lxmFactory.create(123L))
        .splits(2)
        .mapToInt(g -> g.nextInt())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) lxmFactory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) lxmFactory.create(456L))
        .mapToInt(g -> g.nextInt())
        .sum());
    System.out.println(lxmTarget.splits(0L, lxmSource).count());
    RandomGenerator.SplittableGenerator lxmZeroTarget =
        (RandomGenerator.SplittableGenerator) lxmFactory.create(123L);
    System.out.println(lxmZeroTarget.splits(0L, (RandomGenerator.SplittableGenerator) lxmFactory.create(456L)).count());
    System.out.println(lxmZeroTarget.nextInt());

    RandomGeneratorFactory<RandomGenerator> l64Factory = RandomGeneratorFactory.of("L64X128MixRandom");
    System.out.println(l64Factory.name());
    System.out.println(l64Factory.group());
    System.out.println(l64Factory.stateBits());
    System.out.println(l64Factory.equidistribution());
    System.out.println(l64Factory.period());
    System.out.println(l64Factory.isStatistical());
    System.out.println(l64Factory.isStochastic());
    System.out.println(l64Factory.isHardware());
    System.out.println(l64Factory.isArbitrarilyJumpable());
    System.out.println(l64Factory.isSplittable());
    System.out.println(l64Factory.isStreamable());
    System.out.println(l64Factory.isJumpable());
    System.out.println(l64Factory.isLeapable());
    System.out.println(l64Factory.isDeprecated());
    RandomGenerator l64Generator = l64Factory.create(123L);
    System.out.println(l64Generator.getClass().getName().contains("L64X128MixRandom"));
    System.out.println(l64Generator.nextInt());
    System.out.println(l64Generator.nextInt(10));
    System.out.println(l64Generator.nextLong());
    System.out.println(l64Generator.nextDouble());
    System.out.println(l64Generator.nextBoolean());
    RandomGenerator l64EmptySeed = l64Factory.create(new byte[] {});
    System.out.println(l64EmptySeed.nextInt());
    System.out.println(l64EmptySeed.nextInt(10));
    System.out.println(l64EmptySeed.nextLong());
    System.out.println(l64EmptySeed.nextDouble());
    RandomGenerator l64ByteSeed = l64Factory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(l64ByteSeed.nextInt());
    System.out.println(l64ByteSeed.nextInt(10));
    System.out.println(l64ByteSeed.nextLong());
    System.out.println(l64ByteSeed.nextDouble());
    System.out.println(l64Factory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L64X128MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L64X128MixRandom")));
    System.out.println(l64Factory == RandomGeneratorFactory.of("L64X128MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L64X128MixRandom")).findFirst().get() == l64Factory);
    RandomGenerator.SplittableGenerator namedL64 =
        RandomGenerator.SplittableGenerator.of("L64X128MixRandom");
    System.out.println(namedL64.getClass().getName().contains("L64X128MixRandom"));
    System.out.println(namedL64.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l64SeededSplit =
        (RandomGenerator.SplittableGenerator) l64Factory.create(123L);
    RandomGenerator.SplittableGenerator l64Child = l64SeededSplit.split();
    System.out.println(l64SeededSplit.nextLong());
    System.out.println(l64Child.nextLong());
    RandomGenerator.SplittableGenerator l64Target =
        (RandomGenerator.SplittableGenerator) l64Factory.create(123L);
    RandomGenerator.SplittableGenerator l64Source =
        (RandomGenerator.SplittableGenerator) l64Factory.create(456L);
    RandomGenerator.SplittableGenerator l64SourceChild = l64Target.split(l64Source);
    System.out.println(l64SourceChild.nextLong());
    System.out.println(l64Target.nextLong());
    System.out.println(l64Source.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l64Factory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l64Factory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l64Factory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l64ZeroTarget =
        (RandomGenerator.SplittableGenerator) l64Factory.create(123L);
    System.out.println(l64ZeroTarget.splits(0L, (RandomGenerator.SplittableGenerator) l64Factory.create(456L)).count());
    System.out.println(l64ZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> l64StarFactory =
        RandomGeneratorFactory.of("L64X128StarStarRandom");
    System.out.println(l64StarFactory.name());
    System.out.println(l64StarFactory.group());
    System.out.println(l64StarFactory.stateBits());
    System.out.println(l64StarFactory.equidistribution());
    System.out.println(l64StarFactory.period());
    System.out.println(l64StarFactory.isStatistical());
    System.out.println(l64StarFactory.isStochastic());
    System.out.println(l64StarFactory.isHardware());
    System.out.println(l64StarFactory.isArbitrarilyJumpable());
    System.out.println(l64StarFactory.isSplittable());
    System.out.println(l64StarFactory.isStreamable());
    System.out.println(l64StarFactory.isJumpable());
    System.out.println(l64StarFactory.isLeapable());
    System.out.println(l64StarFactory.isDeprecated());
    RandomGenerator l64StarGenerator = l64StarFactory.create(123L);
    System.out.println(l64StarGenerator.getClass().getName().contains("L64X128StarStarRandom"));
    System.out.println(l64StarGenerator.nextInt());
    System.out.println(l64StarGenerator.nextInt(10));
    System.out.println(l64StarGenerator.nextLong());
    System.out.println(l64StarGenerator.nextDouble());
    System.out.println(l64StarGenerator.nextBoolean());
    RandomGenerator l64StarEmptySeed = l64StarFactory.create(new byte[] {});
    System.out.println(l64StarEmptySeed.nextInt());
    System.out.println(l64StarEmptySeed.nextInt(10));
    System.out.println(l64StarEmptySeed.nextLong());
    System.out.println(l64StarEmptySeed.nextDouble());
    RandomGenerator l64StarByteSeed = l64StarFactory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(l64StarByteSeed.nextInt());
    System.out.println(l64StarByteSeed.nextInt(10));
    System.out.println(l64StarByteSeed.nextLong());
    System.out.println(l64StarByteSeed.nextDouble());
    System.out.println(l64StarFactory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L64X128StarStarRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L64X128StarStarRandom")));
    System.out.println(l64StarFactory == RandomGeneratorFactory.of("L64X128StarStarRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L64X128StarStarRandom")).findFirst().get() == l64StarFactory);
    RandomGenerator.SplittableGenerator namedL64Star =
        RandomGenerator.SplittableGenerator.of("L64X128StarStarRandom");
    System.out.println(namedL64Star.getClass().getName().contains("L64X128StarStarRandom"));
    System.out.println(namedL64Star.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l64StarSeededSplit =
        (RandomGenerator.SplittableGenerator) l64StarFactory.create(123L);
    RandomGenerator.SplittableGenerator l64StarChild = l64StarSeededSplit.split();
    System.out.println(l64StarSeededSplit.nextLong());
    System.out.println(l64StarChild.nextLong());
    RandomGenerator.SplittableGenerator l64StarTarget =
        (RandomGenerator.SplittableGenerator) l64StarFactory.create(123L);
    RandomGenerator.SplittableGenerator l64StarSource =
        (RandomGenerator.SplittableGenerator) l64StarFactory.create(456L);
    RandomGenerator.SplittableGenerator l64StarSourceChild = l64StarTarget.split(l64StarSource);
    System.out.println(l64StarSourceChild.nextLong());
    System.out.println(l64StarTarget.nextLong());
    System.out.println(l64StarSource.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l64StarFactory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l64StarFactory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l64StarFactory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l64StarZeroTarget =
        (RandomGenerator.SplittableGenerator) l64StarFactory.create(123L);
    System.out.println(l64StarZeroTarget.splits(
        0L,
        (RandomGenerator.SplittableGenerator) l64StarFactory.create(456L)
    ).count());
    System.out.println(l64StarZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> l64X256Factory =
        RandomGeneratorFactory.of("L64X256MixRandom");
    System.out.println(l64X256Factory.name());
    System.out.println(l64X256Factory.group());
    System.out.println(l64X256Factory.stateBits());
    System.out.println(l64X256Factory.equidistribution());
    System.out.println(l64X256Factory.period());
    System.out.println(l64X256Factory.isStatistical());
    System.out.println(l64X256Factory.isStochastic());
    System.out.println(l64X256Factory.isHardware());
    System.out.println(l64X256Factory.isArbitrarilyJumpable());
    System.out.println(l64X256Factory.isSplittable());
    System.out.println(l64X256Factory.isStreamable());
    System.out.println(l64X256Factory.isJumpable());
    System.out.println(l64X256Factory.isLeapable());
    System.out.println(l64X256Factory.isDeprecated());
    RandomGenerator l64X256Generator = l64X256Factory.create(123L);
    System.out.println(l64X256Generator.getClass().getName().contains("L64X256MixRandom"));
    System.out.println(l64X256Generator.nextInt());
    System.out.println(l64X256Generator.nextInt(10));
    System.out.println(l64X256Generator.nextLong());
    System.out.println(l64X256Generator.nextDouble());
    System.out.println(l64X256Generator.nextBoolean());
    RandomGenerator l64X256EmptySeed = l64X256Factory.create(new byte[] {});
    System.out.println(l64X256EmptySeed.nextInt());
    System.out.println(l64X256EmptySeed.nextInt(10));
    System.out.println(l64X256EmptySeed.nextLong());
    System.out.println(l64X256EmptySeed.nextDouble());
    RandomGenerator l64X256ByteSeed = l64X256Factory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(l64X256ByteSeed.nextInt());
    System.out.println(l64X256ByteSeed.nextInt(10));
    System.out.println(l64X256ByteSeed.nextLong());
    System.out.println(l64X256ByteSeed.nextDouble());
    System.out.println(l64X256Factory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L64X256MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L64X256MixRandom")));
    System.out.println(l64X256Factory == RandomGeneratorFactory.of("L64X256MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L64X256MixRandom")).findFirst().get() == l64X256Factory);
    RandomGenerator.SplittableGenerator namedL64X256 =
        RandomGenerator.SplittableGenerator.of("L64X256MixRandom");
    System.out.println(namedL64X256.getClass().getName().contains("L64X256MixRandom"));
    System.out.println(namedL64X256.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l64X256SeededSplit =
        (RandomGenerator.SplittableGenerator) l64X256Factory.create(123L);
    RandomGenerator.SplittableGenerator l64X256Child = l64X256SeededSplit.split();
    System.out.println(l64X256SeededSplit.nextLong());
    System.out.println(l64X256Child.nextLong());
    RandomGenerator.SplittableGenerator l64X256Target =
        (RandomGenerator.SplittableGenerator) l64X256Factory.create(123L);
    RandomGenerator.SplittableGenerator l64X256Source =
        (RandomGenerator.SplittableGenerator) l64X256Factory.create(456L);
    RandomGenerator.SplittableGenerator l64X256SourceChild = l64X256Target.split(l64X256Source);
    System.out.println(l64X256SourceChild.nextLong());
    System.out.println(l64X256Target.nextLong());
    System.out.println(l64X256Source.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l64X256Factory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l64X256Factory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l64X256Factory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l64X256ZeroTarget =
        (RandomGenerator.SplittableGenerator) l64X256Factory.create(123L);
    System.out.println(l64X256ZeroTarget.splits(
        0L,
        (RandomGenerator.SplittableGenerator) l64X256Factory.create(456L)
    ).count());
    System.out.println(l64X256ZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> l64X1024Factory =
        RandomGeneratorFactory.of("L64X1024MixRandom");
    System.out.println(l64X1024Factory.name());
    System.out.println(l64X1024Factory.group());
    System.out.println(l64X1024Factory.stateBits());
    System.out.println(l64X1024Factory.equidistribution());
    System.out.println(l64X1024Factory.period());
    System.out.println(l64X1024Factory.isStatistical());
    System.out.println(l64X1024Factory.isStochastic());
    System.out.println(l64X1024Factory.isHardware());
    System.out.println(l64X1024Factory.isArbitrarilyJumpable());
    System.out.println(l64X1024Factory.isSplittable());
    System.out.println(l64X1024Factory.isStreamable());
    System.out.println(l64X1024Factory.isJumpable());
    System.out.println(l64X1024Factory.isLeapable());
    System.out.println(l64X1024Factory.isDeprecated());
    RandomGenerator l64X1024Generator = l64X1024Factory.create(123L);
    System.out.println(l64X1024Generator.getClass().getName().contains("L64X1024MixRandom"));
    System.out.println(l64X1024Generator.nextInt());
    System.out.println(l64X1024Generator.nextInt(10));
    System.out.println(l64X1024Generator.nextLong());
    System.out.println(l64X1024Generator.nextDouble());
    System.out.println(l64X1024Generator.nextBoolean());
    RandomGenerator l64X1024EmptySeed = l64X1024Factory.create(new byte[] {});
    System.out.println(l64X1024EmptySeed.nextInt());
    System.out.println(l64X1024EmptySeed.nextInt(10));
    System.out.println(l64X1024EmptySeed.nextLong());
    System.out.println(l64X1024EmptySeed.nextDouble());
    RandomGenerator l64X1024ByteSeed = l64X1024Factory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(l64X1024ByteSeed.nextInt());
    System.out.println(l64X1024ByteSeed.nextInt(10));
    System.out.println(l64X1024ByteSeed.nextLong());
    System.out.println(l64X1024ByteSeed.nextDouble());
    System.out.println(l64X1024Factory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L64X1024MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L64X1024MixRandom")));
    System.out.println(l64X1024Factory == RandomGeneratorFactory.of("L64X1024MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L64X1024MixRandom")).findFirst().get() == l64X1024Factory);
    RandomGenerator.SplittableGenerator namedL64X1024 =
        RandomGenerator.SplittableGenerator.of("L64X1024MixRandom");
    System.out.println(namedL64X1024.getClass().getName().contains("L64X1024MixRandom"));
    System.out.println(namedL64X1024.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l64X1024SeededSplit =
        (RandomGenerator.SplittableGenerator) l64X1024Factory.create(123L);
    RandomGenerator.SplittableGenerator l64X1024Child = l64X1024SeededSplit.split();
    System.out.println(l64X1024SeededSplit.nextLong());
    System.out.println(l64X1024Child.nextLong());
    RandomGenerator.SplittableGenerator l64X1024Target =
        (RandomGenerator.SplittableGenerator) l64X1024Factory.create(123L);
    RandomGenerator.SplittableGenerator l64X1024Source =
        (RandomGenerator.SplittableGenerator) l64X1024Factory.create(456L);
    RandomGenerator.SplittableGenerator l64X1024SourceChild = l64X1024Target.split(l64X1024Source);
    System.out.println(l64X1024SourceChild.nextLong());
    System.out.println(l64X1024Target.nextLong());
    System.out.println(l64X1024Source.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l64X1024Factory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l64X1024Factory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l64X1024Factory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l64X1024ZeroTarget =
        (RandomGenerator.SplittableGenerator) l64X1024Factory.create(123L);
    System.out.println(l64X1024ZeroTarget.splits(
        0L,
        (RandomGenerator.SplittableGenerator) l64X1024Factory.create(456L)
    ).count());
    System.out.println(l64X1024ZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> l128X128Factory =
        RandomGeneratorFactory.of("L128X128MixRandom");
    System.out.println(l128X128Factory.name());
    System.out.println(l128X128Factory.group());
    System.out.println(l128X128Factory.stateBits());
    System.out.println(l128X128Factory.equidistribution());
    System.out.println(l128X128Factory.period());
    System.out.println(l128X128Factory.isStatistical());
    System.out.println(l128X128Factory.isStochastic());
    System.out.println(l128X128Factory.isHardware());
    System.out.println(l128X128Factory.isArbitrarilyJumpable());
    System.out.println(l128X128Factory.isSplittable());
    System.out.println(l128X128Factory.isStreamable());
    System.out.println(l128X128Factory.isJumpable());
    System.out.println(l128X128Factory.isLeapable());
    System.out.println(l128X128Factory.isDeprecated());
    RandomGenerator l128X128Generator = l128X128Factory.create(123L);
    System.out.println(l128X128Generator.getClass().getName().contains("L128X128MixRandom"));
    System.out.println(l128X128Generator.nextInt());
    System.out.println(l128X128Generator.nextInt(10));
    System.out.println(l128X128Generator.nextLong());
    System.out.println(l128X128Generator.nextDouble());
    System.out.println(l128X128Generator.nextBoolean());
    RandomGenerator l128X128EmptySeed = l128X128Factory.create(new byte[] {});
    System.out.println(l128X128EmptySeed.nextInt());
    System.out.println(l128X128EmptySeed.nextInt(10));
    System.out.println(l128X128EmptySeed.nextLong());
    System.out.println(l128X128EmptySeed.nextDouble());
    RandomGenerator l128X128ByteSeed = l128X128Factory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(l128X128ByteSeed.nextInt());
    System.out.println(l128X128ByteSeed.nextInt(10));
    System.out.println(l128X128ByteSeed.nextLong());
    System.out.println(l128X128ByteSeed.nextDouble());
    System.out.println(l128X128Factory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L128X128MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L128X128MixRandom")));
    System.out.println(l128X128Factory == RandomGeneratorFactory.of("L128X128MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L128X128MixRandom")).findFirst().get() == l128X128Factory);
    RandomGenerator.SplittableGenerator namedL128X128 =
        RandomGenerator.SplittableGenerator.of("L128X128MixRandom");
    System.out.println(namedL128X128.getClass().getName().contains("L128X128MixRandom"));
    System.out.println(namedL128X128.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l128X128SeededSplit =
        (RandomGenerator.SplittableGenerator) l128X128Factory.create(123L);
    RandomGenerator.SplittableGenerator l128X128Child = l128X128SeededSplit.split();
    System.out.println(l128X128SeededSplit.nextLong());
    System.out.println(l128X128Child.nextLong());
    RandomGenerator.SplittableGenerator l128X128Target =
        (RandomGenerator.SplittableGenerator) l128X128Factory.create(123L);
    RandomGenerator.SplittableGenerator l128X128Source =
        (RandomGenerator.SplittableGenerator) l128X128Factory.create(456L);
    RandomGenerator.SplittableGenerator l128X128SourceChild = l128X128Target.split(l128X128Source);
    System.out.println(l128X128SourceChild.nextLong());
    System.out.println(l128X128Target.nextLong());
    System.out.println(l128X128Source.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l128X128Factory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l128X128Factory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l128X128Factory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l128X128ZeroTarget =
        (RandomGenerator.SplittableGenerator) l128X128Factory.create(123L);
    System.out.println(l128X128ZeroTarget.splits(
        0L,
        (RandomGenerator.SplittableGenerator) l128X128Factory.create(456L)
    ).count());
    System.out.println(l128X128ZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> l128X256Factory =
        RandomGeneratorFactory.of("L128X256MixRandom");
    System.out.println(l128X256Factory.name());
    System.out.println(l128X256Factory.group());
    System.out.println(l128X256Factory.stateBits());
    System.out.println(l128X256Factory.equidistribution());
    System.out.println(l128X256Factory.period());
    System.out.println(l128X256Factory.isStatistical());
    System.out.println(l128X256Factory.isStochastic());
    System.out.println(l128X256Factory.isHardware());
    System.out.println(l128X256Factory.isArbitrarilyJumpable());
    System.out.println(l128X256Factory.isSplittable());
    System.out.println(l128X256Factory.isStreamable());
    System.out.println(l128X256Factory.isJumpable());
    System.out.println(l128X256Factory.isLeapable());
    System.out.println(l128X256Factory.isDeprecated());
    RandomGenerator l128X256Generator = l128X256Factory.create(123L);
    System.out.println(l128X256Generator.getClass().getName().contains("L128X256MixRandom"));
    System.out.println(l128X256Generator.nextInt());
    System.out.println(l128X256Generator.nextInt(10));
    System.out.println(l128X256Generator.nextLong());
    System.out.println(l128X256Generator.nextDouble());
    System.out.println(l128X256Generator.nextBoolean());
    System.out.println(l128X256Factory.create(new byte[] {}).nextInt(1) == 0);
    System.out.println(l128X256Factory.create(new byte[] { 1, 2, 3, 4 }).nextInt(1) == 0);
    System.out.println(l128X256Factory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L128X256MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L128X256MixRandom")));
    System.out.println(l128X256Factory == RandomGeneratorFactory.of("L128X256MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L128X256MixRandom")).findFirst().get() == l128X256Factory);
    RandomGenerator.SplittableGenerator namedL128X256 =
        RandomGenerator.SplittableGenerator.of("L128X256MixRandom");
    System.out.println(namedL128X256.getClass().getName().contains("L128X256MixRandom"));
    System.out.println(namedL128X256.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l128X256SeededSplit =
        (RandomGenerator.SplittableGenerator) l128X256Factory.create(123L);
    RandomGenerator.SplittableGenerator l128X256Child = l128X256SeededSplit.split();
    System.out.println(l128X256SeededSplit.nextLong());
    System.out.println(l128X256Child.nextLong());
    RandomGenerator.SplittableGenerator l128X256Target =
        (RandomGenerator.SplittableGenerator) l128X256Factory.create(123L);
    RandomGenerator.SplittableGenerator l128X256Source =
        (RandomGenerator.SplittableGenerator) l128X256Factory.create(456L);
    RandomGenerator.SplittableGenerator l128X256SourceChild = l128X256Target.split(l128X256Source);
    System.out.println(l128X256SourceChild.nextLong());
    System.out.println(l128X256Target.nextLong());
    System.out.println(l128X256Source.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l128X256Factory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l128X256Factory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l128X256Factory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l128X256ZeroTarget =
        (RandomGenerator.SplittableGenerator) l128X256Factory.create(123L);
    System.out.println(l128X256ZeroTarget.splits(
        0L,
        (RandomGenerator.SplittableGenerator) l128X256Factory.create(456L)
    ).count());
    System.out.println(l128X256ZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> l128X1024Factory =
        RandomGeneratorFactory.of("L128X1024MixRandom");
    System.out.println(l128X1024Factory.name());
    System.out.println(l128X1024Factory.group());
    System.out.println(l128X1024Factory.stateBits());
    System.out.println(l128X1024Factory.equidistribution());
    System.out.println(l128X1024Factory.period());
    System.out.println(l128X1024Factory.isStatistical());
    System.out.println(l128X1024Factory.isStochastic());
    System.out.println(l128X1024Factory.isHardware());
    System.out.println(l128X1024Factory.isArbitrarilyJumpable());
    System.out.println(l128X1024Factory.isSplittable());
    System.out.println(l128X1024Factory.isStreamable());
    System.out.println(l128X1024Factory.isJumpable());
    System.out.println(l128X1024Factory.isLeapable());
    System.out.println(l128X1024Factory.isDeprecated());
    RandomGenerator l128X1024Generator = l128X1024Factory.create(123L);
    System.out.println(l128X1024Generator.getClass().getName().contains("L128X1024MixRandom"));
    System.out.println(l128X1024Generator.nextInt());
    System.out.println(l128X1024Generator.nextInt(10));
    System.out.println(l128X1024Generator.nextLong());
    System.out.println(l128X1024Generator.nextDouble());
    System.out.println(l128X1024Generator.nextBoolean());
    RandomGenerator l128X1024EmptySeed = l128X1024Factory.create(new byte[] {});
    System.out.println(l128X1024EmptySeed.nextInt());
    System.out.println(l128X1024EmptySeed.nextInt(10));
    System.out.println(l128X1024EmptySeed.nextLong());
    System.out.println(l128X1024EmptySeed.nextDouble());
    RandomGenerator l128X1024ByteSeed = l128X1024Factory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(l128X1024ByteSeed.nextInt());
    System.out.println(l128X1024ByteSeed.nextInt(10));
    System.out.println(l128X1024ByteSeed.nextLong());
    System.out.println(l128X1024ByteSeed.nextDouble());
    System.out.println(l128X1024Factory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("L128X1024MixRandom").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("L128X1024MixRandom")));
    System.out.println(l128X1024Factory == RandomGeneratorFactory.of("L128X1024MixRandom"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("L128X1024MixRandom")).findFirst().get() == l128X1024Factory);
    RandomGenerator.SplittableGenerator namedL128X1024 =
        RandomGenerator.SplittableGenerator.of("L128X1024MixRandom");
    System.out.println(namedL128X1024.getClass().getName().contains("L128X1024MixRandom"));
    System.out.println(namedL128X1024.nextInt(1) == 0);
    RandomGenerator.SplittableGenerator l128X1024SeededSplit =
        (RandomGenerator.SplittableGenerator) l128X1024Factory.create(123L);
    RandomGenerator.SplittableGenerator l128X1024Child = l128X1024SeededSplit.split();
    System.out.println(l128X1024SeededSplit.nextLong());
    System.out.println(l128X1024Child.nextLong());
    RandomGenerator.SplittableGenerator l128X1024Target =
        (RandomGenerator.SplittableGenerator) l128X1024Factory.create(123L);
    RandomGenerator.SplittableGenerator l128X1024Source =
        (RandomGenerator.SplittableGenerator) l128X1024Factory.create(456L);
    RandomGenerator.SplittableGenerator l128X1024SourceChild = l128X1024Target.split(l128X1024Source);
    System.out.println(l128X1024SourceChild.nextLong());
    System.out.println(l128X1024Target.nextLong());
    System.out.println(l128X1024Source.nextLong());
    System.out.println(((RandomGenerator.SplittableGenerator) l128X1024Factory.create(123L))
        .splits(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.SplittableGenerator) l128X1024Factory.create(123L))
        .splits(2, (RandomGenerator.SplittableGenerator) l128X1024Factory.create(456L))
        .mapToLong(g -> g.nextLong())
        .sum());
    RandomGenerator.SplittableGenerator l128X1024ZeroTarget =
        (RandomGenerator.SplittableGenerator) l128X1024Factory.create(123L);
    System.out.println(l128X1024ZeroTarget.splits(
        0L,
        (RandomGenerator.SplittableGenerator) l128X1024Factory.create(456L)
    ).count());
    System.out.println(l128X1024ZeroTarget.nextLong());

    RandomGeneratorFactory<RandomGenerator> xoroshiroFactory =
        RandomGeneratorFactory.of("Xoroshiro128PlusPlus");
    System.out.println(xoroshiroFactory.name());
    System.out.println(xoroshiroFactory.group());
    System.out.println(xoroshiroFactory.stateBits());
    System.out.println(xoroshiroFactory.equidistribution());
    System.out.println(xoroshiroFactory.period());
    System.out.println(xoroshiroFactory.isStatistical());
    System.out.println(xoroshiroFactory.isStochastic());
    System.out.println(xoroshiroFactory.isHardware());
    System.out.println(xoroshiroFactory.isArbitrarilyJumpable());
    System.out.println(xoroshiroFactory.isJumpable());
    System.out.println(xoroshiroFactory.isLeapable());
    System.out.println(xoroshiroFactory.isSplittable());
    System.out.println(xoroshiroFactory.isStreamable());
    System.out.println(xoroshiroFactory.isDeprecated());
    RandomGenerator xoroshiroGenerator = xoroshiroFactory.create(123L);
    System.out.println(xoroshiroGenerator.getClass().getName().contains("Xoroshiro128PlusPlus"));
    System.out.println(xoroshiroGenerator.nextInt());
    System.out.println(xoroshiroGenerator.nextInt(10));
    System.out.println(xoroshiroGenerator.nextLong());
    System.out.println(xoroshiroGenerator.nextDouble());
    System.out.println(xoroshiroGenerator.nextBoolean());
    RandomGenerator xoroshiroEmptySeed = xoroshiroFactory.create(new byte[] {});
    System.out.println(xoroshiroEmptySeed.nextInt());
    System.out.println(xoroshiroEmptySeed.nextInt(10));
    System.out.println(xoroshiroEmptySeed.nextLong());
    System.out.println(xoroshiroEmptySeed.nextDouble());
    RandomGenerator xoroshiroByteSeed = xoroshiroFactory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(xoroshiroByteSeed.nextInt());
    System.out.println(xoroshiroByteSeed.nextInt(10));
    System.out.println(xoroshiroByteSeed.nextLong());
    System.out.println(xoroshiroByteSeed.nextDouble());
    System.out.println(xoroshiroFactory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("Xoroshiro128PlusPlus").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("Xoroshiro128PlusPlus")));
    System.out.println(xoroshiroFactory == RandomGeneratorFactory.of("Xoroshiro128PlusPlus"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("Xoroshiro128PlusPlus")).findFirst().get() == xoroshiroFactory);
    RandomGenerator.LeapableGenerator xoroshiroLeap =
        (RandomGenerator.LeapableGenerator) xoroshiroFactory.create(123L);
    RandomGenerator.LeapableGenerator xoroshiroCopy = xoroshiroLeap.copy();
    xoroshiroLeap.jump();
    System.out.println(xoroshiroCopy.nextLong());
    System.out.println(xoroshiroLeap.nextLong());
    System.out.println(xoroshiroLeap.jumpDistance());
    xoroshiroLeap.leap();
    System.out.println(xoroshiroLeap.nextLong());
    System.out.println(xoroshiroLeap.leapDistance());
    System.out.println(((RandomGenerator.LeapableGenerator) xoroshiroFactory.create(123L))
        .leaps(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.JumpableGenerator) xoroshiroFactory.create(123L))
        .jumps(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    try {
      RandomGenerator.SplittableGenerator.of("Xoroshiro128PlusPlus");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(RandomGenerator.JumpableGenerator.of("Xoroshiro128PlusPlus").nextInt(1) == 0);
    System.out.println(RandomGenerator.LeapableGenerator.of("Xoroshiro128PlusPlus").nextInt(1) == 0);

    RandomGeneratorFactory<RandomGenerator> xoshiroFactory =
        RandomGeneratorFactory.of("Xoshiro256PlusPlus");
    System.out.println(xoshiroFactory.name());
    System.out.println(xoshiroFactory.group());
    System.out.println(xoshiroFactory.stateBits());
    System.out.println(xoshiroFactory.equidistribution());
    System.out.println(xoshiroFactory.period());
    System.out.println(xoshiroFactory.isStatistical());
    System.out.println(xoshiroFactory.isStochastic());
    System.out.println(xoshiroFactory.isHardware());
    System.out.println(xoshiroFactory.isArbitrarilyJumpable());
    System.out.println(xoshiroFactory.isJumpable());
    System.out.println(xoshiroFactory.isLeapable());
    System.out.println(xoshiroFactory.isSplittable());
    System.out.println(xoshiroFactory.isStreamable());
    System.out.println(xoshiroFactory.isDeprecated());
    RandomGenerator xoshiroGenerator = xoshiroFactory.create(123L);
    System.out.println(xoshiroGenerator.getClass().getName().contains("Xoshiro256PlusPlus"));
    System.out.println(xoshiroGenerator.nextInt());
    System.out.println(xoshiroGenerator.nextInt(10));
    System.out.println(xoshiroGenerator.nextLong());
    System.out.println(xoshiroGenerator.nextDouble());
    System.out.println(xoshiroGenerator.nextBoolean());
    RandomGenerator xoshiroEmptySeed = xoshiroFactory.create(new byte[] {});
    System.out.println(xoshiroEmptySeed.nextInt());
    System.out.println(xoshiroEmptySeed.nextInt(10));
    System.out.println(xoshiroEmptySeed.nextLong());
    System.out.println(xoshiroEmptySeed.nextDouble());
    RandomGenerator xoshiroByteSeed = xoshiroFactory.create(new byte[] { 1, 2, 3, 4 });
    System.out.println(xoshiroByteSeed.nextInt());
    System.out.println(xoshiroByteSeed.nextInt(10));
    System.out.println(xoshiroByteSeed.nextLong());
    System.out.println(xoshiroByteSeed.nextDouble());
    System.out.println(xoshiroFactory.create().nextInt(1) == 0);
    System.out.println(RandomGenerator.of("Xoshiro256PlusPlus").nextInt(1) == 0);
    System.out.println(RandomGeneratorFactory.all().anyMatch(f -> f.name().equals("Xoshiro256PlusPlus")));
    System.out.println(xoshiroFactory == RandomGeneratorFactory.of("Xoshiro256PlusPlus"));
    System.out.println(RandomGeneratorFactory.all().filter(f -> f.name().equals("Xoshiro256PlusPlus")).findFirst().get() == xoshiroFactory);
    RandomGenerator.LeapableGenerator xoshiroLeap =
        (RandomGenerator.LeapableGenerator) xoshiroFactory.create(123L);
    RandomGenerator.LeapableGenerator xoshiroCopy = xoshiroLeap.copy();
    xoshiroLeap.jump();
    System.out.println(xoshiroCopy.nextLong());
    System.out.println(xoshiroLeap.nextLong());
    System.out.println(xoshiroLeap.jumpDistance());
    xoshiroLeap.leap();
    System.out.println(xoshiroLeap.nextLong());
    System.out.println(xoshiroLeap.leapDistance());
    System.out.println(((RandomGenerator.LeapableGenerator) xoshiroFactory.create(123L))
        .leaps(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    System.out.println(((RandomGenerator.JumpableGenerator) xoshiroFactory.create(123L))
        .jumps(2)
        .mapToLong(g -> g.nextLong())
        .sum());
    try {
      RandomGenerator.SplittableGenerator.of("Xoshiro256PlusPlus");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(RandomGenerator.JumpableGenerator.of("Xoshiro256PlusPlus").nextInt(1) == 0);
    System.out.println(RandomGenerator.LeapableGenerator.of("Xoshiro256PlusPlus").nextInt(1) == 0);

    System.out.println(RandomGenerator.StreamableGenerator.class.getName());
    System.out.println(RandomGenerator.StreamableGenerator.class.isAssignableFrom(RandomGenerator.SplittableGenerator.class));
    System.out.println(RandomGenerator.JumpableGenerator.class.isAssignableFrom(RandomGenerator.LeapableGenerator.class));
    System.out.println(RandomGenerator.LeapableGenerator.class.isAssignableFrom(RandomGenerator.ArbitrarilyJumpableGenerator.class));
    try {
      RandomGenerator.StreamableGenerator.of("Random");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      RandomGenerator.JumpableGenerator.of("NoSuchGenerator");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    StreamableSequence streamable = new StreamableSequence(1L);
    printSized("streamable-rngs-custom", streamable.rngs(2L).spliterator());
    try {
      streamable.rngs(-1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    JumpSequence jumpSequence = new JumpSequence(5L);
    RandomGenerator jumpCopy = jumpSequence.copyAndJump();
    System.out.println(jumpCopy.nextLong());
    System.out.println(jumpSequence.nextLong());
    System.out.println(jumpSequence.jumps);
    System.out.println(jumpCopy instanceof JumpSequence);
    System.out.println(jumpSequence.jumps().limit(2).mapToLong(g -> g.nextLong()).sum());
    System.out.println(jumpSequence.nextLong());
    System.out.println(jumpSequence.jumps);
    printSized("jump-jumps-custom", jumpSequence.jumps(2L).spliterator());
    printSized("jump-rngs-custom", jumpSequence.rngs(2L).spliterator());
    try {
      jumpSequence.jumps(-1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      jumpSequence.rngs(-1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    LeapSequence leapSequence = new LeapSequence(7L);
    RandomGenerator.JumpableGenerator leapCopy = leapSequence.copyAndLeap();
    System.out.println(leapCopy.nextLong());
    System.out.println(leapSequence.nextLong());
    System.out.println(leapSequence.leaps);
    System.out.println(leapCopy instanceof LeapSequence);
    System.out.println(leapSequence.leaps().limit(2).mapToLong(g -> g.nextLong()).sum());
    System.out.println(leapSequence.nextLong());
    System.out.println(leapSequence.leaps);
    printSized("leap-leaps-custom", leapSequence.leaps(2L).spliterator());
    try {
      leapSequence.leaps(-1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    ArbitrarySequence arbitrarySequence = new ArbitrarySequence(3L);
    arbitrarySequence.jumpPowerOfTwo(4);
    arbitrarySequence.jump();
    arbitrarySequence.leap();
    RandomGenerator.ArbitrarilyJumpableGenerator arbitraryCopy = arbitrarySequence.copyAndJump(2.5d);
    System.out.println(arbitrarySequence.nextLong());
    System.out.println(arbitrarySequence.distanceSum);
    System.out.println(arbitraryCopy.nextLong());
    System.out.println(arbitraryCopy instanceof ArbitrarySequence);
    System.out.println(arbitrarySequence.powers);
    System.out.println(arbitrarySequence.jumps(2.5d).limit(2).mapToLong(g -> g.nextLong()).sum());
    System.out.println(arbitrarySequence.nextLong());
    System.out.println(arbitrarySequence.distanceSum);
    printSized("arbitrary-jumps-custom", arbitrarySequence.jumps(2L, 1.5d).spliterator());
    try {
      arbitrarySequence.jumps(-1L, 1.0d);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    ArbitrarySequence distanceSequence = new ArbitrarySequence(11L);
    ArbitrarySequence nanDistanceCopy =
        (ArbitrarySequence) distanceSequence.copyAndJump(Double.NaN);
    System.out.println(distanceSequence.nextLong());
    System.out.println(Double.isNaN(distanceSequence.distanceSum));
    System.out.println(distanceSequence.distanceCalls);
    System.out.println(nanDistanceCopy.nextLong());
    System.out.println(Double.isNaN(nanDistanceCopy.distanceSum));
    System.out.println(nanDistanceCopy.distanceCalls);
    ArbitrarySequence infinityDistanceCopy =
        (ArbitrarySequence) distanceSequence.copyAndJump(Double.POSITIVE_INFINITY);
    System.out.println(distanceSequence.nextLong() < 0L);
    System.out.println(Double.isNaN(distanceSequence.distanceSum));
    System.out.println(distanceSequence.distanceCalls);
    System.out.println(infinityDistanceCopy.nextLong());
    System.out.println(Double.isNaN(infinityDistanceCopy.distanceSum));
    System.out.println(infinityDistanceCopy.distanceCalls);
    ArbitrarySequence zeroDistanceSequence = new ArbitrarySequence(13L);
    System.out.println(zeroDistanceSequence.jumps(0L, Double.NaN).count());
    System.out.println(zeroDistanceSequence.nextLong());
    System.out.println(zeroDistanceSequence.distanceCalls);
    try {
      zeroDistanceSequence.jumps(-1L, Double.NaN);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(zeroDistanceSequence.nextLong());
    System.out.println(zeroDistanceSequence.distanceCalls);

    System.out.println(new SequenceGenerator(0x8000000000000000L).nextBoolean());
    System.out.println(new SequenceGenerator(0x12345678abcdef01L).nextInt());
    System.out.println(new SequenceGenerator(0x7fffffff00000000L).nextInt(10));
    System.out.println(new SequenceGenerator(0x4000000000000000L).nextFloat());
    System.out.println(new SequenceGenerator(0x000000000000000fL).nextLong(16L));
    System.out.println(new SequenceGenerator(0x000000000000000fL).nextLong(5L, 21L));
    System.out.println(new SequenceGenerator(0x4000000000000000L).nextDouble());
    System.out.println(new SequenceGenerator(0x4000000000000000L).nextDouble(2.0d));
    System.out.println(new SequenceGenerator(0x4000000000000000L).nextDouble(2.0d, 4.0d));
    byte[] defaultBytes = new byte[10];
    new SequenceGenerator(0x0102030405060708L, 0x1112131415161718L).nextBytes(defaultBytes);
    System.out.println(Arrays.toString(defaultBytes));

    RandomGenerator wideIntGenerator = factory.create(321L);
    try {
      int wideInt = wideIntGenerator.nextInt(Integer.MIN_VALUE, Integer.MAX_VALUE);
      System.out.println(wideInt >= Integer.MIN_VALUE && wideInt < Integer.MAX_VALUE);
      System.out.println(wideInt);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      long wideLong = factory.create(321L).nextLong(Long.MIN_VALUE, Long.MAX_VALUE);
      System.out.println(wideLong >= Long.MIN_VALUE && wideLong < Long.MAX_VALUE);
      System.out.println(wideLong);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      System.out.println(factory.create(321L).ints(2, Integer.MIN_VALUE, Integer.MAX_VALUE).count());
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      System.out.println(factory.create(321L).longs(2, Long.MIN_VALUE, Long.MAX_VALUE).count());
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.ints(10, 5);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.ints(0L, 10, 5);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.longs(10L, 5L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.longs(0L, 10L, 5L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.doubles(10.0d, 5.0d);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.doubles(0L, 10.0d, 5.0d);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.doubles(0L, -Double.MAX_VALUE, Double.MAX_VALUE);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextDouble(Double.POSITIVE_INFINITY);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextDouble(-Double.MAX_VALUE, Double.MAX_VALUE);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.doubles(1L, -Double.MAX_VALUE, Double.MAX_VALUE).findFirst();
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextFloat(Float.POSITIVE_INFINITY);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextFloat(-Float.MAX_VALUE, Float.MAX_VALUE);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      RandomGeneratorFactory.of("NoSuchGenerator");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      RandomGeneratorFactory.of(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      factory.create((byte[]) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextBytes(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextInt(0);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextInt(10, 5);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextLong(0L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextLong(10L, 5L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextDouble(0.0d);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextDouble(Double.NaN);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextDouble(10.0d, 5.0d);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextDouble(0.0d, Double.NaN);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextFloat(0.0f);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextFloat(Float.NaN);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextFloat(10.0f, 5.0f);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextFloat(0.0f, Float.NaN);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      generator.nextGaussian(0.0d, -1.0d);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(Double.isNaN(factory.create(456L).nextGaussian(0.0d, Double.NaN)));
    System.out.println(Double.isInfinite(factory.create(456L).nextGaussian(0.0d, Double.POSITIVE_INFINITY)));
    try {
      generator.ints(-1L).count();
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
  }

  private static void printSized(String label, Spliterator.OfInt spliterator) {
    System.out.println(label + ":" + spliterator.estimateSize());
    System.out.println(spliterator.getExactSizeIfKnown());
    System.out.println(spliterator.characteristics());
  }

  private static void printSized(String label, Spliterator.OfLong spliterator) {
    System.out.println(label + ":" + spliterator.estimateSize());
    System.out.println(spliterator.getExactSizeIfKnown());
    System.out.println(spliterator.characteristics());
  }

  private static void printSized(String label, Spliterator.OfDouble spliterator) {
    System.out.println(label + ":" + spliterator.estimateSize());
    System.out.println(spliterator.getExactSizeIfKnown());
    System.out.println(spliterator.characteristics());
  }

  private static void printSized(String label, Spliterator<?> spliterator) {
    System.out.println(label + ":" + spliterator.estimateSize());
    System.out.println(spliterator.getExactSizeIfKnown());
    System.out.println(spliterator.characteristics());
  }
}
