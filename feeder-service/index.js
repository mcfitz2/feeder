var mqtt = require("mqtt");
var MongoClient = require('mongodb').MongoClient;
var MQTTRouter = require("mqtt-route");
var ObjectID = require('mongodb').ObjectID;
var dnode = require("dnode");
var Feeder = require('./schemas/feeder').Feeder;
var Schedule = require('./schemas/feeder').Schedule;
var mongoose = require("mongoose");
mongoose.connect("mongodb://db/feeders").then(() => {
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
        }, 60000);
        console.log("connected to broker");
        router.route("/feeder/+/heartbeat", (topic, payload) => {
            console.log(1, topic, payload);
            var data = JSON.parse(payload);
            Feeder.findOneAndUpdate({
                _id: topic.split("/")[2]
            }, {
                $set: {
                    lastSeen: new Date(),
                    schedules: data.schedules.map((schedule) => {
                        return new Schedule(schedule);
                    }),
                }
            }, {
                upsert: true
            }).catch((err) => {
                console.log("Error updating DB: ", err);
            });
        });
        router.route("/feeder/+/feeding", (topic) => {
            console.log(2, topic);
            Feeder.findOneAndUpdate({
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
    var server = dnode({
        getFeeder:function(feederId, reply) {
            Feeder.findById(feederId).lean().exec((err, f) => {
                f.id = f._id;
                f.owner = f.owner.toString();
                f.schedules = f.schedules.map((s) => {
                    delete s._id;
                    return s;
                });
                console.dir(f);
                reply(err, f);
            })
        },
        getFeedersByOwner: function(ownerId, reply) {
            console.log("searching for", ownerId);
            Feeder.find({
                owner: ownerId
            }).lean().exec((err, feeders) => {
                feeders = feeders.map((f) => {
                    f.id = f._id;
                    f.owner = f.owner.toString();
                    f.schedules = f.schedules.map((s) => {
                        delete s._id;
                        return s;
                    });
                    return f;
                });
                console.dir(feeders);
                reply(err, feeders);
            });
        },
        feed: function(feederId, cups, reply) {
            client.publish("/feeder/" + feederId + "/feed", JSON.stringify({
                cups: cups
            }));
            reply(null);
        },
        setSchedule: function(feederId, schedule, reply) {
            //{schedule:{
            //    minute:0
            //    hour:0
            //    id:0
            //    cups:0
            //}}
            // pull down schedule from DB
            //for each schedule
            // if schedule has changed, send update to feeder
            // else ignore
            schedules.forEach(function(schedule) {
                client.publish("/feeder/" + feederId + "/schedules/set", JSON.stringify(schedule));
            });
            reply(null);
        },
        deleteSchedule: function(feederId, schedule, reply) {
            client.publish("/feeder/" + feederId + "/schedules/unset", JSON.stringify(schedule));
            reply(null);
        }
    });
    server.listen(4242);
}).catch((err) => {
    console.log(err);
});