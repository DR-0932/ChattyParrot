import {Router} from 'express';
import { uploadMiddleware,upload_file } from '../controllers/agentControllers.js';

const agentRouter = Router();


agentRouter.post("/ingest",uploadMiddleware,upload_file)
agentRouter.post("/chat",)

export default agentRouter;