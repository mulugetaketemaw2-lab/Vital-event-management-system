const config = {
  development: {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '90d'
  },
  production: {
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '90d'
  }
};

const environment = process.env.NODE_ENV || 'development';
module.exports = config[environment];