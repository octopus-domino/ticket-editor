import { t } from '@/shared/i18n';
export interface ProposalItem {
  name: string;
  quantity: string;
  price: string;
}
export function proposalItems(raw: string): ProposalItem[] {
  try {
    const rows: ProposalItem[] = JSON.parse(raw || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
export function proposalNumber(value: string): string {
  const normalized = value.replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,4})?$/.test(normalized))
    throw new Error(t('Проверьте числовые колонки: например, 1 250,50.'));
  return normalized;
}
// Fixed-point decimal calculation, with the same per-line rounding as the server.
export function proposalTotal(items: ProposalItem[]): string {
  const scaled = (s: string) => {
    const [a, b = ''] = proposalNumber(s).split('.');
    return BigInt(a) * 10000n + BigInt(b.padEnd(4, '0'));
  };
  const cents = items.reduce(
    (sum, item) => sum + (scaled(item.quantity) * scaled(item.price) + 500000n) / 1000000n,
    0n,
  );
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function proposalItemError(item: ProposalItem): string | null {
  try {
    if (!item.name.trim() || item.name.length > 200) return t('Укажите название до 200 символов');
    if (Number(proposalNumber(item.quantity)) <= 0) return t('Количество должно быть больше нуля');
    proposalNumber(item.price);
    return null;
  } catch {
    return t('Проверьте количество и цену');
  }
}
export function normalizedProposalData(data: Record<string, string>): Record<string, string> {
  const items = proposalItems(data.positions);
  if (!items.length) throw new Error(t('Добавьте хотя бы одну позицию.'));
  return {
    ...data,
    positions: JSON.stringify(
      items.map((item, index) => {
        const error = proposalItemError(item);
        if (error) throw new Error(t('Позиция {0}: {1}.', index + 1, error));
        return {
          name: item.name.trim(),
          quantity: proposalNumber(item.quantity),
          price: proposalNumber(item.price),
        };
      }),
    ),
  };
}
export function proposalMoney(value: string, currency = 'RUB'): string {
  const [whole, fraction = ''] = value.split('.');
  const symbol: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' };
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')},${fraction.padEnd(2, '0')} ${symbol[currency] ?? currency}`;
}
