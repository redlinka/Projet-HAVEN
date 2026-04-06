import { Router } from 'express';
import Player from '../models/Player';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { SQLid } = req.query;

    if (!SQLid || SQLid === "null") {
      return res.json({ points: 0, percent: 0 });
    }

    const stats = await Player.aggregate([
      {
        $match: { "SQL_id": Number(SQLid) }
      },
      {
        $unwind: "$games"
      },
      {
        $match: {
          "games.used": false,
          "games.expiresAt": { $gt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: "$games.points" }
        }
      },
      {
        $project: {
          _id: 0,
          points: "$totalPoints",
          percent: { 
            $round: [{ $divide: ["$totalPoints", 2500] }, 2] 
          }
        }
      }
    ]);

    if (stats.length > 0) {
      res.json(stats[0]);
    } else {
      res.json({ points: 0, percent: 0 });
    }

  } catch (error) {
    console.error("Aggregation Error:", error);
    res.status(500).json({ points: 0, percent: 0 });
  }
});

export default router;