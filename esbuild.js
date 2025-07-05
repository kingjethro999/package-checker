const esbuild = require("esbuild");
const fs = require('fs-extra');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function buildCLI() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/cli.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/cli.js',
		banner: {
			js: '#!/usr/bin/env node'
		},
		external: ['fs', 'path', 'child_process', 'readline'], // Node.js built-in modules
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});
	
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

async function main() {
	console.log('Building CLI...');
	await buildCLI();
	
	// Make the CLI executable
	if (fs.existsSync('dist/cli.js')) {
		fs.chmodSync('dist/cli.js', 0o755);
		console.log('✅ CLI built successfully!');
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
