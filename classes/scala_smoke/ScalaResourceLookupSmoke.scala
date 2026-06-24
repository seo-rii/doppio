import java.net.URL
import scala.io.Codec
import scala.jdk.CollectionConverters._
import scala.util.Using

object ScalaResourceLookupSmoke {
  private val classLoaderResources =
    classOf[ClassLoader].getMethod("resources", classOf[String])

  private def read(url: URL): String = {
    Using.resource(scala.io.Source.fromInputStream(url.openStream())(Codec.UTF8)) { source =>
      source.mkString.trim.replace('\n', '/')
    }
  }

  private def readStream(loader: ClassLoader, name: String): String = {
    val stream = loader.getResourceAsStream(name)
    if (stream == null) {
      "missing"
    } else {
      Using.resource(scala.io.Source.fromInputStream(stream)(Codec.UTF8)) { source =>
        source.mkString.trim.replace('\n', '/')
      }
    }
  }

  private def resources(loader: ClassLoader, name: String): List[URL] = {
    val stream =
      classLoaderResources.invoke(loader, name).asInstanceOf[java.util.stream.Stream[URL]]
    try {
      stream.iterator().asScala.toList
    } finally {
      stream.close()
    }
  }

  def exercise(): String = {
    val loader = getClass.getClassLoader
    val dataName = "scalasmoke/resources/runtime.txt"
    val duplicateName = "scalasmoke/resources/duplicate.txt"

    val classUrl = getClass.getResource("/ScalaResourceLookupSmoke$.class")
    val classLoaderUrl = loader.getResource("ScalaResourceLookupSmoke$.class")
    val classDataUrl = getClass.getResource("/" + dataName)
    val loaderDataUrl = loader.getResource(dataName)
    val rootUrl = ClassLoader.getSystemResource("scala-root-resource.txt")
    val enumDuplicateUrls = loader.getResources(duplicateName).asScala.toList
    val streamDuplicateUrls = resources(loader, duplicateName)

    val dataText = read(loaderDataUrl)
    val classDataText = read(classDataUrl)
    val streamDataText = readStream(loader, dataName)
    val duplicateText = enumDuplicateUrls.map(read).mkString(">")
    val streamDuplicateText = streamDuplicateUrls.map(read).mkString(">")

    List(
      dataText,
      read(rootUrl),
      duplicateText,
      streamDuplicateText,
      enumDuplicateUrls.size.toString + "/" + streamDuplicateUrls.size.toString,
      (classUrl != null).toString,
      (classLoaderUrl != null).toString,
      (dataText == classDataText).toString,
      (dataText == streamDataText).toString,
      (loader.getResource("scalasmoke/resources/missing.txt") == null).toString,
      (loader.getResourceAsStream("scalasmoke/resources/missing.txt") == null).toString
    ).mkString("res:", ":", "")
  }
}
