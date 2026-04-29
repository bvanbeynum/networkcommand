const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./config.js');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

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

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === config.frontendPassword) {
        res.json({ success: true, data: 'Logged in', error: null });
    } else {
        res.status(401).json({ success: false, data: null, error: 'Invalid password' });
    }
});

app.get('/api/logs-view', async (req, res) => {
    try {
        const { appId, level, type } = req.query;
        const query = {};
        if (appId) query.appId = appId;
        if (level) query.level = level;
        if (type) query.type = type;

        const logs = await db.collection('logs')
            .find(query)
            .sort({ timestamp: -1 })
            .limit(100)
            .toArray();
        res.json({ success: true, data: logs, error: null });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: err.message });
    }
});

app.get('/api/apps-view', async (req, res) => {
    try {
        const apps = await db.collection('apps').find({}).toArray();
        res.json({ success: true, data: apps, error: null });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: err.message });
    }
});

app.post('/api/apps', async (req, res) => {
    try {
        const { name, appId } = req.body;
        if (!name || !appId) {
            return res.status(400).json({ success: false, data: null, error: 'Name and App ID are required' });
        }

        const crypto = require('crypto');
        const apiKey = crypto.randomBytes(24).toString('hex');

        const newApp = {
            name,
            appId,
            apiKey,
            createdAt: new Date()
        };

        await db.collection('apps').insertOne(newApp);
        res.json({ success: true, data: newApp, error: null });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: err.message });
    }
});

app.get('/api/errors-summary', async (req, res) => {
    try {
        const summary = await db.collection('logs').aggregate([
            { $match: { errorHash: { $ne: null } } },
            { $group: {
                _id: "$errorHash",
                message: { $first: "$message" },
                count: { $sum: 1 },
                lastSeen: { $max: "$timestamp" },
                appIds: { $addToSet: "$appId" }
            }},
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]).toArray();
        res.json({ success: true, data: summary, error: null });
    } catch (err) {
        res.status(500).json({ success: false, data: null, error: err.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ success: true, data: { status: 'online', db: !!db }, error: null });
});

// React Catch-all: serve index.html for any non-API routes
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

connectDb().then(() => {
    app.listen(config.port, () => {
        console.log(`Network Manager service listening on port ${config.port} in ${config.mode || 'prod'} mode`);
    });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    process.exit(0);
});
