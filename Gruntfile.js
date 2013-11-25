module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    docPath: 'docs',
    jshint: {
      files: ['*.js','scratchy'],
      options: {
        // options here to override JSHint defaults
        globals: {
          console: true,
          module: true,
          document: true
        }
      }
    },
    clean : {
      docs: ['<%= docPath %>']
    },
    shell : {
      scratchy: {
        command: './scratchy -x .asciidoc -uo <%= docPath %> -p scratchy',
        options: {
          stdout: true
        }
      },
      asciidoc: {
        command: 'find docs -type file | xargs -L 1 asciidoc -a numbered -b html5 -a icons -a toc2 -a theme=kibana',
        options: {
          stdout: true
        }
      }
    }
  });

  require('load-grunt-tasks')(grunt);
  grunt.registerTask('default', ['clean:docs','jshint','shell:scratchy','shell:asciidoc']);

};