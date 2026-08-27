export as namespace Doppio;

export interface JVMOptions {
  doppioHomePath: string;
  classpath?: string[];
  bootstrapClasspath?: string[];
  javaHomePath?: string;
  nativeClasspath?: string[];
  enableSystemAssertions?: boolean;
  enableAssertions?: boolean | string[];
  disableAssertions?: string[];
  properties?: Record<string, string>;
  tmpDir?: string;
  responsiveness?: number | (() => number);
  intMode?: boolean;
  dumpJITStats?: boolean;
}

export interface JVMCLIOptions extends JVMOptions {
  launcherName: string;
}

export class Heap {
  constructor(size: number);
  malloc(size: number): number;
  free(address: number): void;
  store_word(address: number, value: number): void;
  get_byte(address: number): number;
  get_word(address: number): number;
  get_buffer(address: number, length: number): Uint8Array;
  get_signed_byte(address: number): number;
  set_byte(address: number, value: number): void;
  set_signed_byte(address: number, value: number): void;
  memcpy(sourceAddress: number, destinationAddress: number, length: number): void;
}

export interface JVM {
  getResponsiveness(): number;
  runClass(className: string, args: string[], callback: (code: number) => void): void;
  runJar(args: string[], callback: (code: number) => void): void;
  isJITDisabled(): boolean;
  hasVMBooted(): boolean;
  halt(status: number): void;
  getSystemProperty(property: string): string;
  getSystemPropertyNames(): string[];
  getHeap(): Heap;
  registerNatives(natives: Record<string, Record<string, Function>>): void;
  registerNative(className: string, methodSignature: string, native: Function): void;
  getNative(className: string, methodSignature: string): Function | null;
  getNatives(): Record<string, Record<string, Function>>;
  vtraceMethod(signature: string): void;
  shouldVtrace(signature: string): boolean;
}

export interface JVMConstructor {
  new (options: JVMOptions, callback: (error: unknown, jvm?: JVM) => void): JVM;
  isReleaseBuild(): boolean;
  registerNativeModule(module: () => unknown): void;
  getDefaultOptions(doppioHome: string): JVMOptions;
  getCompiledJDKURL(): string;
  getJDKInfo(): {url: string; classpath: string[]};
}

export type JavaCLI = (
  args: string[],
  options: JVMCLIOptions,
  done: (status: number) => void,
  started?: (jvm: JVM) => void
) => void;

export interface VMNamespace {
  JVM: JVMConstructor;
  CLI: JavaCLI;
  ClassFile: Record<string, unknown>;
  Threading: Record<string, unknown>;
  Long: unknown;
  Util: Record<string, unknown>;
  Enums: Record<string, unknown>;
  Interfaces: Record<string, unknown>;
  Monitor: unknown;
  FDState: unknown;
}

export const VM: VMNamespace;

export interface TestOptions extends JVMOptions {
  testClasses?: string[];
}

export interface TestingError extends Error {
  originalError?: unknown;
  fatal?: boolean;
}

export interface DoppioTestInstance {
  cls: string;
  run(
    registerGlobalErrorTrap: (callback: (error: Error) => void) => void,
    callback: (error: Error | null, actual?: string, expected?: string, diff?: string) => void
  ): void;
}

export interface TestingNamespace {
  DoppioTest: new (options: TestOptions, className: string) => DoppioTestInstance;
  getTests(options: TestOptions, callback: (tests: DoppioTestInstance[]) => void): void;
  diff(actual: string, expected: string): string | null;
  runTests(
    options: TestOptions,
    quiet: boolean,
    continueAfterFailure: boolean,
    hideDiffs: boolean,
    registerGlobalErrorTrap: (callback: (error: Error) => void) => void,
    callback: (error?: TestingError) => void
  ): void;
}

export const Testing: TestingNamespace;

export type LogLevel = 1 | 5 | 9 | 10;

export interface LogLevelEnum {
  readonly VTRACE: 10;
  readonly TRACE: 9;
  readonly DEBUG: 5;
  readonly ERROR: 1;
  readonly [value: number]: string | number;
}

export interface LoggingNamespace {
  LogLevel: LogLevelEnum;
  logLevel: LogLevel;
  debug_var(value: unknown): string;
  debug_vars(values: unknown[]): string[];
  setLogLevel(level: LogLevel): void;
  vtrace(...messages: unknown[]): void;
  trace(...messages: unknown[]): void;
  debug(...messages: unknown[]): void;
  error(...messages: unknown[]): void;
}

export interface SequenceMatcher {
  text_diff(context: number): string[];
}

export interface SequenceMatcherConstructor {
  new (actualLines: string[], expectedLines: string[]): SequenceMatcher;
}

export interface DifflibNamespace {
  SequenceMatcher: SequenceMatcherConstructor;
  text_diff(actualLines: string[], expectedLines: string[], context: number): string[];
}

export interface DebugNamespace {
  Assert(assertion: boolean, message?: string, thread?: unknown): void;
  Logging: LoggingNamespace;
  Difflib: DifflibNamespace;
}

export const Debug: DebugNamespace;
