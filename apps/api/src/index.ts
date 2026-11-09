import { app, logger } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`NEXORA API backend running on port ${PORT}`);
});

