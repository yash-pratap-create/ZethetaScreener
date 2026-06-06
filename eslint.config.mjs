import nextConfig from 'eslint-config-next';
import coreWebVitalsConfig from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import storybook from 'eslint-plugin-storybook';

// Extract only the rules to prevent circular config validation errors
const storybookPlugin = {
    rules: storybook.rules,
};

const eslintConfig = [
    // Next.js Flat configs (which includes react, react-hooks, import, jsx-a11y, next)
    ...coreWebVitalsConfig,
    
    // TypeScript-ESLint recommended flat configs
    ...tseslint.configs.recommended,
    
    // Prettier flat config (turns off rules that conflict with Prettier)
    eslintConfigPrettier,
    
    // Custom rules and overrides
    {
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            'react/display-name': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
        ignores: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**'],
    },
    
    // Storybook stories rules
    {
        files: ['**/*.stories.ts', '**/*.stories.tsx', '**/*.stories.js', '**/*.stories.jsx'],
        plugins: {
            storybook: storybookPlugin,
        },
        rules: {
            'storybook/await-interactions': 'error',
            'storybook/context-in-play-function': 'error',
            'storybook/default-exports': 'error',
            'storybook/hierarchy-separator': 'warn',
            'storybook/no-redundant-story-name': 'warn',
            'storybook/prefer-pascal-case': 'warn',
            'storybook/use-storybook-expect': 'error',
            'storybook/use-storybook-testing-library': 'error',
        },
    }
];

export default eslintConfig;
