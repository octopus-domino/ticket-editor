import { expect, type Page } from '@playwright/test';

export interface WalkPoint {
  lat: number;
  lng: number;
  name: string;
  description?: string;
  note?: string;
  sourceUrl?: string;
  photoReference?: string;
  source?: string;
  theme?: string;
  architect?: string;
  visitStatus?: string;
  inOsm?: boolean;
  schedule?: Record<string, { working_hours: { from: string; to: string }[] }>;
}

export function point(name: string, index: number, details: Partial<WalkPoint> = {}): WalkPoint {
  return { name, lat: 52.50 + index * 0.0005, lng: 13.40 + index * 0.0005, ...details };
}

export async function walkFrame(page: Page, title: string, points: WalkPoint[]) {
  const walk = {
    version: 1, id: 'fixture-walk', title, points,
    route: { legs: points.slice(1).map((next, index) => ({ fromIndex: index, toIndex: index + 1,
      geometry: [[points[index].lat, points[index].lng], [next.lat, next.lng]],
      durationSeconds: 120, distanceMeters: 100,
    })) },
  };
  await page.route('**/private-journey/?*', route => route.fulfill({
    contentType: 'text/html',
    body: '<button id="send">Return selected walk</button><script>' +
      'document.getElementById("send").onclick=()=>parent.postMessage({type:"private-walk:complete",' +
      'channel:new URLSearchParams(location.search).get("channel"),walk:' + JSON.stringify(walk).replaceAll('<', '\\u003c') +
      '},location.origin)</script>',
  }));
}

export async function selectWalk(page: Page, address = 'Berlin Museum') {
  const stops = page.locator('.route-stops > li');
  await stops.nth(1).getByRole('combobox', { name: 'Address', exact: true }).fill('Museum Berlin');
  await page.getByRole('option', { name: address, exact: true }).getByRole('button').click();
  const panel = stops.nth(1).locator('.route-place-panel');
  await panel.locator(':scope > summary').click();
  await panel.getByRole('button', { name: 'Private itineraries ↗', exact: true }).click();
  await page.frameLocator('iframe[title="Private itineraries"]').getByRole('button', { name: 'Return selected walk' }).click();
  await expect(page.locator('dialog.private-walk-overlay')).toHaveCount(0);
  await expect(stops).toHaveCount(2);
  return { panel, stops };
}

export async function photoFixtures(page: Page) {
  const media = new Map<string, string>();
  await page.route('https://commons.wikimedia.org/w/api.php?*', route => {
    const reference = new URL(route.request().url()).searchParams.get('titles');
    return route.fulfill({ json: { query: { pages: [{ imageinfo: [{
      thumburl: 'https://upload.wikimedia.org/walk.jpg', mime: 'image/jpeg', extmetadata: {
        Artist: { value: '<a>Fixture photographer</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' },
        LicenseUrl: reference === 'File:Unlicensed.jpg' ? undefined : { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      },
    }] }] } } });
  });
  await page.route('https://upload.wikimedia.org/walk.jpg', route =>
    route.fulfill({ path: 'public/backgrounds/thumbs/sage-paper.jpg', contentType: 'image/jpeg' }));
  await page.route('**/api/journeys/media**', route => {
    if (route.request().method() === 'POST') {
      const id = (media.size + 1).toString(16).padStart(64, '0');
      media.set(id, route.request().postDataJSON().image);
      return route.fulfill({ json: { id } });
    }
    const image = media.get(new URL(route.request().url()).pathname.split('/').at(-1)!);
    return image ? route.fulfill({ contentType: 'image/jpeg', body: Buffer.from(image.split(',')[1], 'base64') })
      : route.fulfill({ status: 404 });
  });
  return media;
}
