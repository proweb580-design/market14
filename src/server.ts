import { app } from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`⚡ TashTech server is running on http://localhost:${config.port}`);
  console.log(`🚀 Mode: ${config.env}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server terminated');
  });
});
