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

// Comic history routes — must be registered BEFORE '/:slug/:episodeName',
// otherwise DELETE /comics/:slug is captured by the watch-history route.
router.route('/comics').get(protect, getComicHistory).post(protect, syncComicHistoryItem);
router.route('/comics/:slug').delete(protect, deleteComicHistoryItem);

// Watch history routes
router.route('/').get(protect, getHistory).post(protect, syncHistoryItem);
router.route('/:slug/:episodeName').delete(protect, deleteHistoryItem);

export default router;
