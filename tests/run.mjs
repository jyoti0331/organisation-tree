import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

await mkdir('.angular', { recursive: true });
const directory = await mkdtemp('.angular/tree-tests-');
try {
  const outfile = `${directory}/regression.mjs`;
  await build({ entryPoints: ['tests/regression.ts'], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  await import(pathToFileURL(`${process.cwd()}/${outfile}`).href);
} finally {
  await rm(directory, { recursive: true, force: true });
}
