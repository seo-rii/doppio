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

sealed trait SmokeExpr

final case class Lit(value: Int) extends SmokeExpr

final case class Add(left: SmokeExpr, right: SmokeExpr) extends SmokeExpr

case object ZeroExpr extends SmokeExpr

object AdvancedScalaSmoke {
  private lazy val offset: Int = List(2, 4, 6).sum

  private val classifier: PartialFunction[Any, String] = {
    case s: String if s.nonEmpty => s.take(2)
    case n: Int if n % 2 == 0 => s"even$n"
  }

  private def eval(expr: SmokeExpr): Int = expr match {
    case Lit(value) if value > 0 => value
    case Lit(value) => -value
    case Add(left, right) => eval(left) + eval(right)
    case ZeroExpr => 0
  }

  def exercise(seed: Int): String = {
    val matched = eval(Add(Lit(seed), Add(ZeroExpr, Lit(-3)))) + offset
    val generated = for {
      n <- Vector(1, 2, 3, 4)
      if n % 2 == 0
      value <- Option(n + matched)
    } yield value
    val collected = Map("a" -> 1, "bb" -> 2).collect {
      case (key, value) if key.length == value => key -> (value + generated.sum)
    }
    val partial = List("scala", 4, "", 5).collect(classifier).mkString("|")
    val guarded = try {
      if (seed < 0) throw new IllegalArgumentException("negative")
      generated.sum / 2
    } catch {
      case _: IllegalArgumentException => -1
    } finally {
      ()
    }

    (collected.keys.toList.sorted, partial, guarded) match {
      case (keys, labels, value) => s"${keys.mkString(",")}:$labels:$value:$offset"
    }
  }
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
    val advanced = AdvancedScalaSmoke.exercise(7)
    val library = ScalaLibrarySmoke.exercise()
    val collections = ScalaCollectionSmoke.exercise()
    val interop = ScalaInteropSmoke.exercise()
    val reflection = scalasmoke.ScalaPackageReflectionSmoke.exercise()
    val scalaReflect = ScalaReflectSmoke.exercise()
    val functional = ScalaFunctionalSmoke.exercise()
    val macroUse = ScalaMacroUseSmoke.exercise()
    val stackWalker = ScalaStackWalkerSmoke.exercise()
    println(s"${box.name}:${box.value}:$stages:$option:$either:$advanced:$library:$collections:$interop:$reflection:$scalaReflect:$functional:$macroUse:$stackWalker")
  }
}
