.PHONY: run-py run-py.env
.PHONY: clean-py

###############################################################################
###############################################################################

build: \
	build-npm
build-npm:
	npm install

build-server: \
	build-server-cpp \
	build-server-py
build-server-cpp: build-cpp.pb
	cd example/server/cpp && mkdir -p build/
	cd example/server/cpp/build/ && qmake ../
	cd example/server/cpp/build/ && make
build-server-py: build-py.pb
	cd example/server/py && rm env -rf && mkdir -p env
	cd example/server/py && virtualenv2 --system-site-packages -p /usr/bin/python2 env/
	cd example/server/py && env/bin/python setup.py install

build-cpp.pb:
	cd example/protocol && protoc --proto_path=. --cpp_out=. *.proto
build-py.pb:
	cd example/protocol && touch __init__.py
	cd example/protocol && protoc --proto_path=. --python_out=. *.proto

###############################################################################
###############################################################################

clean: \
	clean-lib clean-server
clean-lib:
	rm node_modules -rf
clean-protocol:
	rm example/protocol/__init__.py -f
	rm example/protocol/*_pb2.py -f
	rm example/protocol/*_pb.cc -f
	rm example/protocol/*_pb.h -f
clean-server: \
	clean-server-cpp clean-server-py
clean-server-cpp:
	rm example/server/cpp/build -rf
clean-server-py:
	rm example/server/py/{build,dist,env} -rf
	rm example/server/py/*.egg-info -rf

###############################################################################
###############################################################################
