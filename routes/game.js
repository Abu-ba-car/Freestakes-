// === routes/game.js ===
// Handles deposits and betting logic.

const express = require('express');
const router = express.Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// Middleware: authenticate normal user (role === 'user')
function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'user') {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ msg: 'Invalid token' });
  }
}

// ── POST /api/game/deposit ──
// Body: { amount } (≥ 5100)
router.post('/deposit', authUser, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 5100) {
      return res.status(400).json({ msg: 'Minimum deposit is ₦5,100' });
    }
    const user = await User.findById(req.userId);
    user.balance += amount;
    await user.save();
    return res.json({ newBalance: user.balance, msg: 'Deposit successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Deposit failed' });
  }
});

// ── POST /api/game/play ──
// Body: { amount } (≥ 5000; first bet pays 1000×)
router.post('/play', authUser, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 5000) {
      return res.status(400).json({ msg: 'Minimum bet is ₦5,000' });
    }
    const user = await User.findById(req.userId);
    if (user.isBlocked) {
      return res.status(403).json({ msg: 'Account is blocked' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    let winnings = 0;
    // If first bet, pay out amount × 1000
    if (!user.hasBet) {
      winnings = amount * 1000; // e.g., ₦5,000 → ₦5,000,000
      user.hasBet = true;
    } else {
      // After first bet, no further win (0% chance)
      winnings = 0;
    }

    user.balance = user.balance - amount + winnings;
    await user.save();
    return res.json({ newBalance: user.balance, winnings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Game play failed' });
  }
});

module.exports = router;
