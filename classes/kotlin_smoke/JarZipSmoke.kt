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

fun jarZipSummary(): String {
  val base = Paths.get("build", "kotlin-smoke", "runtime-jarzip")
  if (Files.exists(base)) {
    base.toFile().deleteRecursively()
  }
  Files.createDirectories(base)
  val jarPath = base.resolve("lookup.jar")
  val utf8 = StandardCharsets.UTF_8
  val dataBytes = "alpha\nbeta\n".toByteArray(utf8)
  val serviceBytes = "pkg.Provider\n".toByteArray(utf8)
  val versionBytes = "version17\n".toByteArray(utf8)

  val manifest = Manifest()
  manifest.mainAttributes[Attributes.Name.MANIFEST_VERSION] = "1.0"
  manifest.mainAttributes.putValue("Kotlin-Smoke", "jarzip")
  manifest.mainAttributes.putValue("Multi-Release", "false")

  JarOutputStream(Files.newOutputStream(jarPath), manifest).use { jar ->
    val dataEntry = JarEntry("pkg/data.txt")
    dataEntry.comment = "payload"
    jar.putNextEntry(dataEntry)
    jar.write(dataBytes)
    jar.closeEntry()

    jar.putNextEntry(JarEntry("META-INF/services/example.Service"))
    jar.write(serviceBytes)
    jar.closeEntry()

    jar.putNextEntry(JarEntry("META-INF/versions/17/pkg/data.txt"))
    jar.write(versionBytes)
    jar.closeEntry()
  }

  val crc = CRC32()
  crc.update(dataBytes)

  val jarSummary = JarFile(jarPath.toFile()).use { jar ->
    val entries = Collections.list(jar.entries())
      .filter { entry -> !entry.isDirectory }
      .map { entry -> entry.name }
      .sorted()
      .joinToString(",")
    val dataEntry = requireNotNull(jar.getJarEntry("pkg/data.txt"))
    val serviceEntry = requireNotNull(jar.getJarEntry("META-INF/services/example.Service"))
    val dataText = jar.getInputStream(dataEntry).use { input ->
      String(input.readBytes(), utf8).trim().replace('\n', '/')
    }
    val serviceText = jar.getInputStream(serviceEntry).use { input ->
      String(input.readBytes(), utf8).trim()
    }
    val attrs = jar.manifest.mainAttributes

    attrs.getValue("Kotlin-Smoke") + ":" +
      attrs.getValue("Multi-Release") + ":" +
      entries + ":" +
      dataText + ":" +
      serviceText + ":" +
      dataEntry.size + ":" +
      dataEntry.crc.toString(16) + ":" +
      crc.value.toString(16) + ":" +
      (jar.getEntry("missing.txt") == null)
  }

  val zipEntries = mutableListOf<String>()
  ZipInputStream(Files.newInputStream(jarPath)).use { zip ->
    while (true) {
      val entry = zip.nextEntry ?: break
      if (!entry.isDirectory) {
        val prefix = if (entry.name == "pkg/data.txt") {
          String(zip.readBytes(), utf8).take(5)
        } else {
          entry.name.substringBefore('/')
        }
        zipEntries += entry.name + "=" + prefix
      }
      zip.closeEntry()
    }
  }
  val zipSummary = zipEntries.sorted().joinToString(",")

  val urlSummary = URLClassLoader(arrayOf(jarPath.toUri().toURL()), null).use { loader ->
    val dataUrl = requireNotNull(loader.getResource("pkg/data.txt"))
    val serviceUrl = requireNotNull(loader.getResource("META-INF/services/example.Service"))
    val dataText = dataUrl.openStream().use { input ->
      String(input.readBytes(), utf8).trim().replace('\n', '/')
    }
    val serviceText = serviceUrl.openStream().use { input ->
      String(input.readBytes(), utf8).trim()
    }
    dataUrl.protocol + ":" +
      serviceUrl.protocol + ":" +
      dataText + ":" +
      serviceText + ":" +
      (loader.getResource("missing.txt") == null)
  }

  return jarSummary + "|" + zipSummary + "|" + urlSummary
}
