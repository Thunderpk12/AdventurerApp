// server/src/matchPoller.ts
import { supabase } from './db/supabase.js';

const PANDASCORE_API_URL = 'https://api.pandascore.co';
const POLLING_INTERVAL_MS = 60 * 1000; // 60 seconds

export async function fetchMatchesFromPandaScore() {
  const apiKey = process.env.PANDASCORE_API_KEY;
  if (!apiKey) {
    console.warn('PANDASCORE_API_KEY is not set. Skipping match polling.');
    return;
  }

  try {
    // Example: fetch upcoming CS2 matches (videogame id 3 is CS:GO/CS2 in pandascore)
    const response = await fetch(`${PANDASCORE_API_URL}/csgo/matches/upcoming?sort=scheduled_at&per_page=5`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`PandaScore API error: ${response.statusText}`);
    }

    const matches = await response.json();

    for (const match of matches) {
      if (match.opponents && match.opponents.length === 2) {
        const teamA = match.opponents[0].opponent.name;
        const teamB = match.opponents[1].opponent.name;

        await supabase.from('matches').upsert({
          external_id: match.id.toString(),
          game: 'cs2',
          tournament: match.league.name,
          team_a: teamA,
          team_b: teamB,
          scheduled_at: match.scheduled_at,
          status: 'upcoming'
        }, { onConflict: 'external_id' });
      }
    }
  } catch (err) {
    console.error('Error polling matches:', err);
  }
}

export function startMatchPoller() {
  console.log('Match poller started. Polling every 60 seconds.');

  // Initial fetch
  fetchMatchesFromPandaScore();

  // Setup interval
  setInterval(fetchMatchesFromPandaScore, POLLING_INTERVAL_MS);
}
