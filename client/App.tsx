import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { DiscoveryScreen } from './src/screens/DiscoveryScreen';

export default function App() {
    return (
        <View style={styles.container}>
            <DiscoveryScreen />
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
