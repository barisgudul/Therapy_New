// jest.setup.js
// JSDOM polyfills
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

// React Query: wrap notifications in React Testing Library's act to avoid act warnings
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { notifyManager } = require('@tanstack/query-core');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { act } = require('@testing-library/react-native');
  if (notifyManager && typeof notifyManager.setBatchNotifyFunction === 'function') {
    notifyManager.setBatchNotifyFunction((cb) => act(cb));
  }
} catch (_) {
  // ignore setup errors in non-test environments
}


