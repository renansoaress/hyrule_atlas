import { useEffect, useMemo, useRef, useState } from 'react';
import { atlas, entities, search } from '../lib/data';
import { useFavorites } from '../lib/favorites';
import { load, save } from '../lib/storage';
import type { Entity } from '../lib/types';
import { Card } from './Card';
import { Icon } from './Icon';

const PAGE = 48;

type SortKey = 'relevancia' | 'nome_az' | 'nome_za' | 'categoria' | 'compendio' | 'ataque' | 'defesa';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevancia', label: 'Relevância' },
  { key: 'nome_az', label: 'Nome (A–Z)' },
  { key: 'nome_za', label: 'Nome (Z–A)' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'compendio', label: 'Nº do compendium' },
  { key: 'ataque', label: 'Maior ataque' },
  { key: 'defesa', label: 'Maior defesa' },
];

const statNum = (e: Entity, labels: string[]) => {
  const s = e.stats.find((x) => labels.includes(x.label));
  const n = s ? parseInt(s.value.replace(/[^\d].*$/, ''), 10) : NaN;
  return Number.isFinite(n) ? n : -1;
};
const compNo = (e: Entity) => {
  const s = e.stats.find((x) => x.label === 'Nº no Hyrule Compendium');
  return s ? parseInt(s.value, 10) + (e.master_mode ? 0.5 : 0) : Infinity;
};
const catOrder = Object.fromEntries(atlas.categories.map((c, i) => [c.key, i]));

interface Filters {
  fav: boolean;
  especial: boolean;
  elemental: boolean;
  curiosidades: boolean;
  dlc: boolean;
}

export function Catalog({ onOpen }: { onOpen: (id: string) => void }) {
  const { favs } = useFavorites();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cat, setCat] = useState<string>(() => load('categoria', 'todos'));
  const [sub, setSub] = useState<string>('todas');
  const [filters, setFilters] = useState<Filters>({ fav: false, especial: false, elemental: false, curiosidades: false, dlc: false });
  // a ordenação de navegação é lembrada; durante uma busca vale a ordenação de busca (padrão: relevância)
  const [browseSort, setBrowseSort] = useState<SortKey>(() => {
    const s = load<SortKey>('ordenacao', 'nome_az');
    return s === 'relevancia' ? 'nome_az' : s;
  });
  const [querySort, setQuerySort] = useState<SortKey>('relevancia');
  const searching = query.trim().length > 0;
  const sort = searching ? querySort : browseSort;
  const setSort = (s: SortKey) => (searching ? setQuerySort(s) : setBrowseSort(s));
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 140);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => save('categoria', cat), [cat]);
  useEffect(() => save('ordenacao', browseSort), [browseSort]);
  useEffect(() => setLimit(PAGE), [debounced, cat, sub, filters, sort]);

  // atalho "/" para focar a busca
  useEffect(() => {
    const on = (ev: KeyboardEvent) => {
      if (ev.key === '/' && document.activeElement?.tagName !== 'INPUT' && !document.querySelector('.modal')) {
        ev.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const category = atlas.categories.find((c) => c.key === cat) ?? null;
  const inCategory = (e: Entity) => cat === 'todos' || e.categories.includes(cat);

  const results = useMemo(() => {
    let pool = entities.filter(inCategory);
    if (sub !== 'todas') pool = pool.filter((e) => e.subcategory === sub);
    if (filters.fav) pool = pool.filter((e) => favs.includes(e.id));
    if (filters.especial) pool = pool.filter((e) => e.flags.especial);
    if (filters.elemental) pool = pool.filter((e) => e.flags.elemental);
    if (filters.curiosidades) pool = pool.filter((e) => e.flags.curiosidades);
    if (filters.dlc) pool = pool.filter((e) => e.dlc || e.amiibo || e.master_mode);
    const ranked = debounced.trim() ? search(debounced, pool) : pool;
    // a busca usa o texto "debounced"; enquanto ele não alcança o campo, aplica a ordenação de navegação
    const effectiveSort: SortKey = debounced.trim() ? querySort : browseSort === 'relevancia' ? 'nome_az' : browseSort;
    if (effectiveSort === 'relevancia') return ranked;
    const arr = [...ranked];
    const byName = (a: Entity, b: Entity) => a.name_ptbr.localeCompare(b.name_ptbr, 'pt');
    switch (effectiveSort) {
      case 'nome_az':
        arr.sort(byName);
        break;
      case 'nome_za':
        arr.sort((a, b) => byName(b, a));
        break;
      case 'categoria':
        arr.sort((a, b) => catOrder[a.category] - catOrder[b.category] || (a.subcategory_label ?? '').localeCompare(b.subcategory_label ?? '', 'pt') || byName(a, b));
        break;
      case 'compendio':
        arr.sort((a, b) => compNo(a) - compNo(b) || byName(a, b));
        break;
      case 'ataque':
        arr.sort((a, b) => statNum(b, ['Ataque']) - statNum(a, ['Ataque']) || byName(a, b));
        break;
      case 'defesa':
        arr.sort((a, b) => statNum(b, ['Defesa (guarda)', 'Defesa']) - statNum(a, ['Defesa (guarda)', 'Defesa']) || byName(a, b));
        break;
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, cat, sub, filters, browseSort, querySort, favs]);

  const visible = results.slice(0, limit);
  const countFor = (key: string) => (key === 'todos' ? entities.length : entities.filter((e) => e.categories.includes(key)).length);
  const toggle = (k: keyof Filters) => setFilters((f) => ({ ...f, [k]: !f[k] }));
  const clearAll = () => {
    setQuery('');
    setCat('todos');
    setSub('todas');
    setFilters({ fav: false, especial: false, elemental: false, curiosidades: false, dlc: false });
  };
  const anyFilter = query || cat !== 'todos' || sub !== 'todas' || Object.values(filters).some(Boolean);

  return (
    <section className="catalog" aria-labelledby="titulo-catalogo">
      <div className="hero">
        <h2 id="titulo-catalogo" className="visually-hidden">
          Catálogo
        </h2>
        <label className="search" htmlFor="busca">
          <Icon name="search" size={20} />
          <input
            id="busca"
            ref={searchRef}
            type="search"
            placeholder="Buscar em português ou inglês: Geleca, Lynel, congela, Magnétis…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="contador"
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Limpar busca">
              <Icon name="close" />
            </button>
          )}
        </label>
        <p id="contador" className="counter" aria-live="polite">
          <strong data-testid="count-visible">{visible.length}</strong> exibidos de{' '}
          <strong data-testid="count-results">{results.length}</strong> encontrados ·{' '}
          <span data-testid="count-total">{entities.length}</span> registros no atlas
        </p>
      </div>

      <div className="chips" role="toolbar" aria-label="Categorias">
        {[{ key: 'todos', label: 'Todos' }, ...atlas.categories].map((c) => (
          <button
            key={c.key}
            type="button"
            className={'chip' + (cat === c.key ? ' is-active' : '')}
            aria-pressed={cat === c.key}
            data-cat={c.key}
            onClick={() => {
              setCat(c.key);
              setSub('todas');
            }}
          >
            {c.label} <span className="chip-count">{countFor(c.key)}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        {category && category.subs.length > 1 && (
          <label className="field">
            <span>Subcategoria</span>
            <select value={sub} onChange={(e) => setSub(e.target.value)} data-testid="sub-select">
              <option value="todas">Todas</option>
              {category.subs
                .filter((s) => entities.some((e) => e.categories.includes(category.key) && e.subcategory === s.key))
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="toggles" role="group" aria-label="Filtros">
          <Toggle on={filters.fav} onClick={() => toggle('fav')} icon="star" label={`Favoritos (${favs.length})`} testid="f-fav" />
          <Toggle on={filters.especial} onClick={() => toggle('especial')} icon="sparkle" label="Efeitos especiais" testid="f-especial" />
          <Toggle on={filters.elemental} onClick={() => toggle('elemental')} icon="fire" label="Interações elementais" testid="f-elemental" />
          <Toggle on={filters.curiosidades} onClick={() => toggle('curiosidades')} icon="info" label="Com curiosidades" testid="f-curiosidades" />
          <Toggle on={filters.dlc} onClick={() => toggle('dlc')} icon="shield" label="DLC, amiibo e Modo Mestre" testid="f-dlc" />
        </div>
        <label className="field">
          <span>
            <Icon name="sort" size={14} /> Ordenar
          </span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} data-testid="sort-select">
            {SORTS.filter((s) => searching || s.key !== 'relevancia').map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {anyFilter && (
          <button type="button" className="link-btn" onClick={clearAll}>
            Limpar filtros
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <p>Nenhum registro corresponde aos filtros.</p>
          <button type="button" className="btn" onClick={clearAll}>
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <ul className="grid" data-testid="grid">
          {visible.map((e) => (
            <li key={e.id}>
              <Card entity={e} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}

      {visible.length < results.length && (
        <div className="more">
          <button type="button" className="btn btn-primary" onClick={() => setLimit((l) => l + PAGE)} data-testid="load-more">
            Carregar mais ({Math.min(PAGE, results.length - visible.length)} de {results.length - visible.length} restantes)
          </button>
        </div>
      )}
    </section>
  );
}

function Toggle({ on, onClick, icon, label, testid }: { on: boolean; onClick: () => void; icon: string; label: string; testid: string }) {
  return (
    <button type="button" className={'toggle' + (on ? ' is-on' : '')} aria-pressed={on} onClick={onClick} data-testid={testid}>
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
