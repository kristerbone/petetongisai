import adapter from 'svelte-kit-sst';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),

			// Local dev reads the repo-root .env (MODAL_* etc.); on AWS, SST sets them from Secrets
			env: { dir: '..' },

			// SST's generated Resource types (linked secrets, table, bucket)
			typescript: { config: (c) => void c.include.push('../sst-env.d.ts') }
		})
	]
});
