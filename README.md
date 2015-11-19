# ProtoBuf.Rpc.js: Lightweight RPC for JavaScript using Protocol Buffers

The [ProtoBuf.js] library allows in JavaScript (JS) to create messages using Google's [Protocol Buffers], where the latter define in addition to messages also so called remote procedure call (RPC) services, i.e.

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

Here the RPC service has been named `Reflector.Service`, but any other designation is possible: It provides only a single method `ack`, which takes an `AckRequest` and returns an `AckResult`. Both structure contain a single `timestamp` field, where the result timestamp is simply a copy of the request's timestamp. Therefore the `ack` method allows us to measure the round trip time (RTT) of an RCP implementation.

Actually the [Protocol Buffers] leave the actual implementation of the RCP services open; acccodingly, the [ProtoBuf.js] JS library does not provide a corresponding solution either. This is quite understandable since depending on the context and given requirements a particular approach might be appropriate or not.

This [ProtoBuf.Rpc.js] library attempts to fill this gap using *only* a minimal and lightweight yet extensible approach. Following concepts and technologies have been used:

       +-------------------------------------------------+
       | RPC Service : Invocation of aN RPC method       |
       +-------------------------------------------------+
       | Transport   : WebSockets (or AJAX)              |  JS Client
       +-------------------------------------------------+
       | Protocol    : Binary buffers (or JSON, Base64)  |
       +-------------------------------------------------+
              |v|                    |^|
              |v| #1. RPC_REQ        |^| #2. RPC_RES 
              |v|                    |^|
       +-------------------------------------------------+
       | Protocol    : Binary buffers (or JSON, Base64)  |
       +-------------------------------------------------+  Any Server
       | RPC Service : Execution of an RPC method        |
       +-------------------------------------------------+
 
As you see the RPC invocation follows a simple request-response pattern, where the initial RPC_REQ request is triggered by the JS Client upon which the server answers with a RPC_RES response. These two messages are defined as:

```proto
message Rpc {
    message Request {
        string name = 1;
        uint32 id = 2;
        bytes data = 3;
    }
    message Response {
        uint32 id = 2;
        bytes data = 3;
    }
}
```

The fully qualified `name` (FQN) of an `Rpc.Request` indicates which method on which service shall be executed on the server side, e.g. `.Reflector.Service.ack`.

 + We chose to use string `name`s instead of working with e.g. corresponding hash values, mainly to ease debugging and logging. However in both of these use cases it is very easily possible to simply do a hash value to method name reverse lookup from a (centralized) name service. To avoid such an additional burden (at least as of now) FQNs are being used.
 
  + The random (or sequential) `id` number is a (temporary) unique ID of the request, which helps to deliver the response. Since it is a `uint32` it should be more than enough, especially because it is assumed that many but relatively short lived requests will be dispatched, which should be answered within a few milli-seconds (freeing the `id` for re-use).

  + The `data` bytes carry a serialization of the current request, where for e.g. `.Reflector.Service.ack` it simply would be the byte representation of the timestamp.

This [ProtoBuf.Rpc.js] JS library offers an abstraction for RPC services on the JS *client side* (NodeJS and browser compatible), whereas for the *server side*  only simple and functional examples in [NodeJS], [Python] and [QT/C++] have been provided.

## Installation: NodeJS

Clone the library with [GIT]:

    git clone https://github.com/hsk81/protobuf-rpc-js pb-rpc-js.git

Invoke the installation of dependencies with [NPM]:

    cd pb-rpc-js.git && npm install

For now you don't need to install the [Protocol Buffer] specific compiler (`protoc`) or any language bindings, since the [ProtoBuf.js] library is able to process the protocol files (with the `*.proto` extensions) on the fly. We'll discuss installation and corresponding requirements for the server examples later.
 
## Execution: NodeJS

### Server Execution

Start the server and enable console logging:
 
    cd pb-rpc-js.git && ./example/server/js/rpc-server.js --logging
    
### Client Execution

Start the client and enable the addition, subtraction, multiplication and division methods of the `Calculator` service and acknowledgment of the `Reflector` service:

    cd pb-rpc-js.git && ./example/client/js/rpc-client.js --n-add=1 --n-sub=1 --n-mul=1 --n-div=1 --n-ack=1

Since the provided values `1` are the defaults anyway, you could have also simply run:

    cd pb-rpc-js.git && ./example/client/js/rpc-client.js

For the next `10` seconds the client will keep invoking the corresponding functionality on the server side, measure the RTT in milli-seconds and log them to the standard output:
 
    dT[ack]@0: 5.464066
    dT[ack]@0: 2.234051
    dT[add]@0: 2.543668
    dT[sub]@0: 1.650324
    dT[ack]@0: 3.066847
    dT[mul]@0: 3.48628
    dT[ack]@0: 1.651019
    dT[div]@0: 1.349209
    dT[ack]@0: 1.369384
    dT[add]@0: 3.032711
    dT[ack]@0: 1.016113
    dT[sub]@0: 1.2642
    dT[ack]@0: 1.005941
    dT[mul]@0: 1.096799
    dT[ack]@0: 2.027208
    dT[div]@0: 0.74399

The RTTs start high with about 5.4ms (on my machine) apparently due the NodeJS' [V8 JavaScript Engine]'s initial on the fly optimizations, but very quickly go down to a sub-milli-second range. By increasing the numbers of the arguments, e.g. `--n-ack=2`, you can control the throughput of a particular method invocation (but which usually adversely effects the RTT latencies). For the detailed discussion of the performance characteristics see the `log/README.md` file.

### Client Execution: js-www

The `./example/client/js-www/index.html` demonstrates that the [ProtoBuf.Rpc.js] library has browser supports; but you need first to run the corresponding `index.js` static server to be able to provide the `index.html` to a browser:

    cd pb-rpc-js.git && ./example/client/js-www/index.js
    Paper Server - listening on http://localhost:8080/

Ensure that your `rpc-server` is still running and then open the `http://localhost:8080/`: the static file server `index.js` should produce an output similar to:

    Paper Server - listening on http://localhost:8080/
    [200] /
    [200] /lib/dcodeIO/long.min.js
    [200] /lib/dcodeIO/bytebuffer.min.js
    [200] /lib/dcodeIO/protobuf.min.js
    [200] /lib/dcodeIO/protobuf-rpc.min.js
    [200] /protocol/api.proto
    [200] /protocol/reflector.proto
    [200] /protocol/calculator.proto

If you reload then the `[200]` status codes might get replaced with `[304]` (implying caching). The page on `http://localhost:8080/` should simply be empty, but open up the console (via e.g. `F12`) and check the output (you may then also want to reload with `F5` to see the content of `console.log(..)` fully expanded):

    (index):56 [on:ack] e {timestamp: "2015-11-19T07:25:17.665Z"} e {timestamp: "2015-11-19T07:25:17.665Z"} null
    (index):65 [on:add] e {lhs: 2, rhs: 3} e {value: 5} null
    (index):72 [on:sub] e {lhs: 2, rhs: 3} e {value: -1} null
    (index):79 [on:mul] e {lhs: 2, rhs: 3} e {value: 6} null
    (index):86 [on:div] e {lhs: 2, rhs: 3} e {value: 0} null

So apparently acknowledgment and calculations worked as expected: The content of the left hand side curly brackets represent the request payload (i.e. `Rpc.Request.data`) and the content of the right hand side curly brackets represent the response payload (i.e. `Rpc.Reponse.data`). You should have also observed the same amount of log line on you `rpc-server`protos output (if logging is on).

## Message wrapping: Rpc.Request and Rpc.Response

Both `Rpc.Request` and `Rpc.Response` have `data` field, which is a list of bytes to contains any kind of custom message: For example, when a `Reflector.AckRequest` is sent and `Reflector.AckResponse` is received, then they are packing into `Rpc.Request` and `Rpc.Response` like:

Rpc.Request: 

    +-----------------------------------------------------------------------------+
    | name=.Reflector.ack id=<uint32> data=<[Reflector.AckRequest:timestamp=".."] |
    +-----------------------------------------------------------------------------+

Rpc.Response:

    +-----------------------------------------------------------------------------+
    |  id=same-<uint32, data=<[Reflector.AckResponse:same-timestamp=".."]         |
    +-----------------------------------------------------------------------------+

By default both the request and response messages are sent using a compact binary encoding.

## Usage

In the following the JS usage of the [ProtoBuf.Rpc.js] is shown, for this to work, the `api.proto` protocol file needs to be available. The `api.proto` simply imports the `reflector.proto` and `calculator.proto` files:

    ```proto
    import public "reflector.proto";
    import public "calculator.proto";
```

### Load `api.proto` and create `Api` namespace

    ```js
    var ProtoBuf = require('protobufjs'),
        ProtoBufRpc = require('protobufjs-rpc');
    
    var ApiFactory = ProtoBuf.loadProtoFile({
        root: path.join(__dirname, 'path/to/protocol'), file: 'api.proto'});
    assert(ApiFactory);
    
    var Api = ApiFactory.build();
    assert(Api);
    ```

### Instantiate the `reflector_svc` service

Ensure that the `rpc-server` is running, when this code gets executed:

    ```js
    var reflector_svc = new ProtoBufRpc(Api.Reflector.Service, {
        url: 'ws://localhost:8088'
    });
    ```

### Invoke the `reflector_svc.ack(..)` RPC

When the RPC call is executed immediately after creating the `reflector_svc` the it is necessary to wait for the `open` message on the corresponding `socket`. Please note that the invocation is asynchronous:

    ```js
    reflector_svc.transport.socket.on('open', function () {
        var req = new Api.Reflector.AckRequest({
            timestamp: new Date().toISOString()
        });
        
        reflector_svc.ack(req, function (error, res) {
            if (error !== null) throw error;
            assert(res.timestamp);
        });
    });
    ```

### Process `reflector_svc.ack(..)` on the server side

As already mentioned this [ProtoBuf.Rpc.js] provides abstractions for the client side only. Therefore on the server side you are on your own: a very simple way to process the requests is to check them in a switch statement:

    ```js
    ws.on('message', function (data) {
        var rpc_req, req, rpc_res, res;

        rpc_req = Rpc.Request.decode(data);
        switch (rpc_req.name) {
            case '.Reflector.Service.ack':
                req = Api.Reflector.AckRequest.decode(rpc_req.data);
                res = new Api.Reflector.AckResult({timestamp: req.timestamp});
                break;
            case '.Calculator.Service.add':
                ...
            default:
                throw(new Error(rpc_req.name + ': not supported'));
        }

        rpc_res = new Rpc.Response({id: rpc_req.id, data: res.toBuffer()});
        ws.send(rpc_res.toBuffer());
    });
    ```

    1. Decode RPC request;
    2. Switch based on request name `.Reflector.Service.ack`;
    3. Decode RPC request message `Api.Reflector.AckRequest`;
    4. Create an `Api.Reflector.AckResult` message;
    5. Encode `Api.Reflector.AckResult.data` field;
    6. Create a `Rpc.Response` message;
    7. Send message within a buffer;

