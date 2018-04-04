const MQTTRouter = require("mqtt-route");
const mqtt = require('mqtt');
const Feeder = require('./schemas/feeder').Feeder;
const Schedule = require('./schemas/feeder').Schedule;
const mongoose = require("mongoose");
const Bus = require("busmq");



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
    console.log("Connected to DB");
    const httpServer = http.createServer();
    httpServer.listen(8889);
    const bus = Bus.create({
        redis: ['redis://redis:6379'],
        federate: {
            server: httpServer,
            secret: "mysecret",
            path: "/feeder"
        }
    });
    var notifier = bus.pubsub("notifications");
    bus.on("online", () => {
        console.log("Feeder service connected to Redis");
        let handler = bus.service("feeder");
        notifier = bus.pubsub("notifications");
        heartbeat = bus.pubsub("heartbeat");

        let methods = {
            'getFeeder': function(context, reply) {
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
            },
            'getFeedersByOwner': function(context, reply) {
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
            },
            'getUnclaimedFeeders': function(context, reply) {
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
            },
            'getFeeders': function(context, reply) {
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
            },
            'feed': function(context, reply) {
                console.log("Sending feed command", context);
                var requester = bus.service(context.feederId);
                // connect to the service so we can make requests
                requester.connect(function() {
                    console.log('connected to the service');
                });
                // make a request and receive a reply
                requester.request({
                    method: 'feed',
                    cups: context.cups
                }, function(err, reply) {
                    console.log('the service replied with ' + reply.thisis);
                });
                console.log("Feeding...");
                Feeder.findOne({
                    _id: context.feederId
                }).then((feeder) => {
                    console.log("Got owner of feeder", feeder);
                    console.log("Publishing notification");
                    notifier.publish({
                        recipient: feeder.owner,
                        message: "Dispensed " + context.cups + " cups into " + feeder.name
                    }, (err) => {
                        console.log("error publishing notification", err);
                    });
                    console.log("notification sent", {
                        recipient: feeder.owner,
                        message: "Dispensed " + context.cups + " cups into " + feeder.name
                    });
                    reply(null);
                });

                // update last feeding  when we get a response from the feeder
                /*        Feeder.findOneAndUpdate({
                            _id: message.feederId
                        }, {
                            $set: {
                                lastFeeding: new Date(),
                                lastSeen: new Date(),
                            }
                        }, {
                            upsert: true
                        }).catch((err) => {
                            console.log("Error updating DB: ", err);
                        });*/


            },
            'updateFeeder': function(context, reply) {
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
            },
            'deleteFeeder': function(context, reply) {
                Feeder.findOneAndRemove({
                    _id: context.feederId
                }).then(() => {
                    reply(null);
                }).catch((err) => {
                    console.log("Error updating DB: ", err);
                    reply(err);
                });
            },
            'setSchedules': function(context, reply) {
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
            },
            'deleteSchedules': function(context, reply) {
                client.publish("/feeder/" + context.feederId + "/schedules/unset", JSON.stringify({
                    schedules: schedules
                }));
                reply(null);
            }
        }

        handler.on("request", (request, reply) => {
            console.log("Got BUSMQ request. request=", request);
            methods[request.method](request, reply);
        });
        heartbeat.on("message", (message) => {
            if (message.schedules) {
                schedules = Object.values(message.schedules).map((schedule) => {
                    return new Schedule(schedule);
                });
            } else {
                schedules = []
            }
            Feeder.findOneAndUpdate({
                _id: message.feederId
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
        heartbeat.subscribe();
        handler.serve(() => {
            console.log("serving feeder service");
        });
    });
    bus.on("error", (err) => {
        console.log("BUSMQ ERROR", err);
    });
    bus.on("offline", () => {
        console.log("BUSMQ offline!");
    });
    bus.connect();
});