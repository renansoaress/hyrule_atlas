import { useEffect, useState } from 'react';

// Roteamento por hash: funciona igualmente em http:// e file://.
//   #/              catálogo
//   #/laboratorio   Laboratório de Hyrule (opcional: #/laboratorio/<id>)
//   #/sobre         Sobre, fontes e cobertura
//   ...?item=<id>   ficha aberta por cima da tela atual
export type View = 'catalogo' | 'laboratorio' | 'sobre';
export interface Route {
  view: View;
  labId: string | null;
  item: string | null;
}

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  const [pathPart, query = ''] = h.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  const view: View = parts[0] === 'laboratorio' ? 'laboratorio' : parts[0] === 'sobre' ? 'sobre' : 'catalogo';
  return { view, labId: view === 'laboratorio' ? parts[1] ?? null : null, item: params.get('item') };
}

export function buildHash(r: Route): string {
  let path = r.view === 'catalogo' ? '/' : r.view === 'laboratorio' ? '/laboratorio' + (r.labId ? '/' + r.labId : '') : '/sobre';
  if (r.item) path += '?item=' + encodeURIComponent(r.item);
  return '#' + path;
}

export function useRoute(): [Route, (r: Partial<Route>, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = (patch: Partial<Route>, replace = false) => {
    const next = { ...parseHash(window.location.hash), ...patch };
    const hash = buildHash(next);
    if (replace) {
      window.history.replaceState(null, '', hash);
      setRoute(next);
    } else if (hash !== window.location.hash) window.location.hash = hash;
    else setRoute(next);
  };
  return [route, navigate];
}
