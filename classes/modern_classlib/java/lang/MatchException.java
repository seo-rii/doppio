package java.lang;

/** Exception emitted by final record patterns and exhaustive enhanced switches. */
public final class MatchException extends RuntimeException {
  private static final long serialVersionUID = 0L;

  public MatchException(String message, Throwable cause) {
    super(message, cause);
  }
}
