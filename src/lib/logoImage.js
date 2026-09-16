"use client";

/**
 * The school's logo as a data URL, for embedding in generated PDFs.
 *
 * jsPDF needs image bytes, not a URL, so the file is fetched once and cached.
 * If `public/logo.png` is not there, this resolves to null and the PDF writers
 * fall back to the drawn vector shield — nothing breaks, it just looks plainer.
 */

const LOGO_PATH = "/logo.png";

let cache; // undefined = not tried yet, null = unavailable, string = data URL

export async function logoDataUrl() {
  if (cache !== undefined) return cache;

  try {
    const res = await fetch(LOGO_PATH, { cache: "force-cache" });
    if (!res.ok) throw new Error(`logo ${res.status}`);

    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) throw new Error("not an image");

    cache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    cache = null;
  }

  return cache;
}
