var mqtt = require("mqtt");
var MongoClient = require('mongodb').MongoClient;
var MQTTRouter = require("mqtt-route");
var zerorpc = require("zerorpc");
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
        }, 5000);
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
    var server = new zerorpc.Server({
        feed: function(feederId, cups, reply) {
            client.publish("/feeder/" + feederId + "/feed", JSON.stringify({
                cups: cups
            }));
            reply(null);
        },
        setSchedule: function(feederId, schedules, reply) {
            client.publish("/feeder/" + feederId + "/schedule/set", JSON.stringify({
                schedules: schedules
            }));
            reply(null);
        },
        clearSchedule: function(feederId, schedules, reply) {
            client.publish("/feeder/" + feederId + "/schedule/clear", "");
            reply(null);
        }
    });
    server.bind("tcp://0.0.0.0:4242");
    server.on("error", function(error) {
        console.error("RPC server error:", error);
    });
}).catch((err) => {
    console.log(err);
});