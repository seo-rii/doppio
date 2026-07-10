@file:JvmName("FacadeSmoke")
@file:JvmMultifileClass

package smoke.multifile

private const val PREFIX = "mf"

fun sharedName(value: Int): String = "$PREFIX$value"

private fun privateToken(value: Int): String = "p${value * 2}"

fun partOneToken(input: String = "a"): String = sharedName(input.length + 1)

fun privateBridgeToken(value: Int): String = privateToken(value)
