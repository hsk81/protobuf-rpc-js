#include <QCoreApplication>
#include <QtCore/QCommandLineParser>
#include <QtCore/QCommandLineOption>

#include "rpc-server.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);
    app.setApplicationVersion("0.0.1");

    QCommandLineParser parser;
    parser.setApplicationDescription("RPC Server");
    parser.addHelpOption();
    parser.addVersionOption();

    QCommandLineOption port_opt(
                QStringList() << "p" << "port",
                QCoreApplication::translate("main", "Server Port [default: 8088]."),
                QCoreApplication::translate("main", "port"), QStringLiteral("8088"));
    parser.addOption(port_opt);
    parser.process(app);

    int port = parser.value(port_opt).toInt();
    Q_ASSERT(port);
    RpcServer *server = new RpcServer(port);
    Q_ASSERT(server);

    QObject::connect(server, &RpcServer::closed, &app, &QCoreApplication::quit);
    return app.exec();
}
