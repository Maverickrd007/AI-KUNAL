import { useEffect } from 'react';

import { WS_URL } from '../lib/api';
import type { TrainingProgressEvent } from '../types';

export function useWebSocket(
  streamId: string | null,
  onEvent: (event: TrainingProgressEvent) => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!streamId || !enabled) {
      return;
    }
    const socket = new WebSocket(`${WS_URL}/ws/train?streamId=${streamId}`);
    socket.onmessage = (message) => {
      onEvent(JSON.parse(message.data) as TrainingProgressEvent);
    };
    return () => socket.close();
  }, [enabled, onEvent, streamId]);
}
