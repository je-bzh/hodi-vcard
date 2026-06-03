import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync, readdirSync, rmSync } from 'fs';
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
	// Base RELATIVE → un seul build qui marche quel que soit le point de montage :
	// racine du domaine en local (https://www.vcard.localhost/) ET sous-dossier en
	// prod (https://www.hodi.live/vcard/). Les assets HTML/CSS sont référencés en
	// relatif ; le JS calcule sa base absolue au runtime (cf. utils/urls.js appBase()).
	base: './',
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
				// Hash de contenu dans le nom → cache-busting automatique. Vite
				// réécrit les références dans le HTML/CSS, donc les <script>/<link>
				// pointent toujours sur le bon fichier. (Les assets verbatim de
				// public/, référencés au runtime via assetUrl(), restent non-hashés.)
				assetFileNames: 'assets/[name]-[hash][extname]',
				entryFileNames: 'assets/[name]-[hash].js',
				chunkFileNames: 'assets/[name]-[hash].js',
			},
		},
		// On NE vide PAS tout le dossier : build/uploads/ (fichiers utilisateurs)
		// doit survivre aux rebuilds. Le nettoyage sélectif est fait par le plugin
		// clean-build-keep-uploads ci-dessous.
		emptyOutDir: false,
		minify: 'esbuild', // réduit nettement le poids/parse du bundle (perf de chargement)
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
		// Vide build/ SAUF build/uploads/ (uploads utilisateurs) avant chaque build.
		// Remplace emptyOutDir pour ne pas effacer les fichiers servis en statique.
		{
			name: 'clean-build-keep-uploads',
			apply: 'build',
			buildStart() {
				if (!existsSync(outDir)) return;
				for (const entry of readdirSync(outDir)) {
					if (entry === 'uploads') continue;
					rmSync(resolve(outDir, entry), { recursive: true, force: true });
				}
			},
		},
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
