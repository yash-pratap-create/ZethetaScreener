import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#080a0f' },
        { name: 'light', value: '#f0f3fa' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div
        className="p-6 min-h-screen text-[#c9d1e0]"
        style={{ backgroundColor: 'var(--color-bg-base)', fontFamily: 'Inter, sans-serif' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
