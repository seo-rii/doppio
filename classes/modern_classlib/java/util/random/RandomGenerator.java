package java.util.random;

import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.PrimitiveIterator;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.DoubleSupplier;
import java.util.function.IntSupplier;
import java.util.function.LongSupplier;
import java.util.function.Supplier;
import java.util.stream.DoubleStream;
import java.util.stream.IntStream;
import java.util.stream.LongStream;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public interface RandomGenerator {
  public static RandomGenerator of(String name) {
    return RandomGeneratorFactory.of(name).create();
  }

  public static RandomGenerator getDefault() {
    return RandomGeneratorFactory.getDefault().create();
  }

  public interface StreamableGenerator extends RandomGenerator {
    public static StreamableGenerator of(String name) {
      RandomGenerator generator = RandomGenerator.of(name);
      if (generator instanceof StreamableGenerator) {
        return (StreamableGenerator) generator;
      }
      throw new IllegalArgumentException();
    }

    public Stream<RandomGenerator> rngs();

    public default Stream<RandomGenerator> rngs(long streamSize) {
      checkStreamSize(streamSize);
      return rngs().limit(streamSize);
    }
  }

  public interface SplittableGenerator extends StreamableGenerator {
    public static SplittableGenerator of(String name) {
      RandomGenerator generator = RandomGenerator.of(name);
      if (generator instanceof SplittableGenerator) {
        return (SplittableGenerator) generator;
      }
      throw new IllegalArgumentException();
    }

    public SplittableGenerator split();

    public SplittableGenerator split(SplittableGenerator source);

    public default Stream<SplittableGenerator> splits() {
      final SplittableGenerator self = this;
      return Stream.generate(new Supplier<SplittableGenerator>() {
        public SplittableGenerator get() {
          return self.split();
        }
      });
    }

    public Stream<SplittableGenerator> splits(long streamSize);

    public Stream<SplittableGenerator> splits(SplittableGenerator source);

    public Stream<SplittableGenerator> splits(long streamSize, SplittableGenerator source);

    public default Stream<RandomGenerator> rngs() {
      final SplittableGenerator self = this;
      return Stream.generate(new Supplier<RandomGenerator>() {
        public RandomGenerator get() {
          return self.split();
        }
      });
    }

    public default Stream<RandomGenerator> rngs(long streamSize) {
      long size = checkStreamSize(streamSize);
      final SplittableGenerator self = this;
      return sizedObjects(size, new Supplier<RandomGenerator>() {
        public RandomGenerator get() {
          return self.split();
        }
      }, Spliterator.SIZED | Spliterator.SUBSIZED);
    }
  }

  public interface JumpableGenerator extends StreamableGenerator {
    public static JumpableGenerator of(String name) {
      RandomGenerator generator = RandomGenerator.of(name);
      if (generator instanceof JumpableGenerator) {
        return (JumpableGenerator) generator;
      }
      throw new IllegalArgumentException();
    }

    public JumpableGenerator copy();

    public void jump();

    public double jumpDistance();

    public default Stream<RandomGenerator> jumps() {
      final JumpableGenerator self = this;
      return Stream.generate(new Supplier<RandomGenerator>() {
        public RandomGenerator get() {
          return self.copyAndJump();
        }
      });
    }

    public default Stream<RandomGenerator> jumps(long streamSize) {
      checkStreamSize(streamSize);
      return jumps().limit(streamSize);
    }

    public default Stream<RandomGenerator> rngs() {
      return jumps();
    }

    public default Stream<RandomGenerator> rngs(long streamSize) {
      return jumps(streamSize);
    }

    public default RandomGenerator copyAndJump() {
      RandomGenerator copy = copy();
      jump();
      return copy;
    }
  }

  public interface LeapableGenerator extends JumpableGenerator {
    public static LeapableGenerator of(String name) {
      RandomGenerator generator = RandomGenerator.of(name);
      if (generator instanceof LeapableGenerator) {
        return (LeapableGenerator) generator;
      }
      throw new IllegalArgumentException();
    }

    public LeapableGenerator copy();

    public void leap();

    public double leapDistance();

    public default Stream<JumpableGenerator> leaps() {
      final LeapableGenerator self = this;
      return Stream.generate(new Supplier<JumpableGenerator>() {
        public JumpableGenerator get() {
          return self.copyAndLeap();
        }
      });
    }

    public default Stream<JumpableGenerator> leaps(long streamSize) {
      checkStreamSize(streamSize);
      return leaps().limit(streamSize);
    }

    public default JumpableGenerator copyAndLeap() {
      JumpableGenerator copy = copy();
      leap();
      return copy;
    }
  }

  public interface ArbitrarilyJumpableGenerator extends LeapableGenerator {
    public static ArbitrarilyJumpableGenerator of(String name) {
      RandomGenerator generator = RandomGenerator.of(name);
      if (generator instanceof ArbitrarilyJumpableGenerator) {
        return (ArbitrarilyJumpableGenerator) generator;
      }
      throw new IllegalArgumentException();
    }

    public ArbitrarilyJumpableGenerator copy();

    public void jumpPowerOfTwo(int logDistance);

    public void jump(double distance);

    public default void jump() {
      jump(jumpDistance());
    }

    public default Stream<ArbitrarilyJumpableGenerator> jumps(double distance) {
      final ArbitrarilyJumpableGenerator self = this;
      return Stream.generate(new Supplier<ArbitrarilyJumpableGenerator>() {
        public ArbitrarilyJumpableGenerator get() {
          return self.copyAndJump(distance);
        }
      });
    }

    public default Stream<ArbitrarilyJumpableGenerator> jumps(long streamSize, double distance) {
      checkStreamSize(streamSize);
      return jumps(distance).limit(streamSize);
    }

    public default void leap() {
      jump(leapDistance());
    }

    public default ArbitrarilyJumpableGenerator copyAndJump(double distance) {
      ArbitrarilyJumpableGenerator copy = copy();
      jump(distance);
      return copy;
    }
  }

  public default boolean isDeprecated() {
    return false;
  }

  public default DoubleStream doubles() {
    return DoubleStream.generate(new DoubleSupplier() {
      public double getAsDouble() {
        return nextDouble();
      }
    });
  }

  public default DoubleStream doubles(double origin, double bound) {
    checkDoubleBounds(origin, bound);
    return DoubleStream.generate(new DoubleSupplier() {
      public double getAsDouble() {
        return nextDouble(origin, bound);
      }
    });
  }

  public default DoubleStream doubles(long streamSize) {
    final RandomGenerator self = this;
    return sizedDoubles(checkStreamSize(streamSize), new DoubleSupplier() {
      public double getAsDouble() {
        return self.nextDouble();
      }
    });
  }

  public default DoubleStream doubles(long streamSize, double origin, double bound) {
    long size = checkStreamSize(streamSize);
    checkDoubleBounds(origin, bound);
    final RandomGenerator self = this;
    return sizedDoubles(size, new DoubleSupplier() {
      public double getAsDouble() {
        return self.nextDouble(origin, bound);
      }
    });
  }

  public default IntStream ints() {
    return IntStream.generate(new IntSupplier() {
      public int getAsInt() {
        return nextInt();
      }
    });
  }

  public default IntStream ints(int origin, int bound) {
    checkIntBounds(origin, bound);
    return IntStream.generate(new IntSupplier() {
      public int getAsInt() {
        return nextInt(origin, bound);
      }
    });
  }

  public default IntStream ints(long streamSize) {
    final RandomGenerator self = this;
    return sizedInts(checkStreamSize(streamSize), new IntSupplier() {
      public int getAsInt() {
        return self.nextInt();
      }
    });
  }

  public default IntStream ints(long streamSize, int origin, int bound) {
    long size = checkStreamSize(streamSize);
    checkIntBounds(origin, bound);
    final RandomGenerator self = this;
    return sizedInts(size, new IntSupplier() {
      public int getAsInt() {
        return self.nextInt(origin, bound);
      }
    });
  }

  public default LongStream longs() {
    return LongStream.generate(new LongSupplier() {
      public long getAsLong() {
        return nextLong();
      }
    });
  }

  public default LongStream longs(long origin, long bound) {
    checkLongBounds(origin, bound);
    return LongStream.generate(new LongSupplier() {
      public long getAsLong() {
        return nextLong(origin, bound);
      }
    });
  }

  public default LongStream longs(long streamSize) {
    final RandomGenerator self = this;
    return sizedLongs(checkStreamSize(streamSize), new LongSupplier() {
      public long getAsLong() {
        return self.nextLong();
      }
    });
  }

  public default LongStream longs(long streamSize, long origin, long bound) {
    long size = checkStreamSize(streamSize);
    checkLongBounds(origin, bound);
    final RandomGenerator self = this;
    return sizedLongs(size, new LongSupplier() {
      public long getAsLong() {
        return self.nextLong(origin, bound);
      }
    });
  }

  public default boolean nextBoolean() {
    return nextInt() < 0;
  }

  public default void nextBytes(byte[] bytes) {
    int index = 0;
    while (index < bytes.length) {
      long value = nextLong();
      for (int i = 0; i < 8 && index < bytes.length; i++) {
        bytes[index++] = (byte) value;
        value >>>= 8;
      }
    }
  }

  public default float nextFloat() {
    return (nextInt() >>> 8) * 0x1.0p-24f;
  }

  public default float nextFloat(float bound) {
    if (!(bound > 0.0f) || Float.isInfinite(bound)) {
      throw new IllegalArgumentException();
    }
    float value = nextFloat() * bound;
    if (value >= bound) {
      value = Math.nextAfter(bound, Float.NEGATIVE_INFINITY);
    }
    return value;
  }

  public default float nextFloat(float origin, float bound) {
    if (!(origin < bound) || Float.isInfinite(bound - origin)) {
      throw new IllegalArgumentException();
    }
    float value = origin + nextFloat() * (bound - origin);
    if (value >= bound) {
      value = Math.nextAfter(bound, origin);
    }
    return value;
  }

  public default double nextDouble() {
    return (nextLong() >>> 11) * 0x1.0p-53;
  }

  public default double nextDouble(double bound) {
    if (!(bound > 0.0d) || Double.isInfinite(bound)) {
      throw new IllegalArgumentException();
    }
    double value = nextDouble() * bound;
    if (value >= bound) {
      value = Math.nextDown(bound);
    }
    return value;
  }

  public default double nextDouble(double origin, double bound) {
    if (!(origin < bound) || Double.isInfinite(bound - origin)) {
      throw new IllegalArgumentException();
    }
    double value = origin + nextDouble() * (bound - origin);
    if (value >= bound) {
      value = Math.nextAfter(bound, origin);
    }
    return value;
  }

  public default int nextInt() {
    return (int) (nextLong() >>> 32);
  }

  public default int nextInt(int bound) {
    if (bound <= 0) {
      throw new IllegalArgumentException();
    }
    int mask = bound - 1;
    int value = nextInt();
    if ((bound & mask) == 0) {
      return value & mask;
    }
    int candidate = value >>> 1;
    value = candidate % bound;
    while (candidate + mask - value < 0) {
      candidate = nextInt() >>> 1;
      value = candidate % bound;
    }
    return value;
  }

  public default int nextInt(int origin, int bound) {
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

  public long nextLong();

  public default long nextLong(long bound) {
    if (bound <= 0L) {
      throw new IllegalArgumentException();
    }
    long mask = bound - 1L;
    long value = nextLong();
    if ((bound & mask) == 0L) {
      return value & mask;
    }
    long candidate = value >>> 1;
    value = candidate % bound;
    while (candidate + mask - value < 0L) {
      candidate = nextLong() >>> 1;
      value = candidate % bound;
    }
    return value;
  }

  public default long nextLong(long origin, long bound) {
    if (origin >= bound) {
      throw new IllegalArgumentException();
    }
    long value = nextLong();
    long range = bound - origin;
    long mask = range - 1L;
    if ((range & mask) == 0L) {
      return (value & mask) + origin;
    }
    if (range > 0L) {
      long candidate = value >>> 1;
      value = candidate % range;
      while (candidate + mask - value < 0L) {
        candidate = nextLong() >>> 1;
        value = candidate % range;
      }
      return value + origin;
    }
    while (value < origin || value >= bound) {
      value = nextLong();
    }
    return value;
  }

  public default double nextGaussian() {
    double u = (nextLong() >>> 11) * 0x1.0p-53;
    if (u == 0.0d) {
      return 0.0d;
    }
    double v = nextDouble();
    return Math.sqrt(-2.0d * Math.log(u)) * Math.cos(2.0d * Math.PI * v);
  }

  public default double nextGaussian(double mean, double stddev) {
    if (stddev < 0.0d) {
      throw new IllegalArgumentException();
    }
    return mean + stddev * nextGaussian();
  }

  public default double nextExponential() {
    double sample = nextDouble();
    return sample == 0.0d ? 0.0d : -Math.log(1.0d - sample);
  }

  private static long checkStreamSize(long streamSize) {
    if (streamSize < 0L) {
      throw new IllegalArgumentException();
    }
    return streamSize;
  }

  private static void checkIntBounds(int origin, int bound) {
    if (origin >= bound) {
      throw new IllegalArgumentException();
    }
  }

  private static void checkLongBounds(long origin, long bound) {
    if (origin >= bound) {
      throw new IllegalArgumentException();
    }
  }

  private static void checkDoubleBounds(double origin, double bound) {
    if (!(origin < bound) || Double.isInfinite(bound - origin)) {
      throw new IllegalArgumentException();
    }
  }

  private static IntStream sizedInts(final long streamSize, final IntSupplier supplier) {
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private long remaining = streamSize;

      public boolean hasNext() {
        return remaining > 0L;
      }

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        remaining--;
        return supplier.getAsInt();
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliterator(iterator, streamSize, primitiveStreamCharacteristics()),
      false
    );
  }

  private static LongStream sizedLongs(final long streamSize, final LongSupplier supplier) {
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private long remaining = streamSize;

      public boolean hasNext() {
        return remaining > 0L;
      }

      public long nextLong() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        remaining--;
        return supplier.getAsLong();
      }
    };
    return StreamSupport.longStream(
      Spliterators.spliterator(iterator, streamSize, primitiveStreamCharacteristics()),
      false
    );
  }

  private static DoubleStream sizedDoubles(final long streamSize, final DoubleSupplier supplier) {
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      private long remaining = streamSize;

      public boolean hasNext() {
        return remaining > 0L;
      }

      public double nextDouble() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        remaining--;
        return supplier.getAsDouble();
      }
    };
    return StreamSupport.doubleStream(
      Spliterators.spliterator(iterator, streamSize, primitiveStreamCharacteristics()),
      false
    );
  }

  private static <T> Stream<T> sizedObjects(
      final long streamSize,
      final Supplier<? extends T> supplier,
      int characteristics) {
    Iterator<T> iterator = new Iterator<T>() {
      private long remaining = streamSize;

      public boolean hasNext() {
        return remaining > 0L;
      }

      public T next() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        remaining--;
        return supplier.get();
      }
    };
    return StreamSupport.stream(Spliterators.spliterator(iterator, streamSize, characteristics), false);
  }

  private static int primitiveStreamCharacteristics() {
    return Spliterator.SIZED | Spliterator.SUBSIZED | Spliterator.NONNULL | Spliterator.IMMUTABLE;
  }
}
