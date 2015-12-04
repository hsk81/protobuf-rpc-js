#ifndef RPC_HTTP_H
#define RPC_HTTP_H

#include <QtCore/QByteArray>

namespace RpcHttp {
    QByteArray PutHeaders(QByteArray bytes);
    QByteArray GetBody(QByteArray bytes);
}

#endif // RPC_HTTP_H
