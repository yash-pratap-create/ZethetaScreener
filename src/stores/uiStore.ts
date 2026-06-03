import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
type Theme = 'dark' | 'light';
interface UIState {
  theme: Theme;
  selectedSymbol: string | null;
  isChartOpen: boolean;
  chartTimeframe: string;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  rowHeight: number;
  pageSize: number;
  isSidebarCollapsed: boolean;
  highContrastMode: boolean;
  viewMode: 'grid' | 'heatmap';
}
interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  selectSymbol: (symbol: string | null) => void;
  openChart: (symbol: string) => void;
  closeChart: () => void;
  setChartTimeframe: (tf: string) => void;
  setColumnVisibility: (col: string, visible: boolean) => void;
  setColumnOrder: (order: string[]) => void;
  setRowHeight: (h: number) => void;
  setPageSize: (n: number) => void;
  toggleSidebar: () => void;
  toggleHighContrast: () => void;
  setViewMode: (mode: 'grid' | 'heatmap') => void;
}
const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  symbol: true,
  companyName: true,
  sector: true,
  lastPrice: true,
  dayChangePct: true,
  volume: true,
  marketCap: true,
  pe: true,
  pb: true,
  roe: true,
  rsi: true,
  sma50: true,
  sma200: true,
  beta: true,
  atr: false,
  macdSignal: true,
  bollingerPosition: false,
  volumeVsAvg: true,
  dividendYield: false,
  debtToEquity: false,
  revenueGrowth: false,
  profitGrowth: false,
};
export const useUIStore = create<UIState & UIActions>()(
  immer(
    devtools(
      persist(
        (set) => ({
          theme: 'dark',
          selectedSymbol: null,
          isChartOpen: false,
          chartTimeframe: '1D',
          columnOrder: Object.keys(DEFAULT_COLUMN_VISIBILITY),
          columnVisibility: DEFAULT_COLUMN_VISIBILITY,
          rowHeight: 36,
          pageSize: 100,
          isSidebarCollapsed: false,
          highContrastMode: false,
          viewMode: 'grid',
          setTheme: (theme) => set({ theme }),
          toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
          selectSymbol: (symbol) => set({ selectedSymbol: symbol }),
          openChart: (symbol) => set({ selectedSymbol: symbol, isChartOpen: true }),
          closeChart: () => set({ isChartOpen: false }),
          setChartTimeframe: (chartTimeframe) => set({ chartTimeframe }),
          setColumnVisibility: (col, visible) =>
            set((s) => ({
              columnVisibility: { ...s.columnVisibility, [col]: visible },
            })),
          setColumnOrder: (columnOrder) => set({ columnOrder }),
          setRowHeight: (rowHeight) => set({ rowHeight }),
          setPageSize: (pageSize) => set({ pageSize }),
          toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
          toggleHighContrast: () => set((s) => ({ highContrastMode: !s.highContrastMode })),
          setViewMode: (viewMode) => set({ viewMode }),
        }),
        {
          name: 'zetheta-ui',
          partialize: (s) => ({
            theme: s.theme,
            columnVisibility: s.columnVisibility,
            columnOrder: s.columnOrder,
            rowHeight: s.rowHeight,
            pageSize: s.pageSize,
            isSidebarCollapsed: s.isSidebarCollapsed,
            highContrastMode: s.highContrastMode,
            viewMode: s.viewMode,
          }),
        },
      ),
      { name: 'UIStore' },
    ),
  ),
);
