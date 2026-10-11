package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.GenericSignatureFormatError;
import java.lang.reflect.MalformedParameterizedTypeException;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.util.List;

/** Resource-only, fresh-loader record metadata probes. None initializes a record. */
public class JavaRecordSignatures {
  private static final String[] IDS = {
    "rs-missing-control", "rs-arity-control", "rs-signature-control", "rs-missing-type",
    "rs-arity-evolved", "rs-signature-token", "rs-signature-void-array", "rs-signature-unclosed"
  };
  private static int initializationCount;
  private static String current;

  public static void noteInitialization() { initializationCount++; }
  private static void require(boolean value) { if (!value) throw new AssertionError(current); }
  private static void emit(String event) {
    System.out.println(new StringBuilder(current).append('=').append(event).toString());
  }

  private static final class PayloadLoader extends ClassLoader {
    private final String id;
    PayloadLoader(String id) { super(JavaRecordSignatures.class.getClassLoader()); this.id = id; }
    protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      if (!name.startsWith("recordsignature.")) return super.loadClass(name, resolve);
      Class<?> loaded = findLoadedClass(name);
      if (loaded == null) loaded = findClass(name);
      if (resolve) resolveClass(loaded);
      return loaded;
    }
    protected Class<?> findClass(String name) throws ClassNotFoundException {
      if (!name.startsWith("recordsignature.")) throw new ClassNotFoundException(name);
      String resource = new StringBuilder("core-record-signatures/").append(id).append('/')
          .append(name.replace('.', '/')).append(".bin").toString();
      try (InputStream input = JavaRecordSignatures.class.getClassLoader().getResourceAsStream(resource)) {
        if (input == null) throw new ClassNotFoundException(name);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
        byte[] data = bytes.toByteArray();
        return defineClass(name, data, 0, data.length);
      } catch (ClassNotFoundException failure) { throw failure; }
      catch (Exception failure) { throw new ClassNotFoundException(name, failure); }
    }
  }

  private static Type generic(RecordComponent component, Field field, boolean componentQuery) {
    return componentQuery ? component.getGenericType() : field.getGenericType();
  }

  private static void checkFailure(RecordComponent component, Field field, boolean componentQuery,
      Class<?> expected, String missingName) {
    Throwable caught = null;
    try { generic(component, field, componentQuery); }
    catch (Throwable failure) { caught = failure; }
    require(caught != null && caught.getClass() == expected);
    if (expected == TypeNotPresentException.class) {
      require(((TypeNotPresentException) caught).typeName().equals(missingName));
    }
  }

  private static void checkParameterized(Type type, Class<?> raw, Class<?> argument) {
    require(type instanceof ParameterizedType);
    ParameterizedType parameterized = (ParameterizedType) type;
    require(parameterized.getRawType() == raw);
    Type[] arguments = parameterized.getActualTypeArguments();
    require(arguments.length == 1 && arguments[0] == argument);
  }

  private static void inspect(String id, String recordName, String signature, Class<?> expectedError,
      boolean fieldMustFail, String argumentName) throws Exception {
    current = id;
    initializationCount = 0;
    PayloadLoader loader = new PayloadLoader(id);
    Class<?> record = Class.forName(recordName, false, loader);
    require(record.isRecord() && record.getClassLoader() == loader && initializationCount == 0);
    emit("loaded=passive");
    RecordComponent[] components = record.getRecordComponents();
    require(components.length == 1);
    RecordComponent component = components[0];
    Field field = record.getDeclaredField("value");
    Class<?> raw = recordName.equals("recordsignature.ArityRecord") ?
        Class.forName("recordsignature.Box", false, loader) : List.class;
    require(component.getName().equals("value") && component.getDeclaringRecord() == record);
    require(component.getType() == raw && field.getType() == raw);
    require(component.getAccessor().getDeclaringClass() == record && component.getAccessor().getReturnType() == raw);
    require(component.getGenericSignature().equals(signature) && initializationCount == 0);
    emit("raw=unchanged");

    Class<?> argument = null;
    if (expectedError == null || !fieldMustFail) {
      argument = argumentName.equals("java.lang.String") ? String.class : Class.forName(argumentName, false, loader);
    }
    for (int repeat = 0; repeat < 2; repeat++) {
      if (expectedError == null) checkParameterized(generic(component, field, true), raw, argument);
      else checkFailure(component, field, true, expectedError, argumentName);
      if (fieldMustFail) checkFailure(component, field, false, expectedError, argumentName);
      else checkParameterized(generic(component, field, false), raw, argument);
      require(component.getType() == raw && field.getType() == raw && initializationCount == 0);
      require(component.getGenericSignature().equals(signature));
    }
    emit(expectedError == null ? "component=parameterized" :
        new StringBuilder("component=").append(expectedError.getName()).toString());
    emit(fieldMustFail ? new StringBuilder("field=").append(expectedError.getName()).toString() : "field=parameterized");
    emit("repeat=classes-and-raw-metadata");
    emit("init=0");
  }

  public static void caseMissingControl() throws Exception {
    inspect(IDS[0], "recordsignature.MissingRecord", "Ljava/util/List<Lrecordsignature/Missing;>;", null, false,
        "recordsignature.Missing");
  }
  public static void caseArityControl() throws Exception {
    inspect(IDS[1], "recordsignature.ArityRecord", "Lrecordsignature/Box<Ljava/lang/String;>;", null, false, "java.lang.String");
  }
  public static void caseSignatureControl() throws Exception {
    inspect(IDS[2], "recordsignature.SignatureRecord", "Ljava/util/List<Ljava/lang/String;>;", null, false, "java.lang.String");
  }
  public static void caseMissingType() throws Exception {
    inspect(IDS[3], "recordsignature.MissingRecord", "Ljava/util/List<Lrecordsignature/Missing;>;",
        TypeNotPresentException.class, true, "recordsignature.Missing");
  }
  public static void caseArityEvolved() throws Exception {
    inspect(IDS[4], "recordsignature.ArityRecord", "Lrecordsignature/Box<Ljava/lang/String;>;",
        MalformedParameterizedTypeException.class, true, "java.lang.String");
  }
  public static void caseSignatureToken() throws Exception {
    inspect(IDS[5], "recordsignature.SignatureRecord", "!", GenericSignatureFormatError.class, false, "java.lang.String");
  }
  public static void caseSignatureVoidArray() throws Exception {
    inspect(IDS[6], "recordsignature.SignatureRecord", "[V", GenericSignatureFormatError.class, false, "java.lang.String");
  }
  public static void caseSignatureUnclosed() throws Exception {
    inspect(IDS[7], "recordsignature.SignatureRecord", "Ljava/util/List<Ljava/lang/String;>",
        GenericSignatureFormatError.class, false, "java.lang.String");
  }

  public static void main(String[] args) throws Exception {
    require(args.length == IDS.length);
    for (int i = 0; i < IDS.length; i++) require(args[i].equals(IDS[i]));
    caseMissingControl(); caseArityControl(); caseSignatureControl(); caseMissingType();
    caseArityEvolved(); caseSignatureToken(); caseSignatureVoidArray(); caseSignatureUnclosed();
    System.out.println("RECORD_SIGNATURES_OK");
  }
}
