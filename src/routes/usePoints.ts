import { Router } from "express";
import Player from "../models/Player";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { SQLid } = req.body;

    if (!SQLid || SQLid === -1) {
      return res.status(400).json({ success: false, error: "Invalid SQLid" });
    }

    const now = new Date();

    // Marque tous les jeux valides (non expirés, non utilisés) comme utilisés
    const result = await Player.updateOne(
      { SQL_id: Number(SQLid) },
      {
        $set: {
          "games.$[elem].used": true,
        },
      },
      {
        arrayFilters: [
          {
            "elem.used": false,
            "elem.expiresAt": { $gt: now },
          },
        ],
      },
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Player not found" });
    }

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("UsePoints Error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
