var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var dnode = require("dnode");
app.use(bodyParser.json());
console.log("Connecte to controller")
/*    app.get("/users", (req, res) => {
        db.collection("users").find({}).toArray().then((feeders) => {
            res.json(feeders);
        }).catch((err) => {
            res.status(500);
            res.end();
        })
    });*/
console.log("Connecting to user-service");
var d1 = dnode.connect({
    host: "user-service",
    port: 4242
})
d1.on("remote", function(usersClient) {
    console.log("Connecting to feeder-service")
    var d2 = dnode.connect({
        host: "feeder-service",
        port: 4242
    });
    d2.on("error", (err) => {
        console.log(err);
        setTimeout(() => {
            d2.connect({
                host: "feeder-service",
                port: 4242
            });
        }, 2000);
    })
    d2.on("remote", function(feedersClient) {
        app.post("/users/authenticate", (req, res) => {
            usersClient.authenticateUser(req.body.username, req.body.password, function(err, user, more) {
                if (err) {
                    res.status(401);
                    return res.end();
                } else {
                    return res.json(user);
                }
            });
        });
        app.get("/users/:id", (req, res) => {
            usersClient.getUser(req.params.id, function(err, user) {
                if (err) {
                    res.status(500);
                    res.send(err).end()
                }
                res.json(user);
            })
        });
        app.get("/users/:id/feeders", (req, res) => {
            console.log("Getting feeders for", req.params.id);
            feedersClient.getFeedersByOwner(req.params.id, function(err, feeders) {
                if (err) {
                    res.status(500);
                    return res.send(err).end();
                }
                res.json(feeders);
            })
        });
        app.get("/feeders/:id", (req, res) => { //get a single feeder
            feedersClient.getFeeder(req.params.id, (err, feeder) => {
                if (err) {
                    res.status(500);
                    return res.send(err).end();
                }
                res.json(feeder);
            });
        });
        // app.delete("/feeders/:id", (req, res) => { //delete a feeder
        //     db.collection("feeders").remove({
        //         _id: ObjectID(req.params.id)
        //     }).then((feeder) => {
        //         if (feeder.n == 0) { // feeder does not exist so was not deleted
        //             res.status(404);
        //         } else {
        //             res.status(200);
        //         }
        //         res.end();
        //     }).catch((err) => {
        //         res.status(500);
        //         res.end();
        //     })
        // });
        // app.post("/feeders/:id", (req, res) => { // update a feeder
        //     db.collection("feeders").update({
        //         _id: ObjectID(req.params.id)
        //     }, {
        //         $set: req.body
        //     }).then((result) => {
        //         res.status(200);
        //         res.end();
        //     }).catch((err) => {
        //         res.status(500);
        //         res.end();
        //     })
        // });
        app.post("/feeders/:id/feed", (req, res) => { //send a feed command to a feeder
            console.dir(req.body);
            feedersClient.feed(req.params.id, req.body.cups, (err) => {
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
    d2.on("error", function(err) {
        console.log(err);
    });
    d2.on("fail", console.log);
});
d1.on("error", (err) => {
    console.log(err);
    setTimeout(() => {
        d1.connect({
            host: "user-service",
            port: 4242
        });
    }, 2000);
})