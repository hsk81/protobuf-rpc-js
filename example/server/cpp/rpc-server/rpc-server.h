#ifndef RPC_SERVER_H
#define RPC_SERVER_H

#include <QtCore/QByteArray>
#include <QtCore/QList>
#include <QtCore/QObject>

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
};

#endif // RPC_SERVER_H
