import java.util.Collections

class ResourceLookupMarker

fun resourceLookupSummary(): String {
  val markerClass = ResourceLookupMarker::class.java
  val markerResource = markerClass.name.replace('.', '/') + ".class"
  val loader = markerClass.classLoader ?: ClassLoader.getSystemClassLoader()
  val oldContext = Thread.currentThread().contextClassLoader

  Thread.currentThread().contextClassLoader = loader
  try {
    val classUrl = requireNotNull(loader.getResource(markerResource)) { markerResource }
    val relativeUrl = markerClass.getResource("ResourceLookupMarker.class")
    val absoluteUrl = markerClass.getResource("/$markerResource")
    val contextUrl = Thread.currentThread().contextClassLoader.getResource(markerResource)
    val systemUrl = ClassLoader.getSystemResource(markerResource)
    val moduleUrl = loader.getResource("META-INF/main.kotlin_module")
    val missing = loader.getResource("missing/resource-lookup-smoke.txt") == null

    val header = classUrl.openStream().use { input ->
      val bytes = ByteArray(4)
      val count = input.read(bytes)
      "$count:" + bytes.joinToString("") { byte ->
        "%02x".format(byte.toInt() and 0xff)
      }
    }
    val classResources = Collections.list(loader.getResources(markerResource))
    val moduleResources = Collections.list(loader.getResources("META-INF/main.kotlin_module"))
    val protocols = listOf(classUrl, relativeUrl, absoluteUrl, contextUrl, systemUrl, moduleUrl)
      .joinToString("") { url ->
        when (url?.protocol) {
          "file" -> "f"
          "jar" -> "j"
          null -> "_"
          else -> "?"
        }
      }

    return protocols + "|" +
      header + "|" +
      "${classResources.size}:${moduleResources.size}:${missing}" + "|" +
      (classUrl.toExternalForm() == relativeUrl?.toExternalForm()) + ":" +
      (classUrl.toExternalForm() == absoluteUrl?.toExternalForm()) + ":" +
      (classUrl.toExternalForm() == contextUrl?.toExternalForm())
  } finally {
    Thread.currentThread().contextClassLoader = oldContext
  }
}
