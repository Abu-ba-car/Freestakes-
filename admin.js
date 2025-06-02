// === routes/admin.js ===
// Admin routes to manage users and withdrawals.

const express = require('express');
const router = express.Router();
const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const Withdrawal  = require('../models/Withdrawal');

// Middleware: authenticate and authorize admin (role === 'admin')
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    req.adminId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ msg: 'Invalid token' });
  }
}

// ── GET /api/admin/users ──
// List all users (no passwords)
router.get('/users', authAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot fetch users' });
  }
});

// ── POST /api/admin/block ──
// Body: { userId }
router.post('/block', authAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { isBlocked: true });
    return res.json({ msg: 'User blocked' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Block failed' });
  }
});

// ── POST /api/admin/unblock ──
// Body: { userId }
router.post('/unblock', authAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { isBlocked: false });
    return res.json({ msg: 'User unblocked' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Unblock failed' });
  }
});

// ── GET /api/admin/withdrawals ──
// List all withdrawal requests (with user info)
router.get('/withdrawals', authAdmin, async (req, res) => {
  try {
    const allRequests = await Withdrawal
      .find()
      .populate('userId', 'firstName lastName email phone')
      .sort('-createdAt');
    return res.json(allRequests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot fetch withdrawals' });
  }
});

// ── POST /api/admin/withdrawals/approve ──
// Body: { requestId }
router.post('/withdrawals/approve', authAdmin, async (req, res) => {
  try {
    const { requestId } = req.body;
    const w = await Withdrawal.findById(requestId);
    if (!w || w.status !== 'pending') {
      return res.status(400).json({ msg: 'Invalid request' });
    }
    w.status = 'approved';
    await w.save();
    return res.json({ msg: 'Withdrawal approved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Approval failed' });
  }
});

// ── POST /api/admin/withdrawals/reject ──
// Body: { requestId }
router.post('/withdrawals/reject', authAdmin, async (req, res) => {
  try {
    const { requestId } = req.body;
    const w = await Withdrawal.findById(requestId);
    if (!w || w.status !== 'pending') {
      return res.status(400).json({ msg: 'Invalid request' });
    }
    // Refund the user
    const user = await User.findById(w.userId);
    user.balance += w.amount;
    await user.save();

    w.status = 'rejected';
    await w.save();
    return res.json({ msg: 'Withdrawal rejected and amount refunded' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Rejection failed' });
  }
});

module.exports = router;
