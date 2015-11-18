#include <QCoreApplication>
#include "rpc-server.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    RpcServer *server = new RpcServer(8088);
    Q_ASSERT(server);

    QObject::connect(server, &RpcServer::closed, &app, &QCoreApplication::quit);
    return app.exec();
}
