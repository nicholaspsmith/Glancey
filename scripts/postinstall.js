#!/usr/bin/env node

/**
 * Postinstall script to register lance-context with Claude Code MCP configuration.
 * This runs after npm install and adds lance-context as a global MCP server.
 */

import { execSync } from 'child_process';

function main() {
  // Check if claude CLI is available
  try {
    execSync('claude --version', { stdio: 'ignore' });
  } catch {
    console.log('[lance-context] Claude Code CLI not found, skipping MCP registration.');
    console.log('[lance-context] To manually register, run:');
    console.log('  claude mcp add --scope user --transport stdio lance-context -- npx -y lance-context');
    return;
  }

  // Check if lance-context is already registered
  try {
    const result = execSync('claude mcp get lance-context 2>/dev/null', { encoding: 'utf-8' });
    if (result.includes('lance-context')) {
      console.log('[lance-context] Already registered with Claude Code.');
      return;
    }
  } catch {
    // Not registered, continue with registration
  }

  // Register lance-context with Claude Code
  try {
    console.log('[lance-context] Registering with Claude Code...');
    execSync(
      'claude mcp add --scope user --transport stdio lance-context -- npx -y lance-context',
      { stdio: 'inherit' }
    );
    console.log('[lance-context] Successfully registered with Claude Code!');
    console.log('[lance-context] Restart Claude Code to use semantic code search.');
  } catch (error) {
    console.log('[lance-context] Failed to register with Claude Code:', error.message);
    console.log('[lance-context] To manually register, run:');
    console.log('  claude mcp add --scope user --transport stdio lance-context -- npx -y lance-context');
  }
}

main();
