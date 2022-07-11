// Include gulp and plugins
const gulp = require('gulp');

const del = require('del');

// pkg = require('./package.json'),

const $ = require('gulp-load-plugins')({
    lazy: true
});

const browserSync = require('browser-sync').create();

const reload = browserSync.reload;

// file locations
let devBuild =
    (process.env.NODE_ENV || 'development').trim().toLowerCase() !==
    'production';

let source = './';

let dest = devBuild ? 'builds/development/' : 'builds/production/';

let html = {
    partials: [source + '_partials/**/*'],
    in: [source + '*.html'],
    watch: ['*.html', '_partials/**/*'],
    out: dest,
    context: {
        devBuild: devBuild
    }
};


let images = {
    in: [source + 'assets/img/**/*'],
    out: dest + 'assets/img/'
};

let css = {
    in: [source + 'sass/style.scss'],
    watch: ['sass/**/*.scss', '!sass/b2b/**/*'],
    out: dest + 'css/',
    pluginCSS: {
        in: [
            source + 'node_modules/bootstrap/scss/bootstrap.scss',
            source + 'node_modules/slick-carousel/slick/slick.css',
            source + 'node_modules/slick-carousel/slick/slick-theme.css',
            source + 'node_modules/simplebar/dist/simplebar.min.css',
        ],
        watch: ['css/**/*.css'],
        out: dest + 'css/'
    },
    sassOpts: {
        outputStyle: devBuild ? 'compressed' : 'compressed',
        imagePath: '../images',
        precision: 3,
        errLogToConsole: true
    }
};

let fonts = {
    in: source + 'fonts/**/*',
    out: dest + 'fonts/'
};

let syncOpts = {
    server: {
        baseDir: dest,
        index: 'index.html'
    },
    open: false,
    injectChanges: true,
    reloadDelay: 0,
    notify: true
};


// Clean tasks
gulp.task('clean', cb => {
    del([dest + '**/*'], cb());
});

gulp.task('clean-images', cb => {
    del([dest + 'assets/img/**/*'], cb());
});

gulp.task('clean-html', () => {
    return del([dest + '**/*.html']);
});

gulp.task('clean-css', cb => {
    del([dest + 'css/**/*'], cb());
});

// reload task
gulp.task('reload', done => {
    browserSync.reload();
    done();
});

// build HTML files
gulp.task('html', () => {
    var page = gulp
        .src(html.in)
        .pipe($.newer(html.out))
        .pipe($.preprocess({
            context: html.context
        }));
    /*.pipe($.replace(/.\jpg|\.png|\.tiff/g, '.webp'))*/
    if (!devBuild) {
        page = page
            .pipe($.size({
                title: 'HTML in'
            }))
            .pipe($.htmlclean())
            .pipe($.size({
                title: 'HTML out'
            }));
    }
    return (
        page.pipe(gulp.dest(html.out))
    );
});

// manage images
gulp.task('images', () => {
    var imageFilter2 = $.filter(['**/*.+(jpg|png|tiff|webp)'], {
        restore: true
    });
    return (
        gulp
        .src(images.in)
        .pipe($.size({
            title: 'images in '
        }))
        .pipe($.newer(images.out))
        .pipe($.plumber())
        .pipe($.image({
            jpegRecompress: ['--strip', '--quality', 'medium', '--loops', 10, '--min', 40, '--max', 80],
            mozjpeg: ['-quality', 38, '-optimize', '-progressive'],
            // guetzli: ['--quality', 84],
            quiet: true
        }))
        // .pipe($.image({
        //     jpegRecompress: ['--strip', '--quality', 'medium', '--loops', 10, '--min', 40, '--max', 80],
        //     mozjpeg: ['-quality', 50, '-optimize', '-progressive'],
        //     // guetzli: ['--quality', 84],
        //     quiet: true
        // }))
        // .pipe($.imagemin())
        .pipe($.size({
            title: 'images out '
        }))
        .pipe(gulp.dest(images.out))
    );
});

gulp.task('optim-images', function () {
    return gulp.src(images.in)
        .pipe($.size({
            title: 'Total images in '
        }))
        .pipe($.newer(images.out))
        .pipe($.plumber())
        .pipe($.image({
            jpegRecompress: ['--strip', '--quality', 'medium', '--min', 40, '--max', 80],
            // mozjpeg: ['-optimize', '-progressive'],
            // guetzli: ['--quality', 85],
            quiet: true
        }))
        .pipe($.size({
            title: 'Total images out '
        }))
        .pipe(gulp.dest(images.out));
});


// browser sync
gulp.task('serve', () => {

    browserSync.init(syncOpts);

});

gulp.task(
    'watch',
    gulp.parallel('serve', () => {
        // html changes
        gulp.watch(html.watch, gulp.series('html', 'reload'));
        // image changes
        gulp.watch(images.in, gulp.series('images'));

    })
);

// default task
gulp.task(
    'default',
    gulp.parallel(
        'html', 'images',
        gulp.series('watch')
    )
);
