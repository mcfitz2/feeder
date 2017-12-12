var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mqtt = require('mqtt'),
    mqttrpc = require('mqtt-rpc')
app.use(bodyParser.json());


var mqttclient = mqtt.connect('mqtt://broker:1883', );
var client = mqttrpc.client(mqttclient);

app.post("/users/authenticate", (req, res) => {
    client.callRemote('RPC/users', 'authenticateUser', {
        username: req.body.username,
        password: req.body.password
    }, function(err, user) {
        if (err) {
            res.status(401);
            return res.end();
        } else {
            return res.json(user);
        }
    });
});
app.get("/users/:id", (req, res) => {
    client.callRemote('RPC/users', 'getUser', {
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
    client.callRemote('RPC/users', 'getUsers', {}, function(err, users) {
        if (err) {
            res.status(500);
            res.send(err).end()
        }
        res.json(users);
    });
});
app.get("/users/:id/feeders", (req, res) => {
    console.log("Getting feeders for", req.params.id);
    client.callRemote('RPC/feeders', 'getFeedersByOwner', {
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
    client.callRemote('RPC/feeders', 'getFeeders', {}, (err, feeder) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.json(feeder);
    });
});
app.get("/feeders/unclaimed", (req, res) => { //get a single feeder
    client.callRemote('RPC/feeders', 'getUnclaimedFeeders', {}, (err, feeder) => {
        if (err) {
            res.status(500);
            return res.send(err).end();
        }
        res.json(feeder);
    });
});
app.get("/feeders/:id", (req, res) => { //get a single feeder
    client.callRemote('RPC/feeders', 'getFeeder', {
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
    client.callRemote('RPC/feeders', 'updateFeeder', {
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
        client.callRemote('RPC/feeders', 'deleteSchedules', {
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
        client.callRemote('RPC/feeders', 'setSchedules', {
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
    client.callRemote('RPC/feeders', 'deleteFeeder', {
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
    client.callRemote('RPC/feeders', 'feed', {
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
app.listen(8888);