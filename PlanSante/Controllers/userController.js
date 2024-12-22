const path = require('path');
const fs = require('fs');
const parseCsv = require('csv-parser');
const DietPlan = require('../models/DietPlan');

const csvFilePath = path.join('FoodContents.csv');
let data = [];

// Load and validate CSV data
fs.createReadStream(csvFilePath)
    .pipe(parseCsv())
    .on('data', (row) => {
        const foodName = row.food_name?.trim();
        const energy = parseFloat(row.energy_kcal);
        const protein = parseFloat(row.protein_g);
        const carb = parseFloat(row.carb_g);
        const fat = parseFloat(row.fat_g);

        if (foodName && !isNaN(energy) && energy > 0) {
            data.push({
                food_name: foodName,
                energy_kcal: energy,
                protein_g: protein || 0,
                carb_g: carb || 0,
                fat_g: fat || 0,
            });
        } else {
            console.warn('Skipping invalid or zero-calorie food:', row);
        }
    })
    .on('end', () => {
        console.log(`CSV file successfully loaded. Initial data loaded: ${data.length} items.`);
    });

// Helper function to calculate daily calorie requirements
function calculateDailyCalories(weight, height, age, activityLevel, gender) {
    const bmr = gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const activityMultiplier = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
    };

    return bmr * (activityMultiplier[activityLevel] || 1.2); // Default to sedentary if invalid level
}

// Helper function to generate a diet plan
function generateDietPlan(data, dailyCalories, numDays = 30) {
    if (data.length === 0) {
        throw new Error('Food data is empty. Cannot generate a diet plan.');
    }

    const dietPlan = [];
    const foodItems = data.map(item => item.food_name);

    for (let day = 0; day < numDays; day++) {
        let dayPlan = [];
        let totalCalories = 0;

        while (totalCalories < dailyCalories) {
            const food = foodItems[Math.floor(Math.random() * foodItems.length)];
            const nutrients = data.find(item => item.food_name === food);

            if (nutrients && nutrients.energy_kcal > 0) {
                dayPlan.push({
                    Food: food,
                    Calories: nutrients.energy_kcal,
                    Proteins: nutrients.protein_g,
                    Carbs: nutrients.carb_g,
                    Fats: nutrients.fat_g,
                });
                totalCalories += nutrients.energy_kcal;
            }

            if (dayPlan.length >= foodItems.length) break; // Prevent infinite loop
        }

        if (totalCalories < dailyCalories * 0.8) {
            console.warn(`Day ${day + 1}: Insufficient food data to meet calorie needs.`);
        }

        dietPlan.push(dayPlan);
    }

    return dietPlan;
}

// Adjust diet plan if additional food is provided
function adjustDietPlan(data, dietPlan, eatenFood) {
    const updatedDietPlan = [];

    for (let day of dietPlan) {
        const updatedDay = [];
        let foodReplaced = false;

        for (let meal of day) {
            if (meal.Food === eatenFood && !foodReplaced) {
                const substitute = data[Math.floor(Math.random() * data.length)];
                updatedDay.push({
                    Food: substitute.food_name,
                    Calories: substitute.energy_kcal,
                    Proteins: substitute.protein_g,
                    Carbs: substitute.carb_g,
                    Fats: substitute.fat_g,
                });
                foodReplaced = true;
            } else {
                updatedDay.push(meal);
            }
        }

        updatedDietPlan.push(updatedDay);
    }

    return updatedDietPlan;
}

// Controller methods
exports.renderDetailsForm = (req, res) => {
    res.render('detailsForm', { dietPlan: null });
};

exports.generateDietPlan = async (req, res) => {
    const { weight, height, age, gender, activity } = req.body;

    if (!weight || !height || !age || !gender || !activity) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const dailyCalories = calculateDailyCalories(weight, height, age, activity, gender);
        const targetCalories = Math.max(1200, dailyCalories - 500); // Minimum safe calories is 1200
        const dietPlan = generateDietPlan(data, targetCalories);

        const savedDietPlan = await DietPlan.findOneAndUpdate(
            { userId: req.user._id },
            { dietPlan: dietPlan.map((day, index) => ({ day: index + 1, meals: day })) },
            { new: true, upsert: true }
        );

        res.redirect('/homepage'); // Redirect to homepage after generating the diet plan
    } catch (error) {
        console.error('Error generating diet plan:', error);
        res.status(500).send('An error occurred while generating the diet plan.');
    }
};

exports.displaySavedDietPlan = async (req, res) => {
    try {
        const dietPlanRecord = await DietPlan.findOne({ userId: req.user._id });

        if (!dietPlanRecord) {
            return res.render('detailsResults', {
                dietPlan: null,
                message: 'No saved diet plan found. Please generate one first.',
            });
        }

        res.render('detailsResults', { dietPlan: dietPlanRecord.dietPlan });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching the diet plan.');
    }
};

exports.getDietPlanForDay = async (req, res) => {
    const day = parseInt(req.params.day, 10);

    if (isNaN(day) || day < 1 || day > 30) {
        return res.status(400).json({ success: false, message: 'Invalid day number. Please provide a day between 1 and 30.' });
    }

    try {
        const dietPlanRecord = await DietPlan.findOne({ userId: req.user._id });

        if (!dietPlanRecord || !dietPlanRecord.dietPlan || dietPlanRecord.dietPlan.length < day) {
            return res.status(404).json({
                success: false,
                message: `No diet plan found for day ${day}. Please generate your diet plan first.`,
            });
        }

        const dayPlan = dietPlanRecord.dietPlan[day - 1].meals; // Day - 1 because array is zero-indexed

        res.json({ success: true, plan: dayPlan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching the diet plan.' });
    }
};

exports.adjustDietPlanBasedOnUserInput = async (req, res) => {
    const { day } = req.params; // Extract day from URL
    const { skippedFoods, additionalFood } = req.body; // Extract skippedFoods and additionalFood from request body
    const dayIndex = parseInt(day, 10) - 1; // Convert day to zero-based index

    // Validate input
    if (isNaN(dayIndex) || dayIndex < 0 || dayIndex >= 30) {
        return res.status(400).json({ success: false, message: 'Invalid day number. Please provide a valid day.' });
    }

    console.log(`Adjusting diet plan for day ${dayIndex + 1}`); // Debugging log

    try {
        // Fetch the user's diet plan
        const dietPlanRecord = await DietPlan.findOne({ userId: req.user._id });
        if (!dietPlanRecord) {
            return res.status(404).json({ success: false, message: 'No saved diet plan found. Please generate one first.' });
        }

        const dietPlan = dietPlanRecord.dietPlan;

        // Ensure the diet plan exists
        if (!dietPlan || dietPlan.length === 0) {
            return res.status(404).json({ success: false, message: 'No diet plan found.' });
        }

        // Calculate the total calories lost from skipped foods
        let lostCalories = 0;
        if (skippedFoods && skippedFoods.length > 0) {
            skippedFoods.forEach((skippedFood) => {
                // Find the skipped food and add its calories to lostCalories
                dietPlan[dayIndex].meals.forEach((meal) => {
                    if (meal.Food === skippedFood) {
                        lostCalories += meal.Calories;
                    }
                });
            });
        }

        // Step 1: Replace skipped foods with alternatives for the selected day
        if (skippedFoods && skippedFoods.length > 0) {
            skippedFoods.forEach((skippedFood) => {
                // Find a random alternative food item with similar calories
                const replacement = data[Math.floor(Math.random() * data.length)];
                
                // Replace the skipped food with a new one for the selected day
                dietPlan[dayIndex].meals = dietPlan[dayIndex].meals.map((meal) =>
                    meal.Food === skippedFood
                        ? {
                              Food: replacement.food_name,
                              Calories: replacement.energy_kcal,
                              Proteins: replacement.protein_g,
                              Carbs: replacement.carb_g,
                              Fats: replacement.fat_g,
                          }
                        : meal
                );
            });
        }

        // Step 2: Add the additional food to the plan if provided
        if (additionalFood) {
            const additionalFoodItem = data.find((item) => item.food_name.toLowerCase() === additionalFood.toLowerCase());
            if (additionalFoodItem) {
                dietPlan[dayIndex].meals.push({
                    Food: additionalFoodItem.food_name,
                    Calories: additionalFoodItem.energy_kcal,
                    Proteins: additionalFoodItem.protein_g,
                    Carbs: additionalFoodItem.carb_g,
                    Fats: additionalFoodItem.fat_g,
                });
            } else {
                console.warn(`Food "${additionalFood}" not found in the dataset.`);
            }
        }

        // Step 3: Redistribute lost calories across the remaining days
        if (lostCalories > 0) {
            // Calculate the remaining days after the skipped day
            const remainingDays = dietPlan.slice(dayIndex + 1); // Get all days after the skipped day
            const totalRemainingDays = remainingDays.length;

            // Distribute the lost calories evenly across the remaining days
            const caloriesPerDay = lostCalories / totalRemainingDays;

            remainingDays.forEach((dayPlan, index) => {
                // Add the lost calories to each day's meals and replace/adjust meals accordingly
                dayPlan.meals.forEach((meal) => {
                    meal.Calories += caloriesPerDay; // Increase calories for each meal in this day
                    
                    // Optionally replace meals if the new calorie target is significantly higher
                    if (meal.Calories > 500) { // Example threshold for adjusting meals
                        const replacement = data[Math.floor(Math.random() * data.length)];
                        meal.Food = replacement.food_name;
                        meal.Calories = replacement.energy_kcal;
                        meal.Proteins = replacement.protein_g;
                        meal.Carbs = replacement.carb_g;
                        meal.Fats = replacement.fat_g;
                    }
                });
            });
        }

        // Step 4: Update the entire diet plan and save it back to the database
        dietPlanRecord.dietPlan = dietPlan;
        await dietPlanRecord.save();

        res.json({ success: true, updatedPlan: dietPlan[dayIndex].meals });
    } catch (error) {
        console.error('Error adjusting diet plan:', error);
        res.status(500).json({ success: false, message: 'Error adjusting the diet plan.' });
    }
};


exports.getCompleteDietPlan = async (req, res) => {
    try {
        const dietPlanRecord = await DietPlan.findOne({ userId: req.user._id });

        if (!dietPlanRecord || !dietPlanRecord.dietPlan) {
            return res.status(404).json({
                success: false,
                message: 'No diet plan found. Please generate your diet plan first.',
            });
        }

        res.json({ success: true, plan: dietPlanRecord.dietPlan });
    } catch (error) {
        console.error('Error fetching complete diet plan:', error);
        res.status(500).json({ success: false, message: 'Error fetching the complete diet plan.' });
    }
};
