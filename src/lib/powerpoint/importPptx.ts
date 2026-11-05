import type { Slide,CanvasElement,BasicShape } from '@/shared/types';
import { DocumentSchema } from '@/shared/schemas/document';
import { newSimpleText,newShape,newTable,newChart } from '@/lib/factories';
import { unpack,parseXml,readRelationships,fingerprint } from './package';
import { strFromU8 } from 'fflate';

const descendants=(node:Element|Document,name:string)=>Array.from(node.getElementsByTagNameNS('*',name));
const first=(node:Element|Document,name:string)=>descendants(node,name)[0];
const val=(node:Element|undefined,name:string,fallback=0)=>{const n=Number(node?.getAttribute(name));return node?.hasAttribute(name)&&Number.isFinite(n)?n:fallback;};
const id=()=>crypto.randomUUID();
const px=(n:number)=>n/9525;
function safe(value:unknown,depth=0):boolean{return depth<40&&(!value||typeof value!=='object'||Object.entries(value).every(([key,child])=>!['__proto__','constructor','prototype'].includes(key)&&safe(child,depth+1)));}
function base64(bytes:Uint8Array){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
interface Mapping {x:number;y:number;sx:number;sy:number}
export interface PptxImport {slides:Slide[];warnings:string[]}
export async function importPptx(bytes:Uint8Array):Promise<PptxImport>{
  const files=unpack(bytes),warnings=new Set<string>();
  if(files['codoc/source.json']){
    try{const source=JSON.parse(strFromU8(files['codoc/source.json'])) as {version:number;fingerprint:string;slides:Slide[]};
      if(source.version===1&&source.fingerprint===await fingerprint(files)&&safe(source)){
        const parsed=DocumentSchema.safeParse({version:'2.0',slides:source.slides,data:[]});if(parsed.success)return {slides:source.slides.map(slide=>({...slide,id:id()})),warnings:[]};
      }
    }catch{/* Treat changed or invalid source metadata as an ordinary presentation. */}
  }
  const main=readRelationships(files,'').values();const mainPart=Array.from(main).find(r=>r.type.endsWith('/officeDocument'))?.target??'ppt/presentation.xml';
  const presentation=parseXml(files[mainPart]),presRels=readRelationships(files,mainPart),size=first(presentation,'sldSz');
  const width=px(val(size,'cx',12192000)),height=px(val(size,'cy',6858000));
  if(![width,height].every(n=>n>0&&n<=4096))throw Error('PowerPoint page exceeds 4096 px');
  const slideIds=descendants(presentation,'sldId');if(!slideIds.length||slideIds.length>100)throw Error('PowerPoint import requires 1..100 slides');
  const themePath=Object.keys(files).find(path=>/^ppt\/theme\/theme\d+\.xml$/.test(path)),theme=themePath?parseXml(files[themePath]):null;
  const themeColors=new Map<string,string>();for(const item of Array.from(first(theme??presentation,'clrScheme')?.children??[])){const c=first(item,'srgbClr')?.getAttribute('val')??first(item,'sysClr')?.getAttribute('lastClr');if(c)themeColors.set(item.localName,'#'+c);}
  themeColors.set('bg1',themeColors.get('lt1')??'#ffffff');themeColors.set('tx1',themeColors.get('dk1')??'#20283e');
  function color(node:Element|undefined,fallback:string){if(!node)return fallback;const rgb=first(node,'srgbClr')?.getAttribute('val');if(rgb&&/^[a-f\d]{6}$/i.test(rgb))return '#'+rgb;const scheme=first(node,'schemeClr')?.getAttribute('val');return scheme?themeColors.get(scheme)??fallback:fallback;}
  const slides:Slide[]=[];
  for(const [index,sid]of slideIds.entries()){
    const rid=sid.getAttribute('r:id')??sid.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),part=presRels.get(rid??'')?.target;
    if(!part)throw Error('PowerPoint slide relationship is missing');const doc=parseXml(files[part]),rels=readRelationships(files,part);
    const layoutPart=Array.from(rels.values()).find(r=>r.type.endsWith('/slideLayout'))?.target,layout=layoutPart&&files[layoutPart]?parseXml(files[layoutPart]):null;
    const masterPart=layoutPart?Array.from(readRelationships(files,layoutPart).values()).find(r=>r.type.endsWith('/slideMaster'))?.target:undefined,master=masterPart&&files[masterPart]?parseXml(files[masterPart]):null;
    const inherited=[...(layout?descendants(layout,'sp'):[]),...(master?descendants(master,'sp'):[])];
    const elements:CanvasElement[]=[];
    const slide:Slide={id:id(),name:first(doc,'cSld')?.getAttribute('name')||`Slide ${index+1}`,width,height,format:'custom',orientation:width>height?'landscape':'portrait',background:color(first(doc,'bgPr')??(layout?first(layout,'bgPr'):undefined)??(master?first(master,'bgPr'):undefined),'#ffffff'),padding:{top:0,right:0,bottom:0,left:0},elements};
    function visit(tree:Element,origin:Mapping,activeRels=rels,includePlaceholders=true){for(const node of Array.from(tree.children)){
      if(!includePlaceholders&&first(node,'ph'))continue;
      if(node.localName==='grpSp'){
        const x=first(node,'xfrm'),off=x?first(x,'off'):undefined,ext=x?first(x,'ext'):undefined,chOff=x?first(x,'chOff'):undefined,chExt=x?first(x,'chExt'):undefined;
        const sx=val(ext,'cx',1)/Math.max(1,val(chExt,'cx',1)),sy=val(ext,'cy',1)/Math.max(1,val(chExt,'cy',1));
        if(val(x,'rot'))warnings.add('Rotated groups were flattened; review their positions.');
        visit(node,{x:origin.x+(px(val(off,'x'))-px(val(chOff,'x'))*sx)*origin.sx,y:origin.y+(px(val(off,'y'))-px(val(chOff,'y'))*sy)*origin.sy,sx:origin.sx*sx,sy:origin.sy*sy},activeRels,includePlaceholders);continue;
      }
      if(!['sp','pic','graphicFrame','cxnSp'].includes(node.localName))continue;
      const placeholder=first(node,'ph'),layoutShape=placeholder?inherited.find(item=>{const p=first(item,'ph');return p&&(p.getAttribute('idx')??'0')===(placeholder.getAttribute('idx')??'0')&&(p.getAttribute('type')??'body')===(placeholder.getAttribute('type')??'body');}):undefined;
      const xfrm=first(node,'xfrm')??(layoutShape?first(layoutShape,'xfrm'):undefined),off=xfrm?first(xfrm,'off'):undefined,ext=xfrm?first(xfrm,'ext'):undefined;
      const bounds={id:id(),x:origin.x+px(val(off,'x'))*origin.sx,y:origin.y+px(val(off,'y'))*origin.sy,width:Math.max(1,px(val(ext,'cx',1905000))*origin.sx),height:Math.max(1,px(val(ext,'cy',952500))*origin.sy),rotation:val(xfrm,'rot')/60000,flipX:xfrm?.getAttribute('flipH')==='1',flipY:xfrm?.getAttribute('flipV')==='1'};
      if(elements.length>=2000)throw Error('PowerPoint slide exceeds 2000 objects');
      if(node.localName==='pic'){
        const blip=first(node,'blip'),image=activeRels.get(blip?.getAttribute('r:embed')??''),path=image?.target,extension=path?.split('.').pop()?.toLowerCase(),mime=extension==='jpg'||extension==='jpeg'?'jpeg':extension==='png'?'png':extension==='gif'?'gif':extension==='svg'?'svg+xml':null;
        if(!path||!files[path]||!mime){warnings.add('Some linked or unsupported images could not be imported. Embed them in PowerPoint first.');continue;}
        elements.push({...bounds,type:'image',src:`data:image/${mime};base64,${base64(files[path])}`});continue;
      }
      const table=first(node,'tbl');if(table){const rows=Array.from(table.children).filter(e=>e.localName==='tr'),data=rows.map(row=>Array.from(row.children).filter(e=>e.localName==='tc').map(cell=>descendants(cell,'p').map(p=>descendants(p,'t').map(t=>t.textContent??'').join('')).join('\n')));const cols=Math.max(...data.map(row=>row.length));if(cols>100||data.length>1000)throw Error('PowerPoint table is too large');if(descendants(table,'tc').some(cell=>val(cell,'gridSpan')>1||val(cell,'rowSpan')>1))warnings.add('Merged table cells were imported as a regular editable grid.');elements.push({...newTable(),...bounds,rows:data.length,cols,data:data.map(row=>Array.from({length:cols},(_,i)=>row[i]??'')),fontSize:val(first(table,'rPr'),'sz',1200)/75,headerBg:color(first(table,'tcPr'),'#eceaf7')});continue;}
      const chartRef=first(node,'chart');if(chartRef){const chartPart=rels.get(chartRef.getAttribute('r:id')??'')?.target;if(chartPart&&files[chartPart]){const chart=parseXml(files[chartPart]),series=descendants(chart,'ser'),values=series[0]?descendants(first(series[0],'val')??series[0],'pt').map(pt=>Number(first(pt,'v')?.textContent)).filter(Number.isFinite):[];if(values.length){elements.push({...newChart('bar'),...bounds,chartKind:first(chart,'doughnutChart')?'donut':'bar',values});if(series.length>1)warnings.add('Only the first chart series was imported.');continue;}}warnings.add('A chart has no cached values and could not be imported.');continue;}
      const paragraphs=descendants(node,'p'),text=paragraphs.map(p=>Array.from(p.children).map(run=>run.localName==='br'?'\n':descendants(run,'t').map(t=>t.textContent??'').join('')).join('')).join('\n');
      const rPr=first(node,'rPr')??(layoutShape?first(layoutShape,'defRPr'):undefined),fontSize=val(rPr,'sz',1800)/75*Math.min(origin.sx,origin.sy),fontFamily=first(node,'latin')?.getAttribute('typeface')??'Arial';
      const style=[rPr?.getAttribute('b')==='1'?'bold':'',rPr?.getAttribute('i')==='1'?'italic':''].filter(Boolean).join(' ')||'normal',pPr=first(node,'pPr'),align=({l:'left',ctr:'center',r:'right',just:'justify'} as const)[pPr?.getAttribute('algn') as 'l']??'left';
      const geom=first(node,'prstGeom')?.getAttribute('prst')??'rect',shapeProps=Array.from(node.children).find(e=>e.localName==='spPr'),fill=shapeProps?Array.from(shapeProps.children).find(e=>e.localName==='solidFill'):undefined,outline=shapeProps?Array.from(shapeProps.children).find(e=>e.localName==='ln'):undefined;
      const preset:Record<string,BasicShape>={rect:'rect',roundRect:'roundRect',ellipse:'circle',triangle:'triangle',star5:'star',rightArrow:'arrow'};
      const textBox=first(node,'cNvSpPr')?.getAttribute('txBox')==='1'||(text&&!fill&&geom==='rect');
      if(textBox){const body=first(node,'bodyPr');elements.push({...newSimpleText(),...bounds,text,richText:false,fontSize,fontFamily:fontFamily.startsWith('+')?'Arial':fontFamily,fontStyle:style,fill:color(rPr,'#20283e'),align,background:color(fill,'transparent'),padding:{left:px(val(body,'lIns')),right:px(val(body,'rIns')),top:px(val(body,'tIns')),bottom:px(val(body,'bIns'))},lineHeight:val(first(node,'spcPct'),'val',120000)/100000});}
      else {if(!preset[geom]||first(node,'custGeom'))warnings.add('Some custom shapes were approximated; review their geometry.');elements.push({...newShape(preset[geom]??'rect'),...bounds,fill:color(fill,'transparent'),stroke:color(outline,'transparent'),strokeWidth:px(val(outline,'w',9525)),text,fontSize,textFill:color(rPr,'#20283e'),textFontFamily:fontFamily,textFontStyle:style,textAlign:align});}
    }}
    const origin={x:0,y:0,sx:1,sy:1};
    if(master&&masterPart){const tree=first(master,'spTree');if(tree)visit(tree,origin,readRelationships(files,masterPart),false);}
    if(layout&&layoutPart){const tree=first(layout,'spTree');if(tree)visit(tree,origin,readRelationships(files,layoutPart),false);}
    const tree=first(doc,'spTree');if(tree)visit(tree,origin);
    if(first(doc,'transition')||first(doc,'timing'))warnings.add('Animations and transitions are not imported.');
    slides.push(slide);
  }
  if(!DocumentSchema.safeParse({version:'2.0',slides,data:[]}).success)throw Error('PowerPoint contains unsupported or invalid document data');
  return {slides,warnings:[...warnings]};
}
