#!/bin/bash
set -e
npm install
echo "Skipping automatic DB schema push to protect existing production/user data."
echo "Run migrations manually when explicitly intended (e.g. npm run db:push)."
