import { useEffect, useMemo, useState } from 'react';
import { atlas, byId, entities, img, search } from '../lib/data';
import type { Entity } from '../lib/types';
import { InteractionCard } from './DetailModal';
import { Icon } from './Icon';
import { StatusPill } from './Badges';

const FEATURED = [
  'botw_material_chuchu_jelly',
  'botw_material_red_chuchu_jelly',
  'botw_material_flint',
  'botw_material_octo_balloon',
  'botw_creature_lord_of_the_mountain',
  'botw_weapon_flameblade',
  'botw_rune_remote_bomb',
  'botw_rune_stasis',
  'botw_object_explosive_barrel',
  'botw_material_ruby',
  'botw_shield_ancient_shield',
  'botw_arrow_fire_arrow',
];

interface Question {
  id: string;
  label: string;
  test: (e: Entity) => boolean;
  explain: (e: Entity) => string | null;
}

const caps = atlas.vocab.capabilities;
const hasCap = (c: string) => (e: Entity) => e.capabilities.includes(c);
const confirmed = (action: string) => (e: Entity) => e.interactions.some((i) => i.action === action && i.status === 'confirmado');
const resultOf = (actions: string[]) => (e: Entity) => e.interactions.find((i) => actions.includes(i.action) && i.status === 'confirmado')?.result ?? e.summary;

const QUESTIONS: Question[] = [
  { id: 'fogo', label: 'Quais itens podem gerar fogo?', test: hasCap('gera_fogo'), explain: resultOf(['usar', 'golpe_arma', 'arremessar', 'fogo', 'fogueira']) },
  { id: 'congela', label: 'Quais itens podem congelar inimigos?', test: (e) => hasCap('congela_inimigos')(e) || hasCap('gera_gelo')(e), explain: resultOf(['usar', 'golpe_arma', 'arremessar', 'gelo']) },
  { id: 'flutua', label: 'Quais objetos podem flutuar?', test: (e) => hasCap('flutua')(e) || hasCap('faz_flutuar')(e), explain: (e) => (hasCap('faz_flutuar')(e) ? 'Faz outros objetos flutuarem no ar. ' : '') + (resultOf(['agua', 'usar', 'largar'])(e) ?? '') },
  { id: 'eletr', label: 'Quais materiais reagem à eletricidade?', test: (e) => e.categories.includes('materiais') && (hasCap('reage_eletricidade')(e) || confirmed('eletricidade')(e)), explain: resultOf(['eletricidade']) },
  { id: 'especiais', label: 'Quais criaturas possuem habilidades especiais?', test: (e) => e.category === 'criaturas' && hasCap('habilidade_especial')(e), explain: (e) => e.summary },
  { id: 'conduz', label: 'O que conduz eletricidade?', test: hasCap('conduz_eletricidade'), explain: resultOf(['eletricidade']) },
  { id: 'raios', label: 'O que atrai raios em tempestades?', test: hasCap('atrai_raios'), explain: resultOf(['raio']) },
  { id: 'queima', label: 'O que pega fogo?', test: hasCap('inflamavel'), explain: resultOf(['fogo']) },
  { id: 'magnetis', label: 'O que pode ser movido com Magnétis?', test: (e) => hasCap('magnetico')(e) || confirmed('magnetis')(e), explain: resultOf(['magnetis']) },
  { id: 'transforma', label: 'O que se transforma com fogo, gelo ou eletricidade?', test: (e) => ['reage_fogo', 'reage_gelo', 'reage_eletricidade'].some((c) => e.capabilities.includes(c)), explain: resultOf(['fogo', 'fogueira', 'gelo', 'eletricidade', 'frio_extremo']) },
  { id: 'laser', label: 'O que reflete lasers de Guardiões?', test: hasCap('reflete_laser'), explain: resultOf(['defender', 'usar']) },
  { id: 'montar', label: 'O que pode ser montado?', test: (e) => hasCap('montavel')(e) || confirmed('montar')(e), explain: resultOf(['montar']) },
  { id: 'frio', label: 'O que protege do frio?', test: hasCap('protege_frio'), explain: resultOf(['equipar', 'comer', 'usar', 'frio_extremo']) },
  { id: 'calor', label: 'O que protege do calor?', test: hasCap('protege_calor'), explain: resultOf(['equipar', 'comer', 'usar', 'calor_extremo']) },
  { id: 'explode', label: 'O que causa explosões?', test: hasCap('gera_explosao'), explain: resultOf(['usar', 'golpe_arma', 'fogo', 'explosao']) },
];

export function Lab({ selectedId, onSelect, onOpen }: { selectedId: string | null; onSelect: (id: string) => void; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>('fogo');
  const [capFilter, setCapFilter] = useState<string>('');
  const [actFilter, setActFilter] = useState<string>('');

  const withInteractions = useMemo(() => entities.filter((e) => e.interactions.length > 0), []);
  const list = useMemo(() => (q.trim() ? search(q, withInteractions).slice(0, 40) : FEATURED.map((id) => byId.get(id)).filter(Boolean) as Entity[]), [q, withInteractions]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  useEffect(() => {
    if (!selected) return setAction(null);
    const first = selected.interactions.find((i) => i.status === 'confirmado') ?? selected.interactions[0];
    setAction(first ? first.action + '|' + (first.variant ?? '') : null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceMap = useMemo(() => new Map((selected?.sources ?? []).map((s) => [s.key, s])), [selected]);
  const chosen = selected?.interactions.find((i) => i.action + '|' + (i.variant ?? '') === action) ?? null;

  const qObj = QUESTIONS.find((x) => x.id === question)!;
  const answer = useMemo(() => {
    if (capFilter) return entities.filter((e) => e.capabilities.includes(capFilter));
    if (actFilter) return entities.filter(confirmed(actFilter));
    return entities.filter(qObj.test);
  }, [question, capFilter, actFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const capCounts = useMemo(() => Object.keys(caps).map((c) => [c, entities.filter((e) => e.capabilities.includes(c)).length] as const), []);

  return (
    <section className="lab" aria-labelledby="titulo-lab">
      <div className="lab-intro">
        <h2 id="titulo-lab">
          <Icon name="flask" size={26} /> Laboratório de Hyrule
        </h2>
        <p>
          Escolha um item e uma ação para ver o que acontece no jogo. Os resultados vêm de dados estruturados e verificados nas fontes — quando
          nenhuma fonte esclarece uma ação, ela aparece como <em>desconhecida</em>, nunca como palpite.
        </p>
      </div>

      <div className="lab-grid">
        <aside className="lab-picker" aria-label="Escolher item">
          <label className="search small" htmlFor="lab-busca">
            <Icon name="search" />
            <input id="lab-busca" type="search" placeholder="Buscar item para experimentar…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          </label>
          <p className="muted small">{q.trim() ? `${list.length} itens com interações` : 'Sugestões para começar'}</p>
          <ul className="pick-list">
            {list.map((e) => (
              <li key={e.id}>
                <button type="button" className={'pick' + (selected?.id === e.id ? ' is-active' : '')} onClick={() => onSelect(e.id)} data-pick={e.id}>
                  {e.image.thumb && <img src={img(e.image.thumb)} alt="" loading="lazy" />}
                  <span>
                    <strong>{e.name_ptbr}</strong>
                    <small>{e.category_label}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="lab-bench">
          {!selected ? (
            <div className="bench-empty">
              <Icon name="flask" size={48} />
              <p>Selecione um item à esquerda para começar os experimentos.</p>
            </div>
          ) : (
            <>
              <div className="bench-head">
                {selected.image.main && <img src={img(selected.image.main)} alt="" />}
                <div>
                  <p className="eyebrow">{selected.category_label}</p>
                  <h3>{selected.name_ptbr}</h3>
                  <p className="name-en" lang="en">
                    {selected.name_en}
                  </p>
                  <button type="button" className="link-btn" onClick={() => onOpen(selected.id)}>
                    Abrir ficha completa <Icon name="arrow" size={14} />
                  </button>
                </div>
              </div>
              <div className="actions" role="group" aria-label="Ações">
                {selected.interactions.map((i) => {
                  const key = i.action + '|' + (i.variant ?? '');
                  return (
                    <button
                      key={key}
                      type="button"
                      className={'action st-' + i.status + (action === key ? ' is-active' : '')}
                      aria-pressed={action === key}
                      onClick={() => setAction(key)}
                      data-lab-action={i.action}
                    >
                      {i.action_label}
                      {i.variant ? <small> ({i.variant})</small> : null}
                    </button>
                  );
                })}
              </div>
              <div className="bench-result" aria-live="polite" data-testid="lab-result">
                {chosen ? <InteractionCard it={chosen} sources={sourceMap} onOpen={onOpen} /> : <p className="muted">Escolha uma ação.</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="reverse">
        <h3>Navegação inversa</h3>
        <div className="questions" role="group" aria-label="Perguntas">
          {QUESTIONS.map((x) => (
            <button
              key={x.id}
              type="button"
              className={'chip' + (question === x.id && !capFilter && !actFilter ? ' is-active' : '')}
              onClick={() => {
                setQuestion(x.id);
                setCapFilter('');
                setActFilter('');
              }}
              data-question={x.id}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="field">
            <span>Por capacidade</span>
            <select
              value={capFilter}
              onChange={(e) => {
                setCapFilter(e.target.value);
                setActFilter('');
              }}
            >
              <option value="">—</option>
              {capCounts.map(([c, n]) => (
                <option key={c} value={c} disabled={!n}>
                  {caps[c]} ({n})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Por ação confirmada</span>
            <select
              value={actFilter}
              onChange={(e) => {
                setActFilter(e.target.value);
                setCapFilter('');
              }}
            >
              <option value="">—</option>
              {Object.entries(atlas.vocab.actions).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="counter" data-testid="reverse-count">
          {answer.length} resultados
        </p>
        <ul className="answers">
          {answer.slice(0, 120).map((e) => {
            const explanation = capFilter ? e.summary : actFilter ? e.interactions.find((i) => i.action === actFilter && i.status === 'confirmado')?.result : qObj.explain(e);
            const st = actFilter ? e.interactions.find((i) => i.action === actFilter)?.status : null;
            return (
              <li key={e.id}>
                <button type="button" className="answer" onClick={() => onSelect(e.id)}>
                  {e.image.thumb && <img src={img(e.image.thumb)} alt="" loading="lazy" />}
                  <span>
                    <strong>{e.name_ptbr}</strong>
                    <small>{e.category_label}</small>
                    {explanation && <em>{explanation}</em>}
                  </span>
                  {st && <StatusPill status={st} />}
                </button>
              </li>
            );
          })}
        </ul>
        {answer.length > 120 && <p className="muted">Mostrando 120 de {answer.length}. Refine pela busca do catálogo.</p>}
      </div>
    </section>
  );
}
