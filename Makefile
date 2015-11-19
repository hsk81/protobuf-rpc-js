.PHONY: run-py run-py.env
.PHONY: clean-py

###############################################################################
###############################################################################

build: \
	build-npm

build-npm:
	npm install

build-server-py: build-py.pb
	cd example/server/py && rm env -rf && mkdir -p env
	cd example/server/py && virtualenv2 --system-site-packages -p /usr/bin/python2 env/
	cd example/server/py && env/bin/python setup.py install

build-py.pb:
	cd example/protocol && touch __init__.py
	cd example/protocol && protoc --proto_path=. --python_out=. *.proto
build-cpp.pb:
	cd example/protocol && protoc --proto_path=. --cpp_out=. *.proto

###############################################################################
###############################################################################

clean: \
	clean-lib clean-server-py

clean-lib:
	rm node_modules -rf

clean-protocol:
	rm example/protocol/__init__.py -f
	rm example/protocol/*_pb2.py -f
	rm example/protocol/*_pb.cc -f
	rm example/protocol/*_pb.h -f

clean-server-py:
	rm example/server/py/{build,dist,env} -rf
	rm example/server/py/*.egg-info -rf

###############################################################################
###############################################################################
