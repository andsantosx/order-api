const jwt = require('jsonwebtoken');
require('dotenv').config();

const adminToken = jwt.sign(
  { userId: 'admin-id-123', isAdmin: true, role: 'ADMIN' },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '1h' }
);

console.log(adminToken);
