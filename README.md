# NutriTrack DBMS Project

NutriTrack is a MyFitnessPal-style nutrition tracker. The frontend is served by Express and the data is stored in MySQL.

## Project Structure

```text
backend/          Express API server
frontend/public/  Static HTML, CSS, and browser JavaScript
database/         MySQL schema and seed data
```

## Database Tables

The schema contains 10 tables:

1. `users`
2. `user_profiles`
3. `foods`
4. `food_logs`
5. `medical_records`
6. `nutrition_recommendations`
7. `recommendation_notes`
8. `subscription_plans`
9. `subscriptions`
10. `payments`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set your MySQL password:

```bash
copy .env.example .env
```

3. Initialize and seed MySQL:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p nutritrack_db < database/seed.sql
```

4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

## Demo Login

Use the demo account button, or sign in with:

```text
Email: demo@nutritrack.local
Password: demo123
```

## Main Features

- Register and sign in users.
- Save profile details and calculate calorie/macronutrient targets.
- Load foods from MySQL and log meals with calculated nutrition values.
- Search fast local Indian foods first, then refresh Open Food Facts, USDA, and optional configured providers in the background.
- View dashboard totals for today's calories and meals.
- Save medical history and reflect it in recommendation notes.
- Manage subscription plan, renewal, and auto-renew status.

## Optional Food API Providers

Food search calls internet APIs by default. Local MySQL foods are not returned unless `includeLocal=true` is passed, or `fallbackLocal=true` is passed and all external APIs return no results.

```text
INDIAN_FOOD_API_URL=
INDIAN_FOOD_API_KEY=
INDIAN_FOOD_API_HEADER=Authorization
BONHAPPETEE_API_URL=
BONHAPPETEE_API_KEY=
BONHAPPETEE_API_HEADER=Authorization
APYFLUX_INDIAN_FOOD_API_URL=
APYFLUX_INDIAN_FOOD_API_KEY=
APYFLUX_INDIAN_FOOD_API_HEADER=Authorization
USDA_API_KEY=
EDAMAM_APP_ID=
EDAMAM_APP_KEY=
CALORIENINJAS_API_KEY=
NUTRITIONIX_APP_ID=
NUTRITIONIX_APP_KEY=
SPOONACULAR_API_KEY=
FATSECRET_ACCESS_TOKEN=
```

`INDIAN_FOOD_API_URL` and `BONHAPPETEE_API_URL` can include `{query}`. If omitted, the server appends `?q=<search>`.
