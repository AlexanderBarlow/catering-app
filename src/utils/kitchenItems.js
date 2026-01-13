// src/utils/kitchenItems.js

// Things we NEVER want to show on prep list (and usually not on cards)
const EXCLUDE_KEYWORDS = [
    "sauce",
    "packet",
    "packets",
    "dressing",
    "utensil",
    "utensils",
    "napkin",
    "napkins",
    "plate",
    "plates",
    "cup",
    "cups",
    "ice",
    "ketchup",
    "mustard",
    "mayo",
    "mayonnaise",
    "pickle",
    "bbq",
    "barbeque",
    "polynesian",
    "ranch",
    "honey",
    "buffalo",
    "sriracha",
    "vinaigrette",
];

// High priority (kitchen-first)
// NOTE: We rank HOT trays above other trays, but cold nugget trays / salad trays / wrap trays are STILL priority.
// High priority (kitchen-first)
const PRIORITY_RULES = [
    // Sandwiches (broad catch)
    { key: "SANDWICH", includeAny: ["sandwich"] },

    // Trays (hot first, then other priority trays)
    { key: "HOT_NUGGET_TRAY", includeAll: ["tray", "nugget", "hot"], excludeAny: ["cold", "chilled"] },
    { key: "HOT_STRIP_TRAY", includeAll: ["tray", "strip", "hot"], excludeAny: ["cold", "chilled"] },

    // Still priority trays
    { key: "COLD_NUGGET_TRAY", includeAll: ["tray", "nugget"], includeAny: ["cold", "chilled"] },
    { key: "MAC_TRAY", includeAll: ["tray"], includeAny: ["mac", "macaroni"] },
    { key: "SALAD_TRAY", includeAll: ["tray"], includeAny: ["salad", "cobb", "southwest", "market"] },
    { key: "WRAP_TRAY", includeAll: ["tray"], includeAny: ["wrap"] },

    // ✅ NEW: any tray is priority (fallback)
    { key: "TRAY", includeAll: ["tray"] },

    // Bundles
    { key: "GRILLED_BUNDLE", includeAll: ["grilled", "bundle"] },
];


// Helpers
function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAll(hay, needles) {
    return needles.every((k) => hay.includes(k));
}

function includesAny(hay, needles) {
    return needles.some((k) => hay.includes(k));
}

function excludesAny(hay, needles) {
    return needles.some((k) => hay.includes(k));
}

export function isSauceLike(name) {
    const n = norm(name);

    // If you ever have a legit food item that contains "sauce" (rare in catering items),
    // add an allow-list here. For now, keep it strict.
    return EXCLUDE_KEYWORDS.some((k) => n.includes(k));
}

export function getPriorityKey(name) {
    const n = norm(name);

    for (const rule of PRIORITY_RULES) {
        const okAll = rule.includeAll ? includesAll(n, rule.includeAll) : true;
        const okAny = rule.includeAny ? includesAny(n, rule.includeAny) : true;
        const blocked = rule.excludeAny ? excludesAny(n, rule.excludeAny) : false;

        if (okAll && okAny && !blocked) return rule.key;
    }

    return null;
}

export function pickKitchenPriorityItems(items) {
    // items: [{ name, qty }]
    if (!Array.isArray(items)) return { priority: [], others: [] };

    // Filter out sauces/non-prep by default
    const cleaned = items.filter((it) => it?.name && !isSauceLike(it.name));

    const priority = [];
    const others = [];

    for (const it of cleaned) {
        const key = getPriorityKey(it.name);
        if (key) priority.push({ ...it, key });
        else others.push(it);
    }

    // Sort priority by category importance
    // Hot trays first, then other trays, then bundles.
    const rank = {
        SANDWICH: 1,

        HOT_NUGGET_TRAY: 2,
        HOT_STRIP_TRAY: 3,

        COLD_NUGGET_TRAY: 4,
        MAC_TRAY: 5,
        SALAD_TRAY: 6,
        WRAP_TRAY: 7,

        // ✅ fallback tray priority
        TRAY: 8,

        GRILLED_BUNDLE: 9,
    };


    priority.sort((a, b) => (rank[a.key] || 99) - (rank[b.key] || 99));

    return { priority, others };
}

// Optional utility if you want a label on cards / prep list
export function priorityLabel(key) {
    switch (key) {
        case "SANDWICH":
            return "Sandwich";
        case "HOT_NUGGET_TRAY":
            return "Hot Nugget Tray";
        case "HOT_STRIP_TRAY":
            return "Hot Strip Tray";
        case "COLD_NUGGET_TRAY":
            return "Cold Nugget Tray";
        case "MAC_TRAY":
            return "Mac & Cheese Tray";
        case "SALAD_TRAY":
            return "Salad Tray";
        case "WRAP_TRAY":
            return "Wrap Tray";
        case "GRILLED_BUNDLE":
            return "Grilled Bundle";
        case "TRAY":
            return "Tray";
        default:
            return "Priority";
    }
}
