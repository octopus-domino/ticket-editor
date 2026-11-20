import { expect, test } from '@playwright/test';

for (const width of [360, 768, 1440]) {
  test(`v2 workspace is usable by keyboard at ${width}px`, async ({ page }) => {
    test.skip(process.env.VITE_ENABLE_TRIP_PLANNER_V2 !== 'true', 'Requires opt-in v2 build');
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 880 });
    await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
    await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, json: {} }));
    await page.route('**/api/journeys/routes/addresses?**', route => route.fulfill({ json: [] }));
    await page.goto('/start/tours');
    const planner = page.getByRole('region', { name: 'Travel planner' });
    await expect(planner).toHaveAttribute('data-planner-v2', 'true');
    await planner.getByLabel('Start date').fill('2026-12-01');
    const program = planner.locator('.trip-day-program');
    await program.getByText('Plan the day', { exact: true }).click();
    for (const title of ['Museum', 'Park']) {
      const place = program.getByRole('combobox', { name: 'Address', exact: true });
      await place.fill(title);
      await place.press('Enter');
    }
    const stops = program.locator('[data-route-stop]');
    await expect(stops).toHaveCount(2);
    await stops.nth(1).getByRole('button', { name: /Move stop 2/ }).focus();
    await page.keyboard.press('ArrowUp');
    await expect(stops.first()).toContainText('Park');
    const widthResult = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(widthResult).toBeLessThanOrEqual(width + 2);
    await page.reload();
    await program.getByText('Plan the day', { exact: true }).click();
    await expect(stops.first()).toContainText('Park');
    await stops.first().getByRole('combobox', { name: 'Move to day' }).selectOption('2');
    await expect(stops.first()).toContainText('Museum');
    await planner.getByRole('button', { name: 'Next day' }).click();
    await program.getByText('Plan the day', { exact: true }).click();
    await expect(stops.first()).toContainText('Park');
    await page.goto('/start/tours?planner=classic');
    await expect(planner).toHaveAttribute('data-planner-v2', 'false');
    await expect(program).toHaveCount(0);
  });
}

test('shows a road-based optimization preview before apply and undo', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_TRIP_PLANNER_V2 !== 'true', 'Requires opt-in v2 build');
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('codoc:language', 'en'));
  const cities = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
  const coordinates = [37.60, 37.61, 37.62, 37.63];
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, json: {} }));
  await page.route('**/api/journeys/routes/addresses?**', route => {
    const label = new URL(route.request().url()).searchParams.get('q') ?? '';
    const index = cities.indexOf(label);
    return route.fulfill({ json: index < 0 ? [] : [{ label, longitude: coordinates[index], latitude: 55.75 }] });
  });
  await page.route('**/api/journeys/routes/road', route => {
    const { start, end, mode } = route.request().postDataJSON() as {
      start: { longitude: number; latitude: number }; end: { longitude: number; latitude: number }; mode: string;
    };
    expect(mode).toBe('foot');
    const edge = `${coordinates.indexOf(start.longitude)}${coordinates.indexOf(end.longitude)}`;
    const cost: Record<string, number> = { '01': 660, '12': 780, '23': 900, '02': 130, '21': 120, '13': 110 };
    const seconds = cost[edge] ?? 9990;
    return route.fulfill({ json: { durationSeconds: seconds, distanceMeters: seconds,
      coordinates: [[start.longitude, start.latitude], [end.longitude, end.latitude]] } });
  });
  await page.goto('/start/tours');
  const planner = page.getByRole('region', { name: 'Travel planner' });
  await planner.getByLabel('Start date').fill('2026-12-01');
  const program = planner.locator('.trip-day-program');
  await program.getByText('Plan the day', { exact: true }).click();
  for (const label of cities) {
    await program.getByRole('combobox', { name: 'Address', exact: true }).fill(label);
    await program.getByRole('listbox').getByRole('button', { name: label, exact: true }).click();
  }
  const order = () => program.locator('[data-route-stop] > strong').allTextContents();
  expect(await order()).toEqual(cities);
  await program.getByRole('button', { name: 'Improve the order' }).click();
  await expect(program.getByText('Alpha → Charlie → Bravo → Delta')).toBeVisible();
  expect(await order()).toEqual(cities);
  await program.getByRole('button', { name: 'Apply', exact: true }).click();
  expect(await order()).toEqual(['Alpha', 'Charlie', 'Bravo', 'Delta']);
  await planner.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await order()).toEqual(cities);
});
