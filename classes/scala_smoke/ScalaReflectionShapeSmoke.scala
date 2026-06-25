class ScalaReflectionShapeOwner(private val seed: Int) {
  class Member

  def memberClass(): Class[_] =
    classOf[ScalaReflectionShapeOwner#Member]

  def methodLocalClass(): Class[_] = {
    class MethodLocal
    classOf[MethodLocal]
  }

  def anonymousRunnableClass(): Class[_] =
    new Runnable {
      override def run(): Unit =
        require(seed >= 0)
    }.getClass
}

object ScalaReflectionShapeSmoke {
  def exercise(): String = {
    val owner = new ScalaReflectionShapeOwner(2)
    val member = owner.memberClass()
    val local = owner.methodLocalClass()
    val anonymous = owner.anonymousRunnableClass()
    val anonymousInterfaces = anonymous.getInterfaces.map(_.getSimpleName).sorted.mkString(",")
    List(
      List(
        "member",
        member.getSimpleName,
        member.getDeclaringClass.getSimpleName,
        member.getEnclosingClass.getSimpleName,
        "null",
        "-",
        member.isMemberClass.toString,
        member.isLocalClass.toString,
        member.isAnonymousClass.toString
      ).mkString("/"),
      List(
        "local",
        local.getSimpleName,
        "null",
        local.getEnclosingClass.getSimpleName,
        local.getEnclosingMethod.getName,
        "-",
        local.isMemberClass.toString,
        local.isLocalClass.toString,
        local.isAnonymousClass.toString
      ).mkString("/"),
      List(
        "anonymous",
        if (anonymous.getSimpleName.isEmpty) "_" else anonymous.getSimpleName,
        "null",
        anonymous.getEnclosingClass.getSimpleName,
        anonymous.getEnclosingMethod.getName,
        if (anonymousInterfaces.isEmpty) "-" else anonymousInterfaces,
        anonymous.isMemberClass.toString,
        anonymous.isLocalClass.toString,
        anonymous.isAnonymousClass.toString
      ).mkString("/")
    ).mkString("|")
  }
}
