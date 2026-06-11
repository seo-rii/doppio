package java.util.random;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Random;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.Supplier;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public final class RandomGeneratorFactory<T extends RandomGenerator> {
  private static RandomGeneratorFactory<RandomGenerator> randomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "Random", "Legacy", 48, 0, BigInteger.ONE.shiftLeft(48),
      true, false, false, false, false, false, false, false
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> splittableRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "SplittableRandom", "Legacy", 64, 1, BigInteger.ONE.shiftLeft(64),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> secureRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "SecureRandom", "Legacy", Integer.MAX_VALUE, Integer.MAX_VALUE, BigInteger.ZERO,
      false, true, false, false, false, false, false, false
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l32X64MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L32X64MixRandom", "LXM", 96, 1,
      BigInteger.ONE.shiftLeft(64).subtract(BigInteger.ONE).shiftLeft(32),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l64X128MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L64X128MixRandom", "LXM", 192, 2,
      BigInteger.ONE.shiftLeft(128).subtract(BigInteger.ONE).shiftLeft(64),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l64X128StarStarRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L64X128StarStarRandom", "LXM", 192, 2,
      BigInteger.ONE.shiftLeft(128).subtract(BigInteger.ONE).shiftLeft(64),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l64X256MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L64X256MixRandom", "LXM", 320, 4,
      BigInteger.ONE.shiftLeft(256).subtract(BigInteger.ONE).shiftLeft(64),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l64X1024MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L64X1024MixRandom", "LXM", 1088, 16,
      BigInteger.ONE.shiftLeft(1024).subtract(BigInteger.ONE).shiftLeft(64),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l128X128MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L128X128MixRandom", "LXM", 256, 1,
      BigInteger.ONE.shiftLeft(128).subtract(BigInteger.ONE).shiftLeft(128),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l128X256MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L128X256MixRandom", "LXM", 384, 1,
      BigInteger.ONE.shiftLeft(256).subtract(BigInteger.ONE).shiftLeft(128),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> l128X1024MixRandomFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "L128X1024MixRandom", "LXM", 1152, 1,
      BigInteger.ONE.shiftLeft(1024).subtract(BigInteger.ONE).shiftLeft(128),
      true, false, false, false, false, false, true, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> xoroshiro128PlusPlusFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "Xoroshiro128PlusPlus", "Xoroshiro", 128, 1,
      BigInteger.ONE.shiftLeft(128).subtract(BigInteger.ONE),
      true, false, false, false, true, true, false, true
    );
  }

  private static RandomGeneratorFactory<RandomGenerator> xoshiro256PlusPlusFactory() {
    return new RandomGeneratorFactory<RandomGenerator>(
      "Xoshiro256PlusPlus", "Xoshiro", 256, 3,
      BigInteger.ONE.shiftLeft(256).subtract(BigInteger.ONE),
      true, false, false, false, true, true, false, true
    );
  }

  private final String name;
  private final String group;
  private final int stateBits;
  private final int equidistribution;
  private final BigInteger period;
  private final boolean statistical;
  private final boolean stochastic;
  private final boolean hardware;
  private final boolean arbitrarilyJumpable;
  private final boolean jumpable;
  private final boolean leapable;
  private final boolean splittable;
  private final boolean streamable;

  private RandomGeneratorFactory(
      String name,
      String group,
      int stateBits,
      int equidistribution,
      BigInteger period,
      boolean statistical,
      boolean stochastic,
      boolean hardware,
      boolean arbitrarilyJumpable,
      boolean jumpable,
      boolean leapable,
      boolean splittable,
      boolean streamable) {
    this.name = name;
    this.group = group;
    this.stateBits = stateBits;
    this.equidistribution = equidistribution;
    this.period = period;
    this.statistical = statistical;
    this.stochastic = stochastic;
    this.hardware = hardware;
    this.arbitrarilyJumpable = arbitrarilyJumpable;
    this.jumpable = jumpable;
    this.leapable = leapable;
    this.splittable = splittable;
    this.streamable = streamable;
  }

  public static <T extends RandomGenerator> RandomGeneratorFactory<T> of(String name) {
    Objects.requireNonNull(name);
    if ("Random".equals(name)) {
      return (RandomGeneratorFactory<T>) randomFactory();
    }
    if ("SplittableRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) splittableRandomFactory();
    }
    if ("SecureRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) secureRandomFactory();
    }
    if ("L32X64MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l32X64MixRandomFactory();
    }
    if ("L64X128MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l64X128MixRandomFactory();
    }
    if ("L64X128StarStarRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l64X128StarStarRandomFactory();
    }
    if ("L64X256MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l64X256MixRandomFactory();
    }
    if ("L64X1024MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l64X1024MixRandomFactory();
    }
    if ("L128X128MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l128X128MixRandomFactory();
    }
    if ("L128X256MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l128X256MixRandomFactory();
    }
    if ("L128X1024MixRandom".equals(name)) {
      return (RandomGeneratorFactory<T>) l128X1024MixRandomFactory();
    }
    if ("Xoroshiro128PlusPlus".equals(name)) {
      return (RandomGeneratorFactory<T>) xoroshiro128PlusPlusFactory();
    }
    if ("Xoshiro256PlusPlus".equals(name)) {
      return (RandomGeneratorFactory<T>) xoshiro256PlusPlusFactory();
    }
    throw new IllegalArgumentException();
  }

  public static RandomGeneratorFactory<RandomGenerator> getDefault() {
    return l32X64MixRandomFactory();
  }

  public static Stream<RandomGeneratorFactory<RandomGenerator>> all() {
    return Stream.of(
      randomFactory(),
      secureRandomFactory(),
      splittableRandomFactory(),
      l32X64MixRandomFactory(),
      l64X128MixRandomFactory(),
      l64X128StarStarRandomFactory(),
      l64X256MixRandomFactory(),
      l64X1024MixRandomFactory(),
      l128X128MixRandomFactory(),
      l128X256MixRandomFactory(),
      l128X1024MixRandomFactory(),
      xoroshiro128PlusPlusFactory(),
      xoshiro256PlusPlusFactory()
    );
  }

  public String name() {
    return name;
  }

  public String group() {
    return group;
  }

  public int stateBits() {
    return stateBits;
  }

  public int equidistribution() {
    return equidistribution;
  }

  public BigInteger period() {
    return period;
  }

  public boolean isStatistical() {
    return statistical;
  }

  public boolean isStochastic() {
    return stochastic;
  }

  public boolean isHardware() {
    return hardware;
  }

  public boolean isArbitrarilyJumpable() {
    return arbitrarilyJumpable;
  }

  public boolean isJumpable() {
    return jumpable;
  }

  public boolean isLeapable() {
    return leapable;
  }

  public boolean isSplittable() {
    return splittable;
  }

  public boolean isStreamable() {
    return streamable;
  }

  public boolean isDeprecated() {
    return false;
  }

  public T create() {
    if ("SecureRandom".equals(name)) {
      return (T) new SecureRandomAdapter(new SecureRandom());
    }
    if ("SplittableRandom".equals(name)) {
      return (T) new SplittableRandomAdapter(new Random().nextLong());
    }
    if ("L32X64MixRandom".equals(name)) {
      return (T) new L32X64MixRandomAdapter(new Random().nextLong());
    }
    if ("L64X128MixRandom".equals(name)) {
      return (T) new L64X128MixRandomAdapter(new Random().nextLong());
    }
    if ("L64X128StarStarRandom".equals(name)) {
      return (T) new L64X128StarStarRandomAdapter(new Random().nextLong());
    }
    if ("L64X256MixRandom".equals(name)) {
      return (T) new L64X256MixRandomAdapter(new Random().nextLong());
    }
    if ("L64X1024MixRandom".equals(name)) {
      return (T) new L64X1024MixRandomAdapter(new Random().nextLong());
    }
    if ("L128X128MixRandom".equals(name)) {
      return (T) new L128X128MixRandomAdapter(new Random().nextLong());
    }
    if ("L128X256MixRandom".equals(name)) {
      return (T) new L128X256MixRandomAdapter(new Random().nextLong());
    }
    if ("L128X1024MixRandom".equals(name)) {
      return (T) new L128X1024MixRandomAdapter(new Random().nextLong());
    }
    if ("Xoroshiro128PlusPlus".equals(name)) {
      return (T) new Xoroshiro128PlusPlusAdapter(new Random().nextLong());
    }
    if ("Xoshiro256PlusPlus".equals(name)) {
      return (T) new Xoshiro256PlusPlusAdapter(new Random().nextLong());
    }
    return (T) new RandomAdapter(new Random());
  }

  public T create(long seed) {
    if ("SecureRandom".equals(name)) {
      return (T) new SecureRandomAdapter(new SecureRandom());
    }
    if ("SplittableRandom".equals(name)) {
      return (T) new SplittableRandomAdapter(seed);
    }
    if ("L32X64MixRandom".equals(name)) {
      return (T) new L32X64MixRandomAdapter(seed);
    }
    if ("L64X128MixRandom".equals(name)) {
      return (T) new L64X128MixRandomAdapter(seed);
    }
    if ("L64X128StarStarRandom".equals(name)) {
      return (T) new L64X128StarStarRandomAdapter(seed);
    }
    if ("L64X256MixRandom".equals(name)) {
      return (T) new L64X256MixRandomAdapter(seed);
    }
    if ("L64X1024MixRandom".equals(name)) {
      return (T) new L64X1024MixRandomAdapter(seed);
    }
    if ("L128X128MixRandom".equals(name)) {
      return (T) new L128X128MixRandomAdapter(seed);
    }
    if ("L128X256MixRandom".equals(name)) {
      return (T) new L128X256MixRandomAdapter(seed);
    }
    if ("L128X1024MixRandom".equals(name)) {
      return (T) new L128X1024MixRandomAdapter(seed);
    }
    if ("Xoroshiro128PlusPlus".equals(name)) {
      return (T) new Xoroshiro128PlusPlusAdapter(seed);
    }
    if ("Xoshiro256PlusPlus".equals(name)) {
      return (T) new Xoshiro256PlusPlusAdapter(seed);
    }
    return (T) new RandomAdapter(new Random(seed));
  }

  public T create(byte[] seed) {
    Objects.requireNonNull(seed);
    if ("SecureRandom".equals(name)) {
      return (T) new SecureRandomAdapter(new SecureRandom());
    }
    if ("L32X64MixRandom".equals(name)) {
      return (T) new L32X64MixRandomAdapter(seed);
    }
    if ("L64X128MixRandom".equals(name)) {
      return (T) new L64X128MixRandomAdapter(seed);
    }
    if ("L64X128StarStarRandom".equals(name)) {
      return (T) new L64X128StarStarRandomAdapter(seed);
    }
    if ("L64X256MixRandom".equals(name)) {
      return (T) new L64X256MixRandomAdapter(seed);
    }
    if ("L64X1024MixRandom".equals(name)) {
      return (T) new L64X1024MixRandomAdapter(seed);
    }
    if ("L128X128MixRandom".equals(name)) {
      return (T) new L128X128MixRandomAdapter(seed);
    }
    if ("L128X256MixRandom".equals(name)) {
      return create();
    }
    if ("L128X1024MixRandom".equals(name)) {
      return (T) new L128X1024MixRandomAdapter(seed);
    }
    if ("Xoroshiro128PlusPlus".equals(name)) {
      return (T) new Xoroshiro128PlusPlusAdapter(seed);
    }
    if ("Xoshiro256PlusPlus".equals(name)) {
      return (T) new Xoshiro256PlusPlusAdapter(seed);
    }
    return create();
  }

  private static final class RandomAdapter implements RandomGenerator {
    private final Random random;

    private RandomAdapter(Random random) {
      this.random = random;
    }

    public boolean nextBoolean() {
      return random.nextBoolean();
    }

    public void nextBytes(byte[] bytes) {
      random.nextBytes(bytes);
    }

    public float nextFloat() {
      return random.nextFloat();
    }

    public double nextDouble() {
      return random.nextDouble();
    }

    public int nextInt() {
      return random.nextInt();
    }

    public int nextInt(int bound) {
      return random.nextInt(bound);
    }

    public int nextInt(int origin, int bound) {
      if (origin >= bound) {
        throw new IllegalArgumentException();
      }
      int value = nextInt();
      int range = bound - origin;
      int mask = range - 1;
      if ((range & mask) == 0) {
        return (value & mask) + origin;
      }
      if (range > 0) {
        int candidate = value >>> 1;
        value = candidate % range;
        while (candidate + mask - value < 0) {
          candidate = nextInt() >>> 1;
          value = candidate % range;
        }
        return value + origin;
      }
      while (value < origin || value >= bound) {
        value = nextInt();
      }
      return value;
    }

    public long nextLong() {
      return random.nextLong();
    }

    public double nextGaussian() {
      return random.nextGaussian();
    }
  }

  private static final class SecureRandomAdapter implements RandomGenerator {
    private final SecureRandom random;

    private SecureRandomAdapter(SecureRandom random) {
      this.random = random;
    }

    public boolean nextBoolean() {
      return random.nextBoolean();
    }

    public void nextBytes(byte[] bytes) {
      random.nextBytes(bytes);
    }

    public float nextFloat() {
      return random.nextFloat();
    }

    public double nextDouble() {
      return random.nextDouble();
    }

    public int nextInt() {
      return random.nextInt();
    }

    public int nextInt(int bound) {
      return random.nextInt(bound);
    }

    public long nextLong() {
      return random.nextLong();
    }

    public double nextGaussian() {
      return random.nextGaussian();
    }
  }

  private static final class SplittableRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final long GOLDEN_GAMMA = -7046029254386353131L;
    private long seed;
    private final long gamma;

    private SplittableRandomAdapter(long seed) {
      this(seed, GOLDEN_GAMMA);
    }

    private SplittableRandomAdapter(long seed, long gamma) {
      this.seed = seed;
      this.gamma = gamma;
    }

    public int nextInt() {
      return mix32(nextSeed());
    }

    public long nextLong() {
      return mix64(nextSeed());
    }

    public RandomGenerator.SplittableGenerator split() {
      return new SplittableRandomAdapter(nextLong(), mixGamma(nextSeed()));
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      return new SplittableRandomAdapter(source.nextLong(), mixGamma(source.nextLong()));
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      checkStreamSize(streamSize);
      Objects.requireNonNull(source);
      final SplittableRandomAdapter self = this;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long remaining = streamSize;

        public boolean hasNext() {
          return remaining > 0L;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          remaining--;
          return self.split(source);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    public Stream<RandomGenerator> rngs(long streamSize) {
      checkStreamSize(streamSize);
      final SplittableRandomAdapter self = this;
      Iterator<RandomGenerator> iterator = new Iterator<RandomGenerator>() {
        private long remaining = streamSize;

        public boolean hasNext() {
          return remaining > 0L;
        }

        public RandomGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          remaining--;
          return self.split();
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED), false);
    }

    public Stream<RandomGenerator> rngs() {
      final SplittableRandomAdapter self = this;
      return Stream.generate(new Supplier<RandomGenerator>() {
        public RandomGenerator.SplittableGenerator get() {
          return self.split();
        }
      });
    }

    private long nextSeed() {
      seed += gamma;
      return seed;
    }

    private static int mix32(long value) {
      value = (value ^ (value >>> 33)) * 7109453100751455733L;
      value = (value ^ (value >>> 28)) * -3808689974395783757L;
      return (int) (value >>> 32);
    }

    private static long mix64(long value) {
      value = (value ^ (value >>> 30)) * -4658895280553007687L;
      value = (value ^ (value >>> 27)) * -7723592293110705685L;
      return value ^ (value >>> 31);
    }

    private static long mixGamma(long value) {
      value = (value ^ (value >>> 33)) * -49064778989728563L;
      value = (value ^ (value >>> 33)) * -4265267296055464877L;
      value = (value ^ (value >>> 33)) | 1L;
      int transitions = Long.bitCount(value ^ (value >>> 1));
      return transitions < 24 ? value ^ -6148914691236517206L : value;
    }

    private static long checkStreamSize(long streamSize) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      return streamSize;
    }
  }

  private static final class L32X64MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final int MULTIPLIER = 0xadb4a92d;
    private static final int GOLDEN_RATIO_32 = 0x9e3779b9;
    private static final int SILVER_RATIO_32 = 0x6a09e667;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final int a;
    private int s;
    private int x0;
    private int x1;

    private L32X64MixRandomAdapter(long seed) {
      this(
        mixMurmur32((int) ((seed ^= SILVER_RATIO_64) >>> 32)),
        1,
        mixLea32((int) seed),
        mixLea32(((int) seed) + GOLDEN_RATIO_32)
      );
    }

    private L32X64MixRandomAdapter(byte[] seed) {
      int[] data = new int[4];
      int byteCount = Math.min(seed.length, data.length << 2);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 2] = (data[i >> 2] << 8) | (seed[i] & 0xff);
      }
      int value = data[0];
      for (int i = (byteCount + 3) >> 2; i < data.length; i++) {
        data[i] = mixMurmur32(value += SILVER_RATIO_32);
      }
      if ((data[2] | data[3]) == 0) {
        int nonzeroValue = data[0] & ~1;
        for (int i = 2; i < data.length; i++) {
          data[i] = mixMurmur32(nonzeroValue += SILVER_RATIO_32);
        }
      }
      this.a = data[0] | 1;
      this.s = data[1];
      this.x0 = data[2];
      this.x1 = data[3];
    }

    private L32X64MixRandomAdapter(int a, int s, int x0, int x1) {
      this.a = a | 1;
      this.s = s;
      this.x0 = x0;
      this.x1 = x1;
      if ((x0 | x1) == 0) {
        int value = s;
        this.x0 = mixMurmur32(value += GOLDEN_RATIO_32);
        this.x1 = mixMurmur32(value + GOLDEN_RATIO_32);
      }
    }

    public int nextInt() {
      int result = mixLea32(s + x0);
      s = MULTIPLIER * s + a;
      int q0 = x0;
      int q1 = x1 ^ q0;
      x0 = Integer.rotateLeft(q0, 26) ^ q1 ^ (q1 << 9);
      x1 = Integer.rotateLeft(q1, 13);
      return result;
    }

    public long nextLong() {
      return ((long) nextInt() << 32) ^ (long) nextInt();
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      return new L32X64MixRandomAdapter(
        (int) brine << 1,
        source.nextInt(),
        source.nextInt(),
        source.nextInt()
      );
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      checkStreamSize(streamSize);
      Objects.requireNonNull(source);
      final L32X64MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static int mixMurmur32(int value) {
      value = (value ^ (value >>> 16)) * 0x85ebca6b;
      value = (value ^ (value >>> 13)) * 0xc2b2ae35;
      return value ^ (value >>> 16);
    }

    private static int mixLea32(int value) {
      value = (value ^ (value >>> 16)) * 0xd36d884b;
      value = (value ^ (value >>> 16)) * 0xd36d884b;
      return value ^ (value >>> 16);
    }

    private static long checkStreamSize(long streamSize) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      return streamSize;
    }
  }

  private static final class L64X128MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final long MULTIPLIER = 0xd1342543de82ef95L;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long a;
    private long s;
    private long x0;
    private long x1;

    private L64X128MixRandomAdapter(long seed) {
      this(
        mixMurmur64(seed ^= SILVER_RATIO_64),
        1L,
        mixStafford13(seed),
        mixStafford13(seed + GOLDEN_RATIO_64)
      );
    }

    private L64X128MixRandomAdapter(byte[] seed) {
      long[] data = new long[4];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[2] | data[3]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 2; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.a = data[0] | 1L;
      this.s = data[1];
      this.x0 = data[2];
      this.x1 = data[3];
    }

    private L64X128MixRandomAdapter(long a, long s, long x0, long x1) {
      this.a = a | 1L;
      this.s = s;
      this.x0 = x0;
      this.x1 = x1;
      if ((x0 | x1) == 0L) {
        long value = s;
        this.x0 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x1 = mixStafford13(value + GOLDEN_RATIO_64);
      }
    }

    public long nextLong() {
      long result = mixLea64(s + x0);
      s = MULTIPLIER * s + a;
      long q0 = x0;
      long q1 = x1 ^ q0;
      x0 = Long.rotateLeft(q0, 24) ^ q1 ^ (q1 << 16);
      x1 = Long.rotateLeft(q1, 37);
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      return new L64X128MixRandomAdapter(
        brine << 1,
        source.nextLong(),
        source.nextLong(),
        source.nextLong()
      );
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      checkStreamSize(streamSize);
      Objects.requireNonNull(source);
      final L64X128MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }

    private static long mixLea64(long value) {
      value = (value ^ (value >>> 32)) * 0xdaba0b6eb09322e3L;
      value = (value ^ (value >>> 32)) * 0xdaba0b6eb09322e3L;
      return value ^ (value >>> 32);
    }

    private static long checkStreamSize(long streamSize) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      return streamSize;
    }
  }

  private static final class L64X128StarStarRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final long MULTIPLIER = 0xd1342543de82ef95L;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long a;
    private long s;
    private long x0;
    private long x1;

    private L64X128StarStarRandomAdapter(long seed) {
      this(
        mixMurmur64(seed ^= SILVER_RATIO_64),
        1L,
        mixStafford13(seed),
        mixStafford13(seed + GOLDEN_RATIO_64)
      );
    }

    private L64X128StarStarRandomAdapter(byte[] seed) {
      long[] data = new long[4];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[2] | data[3]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 2; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.a = data[0] | 1L;
      this.s = data[1];
      this.x0 = data[2];
      this.x1 = data[3];
    }

    private L64X128StarStarRandomAdapter(long a, long s, long x0, long x1) {
      this.a = a | 1L;
      this.s = s;
      this.x0 = x0;
      this.x1 = x1;
      if ((x0 | x1) == 0L) {
        long value = s;
        this.x0 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x1 = mixStafford13(value + GOLDEN_RATIO_64);
      }
    }

    public long nextLong() {
      long result = Long.rotateLeft((s + x0) * 5L, 7) * 9L;
      s = MULTIPLIER * s + a;
      long q0 = x0;
      long q1 = x1 ^ q0;
      x0 = Long.rotateLeft(q0, 24) ^ q1 ^ (q1 << 16);
      x1 = Long.rotateLeft(q1, 37);
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      return new L64X128StarStarRandomAdapter(
        brine << 1,
        source.nextLong(),
        source.nextLong(),
        source.nextLong()
      );
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      checkStreamSize(streamSize);
      Objects.requireNonNull(source);
      final L64X128StarStarRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }

    private static long checkStreamSize(long streamSize) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      return streamSize;
    }
  }

  private static final class L64X256MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final long MULTIPLIER = 0xd1342543de82ef95L;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long a;
    private long s;
    private long x0;
    private long x1;
    private long x2;
    private long x3;

    private L64X256MixRandomAdapter(long seed) {
      this(
        mixMurmur64(seed ^= SILVER_RATIO_64),
        1L,
        mixStafford13(seed),
        mixStafford13(seed += GOLDEN_RATIO_64),
        mixStafford13(seed += GOLDEN_RATIO_64),
        mixStafford13(seed + GOLDEN_RATIO_64)
      );
    }

    private L64X256MixRandomAdapter(byte[] seed) {
      long[] data = new long[6];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[2] | data[3] | data[4] | data[5]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 2; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.a = data[0] | 1L;
      this.s = data[1];
      this.x0 = data[2];
      this.x1 = data[3];
      this.x2 = data[4];
      this.x3 = data[5];
    }

    private L64X256MixRandomAdapter(long a, long s, long x0, long x1, long x2, long x3) {
      this.a = a | 1L;
      this.s = s;
      this.x0 = x0;
      this.x1 = x1;
      this.x2 = x2;
      this.x3 = x3;
      if ((x0 | x1 | x2 | x3) == 0L) {
        long value = s;
        this.x0 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x1 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x2 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x3 = mixStafford13(value + GOLDEN_RATIO_64);
      }
    }

    public long nextLong() {
      long result = mixLea64(s + x0);
      s = MULTIPLIER * s + a;
      long q0 = x0;
      long q1 = x1;
      long q2 = x2;
      long q3 = x3;
      long t = q1 << 17;
      q2 ^= q0;
      q3 ^= q1;
      q1 ^= q2;
      q0 ^= q3;
      q2 ^= t;
      q3 = Long.rotateLeft(q3, 45);
      x0 = q0;
      x1 = q1;
      x2 = q2;
      x3 = q3;
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      return new L64X256MixRandomAdapter(
        brine << 1,
        source.nextLong(),
        source.nextLong(),
        source.nextLong(),
        source.nextLong(),
        source.nextLong()
      );
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      checkStreamSize(streamSize);
      Objects.requireNonNull(source);
      final L64X256MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }

    private static long mixLea64(long value) {
      value = (value ^ (value >>> 32)) * 0xdaba0b6eb09322e3L;
      value = (value ^ (value >>> 32)) * 0xdaba0b6eb09322e3L;
      return value ^ (value >>> 32);
    }

    private static long checkStreamSize(long streamSize) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      return streamSize;
    }
  }

  private static final class L64X1024MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final int STATE_SIZE = 16;
    private static final long MULTIPLIER = 0xd1342543de82ef95L;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long a;
    private long s;
    private final long[] x;
    private int p = STATE_SIZE - 1;

    private L64X1024MixRandomAdapter(long seed) {
      this.a = mixMurmur64(seed ^= SILVER_RATIO_64) | 1L;
      this.s = 1L;
      this.x = new long[STATE_SIZE];
      long value = seed;
      for (int i = 0; i < x.length; i++) {
        if (i != 0) {
          value += GOLDEN_RATIO_64;
        }
        x[i] = mixStafford13(value);
      }
    }

    private L64X1024MixRandomAdapter(byte[] seed) {
      long[] data = new long[18];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      boolean hasNonzeroState = false;
      for (int i = 2; i < data.length; i++) {
        hasNonzeroState = hasNonzeroState || data[i] != 0L;
      }
      if (!hasNonzeroState) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 2; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.a = data[0] | 1L;
      this.s = data[1];
      this.x = new long[STATE_SIZE];
      for (int i = 0; i < x.length; i++) {
        x[i] = data[i + 2];
      }
    }

    private L64X1024MixRandomAdapter(long a, long s, long[] state) {
      this.a = a | 1L;
      this.s = s;
      this.x = new long[STATE_SIZE];
      boolean hasNonzeroState = false;
      for (int i = 0; i < x.length; i++) {
        x[i] = state[i];
        hasNonzeroState = hasNonzeroState || x[i] != 0L;
      }
      if (!hasNonzeroState) {
        long value = s;
        for (int i = 0; i < x.length; i++) {
          x[i] = mixStafford13(value += GOLDEN_RATIO_64);
        }
      }
    }

    public long nextLong() {
      int q = p;
      long s0 = x[p = (p + 1) & (STATE_SIZE - 1)];
      long s15 = x[q];
      long result = s + s0;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = result ^ (result >>> 32);
      s = MULTIPLIER * s + a;
      s15 ^= s0;
      x[q] = Long.rotateLeft(s0, 25) ^ s15 ^ (s15 << 27);
      x[p] = Long.rotateLeft(s15, 36);
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      long splitSeed = source.nextLong();
      long[] state = new long[STATE_SIZE];
      for (int i = 0; i < state.length; i++) {
        state[i] = source.nextLong();
      }
      return new L64X1024MixRandomAdapter(brine << 1, splitSeed, state);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      Objects.requireNonNull(source);
      final L64X1024MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }
  }

  private static final class L128X128MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final long MULTIPLIER_LOW = 0xd605bbb58c8abbfdL;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long ah;
    private final long al;
    private long sh;
    private long sl;
    private long x0;
    private long x1;

    private L128X128MixRandomAdapter(long seed) {
      seed ^= SILVER_RATIO_64;
      this.ah = mixMurmur64(seed);
      this.al = mixMurmur64(seed += GOLDEN_RATIO_64) | 1L;
      this.sh = 0L;
      this.sl = 1L;
      this.x0 = mixStafford13(seed);
      this.x1 = mixStafford13(seed + GOLDEN_RATIO_64);
    }

    private L128X128MixRandomAdapter(byte[] seed) {
      long[] data = new long[6];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[4] | data[5]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 4; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.ah = data[0];
      this.al = data[1] | 1L;
      this.sh = data[2];
      this.sl = data[3];
      this.x0 = data[4];
      this.x1 = data[5];
    }

    private L128X128MixRandomAdapter(long ah, long al, long sh, long sl, long x0, long x1) {
      this.ah = ah;
      this.al = al | 1L;
      this.sh = sh;
      this.sl = sl;
      this.x0 = x0;
      this.x1 = x1;
      if ((x0 | x1) == 0L) {
        long value = sh;
        this.x0 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x1 = mixStafford13(value + GOLDEN_RATIO_64);
      }
    }

    public long nextLong() {
      long result = sh + x0;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = result ^ (result >>> 32);
      long u = MULTIPLIER_LOW * sl;
      long signedHigh = BigInteger.valueOf(MULTIPLIER_LOW)
          .multiply(BigInteger.valueOf(sl))
          .shiftRight(64)
          .longValue();
      sh = (MULTIPLIER_LOW * sh)
          + (signedHigh + ((MULTIPLIER_LOW >> 63) & sl) + ((sl >> 63) & MULTIPLIER_LOW))
          + sl
          + ah;
      sl = u + al;
      if (Long.compare(sl + Long.MIN_VALUE, u + Long.MIN_VALUE) < 0) {
        sh++;
      }
      long q0 = x0;
      long q1 = x1 ^ q0;
      x0 = Long.rotateLeft(q0, 24) ^ q1 ^ (q1 << 16);
      x1 = Long.rotateLeft(q1, 37);
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      return new L128X128MixRandomAdapter(
        source.nextLong(),
        brine << 1,
        source.nextLong(),
        source.nextLong(),
        source.nextLong(),
        source.nextLong()
      );
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      Objects.requireNonNull(source);
      final L128X128MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }
  }

  private static final class L128X256MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final long MULTIPLIER_LOW = 0xd605bbb58c8abbfdL;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long ah;
    private final long al;
    private long sh;
    private long sl;
    private long x0;
    private long x1;
    private long x2;
    private long x3;

    private L128X256MixRandomAdapter(long seed) {
      seed ^= SILVER_RATIO_64;
      this.ah = mixMurmur64(seed);
      this.al = mixMurmur64(seed += GOLDEN_RATIO_64) | 1L;
      this.sh = 0L;
      this.sl = 1L;
      this.x0 = mixStafford13(seed);
      this.x1 = mixStafford13(seed += GOLDEN_RATIO_64);
      this.x2 = mixStafford13(seed += GOLDEN_RATIO_64);
      this.x3 = mixStafford13(seed + GOLDEN_RATIO_64);
    }

    private L128X256MixRandomAdapter(byte[] seed) {
      long[] data = new long[8];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[4] | data[5] | data[6] | data[7]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 4; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.ah = data[0];
      this.al = data[1] | 1L;
      this.sh = data[2];
      this.sl = data[3];
      this.x0 = data[4];
      this.x1 = data[5];
      this.x2 = data[6];
      this.x3 = data[7];
    }

    private L128X256MixRandomAdapter(
        long ah,
        long al,
        long sh,
        long sl,
        long x0,
        long x1,
        long x2,
        long x3) {
      this.ah = ah;
      this.al = al | 1L;
      this.sh = sh;
      this.sl = sl;
      this.x0 = x0;
      this.x1 = x1;
      this.x2 = x2;
      this.x3 = x3;
      if ((x0 | x1 | x2 | x3) == 0L) {
        long value = sh;
        this.x0 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x1 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x2 = mixStafford13(value += GOLDEN_RATIO_64);
        this.x3 = mixStafford13(value + GOLDEN_RATIO_64);
      }
    }

    public long nextLong() {
      long result = sh + x0;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = result ^ (result >>> 32);
      long u = MULTIPLIER_LOW * sl;
      long signedHigh = BigInteger.valueOf(MULTIPLIER_LOW)
          .multiply(BigInteger.valueOf(sl))
          .shiftRight(64)
          .longValue();
      sh = (MULTIPLIER_LOW * sh)
          + (signedHigh + ((MULTIPLIER_LOW >> 63) & sl) + ((sl >> 63) & MULTIPLIER_LOW))
          + sl
          + ah;
      sl = u + al;
      if (Long.compare(sl + Long.MIN_VALUE, u + Long.MIN_VALUE) < 0) {
        sh++;
      }
      long q0 = x0;
      long q1 = x1;
      long q2 = x2;
      long q3 = x3;
      long t = q1 << 17;
      q2 ^= q0;
      q3 ^= q1;
      q1 ^= q2;
      q0 ^= q3;
      q2 ^= t;
      q3 = Long.rotateLeft(q3, 45);
      x0 = q0;
      x1 = q1;
      x2 = q2;
      x3 = q3;
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      return new L128X256MixRandomAdapter(
        source.nextLong(),
        brine << 1,
        source.nextLong(),
        source.nextLong(),
        source.nextLong(),
        source.nextLong(),
        source.nextLong(),
        source.nextLong()
      );
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      Objects.requireNonNull(source);
      final L128X256MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }
  }

  private static final class L128X1024MixRandomAdapter implements RandomGenerator.SplittableGenerator {
    private static final int STATE_SIZE = 16;
    private static final long MULTIPLIER_LOW = 0xd605bbb58c8abbfdL;
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private final long ah;
    private final long al;
    private long sh;
    private long sl;
    private final long[] x;
    private int p = STATE_SIZE - 1;

    private L128X1024MixRandomAdapter(long seed) {
      seed ^= SILVER_RATIO_64;
      this.ah = mixMurmur64(seed);
      this.al = mixMurmur64(seed += GOLDEN_RATIO_64) | 1L;
      this.sh = 0L;
      this.sl = 1L;
      this.x = new long[STATE_SIZE];
      for (int i = 0; i < x.length; i++) {
        if (i != 0) {
          seed += GOLDEN_RATIO_64;
        }
        x[i] = mixStafford13(seed);
      }
    }

    private L128X1024MixRandomAdapter(byte[] seed) {
      long[] data = new long[20];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      boolean hasNonzeroState = false;
      for (int i = 4; i < data.length; i++) {
        hasNonzeroState = hasNonzeroState || data[i] != 0L;
      }
      if (!hasNonzeroState) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 4; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.ah = data[0];
      this.al = data[1] | 1L;
      this.sh = data[2];
      this.sl = data[3];
      this.x = new long[STATE_SIZE];
      for (int i = 0; i < x.length; i++) {
        x[i] = data[i + 4];
      }
    }

    private L128X1024MixRandomAdapter(long ah, long al, long sh, long sl, long[] state) {
      this.ah = ah;
      this.al = al | 1L;
      this.sh = sh;
      this.sl = sl;
      this.x = new long[STATE_SIZE];
      boolean hasNonzeroState = false;
      for (int i = 0; i < x.length; i++) {
        x[i] = state[i];
        hasNonzeroState = hasNonzeroState || x[i] != 0L;
      }
      if (!hasNonzeroState) {
        long value = sh;
        for (int i = 0; i < x.length; i++) {
          x[i] = mixStafford13(value += GOLDEN_RATIO_64);
        }
      }
    }

    public long nextLong() {
      int q = p;
      long s0 = x[p = (p + 1) & (STATE_SIZE - 1)];
      long s15 = x[q];
      long result = sh + s0;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = (result ^ (result >>> 32)) * 0xdaba0b6eb09322e3L;
      result = result ^ (result >>> 32);
      long u = MULTIPLIER_LOW * sl;
      long signedHigh = BigInteger.valueOf(MULTIPLIER_LOW)
          .multiply(BigInteger.valueOf(sl))
          .shiftRight(64)
          .longValue();
      sh = (MULTIPLIER_LOW * sh)
          + (signedHigh + ((MULTIPLIER_LOW >> 63) & sl) + ((sl >> 63) & MULTIPLIER_LOW))
          + sl
          + ah;
      sl = u + al;
      if (Long.compare(sl + Long.MIN_VALUE, u + Long.MIN_VALUE) < 0) {
        sh++;
      }
      s15 ^= s0;
      x[q] = Long.rotateLeft(s0, 25) ^ s15 ^ (s15 << 27);
      x[p] = Long.rotateLeft(s15, 36);
      return result;
    }

    public RandomGenerator.SplittableGenerator split() {
      return split(this);
    }

    public RandomGenerator.SplittableGenerator split(RandomGenerator.SplittableGenerator source) {
      Objects.requireNonNull(source);
      long brine = source.nextLong();
      return split(source, brine);
    }

    private RandomGenerator.SplittableGenerator split(
        RandomGenerator.SplittableGenerator source,
        long brine) {
      long splitHigh = source.nextLong();
      long splitSeedHigh = source.nextLong();
      long splitSeedLow = source.nextLong();
      long[] state = new long[STATE_SIZE];
      for (int i = 0; i < state.length; i++) {
        state[i] = source.nextLong();
      }
      return new L128X1024MixRandomAdapter(splitHigh, brine << 1, splitSeedHigh, splitSeedLow, state);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(long streamSize) {
      return splits(streamSize, this);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(RandomGenerator.SplittableGenerator source) {
      return splits(Long.MAX_VALUE, source);
    }

    public Stream<RandomGenerator.SplittableGenerator> splits(
        long streamSize,
        final RandomGenerator.SplittableGenerator source) {
      if (streamSize < 0L) {
        throw new IllegalArgumentException();
      }
      Objects.requireNonNull(source);
      final L128X1024MixRandomAdapter self = this;
      final long multiplier = 15L;
      BigInteger bigMultiplier = BigInteger.valueOf(multiplier);
      long bits = nextLong();
      long salt = multiplier << 60;
      while ((salt & multiplier) == 0L) {
        long digit = BigInteger.valueOf(bits).multiply(bigMultiplier).shiftRight(64).longValue();
        salt = (salt >>> 4) | (digit << 60);
        bits *= multiplier;
      }
      final long initialSalt = salt;
      Iterator<RandomGenerator.SplittableGenerator> iterator = new Iterator<RandomGenerator.SplittableGenerator>() {
        private long index = 0L;
        private long salt = initialSalt;

        public boolean hasNext() {
          return index < streamSize;
        }

        public RandomGenerator.SplittableGenerator next() {
          if (!hasNext()) {
            throw new NoSuchElementException();
          }
          long brine = salt | index;
          index++;
          if ((index & salt) != 0L) {
            salt <<= 4;
          }
          return self.split(source, brine);
        }
      };
      return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize,
          Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE), false);
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }
  }

  private static final class Xoroshiro128PlusPlusAdapter implements RandomGenerator.LeapableGenerator {
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private static final long[] JUMP_TABLE = {
      0x2bd7a6a6e99c2ddcL,
      0x0992ccaf6a6fca05L
    };
    private static final long[] LEAP_TABLE = {
      0x360fd5f2cf8d5d99L,
      0x9c6e6877736c46e3L
    };
    private long x0;
    private long x1;

    private Xoroshiro128PlusPlusAdapter(long seed) {
      seed ^= SILVER_RATIO_64;
      this.x0 = mixStafford13(seed);
      this.x1 = mixStafford13(seed + GOLDEN_RATIO_64);
    }

    private Xoroshiro128PlusPlusAdapter(byte[] seed) {
      long[] data = new long[2];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[0] | data[1]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 0; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.x0 = data[0];
      this.x1 = data[1];
    }

    private Xoroshiro128PlusPlusAdapter(long x0, long x1) {
      this.x0 = x0;
      this.x1 = x1;
      if ((x0 | x1) == 0L) {
        this.x0 = GOLDEN_RATIO_64;
        this.x1 = SILVER_RATIO_64;
      }
    }

    public long nextLong() {
      long s0 = x0;
      long s1 = x1;
      long result = Long.rotateLeft(s0 + s1, 17) + s0;
      s1 ^= s0;
      x0 = Long.rotateLeft(s0, 49) ^ s1 ^ (s1 << 21);
      x1 = Long.rotateLeft(s1, 28);
      return result;
    }

    public RandomGenerator.LeapableGenerator copy() {
      return new Xoroshiro128PlusPlusAdapter(x0, x1);
    }

    public void jump() {
      jumpAlgorithm(JUMP_TABLE);
    }

    public double jumpDistance() {
      return 0x1.0p64;
    }

    public void leap() {
      jumpAlgorithm(LEAP_TABLE);
    }

    public double leapDistance() {
      return 0x1.0p96;
    }

    private void jumpAlgorithm(long[] table) {
      long s0 = 0L;
      long s1 = 0L;
      for (int i = 0; i < table.length; i++) {
        for (int b = 0; b < 64; b++) {
          if ((table[i] & (1L << b)) != 0L) {
            s0 ^= x0;
            s1 ^= x1;
          }
          nextLong();
        }
      }
      x0 = s0;
      x1 = s1;
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }
  }

  private static final class Xoshiro256PlusPlusAdapter implements RandomGenerator.LeapableGenerator {
    private static final long GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15L;
    private static final long SILVER_RATIO_64 = 0x6a09e667f3bcc909L;
    private static final long[] JUMP_TABLE = {
      0x180ec6d33cfd0abaL,
      0xd5a61266f0c9392cL,
      0xa9582618e03fc9aaL,
      0x39abdc4529b1661cL
    };
    private static final long[] LEAP_TABLE = {
      0x76e15d3efefdcbbfL,
      0xc5004e441c522fb3L,
      0x77710069854ee241L,
      0x39109bb02acbe635L
    };
    private long x0;
    private long x1;
    private long x2;
    private long x3;

    private Xoshiro256PlusPlusAdapter(long seed) {
      seed ^= SILVER_RATIO_64;
      this.x0 = mixStafford13(seed);
      this.x1 = mixStafford13(seed += GOLDEN_RATIO_64);
      this.x2 = mixStafford13(seed += GOLDEN_RATIO_64);
      this.x3 = mixStafford13(seed + GOLDEN_RATIO_64);
    }

    private Xoshiro256PlusPlusAdapter(byte[] seed) {
      long[] data = new long[4];
      int byteCount = Math.min(seed.length, data.length << 3);
      for (int i = 0; i < byteCount; i++) {
        data[i >> 3] = (data[i >> 3] << 8) | (seed[i] & 0xffL);
      }
      long value = data[0];
      for (int i = (byteCount + 7) >> 3; i < data.length; i++) {
        data[i] = mixMurmur64(value += SILVER_RATIO_64);
      }
      if ((data[0] | data[1] | data[2] | data[3]) == 0L) {
        long nonzeroValue = data[0] & ~1L;
        for (int i = 0; i < data.length; i++) {
          data[i] = mixMurmur64(nonzeroValue += SILVER_RATIO_64);
        }
      }
      this.x0 = data[0];
      this.x1 = data[1];
      this.x2 = data[2];
      this.x3 = data[3];
    }

    private Xoshiro256PlusPlusAdapter(long x0, long x1, long x2, long x3) {
      this.x0 = x0;
      this.x1 = x1;
      this.x2 = x2;
      this.x3 = x3;
      if ((x0 | x1 | x2 | x3) == 0L) {
        this.x0 = mixStafford13(x0 += GOLDEN_RATIO_64);
        this.x1 = x0 += GOLDEN_RATIO_64;
        this.x2 = x0 += GOLDEN_RATIO_64;
        this.x3 = x0 + GOLDEN_RATIO_64;
      }
    }

    public long nextLong() {
      long result = Long.rotateLeft(x0 + x3, 23) + x0;
      long q0 = x0;
      long q1 = x1;
      long q2 = x2;
      long q3 = x3;
      long t = q1 << 17;
      q2 ^= q0;
      q3 ^= q1;
      q1 ^= q2;
      q0 ^= q3;
      q2 ^= t;
      q3 = Long.rotateLeft(q3, 45);
      x0 = q0;
      x1 = q1;
      x2 = q2;
      x3 = q3;
      return result;
    }

    public RandomGenerator.LeapableGenerator copy() {
      return new Xoshiro256PlusPlusAdapter(x0, x1, x2, x3);
    }

    public void jump() {
      jumpAlgorithm(JUMP_TABLE);
    }

    public double jumpDistance() {
      return 0x1.0p128;
    }

    public void leap() {
      jumpAlgorithm(LEAP_TABLE);
    }

    public double leapDistance() {
      return 0x1.0p192;
    }

    private void jumpAlgorithm(long[] table) {
      long s0 = 0L;
      long s1 = 0L;
      long s2 = 0L;
      long s3 = 0L;
      for (int i = 0; i < table.length; i++) {
        for (int b = 0; b < 64; b++) {
          if ((table[i] & (1L << b)) != 0L) {
            s0 ^= x0;
            s1 ^= x1;
            s2 ^= x2;
            s3 ^= x3;
          }
          nextLong();
        }
      }
      x0 = s0;
      x1 = s1;
      x2 = s2;
      x3 = s3;
    }

    private static long mixMurmur64(long value) {
      value = (value ^ (value >>> 33)) * 0xff51afd7ed558ccdL;
      value = (value ^ (value >>> 33)) * 0xc4ceb9fe1a85ec53L;
      return value ^ (value >>> 33);
    }

    private static long mixStafford13(long value) {
      value = (value ^ (value >>> 30)) * 0xbf58476d1ce4e5b9L;
      value = (value ^ (value >>> 27)) * 0x94d049bb133111ebL;
      return value ^ (value >>> 31);
    }
  }
}
