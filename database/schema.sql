CREATE DATABASE IF NOT EXISTS nutritrack_db;
USE nutritrack_db;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS recommendation_notes;
DROP TABLE IF EXISTS nutrition_recommendations;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS food_logs;
DROP TABLE IF EXISTS water_logs;
DROP TABLE IF EXISTS foods;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS subscription_plans;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
  profile_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  age INT,
  gender ENUM('Male', 'Female', 'Other') DEFAULT 'Other',
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  activity_level ENUM('Sedentary', 'Moderate', 'Active') DEFAULT 'Moderate',
  goal ENUM('Weight Loss', 'Maintain', 'Gain') DEFAULT 'Maintain',
  daily_calorie_target INT DEFAULT 2000,
  protein_target_g INT DEFAULT NULL,
  carbs_target_g INT DEFAULT NULL,
  fat_target_g INT DEFAULT NULL,
  water_target_ml INT DEFAULT 2500,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE foods (
  food_id INT AUTO_INCREMENT PRIMARY KEY,
  food_name VARCHAR(100) NOT NULL UNIQUE,
  calories_per_100g DECIMAL(8,2) NOT NULL,
  protein_per_100g DECIMAL(8,2) DEFAULT 0,
  carbs_per_100g DECIMAL(8,2) DEFAULT 0,
  fat_per_100g DECIMAL(8,2) DEFAULT 0
);

CREATE TABLE food_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  food_id INT NOT NULL,
  meal_type ENUM('Breakfast', 'Lunch', 'Dinner', 'Snack') NOT NULL,
  quantity_g DECIMAL(8,2) NOT NULL,
  calories DECIMAL(8,2) NOT NULL,
  protein_g DECIMAL(8,2) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(8,2) NOT NULL DEFAULT 0,
  fat_g DECIMAL(8,2) NOT NULL DEFAULT 0,
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_food_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_food_logs_food FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

CREATE TABLE water_logs (
  water_log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  intake_ml INT NOT NULL,
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_water_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE medical_records (
  record_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  condition_name VARCHAR(120) NOT NULL,
  dietary_restriction TEXT NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_medical_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE nutrition_recommendations (
  recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  recommended_calories INT NOT NULL,
  protein_g INT NOT NULL,
  carbs_g INT NOT NULL,
  fat_g INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE recommendation_notes (
  note_id INT AUTO_INCREMENT PRIMARY KEY,
  recommendation_id INT NOT NULL,
  note_text VARCHAR(255) NOT NULL,
  CONSTRAINT fk_notes_recommendation FOREIGN KEY (recommendation_id) REFERENCES nutrition_recommendations(recommendation_id) ON DELETE CASCADE
);

CREATE TABLE subscription_plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL UNIQUE,
  price DECIMAL(8,2) NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 30,
  description VARCHAR(255) NOT NULL
);

CREATE TABLE subscriptions (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_status ENUM('Active', 'Pending', 'Expired') DEFAULT 'Active',
  auto_renew BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) DEFAULT 'Demo Payment',
  payment_status ENUM('Success', 'Failed', 'Pending') DEFAULT 'Success',
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
);
