/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-native/extend-expect';

// Prevent un-awaited RouteService network calls from logging after tests finish
// (components call these in useEffect; in tests we prefer they be no-ops)
import { RouteService } from './src/services/routeService';

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

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SvgUri: jest.fn(() => React.createElement(View)),
    SvgXml: jest.fn(() => React.createElement(View)),
    default: jest.fn(() => React.createElement(View)),
  };
});

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaView: jest.fn(({ children }) => children),
    useSafeAreaInsets: jest.fn(() => inset),
  };
});

// Mock @react-native-community/slider
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SliderMock = jest.fn((props) => React.createElement(View, props));
  return {
    __esModule: true,
    default: SliderMock,
    Slider: SliderMock,
  };
});

// Mock react-native-shadow-2 (ESM package) to avoid Jest transform errors
jest.mock('react-native-shadow-2', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Shadow = ({ children }: any) => React.createElement(View, null, children);
  return {
    __esModule: true,
    Shadow,
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

// Mock window.location for web tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'localhost',
      port: '8081',
      origin: 'http://localhost:8081',
    },
    writable: true,
  });
}
jest.spyOn(RouteService, 'fetchGeoJSON').mockImplementation(async () => null);
jest.spyOn(RouteService, 'fetchRouteParents').mockImplementation(async () => []);
jest.spyOn(RouteService, 'fetchRouteChildren').mockImplementation(async () => []);
