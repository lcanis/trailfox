module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|react-native|@react-native|@react-native-community|expo|expo-.*|@expo|@expo/.*|@expo-.*|@expo-google-fonts|react-navigation|@react-navigation/.*|@sentry/react-native|nativewind|maplibre-gl)/)',
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
