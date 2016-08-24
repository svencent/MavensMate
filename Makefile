# ci will set both of these vars, but when running locally, will run all *.js tests and index will be 0
TESTS ?= $(shell find test -name '*.js')
INDEX ?= 0

print-%: ; @echo $*=$($*)

test:
	@NODE_ENV=test HTTP_MAX_SOCKETS=5000 PARALLELISM_INDEX=$(INDEX) ./node_modules/.bin/mocha \
	--recursive \
	--check-leaks \
	$(TESTS)

coverage:
	@NODE_ENV=test HTTP_MAX_SOCKETS=5000 PARALLELISM_INDEX=$(INDEX) \
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha \
	--recursive \
	--check-leaks \
	$(TESTS)

.PHONY: test coverage
