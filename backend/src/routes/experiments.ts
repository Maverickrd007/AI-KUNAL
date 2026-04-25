import { Router } from 'express';

import { ExperimentStore } from '../services/experimentStore.js';

const router = Router();
const store = new ExperimentStore();

router.get('/', (_req, res) => {
  res.json(store.listExperiments());
});

router.get('/:id', (req, res) => {
  const session = store.getSessionByExperiment(req.params.id);
  if (!session) {
    res.status(404).json({ message: 'Experiment not found.' });
    return;
  }
  res.json(session);
});

router.delete('/:id', (req, res) => {
  store.deleteExperiment(req.params.id);
  res.json({ success: true });
});

export default router;
