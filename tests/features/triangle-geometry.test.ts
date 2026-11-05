import { describe,expect,it } from 'vitest';
import { newShape } from '@/lib/factories';
import { fixGroupBoundsInPlace } from '@/lib/migrations';
import { toSvgShape } from '@/lib/svg/exporters';
describe('triangle coordinates',()=>{
  it('derives default vertices from the current size rather than fixed 150 px coordinates',()=>{const triangle={...newShape('triangle'),width:64,height:48};expect(triangle.polygonPoints).toBeUndefined();expect(toSvgShape(triangle)).toContain('32,0 64,48 0,48');});
  it('repairs the stale default coordinates in saved templates and preserves custom vertices',()=>{const stale={...newShape('triangle'),width:64,height:48,polygonPoints:[75,0,150,150,0,150]},custom={...newShape('triangle'),polygonPoints:[10,3,140,100,0,150]};fixGroupBoundsInPlace([stale,custom]);expect(stale.polygonPoints).toBeUndefined();expect(custom.polygonPoints).toEqual([10,3,140,100,0,150]);expect(toSvgShape(custom)).toContain('10 3 140 100 0 150');});
});
