// Include gulp and plugins
import {createRequire} from 'module'
import gulp from 'gulp';
import del from 'del';
import browserSync from 'browser-sync';

const require = createRequire(import.meta.url)

const $ = require('gulp-load-plugins')({
  lazy: true,
})


const bs = browserSync.create();
const reload = bs.reload;

const loadGulpImage = async () => await import('gulp-image');

// file locations
const devBuild = (process.env.NODE_ENV || "development").trim().toLowerCase() !== "production";

const source = "./";
const dest = devBuild ? "builds/development/" : "builds/production/";

const html = {
    partials: [source + "_partials/**/*"],
    in: [source + "*.html"],
    watch: ["*.html", "_partials/**/*"],
    out: dest,
    context: {
        devBuild: devBuild,
    },
};

const images = {
    in: [source + "assets/img/**/*"],
    out: dest + "assets/img/",
};

const syncOpts = {
    server: {
        baseDir: dest,
        index: "index.html",
    },
    open: false,
    injectChanges: true,
    reloadDelay: 0,
    notify: true,
};

// Constants for optimization settings
const IMAGE_OPTIMIZATION_SETTINGS = {
    optipng: ['-i 1', '-strip all', '-fix', '-o7', '-force'],
    pngquant: ['--speed=1', '--force', 256],
    zopflipng: ['-y', '--lossy_8bit', '--lossy_transparent'],
    jpegRecompress: ['--strip', '--quality', 'medium', '--loops', 15, '--min', 30, '--max', 60],
    mozjpeg: ['-optimize', '-progressive'],
    gifsicle: ['--optimize'],
    svgo: ['--enable', 'cleanupIDs', '--disable', 'convertColors'],
    quiet: true
};

const JPEG_OPTIMIZATION_SETTINGS = {
    jpegRecompress: [
        '--strip',
        '--quality',
        'medium',
        '--min',
        40,
        '--max',
        80
    ],
    quiet: true
};

// Helper functions
const cleanTask = (path) => async (cb) => {
    await del(path);
    cb && cb();
};

const imageProcessingPipeline = (settings) => {
    return gulp
        .src(images.in)
        .pipe($.size({ title: 'images in ' }))
        .pipe($.newer(images.out))
        .pipe($.plumber())
        .pipe(settings)
        .pipe($.size({ title: 'images out ' }))
        .pipe(gulp.dest(images.out));
};

// Clean tasks
gulp.task('clean', cleanTask([dest + '**/*']));
gulp.task('clean-images', cleanTask([dest + 'assets/img/**/*']));
gulp.task('clean-html', cleanTask([dest + '**/*.html']));
gulp.task('clean-css', cleanTask([dest + 'css/**/*']));

// Image tasks
gulp.task('images', async () => {
    return imageProcessingPipeline((await loadGulpImage()).default(IMAGE_OPTIMIZATION_SETTINGS));
});

gulp.task('images2', async () => {
    return imageProcessingPipeline($.imageFork.default(IMAGE_OPTIMIZATION_SETTINGS));
});

gulp.task('optimize-images', async () => {
    return imageProcessingPipeline((await loadGulpImage()).default(JPEG_OPTIMIZATION_SETTINGS));
});

// HTML processing pipeline
const processHtml = () => {
    let pipeline = gulp
        .src(html.in)
        .pipe($.newer(html.out))
        .pipe($.preprocess({ context: html.context }));

    if (!devBuild) {
        pipeline = pipeline
            .pipe($.size({ title: 'HTML in' }))
            .pipe($.htmlclean())
            .pipe($.size({ title: 'HTML out' }));
    }

    return pipeline.pipe(gulp.dest(html.out));
};

gulp.task('html', processHtml);

// reload task
gulp.task("reload", (done) => {
    browserSync.reload();
    done();
});

// browser sync
gulp.task("serve", () => {
    browserSync.init(syncOpts);
});

// Watch tasks
const watchTasks = () => {
    gulp.watch(html.watch, gulp.series('html', 'reload'));
    gulp.watch(images.in, gulp.series('images2'));
};

gulp.task('watch', gulp.parallel('serve', watchTasks));

// Default task
gulp.task('default', gulp.parallel('html', 'images2', gulp.series('watch')));