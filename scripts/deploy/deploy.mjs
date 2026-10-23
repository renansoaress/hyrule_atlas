// Publica o Hyrule Atlas no servidor (mesmo modelo do ReSo):
//   1. empacota release/Hyrule-Atlas-Offline/ + downloads (HTML único e ZIP) num .tar.gz;
//   2. envia por scp para uma pasta de chegada e, por ssh, troca a pasta publicada de uma vez;
//   3. na primeira vez instala o botw_web.service (servidor Python em localhost), o site do
//      nginx e o certificado HTTPS (certbot); nas seguintes só reinicia o serviço.
//
// Uso: node scripts/deploy/deploy.mjs [--build] [--dry-run]
//   --build    roda o build completo antes (node scripts/build-all.mjs)
//   --dry-run  só monta o pacote e mostra o script remoto, sem enviar nada
//
// O servidor vem de scripts/deploy/deploy.local.json (ignorado pelo git; modelo em deploy.example.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { p, log, readJson, listFiles } from '../lib/util.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const cfgFile = p('scripts/deploy/deploy.local.json');
if (!fs.existsSync(cfgFile)) throw new Error('crie scripts/deploy/deploy.local.json a partir de deploy.example.json');
const cfg = readJson(cfgFile);
const { server, port = 22, webPath, domain, localPort = 5510 } = cfg;
if (!server || !webPath || !domain) throw new Error('deploy.local.json precisa de server, webPath e domain');

const run = (cmd, cmdArgs, opts = {}) => {
  const r = spawnSync(cmd, cmdArgs, { stdio: opts.input ? ['pipe', 'inherit', 'inherit'] : 'inherit', ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} saiu com código ${r.status}`);
};

if (args.includes('--build')) run(process.execPath, [p('scripts/build-all.mjs')]);

const folder = p('release/Hyrule-Atlas-Offline');
const single = p('release/Hyrule-Atlas-Offline.html');
const zip = p('release/Hyrule-Atlas-Offline.zip');
for (const f of [folder, single, zip]) if (!fs.existsSync(f)) throw new Error(`não encontrado: ${f} — rode o build antes (ou use --build)`);

// ---------------------------------------------------------------- pacote
const work = p('build-cache', 'deploy');
const site = path.join(work, 'site');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(path.join(site, 'downloads'), { recursive: true });
fs.cpSync(folder, site, { recursive: true });
fs.copyFileSync(single, path.join(site, 'downloads', 'Hyrule-Atlas-Offline.html'));
fs.copyFileSync(zip, path.join(site, 'downloads', 'Hyrule-Atlas-Offline.zip'));
// caminhos relativos e cwd: o GNU tar trataria "D:\..." como host remoto
run('tar', ['-czf', 'botw-web.tar.gz', '-C', 'site', '.'], { cwd: work });

const webDir = path.posix.dirname(webPath);
const serveScript = `${webDir}/botw_serve_web.py`;
const template = (file) =>
  fs
    .readFileSync(p('scripts/deploy', file), 'utf8')
    .replaceAll('botw.renans.dev', domain)
    .replaceAll('5510', String(localPort))
    .replaceAll('/root/projects/botw_serve_web.py', `/root/${serveScript}`)
    .replaceAll('/root/projects/botw_web', `/root/${webPath}`)
    .replaceAll('WorkingDirectory=/root/projects', `WorkingDirectory=/root/${webDir}`);
fs.writeFileSync(path.join(work, 'botw_web.service'), template('botw_web.service'));
fs.writeFileSync(path.join(work, 'botw_web.conf'), template('nginx-botw.conf'));
fs.copyFileSync(p('scripts/deploy/serve_web.py'), path.join(work, 'serve_web.py'));

const files = listFiles(site).length;
const mb = (fs.statSync(path.join(work, 'botw-web.tar.gz')).size / 1048576).toFixed(1);
log(`pacote: ${files} arquivos, ${mb} MB comprimido`);

// ---------------------------------------------------------------- script remoto
const arrival = `botw-deploy-${Date.now()}`;
const remote = `set -e
cd ~
c='${arrival}'
w='${webPath}'
rm -rf "$w.new" "$w.old"
mkdir -p "$w.new"
tar -xzf "$c/botw-web.tar.gz" -C "$w.new"
mkdir -p "$(dirname "$w")"
mv -f "$c/serve_web.py" '${serveScript}'
[ -d "$w" ] && mv "$w" "$w.old"
mv "$w.new" "$w"
rm -rf "$w.old"
echo "web: ~/$w atualizada ($(find "$w" -type f | wc -l) arquivos)"

# serviço systemd (instala ou atualiza a unidade quando mudou)
unit=/etc/systemd/system/botw_web.service
if ! cmp -s "$c/botw_web.service" "$unit"; then
  cp "$c/botw_web.service" "$unit"
  systemctl daemon-reload
  systemctl enable botw_web.service >/dev/null 2>&1
  echo 'serviço: botw_web.service instalado/atualizado'
fi
systemctl restart botw_web.service
sleep 1
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${localPort}/ || true)
echo "serviço: http://127.0.0.1:${localPort}/ respondeu $code"
[ "$code" = 200 ] || { systemctl status botw_web.service --no-pager | tail -20; exit 1; }

# site do nginx + HTTPS (só na primeira vez; depois o certbot cuida das renovações)
conf=/etc/nginx/sites-available/botw_web.conf
if [ ! -f "$conf" ]; then
  cp "$c/botw_web.conf" "$conf"
  ln -sf "$conf" /etc/nginx/sites-enabled/botw_web.conf
  nginx -t
  systemctl reload nginx
  echo "nginx: site ${domain} criado"
  if [ ! -d /etc/letsencrypt/live/${domain} ]; then
    certbot --nginx -d ${domain} --non-interactive --agree-tos --redirect
  fi
  nginx -t && systemctl reload nginx
fi
rm -rf "$c"
echo 'deploy concluído'
`;

if (dryRun) {
  log('--dry-run: nada foi enviado. Script remoto:');
  console.log(remote);
  process.exit(0);
}

log(`enviando para ${server}:${port} → ~/${webPath} (${domain})`);
run('ssh', ['-p', String(port), '-o', 'BatchMode=yes', server, `mkdir -p ~/${arrival}`]);
run('scp', ['-P', String(port), '-o', 'BatchMode=yes', 'botw-web.tar.gz', 'serve_web.py', 'botw_web.service', 'botw_web.conf', `${server}:${arrival}/`], { cwd: work });
run('ssh', ['-p', String(port), '-o', 'BatchMode=yes', server, 'bash -s'], { input: remote.replace(/\r/g, '') });

// ---------------------------------------------------------------- verificação pública
const url = `https://${domain}/`;
try {
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  const ok = res.ok && html.includes('Hyrule Atlas');
  log(`${url} → HTTP ${res.status}${ok ? ' (Hyrule Atlas no ar)' : ' — conteúdo inesperado'}`);
  if (!ok) process.exit(1);
} catch (e) {
  log(`não consegui verificar ${url}: ${e.message}`);
  process.exit(1);
}
