/* Copyright (c) 2018 Hasan Karahan <hasan.karahan@blackhan.com> */

let ByteBuffer = require('bytebuffer')
    ProtoBuf = require('protobufjs');
let WebSocket = require('ws'),
    XMLHttpRequest = require('xhr2').XMLHttpRequest;

let assert = require('assert'),
    crypto = require('crypto');

function mine(fn) {
    return function () {
        return fn.apply(this, [this].concat(Array.prototype.slice.call(
            arguments
        )));
    };
}

let Transport = {
    Ws: function (opts) {
        this.open = mine(function (self, url) {
            this.socket = new WebSocket(url);
        });
        this.send = function (buf, msg_cb, err_cb) {
            this.socket.onmessage = function (ev) {
                msg_cb(ev.data);
            };
            this.socket.onerror = function (err) {
                err_cb(err);
            };
            this.socket.send(buf);
        };
    },
    Xhr: function (opts) {
        this.open = mine(function (self, url) {
            setTimeout(function () { self.socket.emit('open'); }, 0);
            self.socket = new ProtoBuf.util.EventEmitter();
            self.url = url;
        });
        this.send = function (buf, msg_cb, err_cb) {
            let xhr = new XMLHttpRequest();
            xhr.open('POST', this.url, !opts||!opts.sync);
            xhr.onreadystatechange = function () {
                if (this.readyState !== this.DONE) {
                    return;
                }
                if (this.status === 200) {
                    msg_cb(ByteBuffer.fromBinary(
                        this.responseText
                    ).toBuffer());
                } else {
                    err_cb(this.statusText);
                }
            };
            xhr.send(buf);
        };
    }
};

let Encoding = {
    Binary: function (opts) {
        return {
            encode: function (obj, cls) {
                return cls.encode(obj);
            },
            decode: function (buf, cls) {
                return cls.decode(buf);
            }
        };
    },
    Delimited: function (opts) {
        return {
            encode: function (obj, cls) {
                return cls.encodeDelimited(obj);
            },
            decode: function (buf, cls) {
                return cls.decodeDelimited(buf);
            }
        };
    }
};

let Service = mine(function (self, service_cls, opts) {
    assert(service_cls, 'service_cls required');

    if (opts === undefined) {
        opts = {};
    }

    assert(self.url === undefined);
    if (opts.url === undefined) {
        self.url = 'ws://localhost:80'
    } else {
        self.url = opts.url;
    }

    assert(self.transport === undefined);
    if (opts.transport === undefined) {
        self.transport = new Transport.Ws;
        self.transport.open(self.url);
    } else {
        self.transport = typeof opts.transport === 'function' 
            ? new opts.transport() : opts.transport;
        assert(self.transport.open, 'transport.open required');
        assert(self.transport.send, 'transport.send required');
        self.transport.open(self.url);
    }

    assert(self.encoding === undefined);
    if (opts.encoding === undefined) {
        self.encoding = new Encoding.Binary;
    } else {
        self.encoding = typeof opts.encoding === 'function'
            ? new opts.encoding() : opts.encoding;
        assert(self.encoding.encode, 'encoding.encode required');
        assert(self.encoding.decode, 'encoding.decode required');
    }

    assert(self.response_cls === undefined);
    if (opts.response_cls === undefined) {
        self.response_cls = {};
        service_cls.methodsArray.forEach(function (m) {
            if (m.resolved !== true) {
                m.resolve();
            }
            self.response_cls[m.fullName] = m.resolvedResponseType;
            assert(self.response_cls[m.fullName]);
        });
    } else {
        self.response_cls = opts.response_cls;
    }

    assert(self.rpc_message === undefined);
    if (opts.rpc_message === undefined) {
        let rpc_factory = ProtoBuf.Root.fromJSON({
            nested: {
                "Rpc": {
                    nested: {
                        "Request": {
                            fields: {
                                "name": {
                                    id: 1, type: "string"
                                },
                                "id": {
                                    id: 2, type: "fixed32"
                                },
                                "data": {
                                    id: 3, type: "bytes"
                                }
                            }
                        },
                        "Response": {
                            fields: {
                                "id": {
                                    id: 2, type: "fixed32"
                                },
                                "data": {
                                    id: 3, type: "bytes"
                                }
                            }
                        }
                    }
                }
            }
        });
        self.rpc_message = rpc_factory.lookup('Rpc');
    } else {
        self.rpc_message = opts.rpc_message;
    }

    assert(self.do_msg === undefined);
    self.do_msg = {};
    assert(self.do_err === undefined);
    self.do_err = {};

    assert(self.on_msg === undefined);
    self.on_msg = function (buf) {
        let rpc_res = self.encoding.decode(
            buf, self.rpc_message.Response
        );
        if (self.do_msg[rpc_res.id]) {
            self.do_msg[rpc_res.id](rpc_res.data);
        }
    };

    assert(self.on_err === undefined);
    self.on_err = function (err, random_id) {
        if (self.do_err[random_id]) {
            self.do_err[random_id](err);
        }
    };

    let service = service_cls.create(function (ended) {
        return function (method, req, cb) {
            if (ended || !req) {
                ended = true;
                return;
            }

            let random_id = crypto.randomBytes(4).readUInt32LE();
            assert(random_id >= 0);

            let rpc_req = self.encoding.encode({
                name: method.fullName, id: random_id, data: req
            }, self.rpc_message.Request);

            self.do_msg[random_id] = function (buf) {
                if (method.responseStream !== true) {
                    delete self.do_msg[random_id];
                }
                cb(null, self.response_cls[method.fullName].decode(buf));
            };
            self.do_err[random_id] = function (err) {
                if (method.responseStream !== true) {
                    delete self.do_err[random_id];
                }
                cb(err, null);
            };

            self.transport.send(
                rpc_req.finish(), self.on_msg, function (err) {
                    self.on_err(err, random_id);
                }
            );
        };
    }());

    self.transport.socket.on('open', function () {
        service.emit('open', {url: self.url});
    });

    return service;
});

module.exports = function (url, service_cls, opts) {
    return new Service(url, service_cls, opts);
};

module.exports.Encoding = Encoding;
module.exports.Transport = Transport;
