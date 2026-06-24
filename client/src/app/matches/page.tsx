'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Array<{ id: string; tournament: string; scheduled_at: string; status: string; team_a: string; team_b: string; }>>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMatches(data);
      });
  }, [supabase]);

  const handlePredict = async (matchId: string, predictedWinner: string) => {
    if (!user) {
      alert('Please log in first!');
      return;
    }
    const { error } = await supabase.from('predictions').insert({
      user_id: user.id,
      match_id: matchId,
      predicted_winner: predictedWinner
    });

    if (error) {
      alert('Failed to save prediction. Did you already predict this match?');
      console.error(error);
    } else {
      alert('Prediction saved!');
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col p-10 bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-purple-400">Upcoming Matches</h1>
        {!user ? (
          <button onClick={handleLogin} className="bg-blue-600 px-4 py-2 rounded text-white font-bold">
            Login with Google
          </button>
        ) : (
          <div className="text-green-400 font-bold">Logged in</div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {matches.map(match => (
          <div key={match.id} className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">{match.tournament}</h2>
            <div className="text-sm text-gray-400 mb-4">{new Date(match.scheduled_at).toLocaleString()}</div>

            <div className="flex flex-col gap-2">
              <button
                disabled={match.status !== 'upcoming'}
                onClick={() => handlePredict(match.id, match.team_a)}
                className={`p-3 rounded font-bold ${match.status === 'upcoming' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 cursor-not-allowed'}`}
              >
                {match.team_a}
              </button>
              <div className="text-center font-bold text-gray-500">VS</div>
              <button
                disabled={match.status !== 'upcoming'}
                onClick={() => handlePredict(match.id, match.team_b)}
                className={`p-3 rounded font-bold ${match.status === 'upcoming' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 cursor-not-allowed'}`}
              >
                {match.team_b}
              </button>
            </div>
            {match.status !== 'upcoming' && (
              <div className="mt-4 text-center text-red-400 font-bold">Predictions Locked ({match.status})</div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
