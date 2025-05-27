const multer = require('multer');
const path = require('path');

const upload = multer({
    storage:multer.memoryStorage()
})

module.exports=upload