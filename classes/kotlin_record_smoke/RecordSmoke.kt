import kotlin.jvm.JvmRecord

@JvmRecord
data class KtRecordBox(
  val name: String,
  val count: Int,
  val tags: List<String>
) {
  fun render(): String = "$name:${count + tags.size}"
}

fun main() {
  val value = KtRecordBox("kt", 3, listOf("a", "bb"))
  val cls = KtRecordBox::class.java
  val isRecord = RecordSmokeSupport.isRecord(cls)
  val components = RecordSmokeSupport.components(cls)
  val componentSummary = components.joinToString(",") { component ->
    RecordSmokeSupport.componentName(component) + ":" +
      RecordSmokeSupport.componentTypeName(component) + ":" +
      RecordSmokeSupport.componentGenericSignature(component) + ":" +
      RecordSmokeSupport.componentValue(component, value)
  }
  val constructor = cls.getDeclaredConstructor(
    String::class.java,
    Int::class.javaPrimitiveType,
    List::class.java
  )
  val created = constructor.newInstance("rx", 4, listOf("z"))
  println(
    isRecord.toString() + "|" +
      cls.superclass.simpleName + "|" +
      components.size + "|" +
      value.render() + "|" +
      value.name + "|" +
      value.count + "|" +
      value.tags.joinToString("-") + "|" +
      componentSummary + "|" +
      created.render() + "|" +
      value.toString().contains("name=kt") + "|" +
      (value == KtRecordBox("kt", 3, listOf("a", "bb")))
  )
}
