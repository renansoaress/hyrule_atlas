// Build completo sem depender do npm: dados -> validação -> typecheck -> Vite -> distribuição offline -> relatórios.
// Uso: node scripts/build-all.mjs [--strict] [--skip-validate]
// (Não acessa a internet. Para reimportar as fontes, veja "Atualizar dados" no README.)
import { spawnSync } from 'node:child_process';
import { p, log } from './lib/util.mjs';

const strict = process.argv.includes('--strict');
const skipValidate = process.argv.includes('--skip-validate');
const node = process.execPath;
const steps = [
  ['nomes PT-BR', [p('scripts/build/names.mjs')]],
  ['dados do atlas', [p('scripts/build/build-data.mjs')]],
  ...(skipValidate ? [] : [['validação das fichas', [p('scripts/validate/content.mjs'), '--quiet']], ['validação da base', [p('scripts/validate/validate.mjs'), ...(strict ? ['--strict'] : [])]]]),
  ['checagem de tipos', [p('node_modules/typescript/bin/tsc'), '-p', p('tsconfig.json')]],
  ['build web (Vite)', [p('node_modules/vite/bin/vite.js'), 'build']],
  ['distribuição offline', [p('scripts/offline/build-offline.mjs')]],
  ...(skipValidate ? [] : [['validação da distribuição', [p('scripts/validate/validate.mjs'), '--dist', ...(strict ? ['--strict'] : [])]]]),
  ['relatório de cobertura', [p('scripts/report/coverage.mjs')]],
  ['relatório de fontes e créditos', [p('scripts/report/credits.mjs')]],
];
for (const [name, args] of steps) {
  log(`▶ ${name}`);
  const r = spawnSync(node, args, { stdio: 'inherit', cwd: p() });
  if (r.status !== 0) {
    log(`✗ falhou: ${name}`);
    process.exit(r.status ?? 1);
  }
}
log('✓ build completo — release/Hyrule-Atlas-Offline.html, release/Hyrule-Atlas-Offline/ e release/Hyrule-Atlas-Offline.zip');
