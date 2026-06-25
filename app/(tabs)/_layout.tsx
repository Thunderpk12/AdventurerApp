import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function GameTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const TABS = [
    { name: 'index',   icon: '⚔️',  label: 'Home'      },
    { name: 'quests',  icon: '📋',  label: 'Quests'    },
    { name: 'shop',    icon: '🛒',  label: 'Shop'      },
    { name: 'leaderboard', icon: '🏆',  label: 'Ranks'     },
    { name: 'profile', icon: '🧙',  label: 'Profile'   },
  ];

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom || 8 }]}>
      {/* ── LEFT TABS ─── */}
      {TABS.slice(0, 2).map((tab) => {
        const route = state.routes.find((r: any) => r.name === tab.name);
        const focused = route ? state.index === state.routes.indexOf(route) : false;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.tabBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={[s.tabIcon, focused && s.tabIconActive]}>{tab.icon}</Text>
            <Text style={[s.tabLabel, focused && s.tabLabelActive]}>{tab.label}</Text>
            {focused && <View style={s.activeUnderline} />}
          </TouchableOpacity>
        );
      })}

      {/* ── CENTER FAB — New Quest ─── */}
      <View style={s.fabWrap}>
        <TouchableOpacity
          style={s.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/new-quest')}
        >
          <Text style={s.fabIcon}>✚</Text>
        </TouchableOpacity>
        <Text style={s.fabLabel}>Quest</Text>
      </View>

      {/* ── RIGHT TABS ─── */}
      {TABS.slice(2, 5).map((tab) => {
        const route = state.routes.find((r: any) => r.name === tab.name);
        const focused = route ? state.index === state.routes.indexOf(route) : false;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.tabBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={[s.tabIcon, focused && s.tabIconActive]}>{tab.icon}</Text>
            <Text style={[s.tabLabel, focused && s.tabLabelActive]}>{tab.label}</Text>
            {focused && <View style={s.activeUnderline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GameTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home'        }} />
      <Tabs.Screen name="quests"  options={{ title: 'Quests'      }} />
      <Tabs.Screen name="shop"    options={{ title: 'Shop'        }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile'     }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceContainerHigh,
    borderTopWidth: 4,
    borderTopColor: Colors.surfaceContainerHighest,
    paddingTop: 8,
    paddingHorizontal: 4,
    // Pixel shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  tabLabelActive: {
    color: Colors.secondary,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -4,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
  },

  // FAB
  fabWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    marginTop: -24,          // lifts it above the bar
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.onPrimaryFixed,
    // Pixel shadow (offset downward)
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '900',
  },
  fabLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
