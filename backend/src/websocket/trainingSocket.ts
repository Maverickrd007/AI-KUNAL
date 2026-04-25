import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import type { TrainingProgressEvent } from '../services/types.js';

const channels = new Map<string, Set<WebSocket>>();

export function createTrainingSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/train' });

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    const streamId = url.searchParams.get('streamId');
    if (!streamId) {
      socket.close(1008, 'Missing streamId');
      return;
    }
    const clients = channels.get(streamId) ?? new Set<WebSocket>();
    clients.add(socket);
    channels.set(streamId, clients);

    socket.on('close', () => {
      clients.delete(socket);
      if (clients.size === 0) {
        channels.delete(streamId);
      }
    });
  });

  return wss;
}

export function broadcastTrainingEvent(streamId: string, event: TrainingProgressEvent): void {
  const clients = channels.get(streamId);
  if (!clients) {
    return;
  }
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
