const env = require('dotenv').config().parsed; 
fetch('https://api.cerebras.ai/v1/models', { headers: { Authorization: `Bearer ${env.CEREBRAS_API_KEY}` } }).then(r=>r.json()).then(console.log);
