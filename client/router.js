Router.configure({
  layoutTemplate: 'home',
  loadingTemplate: 'loading',
  notFoundTemplate: 'notfound'
});

Router.onBeforeAction('loading');

Router.map(function () {
  this.route('dashboard', {
    path: '/',
    template: 'dashboard',
    waitOn: function() {
      return [Meteor.subscribe("users"), Meteor.subscribe("data"), Meteor.subscribe("config")];
    }
  });
});
