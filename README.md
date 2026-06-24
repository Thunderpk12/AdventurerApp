# PulseGG

Plataforma web onde utilizadores registados fazem previsões de resultado para partidas de e-sports (CS2, Valorant, LoL) **antes do início** de cada jogo. Quando o resultado é confirmado, um leaderboard global e por torneio atualiza em **tempo real** para todos os utilizadores conectados.

## Diagrama de arquitetura

```
PandaScore API ──(polling 60s)──► Node.js Server
                                       │
                              Socket.io │ WebSocket
                                       │
                    ┌──────────────────┼──────────────────┐
                 Client A          Client B           Client C
              (snapshot)        (live updates)     (late joiner
                                                   → snapshot
                                                   → updates)
```

## A decisão técnica principal

> "Quando um cliente liga a meio de uma sessão, simplesmente subscrever ao stream de eventos deixa o UI desatualizado. Resolvi enviando um snapshot completo no momento da ligação, antes de adicionar o socket à room. Isto garante que o estado inicial é sempre consistente, independentemente de quando o utilizador chegou."

## Um tradeoff real

> "Escolhi polling à PandaScore API a cada 60s em vez de depender de webhooks porque o free tier não os suporta. Internamente, uso WebSockets entre o server e os clientes para que o atraso máximo seja 60s mas a propagação para os clientes seja imediata."

## Production incident #X

[Placeholder para o Issue no GitHub detalhando o bug real documentado, fechado com um PR e referenciado aqui.]

---

## Tecnologias

- **Frontend:** Next.js, React, TypeScript, TailwindCSS
- **Backend:** Node.js, Express, TypeScript, Socket.io
- **Base de dados:** PostgreSQL (Supabase)
- **Dados e-sports:** PandaScore API

## Executando Localmente

### Backend (Server)
```bash
cd server
npm install
npm run build # if using tsc
# run server logic
```

### Frontend (Client)
```bash
cd client
npm install
npm run dev
```