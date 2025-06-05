const express = require('express');
const cors = require('cors');
const authRoutes = require('./routers/authRoutes');
const boletinRoutes = require('./routers/boletin');
const app = express();

require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api', authRoutes);
app.use('/api', boletinRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});