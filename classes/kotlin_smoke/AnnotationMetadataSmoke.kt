import kotlin.reflect.KClass

enum class MetadataLevel { LOW, HIGH }

@Retention(AnnotationRetention.RUNTIME)
@Target(
  AnnotationTarget.CLASS,
  AnnotationTarget.FIELD,
  AnnotationTarget.FUNCTION,
  AnnotationTarget.VALUE_PARAMETER
)
@Repeatable
annotation class MultiTag(val value: String)

@Retention(AnnotationRetention.RUNTIME)
@Target(
  AnnotationTarget.CLASS,
  AnnotationTarget.FIELD,
  AnnotationTarget.FUNCTION,
  AnnotationTarget.VALUE_PARAMETER
)
annotation class RichTag(
  val name: String,
  val level: MetadataLevel = MetadataLevel.LOW,
  val owner: KClass<*>,
  val numbers: IntArray
)

@MultiTag("class-a")
@MultiTag("class-b")
@RichTag("class", MetadataLevel.HIGH, AnnotationMetadataOwner::class, [1, 2, 3])
class AnnotationMetadataOwner(
  @MultiTag("ctor-a")
  @MultiTag("ctor-b")
  @RichTag("ctor", owner = String::class, numbers = [4, 5])
  val seed: Int,
  @field:MultiTag("field-a")
  @field:MultiTag("field-b")
  @field:RichTag("field", owner = Int::class, numbers = [6])
  val label: String
) {
  @MultiTag("method-a")
  @MultiTag("method-b")
  @RichTag("method", owner = Long::class, numbers = [7, 8])
  fun combine(
    @MultiTag("arg-a")
    @MultiTag("arg-b")
    @RichTag("arg", owner = Double::class, numbers = [9])
    suffix: String
  ): String = label + suffix + seed
}

fun richSummary(tag: RichTag?): String {
  if (tag == null) return "missing"
  return tag.name + ":" + tag.level.name + ":" +
    tag.owner.java.simpleName + ":" + tag.numbers.joinToString(",")
}

fun multiSummary(values: Array<MultiTag>): String =
  values.map { it.value }.sorted().joinToString(",")

fun annotationMetadataSummary(): String {
  val clazz = AnnotationMetadataOwner::class.java
  val ctorParam = clazz.constructors.single().parameters.first()
  val field = clazz.getDeclaredField("label")
  val method = clazz.getDeclaredMethod("combine", String::class.java)
  val methodParam = method.parameters.single()
  val output = method.invoke(AnnotationMetadataOwner(3, "k"), "t").toString()
  return listOf(
    multiSummary(clazz.getAnnotationsByType(MultiTag::class.java)),
    richSummary(clazz.getAnnotation(RichTag::class.java)),
    multiSummary(ctorParam.getAnnotationsByType(MultiTag::class.java)),
    richSummary(ctorParam.getAnnotation(RichTag::class.java)),
    multiSummary(field.getAnnotationsByType(MultiTag::class.java)),
    richSummary(field.getAnnotation(RichTag::class.java)),
    multiSummary(method.getAnnotationsByType(MultiTag::class.java)),
    richSummary(method.getAnnotation(RichTag::class.java)),
    multiSummary(methodParam.getAnnotationsByType(MultiTag::class.java)),
    richSummary(methodParam.getAnnotation(RichTag::class.java)),
    output
  ).joinToString("|")
}
