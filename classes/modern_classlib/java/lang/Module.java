package java.lang;

import java.io.IOException;
import java.io.InputStream;
import java.lang.annotation.Annotation;
import java.lang.module.ModuleDescriptor;
import java.lang.reflect.AnnotatedElement;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public final class Module implements AnnotatedElement {
  private String name;
  private ClassLoader loader;
  private String[] packages = new String[0];

  Module() {
  }

  public boolean isNamed() {
    return name != null;
  }

  public String getName() {
    return name;
  }

  public ClassLoader getClassLoader() {
    return loader;
  }

  public ModuleDescriptor getDescriptor() {
    return null;
  }

  public ModuleLayer getLayer() {
    return null;
  }

  public boolean canRead(Module other) {
    Objects.requireNonNull(other);
    return true;
  }

  public Module addReads(Module other) {
    Objects.requireNonNull(other);
    return this;
  }

  public boolean isExported(String pn, Module other) {
    Objects.requireNonNull(pn);
    Objects.requireNonNull(other);
    return true;
  }

  public boolean isOpen(String pn, Module other) {
    Objects.requireNonNull(pn);
    Objects.requireNonNull(other);
    return true;
  }

  public boolean isExported(String pn) {
    Objects.requireNonNull(pn);
    return true;
  }

  public boolean isOpen(String pn) {
    Objects.requireNonNull(pn);
    return true;
  }

  public Module addExports(String pn, Module other) {
    Objects.requireNonNull(pn);
    Objects.requireNonNull(other);
    return this;
  }

  public Module addOpens(String pn, Module other) {
    Objects.requireNonNull(pn);
    Objects.requireNonNull(other);
    return this;
  }

  public Module addUses(Class<?> service) {
    Objects.requireNonNull(service);
    return this;
  }

  public boolean canUse(Class<?> service) {
    Objects.requireNonNull(service);
    return true;
  }

  public Set<String> getPackages() {
    return new HashSet<String>(Arrays.asList(packages));
  }

  public <T extends Annotation> T getAnnotation(Class<T> annotationClass) {
    Objects.requireNonNull(annotationClass);
    return null;
  }

  public Annotation[] getAnnotations() {
    return new Annotation[0];
  }

  public Annotation[] getDeclaredAnnotations() {
    return new Annotation[0];
  }

  public InputStream getResourceAsStream(String name) throws IOException {
    Objects.requireNonNull(name);
    ClassLoader classLoader = loader;
    return classLoader == null ? ClassLoader.getSystemResourceAsStream(name) : classLoader.getResourceAsStream(name);
  }

  public String toString() {
    return isNamed() ? "module " + name : "unnamed module";
  }
}
