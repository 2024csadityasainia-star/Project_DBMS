# NutriTrack Project Pseudocode

## Server Startup

```text
START NutriTrack server
LOAD environment variables from .env
CONNECT to MySQL database
CREATE Express app
ENABLE CORS
ENABLE JSON request parsing
SERVE static frontend files

CALL ensureDemoUser()
START listening on configured port
```

## Database Initialization

```text
FUNCTION ensureDemoUser()
    CREATE missing support tables if needed
    INSERT subscription plans
    INSERT demo user
    INSERT demo profile
    INSERT Indian food seed data
END FUNCTION
```

## Authentication

```text
REGISTER user
    READ fullName, email, password
    IF required fields are missing
        RETURN validation error
    IF email already exists
        RETURN duplicate account error
    INSERT user into users table
    CREATE user profile
    RETURN user details

LOGIN user
    READ email and password
    FIND user with matching email and password
    IF not found
        RETURN invalid login error
    RETURN user details
```

## Profile

```text
GET profile
    READ userId
    FETCH user and profile details
    RETURN profile

SAVE profile
    READ age, gender, height, weight, activity, goal
    CALCULATE calorie and macro targets
    UPDATE user name
    INSERT or UPDATE profile
    SAVE nutrition recommendation
    RETURN calculated targets

UPDATE calorie target
    READ dailyCalorieTarget
    VALIDATE target
    UPDATE profile calorie target
    RECALCULATE protein, carbs, fat
    SAVE nutrition recommendation
    RETURN success
```

## Food Search

```text
SEARCH food
    READ search term
    IF search term is too short
        RETURN empty results

    CHECK API cache
    IF fresh cache exists
        USE cached API results
    ELSE
        FETCH internet API results from:
            Indian configured API if available
            Bon Happetee if configured
            Apyflux Indian Food API if configured
            Open Food Facts India
            Open Food Facts global
            USDA FoodData Central
            CalorieNinjas if key exists
            Nutritionix if key exists
            Edamam if key exists
            Spoonacular if key exists
            FatSecret if token exists

        NORMALIZE every result into:
            food_name
            brand
            calories_per_100g
            protein_per_100g
            carbs_per_100g
            fat_per_100g
            source

        SAVE results in cache

    IF includeLocal=true OR fallbackLocal=true and no API results exist
        FETCH matching foods from MySQL foods table

    REMOVE duplicates
    SCORE results by match quality and Indian relevance
    SORT best results first
    BUILD metadata with database counts
    RETURN foods and metadata
```

## Food Logging

```text
GET food logs
    READ userId
    FETCH logs joined with foods table
    ORDER by date and creation time
    RETURN logs

ADD food log
    READ userId, foodId, external food, mealType, quantityG, logDate
    GET user subscription plan
    CHECK daily food log limit
    IF daily limit exceeded
        RETURN upgrade required error

    IF external food is selected
        INSERT or UPDATE food in foods table
        GET foodId

    FETCH selected food
    IF food, meal type, or quantity is invalid
        RETURN validation error

    CALCULATE nutrition:
        factor = quantityG / 100
        calories = food.calories_per_100g * factor
        protein = food.protein_per_100g * factor
        carbs = food.carbs_per_100g * factor
        fat = food.fat_per_100g * factor

    INSERT food log
    RETURN log id and nutrition values
```

## Dashboard

```text
GET dashboard
    READ userId and date
    SUM food logs for selected date
    FETCH profile calorie target
    FETCH active subscription
    FETCH medical records
    FETCH water intake
    BUILD health summary
    RETURN calories, macros, meals, water, plan, and health guidance
```

## Medical Records

```text
GET medical records
    CHECK user has Basic plan or higher
    FETCH records
    RETURN records

ADD medical record
    CHECK user has Basic plan or higher
    VALIDATE condition and restriction
    INSERT record
    RETURN record id

DELETE medical record
    CHECK user has Basic plan or higher
    DELETE record for user
    RETURN success
```

## Recommendations

```text
GET recommendations
    CHECK user has Basic plan or higher
    FETCH latest nutrition recommendation
    IF missing
        CALCULATE targets from profile
        CREATE recommendation

    FETCH recommendation notes
    FETCH medical records
    GENERATE foods to prefer and limit
    RETURN recommendation and guidance
```

## Subscriptions

```text
GET plans
    FETCH subscription plans
    ATTACH benefits and limits
    RETURN plans

GET user subscription
    FETCH latest user subscription
    RETURN subscription

CREATE subscription
    READ userId and planName
    FIND selected plan
    INSERT subscription
    INSERT payment
    RETURN success

UPDATE subscription
    UPDATE auto renew or renewal days
    RETURN success
```

## Water Tracking

```text
GET water logs
    CHECK user has Premium plan
    SUM intake for selected date
    RETURN intake and target

ADD water log
    CHECK user has Premium plan
    VALIDATE intake amount
    INSERT water log
    RETURN success
```

## Frontend Flow

```text
ON page load
    READ user id from localStorage
    LOAD data for current page

Food Log page
    WHEN user searches food
        SHOW "Searching databases..."
        CALL /api/foods/search?q=term&meta=true
        DISPLAY food results
        DISPLAY database counts

    WHEN user clicks Add Food
        VALIDATE food, quantity, meal type, and date
        POST food log to backend
        REFRESH food log table
        SHOW success or error

Dashboard page
    FETCH dashboard API
    DISPLAY calories, macros, meals, water, and health summary

Profile page
    FETCH profile
    SAVE updated profile
    DISPLAY calculated targets
```

## Error Handling

```text
FOR every API request
    TRY operation
    IF validation fails
        RETURN 400
    IF duplicate data exists
        RETURN 409
    IF plan restriction applies
        RETURN 403
    IF server or database error occurs
        RETURN 500
END
```
