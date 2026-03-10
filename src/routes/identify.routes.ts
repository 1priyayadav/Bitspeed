import { Router } from 'express';
import { identifyContact } from '../controllers/identifyController';

const router = Router();

router.post('/identify', identifyContact);

export default router;
