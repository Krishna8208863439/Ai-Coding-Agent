import 'dotenv/config';
import { app, logger } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`NEXORA API running on port ${PORT} [${process.env.NODE_ENV}]`);
});
