#!/usr/bin/env bash

NODE_TOTAL=${CI_NODE_TOTAL:-1}
NODE_INDEX=${CI_NODE_INDEX:-0}

i=0
files=()
for file in $(find test -name "*.js" | sort)
do
  if [ $(($i % ${NODE_TOTAL})) -eq ${NODE_INDEX} ]
  then
    files+=" $file"
  fi
  ((i++))
done

echo "test index ---> ${NODE_INDEX}"
echo "test files --->"
echo ${files[@]}
make TESTS="${files[@]}" INDEX="${NODE_INDEX}" test