import java.util.Arrays
import java.util.Collections
import java.util.LinkedHashMap
import java.util.Locale
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.locks.ReentrantLock
import java.util.function.BiFunction
import java.util.function.Function
import java.util.function.Supplier
import java.util.function.UnaryOperator
import scala.jdk.CollectionConverters._

object ScalaConcurrentSmoke {
  def exercise(): String = {
    val executor = Executors.newSingleThreadExecutor()
    val futureSummary = try {
      val chained = CompletableFuture.supplyAsync(new Supplier[String] {
        override def get(): String = "sc"
      }, executor).thenApply(new Function[String, String] {
        override def apply(value: String): String =
          value.toUpperCase(Locale.ROOT) + value.length
      }).thenCompose(new Function[String, CompletableFuture[String]] {
        override def apply(text: String): CompletableFuture[String] =
          CompletableFuture.completedFuture(text + "!")
      })
      val recovered = CompletableFuture.supplyAsync(new Supplier[Integer] {
        override def get(): Integer = throw new IllegalStateException("boom")
      }, executor).handle(new BiFunction[Integer, Throwable, Integer] {
        override def apply(value: Integer, error: Throwable): Integer =
          if (error == null) value else Integer.valueOf(5)
      })
      val raced = CompletableFuture.completedFuture("left").applyToEither(
        new CompletableFuture[String](),
        new Function[String, String] {
          override def apply(value: String): String = value.take(1)
        })
      val combined = chained.thenCombine(recovered, new BiFunction[String, Integer, String] {
        override def apply(text: String, value: Integer): String = s"$text:$value"
      })
      CompletableFuture.allOf(combined, raced)
        .thenApply(new Function[Void, String] {
          override def apply(ignored: Void): String = s"${combined.join()}:${raced.join()}"
        })
        .get(10, TimeUnit.SECONDS)
    } finally {
      executor.shutdown()
    }

    val counter = new AtomicInteger(0)
    val cache = new ConcurrentHashMap[String, Integer]()
    val alpha = cache.computeIfAbsent("a", new Function[String, Integer] {
      override def apply(key: String): Integer =
        Integer.valueOf(counter.addAndGet(key.length) + 1)
    })
    val alphaAgain = cache.computeIfAbsent("a", new Function[String, Integer] {
      override def apply(key: String): Integer = Integer.valueOf(99)
    })
    cache.compute("b", new BiFunction[String, Integer, Integer] {
      override def apply(key: String, old: Integer): Integer = {
        val previous = if (old == null) 0 else old.intValue()
        Integer.valueOf(previous + counter.addAndGet(10) + key.length)
      }
    })
    cache.merge("a", Integer.valueOf(3), new BiFunction[Integer, Integer, Integer] {
      override def apply(left: Integer, right: Integer): Integer =
        Integer.valueOf(left.intValue() + right.intValue())
    })
    cache.putIfAbsent("c", Integer.valueOf(7))
    cache.replace("c", Integer.valueOf(8))
    val mapSummary = cache.asScala.toSeq.sortBy(_._1).map {
      case (key, value) => s"$key=$value"
    }.mkString(",")
    val sameValue = (alpha eq alphaAgain).toString

    val ref = new AtomicReference[String]("x")
    val cas = ref.compareAndSet("x", "y")
    val oldRef = ref.getAndUpdate(new UnaryOperator[String] {
      override def apply(value: String): String = value + counter.get()
    })
    val finalRef = ref.updateAndGet(new UnaryOperator[String] {
      override def apply(value: String): String = value.toUpperCase(Locale.ROOT)
    })
    val atomicLong = new AtomicLong(4)
    val longBefore = atomicLong.getAndAdd(3)
    val longAfter = atomicLong.incrementAndGet()

    val list = new CopyOnWriteArrayList[String]()
    list.add("a")
    val duplicate = list.addIfAbsent("a")
    val added = list.addIfAbsent("b")
    val addedCount = list.addAllAbsent(Arrays.asList("b", "c"))
    val listSummary = list.asScala.mkString("") + s":$duplicate:$added:$addedCount"

    val local = ThreadLocal.withInitial(new Supplier[String] {
      override def get(): String = s"main:${counter.get()}"
    })
    val mainLocal = local.get()
    val threadValue = Array("_")
    val worker = new Thread(new Runnable {
      override def run(): Unit = {
        local.set(s"worker:${cache.size()}")
        threadValue(0) = local.get()
        local.remove()
      }
    })
    worker.start()
    worker.join()
    val stillMain = local.get()
    local.remove()
    val resetMain = local.get()

    val lock = new ReentrantLock()
    val lockEvents = scala.collection.mutable.ArrayBuffer.empty[String]
    lock.lock()
    val lockSummary = try {
      lockEvents += s"hold:${lock.getHoldCount}:${lock.isHeldByCurrentThread}"
      s"locked:${cache.size()}"
    } finally {
      lock.unlock()
    }

    val syncMap = Collections.synchronizedMap(new LinkedHashMap[String, Integer]())
    syncMap.put("k", Integer.valueOf(1))
    syncMap.synchronized {
      syncMap.put("z", Integer.valueOf(syncMap.get("k").intValue() + counter.get()))
    }
    val syncSummary = syncMap.asScala.map {
      case (key, value) => s"$key=$value"
    }.mkString(",")

    List(
      futureSummary,
      mapSummary,
      sameValue,
      s"$cas:$oldRef:$finalRef:$longBefore/$longAfter",
      listSummary,
      s"$mainLocal/${threadValue(0)}/$stillMain/$resetMain",
      s"$lockSummary:${lockEvents.mkString(">")}",
      syncSummary,
      counter.get().toString
    ).mkString("|")
  }
}
