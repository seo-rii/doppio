object ScalaMacroUseSmoke {
  def exercise(): String = {
    val doubled = ScalaMacroSmoke.twice(11)
    val tagged = ScalaMacroSmoke.tagged("sc")

    s"m$doubled:$tagged"
  }
}
