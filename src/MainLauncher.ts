import {ReferenceClassData} from './ClassData';
import {Method} from './methods';
import {JVMThread} from './threading';
import * as JVMTypes from '../includes/JVMTypes';

/**
 * Select and invoke a main member on an initialized class, independently of the
 * JVM lifecycle. False means a launch error has been thrown on the Java thread.
 */
export function invokeMain(thread: JVMThread, cdata: ReferenceClassData<any>,
    jvmifiedArgs: JVMTypes.JVMArray<JVMTypes.java_lang_String>,
    mainCompleted: (error?: JVMTypes.java_lang_Throwable) => void): boolean {
  // Find the main method, and run it.
  var cdataStatics = <any> cdata.getConstructor(thread);
  if (cdata.majorVersion >= 69) {
    // Final Java 25 broadens the launch protocol. Do not accidentally
    // enable the Java 21-24 preview protocol for older class files.
    var mainMethod: Method = null;
    for (var signature of ['main([Ljava/lang/String;)V', 'main()V']) {
      var candidate = cdata.methodLookup(signature);
      if (candidate !== null && candidate.accessFlags.isPrivate()) {
        candidate = null;
      }
      if (candidate !== null && candidate.cls !== cdata) {
        // Static interface methods are not inherited by implementors.
        if (candidate.cls.accessFlags.isInterface() && candidate.isStatic) {
          candidate = null;
        } else if (!candidate.accessFlags.isPublic() && !candidate.accessFlags.isProtected()) {
          // Package access must remain inherited through every class in
          // the chain; the VM's general method table also includes
          // entries that are not Java-language inherited members.
          var currentClass = cdata;
          while (currentClass !== null && currentClass !== candidate.cls
              && currentClass.getPackageName() === candidate.cls.getPackageName()) {
            currentClass = currentClass.getSuperClass();
          }
          if (currentClass !== candidate.cls) {
            candidate = null;
          }
        }
      }
      if (candidate === null) {
        // A non-inherited class method in the VM lookup table must not
        // hide a Java-language inherited interface default method.
        var pendingClasses = [cdata], visitedClasses: ReferenceClassData<any>[] = [],
          interfaceCandidates: Method[] = [];
        while (pendingClasses.length > 0) {
          var searchClass = pendingClasses.pop();
          if (visitedClasses.indexOf(searchClass) !== -1) {
            continue;
          }
          visitedClasses.push(searchClass);
          pendingClasses = pendingClasses.concat(searchClass.getInterfaces());
          if (searchClass.accessFlags.isInterface()) {
            searchClass.getMethods().forEach((method) => {
              if (method.signature === signature && !method.isStatic && !method.accessFlags.isPrivate()) {
                interfaceCandidates.push(method);
              }
            });
          } else if (searchClass.getSuperClass() !== null) {
            pendingClasses.push(searchClass.getSuperClass());
          }
        }
        var mostSpecific = interfaceCandidates.filter((method) => interfaceCandidates.every((other) =>
          method === other || !other.cls.isSubinterface(method.cls)));
        if (mostSpecific.length === 1) {
          candidate = mostSpecific[0];
        }
      }
      if (candidate === null) {
        continue;
      }
      mainMethod = candidate;
      break;
    }
    if (mainMethod === null) {
      thread.throwNewException('Ljava/lang/NoSuchMethodError;',
        `Could not find a non-private main method in class ${cdata.getExternalName()}.`);
      return false;
    }
    var mainArgs = mainMethod.parameterTypes.length === 1 ? [jvmifiedArgs] : [];
    if (mainMethod.isStatic) {
      (<any> mainMethod.cls.getConstructor(thread))[mainMethod.fullSignature](thread, mainArgs, mainCompleted);
    } else {
      if (cdata.accessFlags.isAbstract() || cdata.accessFlags.isInterface()) {
        thread.throwNewException('Ljava/lang/InstantiationError;',
          `Cannot instantiate main class ${cdata.getExternalName()}.`);
        return false;
      }
      var zeroArgConstructor = cdata.getMethods().filter((method) => method.signature === '<init>()V')[0];
      if (zeroArgConstructor === undefined || zeroArgConstructor.accessFlags.isPrivate()) {
        thread.throwNewException('Ljava/lang/NoSuchMethodError;',
          `Could not find a non-private zero argument constructor in class ${cdata.getExternalName()}.`);
        return false;
      }
      var receiver = new cdataStatics(thread);
      receiver[zeroArgConstructor.fullSignature](thread, [], (error?: JVMTypes.java_lang_Throwable): void => {
        if (error) {
          mainCompleted(error);
        } else {
          // The selected Java member can differ from the VM's general
          // signature entry (for example, a private superclass main).
          receiver[mainMethod.fullSignature](thread, mainArgs, mainCompleted);
        }
      });
    }
  } else {
    var legacyMain = cdata.methodLookup('main([Ljava/lang/String;)V');
    if (legacyMain !== null && legacyMain.isStatic && legacyMain.accessFlags.isPublic()
        && (legacyMain.cls === cdata || !legacyMain.cls.accessFlags.isInterface())) {
      (<any> legacyMain.cls.getConstructor(thread))[legacyMain.fullSignature](thread, [jvmifiedArgs], mainCompleted);
    } else {
      thread.throwNewException('Ljava/lang/NoSuchMethodError;',
        `Could not find public static main method in class ${cdata.getExternalName()}.`);
      return false;
    }
  }
  return true;
}
