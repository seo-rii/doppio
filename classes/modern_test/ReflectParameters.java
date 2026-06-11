package classes.modern_test;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;

public class ReflectParameters {
  public static class Target {
    public Target(String label, int count) {
    }

    public void named(String value, int flags) {
    }
  }

  public static void main(String[] args) throws Exception {
    Method method = Target.class.getDeclaredMethod("named", String.class, int.class);
    Parameter[] methodParameters = method.getParameters();
    Parameter[] methodParametersAgain = method.getParameters();
    System.out.println(method.getParameterCount());
    System.out.println(methodParameters.length);
    System.out.println(methodParameters != methodParametersAgain);
    System.out.println(methodParameters[0] == methodParametersAgain[0]);
    print(methodParameters[0]);
    print(methodParameters[1]);

    Constructor<Target> constructor = Target.class.getDeclaredConstructor(String.class, int.class);
    Parameter[] constructorParameters = constructor.getParameters();
    System.out.println(constructor.getParameterCount());
    System.out.println(constructorParameters.length);
    print(constructorParameters[0]);
    print(constructorParameters[1]);
  }

  private static void print(Parameter parameter) {
    System.out.println(parameter.getName());
    System.out.println(parameter.isNamePresent());
    System.out.println(parameter.getModifiers());
    System.out.println(parameter.getDeclaringExecutable().getName());
    System.out.println(parameter.getType().getName());
  }
}
