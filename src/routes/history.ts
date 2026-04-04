import { Router } from 'express';
import Player from '../models/Player';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Missing Token" });

    const player = await Player.findOne({ sessionToken: token })
      .select('games')
      .lean();

    if (!player) return res.json({ games: [], bestScorePuzzle: 0, bestScoreBrickBlast: 0, totalPoints: 0 });

    const now = new Date();
    const games = player.games || [];

    const validGames = games.filter(g => !g.used && new Date(g.expiresAt) > now);

    const totalPoints = validGames.reduce((acc, g) => acc + (g.points || 0), 0);

    const bestScorePuzzle = games
      .filter(g => g.game === "PUZZLE")
      .reduce((max, g) => Math.max(max, g.points || 0), 0);

    const bestScoreBrickBlast = games
      .filter(g => g.game === "BRICKBLAST")
      .reduce((max, g) => Math.max(max, g.points || 0), 0);

    res.json({
      games,
      bestScorePuzzle,
      bestScoreBrickBlast,
      totalPoints
    });

  } catch (error) {
    console.error("History Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;