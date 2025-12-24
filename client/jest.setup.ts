/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-native/extend-expect';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      call: () => {},
      View: View,
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: 'clamp' },
    __esModule: true,
  };
});

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({
  Worklets: {
    createWorklet: jest.fn(),
  },
  createSerializable: jest.fn(),
}));

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaView: jest.fn(({ children }) => children),
    useSafeAreaInsets: jest.fn(() => inset),
  };
});
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const BottomSheet = React.forwardRef(({ children, snapPoints, index }: any, ref: any) =>
    React.createElement(
      View,
      { testID: 'bottom-sheet' },
      React.createElement(Text, null, `BottomSheet Index: ${index}`),
      children
    )
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView: View,
    BottomSheetFlatList: ({ data, renderItem, keyExtractor, ListHeaderComponent }: any) =>
      React.createElement(
        View,
        null,
        React.isValidElement(ListHeaderComponent)
          ? ListHeaderComponent
          : typeof ListHeaderComponent === 'function'
            ? React.createElement(ListHeaderComponent)
            : null,
        data.map((item: any, index: any) =>
          React.createElement(
            View,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem({ item, index })
          )
        )
      ),
    BottomSheetView: View,
    BottomSheetTextInput: require('react-native').TextInput,
  };
});

// Keep test output clean (settings.ts logs config when DEVELOPER_MODE is true)
jest.spyOn(console, 'log').mockImplementation(() => undefined);
