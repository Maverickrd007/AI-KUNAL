import { Router } from 'express';

import { ChatService } from '../services/chatService.js';

const router = Router();
const chat = new ChatService();

router.post('/', async (req, res, next) => {
  try {
    const { chat_session_id, message, experiment_id } = req.body;
    if (!chat_session_id || !message) {
      res.status(400).json({ message: 'chat_session_id and message are required.' });
      return;
    }
    const response = await chat.respond(chat_session_id, message, experiment_id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
