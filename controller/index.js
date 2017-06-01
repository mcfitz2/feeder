var express = require("express");
var mqtt = require("mqtt");
var MongoClient = require('mongodb').MongoClient;
var MQTTRouter = require("mqtt-route");

var app = express();
MongoClient.connect("mongodb://db/feeders").then((db) => {
    console.log("Connected to DB");
    var heartbeat_timer = null;
    var client = mqtt.connect({
        port: 1883,
        host: "broker",
        clientId: "debug39393"
    });
    client.on("error", (err) => {
        console.log("err", err);
    })
    client.on("close", (err) => {
        console.log("closed");
        clearInterval(heartbeat_timer)
    })
    client.on("offline", (err) => {
        console.log("offline");
    })
    client.on("reconnect", (err) => {
        console.log("reconecting");
    })
    var router = new MQTTRouter(client);
    client.on('connect', function() {
        heartbeat_timer = setInterval(() => {
            client.publish("/feeder/identify", "HELLO");
        }, 30000);
        console.log("connected to broker");
        router.route("/feeder/+/heartbeat", (topic) => {
            console.log(1, topic);
            db.collection("feeders").findOneAndUpdate({
                _id: topic.split("/")[2]
            }, {
                $set: {
                    lastSeen: new Date()
                }
            }, {
                upsert: true
            }).catch((err) => {
                console.log("Error updating DB: ", err);
            });
        });
        router.route("/feeder/+/feeding", (topic) => {
            console.log(2, topic);
            db.collection("feeders").findOneAndUpdate({
                _id: topic.split("/")[2]
            }, {
                $set: {
                    lastFeeding: new Date(),
                    lastSeen: new Date()
                }
            }, {
                upsert: true
            }).catch((err) => {
                console.log("Error updating DB: ", err);
            });
        });
        router.init(client);
    });
    app.get("/feeders", (req, res) => {
        db.collection("feeders").find({}).toArray().then((feeders) => {
            res.json(feeders);
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });
    app.post("/feeders/:id/feed/:cups", (req, res) => {
        client.publish("/feeder/"+req.params.id+"/feed", JSON.stringify({cups:req.params.cups}));
        res.status(200);
        res.end();
    });
    app.listen(8888);
}).catch((err) => {
    console.log(err);
});