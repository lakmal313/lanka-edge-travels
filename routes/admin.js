// routes/admin.js

const express           = require('express');
const path              = require('path');
const multer            = require('multer');
const { body, validationResult } = require('express-validator');

const Booking           = require('../models/Booking');
const Contact           = require('../models/Contact');
const Destination       = require('../models/Destination');
const Testimonial       = require('../models/Testimonial');
const TeamMember        = require('../models/TeamMember');

// ─── Admin credentials from env ─────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

// ─── Multer setup ───────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) =>
      cb(null, path.join(__dirname, '../public/uploads')),
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB max
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG or WebP files are allowed'));
  }
});

const router = express.Router();

// ─── Auth & Session ─────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  res.render('login', { title: 'Admin Login', error: null });
});
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    req.flash('success', 'Logged in successfully');
    return res.redirect('/admin?tab=dest');
  }
  res.render('login', { title: 'Admin Login', error: 'Invalid credentials' });
});
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    req.flash('success', 'Logged out');
    res.redirect('/admin/login');
  });
});

// ─── Protect all /admin routes ───────────────────────────────────────────────
router.use((req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect('/admin/login');
});

// ─── Dashboard ──────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [
      destinations,
      bookings,
      contacts,
      testimonials,
      team
    ] = await Promise.all([
      Destination.find(),
      Booking.find().populate('destinationId'),
      Contact.find({ destination: null }),
      Testimonial.find().sort({ createdAt: -1 }),
      TeamMember.find().sort({ order: 1 })
    ]);

    const editItem   = req.query.edit     ? await Destination.findById(req.query.edit)    : null;
    const editTest   = req.query.editTest ? await Testimonial.findById(req.query.editTest) : null;
    const editTeam   = req.query.editTeam ? await TeamMember.findById(req.query.editTeam) : null;
    const initialTab = req.query.tab ||
                       (req.query.editTest ? 'testi'
                        : req.query.editTeam ? 'team'
                        : 'dest');

    res.render('admin', {
      title:         'Admin Panel',
      destinations,
      bookings,
      contacts,
      testimonials,
      team,
      editItem,
      editTest,
      editTeam,
      initialTab
    });
  } catch (err) {
    next(err);
  }
});

// ─── Destination CRUD ───────────────────────────────────────────────────────
router.post('/dest', upload.single('image'), async (req, res, next) => {
  try {
    const days    = req.body.itineraryDayNumber || [];
    const titles  = req.body.itineraryTitle     || [];
    const details = req.body.itineraryDetails   || [];
    const itinerary = days.map((d, i) => ({
      day:     parseInt(d, 10) || i + 1,
      title:   titles[i] || '',
      details: details[i] || ''
    }));

    await Destination.create({
      name:    req.body.name,
      price:   parseFloat(req.body.price),
      desc:    req.body.desc,
      imgPath: '/uploads/' + req.file.filename,
      itinerary
    });

    req.flash('success', 'Destination created');
    res.redirect('/admin?tab=dest');
  } catch (err) {
    next(err);
  }
});

router.put('/dest/:id', upload.single('image'), async (req, res, next) => {
  try {
    const updates = {
      name:  req.body.name,
      price: parseFloat(req.body.price),
      desc:  req.body.desc
    };
    if (req.file) updates.imgPath = '/uploads/' + req.file.filename;

    const days    = req.body.itineraryDayNumber || [];
    const titles  = req.body.itineraryTitle     || [];
    const details = req.body.itineraryDetails   || [];
    updates.itinerary = days.map((d, i) => ({
      day:     parseInt(d, 10) || i + 1,
      title:   titles[i] || '',
      details: details[i] || ''
    }));

    await Destination.findByIdAndUpdate(req.params.id, updates);
    req.flash('success', 'Destination updated');
    res.redirect('/admin?tab=dest');
  } catch (err) {
    next(err);
  }
});

router.delete('/dest/:id', async (req, res, next) => {
  try {
    await Destination.findByIdAndDelete(req.params.id);
    req.flash('success', 'Destination deleted');
    res.redirect('/admin?tab=dest');
  } catch (err) {
    next(err);
  }
});

// fallback for method-override missing
router.post('/dest/:id', async (req, res, next) => {
  if (req.body._method === 'DELETE') {
    try {
      await Destination.findByIdAndDelete(req.params.id);
      req.flash('success', 'Destination deleted');
      return res.redirect('/admin?tab=dest');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ─── Bookings CRUD ──────────────────────────────────────────────────────────
router.post('/booking/:id/confirm', async (req, res) => {
  // your confirm logic...
  req.flash('success', 'Booking confirmed');
  res.redirect('/admin?tab=book');
});

router.post('/booking/:id/notify', async (req, res) => {
  // your notify logic...
  req.flash('success', 'Notification sent');
  res.redirect('/admin?tab=book');
});

router.delete('/booking/:id', async (req, res, next) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    req.flash('success', 'Booking deleted');
    res.redirect('/admin?tab=book');
  } catch (err) {
    next(err);
  }
});

// fallback for booking delete
router.post('/booking/:id', async (req, res, next) => {
  if (req.body._method === 'DELETE') {
    try {
      await Booking.findByIdAndDelete(req.params.id);
      req.flash('success', 'Booking deleted');
      return res.redirect('/admin?tab=book');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ─── Contacts CRUD ──────────────────────────────────────────────────────────
router.delete('/contact/:id', async (req, res, next) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    req.flash('success', 'Contact deleted');
    res.redirect('/admin?tab=contact');
  } catch (err) {
    next(err);
  }
});

// fallback for contact delete
router.post('/contact/:id', async (req, res, next) => {
  if (req.body._method === 'DELETE') {
    try {
      await Contact.findByIdAndDelete(req.params.id);
      req.flash('success', 'Contact deleted');
      return res.redirect('/admin?tab=contact');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ─── Testimonials CRUD ──────────────────────────────────────────────────────
router.post('/testimonial', upload.single('image'), async (req, res, next) => {
  try {
    await Testimonial.create({
      name: req.body.name,
      text: req.body.text,
      img:  '/uploads/' + req.file.filename
    });
    req.flash('success', 'Testimonial added');
    res.redirect('/admin?tab=testi');
  } catch (err) {
    next(err);
  }
});

router.put('/testimonial/:id', upload.single('image'), async (req, res, next) => {
  try {
    const updates = { name: req.body.name, text: req.body.text };
    if (req.file) updates.img = '/uploads/' + req.file.filename;
    await Testimonial.findByIdAndUpdate(req.params.id, updates);
    req.flash('success', 'Testimonial updated');
    res.redirect('/admin?tab=testi');
  } catch (err) {
    next(err);
  }
});

router.delete('/testimonial/:id', async (req, res, next) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    req.flash('success', 'Testimonial deleted');
    res.redirect('/admin?tab=testi');
  } catch (err) {
    next(err);
  }
});

// fallback for testimonial delete
router.post('/testimonial/:id', async (req, res, next) => {
  if (req.body._method === 'DELETE') {
    try {
      await Testimonial.findByIdAndDelete(req.params.id);
      req.flash('success', 'Testimonial deleted');
      return res.redirect('/admin?tab=testi');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ─── Team Members CRUD ──────────────────────────────────────────────────────
// Create
router.post('/team', upload.single('image'), async (req, res, next) => {
  try {
    await TeamMember.create({
      name:    req.body.name,
      title:   req.body.title,
      bio:     req.body.bio,
      imgPath: req.file ? '/uploads/' + req.file.filename : null,
      order:   parseInt(req.body.order, 10) || 0
    });
    req.flash('success', 'Team member added');
    res.redirect('/admin?tab=team');
  } catch (err) {
    next(err);
  }
});

// Update
router.put('/team/:id', upload.single('image'), async (req, res, next) => {
  try {
    const updates = {
      name:  req.body.name,
      title: req.body.title,
      bio:   req.body.bio,
      order: parseInt(req.body.order, 10) || 0
    };
    if (req.file) updates.imgPath = '/uploads/' + req.file.filename;
    await TeamMember.findByIdAndUpdate(req.params.id, updates);
    req.flash('success', 'Team member updated');
    res.redirect('/admin?tab=team');
  } catch (err) {
    next(err);
  }
});

// Delete
router.delete('/team/:id', async (req, res, next) => {
  try {
    await TeamMember.findByIdAndDelete(req.params.id);
    req.flash('success', 'Team member deleted');
    res.redirect('/admin?tab=team');
  } catch (err) {
    next(err);
  }
});

// fallback for team delete
router.post('/team/:id', async (req, res, next) => {
  if (req.body._method === 'DELETE') {
    try {
      await TeamMember.findByIdAndDelete(req.params.id);
      req.flash('success', 'Team member deleted');
      return res.redirect('/admin?tab=team');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ─── View single contact request ─────────────────────────────────────────────
router.get('/contact/:id/view', async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    res.render('contact-details', { title: 'Request Details', contact });
  } catch (err) {
    next(err);
  }
});

// ─── View single booking request ────────────────────────────────────────────
router.get('/booking/:id/view', async (req, res, next) => {
  try {
    const booking = await Booking
      .findById(req.params.id)
      .populate('destinationId');
    res.render('booking-details', {
      title:   'Booking Details',
      booking
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
