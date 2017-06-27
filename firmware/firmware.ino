#include <TimeAlarms.h>

#define dtNBR_ALARMS 21
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
#define HEARTBEAT_JSON_SIZE (JSON_OBJECT_SIZE(50))




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



// alarm struct
struct ALARM {
  int hour;
  int minute;
  int cups;
  bool enabled;
};
ALARM alarms[dtNBR_ALARMS];
AlarmID_t alarm_ids[dtNBR_ALARMS];
void feed1cups() {
  feed(1);
}
void feed2cups() {
  feed(2);
}
void feed3cups() {
  feed(3);
}
void feed4cups() {
  feed(4);
}
void feed5cups() {
  feed(5);
}
void feed6cups() {
  feed(6);
}
void feed7cups() {
  feed(7);
}
void feed8cups() {
  feed(8);
}
void setupAlarms() {
  resetAlarms();
  for (int i = 0; i < dtNBR_ALARMS; i++) {
    if (alarms[i].enabled) {
      switch (alarms[i].cups) {
        case 1:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed1cups);
          break;
        case 2:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed2cups);
          break;
        case 3:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed3cups);
          break;
        case 4:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed4cups);
          break;
        case 5:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed5cups);
          break;
        case 6:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed6cups);
          break;
        case 7:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed7cups);
          break;
        case 8:
          alarm_ids[i] = Alarm.alarmRepeat(alarms[i].hour, alarms[i].minute, 0, feed8cups);
          break;
      }
    }
  }
}
void resetAlarms() {
  for (int i = 0; i < dtNBR_ALARMS; i++) {
    if (Alarm.isAlarm(alarm_ids[i])) {
      Alarm.free(alarm_ids[i]);
    }
  }
}
void setAlarms(String payload) {
  Serial.println(payload);
  Serial.print("BUFF SIZE: ");
  Serial.println(HEARTBEAT_JSON_SIZE);
  StaticJsonBuffer<HEARTBEAT_JSON_SIZE> jsonBuffer;
  JsonObject& root = jsonBuffer.parseObject(payload);
  int i = root["schedule"]["id"];
  alarms[i].enabled = true;
  alarms[i].minute = root["schedule"]["minute"];
  alarms[i].hour = root["schedule"]["hour"];
  alarms[i].cups = root["schedule"]["cups"];
  setupAlarms();
  writeUUID();
}
void unsetAlarm(String payload) {
  Serial.println(payload);
  Serial.print("BUFF SIZE: ");
  Serial.println(HEARTBEAT_JSON_SIZE);
  StaticJsonBuffer<HEARTBEAT_JSON_SIZE> jsonBuffer;
  JsonObject& root = jsonBuffer.parseObject(payload);
  int i = root["schedule"]["id"];
  alarms[i].enabled = false;
  alarms[i].minute = -1;
  alarms[i].hour = -1;
  alarms[i].cups = -1;
}

void readUUID() {
  EEPROM.get(0, uuid);
  EEPROM.get(16, alarms);
}
void writeUUID() {
  EEPROM.put(0, uuid);
  EEPROM.put(16, alarms);
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
  setupAlarms();
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
  JsonArray& schedules = root.createNestedArray("schedules");
  for (int i = 0; i < dtNBR_ALARMS; i++) {
    if (alarms[i].enabled) {
      JsonObject& nested = schedules.createNestedObject();
      nested["minute"] = alarms[i].minute;
      nested["hour"] = alarms[i].hour;
      nested["cups"] = alarms[i].cups;
      nested["id"] = i;
    }
  }
  String strObj;
  root.printTo(strObj);
  Serial.println(strObj);
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
  client.subscribe("/feeder/" + ID + "/schedules/set");
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
void feed(int cups) {
  for (int i = 0; i < cups; i++) {
    dispense();
  }
  StaticJsonBuffer<HEARTBEAT_JSON_SIZE> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["time"] = timeClient.getFormattedTime();
  String strObj;
  root.printTo(strObj);
  client.publish("/feeder/" + ID + "/feeding", strObj);
}
void loop() {

  client.loop();
  Alarm.delay(10); // <- fixes some issues with WiFi stability
  timeClient.update();
  setTime(timeClient.getEpochTime());
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
    feed(cups);
  } else if (topic == "/feeder/identify") {
    heartbeat();
  } else if (topic == "/feeder/" + ID + "/schedules/set") {
    Serial.println("Setting schedule");
    setAlarms(payload);
  } else if (topic == "/feeder/" + ID + "/schedules/unset") {
    Serial.println("Deleting schedule");
    unsetAlarm(payload);
  }
}
