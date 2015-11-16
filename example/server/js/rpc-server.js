#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

var ArgumentParser = require('argparse').ArgumentParser,
    ProtoBuf = require('protobufjs'),
    WebSocket = require('ws');

var assert = require('assert'),
    path = require('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var parser = new ArgumentParser({
    addHelp: true, description: 'RPC Server', version: '0.0.1'
});
parser.addArgument(['port'], {
    nargs: '?', help: 'Server Port', defaultValue: '8088'
});
parser.addArgument(['host'], {
    nargs: '?', help: 'Server Host', defaultValue: 'localhost'
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

var wss = new WebSocket.Server({
    host: args.host, port: args.port
});

wss.on('connection', function (ws) {
    ws.on('message', function (data, opts) {
        var rpc_req = Rpc.Request.decode(data),
            req, res;

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

        var rpc_res = new Rpc.Response({
            id: rpc_req.id, data: res.toBuffer()
        });

        ws.send(rpc_res.toBuffer());
    });
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
