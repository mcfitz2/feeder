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
        req.session.returnTo = req.path;
        if (!req.user || !req.user.id) {
            return res.redirect('/login');
        }
        if (!req.user.email == "mcfitz2@gmail.com") {
            return res.end("You need to be admin");
        }
        next();
    };
}

function ensureAdmin() {
    return function(req, res, next) {
        req.session.returnTo = req.path;
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
        url: "http://api:8888/users/authenticate",
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
            console.log("BODY", body, res.statusCode)
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
app.get("/", (req, res) => {
    res.redirect("/dashboard");
});
app.get("/dashboard", ensureLoggedIn(), function(req, res) {
    console.log("Dashboard", "LOGGED IN", req.user);
    request.get({
        url: "http://api:8888/users/" + req.user.id + "/feeders",
        json: true
    }, function(err, r, body) {
        if (err) {
            res.status(500);
            console.log(err);
            return res.end();
        }
        console.dir(body);
        res.render("dashboard", {
            feeders: body
        });
    });
});
app.post("/feeders/:id/feed", ensureLoggedIn(), (req, res) => {
    request.post({
        url: "http://api:8888/feeders/" + req.params.id + "/feed",
        json: true,
        body: {
            cups: 0.2
        }
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        res.redirect("/dashboard");
    });
});
app.post("/admin/feeders/:id/delete", ensureAdmin(), (req, res) => {
    request.delete({
        url: "http://api:8888/feeders/" + req.params.id,
        json: true,
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        res.redirect(req.session.returnTo);
    });
});
app.get("/feeders/:id/settings", ensureLoggedIn(), (req, res) => {
    request.get({
        url: "http://api:8888/feeders/" + req.params.id,
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
app.get("/admin/feeders/unclaimed", ensureAdmin(), (req, res) => {
    request.get({
        url: "http://api:8888/feeders/unclaimed",
        json: true
    }, function(err, r, feeders) {
        if (err) {
            res.status(500);
            console.log(err);
            return res.end();
        }
        console.dir(feeders);
        request.get({
            url: "http://api:8888/users",
            json: true
        }, function(err, r, users) {
            if (err) {
                res.status(500);
                console.log("ERROR:", err);
                return res.end();
            }
            console.log("USERS:", users);
            res.render("feeder", {
                feeders: feeders,
                users: users
            });
        });
    });
});
app.get("/admin/feeders", ensureAdmin(), (req, res) => {
    request.get({
        url: "http://api:8888/feeders",
        json: true
    }, function(err, r, feeders) {
        if (err) {
            res.status(500);
            console.log(err);
            return res.end();
        }
        console.dir(feeders);
        request.get({
            url: "http://api:8888/users",
            json: true
        }, function(err, r, users) {
            if (err) {
                res.status(500);
                console.log("ERROR:", err);
                return res.end();
            }
            console.log("USERS:", users);
            res.render("feeder", {
                feeders: feeders,
                users: users
            });
        });
    });
});
app.post("/admin/feeders/:feederId/claim", (req, res) => {
    request.patch({
        url: "http://api:8888/feeders/" + req.params.feederId,
        json: true,
        body: {
            owner: req.body.userId
        }
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        res.redirect(req.session.returnTo);
    });
});
app.get("/feeders/claim", ensureLoggedIn(), (req, res) => {
    res.render("enterID");
});
app.post("/feeders/claim", ensureLoggedIn(), (req, res) => {
    console.log("CLAIM", req.user, req.body);
    request.patch({
        url: "http://api:8888/feeders/" + req.body.feederId,
        json: true,
        body: {
            owner: req.user.id,
            name: req.user.firstName + "'s New Feeder"
        }
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            return res.end(err);
        }
        res.redirect("/dashboard");
    });
});
app.post("/feeders/:id/settings", ensureLoggedIn(), (req, res) => {
    console.log("updating schedules");
    console.log(req.body);
    let schedules;
    if (req.body.id) {
        if (req.body.id.constructor === Array) {
            schedules = req.body.id.reduce((list, id, idx, arr) => {
                list.push({
                    id: parseInt(id),
                    hour: parseInt(req.body.time[idx].split(":")[0]),
                    minute: parseInt(req.body.time[idx].split(":")[1]),
                    cups: parseInt(req.body.cups[idx]),
                    deleted: req.body.deleted[idx] === "true"
                });
                return list;
            }, []);
        } else if (req.body.time && req.body.cups) {
            schedules = [{
                id: parseInt(req.body.id),
                hour: parseInt(req.body.time.split(":")[0]),
                minute: parseInt(req.body.time.split(":")[1]),
                cups: parseFloat(req.body.cups),
                deleted: req.body.deleted === "true"
            }];
        }
    }
    var patch = {
        name: req.body.name,
        timezone: req.body.timezone,
    }
    request.patch({
        url: "http://api:8888/feeders/" + req.params.id,
        json: true,
        body: patch
    }, (err, r, body) => {
        if (err) {
            res.status(500);
            res.end()
        } else {
            request.patch({
                url: "http://api:8888/feeders/" + req.params.id + "/schedules",
                json: true,
                body: schedules
            }, (err, r, body) => {
                if (err) {
                    res.status(500);
                    res.end();
                } else {
                    res.redirect(req.session.returnTo);
                }
            });
        }
    });
});
// /settings/:id
app.listen(8888)
