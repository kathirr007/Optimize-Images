// Include gulp and plugins
import gulp from 'gulp'
import { deleteAsync } from 'del'
// import $ from 'gulp-load-plugins'
import browserSync from 'browser-sync'
import gulpLoadPlugins from 'gulp-load-plugins';
import path from 'path';
import size from 'gulp-size'
import newer from 'gulp-newer'
import preprocess from 'gulp-preprocess'
import htmlclean from 'gulp-htmlclean'
import plumber from 'gulp-plumber'
import rename from 'gulp-rename'
import sharp from 'sharp'
import { Transform } from 'node:stream'

const __dirname = path.resolve();


const $ = gulpLoadPlugins({
  config: path.resolve(__dirname, 'package.json'),
//   lazy: true,
});

/* $({
    lazy: true,
}); */


browserSync.create();

const loadGulpImage = async () => await import('gulp-image');
const loadGulpImageFork = async () => await import('gulp-image-fork');
const reload = browserSync.reload;

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

// Sources for modern derivatives. GIF is excluded (animation is lost in
// conversion) and SVG is excluded (vector -> raster needs explicit sizing).
// AVIF also accepts WebP input so dropped-in .webp files get an AVIF sibling.
let modern = {
    webpIn: [source + "assets/img/**/*.{jpg,jpeg,png,tiff,tif}"],
    avifIn: [source + "assets/img/**/*.{jpg,jpeg,png,tiff,tif,webp}"],
    out: dest + "assets/img/",
    webpOptions: { quality: 80 },
    avifOptions: { quality: 50, effort: 4 },
};

// Shared optimizer settings (valid for gulp-image AND gulp-image-fork,
// which share the same option keys). Kept here so `images` and `images2`
// can't drift apart.
const IMAGE_OPTIMIZATION_SETTINGS = {
    // PNG: lossy quantize, then ONE lossless pass (optipng).
    // zopflipng alongside optipng is redundant and very slow, and its
    // prebuilt binary is frequently missing on Windows (ENOENT, which
    // aborts the pipe with no output). Enable it only if its vendor
    // binary exists: zopflipng: ['-y', '--lossy_8bit', '--lossy_transparent'],
    pngquant: ['--quality=45-85', '--speed=1', '--strip', '--skip-if-larger'],
    optipng: ['-i', '1', '-strip', 'all', '-fix', '-o2', '-force'],
    zopflipng: false,
    // JPEG: pick ONE of jpegRecompress / mozjpeg. mozjpeg is faster and its
    // binary ships with the npm package; jpegRecompress is stronger but slow
    // and its binary is often missing.
    jpegRecompress: false,
    mozjpeg: ['-optimize', '-progressive'],
    gifsicle: ['--optimize'],
    // svgo expects an options object (or true), NOT a CLI args array.
    // preset-default with removeViewBox: false keeps SVGs rendering.
    svgo: {
        plugins: [
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        removeViewBox: false,
                    },
                },
            },
        ],
    },
    quiet: true,
};

let syncOpts = {
    server: {
        baseDir: dest,
        index: "index.html",
    },
    open: false,
    injectChanges: true,
    reloadDelay: 0,
    notify: true,
};

// Clean tasks
gulp.task("clean", () => {
    return deleteAsync([dest + "**/*"]);
});

gulp.task("clean-images", () => {
    return deleteAsync([dest + "assets/img/**/*"]);
});

gulp.task("clean-html", () => {
    return deleteAsync([dest + "**/*.html"]);
});

gulp.task("clean-css", () => {
    return deleteAsync([dest + "css/**/*"]);
});

// reload task
gulp.task("reload", (done) => {
    browserSync.reload();
    done();
});

// build HTML files
gulp.task("html", () => {
    var page = gulp
        .src(html.in)
        .pipe(newer(html.out))
        .pipe(
            preprocess({
                context: html.context,
            })
        );
    if (!devBuild) {
        page = page
            .pipe(
                size({
                    title: "HTML in",
                })
            )
            .pipe(htmlclean())
            .pipe(
                size({
                    title: "HTML out",
                })
            );
    }
    return page.pipe(gulp.dest(html.out));
});

// manage images
// NOTE (gulp 5): binary files MUST use `{ encoding: false }` on src/dest.
// Without it gulp decodes images as UTF-8, corrupting magic bytes
// (e.g. 0x89 -> EF BF BD) so the output won't open.
// Settings live in IMAGE_OPTIMIZATION_SETTINGS above and are shared with
// `images2`, so both optimizers behave identically.
gulp.task("images", async () => {
    const { default: gulpImage } = await loadGulpImage();

    return (
        gulp
            .src(images.in, { encoding: false })
            .pipe(
                size({
                    title: "images in ",
                })
            )
            .pipe(newer(images.out))
            .pipe(plumber())
            .pipe(gulpImage(IMAGE_OPTIMIZATION_SETTINGS))
            .pipe(
                size({
                    title: "images out ",
                })
            )
            .pipe(gulp.dest(images.out, { encoding: false }))
    );
});

// Same pipeline via gulp-image-fork (main's alternative optimizer, kept as
// an opt-in task). Uses the same fixed settings; zopflipng/jpegRecompress
// stay off because their vendor binaries are often missing (ENOENT).
gulp.task("images2", async () => {
    const { default: gulpImageFork } = await loadGulpImageFork();

    return (
        gulp
            .src(images.in, { encoding: false })
            .pipe(
                size({
                    title: "images2 in ",
                })
            )
            .pipe(newer(images.out))
            .pipe(plumber())
            .pipe(gulpImageFork(IMAGE_OPTIMIZATION_SETTINGS))
            .pipe(
                size({
                    title: "images2 out ",
                })
            )
            .pipe(gulp.dest(images.out, { encoding: false }))
    );
});

gulp.task("optim-images", async function () {
    const { default: gulpImage } = await loadGulpImage();
    return gulp
        .src(images.in, { encoding: false })
        .pipe(
            size({
                title: "Total images in ",
            })
        )
        .pipe(newer(images.out))
        .pipe(plumber())
        .pipe(
            gulpImage({
                // JPEG: mozjpeg's binary ships with the npm package, while
                // jpeg-recompress's prebuilt binary is often missing
                // (ENOENT -> no output). Prefer mozjpeg; enable
                // jpegRecompress only if its vendor binary exists.
                // jpegRecompress: ['--strip', '--quality', 'medium', '--min', '40', '--max', '80'],
                mozjpeg: ['-optimize', '-progressive'],
                // This task targets JPEGs, so switch off the PNG chain
                // (zopflipng's binary is often missing -> ENOENT, no output).
                pngquant: false,
                optipng: false,
                zopflipng: false,
                // guetzli: ['--quality', '85'],
                quiet: true,
            })
        )
        .pipe(
            size({
                title: "Total images out ",
            })
        )
        .pipe(gulp.dest(images.out, { encoding: false }));
});

// `optimize-images` is main's name for the same JPEG-focused task.
gulp.task("optimize-images", gulp.series("optim-images"));
// browser sync
gulp.task("serve", () => {
    browserSync.init(syncOpts);
});

// Convert a vinyl file's contents with sharp, keeping metadata handling to sharp.
const convertWithSharp = (format, sharpOptions) =>
    new Transform({
        objectMode: true,
        transform(file, _enc, cb) {
            if (file.isNull()) {
                return cb(null, file);
            }
            if (file.isStream()) {
                return cb(new Error(`sharp:${format}: streaming is not supported`));
            }
            sharp(file.contents)
                .toFormat(format, sharpOptions)
                .toBuffer()
                .then((data) => {
                    file.contents = data;
                    cb(null, file);
                })
                .catch((err) => cb(new Error(`sharp:${format} ${file.relative}: ${err.message}`)));
        },
    });

// Generate .webp siblings with sharp (bundled libvips, no external binary).
// NOTE: binary-safe `{ encoding: false }` is required here too (gulp 5).
gulp.task("images:webp", () => {
    return gulp
        .src(modern.webpIn, { encoding: false })
        .pipe(
            size({
                title: "webp in ",
            })
        )
        .pipe(newer({ dest: modern.out, ext: ".webp" }))
        .pipe(plumber())
        .pipe(convertWithSharp("webp", modern.webpOptions))
        .pipe(rename({ extname: ".webp" }))
        .pipe(
            size({
                title: "webp out ",
            })
        )
        .pipe(gulp.dest(modern.out, { encoding: false }));
});

// Generate .avif siblings with sharp. Slower than WebP but ~30-50% smaller.
gulp.task("images:avif", () => {
    return gulp
        .src(modern.avifIn, { encoding: false })
        .pipe(
            size({
                title: "avif in ",
            })
        )
        .pipe(newer({ dest: modern.out, ext: ".avif" }))
        .pipe(plumber())
        .pipe(convertWithSharp("avif", modern.avifOptions))
        .pipe(rename({ extname: ".avif" }))
        .pipe(
            size({
                title: "avif out ",
            })
        )
        .pipe(gulp.dest(modern.out, { encoding: false }));
});

// Optimize originals + generate modern derivatives.
gulp.task("images:all", gulp.parallel("images", "images:webp", "images:avif"));

gulp.task(
    "watch",
    gulp.parallel("serve", () => {
        // html changes
        gulp.watch(html.watch, gulp.series("html", "reload"));
        // image changes
        gulp.watch(images.in, gulp.series("images", "images:webp", "images:avif"));
    })
);

// default task
gulp.task("default", gulp.parallel("html", "images:all", gulp.series("watch")));
