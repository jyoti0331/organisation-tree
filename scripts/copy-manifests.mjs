import { copyFileSync } from 'node:fs';
for (const name of ['core', 'organisation'])
  copyFileSync(`packages/${name}/package.json`, `dist/${name}/package.json`);
