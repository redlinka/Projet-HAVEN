import mongoose, { Schema } from 'mongoose';

const gameSchema = new Schema({
    game: { type: String, enum: ['PUZZLE','BRICKBLAST'], required: true },
    playedAt: { type: Date, required: true },
    mode: { type: String, enum: ['solo', 'duplicate'], required: true },
    points: { type: Number, required: true },
    earnedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
});

const playerSchema = new Schema({
    isGuest: { type: Boolean, default: true },
    linkedPHPId: { type: String, default: null },
    sessionToken: { type: String, default: null },
    lastConnectedAt: { type: Date },
    games: [gameSchema]
});

playerSchema.index({ 'linkedPHPId': 1 });
playerSchema.index({ 'games.expiresAt': 1 });
playerSchema.index({ sessionToken: 1 });
playerSchema.index({ lastConnectedAt: 1 }, { expireAfterSeconds: 31536000 });

const Player = mongoose.model('Player', playerSchema,'Players');
export default Player;