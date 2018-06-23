var mongoose = require('mongoose');

var Schema = mongoose.Schema;

//create schema for saving comments
var CommentSchema = new Schema({
  name: {
    type: String
  },
  body: {
    type: String,
    required: true
  }
});

var Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;