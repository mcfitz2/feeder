var User = require('./schemas/user');
var mongoose = require("mongoose");
var dnode = require("dnode");

function fix(model) {}
mongoose.connect("mongodb://db/feeders").then(() => {
    var server = dnode({
        registerUser: function(user, reply) {
            User.register(new User({
                username: user.username,
                email: user.email
            }), user.password, reply);
        },
        getUser: function(id, reply) {
            User.findById(id).lean().then((user) => {
                reply(null, user);
            }).catch((err) => {
                reply(err);
            })
        },
        deleteUser: function(id, reply) {
            User.findOneAndRemove({
                _id: id
            }).then((user) => {
                reply(null, user);
            }).catch(reply);
        },
        authenticateUser: function(username, password, reply) {
            User.findOne({
                username: username
            }).exec((err, user) => {
                if (user) {
                    var fixed = user.toObject({
                        getters: true,
                        transform: function(doc, ret, options) {
                            delete ret._id;
                            return ret;
                        }
                    });
                    user.authenticate(password, (err, user, reason) => {
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
        }
    });
    server.listen(4242);
});