#!/bin/bash
ulimit -c unlimited
ulimit -n 100000
export LD_LIBRARY_PATH=".:$LD_LIBRARY_PATH./libdukc:./libblsc"
export RUST_BACKTRACE=full
./pi_serv -c ../dst,pi_pt,game,cfg > stdout.log 2> stderr.log &
