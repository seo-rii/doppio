import kotlin.reflect.KProperty

class BindingProvider(private val tag: String) {
  operator fun provideDelegate(thisRef: Any?, property: KProperty<*>): MutableBinding {
    val owner = thisRef?.javaClass?.simpleName ?: "top"
    return MutableBinding("$tag:${property.name}:$owner")
  }
}

class MutableBinding(private val label: String) {
  private var stored: Int = 0

  operator fun getValue(thisRef: Any?, property: KProperty<*>): String {
    return "$label:${property.name}:$stored"
  }

  operator fun setValue(thisRef: Any?, property: KProperty<*>, value: String) {
    val owner = thisRef?.javaClass?.simpleName ?: "top"
    stored += value.length + property.name.length + owner.length
  }
}

class MutableDelegateOwner {
  var primary by BindingProvider("bind")
  var secondary by BindingProvider("alt")

  fun mutate(): String {
    val before = primary
    primary = "abc"
    secondary = "z"
    return before + "|" + primary + "|" + secondary
  }
}

fun mutableDelegateSummary(): String {
  val owner = MutableDelegateOwner()
  var local by BindingProvider("local")
  val localBefore = local
  local = "xy"
  return owner.mutate() + "|" + localBefore + "|" + local
}
