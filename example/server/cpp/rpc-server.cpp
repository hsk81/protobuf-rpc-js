#include "rpc-server.h"
#include "protocol/rpc.pb.h"
#include "protocol/api.pb.h"

#include <QtWebSockets/QtWebSockets>

QT_USE_NAMESPACE

RpcServer::RpcServer(quint16 port, QObject *parent) : QObject(parent) {
    GOOGLE_PROTOBUF_VERIFY_VERSION;

    QString name = QStringLiteral("rpc-server");
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
    QWebSocket *socket = m_server->nextPendingConnection();
    Q_ASSERT(socket);

    QObject::connect(
                socket, &QWebSocket::binaryMessageReceived, this, &RpcServer::onBinary);
    QObject::connect(
                socket, &QWebSocket::disconnected, this, &RpcServer::onDisconnect);

    m_clients << socket;
    Q_ASSERT(!m_clients.empty());
}

void RpcServer::onBinary(QByteArray req_msg) {
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    Q_ASSERT(client);

    const void *req_data = req_msg.constData();
    Q_ASSERT(req_data);
    int req_size = req_msg.length();
    Q_ASSERT(req_size);
    bool req_parsed = m_req.ParseFromArray(req_data, req_size);
    Q_ASSERT(req_parsed);

    if (m_req.name() == ".Reflector.Service.ack") {
        bool ack_parsed = m_ack_req.ParseFromString(m_req.data());
        Q_ASSERT(ack_parsed);

        m_ack_res.set_timestamp(m_ack_req.timestamp());
        m_res.set_data(m_ack_res.SerializeAsString());
    } else if (m_req.name() == ".Calculator.Service.add") {
        bool add_parsed = m_add_req.ParseFromString(m_req.data());
        Q_ASSERT(add_parsed);

        m_add_res.set_value(m_add_req.lhs() + m_add_req.rhs());
        m_res.set_data(m_add_res.SerializeAsString());
    } else if (m_req.name() == ".Calculator.Service.sub") {
        bool sub_parsed = m_sub_req.ParseFromString(m_req.data());
        Q_ASSERT(sub_parsed);

        m_sub_res.set_value(m_sub_req.lhs() - m_sub_req.rhs());
        m_res.set_data(m_sub_res.SerializeAsString());
    } else if (m_req.name() == ".Calculator.Service.mul") {
        bool mul_parsed = m_mul_req.ParseFromString(m_req.data());
        Q_ASSERT(mul_parsed);

        m_mul_res.set_value(m_mul_req.lhs() * m_mul_req.rhs());
        m_res.set_data(m_mul_res.SerializeAsString());
    } else if (m_req.name() == ".Calculator.Service.div") {
        bool mul_parsed = m_div_req.ParseFromString(m_req.data());
        Q_ASSERT(mul_parsed);

        m_div_res.set_value(m_div_req.lhs() / m_div_req.rhs());
        m_res.set_data(m_div_res.SerializeAsString());
    } else {
        throw RpcException(QString(m_req.name().c_str()).append(": not supported"));
    }

    m_res.set_id(m_req.id());
    Q_ASSERT(m_res.id());
    int res_size = m_res.ByteSize();
    Q_ASSERT(res_size);
    QByteArray res_msg(res_size, 0);
    Q_ASSERT(res_msg.capacity() == res_size);
    m_res.SerializeToArray(res_msg.data(), res_size);
    Q_ASSERT(res_msg.size() == res_size);

    client->sendBinaryMessage(res_msg);
}

void RpcServer::onDisconnect() {
    QWebSocket *client = qobject_cast<QWebSocket *>(sender());
    Q_ASSERT(client);

    int length = m_clients.count();
    m_clients.removeAll(client);

    Q_ASSERT(m_clients.count() < length);
    client->deleteLater();
}
