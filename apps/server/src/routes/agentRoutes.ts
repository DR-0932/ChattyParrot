import {Router} from 'express';
import { chat, uploadMiddleware,upload_file } from '../controllers/agentControllers.js';

const agentRouter = Router();


agentRouter.post("/ingest",uploadMiddleware,upload_file)
agentRouter.post("/chat",chat)

export default agentRouter;