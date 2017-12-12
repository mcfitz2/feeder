var mongoose = require('mongoose');


var Schema = mongoose.Schema;

var scheduleSchema = new Schema({
    id: Number,
    minute:Number,
    hour:Number,
    cups:Number,
});

var feederSchema = new Schema({
    _id: String,
    name: String,
    lastSeen: Date,
    lastFeeding: Date,
    schedules:[scheduleSchema],
    owner:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
});



module.exports = {Feeder:mongoose.model('Feeder', feederSchema), Schedule:mongoose.model('Schedule', scheduleSchema)};