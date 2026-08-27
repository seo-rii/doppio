import child_process = require('child_process');
import os = require('os');
import fs = require('fs');
import async = require('async');
/**
 * Helper function: If string is a path with spaces in it, surround it with
 * quotes.
 */
function shellEscape(str: string): string {
  return str.indexOf(' ') !== -1 ? '"' + str + '"' : str;
}

/**
 * Java-related tasks.
 */
function java(grunt: IGrunt) {
  grunt.registerMultiTask('javac', 'Run javac on input files.', function() {
    var files: {src: string[]; dest: string}[] = <any> this.files,
        inputFiles: string[] = [],
        done: (status?: boolean) => void = this.async();
    grunt.config.requires('build.javac');
    files.forEach(function (e: { src: string[]; dest: string }) {
      var dest = e.src[0].slice(0, -4) + 'class';
      if (fs.existsSync(dest) && fs.statSync(dest).mtime > fs.statSync(e.src[0]).mtime) {
        // No need to process file.
        return;
      }
      inputFiles = inputFiles.concat(e.src);
    });
    if (inputFiles.length === 0) {
      return done();
    }
    // Bootclasspath for javac uses OS's path separator.
    // -Xbootclasspath always uses :.
    let bootclasspath = grunt.config('build.bootclasspath');
    if (os.platform() === 'win32') {
      bootclasspath = bootclasspath.replace(/:/g, ';');
    }
    child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 -bootclasspath ' + bootclasspath + ' -source 1.8 -target 1.8 ' + inputFiles.join(' '), function(err?: any) {
      if (err) {
        grunt.fail.fatal('Error running javac: ' + err);
      }
      done();
    });
  });

  grunt.registerMultiTask('run_java', 'Run java on input files.', function() {
    var files: {src: string[]; dest: string}[] = <any> this.files,
        done: (status?: boolean) => void = this.async(),
        tasks: Array<AsyncFunction<void>> = [],
        javaExecutable: string = grunt.config('build.java'),
        targetName: string = (<any> this).target || 'default',
        versionStampPath = 'build/.native-java-version-' + targetName.replace(/[^A-Za-z0-9_.-]/g, '_'),
        versionResult: any,
        versionFingerprint: string,
        versionMatches: boolean;
    grunt.config.requires('build.java');
    grunt.config.requires('build.bootclasspath');
    versionResult = child_process.spawnSync(javaExecutable, ['-version'], {encoding: 'utf8'});
    if (versionResult.error || versionResult.status !== 0) {
      grunt.fail.fatal('Unable to identify native Java runtime: ' +
        (versionResult.error || versionResult.stderr || versionResult.stdout));
      return done(false);
    }
    versionFingerprint = javaExecutable + '\n' + versionResult.stdout + versionResult.stderr;
    versionMatches = fs.existsSync(versionStampPath) &&
      fs.readFileSync(versionStampPath, 'utf8') === versionFingerprint;
    if (!versionMatches) {
      if (fs.existsSync(versionStampPath)) {
        fs.unlinkSync(versionStampPath);
      }
      grunt.log.writeln('Native Java runtime changed; regenerating ' + targetName + ' runouts.');
    }
    files.forEach(function(file: {src: string[]; dest: string}) {
      if (versionMatches && fs.existsSync(file.dest) &&
          fs.statSync(file.dest).mtime > fs.statSync(file.src[0]).mtime) {
        // No need to process file.
        return;
      }
      tasks.push(function(cb: (err?: any) => void) {
        // Trim '.java' from filename to get the class name.
        var className = file.src[0].slice(0, -5);
        // NOTE: -ea is to enable assert() statements, which are used in some test cases.
        child_process.exec(shellEscape(grunt.config('build.java')) + ' -Dfile.encoding=UTF8 -ea -Xbootclasspath/a:' + grunt.config('build.bootclasspath') + ' ' + className, function(err?: any, stdout?: NodeBuffer, stderr?: NodeBuffer) {
          fs.writeFileSync(file.dest, stdout.toString() + stderr.toString());
          cb();
        });
      });
    });

    async.parallelLimit(tasks, os.cpus().length, function(err?: any) {
      if (err) {
        grunt.fail.fatal('java failed: ' + err);
      }
      grunt.file.mkdir('build');
      fs.writeFileSync(versionStampPath, versionFingerprint);
      done();
    });
  });
}

export = java;
