/*
 Copyright 2015 Hasan Karahan <hasan.karahan@blackhan.com>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license protobuf-rpc.js (c) 2015 Hasan Karahan <hasan.karahan@blackhan.com>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/hsk81/protobuf-rpc-js for details
 */

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ProtoBuf = require('protobufjs'),
    WebSocket = require('ws');

var assert = require('assert'),
    crypto = require('crypto');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function mine (fn) {
    return function () {
        return fn.apply(this, [this].concat(Array.prototype.slice.call(
            arguments
        )));
    };
}

function map_to (service_cls) {
    var map = {};

    var t_cls_fqn = service_cls.$type.fqn();
    assert(t_cls_fqn);
    var t_cls = service_cls.$type.builder.lookup(t_cls_fqn);
    assert(t_cls);
    var t_rpc_methods = t_cls.getChildren(ProtoBuf.Reflect.Service.RPCMethod);
    assert(t_rpc_methods);

    t_rpc_methods.forEach(function (t_rpc_method) {
        var key = t_cls_fqn + '.' + t_rpc_method.name;
        assert(key);
        map[key] = t_rpc_method.resolvedResponseType.clazz;
        assert(map[key]);
    });

    return map;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var Service = mine(function (self, service_cls, opts) {
    assert(service_cls, 'Service class required');

    if (opts === undefined) {
        opts = {};
    }

    assert(self.url === undefined);
    if (opts.url === undefined) {
        self.url = 'ws://localhost:80'
    } else {
        self.url = opts.url;
    }
    service_cls.prototype.url = self.url;
    assert(service_cls.prototype.url);

    assert(self.transport === undefined);
    if (opts.transport === undefined) {
        self.transport = new function () {
            this.open = function (url) {
                this.socket = new WebSocket(url);
            };
            this.send = function (buffer, msg_callback, err_callback) {
                this.socket.onmessage = function (ev) {
                    msg_callback(ev.data);
                };
                this.socket.onerror = function (err) {
                    err_callback(err);
                };
                this.socket.send(buffer);
            };
        }();
        self.transport.open(self.url);
    } else {
        self.transport = new opts.transport();
        assert(self.transport.open, 'transport.open required');
        self.transport.open(self.url);
        assert(self.transport.send, 'transport.send required');
    }
    service_cls.prototype.transport = self.transport;
    assert(service_cls.prototype.transport);

    assert(self.protocol === undefined);
    if (opts.protocol === undefined) {
        self.protocol = new function () {
            this.rpc_encode = function (msg) {
                return msg.toBuffer();
            };
            this.rpc_decode = function (cls, buf) {
                return cls.decode(buf);
            };
            this.msg_encode = function (msg) {
                return msg.toBuffer();
            };
            this.msg_decode = function (cls, buf) {
                return cls.decode(buf);
            }
        };
    } else {
        self.protocol = new opts.protocol();
        if (self.protocol.rpc_encode === undefined) {
            self.protocol.rpc_encode = function (msg) {
                return msg.toBuffer();
            };
        }
        if (self.protocol.rpc_decode === undefined) {
            self.protocol.rpc_decode = function (cls, buf) {
                return cls.decode(buf);
            };
        }
        if (self.protocol.msg_encode === undefined) {
            self.protocol.msg_encode = function (msg) {
                return msg.toBuffer();
            };
        }
        if (self.protocol.msg_decode === undefined) {
            self.protocol.msg_decode = function (cls, buf) {
                return cls.decode(buf);
            };
        }
    }
    service_cls.prototype.protocol = self.protocol;
    assert(service_cls.prototype.protocol);

    assert(self.return_cls === undefined);
    if (opts.return_cls === undefined) {
        self.return_cls = map_to(service_cls)
    } else {
        self.return_cls = opts.return_cls;
    }

    assert(self.rpc_message === undefined);
    if (opts.rpc_message === undefined) {
        var rpc_factory = ProtoBuf.loadProto(
            'syntax = "proto3"; message Rpc {' +
                'message Request {' +
                    'string name=1; uint32 id=2; bytes data=3;' +
                '}' +
                'message Response {' +
                    'uint32 id=2; bytes data=3;' +
                '}' +
            '}'
        );
        self.rpc_message = rpc_factory.build('Rpc');
    } else {
        self.rpc_message = opts.rpc_message;
    }

    assert(self.do_msg === undefined);
    self.do_msg = {};

    assert(self.on_msg === undefined);
    self.on_msg = function (buf) {
        var rpc_res = self.protocol.rpc_decode(self.rpc_message.Response, buf);
        if (self.do_msg[rpc_res.id]) {
            self.do_msg[rpc_res.id](rpc_res.data);
            delete self.do_msg[rpc_res.id];
        }
    };

    assert(self.on_err === undefined);
    self.on_err = function (err, id, callback) {
        delete self.do_msg[id];
        callback(err, null);
    };

    return new service_cls(function (method, req, callback) {
        var rpc_req = new self.rpc_message.Request({
            id: crypto.randomBytes(4).readUInt32LE(),
            data: self.protocol.msg_encode(req),
            name: method
        });
        self.do_msg[rpc_req.id] = function (buf) {
            callback(null, self.protocol.msg_decode(self.return_cls[method], buf));
        };
        self.transport.send(
            self.protocol.rpc_encode(rpc_req), self.on_msg, function (err) {
                if (err) self.on_err(err, rpc_req.id, callback);
            }
        );
    });
});

///////////////////////////////////////////////////////////////////////////////

module.exports = function (url, service_cls, opts) {
    return new Service(url, service_cls, opts);
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
