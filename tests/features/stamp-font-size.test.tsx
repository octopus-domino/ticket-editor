import { fireEvent,render,screen } from '@testing-library/react';
import { describe,expect,it,vi } from 'vitest';
import { StampFontSizeInput } from '@/presentation/components/stamps/StampFontSizeInput';
describe('stamp font size input',()=>{
  it('allows deleting the entire value and typing a new size without a leading zero',()=>{const onChange=vi.fn();render(<StampFontSizeInput value={20} onChange={onChange}/>);const input=screen.getByRole('spinbutton');fireEvent.change(input,{target:{value:''}});expect(input).toHaveValue(null);expect(onChange).not.toHaveBeenCalled();fireEvent.change(input,{target:{value:'32'}});fireEvent.blur(input);expect(onChange).toHaveBeenCalledWith(32);expect(input).toHaveValue(32);});
  it('restores the previous value instead of committing zero or an invalid size',()=>{const onChange=vi.fn();render(<StampFontSizeInput value={20} onChange={onChange}/>);const input=screen.getByRole('spinbutton');fireEvent.change(input,{target:{value:'0'}});fireEvent.blur(input);expect(onChange).not.toHaveBeenCalled();expect(input).toHaveValue(20);});
});
