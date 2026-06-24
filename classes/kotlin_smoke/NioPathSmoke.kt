import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.nio.file.StandardOpenOption

fun nioPathSummary(): String {
  val base = Path.of("build", "kotlin-smoke", "runtime-nio")
  if (Files.exists(base)) {
    base.toFile().deleteRecursively()
  }
  Files.createDirectories(base.resolve("nested"))

  val source = base.resolve("input.txt")
  Files.write(source, listOf("delta", "epsilon"), StandardCharsets.UTF_8)
  Files.write(source, listOf("zeta"), StandardCharsets.UTF_8, StandardOpenOption.APPEND)

  val lines = Files.readAllLines(source, StandardCharsets.UTF_8)
  val lineSummary = lines.mapIndexed { index, line ->
    "$index:${line.length}:${line.first()}"
  }.joinToString(",")
  val bytePrefix = Files.readAllBytes(source).take(4).joinToString("") { byte ->
    byte.toInt().toString(16)
  }

  val copied = base.resolve("nested").resolve("copy.txt")
  Files.copy(source, copied, StandardCopyOption.REPLACE_EXISTING)
  val moved = base.resolve("nested").resolve("moved.txt")
  Files.move(copied, moved, StandardCopyOption.REPLACE_EXISTING)

  val diff = base.resolve("diff.txt")
  val prefix = base.resolve("prefix.txt")
  Files.write(diff, "deltaX".toByteArray(StandardCharsets.UTF_8))
  Files.write(prefix, "delta".toByteArray(StandardCharsets.UTF_8))
  val mismatchSummary = listOf(
    Files.mismatch(source, moved),
    Files.mismatch(source, diff),
    Files.mismatch(source, prefix),
    Files.mismatch(source, source)
  ).joinToString("/")
  Files.deleteIfExists(diff)
  Files.deleteIfExists(prefix)

  val listStream = Files.list(base)
  val listSummary = try {
    val entries = mutableListOf<String>()
    listStream.forEach { path ->
      entries += "${path.fileName}:${Files.isDirectory(path)}"
    }
    entries.sorted().joinToString(",")
  } finally {
    listStream.close()
  }

  val walkStream = Files.walk(base)
  val walkSummary = try {
    val entries = mutableListOf<String>()
    walkStream.forEach { path ->
      if (Files.isRegularFile(path)) {
        entries += "${base.relativize(path)}:${Files.size(path)}"
      }
    }
    entries.sorted().joinToString(",")
  } finally {
    walkStream.close()
  }

  val normalized = base.resolve("nested").resolve("..").resolve("input.txt").normalize()
  val pathOfNormalized = Path.of(base.toString(), "nested", "..", "input.txt").normalize()
  val uriPath = Path.of(source.toUri())
  val metadata = source.fileName.toString() + "/" +
    source.parent.fileName + "/" +
    base.relativize(moved)
  val state = Files.exists(source).toString() + "/" +
    Files.isRegularFile(moved) + "/" +
    Files.isSameFile(source, normalized) + "/" +
    Files.isSameFile(source, pathOfNormalized) + "/" +
    Files.isSameFile(source, uriPath)

  return lineSummary + "|" +
    bytePrefix + "|" +
    mismatchSummary + "|" +
    listSummary + "|" +
    walkSummary + "|" +
    metadata + "|" +
    state
}
