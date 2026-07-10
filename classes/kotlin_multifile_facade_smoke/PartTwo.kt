@file:JvmName("FacadeSmoke")
@file:JvmMultifileClass

package smoke.multifile

fun partTwoToken(first: Int, second: Int): String =
  "${sharedName(first)}.${sharedName(second)}"

fun multifileFacadeSummary(): String {
  val facade = Class.forName("smoke.multifile.FacadeSmoke")
  val hasFacadeMethods =
    facade.getMethod("partOneToken", String::class.java) != null &&
      facade.getMethod("partTwoToken", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType) != null
  return "${partOneToken("abc")}:${partTwoToken(2, 3)}:${privateBridgeToken(4)}:${facade.simpleName}:$hasFacadeMethods"
}
