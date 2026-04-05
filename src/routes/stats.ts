import { Router } from 'express';
import Player from '../models/Player';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { SQLid } = req.query;
    if (!SQLid) return res.status(400).json({ points: 0, percent: 0 });

    const player = await Player.findOne({ SQL_id: Number(SQLid) }).lean();
    if (!player) return res.json({ points: 0, percent: 0 });

    const now = new Date();
    const totalPoints = (player.games || [])
      .filter(g => !g.used && new Date(g.expiresAt) > now)
      .reduce((acc, g) => acc + (g.points || 0), 0);

    res.json({
      points: totalPoints,
      percent: Number((totalPoints / 2500).toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ points: 0, percent: 0 });
  }
});

export default router;