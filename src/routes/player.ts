import { Router } from 'express';
import Player from '../models/Player';
import jwt from 'jsonwebtoken';


const router = Router();

router.get('/', async (req, res) => {
  const { SQLid } = req.query;
  if (!SQLid) return res.json(null);

  const player = await Player.findOne({ SQL_id: Number(SQLid) });
  if (!player) return res.json(null);

  // if player token expired, we regenerate and store it in db
  if (!player.sessionToken) {
    const token = jwt.sign(
      { SQL_id: Number(SQLid) },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );
    player.sessionToken = token;
    player.lastConnectedAt = new Date();
    await player.save();
  }

  res.json(player);
});

export default router;