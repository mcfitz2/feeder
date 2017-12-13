const mqtt = require("mqtt");
const Docker = require('dockerode');
const StringDecoder = require('string_decoder').StringDecoder;
const byline = require('byline');
const stream = require('stream');

const docker = new Docker({
    socketPath: '/var/run/docker.sock'
});



const project = process.env.PROJECT_NAME || "feeders";
var client = mqtt.connect({
    port: 1882,
    host: "micahf.com",
    clientId: "logger"
});

client.on("error", (err) => {
    console.log("err", err);
})
client.on("close", (err) => {
    console.log("closed");
})
client.on("offline", (err) => {
    console.log("offline");
})
client.on("reconnect", (err) => {
    console.log("reconecting");
})
docker.listContainers(function(err, containers) {
    var decoder = new StringDecoder('utf8');

    containers.filter((container) => {
        return container.Labels["com.docker.compose.project"] == project
    }).map((info) => {
        return [info, docker.getContainer(info.Id)]
    }).forEach((arg) => {
        let [info, container] = arg;
        console.log(info.Names);
        container.attach({
            stream: true,
            stdout: true,
            stderr: true
        }, function(err, streem) {
            console.log("Attached to", info.Names[0]);
            var stdout = new stream.PassThrough();
            var stderr = new stream.PassThrough();
            container.modem.demuxStream(streem, stdout, stderr);
            byline(stdout).on('data', function(chunk) {
                try {
                    var logLine = JSON.parse(chunk.toString());
                } catch(e) {
                    var logLine = {message: chunk.toString()}
                }
                logLine.service = info.Names[0].slice(1);
                client.publish("logs/services/"+logLine.service, JSON.stringify(logLine))
            });
            byline(stderr).on('data', function(chunk) {
                try {
                    var logLine = JSON.parse(chunk.toString());
                } catch(e) {
                    var logLine = {message: chunk.toString()}
                }
                logLine.service = info.Names[0].slice(1);
                client.publish("logs/services/"+logLine.service, JSON.stringify(logLine))
            });
        });
    });
})