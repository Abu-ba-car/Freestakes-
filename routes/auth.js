// === routes/auth.js ===
// Handles user registration and login.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// ── POST /api/auth/register ──
// Body: { firstName, lastName, email, phone, password, withdrawPin, referralCode? }
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, withdrawPin, referralCode } = req.body;
    if (!firstName || !lastName || !email || !phone || !password || !withdrawPin) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    // Check if email or phone already exists
    const existing = await User.findOne({ $or: [ { email }, { phone } ] });
    if (existing) {
      return res.status(400).json({ msg: 'Email or phone already registered' });
    }

    // Hash password
    const hashedPwd = await bcrypt.hash(password, 10);

    // Create user document
    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPwd,
      referralCode: null,    // auto-generated
      referredBy: referralCode || null,
      balance: 0,
      hasBet: false,
      isBlocked: false,
      isVerified: false
    });

    await newUser.save();

    // If referralCode provided, credit ₦100 to the referrer
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referrer.balance += 100;
        await referrer.save();
      }
    }

    return res.json({ msg: 'Registered successfully. Please log in.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Registration failed' });
  }
});

// ── POST /api/auth/login ──
// Body: { email, password }
// Returns: { token, user: { id, firstName, lastName, email, phone, balance, hasBet, isBlocked, referralCode, role } }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.isBlocked) return res.status(403).json({ msg: 'Account is blocked' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Wrong password' });

    // Sign JWT token (payload includes user ID and role)
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

    return res.json({
      token,
      user: {
        id:          user._id,
        firstName:   user.firstName,
        lastName:    user.lastName,
        email:       user.email,
        phone:       user.phone,
        balance:     user.balance,
        hasBet:      user.hasBet,
        isBlocked:   user.isBlocked,
        referralCode:user.referralCode,
        role:        user.role
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Login failed' });
  }
});

module.exports = router;
