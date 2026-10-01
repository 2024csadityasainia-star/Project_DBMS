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

module.exports = { conditionGuidanceRules, generalGuidance };
