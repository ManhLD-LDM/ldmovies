import express from 'express';
import { proxyImage } from '../controllers/imageProxyController.js';

const router = express.Router();

router.get('/', proxyImage);

export default router;
