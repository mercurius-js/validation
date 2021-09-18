#! /bin/bash

echo '===================================='
echo '= Normal Mode | Without Validation ='
echo '===================================='
npx concurrently --raw -k \
  "node ./bench/normal-without-validation.js" \
  "npx wait-on tcp:3000 && node ./bench/normal-bench.js"

echo '================================='
echo '= Normal Mode | With Validation ='
echo '================================='
npx concurrently --raw -k \
  "node ./bench/normal-with-validation.js" \
  "npx wait-on tcp:3000 && node ./bench/normal-bench.js"

echo '====================================='
echo '= Gateway Mode | Without Validation ='
echo '====================================='
npx concurrently --raw -k \                                                                              [12:23:58]
  "node ./bench/gateway-user-service.js" \
  "node ./bench/gateway-post-service.js" \
  "npx wait-on tcp:3001 tcp:3002 && node ./bench/gateway-without-validation.js"

echo '=================================='
echo '= Gateway Mode | With Validation ='
echo '=================================='
npx concurrently --raw -k \                                                                              [12:23:58]
  "node ./bench/gateway-user-service.js" \
  "node ./bench/gateway-post-service.js" \
  "npx wait-on tcp:3001 tcp:3002 && node ./bench/gateway-with-validation.js"
