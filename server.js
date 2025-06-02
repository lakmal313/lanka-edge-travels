require('dotenv').config();

const TeamMember       = require('./models/TeamMember');
const express          = require('express');
const session          = require('express-session');
const flash            = require('connect-flash');
const compression      = require('compression');
const mongoose         = require('mongoose');
const path             = require('path');
const fs               = require('fs');
const methodOverride   = require('method-override');
const multer           = require('multer');
const expressLayouts   = require('express-ejs-layouts');
const { body, validationResult } = require('express-validator');

// ─── Models ──────────────────────────────────────────────────────────────────
const Booking     = require('./models/Booking');
const Contact     = require('./models/Contact');
const Destination = require('./models/Destination');
const Testimonial = require('./models/Testimonial');

// ─── Admin Router ───────────────────────────────────────────────────────────
const adminRouter = require('./routes/admin');

// ─── Env & MongoDB ───────────────────────────────────────────────────────────
const {
  MONGODB_URI,
  PORT = 3000,
  ADMIN_USER,
  ADMIN_PASS,
  SESSION_SECRET
} = process.env;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();

// ─── Multer for uploads ──────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb) =>
      cb(null, path.join(__dirname,'public/uploads')),
    filename: (req,file,cb) =>
      cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'-'))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req,file,cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null,true);
    else cb(new Error('Only JPEG, PNG or WebP files are allowed'));
  }
});

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.static(path.join(__dirname,'public')));
app.use(express.urlencoded({ extended:false }));
app.use(methodOverride('_method'));
app.use(session({ secret:SESSION_SECRET, resave:false, saveUninitialized:false }));
app.use(flash());
app.use((req,res,next) => {
  res.locals.isAdmin = Boolean(req.session.isAdmin);
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});

app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(expressLayouts);
app.set('layout','layouts/main');

// ─── Helper: pick a random hero image ────────────────────────────────────────
function pickHero(){
  let hero = '/images/hero/default.jpg';
  try {
    const files = fs
      .readdirSync(path.join(__dirname,'public/images/hero'))
      .filter(f=>/\.(jpe?g|png|webp)$/i.test(f))
      .map(f=>`/images/hero/${f}`);
    if(files.length) hero = files[Math.floor(Math.random()*files.length)];
  } catch {}
  return hero;
}

// ─── PUBLIC SITE ────────────────────────────────────────────────────────────

// Home
app.get('/', async (req,res) => {
  const destinations = await Destination.find();
  const testimonials = await Testimonial.find().sort({ createdAt:-1 });
  res.render('index',{ title:'Home', destinations, testimonials, hero:pickHero() });
});

// About
app.get('/about', async (req, res, next) => {
  try {
    const team = await TeamMember.find().sort({ order: 1 });
    res.render('about', { title:'About Us', hero:pickHero(), team });
  } catch(err) {
    next(err);
  }
});

// Details
app.get('/dest/:id', async (req,res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('details',{ title:destination.name, destination });
});

// Booking (public)
app.get('/dest/:id/book', async (req,res) => {
  const destination = await Destination.findById(req.params.id);
  res.render('book',{
    title:`Request Quote: ${destination.name}`,
    destination, hero:pickHero(),
    errors:[], data:{}
  });
});
app.post(
  '/dest/:id/book',
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Full Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('message').trim().escape()
  ],
  async (req,res,next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      const destination = await Destination.findById(req.params.id);
      return res.status(422).render('book',{
        title:`Request Quote: ${destination.name}`,
        destination, hero:pickHero(),
        errors:errors.array(), data:req.body
      });
    }
    try {
      await Booking.create({
        destinationId:req.params.id,
        name:        req.body.name,
        email:       req.body.email,
        phone:       req.body.phone,
        dateFrom:    req.body.dateFrom,
        dateTo:      req.body.dateTo,
        adults:      req.body.adults,
        children:    req.body.children,
        travelStyle: req.body.travelStyle,
        budget:      req.body.budget,
        interests:   Array.isArray(req.body.interests)
                     ? req.body.interests
                     : req.body.interests ? [req.body.interests] : [],
        message:     req.body.message,
        imgPath:     req.file ? `/uploads/${req.file.filename}` : null,
        status:      'pending'
      });
      res.redirect('/book-success');
    } catch(err){ next(err); }
  }
);
app.get('/book-success',(req,res) => {
  res.render('book-success',{ title:'Thank You!', hero:pickHero() });
});

// Contact / Quote form
app.get('/contact', async (req,res) => {
  let selectedDest = null;
  if(req.query.dest){
    try { selectedDest = await Destination.findById(req.query.dest) }
    catch{}
  }
  res.render('contact',{
    title:'Contact Us',
    hero:pickHero(),
    selectedDest,
    errors:[], data:{}
  });
});
app.post(
  '/contact',
  [
    // basic validators...
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('destination').optional().isMongoId(),
    body('dateFrom').if(body('destination').exists()).isISO8601().toDate(),
    body('dateTo').if(body('destination').exists())
      .isISO8601().withMessage('End date required').toDate()
      .custom((to,{req}) => {
        if(new Date(to) < new Date(req.body.dateFrom))
          throw new Error('End date must be after start date');
        return true;
      }),
    body('adults').if(body('destination').exists()).isInt({min:1}).toInt(),
    body('children').if(body('destination').exists()).isInt({min:0}).toInt(),
    body('travelStyle').if(body('destination').exists()).isIn(['Adventure','Relaxation','Cultural']),
    // new budgetOption / budgetCustom
    body('budgetOption').if(body('destination').exists()).notEmpty(),
    body('budgetCustom').if(body('budgetOption').equals('custom')).isFloat({min:0}),
    // interests & customInterest
    body('interests').if(body('destination').exists()).optional().custom(v=>Array.isArray(v)||typeof v==='string'),
    body('customInterest').trim().escape(),
    // mustSee & customMustSee
    body('mustSee').if(body('destination').exists()).optional().custom(v=>Array.isArray(v)||typeof v==='string'),
    body('customMustSee').trim().escape(),
    body('message').trim().notEmpty().withMessage('Message cannot be empty')
  ],
  async (req,res,next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(422).render('contact',{
        title:'Contact Us',
        hero:pickHero(),
        selectedDest: req.body.destination ? { _id:req.body.destination } : null,
        errors:errors.array(),
        data:req.body
      });
    }

    try {
      if(req.body.destination){
        // — user requested a quote —
        // 1) budget
        const budget = req.body.budgetOption === 'custom'
          ? parseFloat(req.body.budgetCustom)
          : req.body.budgetOption;

        // 2) interests
        let interests = Array.isArray(req.body.interests)
          ? req.body.interests
          : req.body.interests ? [req.body.interests] : [];
        if(req.body.customInterest){
          interests = interests.filter(i => i!=='Other');
          interests.push(req.body.customInterest);
        }

        // 3) must-see places
        let mustSee = Array.isArray(req.body.mustSee)
          ? req.body.mustSee
          : req.body.mustSee ? [req.body.mustSee] : [];
        if(req.body.customMustSee){
          mustSee = mustSee.filter(m => m!=='Other');
          mustSee.push(req.body.customMustSee);
        }

        await Booking.create({
          destinationId: req.body.destination,
          name:          req.body.name,
          email:         req.body.email,
          phone:         req.body.phone,
          dateFrom:      req.body.dateFrom,
          dateTo:        req.body.dateTo,
          adults:        req.body.adults,
          children:      req.body.children,
          travelStyle:   req.body.travelStyle,
          budget,        // <- new
          interests,     // <- new
          mustSee,       // <- new
          message:       req.body.message,
          imgPath:       null,
          status:        'pending'
        });

        req.flash('success','Your itinerary request has been sent!');
        return res.redirect('/contact-success');
      }

      // — plain contact message —
      await Contact.create({
        destination: null,
        name:        req.body.name,
        email:       req.body.email,
        phone:       req.body.phone,
        country:     req.body.country,
        dateFrom:    null,
        dateTo:      null,
        adults:      null,
        children:    null,
        travelStyle: null,
        budget:      null,
        interests:   null,
        message:     req.body.message
      });
      req.flash('success','Your message has been sent!');
      res.redirect('/contact-success');
    } catch(err){ next(err); }
  }
);
app.get('/contact-success',(req,res) => {
  res.render('contact-success',{ title:'Thank You!', hero:pickHero() });
});

// Tour operators
app.get('/tour-operators',(req,res)=>{
  res.render('tour-operators',{ title:'Our Tour Operators', hero:pickHero() });
});

// Public bookings list
app.get('/bookings', async (req,res)=>{
  const bookings = await Booking.find().populate('destinationId');
  res.render('bookings',{ title:'All Bookings', bookings });
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
// Serve admin login
app.get('/admin/login', (req,res) =>
  res.render('login',{ title:'Admin Login', error:null })
);
// Public login fallback
app.get('/login',(req,res)=>res.render('login',{ title:'Admin Login', error:null }));
app.post('/login',(req,res)=>{
  const { username,password } = req.body;
  if(username===ADMIN_USER && password===ADMIN_PASS){
    req.session.isAdmin = true;
    return res.redirect('/admin?tab=dest');
  }
  res.render('login',{ title:'Admin Login', error:'Invalid credentials' });
});
app.get('/logout',(req,res)=>{
  req.session.destroy(()=>res.redirect('/admin/login'));
});

// ─── PROTECT & MOUNT ADMIN ROUTES ────────────────────────────────────────────
app.use('/admin',(req,res,next)=>{
  if(req.session.isAdmin) return next();
  res.redirect('/admin/login');
});
app.use('/admin', adminRouter);

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err,req,res,next)=>{
  console.error(err.stack);
  res.status(500).render('error',{ message:err.message, title:'Error' });
});

// ─── Start server with port-in-use fallback ─────────────────────────────────
function startServer(port) {
  const server = app.listen(port, () =>
    console.log(`🚀 Server running at http://localhost:${port}`)
  );
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} in use, trying ${port + 1}...`);
      setTimeout(() => startServer(port + 1), 1000);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(parseInt(PORT, 10));
