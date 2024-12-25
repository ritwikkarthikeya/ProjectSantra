
document.addEventListener('DOMContentLoaded', () => {
        const searchToggleButton = document.getElementById('searchToggleButton');
        const searchContainer = document.getElementById('searchContainer');
        const dietPlanContainer = document.getElementById('wholeResult');
        const myPlanButton = document.getElementById('myPlanButton');
        const fetchDayPlanButton = document.getElementById('fetchDayPlanButton');
        const submitPlanButton = document.getElementById('submitPlan');
        const popup = document.getElementById('popup');
        const dayInput = document.getElementById('dayInput');
        const dietPlanResult = document.getElementById('dietPlanResult');
        const dietPlanCheckboxes = document.getElementById('dietPlanCheckboxes');

        // Search Toggle
        if (searchToggleButton && searchContainer) {
            searchToggleButton.addEventListener('click', () => {
                searchContainer.style.display = searchContainer.style.display === 'flex' ? 'none' : 'flex';
            });
        }

        // My Plan Button
        if (myPlanButton && dietPlanContainer) {
            myPlanButton.addEventListener('click', async () => {
                if (dietPlanContainer.style.display === 'block') {
                    dietPlanContainer.style.display = 'none';
                    dietPlanContainer.innerHTML = '';
                } else {
                    try {
                        const response = await fetch('/my-plan/all');
                        const data = await response.json();

                        if (data.success) {
                            dietPlanContainer.innerHTML = ''; // Clear existing content
                            data.plan.forEach((dayPlan, index) => {
                                const dayHeader = document.createElement('h3');
                                dayHeader.textContent = `Day ${index + 1}`;

                                const dayList = document.createElement('ul');
                                dayPlan.meals.forEach((meal) => {
                                    const listItem = document.createElement('li');
                                    listItem.innerHTML = ` 
                                        <strong>${meal.Food}</strong> 
                                        (Calories: ${meal.Calories}, Proteins: ${meal.Proteins}g, Carbs: ${meal.Carbs}g, Fats: ${meal.Fats}g)
                                    `;
                                    dayList.appendChild(listItem);
                                });

                                dietPlanContainer.appendChild(dayHeader);
                                dietPlanContainer.appendChild(dayList);
                            });

                            dietPlanContainer.style.display = 'block'; // Show the container
                        } else {
                            alert(data.message || 'Failed to fetch the complete diet plan.');
                        }
                    } catch (error) {
                        console.error('Error fetching diet plan:', error);
                        alert('An error occurred while fetching the diet plan.');
                    }
                }
            });
        }

        // Fetch Day Plan
        if (fetchDayPlanButton) {
            fetchDayPlanButton.addEventListener('click', async () => {
                const day = document.getElementById('dayInput').value;
                if (!day || day < 1 || day > 30) {
                    alert('Please enter a valid day number between 1 and 30.');
                    return;
                }

                try {
                    const response = await fetch(`/my-plan/day/${day}`);
                    const data = await response.json();

                    if (data.success) {
                        dietPlanCheckboxes.innerHTML = '';
                        document.getElementById('dayNumber').textContent = day;

                        const fragment = document.createDocumentFragment();
                        data.plan.forEach(item => {
                            const div = document.createElement('div');
                            div.classList.add('food-item');
                            div.innerHTML = `
                                <input type="checkbox" name="selectedFoods" value='${JSON.stringify(item)}' id="food-${item.Food}" checked>
                                <label for="food-${item.Food}">
                                    <strong>${item.Food}</strong> 
                                    (Calories: ${item.Calories}, Proteins: ${item.Proteins}g, Carbs: ${item.Carbs}g, Fats: ${item.Fats}g)
                                </label>
                            `;
                            fragment.appendChild(div);
                        });
                        dietPlanCheckboxes.appendChild(fragment);
                        dietPlanResult.style.display = 'block';
                    } else {
                        alert(data.message || 'Failed to fetch the diet plan.');
                    }
                } catch (error) {
                    console.error('Error fetching diet plan:', error);
                    alert('An error occurred while fetching the diet plan.');
                }
            });
        }

        // Submit Updated Plan
        if (submitPlanButton) {
            submitPlanButton.addEventListener('click', async () => {
                const day = document.getElementById('dayInput').value;
                const selectedFoods = Array.from(document.querySelectorAll('input[name="selectedFoods"]:checked'))
                    .map(checkbox => JSON.parse(checkbox.value));
                const additionalFood = document.getElementById('additionalFood').value.trim();

                try {
                    const response = await fetch(`/diet-plan/adjust/${day}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ selectedFoods, additionalFood }),
                    });
                    const result = await response.json();

                    if (result.success) {
                        alert('Diet plan updated successfully!');
                        // Close the popup after updating
                        popup.style.display = 'none';
                    } else {
                        alert(result.message || 'Failed to update the diet plan.');
                    }
                } catch (error) {
                    console.error('Error updating diet plan:', error);
                    alert('An error occurred while updating the diet plan.');
                }
            });
        }

        // Show Popup on Homepage Load
        popup.style.display = 'flex';
    });
