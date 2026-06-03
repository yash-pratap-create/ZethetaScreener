import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
export function useKeyboardShortcuts() {
  const { toggleSidebar, isChartOpen, closeChart } = useUIStore();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      switch (e.key) {
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleSidebar();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          if (isChartOpen) {
            closeChart();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isChartOpen) {
            closeChart();
          }
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          if (isChartOpen) {
            break;
          }
          e.preventDefault();
          const container = document.querySelector('.overflow-auto') as HTMLElement;
          if (container) {
            const scrollAmount = 36;
            container.scrollTop += e.key === 'ArrowDown' ? scrollAmount : -scrollAmount;
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, isChartOpen, closeChart]);
}
