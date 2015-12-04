#ifndef RPC_SERVER_H
#define RPC_SERVER_H

#include <QtCore/QByteArray>
#include <QtCore/QList>
#include <QtCore/QObject>
#include <QtCore/QString>

QT_FORWARD_DECLARE_CLASS(QTcpServer)
QT_FORWARD_DECLARE_CLASS(QTcpSocket)
QT_FORWARD_DECLARE_CLASS(QWebSocketServer)
QT_FORWARD_DECLARE_CLASS(QWebSocket)

class RpcServer : public QObject
{
    Q_OBJECT
public:
    explicit RpcServer(quint16, quint16, QObject *parent = 0);
    ~RpcServer();

Q_SIGNALS:
    void closed();

private Q_SLOTS:
    void onTcpConnection();
    void onTcpMessage();
    void onTcpDisconnect();
    void onTcpTask(QByteArray, void*);
private:
    QTcpServer *m_server_tcp;
    QList<QTcpSocket*> m_client_tcp;

private Q_SLOTS:
    void onWsConnection();
    void onWsMessage(QByteArray);
    void onWsDisconnect();
    void onWsTask(QByteArray, void*);
private:
    QWebSocketServer *m_server_ws;
    QList<QWebSocket*> m_client_ws;

private:
    bool m_logging;
public:
    bool getLogging() { return m_logging; }
    void setLogging(bool value) { m_logging = value; }

private:
    QByteArray PutHttpHeaders(QByteArray);
    QByteArray GetHttpBody(QByteArray);
};

#endif // RPC_SERVER_H
