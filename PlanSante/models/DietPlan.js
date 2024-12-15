const mongoose = require('mongoose');

const dietPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // userId is required
    dietPlan: [
        {
            day: Number,
            meals: [
                {
                    Food: String,
                    Calories: Number,
                    Proteins: Number,
                    Carbs: Number,
                    Fats: Number,
                }
            ]
        }
    ]
});

module.exports = mongoose.model('DietPlan', dietPlanSchema);
