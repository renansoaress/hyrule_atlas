// Tipos do arquivo gerado src/generated/atlas.json (ver scripts/build/build-data.mjs).

export type NameStatus = 'oficial' | 'oficial_secundaria' | 'nao_oficial';
export type InteractionStatus = 'confirmado' | 'sem_efeito' | 'nao_aplicavel' | 'desconhecido';
export type Kind = 'mecanica' | 'curiosidade' | 'tecnica_avancada' | 'glitch' | 'nao_verificado';

export interface Interaction {
  action: string;
  action_label: string;
  variant?: string;
  status: InteractionStatus;
  result: string;
  conditions?: string[];
  side_effects?: string[];
  applications?: string[];
  produces?: string[];
  kind?: Kind;
  sources?: string[];
}

export interface Secret {
  kind: Kind;
  kind_label: string;
  title: string;
  text: string;
  sources?: string[];
}

export interface Source {
  key: string;
  title: string;
  url: string;
  type: string;
  license?: string;
}

export interface Ref {
  id: string | null;
  text: string;
}

export interface ImageCredit {
  used_as: string;
  role: string;
  color: string | null;
  credit: string;
  license: string;
  source_url: string;
  page_url: string;
}

export interface Entity {
  id: string;
  name_ptbr: string;
  name_en: string;
  name_status: NameStatus;
  name_source: string | null;
  name_note: string | null;
  aliases_en: string[];
  category: string;
  category_label: string;
  categories: string[];
  subcategory: string | null;
  subcategory_label: string | null;
  type: string;
  dlc: string | null;
  dlc_label: string | null;
  amiibo: string | null;
  master_mode: boolean;
  image: {
    main: string | null;
    thumb: string | null;
    icon: string | null;
    main_role: string | null;
    gallery: { src: string; role: string; caption: string }[];
    dyes: { src: string; color: string; color_pt: string }[];
  };
  image_credits: ImageCredit[];
  summary: string | null;
  description: string | null;
  locations: string[];
  common_locations: string[];
  obtaining: string[];
  uses: string[];
  effects: string[];
  interactions: Interaction[];
  secrets: Secret[];
  no_secrets_note: string | null;
  advanced_uses: string[];
  limitations: string[];
  related: { id: string; relation: string; origin: string }[];
  capabilities: string[];
  verification_status: 'verificado' | 'parcial' | 'a_verificar';
  content_status: 'redigida' | 'pendente';
  stats: { label: string; value: string; src: string; note?: string }[];
  modifiers: { rows: { bonus: string; comum: string | null; aprimorado: string | null }[]; extra: { label: string; value: string }[] } | null;
  armor_levels: { level: number; defense: number; sell_price: number; materials: { qty: number | null; id: string | null; text: string }[] }[] | null;
  armor_effects: string[] | null;
  set_members: string[] | null;
  recipe: Ref[] | null;
  in_recipes: { id: string; text: string }[];
  upgrades_using: { id: string; level: number; qty: number | null; text: string }[];
  drops: Ref[];
  dropped_by: { id: string; text: string }[];
  shops: { shop: string; price: number | string | null; stock: number | null }[];
  variants: { name_ptbr: string; name_en: string; name_status: NameStatus; description: string | null }[];
  compendium_text_en: string | null;
  game_text_en: string | null;
  flags: { elemental: boolean; especial: boolean; curiosidades: boolean };
  sources: Source[];
}

export interface Category {
  key: string;
  label: string;
  subs: { key: string; label: string }[];
}

export interface Atlas {
  meta: {
    title: string;
    game: string;
    generated_at: string;
    total: number;
    counts: Record<string, number>;
    content_written: number;
    name_status: Record<NameStatus, number>;
    ptbr_names_source: { title: string; url: string; author: string; published: string };
  };
  categories: Category[];
  vocab: {
    actions: Record<string, string>;
    statuses: Record<string, string>;
    kinds: Record<string, string>;
    capabilities: Record<string, string>;
    verification: Record<string, string>;
  };
  entities: Entity[];
}
