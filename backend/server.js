const path = require("path");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = process.env.PORT || 3000;
const demoUserId = 1;
const frontendDir = path.join(__dirname, "..", "frontend", "public");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nutritrack_db",
  port: Number(process.env.DB_PORT || 3306),
  connectTimeout: 5000,
  waitForConnections: true,
  connectionLimit: 10
});

app.use(cors());
app.use(express.json());
app.use(express.static(frontendDir));

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function calculateTargets(profile) {
  const weight = Number(profile.weight_kg || 65);
  const height = Number(profile.height_cm || 170);
  const age = Number(profile.age || 22);
  const genderOffset = profile.gender === "Female" ? -161 : 5;
  const activityMultiplier = {
    Sedentary: 1.2,
    Moderate: 1.55,
    Active: 1.725
  }[profile.activity_level] || 1.55;

  let calories = Math.round((10 * weight + 6.25 * height - 5 * age + genderOffset) * activityMultiplier);

  if (profile.goal === "Weight Loss") calories -= 400;
  if (profile.goal === "Gain") calories += 350;

  calories = Math.max(calories, 1200);

  return {
    calories,
    protein: Math.round(weight * 1.2),
    carbs: Math.round((calories * 0.5) / 4),
    fat: Math.round((calories * 0.27) / 9)
  };
}

const conditionGuidanceRules = [
  {
    keywords: ["diabetes", "diabetic", "sugar", "blood sugar", "type 1", "type 2"],
    title: "Diabetes / Blood Sugar",
    summary: "Choose low glycemic, high-fiber meals and spread carbohydrates evenly through the day.",
    prefer: ["Oats", "dal", "beans", "leafy vegetables", "curd", "nuts", "whole wheat roti"],
    limit: ["sweets", "sugary drinks", "white bread", "large rice portions", "fruit juice"],
    notes: [
      "Pair carbohydrates with protein or fiber to reduce sugar spikes.",
      "Prefer whole fruit over fruit juice and keep sweet foods occasional."
    ]
  },
  {
    keywords: ["heart", "cardiac", "cholesterol", "hypertension", "blood pressure", "bp"],
    title: "Heart / Blood Pressure",
    summary: "Focus on low-salt, high-fiber foods with mostly unsaturated fats.",
    prefer: ["oats", "fruits", "vegetables", "lentils", "fish", "nuts", "olive oil"],
    limit: ["fried foods", "processed snacks", "excess salt", "butter", "ghee", "processed meat"],
    notes: [
      "Keep packaged and salty foods low to support blood pressure control.",
      "Use grilled, steamed, boiled, or roasted preparations more often than fried foods."
    ]
  },
  {
    keywords: ["kidney", "renal", "ckd", "creatinine"],
    title: "Kidney / Renal Concern",
    summary: "Keep sodium controlled and follow doctor-specific limits for protein, potassium, and phosphorus.",
    prefer: ["rice", "apple", "cabbage", "cauliflower", "egg whites", "low-salt meals"],
    limit: ["high-salt foods", "processed foods", "cola", "excess protein supplements", "very salty pickles"],
    notes: [
      "Kidney diets vary by lab results, so confirm protein and mineral limits with a clinician.",
      "Avoid adding extra salt at the table."
    ]
  },
  {
    keywords: ["thyroid", "hypothyroid", "hyperthyroid"],
    title: "Thyroid",
    summary: "Keep meals balanced and consistent, with enough protein and micronutrient-rich foods.",
    prefer: ["eggs", "curd", "dal", "whole grains", "fruits", "vegetables", "nuts"],
    limit: ["excess soy", "highly processed foods", "sugary snacks"],
    notes: [
      "If taking thyroid medicine, follow your doctor's timing advice around meals.",
      "Support metabolism with regular meals, protein, and fiber."
    ]
  },
  {
    keywords: ["acidity", "acid reflux", "gerd", "gastritis", "ulcer"],
    title: "Acidity / Reflux",
    summary: "Choose smaller, less oily meals and avoid common reflux triggers.",
    prefer: ["oats", "banana", "curd", "rice", "boiled vegetables", "lean protein"],
    limit: ["spicy foods", "fried foods", "coffee", "carbonated drinks", "late-night heavy meals"],
    notes: [
      "Keep dinner lighter and avoid lying down immediately after eating.",
      "Track personal triggers because reflux foods differ from person to person."
    ]
  },
  {
    keywords: ["anemia", "anaemia", "low hemoglobin", "iron deficiency"],
    title: "Anemia / Low Iron",
    summary: "Add iron-rich foods with vitamin C sources to improve absorption.",
    prefer: ["spinach", "beans", "lentils", "eggs", "lean meat", "citrus fruit", "amla"],
    limit: ["tea with meals", "coffee with meals", "very low-calorie dieting"],
    notes: [
      "Take tea or coffee away from iron-rich meals because they can reduce iron absorption.",
      "Pair dal, beans, or greens with lemon, amla, orange, or tomato."
    ]
  },
  {
    keywords: ["obesity", "overweight", "weight loss"],
    title: "Weight Management",
    summary: "Build filling meals around protein, vegetables, and measured portions of carbs and fats.",
    prefer: ["eggs", "paneer in moderation", "dal", "chicken", "vegetables", "salads", "fruit"],
    limit: ["sweet drinks", "fried snacks", "large dessert portions", "mindless snacking"],
    notes: [
      "Use smaller plates and keep protein in each main meal to improve fullness.",
      "Prefer whole foods most of the time instead of liquid calories."
    ]
  }
];

const generalGuidance = {
  title: "General Healthy Eating",
  summary: "Use balanced meals with vegetables, protein, whole grains, and healthy fats.",
  prefer: ["vegetables", "fruits", "dal", "eggs", "curd", "oats", "whole grains"],
  limit: ["sugary drinks", "deep-fried foods", "highly processed snacks"],
  notes: [
    "Complete your medical history for more specific diet guidance.",
    "This guidance supports planning and does not replace advice from a doctor or dietitian."
  ]
};

const planRank = { Free: 0, Basic: 1, Premium: 2 };

const planBenefits = {
  Free: [
    "Profile setup",
    "Basic food search",
    "Daily calorie dashboard",
    "Up to 5 food logs per day"
  ],
  Basic: [
    "Everything in Free",
    "Up to 30 food logs per day",
    "Medical history based guidance",
    "Personalized calorie and macro targets",
    "Food recommendations to prefer and limit"
  ],
  Premium: [
    "Everything in Basic",
    "Water intake tracking",
    "Detailed macro progress panel",
    "Unlimited-style daily food logging",
    "Advanced health focus insights"
  ]
};

const planLimits = {
  Free: { dailyFoodLogs: 5, waterTracking: false, recommendations: false, medicalHistory: false, advancedMacros: false },
  Basic: { dailyFoodLogs: 30, waterTracking: false, recommendations: true, medicalHistory: true, advancedMacros: false },
  Premium: { dailyFoodLogs: 999, waterTracking: true, recommendations: true, medicalHistory: true, advancedMacros: true }
};

function normalizePlanName(planName) {
  return planRank[planName] !== undefined ? planName : "Free";
}

function canUsePlan(planName, requiredPlan) {
  return planRank[normalizePlanName(planName)] >= planRank[requiredPlan];
}

function planAccessPayload(planName) {
  const normalizedPlan = normalizePlanName(planName);

  return {
    currentPlan: normalizedPlan,
    rank: planRank[normalizedPlan],
    limits: planLimits[normalizedPlan],
    benefits: planBenefits[normalizedPlan],
    allPlans: Object.entries(planBenefits).map(([name, benefits]) => ({
      name,
      rank: planRank[name],
      benefits,
      limits: planLimits[name]
    }))
  };
}

async function getUserPlan(userId) {
  const [rows] = await pool.query(
    `SELECT sp.plan_name
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.plan_id = s.plan_id
     WHERE s.user_id = ? AND s.payment_status = 'Active' AND s.end_date >= CURRENT_DATE
     ORDER BY s.subscription_id DESC
     LIMIT 1`,
    [userId]
  );

  return normalizePlanName(rows[0]?.plan_name || "Free");
}

async function requirePlan(userId, requiredPlan, res, featureName) {
  const currentPlan = await getUserPlan(userId);

  if (canUsePlan(currentPlan, requiredPlan)) {
    return currentPlan;
  }

  res.status(403).json({
    message: `${featureName} is included in ${requiredPlan}. Upgrade your plan to continue.`,
    currentPlan,
    requiredPlan,
    upgradeRequired: true
  });

  return null;
}

async function ensureColumn(tableName, columnName, definition) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (!columns.length) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean).map(item => String(item).trim()).filter(Boolean))];
}

function getConditionGuidance(records) {
  const matched = [];

  records.forEach(record => {
    const text = `${record.condition_name || ""} ${record.dietary_restriction || ""} ${record.notes || ""}`.toLowerCase();
    conditionGuidanceRules.forEach(rule => {
      if (rule.keywords.some(keyword => text.includes(keyword)) && !matched.some(item => item.title === rule.title)) {
        matched.push(rule);
      }
    });
  });

  const conditionGuidance = matched.length ? matched : [generalGuidance];

  return {
    conditionGuidance,
    foodsToPrefer: uniqueItems(conditionGuidance.flatMap(rule => rule.prefer)).slice(0, 14),
    foodsToLimit: uniqueItems(conditionGuidance.flatMap(rule => rule.limit)).slice(0, 14),
    notes: uniqueItems(conditionGuidance.flatMap(rule => rule.notes))
  };
}

function buildDashboardHealthSummary(records) {
  const guidance = getConditionGuidance(records);
  const matchedTitles = guidance.conditionGuidance
    .map(rule => rule.title)
    .filter(title => title !== generalGuidance.title);
  const savedConditionNames = uniqueItems(records.map(record => record.condition_name));
  const titles = matchedTitles.length ? matchedTitles : savedConditionNames;
  const conditionText = titles.length
    ? titles.join(", ")
    : "your general health profile";
  const prefer = guidance.foodsToPrefer.slice(0, 3).join(", ");
  const limit = guidance.foodsToLimit.slice(0, 3).join(", ");

  return {
    focus: titles.length
      ? `Today's focus for ${conditionText}: prefer ${prefer || "balanced meals"} and limit ${limit || "processed foods"}.`
      : "Add your medical history to get a condition-specific health summary on the dashboard.",
    details: titles.length
      ? `Based on your saved medical history, keep meals aligned with ${conditionText}. Prefer ${prefer || "whole foods"} and be careful with ${limit || "highly processed foods"}.`
      : "No medical condition is saved yet. Add diabetes, heart issues, thyroid, acidity, anemia, kidney concerns, or other history to personalize this summary.",
    focusPoints: guidance.notes.slice(0, 3)
  };
}

async function ensureDemoUser() {
  await pool.query("ALTER TABLE medical_records MODIFY dietary_restriction TEXT NOT NULL");
  await ensureColumn("user_profiles", "protein_target_g", "INT DEFAULT NULL");
  await ensureColumn("user_profiles", "carbs_target_g", "INT DEFAULT NULL");
  await ensureColumn("user_profiles", "fat_target_g", "INT DEFAULT NULL");
  await ensureColumn("user_profiles", "water_target_ml", "INT DEFAULT 2500");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS water_logs (
      water_log_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      intake_ml INT NOT NULL,
      log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_water_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  await pool.query(
    `INSERT INTO subscription_plans (plan_name, price, duration_days, description) VALUES
      ('Free', 0, 30, 'Starter tracking with profile setup, daily calories, and up to 5 food logs per day.'),
      ('Basic', 199, 30, 'Guided nutrition with 30 daily food logs, medical history, and personalized diet recommendations.'),
      ('Premium', 499, 30, 'Complete health panel with unlimited-style logging, macro insights, water tracking, and advanced guidance.')
     ON DUPLICATE KEY UPDATE
      price = VALUES(price),
      duration_days = VALUES(duration_days),
      description = VALUES(description)`
  );

  await pool.query(
    "INSERT IGNORE INTO users (user_id, full_name, email, password_hash) VALUES (?, ?, ?, ?)",
    [demoUserId, "Demo User", "demo@nutritrack.local", "demo123"]
  );

  await pool.query(
    `INSERT IGNORE INTO user_profiles
      (user_id, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_target)
      VALUES (?, 22, 'Other', 170, 65, 'Moderate', 'Maintain', 2000)`,
    [demoUserId]
  );

  await pool.query(
    `INSERT INTO foods (food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
     VALUES ?
     ON DUPLICATE KEY UPDATE
      calories_per_100g = VALUES(calories_per_100g),
      protein_per_100g = VALUES(protein_per_100g),
      carbs_per_100g = VALUES(carbs_per_100g),
      fat_per_100g = VALUES(fat_per_100g)`,
    [INDIAN_FOOD_SEEDS]
  );
}

app.get("/api/health", asyncHandler(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: process.env.DB_NAME || "nutritrack_db" });
}));

app.get("/api/access/:userId", asyncHandler(async (req, res) => {
  const currentPlan = await getUserPlan(req.params.userId);
  res.json(planAccessPayload(currentPlan));
}));

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const [existingUsers] = await pool.query("SELECT user_id FROM users WHERE email = ?", [email]);

  if (existingUsers.length) {
    return res.status(409).json({ message: "This email is already registered. Please sign in instead." });
  }

  const [result] = await pool.query(
    "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
    [fullName, email, password]
  );

  await pool.query("INSERT INTO user_profiles (user_id) VALUES (?)", [result.insertId]);

  res.status(201).json({ userId: result.insertId, fullName, email });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query(
    "SELECT user_id, full_name, email FROM users WHERE email = ? AND password_hash = ?",
    [email, password]
  );

  if (!rows.length) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json(rows[0]);
}));

app.get("/api/profile/:userId", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, p.age, p.gender, p.height_cm, p.weight_kg,
      p.activity_level, p.goal, p.daily_calorie_target
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.user_id
     WHERE u.user_id = ?`,
    [req.params.userId]
  );

  if (!rows.length) return res.status(404).json({ message: "User not found." });

  res.json(rows[0]);
}));

app.put("/api/profile/:userId", asyncHandler(async (req, res) => {
  const profile = req.body;
  const targets = calculateTargets(profile);
  const calorieTarget = (profile.daily_calorie_target && Number(profile.daily_calorie_target) > 0)
    ? Number(profile.daily_calorie_target)
    : targets.calories;

  await pool.query("UPDATE users SET full_name = ? WHERE user_id = ?", [
    profile.full_name || "NutriTrack User",
    req.params.userId
  ]);

  await pool.query(
    `INSERT INTO user_profiles
      (user_id, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_target)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      age = VALUES(age),
      gender = VALUES(gender),
      height_cm = VALUES(height_cm),
      weight_kg = VALUES(weight_kg),
      activity_level = VALUES(activity_level),
      goal = VALUES(goal),
      daily_calorie_target = VALUES(daily_calorie_target)`,
    [
      req.params.userId,
      profile.age || null,
      profile.gender || "Other",
      profile.height_cm || null,
      profile.weight_kg || null,
      profile.activity_level || "Moderate",
      profile.goal || "Maintain",
      calorieTarget
    ]
  );

  await pool.query(
    `INSERT INTO nutrition_recommendations (user_id, recommended_calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.userId, calorieTarget, targets.protein, targets.carbs, targets.fat]
  );

  res.json({ message: "Profile saved.", targets: { ...targets, calories: calorieTarget } });
}));

app.patch("/api/profile/:userId/calories", asyncHandler(async (req, res) => {
  const { dailyCalorieTarget } = req.body;
  if (!dailyCalorieTarget || Number(dailyCalorieTarget) <= 0) {
    return res.status(400).json({ message: "A valid daily calorie target is required." });
  }

  await pool.query(
    `UPDATE user_profiles SET daily_calorie_target = ? WHERE user_id = ?`,
    [Number(dailyCalorieTarget), req.params.userId]
  );

  const [profileRows] = await pool.query("SELECT * FROM user_profiles WHERE user_id = ?", [req.params.userId]);
  const profile = profileRows[0] || {};
  const weight = Number(profile.weight_kg || 65);
  
  const protein = Math.round(weight * 1.2);
  const carbs = Math.round((Number(dailyCalorieTarget) * 0.5) / 4);
  const fat = Math.round((Number(dailyCalorieTarget) * 0.27) / 9);

  await pool.query(
    `INSERT INTO nutrition_recommendations (user_id, recommended_calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.userId, Number(dailyCalorieTarget), protein, carbs, fat]
  );

  res.json({ message: "Calorie target updated successfully.", dailyCalorieTarget });
}));

app.patch("/api/profile/:userId/macros", asyncHandler(async (req, res) => {
  const proteinTarget = Math.round(Number(req.body.proteinTarget));
  const carbsTarget = Math.round(Number(req.body.carbsTarget));
  const fatTarget = Math.round(Number(req.body.fatTarget));

  if (proteinTarget <= 0 || carbsTarget <= 0 || fatTarget <= 0) {
    return res.status(400).json({ message: "Valid protein, carbs and fat targets are required." });
  }

  if (proteinTarget > 1000 || carbsTarget > 1500 || fatTarget > 1000) {
    return res.status(400).json({ message: "Macro targets are too high. Please enter realistic gram values." });
  }

  const [profileRows] = await pool.query("SELECT daily_calorie_target FROM user_profiles WHERE user_id = ?", [req.params.userId]);
  if (!profileRows.length) {
    return res.status(404).json({ message: "User profile not found." });
  }

  await pool.query(
    `UPDATE user_profiles
     SET protein_target_g = ?, carbs_target_g = ?, fat_target_g = ?
     WHERE user_id = ?`,
    [proteinTarget, carbsTarget, fatTarget, req.params.userId]
  );

  await pool.query(
    `INSERT INTO nutrition_recommendations (user_id, recommended_calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.userId, Number(profileRows[0].daily_calorie_target || 2000), proteinTarget, carbsTarget, fatTarget]
  );

  res.json({
    message: "Macro targets updated successfully.",
    targets: { proteinTarget, carbsTarget, fatTarget }
  });
}));

app.patch("/api/profile/:userId/water-target", asyncHandler(async (req, res) => {
  const waterTargetMl = Math.round(Number(req.body.waterTargetMl));

  if (!waterTargetMl || waterTargetMl < 500 || waterTargetMl > 10000) {
    return res.status(400).json({ message: "Enter a valid water target between 500 and 10000 ml." });
  }

  const [result] = await pool.query(
    "UPDATE user_profiles SET water_target_ml = ? WHERE user_id = ?",
    [waterTargetMl, req.params.userId]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: "User profile not found." });
  }

  res.json({ message: "Water target updated successfully.", waterTargetMl });
}));

app.get("/api/foods", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM foods ORDER BY food_name");
  res.json(rows);
}));

const INDIAN_KEYWORDS = [
  "masala", "paneer", "dal", "chicken tikka", "chapati", "dosa",
  "roti", "idli", "samosa", "biryani", "chhole", "palak", "naan",
  "curry", "ghee", "sabzi", "bhindi", "aloo", "chana", "rajma",
  "rice", "basmati", "paratha", "puri", "khichdi", "upma", "poha",
  "sambar", "rasam", "uttapam", "vada", "katori", "chaat", "lassi",
  "curd", "dahi", "thepla", "dhokla", "kheer", "halwa", "makhana",
  "sprouts", "matar", "methi", "baingan", "lauki", "kadhi", "kofta"
];

const INDIAN_FOOD_SEEDS = [
  ["Roti / Phulka", 297, 9.6, 46.4, 7.5],
  ["Chapati", 297, 9.6, 46.4, 7.5],
  ["Whole Wheat Paratha", 326, 8.7, 45.8, 12.2],
  ["Aloo Paratha", 210, 5.1, 33.2, 6.4],
  ["Paneer Paratha", 265, 10.8, 31.5, 10.6],
  ["Puri", 296, 7.6, 46.7, 9.8],
  ["Cooked White Rice", 130, 2.7, 28, 0.3],
  ["Basmati Rice Cooked", 130, 2.7, 28, 0.3],
  ["Jeera Rice", 165, 3.1, 27.7, 4.8],
  ["Vegetable Pulao", 152, 3.4, 25.8, 4.2],
  ["Vegetable Biryani", 171, 4.2, 27.6, 5.1],
  ["Chicken Biryani", 184, 10.3, 21.2, 6.5],
  ["Dal Tadka", 116, 6.4, 15.9, 3.1],
  ["Toor Dal Cooked", 118, 7.2, 18.5, 1.8],
  ["Moong Dal Cooked", 105, 7, 17.6, 0.4],
  ["Masoor Dal Cooked", 116, 9, 20.1, 0.4],
  ["Chana Dal Cooked", 164, 8.9, 27.4, 2.6],
  ["Rajma Masala", 127, 6.7, 20.4, 2.3],
  ["Chole Masala", 164, 7.6, 24.9, 4.7],
  ["Sambar", 58, 2.8, 8.9, 1.4],
  ["Rasam", 32, 1.2, 5.1, 0.8],
  ["Idli", 146, 4.5, 30.1, 0.7],
  ["Plain Dosa", 168, 4.5, 29.8, 3.9],
  ["Masala Dosa", 192, 4.8, 31.4, 5.9],
  ["Uttapam", 180, 5.1, 30.6, 4.7],
  ["Medu Vada", 290, 10.1, 31.3, 14.2],
  ["Poha", 160, 3, 28, 4],
  ["Upma", 132, 3.8, 21.1, 4.1],
  ["Vegetable Khichdi", 105, 3.6, 18.1, 2.3],
  ["Curd / Dahi", 61, 3.5, 4.7, 3.3],
  ["Paneer", 265, 18.3, 1.2, 20.8],
  ["Palak Paneer", 169, 7.9, 6.1, 12.2],
  ["Paneer Tikka", 220, 14.4, 6.8, 15.4],
  ["Chicken Tikka", 150, 22.5, 2.3, 5.1],
  ["Butter Chicken", 190, 13.2, 5.8, 12.6],
  ["Egg Curry", 154, 10.4, 5.1, 10.4],
  ["Aloo Gobi", 91, 2.8, 13.7, 3.1],
  ["Bhindi Masala", 92, 2.4, 10.7, 4.8],
  ["Baingan Bharta", 102, 2.1, 10.6, 6.2],
  ["Matar Paneer", 162, 8.1, 9.8, 10.2],
  ["Mixed Vegetable Sabzi", 85, 2.5, 11.2, 3.7],
  ["Kadhi", 88, 3.4, 9.7, 3.9],
  ["Dhokla", 160, 5.7, 27.1, 3.4],
  ["Thepla", 247, 7.2, 36.8, 8.2],
  ["Samosa", 308, 6.1, 32.4, 17.9],
  ["Pav Bhaji", 129, 3.8, 19.3, 4.4],
  ["Bhel Puri", 180, 5, 32.5, 4.3],
  ["Sprouts Chaat", 98, 6.4, 15.1, 1.4],
  ["Lassi Sweet", 89, 3.3, 15.6, 1.8],
  ["Makhana Roasted", 347, 9.7, 76.9, 0.1],
  ["Milk", 42, 3.4, 5, 1],
  ["Cow Milk", 67, 3.2, 4.4, 4.1],
  ["Buffalo Milk", 97, 3.8, 5.2, 6.9],
  ["Toned Milk", 58, 3.1, 4.7, 3],
  ["Double Toned Milk", 46, 3.1, 4.8, 1.5],
  ["Skimmed Milk", 35, 3.4, 5, 0.1],
  ["Full Cream Milk", 89, 3.3, 5, 6],
  ["Chai / Milk Tea", 42, 1.5, 5, 1.8],
  ["Buttermilk / Chaas", 25, 1.2, 3, 0.6],
  ["Curd / Dahi", 61, 3.5, 4.7, 3.3]
];

function calculateIndianRelevanceScore(food, searchTerm) {
  let score = 0;
  const lowerName = String(food.food_name || "").toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();

  if (lowerName === lowerSearch) score += 300;
  if (lowerName.startsWith(lowerSearch)) score += 180;
  if (lowerName.includes(lowerSearch)) score += 100;

  if (String(food.source || "").toLowerCase().includes("india")) score += 40;
  if (food.source === "local") score += 20;

  for (const keyword of INDIAN_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      score += 30;
      break;
    }
  }

  if (lowerName.includes(lowerSearch) && INDIAN_KEYWORDS.some(k => lowerSearch.includes(k))) {
    score += 20;
  }

  return score;
}

const fetchWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

function parseOFFProducts(data, sourceName = "Open Food Facts") {
  // Support both legacy (data.products) and Search-a-licious (data.hits) formats
  const items = data.hits || data.products || [];
  return items.map(p => {
    const n = p.nutriments || {};
    const foodName = String(p.product_name || p.product_name_en || p.generic_name || "").trim();
    const calories = Number(n["energy-kcal_100g"] || n["energy-kcal"] || 0);
    if (!foodName || !calories) return null;
    // brands can be a string or array depending on the endpoint
    const brandValue = Array.isArray(p.brands) ? p.brands.join(", ") : (p.brands || "Open Food Facts");
    return {
      externalCode: p.code || null,
      food_name: foodName,
      brand: brandValue,
      calories_per_100g: calories,
      protein_per_100g: Number(n.proteins_100g || 0),
      carbs_per_100g: Number(n.carbohydrates_100g || 0),
      fat_per_100g: Number(n.fat_100g || 0),
      source: sourceName
    };
  }).filter(Boolean);
}

function normalizeExternalFoodItem(item, sourceName) {
  const foodName = String(item.food_name || item.name || item.label || item.title || "").trim();
  const calories = Number(
    item.calories_per_100g ||
    item.calories ||
    item.energy_kcal ||
    item.energyKcal ||
    item.nutrients?.ENERC_KCAL ||
    0
  );

  if (!foodName || !calories) return null;

  return {
    food_name: foodName,
    brand: item.brand || item.brand_name || sourceName,
    calories_per_100g: calories,
    protein_per_100g: Number(item.protein_per_100g || item.protein || item.protein_g || item.nutrients?.PROCNT || 0),
    carbs_per_100g: Number(item.carbs_per_100g || item.carbs || item.carbohydrates || item.carbohydrates_total_g || item.nutrients?.CHOCDF || 0),
    fat_per_100g: Number(item.fat_per_100g || item.fat || item.fat_total_g || item.nutrients?.FAT || 0),
    source: sourceName
  };
}

function extractFoodItems(data) {
  if (Array.isArray(data)) return data;
  return data?.foods || data?.items || data?.results || data?.data || data?.hints || [];
}

function buildProviderUrl(baseUrl, searchTerm) {
  if (baseUrl.includes("{query}")) {
    return baseUrl.replace("{query}", encodeURIComponent(searchTerm));
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}q=${encodeURIComponent(searchTerm)}`;
}

function fetchConfiguredFoodProvider({ baseUrl, apiKey, headerName = "Authorization", sourceName }, searchTerm) {
  if (!baseUrl) return null;

  const headers = {};
  if (apiKey) {
    headers[headerName] = headerName.toLowerCase() === "authorization" ? `Bearer ${apiKey}` : apiKey;
  }

  return fetchWithTimeout(buildProviderUrl(baseUrl, searchTerm), { headers }, 2500)
    .then(resp => resp.json())
    .then(data => extractFoodItems(data)
      .map(item => normalizeExternalFoodItem(item.food || item, sourceName))
      .filter(Boolean))
    .catch(err => { console.log(`[API] ${sourceName} failed:`, err.message); return []; });
}

function fetchOpenFoodFactsSearch(url, sourceName) {
  return fetchWithTimeout(url, {
    headers: {
      "User-Agent": "NutriTrack/1.0 (student-project)"
    }
  }, EXTERNAL_SEARCH_TIMEOUT_MS)
    .then(resp => resp.json())
    .then(data => parseOFFProducts(data, sourceName))
    .catch(err => { console.log(`[API] ${sourceName} failed:`, err.message); return []; });
}

const apiCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const STALE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const pendingApiSearches = new Set();
const EXTERNAL_SEARCH_TIMEOUT_MS = 3200;

function buildFoodSearchResponse(localFoods, apiFoods, searchTerm) {
  const seen = new Set();
  const allFoods = [...localFoods, ...apiFoods].filter(food => {
    if (!food.food_name || (food.source !== "FatSecret" && !food.calories_per_100g)) return false;
    const key = `${food.food_name}-${food.brand}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const scoredFoods = allFoods.map(food => ({
    ...food,
    score: calculateIndianRelevanceScore(food, searchTerm)
  }));

  scoredFoods.sort((a, b) => b.score - a.score);

  return scoredFoods.map(({ score, ...rest }) => rest).slice(0, 40);
}

function databaseLabel(source) {
  const value = String(source || "Unknown").toLowerCase();

  if (value.includes("open food facts india")) return "Open Food Facts India";
  if (value.includes("open food facts in")) return "Open Food Facts India";
  if (value.includes("open food facts")) return "Open Food Facts";
  if (value.includes("usda")) return "USDA";
  if (value.includes("nutritionix")) return "Nutritionix";
  if (value.includes("calorieninjas")) return "CalorieNinjas";
  if (value.includes("edamam")) return "Edamam";
  if (value.includes("spoonacular")) return "Spoonacular";
  if (value.includes("fatsecret")) return "FatSecret";
  if (value.includes("bon happetee")) return "Bon Happetee";
  if (value.includes("apyflux")) return "Apyflux Indian Food API";
  if (value.includes("indian nutrition")) return "Indian Nutrition API";
  if (value.includes("local")) return "Local Database";

  return source || "Unknown";
}

function buildSearchMeta(foods, searchTerm, startedAt, cacheStatus) {
  const counts = new Map();

  foods.forEach(food => {
    const label = databaseLabel(food.source);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const databases = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    query: searchTerm,
    totalResults: foods.length,
    databases,
    cacheStatus,
    durationMs: Date.now() - startedAt
  };
}

async function fetchExternalFoodResults(searchTerm) {
  const fetchPromises = [];
  const indianProvider = fetchConfiguredFoodProvider({
    baseUrl: process.env.INDIAN_FOOD_API_URL,
    apiKey: process.env.INDIAN_FOOD_API_KEY,
    headerName: process.env.INDIAN_FOOD_API_HEADER || "Authorization",
    sourceName: "Indian Nutrition API"
  }, searchTerm);
  const bonHappeteeProvider = fetchConfiguredFoodProvider({
    baseUrl: process.env.BONHAPPETEE_API_URL,
    apiKey: process.env.BONHAPPETEE_API_KEY,
    headerName: process.env.BONHAPPETEE_API_HEADER || "Authorization",
    sourceName: "Bon Happetee"
  }, searchTerm);
  const apyfluxIndianProvider = fetchConfiguredFoodProvider({
    baseUrl: process.env.APYFLUX_INDIAN_FOOD_API_URL,
    apiKey: process.env.APYFLUX_INDIAN_FOOD_API_KEY,
    headerName: process.env.APYFLUX_INDIAN_FOOD_API_HEADER || "Authorization",
    sourceName: "Apyflux Indian Food API"
  }, searchTerm);

  if (indianProvider) fetchPromises.push(indianProvider);
  if (bonHappeteeProvider) fetchPromises.push(bonHappeteeProvider);
  if (apyfluxIndianProvider) fetchPromises.push(apyfluxIndianProvider);

  // A. Open Food Facts India country-filtered API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(searchTerm)}&countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=20`,
      "Open Food Facts India"
    )
  );

  // B. Open Food Facts India subdomain API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=20`,
      "Open Food Facts India"
    )
  );

  // C. Open Food Facts India-biased Search-a-licious API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(`${searchTerm} india`)}&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=15`,
      "Open Food Facts India"
    )
  );

  // D. Open Food Facts broad Search-a-licious API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(searchTerm)}&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=15`,
      "Open Food Facts"
    )
  );

  // E. CalorieNinjas
  if (process.env.CALORIENINJAS_API_KEY) {
    fetchPromises.push(
      fetchWithTimeout(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(searchTerm)}`, {
        headers: { "X-Api-Key": process.env.CALORIENINJAS_API_KEY }
      }, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.items || []).map(item => {
          const servingG = Number(item.serving_size_g) || 100;
          return {
            food_name: item.name, brand: "CalorieNinjas",
            calories_per_100g: Math.round((item.calories || 0) * (100 / servingG)),
            protein_per_100g: Math.round(((item.protein_g || 0) * (100 / servingG)) * 10) / 10,
            carbs_per_100g: Math.round(((item.carbohydrates_total_g || 0) * (100 / servingG)) * 10) / 10,
            fat_per_100g: Math.round(((item.fat_total_g || 0) * (100 / servingG)) * 10) / 10,
            source: "CalorieNinjas"
          };
        }))
        .catch(err => { console.log("[API] CalorieNinjas failed:", err.message); return []; })
    );
  }

  // F. Nutritionix natural nutrients.
  if (process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY) {
    fetchPromises.push(
      fetchWithTimeout("https://trackapi.nutritionix.com/v2/natural/nutrients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-id": process.env.NUTRITIONIX_APP_ID,
          "x-app-key": process.env.NUTRITIONIX_APP_KEY
        },
        body: JSON.stringify({ query: searchTerm })
      }, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.foods || []).map(item => {
          const servingG = Number(item.serving_weight_grams) || 100;
          const factor = 100 / servingG;
          return {
            food_name: item.food_name,
            brand: item.brand_name || "Nutritionix",
            calories_per_100g: Math.round(Number(item.nf_calories || 0) * factor),
            protein_per_100g: Math.round(Number(item.nf_protein || 0) * factor * 10) / 10,
            carbs_per_100g: Math.round(Number(item.nf_total_carbohydrate || 0) * factor * 10) / 10,
            fat_per_100g: Math.round(Number(item.nf_total_fat || 0) * factor * 10) / 10,
            source: "Nutritionix"
          };
        }))
        .catch(err => { console.log("[API] Nutritionix failed:", err.message); return []; })
    );
  }

  // G. Edamam
  if (process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY) {
    const edamamUrl = `https://api.edamam.com/api/food-database/v2/parser?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}&ingr=${encodeURIComponent(searchTerm)}`;
    fetchPromises.push(
      fetchWithTimeout(edamamUrl, {}, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.parsed || []).concat(data.hints || []).slice(0, 10).map(item => {
          const fd = item.food;
          if (!fd || !fd.nutrients) return null;
          return {
            food_name: fd.label, brand: fd.brand || "Edamam",
            calories_per_100g: fd.nutrients.ENERC_KCAL || 0,
            protein_per_100g: fd.nutrients.PROCNT || 0,
            carbs_per_100g: fd.nutrients.CHOCDF || 0,
            fat_per_100g: fd.nutrients.FAT || 0,
            source: "Edamam"
          };
        }).filter(Boolean))
        .catch(err => { console.log("[API] Edamam failed:", err.message); return []; })
    );
  }

  // H. Spoonacular ingredients.
  if (process.env.SPOONACULAR_API_KEY) {
    fetchPromises.push(
      fetchWithTimeout(`https://api.spoonacular.com/food/ingredients/search?apiKey=${process.env.SPOONACULAR_API_KEY}&query=${encodeURIComponent(searchTerm)}&number=10&metaInformation=true`, {}, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.results || []).map(item => normalizeExternalFoodItem({
          food_name: item.name,
          brand: "Spoonacular",
          calories_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Calories")?.amount || 0,
          protein_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Protein")?.amount || 0,
          carbs_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Carbohydrates")?.amount || 0,
          fat_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Fat")?.amount || 0
        }, "Spoonacular")).filter(Boolean))
        .catch(err => { console.log("[API] Spoonacular failed:", err.message); return []; })
    );
  }

  // I. USDA FoodData Central
  const usdaKey = process.env.USDA_API_KEY || "DEMO_KEY";
  fetchPromises.push(
    fetchWithTimeout(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(searchTerm)}&pageSize=10`, {}, EXTERNAL_SEARCH_TIMEOUT_MS)
      .then(resp => resp.json())
      .then(data => (data.foods || []).map(fd => {
        const getNutrient = (id) => (fd.foodNutrients || []).find(n => n.nutrientId === id)?.value || 0;
        return {
          food_name: fd.description, brand: fd.brandOwner || "USDA",
          calories_per_100g: getNutrient(1008),
          protein_per_100g: getNutrient(1003),
          carbs_per_100g: getNutrient(1005),
          fat_per_100g: getNutrient(1004),
          source: usdaKey === "DEMO_KEY" ? "USDA (Demo Key)" : "USDA"
        };
      }))
      .catch(err => { console.log("[API] USDA failed:", err.message); return []; })
  );

  // J. FatSecret
  if (process.env.FATSECRET_ACCESS_TOKEN) {
    fetchPromises.push(
      fetchWithTimeout(`https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(searchTerm)}&format=json`, {
        headers: { "Authorization": `Bearer ${process.env.FATSECRET_ACCESS_TOKEN}` }
      }, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.foods?.food || []).map(fd => ({
          food_name: fd.food_name, brand: fd.brand_name || "FatSecret",
          calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0,
          source: "FatSecret"
        })))
        .catch(err => { console.log("[API] FatSecret failed:", err.message); return []; })
    );
  }

  const settled = await Promise.allSettled(fetchPromises);
  return settled.reduce((foods, result) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      foods.push(...result.value);
    }
    return foods;
  }, []);
}

function refreshExternalFoodCache(searchTerm, cacheKey) {
  if (pendingApiSearches.has(cacheKey)) return;

  pendingApiSearches.add(cacheKey);
  fetchExternalFoodResults(searchTerm)
    .then(apiFoods => {
      if (apiCache.size > 200) {
        const oldestKey = apiCache.keys().next().value;
        apiCache.delete(oldestKey);
      }
      apiCache.set(cacheKey, { data: apiFoods, timestamp: Date.now() });
      console.log(`[Search] "${searchTerm}" => External cache refreshed (${apiFoods.length})`);
    })
    .catch(err => console.log("[API] Food cache refresh failed:", err.message))
    .finally(() => pendingApiSearches.delete(cacheKey));
}

app.get("/api/foods/search", asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const searchTerm = String(req.query.q || "").trim();
  const includeLocal = String(req.query.includeLocal || "").toLowerCase() === "true";
  const fallbackLocal = String(req.query.fallbackLocal || "").toLowerCase() === "true";
  const includeMeta = String(req.query.meta || "").toLowerCase() === "true";

  if (searchTerm.length < 2) {
    return res.json(includeMeta
      ? { foods: [], meta: buildSearchMeta([], searchTerm, startedAt, "skipped") }
      : []);
  }

  const cacheKey = searchTerm.toLowerCase();
  let localFoods = [];
  let apiFoods = [];
  let cacheStatus = "miss";

  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Search] "${searchTerm}" => Cache HIT (api: ${cached.data.length})`);
    apiFoods = cached.data;
    cacheStatus = "fresh-cache";
  } else if (cached && (Date.now() - cached.timestamp < STALE_CACHE_TTL)) {
    console.log(`[Search] "${searchTerm}" => Stale cache HIT. Refreshing external APIs in background...`);
    apiFoods = cached.data;
    cacheStatus = "stale-cache";
    refreshExternalFoodCache(searchTerm, cacheKey);
  } else {
    console.log(`[Search] "${searchTerm}" => Internet API MISS. Querying external APIs...`);
    apiFoods = await fetchExternalFoodResults(searchTerm);

    if (apiCache.size > 200) {
      const oldestKey = apiCache.keys().next().value;
      apiCache.delete(oldestKey);
    }
    apiCache.set(cacheKey, { data: apiFoods, timestamp: Date.now() });
    cacheStatus = "internet";
  }

  if (includeLocal || (fallbackLocal && !apiFoods.length)) {
    const [rows] = await pool.query(
      `SELECT food_id, food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        'Local Database' AS brand, 'local' AS source
       FROM foods
       WHERE food_name LIKE ?
       ORDER BY
        CASE
          WHEN LOWER(food_name) = LOWER(?) THEN 0
          WHEN LOWER(food_name) LIKE LOWER(?) THEN 1
          ELSE 2
        END,
        food_name
       LIMIT 20`,
      [`%${searchTerm}%`, searchTerm, `${searchTerm}%`]
    );
    localFoods = rows;
  }

  console.log(`[Search] "${searchTerm}" => local: ${localFoods.length}, api: ${apiFoods.length}`);

  const foods = buildFoodSearchResponse(localFoods, apiFoods, searchTerm);

  res.json(includeMeta
    ? { foods, meta: buildSearchMeta(foods, searchTerm, startedAt, cacheStatus) }
    : foods);
}));

app.get("/api/food-logs/:userId", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT fl.log_id, f.food_name, fl.meal_type, fl.quantity_g, fl.calories,
      fl.protein_g, fl.carbs_g, fl.fat_g, fl.log_date
     FROM food_logs fl
     JOIN foods f ON f.food_id = fl.food_id
     WHERE fl.user_id = ?
     ORDER BY fl.log_date DESC, fl.created_at DESC`,
    [req.params.userId]
  );

  res.json(rows);
}));

app.post("/api/food-logs", asyncHandler(async (req, res) => {
  const { userId = demoUserId, foodId, food: incomingFood, mealType, quantityG, logDate } = req.body;
  let selectedFoodId = foodId;
  const savedLogDate = /^\d{4}-\d{2}-\d{2}$/.test(String(logDate || "")) ? logDate : new Date();
  const currentPlan = await getUserPlan(userId);
  const limits = planLimits[currentPlan];
  const savedLogDateString = savedLogDate instanceof Date ? savedLogDate.toISOString().slice(0, 10) : savedLogDate;

  const [dailyLogs] = await pool.query(
    "SELECT COUNT(*) AS count FROM food_logs WHERE user_id = ? AND log_date = ?",
    [userId, savedLogDateString]
  );

  if (Number(dailyLogs[0]?.count || 0) >= limits.dailyFoodLogs) {
    return res.status(403).json({
      message: `${currentPlan} plan allows ${limits.dailyFoodLogs} food logs per day. Upgrade to continue logging more meals today.`,
      currentPlan,
      requiredPlan: currentPlan === "Free" ? "Basic" : "Premium",
      upgradeRequired: true
    });
  }

  if (!selectedFoodId && incomingFood?.food_name) {
    await pool.query(
      `INSERT INTO foods
        (food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        calories_per_100g = VALUES(calories_per_100g),
        protein_per_100g = VALUES(protein_per_100g),
        carbs_per_100g = VALUES(carbs_per_100g),
        fat_per_100g = VALUES(fat_per_100g)`,
      [
        incomingFood.brand ? `${incomingFood.food_name} - ${incomingFood.brand}`.slice(0, 100) : incomingFood.food_name.slice(0, 100),
        Number(incomingFood.calories_per_100g || 0),
        Number(incomingFood.protein_per_100g || 0),
        Number(incomingFood.carbs_per_100g || 0),
        Number(incomingFood.fat_per_100g || 0)
      ]
    );

    const [insertedFood] = await pool.query(
      "SELECT food_id FROM foods WHERE food_name = ?",
      [incomingFood.brand ? `${incomingFood.food_name} - ${incomingFood.brand}`.slice(0, 100) : incomingFood.food_name.slice(0, 100)]
    );
    selectedFoodId = insertedFood[0]?.food_id;
  }

  const [foods] = await pool.query("SELECT * FROM foods WHERE food_id = ?", [selectedFoodId]);

  if (!foods.length || !mealType || Number(quantityG) <= 0) {
    return res.status(400).json({ message: "Valid food, meal type and quantity are required." });
  }

  const food = foods[0];
  const factor = Number(quantityG) / 100;
  const calories = Number(food.calories_per_100g) * factor;
  const protein = Number(food.protein_per_100g) * factor;
  const carbs = Number(food.carbs_per_100g) * factor;
  const fat = Number(food.fat_per_100g) * factor;

  const [result] = await pool.query(
    `INSERT INTO food_logs
      (user_id, food_id, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g, log_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, selectedFoodId, mealType, quantityG, calories, protein, carbs, fat, savedLogDateString]
  );

  res.status(201).json({ logId: result.insertId, calories, protein, carbs, fat });
}));

app.get("/api/medical-records/:userId", asyncHandler(async (req, res) => {
  const allowedPlan = await requirePlan(req.params.userId, "Basic", res, "Medical history guidance");
  if (!allowedPlan) return;

  const [rows] = await pool.query(
    "SELECT * FROM medical_records WHERE user_id = ? ORDER BY recorded_at DESC",
    [req.params.userId]
  );

  res.json(rows);
}));

app.post("/api/medical-records", asyncHandler(async (req, res) => {
  const { userId = demoUserId, conditionName, dietaryRestriction, notes } = req.body;
  const allowedPlan = await requirePlan(userId, "Basic", res, "Medical history guidance");
  if (!allowedPlan) return;

  if (!conditionName || !dietaryRestriction) {
    return res.status(400).json({ message: "Condition and restriction are required." });
  }

  const [result] = await pool.query(
    "INSERT INTO medical_records (user_id, condition_name, dietary_restriction, notes) VALUES (?, ?, ?, ?)",
    [userId, conditionName, dietaryRestriction, notes || ""]
  );

  res.status(201).json({ recordId: result.insertId });
}));

app.delete("/api/medical-records/:recordId", asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId || demoUserId);
  const allowedPlan = await requirePlan(userId, "Basic", res, "Medical history guidance");
  if (!allowedPlan) return;

  const [result] = await pool.query(
    "DELETE FROM medical_records WHERE record_id = ? AND user_id = ?",
    [req.params.recordId, userId]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: "Medical record not found for this user." });
  }

  res.json({ message: "Medical record removed." });
}));

app.get("/api/recommendations/:userId", asyncHandler(async (req, res) => {
  const currentPlan = await requirePlan(req.params.userId, "Basic", res, "Diet recommendations");
  if (!currentPlan) return;

  const [recommendations] = await pool.query(
    `SELECT * FROM nutrition_recommendations
     WHERE user_id = ?
     ORDER BY generated_at DESC
     LIMIT 1`,
    [req.params.userId]
  );

  let recommendation = recommendations[0];

  if (!recommendation) {
    const [profileRows] = await pool.query(
      "SELECT * FROM user_profiles WHERE user_id = ?",
      [req.params.userId]
    );
    const targets = calculateTargets(profileRows[0] || {});
    const [createdRecommendation] = await pool.query(
      `INSERT INTO nutrition_recommendations (user_id, recommended_calories, protein_g, carbs_g, fat_g)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.userId, targets.calories, targets.protein, targets.carbs, targets.fat]
    );
    recommendation = {
      recommendation_id: createdRecommendation.insertId,
      user_id: Number(req.params.userId),
      recommended_calories: targets.calories,
      protein_g: targets.protein,
      carbs_g: targets.carbs,
      fat_g: targets.fat
    };
  }

  const [notes] = await pool.query(
    "SELECT note_text FROM recommendation_notes WHERE recommendation_id = ?",
    [recommendation.recommendation_id]
  );

  const [medical] = await pool.query(
    "SELECT condition_name, dietary_restriction, notes FROM medical_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 8",
    [req.params.userId]
  );
  const healthGuidance = getConditionGuidance(medical);

  res.json({
    ...recommendation,
    notes: [
      ...notes.map(note => note.note_text),
      ...medical.map(record => `For ${record.condition_name}, consider: ${record.dietary_restriction}.`),
      ...healthGuidance.notes
    ],
    conditionGuidance: healthGuidance.conditionGuidance.map(rule => ({
      title: rule.title,
      summary: rule.summary
    })),
    foodsToPrefer: healthGuidance.foodsToPrefer,
    foodsToLimit: healthGuidance.foodsToLimit
  });
}));

app.get("/api/subscription-plans", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM subscription_plans ORDER BY price");
  res.json(rows.map(row => ({
    ...row,
    benefits: planBenefits[normalizePlanName(row.plan_name)],
    limits: planLimits[normalizePlanName(row.plan_name)]
  })));
}));

app.get("/api/subscriptions/:userId", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, sp.plan_name, sp.price, sp.duration_days, sp.description,
       CASE
         WHEN s.payment_status = 'Active' AND s.end_date >= CURRENT_DATE THEN 1
         ELSE 0
       END AS is_active
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.plan_id = s.plan_id
     WHERE s.user_id = ?
     ORDER BY is_active DESC, s.subscription_id DESC
     LIMIT 1`,
    [req.params.userId]
  );

  res.json(rows[0] || null);
}));

app.post("/api/subscriptions", asyncHandler(async (req, res) => {
  const { userId = demoUserId, planName, paymentMethod = "Demo Payment" } = req.body;
  const [plans] = await pool.query("SELECT * FROM subscription_plans WHERE plan_name = ?", [planName]);

  if (!plans.length) return res.status(400).json({ message: "Plan not found." });

  const plan = plans[0];
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, payment_status, auto_renew)
     VALUES (?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), 'Active', TRUE)`,
    [userId, plan.plan_id, plan.duration_days]
  );

  const [rows] = await pool.query(
    "SELECT subscription_id FROM subscriptions WHERE user_id = ? ORDER BY subscription_id DESC LIMIT 1",
    [userId]
  );

  await pool.query(
    "INSERT INTO payments (subscription_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'Success')",
    [rows[0].subscription_id, plan.price, paymentMethod]
  );

  res.status(201).json({ message: "Subscription updated." });
}));

app.patch("/api/subscriptions/:subscriptionId", asyncHandler(async (req, res) => {
  const fields = [];
  const values = [];

  if (typeof req.body.autoRenew === "boolean") {
    fields.push("auto_renew = ?");
    values.push(req.body.autoRenew);
  }

  if (req.body.renewDays) {
    fields.push("end_date = DATE_ADD(GREATEST(end_date, CURRENT_DATE), INTERVAL ? DAY)");
    values.push(req.body.renewDays);
  }

  if (!fields.length) return res.status(400).json({ message: "No subscription update provided." });

  values.push(req.params.subscriptionId);
  await pool.query(`UPDATE subscriptions SET ${fields.join(", ")} WHERE subscription_id = ?`, values);
  res.json({ message: "Subscription saved." });
}));

app.get("/api/water-logs/:userId", asyncHandler(async (req, res) => {
  const currentPlan = await requirePlan(req.params.userId, "Premium", res, "Water intake tracking");
  if (!currentPlan) return;

  const logDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ""))
    ? req.query.date
    : new Date().toISOString().slice(0, 10);

  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(intake_ml), 0) AS total_ml, COUNT(*) AS entries
     FROM water_logs
     WHERE user_id = ? AND log_date = ?`,
    [req.params.userId, logDate]
  );
  const [profileRows] = await pool.query(
    "SELECT water_target_ml FROM user_profiles WHERE user_id = ?",
    [req.params.userId]
  );

  res.json({
    date: logDate,
    totalMl: Number(rows[0]?.total_ml || 0),
    targetMl: Number(profileRows[0]?.water_target_ml || 2500),
    entries: Number(rows[0]?.entries || 0)
  });
}));

app.post("/api/water-logs", asyncHandler(async (req, res) => {
  const { userId = demoUserId, intakeMl, logDate } = req.body;
  const currentPlan = await requirePlan(userId, "Premium", res, "Water intake tracking");
  if (!currentPlan) return;

  const amount = Number(intakeMl);
  const savedLogDate = /^\d{4}-\d{2}-\d{2}$/.test(String(logDate || ""))
    ? logDate
    : new Date().toISOString().slice(0, 10);

  if (!amount || amount <= 0 || amount > 5000) {
    return res.status(400).json({ message: "Enter a valid water amount in ml." });
  }

  const [result] = await pool.query(
    "INSERT INTO water_logs (user_id, intake_ml, log_date) VALUES (?, ?, ?)",
    [userId, Math.round(amount), savedLogDate]
  );

  res.status(201).json({ waterLogId: result.insertId, intakeMl: Math.round(amount), logDate: savedLogDate });
}));

app.get("/api/dashboard/:userId", asyncHandler(async (req, res) => {
  const dashboardDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ""))
    ? req.query.date
    : new Date().toISOString().slice(0, 10);

  const [summary] = await pool.query(
    `SELECT
      COALESCE(SUM(calories), 0) AS consumed_calories,
      COUNT(*) AS meals_logged,
      COALESCE(SUM(protein_g), 0) AS protein_g,
      COALESCE(SUM(carbs_g), 0) AS carbs_g,
      COALESCE(SUM(fat_g), 0) AS fat_g
     FROM food_logs
     WHERE user_id = ? AND log_date = ?`,
    [req.params.userId, dashboardDate]
  );

  const [profile] = await pool.query(
    `SELECT daily_calorie_target, weight_kg, goal,
      protein_target_g, carbs_target_g, fat_target_g, water_target_ml
     FROM user_profiles
     WHERE user_id = ?`,
    [req.params.userId]
  );

  const [subscription] = await pool.query(
    `SELECT sp.plan_name
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.plan_id = s.plan_id
     WHERE s.user_id = ? AND s.payment_status = 'Active' AND s.end_date >= CURRENT_DATE
     ORDER BY s.subscription_id DESC
     LIMIT 1`,
    [req.params.userId]
  );
  const currentPlan = normalizePlanName(subscription[0]?.plan_name || "Free");

  const [medical] = await pool.query(
    "SELECT condition_name, dietary_restriction, notes FROM medical_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 8",
    [req.params.userId]
  );
  const healthSummary = buildDashboardHealthSummary(medical);

  const row = summary[0];
  const recommended = profile[0]?.daily_calorie_target || 2000;
  const proteinTarget = Number(profile[0]?.protein_target_g) || Math.round(Number(profile[0]?.weight_kg || 65) * 1.2);
  const carbsTarget = Number(profile[0]?.carbs_target_g) || Math.round((recommended * 0.5) / 4);
  const fatTarget = Number(profile[0]?.fat_target_g) || Math.round((recommended * 0.27) / 9);
  const waterTargetMl = Number(profile[0]?.water_target_ml) || 2500;

  const [waterRows] = await pool.query(
    `SELECT COALESCE(SUM(intake_ml), 0) AS total_ml
     FROM water_logs
     WHERE user_id = ? AND log_date = ?`,
    [req.params.userId, dashboardDate]
  );

  res.json({
    consumedCalories: Number(row.consumed_calories || 0),
    recommendedCalories: recommended,
    mealsLogged: Number(row.meals_logged || 0),
    proteinG: Number(row.protein_g || 0),
    carbsG: Number(row.carbs_g || 0),
    fatG: Number(row.fat_g || 0),
    proteinTarget,
    carbsTarget,
    fatTarget,
    waterMl: Number(waterRows[0]?.total_ml || 0),
    waterTargetMl,
    plan: currentPlan,
    access: planAccessPayload(currentPlan),
    date: dashboardDate,
    summary: canUsePlan(currentPlan, "Basic")
      ? healthSummary.focus
      : "Upgrade to Basic to unlock medical-history based daily focus and personalized recommendations.",
    healthSummary: canUsePlan(currentPlan, "Basic")
      ? healthSummary.details
      : "Free includes calorie tracking. Basic adds medical history and personalized diet guidance; Premium adds macro and water insights.",
    healthFocusPoints: canUsePlan(currentPlan, "Premium")
      ? healthSummary.focusPoints
      : []
  });
}));

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.htm"));
});

app.use((err, _req, res, _next) => {
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "This record already exists." });
  }

  if (err.code === "ER_DATA_TOO_LONG") {
    return res.status(400).json({ message: "One of the entered values is too long for the database column." });
  }

  console.error(err);
  res.status(500).json({
    message: "Server error. Check MySQL connection, schema, and .env settings.",
    detail: err.message
  });
});

ensureDemoUser()
  .then(() => {
    app.listen(port, () => {
      console.log(`NutriTrack running at http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error("Could not start NutriTrack:", error.message);
    process.exit(1);
  });
