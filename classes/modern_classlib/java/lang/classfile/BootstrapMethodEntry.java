package java.lang.classfile;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.MethodHandleEntry;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.util.List;
public interface BootstrapMethodEntry {
  ConstantPool constantPool();
  int bsmIndex();
  MethodHandleEntry bootstrapMethod();
  List<LoadableConstantEntry> arguments();
}
