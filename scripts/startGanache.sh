#/bin/bash

pid=$(lsof -i:8646 -t); kill -TERM $pid || kill -KILL $pid

../node_modules/.bin/ganache-cli -p 8646 \
 -l 8000000 \
 --noVMErrorsOnRPCResponse \
 --account="0x1111111111111111111111111111111111111111111111111111111111111111,300000000000000000000000" \
 --account="0x2222222222222222222222222222222222222222222222222222222222222222,300000000000000000000000" \
 --account="0x3333333333333333333333333333333333333333333333333333333333333333,250000000000000000000000" \
 --account="0x4444444444444444444444444444444444444444444444444444444444444444,250000000000000000000000" \
 --account="0x5555555555555555555555555555555555555555555555555555555555555555,100000000000000000000000" \
 --account="0x6666666666666666666666666666666666666666666666666666666666666666,100000000000000000000000" \
 --account="0x7777777777777777777777777777777777777777777777777777777777777777,100000000000000000000000" \
 --account="0x8888888888888888888888888888888888888888888888888888888888888888,100000000000000000000000" \
 --account="0x9999999999999999999999999999999999999999999999999999999999999999,100000000000000000000000" \
 --account="0x2121212121212121212121212121212121212121212121212121212121212121,200000000000000000000000" \
 --account="0x0000000000000000000000000000000000000000000000000000000000000001,200000000000000000000000" \
 --account="0x0000000000000000000000000000000000000000000000000000000000000002,200000000000000000000000" \
 --account="0xd30dbe9e73d275b3a1c9eee785c5c1971f811453d2bf49b71f668beb8bb8fa8a,300000000000000000000000" \
 --account="0x58EA457E313A8FB4CC087626163150887BC652131B53FFAB31C6DED4DE018DED,400000000000000000000000"