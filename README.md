# Optimize Images

**[Optimize Images](https://github.com/kathirr007/Optimize-Images)** is Image Optimization workflow using gulp for Web Images with best image compression algorithms.

## Usage

-   Run `pnpm install`.
-   Run `gulp` or `pnpm dev` for development.
-   Add the images you want to optimize to the folder "**assets/img**"
-   The optimized images will be stored in the folder "**builds/development/assets/img**"

### Scaffolding

-   Clone this repository
-   Change the remote url
-   Run `pnpm install`
-   Update dependencies with `pnpm dlx npm-check-updates -u`

## What is this repository for?

### Automations added

-   **Optimize images** It will automatically optimize the images placed in "**assets/img**" folder.
-   **Modern derivatives** `gulp images:webp` and `gulp images:avif` generate `.webp` / `.avif` siblings for JPG, PNG and TIFF sources using **sharp** (bundled libvips, no external binaries needed). `gulp images:all` runs the classic optimization plus both derivatives. Quality knobs live in the `modern` config in `gulpfile.js` (`webpOptions`, `avifOptions`).
-   GIF (animation) and SVG (vector) sources are intentionally excluded from WebP/AVIF conversion; they are still optimized in place by the `images` task. Formats `gulp-image` doesn't handle (e.g. WebP input) pass through unmodified.

### Fix npm package gulp-image installation issue for post-install script

Update the host file by adding the following:

GitHub Start
`# 52.74.223.119 github.com`
`# 192.30.253.119 gist.github.com`
`# 54.169.195.247 api.github.com`
`# 185.199.111.153 assets-cdn.github.com`
`151.101.76.133 raw.githubusercontent.com`
GitHub End