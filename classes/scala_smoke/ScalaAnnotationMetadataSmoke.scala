@ScalaMultiTag("class-a")
@ScalaMultiTag("class-b")
@ScalaRichTag(
  name = "class",
  level = ScalaTagLevel.HIGH,
  owner = classOf[ScalaAnnotationMetadataOwner],
  numbers = Array(1, 2, 3))
final class ScalaAnnotationMetadataOwner(val seed: Int) {
  @ScalaMultiTag("method-a")
  @ScalaMultiTag("method-b")
  @ScalaRichTag(
    name = "method",
    owner = classOf[java.lang.Long],
    numbers = Array(7, 8))
  def combine(
      @ScalaMultiTag("arg-a")
      @ScalaMultiTag("arg-b")
      @ScalaRichTag(
        name = "arg",
        owner = classOf[java.lang.Double],
        numbers = Array(9))
      suffix: String): String =
    suffix + seed
}

object ScalaAnnotationMetadataSmoke {
  private def multiSummary(values: Array[ScalaMultiTag]): String =
    values.map(_.value()).sorted.mkString(",")

  private def richSummary(tag: ScalaRichTag): String =
    if (tag == null) "missing"
    else {
      val ownerName = tag.owner().getSimpleName
      val numbers = tag.numbers().mkString(",")
      s"${tag.name()}:${tag.level().name()}:$ownerName:$numbers"
    }

  def exercise(): String = {
    val clazz = classOf[ScalaAnnotationMetadataOwner]
    val method = clazz.getDeclaredMethod("combine", classOf[String])
    val parameter = method.getParameters()(0)
    val rawParameterTags = method.getParameterAnnotations()(0).flatMap {
      case tag: ScalaMultiTag => Array(tag.value())
      case tags: ScalaMultiTags => tags.value().map(_.value())
      case _ => Array.empty[String]
    }.sorted.mkString(",")
    val output = method.invoke(new ScalaAnnotationMetadataOwner(3), "kt").toString

    List(
      multiSummary(clazz.getAnnotationsByType(classOf[ScalaMultiTag])),
      richSummary(clazz.getAnnotation(classOf[ScalaRichTag])),
      multiSummary(method.getAnnotationsByType(classOf[ScalaMultiTag])),
      richSummary(method.getAnnotation(classOf[ScalaRichTag])),
      multiSummary(parameter.getAnnotationsByType(classOf[ScalaMultiTag])),
      richSummary(parameter.getAnnotation(classOf[ScalaRichTag])),
      rawParameterTags,
      output
    ).mkString("|")
  }
}
