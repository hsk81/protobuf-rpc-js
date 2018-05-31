let assert = require('assert');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let spawn = require('child_process').spawn;
let server = spawn('node', [
    'example/server/js/rpc-server.js', '--xhr-port=18088', '--ws-port=18089'
]);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let Suite = require('testjs');
Suite.run = function (tests) {
    setTimeout(function () {
        let ascli = require('ascli').app('test');
        let suite = new Suite(tests, 'ProtoBuf.Rpc');
        Suite.banner();

        let hr_time = process.hrtime(),
            ms_time = Math.round(hr_time[0] * 1E6 + hr_time[1] / 1E3);

        let summarize = function () {
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
            assert(server.killed || server.exitCode === 1);
        });
        suite.run(false, function () {
            server.kill();
            summarize();
        });
    }, 600);
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let ProtoBuf = require('protobufjs');
assert(ProtoBuf);
ProtoBuf.Rpc = require('../index.js');
assert(ProtoBuf.Rpc);

///////////////////////////////////////////////////////////////////////////////

Suite.run({
    'Message': function (test) {
        let RpcFactory = ProtoBuf.loadSync('protocol/rpc.proto');
        test.ok(RpcFactory);

        let Rpc = RpcFactory.lookup('Rpc');
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

    'Api': function (test) {
        let ApiFactory =
            ProtoBuf.loadSync('example/protocol/api.proto');
        test.ok(ApiFactory);

        let Api = ApiFactory.resolve();
        test.ok(Api);
        test.ok(Api.Reflector);
        test.ok(Api.Calculator);
        test.done();
    },

    'Api.Reflector': {
        'package': function (test) {
            let ReflectorFactory =
                ProtoBuf.loadSync('example/protocol/reflector.proto');
            test.ok(ReflectorFactory);

            let Reflector = ReflectorFactory.lookup('Reflector');
            test.ok(Reflector);
            test.ok(Reflector.AckRequest);
            test.ok(Reflector.AckResult);
            test.ok(Reflector.Service);
            test.ok(Reflector.Service.methods.ack);
            test.done();
        },

        'ack': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089'
            });
            reflector_svc.on('open', function () {
                let req = {
                    timestamp: new Date().toISOString()
                };
                reflector_svc.ack(req, function (error, res) {
                    if (!error) {
                        test.ok(res.timestamp);
                    } else {
                        test.fail(error);
                    }
                });
                reflector_svc.end();
            });
            reflector_svc.on('end', function () {
                test.done();
            });
        },

        'ack-ws': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                url: 'ws://localhost:18089'
            });
            reflector_svc.on('open', function () {
                let req = {
                    timestamp: new Date().toISOString()
                };
                reflector_svc.ack(req, function (error, res) {
                    if (!error) {
                        test.ok(res.timestamp);
                    } else {
                        test.fail(error);
                    }
                    reflector_svc.end();
                });
            });
            reflector_svc.on('end', function () { 
                test.done();
            });
        },

        'ack-xhr': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                transport: new ProtoBuf.Rpc.Transport.Xhr,
                url: 'http://localhost:18088'
            });
            reflector_svc.on('open', function () {
                let req = {
                    timestamp: new Date().toISOString()
                };
                reflector_svc.ack(req, function (error, res) {
                    if (!error) {
                        test.ok(res.timestamp);
                    } else {
                        test.fail(error);
                    }
                    reflector_svc.end();
                });
            });
            reflector_svc.on('end', function () { 
                test.done();
            });
        },

        'ack-rpc-message': function (test) {
            let RpcFactory = ProtoBuf.Root.fromJSON({
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
    
            test.ok(RpcFactory);
            let Rpc = RpcFactory.lookup('Rpc');
            test.ok(Rpc);

            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089', rpc_message: Rpc
            });
            reflector_svc.on('open', function () {
                let req = {
                    timestamp: new Date().toISOString()
                };
                reflector_svc.ack(req, function (error, res) {
                    if (!error) {
                        test.ok(res.timestamp);
                    } else {
                        test.fail(error);
                    }
                    reflector_svc.end();
                });
            });
            reflector_svc.on('end', function () { 
                test.done();
            });
        },

        'ack-response-cls': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let reflector_svc = new ProtoBuf.Rpc(Api.Reflector.Service, {
                url: 'ws://localhost:18089', response_cls: {
                    '.Reflector.Service.ack': Api.Reflector.AckResult
                }
            });
            reflector_svc.on('open', function () {
                let req = {
                    timestamp: new Date().toISOString()
                };
                reflector_svc.ack(req, function (error, res) {
                    if (!error) {
                        test.ok(res.timestamp);
                    } else {
                        test.fail(error);
                    }
                    reflector_svc.end();
                });
            });
            reflector_svc.on('end', function () { 
                test.done();
            });
        }
    },

    'Api.Calculator': {
        'package': function (test) {
            let CalculatorFactory =
                ProtoBuf.loadSync('example/protocol/calculator.proto');
            test.ok(CalculatorFactory);

            let Calculator = CalculatorFactory.lookup('Calculator');
            test.ok(Calculator);
            test.ok(Calculator.Service);
            test.ok(Calculator.AddRequest);
            test.ok(Calculator.AddResult);
            test.ok(Calculator.Service.methods.add);
            test.ok(Calculator.SubRequest);
            test.ok(Calculator.SubResult);
            test.ok(Calculator.Service.methods.sub);
            test.ok(Calculator.MulRequest);
            test.ok(Calculator.MulResult);
            test.ok(Calculator.Service.methods.mul);
            test.ok(Calculator.DivRequest);
            test.ok(Calculator.DivResult);
            test.ok(Calculator.Service.methods.div);
            test.done();
        },

        'add': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                url: 'ws://localhost:18089'
            });
            calculator_svc.on('open', function () {
                let req = {
                    lhs: 2, rhs: 3
                };
                calculator_svc.add(req, function (error, res) {
                    if (!error) {
                        test.equal(res.value, 5);
                    } else {
                        test.fail(error);
                    }
                    calculator_svc.end();
                });
            });
            calculator_svc.on('end', function () { 
                test.done();
            });
        },

        'sub': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                url: 'ws://localhost:18089'
            });
            calculator_svc.on('open', function () {
                let req = {
                    lhs: 2, rhs: 3
                };
                calculator_svc.sub(req, function (error, res) {
                    if (!error) {
                        test.equal(res.value, -1);
                    } else {
                        test.fail(error);
                    }
                    calculator_svc.end();
                });
            });
            calculator_svc.on('end', function () { 
                test.done();
            });
        },

        'mul': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                url: 'ws://localhost:18089'
            });
            calculator_svc.on('open', function () {
                let req = {
                    lhs: 2, rhs: 3
                };
                calculator_svc.mul(req, function (error, res) {
                    if (!error) {
                        test.equal(res.value, 6);
                    } else {
                        test.fail(error);
                    }
                    calculator_svc.end();
                });
            });
            calculator_svc.on('end', function () { 
                test.done();
            });
        },

        'div': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let calculator_svc = new ProtoBuf.Rpc(Api.Calculator.Service, {
                transport: new ProtoBuf.Rpc.Transport.Ws,
                url: 'ws://localhost:18089'
            });
            calculator_svc.on('open', function () {
                let req = {
                    lhs: 3, rhs: 2
                };
                calculator_svc.div(req, function (error, res) {
                    if (!error) {
                        test.equal(res.value, 1);
                    } else {
                        test.fail(error);
                    }
                    calculator_svc.end();
                });
            });
            calculator_svc.on('end', function () { 
                test.done();
            });
        }
    },

    'Api.Listener': {
        'package': function (test) {
            let ListenerFactory =
                ProtoBuf.loadSync('example/protocol/listener.proto');
            test.ok(ListenerFactory);

            let Listener = ListenerFactory.lookup('Listener');
            test.ok(Listener);
            test.ok(Listener.SubRequest);
            test.ok(Listener.SubResult);
            test.ok(Listener.Service);
            test.ok(Listener.Service.methods.sub);
            test.done();
        },

        'sub': function (test) {
            let ApiFactory = ProtoBuf.loadSync('example/protocol/api.proto'),
                Api = ApiFactory.resolve();

            let listener_svc = new ProtoBuf.Rpc(Api.Listener.Service, {
                url: 'ws://localhost:18089'
            });
            listener_svc.on('open', function () {
                let req = {
                    timestamp: new Date().toISOString()
                };
                listener_svc.sub(req, function (error, res) {
                    if (!error) {
                        test.ok(res.timestamp);
                    } else {
                        test.fail(error);
                    }
                });
            });
            listener_svc.on('data', function (res, method) {
                test.ok(res.timestamp);
            });
            listener_svc.on('data', function (res, method) {
                test.ok(method); // method.name === 'sub'
            });
            listener_svc.on('end', function () {
                listener_svc.off('data');
                test.done();
            });

            setTimeout(function () {
                listener_svc.end();
            }, 100);
        }
    },
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
