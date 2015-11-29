#include <QCoreApplication>
#include <QtCore/QCommandLineParser>
#include <QtCore/QCommandLineOption>

#include "rpc-server.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);
    app.setApplicationVersion("1.1.2");

    QCommandLineParser parser;
    parser.setApplicationDescription("RPC Server");
    parser.addHelpOption();
    parser.addVersionOption();

    QCommandLineOption logging_opt(
                QStringList() << "l" << "logging",
                QCoreApplication::translate("main", "Logging [default: false]"));
    parser.addOption(logging_opt);
    QCommandLineOption tcp_port_opt(
                QStringList() << "tcp-port",
                QCoreApplication::translate("main", "TCP Server Port [default: 8088]"),
                QCoreApplication::translate("main", "tcp-port"), QStringLiteral("8088"));
    parser.addOption(tcp_port_opt);
    QCommandLineOption ws_port_opt(
                QStringList() << "ws-port",
                QCoreApplication::translate("main", "WS Server Port [default: 8089]"),
                QCoreApplication::translate("main", "ws-port"), QStringLiteral("8089"));
    parser.addOption(ws_port_opt);
    parser.process(app);

    bool logging = parser.isSet(logging_opt);
    Q_ASSERT(logging == true || logging == false);
    int port_tcp = parser.value(tcp_port_opt).toInt();
    Q_ASSERT(port_tcp);
    int port_ws = parser.value(ws_port_opt).toInt();
    Q_ASSERT(port_ws);

    RpcServer *server = new RpcServer(port_tcp, port_ws);
    Q_ASSERT(server);
    server->setLogging(logging);
    Q_ASSERT(server->getLogging() == logging);

    QObject::connect(server, &RpcServer::closed, &app, &QCoreApplication::quit);
    return app.exec();
}
