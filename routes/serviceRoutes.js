import express from 'express';
import {
    getAllServices,
    getService,
    createService,
    updateService,
    deleteService,
} from '../app/controllers/serviceController.js';
import { protect, restrictTo } from '../app/controllers/authController.js';
import { pagination } from '../app/utils/pagination.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.get('/', pagination(20), getAllServices);
router.get('/:id', getService);

// Admin routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', upload.single('image'), createService);
router.patch('/:id', upload.single('image'), updateService);
router.delete('/:id', deleteService);

export default router;
