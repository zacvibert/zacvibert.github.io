// Asset resolution. Normally assets are fetched from the server; in a
// single-file offline build (tools/build-standalone.mjs) they are embedded as
// data URIs in window.__INLINE_ASSETS, keyed by their path under assets/.

declare global {
  interface Window {
    __INLINE_ASSETS?: Record<string, string>;
  }
}

function inline(path: string): string | undefined {
  return typeof window !== 'undefined' ? window.__INLINE_ASSETS?.[path] : undefined;
}

/** URL usable as an <img> src for an asset path like "characters/x/sheet.png". */
export function assetUrl(path: string): string {
  return inline(path) ?? `${import.meta.env.BASE_URL}assets/${path}`;
}

/** Fetches and parses a JSON asset, or null if it is absent. */
export async function fetchJson<T>(path: string): Promise<T | null> {
  const embedded = inline(path);
  if (embedded) {
    const json = embedded.startsWith('data:')
      ? atob(embedded.slice(embedded.indexOf(',') + 1))
      : embedded;
    return JSON.parse(json) as T;
  }
  const res = await fetch(`${import.meta.env.BASE_URL}assets/${path}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function loadImage(path: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = assetUrl(path);
  await img.decode();
  return img;
}
