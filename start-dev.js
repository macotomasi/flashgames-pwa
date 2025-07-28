import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  try {
    const server = await createServer({
      root: __dirname,
      server: {
        port: 3333,
        host: 'localhost',
        open: false
      }
    });
    
    await server.listen();
    
    console.log('Vite dev server running at:');
    server.printUrls();
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();