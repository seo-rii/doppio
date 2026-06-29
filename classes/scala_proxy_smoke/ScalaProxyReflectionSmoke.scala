import java.lang.reflect.{InvocationHandler, Proxy}
import java.util.Locale

@ScalaProxyTag("iface")
trait ScalaProxyService {
  def label: String

  @ScalaProxyTag("transform")
  def transform(@ScalaProxyTag("value") value: String, amount: Int): String

  def maybe(value: String): String
}

object ScalaProxyReflectionSmoke {
  private def tagValue(annotation: ScalaProxyTag): String =
    if (annotation == null) "missing" else annotation.value()

  def exercise(): String = {
    val events = scala.collection.mutable.ArrayBuffer.empty[String]
    val serviceInterface = classOf[ScalaProxyService]
    val handler = new InvocationHandler {
      override def invoke(proxy: AnyRef, method: java.lang.reflect.Method, args: Array[AnyRef]): AnyRef = {
        val argCount = if (args == null) 0 else args.length
        events += s"${method.getName}:$argCount"
        method.getName match {
          case "label" => "dyn"
          case "transform" =>
            args(0).asInstanceOf[String].toUpperCase(Locale.ROOT) +
              (args(1).asInstanceOf[Integer].intValue() + 1).toString
          case "maybe" =>
            if (args == null || args(0) == null) null else args(0).toString.reverse
          case "toString" => "ScalaProxyService(dyn)"
          case "hashCode" => Integer.valueOf(654)
          case "equals" => java.lang.Boolean.valueOf(proxy eq args(0))
          case other => throw new UnsupportedOperationException(other)
        }
      }
    }
    val service = Proxy.newProxyInstance(
      serviceInterface.getClassLoader,
      Array[Class[_]](serviceInterface),
      handler).asInstanceOf[ScalaProxyService]
    val transform = serviceInterface.getMethod("transform", classOf[String], java.lang.Integer.TYPE)
    val reflected = transform.invoke(service, "xy", Integer.valueOf(2)).toString
    val parameterTag = transform.getParameterAnnotations()(0).collectFirst {
      case tag: ScalaProxyTag => tag.value()
    }.getOrElse("missing-arg")

    List(
      tagValue(serviceInterface.getAnnotation(classOf[ScalaProxyTag])),
      tagValue(transform.getAnnotation(classOf[ScalaProxyTag])),
      parameterTag,
      service.label,
      service.transform("sc", 4),
      reflected,
      Option(service.maybe("abc")).getOrElse("null"),
      Option(service.maybe(null)).getOrElse("null"),
      service.toString,
      service.hashCode().toString,
      (service == service).toString,
      Proxy.isProxyClass(service.getClass).toString,
      (Proxy.getInvocationHandler(service) eq handler).toString,
      events.mkString(",")
    ).mkString(":")
  }
}
