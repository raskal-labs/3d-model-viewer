import { join } from 'node:path';

const cdn = 'https://cdn.jsdelivr.net/npm/three@0.168.0/';

export async function useLocalThree(page) {
  const vendor = process.env.STUDIO_THREE;
  if (!vendor) return;
  await page.route(cdn + '**', route => {
    const file = new URL(route.request().url()).pathname.split('/three@0.168.0/')[1];
    return route.fulfill({ path: join(vendor, file) });
  });
}
