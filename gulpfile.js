var gulp = require('gulp'),
	jshint = require('gulp-jshint'),
	notify = require('gulp-notify');

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
