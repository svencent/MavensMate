# ci will set both of these vars, but when running locally, will run all *.js tests and index will be 0
TESTS ?= $(shell find test -name '*.js')
INDEX ?= 0

# coverage options
REPORTER = html-cov
COVERAGE_FILE = coverage.html

print-%: ; @echo $*=$($*)

test:
	@NODE_ENV=test HTTP_MAX_SOCKETS=5000 PARALLELISM_INDEX=$(INDEX) ./node_modules/.bin/mocha \
	--recursive \
	--check-leaks \
	$(TESTS)

coverage:
	@NODE_ENV=test HTTP_MAX_SOCKETS=5000 PARALLELISM_INDEX=$(INDEX) ./node_modules/.bin/mocha \
	--recursive \
	--require blanket \
	--reporter html-cov \
	$(TESTS) > test/coverage.html

coveralls:
	@NODE_ENV=test HTTP_MAX_SOCKETS=5000 PARALLELISM_INDEX=$(INDEX) YOURPACKAGE_COVERAGE=1 ./node_modules/.bin/mocha \
	--recursive \
	--require blanket \
	--reporter mocha-lcov-reporter \
	$(TESTS) | ./node_modules/coveralls/bin/coveralls.js


.PHONY: test
