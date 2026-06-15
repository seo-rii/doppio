import kotlin.reflect.KMutableProperty1
import kotlin.reflect.full.companionObjectInstance
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.memberFunctions
import kotlin.reflect.full.memberProperties
import kotlin.reflect.full.primaryConstructor
import kotlin.reflect.full.valueParameters

@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class ReflectTag(val value: String)

@ReflectTag("box")
data class ReflectSmokeBox(val name: String, var count: Int) {
  companion object {
    fun seed(name: String): ReflectSmokeBox = ReflectSmokeBox(name, 1)
  }

  @ReflectTag("render")
  fun render(prefix: String): String = "$prefix:$name:$count"
}

class ReflectDefaults(val prefix: String = "d", val amount: Int = 4) {
  fun join(suffix: String = "x", scale: Int = 2): String = "$prefix:$suffix:${amount * scale}"
}

sealed interface ReflectNode {
  val label: String
}

data object ReflectEmptyNode : ReflectNode {
  override val label: String = "empty"
}

data class ReflectValueNode(override val label: String, val weight: Int) : ReflectNode

fun main() {
  val kClass = ReflectSmokeBox::class
  val ctor = kClass.primaryConstructor!!
  val box = ctor.call("box", 2)
  @Suppress("UNCHECKED_CAST")
  val count = kClass.memberProperties.single { it.name == "count" } as KMutableProperty1<ReflectSmokeBox, Int>
  val names = kClass.memberProperties.map { it.name }.sorted().joinToString(",")
  count.set(box, 5)
  val render = kClass.memberFunctions.single { it.name == "render" }
  val companion = kClass.companionObjectInstance!!
  val seeded = companion::class.memberFunctions.single { it.name == "seed" }.call(companion, "seed") as ReflectSmokeBox
  val defaultsCtor = ReflectDefaults::class.primaryConstructor!!
  val defaults = defaultsCtor.callBy(emptyMap())
  val join = ReflectDefaults::class.memberFunctions.single { it.name == "join" }
  val receiver = join.parameters.first()
  val scale = join.valueParameters.single { it.name == "scale" }
  val sealedNames = ReflectNode::class.sealedSubclasses.map { it.simpleName ?: "?" }.sorted().joinToString(",")
  println(
    kClass.simpleName + "|" +
      names + "|" +
      count.get(box) + "|" +
      render.call(box, "r") + "|" +
      kClass.findAnnotation<ReflectTag>()!!.value + ":" +
      render.findAnnotation<ReflectTag>()!!.value + ":" +
      render.valueParameters.joinToString(",") { it.name ?: "?" } + "|" +
      seeded.render("s") + "|" +
      join.callBy(mapOf(receiver to defaults)) + "/" +
      join.callBy(mapOf(receiver to defaults, scale to 3)) + "|" +
      sealedNames + ":" + ReflectEmptyNode::class.objectInstance!!.label
  )
}
