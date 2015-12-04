#include "rpc-http.h"

#include <QtCore/QByteArray>
#include <QtCore/QDateTime>
#include <QtCore/QList>
#include <QtCore/QLocale>
#include <QtCore/QString>

QByteArray RpcHttp::PutHeaders(QByteArray bytes) {
    QString gmt = QLocale::c()
            .toString(QDateTime::currentDateTimeUtc(), "ddd, dd MMM yyyy hh:mm:ss")
            .append(" GMT");

    QString string = QString::fromLatin1(bytes, bytes.length());
    Q_ASSERT(string.length() > 0);
    QByteArray array(string.toLocal8Bit());
    Q_ASSERT(array.length() > 0);

    QByteArray response = "HTTP/1.1 200 OK";
    response.append("\r\n")
            .append("Access-Control-Allow-Origin: ")
            .append("*");
    response.append("\r\n")
            .append("Data: ")
            .append(gmt);
    response.append("\r\n")
            .append("Connection: ")
            .append("keep-alive");
    response.append("\r\n")
            .append("Content-Length: ")
            .append(QString::number(array.length()));
    response.append("\r\n")
            .append("\r\n");

    return response.append(array);
}

QByteArray RpcHttp::GetBody(QByteArray bytes) {
    QList<QByteArray> lines = bytes.split('\n');

    int i = 0;
    foreach(QByteArray line, lines) {
        if (line.length() > 0) {
            i += line.length();
        } else {
            i += 2; // "\r\n"
            break;
        }
    }

    return bytes.mid(i + 4);
}
