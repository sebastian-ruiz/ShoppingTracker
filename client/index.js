data      = new Meteor.Collection("data");
users     = new Meteor.Collection("users");
config    = new Meteor.Collection("config");

Session.setDefault('totalSpent',     '0');
renderedShopping = false;

// ID of currently selected list
Session.setDefault('item_id', null);
// When editing a list name, ID of the list
Session.setDefault('editing_id', null);
Session.setDefault('editing_field', null);

Session.set('reactiveTime', "");
var reactiveTime = 1;
var DateFormats = {
       short: "ddd, HH:mm:ss",
       long: "dddd DD.MM.YYYY HH:mm:ss"
};

UI.registerHelper("formatMoney", function(money){
  return "€" + money.toFixed(2);
});
UI.registerHelper("formatDate", function(datetime, format) {
  if (moment) {
    if(format == "time") {
      f = DateFormats["short"];

      return moment.utc(datetime, "X").format("HH:mm");
    } else if(format == "relative") {

      Session.get("reactiveTime");
      return moment(datetime, "X").fromNow();
    } else {
      f = DateFormats[format];

      Session.get("reactiveTime");
      return moment(datetime, "X").format(f) + " - " + moment(datetime, "X").fromNow(); //moment.utc(TimeSync.serverTime(), "X").format(" ")
    }
  }
  else {
    return datetime;
  }
});
Meteor.setInterval(function() {
  Session.set("reactiveTime", reactiveTime++);
}, 1000);

UI.registerHelper("shorten", function(string, length) {
  var trimmedString = string.substring(0, length);
  return trimmedString;
});

Template.navbar.helpers({
  activeIfTemplateIs: function (template) {
    var currentRoute = Router.current();
    return currentRoute &&
      template === currentRoute.lookupTemplate() ? 'active' : '';
  }
});

Template.shopping.rendered = function() {
  console.log("rendered");
  refreshSpent();
  renderedShopping = true;
}
refreshSpent = function() {
  var totalSpent= 0;
  var usersArr = users.find({}).fetch();
  var nameArr = [];
  var dataArr = data.find({}, {fields: {name: 1, price: 1} }).fetch();
  console.log("dataArr ", dataArr, " usersArr, ", usersArr);

  for (var i = usersArr.length - 1; i >= 0; i--) {
    //Iterate through each user.
    var user = users.findOne({name: usersArr[i].name});
    users.update({_id: user._id}, {$set: {spent: 0} });
    nameArr.push(usersArr[i].name);
  };

  for (var i = dataArr.length -1; i >= 0; i--) {
    if(nameArr.indexOf(dataArr[i].name) != -1) {
      //name exists. Find name in user collection.
      var user = users.findOne({name: dataArr[i].name});
      // console.log("user ", user, "spent ", (parseFloat(dataArr[i].price) + parseFloat(user.spent)));
      users.update({_id: user._id}, {$inc: {spent: parseFloat(dataArr[i].price)}});
      totalSpent += parseFloat(dataArr[i].price);
    }
  };
  Session.set("totalSpent", totalSpent);
}
Template.header.user = function() {
  return users.find({});
}

Template.header.totalSpent = function() {
  return parseFloat(Session.get("totalSpent"));
}


Template.shopping.objects = function() {
  console.log("objects");
  return data.find({}, {sort: {timestamp: -1}});
}
Template.shopping.helpers({
  joinWithLastUpdate: function() {
    console.log("joining");
    return _.extend({}, this, {joined: true});
  }
});


////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
                 evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };

  return events;
};

var activateInput = function (input) {
  input.focus();
  input.select();
};
Template.shopping.events({
  'mousedown .list': function (evt) { // select list
    // Router.setList(this._id);
    console.log("mousedown")
  },
  'click .link': function (evt) {
    // prevent clicks on <a> from refreshing the page.
    evt.preventDefault();

  },
  'dblclick .link': function (evt, tmpl) { // start editing list name
    Session.set('editing_id', this._id);
    Session.set('editing_field', evt.target.id);
    console.log("#"+evt.target.id+"-input-"+this._id);
    Deps.flush(); // force DOM redraw, so we can focus the edit field
    activateInput(tmpl.find("#"+evt.target.id+"-input-"+this._id));
  },  
  'click #new-item': function (evt) {
    data.insert({name: "(name)", details: "(item details)", price: 0.00, timestamp: (new Date().getTime())/1000})

  },
  'click .delete-item': function (evt) {
    data.remove({_id: this._id});
    refreshSpent();
  }
});

Template.shopping.events(okCancelEvents(
  '#new-item',
  {
    ok: function (text, evt) {
      var id = data.insert({name: text});
      Router.setList(id);
      evt.target.value = "";
    }
  }));

Template.shopping.events(okCancelEvents(
  '.input',
  {
    ok: function (value) {
      console.log("value ", value);
      var field = Session.get('editing_field');
      if(field == "name") {
        data.update(this._id, {$set: {name: value}});
        refreshSpent();
      } else if(field == "details") {
        data.update(this._id, {$set: {details: value}}); 
      } else if(field == "price") {
        data.update(this._id, {$set: {price: parseFloat(value)}});
        refreshSpent();
      } 
      Session.set('editing_id', null);
    },
    cancel: function () {
      Session.set('editing_id', null);
    }
  }
));
Template.shopping.selected = function () {
  return Session.equals('item_id', this._id) ? 'selected' : '';
};

Template.shopping.name_class = function () {
  return this.name ? '' : 'empty';
};

Template.shopping.editingName = function () {
  return (Session.equals('editing_id', this._id) && Session.equals('editing_field', 'name'));
};
Template.shopping.editingDetails = function () {
  return (Session.equals('editing_id', this._id) && Session.equals('editing_field', 'details'));
};
Template.shopping.editingPrice = function () {
  return (Session.equals('editing_id', this._id) && Session.equals('editing_field', 'price'));
};