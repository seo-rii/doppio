import scala.reflect.runtime.universe._

object ScalaReflectSmoke {
  private final case class ReflectBox(name: String, value: Int)

  def exercise(): String = {
    val mirror = runtimeMirror(getClass.getClassLoader)
    val symbol = typeOf[ReflectBox].typeSymbol.asClass
    val primary = typeOf[ReflectBox].decl(termNames.CONSTRUCTOR).asMethod
    val accessors = typeOf[ReflectBox].members
      .collect {
        case method: MethodSymbol if method.isCaseAccessor => method.name.decodedName.toString
      }
      .toList
      .sorted
      .mkString("/")
    val reflected = mirror.staticClass("ScalaReflectSmoke.ReflectBox")

    s"${symbol.name.decodedName}:${primary.paramLists.flatten.size}:$accessors:${reflected.isCaseClass}"
  }
}
