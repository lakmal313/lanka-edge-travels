// server.js
require('dotenv').config();
const express           = require('express');
const session           = require('express-session');
const flash             = require('connect-flash');
const compression       = require('compression');
const mongoose          = require('mongoose');
const path              = require('path');
const fs                = require('fs');
const methodOverride    = require('method-override');
const multer            = require('multer');
const expressLayouts    = require('express-ejs-layouts');
const { body, validationResult } = require('express-validator');  // ← added

// ─── Models ─────────────────────────────────────────────────────────────────
const Booking     = require('./models/Booking');
const Contact     = require('./models/Contact');
const Destination = require('./models/Destination');
const Testimonial = require('./models/Testimonial');

// ─── Pull in your .env values ──────────────────────────────────────────────
const {
  MONGODB_URI,
  PORT = 3000,
  ADMIN_USER,
  ADMIN_PASS,
  SESSION_SECRET
} = process.env;

// ─── Connect to MongoDB ─────────────────────────────────────────────────────
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.isAdmin = Boolean(req.session.isAdmin);
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ─── Multer for uploads (hardened) ──────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) =>
      cb(null, path.join(__dirname, 'public/uploads')),
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },            // ← 5 MB max
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG or WebP files are allowed'));
    }
  }
});

// ─── Helper: pick random hero image ─────────────────────────────────────────
function pickHero() {
  let hero = '/images/hero/default.jpg';
  try {
    const files = fs
      .readdirSync(path.join(__dirname, 'public/images/hero'))
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .map(f => `/images/hero/${f}`);
    if (files.length) {
      hero = files[Math.floor(Math.random() * files.length)];
    }
  } catch (err) {
    console.error('Could not load hero images:', err);
  }
  return hero;
}

// ─── Public Routes ──────────────────────────────────────────────────────────
app.get('/', async (req, res) => {
  const destinations = await Destination.find();
  const testimonials = await Testimonial.find().sort({ createdAt: -1 });
  res.render('index', {
    title: 'Home',
    destinations,
    testimonials,
    hero: pickHero()
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us',
    hero: pickHero()
  });
});

app.get('/dest/:id', async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('details', { title: destination.name, destination });
});

// ─── Booking Routes (with server-side validation) ───────────────────────────
app.get('/dest/:id/book', async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('book', {
    title: `Request Quote: ${destination.name}`,
    destination,
    hero: pickHero(),
    errors: [],
    data: {}
  });
});

app.post(
  '/dest/:id/book',
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Full Name is required'),
    body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number'),
    body('adults').isInt({ min: 1 }).withMessage('At least 1 adult required').toInt(),
    body('children').isInt({ min: 0 }).withMessage('Children must be zero or more').toInt(),
    body('travelStyle').isIn(['Adventure','Relaxation','Cultural']).withMessage('Please select a travel style'),
    body('dateFrom').isISO8601().withMessage('Invalid start date').toDate(),
    body('dateTo')
      .isISO8601().withMessage('Invalid end date').toDate()
      .custom((to, { req }) => {
        if (new Date(to) < new Date(req.body.dateFrom)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('budget').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Budget must be a positive number').toFloat(),
    body('interests')
      .optional()
      .custom(val => Array.isArray(val) || typeof val === 'string')
      .withMessage('Interests format is invalid'),
    body('message').trim().escape()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const destination = await Destination.findById(req.params.id);
      return res.status(422).render('book', {
        title: `Request Quote: ${destination.name}`,
        destination,
        hero: pickHero(),
        errors: errors.array(),
        data: req.body
      });
    }

    try {
      await Booking.create({
        destinationId: req.params.id,
        name:          req.body.name,
        email:         req.body.email,
        phone:         req.body.phone,
        dateFrom:      req.body.dateFrom,
        dateTo:        req.body.dateTo,
        adults:        req.body.adults,
        children:      req.body.children,
        travelStyle:   req.body.travelStyle,
        budget:        req.body.budget,
        interests:     Array.isArray(req.body.interests)
                         ? req.body.interests
                         : req.body.interests
                           ? [req.body.interests]
                           : [],
        message:       req.body.message,
        imgPath:       req.file ? `/uploads/${req.file.filename}` : null
      });
      res.redirect('/book-success');
    } catch (err) {
      next(err);
    }
  }
);

app.get('/book-success', (req, res) => {
  res.render('book-success', {
    title: 'Thank You!',
    hero: pickHero()
  });
});

// ─── Contact Routes (now with validation) ───────────────────────────────────
app.get('/contact', async (req, res) => {
  let selectedDest = null;
  if (req.query.dest) {
    try {
      selectedDest = await Destination.findById(req.query.dest);
    } catch {
      console.warn('Invalid dest query param:', req.query.dest);
    }
  }
  res.render('contact', {
    title: 'Contact Us',
    hero: pickHero(),
    selectedDest,
    errors: [],
    data: {}
  });
});

app.post(
  '/contact',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('message').trim().notEmpty().withMessage('Message cannot be empty')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('contact', {
        title: 'Contact Us',
        hero: pickHero(),
        errors: errors.array(),
        data: req.body
      });
    }

    try {
      await Contact.create({
        name:    req.body.name,
        email:   req.body.email,
        message: req.body.message,
        dest:    req.body.dest || null
      });
      res.redirect('/contact-success');
    } catch (err) {
      next(err);
    }
  }
);

app.get('/contact-success', (req, res) => {
  res.render('contact-success', {
    title: 'Thank You!',
    hero: pickHero()
  });
});

app.get('/tour-operators', (req, res) => {
  res.render('tour-operators', {
    title: 'Our Tour Operators',
    hero: pickHero()
  });
});

// ─── All Bookings (populate fixed) ─────────────────────────────────────────
app.get('/bookings', async (req, res) => {
  const bookings = await Booking.find().populate('destinationId');
  res.render('bookings', { title: 'All Bookings', bookings });
});

// ─── Admin Auth Routes & Protection ─────────────────────────────────────────
app.get('/login', (req, res) => {
  res.render('login', { title: 'Admin Login', error: null });
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.redirect('/admin?tab=dest');
  }
  res.render('login', { title: 'Admin Login', error: 'Invalid credentials' });
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.use('/admin', (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect('/login');
});

// ─── Admin Panel ──────────────────────────────────────────────────────────────
app.get('/admin', async (req, res) => {
  const [ destinations, bookings, contacts, testimonials ] = await Promise.all([
    Destination.find(),
    Booking.find().populate('destinationId'),
    Contact.find().populate('destination'),
    Testimonial.find().sort({ createdAt: -1 })
  ]);

  const editItem   = req.query.edit     ? await Destination.findById(req.query.edit)    : null;
  const editTest   = req.query.editTest ? await Testimonial.findById(req.query.editTest) : null;
  const initialTab = req.query.tab || (req.query.editTest ? 'testi' : 'dest');

  res.render('admin', {
    title:         'Admin Panel',
    destinations,
    bookings,
    contacts,
    testimonials,
    editItem,
    editTest,
    initialTab
  });
});

// ─── Destination CRUD w/ Itinerary ─────────────────────────────────────────
app.post('/admin/dest', upload.single('image'), async (req, res) => {
  const days    = req.body.itineraryDayNumber || [];
  const titles  = req.body.itineraryTitle     || [];
  const details = req.body.itineraryDetails   || [];

  const itinerary = days.map((d, i) => ({
    day:     parseInt(d, 10) || i + 1,
    title:   titles[i]   || '',
    details: details[i]  || ''
  }));

  await Destination.create({
    name:     req.body.name,
    price:    parseFloat(req.body.price),
    desc:     req.body.desc,
    imgPath:  '/uploads/' + req.file.filename,
    itinerary
  });
  req.flash('success', 'Destination added');
  res.redirect('/admin?tab=dest');
});

app.put('/admin/dest/:id', upload.single('image'), async (req, res) => {
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
    title:   titles[i]   || '',
    details: details[i]  || ''
  }));

  await Destination.findByIdAndUpdate(req.params.id, updates);
  req.flash('success', 'Destination updated');
  res.redirect('/admin?tab=dest');
});

app.delete('/admin/dest/:id', async (req, res) => {
  await Destination.findByIdAndDelete(req.params.id);
  req.flash('success', 'Destination deleted');
  res.redirect('/admin?tab=dest');
});

// ─── Contact delete ─────────────────────────────────────────────────────────
app.delete('/admin/contact/:id', async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  req.flash('success', 'Contact request deleted');
  res.redirect('/admin?tab=contact');
});

// ─── Testimonials CRUD ───────────────────────────────────────────────────────
app.post('/admin/testimonial', upload.single('image'), async (req, res) => {
  await Testimonial.create({
    name: req.body.name,
    text: req.body.text,
    img:  '/uploads/' + req.file.filename
  });
  req.flash('success', 'Testimonial added');
  res.redirect('/admin?tab=testi');
});

app.put('/admin/testimonial/:id', upload.single('image'), async (req, res) => {
  const updates = { name: req.body.name, text: req.body.text };
  if (req.file) updates.img = '/uploads/' + req.file.filename;
  await Testimonial.findByIdAndUpdate(req.params.id, updates);
  req.flash('success', 'Testimonial updated');
  res.redirect('/admin?tab=testi');
});

app.delete('/admin/testimonial/:id', async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  req.flash('success', 'Testimonial deleted');
  res.redirect('/admin?tab=testi');
});

// ─── View single contact request ─────────────────────────────────────────────
app.get('/admin/contact/:id/view', async (req, res) => {
  const contact = await Contact
    .findById(req.params.id)
    .populate('destination');
  res.render('contact-details', {
    title:   'Request Details',
    contact
  });
});

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: err.message });
});

// ─── Start the server ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
