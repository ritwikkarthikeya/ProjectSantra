const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const parseCsv = require('csv-parser');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Load the dataset
const csvFilePath = path.join(__dirname, 'FoodContents.csv');
let data = [];
fs.createReadStream(csvFilePath)
    .pipe(parseCsv())
    .on('data', (row) => {
        data.push({
            food_name: row.food_name,
            energy_kcal: parseFloat(row.energy_kcal),
            protein_g: parseFloat(row.protein_g),
            carb_g: parseFloat(row.carb_g),
            fat_g: parseFloat(row.fat_g),
        });
    })
    .on('end', () => {
        console.log('CSV file successfully loaded.');
    });

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

    return bmr * activityMultiplier[activityLevel];
}

function generateDietPlan(data, dailyCalories, numDays = 30) {
    const dietPlan = [];
    const foodItems = data.map(item => item.food_name);

    for (let day = 0; day < numDays; day++) {
        let dayPlan = [];
        let totalCalories = 0;

        while (totalCalories < dailyCalories) {
            const food = foodItems[Math.floor(Math.random() * foodItems.length)];
            if (!dayPlan.find(meal => meal.Food === food)) {
                const nutrients = data.find(item => item.food_name === food);
                dayPlan.push({
                    Food: food,
                    Calories: nutrients.energy_kcal,
                    Proteins: nutrients.protein_g,
                    Carbs: nutrients.carb_g,
                    Fats: nutrients.fat_g,
                });
                totalCalories += nutrients.energy_kcal;
            }
        }

        dietPlan.push(dayPlan);
    }

    return dietPlan;
}

// Routes
app.get('/', (req, res) => {
    res.render('Details', { dietPlan: null });
});

app.post('/generate-diet-plan', (req, res) => {
    const { weight, height, age, gender, activity, target_weight } = req.body;

    const dailyCalories = calculateDailyCalories(weight, height, age, activity, gender);
    const targetCalories = dailyCalories - 500; // Calorie deficit
    const dietPlan = generateDietPlan(data, targetCalories);

    res.render('Details', { dietPlan });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
