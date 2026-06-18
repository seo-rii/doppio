sealed trait SmokeStage {
  def label: String
}

case object ParseStage extends SmokeStage {
  override val label: String = "parse"
}

case object RunStage extends SmokeStage {
  override val label: String = "run"
}

final case class SmokeBox[A](name: String, value: A) {
  def map[B](f: A => B): SmokeBox[B] = SmokeBox(name, f(value))
}

trait Formatter[-A] {
  def format(value: A): String = s"value=$value"
}

object Hello {
  private val formatter: Formatter[Int] = new Formatter[Int] {
    override def format(value: Int): String = s"i=${value + 1}"
  }

  def main(args: Array[String]): Unit = {
    val numbers = List(1, 2, 3, 5)
    val folded = numbers.zipWithIndex.map { case (n, i) => n * (i + 1) }.sum
    val box = SmokeBox("scala", folded).map(_ + 4)
    val stages = List(ParseStage, RunStage).map(_.label).mkString(">")
    val option = Option(box.value).filter(_ > 20).map(formatter.format).getOrElse("missing")
    val either = Right(box.name).map(_.toUpperCase).fold(_ => "bad", identity)
    println(s"${box.name}:${box.value}:$stages:$option:$either")
  }
}
