import { img } from '../lib/data';
import { useFavorites } from '../lib/favorites';
import type { Entity } from '../lib/types';
import { Icon } from './Icon';

export function Card({ entity: e, onOpen }: { entity: Entity; onOpen: (id: string) => void }) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(e.id);
  return (
    <article className={'card' + (e.content_status === 'pendente' ? ' is-pending' : '')} data-id={e.id}>
      <button type="button" className="card-main" onClick={() => onOpen(e.id)} aria-label={`Abrir ficha: ${e.name_ptbr}`}>
        <div className={'card-media media-' + (e.image.main_role ?? 'none')}>
          {e.image.thumb ? <img src={img(e.image.thumb)} alt="" loading="lazy" decoding="async" width={160} height={160} /> : null}
        </div>
        <div className="card-body">
          <p className="card-cat">
            {e.category_label}
            {e.subcategory_label && e.subcategory_label !== e.category_label ? ` · ${e.subcategory_label}` : ''}
          </p>
          <h3 className="card-title">{e.name_ptbr}</h3>
          <p className="card-en" lang="en">
            {e.name_en}
          </p>
          <p className="card-summary">{e.summary ?? 'Ficha em elaboração — dados estruturados disponíveis.'}</p>
          <div className="badges">
            {e.flags.elemental && <span className="badge b-elemental">Elemental</span>}
            {e.flags.especial && <span className="badge b-especial">Especial</span>}
            {e.flags.curiosidades && <span className="badge b-curio">Curiosidades</span>}
            {e.dlc && <span className="badge b-dlc">DLC</span>}
            {e.amiibo && <span className="badge b-dlc">amiibo</span>}
            {e.master_mode && <span className="badge b-dlc">Modo Mestre</span>}
          </div>
        </div>
      </button>
      <button
        type="button"
        className={'fav' + (fav ? ' is-fav' : '')}
        aria-pressed={fav}
        aria-label={fav ? `Remover ${e.name_ptbr} dos favoritos` : `Adicionar ${e.name_ptbr} aos favoritos`}
        title={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onClick={() => toggle(e.id)}
      >
        <Icon name="star" size={18} />
      </button>
    </article>
  );
}
