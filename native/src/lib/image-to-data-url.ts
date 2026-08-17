/**
 * Convierte la URI de una imagen del móvil en un data URL.
 *
 * `fetch` + `FileReader` porque los endpoints esperan `data:image/jpeg;base64,…`,
 * igual que lo que produce la cámara. Vivía copiado dentro de `nevera.tsx`; se
 * saca aquí porque ahora la importación de recetas también recibe imágenes, y
 * dos copias de esto habrían divergido a la primera de cambio.
 */
export async function imageToDataUrl(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('no se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
}
