const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Proxy todo al backend que sirve la app
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8001',
  changeOrigin: true
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
});
