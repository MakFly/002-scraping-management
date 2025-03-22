import { WebSocketService } from './WebSocketService';
import { logger } from '../config/logger';

export interface EventClient {
  id: string;
  send: (data: string) => void;
}

export class EventService {
  private static instance: EventService;
  private clients: Set<EventClient>;
  private wsService: WebSocketService;
  private originalEmitToAll: Function;

  private constructor() {
    this.clients = new Set();
    this.wsService = WebSocketService.getInstance();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  private setupWebSocketHandlers() {
    // Sauvegarde de la méthode originale
    this.originalEmitToAll = this.wsService.emitToAll;
    
    // Override de la méthode emitToAll du WebSocketService
    this.wsService.emitToAll = (event: string, data: any) => {
      logger.info(`📢 Broadcasting SSE event ${event}:`, data);
      
      // Appeler la méthode originale si elle existe
      if (typeof this.originalEmitToAll === 'function') {
        this.originalEmitToAll.call(this.wsService, event, data);
      }
      
      // Envoyer aux clients SSE
      this.broadcast(event, data);
      
      // Vérifier si c'est un événement de changement de statut
      if (event.startsWith('job_') && (
        event.includes('completed') || 
        event.includes('failed') || 
        event.includes('running') || 
        event.includes('started')
      )) {
        // Envoyer également un événement générique job_update pour assurer la compatibilité
        this.broadcast('job_update', data);
      }
    };
  }

  // Méthode pour envoyer directement un événement (sans passer par WebSocketService)
  public sendEvent(event: string, data: any): void {
    logger.info(`📢 Sending SSE event ${event} directly:`, data);
    this.broadcast(event, data);
  }

  public addClient(client: EventClient): void {
    this.clients.add(client);
    logger.info(`📱 SSE Client connected: ${client.id}`);
    
    // Envoyer un événement de connexion
    this.sendDirectMessage(client, { 
      type: 'connected',
      clientId: client.id,
      timestamp: new Date().toISOString()
    });
  }

  public removeClient(client: EventClient): void {
    this.clients.delete(client);
    logger.info(`❌ SSE Client disconnected: ${client.id}`);
  }

  private sendDirectMessage(client: EventClient, data: any): void {
    try {
      client.send(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error(`Failed to send to client ${client.id}:`, error);
      this.removeClient(client);
    }
  }

  private broadcast(event: string, data: any): void {
    const eventString = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    logger.info(`📢 Broadcasting to ${this.clients.size} SSE clients`);
    
    this.clients.forEach(client => {
      try {
        client.send(eventString);
      } catch (error) {
        logger.error(`Failed to send to client ${client.id}:`, error);
        this.removeClient(client);
      }
    });
  }
} 