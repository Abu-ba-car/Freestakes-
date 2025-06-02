// === models/User.js ===
// Mongoose schema for users.

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  phone:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy:   { type: String, default: null },
  balance:      { type: Number, default: 0 },
  hasBet:       { type: Boolean, default: false }, // tracks if user used first-bet bonus
  isBlocked:    { type: Boolean, default: false },
  isVerified:   { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

// Pre-save: generate a referral code if not present
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
