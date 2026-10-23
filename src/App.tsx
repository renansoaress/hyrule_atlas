import { useEffect } from 'react';
import { Emblem, Icon } from './components/Icon';
import { Catalog } from './components/Catalog';
import { DetailModal } from './components/DetailModal';
import { Lab } from './components/Lab';
import { About } from './components/About';
import { atlas, byId } from './lib/data';
import { useRoute, type View } from './lib/router';

const TABS: { view: View; label: string; icon: string }[] = [
  { view: 'catalogo', label: 'Catálogo', icon: 'grid' },
  { view: 'laboratorio', label: 'Laboratório de Hyrule', icon: 'flask' },
  { view: 'sobre', label: 'Fontes e cobertura', icon: 'book' },
];

export function App() {
  const [route, navigate] = useRoute();
  const item = route.item ? byId.get(route.item) ?? null : null;

  useEffect(() => {
    document.title = item ? `${item.name_ptbr} — Hyrule Atlas` : 'Hyrule Atlas — Enciclopédia de Breath of the Wild';
  }, [item]);

  const openItem = (id: string) => navigate({ item: id });
  const closeItem = () => navigate({ item: null });

  return (
    <div className="app">
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="brand">
          <Emblem size={44} />
          <div>
            <h1 className="brand-title">Hyrule Atlas</h1>
            <p className="brand-sub">Enciclopédia de The Legend of Zelda: Breath of the Wild</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Seções">
          {TABS.map((t) => (
            <button
              key={t.view}
              type="button"
              className={'tab' + (route.view === t.view ? ' is-active' : '')}
              aria-current={route.view === t.view ? 'page' : undefined}
              onClick={() => navigate({ view: t.view, labId: null, item: null })}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main id="conteudo" className="site-main">
        {route.view === 'catalogo' && <Catalog onOpen={openItem} />}
        {route.view === 'laboratorio' && (
          <Lab selectedId={route.labId} onSelect={(id) => navigate({ labId: id }, true)} onOpen={openItem} />
        )}
        {route.view === 'sobre' && <About onOpen={openItem} />}
      </main>

      <footer className="site-footer">
        {/^https?:$/.test(window.location.protocol) && (
          <p className="downloads">
            Use sem internet: baixe o <a href="downloads/Hyrule-Atlas-Offline.html">arquivo único (HTML, ~24 MB)</a> ou a{' '}
            <a href="downloads/Hyrule-Atlas-Offline.zip">pasta compactada (ZIP, ~21 MB)</a> e abra direto no navegador.
          </p>
        )}
        <p>
          Hyrule Atlas · {atlas.meta.total} registros · funciona 100% offline. Projeto de fã, sem fins comerciais e sem
          afiliação com a Nintendo. The Legend of Zelda e todos os nomes, textos e imagens do jogo são © Nintendo.
        </p>
      </footer>

      {item && <DetailModal entity={item} onClose={closeItem} onOpen={openItem} onLab={(id) => navigate({ view: 'laboratorio', labId: id, item: null })} />}
    </div>
  );
}
