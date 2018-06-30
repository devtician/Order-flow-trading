const gulp = require("gulp")
const imagemin = require("gulp-imagemin")
const uglify = require('gulp-uglify')
const sass = require('gulp-sass')
const browserSync = require('browser-sync').create();
const nodemon = require('gulp-nodemon')

//Copy all ejs files
gulp.task('copyEjs', function () {
    gulp.src("src/views/*.ejs")
        .pipe(gulp.dest("build/views"))
        .pipe(browserSync.stream());
})

//Optimize images
// gulp.task('imageMin', () =>
//     gulp.src('src/images/*')
//         .pipe(imagemin())
//         .pipe(gulp.dest('build/public/images'))
// );

//Minify js
gulp.task('copyJs', function(){
    gulp.src('src/js/*.js')
        // .pipe(uglify())
        .pipe(gulp.dest('build/public/js'))
        .pipe(browserSync.stream());
})

//Compile SASS 
gulp.task('compile-sass', function(){
    gulp.src('src/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('build/public/css'))
        .pipe(browserSync.stream());
})

gulp.task('watch', function(){
    gulp.watch('src/sass/**/*.scss',['compile-sass'])
    gulp.watch('src/js/*.js',['copyJs'])
    gulp.watch('src/views/*.ejs',['copyEjs'])
})

gulp.task('browser-sync', function () {
    browserSync.init(null, {
        open: 'external',
        host: '192.168.0.16',
        proxy: 'localhost:3000', // or project.dev/app/
        port: 3001,
        ws: true
    });
});

gulp.task('default', ['copyEjs','copyJs','compile-sass','browser-sync','watch'], function () {
});