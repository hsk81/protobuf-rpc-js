#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

var ArgumentParser = require('argparse').ArgumentParser,
    ProtoBuf = require('protobufjs'),
    WebSocket = require('ws'),
    Http = require('http');

var assert = require('assert'),
    path = require('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var parser = new ArgumentParser({
    addHelp: true, description: 'RPC Server', version: '1.0.0'
});
parser.addArgument(['-l', '--logging'], {
    help: 'Logging [default: false]', defaultValue: false,
    action: 'storeTrue'
});
parser.addArgument(['--ws-port'], {
    help: 'WS Server Port [default: 8088]', defaultValue: 8089,
    nargs: '?'
});
parser.addArgument(['--xhr-port'], {
    help: 'XHR Server Port [default: 8089]', defaultValue: 8088,
    nargs: '?'
});
parser.addArgument(['-j', '--json-protocol'], {
    help: 'JSON protocol [default: false]', defaultValue: false,
    action: 'storeTrue'
});

///////////////////////////////////////////////////////////////////////////////

var args = parser.parseArgs();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var RpcFactory = ProtoBuf.loadProtoFile({
    root: path.join(__dirname, '../../protocol'), file: 'rpc.proto'});
assert.ok(RpcFactory);

var Rpc = RpcFactory.build('Rpc');
assert.ok(Rpc);

///////////////////////////////////////////////////////////////////////////////

var ApiFactory = ProtoBuf.loadProtoFile({
    root: path.join(__dirname, '../../protocol'), file: 'api.proto'});
assert.ok(ApiFactory);

var Api = ApiFactory.build();
assert.ok(Api);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function process(data, opts) {
    var rpc_req, req, rpc_res, res;

    if (opts && opts.protocol === 'json') {
        rpc_req = Rpc.Request.decodeJSON(data);
    } else {
        rpc_req = Rpc.Request.decode(data);
    }

    switch (rpc_req.name) {
        case '.Reflector.Service.ack':
            req = Api.Reflector.AckRequest.decode(rpc_req.data);
            res = new Api.Reflector.AckResult({
                timestamp: req.timestamp
            });
            break;

        case '.Calculator.Service.add':
            req = Api.Calculator.AddRequest.decode(rpc_req.data);
            res = new Api.Calculator.AddResult({
                value: req.lhs + req.rhs
            });
            break;

        case '.Calculator.Service.sub':
            req = Api.Calculator.SubRequest.decode(rpc_req.data);
            res = new Api.Calculator.SubResult({
                value: req.lhs - req.rhs
            });
            break;

        case '.Calculator.Service.mul':
            req = Api.Calculator.MulRequest.decode(rpc_req.data);
            res = new Api.Calculator.MulResult({
                value: req.lhs * req.rhs
            });
            break;

        case '.Calculator.Service.div':
            req = Api.Calculator.DivRequest.decode(rpc_req.data);
            res = new Api.Calculator.DivResult({
                value: Math.floor(req.lhs / req.rhs)
            });
            break;

        default:
            throw(new Error(rpc_req.name + ': not supported'));
    }

    rpc_res = new Rpc.Response({
        id: rpc_req.id, data: res.toBuffer()
    });

    if (opts && opts.protocol === 'json') {
        return rpc_res.encodeJSON();
    } else {
        return rpc_res.toBuffer();
    }
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var wss = new WebSocket.Server({
    port: args.ws_port
});

wss.on('connection', function (ws) {
    ws.on('message', function (data, flags) {

        if (args.logging) {
            console.log('[on:message]', data);
        }

        if (args.json_protocol) {
            ws.send(process(data, {protocol: 'json'}));
        } else {
            ws.send(process(data));
        }
    });
});

///////////////////////////////////////////////////////////////////////////////

var http = Http.createServer(function(req, res) {

    var buffers = [];
    req.on('data', function (data) {
        buffers.push(data)
    });

    req.on('end', function () {
        var buffer = Buffer.concat(buffers);

        if (args.logging) {
            console.log('[on:message]', buffer);
        }

        res.end(process(buffer).toString('binary'));
    });
});

http.listen(args.xhr_port);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
