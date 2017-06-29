#!/bin/bash
DIR=$(dirname "$(readlink -f "$0")")
cp -a $DIR/schemas $DIR/web
cp -a $DIR/schemas $DIR/api
cp -a $DIR/schemas $DIR/controller

docker-compose -f docker-compose.yml build "$@" 
