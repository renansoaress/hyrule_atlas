import { createRoot } from 'react-dom/client';
import { App } from './App';
import { atlas } from './lib/data';
import './styles/theme.css';

// exposto para diagnóstico e para os testes de ponta a ponta (somente leitura)
(window as unknown as { hyruleAtlas: unknown }).hyruleAtlas = { meta: atlas.meta, entities: atlas.entities };

createRoot(document.getElementById('root')!).render(<App />);
