import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { WebSocketEvent } from '../types/ScrapeJobTypes';

const prisma = new PrismaClient();

export class WebSocketService {
  private io: Server;
  private jobRooms: Map<string, Set<string>> = new Map();

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle subscription to specific job
      socket.on('subscribe', async (jobId: string) => {
        try {
          const job = await prisma.scrapeJob.findUnique({
            where: { id: parseInt(jobId) }
          });

          if (!job) {
            socket.emit('error', { message: 'Job not found' });
            return;
          }

          // Add socket to job room
          socket.join(`job:${jobId}`);
          
          // Track subscriptions
          if (!this.jobRooms.has(jobId)) {
            this.jobRooms.set(jobId, new Set());
          }
          this.jobRooms.get(jobId)?.add(socket.id);

          // Send initial job state
          socket.emit('job:state', {
            type: 'job_state',
            jobId,
            timestamp: new Date().toISOString(),
            data: {
              status: job.status,
            }
          });

          // Send recent history
          const history = await prisma.scrapeJobHistory.findMany({
            where: { jobId: parseInt(jobId) },
            orderBy: { startTime: 'desc' },
            take: 50
          });

          socket.emit('job:history', {
            type: 'job_history',
            jobId,
            timestamp: new Date().toISOString(),
            data: { history }
          });
        } catch (error) {
          console.error('Subscribe error:', error);
          socket.emit('error', { message: 'Failed to subscribe to job' });
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (jobId: string) => {
        socket.leave(`job:${jobId}`);
        this.jobRooms.get(jobId)?.delete(socket.id);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up subscriptions
        this.jobRooms.forEach((sockets, jobId) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.jobRooms.delete(jobId);
          }
        });
      });
    });
  }

  // Emit event to all clients
  public broadcast(event: WebSocketEvent) {
    this.io.emit('event', event);
  }

  // Emit event to specific job subscribers
  public emitToJob(jobId: number, event: WebSocketEvent) {
    this.io.to(`job:${jobId}`).emit('event', event);
  }

  // Add log entry to job
  public async addJobLog(jobId: number, message: string) {
    try {
      const history = await prisma.scrapeJobHistory.findFirst({
        where: { 
          jobId: jobId,
          status: 'running'
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      if (history) {
        await prisma.scrapeJobHistory.update({
          where: { id: history.id },
          data: {
            logs: {
              push: `${new Date().toISOString()} - ${message}`
            }
          }
        });

        this.emitToJob(jobId, {
          type: 'item_scraped',
          jobId: jobId.toString(),
          timestamp: new Date().toISOString(),
          data: { message }
        });
      }
    } catch (error) {
      console.error('Failed to add job log:', error);
    }
  }

  // Update job status
  public async updateJobStatus(jobId: number, status: string, data: any = {}) {
    try {
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: { status }
      });

      this.emitToJob(jobId, {
        type: `job_${status}` as WebSocketEvent['type'],
        jobId: jobId.toString(),
        timestamp: new Date().toISOString(),
        data
      });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  }
} 