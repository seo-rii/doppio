// Fixed C7d4 original-source and complete recursive public-output vectors.
// These literals are never populated at runtime from a native oracle or product writer.
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const classFileInputContracts=freeze({
  "classfile-declarations-signatures": {
    "source": "classes/modern_fixture/ClassFileDeclarationsFinal.java",
    "mainClass": "classes.modern_test.ClassFileDeclarationsFinal",
    "completionMarker": "CLASSFILE_DECLARATIONS_OK",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileDeclarationsFinal",
      "classes.modern_test.D4AllValues",
      "classes.modern_test.D4DeclInvisible",
      "classes.modern_test.D4DeclVisible",
      "classes.modern_test.D4DeclarationTarget",
      "classes.modern_test.D4Nested",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "driverContracts": [
      {
        "className": "classes.modern_test.ClassFileDeclarationsFinal",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.ClassFileSupport",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4AllValues",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      },
      {
        "className": "classes.modern_test.D4DeclInvisible",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      },
      {
        "className": "classes.modern_test.D4DeclVisible",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      },
      {
        "className": "classes.modern_test.D4DeclarationTarget",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4Nested",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      }
    ],
    "callbacks": [
      {
        "name": "ref",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature$RefTypeSig;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "methodSignature",
        "descriptor": "()Ljava/lang/classfile/MethodSignature;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "classSignature",
        "descriptor": "()Ljava/lang/classfile/ClassSignature;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "method",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/String;)Ljava/lang/classfile/MethodModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "field",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/String;)Ljava/lang/classfile/FieldModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "copy",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "flags",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "codeReference",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeThirteen",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeFive",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeInput",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildMethod",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "methodGeneric",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildClass",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "allValues",
        "descriptor": "()Ljava/lang/classfile/Annotation;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "buildValues",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "visible",
        "descriptor": "(I)Ljava/lang/classfile/Annotation;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "invisible",
        "descriptor": "(I)Ljava/lang/classfile/Annotation;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "buildParameters",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "methodParameters",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildDefaults",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "defaultInt",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "defaultString",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "defaultArray",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildNames",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "optionalNames",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      }
    ],
    "codecs": [],
    "resources": [
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;",
        "name": "D4DeclarationTarget.class",
        "target": "classes.modern_test.D4DeclarationTarget",
        "caller": null
      }
    ]
  },
  "classfile-declarations-type-annotations": {
    "source": "classes/modern_fixture/ClassFileTypeAnnotationsFinal.java",
    "mainClass": "classes.modern_test.ClassFileTypeAnnotationsFinal",
    "completionMarker": "CLASSFILE_TYPE_ANNOTATIONS_OK",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileTypeAnnotationsFinal",
      "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
      "classes.modern_test.D4Resource",
      "classes.modern_test.D4TypeInvisible",
      "classes.modern_test.D4TypeOuter$Inner",
      "classes.modern_test.D4TypeOuter",
      "classes.modern_test.D4TypeTarget",
      "classes.modern_test.D4TypeVisible",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "driverContracts": [
      {
        "className": "classes.modern_test.ClassFileSupport",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.classfile.CodeTransform"
        ]
      },
      {
        "className": "classes.modern_test.ClassFileTypeAnnotationsFinal",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4Resource",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.AutoCloseable"
        ]
      },
      {
        "className": "classes.modern_test.D4TypeInvisible",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      },
      {
        "className": "classes.modern_test.D4TypeOuter$Inner",
        "flags": 32,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4TypeOuter",
        "flags": 32,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4TypeTarget",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.io.Serializable"
        ]
      },
      {
        "className": "classes.modern_test.D4TypeVisible",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      }
    ],
    "callbacks": [
      {
        "name": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "method",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/String;)Ljava/lang/classfile/MethodModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "field",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/String;)Ljava/lang/classfile/FieldModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "visible",
        "descriptor": "(Ljava/lang/classfile/AttributedElement;)Ljava/util/List;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "invisible",
        "descriptor": "(Ljava/lang/classfile/AttributedElement;)Ljava/util/List;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "count",
        "descriptor": "(Ljava/util/List;Ljava/lang/classfile/TypeAnnotation$TargetType;)I",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "path",
        "descriptor": "(Ljava/util/List;Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;)Z",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "position",
        "descriptor": "(Ljava/lang/classfile/CodeModel;Ljava/lang/classfile/Label;)I",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "buildModels",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeModels",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "relocator",
        "descriptor": "()Ljava/lang/classfile/CodeTransform;",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "relocateClass",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      }
    ],
    "codecs": [
      {
        "owner": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
        "name": "atStart",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.CodeTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
        "name": "accept",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
        "flags": 1,
        "interface": "java.lang.classfile.CodeTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
        "name": "atEnd",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.CodeTransform"
      }
    ],
    "resources": [
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;",
        "name": "D4TypeTarget.class",
        "target": "classes.modern_test.D4TypeTarget",
        "caller": null
      }
    ]
  },
  "classfile-declarations-metadata": {
    "source": "classes/modern_fixture/ClassFileMetadataFinal.java",
    "mainClass": "classes.modern_test.ClassFileMetadataFinal",
    "completionMarker": "CLASSFILE_METADATA_OK",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileMetadataFinal",
      "classes.modern_test.ClassFileMetadataFinal$1D4Local",
      "classes.modern_test.D4RecordAnnotated",
      "classes.modern_test.D4RecordExecutable",
      "classes.modern_test.D4RecordModel",
      "classes.modern_test.D4RecordTypeVisible",
      "classes.modern_test.D4RecordVisible",
      "classes.modern_test.D4SealedBase",
      "classes.modern_test.D4SealedLeaf",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "driverContracts": [
      {
        "className": "classes.modern_test.ClassFileMetadataFinal$1D4Local",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.ClassFileMetadataFinal",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.ClassFileSupport",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4RecordAnnotated",
        "flags": 48,
        "superclass": "java.lang.Record",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4RecordExecutable",
        "flags": 48,
        "superclass": "java.lang.Record",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4RecordModel",
        "flags": 48,
        "superclass": "java.lang.Record",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4RecordTypeVisible",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      },
      {
        "className": "classes.modern_test.D4RecordVisible",
        "flags": 9728,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.annotation.Annotation"
        ]
      },
      {
        "className": "classes.modern_test.D4SealedBase",
        "flags": 32,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.D4SealedLeaf",
        "flags": 48,
        "superclass": "classes.modern_test.D4SealedBase",
        "interfaces": []
      }
    ],
    "callbacks": [
      {
        "name": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "enclosing",
        "descriptor": "()Ljava/lang/Object;",
        "flags": 10,
        "bootstrap": false,
        "binding": "static-resource-origin"
      },
      {
        "name": "copy",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "rebuildRecord",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildEnclosing",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeThirtyOne",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildMarkers",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "fieldMarkers",
        "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "methodMarkers",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeFortyOne",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "module",
        "descriptor": "()Ljava/lang/classfile/attribute/ModuleAttribute;",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "moduleExtras",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      }
    ],
    "codecs": [],
    "resources": [
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
        "name": "ClassFileMetadataFinal$1D4Local.class",
        "target": "classes.modern_test.ClassFileMetadataFinal$1D4Local",
        "caller": "caseEnclosing"
      },
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
        "name": "D4RecordAnnotated.class",
        "target": "classes.modern_test.D4RecordAnnotated",
        "caller": "caseRecordComponents"
      },
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
        "name": "D4RecordExecutable.class",
        "target": "classes.modern_test.D4RecordExecutable",
        "caller": "caseRecordAccessor"
      },
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
        "name": "D4RecordModel.class",
        "target": "classes.modern_test.D4RecordModel",
        "caller": "caseRecordModel"
      },
      {
        "method": "original",
        "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
        "name": "D4SealedBase.class",
        "target": "classes.modern_test.D4SealedBase",
        "caller": "caseSealed"
      }
    ]
  },
  "classfile-declarations-combinators": {
    "source": "classes/modern_fixture/ClassFileCombinatorsFinal.java",
    "mainClass": "classes.modern_test.ClassFileCombinatorsFinal",
    "completionMarker": "CLASSFILE_COMBINATORS_OK",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileCombinatorsFinal",
      "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
      "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
      "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
      "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "driverContracts": [
      {
        "className": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.classfile.ClassTransform"
        ]
      },
      {
        "className": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.classfile.CodeTransform"
        ]
      },
      {
        "className": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.classfile.FieldTransform"
        ]
      },
      {
        "className": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
        "flags": 48,
        "superclass": "java.lang.Object",
        "interfaces": [
          "java.lang.classfile.MethodTransform"
        ]
      },
      {
        "className": "classes.modern_test.ClassFileCombinatorsFinal",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      },
      {
        "className": "classes.modern_test.ClassFileSupport",
        "flags": 49,
        "superclass": "java.lang.Object",
        "interfaces": []
      }
    ],
    "callbacks": [
      {
        "name": "flags",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": false,
        "binding": "direct"
      },
      {
        "name": "buildBlock",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeBlock",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "blockFirst",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "blockSecond",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildIfThen",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeIfThen",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "thenEleven",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildIfElse",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeIfElse",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "thenSeventeen",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "elseNineteen",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildTry",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeTry",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "tryDivide",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "divideCatch",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$CatchBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "divideFailure",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildMulti",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeMulti",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "tryThrow",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "multiCatch",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$CatchBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "specificFailure",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "anyFailure",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildTransforming",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeTransforming",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "emitThree",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "threeToFour",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "fourToSix",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeEnd",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "classEnd",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "endedField",
        "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildChainSource",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeThreeReturn",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "buildStateSource",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeEight",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "codeNine",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "newClass",
        "descriptor": "()Ljava/lang/classfile/ClassTransform;",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "newField",
        "descriptor": "()Ljava/lang/classfile/FieldTransform;",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "newMethod",
        "descriptor": "()Ljava/lang/classfile/MethodTransform;",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      },
      {
        "name": "newCode",
        "descriptor": "()Ljava/lang/classfile/CodeTransform;",
        "flags": 10,
        "bootstrap": true,
        "binding": "bootstrap"
      }
    ],
    "codecs": [
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
        "name": "atStart",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.ClassTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
        "name": "accept",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
        "flags": 1,
        "interface": "java.lang.classfile.ClassTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
        "name": "atEnd",
        "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.ClassTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
        "name": "atStart",
        "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.FieldTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
        "name": "accept",
        "descriptor": "(Ljava/lang/classfile/FieldBuilder;Ljava/lang/classfile/FieldElement;)V",
        "flags": 1,
        "interface": "java.lang.classfile.FieldTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
        "name": "atEnd",
        "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.FieldTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
        "name": "atStart",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.MethodTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
        "name": "accept",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;Ljava/lang/classfile/MethodElement;)V",
        "flags": 1,
        "interface": "java.lang.classfile.MethodTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
        "name": "atEnd",
        "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.MethodTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
        "name": "atStart",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.CodeTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
        "name": "accept",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
        "flags": 1,
        "interface": "java.lang.classfile.CodeTransform"
      },
      {
        "owner": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
        "name": "atEnd",
        "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
        "flags": 1,
        "interface": "java.lang.classfile.CodeTransform"
      }
    ],
    "resources": []
  }
});
export const classFileResourceContracts=freeze({
  "classes.modern_test.D4DeclarationTarget": {
    "className": "classes.modern_test.D4DeclarationTarget",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "superclass": "java.lang.Object",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 25,
        "metadata": {
          "ConstantValue": {
            "tag": 3,
            "value": 3
          },
          "RuntimeVisibleAnnotations": [
            {
              "type": "Lclasses/modern_test/D4DeclVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 21
                    }
                  }
                },
                {
                  "name": "name",
                  "value": {
                    "tag": "s",
                    "value": "field"
                  }
                }
              ]
            }
          ],
          "RuntimeInvisibleAnnotations": [
            {
              "type": "Lclasses/modern_test/D4DeclInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          ]
        }
      },
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
        "flags": 1,
        "metadata": {
          "Signature": "Ljava/util/List<Ljava/lang/String;>;"
        }
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "metadata": {},
        "code": [
          "aload:0",
          "invokespecial:java.lang.Object#<init>()V",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 185
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4DeclarationTarget;",
              "slot": 0
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "signature": "Lclasses/modern_test/D4DeclarationTarget<TT;>;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "value",
        "descriptor": "(ILjava/lang/String;)I",
        "flags": 9,
        "metadata": {
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            },
            {
              "name": "ignored",
              "flags": 0
            }
          ],
          "RuntimeVisibleAnnotations": [
            {
              "type": "Lclasses/modern_test/D4DeclVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 31
                    }
                  }
                },
                {
                  "name": "name",
                  "value": {
                    "tag": "s",
                    "value": "method"
                  }
                }
              ]
            }
          ],
          "RuntimeInvisibleAnnotations": [
            {
              "type": "Lclasses/modern_test/D4DeclInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 32
                    }
                  }
                }
              ]
            }
          ],
          "RuntimeVisibleParameterAnnotations": [
            [
              {
                "type": "Lclasses/modern_test/D4DeclVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 41
                      }
                    }
                  },
                  {
                    "name": "name",
                    "value": {
                      "tag": "s",
                      "value": "first"
                    }
                  }
                ]
              }
            ],
            []
          ],
          "RuntimeInvisibleParameterAnnotations": [
            [],
            [
              {
                "type": "Lclasses/modern_test/D4DeclInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 42
                      }
                    }
                  }
                ]
              }
            ]
          ]
        },
        "code": [
          "iload:0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "iload_0",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 190
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "input",
              "type": "I",
              "slot": 0
            },
            {
              "start": 0,
              "end": 2,
              "name": "ignored",
              "type": "Ljava/lang/String;",
              "slot": 1
            }
          ]
        }
      },
      {
        "name": "echo",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "metadata": {
          "Exceptions": [
            "java.lang.Exception"
          ],
          "MethodParameters": [
            {
              "name": "value",
              "flags": 0
            }
          ],
          "Signature": "<U::Ljava/lang/CharSequence;E:Ljava/lang/Exception;>(TU;)TU;^TE;"
        },
        "code": [
          "aload:0",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 191
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "value",
              "type": "Ljava/lang/CharSequence;",
              "slot": 0
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 2,
              "name": "value",
              "signature": "TU;",
              "slot": 0
            }
          ]
        }
      }
    ],
    "metadata": {
      "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;",
      "SourceFile": "ClassFileDeclarationsFinal.java",
      "RuntimeVisibleAnnotations": [
        {
          "type": "Lclasses/modern_test/D4DeclVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 11
                }
              }
            },
            {
              "name": "name",
              "value": {
                "tag": "s",
                "value": "class"
              }
            }
          ]
        }
      ],
      "RuntimeInvisibleAnnotations": [
        {
          "type": "Lclasses/modern_test/D4DeclInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 12
                }
              }
            }
          ]
        }
      ]
    },
    "bootstraps": []
  },
  "classes.modern_test.D4TypeTarget": {
    "className": "classes.modern_test.D4TypeTarget",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "superclass": "java.lang.Object",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1,
        "metadata": {
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 0,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 21
                      }
                    }
                  }
                ]
              }
            }
          ],
          "RuntimeInvisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 22
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1,
        "metadata": {
          "Signature": "Ljava/util/List<+Ljava/lang/String;>;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 23
                      }
                    }
                  }
                ]
              }
            }
          ],
          "RuntimeInvisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                },
                {
                  "kind": 2,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 24
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1,
        "metadata": {
          "Signature": "Lclasses/modern_test/D4TypeOuter<Ljava/lang/String;>.Inner<Ljava/lang/Integer;>;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 25
                      }
                    }
                  }
                ]
              }
            },
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 1,
                  "argumentIndex": 0
                },
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 27
                      }
                    }
                  }
                ]
              }
            }
          ],
          "RuntimeInvisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 1,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 26
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "metadata": {},
        "code": [
          "aload:0",
          "invokespecial:java.lang.Object#<init>()V",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 169
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4TypeTarget;",
              "slot": 0
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "metadata": {
          "Exceptions": [
            "java.io.IOException"
          ],
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 20,
              "target": {},
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 31
                      }
                    }
                  }
                ]
              }
            },
            {
              "targetType": 22,
              "target": {
                "formalParameterIndex": 0
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 32
                      }
                    }
                  }
                ]
              }
            }
          ],
          "RuntimeInvisibleTypeAnnotations": [
            {
              "targetType": 23,
              "target": {
                "throwsIndex": 0
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 33
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "aload:1",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_1",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 174
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "this",
              "type": "Lclasses/modern_test/D4TypeTarget;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 2,
              "name": "input",
              "type": "Ljava/lang/String;",
              "slot": 1
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 2,
              "name": "this",
              "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "metadata": {
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 21,
              "target": {},
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 34
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "return"
        ],
        "nativeOpcodes": [
          "return"
        ],
        "maxStack": 0,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 175
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 1,
              "name": "this",
              "type": "Lclasses/modern_test/D4TypeTarget;",
              "slot": 0
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 1,
              "name": "this",
              "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "metadata": {
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            }
          ],
          "Signature": "<U::Ljava/lang/CharSequence;>(TU;)TU;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 1,
              "target": {
                "typeParameterIndex": 0
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 35
                      }
                    }
                  }
                ]
              }
            }
          ],
          "RuntimeInvisibleTypeAnnotations": [
            {
              "targetType": 18,
              "target": {
                "typeParameterIndex": 0,
                "boundIndex": 1
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 36
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "aload:0",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 176
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "input",
              "type": "Ljava/lang/CharSequence;",
              "slot": 0
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 2,
              "name": "input",
              "signature": "TU;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "metadata": {
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            }
          ]
        },
        "code": [
          "iload:0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "iload_0",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 177
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "input",
              "type": "I",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "metadata": {
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            }
          ]
        },
        "code": [
          "aload:0",
          "checkcast:java.lang.String",
          "astore:1",
          "aload:1",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 178
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 5,
              "name": "input",
              "type": "Ljava/lang/Object;",
              "slot": 0
            },
            {
              "start": 3,
              "end": 5,
              "name": "local",
              "type": "Ljava/lang/String;",
              "slot": 1
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 71,
              "target": {
                "target": 1,
                "typeArgumentIndex": 0
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 43
                      }
                    }
                  }
                ]
              }
            },
            {
              "targetType": 64,
              "target": {
                "table": [
                  {
                    "start": 3,
                    "end": 5,
                    "slot": 1
                  },
                  {
                    "start": 3,
                    "end": 5,
                    "slot": 1
                  }
                ]
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 41
                      }
                    }
                  }
                ]
              }
            }
          ],
          "RuntimeInvisibleTypeAnnotations": [
            {
              "targetType": 64,
              "target": {
                "table": [
                  {
                    "start": 3,
                    "end": 5,
                    "slot": 1
                  },
                  {
                    "start": 3,
                    "end": 5,
                    "slot": 1
                  }
                ]
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeInvisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 42
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "metadata": {
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            }
          ]
        },
        "code": [
          "aload:0",
          "instanceof:java.lang.String",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 179
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "input",
              "type": "Ljava/lang/Object;",
              "slot": 0
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 67,
              "target": {
                "target": 1
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 44
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "metadata": {},
        "code": [
          "new:java.lang.String",
          "dup",
          "string:new",
          "invokespecial:java.lang.String#<init>(Ljava/lang/String;)V",
          "areturn"
        ],
        "nativeOpcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ],
        "maxStack": 3,
        "maxLocals": 0,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 180
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 68,
              "target": {
                "target": 0
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 45
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "metadata": {
          "MethodParameters": [
            {
              "name": "input",
              "flags": 0
            }
          ]
        },
        "code": [
          "iload:0",
          "ifne:6",
          "new:java.lang.IllegalArgumentException",
          "dup",
          "invokespecial:java.lang.IllegalArgumentException#<init>()V",
          "athrow",
          "string:ok",
          "areturn",
          "astore:1",
          "string:caught",
          "areturn"
        ],
        "nativeOpcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ],
        "maxStack": 2,
        "maxLocals": 2,
        "handlers": [
          {
            "start": 0,
            "end": 7,
            "target": 8,
            "catchType": "java.lang.IllegalArgumentException"
          }
        ],
        "frames": [
          {
            "target": 6,
            "locals": [
              "INTEGER"
            ],
            "stack": []
          },
          {
            "target": 8,
            "locals": [
              "INTEGER"
            ],
            "stack": [
              "Object:java.lang.IllegalArgumentException"
            ]
          }
        ],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 181
            }
          ],
          "LocalVariableTable": [
            {
              "start": 9,
              "end": 11,
              "name": "caught",
              "type": "Ljava/lang/IllegalArgumentException;",
              "slot": 1
            },
            {
              "start": 0,
              "end": 11,
              "name": "input",
              "type": "I",
              "slot": 0
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 66,
              "target": {
                "exceptionTableIndex": 0
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 46
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "metadata": {
          "Exceptions": [
            "java.lang.Exception"
          ]
        },
        "code": [
          "new:classes.modern_test.D4Resource",
          "dup",
          "invokespecial:classes.modern_test.D4Resource#<init>()V",
          "astore:0",
          "int:7",
          "istore:1",
          "aload:0",
          "invokevirtual:classes.modern_test.D4Resource#close()V",
          "iload:1",
          "ireturn",
          "astore:1",
          "aload:0",
          "invokevirtual:classes.modern_test.D4Resource#close()V",
          "goto:18",
          "astore:2",
          "aload:1",
          "aload:2",
          "invokevirtual:java.lang.Throwable#addSuppressed(Ljava/lang/Throwable;)V",
          "aload:1",
          "athrow"
        ],
        "nativeOpcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ],
        "maxStack": 2,
        "maxLocals": 3,
        "handlers": [
          {
            "start": 4,
            "end": 6,
            "target": 10,
            "catchType": "java.lang.Throwable"
          },
          {
            "start": 11,
            "end": 13,
            "target": 14,
            "catchType": "java.lang.Throwable"
          }
        ],
        "frames": [
          {
            "target": 10,
            "locals": [
              "Object:classes.modern_test.D4Resource"
            ],
            "stack": [
              "Object:java.lang.Throwable"
            ]
          },
          {
            "target": 14,
            "locals": [
              "Object:classes.modern_test.D4Resource",
              "Object:java.lang.Throwable"
            ],
            "stack": [
              "Object:java.lang.Throwable"
            ]
          },
          {
            "target": 18,
            "locals": [
              "Object:classes.modern_test.D4Resource",
              "Object:java.lang.Throwable"
            ],
            "stack": []
          }
        ],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 182
            }
          ],
          "LocalVariableTable": [
            {
              "start": 4,
              "end": 20,
              "name": "resource",
              "type": "Lclasses/modern_test/D4Resource;",
              "slot": 0
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 65,
              "target": {
                "table": [
                  {
                    "start": 4,
                    "end": 20,
                    "slot": 0
                  }
                ]
              },
              "path": [],
              "annotation": {
                "type": "Lclasses/modern_test/D4TypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 47
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ],
    "metadata": {
      "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;Ljava/io/Serializable;",
      "SourceFile": "ClassFileTypeAnnotationsFinal.java",
      "RuntimeVisibleTypeAnnotations": [
        {
          "targetType": 16,
          "target": {
            "supertypeIndex": 65535
          },
          "path": [],
          "annotation": {
            "type": "Lclasses/modern_test/D4TypeVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 14
                  }
                }
              }
            ]
          }
        },
        {
          "targetType": 0,
          "target": {
            "typeParameterIndex": 0
          },
          "path": [],
          "annotation": {
            "type": "Lclasses/modern_test/D4TypeVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 11
                  }
                }
              }
            ]
          }
        },
        {
          "targetType": 17,
          "target": {
            "typeParameterIndex": 0,
            "boundIndex": 0
          },
          "path": [],
          "annotation": {
            "type": "Lclasses/modern_test/D4TypeVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 12
                  }
                }
              }
            ]
          }
        }
      ],
      "RuntimeInvisibleTypeAnnotations": [
        {
          "targetType": 16,
          "target": {
            "supertypeIndex": 0
          },
          "path": [],
          "annotation": {
            "type": "Lclasses/modern_test/D4TypeInvisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 15
                  }
                }
              }
            ]
          }
        },
        {
          "targetType": 17,
          "target": {
            "typeParameterIndex": 0,
            "boundIndex": 1
          },
          "path": [],
          "annotation": {
            "type": "Lclasses/modern_test/D4TypeInvisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 13
                  }
                }
              }
            ]
          }
        }
      ],
      "InnerClasses": [
        {
          "innerClass": "classes.modern_test.D4TypeOuter$Inner",
          "outerClass": "classes.modern_test.D4TypeOuter",
          "innerName": "Inner",
          "flags": 0
        }
      ]
    },
    "bootstraps": []
  },
  "classes.modern_test.ClassFileMetadataFinal$1D4Local": {
    "className": "classes.modern_test.ClassFileMetadataFinal$1D4Local",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "superclass": "java.lang.Object",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "metadata": {},
        "code": [
          "aload:0",
          "invokespecial:java.lang.Object#<init>()V",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 26
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/ClassFileMetadataFinal$1D4Local;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "value",
        "descriptor": "()I",
        "flags": 1,
        "metadata": {},
        "code": [
          "int:31",
          "ireturn"
        ],
        "nativeOpcodes": [
          "bipush",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 26
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "this",
              "type": "Lclasses/modern_test/ClassFileMetadataFinal$1D4Local;",
              "slot": 0
            }
          ]
        }
      }
    ],
    "metadata": {
      "SourceFile": "ClassFileMetadataFinal.java",
      "EnclosingMethod": {
        "owner": "classes.modern_test.ClassFileMetadataFinal",
        "method": {
          "tag": 12,
          "name": "enclosing",
          "descriptor": "()Ljava/lang/Object;"
        }
      },
      "NestHost": "classes.modern_test.ClassFileMetadataFinal",
      "InnerClasses": [
        {
          "innerClass": "classes.modern_test.ClassFileMetadataFinal$1D4Local",
          "outerClass": null,
          "innerName": "D4Local",
          "flags": 16
        }
      ]
    },
    "bootstraps": []
  },
  "classes.modern_test.D4RecordAnnotated": {
    "className": "classes.modern_test.D4RecordAnnotated",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "superclass": "java.lang.Record",
    "interfaces": [],
    "fields": [
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
        "flags": 18,
        "metadata": {
          "Signature": "Ljava/util/List<Ljava/lang/String;>;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 22
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "(Ljava/util/List;)V",
        "flags": 0,
        "metadata": {
          "MethodParameters": [
            {
              "name": "names",
              "flags": 0
            }
          ],
          "Signature": "(Ljava/util/List<Ljava/lang/String;>;)V",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 22,
              "target": {
                "formalParameterIndex": 0
              },
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 22
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "aload:0",
          "invokespecial:java.lang.Record#<init>()V",
          "aload:0",
          "aload:1",
          "putfield:classes.modern_test.D4RecordAnnotated#namesLjava/util/List;",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "aload_0",
          "aload_1",
          "putfield",
          "return"
        ],
        "maxStack": 2,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 128
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 6,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordAnnotated;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 6,
              "name": "names",
              "type": "Ljava/util/List;",
              "slot": 1
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 6,
              "name": "names",
              "signature": "Ljava/util/List<Ljava/lang/String;>;",
              "slot": 1
            }
          ]
        }
      },
      {
        "name": "toString",
        "descriptor": "()Ljava/lang/String;",
        "flags": 17,
        "metadata": {},
        "code": [
          "aload:0",
          "invokedynamic:toString(Lclasses/modern_test/D4RecordAnnotated;)Ljava/lang/String;@0",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokedynamic",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 128
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordAnnotated;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "hashCode",
        "descriptor": "()I",
        "flags": 17,
        "metadata": {},
        "code": [
          "aload:0",
          "invokedynamic:hashCode(Lclasses/modern_test/D4RecordAnnotated;)I@0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokedynamic",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 128
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordAnnotated;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "equals",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 17,
        "metadata": {
          "MethodParameters": [
            {
              "name": "o",
              "flags": 0
            }
          ]
        },
        "code": [
          "aload:0",
          "aload:1",
          "invokedynamic:equals(Lclasses/modern_test/D4RecordAnnotated;Ljava/lang/Object;)Z@0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "aload_1",
          "invokedynamic",
          "ireturn"
        ],
        "maxStack": 2,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 128
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 4,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordAnnotated;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 4,
              "name": "o",
              "type": "Ljava/lang/Object;",
              "slot": 1
            }
          ]
        }
      },
      {
        "name": "names",
        "descriptor": "()Ljava/util/List;",
        "flags": 1,
        "metadata": {
          "Signature": "()Ljava/util/List<Ljava/lang/String;>;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 20,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 22
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "aload:0",
          "getfield:classes.modern_test.D4RecordAnnotated#namesLjava/util/List;",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "getfield",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 128
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordAnnotated;",
              "slot": 0
            }
          ]
        }
      }
    ],
    "metadata": {
      "SourceFile": "ClassFileMetadataFinal.java",
      "Record": [
        {
          "name": "names",
          "descriptor": "Ljava/util/List;",
          "metadata": {
            "Signature": "Ljava/util/List<Ljava/lang/String;>;",
            "RuntimeVisibleAnnotations": [
              {
                "type": "Lclasses/modern_test/D4RecordVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 21
                      }
                    }
                  }
                ]
              }
            ],
            "RuntimeVisibleTypeAnnotations": [
              {
                "targetType": 19,
                "target": {},
                "path": [
                  {
                    "kind": 3,
                    "argumentIndex": 0
                  }
                ],
                "annotation": {
                  "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                  "elements": [
                    {
                      "name": "value",
                      "value": {
                        "tag": "I",
                        "constant": {
                          "tag": 3,
                          "value": 22
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ],
      "InnerClasses": [
        {
          "innerClass": "java.lang.invoke.MethodHandles$Lookup",
          "outerClass": "java.lang.invoke.MethodHandles",
          "innerName": "Lookup",
          "flags": 25
        }
      ]
    },
    "bootstraps": [
      {
        "method": {
          "tag": 15,
          "referenceKind": 6,
          "reference": {
            "tag": 10,
            "owner": "java.lang.runtime.ObjectMethods",
            "name": "bootstrap",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;"
          }
        },
        "arguments": [
          {
            "tag": 7,
            "value": "classes.modern_test.D4RecordAnnotated"
          },
          {
            "tag": 8,
            "value": "names"
          },
          {
            "tag": 15,
            "referenceKind": 1,
            "reference": {
              "tag": 9,
              "owner": "classes.modern_test.D4RecordAnnotated",
              "name": "names",
              "descriptor": "Ljava/util/List;"
            }
          }
        ]
      }
    ]
  },
  "classes.modern_test.D4RecordExecutable": {
    "className": "classes.modern_test.D4RecordExecutable",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "superclass": "java.lang.Record",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 18,
        "metadata": {}
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "(I)V",
        "flags": 0,
        "metadata": {
          "MethodParameters": [
            {
              "name": "number",
              "flags": 0
            }
          ]
        },
        "code": [
          "aload:0",
          "invokespecial:java.lang.Record#<init>()V",
          "aload:0",
          "iload:1",
          "putfield:classes.modern_test.D4RecordExecutable#numberI",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "aload_0",
          "iload_1",
          "putfield",
          "return"
        ],
        "maxStack": 2,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 127
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 6,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordExecutable;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 6,
              "name": "number",
              "type": "I",
              "slot": 1
            }
          ]
        }
      },
      {
        "name": "toString",
        "descriptor": "()Ljava/lang/String;",
        "flags": 17,
        "metadata": {},
        "code": [
          "aload:0",
          "invokedynamic:toString(Lclasses/modern_test/D4RecordExecutable;)Ljava/lang/String;@0",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokedynamic",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 127
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordExecutable;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "hashCode",
        "descriptor": "()I",
        "flags": 17,
        "metadata": {},
        "code": [
          "aload:0",
          "invokedynamic:hashCode(Lclasses/modern_test/D4RecordExecutable;)I@0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokedynamic",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 127
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordExecutable;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "equals",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 17,
        "metadata": {
          "MethodParameters": [
            {
              "name": "o",
              "flags": 0
            }
          ]
        },
        "code": [
          "aload:0",
          "aload:1",
          "invokedynamic:equals(Lclasses/modern_test/D4RecordExecutable;Ljava/lang/Object;)Z@0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "aload_1",
          "invokedynamic",
          "ireturn"
        ],
        "maxStack": 2,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 127
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 4,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordExecutable;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 4,
              "name": "o",
              "type": "Ljava/lang/Object;",
              "slot": 1
            }
          ]
        }
      },
      {
        "name": "number",
        "descriptor": "()I",
        "flags": 1,
        "metadata": {},
        "code": [
          "aload:0",
          "getfield:classes.modern_test.D4RecordExecutable#numberI",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "getfield",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 127
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordExecutable;",
              "slot": 0
            }
          ]
        }
      }
    ],
    "metadata": {
      "SourceFile": "ClassFileMetadataFinal.java",
      "Record": [
        {
          "name": "number",
          "descriptor": "I",
          "metadata": {}
        }
      ],
      "InnerClasses": [
        {
          "innerClass": "java.lang.invoke.MethodHandles$Lookup",
          "outerClass": "java.lang.invoke.MethodHandles",
          "innerName": "Lookup",
          "flags": 25
        }
      ]
    },
    "bootstraps": [
      {
        "method": {
          "tag": 15,
          "referenceKind": 6,
          "reference": {
            "tag": 10,
            "owner": "java.lang.runtime.ObjectMethods",
            "name": "bootstrap",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;"
          }
        },
        "arguments": [
          {
            "tag": 7,
            "value": "classes.modern_test.D4RecordExecutable"
          },
          {
            "tag": 8,
            "value": "number"
          },
          {
            "tag": 15,
            "referenceKind": 1,
            "reference": {
              "tag": 9,
              "owner": "classes.modern_test.D4RecordExecutable",
              "name": "number",
              "descriptor": "I"
            }
          }
        ]
      }
    ]
  },
  "classes.modern_test.D4RecordModel": {
    "className": "classes.modern_test.D4RecordModel",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "superclass": "java.lang.Record",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 18,
        "metadata": {}
      },
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
        "flags": 18,
        "metadata": {
          "Signature": "Ljava/util/List<Ljava/lang/String;>;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 13
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "(ILjava/util/List;)V",
        "flags": 0,
        "metadata": {
          "MethodParameters": [
            {
              "name": "number",
              "flags": 0
            },
            {
              "name": "names",
              "flags": 0
            }
          ],
          "Signature": "(ILjava/util/List<Ljava/lang/String;>;)V",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 22,
              "target": {
                "formalParameterIndex": 1
              },
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 13
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "aload:0",
          "invokespecial:java.lang.Record#<init>()V",
          "aload:0",
          "iload:1",
          "putfield:classes.modern_test.D4RecordModel#numberI",
          "aload:0",
          "aload:2",
          "putfield:classes.modern_test.D4RecordModel#namesLjava/util/List;",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "aload_0",
          "iload_1",
          "putfield",
          "aload_0",
          "aload_2",
          "putfield",
          "return"
        ],
        "maxStack": 2,
        "maxLocals": 3,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 126
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 9,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordModel;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 9,
              "name": "number",
              "type": "I",
              "slot": 1
            },
            {
              "start": 0,
              "end": 9,
              "name": "names",
              "type": "Ljava/util/List;",
              "slot": 2
            }
          ],
          "LocalVariableTypeTable": [
            {
              "start": 0,
              "end": 9,
              "name": "names",
              "signature": "Ljava/util/List<Ljava/lang/String;>;",
              "slot": 2
            }
          ]
        }
      },
      {
        "name": "toString",
        "descriptor": "()Ljava/lang/String;",
        "flags": 17,
        "metadata": {},
        "code": [
          "aload:0",
          "invokedynamic:toString(Lclasses/modern_test/D4RecordModel;)Ljava/lang/String;@0",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokedynamic",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 126
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordModel;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "hashCode",
        "descriptor": "()I",
        "flags": 17,
        "metadata": {},
        "code": [
          "aload:0",
          "invokedynamic:hashCode(Lclasses/modern_test/D4RecordModel;)I@0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokedynamic",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 126
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordModel;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "equals",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 17,
        "metadata": {
          "MethodParameters": [
            {
              "name": "o",
              "flags": 0
            }
          ]
        },
        "code": [
          "aload:0",
          "aload:1",
          "invokedynamic:equals(Lclasses/modern_test/D4RecordModel;Ljava/lang/Object;)Z@0",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "aload_1",
          "invokedynamic",
          "ireturn"
        ],
        "maxStack": 2,
        "maxLocals": 2,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 126
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 4,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordModel;",
              "slot": 0
            },
            {
              "start": 0,
              "end": 4,
              "name": "o",
              "type": "Ljava/lang/Object;",
              "slot": 1
            }
          ]
        }
      },
      {
        "name": "number",
        "descriptor": "()I",
        "flags": 1,
        "metadata": {},
        "code": [
          "aload:0",
          "getfield:classes.modern_test.D4RecordModel#numberI",
          "ireturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "getfield",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 126
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordModel;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "names",
        "descriptor": "()Ljava/util/List;",
        "flags": 1,
        "metadata": {
          "Signature": "()Ljava/util/List<Ljava/lang/String;>;",
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 20,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 13
                      }
                    }
                  }
                ]
              }
            }
          ]
        },
        "code": [
          "aload:0",
          "getfield:classes.modern_test.D4RecordModel#namesLjava/util/List;",
          "areturn"
        ],
        "nativeOpcodes": [
          "aload_0",
          "getfield",
          "areturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 126
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4RecordModel;",
              "slot": 0
            }
          ]
        }
      }
    ],
    "metadata": {
      "SourceFile": "ClassFileMetadataFinal.java",
      "Record": [
        {
          "name": "number",
          "descriptor": "I",
          "metadata": {
            "RuntimeVisibleAnnotations": [
              {
                "type": "Lclasses/modern_test/D4RecordVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 11
                      }
                    }
                  }
                ]
              }
            ]
          }
        },
        {
          "name": "names",
          "descriptor": "Ljava/util/List;",
          "metadata": {
            "Signature": "Ljava/util/List<Ljava/lang/String;>;",
            "RuntimeVisibleAnnotations": [
              {
                "type": "Lclasses/modern_test/D4RecordVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 12
                      }
                    }
                  }
                ]
              }
            ],
            "RuntimeVisibleTypeAnnotations": [
              {
                "targetType": 19,
                "target": {},
                "path": [
                  {
                    "kind": 3,
                    "argumentIndex": 0
                  }
                ],
                "annotation": {
                  "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                  "elements": [
                    {
                      "name": "value",
                      "value": {
                        "tag": "I",
                        "constant": {
                          "tag": 3,
                          "value": 13
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ],
      "InnerClasses": [
        {
          "innerClass": "java.lang.invoke.MethodHandles$Lookup",
          "outerClass": "java.lang.invoke.MethodHandles",
          "innerName": "Lookup",
          "flags": 25
        }
      ]
    },
    "bootstraps": [
      {
        "method": {
          "tag": 15,
          "referenceKind": 6,
          "reference": {
            "tag": 10,
            "owner": "java.lang.runtime.ObjectMethods",
            "name": "bootstrap",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;"
          }
        },
        "arguments": [
          {
            "tag": 7,
            "value": "classes.modern_test.D4RecordModel"
          },
          {
            "tag": 8,
            "value": "number;names"
          },
          {
            "tag": 15,
            "referenceKind": 1,
            "reference": {
              "tag": 9,
              "owner": "classes.modern_test.D4RecordModel",
              "name": "number",
              "descriptor": "I"
            }
          },
          {
            "tag": 15,
            "referenceKind": 1,
            "reference": {
              "tag": 9,
              "owner": "classes.modern_test.D4RecordModel",
              "name": "names",
              "descriptor": "Ljava/util/List;"
            }
          }
        ]
      }
    ]
  },
  "classes.modern_test.D4SealedBase": {
    "className": "classes.modern_test.D4SealedBase",
    "major": 69,
    "minor": 0,
    "flags": 32,
    "superclass": "java.lang.Object",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "metadata": {},
        "code": [
          "aload:0",
          "invokespecial:java.lang.Object#<init>()V",
          "return"
        ],
        "nativeOpcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 129
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 3,
              "name": "this",
              "type": "Lclasses/modern_test/D4SealedBase;",
              "slot": 0
            }
          ]
        }
      },
      {
        "name": "value",
        "descriptor": "()I",
        "flags": 1,
        "metadata": {},
        "code": [
          "int:23",
          "ireturn"
        ],
        "nativeOpcodes": [
          "bipush",
          "ireturn"
        ],
        "maxStack": 1,
        "maxLocals": 1,
        "handlers": [],
        "frames": [],
        "debug": {
          "LineNumberTable": [
            {
              "target": 0,
              "line": 129
            }
          ],
          "LocalVariableTable": [
            {
              "start": 0,
              "end": 2,
              "name": "this",
              "type": "Lclasses/modern_test/D4SealedBase;",
              "slot": 0
            }
          ]
        }
      }
    ],
    "metadata": {
      "SourceFile": "ClassFileMetadataFinal.java",
      "PermittedSubclasses": [
        "classes.modern_test.D4SealedLeaf"
      ]
    },
    "bootstraps": []
  }
});
const outputVector1=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(Ljava/lang/Number;I)Ljava/lang/Number;",
      "flags": 9,
      "metadata": {
        "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;E:Ljava/lang/Exception;>(TT;I)TT;^TE;"
      },
      "code": [
        "aload:0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector2=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [
    "java.io.Serializable"
  ],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:13",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {
    "Signature": "<T::Ljava/lang/CharSequence;>Ljava/lang/Object;Ljava/io/Serializable;"
  },
  "bootstraps": []
});
const outputVector3=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:5",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iconst_5",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {
    "RuntimeVisibleAnnotations": [
      {
        "type": "Lclasses/modern_test/D4AllValues;",
        "elements": [
          {
            "name": "b",
            "value": {
              "tag": "B",
              "constant": {
                "tag": 3,
                "value": -7
              }
            }
          },
          {
            "name": "c",
            "value": {
              "tag": "C",
              "constant": {
                "tag": 3,
                "value": 90
              }
            }
          },
          {
            "name": "d",
            "value": {
              "tag": "D",
              "constant": {
                "tag": 6,
                "value": 2.5
              }
            }
          },
          {
            "name": "f",
            "value": {
              "tag": "F",
              "constant": {
                "tag": 4,
                "value": 1.25
              }
            }
          },
          {
            "name": "i",
            "value": {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 42
              }
            }
          },
          {
            "name": "j",
            "value": {
              "tag": "J",
              "constant": {
                "tag": 5,
                "value": "1234567890123"
              }
            }
          },
          {
            "name": "s",
            "value": {
              "tag": "S",
              "constant": {
                "tag": 3,
                "value": 1234
              }
            }
          },
          {
            "name": "z",
            "value": {
              "tag": "Z",
              "constant": {
                "tag": 3,
                "value": 1
              }
            }
          },
          {
            "name": "text",
            "value": {
              "tag": "s",
              "value": "values"
            }
          },
          {
            "name": "type",
            "value": {
              "tag": "c",
              "descriptor": "Ljava/lang/String;"
            }
          },
          {
            "name": "kind",
            "value": {
              "tag": "e",
              "type": "Ljava/lang/annotation/RetentionPolicy;",
              "name": "RUNTIME"
            }
          },
          {
            "name": "nested",
            "value": {
              "tag": "@",
              "annotation": {
                "type": "Lclasses/modern_test/D4Nested;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 9
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "numbers",
            "value": {
              "tag": "[",
              "values": [
                {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 2
                  }
                },
                {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 3
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  },
  "bootstraps": []
});
const outputVector4=freeze({
  "flags": 48,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [
    {
      "name": "number",
      "descriptor": "I",
      "flags": 25,
      "metadata": {
        "ConstantValue": {
          "tag": 3,
          "value": 3
        },
        "RuntimeVisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 21
                  }
                }
              },
              {
                "name": "name",
                "value": {
                  "tag": "s",
                  "value": "field"
                }
              }
            ]
          }
        ],
        "RuntimeInvisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclInvisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 22
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "names",
      "descriptor": "Ljava/util/List;",
      "flags": 1,
      "metadata": {
        "Signature": "Ljava/util/List<Ljava/lang/String;>;"
      }
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "()V",
      "flags": 0,
      "metadata": {},
      "code": [
        "aload:0",
        "invokespecial:java.lang.Object#<init>()V",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "return"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 185
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4DeclarationTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "signature": "Lclasses/modern_test/D4DeclarationTarget<TT;>;",
            "slot": 0
          }
        ]
      }
    },
    {
      "name": "value",
      "descriptor": "(ILjava/lang/String;)I",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          },
          {
            "name": "ignored",
            "flags": 0
          }
        ],
        "RuntimeVisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 31
                  }
                }
              },
              {
                "name": "name",
                "value": {
                  "tag": "s",
                  "value": "method"
                }
              }
            ]
          }
        ],
        "RuntimeInvisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclInvisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 32
                  }
                }
              }
            ]
          }
        ],
        "RuntimeVisibleParameterAnnotations": [
          [
            {
              "type": "Lclasses/modern_test/D4DeclVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 41
                    }
                  }
                },
                {
                  "name": "name",
                  "value": {
                    "tag": "s",
                    "value": "first"
                  }
                }
              ]
            }
          ],
          []
        ],
        "RuntimeInvisibleParameterAnnotations": [
          [],
          [
            {
              "type": "Lclasses/modern_test/D4DeclInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 42
                    }
                  }
                }
              ]
            }
          ]
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 190
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "I",
            "slot": 0
          },
          {
            "start": 0,
            "end": 2,
            "name": "ignored",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ]
      }
    },
    {
      "name": "echo",
      "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
      "flags": 9,
      "metadata": {
        "Exceptions": [
          "java.lang.Exception"
        ],
        "MethodParameters": [
          {
            "name": "value",
            "flags": 0
          }
        ],
        "Signature": "<U::Ljava/lang/CharSequence;E:Ljava/lang/Exception;>(TU;)TU;^TE;"
      },
      "code": [
        "aload:0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 191
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "value",
            "type": "Ljava/lang/CharSequence;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "value",
            "signature": "TU;",
            "slot": 0
          }
        ]
      }
    }
  ],
  "metadata": {
    "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;",
    "SourceFile": "ClassFileDeclarationsFinal.java",
    "RuntimeVisibleAnnotations": [
      {
        "type": "Lclasses/modern_test/D4DeclVisible;",
        "elements": [
          {
            "name": "value",
            "value": {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 11
              }
            }
          },
          {
            "name": "name",
            "value": {
              "tag": "s",
              "value": "class"
            }
          }
        ]
      }
    ],
    "RuntimeInvisibleAnnotations": [
      {
        "type": "Lclasses/modern_test/D4DeclInvisible;",
        "elements": [
          {
            "name": "value",
            "value": {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 12
              }
            }
          }
        ]
      }
    ]
  },
  "bootstraps": []
});
const outputVector5=freeze({
  "flags": 48,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [
    {
      "name": "number",
      "descriptor": "I",
      "flags": 25,
      "metadata": {
        "ConstantValue": {
          "tag": 3,
          "value": 3
        },
        "RuntimeVisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 21
                  }
                }
              },
              {
                "name": "name",
                "value": {
                  "tag": "s",
                  "value": "field"
                }
              }
            ]
          }
        ],
        "RuntimeInvisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclInvisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 22
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "names",
      "descriptor": "Ljava/util/List;",
      "flags": 1,
      "metadata": {
        "Signature": "Ljava/util/List<Ljava/lang/String;>;"
      }
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "()V",
      "flags": 0,
      "metadata": {},
      "code": [
        "aload:0",
        "invokespecial:java.lang.Object#<init>()V",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "return"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4DeclarationTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "signature": "Lclasses/modern_test/D4DeclarationTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 185
          }
        ]
      }
    },
    {
      "name": "value",
      "descriptor": "(ILjava/lang/String;)I",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          },
          {
            "name": "ignored",
            "flags": 0
          }
        ],
        "RuntimeVisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclVisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 31
                  }
                }
              },
              {
                "name": "name",
                "value": {
                  "tag": "s",
                  "value": "method"
                }
              }
            ]
          }
        ],
        "RuntimeInvisibleAnnotations": [
          {
            "type": "Lclasses/modern_test/D4DeclInvisible;",
            "elements": [
              {
                "name": "value",
                "value": {
                  "tag": "I",
                  "constant": {
                    "tag": 3,
                    "value": 32
                  }
                }
              }
            ]
          }
        ],
        "RuntimeVisibleParameterAnnotations": [
          [
            {
              "type": "Lclasses/modern_test/D4DeclVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 41
                    }
                  }
                },
                {
                  "name": "name",
                  "value": {
                    "tag": "s",
                    "value": "first"
                  }
                }
              ]
            }
          ],
          []
        ],
        "RuntimeInvisibleParameterAnnotations": [
          [],
          [
            {
              "type": "Lclasses/modern_test/D4DeclInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 42
                    }
                  }
                }
              ]
            }
          ]
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "I",
            "slot": 0
          },
          {
            "start": 0,
            "end": 2,
            "name": "ignored",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 190
          }
        ]
      }
    },
    {
      "name": "echo",
      "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
      "flags": 9,
      "metadata": {
        "Exceptions": [
          "java.lang.Exception"
        ],
        "MethodParameters": [
          {
            "name": "value",
            "flags": 0
          }
        ],
        "Signature": "<U::Ljava/lang/CharSequence;E:Ljava/lang/Exception;>(TU;)TU;^TE;"
      },
      "code": [
        "aload:0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "value",
            "type": "Ljava/lang/CharSequence;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "value",
            "signature": "TU;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 191
          }
        ]
      }
    }
  ],
  "metadata": {
    "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;",
    "SourceFile": "ClassFileDeclarationsFinal.java",
    "RuntimeVisibleAnnotations": [
      {
        "type": "Lclasses/modern_test/D4DeclVisible;",
        "elements": [
          {
            "name": "value",
            "value": {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 11
              }
            }
          },
          {
            "name": "name",
            "value": {
              "tag": "s",
              "value": "class"
            }
          }
        ]
      }
    ],
    "RuntimeInvisibleAnnotations": [
      {
        "type": "Lclasses/modern_test/D4DeclInvisible;",
        "elements": [
          {
            "name": "value",
            "value": {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 12
              }
            }
          }
        ]
      }
    ]
  },
  "bootstraps": []
});
const outputVector6=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(ILjava/lang/String;)I",
      "flags": 9,
      "metadata": {
        "RuntimeVisibleParameterAnnotations": [
          [
            {
              "type": "Lclasses/modern_test/D4DeclVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 61
                    }
                  }
                },
                {
                  "name": "name",
                  "value": {
                    "tag": "s",
                    "value": "parameter"
                  }
                }
              ]
            }
          ],
          []
        ],
        "RuntimeInvisibleParameterAnnotations": [
          [],
          [
            {
              "type": "Lclasses/modern_test/D4DeclInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 62
                    }
                  }
                }
              ]
            }
          ]
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector7=freeze({
  "flags": 9729,
  "superclass": "java.lang.Object",
  "interfaces": [
    "java.lang.annotation.Annotation"
  ],
  "fields": [],
  "methods": [
    {
      "name": "amount",
      "descriptor": "()I",
      "flags": 1025,
      "metadata": {
        "AnnotationDefault": {
          "tag": "I",
          "constant": {
            "tag": 3,
            "value": 17
          }
        }
      },
      "code": null,
      "nativeOpcodes": []
    },
    {
      "name": "text",
      "descriptor": "()Ljava/lang/String;",
      "flags": 1025,
      "metadata": {
        "AnnotationDefault": {
          "tag": "s",
          "value": "fallback"
        }
      },
      "code": null,
      "nativeOpcodes": []
    },
    {
      "name": "numbers",
      "descriptor": "()[I",
      "flags": 1025,
      "metadata": {
        "AnnotationDefault": {
          "tag": "[",
          "values": [
            {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 2
              }
            },
            {
              "tag": "I",
              "constant": {
                "tag": 3,
                "value": 3
              }
            }
          ]
        }
      },
      "code": null,
      "nativeOpcodes": []
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector8=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(IJ)I",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 16
          },
          {
            "name": null,
            "flags": 0
          }
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 3,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector9=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:22",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector10=freeze({
  "flags": 48,
  "superclass": "java.lang.Object",
  "interfaces": [
    "java.io.Serializable"
  ],
  "fields": [
    {
      "name": "array",
      "descriptor": "[Ljava/lang/String;",
      "flags": 1,
      "metadata": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 0,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 21
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "wild",
      "descriptor": "Ljava/util/List;",
      "flags": 1,
      "metadata": {
        "Signature": "Ljava/util/List<+Ljava/lang/String;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 23
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              },
              {
                "kind": 2,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 24
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "inner",
      "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
      "flags": 1,
      "metadata": {
        "Signature": "Lclasses/modern_test/D4TypeOuter<Ljava/lang/String;>.Inner<Ljava/lang/Integer;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 25
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 1,
                "argumentIndex": 0
              },
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 27
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 1,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 26
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "()V",
      "flags": 0,
      "metadata": {},
      "code": [
        "aload:0",
        "invokespecial:java.lang.Object#<init>()V",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "return"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 169
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ]
      }
    },
    {
      "name": "returner",
      "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
      "flags": 1,
      "metadata": {
        "Exceptions": [
          "java.io.IOException"
        ],
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 20,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 31
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 22,
            "target": {
              "formalParameterIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 32
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 23,
            "target": {
              "throwsIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 33
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:1",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_1",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 174
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ]
      }
    },
    {
      "name": "receiver",
      "descriptor": "()V",
      "flags": 1,
      "metadata": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 21,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 34
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "return"
      ],
      "nativeOpcodes": [
        "return"
      ],
      "maxStack": 0,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 175
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 1,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 1,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ]
      }
    },
    {
      "name": "generic",
      "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ],
        "Signature": "<U::Ljava/lang/CharSequence;>(TU;)TU;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 1,
            "target": {
              "typeParameterIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 35
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 18,
            "target": {
              "typeParameterIndex": 0,
              "boundIndex": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 36
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 176
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "Ljava/lang/CharSequence;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "signature": "TU;",
            "slot": 0
          }
        ]
      }
    },
    {
      "name": "value",
      "descriptor": "(I)I",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 177
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "I",
            "slot": 0
          }
        ]
      }
    },
    {
      "name": "cast",
      "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "checkcast:java.lang.String",
        "astore:1",
        "aload:1",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "checkcast",
        "astore_1",
        "aload_1",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 178
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 5,
            "name": "input",
            "type": "Ljava/lang/Object;",
            "slot": 0
          },
          {
            "start": 3,
            "end": 5,
            "name": "local",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 71,
            "target": {
              "target": 1,
              "typeArgumentIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 43
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 64,
            "target": {
              "table": [
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                },
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 41
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 64,
            "target": {
              "table": [
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                },
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 42
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "checkType",
      "descriptor": "(Ljava/lang/Object;)Z",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "instanceof:java.lang.String",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "instanceof",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 179
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "input",
            "type": "Ljava/lang/Object;",
            "slot": 0
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 67,
            "target": {
              "target": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 44
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "make",
      "descriptor": "()Ljava/lang/String;",
      "flags": 9,
      "metadata": {},
      "code": [
        "new:java.lang.String",
        "dup",
        "string:new",
        "invokespecial:java.lang.String#<init>(Ljava/lang/String;)V",
        "areturn"
      ],
      "nativeOpcodes": [
        "new",
        "dup",
        "ldc",
        "invokespecial",
        "areturn"
      ],
      "maxStack": 3,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 180
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 68,
            "target": {
              "target": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 45
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "caught",
      "descriptor": "(I)Ljava/lang/String;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "iload:0",
        "ifne:6",
        "new:java.lang.IllegalArgumentException",
        "dup",
        "invokespecial:java.lang.IllegalArgumentException#<init>()V",
        "athrow",
        "string:ok",
        "areturn",
        "astore:1",
        "string:caught",
        "areturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ifne",
        "new",
        "dup",
        "invokespecial",
        "athrow",
        "ldc",
        "areturn",
        "astore_1",
        "ldc",
        "areturn"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [
        {
          "start": 0,
          "end": 7,
          "target": 8,
          "catchType": "java.lang.IllegalArgumentException"
        }
      ],
      "frames": [
        {
          "target": 6,
          "locals": [
            "INTEGER"
          ],
          "stack": []
        },
        {
          "target": 8,
          "locals": [
            "INTEGER"
          ],
          "stack": [
            "Object:java.lang.IllegalArgumentException"
          ]
        }
      ],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 181
          }
        ],
        "LocalVariableTable": [
          {
            "start": 9,
            "end": 11,
            "name": "caught",
            "type": "Ljava/lang/IllegalArgumentException;",
            "slot": 1
          },
          {
            "start": 0,
            "end": 11,
            "name": "input",
            "type": "I",
            "slot": 0
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 66,
            "target": {
              "exceptionTableIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 46
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "resource",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {
        "Exceptions": [
          "java.lang.Exception"
        ]
      },
      "code": [
        "new:classes.modern_test.D4Resource",
        "dup",
        "invokespecial:classes.modern_test.D4Resource#<init>()V",
        "astore:0",
        "int:7",
        "istore:1",
        "aload:0",
        "invokevirtual:classes.modern_test.D4Resource#close()V",
        "iload:1",
        "ireturn",
        "astore:1",
        "aload:0",
        "invokevirtual:classes.modern_test.D4Resource#close()V",
        "goto:18",
        "astore:2",
        "aload:1",
        "aload:2",
        "invokevirtual:java.lang.Throwable#addSuppressed(Ljava/lang/Throwable;)V",
        "aload:1",
        "athrow"
      ],
      "nativeOpcodes": [
        "new",
        "dup",
        "invokespecial",
        "astore_0",
        "bipush",
        "istore_1",
        "aload_0",
        "invokevirtual",
        "iload_1",
        "ireturn",
        "astore_1",
        "aload_0",
        "invokevirtual",
        "goto",
        "astore_2",
        "aload_1",
        "aload_2",
        "invokevirtual",
        "aload_1",
        "athrow"
      ],
      "maxStack": 2,
      "maxLocals": 3,
      "handlers": [
        {
          "start": 4,
          "end": 6,
          "target": 10,
          "catchType": "java.lang.Throwable"
        },
        {
          "start": 11,
          "end": 13,
          "target": 14,
          "catchType": "java.lang.Throwable"
        }
      ],
      "frames": [
        {
          "target": 10,
          "locals": [
            "Object:classes.modern_test.D4Resource"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 14,
          "locals": [
            "Object:classes.modern_test.D4Resource",
            "Object:java.lang.Throwable"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 18,
          "locals": [
            "Object:classes.modern_test.D4Resource",
            "Object:java.lang.Throwable"
          ],
          "stack": []
        }
      ],
      "debug": {
        "LineNumberTable": [
          {
            "target": 0,
            "line": 182
          }
        ],
        "LocalVariableTable": [
          {
            "start": 4,
            "end": 20,
            "name": "resource",
            "type": "Lclasses/modern_test/D4Resource;",
            "slot": 0
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 65,
            "target": {
              "table": [
                {
                  "start": 4,
                  "end": 20,
                  "slot": 0
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 47
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "metadata": {
    "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;Ljava/io/Serializable;",
    "SourceFile": "ClassFileTypeAnnotationsFinal.java",
    "RuntimeVisibleTypeAnnotations": [
      {
        "targetType": 16,
        "target": {
          "supertypeIndex": 65535
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 14
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 0,
        "target": {
          "typeParameterIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 11
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 17,
        "target": {
          "typeParameterIndex": 0,
          "boundIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 12
                }
              }
            }
          ]
        }
      }
    ],
    "RuntimeInvisibleTypeAnnotations": [
      {
        "targetType": 16,
        "target": {
          "supertypeIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 15
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 17,
        "target": {
          "typeParameterIndex": 0,
          "boundIndex": 1
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 13
                }
              }
            }
          ]
        }
      }
    ],
    "InnerClasses": [
      {
        "innerClass": "classes.modern_test.D4TypeOuter$Inner",
        "outerClass": "classes.modern_test.D4TypeOuter",
        "innerName": "Inner",
        "flags": 0
      }
    ]
  },
  "bootstraps": []
});
const outputVector11=freeze({
  "flags": 48,
  "superclass": "java.lang.Object",
  "interfaces": [
    "java.io.Serializable"
  ],
  "fields": [
    {
      "name": "array",
      "descriptor": "[Ljava/lang/String;",
      "flags": 1,
      "metadata": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 0,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 21
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "wild",
      "descriptor": "Ljava/util/List;",
      "flags": 1,
      "metadata": {
        "Signature": "Ljava/util/List<+Ljava/lang/String;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 23
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              },
              {
                "kind": 2,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 24
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "inner",
      "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
      "flags": 1,
      "metadata": {
        "Signature": "Lclasses/modern_test/D4TypeOuter<Ljava/lang/String;>.Inner<Ljava/lang/Integer;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 25
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 1,
                "argumentIndex": 0
              },
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 27
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 1,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 26
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "()V",
      "flags": 0,
      "metadata": {},
      "code": [
        "aload:0",
        "invokespecial:java.lang.Object#<init>()V",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "return"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 169
          }
        ]
      }
    },
    {
      "name": "returner",
      "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
      "flags": 1,
      "metadata": {
        "Exceptions": [
          "java.io.IOException"
        ],
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 20,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 31
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 22,
            "target": {
              "formalParameterIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 32
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 23,
            "target": {
              "throwsIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 33
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:1",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_1",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 174
          }
        ]
      }
    },
    {
      "name": "receiver",
      "descriptor": "()V",
      "flags": 1,
      "metadata": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 21,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 34
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "return"
      ],
      "nativeOpcodes": [
        "return"
      ],
      "maxStack": 0,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 1,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 1,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 175
          }
        ]
      }
    },
    {
      "name": "generic",
      "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ],
        "Signature": "<U::Ljava/lang/CharSequence;>(TU;)TU;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 1,
            "target": {
              "typeParameterIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 35
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 18,
            "target": {
              "typeParameterIndex": 0,
              "boundIndex": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 36
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "Ljava/lang/CharSequence;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "signature": "TU;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 176
          }
        ]
      }
    },
    {
      "name": "value",
      "descriptor": "(I)I",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "I",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 177
          }
        ]
      }
    },
    {
      "name": "cast",
      "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "nop",
        "aload:0",
        "nop",
        "checkcast:java.lang.String",
        "nop",
        "astore:1",
        "nop",
        "aload:1",
        "nop",
        "areturn"
      ],
      "nativeOpcodes": [
        "nop",
        "aload_0",
        "nop",
        "checkcast",
        "nop",
        "astore_1",
        "nop",
        "aload_1",
        "nop",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 71,
            "target": {
              "target": 3,
              "typeArgumentIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 43
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 64,
            "target": {
              "table": [
                {
                  "start": 7,
                  "end": 10,
                  "slot": 1
                },
                {
                  "start": 7,
                  "end": 10,
                  "slot": 1
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 41
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 64,
            "target": {
              "table": [
                {
                  "start": 7,
                  "end": 10,
                  "slot": 1
                },
                {
                  "start": 7,
                  "end": 10,
                  "slot": 1
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 42
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 1,
            "end": 10,
            "name": "input",
            "type": "Ljava/lang/Object;",
            "slot": 0
          },
          {
            "start": 7,
            "end": 10,
            "name": "local",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 178
          }
        ]
      }
    },
    {
      "name": "checkType",
      "descriptor": "(Ljava/lang/Object;)Z",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "nop",
        "aload:0",
        "nop",
        "instanceof:java.lang.String",
        "nop",
        "ireturn"
      ],
      "nativeOpcodes": [
        "nop",
        "aload_0",
        "nop",
        "instanceof",
        "nop",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 67,
            "target": {
              "target": 3
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 44
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 1,
            "end": 6,
            "name": "input",
            "type": "Ljava/lang/Object;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 179
          }
        ]
      }
    },
    {
      "name": "make",
      "descriptor": "()Ljava/lang/String;",
      "flags": 9,
      "metadata": {},
      "code": [
        "nop",
        "new:java.lang.String",
        "nop",
        "dup",
        "nop",
        "string:new",
        "nop",
        "invokespecial:java.lang.String#<init>(Ljava/lang/String;)V",
        "nop",
        "areturn"
      ],
      "nativeOpcodes": [
        "nop",
        "new",
        "nop",
        "dup",
        "nop",
        "ldc_w",
        "nop",
        "invokespecial",
        "nop",
        "areturn"
      ],
      "maxStack": 3,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 68,
            "target": {
              "target": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 45
                    }
                  }
                }
              ]
            }
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 180
          }
        ]
      }
    },
    {
      "name": "caught",
      "descriptor": "(I)Ljava/lang/String;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "nop",
        "nop",
        "iload:0",
        "nop",
        "ifne:13",
        "nop",
        "new:java.lang.IllegalArgumentException",
        "nop",
        "dup",
        "nop",
        "invokespecial:java.lang.IllegalArgumentException#<init>()V",
        "nop",
        "athrow",
        "string:ok",
        "nop",
        "areturn",
        "astore:1",
        "nop",
        "string:caught",
        "nop",
        "areturn",
        "pop",
        "string:extra",
        "areturn"
      ],
      "nativeOpcodes": [
        "nop",
        "nop",
        "iload_0",
        "nop",
        "ifne",
        "nop",
        "new",
        "nop",
        "dup",
        "nop",
        "invokespecial",
        "nop",
        "athrow",
        "ldc_w",
        "nop",
        "areturn",
        "astore_1",
        "nop",
        "ldc_w",
        "nop",
        "areturn",
        "pop",
        "ldc_w",
        "areturn"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [
        {
          "start": 0,
          "end": 1,
          "target": 21,
          "catchType": "java.lang.Throwable"
        },
        {
          "start": 2,
          "end": 15,
          "target": 16,
          "catchType": "java.lang.IllegalArgumentException"
        }
      ],
      "frames": [
        {
          "target": 13,
          "locals": [
            "INTEGER"
          ],
          "stack": []
        },
        {
          "target": 16,
          "locals": [
            "INTEGER"
          ],
          "stack": [
            "Object:java.lang.IllegalArgumentException"
          ]
        },
        {
          "target": 21,
          "locals": [
            "INTEGER"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        }
      ],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 66,
            "target": {
              "exceptionTableIndex": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 46
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 18,
            "end": 21,
            "name": "caught",
            "type": "Ljava/lang/IllegalArgumentException;",
            "slot": 1
          },
          {
            "start": 2,
            "end": 21,
            "name": "input",
            "type": "I",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 1,
            "line": 181
          }
        ]
      }
    },
    {
      "name": "resource",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {
        "Exceptions": [
          "java.lang.Exception"
        ]
      },
      "code": [
        "nop",
        "new:classes.modern_test.D4Resource",
        "nop",
        "dup",
        "nop",
        "invokespecial:classes.modern_test.D4Resource#<init>()V",
        "nop",
        "astore:0",
        "nop",
        "int:7",
        "nop",
        "istore:1",
        "nop",
        "aload:0",
        "nop",
        "invokevirtual:classes.modern_test.D4Resource#close()V",
        "nop",
        "iload:1",
        "nop",
        "ireturn",
        "astore:1",
        "nop",
        "aload:0",
        "nop",
        "invokevirtual:classes.modern_test.D4Resource#close()V",
        "nop",
        "goto:35",
        "astore:2",
        "nop",
        "aload:1",
        "nop",
        "aload:2",
        "nop",
        "invokevirtual:java.lang.Throwable#addSuppressed(Ljava/lang/Throwable;)V",
        "nop",
        "aload:1",
        "nop",
        "athrow"
      ],
      "nativeOpcodes": [
        "nop",
        "new",
        "nop",
        "dup",
        "nop",
        "invokespecial",
        "nop",
        "astore_0",
        "nop",
        "bipush",
        "nop",
        "istore_1",
        "nop",
        "aload_0",
        "nop",
        "invokevirtual",
        "nop",
        "iload_1",
        "nop",
        "ireturn",
        "astore_1",
        "nop",
        "aload_0",
        "nop",
        "invokevirtual",
        "nop",
        "goto",
        "astore_2",
        "nop",
        "aload_1",
        "nop",
        "aload_2",
        "nop",
        "invokevirtual",
        "nop",
        "aload_1",
        "nop",
        "athrow"
      ],
      "maxStack": 2,
      "maxLocals": 3,
      "handlers": [
        {
          "start": 9,
          "end": 13,
          "target": 20,
          "catchType": "java.lang.Throwable"
        },
        {
          "start": 22,
          "end": 26,
          "target": 27,
          "catchType": "java.lang.Throwable"
        }
      ],
      "frames": [
        {
          "target": 20,
          "locals": [
            "Object:classes.modern_test.D4Resource"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 27,
          "locals": [
            "Object:classes.modern_test.D4Resource",
            "Object:java.lang.Throwable"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 35,
          "locals": [
            "Object:classes.modern_test.D4Resource",
            "Object:java.lang.Throwable"
          ],
          "stack": []
        }
      ],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 65,
            "target": {
              "table": [
                {
                  "start": 9,
                  "end": 38,
                  "slot": 0
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 47
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 9,
            "end": 38,
            "name": "resource",
            "type": "Lclasses/modern_test/D4Resource;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 182
          }
        ]
      }
    }
  ],
  "metadata": {
    "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;Ljava/io/Serializable;",
    "SourceFile": "ClassFileTypeAnnotationsFinal.java",
    "RuntimeVisibleTypeAnnotations": [
      {
        "targetType": 16,
        "target": {
          "supertypeIndex": 65535
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 14
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 0,
        "target": {
          "typeParameterIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 11
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 17,
        "target": {
          "typeParameterIndex": 0,
          "boundIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 12
                }
              }
            }
          ]
        }
      }
    ],
    "RuntimeInvisibleTypeAnnotations": [
      {
        "targetType": 16,
        "target": {
          "supertypeIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 15
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 17,
        "target": {
          "typeParameterIndex": 0,
          "boundIndex": 1
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 13
                }
              }
            }
          ]
        }
      }
    ],
    "InnerClasses": [
      {
        "innerClass": "classes.modern_test.D4TypeOuter$Inner",
        "outerClass": "classes.modern_test.D4TypeOuter",
        "innerName": "Inner",
        "flags": 0
      }
    ]
  },
  "bootstraps": []
});
const outputVector12=freeze({
  "flags": 48,
  "superclass": "java.lang.Object",
  "interfaces": [
    "java.io.Serializable"
  ],
  "fields": [
    {
      "name": "array",
      "descriptor": "[Ljava/lang/String;",
      "flags": 1,
      "metadata": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 0,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 21
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "wild",
      "descriptor": "Ljava/util/List;",
      "flags": 1,
      "metadata": {
        "Signature": "Ljava/util/List<+Ljava/lang/String;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 23
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              },
              {
                "kind": 2,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 24
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "inner",
      "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
      "flags": 1,
      "metadata": {
        "Signature": "Lclasses/modern_test/D4TypeOuter<Ljava/lang/String;>.Inner<Ljava/lang/Integer;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 25
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 1,
                "argumentIndex": 0
              },
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 27
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 1,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 26
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "()V",
      "flags": 0,
      "metadata": {},
      "code": [
        "aload:0",
        "invokespecial:java.lang.Object#<init>()V",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "return"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 169
          }
        ]
      }
    },
    {
      "name": "returner",
      "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
      "flags": 1,
      "metadata": {
        "Exceptions": [
          "java.io.IOException"
        ],
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ],
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 20,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 31
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 22,
            "target": {
              "formalParameterIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 32
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 23,
            "target": {
              "throwsIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 33
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:1",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_1",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 174
          }
        ]
      }
    },
    {
      "name": "receiver",
      "descriptor": "()V",
      "flags": 1,
      "metadata": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 21,
            "target": {},
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 34
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "return"
      ],
      "nativeOpcodes": [
        "return"
      ],
      "maxStack": 0,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 1,
            "name": "this",
            "type": "Lclasses/modern_test/D4TypeTarget;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 1,
            "name": "this",
            "signature": "Lclasses/modern_test/D4TypeTarget<TT;>;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 175
          }
        ]
      }
    },
    {
      "name": "generic",
      "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ],
        "Signature": "<U::Ljava/lang/CharSequence;>(TU;)TU;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 1,
            "target": {
              "typeParameterIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 35
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 18,
            "target": {
              "typeParameterIndex": 0,
              "boundIndex": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 36
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "Ljava/lang/CharSequence;",
            "slot": 0
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "signature": "TU;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 176
          }
        ]
      }
    },
    {
      "name": "value",
      "descriptor": "(I)I",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "iload:0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "input",
            "type": "I",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 177
          }
        ]
      }
    },
    {
      "name": "cast",
      "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "checkcast:java.lang.String",
        "astore:1",
        "aload:1",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "checkcast",
        "astore_1",
        "aload_1",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 71,
            "target": {
              "target": 1,
              "typeArgumentIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 43
                    }
                  }
                }
              ]
            }
          },
          {
            "targetType": 64,
            "target": {
              "table": [
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                },
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 41
                    }
                  }
                }
              ]
            }
          }
        ],
        "RuntimeInvisibleTypeAnnotations": [
          {
            "targetType": 64,
            "target": {
              "table": [
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                },
                {
                  "start": 3,
                  "end": 5,
                  "slot": 1
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeInvisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 42
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 5,
            "name": "input",
            "type": "Ljava/lang/Object;",
            "slot": 0
          },
          {
            "start": 3,
            "end": 5,
            "name": "local",
            "type": "Ljava/lang/String;",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 178
          }
        ]
      }
    },
    {
      "name": "checkType",
      "descriptor": "(Ljava/lang/Object;)Z",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "instanceof:java.lang.String",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "instanceof",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 67,
            "target": {
              "target": 1
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 44
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "input",
            "type": "Ljava/lang/Object;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 179
          }
        ]
      }
    },
    {
      "name": "make",
      "descriptor": "()Ljava/lang/String;",
      "flags": 9,
      "metadata": {},
      "code": [
        "new:java.lang.String",
        "dup",
        "string:new",
        "invokespecial:java.lang.String#<init>(Ljava/lang/String;)V",
        "areturn"
      ],
      "nativeOpcodes": [
        "new",
        "dup",
        "ldc",
        "invokespecial",
        "areturn"
      ],
      "maxStack": 3,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 68,
            "target": {
              "target": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 45
                    }
                  }
                }
              ]
            }
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 180
          }
        ]
      }
    },
    {
      "name": "caught",
      "descriptor": "(I)Ljava/lang/String;",
      "flags": 9,
      "metadata": {
        "MethodParameters": [
          {
            "name": "input",
            "flags": 0
          }
        ]
      },
      "code": [
        "iload:0",
        "ifne:6",
        "new:java.lang.IllegalArgumentException",
        "dup",
        "invokespecial:java.lang.IllegalArgumentException#<init>()V",
        "athrow",
        "string:ok",
        "areturn",
        "astore:1",
        "string:caught",
        "areturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "ifne",
        "new",
        "dup",
        "invokespecial",
        "athrow",
        "ldc",
        "areturn",
        "astore_1",
        "ldc",
        "areturn"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [
        {
          "start": 0,
          "end": 7,
          "target": 8,
          "catchType": "java.lang.IllegalArgumentException"
        }
      ],
      "frames": [
        {
          "target": 6,
          "locals": [
            "INTEGER"
          ],
          "stack": []
        },
        {
          "target": 8,
          "locals": [
            "INTEGER"
          ],
          "stack": [
            "Object:java.lang.IllegalArgumentException"
          ]
        }
      ],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 66,
            "target": {
              "exceptionTableIndex": 0
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 46
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 9,
            "end": 11,
            "name": "caught",
            "type": "Ljava/lang/IllegalArgumentException;",
            "slot": 1
          },
          {
            "start": 0,
            "end": 11,
            "name": "input",
            "type": "I",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 181
          }
        ]
      }
    },
    {
      "name": "resource",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {
        "Exceptions": [
          "java.lang.Exception"
        ]
      },
      "code": [
        "new:classes.modern_test.D4Resource",
        "dup",
        "invokespecial:classes.modern_test.D4Resource#<init>()V",
        "astore:0",
        "int:7",
        "istore:1",
        "aload:0",
        "invokevirtual:classes.modern_test.D4Resource#close()V",
        "iload:1",
        "ireturn",
        "astore:1",
        "aload:0",
        "invokevirtual:classes.modern_test.D4Resource#close()V",
        "goto:18",
        "astore:2",
        "aload:1",
        "aload:2",
        "invokevirtual:java.lang.Throwable#addSuppressed(Ljava/lang/Throwable;)V",
        "aload:1",
        "athrow"
      ],
      "nativeOpcodes": [
        "new",
        "dup",
        "invokespecial",
        "astore_0",
        "bipush",
        "istore_1",
        "aload_0",
        "invokevirtual",
        "iload_1",
        "ireturn",
        "astore_1",
        "aload_0",
        "invokevirtual",
        "goto",
        "astore_2",
        "aload_1",
        "aload_2",
        "invokevirtual",
        "aload_1",
        "athrow"
      ],
      "maxStack": 2,
      "maxLocals": 3,
      "handlers": [
        {
          "start": 4,
          "end": 6,
          "target": 10,
          "catchType": "java.lang.Throwable"
        },
        {
          "start": 11,
          "end": 13,
          "target": 14,
          "catchType": "java.lang.Throwable"
        }
      ],
      "frames": [
        {
          "target": 10,
          "locals": [
            "Object:classes.modern_test.D4Resource"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 14,
          "locals": [
            "Object:classes.modern_test.D4Resource",
            "Object:java.lang.Throwable"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 18,
          "locals": [
            "Object:classes.modern_test.D4Resource",
            "Object:java.lang.Throwable"
          ],
          "stack": []
        }
      ],
      "debug": {
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 65,
            "target": {
              "table": [
                {
                  "start": 4,
                  "end": 20,
                  "slot": 0
                }
              ]
            },
            "path": [],
            "annotation": {
              "type": "Lclasses/modern_test/D4TypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 47
                    }
                  }
                }
              ]
            }
          }
        ],
        "LocalVariableTable": [
          {
            "start": 4,
            "end": 20,
            "name": "resource",
            "type": "Lclasses/modern_test/D4Resource;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 182
          }
        ]
      }
    }
  ],
  "metadata": {
    "Signature": "<T:Ljava/lang/Number;:Ljava/io/Serializable;>Ljava/lang/Object;Ljava/io/Serializable;",
    "SourceFile": "ClassFileTypeAnnotationsFinal.java",
    "RuntimeVisibleTypeAnnotations": [
      {
        "targetType": 16,
        "target": {
          "supertypeIndex": 65535
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 14
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 0,
        "target": {
          "typeParameterIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 11
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 17,
        "target": {
          "typeParameterIndex": 0,
          "boundIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeVisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 12
                }
              }
            }
          ]
        }
      }
    ],
    "RuntimeInvisibleTypeAnnotations": [
      {
        "targetType": 16,
        "target": {
          "supertypeIndex": 0
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 15
                }
              }
            }
          ]
        }
      },
      {
        "targetType": 17,
        "target": {
          "typeParameterIndex": 0,
          "boundIndex": 1
        },
        "path": [],
        "annotation": {
          "type": "Lclasses/modern_test/D4TypeInvisible;",
          "elements": [
            {
              "name": "value",
              "value": {
                "tag": "I",
                "constant": {
                  "tag": 3,
                  "value": 13
                }
              }
            }
          ]
        }
      }
    ],
    "InnerClasses": [
      {
        "innerClass": "classes.modern_test.D4TypeOuter$Inner",
        "outerClass": "classes.modern_test.D4TypeOuter",
        "innerName": "Inner",
        "flags": 0
      }
    ]
  },
  "bootstraps": []
});
const outputVector13=freeze({
  "flags": 48,
  "superclass": "java.lang.Record",
  "interfaces": [],
  "fields": [
    {
      "name": "number",
      "descriptor": "I",
      "flags": 18,
      "metadata": {}
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "(I)V",
      "flags": 0,
      "metadata": {
        "MethodParameters": [
          {
            "name": "number",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "invokespecial:java.lang.Record#<init>()V",
        "aload:0",
        "iload:1",
        "putfield:classes.modern_test.D4RecordExecutable#numberI",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "aload_0",
        "iload_1",
        "putfield",
        "return"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 6,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordExecutable;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 6,
            "name": "number",
            "type": "I",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 127
          }
        ]
      }
    },
    {
      "name": "toString",
      "descriptor": "()Ljava/lang/String;",
      "flags": 17,
      "metadata": {},
      "code": [
        "aload:0",
        "invokedynamic:toString(Lclasses/modern_test/D4RecordExecutable;)Ljava/lang/String;@0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokedynamic",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordExecutable;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 127
          }
        ]
      }
    },
    {
      "name": "hashCode",
      "descriptor": "()I",
      "flags": 17,
      "metadata": {},
      "code": [
        "aload:0",
        "invokedynamic:hashCode(Lclasses/modern_test/D4RecordExecutable;)I@0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokedynamic",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordExecutable;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 127
          }
        ]
      }
    },
    {
      "name": "equals",
      "descriptor": "(Ljava/lang/Object;)Z",
      "flags": 17,
      "metadata": {
        "MethodParameters": [
          {
            "name": "o",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "aload:1",
        "invokedynamic:equals(Lclasses/modern_test/D4RecordExecutable;Ljava/lang/Object;)Z@0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "aload_1",
        "invokedynamic",
        "ireturn"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 4,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordExecutable;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 4,
            "name": "o",
            "type": "Ljava/lang/Object;",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 127
          }
        ]
      }
    },
    {
      "name": "number",
      "descriptor": "()I",
      "flags": 1,
      "metadata": {},
      "code": [
        "aload:0",
        "getfield:classes.modern_test.D4RecordExecutable#numberI",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "getfield",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordExecutable;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 127
          }
        ]
      }
    }
  ],
  "metadata": {
    "SourceFile": "ClassFileMetadataFinal.java",
    "Record": [
      {
        "name": "number",
        "descriptor": "I",
        "metadata": {}
      }
    ],
    "InnerClasses": [
      {
        "innerClass": "java.lang.invoke.MethodHandles$Lookup",
        "outerClass": "java.lang.invoke.MethodHandles",
        "innerName": "Lookup",
        "flags": 25
      }
    ]
  },
  "bootstraps": [
    {
      "method": {
        "tag": 15,
        "referenceKind": 6,
        "reference": {
          "tag": 10,
          "owner": "java.lang.runtime.ObjectMethods",
          "name": "bootstrap",
          "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;"
        }
      },
      "arguments": [
        {
          "tag": 7,
          "value": "classes.modern_test.D4RecordExecutable"
        },
        {
          "tag": 8,
          "value": "number"
        },
        {
          "tag": 15,
          "referenceKind": 1,
          "reference": {
            "tag": 9,
            "owner": "classes.modern_test.D4RecordExecutable",
            "name": "number",
            "descriptor": "I"
          }
        }
      ]
    }
  ]
});
const outputVector14=freeze({
  "flags": 48,
  "superclass": "java.lang.Record",
  "interfaces": [],
  "fields": [
    {
      "name": "names",
      "descriptor": "Ljava/util/List;",
      "flags": 18,
      "metadata": {
        "Signature": "Ljava/util/List<Ljava/lang/String;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 19,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4RecordTypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "(Ljava/util/List;)V",
      "flags": 0,
      "metadata": {
        "MethodParameters": [
          {
            "name": "names",
            "flags": 0
          }
        ],
        "Signature": "(Ljava/util/List<Ljava/lang/String;>;)V",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 22,
            "target": {
              "formalParameterIndex": 0
            },
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4RecordTypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:0",
        "invokespecial:java.lang.Record#<init>()V",
        "aload:0",
        "aload:1",
        "putfield:classes.modern_test.D4RecordAnnotated#namesLjava/util/List;",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "aload_0",
        "aload_1",
        "putfield",
        "return"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 6,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordAnnotated;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 6,
            "name": "names",
            "type": "Ljava/util/List;",
            "slot": 1
          }
        ],
        "LocalVariableTypeTable": [
          {
            "start": 0,
            "end": 6,
            "name": "names",
            "signature": "Ljava/util/List<Ljava/lang/String;>;",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 128
          }
        ]
      }
    },
    {
      "name": "toString",
      "descriptor": "()Ljava/lang/String;",
      "flags": 17,
      "metadata": {},
      "code": [
        "aload:0",
        "invokedynamic:toString(Lclasses/modern_test/D4RecordAnnotated;)Ljava/lang/String;@0",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokedynamic",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordAnnotated;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 128
          }
        ]
      }
    },
    {
      "name": "hashCode",
      "descriptor": "()I",
      "flags": 17,
      "metadata": {},
      "code": [
        "aload:0",
        "invokedynamic:hashCode(Lclasses/modern_test/D4RecordAnnotated;)I@0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokedynamic",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordAnnotated;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 128
          }
        ]
      }
    },
    {
      "name": "equals",
      "descriptor": "(Ljava/lang/Object;)Z",
      "flags": 17,
      "metadata": {
        "MethodParameters": [
          {
            "name": "o",
            "flags": 0
          }
        ]
      },
      "code": [
        "aload:0",
        "aload:1",
        "invokedynamic:equals(Lclasses/modern_test/D4RecordAnnotated;Ljava/lang/Object;)Z@0",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "aload_1",
        "invokedynamic",
        "ireturn"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 4,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordAnnotated;",
            "slot": 0
          },
          {
            "start": 0,
            "end": 4,
            "name": "o",
            "type": "Ljava/lang/Object;",
            "slot": 1
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 128
          }
        ]
      }
    },
    {
      "name": "names",
      "descriptor": "()Ljava/util/List;",
      "flags": 1,
      "metadata": {
        "Signature": "()Ljava/util/List<Ljava/lang/String;>;",
        "RuntimeVisibleTypeAnnotations": [
          {
            "targetType": 20,
            "target": {},
            "path": [
              {
                "kind": 3,
                "argumentIndex": 0
              }
            ],
            "annotation": {
              "type": "Lclasses/modern_test/D4RecordTypeVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 22
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      "code": [
        "aload:0",
        "getfield:classes.modern_test.D4RecordAnnotated#namesLjava/util/List;",
        "areturn"
      ],
      "nativeOpcodes": [
        "aload_0",
        "getfield",
        "areturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4RecordAnnotated;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 128
          }
        ]
      }
    }
  ],
  "metadata": {
    "SourceFile": "ClassFileMetadataFinal.java",
    "Record": [
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
        "metadata": {
          "Signature": "Ljava/util/List<Ljava/lang/String;>;",
          "RuntimeVisibleAnnotations": [
            {
              "type": "Lclasses/modern_test/D4RecordVisible;",
              "elements": [
                {
                  "name": "value",
                  "value": {
                    "tag": "I",
                    "constant": {
                      "tag": 3,
                      "value": 21
                    }
                  }
                }
              ]
            }
          ],
          "RuntimeVisibleTypeAnnotations": [
            {
              "targetType": 19,
              "target": {},
              "path": [
                {
                  "kind": 3,
                  "argumentIndex": 0
                }
              ],
              "annotation": {
                "type": "Lclasses/modern_test/D4RecordTypeVisible;",
                "elements": [
                  {
                    "name": "value",
                    "value": {
                      "tag": "I",
                      "constant": {
                        "tag": 3,
                        "value": 22
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ],
    "InnerClasses": [
      {
        "innerClass": "java.lang.invoke.MethodHandles$Lookup",
        "outerClass": "java.lang.invoke.MethodHandles",
        "innerName": "Lookup",
        "flags": 25
      }
    ]
  },
  "bootstraps": [
    {
      "method": {
        "tag": 15,
        "referenceKind": 6,
        "reference": {
          "tag": 10,
          "owner": "java.lang.runtime.ObjectMethods",
          "name": "bootstrap",
          "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;"
        }
      },
      "arguments": [
        {
          "tag": 7,
          "value": "classes.modern_test.D4RecordAnnotated"
        },
        {
          "tag": 8,
          "value": "names"
        },
        {
          "tag": 15,
          "referenceKind": 1,
          "reference": {
            "tag": 9,
            "owner": "classes.modern_test.D4RecordAnnotated",
            "name": "names",
            "descriptor": "Ljava/util/List;"
          }
        }
      ]
    }
  ]
});
const outputVector15=freeze({
  "flags": 32,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "<init>",
      "descriptor": "()V",
      "flags": 0,
      "metadata": {},
      "code": [
        "aload:0",
        "invokespecial:java.lang.Object#<init>()V",
        "return"
      ],
      "nativeOpcodes": [
        "aload_0",
        "invokespecial",
        "return"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 3,
            "name": "this",
            "type": "Lclasses/modern_test/D4SealedBase;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 129
          }
        ]
      }
    },
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 1,
      "metadata": {},
      "code": [
        "int:23",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 1,
      "handlers": [],
      "frames": [],
      "debug": {
        "LocalVariableTable": [
          {
            "start": 0,
            "end": 2,
            "name": "this",
            "type": "Lclasses/modern_test/D4SealedBase;",
            "slot": 0
          }
        ],
        "LineNumberTable": [
          {
            "target": 0,
            "line": 129
          }
        ]
      }
    }
  ],
  "metadata": {
    "SourceFile": "ClassFileMetadataFinal.java",
    "PermittedSubclasses": [
      "classes.modern_test.D4SealedLeaf"
    ]
  },
  "bootstraps": []
});
const outputVector16=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:31",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {
    "EnclosingMethod": {
      "owner": "classes.modern_test.ClassFileMetadataFinal",
      "method": {
        "tag": 12,
        "name": "enclosing",
        "descriptor": "()Ljava/lang/Object;"
      }
    }
  },
  "bootstraps": []
});
const outputVector17=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [
    {
      "name": "number",
      "descriptor": "I",
      "flags": 25,
      "metadata": {
        "ConstantValue": {
          "tag": 3,
          "value": 3
        },
        "Synthetic": true,
        "Deprecated": true
      }
    }
  ],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {
        "Synthetic": true,
        "Deprecated": true
      },
      "code": [
        "int:41",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {
    "Synthetic": true,
    "Deprecated": true,
    "SourceID": "source-d4",
    "CompilationID": "compiler-d4"
  },
  "bootstraps": []
});
const outputVector18=freeze({
  "flags": 32768,
  "superclass": null,
  "interfaces": [],
  "fields": [],
  "methods": [],
  "metadata": {
    "Module": {
      "name": "d4.original",
      "flags": 0,
      "version": "4.0",
      "requires": [
        {
          "name": "java.base",
          "flags": 32768,
          "version": "25"
        },
        {
          "name": "d4.dependency",
          "flags": 32,
          "version": null
        }
      ],
      "exports": [
        {
          "name": "classes/modern_test",
          "flags": 0,
          "to": [
            "d4.friend"
          ]
        }
      ],
      "opens": [
        {
          "name": "classes/modern_test/internal",
          "flags": 4096,
          "to": [
            "d4.friend"
          ]
        }
      ],
      "uses": [
        "java.lang.Runnable"
      ],
      "provides": [
        {
          "service": "java.lang.Runnable",
          "implementations": [
            "java.lang.Thread"
          ]
        }
      ]
    }
  },
  "bootstraps": []
});
const outputVector19=freeze({
  "flags": 32768,
  "superclass": null,
  "interfaces": [],
  "fields": [],
  "methods": [],
  "metadata": {
    "Module": {
      "name": "d4.original",
      "flags": 0,
      "version": "4.0",
      "requires": [
        {
          "name": "java.base",
          "flags": 32768,
          "version": "25"
        },
        {
          "name": "d4.dependency",
          "flags": 32,
          "version": null
        }
      ],
      "exports": [
        {
          "name": "classes/modern_test",
          "flags": 0,
          "to": [
            "d4.friend"
          ]
        }
      ],
      "opens": [
        {
          "name": "classes/modern_test/internal",
          "flags": 4096,
          "to": [
            "d4.friend"
          ]
        }
      ],
      "uses": [
        "java.lang.Runnable"
      ],
      "provides": [
        {
          "service": "java.lang.Runnable",
          "implementations": [
            "java.lang.Thread"
          ]
        }
      ]
    },
    "ModulePackages": [
      "classes/modern_test",
      "classes/modern_test/internal"
    ],
    "ModuleMainClass": "classes.modern_test.ClassFileMetadataFinal",
    "SourceFile": "module-info.java"
  },
  "bootstraps": []
});
const outputVector20=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(I)I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:0",
        "istore:1",
        "int:7",
        "istore:2",
        "iload:0",
        "ifne:8",
        "iload:2",
        "istore:1",
        "long:1",
        "lstore:2",
        "iload:1",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iconst_0",
        "istore_1",
        "bipush",
        "istore_2",
        "iload_0",
        "ifne",
        "iload_2",
        "istore_1",
        "lconst_1",
        "lstore_2",
        "iload_1",
        "ireturn"
      ],
      "maxStack": 2,
      "maxLocals": 4,
      "handlers": [],
      "frames": [
        {
          "target": 8,
          "locals": [
            "INTEGER",
            "INTEGER",
            "INTEGER"
          ],
          "stack": []
        }
      ],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector21=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(I)I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:0",
        "istore:1",
        "iload:0",
        "ifeq:6",
        "int:11",
        "istore:1",
        "iload:1",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iconst_0",
        "istore_1",
        "iload_0",
        "ifeq",
        "bipush",
        "istore_1",
        "iload_1",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [],
      "frames": [
        {
          "target": 6,
          "locals": [
            "INTEGER",
            "INTEGER"
          ],
          "stack": []
        }
      ],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector22=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(II)I",
      "flags": 9,
      "metadata": {},
      "code": [
        "iload:0",
        "iload:1",
        "if_icmple:5",
        "int:17",
        "goto:6",
        "int:19",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iload_0",
        "iload_1",
        "if_icmple",
        "bipush",
        "goto",
        "bipush",
        "ireturn"
      ],
      "maxStack": 2,
      "maxLocals": 2,
      "handlers": [],
      "frames": [
        {
          "target": 5,
          "locals": [
            "INTEGER",
            "INTEGER"
          ],
          "stack": []
        },
        {
          "target": 6,
          "locals": [
            "INTEGER",
            "INTEGER"
          ],
          "stack": [
            "INTEGER"
          ]
        }
      ],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector23=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(I)I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:12",
        "iload:0",
        "idiv",
        "goto:6",
        "pop",
        "int:-1",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "iload_0",
        "idiv",
        "goto",
        "pop",
        "iconst_m1",
        "ireturn"
      ],
      "maxStack": 2,
      "maxLocals": 1,
      "handlers": [
        {
          "start": 0,
          "end": 3,
          "target": 4,
          "catchType": "java.lang.ArithmeticException"
        }
      ],
      "frames": [
        {
          "target": 4,
          "locals": [
            "INTEGER"
          ],
          "stack": [
            "Object:java.lang.ArithmeticException"
          ]
        },
        {
          "target": 6,
          "locals": [
            "INTEGER"
          ],
          "stack": [
            "INTEGER"
          ]
        }
      ],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector24=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "(ILjava/lang/Throwable;)I",
      "flags": 9,
      "metadata": {},
      "code": [
        "aload:1",
        "ifnull:4",
        "aload:1",
        "athrow",
        "int:9",
        "goto:11",
        "pop",
        "int:21",
        "goto:11",
        "pop",
        "int:22",
        "ireturn"
      ],
      "nativeOpcodes": [
        "aload_1",
        "ifnull",
        "aload_1",
        "athrow",
        "bipush",
        "goto",
        "pop",
        "bipush",
        "goto",
        "pop",
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 2,
      "handlers": [
        {
          "start": 0,
          "end": 5,
          "target": 6,
          "catchType": "java.lang.IllegalArgumentException"
        },
        {
          "start": 0,
          "end": 5,
          "target": 6,
          "catchType": "java.lang.IllegalStateException"
        },
        {
          "start": 0,
          "end": 5,
          "target": 9,
          "catchType": null
        }
      ],
      "frames": [
        {
          "target": 4,
          "locals": [
            "INTEGER",
            "Object:java.lang.Throwable"
          ],
          "stack": []
        },
        {
          "target": 6,
          "locals": [
            "INTEGER",
            "Object:java.lang.Throwable"
          ],
          "stack": [
            "Object:java.lang.RuntimeException"
          ]
        },
        {
          "target": 9,
          "locals": [
            "INTEGER",
            "Object:java.lang.Throwable"
          ],
          "stack": [
            "Object:java.lang.Throwable"
          ]
        },
        {
          "target": 11,
          "locals": [
            "INTEGER",
            "Object:java.lang.Throwable"
          ],
          "stack": [
            "INTEGER"
          ]
        }
      ],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector25=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:4",
        "ireturn"
      ],
      "nativeOpcodes": [
        "iconst_4",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector26=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [
    {
      "name": "marker",
      "descriptor": "I",
      "flags": 9,
      "metadata": {}
    }
  ],
  "methods": [
    {
      "name": "first",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:8",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    },
    {
      "name": "second",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:9",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
const outputVector27=freeze({
  "flags": 33,
  "superclass": "java.lang.Object",
  "interfaces": [],
  "fields": [
    {
      "name": "ended",
      "descriptor": "I",
      "flags": 25,
      "metadata": {
        "ConstantValue": {
          "tag": 3,
          "value": 1
        }
      }
    }
  ],
  "methods": [
    {
      "name": "value",
      "descriptor": "()I",
      "flags": 9,
      "metadata": {},
      "code": [
        "int:6",
        "ireturn"
      ],
      "nativeOpcodes": [
        "bipush",
        "ireturn"
      ],
      "maxStack": 1,
      "maxLocals": 0,
      "handlers": [],
      "frames": [],
      "debug": {}
    }
  ],
  "metadata": {},
  "bootstraps": []
});
export const classFileArtifactContracts=freeze({
  "cf-decl-method-signature":[{...outputVector1,id:"decl-method-signature",className:"classes.modern_test.C7dMethodSignature",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-class-signature":[{...outputVector2,id:"decl-class-signature",className:"classes.modern_test.C7dClassSignature",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-annotation-values":[{...outputVector3,id:"decl-annotation-values",className:"classes.modern_test.C7dAnnotationValues",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-visible-annotations":[{...outputVector4,id:"decl-visible",className:"classes.modern_test.C7dDeclarationVisible",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileDeclarationsFinal.java",branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-invisible-newpool":[{...outputVector5,id:"decl-invisible",className:"classes.modern_test.C7dDeclarationInvisible",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileDeclarationsFinal.java",branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-parameter-annotations":[{...outputVector6,id:"decl-parameters",className:"classes.modern_test.C7dParameterAnnotations",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-default-parameters":[{...outputVector7,id:"decl-default-interface",className:"classes.modern_test.C7dDefaultAnnotation",definition:"metadata-only-neverdefine",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0},{...outputVector8,id:"decl-optional-parameters",className:"classes.modern_test.C7dOptionalParameters",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:1}],
  "cf-type-target-models":[{...outputVector9,id:"type-models",className:"classes.modern_test.C7dTypeModels",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-type-field-paths":[{...outputVector10,id:"type-fields",className:"classes.modern_test.C7dTypeFields",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-type-method-targets":[{...outputVector10,id:"type-methods",className:"classes.modern_test.C7dTypeMethods",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-type-class-targets":[{...outputVector10,id:"type-class",className:"classes.modern_test.C7dTypeClass",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-type-code-locals":[{...outputVector10,id:"type-locals",className:"classes.modern_test.C7dTypeLocals",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-type-code-offsets-catch":[{...outputVector10,id:"type-offsets",className:"classes.modern_test.C7dTypeOffsets",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-type-code-relocation":[{...outputVector11,id:"type-relocated",className:"classes.modern_test.C7dTypeRelocated",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-type-visible-invisible":[{...outputVector12,id:"type-visibility",className:"classes.modern_test.C7dTypeVisibility",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileTypeAnnotationsFinal.java",branches:true,handlers:true,producerOrdinal:0}],
  "cf-meta-record-accessor":[{...outputVector13,id:"meta-record-accessor",className:"classes.modern_test.D4RecordExecutable",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileMetadataFinal.java",branches:false,handlers:false,producerOrdinal:0}],
  "cf-meta-record-components":[{...outputVector14,id:"meta-record-components",className:"classes.modern_test.D4RecordAnnotated",definition:"define-and-invoke",origin:"public-transform",sourceFile:"ClassFileMetadataFinal.java",branches:false,handlers:false,producerOrdinal:0}],
  "cf-meta-sealed-metadata":[{...outputVector15,id:"meta-sealed",className:"classes.modern_test.D4SealedBase",definition:"metadata-only-neverdefine",origin:"public-transform",sourceFile:"ClassFileMetadataFinal.java",branches:false,handlers:false,producerOrdinal:0}],
  "cf-meta-enclosing-method":[{...outputVector16,id:"meta-enclosing",className:"classes.modern_test.C7dEnclosingMetadata",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-meta-markers":[{...outputVector17,id:"meta-markers",className:"classes.modern_test.C7dMetadataMarkers",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-meta-module-vectors":[{...outputVector18,id:"meta-module-vectors",className:"module-info",definition:"metadata-only-neverdefine",origin:"public-build-module",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-meta-module-extras":[{...outputVector19,id:"meta-module-extras",className:"module-info",definition:"metadata-only-neverdefine",origin:"public-build-module",sourceFile:"module-info.java",branches:false,handlers:false,producerOrdinal:0}],
  "cf-combinator-block":[{...outputVector20,id:"combinator-block",className:"classes.modern_test.C7dBlockCombinator",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:true,handlers:false,producerOrdinal:0}],
  "cf-combinator-if-then":[{...outputVector21,id:"combinator-if-then",className:"classes.modern_test.C7dIfThenCombinator",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:true,handlers:false,producerOrdinal:0}],
  "cf-combinator-if-else":[{...outputVector22,id:"combinator-if-else",className:"classes.modern_test.C7dIfElseCombinator",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:true,handlers:false,producerOrdinal:0}],
  "cf-combinator-try-catch":[{...outputVector23,id:"combinator-try",className:"classes.modern_test.C7dTryCombinator",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:true,handlers:true,producerOrdinal:0}],
  "cf-combinator-try-multi-all":[{...outputVector24,id:"combinator-multi",className:"classes.modern_test.C7dMultiCatchCombinator",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:true,handlers:true,producerOrdinal:0}],
  "cf-combinator-transforming":[{...outputVector25,id:"combinator-transforming",className:"classes.modern_test.C7dDirectTransforming",definition:"define-and-invoke",origin:"public-build",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-combinator-stateful":[{...outputVector26,id:"combinator-state-first",className:"classes.modern_test.C7dStateFirst",definition:"define-and-invoke",origin:"public-transform",sourceFile:null,branches:false,handlers:false,producerOrdinal:0},{...outputVector26,id:"combinator-state-second",className:"classes.modern_test.C7dStateSecond",definition:"define-and-invoke",origin:"public-transform",sourceFile:null,branches:false,handlers:false,producerOrdinal:1}],
  "cf-combinator-chain":[{...outputVector27,id:"combinator-chain",className:"classes.modern_test.C7dChainedTransforms",definition:"define-and-invoke",origin:"public-transform",sourceFile:null,branches:false,handlers:false,producerOrdinal:0}],
  "cf-decl-signature-attributes":[],
  "cf-meta-record-model":[]
});
