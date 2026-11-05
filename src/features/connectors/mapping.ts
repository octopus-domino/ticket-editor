export function sourceValue(row: Record<string,unknown>, path?: string): unknown {
  if(!path)return undefined;
  if(Object.prototype.hasOwnProperty.call(row,path))return row[path];
  let value:unknown=row;
  for(const part of path.split('.')){
    if(['__proto__','constructor','prototype'].includes(part))throw new Error('Unsafe source path');
    if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
    value=(value as Record<string,unknown>)[part];
  }return value;
}
export function sourceColumns(rows: readonly Record<string,unknown>[]): string[] {
  const result=new Set<string>();
  function visit(value:Record<string,unknown>,prefix='',depth=0){
    for(const [key,child]of Object.entries(value)){
      if(['__proto__','constructor','prototype','__metadata'].includes(key))continue;
      const path=prefix?`${prefix}.${key}`:key;
      if(child&&typeof child==='object'&&!Array.isArray(child)&&depth<3)visit(child as Record<string,unknown>,path,depth+1);
      else result.add(path);
      if(result.size>500)throw new Error('Maximum 500 source fields');
    }
  }
  rows.slice(0,20).forEach(row=>visit(row));return [...result];
}
export function convertSourceValue(value:unknown,type:string):unknown {
  if(typeof value!=='string')return value;
  if(type==='date'&&/^\d{4}-\d{2}-\d{2}T/.test(value))return value.slice(0,10);
  if(type==='number'&&value.trim())return Number(value.replace(',','.'));
  if(type==='boolean'&&['true','false'].includes(value))return value==='true';
  if(type==='array'||type==='object'){try{return JSON.parse(value) as unknown;}catch{return value;}}
  return value;
}
