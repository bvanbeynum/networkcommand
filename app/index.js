const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config.js');

const app = express();

// Security Middleware
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

let db;

async function connectDb() {
    try {
        const client = await MongoClient.connect(config.mongoUri);
        db = client.db();
        console.log(`Connected to MongoDB: ${db.databaseName}`);
        
        // Setup TTL Index on logs collection (timestamp field)
        await db.collection('logs').createIndex(
            { timestamp: 1 },
            { expireAfterSeconds: config.logRetentionDays * 24 * 60 * 60 }
        );
        console.log(`TTL Index applied to logs collection (${config.logRetentionDays} days)`);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

// Middleware: API Key Validation
async function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ success: false, data: null, error: 'API Key is required' });
    }

    const appRecord = await db.collection('apps').findOne({ apiKey });
    if (!appRecord) {
        return res.status(403).json({ success: false, data: null, error: 'Invalid API Key' });
    }

    req.appId = appRecord.appId; // Source application identifier
    next();
}

// Endpoints
app.post('/api/logs', validateApiKey, async (req, res) => {
    try {
        const { type, level, message, metadata } = req.body;
        
        let errorHash = null;
        if (type === 'ERROR' || level === 'ERROR') {
            const crypto = require('crypto');
            // Create a hash from the message and any stack trace in metadata
            const hashSource = `${message}${metadata?.stack || ''}`;
            errorHash = crypto.createHash('md5').update(hashSource).digest('hex');
        }

        const logEntry = {
            appId: req.appId,
            timestamp: new Date(),
            type: type || 'WEB_APP',
            level: level || 'INFO',
            message,
            metadata: metadata || {},
            errorHash
        };

        await db.collection('logs').insertOne(logEntry);
        res.json({ success: true, data: 'Log recorded', error: null });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: err.message });
    }
});

app.post('/api/heartbeat', validateApiKey, async (req, res) => {
    try {
        const now = new Date();
        await db.collection('apps').updateOne(
            { appId: req.appId },
            { $set: { lastHeartbeat: now, status: 'HEALTHY' } }
        );
        res.json({ success: true, data: { lastHeartbeat: now }, error: null });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: err.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ success: true, data: { status: 'online', db: !!db }, error: null });
});

connectDb().then(() => {
    app.listen(config.port, () => {
        console.log(`LogManager service listening on port ${config.port}`);
    });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    process.exit(0);
});
