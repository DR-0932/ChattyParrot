import {Router} from 'express';
import { conversationList, getMessages } from '../controllers/businessControllers.js';

const businessRouter = Router();


businessRouter.get("/convesations",conversationList)
businessRouter.get("/messages",getMessages)

export default businessRouter;