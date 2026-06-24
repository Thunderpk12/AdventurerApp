'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useEffect, useRef } from 'react';

// Custom component to animate numbers
const AnimatedNumber = ({ value }: { value: number }) => {
  const prevValue = useRef(value);

  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  const style = {
    '--start': prevValue.current,
    '--end': value,
  } as React.CSSProperties;

  if (prevValue.current === value) {
    return <span>{value}</span>;
  }

  return <span className="animate-number" style={style}></span>;
};

export default function Home() {
  const { leaderboard, lastUpdated } = useLeaderboard();

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <div className="z-10 w-full max-w-5xl font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center text-purple-400">PulseGG Leaderboard</h1>

        {lastUpdated && (
          <p className="text-center mb-4 text-gray-400">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</p>
        )}

        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700 border-b border-gray-600">
                <th className="p-4 font-semibold text-gray-300">Rank</th>
                <th className="p-4 font-semibold text-gray-300">Player</th>
                <th className="p-4 font-semibold text-gray-300">Points</th>
                <th className="p-4 font-semibold text-gray-300">Correct Predictions</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">Loading snapshot...</td>
                </tr>
              ) : (
                leaderboard.map((entry, index) => (
                  <tr key={entry.userId} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="p-4 text-gray-400">#{index + 1}</td>
                    <td className="p-4 font-medium text-white">{entry.username}</td>
                    <td className="p-4 text-yellow-400 font-bold">
                      <AnimatedNumber value={entry.totalPoints} />
                    </td>
                    <td className="p-4 text-green-400">{entry.correctPredictions}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}