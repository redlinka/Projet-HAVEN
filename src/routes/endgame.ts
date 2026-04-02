import { Router } from 'express';
import Player from '../models/Player';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { token, SQLid, game, mode, difficulty, points } = req.body;
    const numericSQLid = Number(SQLid);

    const gameEntry = {
      game,
      playedAt: new Date(),
      mode,
      difficulty,
      points,
      earnedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      used: false
    };

    // LOGGED USER (in bricksy)
    if (!isNaN(numericSQLid) && numericSQLid !== -1) {
      let player = await Player.findOne({ SQL_id: numericSQLid });

      const freshToken = jwt.sign(
        { SQL_id: numericSQLid },
        process.env.JWT_SECRET as string,
        { expiresIn: '30d' }
      );

      if (!player) {
        // player not logged in haven yet, we create a new doc
        player = await Player.create({
          SQL_id: numericSQLid, 
          sessionToken: freshToken,
          lastConnectedAt: new Date(),
          games: [gameEntry]
        });
      } else {
        // We updt existing player with new game and token
        player.games.push(gameEntry);
        player.sessionToken = freshToken; 
        player.lastConnectedAt = new Date();
        await player.save();
      }

      return res.json(player);
    }

    // GUEST CASE
    if (token) {
      const guest = await Player.findOne({ sessionToken: token });
      if (guest) {
        guest.games.push(gameEntry);
        await guest.save();
        return res.json(guest);
      }
    }

    // NEW GUEST
    const guestToken = jwt.sign(
      { SQL_id: null },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    const newGuest = await Player.create({
      SQL_id: -1, // Guest identifier
      sessionToken: guestToken,
      lastConnectedAt: new Date(),
      games: [gameEntry]
    });

    res.json(newGuest);

  } catch (error) {
    console.error("Endgame Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;