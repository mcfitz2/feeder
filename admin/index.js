const mqtt = require("mqtt");

const proxy = require('http-proxy-middleware');

const express = require("express");
const app = express();
const session = require('express-session')
const ObjectID = require('mongodb').ObjectID;
const passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
const exphbs = require('express-handlebars');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const request = require("request");
const expressWs = require('express-ws')(app);
const expressWinston = require("express-winston");
const winston = require("winston");
app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ],
      meta: true, // optional: control whether you want to log the meta data about the request (default to true)
      msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
      expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
      ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
    }));

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
        console.log(req.user);
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
	console.log("passport auth", username);
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


const client = mqtt.connect("mqtt://broker:8888")
client.on("connect", (err) => {
    client.subscribe("logs/#");
});
client.on("error", (err) => {
    console.log("err", err);
})
client.on("close", (err) => {
    console.log("closed");
})
client.on("offline", (err) => {
    console.log("offline");
})
client.on("reconnect", (err) => {
    console.log("reconecting");
})



app.get('/login', function(req, res) {
    console.log("USER", req.user);
    if (req.user) {
        res.redirect("/admin/logs");
    } else {
        res.render('login');
    }
});
app.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect('/admin/feeders');
});
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
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
app.post("/admin/feeders/:feederId/claim", ensureAdmin(), (req, res) => {
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
        res.redirect("/admin/feeders");
    });
});
app.get("/admin/logs", ensureAdmin(), (req, res) => {
    res.render("logs")
})

//app.use("/admin/logs/socket", proxy('/', {target:'http://broker:8888', ws:true}));
app.use("/mqtt.js", proxy('/mqtt.js', {target:'http://broker:7777'}));
app.listen(8888)
