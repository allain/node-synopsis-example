// file: client.js
var debug = require('debug')('sync-client');

var fs = require('fs')
var through = require('through2').obj;
var SynopsisClient= require('synopsis-client');

var Handlebars = require('handlebars-stream');

var DomDelegate = require('dom-delegate-stream');

var store = window.test = new SynopsisClient('test');
var writable = require('writable');

var $ = require('jquery');

var HtmlPatcherStream = require('html-patcher-stream');

var hello = window.hello = require('hellojs');

// TODO: Refactor this out to a package
var appData = {}
var appState = through(function(chunk, enc, cb) {
  Object.keys(chunk).forEach(function(key) {
    appData[key] = chunk[key];
	});
  this.push(appData);
  cb();
});

$("body").delegate('#google-login', 'click', function(e) {
	hello('google').login();
});

$("body").delegate('#logout', 'click', function(e) {
	hello.logout();
});

var profile = JSON.parse(localStorage['profile'] || 'false');

appState.write({
	profile: profile 
});

hello.on('auth.login', function(auth){
  // call user information, for the given network
	hello(auth.network).api( '/me' ).then( function(r) {
    localStorage['profile'] = JSON.stringify(r);
    appState.write({
			profile: r
		});
	});
});

hello.on('auth.logout', function(){
  localStorage['profile'] = JSON.stringify(r);
  appState.write({
		profile: null
  });
});

hello.init({ 
	google: '100706142658-6iaoqf1pak20cso1shbq7slsmrcaeis6.apps.googleusercontent.com'
}, {redirect_uri:'/redirect.html'});


 
store
.pipe(appState)
/*.pipe(through(function(chunk, enc, cb) {
  console.log(chunk); 
  this.push(chunk);
	cb();
}))*/
.pipe(Handlebars(fs.readFileSync(__dirname + '/ui.hbs', 'utf8')))
.pipe(HtmlPatcherStream(document.getElementById('app')));

var app = DomDelegate(document.getElementById('app'));
app.on('keyup', '#new-todo').pipe(writable({objectMode: true}, function(e) {
  if (e.keyCode != 13) return;

  e.preventDefault();

  addTodo();
}));

app.on('click', '#add-todo').pipe(writable({objectMode: true}, function(e) {
  addTodo();
}));

function addTodo() {
  var title = $('#new-todo').val().trim();
  $('#new-todo').val('');
  
  if (title) {
    store.edit(function(state) {
      state.todos = state.todos || [];
      state.todos.unshift({id: Date.now(), title: title});
    });
  }
}

app.on('click', '.completed').pipe(writable({objectMode: true}, function(e) {
  var id = e.target.dataset.id;

  store.edit(function(state) {
    state.todos = state.todos.filter(function(t) { return t.id != id; });
  });

  $('.completed').removeAttr('checked');
}));
