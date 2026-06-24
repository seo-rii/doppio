import java.util.ServiceLoader
import scala.jdk.CollectionConverters._

trait ScalaServiceLookupPlugin {
  def name: String
  def score(seed: Int): Int
}

final class AlphaScalaServiceLookupPlugin extends ScalaServiceLookupPlugin {
  override def name: String = "alpha"
  override def score(seed: Int): Int = seed + 7
}

final class BetaScalaServiceLookupPlugin extends ScalaServiceLookupPlugin {
  override def name: String = "beta"
  override def score(seed: Int): Int = seed + 11
}

object ScalaServiceLoaderSmoke {
  private def render(plugins: List[ScalaServiceLookupPlugin]): String = {
    plugins.map(plugin => s"${plugin.name}=${plugin.score(0)}").mkString(",")
  }

  def exercise(): String = {
    val loader = ServiceLoader.load(classOf[ScalaServiceLookupPlugin])
    val first = loader.iterator().asScala.toList
    loader.reload()
    val second = loader.iterator().asScala.toList

    List(
      render(first),
      first.size.toString,
      render(second),
      second.map(_.getClass.getSimpleName).mkString(">"),
      (first.map(_.getClass.getName) == second.map(_.getClass.getName)).toString
    ).mkString("svc:", ":", "")
  }
}
