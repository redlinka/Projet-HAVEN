import express from 'express';
import Player from '../models/Player';

const router = express.Router();

router.post('/merge', async (req, res) => {
  try {
    const { sessionToken, realSQLid } = req.body;

    if (!sessionToken || !realSQLid || realSQLid === -1) {
      return res.status(400).json({ message: "Données invalides" });
    }

    // accoutn alr exist, so we just return it
    const existingRealPlayer = await Player.findOne({ SQL_id: realSQLid });

    if (existingRealPlayer) {
      return res.json(existingRealPlayer);
    }

    // account doesn't exist, we try to find the guest account and link it to his SQL id
    const guestPlayer = await Player.findOne({ sessionToken: sessionToken });

    if (guestPlayer && guestPlayer.SQL_id === -1) {
        guestPlayer.SQL_id = realSQLid;
        await guestPlayer.save();
        return res.json(guestPlayer);
    }

    res.status(404).json({ message: "Cannot link accounts" });

  } catch (error) {
    console.error("Merge error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;