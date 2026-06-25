class ReflectionShapeOwner(private val seed: Int) {
  class Nested

  inner class Inner

  companion object {
    fun companionLocalClass(): Class<*> {
      class CompanionLocal
      return CompanionLocal::class.java
    }
  }

  fun methodLocalClass(): Class<*> {
    class MethodLocal
    return MethodLocal::class.java
  }

  fun anonymousRunnableClass(): Class<*> =
    object : Runnable {
      override fun run() {
        check(seed >= 0)
      }
    }.javaClass
}

private fun className(clazz: Class<*>?): String =
  clazz?.simpleName ?: "null"

private fun methodName(clazz: Class<*>): String =
  clazz.enclosingMethod?.name ?: "null"

private fun memberShape(clazz: Class<*>): String =
  listOf(
    clazz.simpleName,
    className(clazz.declaringClass),
    className(clazz.enclosingClass),
    clazz.isMemberClass.toString(),
    clazz.isLocalClass.toString(),
    clazz.isAnonymousClass.toString()
  ).joinToString("/")

private fun localShape(clazz: Class<*>): String =
  listOf(
    clazz.simpleName,
    className(clazz.declaringClass),
    className(clazz.enclosingClass),
    methodName(clazz),
    clazz.isMemberClass.toString(),
    clazz.isLocalClass.toString(),
    clazz.isAnonymousClass.toString()
  ).joinToString("/")

private fun anonymousShape(clazz: Class<*>): String =
  listOf(
    clazz.simpleName.ifEmpty { "_" },
    className(clazz.declaringClass),
    className(clazz.enclosingClass),
    methodName(clazz),
    clazz.interfaces.map { it.simpleName }.sorted().joinToString(","),
    clazz.isMemberClass.toString(),
    clazz.isLocalClass.toString(),
    clazz.isAnonymousClass.toString()
  ).joinToString("/")

fun reflectionShapeSummary(): String {
  val ownerClass = ReflectionShapeOwner::class.java
  val declared = ownerClass.declaredClasses
    .map { it.simpleName }
    .sorted()
    .joinToString(",")
  return listOf(
    declared,
    memberShape(ReflectionShapeOwner.Nested::class.java),
    memberShape(ReflectionShapeOwner.Inner::class.java),
    memberShape(ReflectionShapeOwner.Companion::class.java),
    localShape(ReflectionShapeOwner(2).methodLocalClass()),
    localShape(ReflectionShapeOwner.companionLocalClass()),
    anonymousShape(ReflectionShapeOwner(3).anonymousRunnableClass())
  ).joinToString("|")
}
