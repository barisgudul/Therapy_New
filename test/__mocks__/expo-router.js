// test/__mocks__/expo-router.js
module.exports = {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      setParams: jest.fn(),
    })),
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
    useLocalSearchParams: jest.fn(() => ({})),
    useGlobalSearchParams: jest.fn(() => ({})),
    Link: 'Link',
    Redirect: 'Redirect',
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    },
  };