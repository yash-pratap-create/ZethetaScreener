import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  NumericFilterRow,
  SelectFilterRow,
  BooleanFilterRow,
} from '../components/FilterPanel/FilterSidebar';
import type { FilterRule } from '../types';

const meta: Meta = {
  title: 'Filters/Filter Components',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] p-4 bg-surface-1 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
};

export default meta;

function NumericRsiRangeWrapper() {
  const [rule, setRule] = useState<FilterRule>({
    type: 'numeric',
    field: 'rsi14',
    operator: 'gt',
    value: 30,
  });
  return (
    <NumericFilterRow
      rule={rule as Extract<FilterRule, { type: 'numeric' }>}
      index={0}
      onUpdate={(_, r) => setRule(r)}
      onRemove={() => alert('Remove rule clicked')}
    />
  );
}

export const NumericRsiRange: StoryObj = {
  render: () => <NumericRsiRangeWrapper />,
};

function NumericMarketCapBetweenWrapper() {
  const [rule, setRule] = useState<FilterRule>({
    type: 'numeric',
    field: 'marketCap',
    operator: 'between',
    value: 1000,
    value2: 50000,
  });
  return (
    <NumericFilterRow
      rule={rule as Extract<FilterRule, { type: 'numeric' }>}
      index={1}
      onUpdate={(_, r) => setRule(r)}
      onRemove={() => alert('Remove rule clicked')}
    />
  );
}

export const NumericMarketCapBetween: StoryObj = {
  render: () => <NumericMarketCapBetweenWrapper />,
};

function SelectSectorMultiWrapper() {
  const [rule, setRule] = useState<FilterRule>({
    type: 'select',
    field: 'sector',
    values: ['Information Technology', 'Financial Services'],
  });
  return (
    <SelectFilterRow
      rule={rule as Extract<FilterRule, { type: 'select' }>}
      index={2}
      onUpdate={(_, r) => setRule(r)}
      onRemove={() => alert('Remove rule clicked')}
    />
  );
}

export const SelectSectorMulti: StoryObj = {
  render: () => <SelectSectorMultiWrapper />,
};

function SelectMacdSignalWrapper() {
  const [rule, setRule] = useState<FilterRule>({
    type: 'select',
    field: 'macdSignal',
    values: ['Bullish'],
  });
  return (
    <SelectFilterRow
      rule={rule as Extract<FilterRule, { type: 'select' }>}
      index={3}
      onUpdate={(_, r) => setRule(r)}
      onRemove={() => alert('Remove rule clicked')}
    />
  );
}

export const SelectMacdSignal: StoryObj = {
  render: () => <SelectMacdSignalWrapper />,
};

function BooleanWatchlistOnlyWrapper() {
  const [rule, setRule] = useState<FilterRule>({
    type: 'boolean',
    field: 'isWatched',
    value: true,
  });
  return (
    <BooleanFilterRow
      rule={rule as Extract<FilterRule, { type: 'boolean' }>}
      index={4}
      onUpdate={(_, r) => setRule(r)}
      onRemove={() => alert('Remove rule clicked')}
    />
  );
}

export const BooleanWatchlistOnly: StoryObj = {
  render: () => <BooleanWatchlistOnlyWrapper />,
};

function BooleanRecentlyUpdatedWrapper() {
  const [rule, setRule] = useState<FilterRule>({
    type: 'boolean',
    field: 'isActive',
    value: false,
  });
  return (
    <BooleanFilterRow
      rule={rule as Extract<FilterRule, { type: 'boolean' }>}
      index={5}
      onUpdate={(_, r) => setRule(r)}
      onRemove={() => alert('Remove rule clicked')}
    />
  );
}

export const BooleanRecentlyUpdated: StoryObj = {
  render: () => <BooleanRecentlyUpdatedWrapper />,
};
