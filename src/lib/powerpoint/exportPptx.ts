import type { CanvasElement, Slide, TextElement } from '@/shared/types';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import { svgToPng } from '@/lib/svg/toPng';
import {
  A,
  namespaces,
  escape,
  emu,
  color,
  relationship,
  relationships,
  groupRoot,
  bytes,
  pack,
  fingerprint,
} from './package';

function transform(el: CanvasElement, scale: number, dx: number, dy: number) {
  return [
    `<a:xfrm rot="${Math.round((el.rotation ?? 0) * 60000)}"${el.flipX ? ' flipH="1"' : ''}${el.flipY ? ' flipV="1"' : ''}>`,
    `<a:off x="${emu(dx + el.x * scale)}" y="${emu(dy + el.y * scale)}"/>`,
    `<a:ext cx="${emu(Math.max(0.01, el.width * scale))}" cy="${emu(Math.max(0.01, el.height * scale))}"/>`,
    `</a:xfrm>`,
  ].join('');
}
function nv(id: number, name: string, text = false) {
  return `<p:nvSpPr><p:cNvPr id="${id}" name="${escape(name)}"/><p:cNvSpPr${text ? ' txBox="1"' : ''}/><p:nvPr/></p:nvSpPr>`;
}
function paragraphs(
  text: string,
  fontSize: number,
  fill: string,
  fontFamily = 'Arial',
  fontStyle = '',
  align = 'left',
  lineHeight = 1.2,
) {
  return text
    .split(/\r?\n/)
    .map((line) =>
      [
        `<a:p>`,
        `<a:pPr algn="${{ left: 'l', center: 'ctr', right: 'r', justify: 'just' }[align] ?? 'l'}">`,
        `<a:lnSpc>`,
        `<a:spcPct val="${Math.round(lineHeight * 100000)}"/>`,
        `</a:lnSpc>`,
        `</a:pPr>`,
        `<a:r>`,
        `<a:rPr lang="en-US" sz="${Math.round(fontSize * 75)}" b="${fontStyle.includes('bold') ? 1 : 0}" i="${fontStyle.includes('italic') ? 1 : 0}">`,
        `<a:solidFill>`,
        `<a:srgbClr val="${color(fill, '20283E')}"/>`,
        `</a:solidFill>`,
        `<a:latin typeface="${escape(fontFamily)}"/>`,
        `</a:rPr>`,
        `<a:t xml:space="preserve">${escape(line)}</a:t>`,
        `</a:r>`,
        `<a:endParaRPr lang="en-US" sz="${Math.round(fontSize * 75)}"/>`,
        `</a:p>`,
      ].join(''),
    )
    .join('');
}
const solid = (value: string) =>
  value === 'transparent' || value === 'none'
    ? '<a:noFill/>'
    : `<a:solidFill><a:srgbClr val="${color(value)}"/></a:solidFill>`;
function textBody(el: TextElement, scale: number) {
  const p = el.padding;
  return [
    `<p:txBody>`,
    `<a:bodyPr wrap="square" lIns="${emu((p?.left ?? 0) * scale)}" tIns="${emu((p?.top ?? 0) * scale)}" rIns="${emu((p?.right ?? 0) * scale)}" bIns="${emu((p?.bottom ?? 0) * scale)}" anchor="${el.verticalAlign === 'middle' ? 'ctr' : el.verticalAlign === 'bottom' ? 'b' : 't'}">`,
    `<a:noAutofit/>`,
    `</a:bodyPr>`,
    `<a:lstStyle/>${paragraphs(el.text, el.fontSize * scale, el.fill, el.fontFamily, el.fontStyle, el.align, el.lineHeight)}</p:txBody>`,
  ].join('');
}
export interface PptxExport {
  bytes: Uint8Array;
  warnings: string[];
}
export async function exportPptx(slides: readonly Slide[]): Promise<PptxExport> {
  if (!slides.length || slides.length > 100)
    throw Error('PowerPoint export requires 1..100 slides');
  const width = slides[0].width;
  const height = slides[0].height;
  if (width > 4096 || height > 4096) throw Error('PowerPoint page exceeds 4096 px');
  const files: Record<string, Uint8Array> = {};
  const warnings = new Set<string>();
  const overrides: string[] = [];
  const add = (name: string, content: string, type?: string) => {
    files[name] = bytes(content);
    if (type)
      overrides.push(
        `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.${type}+xml"/>`,
      );
  };
  const presRels = [
    relationship('master', 'slideMaster', 'slideMasters/slideMaster1.xml'),
    relationship('props', 'presProps', 'presProps.xml'),
  ];
  let media = 0;
  for (const [index, slide] of slides.entries()) {
    const n = index + 1;
    const rels = [relationship('layout', 'slideLayout', '../slideLayouts/slideLayout1.xml')];
    const objects: string[] = [];
    let id = 2;
    const scale = Math.min(width / slide.width, height / slide.height);
    const dx = (width - slide.width * scale) / 2;
    const dy = (height - slide.height * scale) / 2;
    if (scale !== 1) warnings.add('Slides with different sizes were fitted to the first slide.');
    for (const el of slide.elements) {
      if (el.type === 'group') continue;
      const currentId = id++;
      const xfrm = transform(el, scale, dx, dy);
      if (el.type === 'text' && !el.richText) {
        objects.push(
          `<p:sp>${nv(currentId, el.text.slice(0, 40), true)}<p:spPr>${xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>${textBody(el, scale)}</p:sp>`,
        );
        continue;
      }
      if (
        el.type === 'shape' &&
        !el.rasterFill &&
        !el.appearance &&
        !el.polygonPoints &&
        !el.polygonSubpaths &&
        ['rect', 'roundRect', 'circle', 'triangle', 'star', 'arrow'].includes(el.shape)
      ) {
        const preset =
          (
            {
              rect: 'rect',
              roundRect: 'roundRect',
              circle: 'ellipse',
              triangle: 'triangle',
              star: 'star5',
              arrow: 'rightArrow',
            } as Record<string, string>
          )[el.shape] ?? 'rect';
        const text = el.text
          ? `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs(el.text, el.fontSize * scale, el.textFill ?? '#20283e', el.textFontFamily ?? 'Arial', el.textFontStyle ?? '', el.textAlign ?? 'left')}</p:txBody>`
          : '';
        objects.push(
          `<p:sp>${nv(currentId, el.shape)}<p:spPr>${xfrm}<a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>${solid(el.fill)}<a:ln w="${emu((el.strokeWidth ?? 0) * scale)}">${solid(el.strokeWidth ? el.stroke : 'none')}</a:ln></p:spPr>${text}</p:sp>`,
        );
        continue;
      }
      if (el.type === 'table') {
        const w = emu(el.width * scale);
        const h = emu(el.height * scale);
        const fill = color(el.headerBg);
        const border = color(el.borderColor, 'CBD5E1');
        const rows = el.data
          .map(
            (row, ri) =>
              `<a:tr h="${Math.round(h / el.rows)}">${row
                .map((cell) =>
                  [
                    `<a:tc>`,
                    `<a:txBody>`,
                    `<a:bodyPr/>`,
                    `<a:lstStyle/>${paragraphs(cell, el.fontSize * scale, '#20283e', 'Arial', ri === 0 ? 'bold' : '')}</a:txBody>`,
                    `<a:tcPr marL="${emu(8 * scale)}" marR="${emu(8 * scale)}" marT="${emu(6 * scale)}" marB="${emu(6 * scale)}">${['L', 'R', 'T', 'B'].map((side) => `<a:ln${side} w="6350"><a:solidFill><a:srgbClr val="${border}"/></a:solidFill></a:ln${side}>`).join('')}<a:solidFill>`,
                    `<a:srgbClr val="${ri === 0 ? fill : 'FFFFFF'}"/>`,
                    `</a:solidFill>`,
                    `</a:tcPr>`,
                    `</a:tc>`,
                  ].join(''),
                )
                .join('')}</a:tr>`,
          )
          .join('');
        objects.push(
          [
            `<p:graphicFrame>`,
            `<p:nvGraphicFramePr>`,
            `<p:cNvPr id="${currentId}" name="Table"/>`,
            `<p:cNvGraphicFramePr/>`,
            `<p:nvPr/>`,
            `</p:nvGraphicFramePr>`,
            `<p:xfrm>`,
            `<a:off x="${emu(dx + el.x * scale)}" y="${emu(dy + el.y * scale)}"/>`,
            `<a:ext cx="${w}" cy="${h}"/>`,
            `</p:xfrm>`,
            `<a:graphic>`,
            `<a:graphicData uri="${A}/table">`,
            `<a:tbl>`,
            `<a:tblPr firstRow="1"/>`,
            `<a:tblGrid>${Array.from({ length: el.cols }, () => `<a:gridCol w="${Math.round(w / el.cols)}"/>`).join('')}</a:tblGrid>${rows}</a:tbl>`,
            `</a:graphicData>`,
            `</a:graphic>`,
            `</p:graphicFrame>`,
          ].join(''),
        );
        continue;
      }
      let image: Uint8Array;
      let extension = 'png';
      if (el.type === 'image' && /^data:image\/(png|jpeg);base64,/i.test(el.src)) {
        const [, mime, payload] = el.src.match(/^data:image\/(png|jpeg);base64,(.+)$/is)!;
        extension = mime.toLowerCase() === 'jpeg' ? 'jpg' : 'png';
        image = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
      } else {
        warnings.add(
          'Complex objects were exported as images; the original editable CoDoc objects are retained for an unchanged round trip.',
        );
        const single: Slide = {
          ...slide,
          width: Math.max(1, el.width),
          height: Math.max(1, el.height),
          background: 'transparent',
          elements: [{ ...el, x: 0, y: 0, rotation: 0 } as CanvasElement],
        };
        const blob = await svgToPng(serializeSlideToSvg(single), single.width, single.height);
        image = new Uint8Array(await blob.arrayBuffer());
      }
      const filename = `image${++media}.${extension}`;
      const rid = `image${currentId}`;
      files[`ppt/media/${filename}`] = image;
      rels.push(relationship(rid, 'image', `../media/${filename}`));
      objects.push(
        [
          `<p:pic>`,
          `<p:nvPicPr>`,
          `<p:cNvPr id="${currentId}" name="${escape(el.type)}"/>`,
          `<p:cNvPicPr>`,
          `<a:picLocks noChangeAspect="1"/>`,
          `</p:cNvPicPr>`,
          `<p:nvPr/>`,
          `</p:nvPicPr>`,
          `<p:blipFill>`,
          `<a:blip r:embed="${rid}"/>`,
          `<a:stretch>`,
          `<a:fillRect/>`,
          `</a:stretch>`,
          `</p:blipFill>`,
          `<p:spPr>${xfrm}<a:prstGeom prst="rect">`,
          `<a:avLst/>`,
          `</a:prstGeom>`,
          `</p:spPr>`,
          `</p:pic>`,
        ].join(''),
      );
    }
    add(
      `ppt/slides/slide${n}.xml`,
      `<p:sld ${namespaces}><p:cSld name="${escape(slide.name)}"><p:bg><p:bgPr>${solid(slide.background)}<a:effectLst/></p:bgPr></p:bg><p:spTree>${groupRoot}${objects.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
      'slide',
    );
    add(`ppt/slides/_rels/slide${n}.xml.rels`, relationships(rels));
    presRels.push(relationship(`s${n}`, 'slide', `slides/slide${n}.xml`));
  }
  add(
    'ppt/presentation.xml',
    [
      `<p:presentation ${namespaces}>`,
      `<p:sldMasterIdLst>`,
      `<p:sldMasterId id="2147483648" r:id="master"/>`,
      `</p:sldMasterIdLst>`,
      `<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="s${i + 1}"/>`).join('')}</p:sldIdLst>`,
      `<p:sldSz cx="${emu(width)}" cy="${emu(height)}"/>`,
      `<p:notesSz cx="6858000" cy="9144000"/>`,
      `<p:defaultTextStyle/>`,
      `</p:presentation>`,
    ].join(''),
    'presentation.main',
  );
  add('ppt/_rels/presentation.xml.rels', relationships(presRels));
  add('ppt/presProps.xml', `<p:presentationPr ${namespaces}/>`, 'presProps');
  const map =
    '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>';
  add(
    'ppt/slideMasters/slideMaster1.xml',
    [
      `<p:sldMaster ${namespaces}>`,
      `<p:cSld>`,
      `<p:spTree>${groupRoot}</p:spTree>`,
      `</p:cSld>${map}<p:sldLayoutIdLst>`,
      `<p:sldLayoutId id="2147483649" r:id="layout"/>`,
      `</p:sldLayoutIdLst>`,
      `<p:txStyles>`,
      `<p:titleStyle/>`,
      `<p:bodyStyle/>`,
      `<p:otherStyle/>`,
      `</p:txStyles>`,
      `</p:sldMaster>`,
    ].join(''),
    'slideMaster',
  );
  add(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    relationships([
      relationship('layout', 'slideLayout', '../slideLayouts/slideLayout1.xml'),
      relationship('theme', 'theme', '../theme/theme1.xml'),
    ]),
  );
  add(
    'ppt/slideLayouts/slideLayout1.xml',
    `<p:sldLayout ${namespaces} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${groupRoot}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    'slideLayout',
  );
  add(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    relationships([relationship('master', 'slideMaster', '../slideMasters/slideMaster1.xml')]),
  );
  const themeColors = [
    '000000',
    'FFFFFF',
    '20283E',
    'F1F5F9',
    '6554C0',
    '10B981',
    'F59E0B',
    'EF4444',
    '3B82F6',
    '64748B',
    '2563EB',
    '7C3AED',
  ];
  const schemes = [
    'dk1',
    'lt1',
    'dk2',
    'lt2',
    'accent1',
    'accent2',
    'accent3',
    'accent4',
    'accent5',
    'accent6',
    'hlink',
    'folHlink',
  ]
    .map((name, i) => `<a:${name}><a:srgbClr val="${themeColors[i]}"/></a:${name}>`)
    .join('');
  files['ppt/theme/theme1.xml'] = bytes(
    [
      `<a:theme xmlns:a="${A}" name="CoDoc">`,
      `<a:themeElements>`,
      `<a:clrScheme name="CoDoc">${schemes}</a:clrScheme>`,
      `<a:fontScheme name="CoDoc">`,
      `<a:majorFont>`,
      `<a:latin typeface="Arial"/>`,
      `<a:ea typeface=""/>`,
      `<a:cs typeface=""/>`,
      `</a:majorFont>`,
      `<a:minorFont>`,
      `<a:latin typeface="Arial"/>`,
      `<a:ea typeface=""/>`,
      `<a:cs typeface=""/>`,
      `</a:minorFont>`,
      `</a:fontScheme>`,
      `<a:fmtScheme name="CoDoc">`,
      `<a:fillStyleLst>${Array(3).fill('<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join('')}</a:fillStyleLst>`,
      `<a:lnStyleLst>${Array(3).fill('<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>').join('')}</a:lnStyleLst>`,
      `<a:effectStyleLst>${Array(3).fill('<a:effectStyle><a:effectLst/></a:effectStyle>').join('')}</a:effectStyleLst>`,
      `<a:bgFillStyleLst>${Array(3).fill('<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join('')}</a:bgFillStyleLst>`,
      `</a:fmtScheme>`,
      `</a:themeElements>`,
      `</a:theme>`,
    ].join(''),
  );
  overrides.push(
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
  );
  add(
    '_rels/.rels',
    relationships([relationship('presentation', 'officeDocument', 'ppt/presentation.xml')]),
  );
  add(
    '[Content_Types].xml',
    [
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
      `<Default Extension="xml" ContentType="application/xml"/>`,
      `<Default Extension="json" ContentType="application/json"/>`,
      `<Default Extension="png" ContentType="image/png"/>`,
      `<Default Extension="jpg" ContentType="image/jpeg"/>${overrides.join('')}</Types>`,
    ].join(''),
  );
  files['codoc/source.json'] = bytes(
    JSON.stringify({ version: 1, fingerprint: await fingerprint(files), slides }),
  );
  const output = pack(files);
  if (output.length > 30 * 1024 * 1024) throw Error('PowerPoint file exceeds 30 MB');
  return { bytes: output, warnings: [...warnings] };
}
