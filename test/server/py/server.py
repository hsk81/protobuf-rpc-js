#!/usr/bin/env python
###############################################################################

import argparse, os
import tornado.web
import tornado.websocket
import tornado.ioloop

###############################################################################
###############################################################################

from protocol import space_pb2 as Space
from protocol import system_pb2 as System

###############################################################################
###############################################################################

class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def on_message(self, data):

        req = Space.Rpc.Request()
        req.ParseFromString(data)
        pair = System.Pair()
        pair.ParseFromString(req.data)

        if req.name == '.System.Service.add':
            result = System.AddResult()
            result.value = pair.lhs + pair.rhs

        elif req.name == '.System.Service.sub':
            result = System.SubResult()
            result.value = pair.lhs - pair.rhs

        elif req.name == '.System.Service.mul':
            result = System.MulResult()
            result.value = pair.lhs * pair.rhs

        elif req.name == '.System.Service.div':
            result = System.DivResult()
            result.value = pair.lhs / pair.rhs

        else:
            raise Exception('{0}: not supported'.format(req.name))

        res = Space.Rpc.Response()
        res.data = result.SerializeToString()
        res.id = req.id

        self.write_message(res.SerializeToString(), binary=True)

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
