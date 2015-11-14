#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

var ArgumentParser = require('argparse').ArgumentParser,
    assert = require('assert'),
    ProtoBuf = require('protobufjs'),
    WebSocket = require('ws');

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

var SpaceFactory = ProtoBuf.loadProtoFile({
    root: __dirname + '/../../../protocol', file: 'space.proto'
});

var Space = SpaceFactory.build();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var wss = new WebSocket.Server({
    host: args.host, port: args.port
});

wss.on('connection', function (ws) {
    ws.on('message', function (data, opts) {
        var rpc_req = Space.Rpc.Request.decode(data),
            pair = Space.System.Pair.decode(rpc_req.data),
            result;

        switch (rpc_req.name) {
            case '.System.Service.add':
                result = new Space.System.AddResult({
                    value: pair.lhs + pair.rhs
                });
                break;

            case '.System.Service.sub':
                result = new Space.System.SubResult({
                    value: pair.lhs - pair.rhs
                });
                break;

            case '.System.Service.mul':
                result = new Space.System.MulResult({
                    value: pair.lhs * pair.rhs
                });
                break;

            case '.System.Service.div':
                    result = new Space.System.DivResult({
                        value: Math.floor(pair.lhs / pair.rhs)
                    });
                break;

            default:
                throw(new Error(rpc_req.name + ': not supported'));
        }

        var rpc_res = new Space.Rpc.Response({
            id: rpc_req.id, data: result.toBuffer()
        });

        ws.send(rpc_res.toBuffer());
    });
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
