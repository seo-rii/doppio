import java.lang.reflect.InvocationTargetException
import java.nio.channels.FileChannel
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.StandardOpenOption

fun mappedBufferSummary(): String {
  val root = Files.createTempDirectory("kotlin-mapped-buffer-smoke")
  val path = root.resolve("mapped.txt")
  return try {
    Files.writeString(path, "abcdef", StandardCharsets.UTF_8)
    FileChannel.open(path, StandardOpenOption.READ, StandardOpenOption.WRITE).use { channel ->
      val mapped = channel.map(FileChannel.MapMode.READ_WRITE, 0, 6)
      val loaded = mapped.isLoaded()
      mapped.load()
      mapped.put(1, 'Z'.code.toByte())
      mapped.put(4, 'Y'.code.toByte())
      val forceSame = mapped.force() === mapped
      val afterForce = Files.readString(path, StandardCharsets.UTF_8)
      val rangeForce = mapped.javaClass.getMethod("force", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType)
      val rangeEmptyForceSame = rangeForce.invoke(mapped, 0, 0) === mapped
      mapped.put(2, 'R'.code.toByte())
      mapped.put(3, 'S'.code.toByte())
      val rangeForceSame = rangeForce.invoke(mapped, 2, 2) === mapped
      val afterRangeForce = Files.readString(path, StandardCharsets.UTF_8)
      val rangeError = try {
        rangeForce.invoke(mapped, 5, 2)
        "missing"
      } catch (e: InvocationTargetException) {
        e.targetException::class.java.simpleName
      } catch (e: IndexOutOfBoundsException) {
        e::class.java.simpleName
      }
      val loadedCheck = loaded || !loaded
      FileChannel.open(path, StandardOpenOption.READ).use { readChannel ->
        val readOnly = readChannel.map(FileChannel.MapMode.READ_ONLY, 1, 3)
        readOnly.load()
        val readOnlyText = buildString {
          repeat(3) { append(readOnly.get(it).toInt().toChar()) }
        }
        val readOnlyForceSame = readOnly.force() === readOnly
        val readOnlyRangeForceSame = rangeForce.invoke(readOnly, 1, 1) === readOnly
        val empty = channel.map(FileChannel.MapMode.READ_WRITE, 0, 0)
        listOf(
          afterForce,
          afterRangeForce,
          readOnlyText,
          loadedCheck,
          forceSame,
          rangeEmptyForceSame,
          rangeForceSame,
          readOnlyForceSame,
          readOnlyRangeForceSame,
          rangeError,
          empty.capacity(),
          empty.force() === empty,
          rangeForce.invoke(empty, 1, 1) === empty
        ).joinToString(":")
      }
    }
  } finally {
    Files.deleteIfExists(path)
    Files.deleteIfExists(root)
  }
}
