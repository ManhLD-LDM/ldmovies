import express from 'express';
import {
  deleteHistoryItem,
  getHistory,
  syncHistoryItem,
  getComicHistory,
  syncComicHistoryItem,
  deleteComicHistoryItem,
} from '../controllers/historyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Watch history routes
router.route('/').get(protect, getHistory).post(protect, syncHistoryItem);
router.route('/:slug/:episodeName').delete(protect, deleteHistoryItem);

// Comic history routes
router.route('/comics').get(protect, getComicHistory).post(protect, syncComicHistoryItem);
router.route('/comics/:slug').delete(protect, deleteComicHistoryItem);

export default router;
