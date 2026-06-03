import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FilterGroup, FilterRule, FilterPreset } from '@/types';
import { FILTER_PRESETS } from '@/lib/filterEngine';
interface FilterState {
  activeGroup: FilterGroup;
  searchQuery: string;
  activePresetId: string | null;
  isFilterPanelOpen: boolean;
  savedFilters: FilterPreset[];
}
interface FilterActions {
  addRule: (rule: FilterRule) => void;
  removeRule: (index: number) => void;
  updateRule: (index: number, rule: FilterRule) => void;
  clearAllRules: () => void;
  setLogic: (logic: 'AND' | 'OR') => void;
  setSearchQuery: (q: string) => void;
  applyPreset: (presetId: string) => void;
  clearPreset: () => void;
  toggleFilterPanel: () => void;
  saveCurrentFilter: (name: string, description?: string) => void;
  deleteSavedFilter: (id: string) => void;
  applySavedFilter: (id: string) => void;
}
export type FilterStore = FilterState & FilterActions;
const DEFAULT_GROUP: FilterGroup = {
  id: 'default',
  logic: 'AND',
  rules: [],
};
export const useFilterStore = create<FilterStore>()(
  immer(
    devtools(
      persist(
        (set) => ({
          activeGroup: DEFAULT_GROUP,
          searchQuery: '',
          activePresetId: null,
          isFilterPanelOpen: true,
          savedFilters: [],
          addRule: (rule) =>
            set((state) => {
              state.activeGroup.rules.push(rule);
              state.activePresetId = null;
            }),
          removeRule: (index) =>
            set((state) => {
              state.activeGroup.rules.splice(index, 1);
              state.activePresetId = null;
            }),
          updateRule: (index, rule) =>
            set((state) => {
              state.activeGroup.rules[index] = rule;
              state.activePresetId = null;
            }),
          clearAllRules: () =>
            set((state) => {
              state.activeGroup = { ...DEFAULT_GROUP, id: `group-${Date.now()}` };
              state.activePresetId = null;
            }),
          setLogic: (logic) =>
            set((state) => {
              state.activeGroup.logic = logic;
            }),
          setSearchQuery: (searchQuery) =>
            set((state) => {
              state.searchQuery = searchQuery;
            }),
          applyPreset: (presetId) => {
            const preset = FILTER_PRESETS.find((p) => p.id === presetId);
            if (!preset) return;
            set((state) => {
              state.activeGroup = {
                id: preset.filters.id,
                logic: preset.filters.logic,
                rules: preset.filters.rules.map((r) => ({ ...r })) as any,
              };
              state.activePresetId = presetId;
            });
          },
          clearPreset: () =>
            set((state) => {
              state.activeGroup = { ...DEFAULT_GROUP, id: `group-${Date.now()}` };
              state.activePresetId = null;
            }),
          toggleFilterPanel: () =>
            set((state) => {
              state.isFilterPanelOpen = !state.isFilterPanelOpen;
            }),
          saveCurrentFilter: (name, description = '') =>
            set((state) => {
              state.savedFilters.push({
                id: `saved-${Date.now()}`,
                name,
                description,
                filters: {
                  ...state.activeGroup,
                  id: `group-${Date.now()}`,
                  rules: state.activeGroup.rules.map((r) => ({ ...r })) as any,
                },
              });
            }),
          deleteSavedFilter: (id) =>
            set((state) => {
              state.savedFilters = state.savedFilters.filter((f) => f.id !== id);
              if (state.activePresetId === id) {
                state.activePresetId = null;
              }
            }),
          applySavedFilter: (id) => {
            set((state) => {
              const preset = state.savedFilters.find((p) => p.id === id);
              if (!preset) return;
              state.activeGroup = {
                id: preset.filters.id,
                logic: preset.filters.logic,
                rules: preset.filters.rules.map((r) => ({ ...r })) as any,
              };
              state.activePresetId = id;
            });
          },
        }),
        {
          name: 'zetheta-filters',
          partialize: (state) => ({
            savedFilters: state.savedFilters,
            isFilterPanelOpen: state.isFilterPanelOpen,
          }),
        },
      ),
      { name: 'FilterStore' },
    ),
  ),
);
