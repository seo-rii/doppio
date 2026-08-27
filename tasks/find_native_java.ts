import path = require('path');
import {exec, spawn} from 'child_process';
import semver = require('semver');
import LocateJavaHome from 'locate-java-home';
import {IJavaHomeInfo} from 'locate-java-home/ts/lib/interfaces';

/**
 * Grunt task that does the following:
 * - Locates location of java_home on your computer.
 * - Sets location of java/javac/javap in Grunt config.
 * - Requires the release-gated Java 17 JDK.
 */
function findNativeJava(grunt: IGrunt) {
  grunt.registerTask('find_native_java', 'Finds your Java installation.', function (): void {
    var done: (status?: boolean) => void = this.async();

    function foundJavaHome(home: IJavaHomeInfo): void {
      grunt.log.ok(`Using Java 17 JDK at ${home.path}`);
      grunt.config.set('build.java', home.executables.java);
      grunt.config.set('build.javac', home.executables.javac);
      grunt.config.set('build.javap', home.executables.javap);
      grunt.log.ok("Java: " + grunt.config('build.java'));
      grunt.log.ok("Javap: " + grunt.config('build.javap'));
      grunt.log.ok("Javac: " + grunt.config('build.javac'));
      grunt.config.set('build.is_java_17', true);
      done(true);
    }

    grunt.log.writeln("Locating Java 17 JDK...");
    LocateJavaHome({
      mustBeJDK: true
    }, (err, found) => {
      if (err || found.length === 0) {
        grunt.fail.fatal("Could not find a Java 17 JDK. " +
          "Install a Java 17 JDK before building this fork.");
      } else {
        var java17Installs = found.filter((home) =>
          semver.satisfies(home.version, ">=17.0.0 <18.0.0"));
        if (java17Installs.length === 0) {
          grunt.fail.fatal("Could not find a Java 17 JDK. " +
            "The modern fork uses Java 17 for deterministic native test oracles.");
        } else {
          foundJavaHome(java17Installs[0]);
        }
      }
    })
  });
};

export = findNativeJava;
