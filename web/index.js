var express = require("express");
var app = express();
var session = require('express-session')

var ObjectID = require('mongodb').ObjectID;
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
var User = require('./schemas/user');
var Feeder = require('./schemas/feeder');

var exphbs  = require('express-handlebars');
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(bodyParser.urlencoded({extended:true}));
// register models
function ensureLoggedIn() {
    return function(req, res, next) {
        if (!req.user || !req.user.id) {
            return res.redirect('/login');
        }
        next();
    };
}
mongoose.connect("mongodb://db/feeders").then((db) => {
    console.log("Connected to DB");
    passport.use(User.createStrategy());
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
    app.use(session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
    app.get('/login', function(req, res) {
        if (req.user) {
            res.redirect("/dashboard");
        } else {
            res.render('login');
        }
    });
    app.get("/register", function(req, res) {
        res.render("register");
    });
    app.post('/register', function(req, res) {
        User.register(new User({
            username: req.body.username,
            email: req.body.email
        }), req.body.password, function(err) {
            if (err) {
                return res.render("register");
            } else {
                return res.redirect("/dashboard");
            }
        });
    });
    app.post('/login', passport.authenticate('local'), function(req, res) {
        res.redirect('/home');
    });
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });
    app.get("/dashboard", function(req, res) {
        Feeder.find().then((feeders) => {
            res.render("dashboard", {feeders:feeders});
        });
    });
    app.get("/feeders/:id", (req, res) => {
        Feeder.findById(req.params.id).lean().then((feeder) => {
            console.log(feeder);
            res.render("feeder", feeder);
        })
    })
    // /settings/:id
    app.listen(9999)
});