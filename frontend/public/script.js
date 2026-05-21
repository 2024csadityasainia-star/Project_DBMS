const API_BASE = (() => {
  const isBackendOrigin = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && window.location.protocol.startsWith("http");

  return isBackendOrigin ? "" : "http://localhost:3000";
})();
const DEMO_USER_ID = 1;

function getUserId() {
  return Number(localStorage.getItem("nutriTrackUserId")) || DEMO_USER_ID;
}

function setUser(user) {
  localStorage.setItem("nutriTrackUserId", user.user_id || user.userId || DEMO_USER_ID);
  localStorage.setItem("nutriTrackUserName", user.full_name || user.fullName || "Demo User");
}

function logoutUser() {
  localStorage.removeItem("nutriTrackUserId");
  localStorage.removeItem("nutriTrackUserName");
  localStorage.removeItem("nutriTrackSelectedPlan");
  window.location.href = "index.htm";
}

async function api(path, options = {}) {
  let response;

  try {
    response = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
  } catch (_error) {
    throw new Error("Cannot connect to backend. Start the app with npm start and open http://localhost:3000.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Request failed");
    Object.assign(error, data || {});
    throw error;
  }

  return data;
}

const PLAN_RANK = { Free: 0, Basic: 1, Premium: 2 };
const PLAN_FEATURES = {
  Free: [
    "Profile setup",
    "Basic food search",
    "Daily calorie dashboard",
    "5 food logs per day"
  ],
  Basic: [
    "30 food logs per day",
    "Medical history support",
    "Personalized diet recommendations",
    "Foods to prefer and limit"
  ],
  Premium: [
    "Unlimited-style food logging",
    "Macro progress panel",
    "Water intake tracker",
    "Advanced health insights"
  ]
};

const FEATURE_RULES = {
  recommendations: { requiredPlan: "Basic", label: "Diet recommendations" },
  medical: { requiredPlan: "Basic", label: "Medical history guidance" },
  advancedMacros: { requiredPlan: "Premium", label: "Macro insights" },
  water: { requiredPlan: "Premium", label: "Water tracking" }
};

let currentAccess = null;

function normalizePlanName(planName) {
  return PLAN_RANK[planName] !== undefined ? planName : "Free";
}

function hasPlan(requiredPlan, currentPlan = currentAccess?.currentPlan || "Free") {
  return PLAN_RANK[normalizePlanName(currentPlan)] >= PLAN_RANK[requiredPlan];
}

function upgradeUrl(requiredPlan) {
  return `subscription.htm?upgrade=${encodeURIComponent(requiredPlan)}`;
}

function upgradeMessage(feature, requiredPlan, currentPlan = currentAccess?.currentPlan || "Free") {
  return `${feature} is included in ${requiredPlan}. You are currently on ${currentPlan}.`;
}

function activePlanFromSubscription(subscription) {
  if (!subscription) return "Free";
  if (Number(subscription.is_active) === 0) return "Free";
  return normalizePlanName(subscription.plan_name);
}

async function loadAccess() {
  if (currentAccess) return currentAccess;

  try {
    currentAccess = await api(`/api/access/${getUserId()}`);
  } catch (_error) {
    currentAccess = {
      currentPlan: "Free",
      limits: { dailyFoodLogs: 5, recommendations: false, medicalHistory: false, advancedMacros: false, waterTracking: false },
      benefits: PLAN_FEATURES.Free
    };
  }

  return currentAccess;
}

function showUpgradeInline(containerId, feature, requiredPlan, currentPlan) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="upgrade-lock-card">
      <p class="nt-card-label">Upgrade Required</p>
      <h3>${feature}</h3>
      <p>${upgradeMessage(feature, requiredPlan, currentPlan)}</p>
      <a class="subscription-action-btn" href="${upgradeUrl(requiredPlan)}">Upgrade to ${requiredPlan}</a>
    </div>
  `;
}

function showUpgradeModal(feature, requiredPlan, currentPlan = currentAccess?.currentPlan || "Free") {
  let modal = document.getElementById("upgradeModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "upgradeModal";
    modal.className = "upgrade-modal hidden";
    modal.innerHTML = `
      <div class="upgrade-modal-card">
        <button type="button" class="upgrade-modal-close" aria-label="Close upgrade message">x</button>
        <p class="nt-card-label">Plan Upgrade</p>
        <h2 id="upgradeModalTitle">Upgrade required</h2>
        <p id="upgradeModalText"></p>
        <div class="upgrade-modal-actions">
          <a id="upgradeModalLink" class="subscription-action-btn" href="subscription.htm">View Plans</a>
          <button type="button" class="recommendation-back-btn" id="upgradeModalCancel">Not Now</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.id === "upgradeModalCancel" || event.target.classList.contains("upgrade-modal-close")) {
        modal.classList.add("hidden");
      }
    });
  }

  document.getElementById("upgradeModalTitle").textContent = `${feature} needs ${requiredPlan}`;
  document.getElementById("upgradeModalText").textContent = upgradeMessage(feature, requiredPlan, currentPlan);
  document.getElementById("upgradeModalLink").href = upgradeUrl(requiredPlan);
  document.getElementById("upgradeModalLink").textContent = `Upgrade to ${requiredPlan}`;
  modal.classList.remove("hidden");
}

function wireGatedLinks() {
  document.querySelectorAll("[data-feature]").forEach(link => {
    const rule = FEATURE_RULES[link.dataset.feature];
    if (!rule) return;

    const locked = !hasPlan(rule.requiredPlan);
    link.classList.toggle("is-locked", locked);
    link.setAttribute("aria-disabled", String(locked));

    if (!link.querySelector(".feature-lock-badge")) {
      const badge = document.createElement("span");
      badge.className = "feature-lock-badge";
      badge.textContent = `Needs ${rule.requiredPlan}`;
      link.appendChild(badge);
    }

    link.onclick = event => {
      if (!hasPlan(rule.requiredPlan)) {
        event.preventDefault();
        showUpgradeModal(rule.label, rule.requiredPlan);
      }
    };
  });
}

async function initializePlanAwareness() {
  await loadAccess();
  wireGatedLinks();
  applyMedicalPageGate();
}

function applyMedicalPageGate() {
  if (!document.getElementById("addMedicalBtn")) return;
  if (hasPlan("Basic")) return;

  const container = document.querySelector(".medical-container");
  const card = document.querySelector(".medical-card");
  if (!container || !card || document.getElementById("medicalUpgradeGate")) return;

  const gate = document.createElement("div");
  gate.id = "medicalUpgradeGate";
  gate.className = "upgrade-lock-card medical-upgrade-gate";
  gate.innerHTML = `
    <p class="nt-card-label">Upgrade Required</p>
    <h3>Medical history guidance is a Basic feature</h3>
    <p>Upgrade to Basic to save conditions, dietary restrictions, and receive personalized recommendation guidance.</p>
    <a class="subscription-action-btn" href="${upgradeUrl("Basic")}">Upgrade to Basic</a>
  `;
  container.insertBefore(gate, card);
  card.classList.add("is-plan-locked");
}

initializePlanAwareness().catch(() => {});

function setStatus(id, message, isError = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", isError);
}

function formatNumber(value) {
  return Number(value || 0).toFixed(1).replace(".0", "");
}

function formatDate(dateValue) {
  if (!dateValue) return "--";
  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getLocalDateString(dateValue = new Date()) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

// ======================= Auth Page =======================

let authMode = "login";
const tabs = document.querySelectorAll(".tabs button");
const authSubmitBtn = document.getElementById("authSubmitBtn");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(item => item.classList.remove("active"));
    tab.classList.add("active");
    authMode = tab.dataset.authMode || "login";
    document.querySelectorAll(".auth-register-field").forEach(field => {
      field.classList.toggle("hidden", authMode !== "register");
    });
    if (authSubmitBtn) authSubmitBtn.textContent = authMode === "register" ? "Register ->" : "Sign In ->";
    setStatus("authStatus", "");
  });
});

if (authSubmitBtn) {
  authSubmitBtn.addEventListener("click", async () => {
    const fullName = document.getElementById("authName")?.value.trim();
    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value.trim();

    if (!email || !password || (authMode === "register" && !fullName)) {
      setStatus("authStatus", "Please fill all required fields.", true);
      return;
    }

    try {
      setStatus("authStatus", "Connecting to MySQL...");
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const user = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ fullName, email, password })
      });
      setUser(user);
      window.location.href = authMode === "register" ? "profile.htm" : "dashboard.htm";
    } catch (error) {
      setStatus("authStatus", error.message, true);
    }
  });
}

const demoBtn = document.querySelector(".demo");

if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    setUser({ user_id: DEMO_USER_ID, full_name: "Demo User" });
    window.location.href = "dashboard.htm";
  });
}

// ======================= Profile Page =======================

document.querySelectorAll(".pill-group").forEach(group => {
  group.addEventListener("click", event => {
    const button = event.target.closest(".pill");
    if (!button) return;
    group.querySelectorAll(".pill").forEach(pill => pill.classList.remove("selected"));
    button.classList.add("selected");
  });
});

function getPillValue(groupName) {
  return document
    .querySelector(`[data-pill-group="${groupName}"] .pill.selected`)
    ?.dataset.value;
}

async function loadProfile() {
  if (!document.getElementById("profileName")) return;

  try {
    const profile = await api(`/api/profile/${getUserId()}`);
    document.getElementById("profileName").value = profile.full_name || "";
    document.getElementById("profileAge").value = profile.age || "";
    document.getElementById("profileHeight").value = profile.height_cm || "";
    document.getElementById("profileWeight").value = profile.weight_kg || "";
    if (document.getElementById("profileCalorieTarget") && profile.daily_calorie_target) {
      document.getElementById("profileCalorieTarget").value = profile.daily_calorie_target;
    }

    ["gender", "activity", "goal"].forEach(groupName => {
      const key = groupName === "activity" ? "activity_level" : groupName;
      document.querySelectorAll(`[data-pill-group="${groupName}"] .pill`).forEach(pill => {
        pill.classList.toggle("selected", pill.dataset.value === profile[key]);
      });
    });
  } catch (error) {
    setStatus("profileStatus", error.message, true);
  }
}

const saveProfileBtn = document.getElementById("saveProfileBtn");

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    const profile = {
      full_name: document.getElementById("profileName").value.trim(),
      age: Number(document.getElementById("profileAge").value),
      gender: getPillValue("gender"),
      height_cm: Number(document.getElementById("profileHeight").value),
      weight_kg: Number(document.getElementById("profileWeight").value),
      activity_level: getPillValue("activity"),
      goal: getPillValue("goal")
    };

    const customCalInput = document.getElementById("profileCalorieTarget");
    if (customCalInput && customCalInput.value) {
      const customCalVal = Number(customCalInput.value);
      if (customCalVal > 0) {
        profile.daily_calorie_target = customCalVal;
      }
    }

    if (!profile.full_name || !profile.age || !profile.height_cm || !profile.weight_kg) {
      setStatus("profileStatus", "Please complete the required profile details.", true);
      return;
    }

    try {
      setStatus("profileStatus", "Saving profile and recalculating nutrition targets...");
      await api(`/api/profile/${getUserId()}`, {
        method: "PUT",
        body: JSON.stringify(profile)
      });
      setStatus("profileStatus", "Profile saved.");
      window.location.href = "dashboard.htm";
    } catch (error) {
      setStatus("profileStatus", error.message, true);
    }
  });
}

loadProfile();

// ======================= Dashboard Page =======================

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", logoutUser);
}

function renderDashboardHealthFocus(points) {
  const list = document.getElementById("dashboardHealthFocusList");
  if (!list) return;

  list.innerHTML = "";
  (points || []).forEach(point => {
    const item = document.createElement("div");
    item.className = "nt-health-focus-item";
    item.textContent = point;
    list.appendChild(item);
  });
}

async function loadDashboard() {
  if (!document.getElementById("dashboardConsumed")) return;

  try {
    await loadAccess();
    wireGatedLinks();
    const dashboardDate = getLocalDateString();
    const dashboard = await api(`/api/dashboard/${getUserId()}?date=${dashboardDate}`);
    currentAccess = dashboard.access || currentAccess;
    const consumed = Math.round(dashboard.consumedCalories);
    const recommended = Math.round(dashboard.recommendedCalories);
    const remaining = recommended - consumed;
    const percentage = recommended > 0 ? Math.min((consumed / recommended) * 100, 100) : 0;

    document.getElementById("dashboardConsumed").textContent = consumed;
    document.getElementById("dashboardRecommended").textContent = recommended;
    document.getElementById("dashboardMeals").textContent = dashboard.mealsLogged;
    document.getElementById("dashboardPlan").textContent = `${dashboard.plan} Plan`;
    document.getElementById("healthSummaryDisplay").textContent = dashboard.summary;
    document.getElementById("dashboardHealthSummary").textContent = dashboard.healthSummary || dashboard.summary;
    renderDashboardHealthFocus(dashboard.healthFocusPoints);
    renderDashboardPremiumPanels(dashboard);
    wireGatedLinks();
    document.getElementById("dashboardCaloriesNote").textContent = remaining >= 0
      ? `${remaining} kcal remaining for today`
      : `${Math.abs(remaining)} kcal above recommended intake`;
    document.getElementById("dashboardProgressFill").style.width = `${percentage}%`;

    const editBtn = document.getElementById("editCalorieTargetBtn");
    if (editBtn) {
      const newEditBtn = editBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newEditBtn, editBtn);
      newEditBtn.addEventListener("click", () => showEditCalorieModal(recommended));
    }
  } catch (error) {
    document.getElementById("healthSummaryDisplay").textContent = error.message;
    document.getElementById("dashboardHealthSummary").textContent = error.message;
    renderDashboardHealthFocus([]);
  }
}

function showEditCalorieModal(currentTarget) {
  let modal = document.getElementById("editCalorieModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "editCalorieModal";
    modal.className = "upgrade-modal hidden";
    modal.innerHTML = `
      <div class="upgrade-modal-card">
        <button type="button" class="upgrade-modal-close" id="closeCalorieModal" aria-label="Close edit modal">x</button>
        <p class="nt-card-label" style="color: var(--nt-secondary); margin: 0 0 10px;">Manual Target</p>
        <h2 style="margin: 0 0 10px; color: var(--nt-text); font-size: 24px; font-weight: 800;">Change Calorie Target</h2>
        <p style="margin: 0 0 14px; color: var(--nt-muted); font-size: 14.5px; line-height: 1.55;">
          Enter your custom daily calorie target in kcal. This will override the auto-calculated value.
        </p>
        <div style="margin-top: 10px; margin-bottom: 8px;">
          <input type="number" id="customCalorieInput" min="500" max="10000" placeholder="e.g. 2200" style="width: 100%; box-sizing: border-box; padding: 12px; border-radius: 14px; border: 1px solid var(--nt-border); background: rgba(255, 255, 255, 0.07); color: var(--nt-text); font-size: 15px; outline: none;">
        </div>
        <p class="form-status" id="calorieModalStatus" style="margin: 5px 0 0; min-height: 20px; font-size: 14px;"></p>
        <div class="upgrade-modal-actions" style="margin-top: 16px;">
          <button id="saveCalorieTargetBtn" class="subscription-action-btn" type="button" style="flex: 1;">Save Target</button>
          <button type="button" class="recommendation-back-btn" id="cancelCalorieModal" style="flex: 1;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.classList.add("hidden");
    document.getElementById("closeCalorieModal").addEventListener("click", closeModal);
    document.getElementById("cancelCalorieModal").addEventListener("click", closeModal);
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModal();
    });

    document.getElementById("saveCalorieTargetBtn").addEventListener("click", async () => {
      const newTarget = Number(document.getElementById("customCalorieInput").value);
      const statusElement = document.getElementById("calorieModalStatus");
      
      if (!newTarget || newTarget < 500 || newTarget > 10000) {
        statusElement.textContent = "Please enter a valid target between 500 and 10000 kcal.";
        statusElement.classList.add("error");
        return;
      }

      try {
        statusElement.textContent = "Saving to MySQL...";
        statusElement.classList.remove("error");
        
        await api(`/api/profile/${getUserId()}/calories`, {
          method: "PATCH",
          body: JSON.stringify({ dailyCalorieTarget: newTarget })
        });
        
        closeModal();
        await loadDashboard();
      } catch (error) {
        statusElement.textContent = error.message;
        statusElement.classList.add("error");
      }
    });
  }

  document.getElementById("customCalorieInput").value = currentTarget || "";
  document.getElementById("calorieModalStatus").textContent = "";
  modal.classList.remove("hidden");
}

loadDashboard();

function setProgress(id, value, target) {
  const element = document.getElementById(id);
  if (!element) return;
  const percentage = target > 0 ? Math.min((Number(value || 0) / Number(target || 1)) * 100, 100) : 0;
  element.style.width = `${percentage}%`;
}

function renderPremiumPanelLock(panelId, featureKey) {
  const panel = document.getElementById(panelId);
  const rule = FEATURE_RULES[featureKey];
  if (!panel || !rule) return;

  let overlay = panel.querySelector(".premium-lock-overlay");
  const locked = !hasPlan(rule.requiredPlan);
  panel.classList.toggle("is-plan-locked", locked);

  if (!locked) {
    overlay?.remove();
    return;
  }

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "premium-lock-overlay";
    panel.appendChild(overlay);
  }

  overlay.innerHTML = `
    <p class="nt-card-label">Premium Feature</p>
    <h3>${rule.label}</h3>
    <p>${upgradeMessage(rule.label, rule.requiredPlan)}</p>
    <a class="subscription-action-btn" href="${upgradeUrl(rule.requiredPlan)}">Upgrade to ${rule.requiredPlan}</a>
  `;
}

function renderDashboardPremiumPanels(dashboard) {
  const macroValues = [
    ["dashboardProtein", dashboard.proteinG, "dashboardProteinTarget", dashboard.proteinTarget, "dashboardProteinProgress"],
    ["dashboardCarbs", dashboard.carbsG, "dashboardCarbsTarget", dashboard.carbsTarget, "dashboardCarbsProgress"],
    ["dashboardFat", dashboard.fatG, "dashboardFatTarget", dashboard.fatTarget, "dashboardFatProgress"]
  ];

  macroValues.forEach(([valueId, value, targetId, target, progressId]) => {
    const valueElement = document.getElementById(valueId);
    const targetElement = document.getElementById(targetId);
    if (valueElement) valueElement.textContent = formatNumber(value);
    if (targetElement) targetElement.textContent = formatNumber(target);
    setProgress(progressId, value, target);
  });

  const waterValue = document.getElementById("dashboardWaterMl");
  const waterTarget = document.getElementById("dashboardWaterTarget");
  if (waterValue) waterValue.textContent = Math.round(dashboard.waterMl || 0);
  if (waterTarget) waterTarget.textContent = Math.round(dashboard.waterTargetMl || 2500);
  setProgress("dashboardWaterProgress", dashboard.waterMl, dashboard.waterTargetMl);

  renderPremiumPanelLock("dashboardMacroCard", "advancedMacros");
  renderPremiumPanelLock("dashboardWaterCard", "water");
}

const addWaterBtn = document.getElementById("addWaterBtn");
if (addWaterBtn) {
  addWaterBtn.addEventListener("click", async () => {
    const amount = Number(document.getElementById("waterAmount").value);

    if (!hasPlan("Premium")) {
      showUpgradeModal("Water tracking", "Premium");
      return;
    }

    if (!amount || amount <= 0) {
      setStatus("waterStatus", "Enter water amount in ml.", true);
      return;
    }

    try {
      await api("/api/water-logs", {
        method: "POST",
        body: JSON.stringify({ userId: getUserId(), intakeMl: amount, logDate: getLocalDateString() })
      });
      document.getElementById("waterAmount").value = "";
      setStatus("waterStatus", "Water intake added.");
      await loadDashboard();
    } catch (error) {
      if (error.upgradeRequired) {
        showUpgradeModal("Water tracking", error.requiredPlan || "Premium", error.currentPlan);
      }
      setStatus("waterStatus", error.message, true);
    }
  });
}

// ======================= Food Log Page =======================

let selectedFoodResults = [];
let foodSearchTimer;
let selectedFoodIndex = "";

function foodOptionLabel(food) {
  const brand = food.brand && food.brand !== "Local Database" ? ` - ${food.brand}` : "";
  return `${food.food_name}${brand} (${formatNumber(food.calories_per_100g)} kcal / 100g)`;
}

function formatFoodSearchDatabases(meta) {
  const databases = meta?.databases || [];
  if (!databases.length) return "";

  return `Searched databases: ${databases.map(db => `${db.count} ${db.name}`).join(", ")}.`;
}

async function loadFoods(searchTerm = "rice") {
  const select = document.getElementById("foodItem");
  if (!select) return;

  try {
    setStatus("foodLogStatus", searchTerm ? "Searching databases..." : "");
    const path = searchTerm
      ? `/api/foods/search?q=${encodeURIComponent(searchTerm)}&meta=true`
      : "/api/foods";
    const response = await api(path);
    const foods = Array.isArray(response) ? response : (response.foods || []);
    const databaseSummary = Array.isArray(response) ? "" : formatFoodSearchDatabases(response.meta);

    selectedFoodResults = foods;
    selectedFoodIndex = "";
    select.innerHTML = '<option value="">Select Food Item</option>';
    foods.forEach((food, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = foodOptionLabel(food);
      select.appendChild(option);
    });
    renderFoodSearchResults(foods);

    setStatus(
      "foodLogStatus",
      foods.length
        ? `${foods.length} food options loaded. ${databaseSummary}`.trim()
        : `No food found. Try another search term. ${databaseSummary}`.trim(),
      !foods.length
    );
  } catch (error) {
    select.innerHTML = '<option value="">Could not load foods</option>';
    renderFoodSearchResults([]);
    setStatus("foodLogStatus", error.message, true);
  }
}

function renderFoodSearchResults(foods) {
  const results = document.getElementById("foodResults");
  if (!results) return;

  results.innerHTML = "";

  if (!foods.length) {
    results.innerHTML = '<div class="food-result-empty">No matching foods yet. Try typing rice, oats, banana, milk, egg, chicken, paneer, or protein.</div>';
    return;
  }

  foods.slice(0, 12).forEach((food, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "food-result-item";
    button.dataset.index = String(index);

    const details = document.createElement("span");
    const name = document.createElement("strong");
    const source = document.createElement("small");
    const macros = document.createElement("span");

    name.textContent = food.food_name;
    source.textContent = food.brand || food.source || "Food database";
    macros.className = "food-result-macros";
    macros.textContent = `${formatNumber(food.calories_per_100g)} kcal / 100g`;

    details.append(name, source);
    button.append(details, macros);
    results.appendChild(button);
  });
}

function selectFood(index) {
  const select = document.getElementById("foodItem");
  const search = document.getElementById("foodSearch");
  const results = document.getElementById("foodResults");
  const food = selectedFoodResults[Number(index)];

  if (!food) return;

  selectedFoodIndex = String(index);
  if (select) select.value = selectedFoodIndex;
  if (search) search.value = foodOptionLabel(food);

  document.querySelectorAll(".food-result-item").forEach(item => {
    item.classList.toggle("selected", item.dataset.index === selectedFoodIndex);
  });

  if (results) results.classList.add("collapsed");
  setStatus("foodLogStatus", `Selected ${food.food_name}.`);
}

function renderFoodLogs(logs) {
  const tableBody = document.getElementById("foodLogTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!logs.length) {
    tableBody.innerHTML = '<tr id="emptyRow"><td colspan="8">No food items added yet.</td></tr>';
    return;
  }

  logs.forEach(log => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.food_name}</td>
      <td>${formatNumber(log.quantity_g)} g</td>
      <td>${log.meal_type}</td>
      <td>${formatNumber(log.calories)} kcal</td>
      <td>${formatNumber(log.protein_g)} g</td>
      <td>${formatNumber(log.carbs_g)} g</td>
      <td>${formatNumber(log.fat_g)} g</td>
      <td>${formatDate(log.log_date)}</td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadFoodLogs() {
  if (!document.getElementById("foodLogTableBody")) return;

  try {
    const logs = await api(`/api/food-logs/${getUserId()}`);
    renderFoodLogs(logs);
  } catch (error) {
    setStatus("foodLogStatus", error.message, true);
  }
}

const addFoodBtn = document.getElementById("addFoodBtn");
const foodSearchInput = document.getElementById("foodSearch");
const foodSelectInput = document.getElementById("foodItem");
const foodResults = document.getElementById("foodResults");

if (foodSearchInput) {
  foodSearchInput.addEventListener("focus", () => {
    if (foodResults) foodResults.classList.remove("collapsed");
  });

  foodSearchInput.addEventListener("input", () => {
    const searchTerm = foodSearchInput.value.trim();
    clearTimeout(foodSearchTimer);
    selectedFoodIndex = "";
    if (foodSelectInput) foodSelectInput.value = "";
    if (foodResults) foodResults.classList.remove("collapsed");

    if (searchTerm.length < 2) {
      renderFoodSearchResults(selectedFoodResults);
      setStatus("foodLogStatus", "Type at least 2 letters to search foods.");
      return;
    }

    foodSearchTimer = setTimeout(() => loadFoods(searchTerm), 450);
  });
}

if (foodSelectInput) {
  foodSelectInput.addEventListener("change", () => selectFood(foodSelectInput.value));
}

if (foodResults) {
  foodResults.addEventListener("click", event => {
    const button = event.target.closest(".food-result-item");
    if (!button) return;
    selectFood(button.dataset.index);
  });
}

let activeFoodTab = "search";
const tabSearch = document.getElementById("tabSearch");
const tabManual = document.getElementById("tabManual");
const searchFoodSection = document.getElementById("searchFoodSection");
const manualFoodSection = document.getElementById("manualFoodSection");

if (tabSearch && tabManual) {
  tabSearch.addEventListener("click", () => {
    activeFoodTab = "search";
    tabSearch.classList.add("active");
    tabManual.classList.remove("active");
    searchFoodSection?.classList.remove("hidden");
    manualFoodSection?.classList.add("hidden");
    setStatus("foodLogStatus", "");
  });

  tabManual.addEventListener("click", () => {
    activeFoodTab = "manual";
    tabManual.classList.add("active");
    tabSearch.classList.remove("active");
    manualFoodSection?.classList.remove("hidden");
    searchFoodSection?.classList.add("hidden");
    setStatus("foodLogStatus", "");
  });
}

if (addFoodBtn) {
  const logDateInput = document.getElementById("logDate");
  if (logDateInput && !logDateInput.value) logDateInput.value = getLocalDateString();

  addFoodBtn.addEventListener("click", async () => {
    const quantityG = Number(document.getElementById("quantity").value);
    const mealType = document.getElementById("mealType").value;
    const logDate = document.getElementById("logDate").value;

    if (!quantityG || quantityG <= 0 || !mealType) {
      setStatus("foodLogStatus", "Please enter quantity and select a meal type.", true);
      return;
    }

    let foodId = null;
    let foodData = null;

    if (activeFoodTab === "search") {
      const selectedIndex = selectedFoodIndex || document.getElementById("foodItem").value;
      const selectedFood = selectedFoodResults[Number(selectedIndex)];
      if (!selectedFood) {
        setStatus("foodLogStatus", "Please search and select a food item.", true);
        return;
      }
      foodId = selectedFood.food_id || null;
      foodData = selectedFood.food_id ? null : selectedFood;
    } else {
      const manualFoodName = document.getElementById("manualFoodName").value.trim();
      const manualCalories = Number(document.getElementById("manualCalories").value);
      const manualProtein = Number(document.getElementById("manualProtein").value || 0);
      const manualCarbs = Number(document.getElementById("manualCarbs").value || 0);
      const manualFat = Number(document.getElementById("manualFat").value || 0);

      if (!manualFoodName || isNaN(manualCalories) || manualCalories < 0) {
        setStatus("foodLogStatus", "Please enter a valid food name and calories.", true);
        return;
      }

      foodData = {
        food_name: manualFoodName,
        calories_per_100g: manualCalories,
        protein_per_100g: manualProtein,
        carbs_per_100g: manualCarbs,
        fat_per_100g: manualFat
      };
    }

    try {
      await api("/api/food-logs", {
        method: "POST",
        body: JSON.stringify({
          userId: getUserId(),
          foodId,
          food: foodData,
          quantityG,
          mealType,
          logDate
        })
      });

      // Clear inputs
      document.getElementById("quantity").value = "";
      document.getElementById("mealType").value = "";
      if (activeFoodTab === "manual") {
        document.getElementById("manualFoodName").value = "";
        document.getElementById("manualCalories").value = "";
        document.getElementById("manualProtein").value = "";
        document.getElementById("manualCarbs").value = "";
        document.getElementById("manualFat").value = "";
      }

      setStatus("foodLogStatus", "Food added to MySQL log.");
      await loadFoodLogs();
    } catch (error) {
      if (error.upgradeRequired) {
        showUpgradeModal("More daily food logs", error.requiredPlan || "Basic", error.currentPlan);
      }
      setStatus("foodLogStatus", error.message, true);
    }
  });
}

loadFoods();
loadFoodLogs();

// ======================= Medical History Page =======================

const medicalConditionPresets = {
  Diabetes: "Prefer oats, dal, beans, vegetables, curd, nuts, and whole wheat roti. Limit sweets, sugary drinks, fruit juice, white bread, and very large rice portions.",
  "Heart Issue": "Prefer oats, fruits, vegetables, lentils, fish, nuts, and low-salt home-cooked meals. Limit fried foods, processed snacks, excess salt, butter, ghee, and processed meat.",
  "Kidney Issue": "Prefer low-salt meals such as rice, apple, cabbage, cauliflower, and doctor-approved protein portions. Limit processed foods, cola, excess protein supplements, and very salty pickles.",
  Thyroid: "Prefer eggs, curd, dal, whole grains, fruits, vegetables, and nuts. Limit highly processed foods, sugary snacks, and excess soy unless approved by your doctor.",
  Acidity: "Prefer oats, banana, curd, rice, boiled vegetables, and lean protein. Limit spicy food, fried food, coffee, carbonated drinks, and late-night heavy meals.",
  Anemia: "Prefer spinach, beans, lentils, eggs, lean meat, citrus fruit, and amla. Limit tea or coffee with meals because they can reduce iron absorption.",
  "Weight Management": "Prefer protein-rich meals with eggs, dal, chicken, vegetables, salads, fruit, and measured whole grains. Limit sweet drinks, fried snacks, desserts, and mindless snacking.",
  "No Known Condition": "Prefer balanced meals with vegetables, fruits, dal, eggs, curd, oats, and whole grains. Limit sugary drinks, deep-fried foods, and highly processed snacks."
};

function renderMedicalRecords(records) {
  const tableBody = document.getElementById("medicalTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!records.length) {
    tableBody.innerHTML = '<tr id="medicalEmptyRow"><td colspan="4">No medical records added yet.</td></tr>';
    return;
  }

  records.forEach(record => {
    const row = document.createElement("tr");
    [record.condition_name, record.dietary_restriction, record.notes || ""].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "medical-remove-btn";
    removeButton.dataset.recordId = record.record_id;
    removeButton.textContent = "Remove";
    actionCell.appendChild(removeButton);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });
}

async function loadMedicalRecords() {
  if (!document.getElementById("medicalTableBody")) return;

  try {
    renderMedicalRecords(await api(`/api/medical-records/${getUserId()}`));
  } catch (error) {
    setStatus("medicalStatus", error.message, true);
  }
}

const addMedicalBtn = document.getElementById("addMedicalBtn");
const conditionPreset = document.getElementById("conditionPreset");
const medicalTableBody = document.getElementById("medicalTableBody");

if (conditionPreset) {
  conditionPreset.addEventListener("change", () => {
    const customCondition = document.getElementById("condition");
    const restriction = document.getElementById("restriction");
    const selectedCondition = conditionPreset.value;
    const isCustom = selectedCondition === "custom";

    customCondition.classList.toggle("hidden", !isCustom);
    customCondition.value = isCustom ? customCondition.value : selectedCondition;

    if (!isCustom && restriction && medicalConditionPresets[selectedCondition]) {
      restriction.value = medicalConditionPresets[selectedCondition];
    }

    if (isCustom && restriction && !restriction.value.trim()) {
      restriction.placeholder = "Example: low sugar, low salt, avoid fried foods, high fiber meals";
    }
  });
}

if (addMedicalBtn) {
  addMedicalBtn.addEventListener("click", async () => {
    const presetValue = document.getElementById("conditionPreset")?.value || "";
    const customValue = document.getElementById("condition").value.trim();
    const conditionName = presetValue && presetValue !== "custom" ? presetValue : customValue;
    const dietaryRestriction = document.getElementById("restriction").value.trim();
    const notes = document.getElementById("notes").value.trim();

    if (!conditionName || !dietaryRestriction) {
      setStatus("medicalStatus", "Please enter condition and dietary restriction.", true);
      return;
    }

    try {
      await api("/api/medical-records", {
        method: "POST",
        body: JSON.stringify({ userId: getUserId(), conditionName, dietaryRestriction, notes })
      });
      if (document.getElementById("conditionPreset")) document.getElementById("conditionPreset").value = "";
      document.getElementById("condition").value = "";
      document.getElementById("condition").classList.add("hidden");
      document.getElementById("restriction").value = "";
      document.getElementById("notes").value = "";
      setStatus("medicalStatus", "Medical record saved. Diet recommendations are updated.");
      await loadMedicalRecords();
    } catch (error) {
      if (error.upgradeRequired) {
        showUpgradeModal("Medical history guidance", error.requiredPlan || "Basic", error.currentPlan);
      }
      setStatus("medicalStatus", error.message, true);
    }
  });
}

if (medicalTableBody) {
  medicalTableBody.addEventListener("click", async event => {
    const removeButton = event.target.closest(".medical-remove-btn");
    if (!removeButton) return;

    const recordId = removeButton.dataset.recordId;
    if (!recordId) return;

    try {
      removeButton.disabled = true;
      setStatus("medicalStatus", "Removing medical condition...");
      await api(`/api/medical-records/${recordId}?userId=${getUserId()}`, {
        method: "DELETE"
      });
      setStatus("medicalStatus", "Medical condition removed. Recommendations are updated.");
      await loadMedicalRecords();
    } catch (error) {
      removeButton.disabled = false;
      setStatus("medicalStatus", error.message, true);
    }
  });
}

loadMedicalRecords();

// ======================= Recommendations Page =======================

function renderChipList(elementId, items, emptyMessage) {
  const list = document.getElementById(elementId);
  if (!list) return;

  list.innerHTML = "";
  const values = items?.length ? items : [emptyMessage];
  values.forEach(item => {
    const chip = document.createElement("span");
    chip.textContent = item;
    list.appendChild(chip);
  });
}

function renderConditionGuidance(items) {
  const list = document.getElementById("conditionGuidanceList");
  if (!list) return;

  list.innerHTML = "";
  const guidanceItems = items?.length
    ? items
    : [{ title: "General Healthy Eating", summary: "Add medical history for condition-specific food guidance." }];

  guidanceItems.forEach(item => {
    const noteItem = document.createElement("div");
    const title = document.createElement("strong");
    const summary = document.createElement("span");

    noteItem.className = "recommendation-note-item";
    title.textContent = item.title;
    summary.textContent = item.summary;

    noteItem.append(title, summary);
    list.appendChild(noteItem);
  });
}

async function loadRecommendations() {
  if (!document.getElementById("displayCalories")) return;

  try {
    const recommendation = await api(`/api/recommendations/${getUserId()}`);
    if (!recommendation) return;

    document.getElementById("displayCalories").textContent = recommendation.recommended_calories;
    document.getElementById("displayProtein").textContent = recommendation.protein_g;
    document.getElementById("displayCarbs").textContent = recommendation.carbs_g;
    document.getElementById("displayFat").textContent = recommendation.fat_g;

    renderChipList("foodsToPreferList", recommendation.foodsToPrefer, "Add medical history to see foods to prefer.");
    renderChipList("foodsToLimitList", recommendation.foodsToLimit, "Add medical history to see foods to limit.");
    renderConditionGuidance(recommendation.conditionGuidance);

    const notesList = document.getElementById("recommendationNotesList");
    notesList.innerHTML = "";
    const notes = recommendation.notes?.length
      ? recommendation.notes
      : ["Complete your profile and medical history to improve recommendations."];

    notes.forEach(note => {
      const noteItem = document.createElement("div");
      noteItem.className = "recommendation-note-item";
      noteItem.textContent = note;
      notesList.appendChild(noteItem);
    });
  } catch (error) {
    if (error.upgradeRequired) {
      showUpgradeInline("recommendationNotesList", "Diet recommendations", error.requiredPlan || "Basic", error.currentPlan);
    } else {
      document.getElementById("recommendationNotesList").innerHTML =
        `<div class="recommendation-note-item">${error.message}</div>`;
    }
    renderChipList("foodsToPreferList", [], "Could not load recommendation foods.");
    renderChipList("foodsToLimitList", [], "Could not load recommendation foods.");
  }
}

loadRecommendations();

// ======================= Subscription Pages =======================

function normalizePlan(plan) {
  const name = plan.plan_name;
  return {
    name,
    description: plan.description,
    durationDays: plan.duration_days,
    price: `Rs. ${formatNumber(plan.price)}`,
    rawPrice: Number(plan.price),
    benefits: plan.benefits || PLAN_FEATURES[name] || [],
    limits: plan.limits || {}
  };
}

async function getSubscriptionState() {
  const [plans, subscription] = await Promise.all([
    api("/api/subscription-plans"),
    api(`/api/subscriptions/${getUserId()}`)
  ]);

  return {
    plans: plans.map(normalizePlan),
    subscription
  };
}

async function upgradeSubscription(planName) {
  await api("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify({ userId: getUserId(), planName })
  });
}

async function completeSubscriptionPayment(planName, paymentMethod) {
  await api("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify({ userId: getUserId(), planName, paymentMethod })
  });
}

async function updateSubscription(subscriptionId, body) {
  await api(`/api/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

async function renderSubscriptionPage() {
  const currentPlanName = document.getElementById("currentPlanName");
  if (!currentPlanName) return;

  await loadAccess();
  const { plans, subscription } = await getSubscriptionState();
  const currentPlan = activePlanFromSubscription(subscription);
  const currentPlanDetails = plans.find(plan => plan.name === currentPlan) || plans[0];
  currentAccess = { ...(currentAccess || {}), currentPlan, benefits: currentPlanDetails?.benefits || [] };
  const hasActiveSubscription = currentPlan !== "Free" && Number(subscription?.is_active) === 1;

  currentPlanName.textContent = currentPlan;
  document.getElementById("currentPlanDescription").textContent = currentPlanDetails?.description || "";
  document.getElementById("subscriptionStartDate").textContent = hasActiveSubscription ? formatDate(subscription?.start_date) : "--";
  document.getElementById("subscriptionEndDate").textContent = hasActiveSubscription ? formatDate(subscription?.end_date) : "--";
  document.getElementById("paymentStatus").textContent = hasActiveSubscription ? subscription.payment_status : "Free";
  document.getElementById("paymentStatusNote").textContent = hasActiveSubscription
    ? "Latest payment data is stored in MySQL."
    : "Free access is active without payment.";
  document.getElementById("subscriptionHeroStatus").textContent = hasActiveSubscription ? `${subscription.payment_status} Subscription` : "Free Access";
  document.getElementById("currentPlanBadge").textContent = hasActiveSubscription ? "Active Plan" : "Starter Access";

  document.querySelectorAll(".subscription-plan-card").forEach(card => {
    const button = card.querySelector(".subscription-action-btn");
    const plan = plans.find(item => item.name === card.dataset.plan);
    const isCurrent = card.dataset.plan === currentPlan;
    const isUpgrade = PLAN_RANK[card.dataset.plan] > PLAN_RANK[currentPlan];
    const featureList = card.querySelector(".subscription-feature-list");

    if (plan) {
      card.querySelector(".nt-card-note").textContent = plan.description;
      card.querySelector(".subscription-plan-price").textContent = plan.price;
      if (featureList) {
        featureList.innerHTML = "";
        plan.benefits.forEach(benefit => {
          const item = document.createElement("li");
          item.textContent = benefit;
          featureList.appendChild(item);
        });
      }
    }

    card.classList.toggle("active", isCurrent);
    card.classList.toggle("recommended", card.dataset.plan === "Premium");
    button.disabled = isCurrent;
    button.textContent = isCurrent ? "Current Plan" : isUpgrade ? `Upgrade to ${card.dataset.plan}` : `Switch to ${card.dataset.plan}`;
  });

  const planGrid = document.getElementById("subscriptionPlanGrid");
  if (planGrid && new URLSearchParams(window.location.search).get("upgrade")) {
    planGrid.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.querySelectorAll(".subscription-action-btn").forEach(button => {
  button.addEventListener("click", async () => {
    const planName = button.dataset.plan;
    if (!planName || button.disabled) return;
    localStorage.setItem("nutriTrackSelectedPlan", planName);
    window.location.href = `payment.htm?plan=${encodeURIComponent(planName)}`;
  });
});

async function renewCurrentSubscription() {
  const { subscription } = await getSubscriptionState();
  if (!subscription) return;
  await updateSubscription(subscription.subscription_id, { renewDays: subscription.duration_days || 30 });
}

const renewSubscriptionBtn = document.getElementById("renewSubscriptionBtn");
if (renewSubscriptionBtn) {
  renewSubscriptionBtn.addEventListener("click", async () => {
    await renewCurrentSubscription();
    await renderSubscriptionPage();
  });
}

async function renderManagePlanPage() {
  const managePlanName = document.getElementById("managePlanName");
  if (!managePlanName) return;

  const { plans, subscription } = await getSubscriptionState();
  if (!subscription) return;
  const planDetails = plans.find(plan => plan.name === subscription.plan_name);

  managePlanName.textContent = `${subscription.plan_name} Plan`;
  document.getElementById("managePlanDescription").textContent = subscription.description;
  document.getElementById("managePlanStatus").textContent = subscription.payment_status;
  document.getElementById("managePlanPrice").textContent = `Rs. ${formatNumber(subscription.price)}`;
  document.getElementById("manageStartDate").textContent = formatDate(subscription.start_date);
  document.getElementById("manageNextBillingDate").textContent = formatDate(subscription.end_date);
  document.getElementById("manageAutoRenewStatus").textContent = subscription.auto_renew ? "On" : "Off";
  document.getElementById("manageAutoRenewBadge").textContent = subscription.auto_renew ? "Auto Renew On" : "Auto Renew Off";
  document.getElementById("managePlanHeroStatus").textContent =
    subscription.payment_status === "Active" ? "Plan Active" : "Plan Needs Attention";

  const benefits = planDetails?.benefits || PLAN_FEATURES[subscription.plan_name] || [];

  const benefitsList = document.getElementById("manageBenefitsList");
  benefitsList.innerHTML = "";
  benefits.forEach(benefit => {
    const item = document.createElement("div");
    item.className = "manage-benefit-item";
    item.textContent = benefit;
    benefitsList.appendChild(item);
  });
}

const toggleAutoRenewBtn = document.getElementById("toggleAutoRenewBtn");
if (toggleAutoRenewBtn) {
  toggleAutoRenewBtn.addEventListener("click", async () => {
    const { subscription } = await getSubscriptionState();
    await updateSubscription(subscription.subscription_id, { autoRenew: !subscription.auto_renew });
    await renderManagePlanPage();
  });
}

const manageRenewBtn = document.getElementById("manageRenewBtn");
if (manageRenewBtn) {
  manageRenewBtn.addEventListener("click", async () => {
    await renewCurrentSubscription();
    await renderManagePlanPage();
  });
}

renderSubscriptionPage().catch(error => setStatus("authStatus", error.message, true));
renderManagePlanPage().catch(error => setStatus("authStatus", error.message, true));

// ======================= Payment Page =======================

let selectedPaymentMethod = "Card";
let selectedCheckoutPlan = null;

function getPlanFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("plan") || localStorage.getItem("nutriTrackSelectedPlan") || "";
}

function showPaymentFields(method) {
  selectedPaymentMethod = method;
  document.querySelectorAll("[data-payment-methods] button").forEach(button => {
    button.classList.toggle("selected", button.dataset.method === method);
  });

  document.getElementById("cardPaymentFields")?.classList.toggle("hidden", method !== "Card");
  document.getElementById("upiPaymentFields")?.classList.toggle("hidden", method !== "UPI");
  document.getElementById("bankPaymentFields")?.classList.toggle("hidden", method !== "Net Banking");
}

function validatePaymentForm(plan) {
  if (!plan) return "Please select a valid plan first.";
  if (plan.rawPrice <= 0) return "";

  if (selectedPaymentMethod === "Card") {
    const name = document.getElementById("cardName").value.trim();
    const cardNumber = document.getElementById("cardNumber").value.replace(/\s/g, "");
    const expiry = document.getElementById("cardExpiry").value.trim();
    const cvv = document.getElementById("cardCvv").value.trim();

    if (!name || cardNumber.length < 12 || !/^\d+$/.test(cardNumber)) {
      return "Please enter valid card holder name and card number.";
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
      return "Please enter expiry as MM/YY and a valid CVV.";
    }
  }

  if (selectedPaymentMethod === "UPI") {
    const upiId = document.getElementById("upiId").value.trim();
    if (!/^[\w.-]+@[\w.-]+$/.test(upiId)) return "Please enter a valid UPI ID.";
  }

  if (selectedPaymentMethod === "Net Banking" && !document.getElementById("bankName").value) {
    return "Please select a bank.";
  }

  return "";
}

async function renderPaymentPage() {
  const planNameElement = document.getElementById("paymentPlanName");
  if (!planNameElement) return;

  try {
    const checkoutPlanName = getPlanFromUrl();
    const plans = (await api("/api/subscription-plans")).map(normalizePlan);
    selectedCheckoutPlan = plans.find(plan => plan.name === checkoutPlanName);

    if (!selectedCheckoutPlan) {
      setStatus("paymentStatusMessage", "Please choose a subscription plan first.", true);
      planNameElement.textContent = "No plan selected";
      document.getElementById("completePaymentBtn").disabled = true;
      return;
    }

    localStorage.setItem("nutriTrackSelectedPlan", selectedCheckoutPlan.name);
    planNameElement.textContent = selectedCheckoutPlan.name;
    document.getElementById("paymentPlanDescription").textContent = selectedCheckoutPlan.description;
    document.getElementById("paymentPlanPrice").textContent = selectedCheckoutPlan.price;
    document.getElementById("completePaymentBtn").textContent =
      selectedCheckoutPlan.rawPrice > 0 ? `Pay ${selectedCheckoutPlan.price}` : "Activate Free Plan";
    document.getElementById("paymentHeroStatus").textContent =
      selectedCheckoutPlan.rawPrice > 0 ? "Payment Required" : "No Payment Needed";

    const benefitsList = document.getElementById("paymentBenefitsList");
    benefitsList.innerHTML = "";
    selectedCheckoutPlan.benefits.forEach(benefit => {
      const item = document.createElement("div");
      item.className = "manage-benefit-item";
      item.textContent = benefit;
      benefitsList.appendChild(item);
    });

    if (selectedCheckoutPlan.rawPrice <= 0) {
      document.querySelector(".payment-form-card")?.classList.add("payment-free-mode");
    }
  } catch (error) {
    setStatus("paymentStatusMessage", error.message, true);
  }
}

document.querySelectorAll("[data-payment-methods] button").forEach(button => {
  button.addEventListener("click", () => showPaymentFields(button.dataset.method));
});

const cardNumberInput = document.getElementById("cardNumber");
if (cardNumberInput) {
  cardNumberInput.addEventListener("input", () => {
    const digits = cardNumberInput.value.replace(/\D/g, "").slice(0, 16);
    cardNumberInput.value = digits.replace(/(.{4})/g, "$1 ").trim();
  });
}

const cardExpiryInput = document.getElementById("cardExpiry");
if (cardExpiryInput) {
  cardExpiryInput.addEventListener("input", () => {
    const digits = cardExpiryInput.value.replace(/\D/g, "").slice(0, 4);
    cardExpiryInput.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });
}

const completePaymentBtn = document.getElementById("completePaymentBtn");
if (completePaymentBtn) {
  completePaymentBtn.addEventListener("click", async () => {
    const validationMessage = validatePaymentForm(selectedCheckoutPlan);
    if (validationMessage) {
      setStatus("paymentStatusMessage", validationMessage, true);
      return;
    }

    try {
      completePaymentBtn.disabled = true;
      setStatus("paymentStatusMessage", "Processing payment and activating plan...");
      await completeSubscriptionPayment(selectedCheckoutPlan.name, selectedPaymentMethod);
      localStorage.removeItem("nutriTrackSelectedPlan");
      setStatus("paymentStatusMessage", "Payment successful. Subscription activated.");
      window.location.href = "subscription.htm";
    } catch (error) {
      completePaymentBtn.disabled = false;
      setStatus("paymentStatusMessage", error.message, true);
    }
  });
}

renderPaymentPage();
