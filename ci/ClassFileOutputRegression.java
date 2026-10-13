package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.*;
import java.nio.file.*;
import java.util.Arrays;
import java.util.function.Consumer;

/** Actual file-output overloads, with owned temporary files and no class definition. */
public final class ClassFileOutputRegression {
  private static int completed;
  private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); completed++; }
  public static void main(String[] arguments) throws Exception {
    ClassFile api = ClassFile.of(); ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    ClassDesc descriptor = ClassDesc.of("classes.modern_test.FileOutput"); ClassEntry name = pool.classEntry(descriptor);
    int[] calls = {0};
    Consumer<ClassBuilder> body = b -> {
      calls[0]++; b.withFlags(33);
      b.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_int), 9, c -> c.bipush(37).ireturn());
    };
    Path directory = Files.createTempDirectory("doppio-classfile-output-"); Path file = directory.resolve("output.class");
    try {
      api.buildTo(file, name, pool, body);
      byte[] written = Files.readAllBytes(file); ClassModel model = api.parse(written);
      check(calls[0] == 1 && model.thisClass().asSymbol().equals(descriptor), "real ClassEntry builder output and handler");
      check(api.verify(written).isEmpty() && model.methods().get(0).methodName().equalsString("value"), "actual emitted method and verification");
      check(Arrays.equals(written, api.build(name, pool, body)), "buildTo writes the complete actual builder byte array");
      Files.write(file, Arrays.copyOf(written, written.length + 100));
      api.buildTo(file, name, pool, body);
      check(Arrays.equals(written, Files.readAllBytes(file)), "existing owned output is replaced and truncated exactly");
      api.buildTo(file, descriptor, body);
      check(api.parse(Files.readAllBytes(file)).thisClass().asSymbol().equals(descriptor), "existing nominal overload remains real file IO");
      byte[] prior = Files.readAllBytes(file);
      int before = calls[0];
      try { api.buildTo(null, name, pool, body); throw new AssertionError("Missing null path failure"); }
      catch (NullPointerException expected) { check(calls[0] == before + 1, "native ClassEntry null-path order builds before Files.write"); }
      before = calls[0];
      try { api.buildTo(file, name, pool, null); throw new AssertionError("Missing null handler failure"); }
      catch (NullPointerException expected) { check(calls[0] == before && Arrays.equals(prior, Files.readAllBytes(file)), "failed builder does not overwrite prior file"); }
    } finally { Files.deleteIfExists(file); Files.delete(directory); }
    if (completed != 7) throw new AssertionError("Incomplete output profile: " + completed);
    System.out.println("CLASSFILE_OUTPUT_REGRESSION_OK|7");
  }
}
