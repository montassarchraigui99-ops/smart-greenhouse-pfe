import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform, View } from 'react-native';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';

export default function TabLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none' },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color }) => <Ionicons name="apps" size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="monitoring"
                    options={{
                        title: 'Analytics',
                        tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="control"
                    options={{
                        title: 'Control',
                        tabBarIcon: ({ color }) => <Ionicons name="hardware-chip" size={26} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="alerts"
                    options={{
                        title: 'Alerts',
                        tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="ai"
                    options={{
                        href: null, // Hidden
                    }}
                />
                <Tabs.Screen
                    name="greenhouse"
                    options={{
                        href: null, // Hidden
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Account',
                        tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
                    }}
                />
            </Tabs>
            <FloatingTabBar />
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        height: Platform.OS === 'ios' ? 85 : 65,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 8,
        elevation: 8,
        shadowColor: Colors.text,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tabBarLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
});
