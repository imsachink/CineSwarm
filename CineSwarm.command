#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/Users/sachinkaundal/.nvm/versions/node/v24.16.0/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$DIR"
node launch.js

