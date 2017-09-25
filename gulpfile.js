var gulp       = require('gulp'),
    jshint     = require('gulp-jshint'),
    gutil      = require('gulp-util'),
    uglify     = require('gulp-uglify'),
    rename     = require('gulp-rename'),
    source     = require("vinyl-source-stream"),
    buffer     = require("vinyl-buffer"),
    browserify = require('browserify'),
    del        = require('del'),
    gulpNSP    = require('gulp-nsp');



var DEST = './dist/'

/**
    Lint the JS code
**/
gulp.task('lint', [], function(){
    return gulp.src(['./lib/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

/**
    Remove existing dist folder
**/
gulp.task('clean', ['lint'], function(cb) {
    del([DEST]).then(cb.bind(null, null));
});

//To check your package.json
gulp.task('nsp', function (cb) {
  gulpNSP({package: __dirname + '/package.json'}, cb);
});

/**
    Build for the browser
**/
gulp.task('dist', function() {
    return browserify("./iota-browser.js")
        .bundle()
        .pipe(source('iota.js'))
        .pipe(gulp.dest(DEST))
        .pipe(rename('iota.min.js'))
        .pipe(buffer())
        .pipe(uglify())
        .on('error', function (err) { console.log(gutil.colors.red('[Error]'), err.toString()); })
        .pipe(gulp.dest(DEST));
});


gulp.task('default', ['lint', 'clean', 'nsp', 'dist']);
