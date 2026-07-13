import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.ObjectInputStream
import java.io.ObjectOutputStream

final class SerializableLambdaFactory extends Serializable {
  def make(offset: Int): Int => Int = value => value + offset
}

object ScalaLambdaSerializationSmoke {
  private def roundTrip[A](value: A): A = {
    val bytes = new ByteArrayOutputStream()
    val output = new ObjectOutputStream(bytes)
    try output.writeObject(value)
    finally output.close()

    val input = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray))
    try input.readObject().asInstanceOf[A]
    finally input.close()
  }

  def summary(): String = {
    val original = new SerializableLambdaFactory().make(7)
    val copied = roundTrip(original)
    val copiedSerializable = copied.isInstanceOf[Serializable]
    val distinct = copied.asInstanceOf[AnyRef] ne original.asInstanceOf[AnyRef]
    s"${original(5)}:${copied(5)}:${copied(8)}:$copiedSerializable:$distinct"
  }
}
