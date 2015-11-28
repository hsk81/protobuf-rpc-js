#!/usr/bin/env python
###############################################################################

import argparse, os

import tornado.web
import tornado.websocket
import tornado.ioloop

###############################################################################
###############################################################################

from protocol.rpc_pb2 import Rpc
from protocol import reflector_pb2 as Reflector
from protocol import calculator_pb2 as Calculator

###############################################################################
###############################################################################

def process(data):
    rpc_req = Rpc.Request()
    rpc_req.ParseFromString(data)

    if rpc_req.name == '.Reflector.Service.ack':
        req = Reflector.AckRequest()
        req.ParseFromString(rpc_req.data)
        res = Reflector.AckResult()
        res.timestamp = req.timestamp

    elif rpc_req.name == '.Calculator.Service.add':
        req = Calculator.AddRequest()
        req.ParseFromString(rpc_req.data)
        res = Calculator.AddResult()
        res.value = req.lhs + req.rhs

    elif rpc_req.name == '.Calculator.Service.sub':
        req = Calculator.SubRequest()
        req.ParseFromString(rpc_req.data)
        res = Calculator.SubResult()
        res.value = req.lhs - req.rhs

    elif rpc_req.name == '.Calculator.Service.mul':
        req = Calculator.MulRequest()
        req.ParseFromString(rpc_req.data)
        res = Calculator.MulResult()
        res.value = req.lhs * req.rhs

    elif rpc_req.name == '.Calculator.Service.div':
        req = Calculator.DivRequest()
        req.ParseFromString(rpc_req.data)
        res = Calculator.DivResult()
        res.value = req.lhs / req.rhs

    else:
        raise Exception('{0}: not supported'.format(rpc_req.name))

    rpc_res = Rpc.Response()
    rpc_res.data = res.SerializeToString()
    rpc_res.id = rpc_req.id

    return rpc_res.SerializeToString()

###############################################################################
###############################################################################

class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def on_message(self, data):
        if arguments.logging:
            print '[on:message]', repr(data)

        self.write_message(process(data), binary=True)

    def check_origin(self, origin):

        return True

ws_application = tornado.web.Application([(r'/', WebSocketHandler)])

###############################################################################

class XhrHandler(tornado.web.RequestHandler):

    def post(self):
        if arguments.logging:
            print '[on:message]', repr(self.request.body)

        self.write(process(self.request.body).decode('latin-1'))

    def set_default_headers(self):

        self.add_header('Access-Control-Allow-Origin', '*')

xhr_application = tornado.web.Application([(r'/', XhrHandler)])

###############################################################################
###############################################################################

if __name__ == "__main__":
    global arguments

    parser = argparse.ArgumentParser(prog='RPC Server',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)

    parser.add_argument('-v', '--version', action='version',
        version='%(prog)s 1.1.2')
    parser.add_argument('-l', '--logging',
        default=os.environ.get('LOGGING', False), action='store_true',
        help='Logging')
    parser.add_argument('--ws-port', metavar='WS_PORT', type=int,
        default=os.environ.get('RPC_PORT', 8089), nargs='?',
        help='WS Server Port')
    parser.add_argument('--xhr-port', metavar='XHR_PORT', type=int,
        default=os.environ.get('RPC_PORT', 8088), nargs='?',
        help='WS Server Port')
    parser.add_argument('--json',
        default=os.environ.get('JSON', False), action='store_true',
        help='JSON encoding [NOT SUPPORTED]')

    arguments = parser.parse_args()
    ws_application.listen(arguments.ws_port)
    xhr_application.listen(arguments.xhr_port)
    tornado.ioloop.IOLoop.instance().start()

###############################################################################
###############################################################################
