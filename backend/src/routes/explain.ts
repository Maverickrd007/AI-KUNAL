import { Router } from 'express';

import { MlService } from '../services/mlService.js';

const router = Router();
const ml = new MlService();

router.post('/whatif', async (req, res, next) => {
  try {
    const { session_id, feature_values } = req.body;
    if (!session_id || !feature_values) {
      res.status(400).json({ message: 'session_id and feature_values are required.' });
      return;
    }
    res.json(await ml.whatIf(session_id, feature_values));
  } catch (error) {
    next(error);
  }
});

router.post('/shap', async (req, res, next) => {
  try {
    const { session_id, algorithm, row_index } = req.body;
    if (!session_id || !algorithm) {
      res.status(400).json({ message: 'session_id and algorithm are required.' });
      return;
    }
    res.json(await ml.shap(session_id, algorithm, row_index));
  } catch (error) {
    next(error);
  }
});

export default router;
