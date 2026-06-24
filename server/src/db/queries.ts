// server/src/db/queries.ts
import { supabase } from './supabase.js';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  correctPredictions: number;
}

export async function getLeaderboardSnapshot(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, total_points, predictions(count)')
    .order('total_points', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching leaderboard snapshot:', error);
    return [];
  }

  // To count only correct predictions, we should ideally fetch predictions with points_earned = 10
  // Since we can't easily filter the count in the select, we'll fetch the profiles,
  // then fetch correct predictions count for each in a separate query,
  // or use a more complex query / view.
  // For simplicity here, we'll fetch them separately.

  const results = await Promise.all(data.map(async (profile: any) => {
     const { count } = await supabase
       .from('predictions')
       .select('*', { count: 'exact', head: true })
       .eq('user_id', profile.id)
       .eq('points_earned', 10);

     return {
        userId: profile.id,
        username: profile.username,
        totalPoints: profile.total_points,
        correctPredictions: count || 0
     };
  }));

  return results;
}
