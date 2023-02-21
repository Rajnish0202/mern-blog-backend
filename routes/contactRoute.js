const express = require('express');
const contact = require('../controllers/contactController');
const isAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', isAuth, contact);

module.exports = router;
