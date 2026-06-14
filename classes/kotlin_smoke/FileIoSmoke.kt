import java.io.File

fun fileIoSummary(): String {
  val dir = File("build/kotlin-smoke/runtime-io")
  if (dir.exists()) {
    dir.deleteRecursively()
  }
  check(dir.mkdirs()) { "mkdirs" }

  val source = File(dir, "input.txt")
  source.writeText("alpha\nbeta\n", Charsets.UTF_8)
  source.appendText("gamma\n", Charsets.UTF_8)

  val readLines = source.readLines(Charsets.UTF_8).mapIndexed { index, line ->
    "$index:${line.length}:${line.first()}"
  }.joinToString(",")
  val usedLines = source.useLines(Charsets.UTF_8) { lines ->
    lines.filter { it.contains('a') }.map { it.last() }.joinToString("")
  }

  val copied = File(dir, "nested/out.txt")
  check(copied.parentFile.mkdirs()) { "nested" }
  source.copyTo(copied, overwrite = true)

  val walk = dir.walkTopDown()
    .filter { it.isFile }
    .map { "${it.relativeTo(dir).invariantSeparatorsPath}:${it.length()}" }
    .sorted()
    .joinToString(",")
  val bytePrefix = copied.readBytes().take(5).joinToString("") { byte ->
    byte.toInt().toString(16)
  }
  val metadata = copied.extension + "/" +
    copied.nameWithoutExtension + "/" +
    copied.relativeTo(dir).invariantSeparatorsPath
  val state = source.exists().toString() + "/" + copied.isFile

  return readLines + "|" +
    usedLines + "|" +
    walk + "|" +
    bytePrefix + "|" +
    metadata + "|" +
    state
}
