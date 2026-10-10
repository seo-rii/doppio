import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.ModuleTree;
import com.sun.source.tree.PackageTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.DocTrees;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import com.sun.source.util.TreePathScanner;
import java.io.BufferedWriter;
import java.io.OutputStreamWriter;
import java.lang.module.ModuleDescriptor;
import java.lang.module.ModuleFinder;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.zip.ZipFile;
import java.util.zip.GZIPOutputStream;
import javax.lang.model.element.Modifier;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

/** Reads API Javadoc without executing or attributing the JDK source code. */
public final class JavaSeContractSources {
  private static final Set<String> MODULES = Set.of(
      "java.base", "java.compiler", "java.datatransfer", "java.desktop",
      "java.instrument", "java.logging", "java.management", "java.management.rmi",
      "java.naming", "java.net.http", "java.prefs", "java.rmi", "java.scripting",
      "java.se", "java.security.jgss", "java.security.sasl", "java.smartcardio",
      "java.sql", "java.sql.rowset", "java.transaction.xa", "java.xml", "java.xml.crypto");

  private static void row(Set<String> rows, String... values) {
    for (String value : values) {
      if (value.indexOf('\t') >= 0 || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0) {
        throw new IllegalArgumentException("Unescaped record field");
      }
    }
    if (!rows.add(String.join("\t", values))) throw new IllegalStateException("Duplicate source record");
  }

  private static String digest(String text) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(text.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) { throw new IllegalStateException(exception); }
  }

  private static final class Source extends SimpleJavaFileObject {
    private final String text;
    Source(String name, String text) {
      super(URI.create("string:///" + name), Kind.SOURCE);
      this.text = text;
    }
    @Override public CharSequence getCharContent(boolean ignoreEncodingErrors) { return text; }
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2) throw new IllegalArgumentException("Usage: JavaSeContractSources <src.zip> <output.tsv>");
    var compiler = ToolProvider.getSystemJavaCompiler();
    if (compiler == null) throw new IllegalStateException("A full JDK is required");
    Set<String> rows = new TreeSet<>();
    try (var archive = new ZipFile(args[0])) {
      for (String moduleName : new TreeSet<>(MODULES)) {
        var descriptor = ModuleFinder.ofSystem().find(moduleName).orElseThrow().descriptor();
        Set<String> exports = new TreeSet<>();
        for (var directive : descriptor.exports()) {
          if (!directive.isQualified()) exports.add(directive.source().replace('.', '/'));
        }
        for (String service : descriptor.uses()) row(rows, "uses", moduleName, service);
        for (var directive : descriptor.provides()) {
          for (String provider : directive.providers()) row(rows, "provides", moduleName, directive.service(), provider);
        }
        List<JavaFileObject> sources = new ArrayList<>();
        for (var entry : archive.stream().sorted((a, b) -> a.getName().compareTo(b.getName())).toList()) {
          String name = entry.getName();
          if (!name.startsWith(moduleName + "/") || !name.endsWith(".java")) continue;
          String relative = name.substring(moduleName.length() + 1);
          int slash = relative.lastIndexOf('/');
          if (!relative.equals("module-info.java") &&
              (slash < 0 || !exports.contains(relative.substring(0, slash)))) continue;
          String source = new String(archive.getInputStream(entry).readAllBytes(), StandardCharsets.UTF_8);
          sources.add(new Source(name, source));
          row(rows, "source", moduleName, name, digest(source));
        }
        if (sources.isEmpty()) throw new IllegalStateException("No source files for " + moduleName);
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
          JavacTask task = (JavacTask) compiler.getTask(null, files, diagnostics,
              List.of("-proc:none", "--enable-preview", "--source", Integer.toString(Runtime.version().feature())),
              null, sources);
          DocTrees docs = DocTrees.instance(task);
          for (CompilationUnitTree unit : task.parse()) {
            String packageName = unit.getPackageName() == null ? "" : unit.getPackageName().toString();
            String sourceName = unit.getSourceFile().toUri().getPath().substring(1);
            new TreePathScanner<Void, Void>() {
              private final List<String> names = new ArrayList<>();
              private final List<Tree.Kind> kinds = new ArrayList<>();
              private final List<Boolean> previews = new ArrayList<>();

              private String typeName() {
                return (packageName.isEmpty() ? "" : packageName + ".") + String.join(".", names);
              }

              private boolean api(Set<Modifier> modifiers) {
                if (modifiers.contains(Modifier.PRIVATE)) return false;
                return modifiers.contains(Modifier.PUBLIC) || modifiers.contains(Modifier.PROTECTED)
                    || (!kinds.isEmpty() && (kinds.get(kinds.size() - 1) == Tree.Kind.INTERFACE
                      || kinds.get(kinds.size() - 1) == Tree.Kind.ANNOTATION_TYPE));
              }

              private boolean preview(Tree tree) {
                if (!previews.isEmpty() && previews.get(previews.size() - 1)) return true;
                String annotations = tree instanceof ClassTree item ? item.getModifiers().getAnnotations().toString()
                    : tree instanceof MethodTree item ? item.getModifiers().getAnnotations().toString()
                    : tree instanceof VariableTree item ? item.getModifiers().getAnnotations().toString()
                    : tree instanceof PackageTree item ? item.getAnnotations().toString() : "";
                return annotations.contains("@PreviewFeature(") || annotations.contains(".PreviewFeature(");
              }

              private boolean recordDoc(String kind, String identity) {
                var comment = docs.getDocCommentTree(getCurrentPath());
                if (comment == null) return true;
                String text = comment.toString();
                if (comment.getBlockTags().stream().anyMatch(tag -> tag.getKind().name().equals("HIDDEN"))) return false;
                long position = docs.getSourcePositions().getStartPosition(unit, getCurrentPath().getLeaf());
                row(rows, "doc", moduleName, sourceName, kind, identity,
                    Long.toString(position), digest(text),
                    Base64.getEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8)),
                    preview(getCurrentPath().getLeaf()) ? "preview" : "final");
                return true;
              }

              @Override public Void visitPackage(PackageTree tree, Void ignored) {
                recordDoc("package", packageName);
                return null;
              }

              @Override public Void visitModule(ModuleTree tree, Void ignored) {
                recordDoc("module", moduleName);
                return null;
              }

              @Override public Void visitClass(ClassTree tree, Void ignored) {
                if (!api(tree.getModifiers().getFlags())) return null;
                names.add(tree.getSimpleName().toString());
                boolean included = recordDoc("type", typeName());
                previews.add(preview(tree));
                kinds.add(tree.getKind());
                if (included) super.visitClass(tree, ignored);
                kinds.remove(kinds.size() - 1);
                previews.remove(previews.size() - 1);
                names.remove(names.size() - 1);
                return null;
              }

              @Override public Void visitMethod(MethodTree tree, Void ignored) {
                if (api(tree.getModifiers().getFlags())) recordDoc("member", typeName() + "#" + tree.getName());
                return null;
              }

              @Override public Void visitVariable(VariableTree tree, Void ignored) {
                if (api(tree.getModifiers().getFlags())) recordDoc("member", typeName() + "#" + tree.getName());
                return null;
              }
            }.scan(unit, null);
          }
          for (var diagnostic : diagnostics.getDiagnostics()) {
            if (diagnostic.getKind() == Diagnostic.Kind.ERROR) {
              throw new IllegalStateException("Cannot parse pinned source: " + diagnostic);
            }
          }
        }
      }
    }
    Path output = Path.of(args[1]);
    Files.createDirectories(output.toAbsolutePath().getParent());
    try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(
        new GZIPOutputStream(Files.newOutputStream(output)), StandardCharsets.UTF_8))) {
      for (String line : rows) { writer.write(line); writer.newLine(); }
    }
    System.out.println("Java SE public contract source records: " + rows.size());
  }
}
