import java.util.List;

public record RecordInteropBox(String name, int count, List<String> tags) {
  public String render() {
    return name + ":" + (count + tags.size());
  }
}
