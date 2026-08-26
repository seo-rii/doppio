import child_process = require('child_process');
import os = require('os');
import fs = require('fs');
import async = require('async');
import path = require('path');
import crypto = require('crypto');

function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function modernJava(grunt: IGrunt) {
  function generateSimpleClass(className: string, majorVersion: number, mainOutput?: string): Buffer {
    var bytes: number[] = [];

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function str(stringIndex: number): void {
      u1(8);
      u2(stringIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(majorVersion);
    u2(mainOutput === undefined ? 10 : 26);
    cls(2);
    utf8(className);
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    if (mainOutput !== undefined) {
      utf8('main');
      utf8('([Ljava/lang/String;)V');
      cls(13);
      utf8('java/lang/System');
      ref(9, 12, 15);
      nameAndType(16, 17);
      utf8('out');
      utf8('Ljava/io/PrintStream;');
      cls(19);
      utf8('java/io/PrintStream');
      ref(10, 18, 21);
      nameAndType(22, 23);
      utf8('println');
      utf8('(Ljava/lang/String;)V');
      str(25);
      utf8(mainOutput);
    }

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(mainOutput === undefined ? 1 : 2);
    u2(0x0001);
    u2(4);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    if (mainOutput !== undefined) {
      u2(0x0009);
      u2(10);
      u2(11);
      u2(1);
      codeAttr([
        0xb2, 0x00, 0x0e,
        0x12, 0x18,
        0xb6, 0x00, 0x14,
        0xb1
      ], 2, 1);
    }
    u2(0);

    return Buffer.from(bytes);
  }

  function generatePatchedMathFixture(workName: string, fixturePath: string, classPath: string,
      majorVersion: number, methodDeclarations: string[], expectedOutput: string,
      done: (status?: boolean) => void): void {
    var workDir = 'build/tmp/' + workName,
      stubSrcDir = workDir + '/src',
      stubOutDir = workDir + '/out',
      runoutPath = classPath.replace(/\.class$/, '.runout'),
      stubSource = ['package java.lang;', 'public final class CLASS_NAME {']
        .concat(methodDeclarations)
        .concat(['}', ''])
        .join('\n'),
      javac: string;

    grunt.config.requires('build.javac');
    javac = shellEscape(grunt.config('build.javac'));
    if (fs.existsSync(workDir)) {
      grunt.file.delete(workDir);
    }
    grunt.file.mkdir(stubSrcDir + '/java/lang');
    grunt.file.mkdir(stubOutDir);
    grunt.file.write(stubSrcDir + '/java/lang/Math.java', stubSource.replace('CLASS_NAME', 'Math'));
    grunt.file.write(stubSrcDir + '/java/lang/StrictMath.java', stubSource.replace('CLASS_NAME', 'StrictMath'));

    child_process.exec(javac + ' -J-Dfile.encoding=UTF8 -source 17 -target 17 -implicit:none --patch-module java.base=' +
        shellEscape(stubSrcDir) + ' -d ' + shellEscape(stubOutDir) + ' ' +
        shellEscape(stubSrcDir + '/java/lang/Math.java') + ' ' + shellEscape(stubSrcDir + '/java/lang/StrictMath.java'),
      function(stubErr?: any, stubStdout?: Buffer, stubStderr?: Buffer): void {
        if (stubErr) {
          grunt.fail.fatal('Error compiling ' + workName + ' API stubs: ' + stubErr + '\n' +
            stubStdout.toString() + stubStderr.toString());
        }
        child_process.exec(javac + ' -J-Dfile.encoding=UTF8 -source 17 -target 17 -implicit:none --patch-module java.base=' +
            shellEscape(stubOutDir) + ' -d . ' + shellEscape(fixturePath),
          function(fixtureErr?: any, fixtureStdout?: Buffer, fixtureStderr?: Buffer): void {
            if (fixtureErr) {
              grunt.fail.fatal('Error compiling ' + workName + ' fixture: ' + fixtureErr + '\n' +
                fixtureStdout.toString() + fixtureStderr.toString());
            }
            var classBytes = fs.readFileSync(classPath);
            classBytes.writeUInt16BE(majorVersion, 6);
            fs.writeFileSync(classPath, classBytes);
            grunt.file.write(runoutPath, expectedOutput);
            grunt.file.delete(workDir);
            grunt.log.ok('Generated ' + classPath);
            grunt.log.ok('Generated ' + runoutPath);
            done();
          });
      });
  }

  grunt.registerTask('generate_modern_classfile_versions', 'Generate simple Java 18+ class-file container fixtures.', function() {
    [
      ['classes/modern_test/Java18ClassFileVersion.class', 'classes/modern_test/Java18ClassFileVersion', 62],
      ['classes/modern_test/Java19ClassFileVersion.class', 'classes/modern_test/Java19ClassFileVersion', 63],
      ['classes/modern_test/Java20ClassFileVersion.class', 'classes/modern_test/Java20ClassFileVersion', 64],
      ['classes/modern_test/Java21ClassFileVersion.class', 'classes/modern_test/Java21ClassFileVersion', 65],
      ['classes/modern_test/Java22ClassFileVersion.class', 'classes/modern_test/Java22ClassFileVersion', 66],
      ['classes/modern_test/Java23ClassFileVersion.class', 'classes/modern_test/Java23ClassFileVersion', 67],
      ['classes/modern_test/Java24ClassFileVersion.class', 'classes/modern_test/Java24ClassFileVersion', 68],
      ['classes/modern_test/Java25ClassFileVersion.class', 'classes/modern_test/Java25ClassFileVersion', 69],
      ['classes/modern_test/Java26ClassFileVersion.class', 'classes/modern_test/Java26ClassFileVersion', 70]
    ].forEach(function(spec: [string, string, number]) {
      grunt.file.write(spec[0], generateSimpleClass(spec[1], spec[2]));
      grunt.log.ok('Generated ' + spec[0]);
    });
  });

  grunt.registerTask('generate_modern_classfile_runtime_versions', 'Generate runnable Java 20+ class-file fixtures.', function() {
    [
      ['classes/modern_test/Java20ClassFileRuntime.class', 'classes/modern_test/Java20ClassFileRuntime', 64, 'java20-runtime'],
      ['classes/modern_test/Java21ClassFileRuntime.class', 'classes/modern_test/Java21ClassFileRuntime', 65, 'java21-runtime'],
      ['classes/modern_test/Java22ClassFileRuntime.class', 'classes/modern_test/Java22ClassFileRuntime', 66, 'java22-runtime'],
      ['classes/modern_test/Java23ClassFileRuntime.class', 'classes/modern_test/Java23ClassFileRuntime', 67, 'java23-runtime'],
      ['classes/modern_test/Java24ClassFileRuntime.class', 'classes/modern_test/Java24ClassFileRuntime', 68, 'java24-runtime'],
      ['classes/modern_test/Java25ClassFileRuntime.class', 'classes/modern_test/Java25ClassFileRuntime', 69, 'java25-runtime'],
      ['classes/modern_test/Java26ClassFileRuntime.class', 'classes/modern_test/Java26ClassFileRuntime', 70, 'java26-runtime']
    ].forEach(function(spec: [string, string, number, string]) {
      var runoutPath = spec[0].replace(/\.class$/, '.runout');
      grunt.file.write(spec[0], generateSimpleClass(spec[1], spec[2], spec[3]));
      grunt.log.ok('Generated ' + spec[0]);
      grunt.file.write(runoutPath, spec[3] + '\n');
      grunt.log.ok('Generated ' + runoutPath);
    });
  });

  grunt.registerTask('generate_java18_unsigned_multiply_high', 'Generate a Java 18 Math.unsignedMultiplyHigh fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java18UnsignedMultiplyHigh.class',
      runoutPath = 'classes/modern_test/Java18UnsignedMultiplyHigh.runout',
      expectedOutput = [
        '0',
        '1',
        '-2',
        '1',
        '4611686018427387904',
        '81662756506307415',
        '921554509310949085',
        '0',
        '1',
        '-2',
        '1',
        '4611686018427387904',
        '81662756506307415',
        '921554509310949085'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function longConst(high: number, low: number): void {
      u1(5);
      u4(high);
      u4(low);
    }

    function emitPrint(code: number[], methodRef: number, leftIndex: number, rightIndex: number): void {
      code.push(0xb2, 0x00, 0x0e);
      code.push(0x14, (leftIndex >>> 8) & 0xff, leftIndex & 0xff);
      code.push(0x14, (rightIndex >>> 8) & 0xff, rightIndex & 0xff);
      code.push(0xb8, (methodRef >>> 8) & 0xff, methodRef & 0xff);
      code.push(0xb6, 0x00, 0x14);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    var mainCode: number[] = [],
      cases: number[][] = [
        [33, 35],
        [37, 37],
        [39, 39],
        [41, 43],
        [41, 41],
        [45, 47],
        [49, 51]
      ];

    cases.forEach(function(spec: number[]): void {
      emitPrint(mainCode, 26, spec[0], spec[1]);
    });
    cases.forEach(function(spec: number[]): void {
      emitPrint(mainCode, 32, spec[0], spec[1]);
    });
    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(62);
    u2(53);
    cls(2);
    utf8('classes/modern_test/Java18UnsignedMultiplyHigh');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(J)V');
    cls(25);
    utf8('java/lang/Math');
    ref(10, 24, 27);
    nameAndType(28, 29);
    utf8('unsignedMultiplyHigh');
    utf8('(JJ)J');
    cls(31);
    utf8('java/lang/StrictMath');
    ref(10, 30, 27);
    longConst(0, 0);
    longConst(0, 123);
    longConst(1, 0);
    longConst(-1, -1);
    longConst(-2147483648, 0);
    longConst(0, 2);
    longConst(0x01234567, 0x89abcdef);
    longConst(-16909061, -84281096);
    longConst(-287445237, -2112454933);
    longConst(229956191, 1241035896);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 5, 1);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java18_division', 'Generate the Java 18 integer division API fixture.', function() {
    var done: (status?: boolean) => void = this.async(),
      fixturePath = 'classes/modern_fixture/Java18Division.java',
      classPath = 'classes/modern_test/Java18Division.class',
      expectedOutput = [
        'ceil-int=2,-1,-1,2,-2147483648',
        'ceil-long-int=4294967297,-4294967296',
        'ceil-long=3074457345618258603,-9223372036854775808',
        'mod-int=-2,-1,1,2,0',
        'mod-long-int=-1,-1',
        'mod-long=-2,0',
        'exact-int=2,ArithmeticException:integer overflow,ArithmeticException:/ by zero',
        'exact-long=2,ArithmeticException:long overflow,ArithmeticException:/ by zero',
        'round-exact=-2,2,ArithmeticException:integer overflow,ArithmeticException:long overflow',
        'matrix=true,true,true',
        'exceptions=true',
        'reflection=true,true'
      ].join('\n') + '\n',
      methodDeclarations = [
        '  public static int ceilDiv(int x, int y) { return 0; }',
        '  public static long ceilDiv(long x, int y) { return 0L; }',
        '  public static long ceilDiv(long x, long y) { return 0L; }',
        '  public static int ceilMod(int x, int y) { return 0; }',
        '  public static int ceilMod(long x, int y) { return 0; }',
        '  public static long ceilMod(long x, long y) { return 0L; }',
        '  public static int divideExact(int x, int y) { return 0; }',
        '  public static long divideExact(long x, long y) { return 0L; }',
        '  public static int floorDivExact(int x, int y) { return 0; }',
        '  public static long floorDivExact(long x, long y) { return 0L; }',
        '  public static int ceilDivExact(int x, int y) { return 0; }',
        '  public static long ceilDivExact(long x, long y) { return 0L; }',
        '  public static int floorDiv(int x, int y) { return 0; }',
        '  public static long floorDiv(long x, long y) { return 0L; }'
      ];

    generatePatchedMathFixture('java18-division', fixturePath, classPath, 62,
      methodDeclarations, expectedOutput, done);
  });

  grunt.registerTask('generate_java21_math_clamp', 'Generate the Java 21 Math.clamp fixture.', function() {
    var done: (status?: boolean) => void = this.async(),
      fixturePath = 'classes/modern_fixture/Java21MathClamp.java',
      classPath = 'classes/modern_test/Java21MathClamp.class',
      expectedOutput = [
        'integer=true,true',
        'floating=true,true',
        'exceptions=true,true',
        'reflection=true,true'
      ].join('\n') + '\n',
      methodDeclarations = [
        '  public static int clamp(long value, int min, int max) { return 0; }',
        '  public static long clamp(long value, long min, long max) { return 0L; }',
        '  public static double clamp(double value, double min, double max) { return 0.0d; }',
        '  public static float clamp(float value, float min, float max) { return 0.0f; }'
      ];

    generatePatchedMathFixture('java21-math-clamp', fixturePath, classPath, 65,
      methodDeclarations, expectedOutput, done);
  });

  grunt.registerTask('generate_java18_default_charset', 'Generate a Java 18 UTF-8 default charset fixture.', function() {
    var done: (status?: boolean) => void = this.async(),
      sourcePath = 'classes/modern_test/Java18DefaultCharset.java',
      classPath = 'classes/modern_test/Java18DefaultCharset.class',
      runoutPath = 'classes/modern_test/Java18DefaultCharset.runout',
      expectedOutput = [
        'UTF-8',
        'UTF-8',
        '2',
        'e9:20ac',
        '[-61, -87, -30, -126, -84]',
        '2:e9:20ac',
        '[-61, -87, -30, -126, -84]'
      ].join('\n') + '\n';

    grunt.config.requires('build.javac');
    child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 --release 17 -d . ' + shellEscape(sourcePath),
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        if (err) {
          grunt.fail.fatal('Error compiling Java 18 default charset fixture: ' + err + '\n' + stdout.toString() + stderr.toString());
        }
        var classData = fs.readFileSync(classPath);
        classData[6] = 0;
        classData[7] = 62;
        fs.writeFileSync(classPath, classData);
        fs.writeFileSync(runoutPath, expectedOutput);
        grunt.log.ok('Generated ' + classPath);
        grunt.log.ok('Generated ' + runoutPath);
        done();
      });
  });

  grunt.registerTask('generate_java19_thread_id', 'Generate a Java 19 Thread.threadId fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java19ThreadId.class',
      runoutPath = 'classes/modern_test/Java19ThreadId.runout',
      expectedOutput = [
        'true',
        'true'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    var mainCode = [
      0xb8, 0x00, 0x1d,
      0x4c,
      0x2b,
      0xb6, 0x00, 0x21,
      0x09,
      0x94,
      0x9e, 0x00, 0x07,
      0x04,
      0xa7, 0x00, 0x04,
      0x03,
      0x3d,
      0xb2, 0x00, 0x0e,
      0x1c,
      0xb6, 0x00, 0x14,
      0x2b,
      0xb6, 0x00, 0x21,
      0x2b,
      0xb6, 0x00, 0x25,
      0x94,
      0x9a, 0x00, 0x07,
      0x04,
      0xa7, 0x00, 0x04,
      0x03,
      0x3d,
      0xb2, 0x00, 0x0e,
      0x1c,
      0xb6, 0x00, 0x14,
      0xb1
    ];

    u4(0xcafebabe);
    u2(0);
    u2(63);
    u2(40);
    cls(2);
    utf8('classes/modern_test/Java19ThreadId');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(Z)V');
    ref(10, 18, 25);
    nameAndType(22, 26);
    utf8('(J)V');
    cls(28);
    utf8('java/lang/Thread');
    ref(10, 27, 30);
    nameAndType(31, 32);
    utf8('currentThread');
    utf8('()Ljava/lang/Thread;');
    ref(10, 27, 34);
    nameAndType(35, 36);
    utf8('threadId');
    utf8('()J');
    ref(10, 27, 38);
    nameAndType(39, 36);
    utf8('getId');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 4, 3);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java19_thread_sleep_duration', 'Generate a Java 19 Thread.sleep(Duration) fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java19ThreadSleepDuration.class',
      runoutPath = 'classes/modern_test/Java19ThreadSleepDuration.runout',
      expectedOutput = [
        'negative',
        'zero',
        'tiny',
        'npe'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function str(stringIndex: number): void {
      u1(8);
      u2(stringIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number, exceptions?: number[][]): void {
      var exceptionTable = exceptions || [];
      u2(7);
      u4(12 + code.length + (exceptionTable.length * 8));
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(exceptionTable.length);
      exceptionTable.forEach(function(entry: number[]): void {
        u2(entry[0]);
        u2(entry[1]);
        u2(entry[2]);
        u2(entry[3]);
      });
      u2(0);
    }

    function patchU2(code: number[], offset: number, value: number): void {
      code[offset] = (value >>> 8) & 0xff;
      code[offset + 1] = value & 0xff;
    }

    function emitU2Operand(code: number[], opcode: number, index: number): void {
      code.push(opcode, (index >>> 8) & 0xff, index & 0xff);
    }

    function emitPrintString(code: number[], stringIndex: number): void {
      emitU2Operand(code, 0xb2, 14);
      code.push(0x12, stringIndex);
      emitU2Operand(code, 0xb6, 20);
    }

    var mainCode: number[] = [],
      tryStart: number,
      tryEnd: number,
      catchStart: number,
      afterCatch: number,
      gotoOffset: number;

    mainCode.push(0x0a);
    emitU2Operand(mainCode, 0xb8, 31);
    emitU2Operand(mainCode, 0xb6, 38);
    emitU2Operand(mainCode, 0xb8, 42);
    emitPrintString(mainCode, 47);
    emitU2Operand(mainCode, 0xb2, 43);
    emitU2Operand(mainCode, 0xb8, 42);
    emitPrintString(mainCode, 49);
    mainCode.push(0x0a);
    emitU2Operand(mainCode, 0xb8, 34);
    emitU2Operand(mainCode, 0xb8, 42);
    emitPrintString(mainCode, 51);
    tryStart = mainCode.length;
    mainCode.push(0x01);
    emitU2Operand(mainCode, 0xb8, 42);
    tryEnd = mainCode.length;
    emitPrintString(mainCode, 53);
    gotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    catchStart = mainCode.length;
    mainCode.push(0x4c);
    emitPrintString(mainCode, 55);
    afterCatch = mainCode.length;
    patchU2(mainCode, gotoOffset + 1, afterCatch - gotoOffset);
    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(63);
    u2(59);
    cls(2);
    utf8('classes/modern_test/Java19ThreadSleepDuration');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    cls(25);
    utf8('java/lang/Thread');
    cls(27);
    utf8('java/time/Duration');
    nameAndType(29, 30);
    utf8('ofMillis');
    utf8('(J)Ljava/time/Duration;');
    ref(10, 26, 28);
    nameAndType(33, 30);
    utf8('ofNanos');
    ref(10, 26, 32);
    nameAndType(36, 37);
    utf8('negated');
    utf8('()Ljava/time/Duration;');
    ref(10, 26, 35);
    nameAndType(40, 41);
    utf8('sleep');
    utf8('(Ljava/time/Duration;)V');
    ref(10, 24, 39);
    ref(9, 26, 44);
    nameAndType(45, 46);
    utf8('ZERO');
    utf8('Ljava/time/Duration;');
    str(48);
    utf8('negative');
    str(50);
    utf8('zero');
    str(52);
    utf8('tiny');
    str(54);
    utf8('null-missed');
    str(56);
    utf8('npe');
    cls(58);
    utf8('java/lang/NullPointerException');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 2, 2, [[tryStart, tryEnd, catchStart, 57]]);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java19_thread_sleep_duration_interrupt', 'Generate a Java 19 Thread.sleep(Duration) interrupt fixture.', function() {
    var bytes: number[] = [],
      mainPath = 'classes/modern_test/Java19ThreadSleepDurationInterrupt.class',
      sleeperPath = 'classes/modern_test/Java19ThreadSleepDurationInterruptSleeper.class',
      runoutPath = 'classes/modern_test/Java19ThreadSleepDurationInterrupt.runout',
      expectedOutput = 'interrupted\n',
      codeAttributeIndex = 9;

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function str(stringIndex: number): void {
      u1(8);
      u2(stringIndex);
    }

    function longConst(value: number): void {
      var high = Math.floor(value / 0x100000000),
        low = value >>> 0;
      u1(5);
      u4(high);
      u4(low);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number, exceptions?: number[][]): void {
      var exceptionTable = exceptions || [];
      u2(codeAttributeIndex);
      u4(12 + code.length + (exceptionTable.length * 8));
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(exceptionTable.length);
      exceptionTable.forEach(function(entry: number[]): void {
        u2(entry[0]);
        u2(entry[1]);
        u2(entry[2]);
        u2(entry[3]);
      });
      u2(0);
    }

    var sleeperCode = [
      0x14, 0x00, 0x2b,
      0xb8, 0x00, 0x12,
      0xb8, 0x00, 0x18,
      0xb2, 0x00, 0x1e,
      0x12, 0x25,
      0xb6, 0x00, 0x24,
      0xa7, 0x00, 0x0c,
      0x4c,
      0xb2, 0x00, 0x1e,
      0x12, 0x27,
      0xb6, 0x00, 0x24,
      0xb1
    ];

    u4(0xcafebabe);
    u2(0);
    u2(63);
    u2(45);
    cls(2);
    utf8('classes/modern_test/Java19ThreadSleepDurationInterruptSleeper');
    cls(4);
    utf8('java/lang/Object');
    cls(6);
    utf8('java/lang/Runnable');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 11);
    nameAndType(7, 8);
    utf8('run');
    cls(14);
    utf8('java/time/Duration');
    nameAndType(16, 17);
    utf8('ofMillis');
    utf8('(J)Ljava/time/Duration;');
    ref(10, 13, 15);
    cls(20);
    utf8('java/lang/Thread');
    nameAndType(22, 23);
    utf8('sleep');
    utf8('(Ljava/time/Duration;)V');
    ref(10, 19, 21);
    cls(26);
    utf8('java/lang/System');
    nameAndType(28, 29);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    ref(9, 25, 27);
    cls(32);
    utf8('java/io/PrintStream');
    nameAndType(34, 35);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    ref(10, 31, 33);
    str(38);
    utf8('missed');
    str(40);
    utf8('interrupted');
    cls(42);
    utf8('java/lang/InterruptedException');
    longConst(2000);
    u2(0x0021);
    u2(1);
    u2(3);
    u2(1);
    u2(5);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(7);
    u2(8);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x0a, 0xb1], 1, 1);
    u2(0x0001);
    u2(12);
    u2(8);
    u2(1);
    codeAttr(sleeperCode, 2, 2, [[0, 9, 20, 41]]);
    u2(0);
    grunt.file.write(sleeperPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + sleeperPath);

    bytes = [];
    codeAttributeIndex = 7;
    u4(0xcafebabe);
    u2(0);
    u2(63);
    u2(35);
    cls(2);
    utf8('classes/modern_test/Java19ThreadSleepDurationInterrupt');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/Thread');
    cls(15);
    utf8('classes/modern_test/Java19ThreadSleepDurationInterruptSleeper');
    ref(10, 14, 9);
    utf8('(Ljava/lang/Runnable;)V');
    nameAndType(5, 17);
    ref(10, 12, 18);
    utf8('start');
    nameAndType(20, 6);
    ref(10, 12, 21);
    longConst(500);
    utf8('sleep');
    utf8('(J)V');
    nameAndType(25, 26);
    ref(10, 12, 27);
    utf8('interrupt');
    nameAndType(29, 6);
    ref(10, 12, 30);
    utf8('join');
    nameAndType(32, 6);
    ref(10, 12, 33);
    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xbb, 0x00, 0x0c,
      0x59,
      0xbb, 0x00, 0x0e,
      0x59,
      0xb7, 0x00, 0x10,
      0xb7, 0x00, 0x13,
      0x4c,
      0x2b,
      0xb6, 0x00, 0x16,
      0x14, 0x00, 0x17,
      0xb8, 0x00, 0x1c,
      0x2b,
      0xb6, 0x00, 0x1f,
      0x2b,
      0xb6, 0x00, 0x22,
      0xb1
    ], 4, 2);
    u2(0);
    grunt.file.write(mainPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + mainPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java21_thread_is_virtual', 'Generate a Java 21 Thread.isVirtual fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java21ThreadIsVirtual.class',
      workerPath = 'classes/modern_test/Java21ThreadIsVirtualWorker.class',
      runoutPath = 'classes/modern_test/Java21ThreadIsVirtual.runout',
      codeAttributeIndex = 9,
      expectedOutput = [
        'false',
        'false',
        'false'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(codeAttributeIndex);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    var workerCode = [
      0xb8, 0x00, 0x0f,
      0xb6, 0x00, 0x13,
      0x3c,
      0xb2, 0x00, 0x19,
      0x1b,
      0xb6, 0x00, 0x1f,
      0xb1
    ];

    u4(0xcafebabe);
    u2(0);
    u2(65);
    u2(35);
    cls(2);
    utf8('classes/modern_test/Java21ThreadIsVirtualWorker');
    cls(4);
    utf8('java/lang/Object');
    cls(6);
    utf8('java/lang/Runnable');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 11);
    nameAndType(7, 8);
    utf8('run');
    cls(14);
    utf8('java/lang/Thread');
    ref(10, 13, 16);
    nameAndType(17, 18);
    utf8('currentThread');
    utf8('()Ljava/lang/Thread;');
    ref(10, 13, 20);
    nameAndType(21, 22);
    utf8('isVirtual');
    utf8('()Z');
    cls(24);
    utf8('java/lang/System');
    ref(9, 23, 26);
    nameAndType(27, 28);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(30);
    utf8('java/io/PrintStream');
    ref(10, 29, 32);
    nameAndType(33, 34);
    utf8('println');
    utf8('(Z)V');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(1);
    u2(5);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(7);
    u2(8);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x0a, 0xb1], 1, 1);
    u2(0x0001);
    u2(12);
    u2(8);
    u2(1);
    codeAttr(workerCode, 2, 2);
    u2(0);
    grunt.file.write(workerPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + workerPath);

    var mainCode = [
      0xb8, 0x00, 0x1a,
      0xb6, 0x00, 0x1e,
      0x3c,
      0xb2, 0x00, 0x0e,
      0x1b,
      0xb6, 0x00, 0x14,
      0xbb, 0x00, 0x18,
      0x59,
      0xb7, 0x00, 0x22,
      0xb6, 0x00, 0x1e,
      0x3c,
      0xb2, 0x00, 0x0e,
      0x1b,
      0xb6, 0x00, 0x14,
      0xbb, 0x00, 0x18,
      0x59,
      0xbb, 0x00, 0x23,
      0x59,
      0xb7, 0x00, 0x25,
      0xb7, 0x00, 0x28,
      0x4d,
      0x2c,
      0xb6, 0x00, 0x2b,
      0x2c,
      0xb6, 0x00, 0x2e,
      0xb1
    ];

    bytes = [];
    codeAttributeIndex = 7;
    u4(0xcafebabe);
    u2(0);
    u2(65);
    u2(47);
    cls(2);
    utf8('classes/modern_test/Java21ThreadIsVirtual');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(Z)V');
    cls(25);
    utf8('java/lang/Thread');
    ref(10, 24, 27);
    nameAndType(28, 29);
    utf8('currentThread');
    utf8('()Ljava/lang/Thread;');
    ref(10, 24, 31);
    nameAndType(32, 33);
    utf8('isVirtual');
    utf8('()Z');
    ref(10, 24, 9);
    cls(36);
    utf8('classes/modern_test/Java21ThreadIsVirtualWorker');
    ref(10, 35, 9);
    utf8('(Ljava/lang/Runnable;)V');
    nameAndType(5, 38);
    ref(10, 24, 39);
    utf8('start');
    nameAndType(41, 6);
    ref(10, 24, 42);
    utf8('join');
    nameAndType(44, 6);
    ref(10, 24, 45);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 4, 3);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java21_list_sequenced', 'Generate a Java 21 List.getFirst/getLast fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java21ListSequenced.class',
      runoutPath = 'classes/modern_test/Java21ListSequenced.runout',
      expectedOutput = [
        'a',
        'b',
        'true',
        'nse-first',
        'nse-last',
        'true',
        'b',
        'a',
        'true',
        'a',
        'c',
        'a',
        'c',
        '1'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function str(stringIndex: number): void {
      u1(8);
      u2(stringIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number, exceptions?: number[][]): void {
      var exceptionTable = exceptions || [];
      u2(7);
      u4(12 + code.length + (exceptionTable.length * 8));
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(exceptionTable.length);
      exceptionTable.forEach(function(entry: number[]): void {
        u2(entry[0]);
        u2(entry[1]);
        u2(entry[2]);
        u2(entry[3]);
      });
      u2(0);
    }

    function patchU2(code: number[], offset: number, value: number): void {
      code[offset] = (value >>> 8) & 0xff;
      code[offset + 1] = value & 0xff;
    }

    function emitU2Operand(code: number[], opcode: number, index: number): void {
      code.push(opcode, (index >>> 8) & 0xff, index & 0xff);
    }

    function emitInvokeInterface(code: number[], methodRef: number): void {
      code.push(0xb9, (methodRef >>> 8) & 0xff, methodRef & 0xff, 0x01, 0x00);
    }

    function emitPrintString(code: number[], stringIndex: number): void {
      emitU2Operand(code, 0xb2, 14);
      code.push(0x12, stringIndex);
      emitU2Operand(code, 0xb6, 20);
    }

    function emitPrintListValue(code: number[], methodRef: number): void {
      emitU2Operand(code, 0xb2, 14);
      code.push(0x12, 29);
      code.push(0x12, 31);
      emitU2Operand(code, 0xb8, 36);
      emitInvokeInterface(code, methodRef);
      emitU2Operand(code, 0xc0, 44);
      emitU2Operand(code, 0xb6, 20);
    }

    var mainCode: number[] = [],
      falseBranchOffset: number,
      afterBooleanOffset: number,
      booleanFalse: number,
      booleanAfter: number,
      firstTryStart: number,
      firstTryEnd: number,
      firstCatchStart: number,
      firstAfterCatch: number,
      firstGotoOffset: number,
      lastTryStart: number,
      lastTryEnd: number,
      lastCatchStart: number,
      lastAfterCatch: number,
      lastGotoOffset: number,
      doubleReversedFalseOffset: number,
      doubleReversedAfterOffset: number,
      doubleReversedFalse: number,
      doubleReversedAfter: number;

    emitPrintListValue(mainCode, 40);
    emitPrintListValue(mainCode, 43);

    mainCode.push(0x12, 46);
    emitU2Operand(mainCode, 0xb8, 50);
    mainCode.push(0x4c);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, 40);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, 43);
    falseBranchOffset = mainCode.length;
    mainCode.push(0xa6, 0x00, 0x00);
    mainCode.push(0x04);
    afterBooleanOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    booleanFalse = mainCode.length;
    mainCode.push(0x03);
    booleanAfter = mainCode.length;
    patchU2(mainCode, falseBranchOffset + 1, booleanFalse - falseBranchOffset);
    patchU2(mainCode, afterBooleanOffset + 1, booleanAfter - afterBooleanOffset);
    emitU2Operand(mainCode, 0xb6, 24);

    firstTryStart = mainCode.length;
    emitU2Operand(mainCode, 0xb8, 53);
    emitInvokeInterface(mainCode, 40);
    mainCode.push(0x57);
    firstTryEnd = mainCode.length;
    emitPrintString(mainCode, 54);
    firstGotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    firstCatchStart = mainCode.length;
    mainCode.push(0x4c);
    emitPrintString(mainCode, 56);
    firstAfterCatch = mainCode.length;
    patchU2(mainCode, firstGotoOffset + 1, firstAfterCatch - firstGotoOffset);

    lastTryStart = mainCode.length;
    emitU2Operand(mainCode, 0xb8, 53);
    emitInvokeInterface(mainCode, 43);
    mainCode.push(0x57);
    lastTryEnd = mainCode.length;
    emitPrintString(mainCode, 58);
    lastGotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    lastCatchStart = mainCode.length;
    mainCode.push(0x4c);
    emitPrintString(mainCode, 60);
    lastAfterCatch = mainCode.length;
    patchU2(mainCode, lastGotoOffset + 1, lastAfterCatch - lastGotoOffset);

    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x12, 29);
    mainCode.push(0x12, 31);
    emitU2Operand(mainCode, 0xb8, 36);
    emitU2Operand(mainCode, 0xc1, 66);
    emitU2Operand(mainCode, 0xb6, 24);

    mainCode.push(0x12, 29);
    mainCode.push(0x12, 31);
    emitU2Operand(mainCode, 0xb8, 36);
    mainCode.push(0x4d);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2c);
    emitInvokeInterface(mainCode, 71);
    emitInvokeInterface(mainCode, 40);
    emitU2Operand(mainCode, 0xc0, 44);
    emitU2Operand(mainCode, 0xb6, 20);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2c);
    emitInvokeInterface(mainCode, 71);
    emitInvokeInterface(mainCode, 43);
    emitU2Operand(mainCode, 0xc0, 44);
    emitU2Operand(mainCode, 0xb6, 20);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2c);
    emitInvokeInterface(mainCode, 71);
    emitInvokeInterface(mainCode, 71);
    mainCode.push(0x2c);
    doubleReversedFalseOffset = mainCode.length;
    mainCode.push(0xa6, 0x00, 0x00);
    mainCode.push(0x04);
    doubleReversedAfterOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    doubleReversedFalse = mainCode.length;
    mainCode.push(0x03);
    doubleReversedAfter = mainCode.length;
    patchU2(mainCode, doubleReversedFalseOffset + 1, doubleReversedFalse - doubleReversedFalseOffset);
    patchU2(mainCode, doubleReversedAfterOffset + 1, doubleReversedAfter - doubleReversedAfterOffset);
    emitU2Operand(mainCode, 0xb6, 24);

    emitU2Operand(mainCode, 0xbb, 72);
    mainCode.push(0x59);
    emitU2Operand(mainCode, 0xb7, 74);
    mainCode.push(0x4e);
    mainCode.push(0x2d);
    mainCode.push(0x12, 31);
    mainCode.push(0xb9, 0x00, 0x4e, 0x02, 0x00);
    mainCode.push(0x57);
    mainCode.push(0x2d);
    mainCode.push(0x12, 29);
    mainCode.push(0xb9, 0x00, 0x52, 0x02, 0x00);
    mainCode.push(0x2d);
    mainCode.push(0x12, 64);
    mainCode.push(0xb9, 0x00, 0x55, 0x02, 0x00);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, 40);
    emitU2Operand(mainCode, 0xc0, 44);
    emitU2Operand(mainCode, 0xb6, 20);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, 43);
    emitU2Operand(mainCode, 0xc0, 44);
    emitU2Operand(mainCode, 0xb6, 20);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, 88);
    emitU2Operand(mainCode, 0xc0, 44);
    emitU2Operand(mainCode, 0xb6, 20);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, 91);
    emitU2Operand(mainCode, 0xc0, 44);
    emitU2Operand(mainCode, 0xb6, 20);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, 95);
    emitU2Operand(mainCode, 0xb6, 98);

    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(65);
    u2(99);
    cls(2);
    utf8('classes/modern_test/Java21ListSequenced');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    ref(10, 18, 25);
    nameAndType(22, 26);
    utf8('(Z)V');
    cls(28);
    utf8('java/util/List');
    str(30);
    utf8('a');
    str(32);
    utf8('b');
    utf8('of');
    utf8('(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;');
    nameAndType(33, 34);
    ref(11, 27, 35);
    utf8('getFirst');
    utf8('()Ljava/lang/Object;');
    nameAndType(37, 38);
    ref(11, 27, 39);
    utf8('getLast');
    nameAndType(41, 38);
    ref(11, 27, 42);
    cls(45);
    utf8('java/lang/String');
    str(47);
    utf8('solo');
    utf8('(Ljava/lang/Object;)Ljava/util/List;');
    nameAndType(33, 48);
    ref(11, 27, 49);
    utf8('()Ljava/util/List;');
    nameAndType(33, 51);
    ref(11, 27, 52);
    str(55);
    utf8('missed-first');
    str(57);
    utf8('nse-first');
    str(59);
    utf8('missed-last');
    str(61);
    utf8('nse-last');
    cls(63);
    utf8('java/util/NoSuchElementException');
    str(65);
    utf8('c');
    cls(67);
    utf8('java/util/SequencedCollection');
    utf8('reversed');
    utf8('()Ljava/util/List;');
    nameAndType(68, 69);
    ref(11, 27, 70);
    cls(73);
    utf8('java/util/ArrayList');
    ref(10, 72, 9);
    utf8('add');
    utf8('(Ljava/lang/Object;)Z');
    nameAndType(75, 76);
    ref(11, 27, 77);
    utf8('addFirst');
    utf8('(Ljava/lang/Object;)V');
    nameAndType(79, 80);
    ref(11, 27, 81);
    utf8('addLast');
    nameAndType(83, 80);
    ref(11, 27, 84);
    utf8('removeFirst');
    nameAndType(86, 38);
    ref(11, 27, 87);
    utf8('removeLast');
    nameAndType(89, 38);
    ref(11, 27, 90);
    utf8('size');
    utf8('()I');
    nameAndType(92, 93);
    ref(11, 27, 94);
    utf8('(I)V');
    nameAndType(22, 96);
    ref(10, 18, 97);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 4, 4, [
      [firstTryStart, firstTryEnd, firstCatchStart, 62],
      [lastTryStart, lastTryEnd, lastCatchStart, 62]
    ]);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java21_deque_sequenced', 'Generate a Java 21 Deque sequenced-collection fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java21DequeSequenced.class',
      runoutPath = 'classes/modern_test/Java21DequeSequenced.runout',
      expectedOutput = [
        'true',
        'a',
        'c',
        'c',
        'a',
        'true',
        'a',
        'c',
        '1',
        'nse-first'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function str(stringIndex: number): void {
      u1(8);
      u2(stringIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number, exceptions?: number[][]): void {
      var exceptionTable = exceptions || [];
      u2(7);
      u4(12 + code.length + (exceptionTable.length * 8));
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(exceptionTable.length);
      exceptionTable.forEach(function(entry: number[]): void {
        u2(entry[0]);
        u2(entry[1]);
        u2(entry[2]);
        u2(entry[3]);
      });
      u2(0);
    }

    function patchU2(code: number[], offset: number, value: number): void {
      code[offset] = (value >>> 8) & 0xff;
      code[offset + 1] = value & 0xff;
    }

    function emitU2Operand(code: number[], opcode: number, index: number): void {
      code.push(opcode, (index >>> 8) & 0xff, index & 0xff);
    }

    function emitInvokeInterface(code: number[], methodRef: number, argCount: number): void {
      code.push(0xb9, (methodRef >>> 8) & 0xff, methodRef & 0xff, argCount, 0x00);
    }

    function emitPrintString(code: number[], stringIndex: number): void {
      emitU2Operand(code, 0xb2, 14);
      code.push(0x12, stringIndex);
      emitU2Operand(code, 0xb6, 20);
    }

    function emitPrintDequeValue(code: number[], loadOpcode: number, methodRef: number): void {
      emitU2Operand(code, 0xb2, 14);
      code.push(loadOpcode);
      emitInvokeInterface(code, methodRef, 1);
      emitU2Operand(code, 0xc0, 65);
      emitU2Operand(code, 0xb6, 20);
    }

    var mainCode: number[] = [],
      doubleReversedFalseOffset: number,
      doubleReversedAfterOffset: number,
      doubleReversedFalse: number,
      doubleReversedAfter: number,
      firstTryStart: number,
      firstTryEnd: number,
      firstCatchStart: number,
      firstAfterCatch: number,
      firstGotoOffset: number;

    emitU2Operand(mainCode, 0xbb, 30);
    mainCode.push(0x59);
    emitU2Operand(mainCode, 0xb7, 32);
    mainCode.push(0x4c);
    mainCode.push(0x2b, 0x12, 39);
    emitInvokeInterface(mainCode, 46, 2);
    mainCode.push(0x57);
    mainCode.push(0x2b, 0x12, 37);
    emitInvokeInterface(mainCode, 50, 2);
    mainCode.push(0x2b, 0x12, 41);
    emitInvokeInterface(mainCode, 53, 2);

    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2b);
    emitU2Operand(mainCode, 0xc1, 35);
    emitU2Operand(mainCode, 0xb6, 24);
    emitPrintDequeValue(mainCode, 0x2b, 57);
    emitPrintDequeValue(mainCode, 0x2b, 60);

    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, 64, 1);
    mainCode.push(0x4d);
    emitPrintDequeValue(mainCode, 0x2c, 57);
    emitPrintDequeValue(mainCode, 0x2c, 60);

    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2c);
    emitInvokeInterface(mainCode, 64, 1);
    mainCode.push(0x2b);
    doubleReversedFalseOffset = mainCode.length;
    mainCode.push(0xa6, 0x00, 0x00);
    mainCode.push(0x04);
    doubleReversedAfterOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    doubleReversedFalse = mainCode.length;
    mainCode.push(0x03);
    doubleReversedAfter = mainCode.length;
    patchU2(mainCode, doubleReversedFalseOffset + 1, doubleReversedFalse - doubleReversedFalseOffset);
    patchU2(mainCode, doubleReversedAfterOffset + 1, doubleReversedAfter - doubleReversedAfterOffset);
    emitU2Operand(mainCode, 0xb6, 24);

    emitPrintDequeValue(mainCode, 0x2b, 69);
    emitPrintDequeValue(mainCode, 0x2b, 72);
    emitU2Operand(mainCode, 0xb2, 14);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, 76, 1);
    emitU2Operand(mainCode, 0xb6, 27);

    emitU2Operand(mainCode, 0xbb, 30);
    mainCode.push(0x59);
    emitU2Operand(mainCode, 0xb7, 32);
    mainCode.push(0x4e);
    firstTryStart = mainCode.length;
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, 57, 1);
    mainCode.push(0x57);
    firstTryEnd = mainCode.length;
    emitPrintString(mainCode, 77);
    firstGotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    firstCatchStart = mainCode.length;
    mainCode.push(0x4e);
    emitPrintString(mainCode, 79);
    firstAfterCatch = mainCode.length;
    patchU2(mainCode, firstGotoOffset + 1, firstAfterCatch - firstGotoOffset);
    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(65);
    u2(83);
    cls(2);
    utf8('classes/modern_test/Java21DequeSequenced');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    ref(10, 18, 25);
    nameAndType(22, 26);
    utf8('(Z)V');
    ref(10, 18, 28);
    nameAndType(22, 29);
    utf8('(I)V');
    cls(31);
    utf8('java/util/ArrayDeque');
    ref(10, 30, 9);
    cls(34);
    utf8('java/util/Deque');
    cls(36);
    utf8('java/util/SequencedCollection');
    str(38);
    utf8('a');
    str(40);
    utf8('b');
    str(42);
    utf8('c');
    utf8('add');
    utf8('(Ljava/lang/Object;)Z');
    nameAndType(43, 44);
    ref(11, 33, 45);
    utf8('addFirst');
    utf8('(Ljava/lang/Object;)V');
    nameAndType(47, 48);
    ref(11, 33, 49);
    utf8('addLast');
    nameAndType(51, 48);
    ref(11, 33, 52);
    utf8('getFirst');
    utf8('()Ljava/lang/Object;');
    nameAndType(54, 55);
    ref(11, 33, 56);
    utf8('getLast');
    nameAndType(58, 55);
    ref(11, 33, 59);
    utf8('reversed');
    utf8('()Ljava/util/Deque;');
    nameAndType(61, 62);
    ref(11, 33, 63);
    cls(66);
    utf8('java/lang/String');
    utf8('removeFirst');
    nameAndType(67, 55);
    ref(11, 33, 68);
    utf8('removeLast');
    nameAndType(70, 55);
    ref(11, 33, 71);
    utf8('size');
    utf8('()I');
    nameAndType(73, 74);
    ref(11, 33, 75);
    str(78);
    utf8('missed-first');
    str(80);
    utf8('nse-first');
    cls(82);
    utf8('java/util/NoSuchElementException');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 4, 4, [
      [firstTryStart, firstTryEnd, firstCatchStart, 81]
    ]);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java21_sorted_set_sequenced', 'Generate a Java 21 sorted-set sequenced-collection fixture.', function() {
    var bytes: number[] = [],
      cpEntries: number[][] = [null],
      utf8Cache: { [key: string]: number } = {},
      classCache: { [key: string]: number } = {},
      stringCache: { [key: string]: number } = {},
      nameAndTypeCache: { [key: string]: number } = {},
      refCache: { [key: string]: number } = {},
      outPath = 'classes/modern_test/Java21SortedSetSequenced.class',
      runoutPath = 'classes/modern_test/Java21SortedSetSequenced.runout',
      expectedOutput = [
        'true',
        'true',
        'a',
        'c',
        'c',
        'a',
        'a',
        'c',
        '1',
        'nse-first',
        'uoe-addfirst'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function addCp(entry: number[]): number {
      cpEntries.push(entry);
      return cpEntries.length - 1;
    }

    function cpUtf8(value: string): number {
      var cached = utf8Cache[value],
        buf: Buffer,
        entry: number[],
        i: number;
      if (cached) {
        return cached;
      }
      buf = Buffer.from(value, 'utf8');
      entry = [1, (buf.length >>> 8) & 0xff, buf.length & 0xff];
      for (i = 0; i < buf.length; i++) {
        entry.push(buf[i]);
      }
      cached = addCp(entry);
      utf8Cache[value] = cached;
      return cached;
    }

    function cpClass(name: string): number {
      var cached = classCache[name],
        nameIndex: number;
      if (cached) {
        return cached;
      }
      nameIndex = cpUtf8(name);
      cached = addCp([7, (nameIndex >>> 8) & 0xff, nameIndex & 0xff]);
      classCache[name] = cached;
      return cached;
    }

    function cpString(value: string): number {
      var cached = stringCache[value],
        stringIndex: number;
      if (cached) {
        return cached;
      }
      stringIndex = cpUtf8(value);
      cached = addCp([8, (stringIndex >>> 8) & 0xff, stringIndex & 0xff]);
      stringCache[value] = cached;
      return cached;
    }

    function cpNameAndType(name: string, descriptor: string): number {
      var key = name + '\n' + descriptor,
        cached = nameAndTypeCache[key],
        nameIndex: number,
        descriptorIndex: number;
      if (cached) {
        return cached;
      }
      nameIndex = cpUtf8(name);
      descriptorIndex = cpUtf8(descriptor);
      cached = addCp([12, (nameIndex >>> 8) & 0xff, nameIndex & 0xff,
        (descriptorIndex >>> 8) & 0xff, descriptorIndex & 0xff]);
      nameAndTypeCache[key] = cached;
      return cached;
    }

    function cpRef(tag: number, className: string, name: string, descriptor: string): number {
      var key = tag + '\n' + className + '\n' + name + '\n' + descriptor,
        cached = refCache[key],
        classIndex: number,
        nameAndTypeIndex: number;
      if (cached) {
        return cached;
      }
      classIndex = cpClass(className);
      nameAndTypeIndex = cpNameAndType(name, descriptor);
      cached = addCp([tag, (classIndex >>> 8) & 0xff, classIndex & 0xff,
        (nameAndTypeIndex >>> 8) & 0xff, nameAndTypeIndex & 0xff]);
      refCache[key] = cached;
      return cached;
    }

    function writeCp(): void {
      var i: number,
        j: number,
        entry: number[];
      u2(cpEntries.length);
      for (i = 1; i < cpEntries.length; i++) {
        entry = cpEntries[i];
        for (j = 0; j < entry.length; j++) {
          u1(entry[j]);
        }
      }
    }

    function codeAttr(code: number[], codeNameIndex: number, maxStack: number, maxLocals: number, exceptions?: number[][]): void {
      var exceptionTable = exceptions || [];
      u2(codeNameIndex);
      u4(12 + code.length + (exceptionTable.length * 8));
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(exceptionTable.length);
      exceptionTable.forEach(function(entry: number[]): void {
        u2(entry[0]);
        u2(entry[1]);
        u2(entry[2]);
        u2(entry[3]);
      });
      u2(0);
    }

    function patchU2(code: number[], offset: number, value: number): void {
      code[offset] = (value >>> 8) & 0xff;
      code[offset + 1] = value & 0xff;
    }

    function emitU2Operand(code: number[], opcode: number, index: number): void {
      code.push(opcode, (index >>> 8) & 0xff, index & 0xff);
    }

    function emitLdc(code: number[], index: number): void {
      if (index > 0xff) {
        grunt.fail.fatal('Java21SortedSetSequenced constant pool grew past ldc range.');
      }
      code.push(0x12, index);
    }

    function emitInvokeInterface(code: number[], methodRef: number, argCount: number): void {
      code.push(0xb9, (methodRef >>> 8) & 0xff, methodRef & 0xff, argCount, 0x00);
    }

    function emitPrintString(code: number[], outField: number, printlnString: number, stringIndex: number): void {
      emitU2Operand(code, 0xb2, outField);
      emitLdc(code, stringIndex);
      emitU2Operand(code, 0xb6, printlnString);
    }

    function emitPrintSetValue(code: number[], outField: number, printlnString: number, stringClass: number, loadOpcode: number, methodRef: number): void {
      emitU2Operand(code, 0xb2, outField);
      code.push(loadOpcode);
      emitInvokeInterface(code, methodRef, 1);
      emitU2Operand(code, 0xc0, stringClass);
      emitU2Operand(code, 0xb6, printlnString);
    }

    var thisClass = cpClass('classes/modern_test/Java21SortedSetSequenced'),
      objectClass = cpClass('java/lang/Object'),
      codeName = cpUtf8('Code'),
      initName = cpUtf8('<init>'),
      voidDescriptor = cpUtf8('()V'),
      objectInit = cpRef(10, 'java/lang/Object', '<init>', '()V'),
      mainName = cpUtf8('main'),
      mainDescriptor = cpUtf8('([Ljava/lang/String;)V'),
      systemOut = cpRef(9, 'java/lang/System', 'out', 'Ljava/io/PrintStream;'),
      printlnString = cpRef(10, 'java/io/PrintStream', 'println', '(Ljava/lang/String;)V'),
      printlnBoolean = cpRef(10, 'java/io/PrintStream', 'println', '(Z)V'),
      printlnInt = cpRef(10, 'java/io/PrintStream', 'println', '(I)V'),
      treeSetClass = cpClass('java/util/TreeSet'),
      treeSetInit = cpRef(10, 'java/util/TreeSet', '<init>', '()V'),
      setClass = cpClass('java/util/Set'),
      sortedSetClass = cpClass('java/util/SortedSet'),
      sequencedSetClass = cpClass('java/util/SequencedSet'),
      sequencedCollectionClass = cpClass('java/util/SequencedCollection'),
      stringClass = cpClass('java/lang/String'),
      noSuchElementClass = cpClass('java/util/NoSuchElementException'),
      unsupportedOperationClass = cpClass('java/lang/UnsupportedOperationException'),
      stringA = cpString('a'),
      stringB = cpString('b'),
      stringC = cpString('c'),
      missedFirst = cpString('missed-first'),
      nseFirst = cpString('nse-first'),
      missedAddFirst = cpString('missed-addfirst'),
      uoeAddFirst = cpString('uoe-addfirst'),
      setAdd = cpRef(11, 'java/util/Set', 'add', '(Ljava/lang/Object;)Z'),
      setSize = cpRef(11, 'java/util/Set', 'size', '()I'),
      sequencedGetFirst = cpRef(11, 'java/util/SequencedSet', 'getFirst', '()Ljava/lang/Object;'),
      sequencedGetLast = cpRef(11, 'java/util/SequencedSet', 'getLast', '()Ljava/lang/Object;'),
      sequencedReversed = cpRef(11, 'java/util/SequencedSet', 'reversed', '()Ljava/util/SequencedSet;'),
      sortedGetFirst = cpRef(11, 'java/util/SortedSet', 'getFirst', '()Ljava/lang/Object;'),
      sortedRemoveFirst = cpRef(11, 'java/util/SortedSet', 'removeFirst', '()Ljava/lang/Object;'),
      sortedRemoveLast = cpRef(11, 'java/util/SortedSet', 'removeLast', '()Ljava/lang/Object;'),
      sortedAddFirst = cpRef(11, 'java/util/SortedSet', 'addFirst', '(Ljava/lang/Object;)V'),
      mainCode: number[] = [],
      firstTryStart: number,
      firstTryEnd: number,
      firstCatchStart: number,
      firstAfterCatch: number,
      firstGotoOffset: number,
      addFirstTryStart: number,
      addFirstTryEnd: number,
      addFirstCatchStart: number,
      addFirstAfterCatch: number,
      addFirstGotoOffset: number;

    emitU2Operand(mainCode, 0xbb, treeSetClass);
    mainCode.push(0x59);
    emitU2Operand(mainCode, 0xb7, treeSetInit);
    mainCode.push(0x4c);
    mainCode.push(0x2b);
    emitLdc(mainCode, stringB);
    emitInvokeInterface(mainCode, setAdd, 2);
    mainCode.push(0x57);
    mainCode.push(0x2b);
    emitLdc(mainCode, stringA);
    emitInvokeInterface(mainCode, setAdd, 2);
    mainCode.push(0x57);
    mainCode.push(0x2b);
    emitLdc(mainCode, stringC);
    emitInvokeInterface(mainCode, setAdd, 2);
    mainCode.push(0x57);

    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitU2Operand(mainCode, 0xc1, sequencedSetClass);
    emitU2Operand(mainCode, 0xb6, printlnBoolean);
    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitU2Operand(mainCode, 0xc1, sequencedCollectionClass);
    emitU2Operand(mainCode, 0xb6, printlnBoolean);
    emitPrintSetValue(mainCode, systemOut, printlnString, stringClass, 0x2b, sequencedGetFirst);
    emitPrintSetValue(mainCode, systemOut, printlnString, stringClass, 0x2b, sequencedGetLast);

    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, sequencedReversed, 1);
    mainCode.push(0x4d);
    emitPrintSetValue(mainCode, systemOut, printlnString, stringClass, 0x2c, sequencedGetFirst);
    emitPrintSetValue(mainCode, systemOut, printlnString, stringClass, 0x2c, sequencedGetLast);
    emitPrintSetValue(mainCode, systemOut, printlnString, stringClass, 0x2b, sortedRemoveFirst);
    emitPrintSetValue(mainCode, systemOut, printlnString, stringClass, 0x2b, sortedRemoveLast);

    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, setSize, 1);
    emitU2Operand(mainCode, 0xb6, printlnInt);

    emitU2Operand(mainCode, 0xbb, treeSetClass);
    mainCode.push(0x59);
    emitU2Operand(mainCode, 0xb7, treeSetInit);
    mainCode.push(0x4e);
    firstTryStart = mainCode.length;
    mainCode.push(0x2d);
    emitInvokeInterface(mainCode, sortedGetFirst, 1);
    mainCode.push(0x57);
    firstTryEnd = mainCode.length;
    emitPrintString(mainCode, systemOut, printlnString, missedFirst);
    firstGotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    firstCatchStart = mainCode.length;
    mainCode.push(0x4e);
    emitPrintString(mainCode, systemOut, printlnString, nseFirst);
    firstAfterCatch = mainCode.length;
    patchU2(mainCode, firstGotoOffset + 1, firstAfterCatch - firstGotoOffset);

    addFirstTryStart = mainCode.length;
    mainCode.push(0x2b);
    emitLdc(mainCode, stringA);
    emitInvokeInterface(mainCode, sortedAddFirst, 2);
    addFirstTryEnd = mainCode.length;
    emitPrintString(mainCode, systemOut, printlnString, missedAddFirst);
    addFirstGotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    addFirstCatchStart = mainCode.length;
    mainCode.push(0x4e);
    emitPrintString(mainCode, systemOut, printlnString, uoeAddFirst);
    addFirstAfterCatch = mainCode.length;
    patchU2(mainCode, addFirstGotoOffset + 1, addFirstAfterCatch - addFirstGotoOffset);
    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(65);
    writeCp();

    u2(0x0021);
    u2(thisClass);
    u2(objectClass);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(initName);
    u2(voidDescriptor);
    u2(1);
    codeAttr([0x2a, 0xb7, (objectInit >>> 8) & 0xff, objectInit & 0xff, 0xb1], codeName, 1, 1);
    u2(0x0009);
    u2(mainName);
    u2(mainDescriptor);
    u2(1);
    codeAttr(mainCode, codeName, 4, 4, [
      [firstTryStart, firstTryEnd, firstCatchStart, noSuchElementClass],
      [addFirstTryStart, addFirstTryEnd, addFirstCatchStart, unsupportedOperationClass]
    ]);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java21_sorted_map_sequenced', 'Generate a Java 21 sorted-map sequenced-map fixture.', function() {
    var bytes: number[] = [],
      cpEntries: number[][] = [null],
      utf8Cache: { [key: string]: number } = {},
      classCache: { [key: string]: number } = {},
      stringCache: { [key: string]: number } = {},
      nameAndTypeCache: { [key: string]: number } = {},
      refCache: { [key: string]: number } = {},
      outPath = 'classes/modern_test/Java21SortedMapSequenced.class',
      runoutPath = 'classes/modern_test/Java21SortedMapSequenced.runout',
      expectedOutput = [
        'true',
        'true',
        'a=1',
        'c=3',
        'c=3',
        'a=1',
        'a',
        '3',
        'c=3',
        'a',
        'c',
        'a=1',
        'c=3',
        '1',
        'uoe-putfirst'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function addCp(entry: number[]): number {
      cpEntries.push(entry);
      return cpEntries.length - 1;
    }

    function cpUtf8(value: string): number {
      var cached = utf8Cache[value],
        buf: Buffer,
        entry: number[],
        i: number;
      if (cached) {
        return cached;
      }
      buf = Buffer.from(value, 'utf8');
      entry = [1, (buf.length >>> 8) & 0xff, buf.length & 0xff];
      for (i = 0; i < buf.length; i++) {
        entry.push(buf[i]);
      }
      cached = addCp(entry);
      utf8Cache[value] = cached;
      return cached;
    }

    function cpClass(name: string): number {
      var cached = classCache[name],
        nameIndex: number;
      if (cached) {
        return cached;
      }
      nameIndex = cpUtf8(name);
      cached = addCp([7, (nameIndex >>> 8) & 0xff, nameIndex & 0xff]);
      classCache[name] = cached;
      return cached;
    }

    function cpString(value: string): number {
      var cached = stringCache[value],
        stringIndex: number;
      if (cached) {
        return cached;
      }
      stringIndex = cpUtf8(value);
      cached = addCp([8, (stringIndex >>> 8) & 0xff, stringIndex & 0xff]);
      stringCache[value] = cached;
      return cached;
    }

    function cpNameAndType(name: string, descriptor: string): number {
      var key = name + '\n' + descriptor,
        cached = nameAndTypeCache[key],
        nameIndex: number,
        descriptorIndex: number;
      if (cached) {
        return cached;
      }
      nameIndex = cpUtf8(name);
      descriptorIndex = cpUtf8(descriptor);
      cached = addCp([12, (nameIndex >>> 8) & 0xff, nameIndex & 0xff,
        (descriptorIndex >>> 8) & 0xff, descriptorIndex & 0xff]);
      nameAndTypeCache[key] = cached;
      return cached;
    }

    function cpRef(tag: number, className: string, name: string, descriptor: string): number {
      var key = tag + '\n' + className + '\n' + name + '\n' + descriptor,
        cached = refCache[key],
        classIndex: number,
        nameAndTypeIndex: number;
      if (cached) {
        return cached;
      }
      classIndex = cpClass(className);
      nameAndTypeIndex = cpNameAndType(name, descriptor);
      cached = addCp([tag, (classIndex >>> 8) & 0xff, classIndex & 0xff,
        (nameAndTypeIndex >>> 8) & 0xff, nameAndTypeIndex & 0xff]);
      refCache[key] = cached;
      return cached;
    }

    function writeCp(): void {
      var i: number,
        j: number,
        entry: number[];
      u2(cpEntries.length);
      for (i = 1; i < cpEntries.length; i++) {
        entry = cpEntries[i];
        for (j = 0; j < entry.length; j++) {
          u1(entry[j]);
        }
      }
    }

    function codeAttr(code: number[], codeNameIndex: number, maxStack: number, maxLocals: number, exceptions?: number[][]): void {
      var exceptionTable = exceptions || [];
      u2(codeNameIndex);
      u4(12 + code.length + (exceptionTable.length * 8));
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(exceptionTable.length);
      exceptionTable.forEach(function(entry: number[]): void {
        u2(entry[0]);
        u2(entry[1]);
        u2(entry[2]);
        u2(entry[3]);
      });
      u2(0);
    }

    function patchU2(code: number[], offset: number, value: number): void {
      code[offset] = (value >>> 8) & 0xff;
      code[offset + 1] = value & 0xff;
    }

    function emitU2Operand(code: number[], opcode: number, index: number): void {
      code.push(opcode, (index >>> 8) & 0xff, index & 0xff);
    }

    function emitLdc(code: number[], index: number): void {
      if (index > 0xff) {
        grunt.fail.fatal('Java21SortedMapSequenced constant pool grew past ldc range.');
      }
      code.push(0x12, index);
    }

    function emitInvokeInterface(code: number[], methodRef: number, argCount: number): void {
      code.push(0xb9, (methodRef >>> 8) & 0xff, methodRef & 0xff, argCount, 0x00);
    }

    function emitPrintString(code: number[], outField: number, printlnString: number, stringIndex: number): void {
      emitU2Operand(code, 0xb2, outField);
      emitLdc(code, stringIndex);
      emitU2Operand(code, 0xb6, printlnString);
    }

    function emitPrintInterfaceObject(code: number[], outField: number, printlnObject: number, loadOpcode: number, methodRef: number): void {
      emitU2Operand(code, 0xb2, outField);
      code.push(loadOpcode);
      emitInvokeInterface(code, methodRef, 1);
      emitU2Operand(code, 0xb6, printlnObject);
    }

    var thisClass = cpClass('classes/modern_test/Java21SortedMapSequenced'),
      objectClass = cpClass('java/lang/Object'),
      codeName = cpUtf8('Code'),
      initName = cpUtf8('<init>'),
      voidDescriptor = cpUtf8('()V'),
      objectInit = cpRef(10, 'java/lang/Object', '<init>', '()V'),
      mainName = cpUtf8('main'),
      mainDescriptor = cpUtf8('([Ljava/lang/String;)V'),
      systemOut = cpRef(9, 'java/lang/System', 'out', 'Ljava/io/PrintStream;'),
      printlnObject = cpRef(10, 'java/io/PrintStream', 'println', '(Ljava/lang/Object;)V'),
      printlnString = cpRef(10, 'java/io/PrintStream', 'println', '(Ljava/lang/String;)V'),
      printlnBoolean = cpRef(10, 'java/io/PrintStream', 'println', '(Z)V'),
      printlnInt = cpRef(10, 'java/io/PrintStream', 'println', '(I)V'),
      treeMapClass = cpClass('java/util/TreeMap'),
      treeMapInit = cpRef(10, 'java/util/TreeMap', '<init>', '()V'),
      mapClass = cpClass('java/util/Map'),
      sortedMapClass = cpClass('java/util/SortedMap'),
      sequencedMapClass = cpClass('java/util/SequencedMap'),
      sequencedSetClass = cpClass('java/util/SequencedSet'),
      sequencedCollectionClass = cpClass('java/util/SequencedCollection'),
      unsupportedOperationClass = cpClass('java/lang/UnsupportedOperationException'),
      stringA = cpString('a'),
      stringB = cpString('b'),
      stringC = cpString('c'),
      string1 = cpString('1'),
      string2 = cpString('2'),
      string3 = cpString('3'),
      missedPutFirst = cpString('missed-putfirst'),
      uoePutFirst = cpString('uoe-putfirst'),
      mapPut = cpRef(11, 'java/util/Map', 'put', '(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;'),
      mapSize = cpRef(11, 'java/util/Map', 'size', '()I'),
      sequencedFirstEntry = cpRef(11, 'java/util/SequencedMap', 'firstEntry', '()Ljava/util/Map$Entry;'),
      sequencedLastEntry = cpRef(11, 'java/util/SequencedMap', 'lastEntry', '()Ljava/util/Map$Entry;'),
      sequencedReversed = cpRef(11, 'java/util/SequencedMap', 'reversed', '()Ljava/util/SequencedMap;'),
      sequencedKeySet = cpRef(11, 'java/util/SequencedMap', 'sequencedKeySet', '()Ljava/util/SequencedSet;'),
      sequencedValues = cpRef(11, 'java/util/SequencedMap', 'sequencedValues', '()Ljava/util/SequencedCollection;'),
      sequencedEntrySet = cpRef(11, 'java/util/SequencedMap', 'sequencedEntrySet', '()Ljava/util/SequencedSet;'),
      sequencedPollFirstEntry = cpRef(11, 'java/util/SequencedMap', 'pollFirstEntry', '()Ljava/util/Map$Entry;'),
      sequencedPollLastEntry = cpRef(11, 'java/util/SequencedMap', 'pollLastEntry', '()Ljava/util/Map$Entry;'),
      sortedFirstKey = cpRef(11, 'java/util/SortedMap', 'firstKey', '()Ljava/lang/Object;'),
      sortedLastKey = cpRef(11, 'java/util/SortedMap', 'lastKey', '()Ljava/lang/Object;'),
      sortedPutFirst = cpRef(11, 'java/util/SortedMap', 'putFirst', '(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;'),
      sequencedSetGetFirst = cpRef(11, 'java/util/SequencedSet', 'getFirst', '()Ljava/lang/Object;'),
      sequencedSetReversed = cpRef(11, 'java/util/SequencedSet', 'reversed', '()Ljava/util/SequencedSet;'),
      sequencedCollectionGetLast = cpRef(11, 'java/util/SequencedCollection', 'getLast', '()Ljava/lang/Object;'),
      mainCode: number[] = [],
      putFirstTryStart: number,
      putFirstTryEnd: number,
      putFirstCatchStart: number,
      putFirstAfterCatch: number,
      putFirstGotoOffset: number;

    emitU2Operand(mainCode, 0xbb, treeMapClass);
    mainCode.push(0x59);
    emitU2Operand(mainCode, 0xb7, treeMapInit);
    mainCode.push(0x4c);
    mainCode.push(0x2b);
    emitLdc(mainCode, stringB);
    emitLdc(mainCode, string2);
    emitInvokeInterface(mainCode, mapPut, 3);
    mainCode.push(0x57);
    mainCode.push(0x2b);
    emitLdc(mainCode, stringA);
    emitLdc(mainCode, string1);
    emitInvokeInterface(mainCode, mapPut, 3);
    mainCode.push(0x57);
    mainCode.push(0x2b);
    emitLdc(mainCode, stringC);
    emitLdc(mainCode, string3);
    emitInvokeInterface(mainCode, mapPut, 3);
    mainCode.push(0x57);

    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitU2Operand(mainCode, 0xc1, sequencedMapClass);
    emitU2Operand(mainCode, 0xb6, printlnBoolean);
    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitU2Operand(mainCode, 0xc1, sortedMapClass);
    emitU2Operand(mainCode, 0xb6, printlnBoolean);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2b, sequencedFirstEntry);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2b, sequencedLastEntry);

    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, sequencedReversed, 1);
    mainCode.push(0x4d);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2c, sequencedFirstEntry);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2c, sequencedLastEntry);

    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, sequencedKeySet, 1);
    emitInvokeInterface(mainCode, sequencedSetGetFirst, 1);
    emitU2Operand(mainCode, 0xb6, printlnObject);
    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, sequencedValues, 1);
    emitInvokeInterface(mainCode, sequencedCollectionGetLast, 1);
    emitU2Operand(mainCode, 0xb6, printlnObject);
    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, sequencedEntrySet, 1);
    emitInvokeInterface(mainCode, sequencedSetReversed, 1);
    emitInvokeInterface(mainCode, sequencedSetGetFirst, 1);
    emitU2Operand(mainCode, 0xb6, printlnObject);

    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2b, sortedFirstKey);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2b, sortedLastKey);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2b, sequencedPollFirstEntry);
    emitPrintInterfaceObject(mainCode, systemOut, printlnObject, 0x2b, sequencedPollLastEntry);

    emitU2Operand(mainCode, 0xb2, systemOut);
    mainCode.push(0x2b);
    emitInvokeInterface(mainCode, mapSize, 1);
    emitU2Operand(mainCode, 0xb6, printlnInt);

    putFirstTryStart = mainCode.length;
    mainCode.push(0x2b);
    emitLdc(mainCode, stringA);
    emitLdc(mainCode, string1);
    emitInvokeInterface(mainCode, sortedPutFirst, 3);
    mainCode.push(0x57);
    putFirstTryEnd = mainCode.length;
    emitPrintString(mainCode, systemOut, printlnString, missedPutFirst);
    putFirstGotoOffset = mainCode.length;
    mainCode.push(0xa7, 0x00, 0x00);
    putFirstCatchStart = mainCode.length;
    mainCode.push(0x4e);
    emitPrintString(mainCode, systemOut, printlnString, uoePutFirst);
    putFirstAfterCatch = mainCode.length;
    patchU2(mainCode, putFirstGotoOffset + 1, putFirstAfterCatch - putFirstGotoOffset);
    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(65);
    writeCp();

    u2(0x0021);
    u2(thisClass);
    u2(objectClass);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(initName);
    u2(voidDescriptor);
    u2(1);
    codeAttr([0x2a, 0xb7, (objectInit >>> 8) & 0xff, objectInit & 0xff, 0xb1], codeName, 1, 1);
    u2(0x0009);
    u2(mainName);
    u2(mainDescriptor);
    u2(1);
    codeAttr(mainCode, codeName, 3, 4, [
      [putFirstTryStart, putFirstTryEnd, putFirstCatchStart, unsupportedOperationClass]
    ]);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_return_top_modern', 'Generate a fixture where return values are above unused operand-stack entries.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/ReturnTopOfStackGenerated.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function longConstant(value: number): void {
      var high = Math.floor(value / 0x100000000),
        low = value >>> 0;
      u1(5);
      u4(high);
      u4(low);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(52);
    u2(16);
    cls(2);
    utf8('classes/modern_test/ReturnTopOfStackGenerated');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('nullWithJunk');
    utf8('()Ljava/lang/Object;');
    utf8('longWithJunk');
    utf8('()J');
    longConstant(123456789);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(3);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([0xbb, 0x00, 0x03, 0x59, 0x01, 0xb0], 3, 0);
    u2(0x0009);
    u2(12);
    u2(13);
    u2(1);
    codeAttr([0xbb, 0x00, 0x03, 0x59, 0x14, 0x00, 0x0e, 0xad], 4, 0);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('generate_null_type_checks_modern', 'Generate null checkcast/instanceof fixtures with missing target classes.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java9NullTypeChecksGenerated.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(52);
    u2(16);
    cls(2);
    utf8('classes/modern_test/Java9NullTypeChecksGenerated');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('nullCheckcast');
    utf8('()Ljava/lang/Object;');
    utf8('nullInstanceOf');
    utf8('()Z');
    cls(15);
    utf8('missing/NoSuchType');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(3);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([0x01, 0xc0, 0x00, 0x0e, 0xb0], 1, 0);
    u2(0x0009);
    u2(12);
    u2(13);
    u2(1);
    codeAttr([0x01, 0xc1, 0x00, 0x0e, 0xac], 1, 0);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('generate_illegal_sealed_modern', 'Generate a Java 17 sealed-class violation fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java17SealedClassVersion$Triangle.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function string(utf8Index: number): void {
      u1(8);
      u2(utf8Index);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(9);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(61);
    u2(18);

    cls(2);
    utf8('classes/modern_test/Java17SealedClassVersion$Triangle');
    cls(4);
    utf8('java/lang/Object');
    cls(6);
    utf8('classes/modern_test/Java17SealedClassVersion$Shape');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 11);
    nameAndType(7, 8);
    utf8('name');
    utf8('()Ljava/lang/String;');
    utf8('triangle');
    string(14);
    utf8('sides');
    utf8('()I');

    u2(0x0031);
    u2(1);
    u2(3);
    u2(1);
    u2(5);
    u2(0);
    u2(3);

    u2(0x0001);
    u2(7);
    u2(8);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x0a, 0xb1], 1, 1);

    u2(0x0001);
    u2(12);
    u2(13);
    u2(1);
    codeAttr([0x12, 0x0f, 0xb0], 1, 1);

    u2(0x0001);
    u2(16);
    u2(17);
    u2(1);
    codeAttr([0x06, 0xac], 1, 1);

    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

  });

  grunt.registerTask('generate_string_concat_constants_modern', 'Generate Java 9 StringConcatFactory constant recipe fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java9StringConcatConstants.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function string(utf8Index: number): void {
      u1(8);
      u2(utf8Index);
    }

    function int32(value: number): void {
      u1(3);
      u4(value);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function methodHandle(refKind: number, refIndex: number): void {
      u1(15);
      u1(refKind);
      u2(refIndex);
    }

    function methodType(descriptorIndex: number): void {
      u1(16);
      u2(descriptorIndex);
    }

    function invokeDynamic(bootstrapIndex: number, nameAndTypeIndex: number): void {
      u1(18);
      u2(bootstrapIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(53);
    u2(53);

    cls(2);
    utf8('classes/modern_test/Java9StringConcatConstants');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    ref(9, 11, 13);
    cls(12);
    utf8('java/lang/System');
    nameAndType(14, 15);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    ref(10, 17, 19);
    cls(18);
    utf8('java/io/PrintStream');
    nameAndType(20, 21);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    invokeDynamic(0, 23);
    nameAndType(24, 25);
    utf8('makeConcatWithConstants');
    utf8('()Ljava/lang/String;');
    utf8('BootstrapMethods');
    methodHandle(6, 28);
    ref(10, 29, 31);
    cls(30);
    utf8('java/lang/invoke/StringConcatFactory');
    nameAndType(24, 32);
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;');
    string(34);
    utf8('class=\u0002,int=\u0002,string=\u0002,interface=\u0002,array=\u0002,methodType=\u0002,methodHandle=\u0002');
    cls(36);
    utf8('java/lang/String');
    int32(42);
    string(39);
    utf8('ok');
    cls(41);
    utf8('java/lang/Runnable');
    cls(43);
    utf8('[Ljava/lang/String;');
    methodType(45);
    utf8('(Ljava/lang/String;)I');
    methodHandle(6, 50);
    utf8('valueOf');
    utf8('(I)Ljava/lang/String;');
    nameAndType(47, 48);
    ref(10, 35, 49);
    utf8('main');
    utf8('([Ljava/lang/String;)V');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(51);
    u2(52);
    u2(1);
    codeAttr([0xb2, 0x00, 0x0a, 0xba, 0x00, 0x16, 0x00, 0x00, 0xb6, 0x00, 0x10, 0xb1], 2, 1);

    u2(1);
    u2(26);
    u4(22);
    u2(1);
    u2(27);
    u2(8);
    u2(33);
    u2(35);
    u2(37);
    u2(38);
    u2(40);
    u2(42);
    u2(44);
    u2(46);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('generate_constant_dynamic_modern', 'Generate Java 11 CONSTANT_Dynamic fixture class.', function() {
    var outPath = 'classes/modern_test/Java11ConstantDynamic.class',
      bytes: number[] = [];

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function int32(value: number): void {
      u1(3);
      u4(value);
    }

    function int64(highBytes: number, lowBytes: number): void {
      u1(5);
      u4(highBytes);
      u4(lowBytes);
    }

    function float32(value: number): void {
      var buf = Buffer.alloc(4);
      buf.writeFloatBE(value, 0);
      u1(4);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function double64(value: number): void {
      var buf = Buffer.alloc(8);
      buf.writeDoubleBE(value, 0);
      u1(6);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function methodHandle(kind: number, referenceIndex: number): void {
      u1(15);
      u1(kind);
      u2(referenceIndex);
    }

    function string(utf8Index: number): void {
      u1(8);
      u2(utf8Index);
    }

    function dynamic(bootstrapMethodIndex: number, nameAndTypeIndex: number): void {
      u1(17);
      u2(bootstrapMethodIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(36);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamic');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('nullConstant');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('dynamicValue');
    utf8('Ljava/lang/String;');
    nameAndType(32, 33);
    dynamic(0, 34);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([0xb2, 0x00, 0x11, 0x13, 0x00, 0x23, 0xb6, 0x00, 0x17, 0xb1], 2, 1);

    u2(1);
    u2(24);
    u4(6);
    u2(1);
    u2(31);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    var constantDynamicMoreSource = 'classes/modern_test/Java11ConstantDynamicMore.java',
      constantDynamicMoreSupportClass = 'classes/modern_test/Java11ConstantDynamicMore$Support.class',
      constantDynamicMoreChoiceClass = 'classes/modern_test/Java11ConstantDynamicMore$Support$Choice.class',
      constantDynamicMoreSourceMtime = fs.statSync(constantDynamicMoreSource).mtime.getTime();
    if (!fs.existsSync(constantDynamicMoreSupportClass) ||
        !fs.existsSync(constantDynamicMoreChoiceClass) ||
        fs.statSync(constantDynamicMoreSupportClass).mtime.getTime() < constantDynamicMoreSourceMtime ||
        fs.statSync(constantDynamicMoreChoiceClass).mtime.getTime() < constantDynamicMoreSourceMtime) {
      try {
        child_process.execFileSync(grunt.config('build.javac') || 'javac',
          ['-J-Dfile.encoding=UTF8', '--release', '11', '-d', '.', constantDynamicMoreSource],
          { stdio: 'inherit' });
      } catch (e) {
        grunt.fail.fatal('Error compiling Java 11 CONSTANT_Dynamic support classes: ' + e);
      }
    }

    outPath = 'classes/modern_test/Java11ConstantDynamicMore.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(138);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicMore');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('java/lang/Class');
    cls(24);
    utf8('getName');
    utf8('()Ljava/lang/String;');
    nameAndType(26, 27);
    ref(10, 25, 28);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(31);
    utf8('primitiveClass');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Class;');
    nameAndType(33, 34);
    ref(10, 32, 35);
    methodHandle(6, 36);
    utf8('I');
    utf8('Ljava/lang/Class;');
    nameAndType(38, 39);
    dynamic(0, 40);
    utf8('classes/modern_test/Java11ConstantDynamicMore$Support$Choice');
    cls(42);
    utf8('enumConstant');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Enum;');
    nameAndType(44, 45);
    ref(10, 32, 46);
    methodHandle(6, 47);
    utf8('BETA');
    utf8('Lclasses/modern_test/Java11ConstantDynamicMore$Support$Choice;');
    nameAndType(49, 50);
    dynamic(1, 51);
    utf8('java/lang/Enum');
    cls(53);
    utf8('name');
    nameAndType(55, 27);
    ref(10, 54, 56);
    utf8('getStaticFinal');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/Object;');
    nameAndType(58, 59);
    ref(10, 32, 60);
    methodHandle(6, 61);
    utf8('classes/modern_test/Java11ConstantDynamicMore$Support');
    cls(63);
    utf8('MESSAGE');
    utf8('Ljava/lang/String;');
    nameAndType(65, 66);
    dynamic(2, 67);
    utf8('explicitCast');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(69, 70);
    ref(10, 32, 71);
    methodHandle(6, 72);
    utf8('casted');
    string(74);
    utf8('castedValue');
    nameAndType(76, 66);
    dynamic(3, 77);
    utf8('(I)V');
    nameAndType(20, 79);
    ref(10, 19, 80);
    int32(42);
    utf8('castedInt');
    nameAndType(83, 38);
    dynamic(4, 84);
    utf8('(J)V');
    nameAndType(20, 86);
    ref(10, 19, 87);
    int64(0x0000011f, 0x71fb04cb);
    utf8('castedLong');
    utf8('J');
    nameAndType(91, 92);
    dynamic(5, 93);
    utf8('(D)V');
    nameAndType(20, 95);
    ref(10, 19, 96);
    double64(6.25);
    utf8('castedDouble');
    utf8('D');
    nameAndType(100, 101);
    dynamic(6, 102);
    utf8('(F)V');
    nameAndType(20, 104);
    ref(10, 19, 105);
    float32(3.5);
    utf8('castedFloat');
    utf8('F');
    nameAndType(108, 109);
    dynamic(7, 110);
    utf8('(Z)V');
    nameAndType(20, 112);
    ref(10, 19, 113);
    int32(3);
    utf8('castedBoolean');
    utf8('Z');
    nameAndType(116, 117);
    dynamic(8, 118);
    utf8('(C)V');
    nameAndType(20, 120);
    ref(10, 19, 121);
    int32(65);
    utf8('castedChar');
    utf8('C');
    nameAndType(124, 125);
    dynamic(9, 126);
    int32(130);
    utf8('castedByte');
    utf8('B');
    nameAndType(129, 130);
    dynamic(10, 131);
    int32(32769);
    utf8('castedShort');
    utf8('S');
    nameAndType(134, 135);
    dynamic(11, 136);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x29,
      0xb6, 0x00, 0x1d,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x34,
      0xb6, 0x00, 0x39,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x44,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x4e,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x55,
      0xb6, 0x00, 0x51,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x5e,
      0xb6, 0x00, 0x58,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x67,
      0xb6, 0x00, 0x61,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x6f,
      0xb6, 0x00, 0x6a,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x77,
      0xb6, 0x00, 0x72,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x7f,
      0xb6, 0x00, 0x7a,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x84,
      0xb6, 0x00, 0x51,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x89,
      0xb6, 0x00, 0x51,
      0xb1
    ], 3, 1);

    u2(1);
    u2(30);
    u4(70);
    u2(12);
    u2(37);
    u2(0);
    u2(48);
    u2(0);
    u2(62);
    u2(1);
    u2(64);
    u2(73);
    u2(1);
    u2(75);
    u2(73);
    u2(1);
    u2(82);
    u2(73);
    u2(1);
    u2(89);
    u2(73);
    u2(1);
    u2(98);
    u2(73);
    u2(1);
    u2(107);
    u2(73);
    u2(1);
    u2(115);
    u2(73);
    u2(1);
    u2(123);
    u2(73);
    u2(1);
    u2(128);
    u2(73);
    u2(1);
    u2(133);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicCasts.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(77);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicCasts');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(I)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('explicitCast');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    int32(7);
    utf8('intToLong');
    utf8('J');
    nameAndType(33, 34);
    dynamic(0, 35);
    utf8('(J)V');
    nameAndType(20, 37);
    ref(10, 19, 38);
    int64(0, 258);
    utf8('longToInt');
    utf8('I');
    nameAndType(42, 43);
    dynamic(1, 44);
    float32(65.9);
    utf8('floatToChar');
    utf8('C');
    nameAndType(47, 48);
    dynamic(2, 49);
    utf8('(C)V');
    nameAndType(20, 51);
    ref(10, 19, 52);
    double64(-32766.25);
    utf8('doubleToShort');
    utf8('S');
    nameAndType(56, 57);
    dynamic(3, 58);
    double64(3);
    utf8('doubleToBoolean');
    utf8('Z');
    nameAndType(62, 63);
    dynamic(4, 64);
    utf8('(Z)V');
    nameAndType(20, 66);
    ref(10, 19, 67);
    int32(12);
    utf8('intToDouble');
    utf8('D');
    nameAndType(70, 71);
    dynamic(5, 72);
    utf8('(D)V');
    nameAndType(20, 74);
    ref(10, 19, 75);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x24,
      0xb6, 0x00, 0x27,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x2d,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x32,
      0xb6, 0x00, 0x35,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x3b,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x41,
      0xb6, 0x00, 0x44,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x49,
      0xb6, 0x00, 0x4c,
      0xb1
    ], 3, 1);

    u2(1);
    u2(24);
    u4(38);
    u2(6);
    u2(31);
    u2(1);
    u2(32);
    u2(31);
    u2(1);
    u2(40);
    u2(31);
    u2(1);
    u2(46);
    u2(31);
    u2(1);
    u2(54);
    u2(31);
    u2(1);
    u2(60);
    u2(31);
    u2(1);
    u2(69);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvokeInterface.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(10);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeInterface');
    cls(4);
    utf8('java/lang/Object');
    utf8('staticTarget');
    utf8('()Ljava/lang/String;');
    utf8('Code');
    utf8('interface-static');
    string(8);

    u2(0x0601);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(1);

    u2(0x0009);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x12, 0x09, 0xb0], 1, 0);

    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvoke.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(303);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvoke');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('invoke');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('target');
    utf8('()Ljava/lang/String;');
    nameAndType(32, 33);
    ref(10, 1, 34);
    methodHandle(6, 35);
    utf8('invokedValue');
    utf8('Ljava/lang/String;');
    nameAndType(37, 38);
    dynamic(0, 39);
    utf8('invoke-target');
    string(41);
    utf8('FIELD_VALUE');
    nameAndType(43, 38);
    ref(9, 1, 44);
    methodHandle(2, 45);
    utf8('fieldValue');
    nameAndType(47, 38);
    dynamic(1, 48);
    utf8('invoke-field');
    string(50);
    utf8('ConstantValue');
    utf8('(I)V');
    nameAndType(20, 53);
    ref(10, 19, 54);
    utf8('add');
    utf8('(I)I');
    nameAndType(56, 57);
    ref(10, 1, 58);
    methodHandle(6, 59);
    int32(37);
    utf8('intValue');
    utf8('I');
    nameAndType(62, 63);
    dynamic(2, 64);
    utf8('java/lang/StringBuilder');
    cls(66);
    utf8('(Ljava/lang/String;)V');
    nameAndType(5, 68);
    ref(10, 67, 69);
    methodHandle(8, 70);
    utf8('builderValue');
    utf8('Ljava/lang/StringBuilder;');
    nameAndType(72, 73);
    dynamic(3, 74);
    utf8('ctor-value');
    string(76);
    utf8('toString');
    nameAndType(78, 33);
    ref(10, 67, 79);
    utf8('java/lang/String');
    cls(81);
    utf8('length');
    utf8('()I');
    nameAndType(83, 84);
    ref(10, 82, 85);
    methodHandle(5, 86);
    utf8('virtualValue');
    nameAndType(88, 63);
    dynamic(4, 89);
    utf8('virtual');
    string(91);
    utf8('INSTANCE_VALUE');
    nameAndType(93, 38);
    ref(9, 1, 94);
    methodHandle(1, 95);
    utf8('receiverValue');
    utf8('Lclasses/modern_test/Java11ConstantDynamicInvoke;');
    nameAndType(97, 98);
    dynamic(5, 99);
    ref(10, 1, 9);
    methodHandle(8, 101);
    utf8('instanceFieldValue');
    nameAndType(103, 38);
    dynamic(6, 104);
    utf8('invoke-instance-field');
    string(106);
    utf8('java/lang/CharSequence');
    cls(108);
    nameAndType(83, 84);
    ref(11, 109, 110);
    methodHandle(9, 111);
    utf8('interfaceValue');
    nameAndType(113, 63);
    dynamic(7, 114);
    utf8('interface');
    string(116);
    utf8('objectValue');
    utf8('Ljava/lang/Object;');
    nameAndType(118, 119);
    dynamic(8, 120);
    utf8('(Ljava/lang/Object;)V');
    nameAndType(20, 122);
    ref(10, 19, 123);
    utf8('objectFieldValue');
    nameAndType(125, 119);
    dynamic(9, 126);
    utf8('objectInstanceFieldValue');
    nameAndType(128, 119);
    dynamic(10, 129);
    utf8('objectBuilderValue');
    nameAndType(131, 119);
    dynamic(11, 132);
    utf8('java/lang/Integer');
    cls(134);
    utf8('boxedIntValue');
    utf8('Ljava/lang/Integer;');
    nameAndType(136, 137);
    dynamic(12, 138);
    utf8('objectIntValue');
    nameAndType(140, 119);
    dynamic(13, 141);
    utf8('INT_FIELD_VALUE');
    nameAndType(143, 63);
    ref(9, 1, 144);
    methodHandle(2, 145);
    utf8('boxedIntFieldValue');
    nameAndType(147, 137);
    dynamic(14, 148);
    utf8('objectIntFieldValue');
    nameAndType(150, 119);
    dynamic(15, 151);
    utf8('INSTANCE_INT_VALUE');
    nameAndType(153, 63);
    ref(9, 1, 154);
    methodHandle(1, 155);
    utf8('boxedInstanceIntFieldValue');
    nameAndType(157, 137);
    dynamic(16, 158);
    utf8('objectInstanceIntFieldValue');
    nameAndType(160, 119);
    dynamic(17, 161);
    utf8('boxedArg');
    utf8('(Ljava/lang/Integer;)I');
    nameAndType(163, 164);
    ref(10, 1, 165);
    methodHandle(6, 166);
    utf8('boxedArgValue');
    nameAndType(168, 63);
    dynamic(18, 169);
    nameAndType(62, 84);
    ref(10, 135, 171);
    utf8('unboxedArg');
    nameAndType(173, 57);
    ref(10, 1, 174);
    methodHandle(6, 175);
    utf8('unboxedArgValue');
    nameAndType(177, 63);
    dynamic(19, 178);
    utf8('longWidenedArg');
    utf8('(J)J');
    nameAndType(180, 181);
    ref(10, 1, 182);
    methodHandle(6, 183);
    utf8('longWidenedArgValue');
    utf8('J');
    nameAndType(185, 186);
    dynamic(20, 187);
    utf8('(J)V');
    nameAndType(20, 189);
    ref(10, 19, 190);
    utf8('SETTER_FIELD');
    nameAndType(192, 38);
    ref(9, 1, 193);
    methodHandle(4, 194);
    utf8('setStaticResult');
    nameAndType(196, 119);
    dynamic(21, 197);
    utf8('setStaticValue');
    string(199);
    methodHandle(2, 194);
    utf8('setStaticFieldValue');
    nameAndType(202, 38);
    dynamic(22, 203);
    methodHandle(3, 95);
    utf8('setInstanceResult');
    nameAndType(206, 119);
    dynamic(23, 207);
    utf8('setInstanceValue');
    string(209);
    utf8('setInstanceFieldValue');
    nameAndType(211, 38);
    dynamic(24, 212);
    utf8('varargsCount');
    utf8('(Ljava/lang/String;[Ljava/lang/String;)I');
    nameAndType(214, 215);
    ref(10, 1, 216);
    methodHandle(6, 217);
    utf8('varargsValue');
    nameAndType(219, 63);
    dynamic(25, 220);
    utf8('varargs-prefix');
    string(222);
    utf8('varargs-one');
    string(224);
    utf8('varargs-two');
    string(226);
    utf8('longReturnWidenedValue');
    nameAndType(228, 186);
    dynamic(26, 229);
    utf8('longFieldReturnWidenedValue');
    nameAndType(231, 186);
    dynamic(27, 232);
    utf8('voidTarget');
    nameAndType(234, 6);
    ref(10, 1, 235);
    methodHandle(6, 236);
    utf8('voidResult');
    nameAndType(238, 119);
    dynamic(28, 239);
    utf8('specialTarget');
    nameAndType(241, 33);
    ref(10, 1, 242);
    methodHandle(7, 243);
    utf8('specialValue');
    nameAndType(245, 38);
    dynamic(29, 246);
    utf8('special-invoke');
    string(248);
    utf8('longConstantWidenedArgValue');
    nameAndType(250, 186);
    dynamic(30, 251);
    utf8('longVarargsFirst');
    utf8('(Ljava/lang/String;[J)J');
    nameAndType(253, 254);
    ref(10, 1, 255);
    methodHandle(6, 256);
    utf8('longVarargsWidenedValue');
    nameAndType(258, 186);
    dynamic(31, 259);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeInterface');
    cls(261);
    utf8('staticInterfaceValue');
    nameAndType(263, 38);
    utf8('staticTarget');
    nameAndType(265, 33);
    ref(11, 262, 266);
    methodHandle(6, 267);
    dynamic(32, 264);
    utf8('DOUBLE_SETTER_FIELD');
    utf8('D');
    nameAndType(270, 271);
    ref(9, 1, 272);
    methodHandle(4, 273);
    methodHandle(2, 273);
    utf8('setDoubleResult');
    nameAndType(276, 119);
    dynamic(33, 277);
    utf8('doubleFieldValue');
    nameAndType(279, 271);
    dynamic(34, 280);
    utf8('(D)V');
    nameAndType(20, 282);
    ref(10, 19, 283);
    int64(0, 37);
    utf8('boxedDoubleFieldValue');
    nameAndType(287, 119);
    dynamic(34, 288);
    double64(0.5);
    utf8('INSTANCE_DOUBLE_SETTER_FIELD');
    nameAndType(292, 271);
    ref(9, 1, 293);
    methodHandle(3, 294);
    methodHandle(1, 294);
    utf8('setInstanceDoubleResult');
    nameAndType(297, 119);
    dynamic(35, 298);
    utf8('instanceDoubleFieldValue');
    nameAndType(300, 271);
    dynamic(36, 301);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(7);

    u2(0x0019);
    u2(43);
    u2(38);
    u2(1);
    u2(52);
    u4(2);
    u2(51);

    u2(0x0001);
    u2(93);
    u2(38);
    u2(0);

    u2(0x0019);
    u2(143);
    u2(63);
    u2(1);
    u2(52);
    u4(2);
    u2(61);

    u2(0x0001);
    u2(153);
    u2(63);
    u2(0);

    u2(0x0009);
    u2(192);
    u2(38);
    u2(0);

    u2(0x0009);
    u2(270);
    u2(271);
    u2(0);

    u2(0x0001);
    u2(292);
    u2(271);
    u2(0);

    u2(11);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([
      0x2a,
      0xb7, 0x00, 0x08,
      0x2a,
      0x13, 0x00, 0x6b,
      0xb5, 0x00, 0x5f,
      0x2a,
      0x10, 0x25,
      0xb5, 0x00, 0x9b,
      0xb1
    ], 2, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x28,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x31,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x41,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x4b,
      0xb6, 0x00, 0x50,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x5a,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x69,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x73,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x79,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x7f,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x82,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x85,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x8b,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x8e,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x95,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x98,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x9f,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xa2,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xaa,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xb3,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xbc,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xc6,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xcc,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xd0,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xd5,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xdd,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xe6,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xe9,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xf0,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xf7,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xfc,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x04,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x0d,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x16,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x19,
      0xb6, 0x01, 0x1c,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x21,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x19,
      0x14, 0x01, 0x22,
      0x63,
      0xb6, 0x01, 0x1c,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x2b,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x2e,
      0xb6, 0x01, 0x1c,
      0xb1
    ], 5, 1);

    u2(0x0009);
    u2(32);
    u2(33);
    u2(1);
    codeAttr([0x12, 0x2a, 0xb0], 1, 0);

    u2(0x0009);
    u2(56);
    u2(57);
    u2(1);
    codeAttr([0x1a, 0x08, 0x60, 0xac], 2, 1);

    u2(0x0009);
    u2(163);
    u2(164);
    u2(1);
    codeAttr([0x2a, 0xb6, 0x00, 0xac, 0xac], 1, 1);

    u2(0x0009);
    u2(173);
    u2(57);
    u2(1);
    codeAttr([0x1a, 0xac], 1, 1);

    u2(0x0009);
    u2(180);
    u2(181);
    u2(1);
    codeAttr([0x1e, 0xad], 2, 2);

    u2(0x0089);
    u2(214);
    u2(215);
    u2(1);
    codeAttr([0x2b, 0xbe, 0xac], 1, 2);

    u2(0x0089);
    u2(253);
    u2(254);
    u2(1);
    codeAttr([0x2b, 0x03, 0x2f, 0xad], 2, 2);

    u2(0x0009);
    u2(234);
    u2(6);
    u2(1);
    codeAttr([0xb1], 0, 0);

    u2(0x0002);
    u2(241);
    u2(33);
    u2(1);
    codeAttr([0x12, 0xf9, 0xb0], 1, 1);

    u2(1);
    u2(24);
    u4(284);
    u2(37);
    u2(31);
    u2(1);
    u2(36);
    u2(31);
    u2(1);
    u2(46);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(2);
    u2(71);
    u2(77);
    u2(31);
    u2(2);
    u2(87);
    u2(92);
    u2(31);
    u2(1);
    u2(102);
    u2(31);
    u2(2);
    u2(96);
    u2(100);
    u2(31);
    u2(2);
    u2(112);
    u2(117);
    u2(31);
    u2(1);
    u2(36);
    u2(31);
    u2(1);
    u2(46);
    u2(31);
    u2(2);
    u2(96);
    u2(100);
    u2(31);
    u2(2);
    u2(71);
    u2(77);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(1);
    u2(146);
    u2(31);
    u2(1);
    u2(146);
    u2(31);
    u2(2);
    u2(156);
    u2(100);
    u2(31);
    u2(2);
    u2(167);
    u2(61);
    u2(31);
    u2(2);
    u2(156);
    u2(100);
    u2(31);
    u2(2);
    u2(176);
    u2(139);
    u2(31);
    u2(2);
    u2(184);
    u2(139);
    u2(31);
    u2(2);
    u2(195);
    u2(200);
    u2(31);
    u2(1);
    u2(201);
    u2(31);
    u2(3);
    u2(205);
    u2(100);
    u2(210);
    u2(31);
    u2(2);
    u2(96);
    u2(100);
    u2(31);
    u2(4);
    u2(218);
    u2(223);
    u2(225);
    u2(227);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(1);
    u2(146);
    u2(31);
    u2(1);
    u2(237);
    u2(31);
    u2(2);
    u2(244);
    u2(100);
    u2(31);
    u2(2);
    u2(184);
    u2(61);
    u2(31);
    u2(3);
    u2(257);
    u2(223);
    u2(61);
    u2(31);
    u2(1);
    u2(268);
    u2(31);
    u2(2);
    u2(274);
    u2(285);
    u2(31);
    u2(1);
    u2(275);
    u2(31);
    u2(3);
    u2(295);
    u2(100);
    u2(290);
    u2(31);
    u2(2);
    u2(296);
    u2(100);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvokeSpecial.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(54);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeSpecial');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('invoke');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeSpecial');
    cls(32);
    nameAndType(5, 6);
    ref(10, 33, 34);
    methodHandle(8, 35);
    utf8('specialReceiver');
    utf8('Lclasses/modern_test/Java11ConstantDynamicInvokeSpecial$SpecialDefault;');
    nameAndType(37, 38);
    dynamic(0, 39);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeSpecial$SpecialDefault');
    cls(41);
    utf8('defaultValue');
    utf8('(Ljava/lang/String;)Ljava/lang/String;');
    nameAndType(43, 44);
    ref(11, 42, 45);
    methodHandle(7, 46);
    utf8('condy');
    string(48);
    utf8('specialValue');
    utf8('Ljava/lang/String;');
    nameAndType(50, 51);
    dynamic(1, 52);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(1);
    u2(42);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x35,
      0xb6, 0x00, 0x17,
      0xb1
    ], 2, 1);

    u2(1);
    u2(24);
    u4(18);
    u2(2);
    u2(31);
    u2(1);
    u2(36);
    u2(31);
    u2(3);
    u2(47);
    u2(40);
    u2(49);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvokePrimitiveAdapt.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(54);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvokePrimitiveAdapt');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(D)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('invoke');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('java/lang/Long');
    cls(32);
    utf8('valueOf');
    utf8('(J)Ljava/lang/Long;');
    nameAndType(34, 35);
    ref(10, 33, 36);
    methodHandle(6, 37);
    int64(0, 37);
    utf8('boxedLong');
    utf8('Ljava/lang/Long;');
    nameAndType(41, 42);
    dynamic(0, 43);
    utf8('doubleIdentity');
    utf8('(D)D');
    nameAndType(45, 46);
    ref(10, 1, 47);
    methodHandle(6, 48);
    utf8('doubleFromBoxedLong');
    utf8('D');
    nameAndType(50, 51);
    dynamic(1, 52);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(3);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x35,
      0xb6, 0x00, 0x17,
      0xb1
    ], 3, 1);

    u2(0x0009);
    u2(45);
    u2(46);
    u2(1);
    codeAttr([0x26, 0xaf], 2, 2);

    u2(1);
    u2(24);
    u4(18);
    u2(2);
    u2(31);
    u2(2);
    u2(38);
    u2(39);
    u2(31);
    u2(2);
    u2(49);
    u2(44);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvokeFloatAdapt.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(53);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeFloatAdapt');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(F)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('invoke');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('java/lang/Integer');
    cls(32);
    utf8('valueOf');
    utf8('(I)Ljava/lang/Integer;');
    nameAndType(34, 35);
    ref(10, 33, 36);
    methodHandle(6, 37);
    int32(16777217);
    utf8('boxedInteger');
    utf8('Ljava/lang/Integer;');
    nameAndType(40, 41);
    dynamic(0, 42);
    utf8('floatIdentity');
    utf8('(F)F');
    nameAndType(44, 45);
    ref(10, 1, 46);
    methodHandle(6, 47);
    utf8('floatFromBoxedInteger');
    utf8('F');
    nameAndType(49, 50);
    dynamic(1, 51);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(3);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x12, 0x34,
      0xb6, 0x00, 0x17,
      0xb1
    ], 2, 1);

    u2(0x0009);
    u2(44);
    u2(45);
    u2(1);
    codeAttr([0x22, 0xae], 1, 1);

    u2(1);
    u2(24);
    u4(18);
    u2(2);
    u2(31);
    u2(2);
    u2(38);
    u2(39);
    u2(31);
    u2(2);
    u2(48);
    u2(43);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('javac_modern_classlib', 'Compile Java 9+ bootstrap class-library shims.', function() {
    var done: (status?: boolean) => void = this.async(),
      srcDir = 'classes/modern_classlib',
      outDir = 'classes/modern_classlib/out',
      compileSupportDir = 'build/modern-classlib-compile-support',
      runtimeJar = path.resolve('vendor/java_home/lib/rt.jar'),
      runtimePatchPath = srcDir + path.delimiter + compileSupportDir,
      compileSupportEntries = [
        'java/nio/file/FileTreeIterator.class',
        'java/nio/file/FileTreeWalker.class',
        'java/nio/file/FileTreeWalker$1.class',
        'java/nio/file/FileTreeWalker$DirectoryNode.class',
        'java/nio/file/FileTreeWalker$Event.class',
        'java/nio/file/FileTreeWalker$EventType.class'
      ],
      marker = outDir + '/.timestamp',
      inputFiles = grunt.file.expand([srcDir + '/**/*.java']),
      specialInputFiles = inputFiles.filter(function(src: string): boolean {
        return src === srcDir + '/java/lang/System$Logger.java' ||
          src === srcDir + '/java/lang/System$DoppioLogger.java' ||
          src === srcDir + '/sun/invoke/util/VerifyAccess.java';
      }),
      normalInputFiles = inputFiles.filter(function(src: string): boolean {
        return specialInputFiles.indexOf(src) === -1;
      }),
      newestSource = inputFiles.concat(['tasks/modern_java.ts', runtimeJar]).reduce(function(
          newest: Date, src: string): Date {
        var mtime = fs.statSync(src).mtime;
        return mtime > newest ? mtime : newest;
      }, new Date(0));
    grunt.config.requires('build.javac');
    var jarTool = path.join(
      path.dirname(grunt.config('build.javac')),
      os.platform() === 'win32' ? 'jar.exe' : 'jar');
    if (inputFiles.length === 0) {
      return done();
    }
    if (fs.existsSync(marker) && fs.statSync(marker).mtime > newestSource) {
      return done();
    }
    grunt.file.mkdir(outDir);
    function compileSpecialFiles(): void {
      if (specialInputFiles.length === 0) {
        fs.writeFileSync(marker, '');
        done();
        return;
      }
      child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 -source 9 -target 9 -implicit:none --patch-module java.base=' + shellEscape(srcDir) + ' -d ' + shellEscape(outDir) + ' ' + specialInputFiles.map(shellEscape).join(' '),
        function(err?: any, stdout?: Buffer, stderr?: Buffer) {
          if (err) {
            grunt.fail.fatal('Error compiling special modern classlib sources: ' + err + '\n' + stdout.toString() + stderr.toString());
          }
          fs.writeFileSync(marker, '');
          done();
        });
    }
    if (normalInputFiles.length === 0) {
      compileSpecialFiles();
      return;
    }
    grunt.file.delete(compileSupportDir);
    grunt.file.mkdir(compileSupportDir);
    child_process.execFile(
      jarTool,
      ['--extract', '--file', runtimeJar].concat(compileSupportEntries),
      { cwd: compileSupportDir },
      function(extractErr?: any, extractStdout?: string, extractStderr?: string) {
        if (extractErr) {
          grunt.fail.fatal('Error extracting modern classlib compile support: ' + extractErr + '\n' +
            extractStdout.toString() + extractStderr.toString());
        }
        child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 --release 9 --patch-module java.base=' + shellEscape(runtimePatchPath) + ' -d ' + shellEscape(outDir) + ' ' + normalInputFiles.map(shellEscape).join(' '),
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            if (err) {
              grunt.fail.fatal('Error compiling modern classlib: ' + err + '\n' + stdout.toString() + stderr.toString());
            }
            compileSpecialFiles();
          });
      });
  });

  grunt.registerTask('generate_modern_bootstrap_overlay',
      'Generate compiler-facing bootstrap classes with the runtime overlay transformer.', function() {
    var runtimeJar = 'vendor/java_home/lib/rt.jar',
      workDir = 'build/modern-bootstrap-overlay',
      baseDir = path.join(workDir, 'base'),
      outDir = path.join(workDir, 'out'),
      artifact = path.join(workDir, 'modern-bootstrap.jar'),
      inputHashPath = path.join(workDir, 'input.sha256'),
      artifactHashPath = path.join(workDir, 'artifact.sha256'),
      compiledTransformer = path.resolve('build/dev-cli/src/ClassLoader.js'),
      inputs = [runtimeJar, 'src/ClassLoader.ts', 'tasks/modern_java.ts', compiledTransformer],
      force = process.env.DOPPIO_FORCE_MODERN_BOOTSTRAP_OVERLAY === '1';
    if (!fs.existsSync(compiledTransformer)) {
      grunt.fail.fatal('Compiled bootstrap overlay transformer is missing: ' + compiledTransformer);
    }

    var inputHasher = crypto.createHash('sha256');
    inputHasher.update('doppio-modern-bootstrap-overlay-v1\0');
    inputHasher.update('timestamp=2000-01-01T00:00:00Z\0manifest=none\0ordering=lexical\0');
    inputs.forEach(function(input: string): void {
      inputHasher.update(input + '\0');
      inputHasher.update(fs.readFileSync(input));
    });
    var inputHash = inputHasher.digest('hex');
    if (!force && fs.existsSync(artifact) && fs.existsSync(inputHashPath) &&
        fs.existsSync(artifactHashPath)) {
      var cachedInputHash = fs.readFileSync(inputHashPath, 'utf8').trim(),
        cachedArtifactHash = fs.readFileSync(artifactHashPath, 'utf8').trim(),
        currentArtifactHash = crypto.createHash('sha256')
          .update(fs.readFileSync(artifact)).digest('hex');
      if (cachedInputHash === inputHash && cachedArtifactHash === currentArtifactHash) {
        grunt.log.ok('Compiler bootstrap overlay content hashes are up-to-date.');
        return;
      }
    }

    if (fs.existsSync(workDir)) {
      grunt.file.delete(workDir, {force: true});
    }
    grunt.file.mkdir(baseDir);
    grunt.file.mkdir(outDir);

    var jarTool = path.join(
        path.dirname(grunt.config('build.javac')),
        os.platform() === 'win32' ? 'jar.exe' : 'jar'),
      extraction = child_process.spawnSync(
        jarTool, ['xf', path.resolve(runtimeJar)], {cwd: baseDir, encoding: 'utf8'});
    if (extraction.status !== 0) {
      grunt.fail.fatal('Unable to extract runtime bootstrap classes:\n' +
        extraction.stdout + extraction.stderr);
    }

    var transformer: {
        applyModernBootstrapOverlays: (typeStr: string, data: Buffer) => Buffer;
      } = require(compiledTransformer),
      classFiles: string[] = grunt.file.expand(
        {cwd: baseDir, filter: 'isFile'}, ['**/*.class']),
      transformedClasses: string[] = [];
    classFiles.forEach(function(relativePath: string): void {
      var inputPath = path.join(baseDir, relativePath),
        input = fs.readFileSync(inputPath),
        typeStr = 'L' + relativePath.slice(0, -'.class'.length).replace(/\\/g, '/') + ';',
        transformed = transformer.applyModernBootstrapOverlays(typeStr, input);
      if (!transformed.equals(input)) {
        var outputPath = path.join(outDir, relativePath);
        grunt.file.mkdir(path.dirname(outputPath));
        fs.writeFileSync(outputPath, transformed);
        transformedClasses.push(relativePath.replace(/\\/g, '/'));
      }
    });

    transformedClasses.sort();
    var expectedTransformedClasses = [
      'java/lang/Character.class',
      'java/lang/Class.class',
      'java/lang/ClassLoader.class',
      'java/lang/Math.class',
      'java/lang/Runtime.class',
      'java/lang/StrictMath.class',
      'java/lang/System.class',
      'java/lang/Thread.class',
      'java/lang/invoke/MethodHandle.class',
      'java/lang/invoke/MethodHandles$Lookup.class',
      'java/lang/invoke/MethodHandles.class',
      'java/lang/ref/Reference.class',
      'java/lang/reflect/AccessibleObject.class',
      'java/lang/reflect/AnnotatedArrayType.class',
      'java/lang/reflect/AnnotatedParameterizedType.class',
      'java/lang/reflect/AnnotatedType.class',
      'java/lang/reflect/AnnotatedTypeVariable.class',
      'java/lang/reflect/AnnotatedWildcardType.class',
      'java/lang/reflect/Constructor.class',
      'java/lang/reflect/Executable.class',
      'java/nio/MappedByteBuffer.class',
      'java/time/Duration.class',
      'java/util/concurrent/TimeUnit.class',
      'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedArrayTypeImpl.class',
      'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedParameterizedTypeImpl.class',
      'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeBaseImpl.class',
      'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeVariableImpl.class',
      'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedWildcardTypeImpl.class',
      'sun/reflect/annotation/AnnotatedTypeFactory.class',
      'sun/reflect/annotation/TypeAnnotation$LocationInfo.class',
      'sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl.class'
    ];
    if (JSON.stringify(transformedClasses) !== JSON.stringify(expectedTransformedClasses)) {
      grunt.fail.fatal('Unexpected compiler bootstrap overlay class set.\nExpected:\n' +
        expectedTransformedClasses.join('\n') + '\nActual:\n' + transformedClasses.join('\n'));
    }

    var packagingArgs = [
      '--create',
      '--file', path.resolve(artifact),
      '--date=2000-01-01T00:00:00Z',
      '--no-manifest'
    ].concat(transformedClasses),
      packaging = child_process.spawnSync(
        jarTool, packagingArgs, {cwd: outDir, encoding: 'utf8'});
    if (packaging.status !== 0) {
      grunt.fail.fatal('Unable to package compiler bootstrap overlay:\n' +
        packaging.stdout + packaging.stderr);
    }
    var artifactHash = crypto.createHash('sha256')
      .update(fs.readFileSync(artifact)).digest('hex');
    fs.writeFileSync(inputHashPath, inputHash + '\n');
    fs.writeFileSync(artifactHashPath, artifactHash + '\n');
    grunt.log.ok('Generated ' + artifact + ' with ' +
      transformedClasses.length + ' transformed bootstrap classes (' + artifactHash + ').');
  });

  grunt.registerTask('javac_modern_multirelease_jar', 'Compile a Java 9 multi-release JAR fixture.', function() {
    var done: (status?: boolean) => void = this.async(),
      srcDir = 'classes/modern_multirelease',
      outRoot = srcDir + '/out',
      outBase = outRoot + '/base',
      out9 = outRoot + '/9',
      manifestPath = outRoot + '/MANIFEST.MF',
      jarPath = srcDir + '/java9-mr.jar',
      baseSources = grunt.file.expand([srcDir + '/base/**/*.java']),
      version9Sources = grunt.file.expand([srcDir + '/version9/**/*.java']),
      javac = shellEscape(grunt.config('build.javac')),
      jarTool = path.join(path.dirname(grunt.config('build.javac')), os.platform() === 'win32' ? 'jar.exe' : 'jar');
    grunt.config.requires('build.javac');
    if (!fs.existsSync(jarTool)) {
      jarTool = 'jar';
    }
    grunt.file.delete(outRoot);
    grunt.file.mkdir(outBase);
    grunt.file.mkdir(out9);
    fs.writeFileSync(manifestPath, 'Manifest-Version: 1.0\nMulti-Release: true\n\n');
    async.series([
      function(next: (err?: any) => void): void {
        child_process.exec(javac + ' -J-Dfile.encoding=UTF8 --release 8 -d ' + shellEscape(outBase) + ' ' + baseSources.map(shellEscape).join(' '),
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            next(err ? 'Error compiling multi-release base classes: ' + err + '\n' + stdout.toString() + stderr.toString() : undefined);
          });
      },
      function(next: (err?: any) => void): void {
        child_process.exec(javac + ' -J-Dfile.encoding=UTF8 --release 9 -d ' + shellEscape(out9) + ' ' + version9Sources.map(shellEscape).join(' '),
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            next(err ? 'Error compiling multi-release Java 9 classes: ' + err + '\n' + stdout.toString() + stderr.toString() : undefined);
          });
      },
      function(next: (err?: any) => void): void {
        child_process.exec(shellEscape(jarTool) + ' --create --file ' + shellEscape(jarPath) + ' --manifest ' + shellEscape(manifestPath) + ' -C ' + shellEscape(outBase) + ' . --release 9 -C ' + shellEscape(out9) + ' .',
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            next(err ? 'Error creating multi-release JAR: ' + err + '\n' + stdout.toString() + stderr.toString() : undefined);
          });
      }
    ], function(err?: any): void {
      if (err) {
        grunt.fail.fatal(err);
      }
      grunt.log.ok('Generated ' + jarPath);
      done();
    });
  });

  grunt.registerMultiTask('javac_modern', 'Run javac for modern Java compatibility fixtures.', function() {
    var files: {src: string[]; dest: string}[] = <any> this.files,
      inputFiles: string[] = [],
      done: (status?: boolean) => void = this.async(),
      options: { release: number; destDir?: string; extraArgs?: string[] } = this.options({ release: 17 }),
      releaseVersion = options.release,
      destDir = options.destDir,
      extraArgs = options.extraArgs || [],
      outputOption = '';
    grunt.config.requires('build.javac');
    files.forEach(function(e: { src: string[]; dest: string }) {
      var dest = e.src[0].slice(0, -4) + 'class';
      if (!destDir && fs.existsSync(dest) && fs.statSync(dest).mtime > fs.statSync(e.src[0]).mtime) {
        return;
      }
      inputFiles = inputFiles.concat(e.src);
    });
    if (inputFiles.length === 0) {
      return done();
    }
    if (destDir) {
      grunt.file.mkdir(destDir);
      outputOption = ' -d ' + shellEscape(destDir);
    }
    child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 --release ' + releaseVersion + ' ' + extraArgs.join(' ') + outputOption + ' ' + inputFiles.join(' '),
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        if (err) {
          grunt.fail.fatal('Error running modern javac: ' + err + '\n' + stdout.toString() + stderr.toString());
        }
        done();
      });
  });

  grunt.registerMultiTask('run_java_modern', 'Run modern Java fixtures on the native JVM.', function() {
    var files: {src: string[]; dest: string}[] = <any> this.files,
      done: (status?: boolean) => void = this.async(),
      tasks: Array<AsyncFunction<void>> = [];
    grunt.config.requires('build.java');
    files.forEach(function(file: {src: string[]; dest: string}) {
      var classFile = file.src[0].slice(0, -4) + 'class',
        sourceMtime = fs.statSync(file.src[0]).mtime,
        classMtime = fs.existsSync(classFile) ? fs.statSync(classFile).mtime : sourceMtime;
      if (fs.existsSync(file.dest) && fs.statSync(file.dest).mtime > sourceMtime && fs.statSync(file.dest).mtime > classMtime) {
        return;
      }
      tasks.push(function(cb: (err?: any) => void) {
        var className = file.src[0].slice(0, -5).replace(/[\\\/]/g, '.'),
          javaOptions = '';
        if (className === 'classes.modern_test.Java17AccessControlContext') {
          javaOptions = ' --add-opens java.base/java.security=ALL-UNNAMED';
        } else if (className === 'classes.modern_test.Java17IoInitIDs') {
          javaOptions = ' --add-opens java.base/java.io=ALL-UNNAMED';
        }
        child_process.exec(shellEscape(grunt.config('build.java')) + javaOptions + ' -Dfile.encoding=UTF8 -ea -cp . ' + className,
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            fs.writeFileSync(file.dest, stdout.toString() + stderr.toString());
            cb(err);
          });
      });
    });

    async.parallelLimit(tasks, os.cpus().length, function(err?: any) {
      if (err) {
        grunt.fail.fatal('modern java failed: ' + err);
      }
      done();
    });
  });

  grunt.registerTask('run_java_modern_multirelease', 'Run the multi-release JAR fixture on the native JVM.', function() {
    var done: (status?: boolean) => void = this.async(),
      jarPath = 'classes/modern_multirelease/java9-mr.jar',
      mainClass = 'classes.modern_mr.Java9MultiReleaseJar',
      outPath = 'classes/modern_multirelease/Java9MultiReleaseJar.runout';
    grunt.config.requires('build.java');
    child_process.exec(shellEscape(grunt.config('build.java')) + ' -Dfile.encoding=UTF8 -ea -cp ' + shellEscape(jarPath) + ' ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        fs.writeFileSync(outPath, stdout.toString() + stderr.toString());
        if (err) {
          grunt.fail.fatal('multi-release native java failed: ' + err);
        }
        done();
      });
  });

  grunt.registerTask('unit_test_modern_multirelease', 'Run the multi-release JAR fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      jarPath = 'classes/modern_multirelease/java9-mr.jar',
      mainClass = 'classes.modern_mr.Java9MultiReleaseJar',
      outPath = 'classes/modern_multirelease/Java9MultiReleaseJar.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath ' + shellEscape(jarPath) + ' ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('multi-release Doppio output does not match native JVM.\nDoppio:\n' + actual + '\nJava:\n' + expected);
        }
        grunt.log.ok('multi-release JAR output matched native JVM.');
        done();
      });
  });

  grunt.registerTask('unit_test_java18_unsigned_multiply_high', 'Run the Java 18 unsigned multiply-high fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java18UnsignedMultiplyHigh',
      outPath = 'classes/modern_test/Java18UnsignedMultiplyHigh.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 18 unsignedMultiplyHigh Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 18 unsignedMultiplyHigh output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java18_division', 'Run the Java 18 integer division API fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java18Division',
      outPath = 'classes/modern_test/Java18Division.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 18 integer division Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 18 integer division output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java18_default_charset', 'Run the Java 18 default charset fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java18DefaultCharset',
      outPath = 'classes/modern_test/Java18DefaultCharset.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 18 default charset Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 18 default charset output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java19_thread_id', 'Run the Java 19 Thread.threadId fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java19ThreadId',
      outPath = 'classes/modern_test/Java19ThreadId.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 19 threadId Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 19 threadId output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java19_thread_sleep_duration', 'Run the Java 19 Thread.sleep(Duration) fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java19ThreadSleepDuration',
      outPath = 'classes/modern_test/Java19ThreadSleepDuration.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 19 Thread.sleep(Duration) Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 19 Thread.sleep(Duration) output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java19_thread_sleep_duration_interrupt', 'Run the Java 19 Thread.sleep(Duration) interrupt fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java19ThreadSleepDurationInterrupt',
      outPath = 'classes/modern_test/Java19ThreadSleepDurationInterrupt.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 19 Thread.sleep(Duration) interrupt Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 19 Thread.sleep(Duration) interrupt output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java21_thread_is_virtual', 'Run the Java 21 Thread.isVirtual fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java21ThreadIsVirtual',
      outPath = 'classes/modern_test/Java21ThreadIsVirtual.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 21 isVirtual Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 21 isVirtual output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java21_math_clamp', 'Run the Java 21 Math.clamp fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java21MathClamp',
      outPath = 'classes/modern_test/Java21MathClamp.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 21 Math.clamp Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 21 Math.clamp output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java21_list_sequenced', 'Run the Java 21 List sequenced-collection fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java21ListSequenced',
      outPath = 'classes/modern_test/Java21ListSequenced.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 21 List sequenced-collection Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 21 List sequenced-collection output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java21_deque_sequenced', 'Run the Java 21 Deque sequenced-collection fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java21DequeSequenced',
      outPath = 'classes/modern_test/Java21DequeSequenced.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 21 Deque sequenced-collection Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 21 Deque sequenced-collection output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java21_sorted_set_sequenced', 'Run the Java 21 sorted-set sequenced-collection fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java21SortedSetSequenced',
      outPath = 'classes/modern_test/Java21SortedSetSequenced.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 21 sorted-set sequenced-collection Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 21 sorted-set sequenced-collection output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java21_sorted_map_sequenced', 'Run the Java 21 sorted-map sequenced-map fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java21SortedMapSequenced',
      outPath = 'classes/modern_test/Java21SortedMapSequenced.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 21 sorted-map sequenced-map Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 21 sorted-map sequenced-map output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_modern_classfile_runtime_versions', 'Run runnable Java 20+ class-file fixtures on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      specs = [
        ['classes.modern_test.Java20ClassFileRuntime', 'classes/modern_test/Java20ClassFileRuntime.runout'],
        ['classes.modern_test.Java21ClassFileRuntime', 'classes/modern_test/Java21ClassFileRuntime.runout'],
        ['classes.modern_test.Java22ClassFileRuntime', 'classes/modern_test/Java22ClassFileRuntime.runout'],
        ['classes.modern_test.Java23ClassFileRuntime', 'classes/modern_test/Java23ClassFileRuntime.runout'],
        ['classes.modern_test.Java24ClassFileRuntime', 'classes/modern_test/Java24ClassFileRuntime.runout'],
        ['classes.modern_test.Java25ClassFileRuntime', 'classes/modern_test/Java25ClassFileRuntime.runout'],
        ['classes.modern_test.Java26ClassFileRuntime', 'classes/modern_test/Java26ClassFileRuntime.runout']
      ];
    async.eachSeries(specs,
      function(spec: string[], next: (err?: any) => void): void {
        child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + spec[0],
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            var actual = stdout.toString() + stderr.toString(),
              expected = fs.readFileSync(spec[1], 'utf8');
            if (err || actual !== expected) {
              next(new Error('Modern class-file runtime output does not match expected output for ' + spec[0] + '.\nDoppio:\n' + actual + '\nExpected:\n' + expected));
              return;
            }
            grunt.log.ok(spec[0] + ' output matched expected output.');
            next();
          });
      },
      function(err?: any): void {
        if (err) {
          grunt.fail.fatal(err.message);
        }
        done();
      });
  });

  grunt.registerTask('unit_test_filechannel_writev_partial_progress', 'Verify gather-write position after injected host failures.', function() {
    var done: (status?: boolean) => void = this.async(),
      injectorPath = path.resolve('ci/writev_partial_failure_injector.cjs'),
      mainClass = 'classes.modern_test.Java17FileChannelPartialProgress',
      scenarios = [
        ['fallback-write',
          'mode:fallback-write\npartial-result:1\nbuffer-positions:1:0\npartial-position:1\nnext-write:1\nnext-position:2\ncontent:AZ\n'],
        ['fallback-sync',
          'mode:fallback-sync\nfailure:true\nbuffer-positions:0:0\npartial-position:1\nnext-write:1\nnext-position:2\ncontent:AZ\n'],
        ['fallback-stat',
          'mode:fallback-stat\nfailure:true\nbuffer-positions:0:0\npartial-position:1\nnext-write:1\nnext-position:2\ncontent:AZ\n']
      ];
    if (typeof (<any> fs).writev === 'function') {
      scenarios.push([
        'native-sync',
        'mode:native-sync\nfailure:true\nbuffer-positions:0:0\npartial-position:2\nnext-write:1\nnext-position:3\ncontent:ABZ\n'
      ]);
    }
    async.eachSeries(scenarios,
      function(scenario: string[], next: (err?: any) => void): void {
        var env: {[name: string]: string} = <any> Object.assign({}, process.env, {
          DOPPIO_WRITEV_FAILURE_MODE: scenario[0]
        });
        child_process.execFile(
          process.execPath,
          [
            '--no-deprecation',
            '--require',
            injectorPath,
            'build/release-cli/console/runner.js',
            '-classpath',
            '.',
            mainClass
          ],
          {env: env},
          function(err?: any, stdout?: string, stderr?: string): void {
            var actual = stdout + stderr,
              expected = scenario[1];
            if (err || actual !== expected) {
              next(new Error(
                'Gather-write partial-progress output does not match for ' + scenario[0] +
                '.\nDoppio:\n' + actual + '\nExpected:\n' + expected
              ));
              return;
            }
            grunt.log.ok('Gather-write partial-progress output matched for ' + scenario[0] + '.');
            next();
          }
        );
      },
      function(err?: any): void {
        if (err) {
          grunt.fail.fatal(err.message);
        }
        done();
      });
  });

  grunt.registerTask('unit_test_filechannel_readv_partial_progress', 'Verify scatter-read position across injected host boundaries.', function() {
    var done: (status?: boolean) => void = this.async(),
      injectorPath = path.resolve('ci/readv_partial_failure_injector.cjs'),
      mainClass = 'classes.modern_test.Java17FileChannelPartialReadProgress',
      scenarios = [
        ['fallback-read',
          'mode:fallback-read\nscatter-result:1\nbuffer-positions:1:0\nbuffer-bytes:A:-\nscatter-position:1\nnext-read:1\nnext-position:2\nnext-byte:B\n'],
        ['fallback-eof',
          'mode:fallback-eof\nscatter-result:1\nbuffer-positions:1:0\nbuffer-bytes:C:-\nscatter-position:3\nnext-read:-1\nnext-position:3\nnext-byte:-\n']
      ];
    if (typeof (<any> fs).readv === 'function') {
      scenarios.push([
        'native-read',
        'mode:native-read\nscatter-result:2\nbuffer-positions:1:1\nbuffer-bytes:A:B\nscatter-position:2\nnext-read:1\nnext-position:3\nnext-byte:C\n'
      ]);
    }
    async.eachSeries(scenarios,
      function(scenario: string[], next: (err?: any) => void): void {
        var env: {[name: string]: string} = <any> Object.assign({}, process.env, {
          DOPPIO_READV_FAILURE_MODE: scenario[0]
        });
        child_process.execFile(
          process.execPath,
          [
            '--no-deprecation',
            '--require',
            injectorPath,
            'build/release-cli/console/runner.js',
            '-classpath',
            '.',
            mainClass
          ],
          {env: env},
          function(err?: any, stdout?: string, stderr?: string): void {
            var actual = stdout + stderr,
              expected = scenario[1];
            if (err || actual !== expected) {
              next(new Error(
                'Scatter-read partial-progress output does not match for ' + scenario[0] +
                '.\nDoppio:\n' + actual + '\nExpected:\n' + expected
              ));
              return;
            }
            grunt.log.ok('Scatter-read partial-progress output matched for ' + scenario[0] + '.');
            next();
          }
        );
      },
      function(err?: any): void {
        if (err) {
          grunt.fail.fatal(err.message);
        }
        done();
      });
  });

  grunt.registerTask('unit_test_file_output_stream_append_channel', 'Verify FileOutputStream append state, placement, and failed-open cleanup.', function() {
    var done: (status?: boolean) => void = this.async(),
      injectorPath = path.resolve('ci/file_output_stream_append_injector.cjs'),
      mainClass = 'classes.modern_test.Java17FileOutputStreamAppendChannel',
      scenarios = [
        ['state',
          'mode:state\nopen-position:1\nreset-position:1\nstream-position:2\ngather-result:2\nbuffer-positions:1:1\ngather-position:4\nexternal-position:5\nexternal-stream-position:6\nscalar-result:1\nscalar-buffer-position:1\nfinal-position:7\ncontent:ABCDEFG\n'],
        ['fstat-open',
          'mode:fstat-open\nopen-failure:true\ncontent:A\n'],
        ['fstat-write',
          'mode:fstat-write\nwrite-failure:true\ncontent:ABC\n']
      ];
    async.eachSeries(scenarios,
      function(scenario: string[], next: (err?: any) => void): void {
        var env: {[name: string]: string} = <any> Object.assign({}, process.env, {
          DOPPIO_FOS_APPEND_MODE: scenario[0]
        });
        child_process.execFile(
          process.execPath,
          [
            '--no-deprecation',
            '--require',
            injectorPath,
            'build/release-cli/console/runner.js',
            '-classpath',
            '.',
            mainClass
          ],
          {env: env},
          function(err?: any, stdout?: string, stderr?: string): void {
            var actual = stdout + stderr,
              expected = scenario[1];
            if (err || actual !== expected) {
              next(new Error(
                'FileOutputStream append output does not match for ' + scenario[0] +
                '.\nDoppio:\n' + actual + '\nExpected:\n' + expected
              ));
              return;
            }
            grunt.log.ok('FileOutputStream append output matched for ' + scenario[0] + '.');
            next();
          }
        );
      },
      function(err?: any): void {
        if (err) {
          grunt.fail.fatal(err.message);
        }
        done();
      });
  });

  grunt.registerTask('unit_test_filechannel_ioexception_boundaries', 'Verify channel IOException and provider UnixException boundaries.', function() {
    var done: (status?: boolean) => void = this.async(),
      injectorPath = path.resolve('ci/filechannel_ioexception_injector.cjs'),
      unixClosePolicyPath = path.resolve('ci/unix_close_policy_test.cjs'),
      mainClass = 'classes.modern_test.Java17FileChannelIOExceptionBoundaries',
      operationsExpected =
        'size:java.io.IOException:true:false\n' +
        'truncate:java.io.IOException:true:false\n' +
        'write:java.io.IOException:true:false:0\n' +
        'gather:java.io.IOException:true:false:0:0\n' +
        'force:java.io.IOException:true:false\n' +
        'map:java.io.IOException:true:false\n' +
        'map-memory:java.io.IOException:true:true\n' +
        'transfer-read:java.io.IOException:true:false\n' +
        'transfer-write:java.io.IOException:true:false\n' +
        'post-write:java.io.IOException:true:false:0:4\n' +
        'provider:java.nio.file.AccessDeniedException:true:true\n' +
        'content:ABCQ\n',
      readCloseExpected =
        'read:java.io.IOException:true:false\n' +
        'buffer-positions:0:0\n' +
        'close:java.io.IOException:true:false\n' +
        'channel-open:false\n' +
        'second-close:true\n' +
        'content:ABC\n',
      legacyCloseExpected =
        'close:java.io.IOException:true:false\n' +
        'descriptor-valid:false\n' +
        'channel-open:false\n' +
        'second-close:true\n' +
        'content:ABC\n',
      unixClosePolicyExpected =
        'close-eio:returned:1:1\n' +
        'fclose-eio:unix-exception:1:1\n' +
        'fclose-eintr:returned:1:1\n',
      scenarios = [
        ['operations', 'mode:operations\n' + operationsExpected],
        ['operations-fallback', 'mode:operations-fallback\n' + operationsExpected],
        ['read-close-fallback', 'mode:read-close-fallback\n' + readCloseExpected],
        ['legacy-close-input', 'mode:legacy-close-input\n' + legacyCloseExpected],
        ['legacy-close-output', 'mode:legacy-close-output\n' + legacyCloseExpected],
        ['legacy-close-random', 'mode:legacy-close-random\n' + legacyCloseExpected]
      ];
    if (typeof (<any> fs).readv === 'function') {
      scenarios.push([
        'read-close-native',
        'mode:read-close-native\n' + readCloseExpected
      ]);
    }
    async.eachSeries(scenarios,
      function(scenario: string[], next: (err?: any) => void): void {
        var env: {[name: string]: string} = <any> Object.assign({}, process.env, {
          DOPPIO_FILECHANNEL_IOEXCEPTION_MODE: scenario[0]
        });
        child_process.execFile(
          process.execPath,
          [
            '--no-deprecation',
            '--require',
            injectorPath,
            'build/release-cli/console/runner.js',
            '-classpath',
            '.',
            mainClass
          ],
          {env: env},
          function(err?: any, stdout?: string, stderr?: string): void {
            var actual = stdout + stderr,
              expected = scenario[1];
            if (err || actual !== expected) {
              next(new Error(
                'FileChannel exception-boundary output does not match for ' + scenario[0] +
                '.\nDoppio:\n' + actual + '\nExpected:\n' + expected
              ));
              return;
            }
            grunt.log.ok('FileChannel exception-boundary output matched for ' + scenario[0] + '.');
            next();
          }
        );
      },
      function(err?: any): void {
        if (err) {
          grunt.fail.fatal(err.message);
          return;
        }
        child_process.execFile(
          process.execPath,
          ['--no-deprecation', unixClosePolicyPath],
          function(policyErr?: any, stdout?: string, stderr?: string): void {
            var actual = stdout + stderr;
            if (policyErr || actual !== unixClosePolicyExpected) {
              grunt.fail.fatal(
                'Unix close-policy output does not match.\nDoppio:\n' + actual +
                '\nExpected:\n' + unixClosePolicyExpected
              );
              return;
            }
            grunt.log.ok('Unix descriptor close policies matched their native contracts.');
            done();
          }
        );
      });
  });

  grunt.registerTask('unit_test_legacy_fd_generation', 'Fence legacy I/O callbacks across descriptor close and fd reuse.', function() {
    var done: (status?: boolean) => void = this.async(),
      testPath = path.resolve('ci/legacy_fd_generation_test.cjs'),
      expected = 'legacy-fd-generation:31:ok\n';
    child_process.execFile(
      process.execPath,
      ['--no-deprecation', testPath],
      function(err?: any, stdout?: string, stderr?: string): void {
        var actual = stdout + stderr;
        if (err || actual !== expected) {
          grunt.fail.fatal(
            'Legacy descriptor-generation output does not match.\nDoppio:\n' + actual +
            '\nExpected:\n' + expected
          );
          return;
        }
        grunt.log.ok('Legacy descriptor generations fence delayed callbacks after close.');
        done();
      }
    );
  });

  grunt.registerTask('unit_test_legacy_fd_leases', 'Keep legacy host descriptors open until pending operations drain.', function() {
    var done: (status?: boolean) => void = this.async(),
      testPath = path.resolve('ci/legacy_fd_lease_test.cjs'),
      expected = 'legacy-fd-leases:7:ok\n';
    child_process.execFile(
      process.execPath,
      ['--no-deprecation', testPath],
      function(err?: any, stdout?: string, stderr?: string): void {
        var actual = stdout + stderr;
        if (err || actual !== expected) {
          grunt.fail.fatal(
            'Legacy descriptor-lease output does not match.\nDoppio:\n' + actual +
            '\nExpected:\n' + expected
          );
          return;
        }
        grunt.log.ok('Legacy descriptor close waits for pending host operations.');
        done();
      }
    );
  });

  grunt.registerTask('unit_test_nio_fd_leases', 'Keep NIO host descriptors open until pending channel operations drain.', function() {
    var done: (status?: boolean) => void = this.async(),
      testPath = path.resolve('ci/nio_fd_lease_test.cjs'),
      expected = 'nio-fd-leases:3:ok\n';
    child_process.execFile(
      process.execPath,
      ['--no-deprecation', testPath],
      function(err?: any, stdout?: string, stderr?: string): void {
        var actual = stdout + stderr;
        if (err || actual !== expected) {
          grunt.fail.fatal(
            'NIO descriptor-lease output does not match.\nDoppio:\n' + actual +
            '\nExpected:\n' + expected
          );
          return;
        }
        grunt.log.ok('NIO descriptor close waits for pending channel operations.');
        done();
      }
    );
  });

  grunt.registerTask('unit_test_nio_fd_operation_leases', 'Keep transfer, copy, and Unix descriptor operations generation-bound.', function() {
    var done: (status?: boolean) => void = this.async(),
      testPath = path.resolve('ci/nio_fd_operation_lease_test.cjs'),
      expected = 'nio-fd-operation-leases:18:ok\n';
    child_process.execFile(
      process.execPath,
      ['--no-deprecation', testPath],
      function(err?: any, stdout?: string, stderr?: string): void {
        var actual = stdout + stderr;
        if (err || actual !== expected) {
          grunt.fail.fatal(
            'NIO descriptor operation-lease output does not match.\nDoppio:\n' + actual +
            '\nExpected:\n' + expected
          );
          return;
        }
        grunt.log.ok('NIO transfer, copy, and Unix operations retain their descriptor generations.');
        done();
      }
    );
  });

  grunt.registerTask('unit_test_mapped_buffer_fd_lifetime', 'Retain writable mapping descriptors through force and unmap.', function() {
    var done: (status?: boolean) => void = this.async(),
      testPath = path.resolve('ci/mapped_buffer_fd_lifetime_test.cjs'),
      expected = 'mapped-buffer-fd-lifetime:10:ok\n';
    child_process.execFile(
      process.execPath,
      ['--no-deprecation', testPath],
      function(err?: any, stdout?: string, stderr?: string): void {
        var actual = stdout + stderr;
        if (err || actual !== expected) {
          grunt.fail.fatal(
            'Mapped-buffer descriptor-lifetime output does not match.\nDoppio:\n' + actual +
            '\nExpected:\n' + expected
          );
          return;
        }
        grunt.log.ok('Writable mappings retain their host descriptor until force and unmap finish.');
        done();
      }
    );
  });

  grunt.registerMultiTask('parse_classfile_modern', 'Parse modern class-file fixtures with Doppio.', function() {
    var ReferenceClassData = require('../build/release-cli/src/ClassData').ReferenceClassData,
      options: {
        nestHost?: string;
        nestMembers?: string[];
        permittedSubclasses?: string[];
        recordComponents?: string[];
      } = this.options({});
    this.files.forEach(function(file: {src: string[]; dest: string}) {
      file.src.forEach(function(src: string) {
        var classData = new ReferenceClassData(fs.readFileSync(src));
        if (options.nestHost && classData.getNestHostName() !== options.nestHost) {
          grunt.fail.fatal(src + ' nest host mismatch: expected ' + options.nestHost + ', got ' + classData.getNestHostName());
        }
        if (options.nestMembers) {
          var members = classData.getNestMemberNames();
          options.nestMembers.forEach(function(expectedMember: string) {
            if (members.indexOf(expectedMember) === -1) {
              grunt.fail.fatal(src + ' missing nest member ' + expectedMember + '. Members: ' + members.join(', '));
            }
          });
        }
        if (options.permittedSubclasses) {
          var subclasses = classData.getPermittedSubclassNames();
          options.permittedSubclasses.forEach(function(expectedSubclass: string) {
            if (subclasses.indexOf(expectedSubclass) === -1) {
              grunt.fail.fatal(src + ' missing permitted subclass ' + expectedSubclass + '. Subclasses: ' + subclasses.join(', '));
            }
          });
        }
        if (options.recordComponents) {
          var components = classData.getRecordComponentNames();
          options.recordComponents.forEach(function(expectedComponent: string) {
            if (components.indexOf(expectedComponent) === -1) {
              grunt.fail.fatal(src + ' missing record component ' + expectedComponent + '. Components: ' + components.join(', '));
            }
          });
        }
        grunt.log.ok('Parsed ' + src);
      });
    });
  });
}

export = modernJava;
