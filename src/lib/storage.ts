// Persistência local (favoritos e preferências). Todo acesso é protegido: em janelas privadas ou
// com armazenamento bloqueado o atlas continua funcionando, só não lembra as escolhas.
const PREFIX = 'hyrule-atlas:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível */
  }
}
