var express = require("express");
var MongoClient = require('mongodb').MongoClient;
var app = express();
MongoClient.connect("mongodb://db/feeders").then((db) => {
    console.log("Connected to DB");
    var client = new zerorpc.Client();
	client.connect("tcp://controller:4242");
	console.log("Connecte to controller")


	
    app.get("/users", (req, res) => {});
    app.get("/users/:id", (req, res) => {});
    app.get("/users/:id/feeders", (req, res) => {});
    app.post("/users", (req, res) => {});
    app.post("/users/:id", (req, res) => {});
    app.delete("/users/:id", (req, res) {});

    app.get("/feeders", (req, res) => { //get all feeders
        db.collection("feeders").find({}).toArray().then((feeders) => {
            res.json(feeders);
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
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
            _id: req.params.id
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
});