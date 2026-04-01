import { Router } from 'express';
import Player from '../models/Player';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { token, SQLid, game, mode, difficulty, points } = req.body;

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

        // we retrieve player and add his game
        if (token) {
            const player = await Player.findOne({ sessionToken: token });
            if (player) {
                player.games.push(gameEntry);
                await player.save();
                return res.json(player);
            }
        }

        // we create an account and link it with bricksy mysql id
        if (SQLid) {
            const newToken = jwt.sign({ SQL_id: SQLid }, process.env.JWT_SECRET as string, { expiresIn: '1d' });
            const player = await Player.create({
                SQL_id: SQLid,
                sessionToken: newToken,
                lastConnectedAt: new Date(),
                games: [gameEntry]
            });
            return res.json(player);
        }

        // Guest part, we create a jwt token to allow him to link his account (within 7days) to bricksy (if the account isnt already linked)
        const newToken = jwt.sign({ SQL_id: null }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
        const guest = await Player.create({
            SQL_id: -1,
            sessionToken: newToken,
            lastConnectedAt: new Date(),
            games: [gameEntry]
        });

        res.json(guest);
        
    } catch (error) {
        console.error("Erreur sur la route endgame :", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;