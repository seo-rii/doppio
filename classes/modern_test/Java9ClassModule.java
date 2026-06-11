package classes.modern_test;

public class Java9ClassModule {
  public static void main(String[] args) {
    Module module = Java9ClassModule.class.getModule();
    Module javaBase = String.class.getModule();
    Module primitiveModule = int.class.getModule();

    System.out.println(module != null);
    System.out.println(module.isNamed());
    System.out.println(module.getName());
    System.out.println(module.canRead(javaBase));
    System.out.println(module.addReads(javaBase) == module);
    System.out.println(module.isExported("classes.modern_test"));
    System.out.println(module.isOpen("classes.modern_test"));
    System.out.println(module.getAnnotations().length);
    System.out.println(module.getDeclaredAnnotations().length);
    System.out.println(module.toString().startsWith("unnamed module"));
    System.out.println(javaBase != null);
    System.out.println(primitiveModule != null);
  }
}
