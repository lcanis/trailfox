import '@testing-library/jest-native/extend-expect';

// Keep test output clean (settings.ts logs config when DEVELOPER_MODE is true)
jest.spyOn(console, 'log').mockImplementation(() => undefined);
