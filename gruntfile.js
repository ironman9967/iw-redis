
var path = require('path');

var _ = require('lodash');

module.exports = function(grunt) {
    var pathToNode = grunt.option('path-to-node');
    if (_.isUndefined(pathToNode)) {
        pathToNode = path.join(process.execPath, '/../../');
    }

    var tsBin = path.join(pathToNode, 'lib/node_modules/typescript/bin');
    var nodeBin = path.join(pathToNode, 'bin');

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-bump');
	grunt.loadNpmTasks('grunt-replace');

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');


    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),


        nodeBin: nodeBin,
        tscExec: path.join(tsBin, 'tsc'),


        shell: {
            typings: {
                command: 'typings install'
            },

            tsc: {
                options: {
                    stdout: false,
                    callback: function (e, stdout, stderr, cb) {
                        grunt.log.subhead('typescript compiler results ---');
                        if (stdout.length === 0) {
                            grunt.log.ok();
                        }
                        else {
                            var grouped = _.groupBy(_.initial(stdout.split('\n')), function (error) {
                                return error.substring(0, error.indexOf('('));
                            });
                            _.each(grouped, function (errors, file) {
                                grunt.log.subhead(file);
                                var filename = path.basename(file);
                                _.each(errors, function (e) {
                                    grunt.log.error(e);
                                });
                                grunt.log.writeln();
                            });
                        }
                        cb(e);
                    }
                },
                command: '<%= tscExec %> --project ./'
            },
            addDistToGit: {
                command: 'git add dist/* dist/**/*'
            }
        },

        mochaTest: {
            all: {
                options: {
                    colors: true,
                    log: true,
                    logErrors: true
                },
                src: ['src/**/*.test.js']
            }
        },
        bump: {
            options: {
                files: ['package.json'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: false,
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                regExp: false
            }
        },
        copy: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**/*.js', '*.d.ts', '!**/*.test.js', 'typings/*.d.ts', 'typings/**/*.d.ts'],
                    dest: 'dist/'
                }]
            }
        },
        clean: {
            dist: [ "dist" ]
        },
        replace: {
            dist: {
                options: {
                    patterns: [
                        {
                            match: /\.\.\/\.\.\/node_modules/,
                            replacement: "../../.."
                        }
                    ]
                },
                files: [
                    {expand: true, flatten: true, src: ['dist/typings/index.d.ts'], dest: 'dist/typings'}
                ]
            }
        }

        //Typedoc 1.5 compatiblity not ready
        //typedoc: {
        //    build: {
        //        options: {
        //            module: 'commonjs',
        //            target: 'es5',
        //            out: 'docs/',
        //            name: 'ironworks'
        //        },
        //        src: 'src/**/*'
        //    }
        //}
    });


    grunt.registerTask('prep', [
        //'shell:typings'
    ]);

    grunt.registerTask('build', [
        'shell:tsc',
        'clean:dist',
        'copy:dist',
		'replace:dist',
        'shell:addDistToGit'
    ]);

    grunt.registerTask('prep-n-build', [
        'prep',
        'build'
    ]);

    grunt.registerTask('test', [
        'mochaTest:all'
    ]);

    grunt.registerTask('build-n-test', [
        'build',
        'test'
    ]);

    grunt.registerTask('default', [
        'prep',
        'build',
        'test'
    ]);
};
