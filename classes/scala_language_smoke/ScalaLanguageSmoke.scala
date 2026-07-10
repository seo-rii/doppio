import scala.annotation.switch
import scala.language.higherKinds

trait SmokeCodec[A] {
  def encode(value: A): String
}

trait SmokeFolder[F[_]] {
  def fold[A](items: F[A])(render: A => String): String
}

object ScalaLanguageSmoke {
  private final class Registry(private val prefix: String) {
    final class Entry(val name: String, val value: Int) {
      def withValue(nextValue: Int): Entry = new Entry(name, nextValue)
    }

    def entry(name: String, value: Int): Entry = new Entry(name, value)
    def render(entry: Entry): String = s"$prefix:${entry.name}${entry.value}"
  }

  private trait Labeled {
    def label: String
  }

  private trait LabelMath { self: Labeled =>
    def mark(value: Int): String = s"$label${value + label.length}"
  }

  private final class NamedOp(val label: String) extends Labeled with LabelMath

  private final class RichInt(private val value: Int) extends AnyVal {
    def tagged(prefix: String): String = s"$prefix${value * 3}"
  }

  private implicit def richInt(value: Int): RichInt = new RichInt(value)

  private object Digits {
    def unapply(text: String): Option[Int] =
      if (text.nonEmpty && text.forall(_.isDigit)) Some(text.toInt) else None
  }

  private implicit val intCodec: SmokeCodec[Int] = new SmokeCodec[Int] {
    override def encode(value: Int): String = s"i${value + 1}"
  }

  private implicit def optionCodec[A](implicit codec: SmokeCodec[A]): SmokeCodec[Option[A]] =
    new SmokeCodec[Option[A]] {
      override def encode(value: Option[A]): String =
        value.fold("none")(item => s"some(${codec.encode(item)})")
    }

  private implicit val vectorFolder: SmokeFolder[Vector] = new SmokeFolder[Vector] {
    override def fold[A](items: Vector[A])(render: A => String): String =
      items.map(render).mkString(",")
  }

  private def encodeAll[A](values: List[A])(implicit codec: SmokeCodec[A]): String =
    values.map(codec.encode).mkString("|")

  private def foldWith[F[_], A](items: F[A])(render: A => String)(implicit folder: SmokeFolder[F]): String =
    folder.fold(items)(render)

  private def byNameToken(): String = {
    var counter = 0
    def twice(seed: => Int): Int = {
      val first = seed
      val second = seed
      first + second
    }

    s"${twice { counter += 1; counter * 4 }}:$counter"
  }

  private def refinementToken(item: { def name: String; def value: Int }): String =
    s"${item.name.reverse}:${item.value.tagged("r")}"

  def exercise(): String = {
    val left = new Registry("L")
    val right = new Registry("R")
    val leftEntry: left.Entry = left.entry("a", 2).withValue(7)
    val dependent = s"${left.render(leftEntry)}:${right.render(right.entry("b", 3))}"

    val encoded = encodeAll(List(Some(1), None, Some(3)))
    val folded = foldWith(Vector("a", "bb", "ccc"))(text => s"${text.head}${text.length}")
    val marked = new NamedOp("op").mark(5)
    val byName = byNameToken()
    val refined = refinementToken(new { val name = "ref"; val value = 4 })
    val switched = List("12", "x", "7").map {
      case Digits(value) =>
        (value: @switch) match {
          case 7 => "seven"
          case 12 => "dozen"
          case other => s"n$other"
        }
      case other => s"s$other"
    }.mkString("/")

    s"$dependent:$encoded:$folded:$marked:$byName:$refined:$switched"
  }
}
