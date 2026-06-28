import java.util.ServiceLoader

interface ServiceLookupPlugin {
  fun key(): String
  fun weight(): Int
}

class AlphaServiceLookupPlugin : ServiceLookupPlugin {
  override fun key(): String = "alpha"
  override fun weight(): Int = 7
}

class BetaServiceLookupPlugin : ServiceLookupPlugin {
  override fun key(): String = "beta"
  override fun weight(): Int = 11
}

fun serviceLoaderSummary(): String {
  val loader = ServiceLoader.load(
    ServiceLookupPlugin::class.java,
    ServiceLookupPlugin::class.java.classLoader
  )
  val first = loader.iterator().asSequence().toList()
  loader.reload()
  val second = loader.iterator().asSequence().toList()

  val firstSummary = first.joinToString(",") { service ->
    "${service.key()}=${service.weight()}"
  }
  val secondSummary = second.joinToString(",") { service ->
    "${service.key()}=${service.weight()}"
  }
  val providerTypes = first.joinToString(">") { service ->
    service::class.java.simpleName
  }

  return firstSummary + "|" +
    first.size + "|" +
    secondSummary + "|" +
    providerTypes + "|" +
    (first.isNotEmpty() && second.isNotEmpty() && first[0] !== second[0])
}
