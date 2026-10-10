import com.sun.source.util.JavacTask;
import java.io.BufferedWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.ModuleElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import javax.lang.model.util.Elements;
import javax.lang.model.util.Types;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.StandardLocation;
import javax.tools.ToolProvider;
import java.lang.module.ModuleDescriptor;
import java.lang.module.ModuleFinder;

/** Emits deterministic, tab-separated Java SE module and visible API records. */
public final class JavaSeApiCensus {
  private static final List<String> JAVA_SE_MODULES = List.of(
      "java.base", "java.compiler", "java.datatransfer", "java.desktop",
      "java.instrument", "java.logging", "java.management", "java.management.rmi",
      "java.naming", "java.net.http", "java.prefs", "java.rmi", "java.scripting",
      "java.se", "java.security.jgss", "java.security.sasl", "java.smartcardio",
      "java.sql", "java.sql.rowset", "java.transaction.xa", "java.xml",
      "java.xml.crypto");

  private static String clean(Object value) {
    String text = String.valueOf(value);
    StringBuilder escaped = new StringBuilder();
    for (int index = 0; index < text.length(); index++) {
      char character = text.charAt(index);
      if (character < 0x20 || character > 0x7e || character == '\\') {
        escaped.append(String.format("\\u%04x", (int) character));
      } else escaped.append(character);
    }
    return escaped.toString();
  }

  private static void add(Set<String> rows, Object... fields) {
    StringBuilder row = new StringBuilder();
    for (Object field : fields) {
      if (!row.isEmpty()) row.append('\t');
      row.append(clean(field));
    }
    if (!rows.add(row.toString())) throw new IllegalStateException("Duplicate census row: " + row);
  }

  private static String joined(Set<String> values) {
    return String.join(",", new TreeSet<>(values));
  }

  private static String modifiers(Element element) {
    TreeSet<String> names = new TreeSet<>();
    for (Modifier modifier : element.getModifiers()) names.add(modifier.name());
    return String.join(",", names);
  }

  private static String annotations(Element element) {
    TreeSet<String> names = new TreeSet<>();
    element.getAnnotationMirrors().forEach(annotation ->
        names.add(annotation.getAnnotationType().toString()));
    return String.join(",", names);
  }

  private static boolean visible(Element element) {
    return element.getModifiers().contains(Modifier.PUBLIC)
        || element.getModifiers().contains(Modifier.PROTECTED);
  }

  private static void addType(Set<String> rows, String moduleName, TypeElement type,
                              Elements elements, Types types) {
    if (!visible(type)) return;
    String name = type.getQualifiedName().toString();
    add(rows, "type", moduleName, name, type.getKind(), modifiers(type), type.asType(),
        annotations(type));
    for (Element member : elements.getAllMembers(type)) {
      if (!visible(member)) continue;
      if (member.getKind() == ElementKind.CLASS || member.getKind() == ElementKind.INTERFACE
          || member.getKind() == ElementKind.ENUM || member.getKind() == ElementKind.ANNOTATION_TYPE
          || member.getKind() == ElementKind.RECORD) continue;
      String owner = member.getEnclosingElement().toString();
      String signature;
      try {
        signature = types.asMemberOf((javax.lang.model.type.DeclaredType) type.asType(), member).toString();
      } catch (IllegalArgumentException exception) {
        throw new IllegalStateException("Cannot resolve inherited member " + name + "." + member, exception);
      }
      String extra = "";
      String erasedParameters = "";
      if (member instanceof ExecutableElement executable) {
        extra = "throws=" + executable.getThrownTypes() + ";default=" + executable.getDefaultValue();
        List<String> erased = new java.util.ArrayList<>();
        for (VariableElement parameter : executable.getParameters()) {
          erased.add(types.erasure(parameter.asType()).toString());
        }
        erasedParameters = String.join(",", erased);
      } else if (member instanceof VariableElement variable) {
        extra = "constant=" + variable.getConstantValue();
      }
      add(rows, "member", moduleName, name, member.getKind(), member.getSimpleName(),
          owner, modifiers(member), signature, extra, annotations(member), erasedParameters);
    }
    for (Element enclosed : type.getEnclosedElements()) {
      if (enclosed instanceof TypeElement nested) addType(rows, moduleName, nested, elements, types);
    }
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 1) throw new IllegalArgumentException("Usage: JavaSeApiCensus <output.tsv>");
    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    if (compiler == null) throw new IllegalStateException("A full JDK with javac is required.");
    Set<String> rows = new TreeSet<>();
    var systemModules = ModuleFinder.ofSystem().findAll();
    Set<String> installed = new TreeSet<>();
    systemModules.forEach(module -> installed.add(module.descriptor().name()));
    if (!installed.containsAll(JAVA_SE_MODULES)) {
      throw new IllegalStateException("A required Java SE module is missing: " + JAVA_SE_MODULES);
    }
    for (String moduleName : installed) {
      if (!JAVA_SE_MODULES.contains(moduleName)) {
        add(rows, "excludedModule", moduleName,
            moduleName.startsWith("jdk.incubator.") ? "incubator" : "jdk-specific");
      }
    }
    try (StandardJavaFileManager files = compiler.getStandardFileManager(null, null, StandardCharsets.UTF_8)) {
      JavacTask task = (JavacTask) compiler.getTask(null, files, null,
          List.of("-proc:none", "--add-modules", String.join(",", JAVA_SE_MODULES)),
          null, List.of());
      Elements elements = task.getElements();
      Types types = task.getTypes();
      for (String moduleName : JAVA_SE_MODULES) {
        ModuleDescriptor descriptor = ModuleFinder.ofSystem().find(moduleName).orElseThrow().descriptor();
        ModuleElement module = elements.getModuleElement(moduleName);
        if (module == null) throw new IllegalStateException("Compiler cannot resolve " + moduleName);
        add(rows, "module", moduleName, descriptor.version().map(Object::toString).orElse(""));
        for (ModuleDescriptor.Requires directive : descriptor.requires()) {
          add(rows, "requires", moduleName, directive.name(), joined(directive.modifiers().stream()
              .map(Enum::name).collect(java.util.stream.Collectors.toSet())));
        }
        for (ModuleDescriptor.Exports directive : descriptor.exports()) {
          add(rows, "exports", moduleName, directive.source(),
              directive.isQualified() ? joined(directive.targets()) : "*");
        }
        for (ModuleDescriptor.Opens directive : descriptor.opens()) {
          add(rows, "opens", moduleName, directive.source(),
              directive.isQualified() ? joined(directive.targets()) : "*");
        }
        for (String service : descriptor.uses()) add(rows, "uses", moduleName, service);
        for (ModuleDescriptor.Provides directive : descriptor.provides()) {
          for (String provider : directive.providers()) {
            add(rows, "provides", moduleName, directive.service(), provider);
          }
        }
        var location = files.getLocationForModule(StandardLocation.SYSTEM_MODULES, moduleName);
        if (location == null) throw new IllegalStateException("No system location for " + moduleName);
        for (ModuleDescriptor.Exports directive : descriptor.exports()) {
          if (directive.isQualified()) continue;
          String packageName = directive.source();
          Set<String> binaries = new TreeSet<>();
          for (JavaFileObject file : files.list(location, packageName,
              Set.of(JavaFileObject.Kind.CLASS), false)) {
            String binary = files.inferBinaryName(location, file);
            if (binary == null || !binary.startsWith(packageName + ".")) {
              throw new IllegalStateException("Unexpected class file in " + moduleName + "/" + packageName);
            }
            if (binary.equals(packageName + ".package-info")) continue;
            if (!binaries.add(binary)) throw new IllegalStateException("Duplicate binary name " + binary);
            add(rows, "classFile", moduleName, binary);
          }
          if (binaries.isEmpty()) throw new IllegalStateException("Exported package is empty: " + packageName);
          for (String binary : binaries) {
            if (binary.contains("$")) continue;
            TypeElement type = elements.getTypeElement(module, binary);
            if (type == null) throw new IllegalStateException("Cannot resolve top-level type " + binary);
            addType(rows, moduleName, type, elements, types);
          }
        }
      }
    }
    Path output = Path.of(args[0]);
    Files.createDirectories(output.toAbsolutePath().getParent());
    try (BufferedWriter writer = Files.newBufferedWriter(output, StandardCharsets.UTF_8)) {
      for (String row : rows) {
        writer.write(row);
        writer.newLine();
      }
    }
    System.out.println("Java SE census: " + rows.size() + " records -> " + output);
  }
}
