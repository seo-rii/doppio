import child_process = require('child_process');
import os = require('os');
import fs = require('fs');
import path = require('path');
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
        options: {timeout: number; maxBuffer: number} = (<any> this).options({
          timeout: 60 * 1000,
          maxBuffer: 1024 * 1024
        }),
        stagedRunouts: Array<{
          temporaryPath: string;
          destinationPath: string;
          temporaryDirectory: string;
        }> = [],
        firstError: string = null,
        versionResult: any,
        versionFingerprint: string,
        versionMatches: boolean;
    function removeTemporaryRunout(temporaryDirectory: string, temporaryPath: string): string {
      try {
        if (temporaryPath !== null && fs.existsSync(temporaryPath)) {
          fs.unlinkSync(temporaryPath);
        }
        if (temporaryDirectory !== null && fs.existsSync(temporaryDirectory)) {
          fs.rmdirSync(temporaryDirectory);
        }
        return null;
      } catch (error) {
        return '' + error;
      }
    }
    grunt.config.requires('build.java');
    grunt.config.requires('build.bootclasspath');
    if (!Number.isFinite(options.timeout) || Math.floor(options.timeout) !== options.timeout ||
        options.timeout <= 0 || !Number.isFinite(options.maxBuffer) ||
        Math.floor(options.maxBuffer) !== options.maxBuffer || options.maxBuffer <= 0) {
      grunt.log.error('run_java timeout and maxBuffer options must be positive finite integers.');
      return done(false);
    }
    versionResult = child_process.spawnSync(javaExecutable, ['-version'], <any> {
      encoding: 'utf8',
      timeout: options.timeout,
      maxBuffer: options.maxBuffer,
      killSignal: 'SIGKILL',
      windowsHide: true
    });
    if (versionResult.error || versionResult.status !== 0) {
      try {
        if (fs.existsSync(versionStampPath)) {
          fs.unlinkSync(versionStampPath);
        }
      } catch (error) {
        grunt.log.error('Unable to remove native Java version stamp: ' + error);
      }
      grunt.log.error('Unable to identify native Java runtime: ' +
        (versionResult.error || versionResult.stderr || versionResult.stdout ||
          ('status ' + versionResult.status + ', signal ' + versionResult.signal)));
      return done(false);
    }
    versionFingerprint = javaExecutable + '\n' + grunt.config('build.bootclasspath') + '\n' +
      versionResult.stdout + versionResult.stderr;
    versionMatches = fs.existsSync(versionStampPath) &&
      fs.readFileSync(versionStampPath, 'utf8') === versionFingerprint;
    if (!versionMatches) {
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
        var className = file.src[0].slice(0, -5),
            temporaryDirectory: string = null,
            temporaryPath: string = null,
            workerFinished = false;
        function finishWorker(): void {
          if (!workerFinished) {
            workerFinished = true;
            cb();
          }
        }
        // NOTE: -ea is to enable assert() statements, which are used in some test cases.
        try {
          child_process.execFile(javaExecutable, [
            '-Dfile.encoding=UTF8',
            '-ea',
            '-Xbootclasspath/a:' + grunt.config('build.bootclasspath'),
            className
          ], <any> {
            encoding: 'utf8',
            timeout: options.timeout,
            maxBuffer: options.maxBuffer,
            killSignal: 'SIGKILL',
            windowsHide: true
          }, function(err?: any, stdout?: string, stderr?: string) {
            try {
              if (err) {
                if (firstError === null) {
                  firstError = className + ' failed: ' + (err.message || err) +
                    ' (code=' + err.code + ', signal=' + err.signal + ', killed=' + err.killed + ')';
                }
              } else {
                try {
                  temporaryDirectory = fs.mkdtempSync(
                    path.join(path.dirname(file.dest), '.native-runout-')
                  );
                  temporaryPath = path.join(temporaryDirectory, path.basename(file.dest));
                  fs.writeFileSync(temporaryPath, (stdout || '') + (stderr || ''));
                  stagedRunouts.push({
                    temporaryPath: temporaryPath,
                    destinationPath: file.dest,
                    temporaryDirectory: temporaryDirectory
                  });
                } catch (error) {
                  var cleanupError = removeTemporaryRunout(temporaryDirectory, temporaryPath);
                  if (cleanupError !== null) {
                    stagedRunouts.push({
                      temporaryPath: temporaryPath,
                      destinationPath: file.dest,
                      temporaryDirectory: temporaryDirectory
                    });
                  }
                  if (firstError === null) {
                    firstError = className + ' runout staging failed: ' + error +
                      (cleanupError === null ? '' : '; cleanup failed: ' + cleanupError);
                  }
                }
              }
            } finally {
              finishWorker();
            }
          });
        } catch (error) {
          if (firstError === null) {
            firstError = className + ' failed to launch: ' + error;
          }
          finishWorker();
        }
      });
    });

    if (tasks.length > 0 && fs.existsSync(versionStampPath)) {
      try {
        fs.unlinkSync(versionStampPath);
      } catch (error) {
        grunt.log.error('Unable to invalidate native Java version stamp: ' + error);
        return done(false);
      }
    }
    async.parallelLimit(tasks, Math.max(1, os.cpus().length), function() {
      var completionError: string = firstError === null ? null : 'java failed: ' + firstError;
      if (completionError === null) {
        try {
          stagedRunouts.forEach(function(runout) {
            fs.renameSync(runout.temporaryPath, runout.destinationPath);
          });
          stagedRunouts.forEach(function(runout) {
            var cleanupError = removeTemporaryRunout(
              runout.temporaryDirectory,
              runout.temporaryPath
            );
            if (cleanupError !== null) {
              throw new Error(cleanupError);
            }
          });
          grunt.file.mkdir('build');
          fs.writeFileSync(versionStampPath, versionFingerprint);
        } catch (error) {
          completionError = 'Unable to publish native Java runouts: ' + error;
        }
      }
      if (completionError !== null) {
        stagedRunouts.forEach(function(runout) {
          var cleanupError = removeTemporaryRunout(
            runout.temporaryDirectory,
            runout.temporaryPath
          );
          if (cleanupError !== null) {
            completionError += '; cleanup failed: ' + cleanupError;
          }
        });
        try {
          if (fs.existsSync(versionStampPath)) {
            fs.unlinkSync(versionStampPath);
          }
        } catch (error) {
          completionError += '; stamp cleanup failed: ' + error;
        }
        grunt.log.error(completionError);
        done(false);
        return;
      }
      done();
    });
  });

  grunt.registerTask('unit_test_run_java_fail_closed', 'Keep native Java runout generation bounded and fail closed.', function() {
    var done: (status?: boolean) => void = this.async(),
        testPath = path.resolve('ci/run_java_fail_closed_test.cjs'),
        expected = 'run-java-fail-closed:13:ok\n';
    child_process.execFile(
      process.execPath,
      ['--no-deprecation', testPath],
      <any> {
        encoding: 'utf8',
        timeout: 60 * 1000,
        maxBuffer: 1024 * 1024,
        killSignal: 'SIGKILL',
        windowsHide: true
      },
      function(err?: any, stdout?: string, stderr?: string): void {
        var actual = (stdout || '') + (stderr || '');
        if (err || actual !== expected) {
          grunt.fail.fatal(
            'Native Java runout fail-closed output does not match.\nDoppio:\n' + actual +
            '\nExpected:\n' + expected
          );
          return;
        }
        grunt.log.ok('Native Java runout generation stayed bounded, staged, and fail closed.');
        done();
      }
    );
  });
}

export = java;
