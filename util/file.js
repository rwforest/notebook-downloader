const fs = require('fs');
const path = require('path');

module.exports = {
    getBaseName: (p) => {
        return path.basename(p || process.cwd());
    },

    directoryExists: (filePath) => {
        try {
            return fs.statSync(filePath).isDirectory();
        } catch (err) {
            return false;
        }
    },

    fileExists: (filePath) => {
        try {
            return fs.statSync(filePath).isFile();
        } catch (err) {
            return false;
        }
    }
};
