import { copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
const matrix = [
  [15, '15.2.10', '4.9.5', 18, '0.12.0'],
  [16, '16.2.12', '5.1.6', 18, '0.13.3'],
  [17, '17.3.12', '5.4.5', 18, '0.14.10'],
  [18, '18.2.14', '5.5.4', 22, '0.14.10'],
  [19, '19.2.25', '5.8.3', 22, '0.15.1'],
  [20, '20.3.30', '5.9.3', 24, '0.15.1'],
  [21, '21.2.22', '5.9.3', 24, '0.16.0'],
  [22, '22.1.5', '6.0.2', 24, '0.16.0'],
];
const root = resolve('.');
function run(command, args, cwd, env = process.env) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', env, maxBuffer: 20 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
function nodeFor(major) {
  if (process.env[`NODE_${major}`]) return process.env[`NODE_${major}`];
  const base = join(homedir(), '.nvm/versions/node');
  const names = existsSync(base)
    ? readdirSync(base)
        .filter((n) => n.startsWith(`v${major}.`))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];
  if (names.length) return join(base, names.at(-1), 'bin/node');
  if (Number(process.versions.node.split('.')[0]) === major) return process.execPath;
  throw new Error(`Install Node ${major} or set NODE_${major} to its executable`);
}
for (const name of ['core', 'organisation', 'angular'])
  run('npm', ['pack', `./dist/${name}`, '--pack-destination', 'dist'], root);
const packageFiles = {};
for (const name of ['core', 'organisation', 'angular']) {
  const file = `dist/organisation-tree-${name}-0.0.0.tgz`;
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);
  packageFiles[name] = `organisation-tree-${name}-${hash}.tgz`;
  copyFileSync(file, `dist/${packageFiles[name]}`);
}
const requested = process.argv.slice(2).map(Number);
const results = [];
for (const [major, version, ts, nodeMajor, zone] of matrix.filter(
  (row) => !requested.length || requested.includes(row[0]),
)) {
  const folder = resolve(`compat/angular-${major}`);
  mkdirSync(folder, { recursive: true });
  try {
    const node = nodeFor(nodeMajor);
    const env = { ...process.env, PATH: `${dirname(node)}:${process.env.PATH}` };
    const dependencies = Object.fromEntries(
      [
        'common',
        'compiler',
        'compiler-cli',
        'core',
        'platform-browser',
        'platform-browser-dynamic',
      ].map((name) => [`@angular/${name}`, version]),
    );
    Object.assign(dependencies, {
      typescript: ts,
      rxjs: '7.8.2',
      tslib: '2.8.1',
      'zone.js': zone,
      '@babel/core': major >= 22 ? '8.0.1' : '7.28.4',
      esbuild: '0.25.10',
    });
    for (const name of ['core', 'organisation', 'angular'])
      dependencies[`@organisation-tree/${name}`] = `file:../../dist/${packageFiles[name]}`;
    writeFileSync(
      join(folder, 'package.json'),
      JSON.stringify(
        { name: `compat-angular-${major}`, private: true, type: 'module', dependencies },
        null,
        2,
      ),
    );
    console.log(`Angular ${version}: installing isolated consumer with Node ${nodeMajor}`);
    // Remove only local library copies: rebuilding a same-version tarball must not reuse stale installed output.
    run(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import{rmSync}from'node:fs';rmSync('node_modules/@organisation-tree',{recursive:true,force:true});",
      ],
      folder,
    );
    run('npm', ['install', '--no-audit', '--no-fund'], folder, env);
    const providers =
      major >= 20
        ? 'provideZonelessChangeDetection'
        : major >= 18
          ? 'provideExperimentalZonelessChangeDetection'
          : null;
    writeFileSync(
      join(folder, 'main.ts'),
      `
import { Component, NgModule, ${providers ? providers + ',' : ''} } from '@angular/core';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { OrganisationPickerComponent, OrganisationTreeModule } from '@organisation-tree/angular';
import { OrganisationController } from '@organisation-tree/organisation';
import { MockSource } from './mock-source';
const source=new MockSource(4); source.latency=30;
const controller=new OrganisationController(source,'compat',{timeoutMs:1000});
const template='<ot-organisation-picker [controller]="controller"></ot-organisation-picker>';
@Component({selector:'standalone-app',standalone:true,imports:[OrganisationPickerComponent],template})
class StandaloneApp { controller=controller; }
@Component({selector:'module-app',standalone:false,template})
class ModuleApp { controller=controller; }
@NgModule({imports:[BrowserModule,OrganisationTreeModule],declarations:[ModuleApp],bootstrap:[ModuleApp]})
class AppModule {}
async function start(){
 const params=new URLSearchParams(location.search);const zoneless=params.has('zoneless');
 if(!zoneless) await import('./zone-entry');
 if(params.get('mode')==='module'){document.body.appendChild(document.createElement('module-app'));await platformBrowserDynamic().bootstrapModule(AppModule);}
 else {document.body.appendChild(document.createElement('standalone-app'));await bootstrapApplication(StandaloneApp,{providers:zoneless?[${providers ? providers + '()' : ''}]:[]});}
 document.body.dataset['ready']='true';
}
start().catch(error=>{document.body.dataset['error']=String(error);console.error(error);});
`,
    );
    writeFileSync(join(folder, 'zone-entry.ts'), "import 'zone.js'; export {};\n");
    writeFileSync(join(folder, 'mock-source.ts'), readFileSync('demo/src/mock-source.ts'));
    writeFileSync(
      join(folder, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ES2022',
            moduleResolution: 'node',
            experimentalDecorators: true,
            useDefineForClassFields: false,
            strict: true,
            skipLibCheck: true,
            types: [],
            outDir: 'compiled',
            ...(major >= 22 ? { ignoreDeprecations: '6.0' } : {}),
          },
          angularCompilerOptions: { strictTemplates: true },
          files: ['main.ts'],
        },
        null,
        2,
      ),
    );
    run(
      node,
      ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'tsconfig.json'],
      folder,
      env,
    );
    writeFileSync(
      join(folder, 'bundle.mjs'),
      `
import {build} from 'esbuild';import {transformAsync} from '@babel/core';import linker from '@angular/compiler-cli/linker/babel';import {readFile} from 'node:fs/promises';
await build({entryPoints:['compiled/main.js'],bundle:true,format:'esm',outfile:'app.js',plugins:[{name:'angular-linker',setup(build){build.onLoad({filter:/\\.[cm]?js$/},async args=>{const code=await readFile(args.path,'utf8');if(!code.includes('ɵɵngDeclare'))return;const result=await transformAsync(code,{filename:args.path,plugins:[[linker,{linkerJitMode:false}]],configFile:false,babelrc:false});return {contents:result.code,loader:'js'};});}}]});
`,
    );
    run(node, ['bundle.mjs'], folder, env);
    writeFileSync(
      join(folder, 'index.html'),
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Angular compatibility</title></head><body><script type="module" src="app.js"></script></body></html>',
    );
    results.push({
      major,
      version,
      typescript: ts,
      node: run(node, ['--version'], folder).trim(),
      build: 'passed',
      browser: 'pending',
      zoneless: !!providers,
    });
    console.log(`Angular ${version}: AOT compilation and linking passed`);
  } catch (error) {
    results.push({ major, version, build: 'failed', error: String(error) });
    console.error(String(error));
  }
}
mkdirSync('docs', { recursive: true });
const prior = existsSync('docs/compatibility.json')
  ? JSON.parse(readFileSync('docs/compatibility.json', 'utf8'))
  : [];
writeFileSync(
  'docs/compatibility.json',
  JSON.stringify(
    [...prior.filter((old) => !results.some((row) => row.major === old.major)), ...results].sort(
      (a, b) => a.major - b.major,
    ),
    null,
    2,
  ) + '\n',
);
if (results.some((row) => row.build !== 'passed')) process.exitCode = 1;
