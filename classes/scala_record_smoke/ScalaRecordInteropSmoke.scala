import java.util.Arrays
import java.util.List

object ScalaRecordInteropSmoke {
  def main(args: Array[String]): Unit = {
    val value = new RecordInteropBox("scala", 7, Arrays.asList("a", "bb"))
    val cls = classOf[RecordInteropBox]
    val components = RecordInteropSupport.components(cls)
    val componentSummary = components.map { component =>
      RecordInteropSupport.componentName(component) + ":" +
        RecordInteropSupport.componentTypeName(component) + ":" +
        RecordInteropSupport.componentGenericSignature(component) + ":" +
        RecordInteropSupport.componentValue(component, value)
    }.mkString(",")
    val constructor = cls.getDeclaredConstructor(
      classOf[String],
      java.lang.Integer.TYPE,
      classOf[List[_]]
    )
    val created = constructor.newInstance("rx", Int.box(4), Arrays.asList("z"))
      .asInstanceOf[RecordInteropBox]
    val same = new RecordInteropBox("scala", 7, value.tags())
    println(
      RecordInteropSupport.isRecord(cls).toString + "|" +
        cls.getSuperclass.getSimpleName + "|" +
        components.length + "|" +
        value.render() + "|" +
        value.name() + "|" +
        value.count() + "|" +
        value.tags().toArray.mkString("-") + "|" +
        componentSummary + "|" +
        created.render() + "|" +
        value.toString.contains("name=scala") + "|" +
        (value == same)
    )
  }
}
