import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  PriceCell,
  ChangeCell,
  VolumeCell,
  MarketCapCell,
  RSICell,
  BadgeCell,
  SymbolCell,
  CompanyCell,
  SectorBadgeCell,
  CapBadgeCell,
  PeCell,
  PbCell,
  RoeCell,
  GrowthCell,
  BetaCell,
  MACD_COLORS,
  BB_COLORS,
} from '../components/ui/Cells';

const meta: Meta = {
  title: 'Data Grid/Cell Renderers',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <table
        className="screener-table max-w-xl border border-border"
        style={{ borderCollapse: 'collapse' }}
      >
        <tbody>
          <tr className="bg-surface-2 h-10 border-b border-border">
            <td className="px-4 py-2">
              <Story />
            </td>
          </tr>
        </tbody>
      </table>
    ),
  ],
};

export default meta;

export const Price: StoryObj<typeof PriceCell> = {
  render: (args) => <PriceCell {...args} />,
  args: {
    value: 3845.2,
  },
};

export const PriceFlashingGreen: StoryObj = {
  render: () => (
    <div className="flash-green px-2 py-1 rounded">
      <PriceCell value={3848.75} />
    </div>
  ),
};

export const PriceFlashingRed: StoryObj = {
  render: () => (
    <div className="flash-red px-2 py-1 rounded">
      <PriceCell value={3841.1} />
    </div>
  ),
};

export const ChangePositive: StoryObj<typeof ChangeCell> = {
  render: (args) => <ChangeCell {...args} />,
  args: {
    value: 1.25,
    showAbsolute: true,
    absolute: 47.5,
  },
};

export const ChangeNegative: StoryObj<typeof ChangeCell> = {
  render: (args) => <ChangeCell {...args} />,
  args: {
    value: -2.4,
    showAbsolute: true,
    absolute: -95.2,
  },
};

export const VolumeNormal: StoryObj<typeof VolumeCell> = {
  render: (args) => <VolumeCell {...args} />,
  args: {
    value: 125000,
    avgVolume: 100000,
  },
};

export const VolumeHighSpike: StoryObj<typeof VolumeCell> = {
  render: (args) => <VolumeCell {...args} />,
  args: {
    value: 350000,
    avgVolume: 100000,
  },
};

export const MarketCap: StoryObj<typeof MarketCapCell> = {
  render: (args) => <MarketCapCell {...args} />,
  args: {
    value: 1395000, // INR Cr
  },
};

export const RSINeutral: StoryObj<typeof RSICell> = {
  render: (args) => <RSICell {...args} />,
  args: {
    value: 52.4,
  },
};

export const RSIOverbought: StoryObj<typeof RSICell> = {
  render: (args) => <RSICell {...args} />,
  args: {
    value: 78.5,
  },
};

export const RSIOversold: StoryObj<typeof RSICell> = {
  render: (args) => <RSICell {...args} />,
  args: {
    value: 24.2,
  },
};

export const SymbolCellLink: StoryObj = {
  render: () => <SymbolCell value="TCS" onOpenChart={(sym) => alert(`Opening chart for ${sym}`)} />,
};

export const Company: StoryObj<typeof CompanyCell> = {
  render: (args) => <CompanyCell {...args} />,
  args: {
    value: 'Tata Consultancy Services Ltd',
  },
};

export const SectorBadge: StoryObj<typeof SectorBadgeCell> = {
  render: (args) => <SectorBadgeCell {...args} />,
  args: {
    value: 'Information Technology',
  },
};

export const MarketCapBadge: StoryObj<typeof CapBadgeCell> = {
  render: (args) => <CapBadgeCell {...args} />,
  args: {
    value: 'Large Cap',
  },
};

export const PeRatio: StoryObj<typeof PeCell> = {
  render: (args) => <PeCell {...args} />,
  args: {
    value: 28.4,
  },
};

export const PbRatio: StoryObj<typeof PbCell> = {
  render: (args) => <PbCell {...args} />,
  args: {
    value: 12.5,
  },
};

export const ReturnOnEquity: StoryObj<typeof RoeCell> = {
  render: (args) => <RoeCell {...args} />,
  args: {
    value: 39.5,
  },
};

export const GrowthYoY: StoryObj<typeof GrowthCell> = {
  render: (args) => <GrowthCell {...args} />,
  args: {
    value: 14.2,
  },
};

export const BetaVolatility: StoryObj<typeof BetaCell> = {
  render: (args) => <BetaCell {...args} />,
  args: {
    value: 1.15,
  },
};

export const MacdSignalBadge: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <BadgeCell value="Bullish" colorMap={MACD_COLORS} />
      <BadgeCell value="Bearish" colorMap={MACD_COLORS} />
      <BadgeCell value="Neutral" colorMap={MACD_COLORS} />
    </div>
  ),
};

export const BollingerPositionBadge: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <BadgeCell value="Above" colorMap={BB_COLORS} />
      <BadgeCell value="Within" colorMap={BB_COLORS} />
      <BadgeCell value="Below" colorMap={BB_COLORS} />
    </div>
  ),
};
