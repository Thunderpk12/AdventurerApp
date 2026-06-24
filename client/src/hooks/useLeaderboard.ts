// client/src/hooks/useLeaderboard.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  correctPredictions: number;
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    // Connect to the local server port 3001
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

    // Recebe snapshot inicial (estado completo ao ligar)
    socket.on('leaderboard:snapshot', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    // Recebe atualizações incrementais
    socket.on('leaderboard:update', ({ leaderboard, timestamp }) => {
      setLeaderboard(leaderboard);
      setLastUpdated(timestamp);
    });

    return () => { socket.disconnect(); };
  }, []);

  return { leaderboard, lastUpdated };
}
