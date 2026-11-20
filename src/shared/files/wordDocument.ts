import { strToU8, zipSync } from 'fflate';

const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const packageNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const officeNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
function escapeXml(text: string) {
  // Strip characters forbidden by XML 1.0.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, '').replace(/[&<>"']/g, value => escapes[value]);
}

export type WordParagraph = { text: string; heading?: 1 | 2; link?: string };
export type WordPageImage = { bytes: Uint8Array; width: number; height: number; title: string };

function imageParagraph(image: WordPageImage, index: number) {
  const scale = Math.min(6.5 / image.width, 9 / image.height);
  const width = Math.round(image.width * scale * 914400);
  const height = Math.round(image.height * scale * 914400);
  const extent = `cx="${width}" cy="${height}"`;
  const title = escapeXml(image.title);
  return `<w:p>${index > 0 ? '<w:pPr><w:pageBreakBefore/></w:pPr>' : ''}
    <w:r><w:drawing><wp:inline><wp:extent ${extent}/><wp:docPr id="${index + 1}" name="${title}"/>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${title}"/><pic:cNvPicPr/></pic:nvPicPr>
          <pic:blipFill><a:blip r:embed="image${index + 1}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
          <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext ${extent}/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
        </pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

export function wordDocument(paragraphs: WordParagraph[], images: WordPageImage[] = []): Blob {
  const links: string[] = [];
  const body = paragraphs.map(({ text, heading, link }) => {
    const size = heading === 1 ? 34 : heading === 2 ? 26 : 22;
    const url = link && /^https?:\/\//i.test(link) ? link : undefined;
    const properties = heading
      ? `<w:pPr><w:keepNext/><w:outlineLvl w:val="${heading - 1}"/></w:pPr>` : '';
    const linkStyle = url ? '<w:color w:val="0563C1"/><w:u w:val="single"/>' : '';
    const content = escapeXml(text).split(/\r?\n/).map(line => `<w:t xml:space="preserve">${line}</w:t>`).join('<w:br/>');
    const run = `<w:r><w:rPr>${heading ? '<w:b/>' : ''}${linkStyle}<w:sz w:val="${size}"/></w:rPr>${content}</w:r>`;
    const inline = url ? `<w:hyperlink r:id="link${links.push(url)}">${run}</w:hyperlink>` : run;
    return `<w:p>${properties}${inline}</w:p>`;
  }).join('');
  const imageBody = images.map(imageParagraph).join('');
  const imageRelationships = images.map((_, index) =>
    `<Relationship Id="image${index + 1}" Type="${officeNS}/image" Target="media/page${index + 1}.png"/>`).join('');
  const relationships = links.map((url, index) =>
    `<Relationship Id="link${index + 1}" Type="${officeNS}/hyperlink" Target="${escapeXml(url)}" TargetMode="External"/>`).join('');
  const imageParts = Object.fromEntries(images.map((image, index) => [`word/media/page${index + 1}.png`, image.bytes]));
  const document = zipSync({
    ...imageParts,
    '[Content_Types].xml': new Uint8Array(strToU8(declaration + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')),
    '_rels/.rels': new Uint8Array(strToU8(declaration + `<Relationships xmlns="${packageNS}"><Relationship Id="doc" Type="${officeNS}/officeDocument" Target="word/document.xml"/></Relationships>`)),
    'word/_rels/document.xml.rels': new Uint8Array(strToU8(declaration + `<Relationships xmlns="${packageNS}">${relationships}${imageRelationships}</Relationships>`)),
    'word/document.xml': new Uint8Array(strToU8(declaration + `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${officeNS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}${imageBody}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`)),
  });
  return new Blob([document], { type: mime });
}
