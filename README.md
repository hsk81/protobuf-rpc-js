# ProtoBuf.Rpc.js: Lightweight RPC for JavaScript using Protocol Buffers

[![NPM version][npm-img]][npm-url]
[![Build Status][travis-img]][travis-url]
[![Join the chat at https://gitter.im/hsk81/protobuf-rpc-js][gitter-url]

[npm-url]: https://www.npmjs.com/package/gulp
[npm-img]: https://img.shields.io/npm/v/gulp.svg
[travis-img]: https://travis-ci.org/hsk81/protobuf-rpc-js.svg?branch=master
[travis-url]: https://travis-ci.org/hsk81/protobuf-rpc-js
[gitter-url]: https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/hsk81/protobuf-rpc-js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

[GIT]: https://www.git-scm.com/
[NPM]: https://www.npmjs.com/
[NodeJS]: https://nodejs.org/api/
[Python]: https://www.python.org/
[ProtoBuf.js]: https://github.com/dcodeIO/protobuf.js
[ProtoBuf.Rpc.js]: https://github.com/hsk81/protobuf-rpc-js
[Protocol Buffers]: https://developers.google.com/protocol-buffers/
[protobuf3]: https://developers.google.com/protocol-buffers/docs/proto3
[protoc]: https://developers.google.com/protocol-buffers/docs/reference/cpp-generated#invocation
[QT/C++]: https://www.qt.io/
[tornado]: http://www.tornadoweb.org/en/stable/
[V8 JavaScript Engine]: https://github.com/v8/v8

The [ProtoBuf.js] JavaScript (JS) library allows to create messages using Google's [Protocol Buffers]. The latter define in addition to messages also remote procedure call (RPC) services.

## Example: Reflector Service

```proto
package Reflector;

message AckRequest {
    string timestamp = 1;
}
message AckResult {
    string timestamp = 1;
}

service Service {
    rpc ack(AckRequest) returns(AckResult);
}
```
This is the content of the `reflector.proto` file: Here the RPC service has been named `Reflector.Service`, but any other designation is possible. It provides only a single method `ack`, which takes an `AckRequest` and returns an `AckResult`. Both structures contain a single `timestamp` field, where the result's timestamp shall simply be a copy of the request's timestamp.

### Usage: NodeJS

The `ack` method allows to measure the round trip time (RTT) from the client to the server. In NodeJS an invocation would for example look like:

```js
var ProtoBuf = require('protobufjs');
ProtoBuf.Rpc = require('protobufjs-rpc');

var ReflectorFactory = ProtoBuf.loadProtoFile('uri/for/reflector.proto'),
    Reflector = ReflectorFactory.build('Reflector');

var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    url: 'http://localhost:8089'
});

reflector_svc.transport.socket.on('open', function () {
    var req = new Api.Reflector.AckRequest({
        timestamp: new Date().toISOString()
    });

    reflector_svc.ack(req, function (error, res) {
        if (error !== null) throw error;
        assert(res.timestamp);
        var ms = new Date() - new Date(res.timestamp);
        assert(ms > 0);
    });
});
```

## RPC Implementation

The [Protocol Buffers] leave the actual implementation of RCP services open. Accordingly, [ProtoBuf.js] - which this [ProtoBuf.Rpc.js] library is based on - does not provide a corresponding solution either. Therefore, this library attempts to fill this gap by using a minimal and lightweight yet extensible approach:

       +-------------------------------------------------+
       | RPC Service : Invocation of an RPC method       |
       +-------------------------------------------------+
       | Encoding    : Binary buffers (or JSON, Base64)  |  JavaScript Client
       +-------------------------------------------------+
       | Transport   : WebSockets (or XMLHttpRequest)    |
       +-------------------------------------------------+
             |v|                                |^|
             |v| RPC Request       RPC Response |^|
             |v|                                |^|
       +-------------------------------------------------+
       | Transport   : WebSockets (or XMLHttpRequest)    |
       +-------------------------------------------------+
       | Encoding    : Binary buffers (or JSON, Base64)  |  Any Server
       +-------------------------------------------------+
       | RPC Service : Method execution and return       |
       +-------------------------------------------------+

As you see the RPC invocation follows a simple request-response pattern, where the initial request is triggered by the JS client, upon which the server answers with a response. The request and response messages are defined as:

```proto
message Rpc {
    message Request {
        string name = 1;
        fixed32 id = 2;
        bytes data = 3;
    }
    message Response {
        fixed32 id = 2;
        bytes data = 3;
    }
}
```

The fully qualified `name` (FQN) of an `Rpc.Request` indicates, which method on which service shall be executed (on the server side), for example `.Reflector.Service.ack`:

 + We chose to use a string for `name` (instead of working maybe with hash values), mainly to ease debugging and logging.

 + The random `id` number is a (temporary) unique identifier for the request, allowing the response to be delivered to the correct handler on the client side. Since it is a 32 bit integer it should be sufficient; especially because it is assumed that many - but relatively short lived - requests will be dispatched.

   Upon a successful response (or an error) the `id` is freed for re-use.

  + The `data` bytes carry an encoding of the current request, where for example in case of `.Reflector.Service.ack` it simply would be the byte representation of the timestamp.

This [ProtoBuf.Rpc.js] library offers abstractions for RPC services on the *client side* (NodeJS and BrowserJS compatible), whereas for the *server side*  only simple and functional examples in [NodeJS], [Python] and [QT/C++] have been provided.

## Installation: NodeJS

Clone the library with [GIT]:

```bash
git clone https://github.com/hsk81/protobuf-rpc-js pb-rpc.git
```

Invoke the installation of dependencies with [NPM]:

```bash
cd pb-rpc.git && npm install
```

[Protocol Buffers] require the special compiler [protoc] to create language bindings from the `proto` files: But since the [ProtoBuf.js] library is able to process these files on the fly, no such compiler is required (for JavaScript based clients or servers).
 
## Execution: NodeJS

### Server Execution

Start the server and enable console logging:

```bash
cd pb-rpc.git && npm run rpc-server.js -- -l
```

### Client Execution

Start the client and enable `Reflector` service acknowledgments:

```bash
cd pb-rpc.git && npm run rpc-client.js -- -n1
```

For the next `10` seconds the client will keep invoking the corresponding functionality on the server, measure the RTT in milli-seconds and log them to the standard output:
 
    dT[ack]@0: 5.464066
    dT[ack]@0: 3.234051
    dT[ack]@0: 1.066847
    dT[ack]@0: 0.651019
    dT[ack]@0: 0.369384
    dT[ack]@0: 0.016113
    dT[ack]@0: 0.005941
    dT[ack]@0: 0.027208

Here the RTTs start high with about `5.4` milli-seconds, apparently due to the NodeJS' initial JIT optimizations. But very quickly they go down to a sub-milli-second range.

By increasing the numbers assigned to the arguments, for example by setting `--n-ack=2`, you can control the throughput (which adversely effects the RTT latencies). For the detailed discussion of the performance characteristics see the `log/README.md` file.

### Client Execution: js-www

The `./example/client/js-www/index.html` demonstrates that the [ProtoBuf.Rpc.js] library has browser support. But you need first to run the corresponding `index.js` static server (via the `www-server.js` NPM script) to be able to provide the `index.html` to a browser:

```bash
cd pb-rpc.git && npm run www-server.js
```

Ensure that your `rpc-server` is still running and then open the `http://localhost:8080` address: On the console the static file server should produce an output similar to:

    Paper Server - listening on http://localhost:8080/
    [200] /
    [200] /lib/dcodeIO/long.min.js
    [200] /lib/dcodeIO/bytebuffer.min.js
    [200] /lib/dcodeIO/protobuf.min.js
    [200] /lib/dcodeIO/protobuf-rpc.min.js
    [200] /protocol/api.proto
    [200] /protocol/reflector.proto

The page on `http://localhost:8080` should simply be empty, but opening up the console (via for example `F12`) and checking the output you should discover:

    (index):56 [on:ack] e {timestamp: "2015-11-19T07:25:17.665Z"} e {timestamp: "2015-11-19T07:25:17.665Z"} null

So apparently, the acknowledgment performed as expected: The content of the left hand side curly brackets represents the request payload (i.e. `Rpc.Request.data`) and the content of the right hand side curly brackets represents the response payload (i.e. `Rpc.Reponse.data`).

## Message wrapping: Rpc.Request and Rpc.Response

Both `Rpc.Request` and `Rpc.Response` have `data` fields, which is a list of bytes carrying a custom message. For example, when a `Reflector.AckRequest` is sent and `Reflector.AckResponse` is received, then they are packed into a `Rpc.Request` and a `Rpc.Response`:

* Rpc.Request:
```
+------------------------------------------------------------------------------+
| name=.Reflector.ack|id=<fixed32>|data=<[Reflector.AckRequest:timestamp=".."]>|
+------------------------------------------------------------------------------+
```

* Rpc.Response:
```
+------------------------------------------------------------------------------+
|  id=<fixed32>|data=<[Reflector.AckResponse:timestamp=".."]>                  |
+------------------------------------------------------------------------------+
```

By default both the request and response messages are sent using a compact binary encoding (without any labels).

## Server

As already mentioned this [ProtoBuf.Rpc.js] library provides abstractions for the client side only. Therefore, on the server side you are on your own - a straight forward way to process the requests would be to check them in a switch statement and then run the corresponding functionality:

```js
TRANSPORT.onmessage = function (data) {
    var req, rpc_req = Rpc.Request.decode(data),
        res, rpc_rsp;

    switch (rpc_req.name) {
        case '.Reflector.Service.ack':
            req = Api.Reflector.AckRequest.decode(rpc_req.data);
            res = new Api.Reflector.AckResult({timestamp: req.timestamp});
            break;
     // case '.Calculator.Service.add':
     //     res = process_add(req);
     //     break;
        default:
            throw(new Error(rpc_req.name + ': not supported'));
    }

    rpc_rsp = new Rpc.Response({id: rpc_req.id, data: res.toBuffer()});
    TRANSPORT.send(rpc_rsp.toBuffer());
};
```

Here `TRANSPORT` could for example be a `WebSocket` or an `XMLHttpRequest`, to receive and send messages.

### QT/C++ `rpc-server`:

A QT/C++ version of `rpc-server` with `<QtWebSockets>` has been implemented.
 
#### Build:

For the following to work a `QT5+` installation with `qmake` is required. Further, the [protobuf3] package contains C++ includes (header files) and corresponding libraries, which are necessary for compilation and linkage:

```bash
cd pb-rpc.git && make build-server-cpp
```

#### Run:

Once compilation is done, you can run it with:

```bash
cd pb-rpc.git && npm run rpc-server.cpp -- -l
```


## Encoding Alternatives

When you instantiate the `reflector_svc` service you can provide an additional `encoding` parameter, like:

* Binary:
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    url: '..', encoding: ProtoBuf.Rpc.Encoding.Binary // default

});
```
* JSON:
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    url: '..', encoding: ProtoBuf.Rpc.Encoding.JSON
});
```
* Base64:
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    url: '..', encoding: ProtoBuf.Rpc.Encoding.Base64
});
```
* Hex:
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    url: '..', encoding: ProtoBuf.Rpc.Encoding.Hex
});
```
* Delimited:
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    url: '..', encoding: ProtoBuf.Rpc.Encoding.Delimited
});
```

### Custom implementation

By providing an object defining `rpc.encode`, `rpc.decode`, `msg.encode`, and `msg.decode` functions, it is easily possible to introduce a custom encoding layer. The former two encode/decode the RPC frame messages, while the latter two encode/decode the data within the frame messages.

```js
var my_service = new ProtoBuf.Rpc(My.Service, {
    url: '..', encoding: {
      rpc: { // e.g. Binary
          encode: function (msg) {
              return msg.toBuffer();
          },
          decode: function (cls, buf) {
              return cls.decode(buf);
          }
      },
      msg: { // e.g. Base64
          encode: function (msg) {
              return msg.encode64();
          },
          decode: function (cls, buf) {
              return cls.decode64(buf);
          }
      }
    }
});
```

Possible encoders and decoders are (see also [Protobuf.Message](https://htmlpreview.github.io/?https://raw.githubusercontent.com/dcodeIO/protobuf.js/master/docs/ProtoBuf.Builder.Message.html)):

|          |Encoding                |Decoding                   |
|----------|------------------------|---------------------------|
|Binary    |`msg.toBuffer()`        |`cls.decode(buf)`          |
|JSON      |`msg.encodeJSON()`      |`cls.decodeJSON(buf)`      |
|Base64    |`msg.encode64()`        |`cls.decode64(buf)`        |
|Hex       |`msg.encodeHex()`       |`cls.decodeHex(buf)`       |
|Delimited |`msg.encodeDelimited()` |`cls.decodeDelimited(buf)` |

It is also possible to creating a custom `encoding` by mixing the pre-defined encodings, for example:

```js
var my_service = new ProtoBuf.Rpc(My.Service, {
    url: '..', encoding: {
      rpc: ProtoBuf.Rpc.Encoding.Binary,
      msg: ProtoBuf.Rpc.Encoding.Base64
    }
});
```

This encoding will use `Binary` for the RPC frame messages, whereas the actual data will be processed with `Base64`. Further, the encoding functions can be accessed via `my_service.encoding.{rpc,msg}.{encode,decode}`.

## Transport Alternatives

When you instantiate the `reflector_svc` service you can provide an additional `transport` parameter:

* For `WebSocket` (asynchronous):
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    transport: ProtoBuf.Rpc.Transport.Ws,
    url: 'ws://localhost:8089'
});
```

* For `XMLHttpRequest` (asynchronous):
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    transport: ProtoBuf.Rpc.Transport.Xhr,
    url: 'http://localhost:8088'
});
```

* For `XMLHttpRequest` (synchronous):
```js
var reflector_svc = new ProtoBuf.Rpc(Reflector.Service, {
    transport: ProtoBuf.Rpc.Transport.Xhr.bind(null, {sync: true}),
    url: 'http://localhost:8088'
});
```

If the `transport` parameter is omitted, then by default `ProtoBuf.Rpc.Transport.Ws` for WebSockets will be used. It sends its requests *asynchronously*, whereas the `ProtoBuf.Rpc.Transport.Xhr` transport sends them either *asynchronously* or *synchronously*.

### Custom implementation

By providing a constructor defining the `open` and `send` functions, it is easily possible to introduce a custom transport layer:

```js
var my_service = new ProtoBuf.Rpc(My.Service, {
    url: 'my-transport://host:port', transport: function (opts) {
        this.open = function (url) {
            this.my_url = url;
            assert(this.my_url);
            this.my_socket = new MyTransport(url);
            assert(this.my_socket);
        };
        this.send = function (buffer, msg_callback, err_callback) {
            this.my_socket.onmessage = function (ev) {
                msg_callback(ev.data);
            };
            this.my_socket.onerror = function (err) {
                err_callback(err);
            };
            this.my_socket.send(buffer);
        };
    }
});
```

Any property of the transport can be accessed via `my_service.transport`, for example `my_service.transport.my_url` or `my_service.transport.my_socket`.

## Acknowledgments

This library would have not been possible without the support of [dizmo.com](http://dizmo.com), a great company developing «The Interface of Things».