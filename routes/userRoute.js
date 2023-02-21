const express = require('express');
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/userController');
const isAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.get('/getuser', isAuth, getUser);
router.put('/updateprofile', isAuth, updateProfile);
router.patch('/updatepassword', isAuth, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);

module.exports = router;
