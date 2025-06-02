// routes/public.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs   = require('fs');
const multer = require('multer');

// Models
const Destination = require('../models/Destination');
const Booking     = require('../models/Booking');
const Contact     = require('../models/Contact');
const Testimonial = require('../models/Testimonial');

// Helper: pick random hero image
function pickHero() {
  let hero = '/images/hero/default.jpg';
  try {
    const files = fs
      .readdirSync(path.join(__dirname, '../public/images/hero'))
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .map(f => `/images/hero/${f}`);
    if (files.length) hero = files[Math.floor(Math.random() * files.length)];
  } catch {}
  return hero;
}

// Multer setup (same as in server.js)
const upload = multer({ /* … copy your config from server.js … */ });

const router = express.Router();

// ─── Public Pages ─────────────────────────
router.get('/', async (req, res) => {
  const destinations  = await Destination.find();
  const testimonials  = await Testimonial.find().sort({ createdAt: -1 });
  res.render('index', { title:'Home', destinations, testimonials, hero: pickHero() });
});

router.get('/about', (req, res) => {
  res.render('about', { title:'About Us', hero: pickHero() });
});

router.get('/tour-operators', (req, res) => {
  res.render('tour-operators', { title:'Our Tour Operators', hero: pickHero() });
});

// ─── Destination Details & Booking ────────
router.get('/dest/:id', async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('details', { title: destination.name, destination });
});

router.get('/dest/:id/book', async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('book', { title:`Request Quote: ${destination.name}`, destination, hero:pickHero(), errors:[], data:{} });
});

router.post(
  '/dest/:id/book',
  upload.single('image'),
  [ /* copy your express-validator rules */ ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const destination = await Destination.findById(req.params.id);
      return res.status(422).render('book', {
        title:`Request Quote: ${destination.name}`,
        destination, hero:pickHero(),
        errors: errors.array(), data: req.body
      });
    }
    try {
      await Booking.create({ /* … map fields … */ });
      res.redirect('/book-success');
    } catch (err) { next(err); }
  }
);

router.get('/book-success', (req, res) => {
  res.render('book-success', { title:'Thank You!', hero:pickHero() });
});

// ─── Contact ──────────────────────────────
router.get('/contact', async (req, res) => {
  let selectedDest = null;
  if (req.query.dest) {
    try { selectedDest = await Destination.findById(req.query.dest); } catch {}
  }
  res.render('contact', { title:'Contact Us', hero:pickHero(), selectedDest, errors:[], data:{} });
});

router.post(
  '/contact',
  [ /* your validation rules */ ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('contact', {
        title:'Contact Us', hero:pickHero(),
        errors: errors.array(), data: req.body
      });
    }
    try {
      await Contact.create({ /* … */ });
      res.redirect('/contact-success');
    } catch (err) { next(err); }
  }
);

router.get('/contact-success', (req, res) => {
  res.render('contact-success', { title:'Thank You!', hero:pickHero() });
});

// ─── View all bookings (for public if you need) ──
router.get('/bookings', async (req, res) => {
  const bookings = await Booking.find().populate('destinationId');
  res.render('bookings', { title:'All Bookings', bookings });
});

module.exports = router;
