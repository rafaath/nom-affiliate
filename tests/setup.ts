import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals are disabled and npm test shares an environment across files.
// Explicit cleanup prevents one component test's DOM leaking into another.
afterEach(cleanup);
