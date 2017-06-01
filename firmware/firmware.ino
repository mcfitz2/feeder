#include <ArduinoJson.h>

#include <NTPClient.h>
#include <EEPROM.h>

#include <ESP8266TrueRandom.h>

#include <ESP8266WiFi.h>          //ESP8266 Core WiFi Library (you most likely already have this in your sketch)
#include <DNSServer.h>            //Local DNS Server used for redirecting all requests to the configuration portal
#include <ESP8266WebServer.h>
#include <WiFiManager.h>
#include <MQTTClient.h>


#define SWITCH D5
#define ENABLE D8
#define M1 D7
#define M2 D6
#define dtNBR_ALARMS 21
#define HEARTBEAT_JSON_SIZE (JSON_OBJECT_SIZE(10))

byte uuid[16];
char client_id[16];
String ID;
const char* MQTT_HOST = "micahf.com";
const int MQTT_PORT = 1882;
boolean justBooted = true;
char buf[40];
WiFiManager wifiManager;
WiFiClient net;
MQTTClient client;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP);

void readUUID() {
  EEPROM.get(0, uuid);
}
void writeUUID() {
  EEPROM.put(0, uuid);
  EEPROM.commit();
}
void setup() {
  Serial.begin(115200);

  EEPROM.begin(512);
  readUUID();
  ID = ESP8266TrueRandom.uuidToString(uuid);
  if (ID == "ffffffff-ffff-ffff-ffff-ffffffffffff" || ID == "00000000-0000-0000-0000-000000000000") {
    Serial.println("Generating new UUID");
    ESP8266TrueRandom.uuid(uuid);
    ID = ESP8266TrueRandom.uuidToString(uuid);
    Serial.print("NEW UUID");
    Serial.println(ID);
    writeUUID();
  } else {
    Serial.println("Using existing UUID");
  }
  pinMode(SWITCH, INPUT_PULLUP);
  pinMode(ENABLE, OUTPUT);
  pinMode(M1, OUTPUT);
  pinMode(M2, OUTPUT);

  Serial.println(ID);
  enable_motor();
  reset_pos();
  wifiManager.autoConnect();
  client.begin(MQTT_HOST, MQTT_PORT, net); // MQTT brokers usually use port 8883 for secure connections
  timeClient.begin();

  connect();
}
void heartbeat() {
  Serial.println("/feeder/" + ID + "/heartbeat");
  StaticJsonBuffer<HEARTBEAT_JSON_SIZE> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["time"] = timeClient.getFormattedTime();
  String strObj;
  root.printTo(strObj);
  client.publish("/feeder/" + ID + "/heartbeat", strObj);
}
void connect() {
  Serial.print("\nconnecting...");
  ID.toCharArray(buf, 40);
  while (!client.connect(buf)) {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("\nconnected!");

  client.subscribe("/feeder/" + ID + "/feed");
  client.subscribe("/feeder/" + ID + "/schedule");
  client.subscribe("/feeder/identify");
  heartbeat();
}

void enable_motor() {
  digitalWrite(ENABLE, HIGH);
}
void disable_motor() {
  digitalWrite(ENABLE, LOW);
}
void stop() {
  digitalWrite(M1, LOW);
  digitalWrite(M2, LOW);
}
void forwards() {
  digitalWrite(M1, LOW);
  digitalWrite(M2, HIGH);
}
void dispense() {
  digitalWrite(M1, LOW);
  digitalWrite(M2, HIGH);
  waitWhile(LOW);
  waitWhile(HIGH);
  stop();
}
void waitWhile(boolean state) {
  while (digitalRead(SWITCH) == state) {
    delay(10);
  }
}
void reset_pos() {
  if (digitalRead(SWITCH) == HIGH) {
    backwards();
    waitWhile(HIGH);
    stop();
  }
  backwards();
  waitWhile(LOW);
  forwards();
  waitWhile(HIGH);
  stop();
}
void backwards() {
  digitalWrite(M2, LOW);
  digitalWrite(M1, HIGH);
}
void loop() {

  client.loop();
  delay(10); // <- fixes some issues with WiFi stability
  timeClient.update();

  if (!client.connected()) {
    connect();
  }

}
void messageReceived(String topic, String payload, char * bytes, unsigned int length) {
  if (topic == "/feeder/" + ID + "/feed") {
    Serial.println("Feeding");
    StaticJsonBuffer<200> jsonBuffer;
    JsonObject& root = jsonBuffer.parseObject(payload);
    int cups = root["cups"];
    for (int i = 0; i < cups; i++) {
      dispense();
    }
    StaticJsonBuffer<HEARTBEAT_JSON_SIZE> jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    root["time"] = timeClient.getFormattedTime();
    String strObj;
    root.printTo(strObj);
    client.publish("/feeder/" + ID + "/feeding", strObj);
  } else if (topic == "/feeder/identify") {
    heartbeat();
  }

}
