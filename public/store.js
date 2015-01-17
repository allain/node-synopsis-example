module.exports = Store;

var EventEmitter = require('events').EventEmitter;
var reconnect = require('reconnect');
var inherits = require('util').inherits;
var jiff = require('jiff');
var MuxDemux = require('mux-demux');
var through2 = require('through2');
var jsonPatchStream = require('json-patch-stream');

inherits(Store, EventEmitter);

function Store(name, endPoint) {
  if (typeof name !== 'string') throw new Error('store must be given a name');
  if (!/^[a-z][a-z0-9]*$/.test(name)) throw new Error('Invalid store name given');

  EventEmitter.call(this);

  var self = this;

  var doc = JSON.parse(localStorage['store-' + name] || '{}');
  var patchCount = parseInt(localStorage['store-' + name + '-end'] || '0', 10) || 0;

  endPoint = endPoint || '/sync';

  var debug = require('debug')('store:' + name);

  var initialized = false;

  
  debug('emitting change', doc);

  var patchStream;

  reconnect(function (stream) {
    stream.write(name + '/' + patchCount);

    patchStream = stream;

    stream.pipe(through2.obj(function(update, enc, next) {
      if (!Array.isArray(update)) {  
        debug('error notification received');
        console.error(update);
        return next();
      }

      // update = [patch, end]
      debug('update received', update);

      self.emit('patch', update);

      var newDoc = jiff.patch(update[0], doc);
      localStorage['store-' + name + '-end'] = update[1];
      localStorage['store-' + name] = JSON.stringify(newDoc);
      doc = newDoc;

      self.emit('change', doc);
      next();
    }));

    stream.on('error', function(err) {
      console.log(err);
    });

    if (!initialized) {
      self.emit('ready');
      self.emit('change', doc);
      initialized = false;
    }
  }).connect(endPoint);

  this.update = function(newDoc) {
    try {
      var patch = jiff.diff(doc, newDoc, function(obj) {
        return obj.id || obj._id || obj.hash || JSON.stringify(obj);
      });

      var written = patchStream.write(patch);
      if (!written) {
        debug('error writing patch to stream');
      }
    } catch (e) {
      debug('unable to generate patch', e);
    }
  };
}
