var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');


var Schema = mongoose.Schema;



var userSchema = new Schema({
    firstName: String,
    lastName: String,
    email: {
        type: String,
        unique: true
    },
});
userSchema.plugin(passportLocalMongoose);



module.exports = mongoose.model('User', userSchema);