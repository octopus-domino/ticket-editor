import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProposalLineList } from '../../src/features/journeys/ui/ProposalLineList';
import { setLocale } from '../../src/shared/i18n';
describe('bounded proposal editing', () => {
  it('renders ten of 200 positions and can find a position directly', () => {
    setLocale('ru');
    const items = Array.from({ length: 200 }, (_, i) => ({
      name: `Product ${i + 1}`,
      quantity: '1',
      price: '10',
    }));
    render(<ProposalLineList items={items} onChange={vi.fn()} />);
    expect(screen.getAllByLabelText('Наименование')).toHaveLength(10);
    expect(screen.queryByDisplayValue('Product 200')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '#200' } });
    expect(screen.getByDisplayValue('Product 200')).toBeTruthy();
    expect(screen.getAllByLabelText('Наименование')).toHaveLength(1);
  });
});
