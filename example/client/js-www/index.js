#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

var ArgumentParser = require('argparse').ArgumentParser;

var assert = require('assert'),
    http = require('http'),
    paperboy = require('paperboy'),
    path = require('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var parser = new ArgumentParser({
    addHelp: true, description: 'Paper Server', version: '1.1.2'
});
parser.addArgument(['-p', '--port'], {
    help: 'Server Port [default: 8080]', defaultValue: 8080, nargs: '?'
});

var args = parser.parseArgs();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var webroot = path.join(__dirname, '.');

///////////////////////////////////////////////////////////////////////////////

http.createServer(function (req, res) {
    paperboy.deliver(webroot, req, res).after(function (status) {
        console.log('[%d] %s', status, req.url);
    }).error(function (status, msg) {
        console.log('[%d] %s: %s', status, req.url, msg);
        res.writeHead(status, {'Content-Type': 'text/plain'});
        res.end('Error [' + status + ']: ' + msg);
    }).otherwise(function (err) {
        console.log('[%d] %s: %s', 404, req.url, err);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Error [404]: File not found');
    });
}).listen(args.port);

///////////////////////////////////////////////////////////////////////////////

console.log('Paper Server - listening on http://localhost:%d/', args.port);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
