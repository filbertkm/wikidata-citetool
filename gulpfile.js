var gulp = require('gulp'),
	jshint = require('gulp-jshint'),
	notify = require('gulp-notify'),
	concat = require('gulp-concat');

gulp.task('jshint', function() {
	gulp.src('src/*.js')
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(jshint.reporter('fail'))
		.pipe(notify({
			title: 'JSHint',
			message: 'JSHint passed'
		}))
});

gulp.task('concat', function() {
	gulp.src('./src/*.js')
		.pipe(concat('CiteTool.js'))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('default', [ 'jshint', 'concat' ]);
