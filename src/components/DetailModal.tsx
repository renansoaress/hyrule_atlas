import { useEffect, useMemo, useRef, useState } from 'react';
import { atlas, byId, img } from '../lib/data';
import { useFavorites } from '../lib/favorites';
import type { Entity, Interaction, Source } from '../lib/types';
import { Icon } from './Icon';
import { NameBadge, StatusPill, KindBadge, VerificationBadge } from './Badges';

interface Props {
  entity: Entity;
  onClose: () => void;
  onOpen: (id: string) => void;
  onLab: (id: string) => void;
}

export function DetailModal({ entity: e, onClose, onOpen, onLab }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { isFav, toggle } = useFavorites();
  const [shown, setShown] = useState<{ src: string; caption: string } | null>(null);

  useEffect(() => setShown(null), [e.id]);

  // foco inicial, Escape, armadilha de foco e bloqueio da rolagem do fundo
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.classList.add('modal-open');
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose();
      } else if (ev.key === 'Tab' && panelRef.current) {
        // só elementos realmente visíveis (links dentro de <details> fechados não recebem foco)
        const focusables = [
          ...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, input, summary, [tabindex]:not([tabindex="-1"])'),
        ].filter((el) => el.getClientRects().length > 0 && !el.closest('details:not([open]) > :not(summary)'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    };
    // qualquer foco que escape do painel (ex.: via <summary> ou leitor de tela) volta para dentro
    const onFocusIn = (ev: FocusEvent) => {
      if (panelRef.current && ev.target instanceof Node && !panelRef.current.contains(ev.target)) closeRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.scrollTo?.({ top: 0 });
    closeRef.current?.focus();
  }, [e.id]);

  const sourceMap = useMemo(() => new Map(e.sources.map((s) => [s.key, s])), [e]);
  const fav = isFav(e.id);
  const mainImg = shown?.src ?? e.image.main;
  const gallery = [
    ...(e.image.main ? [{ src: e.image.main, caption: e.image_credits.find((c) => c.used_as === 'principal')?.role ?? 'Imagem principal' }] : []),
    ...e.image.gallery.map((g) => ({ src: g.src, caption: g.caption })),
  ];

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ficha-titulo" ref={panelRef} data-testid="modal" data-id={e.id}>
        <div className="modal-top">
          <button type="button" className="icon-btn" onClick={() => toggle(e.id)} aria-pressed={fav} aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} data-testid="modal-fav">
            <Icon name="star" className={fav ? 'is-fav' : ''} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onLab(e.id)} aria-label="Abrir no Laboratório de Hyrule" title="Abrir no Laboratório">
            <Icon name="flask" />
          </button>
          <button type="button" className="icon-btn close" onClick={onClose} ref={closeRef} aria-label="Fechar ficha" data-testid="modal-close">
            <Icon name="close" />
          </button>
        </div>

        <header className="dossier-head">
          <figure className={'dossier-media media-' + (e.image.main_role ?? 'none')}>
            {mainImg && <img src={img(mainImg)} alt={`Imagem de ${e.name_ptbr}`} data-testid="modal-image" />}
            <figcaption>{shown?.caption ?? gallery[0]?.caption}</figcaption>
          </figure>
          <div className="dossier-title">
            <p className="eyebrow">
              {e.category_label}
              {e.subcategory_label && e.subcategory_label !== e.category_label ? ` · ${e.subcategory_label}` : ''}
            </p>
            <h2 id="ficha-titulo">{e.name_ptbr}</h2>
            <p className="name-en" lang="en">
              {e.name_en}
              {e.aliases_en.length ? <span className="aliases"> · também: {e.aliases_en.join(', ')}</span> : null}
            </p>
            <div className="badges">
              <NameBadge status={e.name_status} note={e.name_note} source={e.name_source} />
              <VerificationBadge status={e.verification_status} />
              {e.dlc_label && <span className="badge b-dlc">{e.dlc_label}</span>}
              {e.amiibo && <span className="badge b-dlc">amiibo: {e.amiibo}</span>}
              {e.master_mode && <span className="badge b-dlc">Exclusivo do Modo Mestre</span>}
            </div>
            {e.summary && <p className="lead">{e.summary}</p>}
            {gallery.length > 1 && (
              <div className="thumbs" aria-label="Galeria">
                {gallery.map((g) => (
                  <button key={g.src} type="button" className={'thumb' + (mainImg === g.src ? ' is-active' : '')} onClick={() => setShown(g)} title={g.caption}>
                    <img src={img(g.src)} alt={g.caption} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {e.content_status === 'pendente' && <p className="notice">Ficha textual ainda não redigida; exibindo somente dados estruturados das fontes.</p>}

        {e.stats.length > 0 && (
          <Section title="Dados do jogo" id="dados">
            <dl className="stats">
              {e.stats.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>
                    {s.value}
                    {s.note && <small className="stat-note">{s.note}</small>}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {e.description && (
          <Section title="Descrição" id="descricao">
            {e.description.split(/\n\n+/).map((par, i) => (
              <p key={i}>{par}</p>
            ))}
          </Section>
        )}

        <ListSection title="Onde encontrar" items={e.locations} />
        <ListSection title="Como obter" items={e.obtaining} />
        {e.shops.length > 0 && (
          <Section title="Lojas que vendem" id="lojas">
            <ul className="plain">
              {e.shops.map((s, i) => (
                <li key={i}>
                  {s.shop}
                  {s.price != null ? ` — ${s.price}` : ''}
                  {s.stock ? ` (estoque: ${s.stock})` : ''}
                </li>
              ))}
            </ul>
          </Section>
        )}
        <ListSection title="Para que serve" items={e.uses} />
        <ListSection title="Efeitos" items={e.effects} />

        {e.variants.length > 0 && (
          <Section title="Variantes" id="variantes">
            <ul className="plain">
              {e.variants.map((v) => (
                <li key={v.name_en}>
                  <strong>{v.name_ptbr}</strong> <span className="muted" lang="en">({v.name_en})</span>
                  {v.description ? ` — ${v.description}` : ''}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {e.interactions.length > 0 && (
          <Section title="Interações possíveis" id="interacoes">
            <div className="interactions">
              {e.interactions
                .filter((it) => it.status === 'confirmado')
                .map((it, i) => (
                  <InteractionCard key={i} it={it} sources={sourceMap} onOpen={onOpen} />
                ))}
            </div>
            <InteractionGroup title="Sem efeito ou não aplicável" items={e.interactions.filter((it) => it.status === 'sem_efeito' || it.status === 'nao_aplicavel')} sources={sourceMap} onOpen={onOpen} />
            <InteractionGroup title="Sem informação verificada (desconhecido)" items={e.interactions.filter((it) => it.status === 'desconhecido')} sources={sourceMap} onOpen={onOpen} />
          </Section>
        )}

        <Section title="Segredos, curiosidades e mecânicas especiais" id="segredos">
          {e.secrets.length ? (
            <div className="secrets">
              {e.secrets.map((s, i) => (
                <article key={i} className={'secret k-' + s.kind}>
                  <KindBadge kind={s.kind} label={s.kind_label} />
                  <h4>{s.title}</h4>
                  <p>{s.text}</p>
                  <SourceTags keys={s.sources} sources={sourceMap} />
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">{e.no_secrets_note ?? 'Nenhum segredo ou curiosidade verificada foi encontrado nas fontes consultadas.'}</p>
          )}
        </Section>

        <ListSection title="Usos avançados" items={e.advanced_uses} />

        <RecipesSection e={e} onOpen={onOpen} />

        {e.modifiers && (e.modifiers.rows.length > 0 || e.modifiers.extra.length > 0) && (
          <Section title="Modificadores possíveis (dados extraídos do jogo)" id="modificadores">
            {e.modifiers.rows.length > 0 && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Bônus</th>
                    <th>Nível comum</th>
                    <th>Nível aprimorado (amarelo)</th>
                  </tr>
                </thead>
                <tbody>
                  {e.modifiers.rows.map((r) => (
                    <tr key={r.bonus}>
                      <td>{r.bonus}</td>
                      <td>{r.comum ?? '—'}</td>
                      <td>{r.aprimorado ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {e.modifiers.extra.length > 0 && (
              <dl className="stats compact">
                {e.modifiers.extra.map((x) => (
                  <div key={x.label}>
                    <dt>{x.label}</dt>
                    <dd>{x.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="fine">Faixas publicadas no Zelda Wiki a partir dos parâmetros internos do jogo (SharpWeaponAdd / PoweredSharpAdd).</p>
          </Section>
        )}

        {e.image.dyes.length > 0 && (
          <Section title="Tingimento (Tinturaria Kochi, Hateno)" id="tingimento">
            <ul className="dyes">
              {e.image.dyes.map((d) => (
                <li key={d.src}>
                  <img src={img(d.src)} alt={`${e.name_ptbr} tingido de ${d.color_pt}`} loading="lazy" />
                  <span>{d.color_pt}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <ListSection title="Restrições e limitações" items={e.limitations} />

        {e.related.length > 0 && (
          <Section title="Itens relacionados" id="relacionados">
            <ul className="related">
              {e.related.map((r) => {
                const t = byId.get(r.id);
                if (!t) return null;
                return (
                  <li key={r.id}>
                    <button type="button" className="related-btn" onClick={() => onOpen(r.id)} data-related={r.id}>
                      {t.image.thumb && <img src={img(t.image.thumb)} alt="" loading="lazy" />}
                      <span>
                        <strong>{t.name_ptbr}</strong>
                        <small>{r.relation}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Fontes utilizadas" id="fontes">
          <ul className="sources">
            {e.sources.map((s) => (
              <li key={s.key}>
                <code>{s.key}</code>{' '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title} <Icon name="external" size={12} />
                </a>
                {s.license && <span className="muted"> · {s.license}</span>}
              </li>
            ))}
            {e.name_source && (
              <li>
                <code>nome</code> Nome PT-BR: {e.name_source}
                {e.name_status === 'oficial_secundaria' && (
                  <>
                    {' '}
                    —{' '}
                    <a href={atlas.meta.ptbr_names_source.url} target="_blank" rel="noopener noreferrer">
                      lista publicada em {atlas.meta.ptbr_names_source.published} <Icon name="external" size={12} />
                    </a>
                  </>
                )}
              </li>
            )}
          </ul>
          {(e.compendium_text_en || e.game_text_en) && (
            <details className="original">
              <summary>Texto original do jogo (inglês)</summary>
              {e.compendium_text_en && (
                <p lang="en">
                  <strong>Compendium:</strong> {e.compendium_text_en}
                </p>
              )}
              {e.game_text_en && e.game_text_en !== e.compendium_text_en && (
                <p lang="en">
                  <strong>Descrição de inventário:</strong> {e.game_text_en}
                </p>
              )}
            </details>
          )}
          <details className="original">
            <summary>Créditos das imagens</summary>
            <ul className="sources">
              {e.image_credits.map((c, i) => (
                <li key={i}>
                  <strong>{c.role}</strong>
                  {c.color ? ` (${c.color})` : ''} — {c.credit}. {c.license}.{' '}
                  {c.page_url && !c.page_url.includes(' | ') && (
                    <a href={c.page_url} target="_blank" rel="noopener noreferrer">
                      origem <Icon name="external" size={12} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section className="dossier-section" aria-labelledby={'s-' + id}>
      <h3 id={'s-' + id}>{title}</h3>
      {children}
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  const id = title.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <Section title={title} id={id}>
      <ul className="plain">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </Section>
  );
}

function SourceTags({ keys, sources }: { keys?: string[]; sources: Map<string, Source> }) {
  if (!keys?.length) return null;
  return (
    <p className="src-tags">
      Fonte:{' '}
      {keys.map((k) => {
        const s = sources.get(k);
        return s ? (
          <a key={k} href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>
            {s.title.replace(/^Zelda Wiki — /, 'Zelda Wiki: ')}
          </a>
        ) : (
          <span key={k}>{k}</span>
        );
      })}
    </p>
  );
}

export function InteractionCard({ it, sources, onOpen }: { it: Interaction; sources: Map<string, Source>; onOpen: (id: string) => void }) {
  return (
    <article className={'interaction st-' + it.status} data-action={it.action} data-status={it.status}>
      <header>
        <h4>
          {it.action_label}
          {it.variant ? <span className="muted"> — {it.variant}</span> : null}
        </h4>
        <StatusPill status={it.status} />
        {it.kind && it.kind !== 'mecanica' && <KindBadge kind={it.kind} label={atlas.vocab.kinds[it.kind]} />}
      </header>
      <p>{it.result}</p>
      {it.conditions?.length ? <Mini title="Condições" items={it.conditions} /> : null}
      {it.side_effects?.length ? <Mini title="Efeitos secundários e cuidados" items={it.side_effects} /> : null}
      {it.applications?.length ? <Mini title="Aplicações práticas" items={it.applications} /> : null}
      {it.produces?.length ? (
        <p className="produces">
          Resulta em:{' '}
          {it.produces.map((pid) => (
            <button key={pid} type="button" className="link-btn" onClick={() => onOpen(pid)}>
              {byId.get(pid)?.name_ptbr ?? pid}
            </button>
          ))}
        </p>
      ) : null}
      <SourceTags keys={it.sources} sources={sources} />
    </article>
  );
}

/** Lista compacta (recolhível) das ações sem efeito, não aplicáveis ou sem informação. */
function InteractionGroup({ title, items, sources, onOpen }: { title: string; items: Interaction[]; sources: Map<string, Source>; onOpen: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <details className="igroup" data-testid="interaction-group">
      <summary>
        {title}: {items.map((i) => i.action_label + (i.variant ? ` (${i.variant})` : '')).join(' · ')}
      </summary>
      <div className="interactions compact">
        {items.map((it, i) => (
          <InteractionCard key={i} it={it} sources={sources} onOpen={onOpen} />
        ))}
      </div>
    </details>
  );
}

function Mini({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mini">
      <span>{title}</span>
      <ul>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function RefList({ items, onOpen }: { items: { id: string | null; text: string; extra?: string }[]; onOpen: (id: string) => void }) {
  return (
    <ul className="chiplist">
      {items.map((r, i) => (
        <li key={i}>
          {r.id ? (
            <button type="button" className="ref" onClick={() => onOpen(r.id!)}>
              {r.text}
              {r.extra ? <small> {r.extra}</small> : null}
            </button>
          ) : (
            <span className="ref is-text">{r.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function RecipesSection({ e, onOpen }: { e: Entity; onOpen: (id: string) => void }) {
  const has = e.recipe?.length || e.in_recipes.length || e.upgrades_using.length || e.armor_levels?.length || e.drops.length || e.dropped_by.length;
  if (!has) return null;
  return (
    <Section title="Receitas, melhorias e materiais relacionados" id="receitas">
      {e.recipe?.length ? (
        <>
          <h4 className="sub">Ingredientes da receita</h4>
          <RefList items={e.recipe} onOpen={onOpen} />
        </>
      ) : null}
      {e.in_recipes.length > 0 && (
        <>
          <h4 className="sub">Usado nas receitas ({e.in_recipes.length})</h4>
          <RefList items={e.in_recipes} onOpen={onOpen} />
        </>
      )}
      {e.upgrades_using.length > 0 && (
        <>
          <h4 className="sub">Usado para melhorar armaduras ({e.upgrades_using.length})</h4>
          <RefList items={e.upgrades_using.map((u) => ({ id: u.id, text: u.text, extra: `★${u.level} ×${u.qty ?? '?'}` }))} onOpen={onOpen} />
        </>
      )}
      {e.drops.length > 0 && (
        <>
          <h4 className="sub">Deixa / fornece</h4>
          <RefList items={e.drops} onOpen={onOpen} />
        </>
      )}
      {e.dropped_by.length > 0 && (
        <>
          <h4 className="sub">Obtido de</h4>
          <RefList items={e.dropped_by} onOpen={onOpen} />
        </>
      )}
      {e.armor_levels && e.armor_levels.length > 0 && (
        <>
          <h4 className="sub">Níveis de melhoria (Grandes Fadas)</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Nível</th>
                <th>Defesa</th>
                <th>Materiais</th>
                <th>Venda</th>
              </tr>
            </thead>
            <tbody>
              {e.armor_levels.map((l) => (
                <tr key={l.level}>
                  <td>{l.level === 0 ? 'Base' : '★'.repeat(l.level)}</td>
                  <td>{l.defense}</td>
                  <td>
                    {l.materials.length
                      ? l.materials.map((m, i) => (
                          <span key={i} className="mat">
                            {m.qty}×{' '}
                            {m.id ? (
                              <button type="button" className="link-btn" onClick={() => onOpen(m.id!)}>
                                {m.text}
                              </button>
                            ) : (
                              m.text
                            )}
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td>{l.sell_price ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Section>
  );
}
