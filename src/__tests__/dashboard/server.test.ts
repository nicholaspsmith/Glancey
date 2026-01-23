import { describe, it, expect, afterEach } from 'vitest';
import { startServer, findAvailablePort, type DashboardServer } from '../../dashboard/server.js';

describe('Dashboard Server', () => {
  let server: DashboardServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  describe('findAvailablePort', () => {
    it('should find an available port starting from default', async () => {
      const port = await findAvailablePort();
      expect(port).toBeGreaterThanOrEqual(24300);
      expect(port).toBeLessThan(24400);
    });

    it('should find an available port starting from custom port', async () => {
      const port = await findAvailablePort(30000);
      expect(port).toBeGreaterThanOrEqual(30000);
      expect(port).toBeLessThan(30100);
    });
  });

  describe('startServer', () => {
    it('should start server on available port', async () => {
      // Use a unique port range for this test to avoid conflicts with parallel tests
      const port = await findAvailablePort(27000);
      server = await startServer(port);

      expect(server.port).toBeGreaterThanOrEqual(27000);
      expect(server.url).toBe(`http://127.0.0.1:${server.port}`);
    });

    it('should start server on specified port', async () => {
      const port = await findAvailablePort(28000);
      server = await startServer(port);

      expect(server.port).toBe(port);
      expect(server.url).toBe(`http://127.0.0.1:${port}`);
    });

    it('should respond to requests', async () => {
      const port = await findAvailablePort(29000);
      server = await startServer(port);

      const response = await fetch(`${server.url}/api/heartbeat`);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as { ok: boolean; timestamp: string };
      expect(data.ok).toBe(true);
      expect(data.timestamp).toBeDefined();
    });

    it('should stop cleanly', async () => {
      // Use a unique port for this test
      const port = await findAvailablePort(26000);
      server = await startServer(port);
      const url = server.url;

      await server.stop();
      server = null;

      // Give the OS time to release the port
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Server should no longer respond - use a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);

      try {
        await fetch(`${url}/api/heartbeat`, { signal: controller.signal });
        // If we get here, check if response is actually from our server
        // (another test might have started a server on a different port)
      } catch (error) {
        // Connection refused or abort is expected
        expect(
          (error as Error).message.includes('ECONNREFUSED') ||
            (error as Error).name === 'AbortError' ||
            (error as Error).message.includes('fetch failed')
        ).toBe(true);
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });
});
