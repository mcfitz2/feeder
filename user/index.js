/*jslint node:true,unparam:true */

var User = require("./schemas/user");
var mongoose = require("mongoose");
var Bus = require("busmq");
mongoose.set("debug", true)
let methods = {
    'registerUser': (context, reply) => {
        User.register(new User({
            username: context.username,
            email: context.email
        }), context.password, reply);
    },
    'getUser': (context, reply) => {
        User.findById(context.userId).lean().then((user) => {
            reply(null, user);
        }).catch((err) => {
            reply(err);
        })
    },
    'getUsers': (context, reply) => {
        User.find({}).lean().then((users) => {
            reply(null, users.map((user) => {
                user._id = user._id.toString();
                return user;
            }));
        }).catch((err) => {
            console.error("Mongoose Error:", err)
            reply(err);
        });
    },
    'deleteUser': (context, reply) => {
        User.findOneAndRemove({
            _id: context.userId
        }).then((user) => {
            reply(null, user);
        }).catch(reply);
    },
    'authenticateUser': (context, reply) => {
        console.log("got auth request", context);
        User.findOne({
            username: context.username
        }).exec((err, user) => {
            if (user) {
                var fixed = user.toObject({
                    getters: true,
                    transform: (doc, ret, options) => {
                        delete ret._id;
                        return ret;
                    }
                });
                user.authenticate(context.password, (err, user, reason) => {
                    console.log("auth done", err, fixed, reason);
                    if (err) {
                        reply(err, false);
                    } else {
                        console.log("sending response", fixed);
                        reply(err, fixed)
                    }
                });
            } else {
                reply("no user");
            }
        });
    }
}

mongoose.connect("mongodb://db/feeders").then(() => {
    console.log("User service connected to  DB");
    const bus = Bus.create({
        redis: ['redis://redis:6379']
    });
    console.log(bus);
    bus.on("online", () => {
        console.log("User Service connected to BUSMQ");
        let handler = bus.service("user");
        handler.on("request", (request, reply) => {
            console.log("Got BUSMQ request. request=", request)
            methods[request.method](request, reply);
        });
        handler.serve(() => {
            console.log("serving user service");
        });
    });
    bus.on("offline", () => {
        console.log("Redis is down");
    });
    bus.on("error", (err) => {
        console.log("BUSMQ error:", err);
    });

    console.log("Connecting");
    bus.connect();

});
