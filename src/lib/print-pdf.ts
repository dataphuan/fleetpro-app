/**
 * Print-to-PDF utility for report tables.
 * Opens a styled print window using window.print() — the most reliable
 * cross-platform approach in Electron without extra dependencies.
 */

interface PrintColumn {
    header: string;
    key: string;
    align?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
}

interface PrintPdfOptions {
    title: string;
    subtitle?: string;
    columns: PrintColumn[];
    data: Record<string, any>[];
    footer?: Record<string, string>; // key → formatted value
}

export function printReportPdf(options: PrintPdfOptions) {
    const { title, subtitle, columns, data, footer } = options;

    const formatDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const headerRow = columns.map(c =>
        `<th style="text-align:${c.align || 'left'};padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;font-weight:600;white-space:nowrap;">${c.header}</th>`
    ).join('');

    const bodyRows = data.map(row => {
        const cells = columns.map(c => {
            const raw = row[c.key];
            const display = c.format ? c.format(raw) : (raw ?? '');
            return `<td style="text-align:${c.align || 'left'};padding:6px 12px;border:1px solid #e5e7eb;">${display}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    let footerRow = '';
    if (footer) {
        const footerCells = columns.map(c => {
            const val = footer[c.key] || '';
            return `<td style="text-align:${c.align || 'left'};padding:8px 12px;border:1px solid #d1d5db;background:#f9fafb;font-weight:700;">${val}</td>`;
        }).join('');
        footerRow = `<tfoot><tr>${footerCells}</tr></tfoot>`;
    }

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1f2937; margin: 0; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #111827; }
  .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer-info { margin-top: 16px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
</style>
</head><body>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle || `Ngày xuất: ${formatDate(new Date())}`}</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
    ${footerRow}
  </table>
  <div class="footer-info">
    <span>Tổng: ${data.length} dòng</span>
    <span>SavacoLogis — ${formatDate(new Date())}</span>
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

    const printWin = window.open('', '_blank', 'width=1100,height=700');
    if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
    }
}
