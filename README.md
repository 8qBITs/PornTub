# PornTub

Simply put, PornTub is an Express.js-based web application designed for listing and streaming various types of videos. While its true intention is evident from the name itself, it is capable of indexing and displaying all MP4 and MKV video formats. Additionally, it efficiently streams videos in chunks asynchronously, as expected from a web application.

[![GitHub issues](https://img.shields.io/github/issues/8qBITs/PornTub?style=flat&logo=github&color=blue)](https://github.com/8qBITs/PornTub/issues)
[![GitHub forks](https://img.shields.io/github/forks/8qBITs/PornTub?style=flat&logo=github&color=green)](https://github.com/8qBITs/PornTub/network)
[![GitHub stars](https://img.shields.io/github/stars/8qBITs/PornTub?style=flat&logo=github&color=yellow)](https://github.com/8qBITs/PornTub/stargazers)
[![License](https://img.shields.io/github/license/8qBITs/PornTub?style=flat&color=lightgrey)](https://github.com/8qBITs/PornTub/blob/master/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/8qBITs/PornTub?style=flat&logo=git&color=brightgreen)](https://github.com/8qBITs/PornTub/commits/master)

## Features

- Index and stream videos from `/videos` directory.
- Thumbnails/Clip generation for videos using FFmpeg.

## Prerequisites

- Node.js
- FFmpeg

## Installation Instructions

1. **Clone the Repository**: Clone the PornTub repository to your local machine.

```git clone https://github.com/yourusername/PornTub.git```

2. **Install FFmpeg**: Before running the application, you need to install FFmpeg which is used for generating thumbnails. Follow the instructions for your platform on the [official FFmpeg website](https://ffmpeg.org/download.html).

3. **Install Dependencies**: Navigate to the root of the repository and run the following command to install the necessary Node.js dependencies:

 ```
 cd PornTub
 npm install
 ```

5. **Generate Video Database**: Before you can browse videos, you need to scan the `/videos` directory and generate a video database. Start the server (instructions below) and then navigate to the following URL in your web browser:

 ```
 http://localhost:6969/scanLibrary
 ```

This will generate the video database. Note that in future versions, this function will be replaced by a microservice.

6. **Start the Server**: You can now start the server use:

 ```
 node server
 ```

7. **Access the Application**: Open your web browser and go to `http://localhost:6969` to access the application and start browsing videos.

## Future Improvements

- Replacing the scan library route with a dedicated microservice that would scan for new videos.
- Search index
- Pagination
- Scylla/Mongo implementation to replace file system based database.

## License

This project is licensed under the WTFPL License. See `LICENSE` for more information.
