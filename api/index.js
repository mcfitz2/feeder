var express = require("express");
var MongoClient = require('mongodb').MongoClient;
var app = express();
var ObjectID = require('mongodb').ObjectID;
var bodyParser = require("body-parser");
var zerorpc = require("zerorpc");
app.use(bodyParser.json());
MongoClient.connect("mongodb://db/feeders").then((db) => {
    console.log("Connected to DB");
    var client = new zerorpc.Client();
    client.connect("tcp://controller:4242");
    console.log("Connecte to controller")
    /*    app.get("/users", (req, res) => {
            db.collection("users").find({}).toArray().then((feeders) => {
                res.json(feeders);
            }).catch((err) => {
                res.status(500);
                res.end();
            })
        });*/
    app.get("/users/:id", (req, res) => {
        db.collection("users").findOne({
            _id: req.params.id
        }).toArray().then((feeder) => {
            if (feeder == null) {
                res.status(404);
                res.end();
            } else {
                res.json(feeder);
            }
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
    app.get("/users/:id/feeders", (req, res) => {
        db.collection("feeders").find({
            owner: ObjectID(req.params.id)
        }).toArray().then((feeders) => {
            res.json(feeders);
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
    /*    app.post("/users", (req, res) => {
            //TODO
            //do validation on input
            db.collection("users").insertOne(req.body).then((result) => {
                res.status(200);
                res.end();
            }).catch((err) => {
                res.status(500);
                res.end();
            })
        });
        app.post("/users/:id", (req, res) => {
            db.collection("users").update({
                _id: ObjectID(req.params.id)
            }, {
                $set: req.body
            }).then((result) => {
                res.status(200);
                res.end();
            }).catch((err) => {
                res.status(500);
                res.end();
            })
        });
        app.delete("/users/:id", (req, res) => {
            db.collection("users").remove({
                _id: ObjectID(req.params.id)
            }).then((result) => {
                res.status(200);
                res.end();
            }).catch((err) => {
                res.status(500);
                res.end();
            })
        });
        app.get("/feeders", (req, res) => { //get all feeders
            db.collection("feeders").find({}).toArray().then((feeders) => {
                res.json(feeders);
            }).catch((err) => {
                res.status(500);
                res.end();
            })
        });
    */
    app.get("/feeders/:id", (req, res) => { //get a single feeder
        db.collection("feeders").findOne({
            _id: req.params.id
        }).toArray().then((feeder) => {
            if (feeder == null) {
                res.status(404);
                res.end();
            } else {
                res.json(feeder);
            }
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
    //app.post("/feeders", (req, res) => {}); //create a feeder - shouldn't be used. feeders are automatically created when they connect
    app.delete("/feeders/:id", (req, res) => { //delete a feeder
        db.collection("feeders").remove({
            _id: ObjectID(req.params.id)
        }).then((feeder) => {
            if (feeder.n == 0) { // feeder does not exist so was not deleted
                res.status(404);
            } else {
                res.status(200);
            }
            res.end();
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
    app.post("/feeders/:id", (req, res) => { // update a feeder
        db.collection("feeders").update({
            _id: ObjectID(req.params.id)
        }, {
            $set: req.body
        }).then((result) => {
            res.status(200);
            res.end();
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
    app.post("/feeders/:id/feed", (req, res) => { //send a feed command to a feeder
        client.invoke("feed", req.body.cups, (err, res, more) => {
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
});