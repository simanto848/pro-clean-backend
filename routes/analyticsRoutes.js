import express from 'express';
import { getDashboardAnalytics } from '../app/controllers/analyticsController.js';
import { protect, restrictTo } from '../app/controllers/authController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getDashboardAnalytics);

export default router;
