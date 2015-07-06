#!/usr/bin/env bash

i=0
files=( )
for file in $(find ./test/integration/commands -name "*.js")
do
  if [[ $(($i % $CIRCLE_NODE_TOTAL)) -eq $CIRCLE_NODE_INDEX ]]
  then
    files+=" $file"
  fi
  ((i++))
done

make tests2=${files[@]} test