var mongoose = require('mongoose');


var Schema = mongoose.Schema;



var feederSchema = new Schema({
    _id: String,
    name: String,
    lastSeen: Date,
    lastFeeding: Date,
    schedules:[Object],
});



module.exports = mongoose.model('Feeder', feederSchema);