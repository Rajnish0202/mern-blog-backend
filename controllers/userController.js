const asyncHandler = require('express-async-handler');
const cloudinary = require('../utils/cloudinary');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Register User

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be up to 6 characters');
  }

  // Check if use email already exixts
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('Email has already been registered');
  }

  // Create User

  const user = await User.create({
    name,
    email,
    password,
  });

  // Generate Token
  const token = generateToken(user._id);

  // Send Http-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 24 * 60 * 60 * 7), //7 days
    sameSite: 'none',
    secure: true,
  });

  if (user) {
    res.status(201).json({
      success: true,
      user,
      token,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  // Check if user exits
  const user = await User.findOne({ email });

  if (!user) {
    res.status(400);
    throw new Error('User not found, please signup.');
  }

  // User Exists, check if password is correct
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  // Generate token
  const token = generateToken(user._id);

  // Send Http-only cookie
  if (passwordIsCorrect) {
    res.cookie('token', token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 24 * 60 * 7), //7 days
      sameSite: 'none',
      secure: true,
    });
  }

  if (user && passwordIsCorrect) {
    res.status(200).json({
      success: true,
      user,
      token,
    });
  } else {
    res.status(400);
    throw new Error('Invalid email or password');
  }
});

// Logout User

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(Date.now()),
    sameSite: 'none',
    secure: true,
  });
  return res.status(200).json({
    success: true,
    message: 'Successfully Logged Out.',
  });
});

// Get User Details
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (user) {
    res.status(200).json({
      success: true,
      user,
    });
  } else {
    res.status(400);
    throw new Error('User Not Found!');
  }
});

// Update User Profile
const updateProfile = asyncHandler(async (req, res) => {
  const newUserData = {
    name: req.body.name,
    bio: req.body.bio,
  };

  if (req.body.avataar !== '') {
    const user = await User.findById(req.user._id);

    const imageId = user.avataar.public_id;
    await cloudinary.uploader.destroy(imageId, {
      folder: 'blog-avataars',
    });

    const myCloud = await cloudinary.uploader.upload(req.body.avataar, {
      folder: 'blog-avataars',
      width: 300,
      crop: 'scale',
    });

    newUserData.avataar = {
      public_id: myCloud.public_id || user?.avataar?.public_id,
      url: myCloud.secure_url || user?.avataar?.url,
    };

    newUserData.email = user.email;
  }

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(201).json({
    success: true,
    user,
  });
});

// Change Password
const updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');

  const isPasswordMatched = await bcrypt.compare(
    req.body.oldPassword,
    user.password
  );
  if (!isPasswordMatched) {
    res.status(400);
    throw new Error('Old password is Incorrect!');
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    res.status(400);
    throw new Error('Password does not matched!');
  }

  if (isPasswordMatched && user) {
    user.password = req.body.newPassword;
    await user.save();
    res.status(200).json({
      success: true,
      message: 'Password change successfully.',
    });
  } else {
    res.status(400);
    throw new Error('Old password is incorrect!');
  }
});

// Forgot Password

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(400);
    throw new Error('User does not exist!');
  }

  // Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

  // RESET EMAIL

  const message = `
  <h2>Hello ${user.name}</h2>
  <p>You requested for a password reset.</p>
  <p>Please use the url below to reset your password.</p>
  <p>This reset link is valid for only 15 minutes.</p>
  <a href=${resetPasswordUrl} clicktracking=off>${resetPasswordUrl}</a>
  <p>Regards...</p>
  <p>MERN-BLOG</p>
  `;

  const subject = 'Password Reset Request';
  const send_to = user.email;
  const sent_from = process.env.SMPT_MAIL;

  try {
    await sendEmail(subject, message, send_to, sent_from);
    res.status(200).json({
      success: true,
      message: 'Reset Email Sent.',
    });
  } catch (error) {
    res.status(500);
    throw new Error('Email not sent, Please try again!');
  }
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  // Creating Token Hash
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Reset Password Token is Invalid or has been expired!');
  }

  if (req.body.password !== req.body.confirmPassword) {
    res.status(400);
    throw new Error('Password does not match!');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
};
