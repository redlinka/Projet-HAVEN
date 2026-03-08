import dotenv from 'dotenv';
import connectDB from './db';
import Player from './models/Player';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';



const test = async () => {

  const token = jwt.sign(
      { linkedPHPId: null },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
  );

  const hashedToken = await bcrypt.hash(token, 10);

  const player = new Player({
    isGuest: true,
    linkedPHPId: null,
    sessionToken: hashedToken,
    lastConnectedAt: new Date(),
    games: [
      {
        game: 'PUZZLE',
        playedAt: new Date(),
        mode: 'solo',
        points: 50,
        earnedAt: new Date(),
        expiresAt: new Date('2026-04-07'),
        used: false
      }
    ]
  });

  await player.save();
  console.log('Joueur inséré', player);
};


dotenv.config();


// MAIN
const main = async() => {
  await connectDB();
  await test();
}

main();
