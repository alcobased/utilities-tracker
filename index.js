import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import routes from './routes.js';

// Initialize the database
await initDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Use the routes defined in routes.js
app.use('/', routes);

export default app;
