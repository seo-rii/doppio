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
      val loadedCheck = loaded || !loaded
      val afterForce = Files.readString(path, StandardCharsets.UTF_8)
      FileChannel.open(path, StandardOpenOption.READ).use { readChannel ->
        val readOnly = readChannel.map(FileChannel.MapMode.READ_ONLY, 1, 3)
        readOnly.load()
        val readOnlyText = buildString {
          repeat(3) { append(readOnly.get(it).toInt().toChar()) }
        }
        val readOnlyForceSame = readOnly.force() === readOnly
        val empty = channel.map(FileChannel.MapMode.READ_WRITE, 0, 0)
        listOf(
          afterForce,
          readOnlyText,
          loadedCheck,
          forceSame,
          readOnlyForceSame,
          empty.capacity(),
          empty.force() === empty
        ).joinToString(":")
      }
    }
  } finally {
    Files.deleteIfExists(path)
    Files.deleteIfExists(root)
  }
}
