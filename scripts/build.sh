#!/bin/bash

# Build the TypeScript files
tsc

# Bundle the application using Rollup
rollup -c rollup.config.js

# Optionally, you can add additional build steps here, such as minification or copying assets.