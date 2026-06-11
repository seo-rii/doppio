package java.lang;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Stream;

public interface ProcessHandle extends Comparable<ProcessHandle> {
  interface Info {
    Optional<String> command();

    Optional<String> commandLine();

    Optional<String[]> arguments();

    Optional<Instant> startInstant();

    Optional<Duration> totalCpuDuration();

    Optional<String> user();
  }

  static ProcessHandle current() {
    return CurrentProcessHandle.INSTANCE;
  }

  static Optional<ProcessHandle> of(long pid) {
    ProcessHandle current = current();
    if (current.pid() == pid) {
      return Optional.of(new CurrentProcessHandle(pid));
    }
    long parentPid = CurrentProcessHandle.parentPid0();
    return parentPid > 0 && parentPid == pid ? Optional.of(new CurrentProcessHandle(pid)) : Optional.empty();
  }

  static Stream<ProcessHandle> allProcesses() {
    ProcessHandle current = current();
    long parentPid = CurrentProcessHandle.parentPid0();
    if (parentPid > 0 && parentPid != current.pid()) {
      return Stream.of(current, new CurrentProcessHandle(parentPid));
    }
    return Stream.of(current);
  }

  Optional<ProcessHandle> parent();

  Stream<ProcessHandle> children();

  Stream<ProcessHandle> descendants();

  long pid();

  boolean isAlive();

  Info info();

  CompletableFuture<ProcessHandle> onExit();

  boolean supportsNormalTermination();

  boolean destroy();

  boolean destroyForcibly();

  int compareTo(ProcessHandle other);

  final class CurrentProcessHandle implements ProcessHandle {
    private static final CurrentProcessHandle INSTANCE = new CurrentProcessHandle(currentPid0());
    private final long pid;

    private static native long currentPid0();
    static native long parentPid0();

    private CurrentProcessHandle(long pid) {
      this.pid = pid;
    }

    public long pid() {
      return pid;
    }

    public boolean isAlive() {
      return true;
    }

    public Info info() {
      return new CurrentProcessInfo();
    }

    public Optional<ProcessHandle> parent() {
      long currentPid = current().pid();
      long parentPid = parentPid0();
      return pid == currentPid && parentPid > 0 && parentPid != currentPid
          ? Optional.of(new CurrentProcessHandle(parentPid))
          : Optional.empty();
    }

    public Stream<ProcessHandle> children() {
      ProcessHandle current = current();
      long parentPid = parentPid0();
      if (pid == parentPid && parentPid > 0 && parentPid != current.pid()) {
        return Stream.of(current);
      }
      return Stream.empty();
    }

    public Stream<ProcessHandle> descendants() {
      ProcessHandle current = current();
      long parentPid = parentPid0();
      if (pid == parentPid && parentPid > 0 && parentPid != current.pid()) {
        return Stream.of(current);
      }
      return Stream.empty();
    }

    public CompletableFuture<ProcessHandle> onExit() {
      throw new IllegalStateException("onExit for current process not allowed");
    }

    public boolean supportsNormalTermination() {
      return true;
    }

    public boolean destroy() {
      throw new IllegalStateException("destroy of current process not allowed");
    }

    public boolean destroyForcibly() {
      throw new IllegalStateException("destroy of current process not allowed");
    }

    public int compareTo(ProcessHandle other) {
      return Long.compare(pid(), other.pid());
    }

    public boolean equals(Object other) {
      return other instanceof ProcessHandle && ((ProcessHandle) other).pid() == pid();
    }

    public int hashCode() {
      return Long.hashCode(pid());
    }

    public String toString() {
      return Long.toString(pid());
    }
  }

  final class CurrentProcessInfo implements Info {
    private final String command = currentCommand0();
    private final String commandLine = currentCommandLine0();
    private final String[] arguments = currentArguments0();
    private final Instant startInstant = Instant.ofEpochMilli(currentStartMillis0());
    private final Duration totalCpuDuration = Duration.ofNanos(currentTotalCpuNanos0());

    private CurrentProcessInfo() {}

    private static native String currentCommand0();
    private static native String currentCommandLine0();
    private static native String[] currentArguments0();
    private static native long currentStartMillis0();
    private static native long currentTotalCpuNanos0();

    public Optional<String> command() {
      return command.isEmpty() ? Optional.empty() : Optional.of(command);
    }

    public Optional<String> commandLine() {
      return commandLine.isEmpty() ? Optional.empty() : Optional.of(commandLine);
    }

    public Optional<String[]> arguments() {
      return Optional.of(arguments);
    }

    public Optional<Instant> startInstant() {
      return Optional.of(startInstant);
    }

    public Optional<Duration> totalCpuDuration() {
      return Optional.of(totalCpuDuration);
    }

    public Optional<String> user() {
      return Optional.of(System.getProperty("user.name", ""));
    }

    public String toString() {
      return "[user: " + user()
          + ", cmd: " + command().get()
          + ", args: " + Arrays.toString(arguments)
          + ", startTime: " + startInstant()
          + ", totalTime: " + totalCpuDuration()
          + "]";
    }
  }
}
