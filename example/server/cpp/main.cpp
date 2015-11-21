#include <QCoreApplication>
#include <QtCore/QCommandLineParser>
#include <QtCore/QCommandLineOption>

#include "ws-server.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);
    app.setApplicationVersion("1.0.3");

    QCommandLineParser parser;
    parser.setApplicationDescription("RPC Server");
    parser.addHelpOption();
    parser.addVersionOption();

    QCommandLineOption logging_opt(
                QStringList() << "l" << "logging",
                QCoreApplication::translate("main", "Logging [default: false]"));
    parser.addOption(logging_opt);
    QCommandLineOption ws_port_opt(
                QStringList() << "ws-port",
                QCoreApplication::translate("main", "WS Server Port [default: 8089]"),
                QCoreApplication::translate("main", "ws-port"), QStringLiteral("8089"));
    parser.addOption(ws_port_opt);
    parser.process(app);

    bool logging = parser.isSet(logging_opt);
    Q_ASSERT(logging == true || logging == false);
    int port = parser.value(ws_port_opt).toInt();
    Q_ASSERT(port);

    WsServer *server = new WsServer(port);
    Q_ASSERT(server);
    server->setLogging(logging);
    Q_ASSERT(server->getLogging() == logging);

    QObject::connect(server, &WsServer::closed, &app, &QCoreApplication::quit);
    return app.exec();
}
