import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB connecté');
  } catch (error) {
    console.error('Erreur connexion MongoDB:', error);
  }
}

export default connectDB;