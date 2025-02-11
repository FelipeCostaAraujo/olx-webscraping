import express from 'express';
import adsRouter from './routers/ads';
import priceTrendRouter from './routers/priceTrend';

/**
 * 🔹 **Sets up the Express server with endpoints for listing and soft-deleting (blacklisting) ads.**
 */
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.use('/ads', adsRouter);
app.use('/price-trend', priceTrendRouter);

app.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});

export default app;
