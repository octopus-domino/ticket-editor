import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
const backend=new URL('../../ticket-pdf/',import.meta.url);
const destination=new URL('../tests/fixtures/journeys/',import.meta.url);
await mkdir(destination,{recursive:true});
for(const theme of ['rose','sage','ink']){
 for(const suffix of ['-document.json','.json','-pdf.png','.pdf']){
  const file=theme+suffix;
  await copyFile(new URL('target/test-artifacts/events/'+file,backend),new URL(file,destination));
 }
}
for(const [source,target]of [['proposal-document.json','proposal-document.json'],['proposal-artwork.json','proposal.json'],['proposal-first-page.png','proposal-pdf.png'],['proposal.pdf','proposal.pdf']])await copyFile(new URL('target/test-artifacts/'+source,backend),new URL(target,destination));
const fonts=new URL('fonts/',destination);await mkdir(fonts,{recursive:true});
const notices=new Set();
for(const font of ['DejaVuSans','DejaVuSans-Bold','DejaVuSerif','DejaVuSerif-Italic']){
 const source=new URL(`src/main/resources/fonts/${font}.ttf`,backend);
 await copyFile(source,new URL(`${font}.ttf`,fonts));
 // Carry the copyright and license notices already embedded in the supplied font files.
 const bytes=await readFile(source);const count=bytes.readUInt16BE(4);
 for(let i=0;i<count;i++){
  const record=12+i*16;if(bytes.toString('ascii',record,record+4)!=='name')continue;
  const offset=bytes.readUInt32BE(record+8),names=bytes.readUInt16BE(offset+2),strings=offset+bytes.readUInt16BE(offset+4);
  for(let j=0;j<names;j++){
   const entry=offset+6+j*12,platform=bytes.readUInt16BE(entry),id=bytes.readUInt16BE(entry+6);
   if(platform!==3||![0,13,14].includes(id))continue;
   const length=bytes.readUInt16BE(entry+8),start=strings+bytes.readUInt16BE(entry+10);
   const text=Buffer.from(bytes.subarray(start,start+length)).swap16().toString('utf16le');
   notices.add(text.trim());
  }
 }
}
if(!notices.size)throw new Error('Font license notices were not found');
await writeFile(new URL('LICENSE.txt',fonts),[...notices].join('\n\n').replace(/[ \t]+$/gm,'')+'\n');
process.stdout.write('Updated synthetic browser/PDF fixtures and bundled font notices.\n');
