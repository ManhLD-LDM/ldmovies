import express from 'express';
import { getComicSourceStatus, getLatestComics, getComicDetails, getComicChapter, getGenres, getComicsByGenre, searchComics } from '../controllers/comicController.js';

const router = express.Router();

// GET /api/comics/source-status
router.get('/source-status', getComicSourceStatus);

// GET /api/comics/latest?page=1
router.get('/latest', getLatestComics);

// GET /api/comics/genres
router.get('/genres', getGenres);

// GET /api/comics/search
router.get('/search', searchComics);

// GET /api/comics/genre/:slug
router.get('/genre/:slug', getComicsByGenre);

// GET /api/comics/:slug
router.get('/:slug', getComicDetails);

// GET /api/comics/chapter/:chapterId
router.get('/chapter/:chapterId', getComicChapter);

export default router;
