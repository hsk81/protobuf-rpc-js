#include "rpc-task.h"

#include <QtCore/QByteArray>
#include <QtCore/QDebug>
#include <QtCore/QObject>
#include <QtCore/QRunnable>

RpcTask::RpcTask(QByteArray bytes, void *socket, QObject *parent)
    : m_bytes(bytes), m_socket(socket) {
}

void RpcTask::run() {
    QByteArray bytes = process(m_bytes);
    Q_ASSERT(bytes.length() > 0);
    emit result(bytes, m_socket);
}

QByteArray RpcTask::process(QByteArray req_msg) {
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
    Q_ASSERT(m_res.id() > 0);
    int res_size = m_res.ByteSize();
    Q_ASSERT(res_size);
    QByteArray res_msg(res_size, 0);
    Q_ASSERT(res_msg.capacity() == res_size);
    m_res.SerializeToArray(res_msg.data(), res_size);
    Q_ASSERT(res_msg.size() == res_size);

    return res_msg;
}
