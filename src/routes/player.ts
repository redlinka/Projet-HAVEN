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

    // USER CONNECTED (BRICKSY) + TOKEN  (merge if guest exists)
    if (SQLid && SQLid !== "-1") {
      const sqlPlayer = await Player.findOne({ SQL_id: Number(SQLid) }).select('SQL_id sessionToken games');
      const guestPlayer = token
        ? await Player.findOne({ sessionToken: token }).select('SQL_id sessionToken games')
        : null;

      if (sqlPlayer) {
        // we merge guest games to "sql" player if guest exists, then we delete the guest
        if (guestPlayer) {
          const mergedGamesMap = new Map<string, typeof guestPlayer.games[number]>();
          sqlPlayer.games.forEach(game => mergedGamesMap.set(game._id.toString(), game));
          guestPlayer.games.forEach(game => mergedGamesMap.set(game._id.toString(), game));
          sqlPlayer.games.splice(0, sqlPlayer.games.length);
          Array.from(mergedGamesMap.values()).forEach(game => sqlPlayer.games.push(game));
          await Player.deleteOne({ _id: guestPlayer._id });
        }

        player = sqlPlayer;
      } else {
        // NO SQL ACCOUNT, we just check if there's a guest with the token and return it (no merge possible)
        player = guestPlayer || null;
      }
    }

    // GUEST CASE
    else if (token) {
      player = await Player.findOne({ sessionToken: token }).select('SQL_id sessionToken games');
    }

    // NO PLAYER FOUND
    if (!player) return res.json(null);

    // Update last connected date
    player.lastConnectedAt = new Date();

    // WE REGENERATE TOKEN IF MISSING
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