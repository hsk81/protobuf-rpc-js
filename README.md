# ProtoBuf.Rpc: Lightweight RPC for JavaScript using Protocol Buffers

The [ProtoBuf] library allows in JavaScript (JS) to create messages using Google's [Protocol Buffers], where the latter define in addition to messages also so called remote procedure call (RPC) services, i.e.

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

Actually the [Protocol Buffers] leave the actual implementation of the RCP services open; acccodingly, the [ProtoBuf] JS library does not provide a corresponding solution either. This is quite understandable since depending on the context and given requirements a particular approach might be appropriate or not.

This [ProtoBuf.Rpc] JS library attempts to fill this gap using *only* a minimal and lightweight yet extensible approach. Following concepts and technologies have been used:

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
syntax = "proto3";

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

 + We chose to use string `name`s instead of working with e.g. corresponding hash values, mainly to ease debugging and logging. However int both of these use cases it is very easily possible to simply do a hash value to method name reverse lookup from a (centralized) name service. To avoid such an addition burden (at least as of now) FQNs are being used.
 
  + The random (or sequential) `id` number is a (temporary) unique ID of the request, which helps to deliver the response. Since it is a `uint32` it should be more than enough, especially because it is assumed that many but relatively short lived requests will be dispatched, which should be answered within a few milli-seconds (freeing the `id` for re-use).

  + The `data` bytes carry an serialization of the current requests, where for e.g. `.Reflector.Service.ack` it simply would be the byte representation of the timestamp.

This [ProtoBuf.Rpc] JS library offers an abstraction for RPC services on the JS *client side* (NodeJS and browser compatible), whereas for the *server side*  only simple and functional examples in NodeJS, Browser Python and QT/C++ have been provided.
