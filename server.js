const express = require('express');
const fs = require('fs');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const shortid = require('shortid');
const ffmpeg = require('fluent-ffmpeg');
const bodyParser = require('body-parser');

const app = express();
const url = 'mongodb://localhost:27017';
const dbName = 'videoLibrary';
const { v4: uuidv4 } = require('uuid');

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));
app.use('/clips', express.static(path.join(__dirname, 'clips')));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());

// Route for the homepage
app.get('/', (req, res) => {
    // Load videos.json
    let videosData;
    try {
        videosData = JSON.parse(fs.readFileSync('videos.json'));
    } catch (err) {
        console.error('Error reading videos.json:', err);
        return res.status(500).send('Server error');
    }

    // Extract the needed data
    const videoInfo = videosData.map(video => ({
        uniqueId: video.uniqueId,
        thumbnail: video.thumbnailPath,
        name: video.videoName,
        //clip: video.clipPath
    }));

    res.render('index', { videoInfo });
});


// Route for playing the video
app.get('/playVideo/:id', (req, res) => {
    // Load videos.json
    let videosData;
    try {
        videosData = JSON.parse(fs.readFileSync('videos.json'));
    } catch (err) {
        console.error('Error reading videos.json:', err);
        return res.status(500).send('Server error');
    }

    // Find the video with the matching unique ID
    const videoInfo = videosData.find(video => video.uniqueId === req.params.id);
    if (!videoInfo) {
        return res.status(404).send('Video not found');
    }

    const fileExtension = path.extname(videoInfo.videoFile).toLowerCase();
    let videoType = 'video/mp4';
    if (fileExtension === '.avi') {
        videoType = 'video/x-msvideo';
    } else if (fileExtension === '.webm') {
        videoType = 'video/webm';
    }

    // Rendering the EJS template with video information
    res.render('playVideo', {
        videoPath: `/video/${videoInfo.videoFile}`,
        videoType,
        videoName: videoInfo.videoName,
        uniqueId: videoInfo.uniqueId
    });
});



// Route to serve video files in chunks
app.get('/video/:uniqueId', async (req, res) => {
    // Load videos.json
    let videosData;
    try {
        videosData = JSON.parse(await fs.promises.readFile('videos.json', 'utf-8'));
    } catch (err) {
        console.error('Error reading videos.json:', err);
        return res.status(500).send('Server error');
    }

    // Find the video with the matching uniqueId
    const videoInfo = videosData.find(video => video.uniqueId === req.params.uniqueId);
    if (!videoInfo) {
        return res.status(404).send('Video not found');
    }

    const videoPath = path.join(__dirname, 'videos', videoInfo.videoFile);

    let stat;
    try {
        stat = await fs.promises.stat(videoPath);
    } catch (err) {
        console.error('Error stating video file:', err);
        return res.status(500).send('Server error');
    }
    
    const fileSize = stat.size;
    const range = req.headers.range;

    const fileExtension = path.extname(videoInfo.videoFile).toLowerCase();
    let contentType = 'video/mp4';
    if (fileExtension === '.avi') {
        contentType = 'video/x-msvideo';
    } else if (fileExtension === '.webm') {
        contentType = 'video/webm';
    }

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.get('/getThumbnails', (req, res) => {
    const videoDir = path.join(__dirname, 'videos');
    const thumbnailDir = path.join(__dirname, 'thumbnails');

    // Check if thumbnails directory exists, if not, create it
    if (!fs.existsSync(thumbnailDir)){
        fs.mkdirSync(thumbnailDir);
    }

    fs.readdir(videoDir, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to read video directory');
        }

        let videoCount = files.length;
        files.forEach(file => {
            const videoPath = path.join(videoDir, file);
            const thumbnailPath = path.join(thumbnailDir, file + '.jpg');
            ffmpeg(videoPath)
                .screenshot({
                    timestamps: ['5%'],
                    filename: path.basename(thumbnailPath),
                    folder: path.dirname(thumbnailPath)
                })
                .on('end', () => {
                    videoCount--;
                    if (videoCount === 0) {
                        res.send('All thumbnails have been generated');
                    }
                });
        });
    });
});

app.get('/scanLibrary', async (req, res) => {
    // Check if the IP address of the request is 77.38.24.76
    /*
    const ip = req.ip || req.connection.remoteAddress;
    if (ip !== '77.38.24.76') {
        return res.status(403).send('Access denied');
    }*/
    
    // Send response immediately
    res.send('Library scanning has started.');

    try {
        // Directories
        const videoDir = path.join(__dirname, 'videos');
        const thumbnailDir = path.join(__dirname, 'thumbnails');
        const clipsDir = path.join(__dirname, 'clips');

        // Create thumbnails and clips directory if they don't exist
        if (!fs.existsSync(thumbnailDir)){
            fs.mkdirSync(thumbnailDir);
        }
        if (!fs.existsSync(clipsDir)){
            fs.mkdirSync(clipsDir);
        }

        // Load config.json
        const config = JSON.parse(fs.readFileSync('config.json'));
        const removedWords = config.removedWords || [];

        // Scan videos directory
        const files = fs.readdirSync(videoDir);
        const videoFiles = files.filter(file => file.endsWith('.mp4') || file.endsWith('.avi'));

        // Loop through video files to gather information and generate thumbnails
        const videoInfo = [];
        for (const videoFile of videoFiles) {
            const videoPath = path.join(videoDir, videoFile);

            // Extract video length
            const videoLength = await new Promise(resolve => {
                ffmpeg.ffprobe(videoPath, (err, metadata) => {
                    resolve(metadata ? metadata.format.duration : 0);
                });
            });

            // Generate thumbnail in the background
            const thumbnailName = videoFile + '.jpg';
            const thumbnailPath = path.join(thumbnailDir, thumbnailName);
            ffmpeg(videoPath)
                .screenshot({
                    timestamps: ['5%'],
                    filename: path.basename(thumbnailPath),
                    folder: path.dirname(thumbnailPath)
                });

            // Generate 5-second clip at 10% in the background
            const clipStartTime = videoLength * 0.10; // Start time at 10% of video length
            const clipName = videoFile + '_clip.mp4';
            const clipPath = path.join(clipsDir, clipName);
            ffmpeg(videoPath)
                .seekInput(clipStartTime)
                .duration(5) // 5-second clip
                .noAudio() // Exclude audio
                .output(clipPath)
                .run();

            // Extract and clean video name
            let videoName = path.parse(videoFile).name;
            videoName = videoName.replace(/[^\w\s]|[\d]|_/g, " ").replace(/\s+/g, " "); // Remove special characters, dots and digits
            removedWords.forEach(word => {
                videoName = videoName.replace(new RegExp('\\b' + word + '\\b', 'gi'), ''); // Remove words in config
            });

            // Generate a unique ID for the video
            const uniqueId = uuidv4();

            // Add video information to array
            videoInfo.push({
                uniqueId,
                videoName,
                videoFile,
                videoLength,
                thumbnailPath: `/thumbnails/${thumbnailName}`, // Save relative path
                clipPath: `/clips/${clipName}` // Save relative path for clip
            });
        }

        // Save video information to videos.json once processing is complete
        fs.writeFileSync('videos.json', JSON.stringify(videoInfo, null, 2));

        console.log('Library scanned, thumbnails generated, clips created, and information saved to videos.json.');
    } catch (err) {
        console.error(err);
    }
});

app.get('/playClip/:uniqueId', async (req, res) => {
    try {
        // Your asynchronous logic here...
        
        const uniqueId = req.params.uniqueId;

        // Load videos.json to get the clip file path
        const videosData = JSON.parse(await fs.promises.readFile('videos.json'));

        // Find the video with the matching uniqueId
        const videoInfo = videosData.find(video => video.uniqueId === req.params.uniqueId);
        if (!videoInfo) {
            return res.status(404).send('Clip not found');
        }

        const clipPath = path.join(__dirname, 'clips', path.basename(videoInfo.clipPath));
        const stat = fs.statSync(clipPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(clipPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(clipPath).pipe(res);
        }
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// Start the Express.js server
const port = process.env.PORT || 6969;
app.listen(port, () => console.log(`Listening on port ${port}...`));