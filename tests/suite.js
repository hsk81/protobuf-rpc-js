var assert = require('assert');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var spawn = require('child_process').spawn,
    server = spawn('./example/server/js/rpc-server.js', [
        '--xhr-port=18088', '--ws-port=18089'
    ]);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var Suite = require('testjs');
Suite.run = function (tests) {
    setTimeout(function () {
        var ascli = require('ascli').app('test');
        var suite = new Suite(tests, 'ProtoBuf.Rpc');
        Suite.banner();

        var hr_time = process.hrtime(),
            ms_time = Math.round(hr_time[0] * 1E6 + hr_time[1] / 1E3);

        var summarize = function () {
            if (suite.failed.length > 0) {
                ascli.fail(
                    suite.summarize(ms_time), 'test', suite.failed.length);
            } else {
                ascli.ok(
                    suite.summarize(ms_time), 'test');
            }
        };

        server.on('error', function () {
            summarize();
        });
        server.on('close', function () {
            assert(server.killed);
        });
        suite.run(false, function () {
            server.kill();
            summarize();
        });
    }, 600);
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ProtoBuf = require('protobufjs');
assert(ProtoBuf);
ProtoBuf.Rpc = require('../index.js');
assert(ProtoBuf.Rpc);

///////////////////////////////////////////////////////////////////////////////

Suite.run({
    'Message': function (test) {
        var RpcFactory = ProtoBuf.loadProtoFile('protocol/rpc.proto');
        test.ok(RpcFactory);

        var Rpc = RpcFactory.build('Rpc');
        test.ok(Rpc);
        test.ok(Rpc.Request);
        test.ok(Rpc.Response);
        test.done();
    },

    'Transport': function (test) {
        test.ok(ProtoBuf.Rpc.Transport);
        test.ok(ProtoBuf.Rpc.Transport.Ws);
        test.ok(ProtoBuf.Rpc.Transport.Xhr);
        test.done();
    },

    'Encoding': function (test) {
        test.ok(ProtoBuf.Rpc.Encoding);
        test.ok(ProtoBuf.Rpc.Encoding.Binary);
        test.ok(ProtoBuf.Rpc.Encoding.Json);
        test.ok(ProtoBuf.Rpc.Encoding.Base64);
        test.ok(ProtoBuf.Rpc.Encoding.Hex);
        test.ok(ProtoBuf.Rpc.Encoding.Delimited);
        test.done();
    },

    'Api': function (test) {
        var ApiFactory =
            ProtoBuf.loadProtoFile('example/protocol/api.proto');
        test.ok(ApiFactory);

        var Api = ApiFactory.build();
        test.ok(Api);
        test.ok(Api.Reflector);
        test.ok(Api.Calculator);
        test.done();
    },

    'Api.Reflector': {
        'package': function (test) {
            var ReflectorFactory =
                ProtoBuf.loadProtoFile('example/protocol/reflector.proto');
            test.ok(ReflectorFactory);

            var Reflector = ReflectorFactory.build('Reflector');
            test.ok(Reflector);
            test.ok(Reflector.AckRequest);
            test.ok(Reflector.AckResult);
            test.ok(Reflector.Service);
            test.ok(Reflector.Service.ack);
            test.done();
        },

        'encoding': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089'
            });
            test.ok(reflector_svc);
            test.ok(reflector_svc.encoding);
            test.ok(reflector_svc.encoding.rpc);
            test.ok(reflector_svc.encoding.rpc.encode);
            test.ok(reflector_svc.encoding.rpc.decode);
            test.ok(reflector_svc.encoding.msg);
            test.ok(reflector_svc.encoding.msg.encode);
            test.ok(reflector_svc.encoding.msg.decode);
            test.done();
        },

        'transport': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089'
            });
            test.ok(reflector_svc);
            test.ok(reflector_svc.transport);
            test.ok(reflector_svc.transport.socket);
            test.done();
        },

        'ack': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089'
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        },

        'ack-ws': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                url: 'ws://localhost:18089'
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        },

        'ack-ws-binary': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                encoding: ProtoBuf.Rpc.Encoding.Binary,
                url: 'ws://localhost:18089'
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        },

        'ack-xhr': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                transport: new ProtoBuf.Rpc.Transport.Xhr,
                url: 'http://localhost:18088'
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        },

        'ack-xhr-binary': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                transport: new ProtoBuf.Rpc.Transport.Xhr,
                encoding: ProtoBuf.Rpc.Encoding.Binary,
                url: 'http://localhost:18088'
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        },

        'ack-rpc-message': function (test) {
            var RpcFactory = ProtoBuf.loadProto(
                'syntax = "proto3"; message Rpc {' +
                'message Request {' +
                'string name=1; uint32 id=2; bytes data=3;' +
                '}' +
                'message Response {' +
                'uint32 id=2; bytes data=3;' +
                '}' +
                '}'
            );

            test.ok(RpcFactory);
            var Rpc = RpcFactory.build('Rpc');
            test.ok(Rpc);

            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089', rpc_message: Rpc
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        },

        'ack-return-cls': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089', return_cls: {
                    '.Reflector.Service.ack': Api.Reflector.AckResult
                }
            });
            reflector_svc.transport.socket.on('open', function () {
                var req = new Api.Reflector.AckRequest({
                    timestamp: new Date().toISOString()
                });
                reflector_svc.ack(req, function (error, res) {
                    test.equal(error, null);
                    test.ok(res.timestamp);
                    test.done();
                });
            });
        }
    },

    'Api.Calculator': {
        'package': function (test) {
            var CalculatorFactory =
                ProtoBuf.loadProtoFile('example/protocol/calculator.proto');
            test.ok(CalculatorFactory);

            var Calculator = CalculatorFactory.build('Calculator');
            test.ok(Calculator);
            test.ok(Calculator.Service);
            test.ok(Calculator.AddRequest);
            test.ok(Calculator.AddResult);
            test.ok(Calculator.Service.add);
            test.ok(Calculator.SubRequest);
            test.ok(Calculator.SubResult);
            test.ok(Calculator.Service.sub);
            test.ok(Calculator.MulRequest);
            test.ok(Calculator.MulResult);
            test.ok(Calculator.Service.mul);
            test.ok(Calculator.DivRequest);
            test.ok(Calculator.DivResult);
            test.ok(Calculator.Service.div);
            test.done();
        },

        'encoding': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                url: 'ws://localhost:18089'
            });
            test.ok(calculator_svc);
            test.ok(calculator_svc.encoding);
            test.ok(calculator_svc.encoding.rpc);
            test.ok(calculator_svc.encoding.rpc.encode);
            test.ok(calculator_svc.encoding.rpc.decode);
            test.ok(calculator_svc.encoding.msg);
            test.ok(calculator_svc.encoding.msg.encode);
            test.ok(calculator_svc.encoding.msg.decode);
            test.done();
        },

        'transport': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                url: 'ws://localhost:18089'
            });
            test.ok(calculator_svc);
            test.ok(calculator_svc.transport);
            test.ok(calculator_svc.transport.socket);
            test.done();
        },

        'add': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                encoding: ProtoBuf.Rpc.Encoding.Binary,
                url: 'ws://localhost:18089'
            });
            calculator_svc.transport.socket.on('open', function () {
                var req = new Api.Calculator.AddRequest({
                    lhs: 2, rhs: 3
                });
                calculator_svc.add(req, function (error, res) {
                    test.equal(error, null);
                    test.equal(res.value, 5);
                    test.done();
                });
            });
        },

        'sub': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                encoding: ProtoBuf.Rpc.Encoding.Binary,
                url: 'ws://localhost:18089'
            });
            calculator_svc.transport.socket.on('open', function () {
                var req = new Api.Calculator.SubRequest({
                    lhs: 2, rhs: 3
                });
                calculator_svc.sub(req, function (error, res) {
                    test.equal(error, null);
                    test.equal(res.value, -1);
                    test.done();
                });
            });
        },

        'mul': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                encoding: ProtoBuf.Rpc.Encoding.Binary,
                url: 'ws://localhost:18089'
            });
            calculator_svc.transport.socket.on('open', function () {
                var req = new Api.Calculator.MulRequest({
                    lhs: 2, rhs: 3
                });
                calculator_svc.mul(req, function (error, res) {
                    test.equal(error, null);
                    test.equal(res.value, 6);
                    test.done();
                });
            });
        },

        'div': function (test) {
            var ApiFactory = ProtoBuf.loadProtoFile('example/protocol/api.proto'),
                Api = ApiFactory.build();

            var calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                encoding: ProtoBuf.Rpc.Encoding.Binary,
                url: 'ws://localhost:18089'
            });
            calculator_svc.transport.socket.on('open', function () {
                var req = new Api.Calculator.DivRequest({
                    lhs: 3, rhs: 2
                });
                calculator_svc.div(req, function (error, res) {
                    test.equal(error, null);
                    test.equal(res.value, 1);
                    test.done();
                });
            });
        }
    }
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
