import dotenv from 'dotenv';
import path from 'path';
import { Router } from 'express';
import http from 'http';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import cors from 'cors';
import connectDB from './db';
import { initWebSocketServer } from './ws/roomManager'
import playerRouter from './routes/player';
import endgameRouter from './routes/endgame';

const PORT = parseInt(process.env.PORT ?? '2025', 10);

async function main() {
  await connectDB();

  const app = express();
  app.use(cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173', // to change when website will be host
    credentials: true,
  }));

  app.use(express.json());

  // we define routes of our app
  app.use('/api-node/player', playerRouter);
  app.use('/api-node/endgame', endgameRouter);


  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = http.createServer(app);
  initWebSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[server] HTTP → http://localhost:${PORT}`);
    console.log(`[server] WS → ws://localhost:${PORT}/ws`);
  });
}

main().catch(err => {
  console.error('[server] Erreur fatale :', err);
  process.exit(1);
});