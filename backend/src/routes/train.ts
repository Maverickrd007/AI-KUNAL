import { randomUUID } from 'node:crypto';

import { Router } from 'express';

import { ExperimentStore } from '../services/experimentStore.js';
import { MlService } from '../services/mlService.js';
import { broadcastTrainingEvent } from '../websocket/trainingSocket.js';

const router = Router();
const ml = new MlService();
const store = new ExperimentStore();

router.post('/', async (req, res, next) => {
  const streamId = req.header('x-training-stream-id') ?? randomUUID();
  try {
    const session = await ml.trainDataset(req.body, (event) => {
      broadcastTrainingEvent(streamId, event);
    });
    const experiment = store.createExperiment(session);
    res.setHeader('x-experiment-id', experiment.id);
    res.json({ ...session, experiment_id: experiment.id });
  } catch (error) {
    broadcastTrainingEvent(streamId, {
      type: 'error',
      progress_pct: 100,
      message: error instanceof Error ? error.message : 'Training failed.',
    });
    next(error);
  }
});

export default router;
