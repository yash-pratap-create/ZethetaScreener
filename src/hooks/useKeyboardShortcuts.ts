import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

export function useKeyboardShortcuts() {
  const { toggleSidebar, isChartOpen, closeChart } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
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
          // If chart is open, close it. Otherwise, we can't easily open it without a selected symbol
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
          // Arrow keys for grid navigation (scrolling or focus)
          if (isChartOpen) {
            break;
          }
          e.preventDefault();
          const container = document.querySelector('.overflow-auto') as HTMLElement;
          if (container) {
            const scrollAmount = 36; // row height
            container.scrollTop += e.key === 'ArrowDown' ? scrollAmount : -scrollAmount;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, isChartOpen, closeChart]);
}
