import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OsmSymbolProps {
  symbol: string | null;
}

export const OsmSymbol: React.FC<OsmSymbolProps> = ({ symbol }) => {
  if (!symbol) return <Text>-</Text>;

  // Basic parser for osmc:symbol
  // Format: waycolor:background:foreground:text:textcolor
  const parts = symbol.split(':');
  const background = parts[1];
  const foreground = parts[2];
  const text = parts[3];
  const textColor = parts[4];

  // Map OSM colors to CSS colors
  const colorMap: Record<string, string> = {
    red: '#e41a1c',
    blue: '#377eb8',
    green: '#4daf4a',
    yellow: '#ffff33',
    orange: '#ff7f00',
    black: '#000000',
    white: '#ffffff',
    brown: '#a65628',
    purple: '#984ea3',
    gray: '#999999',
  };

  const bgColor = colorMap[background] || '#eee';
  const txtColor = colorMap[textColor] || 'black';

  // Simple rendering: Box with background color and text
  // Foreground symbols (bars, stripes) are hard to do with just CSS/View without SVG paths
  // For now, we just show the background and text.

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Foreground shapes would go here */}
      {text ? (
        <Text style={[styles.text, { color: txtColor }]}>{text}</Text>
      ) : // If no text, maybe show the foreground name as fallback or nothing
      null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
