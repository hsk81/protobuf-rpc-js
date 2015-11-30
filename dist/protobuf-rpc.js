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
(function () {
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    window.assert = console.assert.bind(console);

///////////////////////////////////////////////////////////////////////////////

    function mine(fn) {
        return function () {
            return fn.apply(this, [this].concat(Array.prototype.slice.call(
                arguments
            )));
        };
    }

    function map_to(service_cls) {
        var map = {};

        var t_cls_fqn = service_cls.$type.fqn();
        assert(t_cls_fqn);
        var t_cls = service_cls.$type.builder.lookup(t_cls_fqn);
        assert(t_cls);
        var t_rpc_methods = t_cls.getChildren(dcodeIO.ProtoBuf.Reflect.Service.RPCMethod);
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

    var Transport = {
        Ws: function (opts) {
            this.open = function (url) {
                this.socket = new WebSocket(url);
                this.socket.binaryType = opts && opts.binaryType||'arraybuffer';
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
        },
        Xhr: function (opts) {
            this.open = function (url) {
                this.socket = new function () {
                    var me = this; setTimeout(function () {
                        if (me.onopen) me.onopen();
                    }, 0);
                };
                this.url = url;
            };
            this.send = function (buffer, msg_callback, err_callback) {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', this.url, !opts||!opts.sync);
                xhr.onreadystatechange = function () {
                    if (this.readyState !== this.DONE) {
                        return;
                    }
                    if (this.status === 200) {
                        var bb = dcodeIO.ByteBuffer.fromBinary(
                            this.response
                        );
                        msg_callback(bb.toArrayBuffer());
                    } else {
                        err_callback(this.statusText);
                    }
                };
                xhr.send(new Uint8Array(buffer));
            };
        }
    };

///////////////////////////////////////////////////////////////////////////////

    var Encoding = {
        Binary: {
            rpc: {
                encode: function (msg) {
                    return msg.toBuffer();
                },
                decode: function (cls, buf) {
                    return cls.decode(buf);
                }
            },
            msg: {
                encode: function (msg) {
                    return msg.toBuffer();
                },
                decode: function (cls, buf) {
                    return cls.decode(buf);
                }
            }
        },
        Json: {
            rpc: {
                encode: function (msg) {
                    return msg.encodeJSON();
                },
                decode: function (cls, buf) {
                    return cls.decodeJSON(buf);
                }
            },
            msg: {
                encode: function (msg) {
                    return msg.encodeJSON();
                },
                decode: function (cls, buf) {
                    return cls.decodeJSON(buf);
                }
            }
        },
        Base64: {
            rpc: {
                encode: function (msg) {
                    return msg.encode64();
                },
                decode: function (cls, buf) {
                    return cls.decode64(buf);
                }
            },
            msg: {
                encode: function (msg) {
                    return msg.encode64();
                },
                decode: function (cls, buf) {
                    return cls.decode64(buf);
                }
            }
        },
        Hex: {
            rpc: {
                encode: function (msg) {
                    return msg.encodeHex();
                },
                decode: function (cls, buf) {
                    return cls.decodeHex(buf);
                }
            },
            msg: {
                encode: function (msg) {
                    return msg.encodeHex();
                },
                decode: function (cls, buf) {
                    return cls.decodeHex(buf);
                }
            }
        },
        Delimited: {
            rpc: {
                encode: function (msg) {
                    return msg.encodeDelimited();
                },
                decode: function (cls, buf) {
                    return cls.decodeDelimited(buf);
                }
            },
            msg: {
                encode: function (msg) {
                    return msg.encodeDelimited();
                },
                decode: function (cls, buf) {
                    return cls.decodeDelimited(buf);
                }
            }
        }
    };

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
            self.transport = new Transport.Ws();
            self.transport.open(self.url);
        } else {
            self.transport = typeof opts.transport === 'function' ?
                new opts.transport() : opts.transport;
            assert(self.transport.open, 'transport.open required');
            self.transport.open(self.url);
            assert(self.transport.send, 'transport.send required');
        }
        service_cls.prototype.transport = self.transport;
        assert(service_cls.prototype.transport);

        assert(self.encoding === undefined);
        if (opts.encoding === undefined) {
            self.encoding = Encoding.Binary;
        } else {
            self.encoding = typeof opts.encoding === 'function' ?
                new opts.encoding() : opts.encoding;
            if (self.encoding.rpc === undefined) {
                self.encoding.rpc = Encoding.Binary.rpc;
            } else {
                if (self.encoding.rpc.encode === undefined)
                    self.encoding.rpc.encode = Encoding.Binary.rpc.encode;
                if (self.encoding.rpc.decode === undefined)
                    self.encoding.rpc.decode = Encoding.Binary.rpc.decode;
            }
            if (self.encoding.msg === undefined) {
                self.encoding.msg = Encoding.Binary.msg;
            } else {
                if (self.encoding.msg.encode === undefined)
                    self.encoding.msg.encode = Encoding.Binary.msg.encode;
                if (self.encoding.msg.decode === undefined)
                    self.encoding.msg.decode = Encoding.Binary.msg.decode;
            }
        }
        service_cls.prototype.encoding = self.encoding;
        assert(service_cls.prototype.encoding);

        assert(self.return_cls === undefined);
        if (opts.return_cls === undefined) {
            self.return_cls = map_to(service_cls)
        } else {
            self.return_cls = opts.return_cls;
        }

        assert(self.rpc_message === undefined);
        if (opts.rpc_message === undefined) {
            var rpc_factory = dcodeIO.ProtoBuf.loadProto(
                'syntax = "proto3"; message Rpc {' +
                    'message Request {' +
                        'string name=1; fixed32 id=2; bytes data=3;' +
                    '}' +
                    'message Response {' +
                        'fixed32 id=2; bytes data=3;' +
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
            var rpc_res = self.encoding.rpc.decode(self.rpc_message.Response, buf);
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
                id: crypto.getRandomValues(new Uint32Array(1))[0],
                data: self.encoding.msg.encode(req),
                name: method
            });
            self.do_msg[rpc_req.id] = function (buf) {
                callback(null, self.encoding.msg.decode(self.return_cls[method], buf));
            };
            self.transport.send(
                self.encoding.rpc.encode(rpc_req), self.on_msg, function (err) {
                    if (err) self.on_err(err, rpc_req.id, callback);
                }
            );
        });
    });

///////////////////////////////////////////////////////////////////////////////

    dcodeIO.ProtoBuf.Rpc = function (url, service_cls, opts) {
        return new Service(url, service_cls, opts);
    };

    dcodeIO.ProtoBuf.Rpc.Encoding = Encoding;
    dcodeIO.ProtoBuf.Rpc.Transport = Transport;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
}());