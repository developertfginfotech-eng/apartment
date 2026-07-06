import { mkdirSync } from 'fs';
import { join } from 'path';

export const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');

mkdirSync(uploadDir, { recursive: true });
