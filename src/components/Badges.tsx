import type { InteractionStatus, Kind, NameStatus } from '../lib/types';

const NAME_LABEL: Record<NameStatus, string> = {
  oficial: 'Nome oficial PT-BR',
  oficial_secundaria: 'Nome oficial PT-BR (fonte secundária)',
  nao_oficial: 'Tradução não oficial',
};

export function NameBadge({ status, note, source }: { status: NameStatus; note: string | null; source: string | null }) {
  const title = [source, note].filter(Boolean).join(' — ');
  return (
    <span className={'badge n-' + status} title={title || undefined} data-testid="name-status">
      {NAME_LABEL[status]}
    </span>
  );
}

const STATUS_LABEL: Record<InteractionStatus, string> = {
  confirmado: 'Confirmado',
  sem_efeito: 'Sem efeito',
  nao_aplicavel: 'Não aplicável',
  desconhecido: 'Desconhecido',
};
export function StatusPill({ status }: { status: InteractionStatus }) {
  return <span className={'pill st-' + status}>{STATUS_LABEL[status] ?? status}</span>;
}

export function KindBadge({ kind, label }: { kind: Kind; label: string }) {
  return <span className={'badge k-' + kind}>{label}</span>;
}

const VER_LABEL = { verificado: 'Verificado em fonte', parcial: 'Parcialmente verificado', a_verificar: 'Necessita verificação' };
export function VerificationBadge({ status }: { status: keyof typeof VER_LABEL }) {
  return <span className={'badge v-' + status}>{VER_LABEL[status]}</span>;
}
