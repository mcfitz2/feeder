var User = require('./schemas/user');
var mongoose = require("mongoose");
var mqtt = require('mqtt')
var mqttrpc = require('mqtt-rpc')
mongoose.set("debug", true)
mongoose.connect("mongodb://db/feeders").then(() => {
    var mqttclient = mqtt.connect('mqtt://broker:1883');
    var server = mqttrpc.server(mqttclient);
    server.format('json');
    server.provide('RPC/users', 'registerUser', function(context, reply) {
        User.register(new User({
            username: context.username,
            email: context.email
        }), context.password, reply);
    });
    server.provide('RPC/users', 'getUser', function(context, reply) {
        User.findById(context.userId).lean().then((user) => {
            reply(null, user);
        }).catch((err) => {
            reply(err);
        })
    });
    server.provide('RPC/users', 'getUsers', function(context, reply) {
        User.find({}).lean().then((users) => {
            reply(null, users.map((user) => {
                user._id = user._id.toString();
                return user;
            }));
        }).catch((err) => {
            console.error("Mongoose Error:", err)
            reply(err);
        });
    });
    server.provide('RPC/users', 'deleteUser', function(context, reply) {
        User.findOneAndRemove({
            _id: context.userId
        }).then((user) => {
            reply(null, user);
        }).catch(reply);
    });
    server.provide('RPC/users', 'authenticateUser', function(context, reply) {
        User.findOne({
            username: context.username
        }).exec((err, user) => {
            if (user) {
                var fixed = user.toObject({
                    getters: true,
                    transform: function(doc, ret, options) {
                        delete ret._id;
                        return ret;
                    }
                });
                user.authenticate(context.password, (err, user, reason) => {
                    console.log("auth done", err, fixed, reason);
                    if (err) {
                        reply(err, false);
                    } else {
                        reply(err, fixed)
                    }
                });
            } else {
                reply("no user");
            }
        });
    });
});