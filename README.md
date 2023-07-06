# PornTub

PornTub is a simple Express.js web application that allows users to browse videos from the `/videos` directory and watch them directly in the browser. The application automatically generates thumbnails for the videos using FFmpeg, which are displayed on the main page. Clicking on a thumbnail will open the video for viewing.

[![GitHub issues](https://img.shields.io/github/issues/8qBITs/PornTub?style=flat&logo=github&color=blue)](https://github.com/8qBITs/PornTub/issues)
[![GitHub forks](https://img.shields.io/github/forks/8qBITs/PornTub?style=flat&logo=github&color=green)](https://github.com/8qBITs/PornTub/network)
[![GitHub stars](https://img.shields.io/github/stars/8qBITs/PornTub?style=flat&logo=github&color=yellow)](https://github.com/8qBITs/PornTub/stargazers)
[![License](https://img.shields.io/github/license/8qBITs/PornTub?style=flat&color=lightgrey)](https://github.com/8qBITs/PornTub/blob/master/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/8qBITs/PornTub?style=flat&logo=git&color=brightgreen)](https://github.com/8qBITs/PornTub/commits/master)

## Features

- Browse videos from the `/videos` directory.
- Thumbnails generation for videos using FFmpeg.
- Watch videos directly in the browser.
- An endpoint to scan the library and generate a video database.

## Prerequisites

- Node.js
- FFmpeg
- (Optional) Nodemon

## Installation Instructions

1. **Clone the Repository**: Clone the PornTub repository to your local machine.

```git clone https://github.com/yourusername/PornTub.git```

2. **Install FFmpeg**: Before running the application, you need to install FFmpeg which is used for generating thumbnails. Follow the instructions for your platform on the [official FFmpeg website](https://ffmpeg.org/download.html).

3. **Install Dependencies**: Navigate to the root of the repository and run the following command to install the necessary Node.js dependencies:

 ```
 cd PornTub
 npm install
 ```

4. **(Optional) Install Nodemon**: Nodemon is a utility that monitors for any changes in your source code and automatically restarts the server. This is useful for development. To install Nodemon globally, run:

 ```
 npm install -g nodemon
 ```

5. **Generate Video Database**: Before you can browse videos, you need to scan the `/videos` directory and generate a video database. Start the server (instructions below) and then navigate to the following URL in your web browser:

 ```
 http://localhost:3000/scanLibrary
 ```

This will generate the video database. Note that in future versions, this function will be replaced by a microservice.

6. **Start the Server**: You can now start the server. If you have Nodemon installed, use:

 ```
 nodemon server
 ```

Otherwise, use:

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
