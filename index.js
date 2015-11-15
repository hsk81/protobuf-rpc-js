///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ProtoBuf = require('protobufjs'),
    WebSocket = require('ws');

var assert = require('assert'),
    crypto = require('crypto');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var RpcFactory = ProtoBuf.loadProtoFile({
    root: 'protocol', file: 'rpc.proto'
});

assert.ok(RpcFactory);
var Rpc = RpcFactory.build('Rpc');
assert.ok(Rpc);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function mine(fn) {
    return function () {
        return fn.apply(this, [this].concat(Array.prototype.slice.call(
            arguments
        )));
    };
}

///////////////////////////////////////////////////////////////////////////////

exports.Service = mine(function (self, url, service_cls, return_cls) {

    assert.ok(url, 'WebSocket URL required');
    assert.ok(service_cls, 'Service class required');
    assert.ok(return_cls, 'Method to return class map required');

    self._handler = {};
    self._ws = new WebSocket(url);
    self._ws.on('message', function (data) {
        var service_res = Rpc.Response.decode(data);
        if (self._handler[service_res.id]) {
            self._handler[service_res.id](service_res.data);
            delete self._handler[service_res.id];
        }
    });

    var service = new service_cls(function (method, req, callback) {
        crypto.randomBytes(4, function (ex, buf) {

            if (ex) {
                callback(ex, null);
            } else {
                var rpc_req = new Rpc.Request({
                    name: method, id: buf.readUInt32LE(), data: req.toBuffer()
                });

                self._handler[rpc_req.id] = function (data) {
                    callback(null, return_cls[method].decode(data));
                };

                self._ws.send(rpc_req.toBuffer(), function (error) {
                    if (error) {
                        delete self._handler[rpc_req.id];
                        callback(error, null);
                    }
                });
            }
        });
    });

    service.socket = self._ws;
    return service;
});

///////////////////////////////////////////////////////////////////////////////

exports.loadProtocolFile = function (path, name) {
    var factory = ProtoBuf.loadProtoFile(path);
    if (factory) return factory.build(name);
};

exports.loadProtocol = function (protocol) {
    return ProtoBuf.loadProto(protocol);
};

exports.Rpc = Rpc;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
