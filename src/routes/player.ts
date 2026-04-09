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

    // USER CONNECTED (BRICKSY)
    if (SQLid && SQLid !== "-1") {
      const [sqlPlayer, guestPlayer] = await Promise.all([
        Player.aggregate([
          { $match: { SQL_id: Number(SQLid) } },
          { $project: { SQL_id: 1, sessionToken: 1, games: 1, lastConnectedAt: 1 } }
        ]).then(r => r[0] ?? null),

        token
          ? Player.aggregate([
              { $match: { sessionToken: token } },
              { $project: { SQL_id: 1, sessionToken: 1, games: 1, lastConnectedAt: 1 } }
            ]).then(r => r[0] ?? null)
          : Promise.resolve(null)
      ]);

      if (sqlPlayer) {
        // Merge guest games into SQL player if guest exists and is different from sqlPlayer
        if (guestPlayer && guestPlayer._id.toString() !== sqlPlayer._id.toString()) {
          const mergedGamesMap = new Map<string, any>();

          sqlPlayer.games.forEach((game: any) => mergedGamesMap.set(game._id.toString(), game));
          guestPlayer.games.forEach((game: any) => mergedGamesMap.set(game._id.toString(), game));

          const newToken = jwt.sign(
            { id: sqlPlayer.SQL_id },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
          );

          // Merge games, regenerate token, delete guest
          await Promise.all([
            Player.updateOne(
              { _id: sqlPlayer._id },
              {
                $set: {
                  games: Array.from(mergedGamesMap.values()),
                  sessionToken: newToken,
                  lastConnectedAt: new Date()
                }
              }
            ),
            Player.deleteOne({ _id: guestPlayer._id })
          ]);

          return res.json({ ...sqlPlayer, games: Array.from(mergedGamesMap.values()), sessionToken: newToken });
        }

        player = sqlPlayer;

      } else if (guestPlayer) {
        // No SQL player exists on MongoDB but connected to Bricksy, we promote guest to SQL player
        await Player.updateOne(
          { _id: guestPlayer._id },
          { $set: { SQL_id: Number(SQLid), lastConnectedAt: new Date() } }
        );

        return res.json({ ...guestPlayer, SQL_id: Number(SQLid) });
      }
    }
    // GUEST CASE (no SQL_id)
    else if (token) {
      const result = await Player.aggregate([
        { $match: { sessionToken: token, SQL_id: -1 } },
        { $project: { SQL_id: 1, sessionToken: 1, games: 1, lastConnectedAt: 1 }}
      ]);
      player = result[0] ?? null;
    }

    // NO PLAYER FOUND
    if (!player) return res.json(null);

    // Update last connected date + regenerate token if missing
    const updateFields: any = { lastConnectedAt: new Date() };
    if (!player.sessionToken) {
      updateFields.sessionToken = jwt.sign(
        { id: player.SQL_id || 'guest' },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
    }

    await Player.updateOne({ _id: player._id }, { $set: updateFields });

    res.json({ ...player, ...updateFields });

  } catch (error) {
    console.error("Error in player route:", error);
    res.status(500).json(null);
  }
});

export default router;
