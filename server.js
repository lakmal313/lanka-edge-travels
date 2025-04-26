// server.js
require('dotenv').config();
const express        = require('express');
const mongoose       = require('mongoose');
const path           = require('path');
const methodOverride = require('method-override');
const multer         = require('multer');
const expressLayouts = require('express-ejs-layouts');

// Models
const Booking     = require('./models/Booking');
const Contact     = require('./models/Contact');
const Destination = require('./models/Destination');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MongoDB Connection ─────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ─── Multer (for image uploads) ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename:    (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// ─── Public Routes ──────────────────────────────────────────────────────────

// Home – list all destinations & testimonials
app.get('/', async (req, res) => {
  const destinations = await Destination.find();

  // Static testimonials array
  const testimonials = [
    { name:'Alice', img:'https://randomuser.me/api/portraits/women/68.jpg', text:'Fantastic Sigiriya tour!' },
    { name:'Bob',   img:'https://randomuser.me/api/portraits/men/75.jpg',   text:'Ella hike was breathtaking.' },
    { name:'Carol', img:'https://randomuser.me/api/portraits/women/65.jpg', text:'Elephants up close at Yala.' },
    { name:'David', img:'https://randomuser.me/api/portraits/men/82.jpg',   text:'Exceptional service & views!' }
  ];

  res.render('index', {
    title: 'Home',
    destinations,
    testimonials
  });
});

// Destination detail
app.get('/dest/:id', async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('details', { title: destination.name, destination });
});

// Booking form & submit
app.get('/dest/:id/book', async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('book', { title: `Book: ${destination.name}`, destination });
});
app.post('/dest/:id/book', async (req, res) => {
  await Booking.create({
    destination: req.params.id,
    name:        req.body.name,
    email:       req.body.email,
    phone:       req.body.phone,
    dateFrom:    req.body.dateFrom,
    dateTo:      req.body.dateTo
  });
  res.redirect('/book-success');
});
app.get('/book-success', (req, res) => {
  res.render('book-success', { title: 'Thank You!' });
});

// Contact form & submit
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us' });
});
app.post('/contact', async (req, res) => {
  await Contact.create(req.body);
  res.redirect('/contact-success');
});
app.get('/contact-success', (req, res) => {
  res.render('contact-success', { title: 'Thank You!' });
});

// Optional: public view of bookings
app.get('/bookings', async (req, res) => {
  const bookings = await Booking.find().populate('destination');
  res.render('bookings', { title: 'All Bookings', bookings });
});

// ─── Admin Panel ────────────────────────────────────────────────────────────
app.get('/admin', async (req, res) => {
  const [ destinations, bookings, contacts ] = await Promise.all([
    Destination.find(),
    Booking.find().populate('destination'),
    Contact.find()
  ]);

  let editItem = null;
  if (req.query.edit) {
    editItem = await Destination.findById(req.query.edit);
  }

  res.render('admin', {
    title:        'Admin Panel',
    destinations,
    bookings,
    contacts,
    editItem
  });
});

app.post('/admin/dest', upload.single('image'), async (req, res) => {
  await Destination.create({
    name:    req.body.name,
    price:   parseFloat(req.body.price),
    desc:    req.body.desc,
    imgPath: '/uploads/' + req.file.filename
  });
  res.redirect('/admin');
});
app.put('/admin/dest/:id', upload.single('image'), async (req, res) => {
  const updates = {
    name:  req.body.name,
    price: parseFloat(req.body.price),
    desc:  req.body.desc
  };
  if (req.file) updates.imgPath = '/uploads/' + req.file.filename;
  await Destination.findByIdAndUpdate(req.params.id, updates);
  res.redirect('/admin');
});
app.delete('/admin/dest/:id', async (req, res) => {
  await Destination.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Confirm & delete bookings
app.put('/admin/booking/:id/confirm', async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  booking.status = 'Confirmed';
  await booking.save();
  res.redirect('/admin');
});
app.delete('/admin/booking/:id', async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
