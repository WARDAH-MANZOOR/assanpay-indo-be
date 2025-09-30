#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Build TypeScript
echo "🏗️ Building TypeScript..."
npm run build

# Seed the database (if needed)
if [ "$1" == "--seed" ]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

echo "✅ Build completed successfully!"
echo "To start the application:"
echo "  Development: npm run dev"
echo "  Production: npm start" 