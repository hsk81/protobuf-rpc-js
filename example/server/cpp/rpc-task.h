#ifndef RPC_TASK_H
#define RPC_TASK_H

#include <QtCore/QByteArray>
#include <QtCore/QException>
#include <QtCore/QObject>
#include <QtCore/QRunnable>

#include "protocol/rpc.pb.h"
#include "protocol/api.pb.h"

class RpcTask : public QObject, public QRunnable
{
    Q_OBJECT
public:
    explicit RpcTask(QByteArray bytes, void *socket = NULL, QObject *parent = 0);

signals:
    void result(QByteArray bytes, void *socket = NULL);

protected:
    void run();

private:
    QByteArray m_bytes;
    void *m_socket;

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

private:
    QByteArray process(QByteArray);
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

#endif // RPC_TASK_H
