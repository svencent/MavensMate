// not being used currently

module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-mocha-cli');

  grunt.initConfig({
    nodemon: {
      dev: {
        script: 'bin/server',
        options: {
          args: ['--verbose'],
          nodeArgs: ['--debug'],
          callback: function (nodemon) {
            nodemon.on('log', function (event) {
              console.log(event.colour);
            });
          },
          env: {
            MAVENSMATE_SERVER_PORT: '56248',
            MM_DEBUG_LEVEL: 'debug'
          },
          cwd: __dirname,
          ignore: ['node_modules/**'],
          ext: 'js,html',
          watch: ['app'],
          delay: 1000,
          legacyWatch: true
        }
      },
      exec: {
        options: {
          exec: 'less'
        }
      }
    },
    mochacli: {
      options: {
          // require: ['should'],
          reporter: 'spec',
          bail: true
      },
      all: ['test/**/*.js']
    }
  });

  grunt.registerTask('test', 'mochacli');
};