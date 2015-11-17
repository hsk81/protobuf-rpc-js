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

class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def on_message(self, data):

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

        self.write_message(rpc_res.SerializeToString(), binary=True)

    def check_origin(self, origin):

        return True

###############################################################################

application = tornado.web.Application([(r'/', WebSocketHandler)])

###############################################################################
###############################################################################

if __name__ == "__main__":

    parser = argparse.ArgumentParser(prog='RPC Server',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)

    parser.add_argument('-v', '--version', action='version',
        version='%(prog)s 0.0.1')
    parser.add_argument('port', metavar='PORT', type=int,
        default=os.environ.get('RPC_PORT', 8088), nargs='?',
        help='Server Port')
    parser.add_argument('host', metavar='HOST', type=str,
        default=os.environ.get('RPC_HOST', 'localhost'),
        nargs='?',
        help='Server Host')

    arguments = parser.parse_args()
    application.listen(arguments.port, arguments.host)
    tornado.ioloop.IOLoop.instance().start()

###############################################################################
###############################################################################
