import { Router } from 'express';

import { ReportService } from '../services/reportService.js';

const router = Router();
const reports = new ReportService();

router.post('/', async (req, res, next) => {
  try {
    const buffer = await reports.buildPdf(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="astraml-report.pdf"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
