data      = new Meteor.Collection("data");
users     = new Meteor.Collection("users");
config    = new Meteor.Collection("config");

Meteor.publish("users", function () {
  return users.find({});
});
Meteor.publish("data", function () {
  return data.find({});
});
Meteor.publish("config", function () {
  return config.find({});
});

Meteor.startup(function () {
  Meteor.methods({
    removeAll: function() {
      data.remove({});
    }
  });
});