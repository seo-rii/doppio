import kotlin.reflect.KMutableProperty1
import kotlin.reflect.full.memberFunctions
import kotlin.reflect.full.memberProperties
import kotlin.reflect.full.primaryConstructor

data class ReflectSmokeBox(val name: String, var count: Int) {
  fun render(prefix: String): String = "$prefix:$name:$count"
}

fun main() {
  val kClass = ReflectSmokeBox::class
  val ctor = kClass.primaryConstructor!!
  val box = ctor.call("box", 2)
  @Suppress("UNCHECKED_CAST")
  val count = kClass.memberProperties.single { it.name == "count" } as KMutableProperty1<ReflectSmokeBox, Int>
  val names = kClass.memberProperties.map { it.name }.sorted().joinToString(",")
  count.set(box, 5)
  val render = kClass.memberFunctions.single { it.name == "render" }
  println(kClass.simpleName + "|" + names + "|" + count.get(box) + "|" + render.call(box, "r"))
}
