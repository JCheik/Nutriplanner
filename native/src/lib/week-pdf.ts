import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { DayPlan } from './types';

/** Escapa texto de usuario antes de meterlo en el HTML del PDF. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * El cuadrante de la semana en HTML apaisado, con la identidad de Nutrilp
 * (terracota sobre crema, títulos en serif) — pensado para imprimirlo y
 * pegarlo en la nevera, que es justo el caso de uso del boceto 2.
 */
function weekGridHtml(weekPlan: DayPlan[]): string {
  // Las columnas son las franjas del primer día (todos comparten estructura).
  const mealTitles = weekPlan[0]?.meals.map((m) => m.title) ?? [];

  const headerCells = mealTitles.map((t) => `<th>${esc(t)}</th>`).join('');
  const rows = weekPlan
    .map((day) => {
      const cells = day.meals
        .map((meal) => {
          const names = meal.recipes.map((r) => esc(r.name)).join('<br>');
          return `<td>${names || '<span class="empty">—</span>'}</td>`;
        })
        .join('');
      return `<tr><th class="day">${esc(day.day)}</th>${cells}</tr>`;
    })
    .join('');

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #3A2414; background: #FFFDF9; margin: 0; }
  h1 { font-family: Georgia, "Times New Roman", serif; color: #D9531F; font-size: 26px; margin: 0 0 2px; }
  .sub { color: #8A6A4A; font-size: 12px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: separate; border-spacing: 4px; table-layout: fixed; }
  th, td { border: 1px solid #E2D8C7; border-radius: 8px; padding: 8px 9px; vertical-align: top; font-size: 11px; line-height: 1.35; }
  thead th { background: #F6E1D6; border-color: #D9531F; color: #3A2414; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; text-align: center; }
  th.day { background: #F7F3EC; width: 78px; font-family: Georgia, serif; font-size: 12px; text-align: left; }
  td { background: #FFFDF9; height: 54px; }
  .empty { color: #C6B593; }
  .foot { margin-top: 12px; color: #8A6A4A; font-size: 10px; text-align: right; }
</style></head><body>
  <h1>Mi plan de la semana</h1>
  <div class="sub">Nutrilp · generado el ${esc(today)}</div>
  <table>
    <thead><tr><th class="day"></th>${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">nutrilp.com</div>
</body></html>`;
}

/**
 * Genera el PDF del cuadrante y abre la hoja de compartir del sistema (para
 * guardarlo, mandarlo o imprimirlo). Lanza si el dispositivo no puede compartir.
 */
export async function shareWeekPdf(weekPlan: DayPlan[]): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: weekGridHtml(weekPlan) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Plan de la semana', UTI: 'com.adobe.pdf' });
  } else {
    // Sin hoja de compartir (raro): al menos mandarlo a la impresora del sistema.
    await Print.printAsync({ uri });
  }
}
