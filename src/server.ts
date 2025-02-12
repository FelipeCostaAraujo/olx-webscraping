import express from 'express';
import adsRouter from './routers/ads';
import priceTrendRouter from './routers/priceTrend';
import predictionsRouter from './routers/predictions';
import notificationRouter from './routers/notifications';

/**
 * 🔹 **Sets up the Express server with endpoints for listing and soft-deleting (blacklisting) ads.**
 */
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.use('/ads', adsRouter);
app.use('/price-trend', priceTrendRouter);
app.use('/predictions', predictionsRouter);
app.use('/notifications', notificationRouter);


app.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});

export default app;
