#!/bin/bash

# Lambda deployment package preparation script

set -e

echo "=========================================="
echo "Preparing Lambda deployment package"
echo "=========================================="
echo ""

# Clean up previous build
echo "Cleaning up previous build..."
rm -rf lambda-dist
mkdir -p lambda-dist

# Copy compiled code
echo "Copying compiled code from dist/..."
cp -r dist/* lambda-dist/

# Copy package.json and package-lock.json
echo "Copying package files..."
cp package.json lambda-dist/
cp package-lock.json lambda-dist/

# Install production dependencies
echo "Installing production dependencies..."
cd lambda-dist
npm install --omit=dev --production
cd ..

echo ""
echo "=========================================="
echo "✅ Lambda package prepared successfully"
echo "=========================================="
echo "Package location: lambda-dist/"
echo ""
