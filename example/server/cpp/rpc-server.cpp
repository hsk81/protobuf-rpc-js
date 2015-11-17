#include "rpc-server.h"
#include <QtWebSockets/QtWebSockets>
#include <QDebug>

QT_USE_NAMESPACE

RpcServer::RpcServer(quint16 port, QObject *parent) : QObject(parent) {

    QString name = QStringLiteral("RPC Server");
    QWebSocketServer::SslMode mode = QWebSocketServer::NonSecureMode;

    m_server = new QWebSocketServer(name, mode);
    Q_ASSERT(m_server);

    bool listening = m_server->listen(QHostAddress::Any, port);
    Q_ASSERT(listening);

    QObject::connect(
                m_server, &QWebSocketServer::newConnection, this, &RpcServer::onConnection);
    QObject::connect(
                m_server, &QWebSocketServer::closed, this, &RpcServer::closed);
}

RpcServer::~RpcServer() {

    m_server->close();
    Q_ASSERT(!m_server->isListening());

    qDeleteAll(m_clients.begin(), m_clients.end());
    Q_ASSERT(m_clients.empty());
}

void RpcServer::onConnection() {
    qDebug() << "[on:connection]";

    QWebSocket *socket = m_server->nextPendingConnection();
    Q_ASSERT(socket);

    QObject::connect(
                socket, &QWebSocket::binaryMessageReceived, this, &RpcServer::onBinary);
    QObject::connect(
                socket, &QWebSocket::disconnected, this, &RpcServer::onDisconnect);

    m_clients << socket;
    Q_ASSERT(!m_clients.empty());
}

void RpcServer::onBinary(QByteArray message) {
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    Q_ASSERT(client);

    client->sendBinaryMessage(message); // echo
}

void RpcServer::onDisconnect() {
    qDebug() << "[on:disconnect]";

    QWebSocket *client = qobject_cast<QWebSocket *>(sender());
    Q_ASSERT(client);

    int length = m_clients.count();
    m_clients.removeAll(client);

    Q_ASSERT(m_clients.count() < length);
    client->deleteLater();
}
