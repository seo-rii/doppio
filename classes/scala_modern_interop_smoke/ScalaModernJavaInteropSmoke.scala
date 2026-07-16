import java.time.{Clock, Duration, Instant, ZoneId}
import java.lang.annotation.{Documented, ElementType, Retention, RetentionPolicy, Target}
import java.lang.reflect.{InvocationTargetException, Modifier}
import java.util.AbstractMap
import java.util.stream.Stream

object ScalaModernJavaInteropSmoke {
  def exercise(): String = {
    val hexClass = Class.forName("java.util.HexFormat")
    val hex = hexClass.getMethod("of").invoke(null)
    val upper = hexClass.getMethod("withUpperCase").invoke(hex)
    val bytes = Array[Byte](0x0f, 0x10, -1)
    val formatted = hexClass.getMethod("formatHex", classOf[Array[Byte]]).invoke(hex, bytes).asInstanceOf[String]
    val upperText = hexClass.getMethod("formatHex", classOf[Array[Byte]]).invoke(upper, Array[Byte](10, 11)).asInstanceOf[String]
    val parsed = hexClass.getMethod("parseHex", classOf[CharSequence]).invoke(hex, "cafe").asInstanceOf[Array[Byte]]
    val digit = hexClass.getMethod("fromHexDigit", java.lang.Integer.TYPE).invoke(null, Int.box('f'.toInt))

    val instantSourceClass = Class.forName("java.time.InstantSource")
    val fixedInstant = Instant.parse("2020-01-02T03:04:05Z")
    val fixed = instantSourceClass.getMethod("fixed", classOf[Instant]).invoke(null, fixedInstant)
    val fixedValue = instantSourceClass.getMethod("instant").invoke(fixed).asInstanceOf[Instant]
    val fixedMillis = instantSourceClass.getMethod("millis").invoke(fixed)
    val offset = instantSourceClass
      .getMethod("offset", instantSourceClass, classOf[Duration])
      .invoke(null, fixed, Duration.ofSeconds(2))
    val offsetValue = instantSourceClass.getMethod("instant").invoke(offset).asInstanceOf[Instant]
    val zoned = instantSourceClass
      .getMethod("withZone", classOf[ZoneId])
      .invoke(fixed, ZoneId.of("UTC"))

    val randomGeneratorClass = Class.forName("java.util.random.RandomGenerator")
    val randomFactoryClass = Class.forName("java.util.random.RandomGeneratorFactory")
    val randomFactory = randomFactoryClass.getMethod("of", classOf[String]).invoke(null, "Random")
    val randomGenerator = randomFactoryClass
      .getMethod("create", java.lang.Long.TYPE)
      .invoke(randomFactory, Long.box(123L))
    val nextInt = randomGeneratorClass
      .getMethod("nextInt", java.lang.Integer.TYPE)
      .invoke(randomGenerator, Int.box(100))
    val nextLong = randomGeneratorClass
      .getMethod("nextLong", java.lang.Long.TYPE)
      .invoke(randomGenerator, Long.box(1000L))
    val splitFactory = randomFactoryClass.getMethod("of", classOf[String]).invoke(null, "SplittableRandom")
    val splitGenerator = randomFactoryClass
      .getMethod("create", java.lang.Long.TYPE)
      .invoke(splitFactory, Long.box(123L))
    val splitInt = randomGeneratorClass
      .getMethod("nextInt", java.lang.Integer.TYPE)
      .invoke(splitGenerator, Int.box(100))
    val splitLong = randomGeneratorClass
      .getMethod("nextLong", java.lang.Long.TYPE)
      .invoke(splitGenerator, Long.box(1000L))
    val splitIsSplittable = randomFactoryClass.getMethod("isSplittable").invoke(splitFactory)
    val streamClass = classOf[Stream[_]]
    val streamList = Stream.of("q", "r", "s")
      .map((value: String) => value.toUpperCase)
    val streamToList = streamClass.getMethod("toList")
      .invoke(streamList)
      .asInstanceOf[java.util.List[String]]
    val streamListFailure =
      try {
        streamToList.add("T")
        "mut"
      } catch {
        case _: UnsupportedOperationException => "uoe"
      }
    val entryClass = classOf[java.util.Map.Entry[_, _]]
    val mutableEntry = new AbstractMap.SimpleEntry[String, String]("entry", "value")
    val entryCopy = entryClass.getMethod("copyOf", entryClass)
      .invoke(null, mutableEntry)
      .asInstanceOf[java.util.Map.Entry[String, String]]
    mutableEntry.setValue("changed")
    val entryCopyMutation =
      try {
        entryCopy.setValue("again")
        "mut"
      } catch {
        case _: UnsupportedOperationException => "uoe"
      }
    val listClass = classOf[java.util.List[_]]
    val listOf = listClass.getMethod("of", classOf[Object], classOf[Object])
      .invoke(null, "j", "k")
      .asInstanceOf[java.util.List[String]]
    val listMutation =
      try {
        listOf.add("z")
        "mut"
      } catch {
        case _: UnsupportedOperationException => "uoe"
      }
    val duplicateSet =
      try {
        classOf[java.util.Set[_]].getMethod("of", classOf[Object], classOf[Object])
          .invoke(null, "dup", "dup")
        "ok"
      } catch {
        case e: InvocationTargetException
            if e.getCause != null && e.getCause.getClass.getName == "java.lang.IllegalArgumentException" =>
          "iae"
      }
    val mapOf = classOf[java.util.Map[_, _]]
      .getMethod("of", classOf[Object], classOf[Object], classOf[Object], classOf[Object])
      .invoke(null, "a", Int.box(1), "b", Int.box(2))
      .asInstanceOf[java.util.Map[String, Integer]]
    val mapMutation =
      try {
        mapOf.put("c", Int.box(3))
        "mut"
      } catch {
        case _: UnsupportedOperationException => "uoe"
      }
    val copiedList = listClass.getMethod("copyOf", classOf[java.util.Collection[_]])
      .invoke(null, new java.util.ArrayList[String](listOf))
      .asInstanceOf[java.util.List[String]]
    val optionalClass = classOf[java.util.Optional[_]]
    val optionalValue = java.util.Optional.of("opt")
    val optionalEmpty = java.util.Optional.empty[String]()
    val optionalText = optionalValue.orElseThrow()
    val optionalIsEmpty = optionalClass.getMethod("isEmpty").invoke(optionalEmpty)
    val optionalFailure =
      try {
        optionalEmpty.orElseThrow()
        "ok"
      } catch {
        case _: java.util.NoSuchElementException => "nse"
      }
    val processHandleClass = Class.forName("java.lang.ProcessHandle")
    val currentProcess = processHandleClass.getMethod("current").invoke(null)
    val currentPid = processHandleClass.getMethod("pid").invoke(currentProcess).asInstanceOf[Long]
    val currentProcessAlive = processHandleClass.getMethod("isAlive").invoke(currentProcess).asInstanceOf[Boolean]
    val currentProcessByPid = processHandleClass
      .getMethod("of", java.lang.Long.TYPE)
      .invoke(null, Long.box(currentPid))
      .asInstanceOf[java.util.Optional[_]]
    val processInfoClass = Class.forName("java.lang.ProcessHandle$Info")
    val currentInfo = processHandleClass.getMethod("info").invoke(currentProcess)
    val commandPresent = processInfoClass.getMethod("command").invoke(currentInfo).asInstanceOf[java.util.Optional[_]].isPresent
    val commandLinePresent = processInfoClass.getMethod("commandLine").invoke(currentInfo).asInstanceOf[java.util.Optional[_]].isPresent
    val argumentsPresent = processInfoClass.getMethod("arguments").invoke(currentInfo).asInstanceOf[java.util.Optional[_]].isPresent
    val startInstantPresent = processInfoClass.getMethod("startInstant").invoke(currentInfo).asInstanceOf[java.util.Optional[_]].isPresent
    val cpuDurationPresent = processInfoClass.getMethod("totalCpuDuration").invoke(currentInfo).asInstanceOf[java.util.Optional[_]].isPresent
    val infoString = currentInfo.toString
    val infoStringShape = infoString.startsWith("[") && infoString.contains("cmd: ") && infoString.endsWith("]")

    val moduleElement = ElementType.MODULE
    val recordComponentElement = ElementType.RECORD_COMPONENT
    val deprecatedClass = classOf[java.lang.Deprecated]
    val deprecatedSince = deprecatedClass.getDeclaredMethod("since")
    val deprecatedForRemoval = deprecatedClass.getDeclaredMethod("forRemoval")
    val deprecatedTarget = deprecatedClass.getDeclaredAnnotation(classOf[Target])
    val deprecatedRetention = deprecatedClass.getDeclaredAnnotation(classOf[Retention])
    val deprecatedMetadata =
      deprecatedClass.isAnnotation &&
        deprecatedClass.getDeclaredMethods.length == 2 &&
        deprecatedClass.getDeclaredAnnotations.length == 3 &&
        deprecatedClass.isAnnotationPresent(classOf[Documented]) &&
        deprecatedRetention != null && deprecatedRetention.value() == RetentionPolicy.RUNTIME &&
        deprecatedTarget != null &&
        deprecatedSince.getModifiers == (Modifier.PUBLIC | Modifier.ABSTRACT) &&
        deprecatedSince.getReturnType == classOf[String] &&
        deprecatedSince.getParameterTypes.length == 0 &&
        deprecatedSince.getExceptionTypes.length == 0 &&
        deprecatedSince.getDeclaredAnnotations.length == 0 &&
        deprecatedSince.getDefaultValue == "" &&
        deprecatedForRemoval.getModifiers == (Modifier.PUBLIC | Modifier.ABSTRACT) &&
        deprecatedForRemoval.getReturnType == java.lang.Boolean.TYPE &&
        deprecatedForRemoval.getParameterTypes.length == 0 &&
        deprecatedForRemoval.getExceptionTypes.length == 0 &&
        deprecatedForRemoval.getDeclaredAnnotations.length == 0 &&
        deprecatedForRemoval.getDefaultValue == java.lang.Boolean.FALSE
    val deprecatedTargetNames = deprecatedTarget.value().map(_.name()).mkString(",")

    s"$formatted|$upperText|${parsed.length}:${hexClass.getMethod("formatHex", classOf[Array[Byte]]).invoke(hex, parsed)}:$digit|" +
      s"$fixedValue:$fixedMillis:$offsetValue:${classOf[Clock].isInstance(zoned)}|" +
      s"${randomFactoryClass.getMethod("name").invoke(randomFactory)}:$nextInt:$nextLong|" +
      s"${randomFactoryClass.getMethod("name").invoke(splitFactory)}:$splitIsSplittable:$splitInt:$splitLong|" +
      s"${java.lang.String.join("", streamToList)}:$streamListFailure|" +
      s"${entryCopy.getKey}:${entryCopy.getValue}:$entryCopyMutation|" +
      s"${java.lang.String.join("", listOf)}:$listMutation:$duplicateSet:${mapOf.get("b")}:$mapMutation:${java.lang.String.join("", copiedList)}:" +
      s"$optionalText:$optionalIsEmpty:$optionalFailure:${currentPid > 0}:$currentProcessAlive:${currentProcessByPid.isPresent}:" +
      s"$commandPresent:$commandLinePresent:$argumentsPresent:$startInstantPresent:$cpuDurationPresent:$infoStringShape|" +
      s"${moduleElement.name()}:${moduleElement.ordinal()}:${recordComponentElement.name()}:${recordComponentElement.ordinal()}|" +
      s"$deprecatedMetadata:${deprecatedSince.getDefaultValue}:${deprecatedForRemoval.getDefaultValue}:$deprecatedTargetNames"
  }
}
