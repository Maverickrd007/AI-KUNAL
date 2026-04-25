import { Router } from 'express';

import { MlService } from '../services/mlService.js';

const router = Router();
const ml = new MlService();

router.post('/', async (req, res, next) => {
  try {
    const { dataset_id, config } = req.body;
    if (!dataset_id || !config) {
      res.status(400).json({ message: 'dataset_id and config are required.' });
      return;
    }
    const result = await ml.cleanDataset(dataset_id, config);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
