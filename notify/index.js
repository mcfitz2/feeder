const Bus = require("busmq");
const bus = Bus.create({redis:["redis://redis:6379"]});

bus.on("online", () => {
	var s = bus.pubsub("notifications");
	var userClient = bus.service("user");
	userClient.connect(() => {
		console.log("Notify service connected to User service");
	});
	s.on("message", (message) => {
		console.log("Got notification from BUSMQ", message);
		userClient.request({method:"getUser", userId:message.recipient}, (err, user) => {
			console.log("TELL ME SOMETHING", err, user);
			if (err) {
				console.log(err);
			}
			console.log("Sending email to", user.email, message.message);
		});
	});
	s.subscribe();
});
bus.connect();
