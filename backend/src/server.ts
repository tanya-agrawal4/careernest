import dotenv from 'dotenv';
import app from './app.js';
import { redisReady } from './config/redisClient.js';

dotenv.config();

const PORT = process.env['PORT'] ?? 5000;

const startServer = async (): Promise<void> => {
  try {
    // Wait for Redis init to complete (connects or gracefully disables).
    await redisReady;

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
};


startServer();
