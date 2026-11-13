import { API_BASE } from '@/shared/api/client';
import type { RoutePhoto } from '../domain/route';
import { routePointMarker } from '../domain/route';
import type { RouteStop } from '../domain/routeTimeline';

/** Photo cards occupy their own strip; leader lines share the map's projected coordinates. */
export async function drawMapCollage(context: CanvasRenderingContext2D, photos: RoutePhoto[], stops: RouteStop[],
  project: (stop: RouteStop) => { x: number; y: number }, width: number, mapHeight: number) {
  const images = await Promise.all(photos.map(async photo => {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.referrerPolicy = 'no-referrer';
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { image.src = ''; reject(new Error('Photo unavailable')); }, 8000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Photo unavailable')); };
      image.src = `${API_BASE}/api/journeys/media/${encodeURIComponent(photo.imageId)}`;
    });
    return image;
  }).map(pending=>pending.catch(()=>null)));
  const columns=Math.min(4,photos.length),rows=Math.ceil(photos.length/columns);
  const stripHeight=context.canvas.height-mapHeight-92,rowHeight=stripHeight/rows,imageHeight=Math.min(235,rowHeight-90);
  const gap = 24, cardWidth = (width - gap * (columns + 1)) / columns;
  context.fillStyle = '#f8f7ec'; context.fillRect(0, mapHeight, width, stripHeight);
  // Draw every leader first so none can cross over a previously painted photograph.
  for(const [index,photo] of photos.entries()){
    const stop=stops.find(item=>item.id===photo.stopId);if(!stop||!images[index])continue;
    const point=project(stop),x=gap+(index%columns)*(cardWidth+gap),y=mapHeight+16+Math.floor(index/columns)*rowHeight;
    context.save();context.beginPath();context.moveTo(point.x,point.y);context.lineTo(x+cardWidth/2,y);
    context.strokeStyle='#fff';context.lineWidth=8;context.stroke();context.setLineDash([10,10]);context.strokeStyle='#6d7165';context.lineWidth=3;context.stroke();context.restore();
  }
  for (const [index, photo] of photos.entries()) {
    const stopIndex = stops.findIndex(stop => stop.id === photo.stopId);
    if (stopIndex < 0 || !images[index]) continue;
    const stop = stops[stopIndex], x = gap + (index%columns) * (cardWidth + gap), y = mapHeight + 16+Math.floor(index/columns)*rowHeight;
    context.save();
    context.fillStyle = '#fff'; context.fillRect(x - 5, y - 5, cardWidth + 10, imageHeight+80);
    const image = images[index]!, scale = Math.max(cardWidth / image.width, imageHeight / image.height);
    context.beginPath(); context.rect(x, y, cardWidth, imageHeight); context.clip();
    context.drawImage(image, x + (cardWidth - image.width * scale) / 2, y + (imageHeight - image.height * scale) / 2, image.width * scale, image.height * scale);
    context.restore();
    context.beginPath(); context.arc(x + 32, y + 32, 28, 0, Math.PI * 2);
    context.fillStyle = '#244e42'; context.fill(); context.strokeStyle = '#fff'; context.lineWidth = 4; context.stroke();
    context.fillStyle = '#fff'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = 'bold 32px sans-serif';
    context.fillText(routePointMarker(stopIndex,stops.length), x + 32, y + 32);
    context.fillStyle = '#244e42'; context.textAlign = 'left'; context.font = '26px sans-serif';
    let label = stop.label;
    while (label.length > 1 && context.measureText(label).width > cardWidth - 14) label = label.slice(0, -1);
    context.fillText(label === stop.label ? label : `${label.slice(0, -1)}…`, x + 7, y + imageHeight+35);
    context.font = '18px sans-serif'; context.fillStyle = '#526258';
    context.fillText(`${photo.author} · ${photo.license}`, x + 7, y + imageHeight+63, cardWidth - 14);
  }
}
