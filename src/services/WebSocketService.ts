import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socketio.types';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private prisma: PrismaClient;
  private jobRooms: Map<string, Set<string>> = new Map();

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      logger.warn('WebSocketService not initialized, creating dummy instance');
      WebSocketService.instance = new WebSocketService();
      logger.info('WebSocketService initialized as dummy instance');
    }
    return WebSocketService.instance;
  }

  public static initialize(server: any): WebSocketService {
    if (!WebSocketService.instance) {
      logger.info('Initializing WebSocketService...');
      WebSocketService.instance = new WebSocketService();
    }
    
    // Créer le serveur Socket.io et l'attacher au serveur HTTP
    const io = new Server(server.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    // Configurer Socket.io
    WebSocketService.instance.setIo(io);
    logger.info('WebSocketService successfully initialized with Socket.io');
    
    return WebSocketService.instance;
  }

  public setIo(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`📱 Client connected: ${socket.id}`);

      // Handle subscription to specific job
      socket.on('subscribe', (jobId) => {
        try {
          const jobIdNum = typeof jobId === 'string' ? parseInt(jobId) : jobId;
          
          this.prisma.scrapeJob.findUnique({
            where: { id: jobIdNum }
          }).then(job => {
            if (!job) {
              socket.emit('job_update', { 
                jobId,
                status: 'error',
                timestamp: new Date().toISOString(),
                error: 'Job not found'
              });
              return;
            }

            // Add socket to job room
            socket.join(`job:${jobId}`);
            
            // Track subscriptions
            if (!this.jobRooms.has(jobId.toString())) {
              this.jobRooms.set(jobId.toString(), new Set());
            }
            this.jobRooms.get(jobId.toString())?.add(socket.id);

            logger.info(`👀 Client ${socket.id} subscribed to job ${jobId}`);

            // Send initial job state
            socket.emit('job_update', {
              jobId,
              status: job.status,
              timestamp: new Date().toISOString(),
            });

            // Send recent history
            this.prisma.scrapeJobHistory.findMany({
              where: { jobId: jobIdNum },
              orderBy: { startTime: 'desc' },
              take: 50
            }).then(history => {
              socket.emit('job_update', {
                jobId,
                status: job.status,
                timestamp: new Date().toISOString(),
                data: { history }
              });
            }).catch(err => {
              logger.error(`Failed to fetch job history: ${err}`);
            });
          }).catch(error => {
            logger.error('Subscribe error:', error);
            socket.emit('job_update', { 
              jobId,
              status: 'error',
              timestamp: new Date().toISOString(),
              error: 'Failed to subscribe to job'
            });
          });
        } catch (error) {
          logger.error('Subscribe error:', error);
          socket.emit('job_update', { 
            jobId,
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Failed to subscribe to job'
          });
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (jobId) => {
        socket.leave(`job:${jobId}`);
        this.jobRooms.get(jobId.toString())?.delete(socket.id);
        logger.info(`👋 Client ${socket.id} unsubscribed from job ${jobId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`❌ Client disconnected: ${socket.id}`);
        // Clean up subscriptions
        this.jobRooms.forEach((sockets, jobId) => {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.jobRooms.delete(jobId);
            }
          }
        });
      });
    });
  }

  // Émettre un événement à tous les clients
  public emitToAll(event: keyof ServerToClientEvents, data: any) {
    logger.info(`📢 Broadcasting event ${event}:`, data);
    this.io?.emit(event, data);
  }

  // Émettre un événement à un job spécifique
  public emitToJob(jobId: number | string, data: any) {
    const roomId = `job:${jobId}`;
    const eventType = data.type as keyof ServerToClientEvents;
    
    logger.info(`📨 Emitting to job ${jobId}:`, data);
    this.io?.to(roomId).emit(eventType, data);
    
    // Émettre aussi à tous les clients pour la mise à jour globale
    this.emitToAll('scraping:update', data);
  }

  /**
   * Met à jour le statut d'un job et envoie une notification aux clients
   */
  public async updateJobStatus(
    jobId: number, 
    status: string, 
    data: any = {}
  ): Promise<void> {
    try {
      // Mettre à jour le statut dans la base de données
      await this.prisma.scrapeJob.update({
        where: { id: jobId },
        data: { status }
      });

      // Créer l'objet d'événement standardisé
      const eventData = {
        jobId,
        status,
        timestamp: new Date().toISOString(),
        ...data
      };

      logger.info(`📣 Job ${jobId} status updated to ${status}`);

      // Envoyer l'événement au canal spécifique du job
      if (this.io) {
        // Déterminer le type d'événement basé sur le statut
        const statusEvent = `job_${status}` as keyof ServerToClientEvents;
        
        // Émettre sur le canal spécifique du job
        try {
          this.io.to(`job:${jobId}`).emit(statusEvent, eventData);
        } catch (err) {
          // Fallback si l'événement n'est pas reconnu
          this.io.to(`job:${jobId}`).emit('job_update', eventData);
        }
        
        // Émettre également un événement général pour la compatibilité
        this.io.to(`job:${jobId}`).emit('job_update', eventData);
        
        // Diffuser à tous les clients pour les mises à jour globales
        try {
          this.io.emit(statusEvent, eventData);
        } catch (err) {
          // Fallback si l'événement n'est pas reconnu
          this.io.emit('job_update', eventData);
        }
        this.io.emit('job_update', eventData);
        
        logger.debug(`Emitted job_${status} event for job ${jobId}`);
      } else {
        logger.warn('Socket.io server not initialized, could not emit event');
      }
    } catch (error) {
      logger.error(`Error updating job status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Envoie un log en temps réel pour un job spécifique
   */
  public addJobLog(jobId: number, logMessage: string): void {
    try {
      // D'abord, enregistrer le log dans la base de données si nécessaire
      this.persistJobLog(jobId, logMessage).catch(err => 
        logger.error(`Failed to persist job log: ${err}`)
      );

      // Créer l'objet d'événement standardisé
      const eventData = {
        jobId,
        log: logMessage,
        timestamp: new Date().toISOString()
      };

      // Envoyer l'événement au canal spécifique du job
      if (this.io) {
        // Émettre sur le canal spécifique du job
        this.io.to(`job:${jobId}`).emit('job_log', eventData);
        
        // Diffuser à tous les clients pour les mises à jour globales
        this.io.emit('job_log', eventData);
        
        logger.debug(`Emitted job_log event for job ${jobId}: ${logMessage.substring(0, 50)}${logMessage.length > 50 ? '...' : ''}`);
      } else {
        logger.warn('Socket.io server not initialized, could not emit log event');
      }
    } catch (error) {
      logger.error(`Error sending job log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enregistre le log d'un job dans la base de données
   */
  private async persistJobLog(jobId: number, logMessage: string): Promise<void> {
    try {
      // Trouver l'entrée d'historique la plus récente pour ce job
      const history = await this.prisma.scrapeJobHistory.findFirst({
        where: { 
          jobId,
          status: 'running'
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      if (history) {
        await this.prisma.scrapeJobHistory.update({
          where: { id: history.id },
          data: {
            logs: {
              push: `${new Date().toISOString()} - ${logMessage}`
            }
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to persist job log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 