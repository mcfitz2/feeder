var express = require("express");
var app = express();
var session = require('express-session')
var ObjectID = require('mongodb').ObjectID;
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
var exphbs = require('express-handlebars');
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
var utils = require("./utils")
var zpad = require('zpad');
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('static'))
// register models
function ensureLoggedIn() {
    return function(req, res, next) {
        console.log("LOGGED IN", req.user);
        if (!req.user || !req.user.id) {
            return res.redirect('/login');
        }
        next();
    };
}

function ensureAdmin() {
    return function(req, res, next) {
        //console.log(req.user);
        if (!req.user || !req.user.id) {
            return res.redirect('/login');
        }
        if (!req.user.email == "mcfitz2@gmail.com") {
            return res.end("You need to be admin");
        }
        next();
    };
}
passport.use(new LocalStrategy(function(username, password, done) {
    request.post({
        url: "http://api-service:8888/users/authenticate",
        body: {
            username: username,
            password: password
        },
        json: true
    }, function(err, res, body) {
        if (err) {
            console.log("ERROR", err);
            return done(err, false);
        } else {
            console.log("BODY", body)
            return done(null, body);
        }
    })
}));
var MongoDBStore = require('connect-mongodb-session')(session);
var store = new MongoDBStore({
    uri: 'mongodb://db:27017/feeders',
    collection: 'sessions'
});
// Catch errors 
store.on('error', function(error) {
    assert.ifError(error);
    assert.ok(false);
});
app.use(require('express-session')({
    secret: 'This is a secret',
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week 
    },
    store: store,
    // Boilerplate options, see: 
    // * https://www.npmjs.com/package/express-session#resave 
    // * https://www.npmjs.com/package/express-session#saveuninitialized 
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
// used to serialize the user for the session
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});
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
    res.redirect('/dashboard');
});
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
});
app.get("/dashboard", ensureLoggedIn(), function(req, res) {
    console.log("LOGGED IN", req.user);
    request.get({
        url: "http://api-service:8888/users/" + req.user.id + "/feeders",
        json: true
    }, function(err, r, body) {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        console.dir(body);
        res.render("dashboard", {
            feeders: body
        });
    });
});
app.post("/feeders/:id/feed", ensureLoggedIn(), (req, res) => {
    request.post({
        url: "http://api-service:8888/feeders/" + req.params.id + "/feed",
        json: true,
        body: {
            cups: 1
        }
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        res.redirect("/dashboard");
    });
});
app.get("/feeders/:id/settings", ensureLoggedIn(), (req, res) => {
    request.get({
        url: "http://api-service:8888/feeders/" + req.params.id,
        json: true,
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        body.schedules = body.schedules.map((schedule) => {
            let hour = schedule.hour;
            let meridan = null;
            if (hour > 12) {
                hour = hour - 12;
                meridian = "PM";
            } else {
                meridian = "AM";
            }
            schedule.humanTime = hour + ":" + schedule.minute + " " + meridian;
            //schedule.meridian = meridian;
            schedule.hour = zpad(hour);
            schedule.minute = zpad(schedule.minute);
            return schedule;
        });
        res.render("settings", body)
    });
});
app.post("/feeders/:id/settings", ensureLoggedIn(), (req, res) => {
    var schedules = req.body.id.reduce((list, id, idx, arr) => {
        if (req.body.deleted[idx] == "true") {
            //publish unset message
        } else {
            if (parseInt(id) >= 0) {
                var payload = {
                    schedule: {
                        id: id,
                        hour: parseInt(req.body.time[idx].split(":")[0]),
                        minute: parseInt(req.body.time[idx].split(":")[1]),
                        cups: parseInt(req.body.cups[idx])
                    }
                };
            }
        }
    });
    res.redirect("/feeders/" + req.params.id + "/settings");
});
// /settings/:id
app.listen(9999)