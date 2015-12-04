#-------------------------------------------------
#
# Project created by QtCreator 2015-11-17T15:17:24
#
#-------------------------------------------------

QT       += core websockets
QT       -= gui

TARGET = rpc-server
CONFIG   += console
CONFIG   -= app_bundle

TEMPLATE = app

SOURCES += main.cpp \
    protocol/api.pb.cc \
    protocol/calculator.pb.cc \
    protocol/reflector.pb.cc \
    protocol/rpc.pb.cc \
    rpc-server.cpp \
    rpc-task.cpp \
    rpc-http.cpp

HEADERS += \
    protocol/api.pb.h \
    protocol/calculator.pb.h \
    protocol/reflector.pb.h \
    protocol/rpc.pb.h \
    rpc-task.h \
    rpc-server.h \
    rpc-http.h

INCLUDEPATH += /usr/include
LIBS += -L/usr/lib/ -lprotobuf -pthread  -lpthread
