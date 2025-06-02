// === routes/withdraw.js ===
// Handles user withdrawal requests (pending admin approval).

const express = require('express');
const router = express.Router();
const jwt    = require('jsonwebtoken');
const Withdrawal = require('../models/Withdrawal');
const User       = require('../models/User');

// Middleware: authenticate normal user
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

// ── POST /api/withdraw/request ──
// Body: { amount }
router.post('/request', authUser, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid amount' });
    }
    const user = await User.findById(req.userId);
    if (!user || user.isBlocked) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    // Deduct immediately, hold until approved or rejected
    user.balance -= amount;
    await user.save();

    const w = new Withdrawal({
      userId: req.userId,
      amount
    });
    await w.save();

    return res.json({ msg: 'Withdrawal request submitted', requestId: w._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Withdrawal request failed' });
  }
});

// ── GET /api/withdraw/history ──
// Returns all withdrawal requests by this user
router.get('/history', authUser, async (req, res) => {
  try {
    const requests = await Withdrawal
      .find({ userId: req.userId })
      .sort('-createdAt');
    return res.json(requests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot fetch history' });
  }
});

module.exports = router;
