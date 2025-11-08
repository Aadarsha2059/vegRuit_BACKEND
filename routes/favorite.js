const express = require('express');
const router = express.Router();
const {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  checkFavorite,
  getFavoriteCount
} = require('../controllers/favoriteController');
const { auth } = require('../middlewares/auth');

// All routes require authentication
router.post('/add', auth, addToFavorites);
router.delete('/remove/:productId', auth, removeFromFavorites);
router.get('/my-favorites', auth, getUserFavorites);
router.get('/check/:productId', auth, checkFavorite);
router.get('/count', auth, getFavoriteCount);

module.exports = router;
