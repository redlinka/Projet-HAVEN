import { Router } from 'express';
import Player from '../models/Player';
import jwt from 'jsonwebtoken';


const router = Router();

router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Missing Token" });

    const player = await Player.findOne({ sessionToken: token })
      .select('games')
      .lean();

    if (!player) return res.json([]);

    res.json(player.games || []);

  } catch (error) {
    console.error("History Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

