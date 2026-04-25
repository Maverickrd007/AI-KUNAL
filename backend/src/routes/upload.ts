import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { Router, type Request } from 'express';
import multer from 'multer';

import { ExperimentStore } from '../services/experimentStore.js';
import { MlService } from '../services/mlService.js';

type UploadRequest = Request & { datasetId?: string };

const router = Router();
const ml = new MlService();
const store = new ExperimentStore();

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB ?? 50);
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (req: UploadRequest, file, callback) => {
    const datasetId = randomUUID();
    req.datasetId = datasetId;
    const ext = path.extname(file.originalname).toLowerCase() || '.csv';
    callback(null, `${datasetId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      callback(new Error('Upload a CSV or XLSX file. Images and other formats are not supported.'));
      return;
    }
    callback(null, true);
  },
});

router.post('/', upload.single('file'), async (req: UploadRequest, res, next) => {
  try {
    if (!req.file || !req.datasetId) {
      res.status(400).json({ message: 'Attach a CSV or XLSX file using the file field.' });
      return;
    }
    const profile = await ml.analyzeDataset(req.file.path, req.datasetId, req.file.originalname);
    store.saveDatasetProfile(profile);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

export default router;
