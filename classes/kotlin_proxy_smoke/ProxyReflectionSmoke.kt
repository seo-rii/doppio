import java.lang.reflect.InvocationHandler
import java.lang.reflect.Proxy

@Retention(AnnotationRetention.RUNTIME)
@Target(
  AnnotationTarget.CLASS,
  AnnotationTarget.FUNCTION,
  AnnotationTarget.VALUE_PARAMETER
)
annotation class ProxyReflectionTag(val value: String)

@ProxyReflectionTag("iface")
interface ProxyReflectionService {
  val label: String

  @ProxyReflectionTag("transform")
  fun transform(@ProxyReflectionTag("value") value: String, amount: Int): String

  fun maybe(value: String?): String?
}

fun proxyReflectionSummary(): String {
  val events = mutableListOf<String>()
  val serviceInterface = ProxyReflectionService::class.java
  val handler = InvocationHandler { proxy, method, args ->
    events += method.name + ":" + (args?.size ?: 0)
    when (method.name) {
      "getLabel" -> "dyn"
      "transform" -> (args!![0] as String).uppercase() + ((args[1] as Int) + 1)
      "maybe" -> args?.get(0)?.toString()?.reversed()
      "toString" -> "ProxyReflectionService(dyn)"
      "hashCode" -> 321
      "equals" -> proxy === args?.get(0)
      else -> throw UnsupportedOperationException(method.name)
    }
  }
  val service = Proxy.newProxyInstance(
    serviceInterface.classLoader,
    arrayOf(serviceInterface),
    handler
  ) as ProxyReflectionService
  val transform = serviceInterface.getMethod("transform", String::class.java, java.lang.Integer.TYPE)
  val classTag = serviceInterface.getAnnotation(ProxyReflectionTag::class.java)?.value ?: "missing-class"
  val methodTag = transform.getAnnotation(ProxyReflectionTag::class.java)?.value ?: "missing-method"
  val parameterTag = transform.parameters.first().getAnnotation(ProxyReflectionTag::class.java)?.value ?: "missing-arg"
  val reflected = transform.invoke(service, "xy", 2).toString()

  return listOf(
    classTag + "/" + methodTag + "/" + parameterTag,
    service.label,
    service.transform("kt", 4),
    reflected,
    service.maybe("abc") ?: "null",
    service.maybe(null) ?: "null",
    service.toString(),
    service.hashCode().toString(),
    (service == service).toString(),
    Proxy.isProxyClass(service.javaClass).toString(),
    (Proxy.getInvocationHandler(service) === handler).toString(),
    events.joinToString(",")
  ).joinToString("|")
}
