.PHONY: run-py run-py.env
.PHONY: clean-py

###############################################################################
###############################################################################

build: \
	build-npm

build-npm:
	npm install

build-client-js-www:
	cd example/client/js-www && rm env -rf && mkdir -p env
	cd example/client/js-www && virtualenv2 -p /usr/bin/python2 env/
	cd example/client/js-www && env/bin/python setup.py install

build-server-py: build-py.pb
	cd example/server/py && rm env -rf && mkdir -p env
	cd example/server/py && virtualenv2 --system-site-packages -p /usr/bin/python2 env/
	cd example/server/py && env/bin/python setup.py install

build-py.pb:
	cd example/protocol && touch __init__.py
	cd example/protocol && protoc --proto_path=. --python_out=. *.proto

###############################################################################
###############################################################################

clean: \
	clean-lib clean-client-js-www clean-server-py
clean-lib:
	rm node_modules -rf

clean-client-js-www:
	rm example/client/js-www/{build,dist,env} -rf
	rm example/client/js-www/*.egg-info -rf
	rm example/client/js-www/protocol/*_pb2.py -f
	rm example/client/js-www/protocol/__init__.py -f

clean-server-py:
	rm example/server/py/{build,dist,env} -rf
	rm example/server/py/*.egg-info -rf
	rm example/server/py/protocol/*_pb2.py -f
	rm example/server/py/protocol/__init__.py -f

###############################################################################
###############################################################################
