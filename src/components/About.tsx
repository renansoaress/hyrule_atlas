import { atlas, entities } from '../lib/data';
import { Icon } from './Icon';

export function About({ onOpen }: { onOpen: (id: string) => void }) {
  const rows = atlas.categories.map((c) => {
    const list = entities.filter((e) => e.category === c.key);
    return {
      key: c.key,
      label: c.label,
      total: list.length,
      redigidas: list.filter((e) => e.content_status === 'redigida').length,
      verificadas: list.filter((e) => e.verification_status === 'verificado').length,
      parciais: list.filter((e) => e.verification_status === 'parcial').length,
      aVerificar: list.filter((e) => e.verification_status === 'a_verificar').length,
      interacoes: list.reduce((n, e) => n + e.interactions.length, 0),
      segredos: list.reduce((n, e) => n + e.secrets.length, 0),
    };
  });
  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((n, r) => n + (r[k] as number), 0);
  const ns = atlas.meta.name_status;
  const pending = entities.filter((e) => e.content_status === 'pendente');

  return (
    <section className="about" aria-labelledby="titulo-sobre">
      <h2 id="titulo-sobre">
        <Icon name="book" size={24} /> Fontes, critérios e cobertura
      </h2>

      <div className="about-grid">
        <article className="panel">
          <h3>Cobertura por categoria</h3>
          <table className="table" data-testid="coverage-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Registros</th>
                <th>Fichas redigidas</th>
                <th>Verificadas</th>
                <th>Parciais</th>
                <th>A verificar</th>
                <th>Interações</th>
                <th>Segredos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{r.total}</td>
                  <td>{r.redigidas}</td>
                  <td>{r.verificadas}</td>
                  <td>{r.parciais}</td>
                  <td>{r.aVerificar}</td>
                  <td>{r.interacoes}</td>
                  <td>{r.segredos}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td>{sum('total')}</td>
                <td>{sum('redigidas')}</td>
                <td>{sum('verificadas')}</td>
                <td>{sum('parciais')}</td>
                <td>{sum('aVerificar')}</td>
                <td>{sum('interacoes')}</td>
                <td>{sum('segredos')}</td>
              </tr>
            </tbody>
          </table>
          {pending.length > 0 && (
            <p className="notice">
              {pending.length} fichas ainda sem texto redigido:{' '}
              {pending.slice(0, 12).map((e, i) => (
                <span key={e.id}>
                  {i ? ', ' : ''}
                  <button type="button" className="link-btn" onClick={() => onOpen(e.id)}>
                    {e.name_ptbr}
                  </button>
                </span>
              ))}
              {pending.length > 12 ? '…' : ''}
            </p>
          )}
        </article>

        <article className="panel">
          <h3>De onde vêm os dados</h3>
          <ul className="plain">
            <li>
              <strong>Hyrule Compendium API</strong> — as 389 entradas do compendium de BOTW e as 5 do Modo Mestre (textos oficiais em inglês,
              locais comuns, drops, corações, efeitos culinários e fotos). Código sob licença MIT; textos e imagens © Nintendo.
            </li>
            <li>
              <strong>Zelda Wiki (zeldawiki.wiki)</strong> — listas completas de armas, escudos, arcos, armaduras e níveis de melhoria, tabelas de
              materiais e pratos, itens-chave, parâmetros extraídos do jogo e as páginas de cada item, das quais apenas as seções de BOTW foram
              usadas. Texto sob GNU FDL 1.3.
            </li>
            <li>
              <strong>Nomes oficiais em português</strong> — BOTW recebeu localização em PT-BR em 05/06/2025. Os nomes vêm das citações do jogo
              registradas no Zelda Wiki ({ns.oficial} registros) e da lista publicada pela{' '}
              <a href={atlas.meta.ptbr_names_source.url} target="_blank" rel="noopener noreferrer">
                Coelho News <Icon name="external" size={12} />
              </a>{' '}
              ({ns.oficial_secundaria} registros, fonte secundária). Os demais {ns.nao_oficial} nomes são <em>traduções não oficiais</em> do
              Hyrule Atlas, marcadas em cada ficha.
            </li>
            <li>
              Toda afirmação sobre mecânica cita ao menos uma fonte rastreável. Quando nenhuma fonte esclarece algo, a interação aparece como
              “desconhecida” — nada é presumido por analogia.
            </li>
          </ul>
        </article>

        <article className="panel">
          <h3>Como ler as fichas</h3>
          <dl className="legend">
            <dt>
              <span className="badge k-mecanica">Mecânica confirmada</span>
            </dt>
            <dd>Comportamento reproduzível do jogo.</dd>
            <dt>
              <span className="badge k-curiosidade">Curiosidade</span>
            </dt>
            <dd>Informação interessante que não é necessariamente útil.</dd>
            <dt>
              <span className="badge k-tecnica_avancada">Técnica avançada</span>
            </dt>
            <dd>Uso que exige conhecimento ou habilidade.</dd>
            <dt>
              <span className="badge k-glitch">Glitch</span>
            </dt>
            <dd>Comportamento não intencional do jogo.</dd>
            <dt>
              <span className="badge k-nao_verificado">Informação não verificada</span>
            </dt>
            <dd>Relato sem confirmação — nunca apresentado como fato.</dd>
          </dl>
          <p className="fine">Somente Breath of the Wild: mecânicas e itens exclusivos de Tears of the Kingdom foram excluídos.</p>
        </article>

        <article className="panel">
          <h3>Imagens e direitos</h3>
          <p>
            Todas as imagens são reais e pertencem à <strong>Nintendo</strong>: fotos do Hyrule Compendium, ícones de inventário, modelos e capturas
            do jogo, obtidos da Hyrule Compendium API e do Zelda Wiki (que as publica sob alegação de uso justo).
            O Hyrule Atlas é um projeto pessoal, educacional e sem fins comerciais; a origem e a licença de cada imagem estão no fim de cada ficha.
            Não há licença de redistribuição dessas imagens: publique o atlas apenas após avaliar os direitos.
          </p>
          <p className="fine">Fonte tipográfica: Cinzel (SIL Open Font License 1.1). Dados gerados em {new Date(atlas.meta.generated_at).toLocaleString('pt-BR')}.</p>
        </article>
      </div>
    </section>
  );
}
