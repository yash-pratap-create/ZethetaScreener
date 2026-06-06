import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChartModal } from '../components/Chart/ChartModal';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useUIStore } from '../stores/uiStore';

const meta: Meta = {
  title: 'Chart/Chart Modal',
  component: ChartModal,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      // Initialize stores with default mock data for the stories
      useEffect(() => {
        useRealtimeStore.setState({
          priceUpdates: {
            TCS: { lastPrice: 3845.2, changePercent: 1.25 },
            RELIANCE: { lastPrice: 2450.0, changePercent: -0.8 },
            INFY: { lastPrice: 1520.4, changePercent: 2.1 },
          },
        });
        useUIStore.setState({
          theme: 'dark',
          highContrastMode: false,
        });
      }, []);

      return (
        <div className="w-full h-screen relative bg-[#080a0f] p-4">
          <Story />
        </div>
      );
    },
  ],
};

export default meta;

export const DefaultTcsChart: StoryObj = {
  args: {
    symbol: 'TCS',
    onClose: () => alert('Close chart modal clicked'),
  },
};

export const RelianceChart: StoryObj = {
  args: {
    symbol: 'RELIANCE',
    onClose: () => alert('Close chart modal clicked'),
  },
};

export const HighContrastChart: StoryObj = {
  args: {
    symbol: 'INFY',
    onClose: () => alert('Close chart modal clicked'),
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        useUIStore.setState({
          highContrastMode: true,
        });
        return () => {
          useUIStore.setState({
            highContrastMode: false,
          });
        };
      }, []);
      return <Story />;
    },
  ],
};
