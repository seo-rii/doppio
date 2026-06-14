import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

fun concurrentCacheSummary(): String {
  val counter = AtomicInteger(0)
  val cache = ConcurrentHashMap<String, MutableList<Int>>()

  val alpha = cache.computeIfAbsent("a") { key ->
    counter.addAndGet(key.length)
    mutableListOf(1)
  }
  alpha += 2
  val alphaAgain = cache.computeIfAbsent("a") { mutableListOf(99) }

  cache.compute("b") { key, old ->
    counter.addAndGet(10)
    (old ?: mutableListOf()).apply {
      add(key.length + counter.get())
    }
  }
  cache.merge("a", mutableListOf(3)) { left, right ->
    left.addAll(right)
    left
  }
  cache.putIfAbsent("c", mutableListOf(7))
  cache.replace("c", mutableListOf(8, 9))

  val mapSummary = cache.toSortedMap().entries.joinToString(",") { (key, values) ->
    "$key=${values.joinToString("")}"
  }
  val sameValue = (alpha === alphaAgain).toString()

  val ref = AtomicReference("x")
  val cas = ref.compareAndSet("x", "y")
  val oldRef = ref.getAndUpdate { value -> value + counter.get() }
  val finalRef = ref.updateAndGet { value -> value.uppercase() }

  val list = CopyOnWriteArrayList<String>()
  list.add("a")
  val duplicate = list.addIfAbsent("a")
  val added = list.addIfAbsent("b")
  val addedCount = list.addAllAbsent(listOf("b", "c"))
  val listSummary = list.joinToString("") + ":$duplicate:$added:$addedCount"

  val local = ThreadLocal.withInitial { "main:${counter.get()}" }
  val mainLocal = local.get()
  val threadValue = arrayOf("_")
  val thread = Thread {
    local.set("worker:${cache["a"]?.size ?: -1}")
    threadValue[0] = local.get()
    local.remove()
  }
  thread.start()
  thread.join()
  val stillMain = local.get()
  local.remove()
  val resetMain = local.get()

  val lock = ReentrantLock()
  val lockEvents = mutableListOf<String>()
  val lockSummary = lock.withLock {
    lockEvents += "hold:${lock.holdCount}:${lock.isHeldByCurrentThread}"
    "locked:${cache.size}"
  }

  val syncMap = Collections.synchronizedMap(linkedMapOf("k" to 1))
  synchronized(syncMap) {
    syncMap["z"] = syncMap.getValue("k") + counter.get()
  }
  val syncSummary = syncMap.entries.joinToString(",") { (key, value) -> "$key=$value" }

  return mapSummary + "|" +
    sameValue + "|" +
    "$cas:$oldRef:$finalRef" + "|" +
    listSummary + "|" +
    "$mainLocal/${threadValue[0]}/$stillMain/$resetMain" + "|" +
    lockSummary + ":" + lockEvents.joinToString(">") + "|" +
    syncSummary + "|" +
    counter.get()
}
