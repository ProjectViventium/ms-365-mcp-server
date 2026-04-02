#!/bin/bash
# VIVENTIUM START
# Purpose: Viventium-owned addition copied into LibreChat fork.
# Details: docs/requirements_and_learnings/05_Open_Source_Modifications.md#librechat-viventium-additions
# VIVENTIUM END
#==============================================================================#
#                  MS 365 MCP Server - Local Development Quickstart            #
#==============================================================================#
# This script helps you set up the MS 365 MCP Server integration with LibreChat
# for local development and testing.
#
# Prerequisites:
# - Docker and Docker Compose installed
# - Azure AD App Registration (see README.md)
# - Client ID and Tenant ID from Azure Portal
#
# Usage:
#   ./local-quickstart.sh
#==============================================================================#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=============================================="
echo "MS 365 MCP Server - Local Development Setup"
echo "=============================================="
echo ""

# Check if .env exists, if not create from env.txt
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/env.txt" ]; then
        echo "Creating .env from env.txt..."
        cp "$PROJECT_ROOT/env.txt" "$PROJECT_ROOT/.env"
    else
        echo "ERROR: Neither .env nor env.txt found in project root"
        echo "Please create an .env file with required variables"
        exit 1
    fi
fi

# Check for required MS 365 environment variables
echo "Checking MS 365 MCP configuration..."
echo ""

# Source .env to check variables
source "$PROJECT_ROOT/.env" 2>/dev/null || true

if [ -z "$MS365_MCP_CLIENT_ID" ] || [ "$MS365_MCP_CLIENT_ID" = "your-azure-ad-app-client-id-here" ]; then
    echo "⚠️  MS365_MCP_CLIENT_ID is not configured!"
    echo ""
    echo "To configure MS 365 MCP Server:"
    echo ""
    echo "1. Go to Azure Portal > Azure Active Directory > App registrations"
    echo "2. Create a new registration or use an existing one"
    echo "3. Copy the Application (client) ID"
    echo "4. Update your .env file with:"
    echo ""
    echo "   MS365_MCP_CLIENT_ID=<your-client-id>"
    echo "   MS365_MCP_TENANT_ID=<your-tenant-id-or-common>"
    echo ""
    echo "5. Configure redirect URIs in Azure AD:"
    echo "   http://localhost:6274/oauth/callback"
    echo "   http://localhost:6274/oauth/callback/debug"
    echo ""
    echo "See README.md for detailed instructions."
    echo ""
    read -p "Press Enter to continue without MS 365 (or Ctrl+C to exit)..."
else
    echo "✅ MS365_MCP_CLIENT_ID is configured"
fi

if [ -z "$MS365_MCP_TENANT_ID" ]; then
    echo "⚠️  MS365_MCP_TENANT_ID is not set, using 'common' (multi-tenant)"
    echo "   For enterprise use, set this to your organization's tenant ID"
else
    echo "✅ MS365_MCP_TENANT_ID is configured: $MS365_MCP_TENANT_ID"
fi

echo ""

# Check if librechat.yaml exists
if [ ! -f "$PROJECT_ROOT/librechat.yaml" ]; then
    echo "⚠️  librechat.yaml not found in project root"
    echo "   MS 365 MCP configuration will not be loaded"
    echo ""
    echo "   Please ensure librechat.yaml exists with mcpServers configuration"
else
    echo "✅ librechat.yaml found"
    
    # Check if mcpServers is configured
    if grep -q "mcpServers:" "$PROJECT_ROOT/librechat.yaml"; then
        echo "✅ mcpServers section found in librechat.yaml"
    else
        echo "⚠️  mcpServers section not found in librechat.yaml"
        echo "   MS 365 MCP tools will not be available"
    fi
fi

echo ""

# Check if docker-compose.override.yml exists
if [ ! -f "$PROJECT_ROOT/docker-compose.override.yml" ]; then
    echo "⚠️  docker-compose.override.yml not found"
    echo "   Using default docker-compose.yml settings"
else
    echo "✅ docker-compose.override.yml found"
fi

echo ""
echo "=============================================="
echo "Starting LibreChat with MS 365 MCP Support..."
echo "=============================================="
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Pull latest images (optional)
read -p "Pull latest Docker images? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose pull
fi

# Start services
echo "Starting Docker containers..."
docker compose up -d

echo ""
echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "LibreChat is starting at: http://localhost:3080"
echo ""
echo "To use MS 365 MCP tools:"
echo "1. Open LibreChat in your browser"
echo "2. Create or edit an Agent"
echo "3. In the Tools section, enable 'ms-365' or specific presets"
echo "4. Start a conversation and use MS 365 features"
echo "5. When prompted, complete device code authentication"
echo ""
echo "View logs:"
echo "  docker compose logs -f api"
echo ""
echo "Stop services:"
echo "  docker compose down"
echo ""

