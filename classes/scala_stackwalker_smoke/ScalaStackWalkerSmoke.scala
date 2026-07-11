import java.lang.StackWalker

object ScalaStackWalkerSmoke {
  def exercise(): String = outer("scala")

  private def outer(seed: String): String = leaf(seed.length)

  private def leaf(value: Int): String = {
    val retain = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE)
    val frames = retain.walk[String] { stream =>
      val iterator = stream.iterator()
      val parts = new java.util.ArrayList[String]()
      while (iterator.hasNext && parts.size() < 3) {
        val frame = iterator.next()
        if (frame.getClassName.contains("ScalaStackWalkerSmoke")) {
          parts.add(
            frame.getMethodName + ":" +
              frame.getDescriptor + ":" +
              frame.getMethodType.toMethodDescriptorString + ":" +
              frame.getDeclaringClass.getSimpleName)
        }
      }
      joinParts(parts)
    }
    val callerClassMatches = retain.getCallerClass.getSimpleName == "ScalaStackWalkerSmoke$"
    val forEachParts = new java.util.ArrayList[String]()
    retain.forEach { frame =>
      if (frame.getClassName.contains("ScalaStackWalkerSmoke") && forEachParts.size() < 2) {
        forEachParts.add(frame.getMethodName)
      }
    }

    val noRetain = StackWalker.getInstance().walk[StackWalker.StackFrame] { stream =>
      val iterator = stream.iterator()
      var found: StackWalker.StackFrame = null
      while (iterator.hasNext && found == null) {
        val frame = iterator.next()
        if (frame.getMethodName == "leaf") {
          found = frame
        }
      }
      if (found == null) throw new IllegalStateException("missing leaf frame")
      found
    }
    val methodTypeGuard =
      try {
        noRetain.getMethodType
        "missing"
      } catch {
        case e: UnsupportedOperationException => e.getClass.getSimpleName
      }

    value + ":" + frames + ":" + noRetain.getDescriptor + ":" + methodTypeGuard + ":" +
      callerClassMatches + ":" + joinParts(forEachParts)
  }

  private def joinParts(parts: java.util.ArrayList[String]): String = {
    val builder = new StringBuilder
    var i = 0
    while (i < parts.size()) {
      if (i > 0) builder.append("|")
      builder.append(parts.get(i))
      i += 1
    }
    builder.toString()
  }
}
