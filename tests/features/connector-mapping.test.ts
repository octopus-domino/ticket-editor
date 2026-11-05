import { describe,expect,it } from 'vitest';
import { sourceValue,sourceColumns,convertSourceValue } from '@/features/connectors/mapping';
describe('external data mapping',()=>{
  it('preserves 1C identifiers and converts dates, decimal commas, false and nested values',()=>{
    const row={Ref_Key:'00000123',Date:'2026-11-05T00:00:00',Amount:'123,45',active:false,nested:{name:'Company'}};
    expect(sourceValue(row,'Ref_Key')).toBe('00000123');expect(sourceValue(row,'nested.name')).toBe('Company');
    expect(sourceColumns([row])).toContain('nested.name');expect(convertSourceValue(row.Date,'date')).toBe('2026-11-05');
    expect(convertSourceValue(row.Amount,'number')).toBe(123.45);expect(convertSourceValue(row.active,'boolean')).toBe(false);
    expect(sourceValue({'literal.dot':'value'},'literal.dot')).toBe('value');
  });
  it('rejects prototype traversal and bounds field enumeration',()=>{
    expect(()=>sourceValue({},'__proto__.polluted')).toThrow();
    expect(()=>sourceColumns([Object.fromEntries(Array.from({length:501},(_,i)=>[`f${i}`,i]))])).toThrow();
    expect(sourceColumns([{__metadata:{uri:'private'},name:'A'}])).toEqual(['name']);
  });
});
