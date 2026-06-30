import java.util.ArrayList
import java.util.LinkedHashMap
import java.util.concurrent.Executors
import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.Promise
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters._

object ScalaInteropSmoke {
  def exercise(): String = {
    val javaNames = new ArrayList[String]()
    javaNames.add("red")
    javaNames.add("green")
    javaNames.add("blue")

    val scalaNames = javaNames.asScala
    scalaNames.update(1, "amber")
    val namesToken = javaNames.asScala.zipWithIndex.map {
      case (name, index) => s"${name.take(1)}$index"
    }.mkString("")

    val javaWeights = new LinkedHashMap[String, Integer]()
    javaWeights.put("aa", Integer.valueOf(2))
    javaWeights.put("b", Integer.valueOf(5))
    val weightsToken = javaWeights.asScala.toSeq
      .sortBy(_._1)
      .map { case (key, value) => s"${key.length}:${value.intValue()}" }
      .mkString(",")

    val executor = Executors.newSingleThreadExecutor()
    implicit val executionContext: ExecutionContext =
      ExecutionContext.fromExecutorService(executor)
    try {
      val lengths = Promise[Int]()
      val asyncValue = Future {
        lengths.success(scalaNames.map(_.length).sum)
        "seed"
      }.flatMap(label => lengths.future.map(_ + label.length))
        .map(_ * 2)
      val futureToken = Await.result(asyncValue, 10.seconds)
      s"$namesToken:$weightsToken:f$futureToken"
    } finally {
      executor.shutdown()
    }
  }
}
