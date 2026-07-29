import express from 'express';
import {
    addFavoriteAnime,
    addFavoriteMovie,
    addFavoriteComic,
    getFavoriteAnime,
    getFavoriteMovies,
    getFavoriteComics,
    removeFavoriteAnime,
    removeFavoriteMovie,
    removeFavoriteComic,
} from '../controllers/favoritesController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Movies routes
router.get('/movies', protect, getFavoriteMovies);
router.post('/movies', protect, addFavoriteMovie);
router.delete('/movies/:movieId', protect, removeFavoriteMovie);

// Anime routes
router.get('/anime', protect, getFavoriteAnime);
router.post('/anime', protect, addFavoriteAnime);
router.delete('/anime/:animeId', protect, removeFavoriteAnime);

// Comics routes
router.get('/comics', protect, getFavoriteComics);
router.post('/comics', protect, addFavoriteComic);
router.delete('/comics/:comicId', protect, removeFavoriteComic);

export default router;
