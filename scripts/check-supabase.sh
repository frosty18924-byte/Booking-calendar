#!/bin/bash

# Supabase Configuration Checker
# This script helps verify your Supabase setup is correct

echo "🔍 Supabase Configuration Checker"
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    echo "   Create one using: cp .env.example .env.local"
    echo ""
    exit 1
fi

# Source the env file
set -a
source .env.local
set +a

echo "✅ Found .env.local file"
echo ""

# Check environment variables
echo "📋 Checking environment variables..."
echo ""

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
    ERROR=1
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
    ERROR=1
else
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"
    ERROR=1
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
fi

echo ""

if [ "$ERROR" = "1" ]; then
    echo "❌ Some environment variables are missing"
    echo "   Please check your .env.local file"
    echo ""
    exit 1
fi

# Test Supabase connection
echo "🔌 Testing Supabase connection..."
echo ""

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Successfully connected to Supabase"
else
    echo "❌ Failed to connect to Supabase (HTTP $RESPONSE)"
    echo "   Check your URL and API key"
    exit 1
fi

echo ""

# Check for required tables
echo "📊 Checking database tables..."
echo ""

check_table() {
    TABLE=$1
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
      -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
      "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$TABLE?limit=1")
    
    if [ "$RESPONSE" = "200" ]; then
        echo "✅ Table '$TABLE' exists"
    else
        echo "⚠️  Table '$TABLE' not accessible (HTTP $RESPONSE)"
        echo "   This might be due to RLS policies or missing table"
    fi
}

check_table "profiles"
check_table "training_events"
check_table "courses"
check_table "bookings"

echo ""
echo "=================================="
echo "✅ Configuration check complete!"
echo ""
echo "Next steps:"
echo "1. If any tables are missing, run the database migrations"
echo "2. Test the application locally: npm run dev"
echo "3. Deploy to Vercel and set the same environment variables"
echo "4. Follow TESTING.md for detailed testing instructions"
echo ""
