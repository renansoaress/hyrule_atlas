import { useCallback, useEffect, useState } from 'react';
import { load, save } from './storage';

const KEY = 'favoritos';
const listeners = new Set<(f: string[]) => void>();
let current: string[] = load<string[]>(KEY, []);

/** Favoritos compartilhados entre componentes, persistidos no localStorage. */
export function useFavorites() {
  const [favs, setFavs] = useState<string[]>(current);
  useEffect(() => {
    listeners.add(setFavs);
    return () => {
      listeners.delete(setFavs);
    };
  }, []);
  const toggle = useCallback((id: string) => {
    current = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    save(KEY, current);
    for (const l of listeners) l(current);
  }, []);
  return { favs, isFav: (id: string) => favs.includes(id), toggle };
}
