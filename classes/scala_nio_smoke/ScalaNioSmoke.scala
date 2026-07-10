import java.nio.charset.StandardCharsets
import java.nio.file.FileStore
import java.nio.file.Files
import java.nio.file.Path
import java.net.URI
import scala.jdk.CollectionConverters._

object ScalaNioSmoke {
  private val pathOfString =
    classOf[Path].getMethod("of", classOf[String], classOf[Array[String]])
  private val pathOfUri = classOf[Path].getMethod("of", classOf[URI])
  private val filesMismatch =
    classOf[Files].getMethod("mismatch", classOf[Path], classOf[Path])
  private val fileStoreGetBlockSize =
    classOf[FileStore].getMethod("getBlockSize")

  private def pathOf(first: String, more: String*): Path = {
    pathOfString
      .invoke(null, first.asInstanceOf[Object], more.toArray.asInstanceOf[Object])
      .asInstanceOf[Path]
  }

  private def pathOf(uri: URI): Path = {
    pathOfUri.invoke(null, uri).asInstanceOf[Path]
  }

  private def mismatch(left: Path, right: Path): Long = {
    filesMismatch.invoke(null, left, right).asInstanceOf[java.lang.Long].longValue()
  }

  private def deleteTree(path: Path): Unit = {
    if (Files.exists(path)) {
      val stream = Files.walk(path)
      try {
        stream.iterator().asScala.toList.reverse.foreach(Files.deleteIfExists)
      } finally {
        stream.close()
      }
    }
  }

  def exercise(): String = {
    val base = pathOf("build", "scala-smoke", "runtime-nio")
    deleteTree(base)

    try {
      val nested = base.resolve("nested")
      Files.createDirectories(nested)

      val left = nested.resolve("left.txt")
      val same = base.resolve("same.txt")
      val diff = base.resolve("diff.txt")
      val prefix = base.resolve("prefix.txt")
      Files.write(left, "alpha-beta".getBytes(StandardCharsets.UTF_8))
      Files.write(same, "alpha-beta".getBytes(StandardCharsets.UTF_8))
      Files.write(diff, "alpha+beta".getBytes(StandardCharsets.UTF_8))
      Files.write(prefix, "alpha".getBytes(StandardCharsets.UTF_8))

      val pathOfNormalized =
        pathOf(base.toString, "nested", "..", "nested", "left.txt").normalize()
      val uriPath = pathOf(left.toUri)
      val mismatches = List(
        mismatch(left, same),
        mismatch(left, diff),
        mismatch(left, prefix),
        mismatch(left, left)
      ).mkString("/")
      val store = Files.getFileStore(left)
      val totalSpace = store.getTotalSpace
      val usableSpace = store.getUsableSpace
      val unallocatedSpace = store.getUnallocatedSpace
      val blockSize = fileStoreGetBlockSize.invoke(store).asInstanceOf[java.lang.Long].longValue()
      val blockSizeAttribute = try {
        store.getAttribute("blockSize")
        "ok"
      } catch {
        case throwable: Throwable => throwable.getClass.getSimpleName
      }
      val storeSummary = List(
        totalSpace > 0L,
        usableSpace >= 0L,
        unallocatedSpace >= 0L,
        usableSpace <= totalSpace,
        unallocatedSpace <= totalSpace,
        blockSize > 0L,
        blockSizeAttribute
      ).mkString("/")

      s"$mismatches:${Files.isSameFile(left, pathOfNormalized)}:${Files.isSameFile(left, uriPath)}:${Files.size(left)}:${base.relativize(left)}:$storeSummary"
    } finally {
      deleteTree(base)
    }
  }
}
