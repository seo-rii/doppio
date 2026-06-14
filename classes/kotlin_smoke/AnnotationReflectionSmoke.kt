@Retention(AnnotationRetention.RUNTIME)
@Target(
  AnnotationTarget.CLASS,
  AnnotationTarget.FIELD,
  AnnotationTarget.PROPERTY_GETTER,
  AnnotationTarget.VALUE_PARAMETER,
  AnnotationTarget.FUNCTION
)
annotation class RuntimeSmokeTag(val value: String)

@RuntimeSmokeTag("class")
class AnnotatedSmokeOwner(
  @param:RuntimeSmokeTag("ctor")
  val seed: Int,
  @field:RuntimeSmokeTag("field")
  @get:RuntimeSmokeTag("getter")
  val label: String
) {
  @RuntimeSmokeTag("method")
  fun combine(@RuntimeSmokeTag("arg") suffix: String): String = label + suffix + seed
}

fun annotationReflectionSummary(): String {
  val clazz = AnnotatedSmokeOwner::class.java
  val classTag = clazz.getAnnotation(RuntimeSmokeTag::class.java)?.value ?: "missing-class"
  val fieldTag = clazz.getDeclaredField("label").getAnnotation(RuntimeSmokeTag::class.java)?.value ?: "missing-field"
  val getterTag = clazz.getDeclaredMethod("getLabel").getAnnotation(RuntimeSmokeTag::class.java)?.value ?: "missing-getter"
  val ctorParamTags = clazz.constructors.single().parameters.joinToString(",") { parameter ->
    parameter.getAnnotation(RuntimeSmokeTag::class.java)?.value ?: "_"
  }
  val method = clazz.getDeclaredMethod("combine", String::class.java)
  val methodTag = method.getAnnotation(RuntimeSmokeTag::class.java)?.value ?: "missing-method"
  val methodParamTag = method.parameters.single().getAnnotation(RuntimeSmokeTag::class.java)?.value ?: "missing-arg"
  val methodOutput = method.invoke(AnnotatedSmokeOwner(3, "k"), "t").toString()
  return classTag + ":" +
      fieldTag + ":" +
      getterTag + ":" +
      ctorParamTags + ":" +
      methodTag + ":" +
      methodParamTag + ":" +
      methodOutput
}
