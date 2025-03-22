import { Server as SocketIOServer } from 'socket.io';
import { serve } from '@hono/node-server';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socketio.types';
import { logger } from './logger';
import chalk from 'chalk';

export const configureSocketIO = (server: ReturnType<typeof serve>) => {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;

  logger.info(chalk.blue.bold('\n🚀 Démarrage des services...'));
  logger.info(chalk.gray('-------------------------------------------'));
  
  // Affichage des URLs des services
  logger.info(chalk.blue('📚 Documentation API  :') + chalk.yellow(` ${baseUrl}/docs`));
  logger.info(chalk.blue('📊 Interface BullMQ  :') + chalk.yellow(` ${baseUrl}/dashboard`));
  logger.info(chalk.blue('🔌 Socket.IO        :') + chalk.yellow(` ${baseUrl}`));
  logger.info(chalk.gray('-------------------------------------------'));

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    logger.info(chalk.green(`📱 Nouvelle connexion Socket.IO (ID: ${chalk.yellow(socket.id)})`));

    // Envoyer un message de bienvenue
    socket.emit('welcome', {
      message: 'Bienvenue sur le serveur de scraping',
      timestamp: new Date().toISOString()
    });

    // Gérer les souscriptions aux jobs
    socket.on('subscribe', (jobId: string) => {
      logger.info(chalk.cyan(`👀 Client ${chalk.yellow(socket.id)} s'est abonné au job ${chalk.magenta(jobId)}`));
      socket.join(`job:${jobId}`);
      socket.emit('subscribed', {
        jobId,
        timestamp: new Date().toISOString()
      });

      // Envoyer l'état actuel du job
      emitJobState(io, jobId);
    });

    // Gérer les désinscriptions
    socket.on('unsubscribe', (jobId: string) => {
      logger.info(chalk.yellow(`👋 Client ${chalk.yellow(socket.id)} s'est désabonné du job ${chalk.magenta(jobId)}`));
      socket.leave(`job:${jobId}`);
      socket.emit('unsubscribed', {
        jobId,
        timestamp: new Date().toISOString()
      });
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
      logger.info(chalk.red(`❌ Client déconnecté (ID: ${chalk.yellow(socket.id)})`));
    });
  });

  logger.info(chalk.green.bold('✅ Socket.IO initialisé avec succès\n'));
  
  return io;
};

// Fonction pour envoyer l'état actuel d'un job
const emitJobState = async (io: any, jobId: string) => {
  try {
    // Vous pouvez récupérer les informations du job depuis la base de données ici
    // Exemple avec Prisma:
    // const job = await prisma.scrapeJob.findUnique({
    //   where: { id: Number(jobId) }
    // });

    // Pour l'instant, envoyons un message simplifié
    io.to(`job:${jobId}`).emit('event', {
      type: 'job:state',
      jobId,
      timestamp: new Date().toISOString(),
      data: {
        message: 'État initial du job',
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'émission de l\'état du job:', error);
  }
}; 