import scala.collection.mutable.ListBuffer

object ScalaNonLocalReturnSmoke {
  private def firstEven(values: List[Int], events: ListBuffer[String]): Int =
    try {
      values.foreach { value =>
        events += s"n$value"
        if ((value & 1) == 0) return value
      }
      -1
    } finally {
      events += "finally"
    }

  private def run(values: List[Int]): String = {
    val events = ListBuffer.empty[String]
    val result = firstEven(values, events)
    s"$result:${events.mkString(">")}"
  }

  def summary(): String = run(List(1, 4, 6)) + "/" + run(List(1, 3))
}
