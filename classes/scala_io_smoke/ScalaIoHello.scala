object ScalaIoHello {
  def main(args: Array[String]): Unit = {
    println(ScalaJarZipSmoke.exercise())
    println(ScalaServiceLoaderSmoke.exercise())
    println(ScalaResourceLookupSmoke.exercise())
  }
}
