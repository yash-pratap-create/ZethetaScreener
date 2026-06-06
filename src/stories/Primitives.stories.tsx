import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'UI Primitives/Controls',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Buttons: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-surface-1 rounded-lg border border-border w-96">
      <h3 className="text-xs uppercase font-bold text-text-muted mb-2 tracking-wider">
        Button Styles
      </h3>

      <div>
        <label className="text-[10px] text-text-muted block mb-1">
          Primary Action Button (Add Rule)
        </label>
        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all bg-accent-primary hover:opacity-90 active:scale-95">
          + Add Filter
        </button>
      </div>

      <div>
        <label className="text-[10px] text-text-muted block mb-1">
          Preset Screener Button (Inactive / Active)
        </label>
        <div className="flex gap-2">
          <button className="text-left px-2 py-1.5 rounded text-xs font-semibold text-text-muted bg-transparent border-l-2 border-transparent">
            Growth Stocks
          </button>
          <button className="text-left px-2 py-1.5 rounded text-xs font-bold text-accent-primary bg-accent-primary/10 border-l-2 border-accent-primary">
            High RSI Reversal
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-text-muted block mb-1">
          Small Text Button (Clear All)
        </label>
        <button className="font-mono text-[9px] font-bold tracking-wider text-text-dim hover:text-red-400 transition-colors uppercase">
          CLEAR
        </button>
      </div>

      <div>
        <label className="text-[10px] text-text-muted block mb-1">
          Row Interaction Link (Symbol Click)
        </label>
        <button className="font-mono font-bold hover:underline text-accent-primary">
          RELIANCE
        </button>
      </div>
    </div>
  ),
};

export const Inputs: StoryObj = {
  render: () => {
    return (
      <div className="flex flex-col gap-4 p-6 bg-surface-1 rounded-lg border border-border w-96">
        <h3 className="text-xs uppercase font-bold text-text-muted mb-2 tracking-wider">
          Input Styles
        </h3>

        <div>
          <label className="text-[10px] text-text-muted block mb-1">
            Standard Text/Search Input
          </label>
          <input
            type="text"
            placeholder="Search stock by symbol..."
            className="w-full text-xs rounded px-2 py-1.5 bg-surface-2 text-text-primary border border-border focus:border-accent-primary outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-text-muted block mb-1">
            Terminal Mono Input (Numeric Values)
          </label>
          <input
            type="number"
            defaultValue="30"
            className="w-24 text-xs rounded px-2 py-1 bg-surface-3 text-text-primary border border-border font-mono focus:border-accent-primary outline-none"
          />
        </div>
      </div>
    );
  },
};

export const Selects: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-surface-1 rounded-lg border border-border w-96">
      <h3 className="text-xs uppercase font-bold text-text-muted mb-2 tracking-wider">
        Select Dropdowns
      </h3>

      <div>
        <label className="text-[10px] text-text-muted block mb-1">Dropdown (Filter Sidebar)</label>
        <select className="text-xs rounded-lg px-2 py-1.5 w-full bg-surface-2 text-text-primary border border-border outline-none">
          <option>Numeric metric (30+ fields)</option>
          <option>Sector</option>
          <option>MACD Signal</option>
          <option>Watchlist Only</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] text-text-muted block mb-1">Mini Operator Selector</label>
        <select className="text-xs rounded px-2 py-1 bg-surface-3 text-text-primary border border-border outline-none">
          <option>&gt;</option>
          <option>&ge;</option>
          <option>&lt;</option>
          <option>&le;</option>
          <option>Between</option>
        </select>
      </div>
    </div>
  ),
};

// Extracted to a proper React component to satisfy rules-of-hooks
function ToggleControlsWrapper() {
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [boolVal, setBoolVal] = useState(true);

  return (
    <div className="flex flex-col gap-4 p-6 bg-surface-1 rounded-lg border border-border w-96">
      <h3 className="text-xs uppercase font-bold text-text-muted mb-2 tracking-wider">
        Toggle Controls
      </h3>

      <div>
        <label className="text-[10px] text-text-muted block mb-2">
          Logical Operator Switch (AND/OR)
        </label>
        <div className="flex border border-border rounded-md overflow-hidden text-xs w-fit">
          <button
            onClick={() => setLogic('AND')}
            className={`px-3 py-1 transition-colors ${logic === 'AND' ? 'text-white bg-accent-primary' : 'text-text-muted'}`}
          >
            AND
          </button>
          <button
            onClick={() => setLogic('OR')}
            className={`px-3 py-1 transition-colors ${logic === 'OR' ? 'text-white bg-accent-primary' : 'text-text-muted'}`}
          >
            OR
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-text-muted block mb-2">
          Boolean Filter Switch (YES/NO)
        </label>
        <button
          onClick={() => setBoolVal(!boolVal)}
          className="text-xs px-3 py-1 rounded-full border transition-all font-semibold"
          style={{
            borderColor: boolVal ? 'var(--color-accent-primary)' : 'var(--color-border)',
            color: boolVal ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            background: boolVal ? 'rgba(79,142,247,0.12)' : 'transparent',
          }}
        >
          {boolVal ? 'YES' : 'NO'}
        </button>
      </div>
    </div>
  );
}

export const Toggles: StoryObj = {
  render: () => <ToggleControlsWrapper />,
};
