import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  console.error('[NOX] JWT_SECRET is required in production. Aborting startup.');
  process.exit(1);
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 NOX API Backend running on http://localhost:${PORT}`);
});