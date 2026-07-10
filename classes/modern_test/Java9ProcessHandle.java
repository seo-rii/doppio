package classes.modern_test;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Stream;

public class Java9ProcessHandle {
  public static void main(String[] args) {
    ProcessHandle current = ProcessHandle.current();
    ProcessHandle.Info info = current.info();
    Optional<ProcessHandle> same = ProcessHandle.of(current.pid());
    Optional<ProcessHandle> missing = ProcessHandle.of(-1L);
    Optional<ProcessHandle> parent = current.parent();
    System.out.println(current.pid() > 0);
    System.out.println(current.pid() != 1L);
    System.out.println(current.isAlive());
    System.out.println(current.equals(current));
    System.out.println(same.isPresent());
    System.out.println(same.get().equals(current));
    System.out.println(same.get() != current);
    System.out.println(missing.isPresent());
    System.out.println(current.compareTo(current) == 0);
    ProcessHandle fakeSamePid = new FakeHandle(current.pid());
    System.out.println(current.equals(fakeSamePid));
    System.out.println(same.get().equals(fakeSamePid));
    printFailure("compare-fake", () -> current.compareTo(fakeSamePid));
    System.out.println(ProcessHandle.allProcesses().anyMatch(handle -> handle.pid() == current.pid()));
    System.out.println(current.parent() != null);
    System.out.println(parent.isPresent());
    if (parent.isPresent()) {
      System.out.println(parent.get().pid() > 0);
      System.out.println(!parent.get().equals(current));
      System.out.println(ProcessHandle.of(parent.get().pid()).isPresent());
      System.out.println(ProcessHandle.of(parent.get().pid()).get().equals(parent.get()));
      System.out.println(ProcessHandle.allProcesses().anyMatch(handle -> handle.pid() == parent.get().pid()));
      System.out.println(parent.get().children().anyMatch(handle -> handle.pid() == current.pid()));
      System.out.println(parent.get().descendants().anyMatch(handle -> handle.pid() == current.pid()));
    } else {
      System.out.println(false);
      System.out.println(false);
      System.out.println(false);
      System.out.println(false);
      System.out.println(false);
      System.out.println(false);
      System.out.println(false);
    }
    System.out.println(current.children().count() >= 0);
    System.out.println(current.descendants().count() >= 0);
    System.out.println(current.supportsNormalTermination());
    try {
      current.onExit();
      System.out.println(false);
    } catch (IllegalStateException ex) {
      System.out.println(true);
    }
    try {
      current.destroy();
      System.out.println(false);
    } catch (IllegalStateException ex) {
      System.out.println(true);
    }
    try {
      current.destroyForcibly();
      System.out.println(false);
    } catch (IllegalStateException ex) {
      System.out.println(true);
    }
    System.out.println(info.command() != null);
    System.out.println(info.commandLine() != null);
    System.out.println(info.arguments() != null);
    System.out.println(info.startInstant() != null);
    System.out.println(info.totalCpuDuration() != null);
    System.out.println(info.user() != null);
    System.out.println(current.info() != current.info());
    System.out.println(info.command().isPresent());
    System.out.println(info.commandLine().isPresent());
    System.out.println(!info.command().get().equals("doppio"));
    System.out.println(!info.commandLine().get().equals("doppio"));
    System.out.println(info.commandLine().get().contains(info.command().get()));
    System.out.println(info.arguments().isPresent());
    System.out.println(info.arguments().get().length > 0);
    System.out.println(info.commandLine().get().contains(info.arguments().get()[0]));
    System.out.println(info.arguments().equals(info.arguments()));
    System.out.println(info.arguments().get() == info.arguments().get());
    System.out.println(info.startInstant().isPresent());
    System.out.println(info.startInstant().get().isAfter(java.time.Instant.EPOCH));
    System.out.println(!info.startInstant().get().isAfter(java.time.Instant.now().plusSeconds(1)));
    System.out.println(!info.startInstant().get().equals(java.time.Instant.EPOCH));
    System.out.println(info.totalCpuDuration().isPresent());
    System.out.println(info.totalCpuDuration().get().compareTo(java.time.Duration.ZERO) > 0);
    System.out.println(info.user().isPresent());
    String infoString = info.toString();
    System.out.println(infoString.startsWith("["));
    System.out.println(infoString.contains("user: "));
    System.out.println(infoString.contains("cmd: "));
    System.out.println(infoString.contains("args: "));
    System.out.println(infoString.contains("startTime: "));
    System.out.println(infoString.contains("totalTime: "));
    System.out.println(infoString.endsWith("]"));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run();
  }

  private static final class FakeHandle implements ProcessHandle {
    private final long pid;

    FakeHandle(long pid) {
      this.pid = pid;
    }

    public Optional<ProcessHandle> parent() {
      return Optional.empty();
    }

    public Stream<ProcessHandle> children() {
      return Stream.empty();
    }

    public Stream<ProcessHandle> descendants() {
      return Stream.empty();
    }

    public long pid() {
      return pid;
    }

    public boolean isAlive() {
      return true;
    }

    public Info info() {
      return ProcessHandle.current().info();
    }

    public CompletableFuture<ProcessHandle> onExit() {
      return new CompletableFuture<ProcessHandle>();
    }

    public boolean supportsNormalTermination() {
      return true;
    }

    public boolean destroy() {
      return false;
    }

    public boolean destroyForcibly() {
      return false;
    }

    public int compareTo(ProcessHandle other) {
      return Long.compare(pid(), other.pid());
    }
  }
}
