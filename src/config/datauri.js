const DatauriParser = require('datauri/parser');
const path = require('path')

const parser = new DatauriParser();

const getDataUri = (file) => {
    const extName = path.extname(file.originalname || 'file.jpg').toString(); // default fallback
    return parser.format(extName, file.buffer).content;
};


module.exports = getDataUri