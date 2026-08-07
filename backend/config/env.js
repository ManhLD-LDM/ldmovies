// Validate mandatory environment variables at server launch
export const validateEnv = () => {
  const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = REQUIRED.filter((k) => !process.env[k]);
  
  if (missing.length > 0) {
    console.error(`[FATAL] Thiếu biến môi trường bắt buộc: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('[WARN] JWT_SECRET nên dài tối thiểu 32 ký tự để đảm bảo an toàn.');
  }
};
