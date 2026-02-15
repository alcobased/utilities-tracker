import app from './index.js';

const port = parseInt(process.env.PORT) || process.argv[3] || 8080;

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

export default app;