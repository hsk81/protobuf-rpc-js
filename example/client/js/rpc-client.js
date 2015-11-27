#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

var ArgumentParser = require('argparse').ArgumentParser,
    ProtoBuf = require('protobufjs'),
    ProtoBufRpc = require('../../../index.js');

var assert = require('assert'),
    path = require('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var parser = new ArgumentParser({
    addHelp: true, description: 'RPC Client', version: '1.0.3'
});
parser.addArgument(['--ws-host'], {
    help: 'WS Server Host [default: localhost]', defaultValue: 'localhost',
    nargs: '?'
});
parser.addArgument(['--ws-port'], {
    help: 'WS Server Port [default: 8088]', defaultValue: 8089,
    nargs: '?'
});
parser.addArgument(['--xhr-host'], {
    help: 'XHR Server Host [default: localhost]', defaultValue: 'localhost',
    nargs: '?'
});
parser.addArgument(['--xhr-port'], {
    help: 'XHR Server Port [default: 8088]', defaultValue: 8088,
    nargs: '?'
});
parser.addArgument(['-j', '--json'], {
    help: 'JSON encoding [default: false]', defaultValue: false,
    action: 'storeTrue'
});
parser.addArgument(['-n', '--n-ack'], {
    nargs: '?', help: 'ACK Workers', defaultValue: 1
});
parser.addArgument(['-a', '--n-add'], {
    nargs: '?', help: 'ADD Workers', defaultValue: 0
});
parser.addArgument(['-s', '--n-sub'], {
    nargs: '?', help: 'SUB Workers', defaultValue: 0
});
parser.addArgument(['-m', '--n-mul'], {
    nargs: '?', help: 'MUL Workers', defaultValue: 0
});
parser.addArgument(['-d', '--n-div'], {
    nargs: '?', help: 'DIV Workers', defaultValue: 0
});

///////////////////////////////////////////////////////////////////////////////

var args = parser.parseArgs();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ApiFactory = ProtoBuf.loadProtoFile({
    root: path.join(__dirname, '../../protocol'), file: 'api.proto'
});
assert(ApiFactory);

var Api = ApiFactory.build();
assert(Api);

/////////////////////////////////////////////////////////////////////)/////////

var reflector_svc = new ProtoBufRpc(Api.Reflector.Service, {
    url: 'http://' + args.xhr_host + ':' + args.xhr_port,
    transport: new ProtoBufRpc.Transport.Xhr({sync: false}),
    encoding:  { rpc: args.json ?
        ProtoBufRpc.Encoding.Json.rpc : ProtoBufRpc.Encoding.Binary.rpc
    }
});

assert(reflector_svc);
assert(reflector_svc.transport);
assert(reflector_svc.transport.socket);

var calculator_svc = new ProtoBufRpc(Api.Calculator.Service, {
    url: 'ws://' + args.ws_host + ':' + args.ws_port,
    encoding:  { rpc: args.json ?
        ProtoBufRpc.Encoding.Json.rpc : ProtoBufRpc.Encoding.Binary.rpc
    }
});

assert(calculator_svc);
assert(calculator_svc.transport);
assert(calculator_svc.transport.socket);

/////////////////////////////////////////////////////////////////////)/////////
/////////////////////////////////////////////////////////////////////)/////////

reflector_svc.transport.socket.on('open', function () {

    var n_ack = args.n_ack, iid_ack = {};
    for (var ack_i = 0; ack_i < n_ack; ack_i++) {
        iid_ack[ack_i] = setInterval((function (i, t) {
            var req = new Api.Reflector.AckRequest({
                timestamp: new Date().toISOString()
            });

            t[i] = process.hrtime();
            reflector_svc.ack(req, function (error, res) {
                if (error !== null) throw error;

                assert(res.timestamp);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[ack]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(ack_i, {}), 0);
    }

    setTimeout(function () {
        for (var key_ack in iid_ack)
            if (iid_ack.hasOwnProperty(key_ack))
                clearInterval(iid_ack[key_ack]);
    }, 10000);
});

calculator_svc.transport.socket.on('open', function () {

    var n_add = args.n_add, iid_add = {};
    for (var add_i = 0; add_i < n_add; add_i++) {
        iid_add[add_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.AddRequest({
                lhs: random(0, 255), rhs: random(0, 255)
            });

            t[i] = process.hrtime();
            calculator_svc.add(req, function (error, res) {
                if (error !== null) throw error;

                assert(req.lhs + req.rhs === res.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[add]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(add_i, {}), 0);
    }

    var n_sub = args.n_sub, iid_sub = {};
    for (var sub_i = 0; sub_i < n_sub; sub_i++) {
        iid_sub[sub_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.SubRequest({
                lhs: random(0, 255), rhs: random(0, 255)
            });

            t[i] = process.hrtime();
            calculator_svc.sub(req, function (error, res) {
                if (error !== null) throw error;

                assert(req.lhs - req.rhs === res.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[sub]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(sub_i, {}), 0);
    }

    var n_mul = args.n_mul, iid_mul = {};
    for (var mul_i = 0; mul_i < n_mul; mul_i++) {
        iid_mul[mul_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.MulRequest({
                lhs: random(0, 255), rhs: random(0, 255)
            });

            t[i] = process.hrtime();
            calculator_svc.mul(req, function (error, res) {
                if (error !== null) throw error;

                assert(req.lhs * req.rhs === res.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[mul]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(mul_i, {}), 0);
    }

    var n_div = args.n_div, iid_div = {};
    for (var div_i = 0; div_i < n_div; div_i++) {
        iid_div[div_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.DivRequest({
                lhs: random(0, 255), rhs: random(1, 256)
            });

            t[i] = process.hrtime();
            calculator_svc.div(req, function (error, res) {
                if (error !== null) throw error;

                assert(Math.floor(req.lhs / req.rhs) === res.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[div]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(div_i, {}), 0);
    }

    setTimeout(function () {
        for (var key_add in iid_add)
            if (iid_add.hasOwnProperty(key_add))
                clearInterval(iid_add[key_add]);
        for (var key_sub in iid_sub)
            if (iid_sub.hasOwnProperty(key_sub))
                clearInterval(iid_sub[key_sub]);
        for (var key_mul in iid_mul)
            if (iid_mul.hasOwnProperty(key_mul))
                clearInterval(iid_mul[key_mul]);
        for (var key_div in iid_div)
            if (iid_div.hasOwnProperty(key_div))
                clearInterval(iid_div[key_div]);
    }, 10000);
});

///////////////////////////////////////////////////////////////////////////////

setTimeout(function () {
    process.exit();
}, 10000);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

Function.prototype.with = function () {
    var slice = Array.prototype.slice,
        args = slice.call(arguments),
        func = this;

    return function () {
        return func.apply(this, args.concat(slice.call(arguments)));
    };
};

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
