import mongoose from 'mongoose';

/**
 * 🔹 **Connects to MongoDB using the provided environment variable.**
 */
const connectToDatabase = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("A variável de ambiente MONGODB_URI não está definida!");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado ao MongoDB com sucesso!");
  } catch (err) {
    console.error("Erro ao conectar no MongoDB:", err);
    process.exit(1);
  }
};

export default connectToDatabase;
