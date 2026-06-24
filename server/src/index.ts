// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupLeaderboard, broadcastResultUpdate } from './realtime/leaderboard.js';
import { supabase } from './db/supabase.js';
import { startMatchPoller } from './matchPoller.js';

dotenv.config();

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(cors({
  origin: clientUrl
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST']
  }
});

// Setup Realtime Leaderboard
setupLeaderboard(io);

// Basic health check route
app.get('/', (req, res) => {
  res.send('PulseGG API is running');
});

// Endpoint to simulate/trigger match result
app.post('/api/admin/match-result', async (req, res) => {
  const { matchId, winner } = req.body;
  if (!matchId || !winner) {
    return res.status(400).json({ error: 'matchId and winner are required' });
  }

  try {
    // 1. Update the match status and winner
    const { error: matchError } = await supabase.from('matches')
      .update({ status: 'finished', winner })
      .eq('id', matchId);

    if (matchError) throw matchError;

    // 2. Calculate points via the RPC (idempotent calculation)
    const { error: rpcError } = await supabase.rpc('calculate_points', { p_match_id: matchId });
    if (rpcError) throw rpcError;

    // 3. Broadcast updated leaderboard
    await broadcastResultUpdate(io, matchId);

    res.json({ success: true, message: `Result for match ${matchId} processed and broadcasted` });
  } catch (err: any) {
    console.error('Error processing match result:', err);
    res.status(500).json({ error: 'Failed to process match result', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Start the background poller for matches
  startMatchPoller();
});
