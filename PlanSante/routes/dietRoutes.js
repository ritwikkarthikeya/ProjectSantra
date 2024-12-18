const express = require('express');
const router = express.Router();
const dietController = require('../Controllers/dietController');
const authenticateToken = require('../Middleware/authMiddleware');
const userController=require('../Controllers/userController')
router.get('/details-form', authenticateToken, (req, res) => {
    res.render('detailsForm');
});

router.post('/generate-diet-plan', authenticateToken, userController.generateDietPlan);

router.get('/my-plan', authenticateToken, userController.displaySavedDietPlan);
router.get('/homepage', authenticateToken,(req, res) => {
  res.render('homepage', { user: req.user });
});
router.get('/my-plan/day/:day', authenticateToken, userController.getDietPlanForDay);
router.get('/my-plan/all',authenticateToken, userController.getCompleteDietPlan);
router.post('/diet-plan/adjust/:day',authenticateToken, userController.adjustDietPlanBasedOnUserInput);

module.exports = router;
