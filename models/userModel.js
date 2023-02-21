const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add a email'],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please enter a valid email',
      ],
    },
    role: {
      type: String,
      default: 'user',
    },
    bio: {
      type: String,
      default: 'Bio',
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minLength: [6, 'Password must be up to 6 characters'],
    },
    avataar: {
      public_id: {
        type: String,
        required: true,
        default: 'sample avataar',
      },
      url: {
        type: String,
        required: true,
        default:
          'https://res.cloudinary.com/dukdn1bpp/image/upload/v1670577687/avatars/ytffuvbukg5j3nrp5uhc.png',
      },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Generating Password ResetToken
userSchema.methods.getResetPasswordToken = function () {
  // Generating Token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hashing and adding resetPasswordToken to userSchemma
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; //15 mins

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
