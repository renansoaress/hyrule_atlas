import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Os testes rodam contra a VERSÃO DISTRIBUÍDA, aberta por file:// e sem rede:
//   pasta  -> release/Hyrule-Atlas-Offline/index.html
//   único  -> release/Hyrule-Atlas-Offline.html
// nos navegadores Google Chrome e Microsoft Edge instalados na máquina.
const folder = pathToFileURL(path.resolve('release/Hyrule-Atlas-Offline/index.html')).href;
const single = pathToFileURL(path.resolve('release/Hyrule-Atlas-Offline.html')).href;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'reports/e2e-results.json' }]],
  use: {
    offline: true,
    viewport: { width: 1360, height: 900 },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chrome-pasta', use: { channel: 'chrome' }, metadata: { target: folder } },
    { name: 'chrome-arquivo-unico', use: { channel: 'chrome' }, metadata: { target: single } },
    { name: 'edge-pasta', use: { channel: 'msedge' }, metadata: { target: folder } },
    { name: 'edge-arquivo-unico', use: { channel: 'msedge' }, metadata: { target: single } },
  ],
});
