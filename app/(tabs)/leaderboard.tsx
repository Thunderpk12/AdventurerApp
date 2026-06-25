import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { Colors } from '../../constants/Colors';
import { usePlayerStore } from '../../store/playerStore';
import { getTitleForLevel } from '../../utils/gamification';

// ── Deterministic colour from username (no external image dependency) ────────
function avatarColorForName(name: string): string {
  const PALETTE = [
    '#7C3AED', '#2563EB', '#059669', '#D97706',
    '#DC2626', '#DB2777', '#0891B2', '#65A30D',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface LeaderEntry {
  id: string;
  username: string | null;
  level: number;
  xp: number;
  streak: number;
}

const RANK_STYLES: Record<number, { border: string; bg: string; icon: string }> = {
  0: { border: Colors.secondary,          bg: Colors.secondaryContainer + '55', icon: '🥇' },
  1: { border: Colors.onSurfaceVariant,   bg: Colors.surfaceContainerHigh,       icon: '🥈' },
  2: { border: Colors.tertiary,           bg: Colors.tertiaryContainer + '33',   icon: '🥉' },
};

export default function LeaderboardScreen() {
  const { profile } = usePlayerStore();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [myRank, setMyRank]     = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, level, xp, streak')
        .order('xp', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLeaders(data as LeaderEntry[]);
        if (profile?.id) {
          const idx = (data as LeaderEntry[]).findIndex(e => e.id === profile.id);
          setMyRank(idx >= 0 ? idx + 1 : null);
        }
      }
      setLoading(false);
    }
    load();
  }, [profile?.id]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── HEADER ─────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Leaderboard</Text>
          <Text style={s.headerSub}>
            {myRank ? `Your rank: #${myRank}` : 'Top Adventurers This Season'}
          </Text>
        </View>
        <View style={s.trophyWrap}>
          <Text style={s.trophyIcon}>🏆</Text>
        </View>
      </View>

      {/* ── MY RANK PILL ───────────────────────────── */}
      {myRank && profile && (
        <View style={s.myRankBanner}>
          <Text style={s.myRankText}>
            ⚔️ You are rank <Text style={s.myRankNum}>#{myRank}</Text> with{' '}
            <Text style={s.myRankNum}>{profile.xp.toLocaleString()} XP</Text>
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={Colors.primaryContainer} />
            <Text style={s.loadingText}>Summoning heroes…</Text>
          </View>
        ) : leaders.length === 0 ? (
          <View style={s.centered}>
            <Text style={{ fontSize: 56 }}>🏜️</Text>
            <Text style={s.emptyTitle}>No heroes yet</Text>
            <Text style={s.emptySub}>Be the first to earn XP and claim the throne!</Text>
          </View>
        ) : (
          leaders.map((entry, idx) => {
            const isMe      = entry.id === profile?.id;
            const rankStyle = RANK_STYLES[idx] ?? {
              border: Colors.surfaceVariant,
              bg:     Colors.surfaceContainerLow,
              icon:   `#${idx + 1}`,
            };
            const displayName  = entry.username ?? 'Adventurer';
            const initial      = displayName.charAt(0).toUpperCase();
            const avatarColor  = avatarColorForName(displayName);

            return (
              <View
                key={entry.id}
                style={[
                  s.row,
                  { borderColor: isMe ? Colors.primary : rankStyle.border + '66' },
                  isMe && s.rowMe,
                ]}
              >
                {/* Rank */}
                <View style={[s.rankBox, { backgroundColor: rankStyle.bg }]}>
                  <Text style={s.rankIcon}>
                    {typeof rankStyle.icon === 'string' && rankStyle.icon.startsWith('#')
                      ? <Text style={s.rankNum}>{idx + 1}</Text>
                      : rankStyle.icon}
                  </Text>
                </View>

                {/* Avatar — iniciais com cor determinística */}
                <View style={[s.avatarRing, isMe && { borderColor: Colors.primary }]}>
                  <View style={[s.avatarInitials, { backgroundColor: avatarColor }]}>
                    <Text style={s.avatarInitialsText}>{initial}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={s.info}>
                  <Text style={[s.name, isMe && { color: Colors.primary }]} numberOfLines={1}>
                    {displayName}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={s.titleText}>{getTitleForLevel(entry.level)}</Text>
                  {entry.streak > 0 && (
                    <Text style={s.streakBadge}>🔥 {entry.streak} day streak</Text>
                  )}
                </View>

                {/* Stats */}
                <View style={s.stats}>
                  <Text style={s.xp}>{entry.xp.toLocaleString()}</Text>
                  <Text style={s.xpLabel}>XP</Text>
                  <View style={s.levelPill}>
                    <Text style={s.levelText}>Lv.{entry.level}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 4, borderBottomColor: Colors.surfaceContainerLow,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 4,
  },
  headerTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: 26, color: Colors.onSurface },
  headerSub:   { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  trophyWrap: {
    width: 48, height: 48,
    backgroundColor: Colors.secondaryContainer + '44',
    borderRadius: 12, borderWidth: 2, borderColor: Colors.secondary + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  trophyIcon: { fontSize: 24 },

  myRankBanner: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.primaryContainer + '22',
    borderRadius: 10, borderWidth: 1, borderColor: Colors.primaryContainer + '66',
    padding: 12, alignItems: 'center',
  },
  myRankText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13, color: Colors.onSurface },
  myRankNum:  { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },

  centered:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  loadingText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },
  emptyTitle:  { fontFamily: 'FredokaOne_400Regular', fontSize: 22, color: Colors.onSurface },
  emptySub:    { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14, borderWidth: 2,
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.3, shadowRadius: 0, elevation: 3,
  },
  rowMe: {
    backgroundColor: Colors.primaryContainer + '18',
    shadowColor: Colors.primary,
  },

  rankBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rankIcon: { fontSize: 20 },
  rankNum:  { fontFamily: 'FredokaOne_400Regular', fontSize: 16, color: Colors.onSurface },

  avatarRing: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  avatarInitials: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitialsText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: '#FFFFFF',
  },

  info: { flex: 1 },
  name: {
    fontFamily: 'FredokaOne_400Regular', fontSize: 15, color: Colors.onSurface,
  },
  titleText: {
    fontFamily: 'BeVietnamPro_400Regular', fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1,
  },
  streakBadge: {
    fontFamily: 'BeVietnamPro_700Bold', fontSize: 9, color: Colors.tertiary,
    marginTop: 2, letterSpacing: 0.3,
  },

  stats:    { alignItems: 'flex-end' },
  xp:       { fontFamily: 'FredokaOne_400Regular', fontSize: 16, color: Colors.secondary },
  xpLabel:  { fontFamily: 'BeVietnamPro_700Bold', fontSize: 8, color: Colors.onSurfaceVariant, letterSpacing: 1, textTransform: 'uppercase' },
  levelPill: {
    marginTop: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.surfaceVariant,
  },
  levelText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: Colors.primary },
});
