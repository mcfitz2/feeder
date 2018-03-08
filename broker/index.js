var mosca = require("mosca");
var ascoltatore = {
    type: 'redis',
    redis: require('redis'),
    db: 12,
    port: 6379,
    return_buffers: true, // to handle binary payloads
    host: "redis"
};


var settings = {
    port: 8888,
    backend: ascoltatore,
    logger: {
        name: "broker",
        level: 30,
    },
http: {
	    port: 7777,
    bundle: true,
    static: './'
  }
};

var server = new mosca.Server(settings);

server.on('ready', setup);
server.on('clientDisconnected', function(client) {
    // server.publish("/feeder/"+client.id+"/disconnect", "OK");
});

function setup() {
    //    server.authorizePublish = (client, topic, payload, callback) => {
    //        var auth = client.id == topic.split('/')[2] || client.id.indexOf("debug") == 0;
    //        callback(null, auth);
    //    }
    //    server.authorizeSubscribe = (client, topic, callback) => {
    //        var auth = client.id == topic.split('/')[2] || topic == '/feeder/identify' || client.id.indexOf("debug") == 0;
    //        callback(null, auth);
    //    }
    console.log('Mosca server is up and running');
}
