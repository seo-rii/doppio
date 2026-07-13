trait RootToken {
  def token: String = "A"
}

trait LeftToken extends RootToken {
  abstract override def token: String = super.token + "B"
}

trait RightToken extends RootToken {
  abstract override def token: String = super.token + "C"
}

final class LeftThenRightTokenOwner extends RootToken with LeftToken with RightToken

final class RightThenLeftTokenOwner extends RootToken with RightToken with LeftToken

object ScalaTraitLinearizationSmoke {
  def summary(): String =
    new LeftThenRightTokenOwner().token + "/" +
      new RightThenLeftTokenOwner().token
}
