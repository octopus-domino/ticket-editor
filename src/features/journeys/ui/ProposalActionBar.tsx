import { t } from '@/shared/i18n';
import type { ReactNode } from 'react';
import { proposalItems, proposalMoney, proposalTotal } from '../domain/proposal';

export function ProposalActionBar({
  data,
  children,
}: {
  data?: Record<string, string>;
  children: ReactNode;
}) {
  if (!data) return <>{children}</>;
  const items = proposalItems(data.positions);
  let total = '—';
  try {
    total = proposalMoney(proposalTotal(items), data.currency ?? 'RUB');
  } catch {
    /* Incomplete rows are checked before submission. */
  }
  return (
    <div className="proposal-action-bar">
      <div className="proposal-action-bar-inner">
        <div className="proposal-action-summary">
          <span>
            {t('Позиций:')} {items.length}
          </span>
          <strong>{total}</strong>
        </div>
        <div className="proposal-action-buttons">{children}</div>
      </div>
    </div>
  );
}
