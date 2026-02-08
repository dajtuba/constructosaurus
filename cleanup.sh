#!/bin/bash

# Cleanup script - removes development artifacts and keeps only essentials

echo "🧹 Cleaning up Constructosaurus directory..."
echo ""

# Remove development/testing artifacts
echo "Removing development artifacts..."

# Remove old phase documentation
rm -f "# Constructosaurus Refactoring Plan for 2025.md"
rm -f AGENTS.md
rm -f AUDIT.md
rm -f IMPLEMENTATION.md
rm -f LARGE_DOC_VALIDATION.md
rm -f MCP_SETUP_INSTRUCTIONS.md
rm -f PHASE1_COMPLETE.md
rm -f PHASE1_EXTENDED.md
rm -f PHASE2_COMPLETE.md
rm -f PHASE2_PLAN.md

# Remove demo/test files
rm -f demo-document.txt
rm -f claude_desktop_config.json

# Remove design docs (keep in git history)
rm -rf design-docs

# Remove .kiro directory (development only)
rm -rf .kiro

# Remove .claude directory (development only)
rm -rf .claude

# Remove .beads directory (development only)
rm -rf .beads

# Remove test data
rm -rf data/test-*
rm -rf data/lancedb.backup.*

# Remove blueprints (user will add their own)
rm -rf docs/blueprints

# Clean up logs
rm -f /tmp/process.log

echo "✅ Cleanup complete"
echo ""
echo "Kept essential files:"
echo "  - README.md"
echo "  - QUICKSTART.md"
echo "  - TESTING.md"
echo "  - setup.sh"
echo "  - src/ (source code)"
echo "  - docs/ (documentation)"
echo "  - package.json"
echo "  - .env.example"
echo ""
