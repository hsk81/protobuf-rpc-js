#include "rpc-server.h"
#include "rpc-task.h"
#include "rpc-http.h"

#include <QtCore/QDebug>
#include <QtCore/QThreadPool>
#include <QtNetwork/QTcpServer>
#include <QtNetwork/QTcpSocket>
#include <QtWebSockets/QtWebSockets>

RpcServer::RpcServer(quint16 port_tcp, quint16 port_ws, QObject *parent)
    : QObject(parent), m_logging(false)
{
    GOOGLE_PROTOBUF_VERIFY_VERSION;

    m_server_tcp = new QTcpServer();
    Q_ASSERT(m_server_tcp);
    bool listening_tcp = m_server_tcp->listen(QHostAddress::Any, port_tcp);
    Q_ASSERT(listening_tcp);

    QObject::connect(
                m_server_tcp, &QTcpServer::newConnection, this, &RpcServer::onTcpConnection);

    m_server_ws = new QWebSocketServer(QStringLiteral("ws-server"), QWebSocketServer::NonSecureMode);
    Q_ASSERT(m_server_ws);
    bool listening_ws = m_server_ws->listen(QHostAddress::Any, port_ws);
    Q_ASSERT(listening_ws);

    QObject::connect(
                m_server_ws, &QWebSocketServer::newConnection, this, &RpcServer::onWsConnection);
    QObject::connect(
                m_server_ws, &QWebSocketServer::closed, this, &RpcServer::closed);
}

RpcServer::~RpcServer() {
    m_server_tcp->close();
    Q_ASSERT(!m_server_tcp->isListening());
    qDeleteAll(m_client_tcp.begin(), m_client_tcp.end());
    Q_ASSERT(m_client_tcp.empty());

    m_server_ws->close();
    Q_ASSERT(!m_server_ws->isListening());
    qDeleteAll(m_client_ws.begin(), m_client_ws.end());
    Q_ASSERT(m_client_ws.empty());
}

void RpcServer::onTcpConnection() {
    QTcpSocket *socket = m_server_tcp->nextPendingConnection();

    Q_ASSERT(socket);
    Q_ASSERT(socket->isReadable());
    Q_ASSERT(socket->isWritable());

    QObject::connect(
                socket, &QTcpSocket::readyRead, this, &RpcServer::onTcpMessage);
    QObject::connect(
                socket, &QTcpSocket::disconnected, this, &RpcServer::onTcpDisconnect);

    m_client_tcp << socket;
    Q_ASSERT(!m_client_tcp.empty());
}

void RpcServer::onTcpDisconnect() {
    QTcpSocket *socket = qobject_cast<QTcpSocket*>(sender());
    Q_ASSERT(socket);
    int length = m_client_tcp.count();
    Q_ASSERT(length > 0);
    m_client_tcp.removeAll(socket);
    Q_ASSERT(m_client_tcp.count() < length);

    socket->deleteLater();
}

void RpcServer::onTcpMessage() {
    QTcpSocket *socket = qobject_cast<QTcpSocket*>(sender());
    Q_ASSERT(socket);
    QByteArray bytes = socket->readAll();
    Q_ASSERT(bytes.length() > 0);

    if (this->getLogging()) {
        qDebug() << "[on:message]" << bytes;
    }

    RpcTask *rpc_task = new RpcTask(RpcHttp::GetBody(bytes), socket);
    rpc_task->setAutoDelete(true);

    QObject::connect(
                rpc_task, &RpcTask::result, this, &RpcServer::onTcpTask,
                Qt::QueuedConnection);

    QThreadPool::globalInstance()->start(rpc_task);
}

void RpcServer::onTcpTask(QByteArray bytes, void *client) {
    Q_ASSERT(bytes.length() > 0);
    QTcpSocket *socket = (QTcpSocket*)client;
    Q_ASSERT(socket != NULL);
    QByteArray http = RpcHttp::PutHeaders(bytes);
    Q_ASSERT(http.length() > bytes.length());
    qint64 written = socket->write(http, http.length());
    Q_ASSERT(written == http.length());

    bool flushed = socket->flush();
    Q_ASSERT(flushed);
    bool waited = socket->waitForBytesWritten(-1);
    Q_ASSERT(waited == false);
    qint64 to_write = socket->bytesToWrite();
    Q_ASSERT(to_write == 0);

    socket->close();
}

void RpcServer::onWsConnection() {
    QWebSocket *socket = m_server_ws->nextPendingConnection();
    Q_ASSERT(socket);

    QObject::connect(
                socket, &QWebSocket::binaryMessageReceived, this, &RpcServer::onWsMessage);
    QObject::connect(
                socket, &QWebSocket::disconnected, this, &RpcServer::onWsDisconnect);

    m_client_ws << socket;
    Q_ASSERT(!m_client_ws.empty());
}

void RpcServer::onWsDisconnect() {
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    Q_ASSERT(client);
    int length = m_client_ws.count();
    Q_ASSERT(length > 0);
    m_client_ws.removeAll(client);
    Q_ASSERT(m_client_ws.count() < length);

    client->deleteLater();
}

void RpcServer::onWsMessage(QByteArray bytes) {
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    Q_ASSERT(client);

    if (this->getLogging()) {
        qDebug() << "[on:message]" << bytes;
    }

    RpcTask *rpc_task = new RpcTask(bytes, client);
    rpc_task->setAutoDelete(true);

    QObject::connect(
                rpc_task, &RpcTask::result, this, &RpcServer::onWsTask,
                Qt::QueuedConnection);

    QThreadPool::globalInstance()->start(rpc_task);
}

void RpcServer::onWsTask(QByteArray bytes, void *client) {
    Q_ASSERT(bytes.length() > 0);
    QWebSocket *socket = (QWebSocket*)client;
    Q_ASSERT(socket != NULL);
    qint64 sent = socket->sendBinaryMessage(bytes);
    Q_ASSERT(sent == bytes.length());
}
