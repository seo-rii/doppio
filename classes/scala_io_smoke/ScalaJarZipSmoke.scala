import java.net.URLClassLoader
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Paths
import java.util.Collections
import java.util.jar.Attributes
import java.util.jar.JarEntry
import java.util.jar.JarFile
import java.util.jar.JarOutputStream
import java.util.jar.Manifest
import java.util.zip.CRC32
import java.util.zip.ZipInputStream
import scala.io.Codec
import scala.jdk.CollectionConverters._
import scala.util.Using

object ScalaJarZipSmoke {
  def exercise(): String = {
    val parent = Paths.get("build", "scala-smoke")
    Files.createDirectories(parent)
    val base = Files.createTempDirectory(parent, "runtime-jarzip-")
    val utf8 = StandardCharsets.UTF_8

    try {
      val jarPath = base.resolve("lookup.jar")
      val dataBytes = "scala\njar\n".getBytes(utf8)
      val serviceBytes = "scala.Provider\n".getBytes(utf8)
      val versionBytes = "version17\n".getBytes(utf8)

      val manifest = new Manifest()
      manifest.getMainAttributes.put(Attributes.Name.MANIFEST_VERSION, "1.0")
      manifest.getMainAttributes.putValue("Scala-Smoke", "jarzip")
      manifest.getMainAttributes.putValue("Multi-Release", "false")

      val jarOut = new JarOutputStream(Files.newOutputStream(jarPath), manifest)
      try {
        val dataEntry = new JarEntry("pkg/data.txt")
        jarOut.putNextEntry(dataEntry)
        jarOut.write(dataBytes)
        jarOut.closeEntry()

        jarOut.putNextEntry(new JarEntry("META-INF/services/example.Service"))
        jarOut.write(serviceBytes)
        jarOut.closeEntry()

        jarOut.putNextEntry(new JarEntry("META-INF/versions/17/pkg/data.txt"))
        jarOut.write(versionBytes)
        jarOut.closeEntry()
      } finally {
        jarOut.close()
      }

      val crc = new CRC32()
      crc.update(dataBytes)

      val jar = new JarFile(jarPath.toFile)
      val jarSummary = try {
        val entries = Collections
          .list(jar.entries())
          .asScala
          .filterNot(_.isDirectory)
          .map(_.getName)
          .toList
          .sorted
          .mkString(",")
        val dataEntry = jar.getJarEntry("pkg/data.txt")
        val serviceEntry = jar.getJarEntry("META-INF/services/example.Service")
        val dataText = Using.resource(scala.io.Source.fromInputStream(jar.getInputStream(dataEntry))(Codec.UTF8)) { source =>
          source.mkString.trim.replace('\n', '/')
        }
        val serviceText = Using.resource(scala.io.Source.fromInputStream(jar.getInputStream(serviceEntry))(Codec.UTF8)) { source =>
          source.mkString.trim
        }
        val attrs = jar.getManifest.getMainAttributes

        List(
          attrs.getValue("Scala-Smoke"),
          attrs.getValue("Multi-Release"),
          entries,
          dataText,
          serviceText,
          dataEntry.getSize.toString,
          (dataEntry.getCrc == crc.getValue).toString,
          (jar.getEntry("missing.txt") == null).toString
        ).mkString(":")
      } finally {
        jar.close()
      }

      val zipEntries = scala.collection.mutable.ListBuffer.empty[String]
      val zip = new ZipInputStream(Files.newInputStream(jarPath))
      try {
        var entry = zip.getNextEntry
        while (entry != null) {
          if (!entry.isDirectory) {
            val name = entry.getName
            val prefix =
              if (name == "pkg/data.txt") {
                val bytes = new Array[Byte](5)
                val read = zip.read(bytes)
                new String(bytes, 0, read, utf8)
              } else {
                name.takeWhile(_ != '/')
              }
            zipEntries += s"$name=$prefix"
          }
          zip.closeEntry()
          entry = zip.getNextEntry
        }
      } finally {
        zip.close()
      }
      val zipSummary = zipEntries.sorted.mkString(",")

      val loader = new URLClassLoader(Array(jarPath.toUri.toURL), null)
      val urlSummary = try {
        val dataUrl = loader.getResource("pkg/data.txt")
        val serviceUrl = loader.getResource("META-INF/services/example.Service")
        val dataText = Using.resource(scala.io.Source.fromInputStream(dataUrl.openStream())(Codec.UTF8)) { source =>
          source.mkString.trim.replace('\n', '/')
        }
        val serviceText = Using.resource(scala.io.Source.fromInputStream(serviceUrl.openStream())(Codec.UTF8)) { source =>
          source.mkString.trim
        }
        List(
          dataUrl.getProtocol,
          serviceUrl.getProtocol,
          dataText,
          serviceText,
          (loader.getResource("missing.txt") == null).toString
        ).mkString(":")
      } finally {
        loader.close()
      }

      jarSummary + "|" + zipSummary + "|" + urlSummary
    } finally {
      val stream = Files.walk(base)
      try {
        stream.iterator().asScala.toList.reverse.foreach(Files.deleteIfExists)
      } finally {
        stream.close()
      }
    }
  }
}
