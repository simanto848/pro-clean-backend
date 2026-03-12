import express from 'express';
import { getAllUsers, updateUserRole, deleteUser } from '../app/controllers/userController.js';
import { protect, restrictTo } from '../app/controllers/authController.js';

const router = express.Router();

// All user routes are protected and restricted to admin
router.use(protect, restrictTo('admin'));

router.get('/', getAllUsers);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
