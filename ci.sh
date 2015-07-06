#!/usr/bin/env bash

NODE_TOTAL=${CIRCLE_NODE_TOTAL:-1}
NODE_INDEX=${CIRCLE_NODE_INDEX:-0}

i=0
files=()
for file in $(find ./test/integration/commands -name "*.js" | sort)
do
  if [ $(($i % ${NODE_TOTAL})) -eq ${NODE_INDEX} ]
  then
    files+=" $file"
  fi
  ((i++))
done

make tests2=${files[@]} test