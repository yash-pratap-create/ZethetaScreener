import { Stock } from '@/types';
export function exportToCSV(stocks: Stock[], filename = 'zetheta_screener_export.csv') {
  if (stocks.length === 0) return;
  const columns: (keyof Stock)[] = [
    'symbol',
    'companyName',
    'sector',
    'lastPrice',
    'changePercent',
    'volume',
    'marketCap',
    'pe',
    'pb',
    'roe',
    'rsi14',
  ];
  const headers = columns.join(',');
  const rows = stocks
    .map((stock) => {
      return columns
        .map((col) => {
          const val = stock[col];
          const strVal = String(val).replace(/"/g, '""');
          return `"${strVal}"`;
        })
        .join(',');
    })
    .join('\n');
  const csvContent = 'data:text/csv;charset=utf-8,' + headers + '\n' + rows;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
export function exportChartToPDF() {
  window.print();
}
