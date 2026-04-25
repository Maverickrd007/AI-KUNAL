import 'dotenv/config';
import http from 'node:http';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { getDb } from './db/schema.js';
import cleanRouter from './routes/clean.js';
import chatRouter from './routes/chat.js';
import experimentsRouter from './routes/experiments.js';
import explainRouter from './routes/explain.js';
import reportRouter from './routes/report.js';
import trainRouter from './routes/train.js';
import uploadRouter from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createTrainingSocketServer } from './websocket/trainingSocket.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN;

getDb();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: frontendOrigin ? frontendOrigin.split(',') : true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/upload', uploadRouter);
app.use('/api/clean', cleanRouter);
app.use('/api/train', trainRouter);
app.use('/api/experiments', experimentsRouter);
app.use('/api/explain', explainRouter);
app.use('/api/chat', chatRouter);
app.use('/api/report', reportRouter);
app.use(errorHandler);

const server = http.createServer(app);
createTrainingSocketServer(server);

server.listen(port, () => {
  console.log(`AstraML backend listening on http://localhost:${port}`);
});
