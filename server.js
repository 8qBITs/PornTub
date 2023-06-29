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
        name: video.videoName
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
app.get('/video/:uniqueId', (req, res) => {
    // Load videos.json
    let videosData;
    try {
        videosData = JSON.parse(fs.readFileSync('videos.json'));
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
    const stat = fs.statSync(videoPath);
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
    try {
        // Directories
        const videoDir = path.join(__dirname, 'videos');
        const thumbnailDir = path.join(__dirname, 'thumbnails');

        // Create thumbnails directory if it doesn't exist
        if (!fs.existsSync(thumbnailDir)){
            fs.mkdirSync(thumbnailDir);
        }

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

            // Generate thumbnail
            const thumbnailName = videoFile + '.jpg';
            const thumbnailPath = path.join(thumbnailDir, thumbnailName);
            await new Promise(resolve => {
                ffmpeg(videoPath)
                    .screenshot({
                        timestamps: ['5%'],
                        filename: path.basename(thumbnailPath),
                        folder: path.dirname(thumbnailPath)
                    })
                    .on('end', resolve);
            });

            // Extract and clean video name
            let videoName = path.parse(videoFile).name;
            videoName = videoName.replace(/[.-]/g, ' ').replace(/\b\d{3,}\b/g, '');

            // Generate a unique ID for the video
            const uniqueId = uuidv4();

            // Add video information to array
            videoInfo.push({
                uniqueId,
                videoName,
                videoFile,
                videoLength,
                thumbnailPath: `/thumbnails/${thumbnailName}` // Save relative path
            });
        }

        // Save video information to videos.json
        fs.writeFileSync('videos.json', JSON.stringify(videoInfo, null, 2));

        res.send('Library scanned, thumbnails generated and information saved to videos.json.');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred.');
    }
});


// Start the Express.js server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));