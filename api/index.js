const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mqtt = require('mqtt');
app.use(bodyParser.json());
const Bus = require("busmq");
const bus = Bus.create({
    redis: ['redis://redis:6379']
});
var userClient = bus.service("user");
var feederClient = bus.service("feeder");

bus.on('online', () => {
    console.log("API Connected to BUSMQ");
    userClient.connect({
        reqTimeout: 50000
    }, () => {
        console.log("API connected to User Service")
    });
    feederClient.connect({
        reqTimeout: 50000
    }, () => {
        console.log("API connected to Feeder Service")
    });
});
app.post("/users/authenticate", (req, res) => {
    console.log("Got auth request", req.body);
    userClient.request({
        method: 'authenticateUser',
        username: req.body.username,
        password: req.body.password
    }, function(err, user) {
        console.log("response from BUSMQ", err, user);
        if (err) {
            console.log(err, user);
            res.status(401);
            return res.send(err).end();
        } else {
            console.log("auth response from BUSMQ", err, user);
            return res.json(user);
        }
    });
});
app.get("/users/:id", (req, res) => {
    userClient.request({
        method: 'getUser',
        userId: req.params.id
    }, function(err, user) {
        if (err) {
            res.status(500);
            res.send(err).end()
        }
        res.json(user);
    })
});
app.get("/users/", (req, res) => {
    userClient.request({
        method: 'getUsers'
    }, (err, users) => {
        if (err) {
            res.status(500);
            res.send(err).end()
        }
        res.json(users);
    });
});
app.get("/users/:id/feeders", (req, res) => {
    console.log("Getting feeders for", req.params.id);
    feederClient.request({
        method: 'getFeedersByOwner',
        userId: req.params.id
    }, function(err, feeders) {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.json(feeders);
    })
});
app.get("/feeders", (req, res) => { //get a single feeder
    feederClient.request({
        method: 'getFeeders'
    }, (err, feeder) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.json(feeder);
    });
});
app.get("/feeders/unclaimed", (req, res) => { //get a single feeder
    feederClient.request({
        method: 'getUnclaimedFeeders'
    }, (err, feeder) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.json(feeder);
    });
});
app.get("/feeders/:id", (req, res) => { //get a single feeder
    feederClient.request({
        method: 'getFeeder',
        feederId: req.params.id
    }, (err, feeder) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.json(feeder);
    });
});
app.patch("/feeders/:id", (req, res) => { //update a single feeder
    feederClient.request({
        method: 'updateFeeder',
        feederId: req.params.id,
        feederObj: req.body
    }, (err) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.status(200);
        res.end();
    })
});
app.patch("/feeders/:id/schedules", (req, res) => { //update schedules
    console.log("updating schedules");
    console.log(req.body);
    var [schedules, toDelete] = req.body.reduce((ret, schedule) => {
        console.log(schedule);
        if (schedule.deleted) {
            ret[1].push(schedule);
        } else {
            ret[0].push(schedule);
        }
        return ret;
    }, [
        [],
        []
    ]);
    console.log("ToDelete", toDelete)
    Promise.all([new Promise((resolve, reject) => {
        feederClient.request({
            method: 'deleteSchedules',
            feederId: req.params.id,
            schedules: toDelete
        }, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    }), new Promise((resolve, reject) => {
        feederClient.request({
            method: 'setSchedules',
            feederId: req.params.id,
            schedules: schedules
        }, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    })]).then(() => {
        res.status(200);
        res.end();
    }).catch((err) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
    });
});
app.delete("/feeders/:id", (req, res) => { //delete a feeder
    console.log("Deleting feeder ID =", req.params.id)
    feederClient.request({
        method: 'deleteFeeder',
        feederId: req.params.id,
        feederObj: req.body
    }, (err) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.status(200);
        res.end();
    })
});
app.post("/feeders/:id/feed", (req, res) => { //send a feed command to a feeder
    console.dir(req.body);
    feederClient.request({
        method: 'feed',
        feederId: req.params.id,
        cups: req.body.cups
    }, (err) => {
        if (err) {
            console.log(err);
            res.status(500);
            res.end();
        } else {
            res.status(200);
            res.end();
        }
    });
});

bus.connect();
app.listen(8888);
