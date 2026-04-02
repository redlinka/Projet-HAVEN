import { Router } from 'express';
import Player from '../models/Player';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { SQLid } = req.query;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    let player = null;

    // We try to find bricksy player first
    if (SQLid && SQLid !== "-1") {
      player = await Player.findOne({ SQL_id: Number(SQLid) });
    } 
    // Try to find by token (Guest user)
    else if (token) {
      player = await Player.findOne({ sessionToken: token });
    }

    if (!player) return res.json(null);

    // Update last connected date
    player.lastConnectedAt = new Date();

    // If player token is missing, we regenerate it
    if (!player.sessionToken) {
      const newToken = jwt.sign(
        { id: player.SQL_id || 'guest' },
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