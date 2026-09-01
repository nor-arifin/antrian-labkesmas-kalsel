import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

await build({
  entryPoints: [join(root, 'server', 'index.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node16',
  outfile: join(root, 'electron', 'server.bundle.cjs'),
  external: ['sql.js', 'pdfkit'],
  banner: {
    js: 'globalThis.__dirname = globalThis.__dirname || __dirname;'
  },
  logLevel: 'info'
});

console.log('[prepare-electron] server.bundle.cjs siap');
