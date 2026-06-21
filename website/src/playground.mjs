import './site.css';

const scalaVersion = '2.13.18';
let kotlinCompilerClasspath = '/sys/compilers/kotlin/kotlin-compiler.jar';
const languages = {
  java: {
    label: 'Java',
    filename: 'Main.java',
    mainClass: 'Main',
    outputClass: 'Main.class',
    source: `import java.util.Arrays;
import java.util.List;

public class Main {
  public static void main(String[] args) {
    List<String> languages = Arrays.asList("Java", "Kotlin", "Scala");
    System.out.println("Doppio says: " + String.join(" + ", languages));
  }
}
`,
    compileArgs(outputDir) {
      return [
        '-Xresponsiveness:100000',
        '-cp',
        '/sys/vendor/java_home/lib/tools.jar',
        'com.sun.tools.javac.Main',
        '-d',
        outputDir,
        '/work/Main.java'
      ];
    },
    runtimeClasspath(outputDir) {
      return outputDir;
    }
  },
  kotlin: {
    label: 'Kotlin',
    filename: 'Main.kt',
    mainClass: 'MainKt',
    outputClass: 'MainKt.class',
    source: `data class Language(val name: String, val year: Int)

fun main() {
  val languages = listOf(
    Language("Kotlin", 2011),
    Language("Doppio", 2014)
  )
  println(languages.joinToString(" -> ") { "\${it.name}@\${it.year}" })
}
`,
    compileArgs(outputDir) {
      return [
        '-Xresponsiveness:100000',
        '-cp',
        kotlinCompilerClasspath,
        'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
        '-no-reflect',
        '-no-stdlib',
        '-classpath',
        '/sys/compilers/kotlin/kotlin-stdlib.jar',
        '-d',
        outputDir,
        '/work/Main.kt'
      ];
    },
    runtimeClasspath(outputDir) {
      return `${outputDir}:/sys/compilers/kotlin/kotlin-stdlib.jar`;
    }
  },
  scala: {
    label: 'Scala',
    filename: 'Main.scala',
    mainClass: 'Main',
    outputClass: 'Main.class',
    source: `object Main {
  def main(args: Array[String]): Unit = {
    val values = List(2, 4, 8).map(_ * 3)
    println(s"Scala on Doppio: \${values.mkString(", ")}")
  }
}
`,
    compileArgs(outputDir) {
      const compilerClasspath = [
        `/sys/compilers/scala/scala-compiler-${scalaVersion}.jar`,
        `/sys/compilers/scala/scala-library-${scalaVersion}.jar`,
        `/sys/compilers/scala/scala-reflect-${scalaVersion}.jar`,
        '/sys/compilers/scala/java-diff-utils-4.16.jar',
        '/sys/compilers/scala/jline-3.29.0-jdk8.jar'
      ].join(':');
      return [
        '-Xresponsiveness:100000',
        '-cp',
        compilerClasspath,
        'scala.tools.nsc.Main',
        '-classpath',
        [
          `/sys/compilers/scala/scala-library-${scalaVersion}.jar`,
          `/sys/compilers/scala/scala-reflect-${scalaVersion}.jar`
        ].join(':'),
        '-d',
        outputDir,
        '/work/Main.scala'
      ];
    },
    runtimeClasspath(outputDir) {
      return [
        outputDir,
        `/sys/compilers/scala/scala-library-${scalaVersion}.jar`,
        `/sys/compilers/scala/scala-reflect-${scalaVersion}.jar`
      ].join(':');
    }
  }
};

const sourceEditor = document.querySelector('#source-editor');
const filename = document.querySelector('#source-filename');
const output = document.querySelector('#console-output');
const runButton = document.querySelector('#run-button');
const stopButton = document.querySelector('#stop-button');
const resetButton = document.querySelector('#reset-button');
const status = document.querySelector('#playground-state');
const elapsed = document.querySelector('#elapsed-time');
const stdin = document.querySelector('#stdin-input');
const stdinButton = document.querySelector('#stdin-button');
let activeLanguage = 'java';
let fileSystem;
let processModule;
let activeJvm = null;
let busy = false;

const setStatus = (message, state) => {
  status.textContent = message;
  status.dataset.state = state;
};

const appendOutput = (text, stream = 'stdout') => {
  if (output.classList.contains('console-empty')) {
    output.textContent = '';
    output.classList.remove('console-empty');
  }
  const prefix = stream === 'stderr' ? '[stderr] ' : '';
  output.textContent += `${prefix}${text}`;
  output.scrollTop = output.scrollHeight;
};

const invokeJvm = (args) => new Promise((resolve) => {
  window.Doppio.VM.CLI(
    args,
    {
      doppioHomePath: '/sys',
      tmpDir: '/tmp'
    },
    (exitCode) => {
      activeJvm = null;
      resolve(exitCode);
    },
    (jvm) => {
      activeJvm = jvm;
    }
  );
});

document.querySelectorAll('.language-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    if (busy || tab.dataset.language === activeLanguage) {
      return;
    }
    localStorage.setItem(`doppio-playground-${activeLanguage}`, sourceEditor.value);
    activeLanguage = tab.dataset.language;
    const config = languages[activeLanguage];
    document.querySelectorAll('.language-tab').forEach((candidate) => {
      candidate.setAttribute(
        'aria-selected',
        candidate.dataset.language === activeLanguage ? 'true' : 'false'
      );
    });
    sourceEditor.value =
      localStorage.getItem(`doppio-playground-${activeLanguage}`) || config.source;
    filename.textContent = config.filename;
    output.textContent = `Ready to compile ${config.label}.`;
    output.classList.add('console-empty');
    setStatus(`${config.label} source ready`, 'ready');
  });
});

sourceEditor.addEventListener('input', () => {
  localStorage.setItem(`doppio-playground-${activeLanguage}`, sourceEditor.value);
});

sourceEditor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = sourceEditor.selectionStart;
    const end = sourceEditor.selectionEnd;
    sourceEditor.setRangeText('  ', start, end, 'end');
    sourceEditor.dispatchEvent(new Event('input'));
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runButton.click();
  }
});

resetButton.addEventListener('click', () => {
  sourceEditor.value = languages[activeLanguage].source;
  localStorage.removeItem(`doppio-playground-${activeLanguage}`);
  sourceEditor.focus();
});

stdinButton.addEventListener('click', () => {
  if (!processModule || stdin.value.length === 0) {
    return;
  }
  processModule.stdin.write(`${stdin.value}\n`);
  stdin.value = '';
});

stdin.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    stdinButton.click();
  }
});

stopButton.addEventListener('click', () => {
  if (activeJvm) {
    activeJvm.halt(130);
    appendOutput('\nExecution stopped.\n', 'stderr');
  }
});

runButton.addEventListener('click', async () => {
  if (busy) {
    return;
  }
  busy = true;
  runButton.disabled = true;
  resetButton.disabled = true;
  stopButton.disabled = false;
  const startedAt = performance.now();
  const config = languages[activeLanguage];
  output.textContent = '';
  output.classList.remove('console-empty');
  appendOutput(`Preparing ${config.label} compiler...\n`);
  setStatus('Loading browser JVM', 'busy');

  try {
    if (!window.BrowserFS || !window.Doppio) {
      for (const source of ['./runtime/browserfs.min.js', './runtime/doppio.js']) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = source;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Failed to load ${source}`));
          document.head.append(script);
        });
      }

      const readOnlyRuntime = await new Promise((resolve, reject) => {
        window.BrowserFS.FileSystem.XmlHttpRequest.FromURL(
          new URL('./runtime/listings.json', window.location.href).toString(),
          (error, runtime) => error ? reject(error) : resolve(runtime),
          new URL('./runtime/', window.location.href).toString()
        );
      });
      const mountable = new window.BrowserFS.FileSystem.MountableFileSystem();
      window.BrowserFS.initialize(mountable);
      mountable.mount('/tmp', new window.BrowserFS.FileSystem.InMemory());
      mountable.mount('/work', new window.BrowserFS.FileSystem.InMemory());
      mountable.mount('/sys', readOnlyRuntime);
      fileSystem = window.BrowserFS.BFSRequire('fs');
      processModule = window.BrowserFS.BFSRequire('process');
      kotlinCompilerClasspath = fileSystem
        .readdirSync('/sys/compilers/kotlin')
        .filter((name) => name.endsWith('.jar'))
        .sort()
        .map((name) => `/sys/compilers/kotlin/${name}`)
        .join(':');
      processModule.initializeTTYs();
      processModule.stdout.on('data', (data) => appendOutput(data.toString()));
      processModule.stderr.on('data', (data) => appendOutput(data.toString()));
    }

    const outputDir = `/work/out-${Date.now()}`;
    fileSystem.mkdirSync(outputDir);
    fileSystem.writeFileSync(`/work/${config.filename}`, sourceEditor.value, 'utf8');

    setStatus(`Compiling ${config.label}`, 'busy');
    appendOutput(`\n$ ${config.label.toLowerCase()} compiler ${config.filename}\n`);
    const compileExit = await invokeJvm(config.compileArgs(outputDir));
    if (compileExit !== 0 || !fileSystem.existsSync(`${outputDir}/${config.outputClass}`)) {
      throw new Error(`Compiler exited with status ${compileExit}`);
    }

    setStatus(`Running ${config.mainClass}`, 'busy');
    appendOutput(`\n$ doppio ${config.mainClass}\n`);
    const runExit = await invokeJvm([
      '-Xresponsiveness:10000',
      '-cp',
      config.runtimeClasspath(outputDir),
      config.mainClass
    ]);
    if (runExit !== 0) {
      throw new Error(`Program exited with status ${runExit}`);
    }
    appendOutput(`\nProcess finished with exit code 0.\n`);
    setStatus('Run completed', 'ready');
  } catch (error) {
    appendOutput(`\n${String(error)}\n`, 'stderr');
    setStatus('Run failed', 'error');
  } finally {
    busy = false;
    runButton.disabled = false;
    resetButton.disabled = false;
    stopButton.disabled = true;
    elapsed.textContent = `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;
  }
});

sourceEditor.value = localStorage.getItem('doppio-playground-java') || languages.java.source;
