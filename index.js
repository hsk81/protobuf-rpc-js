///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
/*
var Rpc = require('rpc');
Rpc.Calculator = Rpc.load('calculator.proto');

var calculator_svc = Rpc.Service(
    'ws://127.0.0.1:8088', Rpc.Calculator.Service);

var pair = new Rpc.Calculator.Pair({lhs:1, rhs:2});
calculator_svc.add(pair, function (error, result) {
    if (error) throw error;
    console.log(pair, result);
});
*/
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ProtoBuf = require('protobufjs'),
    WebSocket = require('ws'),
    Path = requre('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ProtocolFactory = function (path) {
    var info = Path.parse(Path.normalize(path));
    return ProtoBuf.loadProtoFile({
        root: info.dir, file: info.base
    });
};

var Protocol = function (factory, name) {
    return factory.build(name);
};

///////////////////////////////////////////////////////////////////////////////

var Rpc = Protocol(ProtocolFactory('src/protocol/rpc.proto'));

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

    assert(url, 'WebSocket URL required');
    assert(service_cls, 'Service class required');
    assert(return_cls, 'Method to return class map required');

    self._handler = {};
    self.socket = new WebSocket(url);
    self.socket.on('message', function (ev) {
        var service_res = Rpc.Response.decode(ev.data);
        if (self._handler[service_res.id]) {
            self._handler[service_res.id](service_res.data);
            delete self._handler[service_res.id];
        }
    });

    return new service_cls(function (method, req, callback) {
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

                self.socket.send(rpc_req.toBuffer(), function (error) {
                    if (error) {
                        delete self._handler[rpc_req.id];
                        callback(error, null);
                    }
                });
            }
        });
    });
});

///////////////////////////////////////////////////////////////////////////////

exports.Rpc = Rpc;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
