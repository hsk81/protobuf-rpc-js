#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

let ArgumentParser = require('argparse').ArgumentParser,
    ProtoBuf = require('protobufjs'),
    WebSocket = require('ws'),
    Http = require('http');

let assert = require('assert'),
    path = require('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let parser = new ArgumentParser({
    addHelp: true, description: 'RPC Server', version: '2.1.0'
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

///////////////////////////////////////////////////////////////////////////////

let args = parser.parseArgs();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let RpcFactory = ProtoBuf.loadSync(
    path.join(__dirname, '../../protocol/rpc.proto'));
assert.ok(RpcFactory);
let Rpc = RpcFactory.lookup('Rpc');
assert.ok(Rpc);

///////////////////////////////////////////////////////////////////////////////

let ApiFactory = ProtoBuf.loadSync(
    path.join(__dirname, '../../protocol/api.proto'));
assert.ok(ApiFactory);
let Api = ApiFactory.resolve();
assert.ok(Api);
assert.ok(Api.Reflector);
assert.ok(Api.Calculator);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function process(data, opts) {
    let rpc_req = Rpc.Request.decode(data), 
        req, rpc_res, res;

    switch (rpc_req.name) {
        case '.Reflector.Service.ack':
            req = Api.Reflector.AckRequest.decode(rpc_req.data);
            res = Api.Reflector.AckResult.encode({
                timestamp: req.timestamp
            });
            break;

        case '.Calculator.Service.add':
            req = Api.Calculator.AddRequest.decode(rpc_req.data);
            res = Api.Calculator.AddResult.encode({
                value: req.lhs + req.rhs
            });
            break;

        case '.Calculator.Service.sub':
            req = Api.Calculator.SubRequest.decode(rpc_req.data);
            res = Api.Calculator.SubResult.encode({
                value: req.lhs - req.rhs
            });
            break;

        case '.Calculator.Service.mul':
            req = Api.Calculator.MulRequest.decode(rpc_req.data);
            res = Api.Calculator.MulResult.encode({
                value: req.lhs * req.rhs
            });
            break;

        case '.Calculator.Service.div':
            req = Api.Calculator.DivRequest.decode(rpc_req.data);
            res = Api.Calculator.DivResult.encode({
                value: Math.floor(req.lhs / req.rhs)
            });
            break;

        default:
            throw new Error(rpc_req.name + ': not supported');
    }

    rpc_res = Rpc.Response.encode({
        id: rpc_req.id, data: res.finish()
    });

    return rpc_res.finish();
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let wss = new WebSocket.Server({
    port: args.ws_port
});

wss.on('connection', function (ws) {
    ws.on('message', function (data, flags) {

        if (args.logging) {
            console.log('[on:message]', data);
        }

        ws.send(process(data));
    });
});

///////////////////////////////////////////////////////////////////////////////

let http = Http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    let buffers = [];
    req.on('data', function (data) {
        buffers.push(data)
    });

    req.on('end', function () {
        let buffer = Buffer.concat(buffers);

        if (args.logging) {
            console.log('[on:message]', buffer);
        }

        res.end(process(buffer).toString('binary'));
    });
});

http.listen(args.xhr_port);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
