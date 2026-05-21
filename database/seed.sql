USE nutritrack_db;

INSERT INTO subscription_plans (plan_name, price, duration_days, description) VALUES
('Free', 0, 30, 'Starter tracking with profile setup, daily calories, and up to 5 food logs per day.'),
('Basic', 199, 30, 'Guided nutrition with 30 daily food logs, medical history, and personalized diet recommendations.'),
('Premium', 499, 30, 'Complete health panel with unlimited-style logging, macro insights, water tracking, and advanced guidance.')
ON DUPLICATE KEY UPDATE price = VALUES(price), description = VALUES(description);

INSERT INTO foods (food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES
('Apple', 52, 0.3, 14, 0.2),
('Rice', 130, 2.7, 28, 0.3),
('Milk', 42, 3.4, 5, 1),
('Egg', 155, 13, 1.1, 11),
('Chicken', 239, 27, 0, 14),
('Banana', 89, 1.1, 23, 0.3),
('Oats', 389, 16.9, 66.3, 6.9),
('Paneer', 265, 18.3, 1.2, 20.8),
('Cow Milk', 67, 3.2, 4.4, 4.1),
('Buffalo Milk', 97, 3.8, 5.2, 6.9),
('Toned Milk', 58, 3.1, 4.7, 3),
('Double Toned Milk', 46, 3.1, 4.8, 1.5),
('Skimmed Milk', 35, 3.4, 5, 0.1),
('Full Cream Milk', 89, 3.3, 5, 6),
('Chai / Milk Tea', 42, 1.5, 5, 1.8),
('Buttermilk / Chaas', 25, 1.2, 3, 0.6),
('Roti / Phulka', 297, 9.6, 46.4, 7.5),
('Chapati', 297, 9.6, 46.4, 7.5),
('Whole Wheat Paratha', 326, 8.7, 45.8, 12.2),
('Aloo Paratha', 210, 5.1, 33.2, 6.4),
('Paneer Paratha', 265, 10.8, 31.5, 10.6),
('Puri', 296, 7.6, 46.7, 9.8),
('Cooked White Rice', 130, 2.7, 28, 0.3),
('Basmati Rice Cooked', 130, 2.7, 28, 0.3),
('Jeera Rice', 165, 3.1, 27.7, 4.8),
('Vegetable Pulao', 152, 3.4, 25.8, 4.2),
('Vegetable Biryani', 171, 4.2, 27.6, 5.1),
('Chicken Biryani', 184, 10.3, 21.2, 6.5),
('Dal Tadka', 116, 6.4, 15.9, 3.1),
('Toor Dal Cooked', 118, 7.2, 18.5, 1.8),
('Moong Dal Cooked', 105, 7, 17.6, 0.4),
('Masoor Dal Cooked', 116, 9, 20.1, 0.4),
('Chana Dal Cooked', 164, 8.9, 27.4, 2.6),
('Rajma Masala', 127, 6.7, 20.4, 2.3),
('Chole Masala', 164, 7.6, 24.9, 4.7),
('Sambar', 58, 2.8, 8.9, 1.4),
('Rasam', 32, 1.2, 5.1, 0.8),
('Idli', 146, 4.5, 30.1, 0.7),
('Plain Dosa', 168, 4.5, 29.8, 3.9),
('Masala Dosa', 192, 4.8, 31.4, 5.9),
('Uttapam', 180, 5.1, 30.6, 4.7),
('Medu Vada', 290, 10.1, 31.3, 14.2),
('Poha', 160, 3, 28, 4),
('Upma', 132, 3.8, 21.1, 4.1),
('Vegetable Khichdi', 105, 3.6, 18.1, 2.3),
('Curd / Dahi', 61, 3.5, 4.7, 3.3),
('Palak Paneer', 169, 7.9, 6.1, 12.2),
('Paneer Tikka', 220, 14.4, 6.8, 15.4),
('Chicken Tikka', 150, 22.5, 2.3, 5.1),
('Butter Chicken', 190, 13.2, 5.8, 12.6),
('Egg Curry', 154, 10.4, 5.1, 10.4),
('Aloo Gobi', 91, 2.8, 13.7, 3.1),
('Bhindi Masala', 92, 2.4, 10.7, 4.8),
('Baingan Bharta', 102, 2.1, 10.6, 6.2),
('Matar Paneer', 162, 8.1, 9.8, 10.2),
('Mixed Vegetable Sabzi', 85, 2.5, 11.2, 3.7),
('Kadhi', 88, 3.4, 9.7, 3.9),
('Dhokla', 160, 5.7, 27.1, 3.4),
('Thepla', 247, 7.2, 36.8, 8.2),
('Samosa', 308, 6.1, 32.4, 17.9),
('Pav Bhaji', 129, 3.8, 19.3, 4.4),
('Bhel Puri', 180, 5, 32.5, 4.3),
('Sprouts Chaat', 98, 6.4, 15.1, 1.4),
('Lassi Sweet', 89, 3.3, 15.6, 1.8),
('Makhana Roasted', 347, 9.7, 76.9, 0.1)
ON DUPLICATE KEY UPDATE
  calories_per_100g = VALUES(calories_per_100g),
  protein_per_100g = VALUES(protein_per_100g),
  carbs_per_100g = VALUES(carbs_per_100g),
  fat_per_100g = VALUES(fat_per_100g);

INSERT INTO users (full_name, email, password_hash) VALUES
('Demo User', 'demo@nutritrack.local', 'demo123')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

SET @demo_user_id = (SELECT user_id FROM users WHERE email = 'demo@nutritrack.local');
SET @premium_plan_id = (SELECT plan_id FROM subscription_plans WHERE plan_name = 'Premium');

INSERT INTO user_profiles (user_id, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_target)
VALUES (@demo_user_id, 22, 'Other', 170, 65, 'Moderate', 'Maintain', 2000)
ON DUPLICATE KEY UPDATE age = VALUES(age), daily_calorie_target = VALUES(daily_calorie_target);

INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, payment_status, auto_renew)
SELECT @demo_user_id, @premium_plan_id, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'Active', TRUE
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = @demo_user_id);

SET @subscription_id = (SELECT subscription_id FROM subscriptions WHERE user_id = @demo_user_id ORDER BY subscription_id DESC LIMIT 1);

INSERT INTO payments (subscription_id, amount, payment_method, payment_status)
SELECT @subscription_id, 499, 'Demo Payment', 'Success'
WHERE @subscription_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM payments WHERE subscription_id = @subscription_id);

INSERT INTO nutrition_recommendations (user_id, recommended_calories, protein_g, carbs_g, fat_g)
SELECT @demo_user_id, 2000, 75, 250, 60
WHERE NOT EXISTS (SELECT 1 FROM nutrition_recommendations WHERE user_id = @demo_user_id);

SET @recommendation_id = (SELECT recommendation_id FROM nutrition_recommendations WHERE user_id = @demo_user_id ORDER BY recommendation_id DESC LIMIT 1);

INSERT INTO recommendation_notes (recommendation_id, note_text)
SELECT @recommendation_id, 'Keep meals balanced with lean protein, vegetables, and complex carbohydrates.'
WHERE @recommendation_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM recommendation_notes WHERE recommendation_id = @recommendation_id);
