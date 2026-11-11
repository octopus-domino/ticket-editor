import type { Slide, CanvasElement, BasicShape } from '@/shared/types';
import { DocumentSchema } from '@/shared/schemas/document';
import { newSimpleText, newShape, newTable, newChart, newLine } from '@/lib/factories';
import { unpack, parseXml, readRelationships, fingerprint } from './package';
import { strFromU8 } from 'fflate';
import { mixedTextRuns } from './textRuns';

const descendants = (node: Element | Document, name: string) =>
  Array.from(node.getElementsByTagNameNS('*', name));
const first = (node: Element | Document, name: string) => descendants(node, name)[0];
const attributeNumber = (node: Element | undefined, name: string, fallback = 0) => {
  const n = Number(node?.getAttribute(name));
  return node?.hasAttribute(name) && Number.isFinite(n) ? n : fallback;
};
const createId = () => crypto.randomUUID();
const toPixels = (n: number) => n / 9525;
function isSafeMetadata(value: unknown, depth = 0): boolean {
  return (
    depth < 40 &&
    (!value ||
      typeof value !== 'object' ||
      Object.entries(value).every(
        ([key, child]) =>
          !['__proto__', 'constructor', 'prototype'].includes(key) &&
          isSafeMetadata(child, depth + 1),
      ))
  );
}
function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
interface Mapping {
  x: number;
  y: number;
  sx: number;
  sy: number;
}
export interface PptxImport {
  slides: Slide[];
  warnings: string[];
}
type PptxFiles = Record<string, Uint8Array>;
type Relationships = ReturnType<typeof readRelationships>;
type ColorReader = (node: Element | undefined, fallback: string) => string;
interface ImportedBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

function readImage(
  node: Element,
  bounds: ImportedBounds,
  relationships: Relationships,
  files: PptxFiles,
  warnings: Set<string>,
): CanvasElement | null {
  const blip = first(node, 'blip');
  const image = relationships.get(blip?.getAttribute('r:embed') ?? '');
  const path = image?.target;
  const extension = path?.split('.').pop()?.toLowerCase();
  const mime =
    extension === 'jpg' || extension === 'jpeg'
      ? 'jpeg'
      : extension === 'png'
        ? 'png'
        : extension === 'gif'
          ? 'gif'
          : extension === 'svg'
            ? 'svg+xml'
            : null;
  if (!path || !files[path] || !mime) {
    warnings.add(
      'Some linked or unsupported images could not be imported. Embed them in PowerPoint first.',
    );
    return null;
  }
  return {
    ...bounds,
    type: 'image',
    src: `data:image/${mime};base64,${encodeBase64(files[path])}`,
  };
}

function readTable(
  table: Element,
  bounds: ImportedBounds,
  color: ColorReader,
  warnings: Set<string>,
): CanvasElement {
  const rows = Array.from(table.children).filter((e) => e.localName === 'tr');
  const data = rows.map((row) =>
    Array.from(row.children)
      .filter((e) => e.localName === 'tc')
      .map((cell) =>
        descendants(cell, 'p')
          .map((p) =>
            descendants(p, 't')
              .map((t) => t.textContent ?? '')
              .join(''),
          )
          .join('\n'),
      ),
  );
  const cols = Math.max(...data.map((row) => row.length));
  if (cols > 100 || data.length > 1000) throw Error('PowerPoint table is too large');
  if (
    descendants(table, 'tc').some(
      (cell) => attributeNumber(cell, 'gridSpan') > 1 || attributeNumber(cell, 'rowSpan') > 1,
    )
  )
    warnings.add('Merged table cells were imported as a regular editable grid.');
  return {
    ...newTable(),
    ...bounds,
    rows: data.length,
    cols,
    data: data.map((row) => Array.from({ length: cols }, (_, i) => row[i] ?? '')),
    fontSize: attributeNumber(first(table, 'rPr'), 'sz', 1200) / 75,
    headerBg: color(first(table, 'tcPr'), '#eceaf7'),
  };
}

function readChart(
  chartRef: Element,
  bounds: ImportedBounds,
  rels: Relationships,
  files: PptxFiles,
  warnings: Set<string>,
): CanvasElement | null {
  const chartPart = rels.get(chartRef.getAttribute('r:id') ?? '')?.target;
  if (chartPart && files[chartPart]) {
    const chart = parseXml(files[chartPart]);
    const series = descendants(chart, 'ser');
    const values = series[0]
      ? descendants(first(series[0], 'val') ?? series[0], 'pt')
          .map((pt) => Number(first(pt, 'v')?.textContent))
          .filter(Number.isFinite)
      : [];
    if (values.length) {
      if (series.length > 1) warnings.add('Only the first chart series was imported.');
      return {
        ...newChart('bar'),
        ...bounds,
        chartKind: first(chart, 'doughnutChart') ? 'donut' : 'bar',
        values,
      };
    }
  }
  warnings.add('A chart has no cached values and could not be imported.');
  return null;
}

function readTextOrShape(
  node: Element,
  bounds: ImportedBounds,
  layoutShape: Element | undefined,
  origin: Mapping,
  color: ColorReader,
  warnings: Set<string>,
  resolveFont: (name: string) => string,
): CanvasElement {
  const paragraphs = descendants(node, 'p');
  const text = paragraphs
    .map((p) =>
      Array.from(p.children)
        .map((run) =>
          run.localName === 'br'
            ? '\n'
            : descendants(run, 't')
                .map((t) => t.textContent ?? '')
                .join(''),
        )
        .join(''),
    )
    .join('\n');
  const rPr = first(node, 'rPr') ?? (layoutShape ? first(layoutShape, 'defRPr') : undefined);
  const fontSize = (attributeNumber(rPr, 'sz', 1800) / 75) * Math.min(origin.sx, origin.sy);
  const fontFamily = resolveFont(first(node, 'latin')?.getAttribute('typeface') ?? '+mn-lt');
  const style =
    [rPr?.getAttribute('b') === '1' ? 'bold' : '', rPr?.getAttribute('i') === '1' ? 'italic' : '']
      .filter(Boolean)
      .join(' ') || 'normal';
  const pPr = first(node, 'pPr');
  const align =
    ({ l: 'left', ctr: 'center', r: 'right', just: 'justify' } as const)[
      pPr?.getAttribute('algn') as 'l'
    ] ?? 'left';
  const geom = first(node, 'prstGeom')?.getAttribute('prst') ?? 'rect';
  const shapeProps = Array.from(node.children).find((e) => e.localName === 'spPr');
  const fill = shapeProps
    ? Array.from(shapeProps.children).find((e) => e.localName === 'solidFill')
    : undefined;
  const outline = shapeProps
    ? Array.from(shapeProps.children).find((e) => e.localName === 'ln')
    : undefined;
  const lineColor = color(outline, color(first(node, 'lnRef'), '#000000'));
  const shapeFill = color(fill, color(first(node, 'fillRef'), 'transparent'));
  if (geom === 'line' || node.localName === 'cxnSp') {
    const extent = first(first(node, 'xfrm') ?? node, 'ext');
    const width = toPixels(attributeNumber(extent, 'cx')) * origin.sx;
    const height = toPixels(attributeNumber(extent, 'cy')) * origin.sy;
    const angle = (bounds.rotation * Math.PI) / 180;
    return {
      ...newLine(),
      ...bounds,
      x: bounds.x + width / 2 - (Math.cos(angle) * width) / 2 + (Math.sin(angle) * height) / 2,
      y: bounds.y + height / 2 - (Math.sin(angle) * width) / 2 - (Math.cos(angle) * height) / 2,
      // Bake flips into endpoints: native canvas polylines use their actual points.
      points: [
        bounds.flipX ? width : 0,
        bounds.flipY ? height : 0,
        bounds.flipX ? 0 : width,
        bounds.flipY ? 0 : height,
      ],
      flipX: false,
      flipY: false,
      stroke: outline && first(outline, 'noFill') ? 'transparent' : lineColor,
      strokeWidth: toPixels(attributeNumber(outline, 'w', 9525)),
      isArrow: Boolean(
        first(node, 'tailEnd')?.getAttribute('type') &&
        first(node, 'tailEnd')?.getAttribute('type') !== 'none',
      ),
    };
  }
  const preset: Record<string, BasicShape> = {
    rect: 'rect',
    roundRect: 'roundRect',
    ellipse: 'circle',
    triangle: 'triangle',
    star5: 'star',
    rightArrow: 'arrow',
  };
  const textBox =
    first(node, 'cNvSpPr')?.getAttribute('txBox') === '1' || (text && !fill && geom === 'rect');
  if (textBox) {
    const body = first(node, 'bodyPr');
    const richText = mixedTextRuns(
      paragraphs,
      rPr,
      Math.min(origin.sx, origin.sy),
      resolveFont,
      color,
    );
    return {
      ...newSimpleText(),
      ...bounds,
      text: richText ?? text,
      richText: Boolean(richText),
      autoHeight: false,
      fontSize,
      fontFamily,
      fontStyle: style,
      fill: color(rPr, '#20283e'),
      align,
      background: color(fill, 'transparent'),
      padding: {
        left: toPixels(attributeNumber(body, 'lIns')),
        right: toPixels(attributeNumber(body, 'rIns')),
        top: toPixels(attributeNumber(body, 'tIns')),
        bottom: toPixels(attributeNumber(body, 'bIns')),
      },
      lineHeight: attributeNumber(first(node, 'spcPct'), 'val', 120000) / 100000,
    };
  } else {
    if (!preset[geom] || first(node, 'custGeom'))
      warnings.add('Some custom shapes were approximated; review their geometry.');
    return {
      ...newShape(preset[geom] ?? 'rect'),
      ...bounds,
      fill: shapeProps && first(shapeProps, 'noFill') && !fill ? 'transparent' : shapeFill,
      stroke:
        outline && first(outline, 'noFill')
          ? 'transparent'
          : color(outline, color(first(node, 'lnRef'), 'transparent')),
      strokeWidth: toPixels(attributeNumber(outline, 'w', 9525)),
      text,
      fontSize,
      textFill: color(rPr, '#20283e'),
      textFontFamily: fontFamily,
      textFontStyle: style,
      textAlign: align,
    };
  }
}

/** Restore native objects only when every PPTX part still matches our original export. */
async function restoreNativeSlides(files: PptxFiles): Promise<Slide[] | null> {
  if (files['codoc/source.json']) {
    try {
      const source = JSON.parse(strFromU8(files['codoc/source.json'])) as {
        version: number;
        fingerprint: string;
        slides: Slide[];
      };
      if (
        source.version === 1 &&
        source.fingerprint === (await fingerprint(files)) &&
        isSafeMetadata(source)
      ) {
        const parsed = DocumentSchema.safeParse({
          version: '2.0',
          slides: source.slides,
          data: [],
        });
        if (parsed.success) return source.slides.map((slide) => ({ ...slide, id: createId() }));
      }
    } catch {
      /* Treat changed or invalid source metadata as an ordinary presentation. */
    }
  }
  return null;
}

export async function importPptx(bytes: Uint8Array): Promise<PptxImport> {
  const files = unpack(bytes);
  const warnings = new Set<string>();
  const nativeSlides = await restoreNativeSlides(files);
  if (nativeSlides) return { slides: nativeSlides, warnings: [] };
  const main = readRelationships(files, '').values();
  const mainPart =
    Array.from(main).find((r) => r.type.endsWith('/officeDocument'))?.target ??
    'ppt/presentation.xml';
  const presentation = parseXml(files[mainPart]);
  const presRels = readRelationships(files, mainPart);
  const size = first(presentation, 'sldSz');
  const width = toPixels(attributeNumber(size, 'cx', 12192000));
  const height = toPixels(attributeNumber(size, 'cy', 6858000));
  if (![width, height].every((n) => n > 0 && n <= 4096))
    throw Error('PowerPoint page exceeds 4096 px');
  const slideIds = descendants(presentation, 'sldId');
  if (!slideIds.length || slideIds.length > 100)
    throw Error('PowerPoint import requires 1..100 slides');
  const themePath = Object.keys(files).find((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path));
  const theme = themePath ? parseXml(files[themePath]) : null;
  const fontScheme = theme ? first(theme, 'fontScheme') : undefined;
  function resolveFont(name: string) {
    if (!name.startsWith('+')) return name;
    const family = fontScheme
      ? first(fontScheme, name.startsWith('+mj') ? 'majorFont' : 'minorFont')
      : undefined;
    return (family ? first(family, 'latin')?.getAttribute('typeface') : undefined) || 'Arial';
  }
  const themeColors = new Map<string, string>();
  for (const item of Array.from(first(theme ?? presentation, 'clrScheme')?.children ?? [])) {
    const c =
      first(item, 'srgbClr')?.getAttribute('val') ?? first(item, 'sysClr')?.getAttribute('lastClr');
    if (c) themeColors.set(item.localName, '#' + c);
  }
  themeColors.set('bg1', themeColors.get('lt1') ?? '#ffffff');
  themeColors.set('tx1', themeColors.get('dk1') ?? '#20283e');
  function color(node: Element | undefined, fallback: string) {
    if (!node) return fallback;
    const rgb = first(node, 'srgbClr')?.getAttribute('val');
    if (rgb && /^[a-f\d]{6}$/i.test(rgb)) return '#' + rgb;
    const scheme = first(node, 'schemeClr')?.getAttribute('val');
    return scheme ? (themeColors.get(scheme) ?? fallback) : fallback;
  }
  const slides: Slide[] = [];
  for (const [index, sid] of slideIds.entries()) {
    const rid =
      sid.getAttribute('r:id') ??
      sid.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id',
      );
    const part = presRels.get(rid ?? '')?.target;
    if (!part) throw Error('PowerPoint slide relationship is missing');
    const doc = parseXml(files[part]);
    const rels = readRelationships(files, part);
    const layoutPart = Array.from(rels.values()).find((r) =>
      r.type.endsWith('/slideLayout'),
    )?.target;
    const layout = layoutPart && files[layoutPart] ? parseXml(files[layoutPart]) : null;
    const masterPart = layoutPart
      ? Array.from(readRelationships(files, layoutPart).values()).find((r) =>
          r.type.endsWith('/slideMaster'),
        )?.target
      : undefined;
    const master = masterPart && files[masterPart] ? parseXml(files[masterPart]) : null;
    const inherited = [
      ...(layout ? descendants(layout, 'sp') : []),
      ...(master ? descendants(master, 'sp') : []),
    ];
    const elements: CanvasElement[] = [];
    const slide: Slide = {
      id: createId(),
      name: first(doc, 'cSld')?.getAttribute('name') || `Slide ${index + 1}`,
      width,
      height,
      format: 'custom',
      orientation: width > height ? 'landscape' : 'portrait',
      background: color(
        first(doc, 'bgPr') ??
          (layout ? first(layout, 'bgPr') : undefined) ??
          (master ? first(master, 'bgPr') : undefined),
        '#ffffff',
      ),
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      elements,
    };
    function visit(tree: Element, origin: Mapping, activeRels = rels, includePlaceholders = true) {
      for (const node of Array.from(tree.children)) {
        if (!includePlaceholders && first(node, 'ph')) continue;
        if (node.localName === 'grpSp') {
          const x = first(node, 'xfrm');
          const off = x ? first(x, 'off') : undefined;
          const ext = x ? first(x, 'ext') : undefined;
          const chOff = x ? first(x, 'chOff') : undefined;
          const chExt = x ? first(x, 'chExt') : undefined;
          const sx = attributeNumber(ext, 'cx', 1) / Math.max(1, attributeNumber(chExt, 'cx', 1));
          const sy = attributeNumber(ext, 'cy', 1) / Math.max(1, attributeNumber(chExt, 'cy', 1));
          if (attributeNumber(x, 'rot'))
            warnings.add('Rotated groups were flattened; review their positions.');
          visit(
            node,
            {
              x:
                origin.x +
                (toPixels(attributeNumber(off, 'x')) - toPixels(attributeNumber(chOff, 'x')) * sx) *
                  origin.sx,
              y:
                origin.y +
                (toPixels(attributeNumber(off, 'y')) - toPixels(attributeNumber(chOff, 'y')) * sy) *
                  origin.sy,
              sx: origin.sx * sx,
              sy: origin.sy * sy,
            },
            activeRels,
            includePlaceholders,
          );
          continue;
        }
        if (!['sp', 'pic', 'graphicFrame', 'cxnSp'].includes(node.localName)) continue;
        const placeholder = first(node, 'ph');
        const layoutShape = placeholder
          ? inherited.find((item) => {
              const p = first(item, 'ph');
              return (
                p &&
                (p.getAttribute('idx') ?? '0') === (placeholder.getAttribute('idx') ?? '0') &&
                (p.getAttribute('type') ?? 'body') === (placeholder.getAttribute('type') ?? 'body')
              );
            })
          : undefined;
        const xfrm = first(node, 'xfrm') ?? (layoutShape ? first(layoutShape, 'xfrm') : undefined);
        const off = xfrm ? first(xfrm, 'off') : undefined;
        const ext = xfrm ? first(xfrm, 'ext') : undefined;
        const bounds = {
          id: createId(),
          x: origin.x + toPixels(attributeNumber(off, 'x')) * origin.sx,
          y: origin.y + toPixels(attributeNumber(off, 'y')) * origin.sy,
          width: Math.max(1, toPixels(attributeNumber(ext, 'cx', 1905000)) * origin.sx),
          height: Math.max(1, toPixels(attributeNumber(ext, 'cy', 952500)) * origin.sy),
          rotation: attributeNumber(xfrm, 'rot') / 60000,
          flipX: xfrm?.getAttribute('flipH') === '1',
          flipY: xfrm?.getAttribute('flipV') === '1',
        };
        if (elements.length >= 2000) throw Error('PowerPoint slide exceeds 2000 objects');
        if (node.localName === 'pic') {
          const image = readImage(node, bounds, activeRels, files, warnings);
          if (image) elements.push(image);
          continue;
        }
        const table = first(node, 'tbl');
        if (table) {
          elements.push(readTable(table, bounds, color, warnings));
          continue;
        }
        const chartRef = first(node, 'chart');
        if (chartRef) {
          const chart = readChart(chartRef, bounds, rels, files, warnings);
          if (chart) elements.push(chart);
          continue;
        }
        elements.push(
          readTextOrShape(node, bounds, layoutShape, origin, color, warnings, resolveFont),
        );
      }
    }
    const origin = { x: 0, y: 0, sx: 1, sy: 1 };
    if (master && masterPart) {
      const tree = first(master, 'spTree');
      if (tree) visit(tree, origin, readRelationships(files, masterPart), false);
    }
    if (layout && layoutPart) {
      const tree = first(layout, 'spTree');
      if (tree) visit(tree, origin, readRelationships(files, layoutPart), false);
    }
    const tree = first(doc, 'spTree');
    if (tree) visit(tree, origin);
    if (first(doc, 'transition') || first(doc, 'timing'))
      warnings.add('Animations and transitions are not imported.');
    slides.push(slide);
  }
  if (!DocumentSchema.safeParse({ version: '2.0', slides, data: [] }).success)
    throw Error('PowerPoint contains unsupported or invalid document data');
  return { slides, warnings: [...warnings] };
}
