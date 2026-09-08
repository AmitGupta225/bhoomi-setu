import express from 'express';
import cors from 'cors';
import { initDb } from './src/db.js';
import apiRouter from './src/routes/api.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

const PORT = process.env.PORT || 5000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
