import scala.language.experimental.macros
import scala.reflect.macros.blackbox

object ScalaMacroSmoke {
  def twice(value: Int): Int = macro twiceImpl

  def twiceImpl(c: blackbox.Context)(value: c.Expr[Int]): c.Expr[Int] = {
    import c.universe._

    c.Expr[Int](q"$value + $value")
  }

  def tagged(value: String): String = macro taggedImpl

  def taggedImpl(c: blackbox.Context)(value: c.Expr[String]): c.Expr[String] = {
    import c.universe._

    c.Expr[String](q""""macro:" + $value.reverse""")
  }
}
