import FileConverter from '../utils/FileConverter';
import FilenameController from '../controllers/FilenameController';
import OcrController from '../controllers/OcrController';
import S3Service from '../services/S3Service';
import StorageController from '../controllers/StorageController';
import ValidationController from '../controllers/ValidationController';
import VirusScanController from '../controllers/VirusScanController';

import config from '../config';
import express from 'express';
import gm from 'gm';
import multer from 'multer';
import ocr from 'tesseractocr';
import util from 'util';
import uuid from 'uuid/v4';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({storage});
const {s3: s3Config} = config.services;
const s3Service = new S3Service(s3Config, util);
const storageController = new StorageController(s3Service, config);

router.get(
  `${config.endpoints.files}/:processKey/:fileVersion/:filename`,
  storageController.downloadFile
);

router.post(
  config.endpoints.files,
  upload.single('file'),
  new ValidationController().validatePost,
  new FilenameController(uuid).generateFilename,
  storageController.uploadFile,
  new VirusScanController(new FileConverter(gm, util, config), config).scanFile,
  storageController.uploadFile,
  new OcrController(ocr, config).parseFile,
  storageController.uploadFile,
  (req, res) => {
    res.status(200).json({filename: req.file.filename});
  }
);

export default router;
