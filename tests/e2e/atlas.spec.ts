import { expect, test, type Page } from '@playwright/test';

type Ent = {
  id: string;
  name_ptbr: string;
  category: string;
  categories: string[];
  related: { id: string }[];
  image: { main: string | null; thumb: string | null; icon: string | null; gallery: { src: string }[]; dyes: { src: string }[] };
  stats: { label: string; value: string }[];
};

const target = () => test.info().project.metadata.target as string;

/** Abre o atlas e coleta erros de console e qualquer requisição que não seja local. */
async function open(page: Page, hash = '') {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push('console: ' + m.text());
  });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) problems.push('rede: ' + u);
  });
  await page.goto(target() + hash);
  await expect(page.locator('.site-header')).toBeVisible();
  return problems;
}

const entitiesOf = (page: Page) => page.evaluate(() => (window as unknown as { hyruleAtlas: { entities: Ent[] } }).hyruleAtlas.entities);

test('abre sem internet, sem erros de console e sem requisições remotas', async ({ page }) => {
  const problems = await open(page);
  await expect(page.locator('.card').first()).toBeVisible();
  await page.locator('.card-main').first().click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('modal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Laboratório de Hyrule', exact: true }).click();
  await expect(page.locator('.lab')).toBeVisible();
  await page.getByRole('button', { name: 'Fontes e cobertura', exact: true }).click();
  await expect(page.locator('.about')).toBeVisible();
  await page.waitForTimeout(400);
  expect(problems).toEqual([]);
});

test('contadores refletem a base e o "carregar mais" funciona', async ({ page }) => {
  await open(page);
  const ents = await entitiesOf(page);
  await expect(page.getByTestId('count-total')).toHaveText(String(ents.length));
  await expect(page.getByTestId('count-results')).toHaveText(String(ents.length));
  await expect(page.getByTestId('count-visible')).toHaveText('48');
  await expect(page.locator('.grid > li')).toHaveCount(48);
  await page.getByTestId('load-more').click();
  await expect(page.getByTestId('count-visible')).toHaveText('96');
  await expect(page.locator('.grid > li')).toHaveCount(96);
});

test('cada cartão abre a ficha correta (amostra ampla) e o modal fecha', async ({ page }) => {
  await open(page);
  for (let i = 0; i < 4; i++) await page.getByTestId('load-more').click();
  const cards = page.locator('.card');
  const n = await cards.count();
  for (let i = 0; i < n; i += 9) {
    const card = cards.nth(i);
    const id = await card.getAttribute('data-id');
    const title = (await card.locator('.card-title').textContent())!.trim();
    await card.locator('.card-main').click();
    const modal = page.getByTestId('modal');
    await expect(modal).toHaveAttribute('data-id', id!);
    await expect(modal.locator('#ficha-titulo')).toHaveText(title);
    if (i % 2) await page.getByTestId('modal-close').click();
    else await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  }
  // nenhum elemento invisível bloqueia cliques depois de fechar
  await page.locator('.card-main').first().click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId('modal')).toHaveCount(0);
  await page.locator('.chip[data-cat="armas"]').click();
  await expect(page.locator('.chip[data-cat="armas"]')).toHaveAttribute('aria-pressed', 'true');
});

test('busca em português e em inglês', async ({ page }) => {
  await open(page);
  const search = page.getByRole('searchbox');
  await search.fill('geleca de chulchul');
  await expect(page.locator('.card').first()).toHaveAttribute('data-id', 'botw_material_chuchu_jelly');
  await search.fill('Lord of the Mountain');
  await expect(page.locator('.card').first()).toHaveAttribute('data-id', 'botw_creature_lord_of_the_mountain');
  await search.fill('silex');
  await expect(page.locator('.card[data-id="botw_material_flint"]')).toBeVisible();
  await search.fill('Octo Balloon');
  await expect(page.locator('.card').first()).toHaveAttribute('data-id', 'botw_material_octo_balloon');
  await search.fill('zzzz-inexistente');
  await expect(page.locator('.empty')).toBeVisible();
});

test('filtros por categoria, subcategoria e características', async ({ page }) => {
  await open(page);
  const ents = await entitiesOf(page);
  await page.locator('.chip[data-cat="armas"]').click();
  const armas = ents.filter((e) => e.categories.includes('armas')).length;
  await expect(page.getByTestId('count-results')).toHaveText(String(armas));
  const cats = await page.locator('.card-cat').allTextContents();
  expect(cats.every((c) => c.startsWith('Armas'))).toBe(true);
  await page.getByTestId('sub-select').selectOption('lancas');
  const lancas = await page.locator('.card-cat').allTextContents();
  expect(lancas.length).toBeGreaterThan(0);
  expect(lancas.every((c) => c.includes('Lanças'))).toBe(true);

  await page.locator('.chip[data-cat="todos"]').click();
  await page.getByTestId('f-elemental').click();
  const nEl = Number(await page.getByTestId('count-results').textContent());
  expect(nEl).toBeGreaterThan(0);
  expect(nEl).toBeLessThan(ents.length);
  const badges = await page.locator('.card').evaluateAll((els) => els.every((el) => el.querySelector('.b-elemental')));
  expect(badges).toBe(true);
  await page.getByTestId('f-elemental').click();
  await page.getByTestId('f-curiosidades').click();
  expect(Number(await page.getByTestId('count-results').textContent())).toBeGreaterThan(0);
});

test('ordenação por nome e por ataque', async ({ page }) => {
  await open(page);
  await page.getByTestId('sort-select').selectOption('nome_za');
  const za = await page.locator('.card-title').allTextContents();
  expect(za[0].localeCompare(za[za.length - 1], 'pt')).toBeGreaterThan(0);
  await page.getByTestId('sort-select').selectOption('nome_az');
  const az = await page.locator('.card-title').allTextContents();
  expect(az[0].localeCompare(az[az.length - 1], 'pt')).toBeLessThan(0);

  await page.locator('.chip[data-cat="armas"]').click();
  await page.getByTestId('sort-select').selectOption('ataque');
  const ids = await page.locator('.card').evaluateAll((els) => els.map((el) => el.getAttribute('data-id')!));
  const ents = await entitiesOf(page);
  const atk = (id: string) => parseInt(ents.find((e) => e.id === id)!.stats.find((s) => s.label === 'Ataque')?.value ?? '-1', 10);
  for (let i = 1; i < ids.length; i++) expect(atk(ids[i - 1])).toBeGreaterThanOrEqual(atk(ids[i]));
});

test('favoritos persistem após recarregar', async ({ page }) => {
  await open(page);
  const card = page.locator('.card').nth(2);
  const id = await card.getAttribute('data-id');
  await card.locator('.fav').click();
  await expect(card.locator('.fav')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByTestId('f-fav').click();
  await expect(page.getByTestId('count-results')).toHaveText('1');
  await expect(page.locator('.card').first()).toHaveAttribute('data-id', id!);
  await page.locator('.card .fav').first().click();
  await expect(page.getByTestId('count-results')).toHaveText('0');
});

test('navegação por teclado: abrir com Enter, fechar com Escape e foco preso no modal', async ({ page }) => {
  await open(page);
  await page.locator('.card-main').first().focus();
  await page.keyboard.press('Enter');
  const modal = page.getByTestId('modal');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('modal-close')).toBeFocused();
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('.modal'));
  expect(inside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
});

test('itens relacionados levam a fichas válidas', async ({ page }) => {
  await open(page, '#/?item=botw_material_chuchu_jelly');
  const modal = page.getByTestId('modal');
  await expect(modal).toHaveAttribute('data-id', 'botw_material_chuchu_jelly');
  const rel = modal.locator('[data-related]').first();
  const relId = await rel.getAttribute('data-related');
  await rel.click();
  await expect(modal).toHaveAttribute('data-id', relId!);
  const ents = await entitiesOf(page);
  const ids = new Set(ents.map((e) => e.id));
  const broken = ents.flatMap((e) => e.related.filter((r) => !ids.has(r.id)).map((r) => `${e.id}→${r.id}`));
  expect(broken).toEqual([]);
});

test('todas as imagens locais carregam', async ({ page }) => {
  await open(page);
  const result = await page.evaluate(async () => {
    const w = window as unknown as { hyruleAtlas: { entities: Ent[] }; __ATLAS_IMG__?: Record<string, string> };
    const paths = new Set<string>();
    for (const e of w.hyruleAtlas.entities) {
      const im = e.image;
      for (const p of [im.main, im.icon, ...im.gallery.map((g) => g.src), ...im.dyes.map((d) => d.src)]) if (p) paths.add(p);
      if (!w.__ATLAS_IMG__ && im.thumb) paths.add(im.thumb);
    }
    const resolve = (p: string) => (w.__ATLAS_IMG__ ? w.__ATLAS_IMG__[p] : p);
    const failures: string[] = [];
    const list = [...paths];
    for (let i = 0; i < list.length; i += 60) {
      await Promise.all(
        list.slice(i, i + 60).map(
          (p) =>
            new Promise<void>((res) => {
              const src = resolve(p);
              if (!src) {
                failures.push(p + ' (não embutida)');
                return res();
              }
              const img = new Image();
              img.onload = () => {
                if (!img.naturalWidth) failures.push(p + ' (vazia)');
                res();
              };
              img.onerror = () => {
                failures.push(p);
                res();
              };
              img.src = src;
            }),
        ),
      );
    }
    return { total: list.length, failures };
  });
  expect(result.total).toBeGreaterThan(1500);
  expect(result.failures).toEqual([]);
  // e as imagens efetivamente exibidas nos cartões
  const broken = await page.locator('.card-media img').evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => i.complete && !i.naturalWidth).length);
  expect(broken).toBe(0);
});

test('Laboratório: experimento e navegação inversa', async ({ page }) => {
  await open(page, '#/laboratorio/botw_material_chuchu_jelly');
  await page.locator('[data-lab-action="fogo"]').click();
  const res = page.getByTestId('lab-result');
  await expect(res.locator('.interaction')).toHaveAttribute('data-action', 'fogo');
  await expect(res).toContainText('Geleca ígnea');
  await page.locator('[data-question="fogo"]').click();
  expect(Number((await page.getByTestId('reverse-count').textContent())!.split(' ')[0])).toBeGreaterThan(0);
  await page.locator('[data-question="flutua"]').click();
  expect(Number((await page.getByTestId('reverse-count').textContent())!.split(' ')[0])).toBeGreaterThan(0);
  await page.locator('.answer').first().click();
  await expect(page.locator('.bench-head h3')).toBeVisible();
});

test('layout de celular sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.locator('.card-main').first().click();
  const box = await page.getByTestId('modal').boundingBox();
  expect(box!.width).toBeGreaterThan(370);
  const overflowModal = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflowModal).toBeLessThanOrEqual(1);
});
