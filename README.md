# feeder
Arduino powered Pet Feeder with a Node.js backend running on Docker

This project consists of a NodeMCU board hacked into a cheap automatic pet feeder and a Node.js backend. The feeders communicate with the backend via MQTT and the backend keeps track of their status and allows the user to set schedules, meal size, and also manually feed their pets from anywhere. 

The goal is to have a simple interface for the user and have redundancies built into the feeder so that pets are always fed even if the power goes out or the internet is down. Future versions will store all the schedule information in the EEPROM and will have support for backup batteries and a real time clock. 
