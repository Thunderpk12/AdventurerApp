import { Server, Socket } from 'socket.io';
import { getLeaderboardSnapshot } from '../db/queries.js';

export function setupLeaderboard(io: Server) {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 1. Envia snapshot completo ao cliente que acabou de ligar
    // Este é o passo crítico — resolve o problema do late-joiner
    const snapshot = await getLeaderboardSnapshot();
    socket.emit('leaderboard:snapshot', snapshot);

    // 2. Coloca o cliente na room global
    socket.join('leaderboard:global');

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// Chamado quando um resultado é confirmado
export async function broadcastResultUpdate(
  io: Server,
  matchId: string
) {
  const updatedLeaderboard = await getLeaderboardSnapshot();
  // Broadcast para todos os clientes na room
  io.to('leaderboard:global').emit('leaderboard:update', {
    matchId,
    leaderboard: updatedLeaderboard,
    timestamp: new Date().toISOString(),
  });
}
