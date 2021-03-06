var express = require('express'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    logger = require('morgan'),
    methodOverride = require('method-override'),
    layout = require('express-layout'),
    passport = require('passport'),
    util = require('util'),
    jwt = require('jsonwebtoken')
    FamilySearchStrategy = require('../../lib/passport-familysearch/index').OpenIDConnectStrategy;

var FAMILYSEARCH_DEVELOPER_KEY = "dev_key_goes_here";


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete FamilySearch profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the FamilySearchStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and FamilySearch profile), and
//   invoke a callback with a user object.
passport.use('familysearch', new FamilySearchStrategy({
    authorizationURL: 'https://sandbox.familysearch.org/cis-web/oauth2/v3/authorization',
    tokenURL: 'https://sandbox.familysearch.org/cis-web/oauth2/v3/token',
    clientID: FAMILYSEARCH_DEVELOPER_KEY,
    callbackURL: "http://localhost:3000/auth/familysearch/callback",
    skipUserProfile: true,
    scope: 'profile'
  },
  function(iss, sub, profile, idToken, accessToken, refreshToken, params,  done) {
    var user = {
      accessToken: params.access_token,
      idToken: params.id_token,
      parsedAccessToken: jwt.decode(accessToken),
      parsedIdToken: jwt.decode(params.id_token)
    };

    return done(null, user);
  }
));




var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(layout());
app.set('layout', 'layout');
app.use(logger());
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));



app.get('/', function(req, res){
  console.log(req.user);
  res.render('index', { user: req.user, layout: 'layout' });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/familysearch
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in FamilySearch authentication will involve redirecting
//   the user to familysearch.org.  After authorization, FamilySearch will redirect the user
//   back to this application at /auth/familysearch/callback
app.get('/auth/familysearch',
  passport.authenticate('familysearch'),
  function(req, res){
    // The request will be redirected to FamilySearch for authentication, so this
    // function will not be called.
  });

// GET /auth/familysearch/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/familysearch/callback',
  passport.authenticate('familysearch', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
