/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import path from 'path';
import { test, expect } from './npmTest';
import fs from 'fs';
import vm from 'vm';

test('installs local packages', async ({ registry, exec, tmpWorkspace }) => {
  const packages = ['playwright', 'playwright-core', 'playwright-chromium', 'playwright-firefox', 'playwright-webkit', '@playwright/test', '@playwright/browser-chromium', '@playwright/browser-firefox', '@playwright/browser-webkit'];
  await exec('npm i --foreground-scripts', ...packages, { env: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });

  const output = await exec('node', path.join(__dirname, '..', '..', 'utils', 'workspace.js'), '--get-version');
  const expectedPlaywrightVersion = output.trim();
  for (const pkg of packages) {
    await test.step(`check version and installation location of ${pkg}`, async () => {
      registry.assertLocalPackage(pkg);
      const result = await exec('node', '--eval', '"console.log(JSON.stringify(require.resolve(process.argv[1])))"', pkg);
      const pkgJsonPath = fs.realpathSync(path.join(path.dirname(JSON.parse(result)), 'package.json'));
      expect(pkgJsonPath.startsWith(fs.realpathSync(path.join(tmpWorkspace, 'node_modules')))).toBeTruthy();
      const installedVersion = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8')).version;
      expect(installedVersion).toBe(expectedPlaywrightVersion);
    });
  }
});

test('installs generated injected script source', async ({ exec, tmpWorkspace }) => {
  await exec('npm i --foreground-scripts', 'playwright-core', { env: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });

  const generatedSourcePath = path.join(tmpWorkspace, 'node_modules', 'playwright-core', 'src', 'generated', 'injectedScriptSource.ts');
  const generatedSource = await fs.promises.readFile(generatedSourcePath, 'utf8');
  const prefix = 'export const source = ';
  expect(generatedSource.startsWith(prefix)).toBeTruthy();
  expect(generatedSource.endsWith(';')).toBeTruthy();

  const source = JSON.parse(generatedSource.slice(prefix.length, -1));
  const injectedModule = { exports: {} as { InjectedScript?: () => { prototype: { captureAriaSnapshot?: unknown } } } };
  vm.runInNewContext(source, { module: injectedModule, exports: injectedModule.exports });
  const InjectedScript = injectedModule.exports.InjectedScript?.();
  expect(typeof InjectedScript?.prototype.captureAriaSnapshot).toBe('function');
});
