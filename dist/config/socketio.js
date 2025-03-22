import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';
import chalk from 'chalk';
export const configureSocketIO = (server) => {
    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;
    logger.info(chalk.blue.bold('\n🚀 Démarrage des services...'));
    logger.info(chalk.gray('-------------------------------------------'));
    // Affichage des URLs des services
    logger.info(chalk.blue('📚 Documentation API  :') + chalk.yellow(` ${baseUrl}/docs`));
    logger.info(chalk.blue('📊 Interface BullMQ  :') + chalk.yellow(` ${baseUrl}/dashboard`));
    logger.info(chalk.blue('🔌 Socket.IO        :') + chalk.yellow(` ${baseUrl}`));
    logger.info(chalk.gray('-------------------------------------------'));
    const io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        logger.info(chalk.green(`📱 Nouvelle connexion Socket.IO (ID: ${chalk.yellow(socket.id)})`));
        // Envoyer un message de bienvenue
        socket.emit('welcome', {
            message: 'Bienvenue sur le serveur de scraping',
            timestamp: new Date().toISOString()
        });
        // Gérer les souscriptions aux jobs
        socket.on('subscribe', (jobId) => {
            logger.info(chalk.cyan(`👀 Client ${chalk.yellow(socket.id)} s'est abonné au job ${chalk.magenta(jobId)}`));
            socket.join(`job:${jobId}`);
            socket.emit('subscribed', {
                jobId,
                timestamp: new Date().toISOString()
            });
        });
        // Gérer les désinscriptions
        socket.on('unsubscribe', (jobId) => {
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
