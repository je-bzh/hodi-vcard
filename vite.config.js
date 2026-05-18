import { defineConfig } from 'vite';
import { resolve } from 'path';
import { glob } from 'glob';
import externalGlobals from 'rollup-plugin-external-globals';
import handlebars from 'vite-plugin-handlebars';
import createExternal from 'vite-plugin-external';
import sassGlobImports from 'vite-plugin-sass-glob-import';
import { watchAndRun } from 'vite-plugin-watch-and-run';

const root = resolve(__dirname, 'src');
const outDir = resolve(__dirname, 'build');
// index.html EST la home (page d'accueil servie sur /) — incluse dans le build.
const htmlFilesToBuild = glob.sync(resolve(root, './*.html').replace(/\\/g, '/'));

export default defineConfig(({ command }) => ({
	// En build (prod) on déploie sous www.hodi.live/vcard/ → les assets sont
	// préfixés /vcard/. En dev (npm run dev) on garde la racine pour /.
	base: command === 'build' ? '/vcard/' : '',
	root,
	// .env vit à la racine du projet, pas dans src/
	envDir: resolve(__dirname, '.'),
	server: {
		open: '/',
		host: '127.0.0.1',
	},
	build: {
		outDir,
		rollupOptions: {
			input: htmlFilesToBuild,
			output: {
				assetFileNames: (assetInfo) => {
					const extType = assetInfo.name.split('.').pop();
					const isCSS = extType == 'css';

					return isCSS ? `assets/style.[ext]` : `assets/[name].[ext]`; // Hacky solution to fix issues with build file names.
				},
				entryFileNames: () => {
					const areMoreThanOneHTMLs = htmlFilesToBuild.length > 1;

					return areMoreThanOneHTMLs ? `assets/[name].js` : 'assets/app.js'; // Hacky solution to fix issues with build file names.
				},
				chunkFileNames: 'assets/app.js',
			},
		},
		emptyOutDir: true,
		minify: false,
	},
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler',
				silenceDeprecations: ['import', 'global-builtin']
			}
		}
	},
	plugins: [
		// Intercepte les requêtes Chrome DevTools "workspace auto-detect"
		// (sinon vite-plugin-list-directory-contents plante en ENOENT sur ce path)
		{
			name: 'chrome-devtools-workspace-stub',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if (req.url && req.url.startsWith('/.well-known/appspecific/com.chrome.devtools.json')) {
						res.statusCode = 404;
						res.end();
						return;
					}
					next();
				});
			},
		},
		handlebars({
			partialDirectory: resolve(root, 'partials'),
		}),
		externalGlobals(
			{
				jquery: 'jQuery',
			},
			{
				include: ['*.js', '*.ts', '*.jsx', '*.tsx', '*.vue'],
			}
		),
		createExternal({
			externals: {
				jquery: 'jQuery',
			},
		}),
		sassGlobImports(),
		watchAndRun([
			{
				watch: '**/scss/**/*.scss',
				watchKind: 'add',
				run: 'touch ./src/scss/style.scss',
				quiet: true,
			},
		]),
	],
}));
