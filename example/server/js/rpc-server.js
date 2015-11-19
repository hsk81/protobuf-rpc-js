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
parser.addArgument(['-l', '--logging'], {
    help: 'Message logging [default: false]', defaultValue: false,
    action: 'storeTrue'
});
parser.addArgument(['-p', '--port'], {
    help: 'Server Port [default: 8088]', defaultValue: '8088',
    nargs: '?'
});
parser.addArgument(['--json-rpc'], {
    help: 'JSON-RPC encoding [default: false]', defaultValue: false,
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

var wss = new WebSocket.Server({
    port: args.port
});

wss.on('connection', function (ws) {
    ws.on('message', function (data, flags) {
        var rpc_req, req, rpc_res, res;

        if (args.logging) {
            console.log('[on:message]', data, {
                binary: flags.binary, masked: flags.masked
            });
        }
        if (args.json_rpc) {
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

        if (args.json_rpc) {
            ws.send(rpc_res.encodeJSON());
        } else {
            ws.send(rpc_res.toBuffer());
        }

    });
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
