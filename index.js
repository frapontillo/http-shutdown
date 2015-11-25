'use strict';
var http = require('http');
var https = require('https');

/**
 * Expose `addShutdown`.
 */
exports = module.exports = addShutdown;

/**
 * Adds shutdown functionaility to the `http.Server` object
 * @param {http.Server} server The server to add shutdown functionaility to
 */
function addShutdown(server) {
  var connections = {};
  var isShuttingDown = false;
  var connectionCounter = 0;

  function destroy(socket) {
    if (socket._isIdle && isShuttingDown) {
      socket.destroy();
      delete connections[socket._connectionId];
    }
  };

  server.on('request', function(req, res) {
    req.socket._isIdle = false;

    res.on('finish', function() {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });

  server.on('connection', function(socket) {
    var id = connectionCounter++;
    socket._isIdle = true;
    socket._connectionId = id;
    connections[id] = socket;

    socket.on('close', function() {
      delete connections[id];
    });
  });

  server.shutdown = function(cb) {
    isShuttingDown = true;
    server.close(function(err) {
      if (cb) {
        process.nextTick(function() { cb(err) });
      }
    });

    Object.keys(connections).forEach(function(key) {
      destroy(connections[key]);
    });
  };

  return server;
};

/**
 * Extends the {http.Server} object with shutdown functionaility.
 * @return {http.Server} The decorated server object
 */
exports.extend = function() {
  http.Server.prototype.withShutdown = function() {
    return addShutdown(this);
  };

  https.Server.prototype.withShutdown = function() {
    return addShutdown(this);
  };
};
