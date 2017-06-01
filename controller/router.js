MQTTRouter = function(client) {
    var self = this;
    self.routes = {};
    self.client = client;
};
MQTTRouter.prototype.route = function(regex, handler) {
    var self = this;
    self.routes[regex.replace("+", "[^/]+").replace("#", ".+")] = handler;
    console.log("subscribing to", regex)
    self.client.subscribe(regex);
};
MQTTRouter.prototype.init = function() {
    var self = this;
    self.client.on("message", function(topic, message) {
        var matches = Object.keys(self.routes).filter((regex) => {
            return topic.match(regex);
        });
        if (matches.length > 0) {
            return self.routes[matches[0]](topic, message);
        }
    });
}
module.exports = MQTTRouter;