module.exports = function(grunt) {
    "use strict";
  
    grunt.initConfig({
      
      ts: {
        app: {
          files: [{
            src: [
              "./src/**/*.ts",
              "!./test/**"
            ],
            dest: "./dist"
          },],
          tsconfig: true
        },

        test: {
          files: [{
            src: [
              "./test/**/*.ts", 
              "!./src/**"
            ],
            dest: "./test/dist"
          },],
          tsconfig: true
        }
      },
      
      tslint: {
        options: {
          configuration: "tslint.json"
        },
        files: {
          src: [
            "./src/\*\*/\*.ts",
            "./test/src/\*\*/\*.ts",
          ]
        }
      },

      mochaTest: {
        test: {
          options: {
            log: true,
            run: true
          },
          src: ['./test/**/*.js']
        },
      },

    });
  
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks('grunt-mocha-test');


    grunt.registerTask("build", [
      "ts:app", "tslint"
    ]);

    grunt.registerTask("test", [
      "ts:test",  "mochaTest"
    ]);    

  };