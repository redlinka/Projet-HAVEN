import { Router } from 'express';
import Player from '../models/Player';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { SQLid } = req.query;

    // Get token from headers if it exists
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    let player = null;

    if (SQLid) {
      player = await Player.findOne({ SQL_id: Number(SQLid) });
    } 

    else if (token) {
      player = await Player.findOne({ sessionToken: token });
    }

    if (!player) return res.json(null);

    // Update lastConnectedAt
    player.lastConnectedAt = new Date();

    // if player token expired, we regenerate and store it in db
    if (!player.sessionToken) {
      const newToken = jwt.sign(
        { SQL_id: player.SQL_id || 'guest' },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
      player.sessionToken = newToken;
    }

    await player.save();
    res.json(player);
    
  } catch (error) {
    console.error("Error in player route:", error);
    res.status(500).json(null);
  }
});

export default router;