import paho.mqtt.client as mqtt #import the client1
import uuid
import json
import os
import logging
import datetime
import time
import schedule
#logging.basicConfig(level=logging.DEBUG)
class MQTTHandler(logging.Handler):
	def __init__(self, client):
		super().__init__()
		self.client = client

	def emit(self, record):
		log_entry = json.loads(self.format(record))
		log_entry.update(self.client.config)
		self.client.publish("logs/feeders/%s" % self.client.config["id"], json.dumps(log_entry))        

class Config(dict):
	def __init__(self, path="config.json"):
		self.path = path
		if os.path.exists(self.path):
			with open(self.path, 'r') as config_file:
				self.update(json.load(config_file))
		else:
			self.update({
				"broker_address":"micahf.com",
				"port":1882,
				"id":str(uuid.uuid4())
			})
			self.save()
	def save(self):
		with open(self.path, 'w') as config_file:
			json.dump(self, config_file)
class Client(mqtt.Client):
	def __init__(self, config):
		mqtt.Client.__init__(self, config["id"])
		self.config = config
	def start(self):
		self.connect(self.config["broker_address"], self.config["port"]) #connect to broker
		#self.on_message = on_message
		self.subscribe("/feeder/" + self.config["id"] + "/feed")
		self.subscribe("/feeder/" + self.config["id"] + "/schedules/set")
		self.subscribe("/feeder/" + self.config["id"] + "/schedules/unset")
		self.subscribe("/feeder/identify")
		logging.info("Client started, ID = %s" % self.config["id"])
		logging.info("Device Key is %s" % self.config["id"])

		self.setup_schedules()
		self.loop_start()
		while True:
			try:
				schedule.run_pending()
				time.sleep(1)
			except KeyboardInterrupt:
				self.loop_stop()
				break
	def heartbeat(self):
		logging.debug("Sending Heartbeat")
		if schedule.default_scheduler.next_run:
			self.config["nextFeeding"] = schedule.default_scheduler.next_run.isoformat()
		self.publish("/feeder/" + self.config["id"] + "/heartbeat", json.dumps(self.config))
	def feed(self, cups):
		logging.info("Dispensing %.1f cups" % cups)
	def setup_schedules(self):

		schedule.clear("feedings")
		if "schedules" in self.config:
			for schedule_id, sched in self.config["schedules"].iteritems():
				schedule.every().day.at("%s:%s" % (sched["hour"], sched["minute"])).do(self.feed, sched["cups"]).tag("feedings")
	def on_message(self, client, userdata, message):
		try:
			payload = json.loads(message.payload.decode('utf-8'))
		except Exception as e:
			logging.error(str(e))
			logging.error("Payload parsing failed. Payload = %s" % message.payload)
			return
		if message.topic == "/feeder/identify":
			self.heartbeat()
		elif message.topic == "/feeder/%s/schedules/set" % self.config["id"]:
			if not "schedules" in self.config:
				logging.debug("Creating schedules object")
				self.config["schedules"] = {}
			if payload["schedule"]["deleted"]:
				logging.info("Deleting schedule: %s" % self.config["schedules"][payload["schedule"]["id"]])
				del self.config["schedules"][payload["schedule"]["id"]]
			del payload["schedule"]["deleted"]
			logging.info("Setting Schedule: %s" % payload["schedule"])
			self.config["schedules"][payload["schedule"]["id"]] = payload["schedule"]
			self.config.save()
			self.setup_schedules()
			self.heartbeat()
		elif message.topic == "/feeder/%s/schedules/unset" % self.config["id"]:
			logging.info("Deleting schedules: %s" % payload["schedules"])
			for schedule in payload["schedules"]:
				del self.config["schedules"][schedule["id"]]

		elif message.topic == "/feeder/" + self.config["id"] + "/feed":
			self.feed(payload["cups"])
			config["lastFeeding"] = datetime.datetime.now().isoformat()
			self.publish("/feeders/" + self.config["id"] + "/feeding", json.dumps(self.config))
			self.config.save()
		else:
			logging.debug("Topic = %s, Message = %s" % (message.topic, payload))
if __name__ == "__main__":
	config = Config("config.json")
	c = Client(config)
	mqttHandler = MQTTHandler(c)
	#mqttHandler.setLevel(logging.DEBUG)
	console  = logging.StreamHandler()  
	logger = logging.getLogger()
	mqttHandler.setFormatter(logging.Formatter('{"time":"%(asctime)s", "level":"%(levelname)s", "message":"%(message)s"}'))
	logger.addHandler(console)  
	logger.setLevel(logging.DEBUG)	 
	logger.addHandler(mqttHandler)

	c.start()

