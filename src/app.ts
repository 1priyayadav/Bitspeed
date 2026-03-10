import express from 'express';
import identifyRoutes from './routes/identify.routes';

const app = express();

app.use(express.json());

// Health route for deployment check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Root route so browser doesn't show "Cannot GET /"
app.get('/', (req, res) => {
    res.status(200).send('<h2>Bitespeed Identity Reconciliation API is running!</h2><p>You must use <b>POST /identify</b> to interact with the API.</p>');
});

// Identify route
app.use('/', identifyRoutes);

export default app;
