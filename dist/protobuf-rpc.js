(function () {
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    function AssertException(message) {
        this.message = message;
    }

    AssertException.prototype.toString = function () {
        return 'AssertException: ' + this.message;
    };

    function assert(expression, message) {
        if (!expression) {
            throw new AssertException(message);
        }
        return expression;
    }

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    function mine(fn) {
        return function () {
            return fn.apply(this, [this].concat(Array.prototype.slice.call(
                arguments
            )));
        };
    }

    function fqn(cls) {
        return cls.parent ? fqn(cls.parent) + '.' + cls.name : cls.name;
    }

    function map_to(service_cls) {
        var map = {};

        var t_cls_fqn = fqn(service_cls.$type);
        var t_cls = service_cls.$type.builder.lookup(t_cls_fqn);
        var t_rpc_methods = t_cls.getChildren(
            dcodeIO.ProtoBuf.Reflect.Service.RPCMethod);

        t_rpc_methods.forEach(function (t_rpc_method) {
            var key = t_cls_fqn + '.' + t_rpc_method.name;
            map[key] = t_rpc_method.resolvedResponseType.clazz;
        });

        return map;
    }

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    var Service = mine(function (self, url, service_cls, opts) {

        assert(url, 'WebSocket URL required');
        assert(service_cls, 'Service class required');

        if (opts === undefined) {
            opts = {};
        }
        if (opts.return_cls === undefined) {
            opts.return_cls = map_to(service_cls)
        }
        if (opts.rpc_protocol === undefined) {
            var rpc_factory = dcodeIO.ProtoBuf.loadProto(
                'syntax = "proto3"; message Rpc {' +
                    'message Request {' +
                        'string name=1; uint32 id=2; bytes data=3;' +
                    '}' +
                    'message Response {' +
                        'uint32 id=2; bytes data=3;' +
                    '}' +
                '}'
            );

            opts.rpc_protocol = rpc_factory.build('Rpc');
        }

        self._handler = {};
        self._ws = new WebSocket(url);
        self._ws.binaryType = 'arraybuffer';
        self._ws.onmessage = function (ev) {
            var service_res = opts.rpc_protocol.Response.decode(ev.data);
            if (self._handler[service_res.id]) {
                self._handler[service_res.id](service_res.data);
                delete self._handler[service_res.id];
            }
        };

        var service = new service_cls(function (method, req, callback) {
            var with_id = function (id) {
                var rpc_req = new opts.rpc_protocol.Request({
                    name: method, id: id, data: req.toBuffer()
                });

                self._handler[rpc_req.id] = function (data) {
                    callback(null, opts.return_cls[method].decode(data));
                };

                try {
                    self._ws.send(rpc_req.toBuffer());
                } catch (ex) {
                    delete self._handler[rpc_req.id];
                    callback(ex, null);
                }
            };

            with_id(crypto.getRandomValues(new Uint32Array(1))[0]);
        });

        service.socket = self._ws;
        return service;
    });

///////////////////////////////////////////////////////////////////////////////

    dcodeIO.ProtoBuf.Rpc = function (url, service_cls, opts) {
        return Service(url, service_cls, opts);
    };

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
}());