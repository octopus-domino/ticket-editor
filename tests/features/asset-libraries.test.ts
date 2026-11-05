import { beforeEach,describe,expect,it } from 'vitest';
import { captureAssets,installAssets,validateAsset,type Asset } from '@/features/asset-libraries/assets';
import { newSimpleText } from '@/lib/factories';
const asset:Asset={id:'brand-one',kind:'brand',name:'Blue',payload:{id:'blue',name:'Blue',fills:[{id:'fill',type:'solid',color:'#123456'}],strokes:[]}};
describe('library exchange',()=>{
  beforeEach(()=>localStorage.clear());
  it('installs independent copies without overwriting the browser library',()=>{
    expect(installAssets([asset])).toBe(1);expect(installAssets([asset])).toBe(1);
    const assets=captureAssets();expect(assets).toHaveLength(2);expect(assets[0].id).not.toBe(assets[1].id);
    expect(assets[0].payload).toMatchObject({name:'Blue',fills:[{color:'#123456'}]});
  });
  it('rejects unsafe assets before making any local changes',()=>{
    expect(()=>installAssets([asset,{...asset,id:'bad',payload:{...(asset.payload as object),url:'https://tracker.invalid'}}])).toThrow();
    expect(localStorage.getItem('ticket-editor:graphics:v1')).toBeNull();
    expect(()=>validateAsset({...asset,payload:JSON.parse('{"__proto__":{"x":1}}')})).toThrow();
    expect(()=>validateAsset({...asset,payload:{id:'x',name:'x',fills:[{id:'f',type:'solid',color:'url(javascript:alert(1))'}],strokes:[]}})).toThrow();
  });
  it('keeps symbol references connected to the newly copied style',()=>{
    const prototype={...newSimpleText(),styleId:'blue'};
    installAssets([asset,{id:'symbol',kind:'symbol',name:'Brand text',payload:{id:'symbol',name:'Brand text',prototype}}]);
    const graphics=JSON.parse(localStorage.getItem('ticket-editor:graphics:v1')!) as {styles:{id:string}[];symbols:{prototype:{id:string;styleId:string}}[]};
    expect(graphics.symbols[0].prototype.styleId).toBe(graphics.styles[0].id);expect(graphics.symbols[0].prototype.id).not.toBe(prototype.id);
  });
});
