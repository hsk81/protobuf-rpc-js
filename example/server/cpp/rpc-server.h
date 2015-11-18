#ifndef RPC_SERVER_H
#define RPC_SERVER_H

#include <QtCore/QObject>
#include <QtCore/QByteArray>
#include <QtCore/QException>
#include <QtCore/QList>
#include <QtCore/QString>

#include "protocol/rpc.pb.h"
#include "protocol/api.pb.h"

QT_FORWARD_DECLARE_CLASS(QWebSocketServer)
QT_FORWARD_DECLARE_CLASS(QWebSocket)

class RpcServer : public QObject
{
    Q_OBJECT
public:
    explicit RpcServer(quint16 port, QObject *parent = 0);
    ~RpcServer();

Q_SIGNALS:
    void closed();

private Q_SLOTS:
    void onConnection();
    void onBinary(QByteArray message);
    void onDisconnect();

private:
    QWebSocketServer *m_server;
    QList<QWebSocket*> m_clients;

private:
    Rpc_Request m_req;
    Rpc_Response m_res;

private:
    Reflector::AckRequest m_ack_req;
    Reflector::AckResult m_ack_res;

private:
    Calculator::AddRequest m_add_req;
    Calculator::AddResult m_add_res;
    Calculator::SubRequest m_sub_req;
    Calculator::SubResult m_sub_res;
    Calculator::MulRequest m_mul_req;
    Calculator::MulResult m_mul_res;
    Calculator::DivRequest m_div_req;
    Calculator::DivResult m_div_res;
};

class RpcException : public QException
{
public:
    RpcException(QString message) : m_message(message) {}
    ~RpcException() throw() {}

    void raise() const {
        throw *this;
    }
    const char *what () const throw () {
        return m_message.toUtf8().data();
    }
public:
    QString m_message;
};

#endif // RPC_SERVER_H
