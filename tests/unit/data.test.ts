import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { atlas, byId, entities, normalize, search } from '../../src/lib/data';
import { buildHash, parseHash } from '../../src/lib/router';

const root = path.resolve(__dirname, '..', '..');

describe('integridade da base', () => {
  it('não tem ids duplicados', () => {
    expect(new Set(entities.map((e) => e.id)).size).toBe(entities.length);
  });

  it('contadores do meta batem com as entidades', () => {
    expect(atlas.meta.total).toBe(entities.length);
    const sum = Object.values(atlas.meta.counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(entities.length);
  });

  it('cobre todas as categorias do inventário de referência', () => {
    const expected: Record<string, number> = {
      armas: 128,
      arcos: 26,
      flechas: 7,
      escudos: 33,
      armaduras: 134,
      criaturas: 84,
      monstros: 86,
      culinaria: 189,
      itens_chave: 28,
      runas: 12,
      mecanicas: 25,
      objetos: 9,
      tesouros: 4,
      materiais: 113,
    };
    for (const [k, n] of Object.entries(expected)) expect(atlas.meta.counts[k], k).toBe(n);
  });

  it('itens relacionados e resultados de interações apontam para ids existentes', () => {
    for (const e of entities) {
      for (const r of e.related) expect(byId.has(r.id), `${e.id} → ${r.id}`).toBe(true);
      for (const it of e.interactions) for (const p of it.produces ?? []) expect(byId.has(p), `${e.id} produz ${p}`).toBe(true);
    }
  });

  it('toda entidade tem nome PT-BR, imagem principal local e fonte', () => {
    for (const e of entities) {
      expect(e.name_ptbr.trim().length, e.id).toBeGreaterThan(0);
      expect(['oficial', 'oficial_secundaria', 'nao_oficial']).toContain(e.name_status);
      expect(e.image.main, e.id).toBeTruthy();
      expect(e.sources.length, e.id).toBeGreaterThan(0);
    }
  });

  it('todas as imagens referenciadas existem em public/', () => {
    const missing: string[] = [];
    for (const e of entities) {
      for (const p of [e.image.main, e.image.thumb, e.image.icon, ...e.image.gallery.map((g) => g.src), ...e.image.dyes.map((d) => d.src)]) {
        if (!p) continue;
        expect(p).not.toMatch(/^https?:|^\/\//);
        if (!fs.existsSync(path.join(root, 'public', p))) missing.push(p);
      }
    }
    expect(missing).toEqual([]);
  });

  it('interações confirmadas ou sem efeito citam fontes resolvidas', () => {
    for (const e of entities) {
      const keys = new Set(e.sources.map((s) => s.key));
      for (const it of e.interactions) {
        if (it.status === 'confirmado' || it.status === 'sem_efeito') {
          expect(it.sources?.length, `${e.id}/${it.action}`).toBeGreaterThan(0);
          for (const k of it.sources ?? []) expect(keys.has(k), `${e.id}/${it.action}: ${k}`).toBe(true);
        }
      }
    }
  });

  it('nomes PT-BR são únicos', () => {
    const names = entities.map((e) => e.name_ptbr.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('busca', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalize('Gélida  ÍGNEA')).toBe('gelida ignea');
  });
  it('encontra pelo nome em português', () => {
    expect(search('geleca de chulchul')[0].id).toBe('botw_material_chuchu_jelly');
  });
  it('encontra pelo nome em inglês', () => {
    expect(search('Lord of the Mountain')[0].id).toBe('botw_creature_lord_of_the_mountain');
    expect(search('chuchu jelly')[0].id).toBe('botw_material_chuchu_jelly');
  });
  it('ignora acentos digitados ou ausentes', () => {
    expect(search('silex').map((e) => e.id)).toContain('botw_material_flint');
    expect(search('Espada mestra')[0].id).toBe('botw_weapon_master_sword');
  });
  it('encontra por efeito ou comportamento descrito nas fichas', () => {
    const r = search('Magnetis').map((e) => e.id);
    expect(r).toContain('botw_rune_magnesis');
    expect(r.length).toBeGreaterThan(20);
  });
  it('restringe ao conjunto filtrado', () => {
    const armas = entities.filter((e) => e.category === 'armas');
    expect(search('espada', armas).every((e) => e.category === 'armas')).toBe(true);
  });
});

describe('roteamento por hash', () => {
  it('ida e volta', () => {
    const r = { view: 'laboratorio' as const, labId: 'botw_material_flint', item: 'botw_material_wood' };
    expect(parseHash(buildHash(r))).toEqual(r);
    expect(parseHash('')).toEqual({ view: 'catalogo', labId: null, item: null });
    expect(parseHash('#/?item=botw_material_apple').item).toBe('botw_material_apple');
  });
});
