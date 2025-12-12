import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import type { Feature, LineString, MultiLineString } from 'geojson';
import { Route } from '../types';
import { NETWORK_MAP, IGNORED_TAGS, COLLAPSE_OSM_TAGS_BY_DEFAULT } from '../constants';
import { RouteService } from '../services/routeService';
import { createGpx } from '../utils/gpx';
import { OsmSymbol } from './OsmSymbol';

interface RouteDetailsProps {
    route: Route;
    onClose: () => void;
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route, onClose }) => {
    const [osmTagsCollapsed, setOsmTagsCollapsed] = React.useState(COLLAPSE_OSM_TAGS_BY_DEFAULT);

    // Utility function to handle GPX file download per platform
    const downloadGpxFile = (gpxContent: string, fileName: string) => {
        if (Platform.OS === 'web') {
            const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // Placeholder for native implementation
            console.log('GPX download not implemented for native yet');
        }
    };

    const handleDownloadGpx = async () => {
        try {
            const geojson = await RouteService.fetchGeoJSON(route.osm_id);
            // geojson is a FeatureCollection
            if (geojson.features && geojson.features.length > 0) {
                const feature = geojson.features[0] as Feature<LineString | MultiLineString>;
                const gpxContent = createGpx(feature);
                const fileName = `${route.name || 'route'}.gpx`;
                downloadGpxFile(gpxContent, fileName);
            }
        } catch (e) {
            console.error('Failed to download GPX', e);
            alert('Failed to download GPX');
        }
    };

    const renderTags = (tags: Record<string, string> | null, filter: boolean = true) => {
        if (!tags) return null;
        return Object.entries(tags)
            .filter(([key]) => {
                if (!filter) return true;
                if (IGNORED_TAGS.includes(key)) return false;
                if (key.startsWith('old_') || key.endsWith('_old')) return false;
                return true;
            })
            .map(([key, value]) => {
                const stringValue = String(value);
                if (key === 'wikidata') {
                    const url = stringValue.startsWith('Q') ? `https://www.wikidata.org/wiki/${stringValue}` : stringValue;
                    return (
                        <View key={key} style={styles.tagRow}>
                            <Text style={styles.tagKey}>{key}:</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(url)}>
                                <Text style={styles.link}>{stringValue}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }

                if (key === 'url') {
                    const url = stringValue.startsWith('http') ? stringValue : `https://${stringValue}`;
                    return (
                        <View key={key} style={styles.tagRow}>
                            <Text style={styles.tagKey}>{key}:</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(url)}>
                                <Text style={styles.link}>{stringValue}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }

                return (
                    <View key={key} style={styles.tagRow}>
                        <Text style={styles.tagKey}>{key}:</Text>
                        <Text style={styles.tagValue}>{stringValue}</Text>
                    </View>
                );
            });
    };

    const networkInfo = route.network ? NETWORK_MAP[route.network] : null;
    const fromLoc = route.tags?.from;
    const toLoc = route.tags?.to;

    return (
        <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>{route.name || 'Unnamed Route'}</Text>
                    {networkInfo && (
                        <View style={[styles.badge, { backgroundColor: networkInfo.color, marginTop: 4 }]}>
                            <Text style={styles.badgeText}>{networkInfo.label}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Info</Text>

                    {fromLoc && toLoc && (
                        <View style={styles.routeRow}>
                            <Text style={styles.routeText}>{fromLoc} → {toLoc}</Text>
                        </View>
                    )}

                    {route.tags?.website && (
                        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(route.tags!.website)}>
                            <Text style={styles.link}>Website</Text>
                        </TouchableOpacity>
                    )}

                    {(() => {
                        const url = route.tags?.url;
                        if (!url) return null;
                        return (
                            <TouchableOpacity style={styles.linkRow} onPress={() => {
                                const raw = url;
                                const finalUrl = raw.startsWith('http') ? raw : `https://${raw}`;
                                Linking.openURL(finalUrl);
                            }}>
                                <Text style={styles.link}>URL</Text>
                            </TouchableOpacity>
                        );
                    })()}

                    {route.tags?.wikipedia && (
                        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`https://wikipedia.org/wiki/${route.tags!.wikipedia}`)}>
                            <Text style={styles.link}>Wikipedia</Text>
                        </TouchableOpacity>
                    )}


                    {route.tags?.source && (
                        route.tags.source.startsWith('http') ? (
                            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(route.tags!.source)}>
                                <Text style={styles.link}>Source</Text>
                            </TouchableOpacity>
                        ) : (
                            <InfoRow label="Source" value={route.tags.source} />
                        )
                    )}

                    <View style={styles.row}>
                        <Text style={styles.label}>Symbol</Text>
                        <View style={styles.valueContainer}>
                            <OsmSymbol symbol={route.symbol} />
                        </View>
                    </View>

                    <InfoRow
                        label="Length"
                        value={route.length_m ? `${(route.length_m / 1000).toFixed(2)} km` : 'N/A'}
                    />

                    {route.route_type !== 'hiking' && route.route_type !== 'foot' && (
                        <InfoRow label="Type" value={route.route_type} />
                    )}

                    <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadGpx}>
                        <Text style={styles.downloadBtnText}>Download GPX</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    {renderTags(route.tags, true)}
                </View>

                <View style={styles.section}>
                    <TouchableOpacity onPress={() => setOsmTagsCollapsed(!osmTagsCollapsed)} style={styles.collapsibleHeader}>
                        <Text style={styles.sectionTitle}>OSM Tags</Text>
                        <Text style={styles.chevron}>{osmTagsCollapsed ? '▼' : '▲'}</Text>
                    </TouchableOpacity>
                    {!osmTagsCollapsed && (
                        <>
                            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`https://www.openstreetmap.org/relation/${route.osm_id}`)}>
                                <Text style={styles.link}>View Relation {route.osm_id} on OSM</Text>
                            </TouchableOpacity>
                            {renderTags(route.tags, false)}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const InfoRow = ({ label, value }: { label: string, value: string | number | null }) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || '-'}</Text>
    </View>
);

const styles = StyleSheet.create({
    sidebar: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 300,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
        padding: 20,
        zIndex: 30,
        borderLeftWidth: 1,
        borderLeftColor: '#eee',
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    headerContent: {
        flex: 1,
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        fontSize: 28,
        color: '#999',
        lineHeight: 28,
    },
    content: {
        flex: 1,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    row: {
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    value: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
    },
    valueContainer: {
        flex: 1,
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    tagRow: {
        flexDirection: 'row',
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        paddingVertical: 2,
    },
    tagKey: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        width: '40%',
    },
    tagValue: {
        fontSize: 12,
        color: '#333',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    link: {
        color: '#007bff',
        textDecorationLine: 'underline',
        fontSize: 14,
    },
    linkRow: {
        marginBottom: 8,
    },
    routeRow: {
        marginBottom: 12,
    },
    routeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    downloadBtn: {
        marginTop: 15,
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    downloadBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
        marginBottom: 10,
    },
    chevron: {
        fontSize: 12,
        color: '#666',
    },
});
