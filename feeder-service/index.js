var MQTTRouter = require("mqtt-route");
var mqtt = require('mqtt'),
    mqttrpc = require('mqtt-rpc')
var Feeder = require('./schemas/feeder').Feeder;
var Schedule = require('./schemas/feeder').Schedule;
var mongoose = require("mongoose");

function getUnusedID(schedules) {
    var used = schedules.map((schedule) => {
        return parseInt(schedule.id);
    });
    for (let i = 0; i < 21; i++) {
        if (!used.includes(i)) {
            return i;
        }
    }
    return null;
}
mongoose.connect("mongodb://db/feeders").then(() => {
    // build a mqtt new RPC server
    console.log("Connected to DB");
    var heartbeat_timer = null;
    var client = mqtt.connect({
        port: 1883,
        host: "broker",
        clientId: "debug39393"
    });
    var server = mqttrpc.server(client);
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
            client.publish("/feeder/identify", JSON.stringify({
                "message": "Identify Yourself"
            }));
        }, 10000);
        console.log("connected to broker");
        router.route("/feeder/+/heartbeat", (topic, payload) => {
            var data = JSON.parse(payload);
            console.log(1, topic, data);
            if (data.schedules) {
                schedules = Object.values(data.schedules).map((schedule) => {
                    return new Schedule(schedule);
                });
            } else {
                schedules = []
            }
            Feeder.findOneAndUpdate({
                _id: topic.split("/")[2]
            }, {
                $set: {
                    lastSeen: new Date(),
                    schedules: schedules,
                    syncing: false,
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
                    lastSeen: new Date(),
                }
            }, {
                upsert: true
            }).catch((err) => {
                console.log("Error updating DB: ", err);
            });
        });
        router.init(client);
    });
    server.provide('RPC/feeders', 'getFeeder', function(context, reply) {
        Feeder.findById(context.feederId).lean().exec((err, f) => {
            f.id = f._id;
            f.owner = f.owner.toString();
            f.schedules = f.schedules.map((s) => {
                delete s._id;
                return s;
            });
            //console.dir(f);
            reply(err, f);
        })
    });
    server.provide('RPC/feeders', 'getFeedersByOwner', function(context, reply) {
        //console.log("searching for", ownerId);
        Feeder.find({
            owner: context.userId
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
            //console.dir(feeders);
            reply(err, feeders);
        });
    });
    server.provide('RPC/feeders', 'getUnclaimedFeeders', function(context, reply) {
        Feeder.find({
            owner: null
        }).lean().exec((err, feeders) => {
            feeders = feeders.map((f) => {
                f.id = f._id;
                if (f.owner) {
                    f.owner = f.owner.toString();
                } else {
                    f.owner = null;
                }
                if (f.schedules) {
                    f.schedules = f.schedules.map((s) => {
                        delete s._id;
                        return s;
                    });
                } else {
                    f.schedules = [];
                }
                return f;
            });
            //console.dir(feeders);
            reply(err, feeders);
        });
    });
    server.provide('RPC/feeders', 'getFeeders', function(context, reply) {
        Feeder.find({}).lean().exec((err, feeders) => {
            feeders = feeders.map((f) => {
                f.id = f._id;
                if (f.owner) {
                    f.owner = f.owner.toString();
                } else {
                    f.owner = null;
                }
                if (f.schedules) {
                    f.schedules = f.schedules.map((s) => {
                        delete s._id;
                        return s;
                    });
                } else {
                    f.schedules = [];
                }
                return f;
            });
            // console.dir(feeders);
            reply(err, feeders);
        });
    });
    server.provide('RPC/feeders', 'feed', function(context, reply) {
        client.publish("/feeder/" + context.feederId + "/feed", JSON.stringify({
            cups: context.cups
        }));
        reply(null);
    });
    server.provide('RPC/feeders', 'updateFeeder', function(context, reply) {
        Feeder.findOneAndUpdate({
            _id: context.feederId
        }, {
            $set: context.feederObj
        }).then(() => {
            reply(null);
        }).catch((err) => {
            console.log("Error updating DB: ", err);
            reply(err);
        });
    });
    server.provide('RPC/feeders', 'deleteFeeder', function(context, reply) {
        Feeder.findOneAndRemove({
            _id: context.feederId
        }).then(() => {
            reply(null);
        }).catch((err) => {
            console.log("Error updating DB: ", err);
            reply(err);
        });
    });
    server.provide('RPC/feeders', 'setSchedules', function(context, reply) {
        console.log("updating schedules")
        Feeder.findOneAndUpdate({
            _id: context.feederId
        }, {
            $set: {
                syncing: true
            }
        }, {
            new: true
        }, (err, feeder) => {
            if (err) {
                reply(err);
            } else {
                console.log(context.schedules);
                context.schedules.forEach(function(schedule) {
                    if (schedule.id === -1) {
                        schedule.id = getUnusedID(feeder.schedules);
                    }
                    if (schedule.id !== null) {
                        client.publish("/feeder/" + feederId + "/schedules/set", JSON.stringify({
                            schedule: schedule
                        }));
                    }
                });
                reply(null);
            }
        });
    });
    server.provide('RPC/feeders', 'deleteSchedules', function(context, reply) {
        client.publish("/feeder/" + context.feederId + "/schedules/unset", JSON.stringify({
            schedules: schedules
        }));
        reply(null);
    });
}).catch((err) => {
    console.log(err);
});