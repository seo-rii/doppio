import kotlin.reflect.KProperty

class PrefixDelegate(private val prefix: String) {
  operator fun getValue(thisRef: Any?, property: KProperty<*>): String {
    val owner = thisRef?.javaClass?.simpleName ?: "top"
    return "$prefix:${property.name}:$owner"
  }
}

class DelegatedOwner {
  val answer by PrefixDelegate("delegate")
}

fun delegateSummary(): String {
  val local by PrefixDelegate("local")
  return DelegatedOwner().answer + "|" + local
}
