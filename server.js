var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db.js
var db_exports = {};
__export(db_exports, {
  audit: () => audit,
  db: () => db,
  getSetting: () => getSetting,
  sendEmail: () => sendEmail,
  setSetting: () => setSetting
});
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value));
}
function audit(actorId, action, entity, payload = {}) {
  db.prepare("INSERT INTO audit_logs (actor_id, action, entity, payload_json) VALUES (?, ?, ?, ?)").run(actorId || null, action, entity, JSON.stringify(payload));
}
function sendEmail(to, subject, body) {
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] TO: ${to} | SUBJECT: ${subject}
${body}
${"-".repeat(60)}
`;
  fs.appendFileSync(path.join(__dirname, "logs", "email.log"), line);
}
var __dirname, DATA_DIR, db;
var init_db = __esm({
  "server/db.js"() {
    __dirname = path.dirname(fileURLToPath(import.meta.url));
    DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(path.join(__dirname, "logs"), { recursive: true });
    db = new Database(path.join(DATA_DIR, "career-compass.db"));
    db.pragma("journal_mode = DELETE");
    db.pragma("foreign_keys = ON");
    db.exec(`
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','parent','mentor','admin')),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  is_minor INTEGER NOT NULL DEFAULT 0,
  parent_user_id INTEGER REFERENCES users(id),
  consent_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK(consent_status IN ('not_applicable','pending','given')),
  consent_code TEXT UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by INTEGER REFERENCES users(id),
  password_hash TEXT,
  paid_unlock INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  class_level TEXT,
  stream TEXT,
  subjects_json TEXT NOT NULL DEFAULT '{}',
  interests_json TEXT NOT NULL DEFAULT '[]',
  strengths_json TEXT NOT NULL DEFAULT '[]',
  skills_json TEXT NOT NULL DEFAULT '[]',
  goals_json TEXT NOT NULL DEFAULT '[]',
  goal_note TEXT,
  budget TEXT,
  city TEXT,
  willing_to_relocate INTEGER NOT NULL DEFAULT 1,
  target_year INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS assessment_answers (
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  question_id TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  riasec_json TEXT NOT NULL DEFAULT '{}',
  aptitude_json TEXT NOT NULL DEFAULT '{}',
  interest_tags_json TEXT NOT NULL DEFAULT '{}',
  computed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS careers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  day_in_life TEXT NOT NULL,
  skills_json TEXT NOT NULL,
  subjects_json TEXT NOT NULL,
  riasec_json TEXT NOT NULL,
  goals_json TEXT NOT NULL,
  salary_entry TEXT NOT NULL,
  salary_senior TEXT NOT NULL,
  growth TEXT NOT NULL,
  streams_json TEXT NOT NULL,
  education_json TEXT NOT NULL,
  exams_json TEXT NOT NULL,
  aptitude_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  emerging INTEGER NOT NULL DEFAULT 0,
  cost_band TEXT NOT NULL DEFAULT 'medium' CHECK(cost_band IN ('low','medium','high')),
  source TEXT NOT NULL,
  as_of TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  duration TEXT NOT NULL,
  about TEXT NOT NULL,
  careers_json TEXT NOT NULL,
  streams_json TEXT NOT NULL,
  source TEXT NOT NULL,
  as_of TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT NOT NULL,
  streams_json TEXT NOT NULL,
  approx_fees_per_year TEXT NOT NULL,
  entrance_exams_json TEXT NOT NULL,
  nirf_rank INTEGER,
  nirf_category TEXT,
  website TEXT,
  source TEXT NOT NULL,
  as_of TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  conducted_by TEXT NOT NULL,
  level TEXT NOT NULL,
  streams_json TEXT NOT NULL,
  about TEXT NOT NULL,
  timeline_json TEXT NOT NULL,
  source TEXT NOT NULL,
  as_of TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  career_id INTEGER NOT NULL REFERENCES careers(id),
  match_score REAL NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('high','medium','low')),
  rationale TEXT NOT NULL,
  decision_log_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'primary' CHECK(kind IN ('primary','wildcard')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending_review','rejected')),
  review_reason TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  career_id INTEGER NOT NULL REFERENCES careers(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','generating','ready','failed')),
  target_year INTEGER,
  milestones_json TEXT NOT NULL DEFAULT '[]',
  timeline_json TEXT NOT NULL DEFAULT '[]',
  resources_json TEXT NOT NULL DEFAULT '[]',
  high_impact INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'none' CHECK(review_status IN ('none','pending','approved','rejected')),
  ai_mode TEXT NOT NULL DEFAULT 'local',
  share_token TEXT UNIQUE,
  share_enabled INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  generated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favourites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS mentors (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  verified INTEGER NOT NULL DEFAULT 0,
  fields_json TEXT NOT NULL DEFAULT '[]',
  headline TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS mentor_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  mentor_id INTEGER REFERENCES users(id),
  career_id INTEGER REFERENCES careers(id),
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','escalated')),
  sla_due_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  answered_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','paid','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comp_codes (
  code TEXT PRIMARY KEY,
  percent_off INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  used_by INTEGER REFERENCES users(id),
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  due_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id),
  thumbs INTEGER NOT NULL CHECK(thumbs IN (1,-1)),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rec_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_user ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_mq_mentor ON mentor_questions(mentor_id);
`);
    {
      const cols = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      const addColumn = (table, col, ddl) => {
        if (!cols(table).includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      };
      addColumn("users", "password_hash", "password_hash TEXT");
      addColumn("colleges", "nirf_rank", "nirf_rank INTEGER");
      addColumn("colleges", "nirf_category", "nirf_category TEXT");
      addColumn("colleges", "website", "website TEXT");
      db.prepare("UPDATE users SET paid_unlock = 1 WHERE paid_unlock = 0").run();
    }
  }
});

// server/seed/dates.js
function freshDate(monthsBack = 1) {
  const d = /* @__PURE__ */ new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}
function staleDate() {
  const d = /* @__PURE__ */ new Date();
  d.setMonth(d.getMonth() - 9);
  return d.toISOString().slice(0, 10);
}
var SRC_TEAM, SRC_NTA, SRC_INST;
var init_dates = __esm({
  "server/seed/dates.js"() {
    SRC_TEAM = "Career Compass research team (compiled from public sources)";
    SRC_NTA = "National Testing Agency & official exam portals";
    SRC_INST = "Institute websites & public disclosures (approximate figures)";
  }
});

// server/seed/questions.js
function buildQuestions() {
  const qs = [];
  let n2 = 0;
  const id = (sub) => `${sub}-${String(++n2).padStart(2, "0")}`;
  const apt = (dim, text, options, correct, difficulty) => qs.push({ id: id("APT"), sub_test: "aptitude", dimension: dim, text, options, correct, difficulty });
  apt("numeric", "A shirt costs \u20B9800 after a 20% discount. What was the original price?", ["\u20B9960", "\u20B91000", "\u20B91040", "\u20B91200"], 1, 1);
  apt("numeric", "If 3 machines fill 150 bottles in 5 minutes, how many bottles do 4 machines fill in 6 minutes?", ["180", "200", "240", "260"], 2, 2);
  apt("numeric", "A student scores 72, 85, 60 and x in four tests. The average is 74. What is x?", ["76", "79", "81", "84"], 1, 2);
  apt("numeric", "A train covers 45 km in 30 minutes. At the same speed, how far does it travel in 1 hour 20 minutes?", ["96 km", "110 km", "120 km", "135 km"], 2, 2);
  apt("numeric", "The price of an item rose from \u20B9250 to \u20B9310. By what percentage did it increase?", ["19.2%", "21.4%", "24%", "26.8%"], 2, 1);
  apt("logical", "Find the next number: 2, 6, 12, 20, 30, ?", ["36", "40", "42", "46"], 2, 2);
  apt("logical", "If all engineers are graduates and some graduates are managers, which must be true?", ["All engineers are managers", "Some engineers are managers", "No engineer is a manager", "None of these must be true"], 3, 2);
  apt("logical", "In a row of students, Aarav is 7th from the left and 12th from the right. How many students are in the row?", ["17", "18", "19", "20"], 1, 2);
  apt("logical", `Pointing to a photo, Riya says, "He is the son of my grandfather's only son." How is the person related to Riya?`, ["Father", "Brother", "Uncle", "Cousin"], 1, 3);
  apt("logical", "If FLOWER is coded as GMPXFS, how is PETAL coded?", ["QFUBM", "QFUB L", "QGUBM", "QFVBM"], 0, 3);
  apt("verbal", 'Choose the word most nearly opposite to "DILIGENT":', ["Careless", "Persistent", "Hardworking", "Cautious"], 0, 1);
  apt("verbal", `"The scientist's explanation was so ___ that even beginners understood it." Pick the best word:`, ["obscure", "lucid", "verbose", "complex"], 1, 1);
  apt("verbal", "Odd one out: Rectangle, Circle, Triangle, Cube", ["Rectangle", "Circle", "Triangle", "Cube"], 3, 1);
  apt("verbal", '"Abundant" is to "scarce" as "candid" is to:', ["frank", "secretive", "honest", "blunt"], 1, 2);
  apt("verbal", "Which sentence is grammatically correct?", ["She don't like physics.", "She doesn't likes physics.", "She doesn't like physics.", "She not like physics."], 2, 1);
  apt("spatial", "A cube is painted red on all sides and cut into 27 equal smaller cubes. How many small cubes have exactly two red faces?", ["4", "6", "8", "12"], 3, 3);
  apt("spatial", "You fold a square paper in half twice, then punch one hole through all layers. How many holes appear when unfolded?", ["2", "3", "4", "1"], 2, 2);
  apt("spatial", 'The letter "N" is rotated 180\xB0. Which letter does it look like?', ["N", "Z", "U", "W"], 0, 2);
  apt("spatial", "A staircase ascends left-to-right in a photo. Mirrored horizontally, which way does it ascend?", ["Left-to-right", "Right-to-left", "Top-to-bottom", "Cannot be determined"], 1, 2);
  apt("spatial", "A map is oriented with North up. You face East, then turn 90\xB0 clockwise, then 180\xB0 anti-clockwise. Which direction are you facing?", ["North", "South", "East", "West"], 0, 3);
  const riasec = (dim, text) => qs.push({ id: id("PER"), sub_test: "personality", dimension: dim, text, options: null });
  riasec("R", "I enjoy fixing or building things with my hands \u2014 appliances, furniture, cycles, gadgets.");
  riasec("R", "I would rather work outdoors or in a lab/workshop than at a desk all day.");
  riasec("R", "Following technical manuals and getting a machine to work feels satisfying.");
  riasec("I", "I like taking things apart (physically or conceptually) to understand how they work.");
  riasec("I", "I enjoy solving puzzles, math problems or mysteries that need deep thinking.");
  riasec("I", "I often read or watch documentaries to learn things nobody asked me to learn.");
  riasec("I", "Before accepting a claim, I want to see the evidence.");
  riasec("A", "I express myself well through writing, drawing, music, or design.");
  riasec("A", "I would enjoy a job where I create original things rather than follow set procedures.");
  riasec("A", "Rules that limit my creativity feel frustrating to me.");
  riasec("S", "Friends often come to me when they need advice or someone to listen.");
  riasec("S", "I would find meaning in work that directly helps people live better lives.");
  riasec("S", "I enjoy teaching or explaining concepts to classmates.");
  riasec("S", "I notice when someone is feeling low, even when they say nothing.");
  riasec("E", "I am comfortable leading a group project or speaking in front of a class.");
  riasec("E", "I can usually convince people to see things my way.");
  riasec("E", "Taking a calculated risk excites me more than it scares me.");
  riasec("C", "I like it when my notes, files and schedule are neatly organized.");
  riasec("C", "I prefer clear instructions and checklists over open-ended assignments.");
  riasec("C", "Spotting errors in data or text is oddly satisfying to me.");
  const interest = (tag, text) => qs.push({ id: id("INT"), sub_test: "interest", dimension: tag, text, options: null });
  interest("coding", "Writing code or building a small app/website.");
  interest("electronics", "Taking apart gadgets or tinkering with circuits and robotics.");
  interest("building", "Constructing physical things \u2014 models, woodwork, machines.");
  interest("nature", "Working outdoors with plants, animals, or the environment.");
  interest("healthcare", "Caring for sick people and helping them recover.");
  interest("biology", "Studying how the human body or living organisms work.");
  interest("design", "Sketching, graphic design, or making things look beautiful.");
  interest("writing", "Writing stories, articles, or scripts.");
  interest("performing", "Performing on stage \u2014 acting, music, or dance.");
  interest("teaching", "Explaining a concept so well that someone finally gets it.");
  interest("leading", "Organising people and leading a team to deliver something.");
  interest("business", "Thinking about how businesses make (and lose) money.");
  interest("law", "Debating a position or digging into what is fair and just.");
  interest("organizing", "Bringing order to messy data, records, or processes.");
  interest("research", "Running experiments or researching a question nobody has answered.");
  interest("social_impact", "Working on problems like poverty, education, or climate.");
  interest("sports", "Sports, fitness, and physical training.");
  interest("travel", "Jobs that involve travel and meeting new cultures.");
  interest("food", "Cooking, food science, or hospitality.");
  interest("media", "Making videos, editing content, or telling stories visually.");
  return qs;
}
function scoreAssessment(questions, answers) {
  const riasecRaw = {};
  const aptCorrect = { numeric: { c: 0, t: 0 }, logical: { c: 0, t: 0 }, verbal: { c: 0, t: 0 }, spatial: { c: 0, t: 0 } };
  const interestsRaw = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (a == null) continue;
    if (q.sub_test === "aptitude") {
      const bucket = aptCorrect[q.dimension];
      bucket.t += 1;
      if (Number(a) === q.correct) bucket.c += 1;
    } else if (q.sub_test === "personality") {
      riasecRaw[q.dimension] = (riasecRaw[q.dimension] || 0) + (Number(a) - 3);
    } else if (q.sub_test === "interest") {
      interestsRaw[q.dimension] = (interestsRaw[q.dimension] || 0) + Number(a);
    }
  }
  const riasec = {};
  for (const d of ["R", "I", "A", "S", "E", "C"]) {
    const count = questions.filter((q) => q.sub_test === "personality" && q.dimension === d).length || 1;
    riasec[d] = Math.round(Math.max(0, Math.min(100, (riasecRaw[d] || 0) / (count * 2) * 100)));
  }
  const aptitude = {};
  for (const k of Object.keys(aptCorrect)) {
    const { c, t } = aptCorrect[k];
    aptitude[k] = t ? Math.round(c / t * 100) / 100 : 0.5;
  }
  const interestTags = {};
  for (const [k, v] of Object.entries(interestsRaw)) interestTags[k] = Math.round(v);
  return { riasec, aptitude, interestTags };
}
var SUBJECTS, GOALS, BUDGETS;
var init_questions = __esm({
  "server/seed/questions.js"() {
    init_dates();
    SUBJECTS = [
      "Physics",
      "Chemistry",
      "Mathematics",
      "Biology",
      "Computer Science",
      "Economics",
      "Accountancy",
      "Business Studies",
      "History",
      "Political Science",
      "Geography",
      "Psychology",
      "Fine Arts",
      "English",
      "Physical Education"
    ];
    GOALS = [
      { id: "high_earning", label: "High earning potential" },
      { id: "job_security", label: "Job security & stability" },
      { id: "creative_freedom", label: "Creative freedom" },
      { id: "social_impact", label: "Social impact / serving people" },
      { id: "research", label: "Research & discovering new things" },
      { id: "work_with_people", label: "Working with people" },
      { id: "work_with_technology", label: "Working with technology" },
      { id: "entrepreneurship", label: "Starting something of my own" },
      { id: "work_life_balance", label: "Work-life balance" },
      { id: "prestige", label: "Prestige & respect" }
    ];
    BUDGETS = [
      { id: "low", label: "Under \u20B91.5L/year \u2014 government colleges preferred" },
      { id: "medium", label: "\u20B91.5L\u20134L/year is workable" },
      { id: "high", label: "Above \u20B94L/year is possible (education loan okay)" }
    ];
  }
});

// server/seed/careers.js
function careerRows() {
  return RAW.map((c, i) => ({
    slug: c.sl,
    title: c.t,
    summary: c.sum,
    day_in_life: c.dil,
    skills_json: JSON.stringify(c.sk),
    subjects_json: JSON.stringify(c.sub),
    riasec_json: JSON.stringify(c.ri),
    goals_json: JSON.stringify(c.goals),
    salary_entry: c.se,
    salary_senior: c.ss,
    growth: c.gr,
    streams_json: JSON.stringify(c.st),
    education_json: JSON.stringify(c.edu),
    exams_json: JSON.stringify(c.ex),
    aptitude_json: JSON.stringify(c.apt),
    tags_json: JSON.stringify(c.tags),
    emerging: c.em,
    cost_band: c.cb,
    source: SRC_TEAM,
    // A handful of rows carry older as_of dates to exercise the staleness detector
    as_of: ["physician", "civil-engineer", "journalist", "chartered-accountant", "pilot"].includes(c.sl) ? staleDate() : freshDate(i % 2)
  }));
}
var ri, G, g, RAW;
var init_careers = __esm({
  "server/seed/careers.js"() {
    init_dates();
    ri = (p, s, extra = {}) => ({ [p]: 0.95, [s]: 0.6, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v])) });
    G = {
      he: "high_earning",
      js: "job_security",
      cf: "creative_freedom",
      si: "social_impact",
      rs: "research",
      wp: "work_with_people",
      wt: "work_with_technology",
      en: "entrepreneurship",
      wb: "work_life_balance",
      pr: "prestige"
    };
    g = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [G[k] || k, v]));
    RAW = [
      // ===================== TECHNOLOGY =====================
      { sl: "software-engineer", t: "Software Engineer", sum: "Designs, builds and maintains the software the world runs on \u2014 from apps to banking systems.", dil: "Write and review code, fix bugs, join team stand-ups, design systems with colleagues, ship features to millions of users.", sk: ["Programming", "Problem decomposition", "Data structures", "Communication"], sub: { Mathematics: 1, "Computer Science": 1, Physics: 0.5 }, ri: ri("I", "R", { C: 0.45, E: 0.25 }), goals: g({ he: 2, js: 1, wt: 2, en: 1, wb: 0, si: 0, cf: 0.5 }), se: "\u20B94\u201312 LPA", ss: "\u20B925\u201380+ LPA", gr: "high", st: ["Science"], edu: ["btech-cse", "bsc-cs", "bca"], ex: ["jee-main", "jee-advanced", "cuet-ug", "bitsat"], apt: { numeric: 0.6, logical: 0.9, verbal: 0.4 }, tags: { coding: 1, electronics: 0.5, organizing: 0.4, research: 0.4 }, em: 0, cb: "medium" },
      { sl: "data-scientist", t: "Data Scientist", sum: "Turns raw data into decisions \u2014 finding patterns that help companies predict, personalise and optimise.", dil: "Clean messy data, build statistical models, run experiments (A/B tests), present insights to non-technical teams.", sk: ["Statistics", "Python/R", "Machine learning", "Storytelling with data"], sub: { Mathematics: 1, "Computer Science": 0.8, Economics: 0.5 }, ri: ri("I", "C", { R: 0.35 }), goals: g({ he: 2, wt: 2, rs: 1, js: 1, cf: 0.3 }), se: "\u20B95\u201314 LPA", ss: "\u20B930\u201390 LPA", gr: "high", st: ["Science", "Commerce"], edu: ["bsc-stats", "bs-datascience", "btech-cse"], ex: ["jee-main", "cuet-ug", "isibang-stats"], apt: { numeric: 0.9, logical: 0.85, verbal: 0.4 }, tags: { coding: 0.8, research: 1, organizing: 0.7, business: 0.5 }, em: 0, cb: "medium" },
      { sl: "ai-ml-engineer", t: "AI / Machine Learning Engineer", sum: "Builds systems that learn from data \u2014 recommendation engines, vision systems, language models.", dil: "Train and evaluate models, wrangle datasets, optimise pipelines, keep up with a field that changes monthly.", sk: ["Math & linear algebra", "Python", "Deep learning frameworks", "Experimentation"], sub: { Mathematics: 1, "Computer Science": 1, Physics: 0.4 }, ri: ri("I", "R", { C: 0.4 }), goals: g({ he: 2, wt: 2, rs: 1.5, en: 0.5 }), se: "\u20B96\u201315 LPA", ss: "\u20B935\u2013100+ LPA", gr: "high", st: ["Science"], edu: ["btech-cse", "bs-datascience"], ex: ["jee-main", "jee-advanced", "bitsat"], apt: { numeric: 0.9, logical: 0.9 }, tags: { coding: 1, research: 0.9, electronics: 0.5 }, em: 1, cb: "medium" },
      { sl: "cybersecurity-analyst", t: "Cybersecurity Analyst", sum: "Defends organisations from digital attacks \u2014 monitoring systems, hunting threats, responding to breaches.", dil: "Monitor security alerts, investigate anomalies, run penetration tests, document incidents, patch vulnerabilities.", sk: ["Networking", "Operating systems", "Ethical hacking", "Calm under pressure"], sub: { "Computer Science": 1, Mathematics: 0.6 }, ri: ri("I", "C", { R: 0.5 }), goals: g({ he: 2, js: 1.5, wt: 2, pr: 0.5 }), se: "\u20B95\u201312 LPA", ss: "\u20B925\u201370 LPA", gr: "high", st: ["Science"], edu: ["btech-cse", "bsc-cs", "bca"], ex: ["jee-main", "cuet-ug"], apt: { logical: 0.85, numeric: 0.5, verbal: 0.4 }, tags: { coding: 0.9, electronics: 0.6, organizing: 0.5 }, em: 1, cb: "medium" },
      { sl: "game-developer", t: "Game Developer", sum: "Builds video games \u2014 programming gameplay, physics and graphics, blending code with creativity.", dil: "Implement game mechanics, tweak physics, optimise performance, playtest (yes, actually play), iterate with designers.", sk: ["C++/C#", "Game engines (Unity/Unreal)", "Math for graphics", "Iterating fast"], sub: { "Computer Science": 1, Mathematics: 0.8, Physics: 0.5 }, ri: ri("I", "A", { R: 0.5 }), goals: g({ he: 1, cf: 1.5, wt: 2, wb: 0 }), se: "\u20B93.5\u201310 LPA", ss: "\u20B920\u201360 LPA", gr: "medium", st: ["Science"], edu: ["btech-cse", "bsc-animation"], ex: ["jee-main", "uceed"], apt: { logical: 0.85, spatial: 0.7, numeric: 0.6 }, tags: { coding: 1, design: 0.7, media: 0.6 }, em: 0, cb: "medium" },
      { sl: "robotics-engineer", t: "Robotics Engineer", sum: "Designs machines that sense, think and move \u2014 factory robots, drones, surgical arms, rovers.", dil: "Design mechanisms, program controllers, wire sensors, test on real hardware, iterate when it (literally) falls over.", sk: ["Mechatronics", "Embedded programming", "Control systems", "Hands-on debugging"], sub: { Physics: 1, Mathematics: 1, "Computer Science": 0.7 }, ri: ri("R", "I", { C: 0.3 }), goals: g({ he: 1.5, wt: 2, rs: 1, js: 1 }), se: "\u20B94\u201310 LPA", ss: "\u20B920\u201365 LPA", gr: "high", st: ["Science"], edu: ["btech-mech", "btech-ece", "btech-cse"], ex: ["jee-main", "jee-advanced", "bitsat"], apt: { spatial: 0.8, logical: 0.8, numeric: 0.7 }, tags: { electronics: 1, building: 0.9, coding: 0.7, research: 0.5 }, em: 1, cb: "medium" },
      { sl: "product-manager", t: "Product Manager", sum: "Decides what a software product should do and why \u2014 the bridge between users, business and engineers.", dil: "Talk to users, analyse data, write specs, prioritise ruthlessly, align engineers and designers around a roadmap.", sk: ["User empathy", "Structured thinking", "Communication", "Basic analytics"], sub: { "Computer Science": 0.5, Economics: 0.8, "Business Studies": 0.7, Mathematics: 0.6 }, ri: ri("E", "I", { S: 0.5, C: 0.4 }), goals: g({ he: 2, en: 1, wp: 1.5, wt: 1, pr: 1 }), se: "\u20B98\u201320 LPA", ss: "\u20B940\u2013120 LPA", gr: "high", st: ["Science", "Commerce"], edu: ["btech-cse", "bba", "ba-economics"], ex: ["jee-main", "cuet-ug", "ipmat"], apt: { logical: 0.7, verbal: 0.8 }, tags: { leading: 1, business: 0.9, coding: 0.4, design: 0.5 }, em: 0, cb: "medium" },
      { sl: "data-analyst", t: "Data Analyst", sum: "Helps organisations understand their own numbers \u2014 dashboards, trends, and the story behind them.", dil: "Pull data with SQL, build dashboards, answer business questions, present findings that change decisions.", sk: ["SQL", "Excel mastery", "Visualisation", "Business sense"], sub: { Mathematics: 0.9, Economics: 0.8, "Computer Science": 0.5, "Business Studies": 0.5 }, ri: ri("C", "I", { E: 0.35 }), goals: g({ he: 1, js: 1.5, wt: 1, wb: 1 }), se: "\u20B93.5\u20139 LPA", ss: "\u20B915\u201345 LPA", gr: "medium", st: ["Commerce", "Science"], edu: ["bsc-stats", "bcom-hons", "bs-datascience"], ex: ["cuet-ug", "isibang-stats"], apt: { numeric: 0.85, logical: 0.7, verbal: 0.5 }, tags: { organizing: 1, business: 0.7, research: 0.6, coding: 0.4 }, em: 0, cb: "low" },
      // ===================== CORE ENGINEERING =====================
      { sl: "civil-engineer", t: "Civil Engineer", sum: "Designs and builds the physical world \u2014 bridges, metros, buildings, water systems.", dil: "Review drawings, run structural calculations, visit sites, supervise quality, coordinate contractors.", sk: ["Structural analysis", "CAD", "Site management", "Math"], sub: { Physics: 1, Mathematics: 1, Chemistry: 0.3 }, ri: ri("R", "I", { C: 0.5, E: 0.3 }), goals: g({ js: 1.5, he: 1, pr: 0.5, si: 1 }), se: "\u20B93\u20138 LPA", ss: "\u20B915\u201340 LPA", gr: "stable", st: ["Science"], edu: ["btech-civil"], ex: ["jee-main", "jee-advanced", "state-cet"], apt: { spatial: 0.85, numeric: 0.7, logical: 0.6 }, tags: { building: 1, organizing: 0.6, nature: 0.4 }, em: 0, cb: "low" },
      { sl: "mechanical-engineer", t: "Mechanical Engineer", sum: "Designs machines and systems that move \u2014 from car engines to factory lines to HVAC.", dil: "Model parts in CAD, run simulations, test prototypes on rigs, work with production teams.", sk: ["CAD/CAE", "Thermodynamics", "Manufacturing processes", "Hands-on testing"], sub: { Physics: 1, Mathematics: 1, Chemistry: 0.3 }, ri: ri("R", "I", { C: 0.45 }), goals: g({ js: 1.5, he: 1, wt: 0.5 }), se: "\u20B93\u20138 LPA", ss: "\u20B914\u201340 LPA", gr: "stable", st: ["Science"], edu: ["btech-mech"], ex: ["jee-main", "jee-advanced", "state-cet"], apt: { spatial: 0.85, numeric: 0.7, logical: 0.6 }, tags: { building: 1, electronics: 0.5, organizing: 0.4 }, em: 0, cb: "low" },
      { sl: "electrical-engineer", t: "Electrical Engineer", sum: "Works with power and electronics \u2014 grids, motors, circuits, and increasingly, clean energy.", dil: "Design circuits, run power-load calculations, test systems, visit installations, ensure safety compliance.", sk: ["Circuit theory", "Power systems", "Instrumentation", "Standards & safety"], sub: { Physics: 1, Mathematics: 1 }, ri: ri("R", "I", { C: 0.5 }), goals: g({ js: 1.5, he: 1, si: 0.5 }), se: "\u20B93\u20138 LPA", ss: "\u20B914\u201345 LPA", gr: "stable", st: ["Science"], edu: ["btech-ee"], ex: ["jee-main", "jee-advanced", "state-cet"], apt: { numeric: 0.75, logical: 0.7, spatial: 0.6 }, tags: { electronics: 1, building: 0.7 }, em: 0, cb: "low" },
      { sl: "chemical-engineer", t: "Chemical Engineer", sum: "Turns chemistry into industry \u2014 fuels, pharma, materials, food processing at scale.", dil: "Design processes, monitor plant runs, troubleshoot reactions, optimise yield and safety.", sk: ["Process design", "Thermodynamics", "Plant safety", "Analytics"], sub: { Chemistry: 1, Physics: 0.8, Mathematics: 0.9 }, ri: ri("I", "R", { C: 0.55 }), goals: g({ he: 1.5, js: 1.5, rs: 0.5 }), se: "\u20B93.5\u20139 LPA", ss: "\u20B916\u201345 LPA", gr: "stable", st: ["Science"], edu: ["btech-chem"], ex: ["jee-main", "jee-advanced"], apt: { numeric: 0.85, logical: 0.75 }, tags: { research: 0.7, organizing: 0.6, nature: 0.3 }, em: 0, cb: "medium" },
      { sl: "aerospace-engineer", t: "Aerospace Engineer", sum: "Designs aircraft and spacecraft \u2014 aerodynamics, propulsion, satellites, launch vehicles.", dil: "Run simulations, wind-tunnel tests, write design reports, work to extremely tight tolerances and standards.", sk: ["Aerodynamics", "CFD", "Systems engineering", "Precision math"], sub: { Physics: 1, Mathematics: 1 }, ri: ri("I", "R", { C: 0.5 }), goals: g({ he: 1.5, pr: 1.5, rs: 1, wt: 1 }), se: "\u20B94\u201310 LPA", ss: "\u20B920\u201360 LPA", gr: "medium", st: ["Science"], edu: ["btech-aero"], ex: ["jee-main", "jee-advanced"], apt: { numeric: 0.9, spatial: 0.8, logical: 0.85 }, tags: { building: 0.9, electronics: 0.6, research: 0.7 }, em: 0, cb: "medium" },
      { sl: "biotechnologist", t: "Biotechnologist", sum: "Uses living systems to build products \u2014 medicines, biofuels, GM crops, enzymes.", dil: "Run lab experiments, culture cells, analyse results, document everything, scale processes from bench to plant.", sk: ["Lab techniques", "Molecular biology", "Data analysis", "Patience"], sub: { Biology: 1, Chemistry: 1, Mathematics: 0.4 }, ri: ri("I", "R", { C: 0.4 }), goals: g({ rs: 2, si: 1, he: 0.5 }), se: "\u20B93\u20137 LPA", ss: "\u20B912\u201340 LPA", gr: "medium", st: ["Science"], edu: ["btech-biotech", "bsc-biotech"], ex: ["jee-main", "cuet-ug", "neet-ug"], apt: { logical: 0.7, numeric: 0.5 }, tags: { biology: 1, research: 1, nature: 0.6 }, em: 0, cb: "medium" },
      { sl: "environmental-scientist", t: "Environmental Scientist", sum: "Studies and protects the natural world \u2014 pollution, climate, conservation, sustainability.", dil: "Collect field samples, run analyses, model environmental impact, write reports that influence policy.", sk: ["Field methods", "GIS", "Environmental modelling", "Report writing"], sub: { Biology: 0.8, Chemistry: 0.8, Geography: 0.7, Physics: 0.4 }, ri: ri("I", "R", { S: 0.5 }), goals: g({ si: 2, rs: 1.5, wb: 1, he: 0 }), se: "\u20B93\u20137 LPA", ss: "\u20B912\u201335 LPA", gr: "high", st: ["Science"], edu: ["bsc-environmental", "bsc-agriculture"], ex: ["cuet-ug"], apt: { logical: 0.6, verbal: 0.6 }, tags: { nature: 1, research: 0.8, social_impact: 0.8 }, em: 1, cb: "low" },
      { sl: "renewable-energy-engineer", t: "Renewable Energy Engineer", sum: "Builds the clean-energy transition \u2014 solar farms, wind, storage, green hydrogen.", dil: "Site assessments, system design, energy-yield modelling, commissioning, performance monitoring.", sk: ["Energy systems", "Electrical basics", "Modelling", "Project work"], sub: { Physics: 1, Mathematics: 0.9, Chemistry: 0.5 }, ri: ri("R", "I", { S: 0.35 }), goals: g({ si: 1.5, he: 1, js: 1, wt: 1 }), se: "\u20B93.5\u20139 LPA", ss: "\u20B915\u201345 LPA", gr: "high", st: ["Science"], edu: ["btech-ee", "btech-chem"], ex: ["jee-main", "state-cet"], apt: { numeric: 0.75, logical: 0.7, spatial: 0.6 }, tags: { nature: 0.8, electronics: 0.8, building: 0.7 }, em: 1, cb: "medium" },
      // ===================== MEDICINE & HEALTH =====================
      { sl: "physician", t: "Doctor (Physician / Surgeon)", sum: "Diagnoses and treats patients \u2014 the most trusted, most demanding calling in healthcare.", dil: "Ward rounds, OPD consultations, diagnostics, procedures, night duties, constant learning. MBBS then MD/MS specialisation.", sk: ["Biology mastery", "Clinical reasoning", "Empathy", "Stamina"], sub: { Biology: 1, Chemistry: 0.9, Physics: 0.5 }, ri: ri("I", "S", { C: 0.35 }), goals: g({ si: 2, pr: 2, js: 2, he: 1, wb: -1.5 }), se: "\u20B96\u201312 LPA (post-MBBS)", ss: "\u20B925\u2013100+ LPA", gr: "stable", st: ["Science"], edu: ["mbbs", "bds"], ex: ["neet-ug"], apt: { logical: 0.8, verbal: 0.5, numeric: 0.4 }, tags: { healthcare: 1, biology: 1, social_impact: 0.8 }, em: 0, cb: "medium" },
      { sl: "nursing-officer", t: "Nursing Officer", sum: "The backbone of patient care \u2014 clinical skill plus human comfort, round the clock.", dil: "Administer medication, monitor patients, assist procedures, coordinate with doctors, support families.", sk: ["Clinical procedures", "Patient care", "Quick decisions", "Communication"], sub: { Biology: 1, Chemistry: 0.6, English: 0.5 }, ri: ri("S", "C", { I: 0.4 }), goals: g({ si: 2, js: 2, wp: 2, he: 0.5, wb: -1 }), se: "\u20B93\u20136 LPA", ss: "\u20B99\u201325 LPA", gr: "stable", st: ["Science"], edu: ["bsc-nursing"], ex: ["neet-ug", "cuet-ug"], apt: { logical: 0.5, verbal: 0.5 }, tags: { healthcare: 1, social_impact: 0.8, teaching: 0.4 }, em: 0, cb: "low" },
      { sl: "pharmacist", t: "Pharmacist", sum: "Expert in medicines \u2014 dispensing, safety, and increasingly, pharma research and regulation.", dil: "Verify prescriptions, counsel patients, manage inventory, ensure compliance, or work in pharma production/QA.", sk: ["Pharmacology", "Chemistry", "Attention to detail", "Counselling"], sub: { Chemistry: 1, Biology: 0.9, Physics: 0.3 }, ri: ri("C", "I", { S: 0.5 }), goals: g({ js: 2, he: 1, si: 1 }), se: "\u20B92.5\u20136 LPA", ss: "\u20B98\u201325 LPA", gr: "stable", st: ["Science"], edu: ["bpharm"], ex: ["neet-ug", "cuet-ug"], apt: { numeric: 0.5, logical: 0.5 }, tags: { healthcare: 0.9, biology: 0.7, organizing: 0.7 }, em: 0, cb: "medium" },
      { sl: "physiotherapist", t: "Physiotherapist", sum: "Restores movement and reduces pain \u2014 sports injuries, post-surgery rehab, neurological care.", dil: "Assess patients, design rehab plans, run therapy sessions, track recovery, coordinate with doctors.", sk: ["Anatomy", "Therapy techniques", "Patient motivation", "Hands-on skill"], sub: { Biology: 1, "Physical Education": 0.8, Chemistry: 0.4 }, ri: ri("S", "R", { I: 0.4 }), goals: g({ si: 1.5, wp: 1.5, wb: 1, en: 1 }), se: "\u20B92.5\u20136 LPA", ss: "\u20B98\u201330 LPA (own clinic)", gr: "medium", st: ["Science"], edu: ["bpt"], ex: ["neet-ug", "cuet-ug"], apt: { logical: 0.4, spatial: 0.4 }, tags: { healthcare: 1, sports: 0.9, social_impact: 0.6 }, em: 0, cb: "medium" },
      { sl: "clinical-psychologist", t: "Clinical Psychologist", sum: "Helps people heal their minds \u2014 assessment, therapy, and mental-health advocacy.", dil: "Conduct assessments, run therapy sessions, write case notes, work with psychiatrists and families.", sk: ["Active listening", "Assessment tools", "Ethics", "Patience"], sub: { Psychology: 1, Biology: 0.5, English: 0.6 }, ri: ri("S", "I", { A: 0.4 }), goals: g({ si: 2, wp: 2, rs: 1, wb: 0.5 }), se: "\u20B93\u20138 LPA", ss: "\u20B912\u201340 LPA", gr: "high", st: ["Arts", "Science"], edu: ["ba-psychology", "bsc-psychology"], ex: ["cuet-ug"], apt: { verbal: 0.7, logical: 0.5 }, tags: { healthcare: 0.9, social_impact: 0.9, teaching: 0.5, writing: 0.4 }, em: 0, cb: "low" },
      { sl: "nutritionist", t: "Nutritionist / Dietician", sum: "Uses food as medicine \u2014 clinical diets, sports nutrition, public-health programmes.", dil: "Assess patients, design diet plans, follow up, run awareness sessions, coordinate with doctors.", sk: ["Nutrition science", "Counselling", "Meal planning", "Biology"], sub: { Biology: 1, Chemistry: 0.7, "Physical Education": 0.5 }, ri: ri("S", "C", { I: 0.4 }), goals: g({ si: 1.5, wp: 1.5, wb: 1.5, en: 1 }), se: "\u20B92.5\u20136 LPA", ss: "\u20B98\u201325 LPA", gr: "medium", st: ["Science"], edu: ["bsc-nutrition"], ex: ["cuet-ug", "neet-ug"], apt: { logical: 0.4, verbal: 0.5 }, tags: { healthcare: 0.9, food: 0.9, sports: 0.5, social_impact: 0.5 }, em: 0, cb: "low" },
      { sl: "forensic-scientist", t: "Forensic Scientist", sum: "Applies science to justice \u2014 analysing evidence that decides court cases.", dil: "Examine evidence (DNA, fibres, digital), write precise reports, sometimes testify in court.", sk: ["Lab analysis", "Meticulous documentation", "Chain of custody", "Testifying clearly"], sub: { Chemistry: 1, Biology: 0.9, Physics: 0.5 }, ri: ri("I", "C", { R: 0.5 }), goals: g({ js: 1.5, pr: 1, si: 1.5, rs: 1 }), se: "\u20B93\u20137 LPA", ss: "\u20B910\u201330 LPA", gr: "stable", st: ["Science"], edu: ["bsc-forensic"], ex: ["cuet-ug"], apt: { logical: 0.7, numeric: 0.5, verbal: 0.5 }, tags: { research: 1, law: 0.7, organizing: 0.8, biology: 0.6 }, em: 0, cb: "low" },
      { sl: "public-health-professional", t: "Public Health Professional", sum: "Improves health at population scale \u2014 disease prevention programmes, policy, data-driven interventions.", dil: "Analyse health data, design and evaluate programmes, work with governments and NGOs, respond to outbreaks.", sk: ["Epidemiology basics", "Data analysis", "Programme management", "Communication"], sub: { Biology: 0.8, Economics: 0.5, Mathematics: 0.5 }, ri: ri("S", "I", { E: 0.45 }), goals: g({ si: 2, wp: 1.5, rs: 1, wb: 1 }), se: "\u20B93.5\u20138 LPA", ss: "\u20B912\u201335 LPA", gr: "high", st: ["Science", "Arts"], edu: ["bsc-nursing", "ba-psychology", "bsc-environmental"], ex: ["cuet-ug"], apt: { logical: 0.6, verbal: 0.6 }, tags: { social_impact: 1, healthcare: 0.8, research: 0.6, organizing: 0.6 }, em: 1, cb: "low" },
      // ===================== RESEARCH & ACADEMIA =====================
      { sl: "research-scientist", t: "Research Scientist", sum: "Pushes the frontiers of knowledge \u2014 in physics, chemistry, biology, or materials \u2014 through experiments and papers.", dil: "Design experiments, run them, fail, adjust, analyse data, write papers, present at conferences, write grants.", sk: ["Deep domain knowledge", "Experimental design", "Statistics", "Scientific writing"], sub: { Physics: 0.8, Chemistry: 0.8, Mathematics: 0.9, Biology: 0.6 }, ri: ri("I", "R", { C: 0.3 }), goals: g({ rs: 2, pr: 1, he: 0, wb: 0.5, si: 0.5 }), se: "\u20B96\u201312 LPA (PhD stipend \u2192 scientist)", ss: "\u20B918\u201360 LPA", gr: "stable", st: ["Science"], edu: ["bsc-physics", "bsc-chemistry", "bsc-maths", "bsc-biotech"], ex: ["cuet-ug", "jee-advanced", "nest"], apt: { numeric: 0.9, logical: 0.9 }, tags: { research: 1, nature: 0.4, organizing: 0.5 }, em: 0, cb: "low" },
      { sl: "professor", t: "Professor / Researcher (Academia)", sum: "Teaches and researches at a university \u2014 shaping a field and the next generation.", dil: "Deliver lectures, run a research group, mentor students, publish, serve on committees.", sk: ["Subject mastery", "Teaching", "Writing", "Mentoring"], sub: { English: 0.6, Physics: 0.5, Mathematics: 0.5, History: 0.4, "Political Science": 0.4, Psychology: 0.5 }, ri: ri("I", "S", { A: 0.4 }), goals: g({ rs: 1.5, wp: 1.5, pr: 1.5, he: 0.5, wb: 1 }), se: "\u20B96\u201312 LPA (entry)", ss: "\u20B918\u201350 LPA", gr: "stable", st: ["any"], edu: ["bsc-physics", "ba-history", "ba-economics"], ex: ["cuet-ug"], apt: { verbal: 0.8, logical: 0.6 }, tags: { teaching: 1, research: 0.9, writing: 0.6 }, em: 0, cb: "low" },
      { sl: "school-teacher", t: "School Teacher", sum: "Builds the foundation \u2014 shaping young minds with subject expertise and patience.", dil: "Plan lessons, teach classes, assess students, meet parents, run school activities.", sk: ["Subject knowledge", "Classroom management", "Empathy", "Communication"], sub: { English: 0.7, Mathematics: 0.5, History: 0.4, Biology: 0.4, "Political Science": 0.4 }, ri: ri("S", "C", { A: 0.4 }), goals: g({ si: 1.5, wp: 2, js: 2, wb: 1.5, he: 0 }), se: "\u20B93\u20136 LPA", ss: "\u20B98\u201320 LPA", gr: "stable", st: ["any"], edu: ["ba-english", "bsc-maths", "ba-history"], ex: ["cuet-ug"], apt: { verbal: 0.7 }, tags: { teaching: 1, social_impact: 0.8, writing: 0.4 }, em: 0, cb: "low" },
      // ===================== COMMERCE, FINANCE & BUSINESS =====================
      { sl: "chartered-accountant", t: "Chartered Accountant (CA)", sum: "The most trusted signature in Indian finance \u2014 audit, tax, and the numbers behind every business.", dil: "Audit accounts, file taxes, advise clients, review ledgers, clear the famously demanding CA exams level by level.", sk: ["Accounting mastery", "Tax law", "Discipline over years", "Integrity"], sub: { Accountancy: 1, Mathematics: 0.8, Economics: 0.7, "Business Studies": 0.7 }, ri: ri("C", "I", { E: 0.4 }), goals: g({ he: 2, pr: 1.5, js: 1.5, en: 1 }), se: "\u20B97\u201315 LPA (post-CA)", ss: "\u20B925\u2013100+ LPA", gr: "high", st: ["Commerce"], edu: ["bcom-hons", "bcom"], ex: ["cuet-ug"], apt: { numeric: 0.85, logical: 0.7, verbal: 0.4 }, tags: { organizing: 1, business: 0.9, law: 0.4 }, em: 0, cb: "low" },
      { sl: "financial-analyst", t: "Financial Analyst", sum: "Values companies and investments \u2014 models, markets, and the story in the numbers.", dil: "Build financial models, study markets, write research notes, defend your views in investment committees.", sk: ["Financial modelling", "Excel", "Economics", "Clear writing"], sub: { Mathematics: 0.9, Economics: 1, Accountancy: 0.8 }, ri: ri("C", "I", { E: 0.5 }), goals: g({ he: 2, pr: 0.5, js: 1, wb: 0 }), se: "\u20B95\u201312 LPA", ss: "\u20B925\u201380 LPA", gr: "high", st: ["Commerce", "Science"], edu: ["bcom-hons", "ba-economics", "bba"], ex: ["cuet-ug", "ipmat"], apt: { numeric: 0.9, logical: 0.7, verbal: 0.5 }, tags: { business: 1, organizing: 0.8 }, em: 0, cb: "medium" },
      { sl: "investment-banker", t: "Investment Banker", sum: "Advises on the biggest deals \u2014 IPOs, mergers, acquisitions. High intensity, high reward.", dil: "Build valuation models at speed, make pitch decks, work brutal hours, coordinate due diligence across time zones.", sk: ["Valuation", "Excel at elite level", "Stamina", "Client handling"], sub: { Mathematics: 0.9, Economics: 0.9, Accountancy: 0.7, English: 0.5 }, ri: ri("E", "C", { I: 0.5 }), goals: g({ he: 2.5, pr: 1.5, wb: -2, js: 0 }), se: "\u20B910\u201325 LPA", ss: "\u20B950\u2013200+ LPA", gr: "high", st: ["Commerce", "Science"], edu: ["bcom-hons", "ba-economics", "bba"], ex: ["cuet-ug", "ipmat"], apt: { numeric: 0.9, verbal: 0.6, logical: 0.8 }, tags: { business: 1, leading: 0.8, organizing: 0.6 }, em: 0, cb: "high" },
      { sl: "marketing-manager", t: "Marketing Manager", sum: "Builds brands and demand \u2014 campaigns, positioning, and understanding what makes people buy.", dil: "Study consumers, plan campaigns, manage budgets, work with creative teams, measure everything.", sk: ["Consumer psychology", "Storytelling", "Analytics", "Budgeting"], sub: { "Business Studies": 1, Economics: 0.8, English: 0.8 }, ri: ri("E", "A", { S: 0.4, C: 0.35 }), goals: g({ he: 1.5, en: 1, cf: 1, wp: 1 }), se: "\u20B94\u201310 LPA", ss: "\u20B920\u201370 LPA", gr: "high", st: ["Commerce", "Arts"], edu: ["bba", "bcom", "ba-economics"], ex: ["cuet-ug", "ipmat", "npat"], apt: { verbal: 0.8, logical: 0.5 }, tags: { business: 1, writing: 0.7, media: 0.8, leading: 0.6 }, em: 0, cb: "medium" },
      { sl: "digital-marketer", t: "Digital Marketing Specialist", sum: "Grows brands online \u2014 SEO, performance ads, content funnels, and data-driven experiments.", dil: "Run ad campaigns, write copy, A/B test landing pages, analyse funnels, chase the algorithm.", sk: ["SEO/SEM", "Copywriting", "Analytics tools", "Creativity with data"], sub: { "Business Studies": 0.8, English: 0.9, Economics: 0.5 }, ri: ri("E", "A", { C: 0.4 }), goals: g({ he: 1.5, en: 1.5, cf: 1, wb: 1 }), se: "\u20B93\u20138 LPA", ss: "\u20B912\u201350 LPA", gr: "high", st: ["any"], edu: ["bba", "ba-journalism", "bcom"], ex: ["cuet-ug", "npat"], apt: { verbal: 0.7, logical: 0.5 }, tags: { media: 1, business: 0.8, writing: 0.7 }, em: 1, cb: "low" },
      { sl: "entrepreneur", t: "Entrepreneur / Startup Founder", sum: "Builds something of your own \u2014 from a chai stall chain to a deep-tech startup.", dil: "Talk to customers, build the product, sell constantly, manage cash, hire, survive, repeat.", sk: ["Sales", "Resilience", "Product sense", "Cash-flow discipline"], sub: { "Business Studies": 1, Economics: 0.8, Mathematics: 0.6, "Computer Science": 0.4 }, ri: ri("E", "I", { C: 0.35, A: 0.35 }), goals: g({ en: 2.5, he: 1, wb: -1.5, pr: 1, cf: 1 }), se: "\u20B90 to everything (high variance)", ss: "Unbounded \u2014 or a hard-earned lesson", gr: "high", st: ["any"], edu: ["bba", "btech-cse", "bcom"], ex: ["cuet-ug", "jee-main"], apt: { logical: 0.6, verbal: 0.7 }, tags: { leading: 1, business: 1, media: 0.4 }, em: 0, cb: "low" },
      { sl: "hr-manager", t: "HR / People Manager", sum: "Builds organisations from the inside \u2014 hiring, culture, growth, and fair workplaces.", dil: "Interview candidates, design policies, resolve conflicts, run engagement programmes, advise leadership.", sk: ["Empathy with objectivity", "Labour law", "Communication", "Conflict resolution"], sub: { "Business Studies": 0.9, Psychology: 0.7, English: 0.7 }, ri: ri("S", "E", { C: 0.5 }), goals: g({ wp: 2, wb: 1.5, js: 1.5, si: 0.5 }), se: "\u20B94\u20139 LPA", ss: "\u20B918\u201360 LPA", gr: "stable", st: ["any"], edu: ["bba", "ba-psychology", "bcom"], ex: ["cuet-ug", "ipmat"], apt: { verbal: 0.8 }, tags: { leading: 0.8, organizing: 0.7, teaching: 0.5 }, em: 0, cb: "medium" },
      { sl: "bank-officer", t: "Bank Officer (PO)", sum: "Runs the engine of Indian banking \u2014 credit, customers, compliance \u2014 with a clear ladder upward.", dil: "Handle customer accounts, process loans, ensure compliance, manage a branch team on rotation.", sk: ["Quantitative aptitude", "Procedure & compliance", "Customer handling", "Discipline"], sub: { Mathematics: 0.8, Economics: 0.7, Accountancy: 0.7, English: 0.6 }, ri: ri("C", "E", { S: 0.45 }), goals: g({ js: 2, he: 1, pr: 0.5, wb: 1 }), se: "\u20B95\u20139 LPA", ss: "\u20B915\u201340 LPA", gr: "stable", st: ["Commerce", "Science", "Arts"], edu: ["bcom", "bba", "ba-economics"], ex: ["cuet-ug"], apt: { numeric: 0.75, logical: 0.7, verbal: 0.6 }, tags: { organizing: 0.9, business: 0.8 }, em: 0, cb: "low" },
      // ===================== LAW, CIVIL SERVICES & DEFENCE =====================
      { sl: "corporate-lawyer", t: "Corporate Lawyer", sum: "Structures the deals and disputes of business \u2014 contracts, mergers, courts, compliance.", dil: "Draft and review contracts, research case law, advise clients, negotiate, argue when needed.", sk: ["Argumentation", "Reading volume", "Drafting precision", "Ethics"], sub: { "Political Science": 0.8, English: 0.9, Economics: 0.5, History: 0.4 }, ri: ri("E", "I", { C: 0.5, S: 0.3 }), goals: g({ he: 2, pr: 1.5, js: 1, wb: -0.5 }), se: "\u20B95\u201315 LPA", ss: "\u20B930\u2013150 LPA", gr: "high", st: ["Arts", "Commerce"], edu: ["ba-llb", "bba-llb"], ex: ["clat", "ailet", "lsat-india"], apt: { verbal: 0.9, logical: 0.7 }, tags: { law: 1, leading: 0.6, writing: 0.8, business: 0.6 }, em: 0, cb: "high" },
      { sl: "judicial-officer", t: "Judicial Officer (Judge)", sum: "Decides cases fairly and independently \u2014 the highest calling of the legal system.", dil: "Hear arguments, examine evidence, apply the law, write reasoned judgments. Entry via judicial services exams after LLB.", sk: ["Legal reasoning", "Impartiality", "Patience", "Deep law knowledge"], sub: { "Political Science": 0.8, English: 0.8, History: 0.5 }, ri: ri("I", "C", { E: 0.35, S: 0.35 }), goals: g({ pr: 2, js: 2, si: 1.5, he: 1 }), se: "\u20B98\u201315 LPA (entry, judicial services)", ss: "\u20B925\u201355 LPA", gr: "stable", st: ["Arts", "Commerce"], edu: ["ba-llb"], ex: ["clat"], apt: { verbal: 0.85, logical: 0.75 }, tags: { law: 1, organizing: 0.7, writing: 0.6 }, em: 0, cb: "low" },
      { sl: "civil-services-officer", t: "Civil Services Officer (IAS/IPS/IFS)", sum: "Runs the country \u2014 administration, policy, and public service at the highest level, via UPSC.", dil: "Implement government programmes, manage districts or departments, respond to crises, carry immense responsibility.", sk: ["General awareness", "Administration", "Integrity under pressure", "Writing"], sub: { "Political Science": 0.8, History: 0.7, Geography: 0.6, Economics: 0.7, English: 0.6 }, ri: ri("E", "S", { I: 0.5, C: 0.4 }), goals: g({ pr: 2.5, si: 2, js: 2, he: 0.5, wb: -1 }), se: "\u20B98\u201314 LPA (plus perks & housing)", ss: "\u20B925\u201345 LPA (plus benefits)", gr: "stable", st: ["any"], edu: ["ba-polsci", "ba-history", "ba-economics", "bsc-agriculture"], ex: ["upsc-cse"], apt: { verbal: 0.85, logical: 0.6 }, tags: { leading: 1, social_impact: 1, law: 0.5, organizing: 0.6 }, em: 0, cb: "low" },
      { sl: "defence-officer", t: "Defence Officer (Army / Navy / Air Force)", sum: "Leads and serves in the armed forces \u2014 discipline, honour, and responsibility for people and nation.", dil: "Train relentlessly, lead troops or operations, handle equipment worth hundreds of crores, move every few years.", sk: ["Leadership", "Physical fitness", "Quick decisions", "Integrity"], sub: { "Physical Education": 1, Physics: 0.6, Mathematics: 0.6, English: 0.5 }, ri: ri("R", "E", { S: 0.4, C: 0.3 }), goals: g({ pr: 2, js: 2, si: 1.5, wb: -1.5, he: 0.5 }), se: "\u20B98\u201315 LPA (plus allowances)", ss: "\u20B925\u201345 LPA (plus benefits)", gr: "stable", st: ["Science", "Commerce", "Arts"], edu: ["nda-route", "btech-cse", "bsc-nautical"], ex: ["nda", "cds", "afcat"], apt: { logical: 0.6, spatial: 0.6, verbal: 0.5 }, tags: { sports: 1, leading: 0.9, travel: 0.8, social_impact: 0.6 }, em: 0, cb: "low" },
      // ===================== DESIGN & CREATIVE =====================
      { sl: "ux-designer", t: "UX / Product Designer", sum: "Designs how software feels \u2014 research, flows, and interfaces people actually enjoy using.", dil: "Interview users, sketch flows, design screens in Figma, test with real people, iterate with engineers.", sk: ["Empathy", "Figma & prototyping", "Visual design", "Clear communication"], sub: { "Fine Arts": 0.7, "Computer Science": 0.5, Psychology: 0.6, English: 0.5 }, ri: ri("A", "I", { S: 0.5, C: 0.3 }), goals: g({ cf: 2, he: 1.5, wt: 1, wb: 1 }), se: "\u20B94\u201310 LPA", ss: "\u20B925\u201380 LPA", gr: "high", st: ["any"], edu: ["bdes", "bdes-communication", "btech-cse"], ex: ["uceed", "nid-dat", "nift-gat"], apt: { spatial: 0.7, verbal: 0.6, logical: 0.5 }, tags: { design: 1, coding: 0.4, research: 0.6, media: 0.5 }, em: 0, cb: "medium" },
      { sl: "graphic-designer", t: "Graphic Designer", sum: "Communicates visually \u2014 brands, posters, packaging, social \u2014 where art meets message.", dil: "Brief with clients, explore concepts, design in Illustrator/Figma, iterate on feedback, manage multiple projects.", sk: ["Typography & colour", "Adobe suite", "Client handling", "Visual storytelling"], sub: { "Fine Arts": 1, English: 0.4 }, ri: ri("A", "C", { E: 0.35 }), goals: g({ cf: 2, wb: 1, en: 1.5, he: 0.5 }), se: "\u20B92.5\u20137 LPA", ss: "\u20B910\u201340 LPA (studio/freelance)", gr: "medium", st: ["any"], edu: ["bdes-communication", "bfa", "ba-fine-arts"], ex: ["nid-dat", "uceed", "nift-gat"], apt: { spatial: 0.7, verbal: 0.4 }, tags: { design: 1, media: 0.7, writing: 0.3 }, em: 0, cb: "medium" },
      { sl: "animator-vfx", t: "Animator / VFX Artist", sum: "Brings imagination to screen \u2014 films, games, and ads, frame by painstaking frame.", dil: "Animate shots, rig characters, light scenes, render, take director feedback, meet hard deadlines.", sk: ["Animation principles", "Software (Maya/Blender)", "Patience with detail", "Story sense"], sub: { "Fine Arts": 0.9, "Computer Science": 0.5, English: 0.4 }, ri: ri("A", "R", { I: 0.4, C: 0.35 }), goals: g({ cf: 2, he: 1, wt: 1, wb: 0 }), se: "\u20B93\u20138 LPA", ss: "\u20B912\u201350 LPA", gr: "medium", st: ["any"], edu: ["bsc-animation", "bdes"], ex: ["nid-dat", "uceed"], apt: { spatial: 0.85, logical: 0.5 }, tags: { media: 1, design: 0.8, coding: 0.3 }, em: 0, cb: "medium" },
      { sl: "fashion-designer", t: "Fashion Designer", sum: "Designs clothing and collections \u2014 where culture, craft, and commerce meet on fabric.", dil: "Research trends, sketch collections, source fabrics, oversee sampling, show at exhibitions, manage production.", sk: ["Sketching", "Fabric knowledge", "Trend awareness", "Business sense"], sub: { "Fine Arts": 1, "Business Studies": 0.4 }, ri: ri("A", "E", { R: 0.4 }), goals: g({ cf: 2, pr: 1.5, en: 1.5, wb: 0 }), se: "\u20B93\u20137 LPA", ss: "\u20B912\u201360 LPA (own label)", gr: "medium", st: ["any"], edu: ["bdes-fashion", "nift-bdes"], ex: ["nift-gat", "nid-dat"], apt: { spatial: 0.6, verbal: 0.4 }, tags: { design: 1, media: 0.6, business: 0.4 }, em: 0, cb: "medium" },
      { sl: "interior-designer", t: "Interior Designer", sum: "Shapes how spaces feel \u2014 homes, offices, cafes \u2014 balancing beauty, budget and function.", dil: "Meet clients, survey sites, draft layouts, select materials, supervise execution, handle budgets.", sk: ["Spatial thinking", "Materials knowledge", "Client management", "CAD"], sub: { "Fine Arts": 0.7, Mathematics: 0.4, Physics: 0.3 }, ri: ri("A", "R", { E: 0.45 }), goals: g({ cf: 1.5, en: 1.5, he: 1, wb: 1 }), se: "\u20B92.5\u20137 LPA", ss: "\u20B910\u201350 LPA (own studio)", gr: "medium", st: ["any"], edu: ["bsc-interior", "bdes"], ex: ["nid-dat", "nata"], apt: { spatial: 0.9, verbal: 0.4 }, tags: { design: 1, building: 0.6 }, em: 0, cb: "medium" },
      { sl: "architect", t: "Architect", sum: "Designs buildings and spaces \u2014 art and engineering in equal measure, licensed to build.", dil: "Concept design, drawings and models, client meetings, site visits, coordinate with engineers and contractors.", sk: ["Design vision", "Structural basics", "CAD/BIM", "Project management"], sub: { Mathematics: 0.7, Physics: 0.7, "Fine Arts": 0.8 }, ri: ri("A", "R", { I: 0.45, E: 0.35 }), goals: g({ cf: 1.5, pr: 1, he: 1, si: 0.5 }), se: "\u20B93\u20138 LPA", ss: "\u20B915\u201360 LPA", gr: "medium", st: ["Science"], edu: ["barch"], ex: ["nata", "jee-main"], apt: { spatial: 0.95, numeric: 0.5, logical: 0.5 }, tags: { design: 1, building: 0.9 }, em: 0, cb: "medium" },
      // ===================== MEDIA, WRITING & PERFORMANCE =====================
      { sl: "journalist", t: "Journalist", sum: "Reports and explains the world \u2014 holding power to account, telling stories that matter.", dil: "Chase stories, interview people, verify facts, write to deadline, sometimes report from the field.", sk: ["Curiosity", "Writing", "Interviewing", "Fact-checking"], sub: { English: 1, "Political Science": 0.7, History: 0.5, Economics: 0.5 }, ri: ri("A", "S", { E: 0.45, I: 0.4 }), goals: g({ si: 1.5, pr: 1, wb: 0, he: 0.5, cf: 1 }), se: "\u20B93\u20137 LPA", ss: "\u20B912\u201340 LPA", gr: "medium", st: ["Arts"], edu: ["ba-journalism", "ba-english"], ex: ["cuet-ug", "iimc-entrance"], apt: { verbal: 0.95, logical: 0.5 }, tags: { writing: 1, social_impact: 0.7, law: 0.4, travel: 0.5 }, em: 0, cb: "low" },
      { sl: "content-writer", t: "Content Writer / Strategist", sum: "Writes the words the internet runs on \u2014 blogs, brands, scripts, docs \u2014 increasingly with SEO in mind.", dil: "Research topics, write drafts, incorporate feedback, optimise for search, manage content calendars.", sk: ["Writing", "Research", "SEO", "Adapting tone"], sub: { English: 1, "Fine Arts": 0.3, Economics: 0.3 }, ri: ri("A", "C", { I: 0.45 }), goals: g({ cf: 1.5, wb: 1.5, he: 0.5, en: 1 }), se: "\u20B92.5\u20136 LPA", ss: "\u20B910\u201335 LPA", gr: "medium", st: ["any"], edu: ["ba-english", "ba-journalism"], ex: ["cuet-ug"], apt: { verbal: 0.9 }, tags: { writing: 1, media: 0.6, research: 0.5 }, em: 0, cb: "low" },
      { sl: "content-creator", t: "Digital Content Creator", sum: "Builds an audience with videos, posts or a newsletter \u2014 modern media entrepreneurship.", dil: "Ideate, shoot, edit, publish, engage with the community, analyse analytics, partner with brands.", sk: ["Storytelling", "Editing", "Consistency", "Audience empathy"], sub: { "Fine Arts": 0.5, English: 0.7, "Business Studies": 0.5 }, ri: ri("A", "E", { S: 0.4, C: 0.3 }), goals: g({ cf: 2, en: 2, wb: 1, pr: 1, he: 0.5 }), se: "\u20B90\u20135 LPA (volatile start)", ss: "\u20B910 LPA to several crores (top creators)", gr: "high", st: ["any"], edu: ["ba-journalism", "bsc-animation", "bba"], ex: ["cuet-ug"], apt: { verbal: 0.7 }, tags: { media: 1, writing: 0.6, design: 0.5, performing: 0.5 }, em: 1, cb: "low" },
      { sl: "performing-artist", t: "Actor / Performing Artist", sum: "Lives on stage and screen \u2014 acting, music, dance \u2014 craft plus courage plus relentless practice.", dil: "Rehearse for hours, audition constantly, perform, handle rejection, build a body of work.", sk: ["Performance craft", "Discipline", "Resilience to rejection", "Stage presence"], sub: { "Fine Arts": 1, "Physical Education": 0.6, English: 0.5 }, ri: ri("A", "S", { E: 0.5 }), goals: g({ cf: 2.5, pr: 1.5, wb: 0, js: -1 }), se: "\u20B92\u20138 LPA (highly variable)", ss: "Unbounded for the exceptional", gr: "high", st: ["any"], edu: ["bpa", "bfa", "ba-fine-arts"], ex: ["nsd-entrance", "cuet-ug"], apt: { verbal: 0.7, spatial: 0.4 }, tags: { performing: 1, media: 0.7, design: 0.3 }, em: 0, cb: "medium" },
      { sl: "author", t: "Author / Novelist", sum: "Writes books \u2014 fiction or non-fiction \u2014 that inform, move, and outlast their authors.", dil: "Write daily, rewrite endlessly, research, work with editors, promote your work, keep the day job early on.", sk: ["Writing craft", "Imagination or research depth", "Solitude tolerance", "Persistence"], sub: { English: 1, History: 0.4, "Fine Arts": 0.4 }, ri: ri("A", "I", { C: 0.3 }), goals: g({ cf: 2.5, wb: 1.5, pr: 1, he: 0 }), se: "\u20B91\u20134 LPA (advances, royalties)", ss: "Bestseller-level: \u20B950 LPA+", gr: "medium", st: ["any"], edu: ["ba-english", "ba-journalism"], ex: ["cuet-ug"], apt: { verbal: 0.9 }, tags: { writing: 1, research: 0.5, performing: 0.2 }, em: 0, cb: "low" },
      // ===================== SOCIAL IMPACT =====================
      { sl: "social-worker", t: "Social Worker", sum: "Stands with the vulnerable \u2014 child welfare, community development, mental health support.", dil: "Work in communities, assess needs, connect people to services, document cases, advocate for change.", sk: ["Empathy", "Case work", "Community organising", "Resilience"], sub: { Psychology: 0.7, "Political Science": 0.6, English: 0.5 }, ri: ri("S", "E", { I: 0.35 }), goals: g({ si: 2.5, wp: 2, wb: 1, he: -0.5 }), se: "\u20B92.5\u20135 LPA", ss: "\u20B98\u201320 LPA (NGO leadership)", gr: "stable", st: ["Arts"], edu: ["bsw", "ba-sociology", "ba-psychology"], ex: ["cuet-ug"], apt: { verbal: 0.7 }, tags: { social_impact: 1, teaching: 0.5, law: 0.3 }, em: 0, cb: "low" },
      { sl: "career-counsellor", t: "Career Counsellor", sum: "Guides students through exactly the decision you are making now \u2014 with empathy and evidence.", dil: "Assess students, listen deeply, interpret psychometrics, build personalised plans, coordinate with parents.", sk: ["Active listening", "Assessment literacy", "Guidance frameworks", "Ethics"], sub: { Psychology: 1, English: 0.6, "Political Science": 0.3 }, ri: ri("S", "I", { E: 0.4, C: 0.3 }), goals: g({ si: 2, wp: 2, wb: 1.5, js: 1.5, he: 0 }), se: "\u20B93\u20137 LPA", ss: "\u20B910\u201330 LPA", gr: "high", st: ["Arts", "Science"], edu: ["ba-psychology", "bsw"], ex: ["cuet-ug"], apt: { verbal: 0.8, logical: 0.4 }, tags: { teaching: 0.9, social_impact: 0.9, organizing: 0.4 }, em: 1, cb: "low" },
      // ===================== SPORTS, TRAVEL & HOSPITALITY =====================
      { sl: "athlete", t: "Professional Athlete / Sports Pro", sum: "Competes at the highest level \u2014 a life of discipline, training, and performing when it counts.", dil: "Train daily, follow nutrition and recovery plans, compete, review performance videos, manage injuries.", sk: ["Physical excellence", "Mental toughness", "Coachability", "Consistency"], sub: { "Physical Education": 1, Biology: 0.4 }, ri: ri("R", "E", { S: 0.35 }), goals: g({ pr: 2, he: 1, wb: -1, js: -1 }), se: "\u20B92\u20138 LPA (stipends/sponsorships)", ss: "Top level: crores + endorsements", gr: "high", st: ["any"], edu: ["bsc-sports-science", "bped"], ex: ["sports-trials", "cuet-ug"], apt: { spatial: 0.6, logical: 0.4 }, tags: { sports: 1, travel: 0.5, performing: 0.5 }, em: 0, cb: "low" },
      { sl: "pilot", t: "Commercial Pilot", sum: "Flies aircraft for airlines \u2014 precision, procedures, and the best office window in the world.", dil: "Pre-flight checks, fly by instruments and procedure, manage crew and passengers, constant simulator training.", sk: ["Spatial orientation", "Procedures discipline", "Calm under pressure", "Physics & math"], sub: { Physics: 1, Mathematics: 1, English: 0.6 }, ri: ri("R", "C", { I: 0.4 }), goals: g({ he: 2, pr: 1.5, wb: 0, js: 1 }), se: "\u20B915\u201325 LPA (post CPL + type rating)", ss: "\u20B950\u2013100+ LPA (captain)", gr: "medium", st: ["Science"], edu: ["cpl-training", "bsc-aviation"], ex: ["dgca-cpl"], apt: { spatial: 0.9, numeric: 0.7, logical: 0.7 }, tags: { travel: 1, electronics: 0.5, sports: 0.4 }, em: 0, cb: "high" },
      { sl: "merchant-navy", t: "Merchant Navy Officer", sum: "Runs cargo ships across the world's oceans \u2014 months at sea, serious pay, unmatched sunsets.", dil: "Stand watch on the bridge or in the engine room, maintain equipment, handle port operations, long contracts at sea.", sk: ["Technical discipline", "Sea- resilience", "Teamwork in confined quarters", "Navigation/engineering"], sub: { Physics: 0.9, Mathematics: 0.9, Chemistry: 0.5 }, ri: ri("R", "C", { I: 0.35 }), goals: g({ he: 2, wb: -1.5, travel: 2, js: 1 }), se: "\u20B96\u201312 LPA (starting)", ss: "\u20B925\u201380 LPA (chief officer/captain)", gr: "stable", st: ["Science"], edu: ["bsc-nautical", "btech-mech"], ex: ["imucet"], apt: { numeric: 0.7, spatial: 0.7, logical: 0.6 }, tags: { travel: 1, electronics: 0.6, building: 0.5 }, em: 0, cb: "high" },
      { sl: "hotel-manager", t: "Hotel Management Professional", sum: "Runs hospitality \u2014 guest experience, operations, and teams across the world's hotels.", dil: "Oversee front office, food & beverage, housekeeping; handle guest issues, budgets, events, staffing.", sk: ["Guest empathy", "Operations", "Team leadership", "Calm in chaos"], sub: { English: 0.8, "Business Studies": 0.7, "Fine Arts": 0.3 }, ri: ri("E", "S", { C: 0.5 }), goals: g({ wp: 1.5, he: 1, travel: 1.5, wb: -0.5, en: 0.5 }), se: "\u20B93\u20136 LPA", ss: "\u20B915\u201350 LPA (general manager)", gr: "stable", st: ["any"], edu: ["bhm"], ex: ["nchm-jee", "cuet-ug"], apt: { verbal: 0.7, logical: 0.4 }, tags: { food: 0.8, travel: 0.8, leading: 0.8 }, em: 0, cb: "medium" },
      { sl: "chef", t: "Chef", sum: "Creates food as craft and business \u2014 kitchens are hot, hierarchical, and deeply creative.", dil: "Prep stations, design menus, manage the line during service, control costs, train the brigade.", sk: ["Cooking technique", "Creativity under pressure", "Stamina", "Costing"], sub: { "Fine Arts": 0.4, Chemistry: 0.4, "Business Studies": 0.4 }, ri: ri("R", "A", { E: 0.45, C: 0.35 }), goals: g({ cf: 1.5, he: 1, en: 1.5, wb: -1.5 }), se: "\u20B92.5\u20136 LPA", ss: "\u20B912\u201360 LPA (executive chef / own restaurant)", gr: "medium", st: ["any"], edu: ["bhm", "culinary-diploma"], ex: ["nchm-jee"], apt: { spatial: 0.4, logical: 0.4 }, tags: { food: 1, design: 0.4, travel: 0.4 }, em: 0, cb: "medium" }
    ];
  }
});

// server/seed/courses.js
function courseRows() {
  return RAW2.map(([slug, name, level, duration, about], i) => ({
    slug,
    name,
    level,
    duration,
    about,
    careers_json: JSON.stringify([]),
    streams_json: JSON.stringify([]),
    source: SRC_TEAM,
    as_of: freshDate(i % 3)
  }));
}
var RAW2;
var init_courses = __esm({
  "server/seed/courses.js"() {
    init_dates();
    RAW2 = [
      // Engineering & Technology
      ["btech-cse", "B.Tech Computer Science & Engineering", "UG", "4 years", "The gateway to software, AI and data careers. Covers programming, algorithms, systems, and AI electives."],
      ["btech-ece", "B.Tech Electronics & Communication Engineering", "UG", "4 years", "Circuits, signals, embedded systems and communication tech \u2014 hardware-meets-software."],
      ["btech-mech", "B.Tech Mechanical Engineering", "UG", "4 years", "Machines, thermal systems, manufacturing and design \u2014 the broadest classical engineering branch."],
      ["btech-civil", "B.Tech Civil Engineering", "UG", "4 years", "Structures, construction, geotech, transportation and water resources."],
      ["btech-ee", "B.Tech Electrical Engineering", "UG", "4 years", "Power systems, machines, control and electronics \u2014 core to the energy transition."],
      ["btech-chem", "B.Tech Chemical Engineering", "UG", "4 years", "Process engineering for pharma, fuels, materials and food industries."],
      ["btech-aero", "B.Tech Aerospace Engineering", "UG", "4 years", "Aerodynamics, propulsion, structures and flight mechanics. Offered at few IITs/IIST."],
      ["btech-biotech", "B.Tech Biotechnology", "UG", "4 years", "Engineering applied to living systems \u2014 bioprocesses, genetics, bioinformatics."],
      ["btech-materials", "B.Tech Materials Engineering", "UG", "4 years", "The science of stuff \u2014 metals, polymers, semiconductors, nanomaterials."],
      ["bca", "BCA (Bachelor of Computer Applications)", "UG", "3 years", "Programming, databases, web development \u2014 a commerce/arts-friendly route into IT."],
      ["bsc-cs", "B.Sc Computer Science", "UG", "3 years", "Theory-first computing degree; pairs well with MSc or industry certifications."],
      ["bs-datascience", "BS Data Science & Applications (IIT Madras)", "UG", "4 years (online-friendly)", "IIT Madras's online BS \u2014 a JEE-optional route into data science, studied from anywhere."],
      ["integrated-mtech", "Integrated M.Tech (5-year)", "UG+PG", "5 years", "Combined B.Tech + M.Tech at select IITs \u2014 one admission, two degrees."],
      // Pure & Applied Science
      ["bsc-physics", "B.Sc Physics", "UG", "3 years", "From quantum to cosmology \u2014 the foundation for research and applied careers."],
      ["bsc-chemistry", "B.Sc Chemistry", "UG", "3 years", "Molecules, reactions and materials \u2014 lab-heavy and research-friendly."],
      ["bsc-maths", "B.Sc Mathematics", "UG", "3 years", "Proof, abstraction and problem-solving \u2014 the most transferable degree there is."],
      ["bsc-stats", "B.Sc Statistics", "UG", "3 years", "Data, probability and inference \u2014 ISI and top universities feed analytics and data science."],
      ["bsc-biotech", "B.Sc Biotechnology", "UG", "3 years", "Genetics, cell biology and lab techniques; typically followed by MSc for research roles."],
      ["bsc-microbiology", "B.Sc Microbiology", "UG", "3 years", "Bacteria, viruses and fungi \u2014 health, food and industrial applications."],
      ["bsc-forensic", "B.Sc Forensic Science", "UG", "3 years", "Crime-scene science: toxicology, ballistics, DNA analysis and documentation."],
      ["bsc-nutrition", "B.Sc Nutrition & Dietetics", "UG", "3 years", "Food science applied to health \u2014 clinical, sports and community nutrition."],
      ["bsc-environmental", "B.Sc Environmental Science", "UG", "3 years", "Ecology, pollution, climate and conservation science."],
      ["bsc-agriculture", "B.Sc Agriculture (B.Sc Hons Ag.)", "UG", "4 years", "Crop science, soil, agri-economics and agri-business \u2014 India's largest employment sector."],
      // Medicine & Health
      ["mbbs", "MBBS (Bachelor of Medicine & Surgery)", "UG", "5.5 years (incl. internship)", "The doctor route: pre-clinical, clinical, internship, then MD/MS specialisation."],
      ["bds", "BDS (Bachelor of Dental Surgery)", "UG", "5 years (incl. internship)", "Dental medicine and surgery \u2014 a clinical career via NEET."],
      ["bams", "BAMS (Ayurveda)", "UG", "5.5 years", "Ayurvedic medicine and surgery \u2014 AYUSH-recognised clinical practice."],
      ["bhms", "BHMS (Homeopathy)", "UG", "5.5 years", "Homeopathic medicine \u2014 AYUSH-recognised clinical practice."],
      ["bpharm", "B.Pharm", "UG", "4 years", "Pharmaceutics, pharmacology and chemistry \u2014 pharma industry and drug regulation."],
      ["bpt", "BPT (Bachelor of Physiotherapy)", "UG", "4.5 years (incl. internship)", "Movement science and rehabilitation \u2014 clinical + sports physio."],
      ["boptom", "B.Optom", "UG", "4 years", "Eye care \u2014 optics, refraction and clinical optometry."],
      ["bsc-nursing", "B.Sc Nursing", "UG", "4 years", "Clinical nursing science \u2014 the global-demand healthcare degree."],
      ["bsc-mlt", "B.Sc Medical Lab Technology", "UG", "3 years", "Diagnostics: pathology, microbiology and biochemistry lab work."],
      // Commerce, Business & Finance
      ["bcom", "B.Com", "UG", "3 years", "Accounting, tax and business law \u2014 the classic commerce degree."],
      ["bcom-hons", "B.Com (Hons)", "UG", "3 years", "The intensive commerce degree at SRCC and peers \u2014 feeds CA, MBA and finance."],
      ["bba", "BBA (Bachelor of Business Administration)", "UG", "3 years", "Management fundamentals \u2014 marketing, finance, HR, operations."],
      ["bms", "BMS (Bachelor of Management Studies)", "UG", "3 years", "Delhi University's management degree with entrance via CUET."],
      ["ba-economics", "BA/B.Sc (Hons) Economics", "UG", "3 years", "The most versatile social science \u2014 policy, finance, data and research."],
      ["bba-llb", "BBA LLB (Integrated)", "UG", "5 years", "Business + law in one integrated degree via CLAT and peers."],
      // Law
      ["ba-llb", "BA LLB (Integrated)", "UG", "5 years", "The standard law route after Class 12 \u2014 NLUs and top private schools via CLAT."],
      ["llb", "LLB (3-year, after graduation)", "UG", "3 years", "Law after any bachelor's degree."],
      // Design & Architecture
      ["barch", "B.Arch", "UG", "5 years", "The licensed architect route \u2014 design studios, structures, and a thesis year."],
      ["bdes", "B.Des", "UG", "4 years", "Industrial/product design at IITs (UCEED), NID and peers."],
      ["bdes-communication", "B.Des Communication Design", "UG", "4 years", "Graphic, interaction and visual communication design."],
      ["bdes-fashion", "B.Des Fashion Design", "UG", "4 years", "NIFT and peers \u2014 garment design, textiles and collections."],
      ["nift-bdes", "B.Des (NIFT \u2014 Fashion & Apparel)", "UG", "4 years", "NIFT's flagship fashion programmes across 18 campuses."],
      ["bfa", "BFA (Bachelor of Fine Arts)", "UG", "4 years", "Studio art \u2014 painting, sculpture, applied arts."],
      ["ba-fine-arts", "BA Fine Arts", "UG", "3 years", "University-route fine arts with theory alongside studio practice."],
      ["bsc-animation", "B.Sc Animation & VFX", "UG", "3 years", "3D, VFX pipelines and motion design for film and games."],
      ["bsc-interior", "B.Sc Interior Design", "UG", "3 years", "Space planning, materials and studio practice for interiors."],
      // Humanities & Social Sciences
      ["ba-psychology", "BA (Hons) Psychology", "UG", "3 years", "Mind and behaviour \u2014 the route to clinical, organisational and research psychology."],
      ["bsc-psychology", "B.Sc Psychology", "UG", "3 years", "Psychology with a science tilt \u2014 biology and statistics weighted."],
      ["ba-sociology", "BA (Hons) Sociology", "UG", "3 years", "Society, institutions and inequality \u2014 research and social-work adjacent."],
      ["ba-polsci", "BA (Hons) Political Science", "UG", "3 years", "Power, polity and ideas \u2014 a classic UPSC-friendly base."],
      ["ba-history", "BA (Hons) History", "UG", "3 years", "Evidence, narrative and the long view \u2014 academia, law, journalism."],
      ["ba-english", "BA (Hons) English", "UG", "3 years", "Literature and language \u2014 writing, media, teaching, civil services."],
      ["ba-philosophy", "BA (Hons) Philosophy", "UG", "3 years", "Logic and ethics \u2014 the best-kept secret for law, policy and research."],
      ["ba-geography", "BA (Hons) Geography", "UG", "3 years", "Space, environment and GIS \u2014 policy and planning friendly."],
      ["ba-journalism", "BA (Hons) Journalism & Mass Comm.", "UG", "3 years", "Reporting, editing and media production."],
      ["bsw", "BSW (Bachelor of Social Work)", "UG", "3 years", "Field-work-heavy degree for community and welfare careers."],
      ["ba-liberal", "BA Liberal Arts (FLAME/Ashoka/OP Jindal)", "UG", "3\u20134 years", "Multi-disciplinary first year before specialising \u2014 the US-style option."],
      // Media & Performance
      ["bpa", "BPA (Performing Arts)", "UG", "3\u20134 years", "Music, dance or theatre with rigorous practice and performance."],
      // Sports, Travel, Hospitality & Special Routes
      ["bhm", "BHM (Hotel Management)", "UG", "3\u20134 years", "Hospitality operations via NCHM JEE \u2014 hotels, F&B, events."],
      ["culinary-diploma", "Culinary Arts Diploma/Degree", "Diploma/UG", "1\u20133 years", "Kitchen-craft programmes (IHM, Culinary Academy of India) for the chef route."],
      ["bsc-aviation", "B.Sc Aviation", "UG", "3 years", "Pilot studies alongside DGCA ground subjects."],
      ["cpl-training", "CPL (Commercial Pilot Licence) training", "Licence", "18\u201324 months", "Flying-school route (IGRUA and peers) with DGCA exams \u2014 then airline type rating."],
      ["bped", "B.P.Ed", "UG", "3\u20134 years", "Physical education degree \u2014 teaching, coaching and sports management."],
      ["bsc-sports-science", "B.Sc Sports Science", "UG", "3 years", "Physiology, biomechanics and training science for the sports industry."],
      ["nda-route", "NDA (National Defence Academy) route", "Cadetship", "3 years NDA + 1 year academy", "Class 12 \u2192 NDA exam + SSB interview \u2192 commissioned officer."]
    ];
  }
});

// server/seed/exams.js
function examRows() {
  return RAW3.map(([slug, name, conducted_by, level, streams, about, timeline], i) => ({
    slug,
    name,
    conducted_by,
    level,
    streams_json: JSON.stringify(streams),
    about,
    timeline_json: JSON.stringify(timeline),
    source: SRC_NTA,
    as_of: ["neet-ug", "clat", "upsc-cse"].includes(slug) ? staleDate() : freshDate(i % 2)
  }));
}
var RAW3;
var init_exams = __esm({
  "server/seed/exams.js"() {
    init_dates();
    RAW3 = [
      ["jee-main", "JEE Main", "NTA", "National", ["Science"], "India's largest engineering entrance \u2014 gateway to NITs, IIITs, GFTIs and the JEE Advanced qualifier. 2 sessions/year.", { application_window: "Nov\u2013Dec & Feb (two sessions)", exam_months: "Jan & Apr", result_months: "Feb & May", attempts: "2 per year" }],
      ["jee-advanced", "JEE Advanced", "IIT (rotating)", "National", ["Science"], "The IIT entrance \u2014 only for top JEE Main rankers. One of the world's toughest exams.", { application_window: "Apr\u2013May (after JEE Main results)", exam_months: "May\u2013Jun", result_months: "Jun", attempts: "2 in 2 consecutive years" }],
      ["neet-ug", "NEET UG", "NTA", "National", ["Science"], "The single entrance for MBBS, BDS, AYUSH, nursing and more \u2014 Biology-heavy, one attempt per year.", { application_window: "Feb\u2013Mar", exam_months: "May", result_months: "Jun", attempts: "1 per year (as per current policy)" }],
      ["cuet-ug", "CUET UG", "NTA", "National", ["Science", "Commerce", "Arts"], "The common entrance for central and many state universities \u2014 DU, BHU, JNU, and 200+ more.", { application_window: "Feb\u2013Mar", exam_months: "May\u2013Jun", result_months: "Jul", attempts: "1 per year" }],
      ["bitsat", "BITSAT", "BITS Pilani", "National", ["Science"], "Computer-based entrance for BITS Pilani, Goa and Hyderabad campuses.", { application_window: "Jan\u2013Jun", exam_months: "May\u2013Jun (two sessions)", result_months: "Jun\u2013Jul", attempts: "2 sessions per year" }],
      ["viteee", "VITEEE", "VIT", "Institute", ["Science"], "VIT Vellore's own engineering entrance.", { application_window: "Nov\u2013Mar", exam_months: "Apr\u2013Jun", result_months: "Jun", attempts: "Multiple slots" }],
      ["comedk", "COMEDK UGET", "COMEDK", "State (Karnataka)", ["Science"], "Private-engineering-college entrance in Karnataka.", { application_window: "Feb\u2013Apr", exam_months: "May", result_months: "Jun", attempts: "1 per year" }],
      ["state-cet", "State CETs (MHT-CET, WBJEE, KCET, EAPCET\u2026)", "State boards", "State", ["Science"], "State-level engineering/pharmacy entrances \u2014 usually syllabus-aligned to the state board.", { application_window: "Dec\u2013Mar (varies by state)", exam_months: "Apr\u2013May", result_months: "May\u2013Jun", attempts: "1 per year" }],
      ["mht-cet", "MHT-CET", "Maharashtra CET Cell", "State (Maharashtra)", ["Science"], "Maharashtra's engineering and pharmacy entrance.", { application_window: "Dec\u2013Feb", exam_months: "Apr\u2013May", result_months: "Jun", attempts: "1 per year" }],
      ["wbjee", "WBJEE", "WBJEE Board", "State (West Bengal)", ["Science"], "West Bengal engineering entrance.", { application_window: "Dec\u2013Feb", exam_months: "Apr\u2013May", result_months: "May\u2013Jun", attempts: "1 per year" }],
      ["kcet", "KCET", "KEA", "State (Karnataka)", ["Science"], "Karnataka government-college engineering entrance.", { application_window: "Jan\u2013Mar", exam_months: "Apr\u2013May", result_months: "May\u2013Jun", attempts: "1 per year" }],
      ["clat", "CLAT", "Consortium of NLUs", "National", ["Arts", "Commerce"], "Entrance to the 24 National Law Universities for the 5-year integrated LLB.", { application_window: "Jul\u2013Nov", exam_months: "Dec", result_months: "Dec\u2013Jan", attempts: "1 per year" }],
      ["ailet", "AILET", "NLU Delhi", "Institute", ["Arts", "Commerce"], "NLU Delhi's own law entrance.", { application_window: "Aug\u2013Nov", exam_months: "Dec", result_months: "Dec\u2013Jan", attempts: "1 per year" }],
      ["lsat-india", "LSAT India", "LSAC", "Institute", ["Arts", "Commerce"], "Accepted by many private law schools (JGLS, etc.).", { application_window: "Aug\u2013Jan", exam_months: "Jan (multiple slots)", result_months: "Feb", attempts: "Multiple slots" }],
      ["nata", "NATA", "CoA (Council of Architecture)", "National", ["Science"], "The architecture entrance \u2014 aptitude + drawing, accepted alongside JEE/B.Arch routes.", { application_window: "Feb\u2013Jun", exam_months: "Apr\u2013Jul (multiple phases)", result_months: "Rolling per phase", attempts: "Multiple phases per year" }],
      ["uceed", "UCEED", "IIT Bombay", "National", ["any"], "Design entrance for B.Des at IIT Bombay, Delhi, Guwahati, Hyderabad, Roorkee + IIITDM Jabalpur.", { application_window: "Oct\u2013Nov", exam_months: "Jan", result_months: "Feb\u2013Mar", attempts: "2 in 2 consecutive years" }],
      ["nid-dat", "NID DAT", "NID Ahmedabad", "Institute", ["any"], "National Institute of Design's two-stage design entrance (Prelims + Mains).", { application_window: "Oct\u2013Dec", exam_months: "Dec\u2013Jan (Prelims)", result_months: "Feb (Prelims), Apr (Mains)", attempts: "3" }],
      ["nift-gat", "NIFT Entrance (GAT/CAT/Situation Test)", "NIFT", "Institute", ["any"], "Fashion-design entrance for NIFT's 18 campuses.", { application_window: "Nov\u2013Jan", exam_months: "Feb", result_months: "Mar\u2013Apr", attempts: "1 per year" }],
      ["ipmat", "IPMAT", "IIM Indore / IIM Rohtak / IIM Bodh Gaya", "Institute", ["any"], "The 5-year integrated-management-programme entrance straight after Class 12.", { application_window: "Feb\u2013Apr", exam_months: "May", result_months: "Jun", attempts: "1 per year" }],
      ["npat", "NPAT", "NMIMS", "Institute", ["Commerce", "any"], "NMIMS entrance for BBA, B.Sc Economics, analytics and more.", { application_window: "Dec\u2013May", exam_months: "Jan\u2013May (multiple)", result_months: "Rolling", attempts: "Multiple per year" }],
      ["set", "SET (Symbiosis Entrance)", "Symbiosis", "Institute", ["any"], "Symbiosis institutes' common entrance (BBA, BCA, BA mass comm, design).", { application_window: "Jan\u2013Apr", exam_months: "May", result_months: "May\u2013Jun", attempts: "1 per year" }],
      ["upsc-cse", "UPSC Civil Services Examination", "UPSC", "National", ["any"], "The IAS/IPS/IFS route \u2014 Prelims, Mains, Interview. Any graduate may sit; ~1,000 selected from lakhs.", { application_window: "Feb (notification + application)", exam_months: "May (Prelims), Sep (Mains)", result_months: "Jun (Prelims), Dec (Mains), final Apr\u2013May", attempts: "6 (General), 9 (OBC/PwD)" }],
      ["nda", "NDA (National Defence Academy) Exam", "UPSC + SSB", "National", ["Science", "any"], "Class 12 \u2192 NDA written + 5-day SSB interview \u2192 3 years at NDA \u2192 commissioned officer.", { application_window: "Dec & May", exam_months: "Apr & Sep", result_months: "May & Oct", attempts: "2 per year (within age limit)" }],
      ["cds", "CDS (Combined Defence Services)", "UPSC + SSB", "National", ["any"], "Graduate-route entry to IMA, INA, AFA and OTA.", { application_window: "Dec & Aug", exam_months: "Apr & Sep", result_months: "May & Oct", attempts: "2 per year (within age limit)" }],
      ["afcat", "AFCAT", "Indian Air Force", "National", ["any"], "Air Force officer entry (flying & ground duty) for graduates.", { application_window: "Dec & Jun", exam_months: "Feb & Aug", result_months: "Mar & Sep", attempts: "2 per year" }],
      ["nchm-jee", "NCHM JEE", "NTA", "National", ["any"], "The hotel-management entrance for IHMs and peers.", { application_window: "Feb\u2013Apr", exam_months: "May", result_months: "Jun", attempts: "1 per year" }],
      ["imucet", "IMU CET", "Indian Maritime University", "National", ["Science"], "Merchant-navy entrance for B.Sc Nautical Science and Marine Engineering.", { application_window: "Mar\u2013May", exam_months: "Jun", result_months: "Jul", attempts: "1 per year" }],
      ["nest", "NEST", "NISER Bhubaneswar + UM-DAE CEBS", "Institute", ["Science"], "Entrance for the elite research-focused BS-MS programmes at NISER and CEBS.", { application_window: "Jan\u2013Apr", exam_months: "Jun", result_months: "Jul", attempts: "1 per year" }],
      ["isibang-stats", "ISI Admission Test", "Indian Statistical Institute", "Institute", ["Science", "Commerce"], "Entrance to ISI's legendary B.Stat (Hons) programme.", { application_window: "Feb\u2013Apr", exam_months: "May", result_months: "Jun", attempts: "1 per year" }],
      ["dgca-cpl", "DGCA CPL exams + flying training", "DGCA", "Licence route", ["Science"], "Not one exam but a set: CPL ground subjects, 200 flying hours, medicals \u2014 then airline type rating.", { application_window: "Rolling (flying schools)", exam_months: "Rolling", result_months: "Rolling", attempts: "Multiple sittings" }],
      ["nsd-entrance", "NSD Entrance", "National School of Drama", "Institute", ["any"], "NSD's audition-based entry (usually after graduation for its flagship course; allied BA routes exist).", { application_window: "Mar\u2013May", exam_months: "May\u2013Jun (auditions)", result_months: "Jun\u2013Jul", attempts: "Per cycle" }],
      ["iimc-entrance", "IIMC Entrance (CUET-PG for journalism)", "IIMC / NTA", "Institute", ["any"], "Indian Institute of Mass Communication's PG-diploma entrance (post-graduation route).", { application_window: "Mar\u2013Apr", exam_months: "May\u2013Jun", result_months: "Jul", attempts: "1 per year" }],
      ["sports-trials", "Sports trials & Khelo India route", "SAI / Khelo India / university trials", "Route", ["any"], "Athlete pathways: Khelo India scholarships, SAI centres, university sports quotas \u2014 trials over written exams.", { application_window: "Varies by programme", exam_months: "Year-round trials", result_months: "Per programme", attempts: "Per event" }]
    ];
  }
});

// server/seed/colleges.js
function collegeRows() {
  return rows;
}
var slugify, rows, add, IIT_CITIES, NIT_CITIES, IIIT_CITIES, NIFT_CITIES, AIIMS_CITIES;
var init_colleges = __esm({
  "server/seed/colleges.js"() {
    init_dates();
    slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    rows = [];
    add = (name, city, state, type, streams, fees, exams, stale = false) => rows.push({ slug: slugify(name + "-" + city), name, city, state, type, streams_json: JSON.stringify(streams), approx_fees_per_year: fees, entrance_exams_json: JSON.stringify(exams), source: SRC_INST, as_of: stale ? staleDate() : freshDate(rows.length % 3) });
    IIT_CITIES = [
      ["Bombay", "Mumbai", "Maharashtra"],
      ["Delhi", "New Delhi", "Delhi"],
      ["Madras", "Chennai", "Tamil Nadu"],
      ["Kanpur", "Kanpur", "Uttar Pradesh"],
      ["Kharagpur", "Kharagpur", "West Bengal"],
      ["Roorkee", "Roorkee", "Uttarakhand"],
      ["Guwahati", "Guwahati", "Assam"],
      ["Hyderabad", "Sangareddy", "Telangana"],
      ["Indore", "Indore", "Madhya Pradesh"],
      ["Bhubaneswar", "Bhubaneswar", "Odisha"],
      ["Gandhinagar", "Gandhinagar", "Gujarat"],
      ["Jodhpur", "Jodhpur", "Rajasthan"],
      ["Mandi", "Mandi", "Himachal Pradesh"],
      ["Patna", "Patna", "Bihar"],
      ["Ropar", "Ropar", "Punjab"],
      ["Jammu", "Jammu", "J&K"],
      ["Dhanbad", "Dhanbad", "Jharkhand"],
      ["Bhilai", "Bhilai", "Chhattisgarh"],
      ["Goa", "Farmagudi", "Goa"],
      ["Palakkad", "Palakkad", "Kerala"],
      ["Tirupati", "Tirupati", "Andhra Pradesh"],
      ["Jalandhar", "Jalandhar", "Punjab"],
      ["Dharwad", "Dharwad", "Karnataka"]
    ];
    for (const [short, city, state] of IIT_CITIES) {
      const design = ["Bombay", "Delhi", "Guwahati", "Hyderabad", "Roorkee"].includes(short) ? ["Design"] : [];
      add(`IIT ${short}`, city, state, "IIT", ["Engineering", ...design], "\u2248 \u20B92.3L (general category)", ["JEE Advanced", "JEE Main"], short === "Dhanbad");
    }
    NIT_CITIES = [
      ["Trichy", "Tiruchirappalli", "Tamil Nadu"],
      ["Surathkal", "Mangaluru", "Karnataka"],
      ["Warangal", "Warangal", "Telangana"],
      ["Calicut", "Kozhikode", "Kerala"],
      ["Rourkela", "Rourkela", "Odisha"],
      ["Allahabad", "Prayagraj", "Uttar Pradesh"],
      ["Bhopal", "Bhopal", "Madhya Pradesh"],
      ["Jaipur", "Jaipur", "Rajasthan"],
      ["Jalandhar", "Jalandhar", "Punjab"],
      ["Durgapur", "Durgapur", "West Bengal"],
      ["Hamirpur", "Hamirpur", "Himachal Pradesh"],
      ["Kurukshetra", "Kurukshetra", "Haryana"],
      ["Silchar", "Silchar", "Assam"],
      ["Srinagar", "Srinagar", "J&K"],
      ["Agartala", "Agartala", "Tripura"],
      ["Itanagar", "Itanagar", "Arunachal Pradesh"],
      ["Delhi", "New Delhi", "Delhi"],
      ["Faridabad", "Faridabad", "Haryana"],
      ["Goa", "Farmagudi", "Goa"],
      ["Jamshedpur", "Jamshedpur", "Jharkhand"],
      ["Manipur", "Imphal", "Manipur"],
      ["Meghalaya", "Shillong", "Meghalaya"],
      ["Mizoram", "Aizawl", "Mizoram"],
      ["Nagaland", "Dimapur", "Nagaland"],
      ["Patna", "Patna", "Bihar"],
      ["Puducherry", "Karaikal", "Puducherry"],
      ["Raipur", "Raipur", "Chhattisgarh"],
      ["Sikkim", "Ravangla", "Sikkim"],
      ["Surat", "Surat", "Gujarat"],
      ["Uttarakhand", "Srinagar (Garhwal)", "Uttarakhand"],
      ["Andhra Pradesh", "Tadepalligudem", "Andhra Pradesh"]
    ];
    for (const [short, city, state] of NIT_CITIES) {
      add(`NIT ${short}`, city, state, "NIT", ["Engineering"], "\u2248 \u20B91.6L (general category)", ["JEE Main"]);
    }
    IIIT_CITIES = [
      ["Allahabad", "Prayagraj", "Uttar Pradesh"],
      ["Gwalior", "Gwalior", "Madhya Pradesh"],
      ["Jabalpur", "Jabalpur", "Madhya Pradesh"],
      ["Kancheepuram", "Chennai", "Tamil Nadu"],
      ["Sri City", "Sri City", "Andhra Pradesh"],
      ["Bangalore", "Bengaluru", "Karnataka"],
      ["Bhubaneswar", "Bhubaneswar", "Odisha"],
      ["Delhi", "New Delhi", "Delhi"],
      ["Guwahati", "Guwahati", "Assam"],
      ["Kota", "Kota", "Rajasthan"],
      ["Lucknow", "Lucknow", "Uttar Pradesh"],
      ["Nagpur", "Nagpur", "Maharashtra"],
      ["Pune", "Pune", "Maharashtra"],
      ["Sonepat", "Sonepat", "Haryana"],
      ["Surat", "Surat", "Gujarat"],
      ["Vadodara", "Vadodara", "Gujarat"],
      ["Dharwad", "Dharwad", "Karnataka"],
      ["Una", "Una", "Himachal Pradesh"],
      ["Bhagalpur", "Bhagalpur", "Bihar"],
      ["Agartala", "Agartala", "Tripura"],
      ["Raichur", "Raichur", "Karnataka"],
      ["Kalyani", "Kalyani", "West Bengal"],
      ["Manipur", "Imphal", "Manipur"],
      ["Kottayam", "Kottayam", "Kerala"],
      ["Srinagar", "Srinagar", "J&K"]
    ];
    for (const [short, city, state] of IIIT_CITIES) {
      add(`IIIT ${short}`, city, state, "IIIT", ["Engineering"], "\u2248 \u20B92.8L", ["JEE Main"]);
    }
    NIFT_CITIES = ["New Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Hyderabad", "Gandhinagar", "Rae Bareli", "Patna", "Bhopal", "Kannur", "Shillong", "Kangra", "Jodhpur", "Bhubaneswar", "Srinagar", "Panchkula", "Daman"];
    for (const city of NIFT_CITIES) {
      const state = city === "New Delhi" ? "Delhi" : city === "Panchkula" ? "Haryana" : city === "Daman" ? "Daman & Diu" : "";
      add(`NIFT ${city === "New Delhi" ? "Delhi" : city}`, city, state || city, "NIFT", ["Design"], "\u2248 \u20B92.9L", ["NIFT Entrance"], city === "Kangra");
    }
    AIIMS_CITIES = ["New Delhi", "Bhopal", "Bhubaneswar", "Jodhpur", "Patna", "Raipur", "Rishikesh", "Gorakhpur", "Bathinda", "Bibinagar", "Deoghar", "Guwahati", "Jammu", "Kalyani", "Mangalagiri", "Nagpur", "Rajkot", "Rae Bareli", "Shillong"];
    for (const city of AIIMS_CITIES) {
      const state = city === "New Delhi" ? "Delhi" : "";
      add(`AIIMS ${city === "New Delhi" ? "Delhi" : city}`, city, state || city, "AIIMS", ["Medicine"], "\u2248 \u20B91.6K\u20136K (govt fees)", ["NEET UG"], city === "Patna");
    }
    add("IISc Bangalore", "Bengaluru", "Karnataka", "Research Institute", ["Science"], "\u2248 \u20B980K\u20131L (UG: KVPY/NEET/JEE routes)", ["JEE Advanced", "NEET UG", "IISER Aptitude"]);
    add("IISER Pune", "Pune", "Maharashtra", "Research Institute", ["Science"], "\u2248 \u20B980K (aided by INSPIRE/DST scholarships)", ["IISER Aptitude"]);
    add("IISER Kolkata", "Mohankund", "West Bengal", "Research Institute", ["Science"], "\u2248 \u20B980K", ["IISER Aptitude"]);
    add("IISER Mohali", "Mohali", "Punjab", "Research Institute", ["Science"], "\u2248 \u20B980K", ["IISER Aptitude"]);
    add("IISER Bhopal", "Bhopal", "Madhya Pradesh", "Research Institute", ["Science"], "\u2248 \u20B980K", ["IISER Aptitude"]);
    add("IISER Thiruvananthapuram", "Thiruvananthapuram", "Kerala", "Research Institute", ["Science"], "\u2248 \u20B980K", ["IISER Aptitude"]);
    add("IISER Tirupati", "Tirupati", "Andhra Pradesh", "Research Institute", ["Science"], "\u2248 \u20B980K", ["IISER Aptitude"]);
    add("NISER Bhubaneswar", "Bhubaneswar", "Odisha", "Research Institute", ["Science"], "\u2248 \u20B980K (INSPIRE scholarship)", ["NEST"]);
    add("ISI Kolkata", "Kolkata", "West Bengal", "Research Institute", ["Science"], "\u2248 \u20B91L (generous scholarships)", ["ISI Admission Test"]);
    add("ISI Delhi", "New Delhi", "Delhi", "Research Institute", ["Science"], "\u2248 \u20B91L", ["ISI Admission Test"]);
    add("IIST Thiruvananthapuram", "Thiruvananthapuram", "Kerala", "Institute of National Importance", ["Engineering"], "\u2248 \u20B92.6L", ["JEE Advanced"]);
    add("IIM Indore (IPM)", "Indore", "Madhya Pradesh", "Management Institute", ["Commerce", "any"], "\u2248 \u20B95L (IPM programme)", ["IPMAT"]);
    add("IIM Rohtak (IPM)", "Rohtak", "Haryana", "Management Institute", ["Commerce", "any"], "\u2248 \u20B95.2L (IPM programme)", ["IPMAT"]);
    add("IIM Bodh Gaya (IPM)", "Bodh Gaya", "Bihar", "Management Institute", ["Commerce", "any"], "\u2248 \u20B94.5L (IPM programme)", ["IPMAT"], true);
    add("NLSIU Bangalore", "Bengaluru", "Karnataka", "National Law University", ["Law"], "\u2248 \u20B93.3L", ["CLAT"]);
    add("NALSAR Hyderabad", "Hyderabad", "Telangana", "National Law University", ["Law"], "\u2248 \u20B93L", ["CLAT"]);
    add("NLU Delhi", "New Delhi", "Delhi", "National Law University", ["Law"], "\u2248 \u20B93.2L", ["AILET"]);
    add("NLU Jodhpur", "Jodhpur", "Rajasthan", "National Law University", ["Law"], "\u2248 \u20B92.9L", ["CLAT"]);
    add("GNLU Gandhinagar", "Gandhinagar", "Gujarat", "National Law University", ["Law"], "\u2248 \u20B92.8L", ["CLAT"]);
    add("NLIU Bhopal", "Bhopal", "Madhya Pradesh", "National Law University", ["Law"], "\u2248 \u20B92.5L", ["CLAT"]);
    add("Jindal Global Law School", "Sonipat", "Haryana", "Private University", ["Law"], "\u2248 \u20B97.5L", ["LSAT India"]);
    add("Symbiosis Law School", "Pune", "Maharashtra", "Private University", ["Law"], "\u2248 \u20B95.5L", ["SLAT"]);
    add("ILS Law College", "Pune", "Maharashtra", "Government-Aided", ["Law"], "\u2248 \u20B950K\u20131L", ["MH-CET Law"]);
    add("Government Law College Mumbai", "Mumbai", "Maharashtra", "Government", ["Law"], "\u2248 \u20B915K\u201330K", ["MH-CET Law"]);
    add("NID Ahmedabad", "Ahmedabad", "Gujarat", "Institute of National Importance", ["Design"], "\u2248 \u20B93.4L", ["NID DAT"]);
    add("NID Bengaluru", "Bengaluru", "Karnataka", "NID Campus", ["Design"], "\u2248 \u20B93.2L", ["NID DAT"]);
    add("NID Gandhinagar", "Gandhinagar", "Gujarat", "NID Campus", ["Design"], "\u2248 \u20B93.2L", ["NID DAT"]);
    add("NID Kurukshetra", "Kurukshetra", "Haryana", "NID Campus", ["Design"], "\u2248 \u20B93.1L", ["NID DAT"]);
    add("NID Vijayawada", "Vijayawada", "Andhra Pradesh", "NID Campus", ["Design"], "\u2248 \u20B93.1L", ["NID DAT"]);
    add("NID Bhopal", "Bhopal", "Madhya Pradesh", "NID Campus", ["Design"], "\u2248 \u20B93.1L", ["NID DAT"]);
    add("SPA New Delhi", "New Delhi", "Delhi", "Institute of National Importance", ["Architecture"], "\u2248 \u20B92.2L", ["JEE Main (B.Arch)", "NATA"]);
    add("SPA Bhopal", "Bhopal", "Madhya Pradesh", "Institute of National Importance", ["Architecture"], "\u2248 \u20B92L", ["JEE Main (B.Arch)"]);
    add("CEPT Ahmedabad", "Ahmedabad", "Gujarat", "State University", ["Architecture", "Design"], "\u2248 \u20B92.9L", ["NATA", "CEPT Entrance"]);
    add("Sir JJ College of Architecture", "Mumbai", "Maharashtra", "Government", ["Architecture"], "\u2248 \u20B960K\u20131L", ["NATA", "MHT-CET"]);
    add("CMC Vellore", "Vellore", "Tamil Nadu", "Private (Christian Minority)", ["Medicine"], "\u2248 \u20B950K\u20132L (with service bond options)", ["NEET UG"]);
    add("JIPMER Puducherry", "Puducherry", "Puducherry", "Institute of National Importance", ["Medicine"], "\u2248 \u20B960K", ["NEET UG"]);
    add("AFMC Pune", "Pune", "Maharashtra", "Armed Forces Medical College", ["Medicine"], "\u2248 \u20B980K (with service commitment)", ["NEET UG"]);
    add("St. John's Medical College", "Bengaluru", "Karnataka", "Private (Minority)", ["Medicine"], "\u2248 \u20B96L", ["NEET UG"]);
    add("Manipal (MAHE) \u2014 Medicine", "Manipal", "Karnataka", "Private (Deemed)", ["Medicine"], "\u2248 \u20B920L+ (MBBS)", ["NEET UG"]);
    add("Maulana Azad Medical College", "New Delhi", "Delhi", "Government", ["Medicine"], "\u2248 \u20B915K", ["NEET UG"]);
    add("Lady Hardinge Medical College", "New Delhi", "Delhi", "Government", ["Medicine"], "\u2248 \u20B915K", ["NEET UG"]);
    add("GMC Mumbai (Seth GS)", "Mumbai", "Maharashtra", "Government", ["Medicine"], "\u2248 \u20B970K\u20131L", ["NEET UG"]);
    add("Patna Medical College", "Patna", "Bihar", "Government", ["Medicine"], "\u2248 \u20B930K\u201360K", ["NEET UG"]);
    add("IGIMS Patna", "Patna", "Bihar", "Government", ["Medicine"], "\u2248 \u20B960K", ["NEET UG"]);
    add("Delhi University (North Campus)", "New Delhi", "Delhi", "Central University", ["Commerce", "Arts", "Science"], "\u2248 \u20B915K\u201325K (most colleges)", ["CUET UG"]);
    add("St. Stephen's College", "New Delhi", "Delhi", "DU College", ["Arts", "Science"], "\u2248 \u20B945K", ["CUET UG"]);
    add("SRCC (Shri Ram College of Commerce)", "New Delhi", "Delhi", "DU College", ["Commerce"], "\u2248 \u20B930K", ["CUET UG"]);
    add("Hindu College", "New Delhi", "Delhi", "DU College", ["Arts", "Science", "Commerce"], "\u2248 \u20B925K", ["CUET UG"]);
    add("Lady Shri Ram College", "New Delhi", "Delhi", "DU College", ["Arts"], "\u2248 \u20B925K", ["CUET UG"]);
    add("LSR \u2014 Commerce", "New Delhi", "Delhi", "DU College", ["Commerce"], "\u2248 \u20B925K", ["CUET UG"]);
    add("Miranda House", "New Delhi", "Delhi", "DU College", ["Arts", "Science"], "\u2248 \u20B922K", ["CUET UG"]);
    add("Hansraj College", "New Delhi", "Delhi", "DU College", ["Science", "Arts", "Commerce"], "\u2248 \u20B925K", ["CUET UG"]);
    add("BHU Varanasi", "Varanasi", "Uttar Pradesh", "Central University", ["Arts", "Science", "Commerce"], "\u2248 \u20B915K\u201340K", ["CUET UG"]);
    add("Jadavpur University", "Kolkata", "West Bengal", "State University", ["Engineering", "Arts", "Science"], "\u2248 \u20B96K\u201310K", ["WBJEE", "CUET UG"], true);
    add("University of Hyderabad", "Hyderabad", "Telangana", "Central University", ["Science", "Arts"], "\u2248 \u20B920K\u201340K", ["CUET UG"]);
    add("Aligarh Muslim University", "Aligarh", "Uttar Pradesh", "Central University", ["Arts", "Science", "Commerce", "Law"], "\u2248 \u20B920K\u201350K", ["CUET UG", "AMU Entrance"]);
    add("Jamia Millia Islamia", "New Delhi", "Delhi", "Central University", ["Arts", "Engineering", "Law"], "\u2248 \u20B910K\u201350K", ["CUET UG"]);
    add("Punjab University (PU)", "Chandigarh", "Chandigarh", "State University", ["Arts", "Science", "Engineering"], "\u2248 \u20B915K\u201380K", ["PU CET / JAC Chandigarh"]);
    add("Presidency University Kolkata", "Kolkata", "West Bengal", "State University", ["Science", "Arts"], "\u2248 \u20B92K\u20135K", ["CUBET / WBJEE"]);
    add("Savitribai Phule Pune University", "Pune", "Maharashtra", "State University", ["Arts", "Science", "Commerce"], "\u2248 \u20B910K\u201330K", ["University entrance"]);
    add("St. Xavier's College Mumbai", "Mumbai", "Maharashtra", "Autonomous", ["Arts", "Science", "Commerce"], "\u2248 \u20B910K\u201325K", ["Merit + CUET (varies)"]);
    add("St. Xavier's College Kolkata", "Kolkata", "West Bengal", "Autonomous", ["Arts", "Science", "Commerce"], "\u2248 \u20B910K\u201325K", ["Merit-based"]);
    add("Loyola College Chennai", "Chennai", "Tamil Nadu", "Autonomous", ["Arts", "Science", "Commerce"], "\u2248 \u20B915K\u201340K", ["Merit-based"]);
    add("Christ University", "Bengaluru", "Karnataka", "Private (Deemed)", ["Commerce", "Arts", "Management"], "\u2248 \u20B91.5\u20132.5L", ["CUET / Christ Entrance"]);
    add("Ashoka University", "Sonipat", "Haryana", "Private (Liberal Arts)", ["Arts", "any"], "\u2248 \u20B98\u201310L (with aid options)", ["Ashoka own process (test+interview)"]);
    add("FLAME University", "Pune", "Maharashtra", "Private (Liberal Arts)", ["Arts", "any"], "\u2248 \u20B96\u20138L", ["FLAME Entrance Aptitude Test"]);
    add("OP Jindal Global University", "Sonipat", "Haryana", "Private University", ["Law", "Arts", "Business"], "\u2248 \u20B94\u20138L (varies by school)", ["JSAT / LSAT / own process"]);
    add("Symbiosis International", "Pune", "Maharashtra", "Private University", ["Management", "Design", "Law"], "\u2248 \u20B93\u20136L", ["SET / SLAT / SEED"]);
    add("NMIMS Mumbai", "Mumbai", "Maharashtra", "Private (Deemed)", ["Commerce", "Management"], "\u2248 \u20B93\u20134L", ["NPAT"]);
    add("BITS Pilani", "Pilani", "Rajasthan", "Private (Deemed)", ["Engineering"], "\u2248 \u20B95.3L", ["BITSAT"]);
    add("BITS Goa", "Zuarinagar", "Goa", "BITS Campus", ["Engineering"], "\u2248 \u20B95.3L", ["BITSAT"]);
    add("BITS Hyderabad", "Shamirpet", "Telangana", "BITS Campus", ["Engineering"], "\u2248 \u20B95.3L", ["BITSAT"]);
    add("VIT Vellore", "Vellore", "Tamil Nadu", "Private (Deemed)", ["Engineering"], "\u2248 \u20B92L", ["VITEEE"]);
    add("SRM Chennai (KTR)", "Kattankulathur", "Tamil Nadu", "Private (Deemed)", ["Engineering"], "\u2248 \u20B92.5\u20134.5L", ["SRMJEEE"]);
    add("Manipal (MAHE) \u2014 Engineering", "Manipal", "Karnataka", "Private (Deemed)", ["Engineering"], "\u2248 \u20B93.5\u20134.5L", ["MET (Manipal Entrance)"]);
    add("Amity Noida", "Noida", "Uttar Pradesh", "Private University", ["Engineering", "any"], "\u2248 \u20B92.5\u20133.5L", ["Amity JEE / direct"]);
    add("Thapar Institute (TIET)", "Patiala", "Punjab", "Private (Deemed)", ["Engineering"], "\u2248 \u20B93\u20134L", ["JEE Main"]);
    add("PSG Tech Coimbatore", "Coimbatore", "Tamil Nadu", "Government-Aided", ["Engineering"], "\u2248 \u20B950K\u20132L", ["TNEA counselling"]);
    add("COEP Pune", "Pune", "Maharashtra", "Government", ["Engineering"], "\u2248 \u20B980K\u20131L", ["MHT-CET"]);
    add("College of Engineering Guindy (CEG)", "Chennai", "Tamil Nadu", "Government", ["Engineering"], "\u2248 \u20B950K\u20131L", ["TNEA counselling"]);
    add("IIEST Shibpur", "Howrah", "West Bengal", "Institute of National Importance", ["Engineering"], "\u2248 \u20B91.3L", ["WBJEE / JEE Main"]);
    add("Delhi Technological University (DTU)", "New Delhi", "Delhi", "State University", ["Engineering"], "\u2248 \u20B92L", ["JEE Main"]);
    add("NSUT Delhi", "New Delhi", "Delhi", "State University", ["Engineering"], "\u2248 \u20B91.9L", ["JEE Main"]);
    add("Netaji Subhas University (IIT-Patna peer cluster)", "Jamshedpur", "Jharkhand", "State University", ["Engineering"], "\u2248 \u20B91L", ["JCECE"]);
    add("IHM Mumbai", "Mumbai", "Maharashtra", "Central Govt Institute", ["Hospitality"], "\u2248 \u20B91.4\u20132.4L", ["NCHM JEE"]);
    add("IHM Delhi", "New Delhi", "Delhi", "Central Govt Institute", ["Hospitality"], "\u2248 \u20B91.4\u20132.4L", ["NCHM JEE"]);
    add("Welcomgroup (Manipal) Hotel Management", "Manipal", "Karnataka", "Private", ["Hospitality"], "\u2248 \u20B93L", ["NCHM JEE / MET"]);
    add("IHM Catering (IHM-A) Chennai", "Chennai", "Tamil Nadu", "Central Govt Institute", ["Hospitality"], "\u2248 \u20B91.4\u20132.4L", ["NCHM JEE"]);
    add("IGRUA (flying school)", "Amethi (Fursatganj)", "Uttar Pradesh", "Government Flying School", ["Aviation"], "\u2248 \u20B945L (full CPL course)", ["IGRUA entrance + DGCA medicals"]);
    add("National School of Drama", "New Delhi", "Delhi", "Institute of National Importance", ["Performing Arts"], "\u2248 \u20B925K (subsidised)", ["NSD entrance + audition"]);
    add("FTII Pune", "Pune", "Maharashtra", "Institute of National Importance", ["Film & TV"], "\u2248 \u20B980K\u20131.5L", ["FTII JET"]);
    add("SRFTI Kolkata", "Kolkata", "West Bengal", "Institute of National Importance", ["Film & TV"], "\u2248 \u20B980K\u20131.5L", ["FTII JET"]);
    add("TISS Mumbai", "Mumbai", "Maharashtra", "Central University", ["Social Sciences", "Social Work"], "\u2248 \u20B940K\u20132L (varies)", ["TISS entrance (PG) / CUET (UG where applicable)"]);
    add("Loyola School of Business? \u2014 skip", "\u2014", "\u2014", "\u2014", ["\u2014"], "\u2014", []);
    rows.pop();
  }
});

// server/seed/colleges-web.js
function applyWebData(db3) {
  const ins = db3.prepare(`
    INSERT OR IGNORE INTO colleges
      (slug, name, city, state, type, streams_json, approx_fees_per_year, entrance_exams_json, nirf_rank, nirf_category, website, source, as_of)
    VALUES (@slug, @name, @city, @state, @type, @streams_json, @fees, @exams_json, @rank, @cat, @site, @source, @as_of)
  `);
  const upd = db3.prepare("UPDATE colleges SET nirf_rank = ?, nirf_category = ?, website = COALESCE(?, website) WHERE name = ?");
  let inserted = 0;
  for (const r of webCollegeRows) {
    const info = ins.run({
      slug: slugify2(`${r.name}-${r.city}`),
      name: r.name,
      city: r.city,
      state: r.state,
      type: r.type,
      streams_json: JSON.stringify(r.streams),
      fees: r.fees,
      exams_json: JSON.stringify(r.exams),
      rank: r.rank?.n ?? null,
      cat: r.rank?.c ?? null,
      site: r.site ?? null,
      source: SRC_NIRF,
      as_of: freshDate(1)
    });
    inserted += info.changes;
  }
  let annotated = 0;
  for (const [name, a] of Object.entries(rankAnnotations)) {
    const info = upd.run(a.rank, a.cat, a.site ?? null, name);
    annotated += info.changes;
  }
  return { inserted, annotated };
}
var SRC_NIRF, slugify2, CU, SU, PU, NLU, IIM, webCollegeRows, rankAnnotations;
var init_colleges_web = __esm({
  "server/seed/colleges-web.js"() {
    init_dates();
    SRC_NIRF = "NIRF India Rankings 2025 (Ministry of Education) + official institute websites";
    slugify2 = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    CU = "\u2248 \u20B95\u201325k/yr (heavily subsidised)";
    SU = "\u2248 \u20B93\u201320k/yr (state-subsidised)";
    PU = "\u2248 \u20B91.5\u20134L/yr (varies by programme)";
    NLU = "\u2248 \u20B92.5\u20133.5L/yr";
    IIM = "\u2248 \u20B912\u201327L (2-year MBA total)";
    webCollegeRows = [
      // ─────────── Central universities ───────────
      { name: "Jawaharlal Nehru University (JNU)", city: "New Delhi", state: "Delhi", type: "Central University", streams: ["Arts", "Science", "Social Sciences"], fees: "\u2248 \u20B9300\u20131k/yr (famously subsidised)", exams: ["CUET UG"], rank: { n: 2, c: "University" }, site: "jnu.ac.in" },
      { name: "University of Calcutta", city: "Kolkata", state: "West Bengal", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["Merit-based", "WBJEE"], rank: { n: 47, c: "Overall" }, site: "caluniv.ac.in" },
      { name: "University of Mumbai", city: "Mumbai", state: "Maharashtra", type: "State University", streams: ["Arts", "Science", "Commerce", "Engineering", "Law"], fees: SU, exams: ["Merit-based", "MHT-CET"], rank: { n: 54, c: "University" }, site: "mu.ac.in" },
      { name: "University of Madras", city: "Chennai", state: "Tamil Nadu", type: "State University", streams: ["Arts", "Science", "Commerce"], fees: SU, exams: ["Merit-based"] },
      { name: "Bangalore University", city: "Bengaluru", state: "Karnataka", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["Merit-based", "CUET UG"] },
      { name: "University of Lucknow", city: "Lucknow", state: "Uttar Pradesh", type: "State University", streams: ["Arts", "Science", "Commerce", "Law", "Management"], fees: SU, exams: ["LU entrance / CUET UG"], rank: { n: 29, c: "Law" }, site: "lkouniv.ac.in" },
      { name: "Patna University", city: "Patna", state: "Bihar", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["Merit-based"] },
      { name: "University of Allahabad", city: "Prayagraj", state: "Uttar Pradesh", type: "Central University", streams: ["Arts", "Science", "Commerce", "Law"], fees: CU, exams: ["CUET UG"] },
      { name: "Visva-Bharati University", city: "Santiniketan", state: "West Bengal", type: "Central University", streams: ["Arts", "Performing Arts", "Social Sciences"], fees: CU, exams: ["CUET UG"], site: "visvabharati.ac.in" },
      { name: "Pondicherry University", city: "Puducherry", state: "Puducherry", type: "Central University", streams: ["Arts", "Science", "Commerce", "Management"], fees: CU, exams: ["CUET UG"], site: "pondiuni.ac.in" },
      { name: "North-Eastern Hill University (NEHU)", city: "Shillong", state: "Meghalaya", type: "Central University", streams: ["Arts", "Science", "Social Sciences"], fees: CU, exams: ["CUET UG"] },
      { name: "Tezpur University", city: "Tezpur", state: "Assam", type: "Central University", streams: ["Engineering", "Science", "Arts"], fees: CU, exams: ["CUET UG / JEE Main"], site: "tezu.ernet.in" },
      { name: "Babasaheb Bhimrao Ambedkar University (BBAU)", city: "Lucknow", state: "Uttar Pradesh", type: "Central University", streams: ["Arts", "Science", "Management", "Law"], fees: CU, exams: ["CUET UG"], rank: { n: 69, c: "Overall" } },
      { name: "English and Foreign Languages University (EFLU)", city: "Hyderabad", state: "Telangana", type: "Central University", streams: ["Arts", "Social Sciences"], fees: CU, exams: ["CUET UG"] },
      { name: "Sikkim University", city: "Gangtok", state: "Sikkim", type: "Central University", streams: ["Arts", "Science", "Social Sciences"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of Jharkhand", city: "Ranchi", state: "Jharkhand", type: "Central University", streams: ["Arts", "Science", "Engineering", "Management"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of South Bihar", city: "Gaya", state: "Bihar", type: "Central University", streams: ["Arts", "Science", "Law"], fees: CU, exams: ["CUET UG"], rank: { n: 23, c: "Law" } },
      { name: "Central University of Rajasthan", city: "Ajmer", state: "Rajasthan", type: "Central University", streams: ["Arts", "Science", "Engineering"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of Gujarat", city: "Gandhinagar", state: "Gujarat", type: "Central University", streams: ["Arts", "Science", "Social Sciences"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of Tamil Nadu", city: "Thiruvarur", state: "Tamil Nadu", type: "Central University", streams: ["Arts", "Science"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of Punjab", city: "Bathinda", state: "Punjab", type: "Central University", streams: ["Arts", "Science", "Engineering"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of Karnataka", city: "Kalaburagi", state: "Karnataka", type: "Central University", streams: ["Arts", "Science"], fees: CU, exams: ["CUET UG"] },
      { name: "Central University of Haryana", city: "Mahendragarh", state: "Haryana", type: "Central University", streams: ["Arts", "Science", "Law"], fees: CU, exams: ["CUET UG"] },
      { name: "IGNOU (Indira Gandhi National Open University)", city: "New Delhi", state: "Delhi", type: "Central University", streams: ["Arts", "Science", "Commerce", "Management"], fees: "\u2248 \u20B92\u201315k per programme", exams: ["Open admission (no entrance for most)"], site: "ignou.ac.in" },
      { name: "Homi Bhabha National Institute (HBNI)", city: "Mumbai", state: "Maharashtra", type: "Research Institute", streams: ["Science", "Engineering"], fees: "Fellowship-supported (DAE institutions)", exams: ["GATE / institute selection"], rank: { n: 12, c: "University" } },
      { name: "Indian Agricultural Research Institute (IARI)", city: "New Delhi", state: "Delhi", type: "Research Institute", streams: ["Agriculture", "Science"], fees: "\u2248 \u20B930\u201360k/yr", exams: ["ICAR AIEEA (UG)"], rank: { n: 16, c: "University" } },
      { name: "University of Kashmir", city: "Srinagar", state: "J&K", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["CUET UG"], rank: { n: 59, c: "Overall" } },
      { name: "University of Jammu", city: "Jammu", state: "J&K", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["CUET UG"], rank: { n: 87, c: "Overall" } },
      { name: "Osmania University", city: "Hyderabad", state: "Telangana", type: "State University", streams: ["Arts", "Science", "Commerce", "Engineering", "Law"], fees: SU, exams: ["OUCET / TS EAMCET"], rank: { n: 53, c: "Overall" }, site: "osmania.ac.in" },
      { name: "Andhra University", city: "Visakhapatnam", state: "Andhra Pradesh", type: "State University", streams: ["Arts", "Science", "Engineering", "Law"], fees: SU, exams: ["AP EAPCET"], rank: { n: 23, c: "University" }, site: "andhrauniversity.edu.in" },
      { name: "University of Kerala", city: "Thiruvananthapuram", state: "Kerala", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["Merit-based"], rank: { n: 25, c: "University" } },
      { name: "Mahatma Gandhi University", city: "Kottayam", state: "Kerala", type: "State University", streams: ["Arts", "Science", "Commerce"], fees: SU, exams: ["Merit-based"], rank: { n: 79, c: "Overall" } },
      { name: "Maharaja Sayajirao University of Baroda", city: "Vadodara", state: "Gujarat", type: "State University", streams: ["Arts", "Science", "Commerce", "Performing Arts"], fees: SU, exams: ["Merit-based"] },
      { name: "Goa University", city: "Panaji", state: "Goa", type: "State University", streams: ["Arts", "Science", "Commerce", "Management"], fees: SU, exams: ["Merit-based"] },
      { name: "Utkal University", city: "Bhubaneswar", state: "Odisha", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["Merit-based"] },
      { name: "Gauhati University", city: "Guwahati", state: "Assam", type: "State University", streams: ["Arts", "Science", "Commerce", "Law"], fees: SU, exams: ["Merit-based"], rank: { n: 33, c: "University" } },
      { name: "Punjab Agricultural University (PAU)", city: "Ludhiana", state: "Punjab", type: "State University", streams: ["Agriculture", "Science", "Engineering"], fees: "\u2248 \u20B950\u201390k/yr", exams: ["PAU CET / ICAR AIEEA"], rank: { n: 81, c: "Overall" } },
      { name: "Tamil Nadu Agricultural University (TNAU)", city: "Coimbatore", state: "Tamil Nadu", type: "State University", streams: ["Agriculture", "Science"], fees: "\u2248 \u20B940\u201380k/yr", exams: ["TNAU counselling / ICAR AIEEA"], rank: { n: 88, c: "Overall" } },
      // ─────────── Private / deemed universities (NIRF-ranked) ───────────
      { name: "Amrita Vishwa Vidyapeetham", city: "Coimbatore", state: "Tamil Nadu", type: "Private (Deemed)", streams: ["Engineering", "Medicine", "Business", "Science"], fees: "\u2248 \u20B92\u20134L/yr (varies by programme)", exams: ["AEEE (Amrita) / JEE Main", "NEET UG"], rank: { n: 8, c: "University" }, site: "amrita.edu" },
      { name: "Siksha 'O' Anusandhan (SOA)", city: "Bhubaneswar", state: "Odisha", type: "Private (Deemed)", streams: ["Engineering", "Medicine", "Law", "Management"], fees: "\u2248 \u20B92\u20134L/yr", exams: ["SAAT / JEE Main", "NEET UG"], rank: { n: 15, c: "University" }, site: "soa.ac.in" },
      { name: "Kalinga Institute of Industrial Technology (KIIT)", city: "Bhubaneswar", state: "Odisha", type: "Private (Deemed)", streams: ["Engineering", "Law", "Management"], fees: "\u2248 \u20B92\u20134L/yr", exams: ["KIITEE"], rank: { n: 17, c: "University" }, site: "kiit.ac.in" },
      { name: "Chandigarh University", city: "Mohali", state: "Punjab", type: "Private University", streams: ["Engineering", "Business", "Law"], fees: PU, exams: ["CUCET (Chandigarh Univ) / JEE Main"], rank: { n: 19, c: "University" }, site: "cuchd.in" },
      { name: "JSS Academy of Higher Education & Research", city: "Mysuru", state: "Karnataka", type: "Private (Deemed)", streams: ["Engineering", "Medicine", "Management"], fees: PU, exams: ["JEE Main / COMEDK", "NEET UG"], rank: { n: 21, c: "University" } },
      { name: "Saveetha Institute of Medical and Technical Sciences", city: "Chennai", state: "Tamil Nadu", type: "Private (Deemed)", streams: ["Medicine", "Engineering"], fees: "\u2248 \u20B92\u20135L/yr (varies hugely by programme)", exams: ["NEET UG"], rank: { n: 13, c: "University" } },
      { name: "Lovely Professional University (LPU)", city: "Phagwara", state: "Punjab", type: "Private University", streams: ["Engineering", "Business", "Law", "Design", "Arts"], fees: "\u2248 \u20B91.2\u20133L/yr", exams: ["LPUNEST / JEE Main"], rank: { n: 31, c: "University" }, site: "lpu.in" },
      { name: "Cochin University of Science and Technology (CUSAT)", city: "Kochi", state: "Kerala", type: "State University", streams: ["Engineering", "Science"], fees: "\u2248 \u20B960k\u20131.5L/yr", exams: ["CUSAT CAT"], rank: { n: 32, c: "University" } },
      { name: "Sathyabama Institute of Science and Technology", city: "Chennai", state: "Tamil Nadu", type: "Private (Deemed)", streams: ["Engineering", "Law", "Design"], fees: "\u2248 \u20B91.5\u20133L/yr", exams: ["SAEEE / JEE Main"], rank: { n: 53, c: "University" } },
      { name: "Shiv Nadar University", city: "Greater Noida", state: "Uttar Pradesh", type: "Private University", streams: ["Engineering", "Arts", "Science", "Management"], fees: "\u2248 \u20B93\u20134L/yr", exams: ["SNU entrance / JEE Main"], rank: { n: 57, c: "University" }, site: "snu.edu.in" },
      { name: "UPES (University of Petroleum and Energy Studies)", city: "Dehradun", state: "Uttarakhand", type: "Private University", streams: ["Engineering", "Business", "Law", "Design"], fees: "\u2248 \u20B93\u20134L/yr", exams: ["UPESEAT / JEE Main"], rank: { n: 64, c: "Overall" }, site: "upes.ac.in" },
      { name: "Graphic Era University", city: "Dehradun", state: "Uttarakhand", type: "Private (Deemed)", streams: ["Engineering", "Business"], fees: "\u2248 \u20B92\u20133L/yr", exams: ["GEU entrance / JEE Main"], rank: { n: 72, c: "Overall" } },
      { name: "Koneru Lakshmaiah Education Foundation (KLEF)", city: "Vaddeswaram", state: "Andhra Pradesh", type: "Private (Deemed)", streams: ["Engineering", "Business", "Law"], fees: "\u2248 \u20B92\u20134L/yr", exams: ["KLEEE"], rank: { n: 46, c: "Overall" } },
      { name: "Manipal University Jaipur", city: "Jaipur", state: "Rajasthan", type: "Private University", streams: ["Engineering", "Business", "Design", "Law"], fees: "\u2248 \u20B92\u20134L/yr", exams: ["MET (Manipal Entrance)"], rank: { n: 98, c: "Overall" }, site: "jaipur.manipal.edu" },
      { name: "SASTRA University", city: "Thanjavur", state: "Tamil Nadu", type: "Private (Deemed)", streams: ["Engineering", "Law", "Science"], fees: "\u2248 \u20B91.5\u20133L/yr", exams: ["JEE Main + Class 12 (SASTRA merit)"], rank: { n: 11, c: "Law" } },
      { name: "Kalasalingam Academy of Research and Education", city: "Krishnankoil", state: "Tamil Nadu", type: "Private (Deemed)", streams: ["Engineering"], fees: "\u2248 \u20B91.5\u20133L/yr", exams: ["Kalasalingam entrance / JEE Main"], rank: { n: 33, c: "Engineering" } },
      { name: "Bennett University", city: "Greater Noida", state: "Uttar Pradesh", type: "Private University", streams: ["Engineering", "Business", "Law", "Design"], fees: "\u2248 \u20B93\u20135L/yr", exams: ["Bennett entrance / JEE Main"], site: "bennett.edu.in" },
      { name: "Azim Premji University", city: "Bengaluru", state: "Karnataka", type: "Private University", streams: ["Arts", "Science", "Social Sciences", "Education"], fees: "\u2248 \u20B94\u20136L/yr (generous aid available)", exams: ["Azim Premji Univ entrance"] },
      { name: "Krea University", city: "Sri City", state: "Andhra Pradesh", type: "Private University", streams: ["Arts", "Science", "Business"], fees: "\u2248 \u20B95\u20137L/yr (aid available)", exams: ["Krea entrance (test + interview)"], site: "krea.edu.in" },
      { name: "IIIT Hyderabad", city: "Hyderabad", state: "Telangana", type: "Private (Deemed)", streams: ["Engineering"], fees: "\u2248 \u20B94\u20135L/yr", exams: ["JEE Main / UGEE (IIIT-H)"], rank: { n: 55, c: "University" }, site: "iiit.ac.in" },
      { name: "Institute of Chemical Technology (ICT)", city: "Mumbai", state: "Maharashtra", type: "Private (Deemed)", streams: ["Engineering", "Science"], fees: "\u2248 \u20B990k\u20131.2L/yr", exams: ["MHT-CET / JEE Main"] },
      // ─────────── IIMs & top B-schools (MBA destinations) ───────────
      { name: "IIM Ahmedabad", city: "Ahmedabad", state: "Gujarat", type: "Management Institute", streams: ["Management"], fees: IIM, exams: ["CAT"], rank: { n: 1, c: "Management" }, site: "iima.ac.in" },
      { name: "IIM Bangalore", city: "Bengaluru", state: "Karnataka", type: "Management Institute", streams: ["Management"], fees: IIM, exams: ["CAT"], rank: { n: 2, c: "Management" }, site: "iimb.ac.in" },
      { name: "IIM Kozhikode", city: "Kozhikode", state: "Kerala", type: "Management Institute", streams: ["Management"], fees: IIM, exams: ["CAT"], rank: { n: 3, c: "Management" }, site: "iimk.ac.in" },
      { name: "IIM Calcutta", city: "Kolkata", state: "West Bengal", type: "Management Institute", streams: ["Management"], fees: IIM, exams: ["CAT"], site: "iimcal.ac.in" },
      { name: "IIM Lucknow", city: "Lucknow", state: "Uttar Pradesh", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B920\u201326L (2-year MBA total)", exams: ["CAT"], site: "iiml.ac.in" },
      { name: "IIM Indore", city: "Indore", state: "Madhya Pradesh", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B917\u201325L (2-year MBA total)", exams: ["CAT", "IPMAT (5-yr integrated)"], site: "iimidr.ac.in" },
      { name: "IIM Shillong", city: "Shillong", state: "Meghalaya", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B914\u201316L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Ranchi", city: "Ranchi", state: "Jharkhand", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B916\u201318L (2-year MBA total)", exams: ["CAT"], site: "iimranchi.ac.in" },
      { name: "IIM Rohtak", city: "Rohtak", state: "Haryana", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B917\u201318L (2-year MBA total)", exams: ["CAT", "IPMAT (5-yr integrated)"] },
      { name: "IIM Raipur", city: "Raipur", state: "Chhattisgarh", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B914\u201316L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Udaipur", city: "Udaipur", state: "Rajasthan", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B914\u201316L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Kashipur", city: "Kashipur", state: "Uttarakhand", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B913\u201315L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Trichy", city: "Tiruchirappalli", state: "Tamil Nadu", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B913\u201315L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Amritsar", city: "Amritsar", state: "Punjab", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B912\u201314L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Nagpur", city: "Nagpur", state: "Maharashtra", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B913\u201315L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Vizag", city: "Visakhapatnam", state: "Andhra Pradesh", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B913\u201315L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Mumbai (formerly NITIE)", city: "Mumbai", state: "Maharashtra", type: "Management Institute", streams: ["Management", "Engineering"], fees: "\u2248 \u20B913\u201321L (2-year total)", exams: ["CAT"] },
      { name: "IIM Sambalpur", city: "Sambalpur", state: "Odisha", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B910\u201313L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Jammu", city: "Jammu", state: "J&K", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B911\u201313L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Sirmaur", city: "Sirmaur", state: "Himachal Pradesh", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B911\u201313L (2-year MBA total)", exams: ["CAT"] },
      { name: "IIM Bodh Gaya", city: "Bodh Gaya", state: "Bihar", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B910\u201312L (2-year MBA total)", exams: ["CAT", "IPMAT (5-yr integrated)"] },
      { name: "XLRI Jamshedpur (Xavier School of Management)", city: "Jamshedpur", state: "Jharkhand", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B925\u201328L (2-year PGDM total)", exams: ["XAT / CAT"], site: "xlri.ac.in" },
      { name: "FMS Delhi (Faculty of Management Studies)", city: "New Delhi", state: "Delhi", type: "Management Institute", streams: ["Management"], fees: "\u2248 \u20B92L (2-year MBA total \u2014 exceptional value)", exams: ["CAT"] },
      { name: "IIFT (Indian Institute of Foreign Trade)", city: "New Delhi", state: "Delhi", type: "Management Institute", streams: ["Management", "Business"], fees: "\u2248 \u20B917\u201318L (2-year MBA total)", exams: ["CAT (via IIFT)"] },
      // ─────────── National Law Universities (complete the CLAT map) ───────────
      { name: "WBNUJS Kolkata (National University of Juridical Sciences)", city: "Kolkata", state: "West Bengal", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"], rank: { n: 4, c: "Law" } },
      { name: "HNLU Raipur (Hidayatullah National Law University)", city: "Raipur", state: "Chhattisgarh", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "RMLNLU Lucknow (Dr. Ram Manohar Lohiya National Law University)", city: "Lucknow", state: "Uttar Pradesh", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "RGNUL Patiala (Rajiv Gandhi National University of Law)", city: "Patiala", state: "Punjab", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "CNLU Patna (Chanakya National Law University)", city: "Patna", state: "Bihar", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "NUALS Kochi (National University of Advanced Legal Studies)", city: "Kochi", state: "Kerala", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "NLU Odisha (Cuttack)", city: "Cuttack", state: "Odisha", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "DSNLU Visakhapatnam (Damodaram Sanjivayya National Law University)", city: "Visakhapatnam", state: "Andhra Pradesh", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "TNLU Tiruchirappalli (Tamil Nadu National Law University)", city: "Tiruchirappalli", state: "Tamil Nadu", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "NLU Assam (National Law University and Judicial Academy)", city: "Guwahati", state: "Assam", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "NUSRL Ranchi (National University of Study and Research in Law)", city: "Ranchi", state: "Jharkhand", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"], rank: { n: 30, c: "Law" } },
      { name: "MNLU Mumbai (Maharashtra National Law University)", city: "Mumbai", state: "Maharashtra", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "MNLU Nagpur (Maharashtra National Law University)", city: "Nagpur", state: "Maharashtra", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"], rank: { n: 28, c: "Law" } },
      { name: "MNLU Aurangabad (Maharashtra National Law University)", city: "Aurangabad", state: "Maharashtra", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "HPNLU Shimla (Himachal Pradesh National Law University)", city: "Shimla", state: "Himachal Pradesh", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "DNLU Jabalpur (Dharmashastra National Law University)", city: "Jabalpur", state: "Madhya Pradesh", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      { name: "DBRANLU Sonipat (Dr. B.R. Ambedkar National Law University)", city: "Sonipat", state: "Haryana", type: "National Law University", streams: ["Law"], fees: NLU, exams: ["CLAT"] },
      // ─────────── Medical (beyond AIIMSes) ───────────
      { name: "PGIMER Chandigarh (Postgraduate Institute of Medical Education & Research)", city: "Chandigarh", state: "Chandigarh", type: "Institute of National Importance", streams: ["Medicine"], fees: "PG institute \xB7 \u2248 \u20B95\u201310k/yr (fellowships/stipends)", exams: ["INI-CET / NEET PG"], rank: { n: 2, c: "Medical" }, site: "pgimer.edu.in" },
      { name: "SGPGI Lucknow (Sanjay Gandhi Postgraduate Institute of Medical Sciences)", city: "Lucknow", state: "Uttar Pradesh", type: "Institute of National Importance", streams: ["Medicine"], fees: "PG institute \xB7 \u2248 \u20B95\u201310k/yr", exams: ["INI-CET / NEET PG"], rank: { n: 5, c: "Medical" } },
      { name: "King George's Medical University (KGMU)", city: "Lucknow", state: "Uttar Pradesh", type: "State University", streams: ["Medicine"], fees: "\u2248 \u20B950k\u20132L/yr (govt seats)", exams: ["NEET UG"], rank: { n: 8, c: "Medical" } },
      { name: "Kasturba Medical College (KMC) Manipal", city: "Manipal", state: "Karnataka", type: "Private (Deemed)", streams: ["Medicine"], fees: "\u2248 \u20B970\u201390L (MBBS total, private)", exams: ["NEET UG"], rank: { n: 10, c: "Medical" } },
      { name: "MS Ramaiah Medical College", city: "Bengaluru", state: "Karnataka", type: "Private", streams: ["Medicine"], fees: "\u2248 \u20B960\u201390L (MBBS total, private)", exams: ["NEET UG"] },
      { name: "Sri Ramachandra Institute of Higher Education and Research", city: "Chennai", state: "Tamil Nadu", type: "Private (Deemed)", streams: ["Medicine"], fees: "\u2248 \u20B91\u20131.2Cr (MBBS total, private)", exams: ["NEET UG"] },
      // ─────────── Engineering / architecture extras ───────────
      { name: "SSN College of Engineering", city: "Chennai", state: "Tamil Nadu", type: "Private", streams: ["Engineering"], fees: "\u2248 \u20B950k\u20131.5L/yr (merit seats)", exams: ["TNEA counselling / TNEA"], rank: { n: 47, c: "Engineering" } },
      { name: "BIT Mesra (Birla Institute of Technology)", city: "Ranchi", state: "Jharkhand", type: "Private (Deemed)", streams: ["Engineering", "Architecture"], fees: "\u2248 \u20B92\u20132.5L/yr", exams: ["JEE Main"], site: "bitmesra.ac.in" },
      { name: "VJTI Mumbai (Veermata Jijabai Technological Institute)", city: "Mumbai", state: "Maharashtra", type: "Government", streams: ["Engineering"], fees: "\u2248 \u20B980k\u20131L/yr", exams: ["MHT-CET / JEE Main"] },
      { name: "SPA Vijayawada (School of Planning and Architecture)", city: "Vijayawada", state: "Andhra Pradesh", type: "Government", streams: ["Architecture", "Design"], fees: "\u2248 \u20B91\u20131.5L/yr", exams: ["JEE Main (B.Arch) / NATA"] },
      // ─────────── Design (complete the NID family) ───────────
      { name: "NID Assam (Jorhat)", city: "Jorhat", state: "Assam", type: "NID Campus", streams: ["Design"], fees: "\u2248 \u20B93\u20133.5L/yr", exams: ["NID DAT"] },
      { name: "NID Andhra Pradesh", city: "Bapatla", state: "Andhra Pradesh", type: "NID Campus", streams: ["Design"], fees: "\u2248 \u20B93\u20133.5L/yr", exams: ["NID DAT"] }
    ];
    rankAnnotations = {
      "IISc Bangalore": { rank: 1, cat: "University", site: "iisc.ac.in" },
      "IIT Madras": { rank: 1, cat: "Engineering" },
      "IIT Delhi": { rank: 2, cat: "Engineering" },
      "IIT Bombay": { rank: 3, cat: "Engineering" },
      "IIT Kanpur": { rank: 4, cat: "Engineering" },
      "IIT Kharagpur": { rank: 5, cat: "Engineering" },
      "IIT Roorkee": { rank: 6, cat: "Engineering" },
      "IIT Hyderabad": { rank: 7, cat: "Engineering" },
      "IIT Guwahati": { rank: 8, cat: "Engineering" },
      "NIT Trichy": { rank: 9, cat: "Engineering" },
      "VIT Vellore": { rank: 11, cat: "Engineering", site: "vit.ac.in" },
      "Jadavpur University": { rank: 9, cat: "University" },
      "SRM Chennai (KTR)": { rank: 11, cat: "University", site: "srmist.edu.in" },
      "NIT Calicut": { rank: 21, cat: "Engineering" },
      "IIT Gandhinagar": { rank: 25, cat: "Engineering" },
      "IIT Mandi": { rank: 26, cat: "Engineering" },
      "NIT Warangal": { rank: 28, cat: "Engineering" },
      "Thapar Institute (TIET)": { rank: 29, cat: "Engineering" },
      "Delhi Technological University (DTU)": { rank: 30, cat: "Engineering" },
      "IIT Ropar": { rank: 32, cat: "Engineering" },
      "AIIMS Delhi": { rank: 1, cat: "Medical" },
      "AIIMS Rishikesh": { rank: 78, cat: "Overall" },
      "AIIMS Bhubaneswar": { rank: 100, cat: "Overall" },
      "CMC Vellore": { rank: 3, cat: "Medical" },
      "JIPMER Puducherry": { rank: 4, cat: "Medical" },
      "BHU Varanasi": { rank: 6, cat: "University", site: "bhu.ac.in" },
      "Jamia Millia Islamia": { rank: 4, cat: "University", site: "jmi.ac.in" },
      "Aligarh Muslim University": { rank: 10, cat: "University", site: "amu.ac.in" },
      "Delhi University (North Campus)": { rank: 5, cat: "University", site: "du.ac.in" },
      "University of Hyderabad": { rank: 18, cat: "University", site: "uohyd.ac.in" },
      "BITS Pilani": { rank: 7, cat: "University", site: "bits-pilani.ac.in" },
      "Manipal (MAHE) \u2014 Engineering": { rank: 3, cat: "University", site: "manipal.edu" },
      "Symbiosis International": { rank: 24, cat: "University", site: "siu.edu.in" },
      "NMIMS Mumbai": { rank: 52, cat: "University", site: "nmims.edu" },
      "Savitribai Phule Pune University": { rank: 56, cat: "University", site: "unipune.ac.in" },
      "Punjab University (PU)": { rank: 57, cat: "Overall", site: "puchd.ac.in" },
      "Christ University": { rank: 24, cat: "Law", site: "christuniversity.in" },
      "NLSIU Bangalore": { rank: 1, cat: "Law" },
      "NLU Delhi": { rank: 2, cat: "Law" },
      "NALSAR Hyderabad": { rank: 3, cat: "Law" },
      "GNLU Gandhinagar": { rank: 5, cat: "Law" },
      "NLIU Bhopal": { rank: 27, cat: "Law" },
      "Symbiosis Law School": { rank: 7, cat: "Law" },
      "Hindu College": { rank: 1, cat: "Colleges" },
      "Miranda House": { rank: 2, cat: "Colleges" },
      "IISER Kolkata": { rank: 67, cat: "Overall" },
      "IISER Bhopal": { rank: 75, cat: "Overall" },
      "IISER Mohali": { rank: 70, cat: "Overall" }
    };
  }
});

// server/auth.js
import crypto from "node:crypto";
function normalizeIdentifier(id) {
  const trimmed = String(id || "").trim();
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { kind: "email", value: email } : null;
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+91")) return { kind: "phone", value: digits.slice(3) };
  if (digits.length === 10 && /^\d+$/.test(digits)) return { kind: "phone", value: digits };
  return null;
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `s1$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  try {
    if (!stored) return false;
    const [v, salt, hash] = String(stored).split("$");
    if (v !== "s1" || !salt || !hash) return false;
    const test = crypto.scryptSync(String(password), salt, 64);
    const orig = Buffer.from(hash, "hex");
    return orig.length === test.length && crypto.timingSafeEqual(orig, test);
  } catch {
    return false;
  }
}
function passwordProblem(pw) {
  if (!pw || typeof pw !== "string") return "Please choose a password.";
  if (pw.length < 8) return "Passwords need at least 8 characters.";
  if (pw.length > 128) return "That password is too long.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Include at least one letter and one number.";
  return null;
}
function generateCode(prefix, len = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${s}`;
}
function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return token;
}
function destroySession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
function destroyOtherSessions(userId, keepToken) {
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").run(userId, keepToken || "");
}
function sessionUser(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.deleted_at IS NULL
  `).get(token);
  return row || null;
}
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    phone: u.phone,
    is_minor: !!u.is_minor,
    parent_user_id: u.parent_user_id,
    consent_status: u.consent_status,
    referral_code: u.referral_code,
    has_password: !!u.password_hash,
    created_at: u.created_at
  };
}
function attachUser(req, _res, next) {
  let token = req.cookies?.cc_session;
  if (!token) {
    const authHeader = req.headers?.authorization || "";
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7).trim();
  }
  req.user = sessionUser(token);
  req.sessionToken = token;
  next();
}
function requireAuth(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." } });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "You do not have access to this area." } });
    }
    next();
  };
}
function loginUser(res, user) {
  const token = createSession(user.id);
  res.cookie("cc_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS
  });
  audit(user.id, "session.login", `user:${user.id}`, { role: user.role });
  return token;
}
var SESSION_TTL_MS;
var init_auth = __esm({
  "server/auth.js"() {
    init_db();
    SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
  }
});

// server/engine/db-helper.js
function parseJSONHelper(s, fallback) {
  if (s == null) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
var parseJSON;
var init_db_helper = __esm({
  "server/engine/db-helper.js"() {
    parseJSON = parseJSONHelper;
  }
});

// server/engine/matcher.js
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function riasecFit(studentRiasec, careerVec) {
  const s = RIASEC_DIMS.map((d) => studentRiasec[d] || 0);
  const c = RIASEC_DIMS.map((d) => careerVec[d] || 0);
  const sMax = Math.max(...s, 1);
  const sNorm = s.map((v) => v / sMax);
  const dot = sNorm.reduce((acc, v, i) => acc + v * c[i], 0);
  const cMag = Math.sqrt(c.reduce((a, v) => a + v * v, 0)) || 1;
  const sMag = Math.sqrt(sNorm.reduce((a, v) => a + v * v, 0)) || 1;
  return clamp01(dot / (cMag * sMag));
}
function subjectFit(subjects, careerSubjects) {
  const keys = Object.keys(careerSubjects);
  if (!keys.length || !subjects) return { score: 0.5, notes: [] };
  let total = 0, weighted = 0, notes = [], loved = [];
  for (const k of keys) {
    const w = careerSubjects[k];
    const rating = subjects[k];
    const norm = rating == null ? 0.55 : clamp01(rating / 5);
    if (rating != null && rating >= 4 && w >= 0.7) loved.push(`${k} (${rating}/5)`);
    if (rating != null && rating <= 2 && w >= 0.7) notes.push(`You rated ${k} just ${rating}/5, which this career uses heavily`);
    total += w;
    weighted += norm * w;
  }
  return { score: clamp01(weighted / total), notes, loved };
}
function interestFit(interestTags, careerTags) {
  const keys = Object.keys(careerTags);
  if (!keys.length || !interestTags) return { score: 0.5, top: [] };
  let total = 0, weighted = 0, top = [];
  for (const k of keys) {
    const w = careerTags[k];
    const rating = interestTags[k];
    const norm = rating == null ? 0.5 : clamp01(rating / 5);
    if (rating != null && rating >= 4 && w >= 0.8) top.push(k);
    total += w;
    weighted += norm * w;
  }
  return { score: clamp01(weighted / total), top };
}
function goalFit(goals, careerGoals) {
  if (!goals || !goals.length) return { score: 0.5, aligned: [], tension: [] };
  let sum = 0;
  const aligned = [], tension = [];
  for (const g2 of goals) {
    const s = careerGoals[g2];
    if (s == null) continue;
    sum += s;
    if (s >= 1) aligned.push(g2);
    if (s <= -1) tension.push(g2);
  }
  const score = clamp01((sum + 3) / 6);
  return { score, aligned, tension };
}
function aptitudeFit(aptitude, demands) {
  const keys = Object.keys(demands);
  if (!keys.length) return { score: 0.5 };
  let fit = 0;
  for (const k of keys) {
    const demand = demands[k];
    const have = aptitude?.[k] ?? 0.5;
    fit += clamp01(1 - Math.max(0, demand - have) * 1.6);
  }
  return { score: clamp01(fit / keys.length) };
}
function feasibilityFit(profile, career) {
  const notes = [];
  let score = 1;
  const budgetBands = { low: 1, medium: 2, high: 3 };
  if (profile?.budget && budgetBands[career.cost_band] > budgetBands[profile.budget]) {
    score -= 0.45;
    notes.push(`Typical education costs for this path (${career.cost_band} band) sit above your stated budget \u2014 scholarships and government colleges can close this gap (see roadmap)`);
  }
  if (profile && profile.willing_to_relocate === 0 && career.needs_relocation) {
    score -= 0.15;
    notes.push("Top programmes for this career are concentrated in a few cities; you prefer staying close to home");
  }
  return { score: clamp01(score), notes };
}
function profileCompleteness(profile, results) {
  if (!profile) return 0;
  let filled = 0, total = 0;
  const checks = [
    [profile.class_level],
    [profile.stream],
    [Object.keys(parseJSON(profile.subjects_json, {})).length >= 4],
    [(profile.goals_json ? parseJSON(profile.goals_json, []).length : 0) >= 1],
    [profile.budget],
    [profile.city],
    [profile.target_year]
  ];
  for (const [v] of checks) {
    total += 1;
    if (v) filled += 1;
  }
  if (results) filled += 1;
  total += 1;
  return filled / total;
}
function computeMatches(user, profileRow, resultsRow) {
  const profile = profileRow || {};
  const subjects = parseJSON(profile.subjects_json, {});
  const goals = parseJSON(profile.goals_json, []);
  const riasec = parseJSON(resultsRow?.riasec_json, {});
  const aptitude = parseJSON(resultsRow?.aptitude_json, {});
  const interestTags = parseJSON(resultsRow?.interest_tags_json, {});
  const boosts = {};
  const fb = db.prepare(`
    SELECT f.thumbs, r.career_id FROM feedback f
    JOIN recommendations r ON r.id = f.recommendation_id
    WHERE r.user_id = ? ORDER BY f.created_at DESC LIMIT 20
  `).all(user.id);
  for (const f of fb) boosts[f.career_id] = (boosts[f.career_id] || 0) + (f.thumbs === 1 ? 4 : -8);
  const favourites = db.prepare(`SELECT entity_id FROM favourites WHERE user_id = ? AND entity_type = 'career'`).all(user.id).map((r) => Number(r.entity_id));
  for (const fid of favourites) boosts[fid] = (boosts[fid] || 0) + 6;
  const careers = db.prepare("SELECT * FROM careers").all();
  const scored = [];
  for (const c of careers) {
    const careerRiasec = parseJSON(c.riasec_json, {});
    const careerSubjects = parseJSON(c.subjects_json, {});
    const careerTags = parseJSON(c.tags_json, {});
    const careerGoals = parseJSON(c.goals_json, {});
    const demands = parseJSON(c.aptitude_json, {});
    const rFit = riasecFit(riasec, careerRiasec);
    const sFit = subjectFit(subjects, careerSubjects);
    const iFit = interestFit(interestTags, careerTags);
    const gFit = goalFit(goals, careerGoals);
    const aFit = aptitudeFit(aptitude, demands);
    const fFit = feasibilityFit(profile, { cost_band: c.cost_band, needs_relocation: c.needs_relocation || false });
    let score = WEIGHTS.riasec * rFit + WEIGHTS.subjects * sFit.score + WEIGHTS.interests * iFit.score + WEIGHTS.goals * gFit.score + WEIGHTS.aptitude * aFit.score + WEIGHTS.feasibility * fFit.score;
    score += boosts[c.id] || 0;
    score = Math.round(Math.max(5, Math.min(97, score)) * 10) / 10;
    const log = [];
    const topDims2 = Object.entries(riasec).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d).filter(Boolean);
    const careerPrimary = Object.entries(careerRiasec).sort((a, b) => b[1] - a[1])[0]?.[0];
    log.push({
      type: "personality",
      label: "Personality fit",
      detail: topDims2.length ? `Your strongest traits are ${topDims2.map((d) => RIASEC_NAMES[d].split(" (")[0]).join(" & ")}; this career is primarily ${RIASEC_NAMES[careerPrimary]?.split(" (")[0] || "\u2014"}. Match strength: ${Math.round(rFit * 100)}%.` : `Personality data incomplete \u2014 this match leans more on your subjects and interests.`
    });
    if (sFit.loved.length) log.push({ type: "subjects", label: "Subject strengths", detail: `You enjoy ${sFit.loved.join(", ")} \u2014 core subjects for this path.` });
    for (const n2 of sFit.notes) log.push({ type: "subjects", label: "Subject caution", detail: n2 });
    if (iFit.top.length) log.push({ type: "interests", label: "Interest match", detail: `Your interest in ${iFit.top.join(", ")} maps directly onto this career.` });
    if (gFit.aligned.length) log.push({ type: "goals", label: "Goal alignment", detail: `Aligns with your goals: ${gFit.aligned.join(", ")}.` });
    if (gFit.tension.length) log.push({ type: "goals", label: "Goal tension", detail: `Heads-up: this career scores low on ${gFit.tension.join(", ")} for you. Worth weighing honestly.` });
    for (const n2 of fFit.notes) log.push({ type: "constraint", label: "Practical fit", detail: n2 });
    if (aFit.score < 0.45) log.push({ type: "aptitude", label: "Skill gap", detail: `This career demands above-average ${Object.keys(demands).join("/")} ability \u2014 your current aptitude suggests you would need focused preparation.` });
    if (boosts[c.id] > 0) log.push({ type: "feedback", label: "Your signals", detail: `Boosted because you favourited or liked this career earlier.` });
    if (boosts[c.id] < 0) log.push({ type: "feedback", label: "Your signals", detail: `Lowered because you gave this a thumbs-down earlier.` });
    scored.push({ career: c, score, decisionLog: log, rFit, sFit: sFit.score, iFit: iFit.score, gFit: gFit.score, aFit: aFit.score, fFit: fFit.score });
  }
  scored.sort((a, b) => b.score - a.score);
  const primaries = scored.slice(0, 3);
  const usedPrimaryDims = new Set(primaries.map((p) => Object.entries(parseJSON(p.career.riasec_json, {})).sort((a, b) => b[1] - a[1])[0]?.[0]));
  const wildcards = scored.filter((s) => !primaries.includes(s) && s.score >= 38).filter((s) => {
    const prim = Object.entries(parseJSON(s.career.riasec_json, {})).sort((a, b) => b[1] - a[1])[0]?.[0];
    return !usedPrimaryDims.has(prim);
  }).sort((a, b) => (b.career.emerging * 30 + b.career.growth === "high" ? 15 : 0) - (a.career.emerging * 30 + a.career.growth === "high" ? 15 : 0) || b.score - a.score).slice(0, 2);
  const completeness = profileCompleteness(profileRow, resultsRow);
  const confidenceFor = (s) => {
    if (s.score >= 72 && completeness >= 0.75) return "high";
    if (s.score < 58 || completeness < 0.5) return "low";
    return "medium";
  };
  return [
    ...primaries.map((s) => ({ ...s, kind: "primary", confidence: confidenceFor(s) })),
    ...wildcards.map((s) => ({ ...s, kind: "wildcard", confidence: "low" }))
  ];
}
var RIASEC_DIMS, RIASEC_NAMES, WEIGHTS;
var init_matcher = __esm({
  "server/engine/matcher.js"() {
    init_db();
    init_db_helper();
    RIASEC_DIMS = ["R", "I", "A", "S", "E", "C"];
    RIASEC_NAMES = {
      R: "Realistic (builder / doer)",
      I: "Investigative (thinker / analyst)",
      A: "Artistic (creator)",
      S: "Social (helper / people)",
      E: "Enterprising (leader / persuader)",
      C: "Conventional (organizer)"
    };
    WEIGHTS = { riasec: 40, subjects: 18, interests: 16, goals: 12, aptitude: 8, feasibility: 6 };
  }
});

// server/engine/roadmap.js
function addDays(days) {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}
function resourcesFor(career) {
  const tags = Object.keys(parseJSON(career.tags_json, {}));
  const text = (career.title + " " + tags.join(" ")).toLowerCase();
  if (/(software|data|ai|computer|cyber|cloud|game|web|robotics)/.test(text)) return RESOURCES.tech;
  if (/(doctor|surgeon|medicine|nurse|pharma|physio|psycholog|nutrition|public health|forensic|medical)/.test(text)) return RESOURCES.medicine;
  if (/(design|fashion|animator|architect|ux|graphic|interior|photograph)/.test(text)) return RESOURCES.design;
  if (/(account|finance|business|market|entrepreneur|bank|analyst|economist|hr|product manager)/.test(text)) return RESOURCES.business;
  if (/(law|judge|advocate|legal)/.test(text)) return RESOURCES.law;
  if (/(ias|civil service|defence|army|officer|upsc|diplomat)/.test(text)) return RESOURCES.civilservices;
  if (/(writer|journalist|content|actor|musician|performing|media|video|youtube)/.test(text)) return RESOURCES.creative;
  return RESOURCES.generic;
}
function buildRoadmap(user, profileRow, resultsRow, career) {
  const targetYear = profileRow?.target_year || (/* @__PURE__ */ new Date()).getFullYear() + 1;
  const monthsToTarget = (targetYear - (/* @__PURE__ */ new Date()).getFullYear()) * 12 - (/* @__PURE__ */ new Date()).getMonth();
  const riasec = parseJSON(resultsRow?.riasec_json, {});
  const aptitude = parseJSON(resultsRow?.aptitude_json, {});
  const demands = parseJSON(career.aptitude_json, {});
  const examSlugs = parseJSON(career.exams_json, []);
  const edu = parseJSON(career.education_json, []);
  let weakAptitude = false;
  const demandKeys = Object.keys(demands);
  if (demandKeys.length) {
    const avgGap = demandKeys.reduce((a, k) => a + Math.max(0, (demands[k] || 0) - (aptitude[k] || 0.5)), 0) / demandKeys.length;
    weakAptitude = avgGap > 0.25;
  }
  const examRows2 = examSlugs.length ? db.prepare(`SELECT * FROM exams WHERE slug IN (${examSlugs.map(() => "?").join(",")})`).all(...examSlugs) : [];
  const timeline = examRows2.map((e) => {
    const t = parseJSON(e.timeline_json, {});
    return {
      exam: e.name,
      conducted_by: e.conducted_by,
      application_window: t.application_window || "See official site",
      exam_months: t.exam_months || "\u2014",
      result_months: t.result_months || "\u2014",
      as_of: e.as_of,
      source: e.source
    };
  });
  const milestones = [];
  const highImpactNotes = [];
  milestones.push({
    title: "Lock your direction",
    target_date: addDays(14),
    steps: [
      { text: `Re-read your ${career.title} match \u2014 does the "why" still feel true?`, done: false },
      { text: "Discuss with your parents (share your roadmap using the parent link)", done: false },
      { text: `Shortlist 8\u201310 colleges offering ${edu[0] || "the typical course"}`, done: false }
    ],
    note: 'A decision dates itself. Two weeks is enough to go from "maybe" to "this is it".'
  });
  if (examRows2.length) {
    const steps = examRows2.slice(0, 2).map((e) => {
      const t = parseJSON(e.timeline_json, {});
      return { text: `${e.name}: note the application window (${t.application_window || "check official site"}) and build a weekly prep plan`, done: false };
    });
    steps.push({ text: "Take one full-length past paper this month \u2014 score it honestly", done: false });
    milestones.push({
      title: "Entrance exam plan",
      target_date: addDays(30),
      steps,
      note: "Applications for your target year are listed in the timeline below \u2014 verify dates on official sites.",
      timeline_ref: true
    });
  }
  const res = resourcesFor(career);
  milestones.push({
    title: "Build skills early (2\u20133 hours a week)",
    target_date: addDays(60),
    steps: res.map((r) => ({ text: r.label, done: false })),
    note: "Free, credible resources picked for this career."
  });
  milestones.push({
    title: "Talk to 2 professionals in this field",
    target_date: addDays(21),
    steps: [
      { text: "Use Ask-a-Professional \u2014 ask one question this week", done: false },
      { text: 'Ask: "What does a bad day look like?" \u2014 it reveals more than the good ones', done: false },
      { text: "Write what surprised you in your decision journal", done: false }
    ],
    note: "The fastest way to test a career match is a conversation, not a brochure."
  });
  milestones.push({
    title: "Applications & your Plan B",
    target_date: addDays(90),
    steps: [
      { text: "List documents needed (marksheets, ID, category certificates if any)", done: false },
      { text: "Fix your Plan B: 3 colleges/courses you would genuinely still be happy with", done: false },
      { text: "Check scholarship deadlines \u2014 many close before admissions", done: false }
    ],
    note: "A strong Plan B is what makes Plan A calm."
  });
  let highImpact = false;
  if (monthsToTarget <= 6 && weakAptitude) {
    highImpact = true;
    highImpactNotes.push("Time to entrance is short and current aptitude scores suggest a stretch \u2014 roadmap includes a candid gap-year consideration, held for counsellor review.");
    milestones.splice(2, 0, {
      title: "Consider the honest timeline question",
      target_date: addDays(7),
      steps: [
        { text: "Discuss openly: is the entrance realistic this year, or is a planned gap year stronger?", done: false },
        { text: "A gap year WITH a structured plan beats a rushed, underprepared attempt", done: false }
      ],
      note: "\u26A0 This step carries major consequences \u2014 a counsellor will review this roadmap before it reaches you.",
      high_impact: true
    });
  }
  const streamSwitch = profileRow?.stream && parseJSON(career.streams_json, []).length && !parseJSON(career.streams_json, []).includes(profileRow.stream) && !parseJSON(career.streams_json, []).includes("any");
  if (streamSwitch) {
    highImpact = true;
    highImpactNotes.push(`This career usually follows the ${parseJSON(career.streams_json, []).join("/")} stream, but your current stream is ${profileRow.stream} \u2014 a stream-change recommendation requires counsellor review.`);
  }
  return {
    milestones,
    timeline,
    resources: res.map((r) => ({ ...r, why: `Picked for ${career.title}` })),
    high_impact: highImpact,
    high_impact_notes: highImpactNotes,
    ai_note: "Generated from the Career Compass knowledge base. Dates verified as of generation time \u2014 always confirm on official websites.",
    personality_note: Object.keys(riasec).length ? `Built around your ${Object.entries(riasec).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d).join(" + ")} profile.` : "Complete the assessment to sharpen this roadmap."
  };
}
var RESOURCES;
var init_roadmap = __esm({
  "server/engine/roadmap.js"() {
    init_db();
    init_db_helper();
    RESOURCES = {
      tech: [
        { label: "CS50x \u2014 Harvard's intro to computer science (free)", url: "https://cs50.harvard.edu/x/" },
        { label: "Python for Everybody \u2014 NPTEL / SWAYAM (free)", url: "https://swayam.gov.in" },
        { label: "Khan Academy \u2014 Math foundation practice", url: "https://www.khanacademy.org/math" }
      ],
      medicine: [
        { label: "NCERT Biology \u2014 the single highest-ROI NEET resource", url: "https://ncert.nic.in/textbook.php" },
        { label: "NEET PYQs \u2014 last 10 years, topic-wise", url: "https://nta.ac.in" },
        { label: "Khan Academy \u2014 Biology & Chemistry video lessons", url: "https://www.khanacademy.org/science" }
      ],
      design: [
        { label: "Daily 30-min sketching practice \u2014 carry a sketchbook", url: "https://www.drawingnow.com" },
        { label: "Design basics \u2014 The Interaction Design Foundation (free track)", url: "https://www.interaction-design.org" },
        { label: "NID/UCEED past papers & portfolio examples", url: "https://www.uceed.iitb.ac.in" }
      ],
      business: [
        { label: "CA Foundation starter \u2014 ICAI study material (free)", url: "https://www.icai.org" },
        { label: "Principles of Economics \u2014 MIT OpenCourseWare", url: "https://ocw.mit.edu" },
        { label: "Sharpen math: Khan Academy \u2014 Algebra & Statistics", url: "https://www.khanacademy.org/math" }
      ],
      law: [
        { label: "Read one landmark judgment a week (Indian Kanoon)", url: "https://indiankanoon.org" },
        { label: "CLAT past papers + daily reading habit (The Hindu editorials)", url: "https://consortiumofnlus.ac.in" },
        { label: "Introduction to the Indian Constitution \u2014 free online lectures", url: "https://swayam.gov.in" }
      ],
      civilservices: [
        { label: "NCERTs Class 6\u201312 \u2014 build the base early (free PDFs)", url: "https://ncert.nic.in/textbook.php" },
        { label: "PIB daily briefings \u2014 habit-forming current affairs", url: "https://pib.gov.in" },
        { label: "One newspaper a day, notes in your own words", url: "https://www.thehindu.com" }
      ],
      creative: [
        { label: "Write / create daily \u2014 a public blog or channel builds a portfolio", url: "https://medium.com" },
        { label: "Free masterclasses \u2014 YouTube creator academies in your field", url: "https://www.youtube.com" },
        { label: "Build a small portfolio site (GitHub Pages, free)", url: "https://pages.github.com" }
      ],
      generic: [
        { label: "SWAYAM \u2014 free courses from top Indian institutes", url: "https://swayam.gov.in" },
        { label: "Khan Academy \u2014 structured practice across subjects", url: "https://www.khanacademy.org" },
        { label: "Talk to 2 people in this career (use Ask-a-Professional)", url: "#" }
      ]
    };
  }
});

// server/seed/index.js
var seed_exports = {};
import fs2 from "node:fs";
import path2 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import crypto2 from "node:crypto";
var __dirname2, FRESH, DB_PATH, RUN_AS_CLI, seeded;
var init_seed = __esm({
  async "server/seed/index.js"() {
    init_db();
    init_questions();
    init_careers();
    init_courses();
    init_exams();
    init_colleges();
    init_colleges_web();
    init_auth();
    init_matcher();
    init_roadmap();
    __dirname2 = path2.dirname(fileURLToPath2(import.meta.url));
    FRESH = process.argv.includes("--fresh");
    DB_PATH = db.name;
    RUN_AS_CLI = (process.argv[1] || "").endsWith("seed/index.js");
    if (FRESH) {
      db.close();
      for (const ext of ["", "-wal", "-shm"]) {
        try {
          fs2.unlinkSync(DB_PATH + ext);
        } catch {
        }
      }
      console.log("Fresh seed: database reset.");
      const { execSync } = await import("node:child_process");
      execSync(`node ${path2.join(__dirname2, "index.js")} --reopened`, { stdio: "inherit", env: process.env });
      process.exit(0);
    }
    if (process.argv.includes("--reopened")) {
    }
    seeded = db.prepare("SELECT value FROM meta WHERE key = ?").get("seed_version");
    if (seeded && !FRESH) {
      console.log(`Already seeded (version ${seeded.value}). Use --fresh to reseed.`);
      if (RUN_AS_CLI) process.exit(0);
    }
    if (!seeded) {
      const TX = db.transaction(() => {
        const insCareer = db.prepare(`INSERT INTO careers (slug,title,summary,day_in_life,skills_json,subjects_json,riasec_json,goals_json,salary_entry,salary_senior,growth,streams_json,education_json,exams_json,aptitude_json,tags_json,emerging,cost_band,source,as_of) VALUES (@slug,@title,@summary,@day_in_life,@skills_json,@subjects_json,@riasec_json,@goals_json,@salary_entry,@salary_senior,@growth,@streams_json,@education_json,@exams_json,@aptitude_json,@tags_json,@emerging,@cost_band,@source,@as_of)`);
        for (const c of careerRows()) insCareer.run(c);
        const insCourse = db.prepare(`INSERT INTO courses (slug,name,level,duration,about,careers_json,streams_json,source,as_of) VALUES (@slug,@name,@level,@duration,@about,@careers_json,@streams_json,@source,@as_of)`);
        for (const c of courseRows()) insCourse.run(c);
        const insExam = db.prepare(`INSERT INTO exams (slug,name,conducted_by,level,streams_json,about,timeline_json,source,as_of) VALUES (@slug,@name,@conducted_by,@level,@streams_json,@about,@timeline_json,@source,@as_of)`);
        for (const e of examRows()) insExam.run(e);
        const insCollege = db.prepare(`INSERT INTO colleges (slug,name,city,state,type,streams_json,approx_fees_per_year,entrance_exams_json,source,as_of) VALUES (@slug,@name,@city,@state,@type,@streams_json,@approx_fees_per_year,@entrance_exams_json,@source,@as_of)`);
        for (const c of collegeRows()) insCollege.run(c);
        const web2 = applyWebData(db);
        console.log(`Catalogs: ${db.prepare("SELECT COUNT(*) c FROM careers").get().c} careers, ${db.prepare("SELECT COUNT(*) c FROM courses").get().c} courses, ${db.prepare("SELECT COUNT(*) c FROM colleges").get().c} colleges, ${db.prepare("SELECT COUNT(*) c FROM exams").get().c} exams`);
        const mkUser = (name, email, phone, role, opts = {}) => {
          const ref = "CC-" + crypto2.randomBytes(3).toString("hex").toUpperCase();
          const r = db.prepare(`INSERT INTO users (role,name,email,phone,password_hash,is_minor,consent_status,referral_code,referred_by,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(role, name, email, phone, opts.password ? hashPassword(opts.password) : null, opts.is_minor ? 1 : 0, opts.consent_status || "not_applicable", opts.referral || ref, opts.referred_by || null, opts.is_demo === false ? 0 : 1);
          return r.lastInsertRowid;
        };
        const adminId = mkUser("Admin (Counsellor)", "admin@demo.cc", "9000000001", "admin", { password: "CC-Admin-2026!" });
        const m1 = mkUser("Dr. Neha Verma", "mentor@demo.cc", "9000000002", "mentor", { password: "demo1234" });
        const m2 = mkUser("Dr. Arjun Mehta", "arjun.mentor@demo.cc", "9000000003", "mentor", { password: "demo1234" });
        const m3 = mkUser("Adv. Sana Khan", "sana.mentor@demo.cc", "9000000004", "mentor", { password: "demo1234" });
        const insMentor = db.prepare("INSERT INTO mentors (user_id,verified,fields_json,headline,years_experience,capacity) VALUES (?,?,?,?,?,?)");
        insMentor.run(m1, 1, JSON.stringify(["Software Engineering", "Technology", "Data & AI"]), "Staff Software Engineer, Google \xB7 12 yrs", 12, 15);
        insMentor.run(m2, 1, JSON.stringify(["Medicine", "Psychology", "Healthcare"]), "Consultant Psychiatrist, AIIMS Delhi \xB7 10 yrs", 10, 12);
        insMentor.run(m3, 1, JSON.stringify(["Civil Services", "Law", "Business"]), "Ex-IAS (2013 batch), now mentor \xB7 9 yrs", 9, 10);
        const parentId = mkUser("Rajesh Sharma (Parent)", "parent@demo.cc", "9000000005", "parent", { password: "demo1234" });
        const studentRef = "CC-AARAV01";
        const studentId = mkUser("Aarav Sharma", "student@demo.cc", "9000000006", "student", { is_minor: true, consent_status: "given", password: "demo1234", referral: studentRef });
        db.prepare("UPDATE users SET parent_user_id = ?, consent_code = ? WHERE id = ?").run(parentId, "PC-" + crypto2.randomBytes(3).toString("hex").toUpperCase(), studentId);
        db.prepare(`INSERT INTO student_profiles (user_id,class_level,stream,subjects_json,interests_json,strengths_json,skills_json,goals_json,budget,city,willing_to_relocate,target_year) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
          studentId,
          "Class 12",
          "Science",
          JSON.stringify({ Mathematics: 5, Physics: 4, "Computer Science": 5, Chemistry: 3, English: 3 }),
          JSON.stringify(["coding", "research", "business"]),
          JSON.stringify(["Mathematics", "Computer Science"]),
          JSON.stringify(["Python basics", "Built a quiz app"]),
          JSON.stringify(["work_with_technology", "high_earning", "entrepreneurship"]),
          "medium",
          "Gaya, Bihar",
          1,
          (/* @__PURE__ */ new Date()).getFullYear() + 1
        );
        const questions = buildQuestions();
        const aId = db.prepare(`INSERT INTO assessments (user_id,status,completed_at) VALUES (?,?,datetime('now'))`).run(studentId, "completed").lastInsertRowid;
        const insA = db.prepare("INSERT OR REPLACE INTO assessment_answers (assessment_id,question_id,value) VALUES (?,?,?)");
        questions.filter((q) => q.sub_test === "aptitude").forEach((q, i) => {
          const correct = i % 4 !== 3;
          insA.run(aId, q.id, String(correct ? q.correct : (q.correct + 1) % q.options.length));
        });
        questions.filter((q) => q.sub_test === "personality").forEach((q) => {
          const v = q.dimension === "I" ? 5 : q.dimension === "R" ? 4 : q.dimension === "C" ? 3 : q.dimension === "A" ? 3 : 2;
          insA.run(aId, q.id, String(v));
        });
        questions.filter((q) => q.sub_test === "interest").forEach((q) => {
          const v = ["coding", "research", "business", "electronics"].includes(q.dimension) ? 5 : ["design", "teaching"].includes(q.dimension) ? 3 : 2;
          insA.run(aId, q.id, String(v));
        });
        const answers = {};
        db.prepare("SELECT question_id, value FROM assessment_answers WHERE assessment_id = ?").all(aId).forEach((r) => {
          answers[r.question_id] = Number(r.value);
        });
        const scored = scoreAssessment(questions, answers);
        db.prepare("INSERT OR REPLACE INTO assessment_results (user_id,riasec_json,aptitude_json,interest_tags_json) VALUES (?,?,?,?)").run(studentId, JSON.stringify(scored.riasec), JSON.stringify(scored.aptitude), JSON.stringify(scored.interestTags));
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(studentId);
        const profile = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(studentId);
        const results = db.prepare("SELECT * FROM assessment_results WHERE user_id = ?").get(studentId);
        const matches = computeMatches(user, profile, results);
        const insRec = db.prepare(`INSERT INTO recommendations (user_id,career_id,match_score,confidence,rationale,decision_log_json,evidence_json,kind) VALUES (?,?,?,?,?,?,?,?)`);
        const recIds = [];
        for (const m of matches) {
          const r = insRec.run(
            user.id,
            m.career.id,
            m.score,
            m.confidence,
            `${m.career.title} fits your profile strongly \u2014 an overall match of ${m.score}%. ${m.kind === "wildcard" ? "A wildcard: a direction worth one honest look. " : ""}Your enjoyment of Mathematics and Computer Science maps directly onto this path. ${m.kind === "primary" ? "Your goals of working with technology and strong earnings align here too." : ""}`,
            JSON.stringify(m.decisionLog),
            JSON.stringify([
              { fact: `Entry salaries: ${m.career.salary_entry}; senior: ${m.career.salary_senior}`, source: m.career.source, as_of: m.career.as_of },
              { fact: `Typical route: ${JSON.parse(m.career.education_json)[0] || "\u2014"}`, source: "Career Compass course catalog", as_of: m.career.as_of }
            ]),
            m.kind
          );
          recIds.push(r.lastInsertRowid);
        }
        console.log(`Demo student: ${matches.length} recommendations, top = ${matches[0]?.career.title} (${matches[0]?.score}%)`);
        const topCareer = matches[0]?.career;
        if (topCareer) {
          const rm = buildRoadmap(user, profile, results, topCareer);
          const shareToken = crypto2.randomBytes(12).toString("hex");
          db.prepare(`INSERT INTO roadmaps (user_id,career_id,status,target_year,milestones_json,timeline_json,resources_json,high_impact,ai_mode,share_token,share_enabled,generated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(user.id, topCareer.id, "ready", profile.target_year, JSON.stringify(rm.milestones), JSON.stringify(rm.timeline), JSON.stringify(rm.resources), rm.high_impact ? 1 : 0, "local", shareToken, 1);
          const rmId = db.prepare("SELECT id FROM roadmaps WHERE user_id = ?").get(user.id).id;
          const ms = JSON.parse(JSON.stringify(rm.milestones));
          if (ms[0]?.steps?.[0]) ms[0].steps[0].done = true;
          db.prepare("UPDATE roadmaps SET milestones_json = ? WHERE id = ?").run(JSON.stringify(ms), rmId);
          db.prepare("INSERT INTO feedback (user_id,recommendation_id,thumbs,comment) VALUES (?,?,1,?)").run(user.id, recIds[0], "Feels accurate \u2014 this is what I wanted to hear, honestly.");
          db.prepare(`INSERT INTO notifications (user_id,type,title,body,link,due_at,read_at) VALUES (?,?,?,?,?,?,NULL)`).run(user.id, "checkin", "2-week check-in", "Two weeks since your roadmap \u2014 what did you act on? What is blocked?", "/app/roadmap", new Date(Date.now() - 2 * 864e5).toISOString());
          db.prepare(`INSERT INTO notifications (user_id,type,title,body,link,due_at) VALUES (?,?,?,?,?,?)`).run(user.id, "checkin", "4-week check-in", "One month in \u2014 time to review your milestones honestly.", "/app/roadmap", new Date(Date.now() + 14 * 864e5).toISOString());
          db.prepare(`INSERT INTO notifications (user_id,type,title,body,link,due_at,read_at) VALUES (?,?,?,?,?,?,datetime('now'))`).run(user.id, "welcome", "Welcome to Career Compass", "Your personalised roadmap is ready. Start with milestone 1.", "/app/roadmap", (/* @__PURE__ */ new Date()).toISOString());
          db.prepare(`INSERT INTO notifications (user_id,type,title,body,link,due_at,read_at) VALUES (?,?,?,?,?,?,datetime('now'))`).run(parentId, "share", "Aarav shared a roadmap with you", "Your child's career roadmap is ready to view.", `/shared/${shareToken}`, (/* @__PURE__ */ new Date()).toISOString());
        }
        const seCareer = db.prepare(`SELECT id FROM careers WHERE slug = 'software-engineer'`).get();
        db.prepare(`INSERT INTO mentor_questions (student_id,mentor_id,career_id,question,answer,status,sla_due_at,answered_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`).run(
          studentId,
          m1,
          seCareer?.id,
          "How different is day-to-day work between a software engineer and a data scientist? I like both coding and statistics.",
          'Great question. SWE is more about building systems \u2014 architecture, code quality, shipping. DS is more experiments \u2014 data cleaning, modelling, explaining results. If you love statistics and "why", lean DS; if you love building products people use, lean SWE. You can switch for the first 2-3 years either way.',
          "answered",
          new Date(Date.now() + 864e5).toISOString()
        );
        db.prepare(`INSERT INTO mentor_questions (student_id,mentor_id,career_id,question,status,sla_due_at) VALUES (?,?,?,?,?,?)`).run(studentId, m1, seCareer?.id, "What is one thing you wish you knew before choosing engineering at college?", "open", new Date(Date.now() + 2 * 864e5).toISOString());
        const ghosts = [
          ["Riya Patel", "riya@demo.cc", "high_earning", "job_security", true, studentRef],
          ["Kabir Singh", "kabir@demo.cc", "social_impact", "work_with_people", false, studentRef],
          ["Ishita Rao", "ishita@demo.cc", "creative_freedom", "prestige", false, null],
          ["Arjun Nair", "arjun@demo.cc", "research", "work_with_technology", true, "CC-RIYA02"],
          ["Meera Joshi", "meera@demo.cc", "work_with_people", "job_security", false, "CC-RIYA02"]
        ];
        const ghostIds = [];
        for (const [name, email, g1, g2, paid, ref] of ghosts) {
          const referredBy = ref === studentRef ? studentId : ref === "CC-RIYA02" ? ghostIds[0] : null;
          const gid = mkUser(name, email, null, "student", { password: "demo1234", referred_by: referredBy, is_demo: true });
          ghostIds.push(gid);
          db.prepare(`INSERT INTO student_profiles (user_id,class_level,stream,subjects_json,goals_json,budget,city,target_year) VALUES (?,?,?,?,?,?,?,?)`).run(gid, "Class 12", "Science", JSON.stringify({ Biology: 4, Chemistry: 4, Physics: 3 }), JSON.stringify([g1, g2]), "low", "Patna, Bihar", (/* @__PURE__ */ new Date()).getFullYear() + 1);
          db.prepare(`INSERT INTO assessments (user_id,status,completed_at) VALUES (?, 'completed', datetime('now','-3 days'))`).run(gid);
        }
        const physician = db.prepare(`SELECT id FROM careers WHERE slug='physician'`).get();
        db.prepare(`INSERT INTO flags (user_id,entity_type,entity_id,reason,status) VALUES (?,?,?,?, 'open')`).run(ghostIds[0], "career", String(physician?.id), "Salary range for senior doctors looks outdated after the recent pay-commission changes.");
        const kabir = ghostIds[1];
        const psych = db.prepare(`SELECT * FROM careers WHERE slug='clinical-psychologist'`).get();
        const kabirUser = db.prepare("SELECT * FROM users WHERE id = ?").get(kabir);
        const kabirProfile = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(kabir);
        db.prepare(`INSERT INTO recommendations (user_id,career_id,match_score,confidence,rationale,decision_log_json,evidence_json,kind,status,review_reason) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
          kabir,
          psych.id,
          71.4,
          "medium",
          "Pending counsellor review \u2014 this match includes a stream-change consideration.",
          JSON.stringify([{ type: "constraint", label: "Stream change", detail: `Your current stream is Science, but this career typically follows Arts (BA Psychology Hons) \u2014 a stream switch with major consequences, so a counsellor reviews it first.` }]),
          JSON.stringify([{ fact: "Route: BA (Hons) Psychology via CUET", source: "Career Compass course catalog", as_of: psych.as_of }]),
          "primary",
          "pending_review",
          "Stream-change recommendation (Science \u2192 Arts route) \u2014 high impact, requires counsellor review"
        );
        audit(adminId, "seed.run", "database", { careers: db.prepare("SELECT COUNT(*) c FROM careers").get().c });
        db.prepare(`INSERT INTO meta (key,value) VALUES ('seed_version', ?)`).run("1.0.0");
      });
      TX();
    }
    if (RUN_AS_CLI) {
      console.log(`
Seed complete (+${web.inserted} web-collected colleges, ${web.annotated} NIRF-2025 rank annotations).`);
      console.log("Demo accounts (password sign-in):");
      console.log("  Student : student@demo.cc   / demo1234  (fully worked: assessment + matches + roadmap)");
      console.log("  Parent  : parent@demo.cc    / demo1234");
      console.log("  Mentor  : mentor@demo.cc    / demo1234");
      console.log("  Admin   : admin@demo.cc     / (admin password set at seed \u2014 see README)");
      process.exit(0);
    }
  }
});

// server/utils.js
function fail(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}
function parseJSON2(s, fallback) {
  if (s == null) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
function rateLimit(identifier, max = 6, windowMs = 10 * 60 * 1e3) {
  const now = Date.now();
  const rec = OTP_RATE_LIMIT.get(identifier);
  if (!rec || now > rec.resetAt) {
    OTP_RATE_LIMIT.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}
var OTP_RATE_LIMIT;
var init_utils = __esm({
  "server/utils.js"() {
    OTP_RATE_LIMIT = /* @__PURE__ */ new Map();
  }
});

// server/routes/auth.js
import { Router } from "express";
var authRouter, DEMO_PASSWORD;
var init_auth2 = __esm({
  "server/routes/auth.js"() {
    init_db();
    init_auth();
    init_utils();
    authRouter = Router();
    DEMO_PASSWORD = "demo1234";
    authRouter.get("/demo", (_req, res) => {
      if (process.env.DEMO_MODE === "false") return res.json({ ok: true, data: { demo: false } });
      res.json({
        ok: true,
        data: {
          demo: true,
          accounts: [
            { email: "student@demo.cc", password: DEMO_PASSWORD, role: "student", note: "fully worked: assessment \u2713 matches \u2713 roadmap \u2713" },
            { email: "parent@demo.cc", password: DEMO_PASSWORD, role: "parent", note: "linked to Aarav (student)" },
            { email: "mentor@demo.cc", password: DEMO_PASSWORD, role: "mentor", note: "Dr. Neha Verma \u2014 answers student questions" }
          ]
        }
      });
    });
    authRouter.post("/signup", (req, res) => {
      const { name, identifier, password, role = "student", isMinor, consent, parentConsentCode, referralCode } = req.body || {};
      const id = normalizeIdentifier(identifier);
      if (!id) return fail(res, 400, "BAD_IDENTIFIER", "Enter a valid email address or 10-digit mobile number.");
      if (!rateLimit(`signup:${id.value}`)) return fail(res, 429, "RATE_LIMITED", "Too many attempts. Wait a few minutes and try again.");
      if (!name || String(name).trim().length < 2) return fail(res, 400, "NAME_REQUIRED", "Please tell us your name.");
      if (!["student", "parent"].includes(role)) return fail(res, 400, "ROLE", "Sign-up is open to students and parents. Mentors join by invitation.");
      const pwProblem = passwordProblem(password);
      if (pwProblem) return fail(res, 400, "WEAK_PASSWORD", pwProblem);
      const existing = db.prepare(`SELECT id FROM users WHERE ${id.kind} = ? AND deleted_at IS NULL`).get(id.value);
      if (existing) return fail(res, 409, "ACCOUNT_EXISTS", "An account already exists with that email/phone. Sign in instead, or reset your password from Account.");
      const pwHash = hashPassword(password);
      let referred_by = null;
      if (referralCode) {
        const ref = db.prepare("SELECT id FROM users WHERE referral_code = ? AND deleted_at IS NULL").get(String(referralCode).trim().toUpperCase());
        if (ref) referred_by = ref.id;
      }
      if (role === "parent") {
        if (!parentConsentCode) return fail(res, 400, "CONSENT_CODE", "Parents join with the consent code from their child's account.");
        const child = db.prepare("SELECT * FROM users WHERE consent_code = ? AND deleted_at IS NULL").get(String(parentConsentCode).trim().toUpperCase());
        if (!child) return fail(res, 400, "CONSENT_CODE", "That consent code doesn't match any student. Ask your child to share it from their profile.");
        const r2 = db.prepare(`INSERT INTO users (role,name,${id.kind},password_hash,referral_code,referred_by,is_demo) VALUES (?,?,?,?,?,?,0)`).run("parent", String(name).trim(), id.value, pwHash, generateCode("CC-", 6), referred_by);
        const parentId = r2.lastInsertRowid;
        db.prepare("UPDATE users SET parent_user_id = ?, consent_status = ? WHERE id = ?").run(parentId, "given", child.id);
        db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(child.id, "consent", "Parent linked", `${String(name).trim()} is now linked to your account and can view roadmaps you share.`, "/app/account");
        audit(parentId, "consent.linked", `user:${child.id}`, {});
        const u = db.prepare("SELECT * FROM users WHERE id = ?").get(parentId);
        const token2 = loginUser(res, u);
        return res.json({ ok: true, data: { user: publicUser(u), token: token2, isNew: true, role: "parent" } });
      }
      let consent_status = "not_applicable", consent_code = null;
      if (isMinor) {
        if (!consent) return fail(res, 400, "CONSENT", "A parent/guardian must consent for students under 18.");
        consent_status = "pending";
        consent_code = generateCode("PC-");
      }
      const r = db.prepare(`INSERT INTO users (role,name,${id.kind},password_hash,is_minor,consent_status,consent_code,referral_code,referred_by,is_demo) VALUES (?,?,?,?,?,?,?,?,?,0)`).run("student", String(name).trim(), id.value, pwHash, isMinor ? 1 : 0, consent_status, consent_code, generateCode("CC-", 6), referred_by);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(r.lastInsertRowid);
      db.prepare("INSERT INTO student_profiles (user_id) VALUES (?)").run(user.id);
      if (referred_by) {
        db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(referred_by, "referral", "Someone used your referral code", "A student joined with your referral code \u2014 your compass is pointing well.", "/app/account");
      }
      db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
        user.id,
        "welcome",
        "Welcome to Career Compass",
        isMinor ? "Start with your profile, then the 15-minute assessment. Your parent can be linked with your consent code." : "Start with your profile, then the 15-minute assessment. One honest roadmap, not another list of options.",
        "/app/profile"
      );
      audit(user.id, "user.signup", `user:${user.id}`, { role, referred_by });
      const token = loginUser(res, user);
      res.json({ ok: true, data: { user: publicUser(user), token, isNew: true, consentCode: consent_code || void 0 } });
    });
    authRouter.post("/signin", (req, res) => {
      const { identifier, password } = req.body || {};
      const id = normalizeIdentifier(identifier);
      if (!id || !password) return fail(res, 400, "BAD_REQUEST", "Enter your email/phone and password.");
      if (!rateLimit(`signin:${id.value}`, 8, 10 * 60 * 1e3)) return fail(res, 429, "RATE_LIMITED", "Too many sign-in attempts. Wait a few minutes and try again.");
      const user = db.prepare(`SELECT * FROM users WHERE ${id.kind} = ? AND deleted_at IS NULL`).get(id.value);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return fail(res, 401, "BAD_CREDENTIALS", "That email/phone or password is incorrect.");
      }
      const token = loginUser(res, user);
      res.json({ ok: true, data: { user: publicUser(user), token, isNew: false } });
    });
    authRouter.post("/password/change", requireAuth(), (req, res) => {
      const { current, next } = req.body || {};
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
      if (!verifyPassword(current || "", user?.password_hash)) return fail(res, 401, "BAD_PASSWORD", "Your current password is incorrect.");
      const pwProblem = passwordProblem(next);
      if (pwProblem) return fail(res, 400, "WEAK_PASSWORD", pwProblem);
      if (current === next) return fail(res, 400, "SAME_PASSWORD", "Choose a password you haven't used here before.");
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
      destroyOtherSessions(user.id, req.sessionToken);
      audit(user.id, "password.change", `user:${user.id}`, {});
      res.json({ ok: true, data: { changed: true } });
    });
    authRouter.post("/logout", (req, res) => {
      destroySession(req.sessionToken);
      res.clearCookie("cc_session", { path: "/" });
      res.json({ ok: true, data: {} });
    });
    authRouter.get("/me", (req, res) => {
      if (!req.user) return res.json({ ok: true, data: { user: null } });
      const profile = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(req.user.id);
      const results = db.prepare("SELECT 1 FROM assessment_results WHERE user_id = ?").get(req.user.id);
      const assessment = db.prepare(`SELECT id, status FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 1`).get(req.user.id);
      const mentor = req.user.role === "mentor" ? db.prepare("SELECT * FROM mentors WHERE user_id = ?").get(req.user.id) : null;
      const children = req.user.role === "parent" ? db.prepare("SELECT id, name, email, consent_status FROM users WHERE parent_user_id = ? AND deleted_at IS NULL").all(req.user.id) : [];
      const sharedToMe = req.user.role === "parent" ? db.prepare(`SELECT r.share_token, r.status AS rm_status, c.title AS career_title, u.name AS student_name FROM roadmaps r JOIN users u ON u.id = r.user_id JOIN careers c ON c.id = r.career_id WHERE r.user_id IN (SELECT id FROM users WHERE parent_user_id = ?) AND r.share_enabled = 1`).all(req.user.id) : [];
      res.json({
        ok: true,
        data: {
          user: publicUser(req.user),
          hasProfile: !!profile?.class_level,
          assessmentDone: !!results,
          assessmentStatus: assessment?.status || null,
          mentor: mentor ? { verified: !!mentor.verified, headline: mentor.headline, fields: JSON.parse(mentor.fields_json) } : null,
          children,
          sharedToMe,
          consentCode: req.user.consent_code
        }
      });
    });
    authRouter.post("/consent/generate", requireAuth("student"), (req, res) => {
      const code = generateCode("PC-");
      db.prepare("UPDATE users SET consent_code = ?, consent_status = ? WHERE id = ?").run(code, "pending", req.user.id);
      audit(req.user.id, "consent.code_generated", `user:${req.user.id}`, {});
      res.json({ ok: true, data: { code } });
    });
  }
});

// server/routes/profile.js
import { Router as Router2 } from "express";
var profileRouter;
var init_profile = __esm({
  "server/routes/profile.js"() {
    init_db();
    init_auth();
    init_utils();
    init_questions();
    profileRouter = Router2();
    profileRouter.get("/meta", (_req, res) => {
      res.json({ ok: true, data: { subjects: SUBJECTS, goals: GOALS, budgets: BUDGETS } });
    });
    profileRouter.get("/", requireAuth("student"), (req, res) => {
      const p = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(req.user.id);
      if (!p) return res.json({ ok: true, data: { profile: null, completeness: 0 } });
      let filled = 0, total = 8;
      if (p.class_level) filled++;
      if (p.stream) filled++;
      if (Object.keys(parseJSON2(p.subjects_json, {})).length >= 4) filled++;
      if (parseJSON2(p.goals_json, []).length >= 1) filled++;
      if (p.budget) filled++;
      if (p.city) filled++;
      if (p.target_year) filled++;
      if (parseJSON2(p.strengths_json, []).length >= 1) filled++;
      res.json({
        ok: true,
        data: {
          profile: {
            class_level: p.class_level,
            stream: p.stream,
            subjects: parseJSON2(p.subjects_json, {}),
            interests: parseJSON2(p.interests_json, []),
            strengths: parseJSON2(p.strengths_json, []),
            skills: parseJSON2(p.skills_json, []),
            goals: parseJSON2(p.goals_json, []),
            goal_note: p.goal_note,
            budget: p.budget,
            city: p.city,
            willing_to_relocate: !!p.willing_to_relocate,
            target_year: p.target_year
          },
          completeness: Math.round(filled / total * 100)
        }
      });
    });
    profileRouter.put("/", requireAuth("student"), (req, res) => {
      const b = req.body || {};
      const subjects = {};
      for (const [k, v] of Object.entries(b.subjects || {})) {
        const n2 = Number(v);
        if (SUBJECTS.includes(k) && n2 >= 1 && n2 <= 5) subjects[k] = n2;
      }
      const goals = (b.goals || []).filter((g2) => GOALS.some((x) => x.id === g2));
      const stream = ["Science", "Commerce", "Arts"].includes(b.stream) ? b.stream : null;
      const budget = ["low", "medium", "high"].includes(b.budget) ? b.budget : null;
      const targetYear = Number(b.target_year) >= (/* @__PURE__ */ new Date()).getFullYear() && Number(b.target_year) <= (/* @__PURE__ */ new Date()).getFullYear() + 3 ? Number(b.target_year) : null;
      db.prepare(`INSERT INTO student_profiles (user_id,class_level,stream,subjects_json,interests_json,strengths_json,skills_json,goals_json,goal_note,budget,city,willing_to_relocate,target_year,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET class_level=excluded.class_level, stream=excluded.stream, subjects_json=excluded.subjects_json,
      interests_json=excluded.interests_json, strengths_json=excluded.strengths_json, skills_json=excluded.skills_json, goals_json=excluded.goals_json,
      goal_note=excluded.goal_note, budget=excluded.budget, city=excluded.city, willing_to_relocate=excluded.willing_to_relocate,
      target_year=excluded.target_year, updated_at=datetime('now')`).run(
        req.user.id,
        b.class_level || null,
        stream,
        JSON.stringify(subjects),
        JSON.stringify(b.interests || []),
        JSON.stringify((b.strengths || []).slice(0, 10)),
        JSON.stringify((b.skills || []).slice(0, 10)),
        JSON.stringify(goals),
        String(b.goal_note || "").slice(0, 500),
        budget,
        String(b.city || "").slice(0, 80),
        b.willing_to_relocate === false ? 0 : 1,
        targetYear
      );
      audit(req.user.id, "profile.update", `user:${req.user.id}`, { stream, goals });
      res.json({ ok: true, data: { saved: true } });
    });
    profileRouter.get("/journal", requireAuth("student"), (req, res) => {
      const rows2 = db.prepare("SELECT * FROM journal_entries WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(req.user.id);
      res.json({ ok: true, data: { entries: rows2 } });
    });
    profileRouter.post("/journal", requireAuth("student"), (req, res) => {
      const text = String(req.body?.text || "").trim();
      if (text.length < 2) return fail(res, 400, "TEXT", "Write something first.");
      const r = db.prepare("INSERT INTO journal_entries (user_id,text) VALUES (?,?)").run(req.user.id, text.slice(0, 1e3));
      res.json({ ok: true, data: { id: r.lastInsertRowid } });
    });
  }
});

// server/routes/assessment.js
import { Router as Router3 } from "express";
var assessmentRouter, QUESTIONS, sanitize;
var init_assessment = __esm({
  "server/routes/assessment.js"() {
    init_db();
    init_auth();
    init_utils();
    init_questions();
    assessmentRouter = Router3();
    QUESTIONS = buildQuestions();
    sanitize = (q) => ({ id: q.id, sub_test: q.sub_test, dimension: q.dimension, text: q.text, options: q.options || null });
    assessmentRouter.get("/", requireAuth("student"), (req, res) => {
      let a = db.prepare("SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!a) {
        const r = db.prepare("INSERT INTO assessments (user_id) VALUES (?)").run(req.user.id);
        a = db.prepare("SELECT * FROM assessments WHERE id = ?").get(r.lastInsertRowid);
      }
      const answers = {};
      db.prepare("SELECT question_id, value FROM assessment_answers WHERE assessment_id = ?").all(a.id).forEach((r) => {
        answers[r.question_id] = Number(r.value);
      });
      const results = db.prepare("SELECT * FROM assessment_results WHERE user_id = ?").get(req.user.id);
      res.json({
        ok: true,
        data: {
          status: a.status,
          questions: QUESTIONS.map(sanitize),
          answers,
          progress: { answered: Object.keys(answers).length, total: QUESTIONS.length },
          results: results ? { riasec: JSON.parse(results.riasec_json), aptitude: JSON.parse(results.aptitude_json), interestTags: JSON.parse(results.interest_tags_json) } : null
        }
      });
    });
    assessmentRouter.post("/answer", requireAuth("student"), (req, res) => {
      const { questionId, value } = req.body || {};
      const q = QUESTIONS.find((x) => x.id === questionId);
      if (!q) return fail(res, 400, "BAD_QUESTION", "Unknown question.");
      let v = Number(value);
      if (q.sub_test === "aptitude") {
        if (!Number.isInteger(v) || v < 0 || v >= q.options.length) return fail(res, 400, "BAD_VALUE", "Pick one of the options.");
      } else {
        if (!Number.isInteger(v) || v < 1 || v > 5) return fail(res, 400, "BAD_VALUE", "Rate from 1 to 5.");
      }
      const a = db.prepare("SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!a || a.status === "completed") return fail(res, 400, "COMPLETED", "This assessment is already complete.");
      db.prepare("INSERT INTO assessment_answers (assessment_id,question_id,value) VALUES (?,?,?) ON CONFLICT(assessment_id,question_id) DO UPDATE SET value=excluded.value").run(a.id, questionId, String(v));
      const count = db.prepare("SELECT COUNT(*) c FROM assessment_answers WHERE assessment_id = ?").get(a.id).c;
      res.json({ ok: true, data: { answered: count, total: QUESTIONS.length } });
    });
    assessmentRouter.post("/demo-fill", requireAuth("student"), (req, res) => {
      let a = db.prepare("SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!a) {
        const r = db.prepare("INSERT INTO assessments (user_id) VALUES (?)").run(req.user.id);
        a = db.prepare("SELECT * FROM assessments WHERE id = ?").get(r.lastInsertRowid);
      }
      if (a.status === "completed") return fail(res, 400, "COMPLETED", "Already completed.");
      const ins = db.prepare("INSERT INTO assessment_answers (assessment_id,question_id,value) VALUES (?,?,?) ON CONFLICT(assessment_id,question_id) DO UPDATE SET value=excluded.value");
      const persona = req.body?.persona || "tech";
      const traitBoost = { tech: { I: 5, R: 4, C: 3, A: 3, S: 2, E: 3 }, healer: { S: 5, I: 4, A: 3, R: 2, E: 3, C: 3 }, creator: { A: 5, S: 4, E: 3, I: 3, R: 3, C: 2 }, leader: { E: 5, S: 4, C: 3, I: 3, R: 3, A: 2 } }[persona] || { I: 4, R: 3, A: 3, S: 3, E: 3, C: 3 };
      const tagBoost = {
        tech: { coding: 5, electronics: 4, research: 4, business: 3, design: 2, healthcare: 1, writing: 2, performing: 1, nature: 2, teaching: 2, leading: 3, law: 2, organizing: 3, social_impact: 2, sports: 3, travel: 3, food: 2, media: 3, biology: 2, building: 4 },
        healer: { healthcare: 5, biology: 5, social_impact: 4, teaching: 4, nature: 3, organizing: 3, research: 3, writing: 2, coding: 1, business: 2, design: 2, leading: 3, law: 2, sports: 3, travel: 2, food: 2, media: 2, performing: 2, electronics: 1, building: 2 },
        creator: { design: 5, media: 5, writing: 4, performing: 4, food: 3, travel: 3, coding: 3, business: 3, nature: 2, teaching: 2, healthcare: 1, biology: 2, research: 2, leading: 3, law: 2, organizing: 2, social_impact: 2, sports: 2, electronics: 2, building: 3 },
        leader: { leading: 5, business: 5, law: 4, organizing: 4, social_impact: 3, teaching: 3, writing: 3, travel: 4, coding: 2, design: 2, healthcare: 2, biology: 2, research: 2, nature: 2, performing: 3, sports: 3, food: 3, media: 3, electronics: 2, building: 2 }
      }[persona] || {};
      for (const q of QUESTIONS) {
        if (q.sub_test === "aptitude") ins.run(a.id, q.id, String(Math.random() < 0.7 ? q.correct : (q.correct + 1) % q.options.length));
        else if (q.sub_test === "personality") ins.run(a.id, q.id, String(traitBoost[q.dimension] || 3));
        else ins.run(a.id, q.id, String(tagBoost[q.dimension] || 3));
      }
      audit(req.user.id, "assessment.demo_fill", `assessment:${a.id}`, { persona });
      res.json({ ok: true, data: { filled: true } });
    });
    assessmentRouter.post("/complete", requireAuth("student"), (req, res) => {
      const a = db.prepare("SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!a) return fail(res, 400, "NO_ASSESSMENT", "Start the assessment first.");
      if (a.status === "completed") return res.json({ ok: true, data: { already: true } });
      const count = db.prepare("SELECT COUNT(*) c FROM assessment_answers WHERE assessment_id = ?").get(a.id).c;
      if (count < QUESTIONS.length * 0.9) {
        return fail(res, 400, "INCOMPLETE", `Answer at least ${Math.ceil(QUESTIONS.length * 0.9)} of ${QUESTIONS.length} questions first (${count} done).`);
      }
      const answers = {};
      db.prepare("SELECT question_id, value FROM assessment_answers WHERE assessment_id = ?").all(a.id).forEach((r) => {
        answers[r.question_id] = Number(r.value);
      });
      const scored = scoreAssessment(QUESTIONS, answers);
      db.prepare(`INSERT INTO assessment_results (user_id,riasec_json,aptitude_json,interest_tags_json) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET riasec_json=excluded.riasec_json, aptitude_json=excluded.aptitude_json, interest_tags_json=excluded.interest_tags_json, computed_at=datetime('now')`).run(req.user.id, JSON.stringify(scored.riasec), JSON.stringify(scored.aptitude), JSON.stringify(scored.interestTags));
      db.prepare(`UPDATE assessments SET status='completed', completed_at=datetime('now') WHERE id=?`).run(a.id);
      audit(req.user.id, "assessment.completed", `assessment:${a.id}`, { riasec: scored.riasec });
      res.json({ ok: true, data: { riasec: scored.riasec, aptitude: scored.aptitude } });
    });
  }
});

// server/routes/catalog.js
import { Router as Router4 } from "express";
var catalogRouter, J, TABLES, SINGULAR;
var init_catalog = __esm({
  "server/routes/catalog.js"() {
    init_db();
    init_auth();
    init_utils();
    catalogRouter = Router4();
    J = (row) => {
      const out = { ...row };
      for (const k of Object.keys(row)) if (k.endsWith("_json")) out[k.slice(0, -5)] = parseJSON2(row[k], []);
      return out;
    };
    TABLES = { careers: "careers", courses: "courses", colleges: "colleges", exams: "exams" };
    SINGULAR = { career: "careers", college: "colleges", course: "courses", exam: "exams" };
    catalogRouter.get("/favourites/mine", requireAuth("student"), (req, res) => {
      const favs = db.prepare(`SELECT * FROM favourites WHERE user_id = ? ORDER BY id DESC`).all(req.user.id);
      const out = [];
      for (const f of favs) {
        const table = SINGULAR[f.entity_type];
        if (!table) continue;
        const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(f.entity_id);
        if (row) out.push({ entity_type: f.entity_type, favourited_at: f.created_at, item: J(row) });
      }
      res.json({ ok: true, data: { favourites: out } });
    });
    catalogRouter.post("/favourites", requireAuth("student"), (req, res) => {
      const { entity_type, entity_id } = req.body || {};
      const table = SINGULAR[entity_type] || TABLES[entity_type];
      if (!table) return fail(res, 400, "BAD_TYPE", "Unknown catalog type.");
      const exists = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(entity_id);
      if (!exists) return fail(res, 404, "NOT_FOUND", "No such item.");
      db.prepare("INSERT OR IGNORE INTO favourites (user_id,entity_type,entity_id) VALUES (?,?,?)").run(req.user.id, entity_type, String(entity_id));
      res.json({ ok: true, data: { saved: true } });
    });
    catalogRouter.delete("/favourites/:type/:id", requireAuth("student"), (req, res) => {
      db.prepare("DELETE FROM favourites WHERE user_id = ? AND entity_type = ? AND entity_id = ?").run(req.user.id, req.params.type, req.params.id);
      res.json({ ok: true, data: { removed: true } });
    });
    catalogRouter.get("/:type", (req, res) => {
      const table = TABLES[req.params.type];
      if (!table) return fail(res, 404, "NOT_FOUND", "Unknown catalog type.");
      const { search, stream, growth, emerging, type, level, page = 1 } = req.query;
      const where = [];
      const params = [];
      const nameCol = table === "careers" ? "title" : "name";
      const SEARCH_COLS = {
        careers: ["title", "summary"],
        courses: ["name", "about"],
        colleges: ["name", "city", "state", "type"],
        exams: ["name", "conducted_by", "about"]
      }[table];
      if (search) {
        where.push(`(${SEARCH_COLS.map((c) => `${c} LIKE ?`).join(" OR ")})`);
        const s = `%${search}%`;
        params.push(...SEARCH_COLS.map(() => s));
      }
      if (stream) {
        where.push("streams_json LIKE ?");
        params.push(`%${stream}%`);
      }
      if (growth) {
        where.push("growth = ?");
        params.push(growth);
      }
      if (emerging === "1" && table === "careers") {
        where.push("emerging = 1");
      }
      if (type && table === "colleges") {
        if (["IIT", "NIT", "IIIT", "AIIMS", "NIFT"].includes(type)) {
          where.push("type = ?");
          params.push(type);
        } else {
          where.push("type LIKE ?");
          params.push(`%${type}%`);
        }
      }
      if (level && table === "exams") {
        where.push("level LIKE ?");
        params.push(`%${level}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const total = db.prepare(`SELECT COUNT(*) c FROM ${table} ${whereSql}`).get(...params).c;
      const p = Math.max(1, Number(page));
      const rows2 = db.prepare(`SELECT * FROM ${table} ${whereSql} ORDER BY ${nameCol} COLLATE NOCASE LIMIT 24 OFFSET ?`).all(...params, (p - 1) * 24).map(J);
      if (req.user && req.params.type === "careers" && req.user.role === "student") {
        const recs = db.prepare(`SELECT career_id, match_score FROM recommendations WHERE user_id = ? AND status = 'active'`).all(req.user.id);
        const byId = Object.fromEntries(recs.map((r) => [r.career_id, r.match_score]));
        rows2.forEach((r) => {
          if (byId[r.id] != null) r.your_match = byId[r.id];
        });
      }
      res.json({ ok: true, data: { items: rows2, total, page: p, pages: Math.ceil(total / 24) } });
    });
    catalogRouter.get("/:type/:slug", (req, res) => {
      const table = TABLES[req.params.type];
      if (!table) return fail(res, 404, "NOT_FOUND", "Unknown catalog type.");
      const row = db.prepare(`SELECT * FROM ${table} WHERE slug = ?`).get(req.params.slug);
      if (!row) return fail(res, 404, "NOT_FOUND", "Not found in the knowledge base.");
      const item = J(row);
      if (req.params.type === "careers") {
        item.courses = item.education?.length ? db.prepare(`SELECT slug, name, level, duration, about, as_of FROM courses WHERE slug IN (${item.education.map(() => "?").join(",")})`).all(...item.education) : [];
        item.exams_detail = item.exams?.length ? db.prepare(`SELECT slug, name, conducted_by, timeline_json, as_of, source, about FROM exams WHERE slug IN (${item.exams.map(() => "?").join(",")})`).all(...item.exams).map(J) : [];
        const examNames = item.exams_detail.flatMap((e) => parseJSON2(e.timeline_json, []) && [e.name]);
        item.colleges = db.prepare(`SELECT slug, name, city, state, type, approx_fees_per_year, as_of FROM colleges WHERE entrance_exams_json LIKE ? OR entrance_exams_json LIKE ? LIMIT 8`).all(`%${examNames[0] || "JEE Main"}%`, `%${examNames[1] || examNames[0] || "JEE Main"}%`);
        item.favourited = !!(req.user && db.prepare(`SELECT 1 FROM favourites WHERE user_id = ? AND entity_type = 'career' AND entity_id = ?`).get(req.user.id, String(row.id)));
      }
      if (req.params.type === "colleges") item.favourited = !!(req.user && db.prepare(`SELECT 1 FROM favourites WHERE user_id = ? AND entity_type = 'college' AND entity_id = ?`).get(req.user.id, String(row.id)));
      if (req.params.type === "exams") {
        const t = item.timeline;
        item.favourited = false;
      }
      res.json({ ok: true, data: { item } });
    });
    catalogRouter.post("/compare", (req, res) => {
      const { type, ids } = req.body || {};
      const table = TABLES[type];
      if (!table || !Array.isArray(ids) || ids.length < 2 || ids.length > 3) {
        return fail(res, 400, "BAD_COMPARE", "Compare 2\u20133 items from one catalog.");
      }
      if (type === "careers") {
        const rows3 = db.prepare(`SELECT * FROM careers WHERE slug IN (${ids.map(() => "?").join(",")})`).all(...ids).map(J);
        return res.json({ ok: true, data: { items: rows3.map((r) => ({ slug: r.slug, title: r.title, summary: r.summary, salary_entry: r.salary_entry, salary_senior: r.salary_senior, growth: r.growth, streams: r.streams, skills: r.skills, education: r.education, exams: r.exams, day_in_life: r.day_in_life, as_of: r.as_of, source: r.source })) } });
      }
      if (type === "colleges") {
        const rows3 = db.prepare(`SELECT * FROM colleges WHERE slug IN (${ids.map(() => "?").join(",")})`).all(...ids).map(J);
        return res.json({ ok: true, data: { items: rows3 } });
      }
      const rows2 = db.prepare(`SELECT * FROM ${table} WHERE slug IN (${ids.map(() => "?").join(",")})`).all(...ids).map(J);
      res.json({ ok: true, data: { items: rows2 } });
    });
  }
});

// server/engine/narrative.js
function topDims(riasec, n2 = 2) {
  return Object.entries(riasec).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n2).map(([d]) => d);
}
function buildFactPack(career, match) {
  const riasec = parseJSON(career.riasec_json, {});
  const exams = parseJSON(career.exams_json, []);
  const education = parseJSON(career.education_json, []);
  const primary = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    career: {
      title: career.title,
      summary: career.summary,
      salary_entry: career.salary_entry,
      salary_senior: career.salary_senior,
      growth: career.growth,
      streams: parseJSON(career.streams_json, []),
      education: education.slice(0, 3),
      exams: exams.slice(0, 3),
      as_of: career.as_of,
      source: career.source
    },
    match: {
      score: match.score,
      kind: match.kind,
      confidence: match.confidence,
      personality_adjective: RIASEC_ADJ[primary] || "well-rounded",
      top_student_dims: topDims(parseJSON(match.studentRiasec || "{}", {})),
      loved_subjects: match.lovedSubjects || [],
      aligned_goals: match.alignedGoals || [],
      tension_goals: match.tensionGoals || []
    }
  };
}
function localNarrative(factPack) {
  const { career, match } = factPack;
  const parts = [];
  if (match.kind === "wildcard") {
    parts.push(`${career.title} is a wildcard pick \u2014 it scored ${match.score}% on your profile, lower than your top matches, but it pulls your profile in a direction worth one honest look.`);
  } else {
    parts.push(`${career.title} fits your profile strongly \u2014 an overall match of ${match.score}%${match.confidence === "high" ? " with high confidence" : ""}.`);
  }
  const dimText = match.top_student_dims?.length ? `You come across as ${match.top_student_dims.map((d) => RIASEC_ADJ[d]).join(" and ")}, and this career rewards exactly that.` : `With more assessment data, this fit could sharpen further.`;
  parts.push(dimText);
  if (match.loved_subjects?.length) {
    parts.push(`Your enjoyment of ${match.loved_subjects.join(" and ")} maps directly onto this path's core work.`);
  }
  if (match.aligned_goals?.length) {
    parts.push(`It also lines up with what you said matters: ${match.aligned_goals.join(", ")}.`);
  }
  if (match.tension_goals?.length) {
    parts.push(`One honest caveat: it scores lower on ${match.tension_goals.join(" and ")} for you \u2014 weigh that before committing.`);
  }
  parts.push(`${career.education?.length ? `The typical route is ${career.education[0]}` : "A clear route exists"}${career.exams?.length ? ` (entrance: ${career.exams.slice(0, 2).join(", ")})` : ""}. Entry salaries run ${career.salary_entry}, growing to ${career.salary_senior} with experience \u2014 ${career.growth} outlook.`);
  parts.push(`This is guidance, not a verdict \u2014 your roadmap shows the next steps to test it in the real world.`);
  return parts.join(" ");
}
async function llmNarrative(factPack) {
  const { career, match } = factPack;
  const prompt = `You are the explanation engine of a trusted career-guidance app for Indian students.
Write 4-6 short sentences (max 120 words) explaining why this career fits this student.
Use ONLY the facts below. Do not invent statistics, colleges, exams or salaries.
Warm, honest, plain English (grade-8 reading level). Acknowledge tensions if given.
End with one sentence framing it as guidance, not destiny.

STUDENT MATCH DATA:
${JSON.stringify(match)}
CAREER FACTS (only source of truth):
${JSON.stringify(career)}`;
  if (process.env.OPENAI_API_KEY) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.4
      })
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const j = await resp.json();
    return j.choices[0].message.content.trim();
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}`);
    const j = await resp.json();
    return j.content[0].text.trim();
  }
  throw new Error("No LLM key configured");
}
async function generateNarrative(career, match, opts = {}) {
  const factPack = buildFactPack(career, match);
  const simulateFailure = opts.simulateFailure || getSetting("simulate_ai_failure", "0") === "1";
  const hasKey = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  if (!simulateFailure && hasKey) {
    try {
      const text = await llmNarrative(factPack);
      return { text, mode: "llm" };
    } catch (err) {
      console.warn("[narrative] LLM failed, falling back to local generator:", err.message);
    }
  }
  return { text: localNarrative(factPack), mode: simulateFailure ? "fallback" : "local" };
}
var RIASEC_ADJ;
var init_narrative = __esm({
  "server/engine/narrative.js"() {
    init_db();
    init_db_helper();
    RIASEC_ADJ = {
      R: "hands-on and practical",
      I: "curious and analytical",
      A: "creative and expressive",
      S: "people-oriented and supportive",
      E: "persuasive and leadership-minded",
      C: "organized and detail-focused"
    };
  }
});

// server/routes/recommendations.js
import { Router as Router5 } from "express";
var recRouter, shapeRec;
var init_recommendations = __esm({
  "server/routes/recommendations.js"() {
    init_db();
    init_auth();
    init_utils();
    init_matcher();
    init_narrative();
    recRouter = Router5();
    recRouter.post("/generate", requireAuth("student"), async (req, res) => {
      const profile = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(req.user.id);
      const results = db.prepare("SELECT * FROM assessment_results WHERE user_id = ?").get(req.user.id);
      if (!results) return fail(res, 400, "NO_RESULTS", "Complete the assessment first \u2014 your matches come from it.");
      if (!profile?.class_level) return fail(res, 400, "NO_PROFILE", "Fill your profile first \u2014 matches use your subjects and goals too.");
      const matches = computeMatches(req.user, profile, results);
      if (!matches.length) return fail(res, 500, "NO_MATCHES", "The engine found no matches \u2014 please contact support.");
      db.prepare(`UPDATE recommendations SET status = 'rejected' WHERE user_id = ? AND status IN ('active','pending_review')`).run(req.user.id);
      const ins = db.prepare(`INSERT INTO recommendations (user_id,career_id,match_score,confidence,rationale,decision_log_json,evidence_json,kind,status) VALUES (?,?,?,?,?,?,?,?, 'active')`);
      let aiModes = [];
      for (const m of matches) {
        const narrative = await generateNarrative(m.career, {
          score: m.score,
          kind: m.kind,
          confidence: m.confidence,
          studentRiasec: results.riasec_json,
          lovedSubjects: m.decisionLog.filter((l) => l.type === "subjects" && l.label === "Subject strengths").map((l) => l.detail.match(/You enjoy (.+?) —/)?.[1] || null).filter(Boolean),
          alignedGoals: m.decisionLog.filter((l) => l.type === "goals" && l.label === "Goal alignment").map((l) => l.detail.replace("Aligns with your goals: ", "").replace(/\.$/, "")),
          tensionGoals: m.decisionLog.filter((l) => l.type === "goals" && l.label === "Goal tension").map((l) => l.detail.replace("Heads-up: this career scores low on ", "").replace(/ for you\..*$/, "").replace(/ and /g, ", ").split(", ")).flat()
        });
        aiModes.push(narrative.mode);
        const evidence = [
          { fact: `Entry salaries: ${m.career.salary_entry} \xB7 Senior: ${m.career.salary_senior} \xB7 Outlook: ${m.career.growth}`, source: m.career.source, as_of: m.career.as_of },
          { fact: `Typical route: ${parseJSON2(m.career.education_json, [])[0] || "\u2014"}`, source: "Career Compass course catalog", as_of: m.career.as_of },
          ...parseJSON2(m.career.exams_json, []).slice(0, 1).map((ex) => {
            const exam = db.prepare("SELECT name, as_of, source, timeline_json FROM exams WHERE slug = ?").get(ex);
            return exam ? { fact: `Entrance: ${exam.name} \u2014 ${parseJSON2(exam.timeline_json, {}).application_window || "see official site"}`, source: exam.source, as_of: exam.as_of } : null;
          }).filter(Boolean)
        ];
        ins.run(req.user.id, m.career.id, m.score, m.confidence, narrative.text, JSON.stringify(m.decisionLog), JSON.stringify(evidence), m.kind);
      }
      audit(req.user.id, "recommendations.generated", `user:${req.user.id}`, { count: matches.length, ai: [...new Set(aiModes)] });
      res.json({ ok: true, data: { count: matches.length, aiModes: [...new Set(aiModes)] } });
    });
    shapeRec = (r, unlocked, rank) => {
      const career = db.prepare("SELECT id, slug, title, summary, salary_entry, salary_senior, growth, streams_json, education_json, exams_json, as_of, source, emerging FROM careers WHERE id = ?").get(r.career_id);
      const fb = db.prepare("SELECT thumbs FROM feedback WHERE user_id = ? AND recommendation_id = ? ORDER BY id DESC LIMIT 1").get(r.user_id, r.id);
      const base = {
        id: r.id,
        rank,
        kind: r.kind,
        status: r.status,
        review_reason: r.review_reason,
        career: { id: career.id, slug: career.slug, title: career.title, summary: career.summary, growth: career.growth, emerging: !!career.emerging, streams: parseJSON2(career.streams_json, []), education: parseJSON2(career.education_json, []), exams: parseJSON2(career.exams_json, []), as_of: career.as_of, source: career.source },
        match_score: Math.round(r.match_score),
        confidence: r.confidence,
        your_feedback: fb?.thumbs || 0
      };
      const locked = !unlocked && rank > 1;
      if (r.status === "pending_review") return { ...base, pending: true };
      if (locked) return { ...base, locked: true };
      return { ...base, locked: false, rationale: r.rationale, evidence: parseJSON2(r.evidence_json, []), decision_log: parseJSON2(r.decision_log_json, []) };
    };
    recRouter.get("/", requireAuth("student"), (req, res) => {
      const rows2 = db.prepare(`SELECT * FROM recommendations WHERE user_id = ? AND status IN ('active','pending_review') ORDER BY match_score DESC`).all(req.user.id);
      if (!rows2.length) return res.json({ ok: true, data: { free: true, matches: [], has_any: false } });
      const sorted = [...rows2].sort((a, b) => (a.kind === "wildcard") - (b.kind === "wildcard") || b.match_score - a.match_score);
      const matches = sorted.map((r, i) => shapeRec(r, true, i + 1));
      res.json({ ok: true, data: { free: true, matches, has_any: true } });
    });
    recRouter.get("/:id", requireAuth("student"), (req, res) => {
      const r = db.prepare(`SELECT * FROM recommendations WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
      if (!r) return fail(res, 404, "NOT_FOUND", "Recommendation not found.");
      const rank = db.prepare(`SELECT COUNT(*) + 1 AS r FROM recommendations WHERE user_id = ? AND status IN ('active','pending_review') AND match_score > ? AND kind = 'primary'`).get(req.user.id, r.match_score).r;
      const shaped = shapeRec(r, true, rank);
      res.json({ ok: true, data: shaped });
    });
    recRouter.post("/:id/feedback", requireAuth("student"), (req, res) => {
      const { thumbs, comment } = req.body || {};
      if (![1, -1].includes(Number(thumbs))) return fail(res, 400, "BAD_VALUE", "thumbs must be 1 or -1.");
      const r = db.prepare("SELECT * FROM recommendations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
      if (!r) return fail(res, 404, "NOT_FOUND", "Not found.");
      db.prepare("INSERT INTO feedback (user_id,recommendation_id,thumbs,comment) VALUES (?,?,?,?)").run(req.user.id, r.id, Number(thumbs), String(comment || "").slice(0, 500) || null);
      res.json({ ok: true, data: { recorded: true } });
    });
    recRouter.post("/:id/flag", requireAuth(), (req, res) => {
      const r = db.prepare("SELECT * FROM recommendations WHERE id = ?").get(req.params.id);
      if (!r) return fail(res, 404, "NOT_FOUND", "Not found.");
      db.prepare("INSERT INTO flags (user_id,entity_type,entity_id,reason) VALUES (?,?,?,?)").run(req.user.id, "recommendation", String(r.id), String(req.body?.reason || "Flagged for review").slice(0, 500));
      audit(req.user.id, "flag.created", `recommendation:${r.id}`, {});
      res.json({ ok: true, data: { flagged: true, message: "Thank you \u2014 a counsellor will review this. Trust is the product." } });
    });
  }
});

// server/routes/roadmaps.js
import { Router as Router6 } from "express";
import crypto3 from "node:crypto";
function roadmapPayload(row, forStudent = true) {
  const career = db.prepare("SELECT id, slug, title, summary, salary_entry, salary_senior, growth, as_of, source FROM careers WHERE id = ?").get(row.career_id);
  const milestones = parseJSON2(row.milestones_json, []);
  const totalSteps = milestones.reduce((a, m) => a + (m.steps?.length || 0), 0);
  const doneSteps = milestones.reduce((a, m) => a + (m.steps || []).filter((s) => s.done).length, 0);
  return {
    id: row.id,
    status: row.status,
    career,
    target_year: row.target_year,
    under_review: row.review_status === "pending",
    review_status: forStudent ? row.review_status : row.review_status,
    high_impact: !!row.high_impact,
    ai_mode: row.ai_mode,
    error: row.error,
    milestones: row.review_status === "pending" && forStudent ? [] : milestones,
    timeline: row.review_status === "pending" && forStudent ? [] : parseJSON2(row.timeline_json, []),
    resources: row.review_status === "pending" && forStudent ? [] : parseJSON2(row.resources_json, []),
    progress: { done: doneSteps, total: totalSteps },
    share: { enabled: !!row.share_enabled, token: forStudent ? row.share_token : row.share_token, url: row.share_token ? `/shared/${row.share_token}` : null },
    generated_at: row.generated_at,
    created_at: row.created_at
  };
}
var roadmapRouter;
var init_roadmaps = __esm({
  "server/routes/roadmaps.js"() {
    init_db();
    init_auth();
    init_utils();
    roadmapRouter = Router6();
    roadmapRouter.post("/generate", requireAuth("student"), (req, res) => {
      const results = db.prepare("SELECT 1 FROM assessment_results WHERE user_id = ?").get(req.user.id);
      if (!results) return fail(res, 400, "NO_RESULTS", "Complete the assessment first.");
      const { careerId } = req.body || {};
      const career = db.prepare("SELECT * FROM careers WHERE id = ?").get(careerId);
      if (!career) return fail(res, 404, "NOT_FOUND", "Career not found.");
      const rec = db.prepare(`SELECT 1 FROM recommendations WHERE user_id = ? AND career_id = ? AND status IN ('active','pending_review')`).get(req.user.id, careerId);
      if (!rec) return fail(res, 400, "NOT_RECOMMENDED", "Pick one of your recommended careers to build a roadmap.");
      const profile = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(req.user.id);
      db.prepare("DELETE FROM roadmaps WHERE user_id = ?").run(req.user.id);
      db.prepare(`INSERT INTO roadmaps (user_id,career_id,status,target_year) VALUES (?,?, 'queued', ?)`).run(req.user.id, careerId, profile?.target_year || (/* @__PURE__ */ new Date()).getFullYear() + 1);
      audit(req.user.id, "roadmap.queued", `career:${careerId}`, {});
      res.json({ ok: true, data: { status: "queued" } });
    });
    roadmapRouter.get("/", requireAuth("student"), (req, res) => {
      const row = db.prepare("SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!row) return res.json({ ok: true, data: { roadmap: null } });
      const checkins = db.prepare(`SELECT * FROM notifications WHERE user_id = ? AND type = 'checkin' ORDER BY due_at ASC`).all(req.user.id).map((n2) => ({ id: n2.id, title: n2.title, body: n2.body, due_at: n2.due_at, read: !!n2.read_at }));
      res.json({ ok: true, data: { roadmap: roadmapPayload(row), checkins } });
    });
    roadmapRouter.post("/milestone", requireAuth("student"), (req, res) => {
      const row = db.prepare("SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!row || row.status !== "ready") return fail(res, 400, "NOT_READY", "No active roadmap.");
      const { milestoneIdx, stepIdx } = req.body || {};
      const ms = parseJSON2(row.milestones_json, []);
      const step = ms[Number(milestoneIdx)]?.steps?.[Number(stepIdx)];
      if (!step) return fail(res, 404, "NOT_FOUND", "Step not found.");
      step.done = !step.done;
      db.prepare("UPDATE roadmaps SET milestones_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(ms), row.id);
      if (step.done) audit(req.user.id, "roadmap.step_done", `roadmap:${row.id}`, { milestoneIdx, stepIdx });
      res.json({ ok: true, data: { done: step.done } });
    });
    roadmapRouter.post("/share", requireAuth("student"), (req, res) => {
      const row = db.prepare("SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!row || row.status !== "ready") return fail(res, 400, "NOT_READY", "No ready roadmap to share.");
      const enable = req.body?.enabled !== false;
      if (enable && !row.share_token) {
        const token = crypto3.randomBytes(12).toString("hex");
        db.prepare("UPDATE roadmaps SET share_token = ?, share_enabled = 1 WHERE id = ?").run(token, row.id);
        audit(req.user.id, "roadmap.share_enabled", `roadmap:${row.id}`, {});
        return res.json({ ok: true, data: { enabled: true, token, url: `/shared/${token}` } });
      }
      db.prepare("UPDATE roadmaps SET share_enabled = ? WHERE id = ?").run(enable ? 1 : 0, row.id);
      audit(req.user.id, `roadmap.share_${enable ? "enabled" : "disabled"}`, `roadmap:${row.id}`, {});
      res.json({ ok: true, data: { enabled: !!enable, token: row.share_token, url: row.share_token ? `/shared/${row.share_token}` : null } });
    });
    roadmapRouter.post("/retry", requireAuth("student"), (req, res) => {
      const row = db.prepare("SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
      if (!row || row.status !== "failed") return fail(res, 400, "NOT_FAILED", "Nothing to retry.");
      db.prepare(`UPDATE roadmaps SET status = 'queued', error = NULL WHERE id = ?`).run(row.id);
      res.json({ ok: true, data: { status: "queued" } });
    });
    roadmapRouter.post("/checkin/:notificationId", requireAuth("student"), (req, res) => {
      const n2 = db.prepare(`SELECT * FROM notifications WHERE id = ? AND user_id = ? AND type = 'checkin'`).get(req.params.notificationId, req.user.id);
      if (!n2) return fail(res, 404, "NOT_FOUND", "Check-in not found.");
      const acted = String(req.body?.acted || "").slice(0, 500);
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ?").run(n2.id);
      audit(req.user.id, "checkin.responded", `notification:${n2.id}`, { acted: acted || "(no response)" });
      res.json({ ok: true, data: { recorded: true } });
    });
  }
});

// server/routes/mentor.js
import { Router as Router7 } from "express";
function pickMentor(careerId) {
  const mentors = db.prepare(`SELECT m.*, u.name, u.deleted_at FROM mentors m JOIN users u ON u.id = m.user_id WHERE m.verified = 1 AND u.deleted_at IS NULL`).all();
  if (!mentors.length) return null;
  if (careerId) {
    const career = db.prepare("SELECT title, tags_json FROM careers WHERE id = ?").get(careerId);
    const text = `${career?.title || ""} ${career?.tags_json || ""}`.toLowerCase();
    const scored = mentors.map((m) => ({
      m,
      score: parseJSON2(m.fields_json, []).reduce((a, f) => a + (text.includes(f.toLowerCase().split(" ")[0]) ? 2 : 0), 0)
    })).sort((a, b) => b.score - a.score);
    if (scored[0].score > 0) return scored[0].m;
  }
  const loads = mentors.map((m) => ({
    m,
    load: db.prepare(`SELECT COUNT(*) c FROM mentor_questions WHERE mentor_id = ? AND status = 'open'`).get(m.user_id).c
  })).sort((a, b) => a.load - b.load);
  return loads[0].m;
}
var mentorRouter, SLA_HOURS;
var init_mentor = __esm({
  "server/routes/mentor.js"() {
    init_db();
    init_auth();
    init_utils();
    mentorRouter = Router7();
    SLA_HOURS = 48;
    mentorRouter.post("/questions", requireAuth("student"), (req, res) => {
      const question = String(req.body?.question || "").trim();
      if (question.length < 10) return fail(res, 400, "SHORT", "Give the mentor some context \u2014 at least a sentence.");
      if (question.length > 800) return fail(res, 400, "LONG", "Keep questions under 800 characters.");
      const careerId = req.body?.careerId ? Number(req.body.careerId) : null;
      const mentor = pickMentor(careerId);
      if (!mentor) return fail(res, 503, "NO_MENTOR", "All mentors are at capacity right now \u2014 try again shortly.");
      const sla = new Date(Date.now() + SLA_HOURS * 36e5).toISOString();
      const r = db.prepare(`INSERT INTO mentor_questions (student_id,mentor_id,career_id,question,status,sla_due_at) VALUES (?,?,?,?,'open',?)`).run(req.user.id, mentor.user_id, careerId, question, sla);
      sendEmail(`mentor+${mentor.user_id}@careercompass.app`, "New question assigned", question);
      audit(req.user.id, "mentor.question_asked", `mentor_question:${r.lastInsertRowid}`, {});
      res.json({ ok: true, data: { id: r.lastInsertRowid, sla_due_at: sla, sla_hours: SLA_HOURS } });
    });
    mentorRouter.get("/questions", requireAuth("student"), (req, res) => {
      const rows2 = db.prepare(`SELECT q.*, c.title AS career_title, c.slug AS career_slug, u.name AS mentor_name FROM mentor_questions q LEFT JOIN careers c ON c.id = q.career_id LEFT JOIN users u ON u.id = q.mentor_id WHERE q.student_id = ? ORDER BY q.id DESC LIMIT 30`).all(req.user.id).map((q) => ({
        ...q,
        sla_status: q.status === "answered" ? "answered" : new Date(q.sla_due_at) < /* @__PURE__ */ new Date() ? "overdue" : "within_sla",
        answer: q.answer || null
      }));
      res.json({ ok: true, data: { questions: rows2, sla_hours: SLA_HOURS } });
    });
    mentorRouter.get("/inbox", requireAuth("mentor"), (req, res) => {
      const rows2 = db.prepare(`SELECT q.*, c.title AS career_title, s.name AS student_name FROM mentor_questions q LEFT JOIN careers c ON c.id = q.career_id JOIN users s ON s.id = q.student_id WHERE q.mentor_id = ? ORDER BY q.status = 'open' DESC, q.id DESC LIMIT 50`).all(req.user.id).map((q) => ({ ...q, sla_status: q.status === "answered" ? "answered" : new Date(q.sla_due_at) < /* @__PURE__ */ new Date() ? "overdue" : "within_sla" }));
      const me = db.prepare("SELECT * FROM mentors WHERE user_id = ?").get(req.user.id);
      res.json({ ok: true, data: { questions: rows2, mentor: me ? { headline: me.headline, fields: parseJSON2(me.fields_json, []), verified: !!me.verified, capacity: me.capacity } : null } });
    });
    mentorRouter.post("/answer", requireAuth("mentor"), (req, res) => {
      const { questionId, answer } = req.body || {};
      const q = db.prepare("SELECT * FROM mentor_questions WHERE id = ? AND mentor_id = ?").get(questionId, req.user.id);
      if (!q) return fail(res, 404, "NOT_FOUND", "Question not found or not assigned to you.");
      const ans = String(answer || "").trim();
      if (ans.length < 10) return fail(res, 400, "SHORT", "Give the student a real answer \u2014 at least a sentence.");
      db.prepare(`UPDATE mentor_questions SET answer = ?, status = 'answered', answered_at = datetime('now') WHERE id = ?`).run(ans.slice(0, 3e3), q.id);
      db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(q.student_id, "mentor_answer", "A mentor answered your question", ans.slice(0, 120) + "\u2026", "/app/ask");
      audit(req.user.id, "mentor.answered", `mentor_question:${q.id}`, {});
      res.json({ ok: true, data: { answered: true } });
    });
    mentorRouter.post("/escalate/:id", requireAuth("mentor"), (req, res) => {
      const q = db.prepare("SELECT * FROM mentor_questions WHERE id = ? AND mentor_id = ?").get(req.params.id, req.user.id);
      if (!q) return fail(res, 404, "NOT_FOUND", "Not found.");
      db.prepare(`UPDATE mentor_questions SET status = 'escalated' WHERE id = ?`).run(q.id);
      const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
      for (const a of admins) {
        db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(a.id, "escalation", "A mentor escalated a question", "Review and reassign in the admin console.", "/app/admin");
      }
      res.json({ ok: true, data: { escalated: true } });
    });
  }
});

// server/routes/admin.js
import { Router as Router8 } from "express";
import crypto4 from "node:crypto";
var adminRouter, STALE_DAYS, setSettingGetter;
var init_admin = __esm({
  "server/routes/admin.js"() {
    init_db();
    init_auth();
    init_utils();
    adminRouter = Router8();
    adminRouter.use(requireAuth("admin"));
    STALE_DAYS = 180;
    adminRouter.get("/overview", (_req, res) => {
      const count = (sql, ...p) => db.prepare(sql).get(...p).c;
      const referrals = db.prepare(`
    SELECT u.name, u.referral_code, COUNT(r.id) AS signups
    FROM users u LEFT JOIN users r ON r.referred_by = u.id
    WHERE u.role = 'student' GROUP BY u.id HAVING signups > 0 ORDER BY signups DESC LIMIT 5`).all();
      const staleCount = (table) => count(`SELECT COUNT(*) c FROM ${table} WHERE as_of < date('now', '-${STALE_DAYS} days')`);
      res.json({
        ok: true,
        data: {
          students: count(`SELECT COUNT(*) c FROM users WHERE role='student' AND deleted_at IS NULL`),
          parents: count(`SELECT COUNT(*) c FROM users WHERE role='parent' AND deleted_at IS NULL`),
          assessments: count(`SELECT COUNT(*) c FROM assessments WHERE status='completed'`),
          mentorAnswers: count(`SELECT COUNT(*) c FROM mentor_questions WHERE status='answered'`),
          roadmapsReady: count(`SELECT COUNT(*) c FROM roadmaps WHERE status='ready'`),
          referralSignups: count(`SELECT COUNT(*) c FROM users WHERE referred_by IS NOT NULL`),
          openFlags: count(`SELECT COUNT(*) c FROM flags WHERE status='open'`),
          pendingReviews: count(`SELECT COUNT(*) c FROM recommendations WHERE status='pending_review'`) + count(`SELECT COUNT(*) c FROM roadmaps WHERE review_status='pending'`),
          stale: { careers: staleCount("careers"), colleges: staleCount("colleges"), exams: staleCount("exams"), courses: staleCount("courses") },
          chaos: setSettingGetter("simulate_ai_failure") === "1",
          referrals
        }
      });
    });
    setSettingGetter = (k) => db.prepare("SELECT value FROM settings WHERE key = ?").get(k)?.value || "0";
    adminRouter.get("/review", (_req, res) => {
      const flags = db.prepare(`
    SELECT f.*, u.name AS flagger, c.title AS career_title FROM flags f
    LEFT JOIN users u ON u.id = f.user_id
    LEFT JOIN careers c ON f.entity_type = 'career' AND c.id = CAST(f.entity_id AS INTEGER)
    WHERE f.status = 'open' ORDER BY f.id DESC`).all();
      const pendingRecs = db.prepare(`
    SELECT r.*, u.name AS student_name, c.title AS career_title FROM recommendations r
    JOIN users u ON u.id = r.user_id JOIN careers c ON c.id = r.career_id
    WHERE r.status = 'pending_review' ORDER BY r.id DESC`).all().map((r) => ({ ...r, decision_log: parseJSON2(r.decision_log_json, []), evidence: parseJSON2(r.evidence_json, []) }));
      const pendingRoadmaps = db.prepare(`
    SELECT rm.*, u.name AS student_name, c.title AS career_title FROM roadmaps rm
    JOIN users u ON u.id = rm.user_id JOIN careers c ON c.id = rm.career_id
    WHERE rm.review_status = 'pending' ORDER BY rm.id DESC`).all();
      res.json({ ok: true, data: { flags, pendingRecs, pendingRoadmaps } });
    });
    adminRouter.post("/review/flag/:id", (req, res) => {
      const f = db.prepare("SELECT * FROM flags WHERE id = ? AND status = ?").get(req.params.id, "open");
      if (!f) return fail(res, 404, "NOT_FOUND", "Flag not found.");
      db.prepare(`UPDATE flags SET status = 'resolved', resolved_by = ? WHERE id = ?`).run(req.user.id, f.id);
      if (f.entity_type === "career") {
        db.prepare(`UPDATE careers SET as_of = date('now') WHERE id = ?`).run(Number(f.entity_id));
      }
      audit(req.user.id, "flag.resolved", `flag:${f.id}`, {});
      res.json({ ok: true, data: { resolved: true } });
    });
    adminRouter.post("/review/rec/:id", (req, res) => {
      const action = req.body?.action;
      if (!["approve", "reject"].includes(action)) return fail(res, 400, "BAD_ACTION", "approve or reject.");
      const r = db.prepare("SELECT * FROM recommendations WHERE id = ? AND status = ?").get(req.params.id, "pending_review");
      if (!r) return fail(res, 404, "NOT_FOUND", "No pending recommendation with that id.");
      const newStatus = action === "approve" ? "active" : "rejected";
      db.prepare(`UPDATE recommendations SET status = ?, reviewed_by = ? WHERE id = ?`).run(newStatus, req.user.id, r.id);
      if (action === "approve") {
        db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(r.user_id, "review", "A counsellor approved your recommendation", "Your review-checked match is now visible in your results.", "/app/results");
      }
      audit(req.user.id, `recommendation.${newStatus}`, `recommendation:${r.id}`, {});
      res.json({ ok: true, data: { status: newStatus } });
    });
    adminRouter.post("/review/roadmap/:id", (req, res) => {
      const action = req.body?.action;
      if (!["approve", "reject"].includes(action)) return fail(res, 400, "BAD_ACTION", "approve or reject.");
      const rm = db.prepare("SELECT * FROM roadmaps WHERE id = ? AND review_status = ?").get(req.params.id, "pending");
      if (!rm) return fail(res, 404, "NOT_FOUND", "No pending roadmap with that id.");
      db.prepare(`UPDATE roadmaps SET review_status = ? WHERE id = ?`).run(action === "approve" ? "approved" : "rejected", rm.id);
      db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
        rm.user_id,
        "review",
        action === "approve" ? "Your roadmap passed counsellor review" : "A counsellor left notes on your roadmap",
        action === "approve" ? "The high-impact parts were checked by a human \u2014 it is now fully visible." : "Please talk to a counsellor about your plan.",
        "/app/roadmap"
      );
      audit(req.user.id, `roadmap.${action}`, `roadmap:${rm.id}`, {});
      res.json({ ok: true, data: { review_status: action === "approve" ? "approved" : "rejected" } });
    });
    adminRouter.get("/mentors", (_req, res) => {
      const rows2 = db.prepare(`SELECT m.*, u.name, u.email FROM mentors m JOIN users u ON u.id = m.user_id ORDER BY m.verified, u.name`).all().map((m) => ({ ...m, fields: parseJSON2(m.fields_json, []) }));
      res.json({ ok: true, data: { mentors: rows2 } });
    });
    adminRouter.post("/mentors/:id/verify", (req, res) => {
      const verified = req.body?.verified !== false ? 1 : 0;
      db.prepare("UPDATE mentors SET verified = ? WHERE user_id = ?").run(verified, req.params.id);
      audit(req.user.id, `mentor.${verified ? "verified" : "unverified"}`, `mentor:${req.params.id}`, {});
      res.json({ ok: true, data: { verified: !!verified } });
    });
    adminRouter.get("/stale", (_req, res) => {
      const q = (table, extra) => db.prepare(`SELECT id, slug, ${extra} AS label, as_of, source FROM ${table} WHERE as_of < date('now', '-${STALE_DAYS} days') ORDER BY as_of`).all();
      res.json({
        ok: true,
        data: {
          careers: q("careers", "title"),
          colleges: q("colleges", "name"),
          exams: q("exams", "name"),
          courses: q("courses", "name")
        }
      });
    });
    adminRouter.post("/stale/:type/:id/refresh", (req, res) => {
      const tables = { careers: "careers", colleges: "colleges", exams: "exams", courses: "courses" };
      const t = tables[req.params.type];
      if (!t) return fail(res, 400, "BAD_TYPE", "Unknown type.");
      db.prepare(`UPDATE ${t} SET as_of = date('now') WHERE id = ?`).run(req.params.id);
      audit(req.user.id, "content.refreshed", `${t}:${req.params.id}`, {});
      res.json({ ok: true, data: { refreshed: true } });
    });
    adminRouter.post("/compcodes", (req, res) => {
      const code = String(req.body?.code || "").trim().toUpperCase() || "CC" + crypto4.randomBytes(3).toString("hex").toUpperCase();
      const percent = Math.min(100, Math.max(1, Number(req.body?.percentOff) || 100));
      db.prepare(`INSERT OR IGNORE INTO comp_codes (code,percent_off,active,created_by) VALUES (?,?,1,?)`).run(code, percent, req.user.id);
      res.json({ ok: true, data: { code, percent_off: percent } });
    });
    adminRouter.get("/audit", (_req, res) => {
      const rows2 = db.prepare(`SELECT a.*, u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 60`).all();
      res.json({ ok: true, data: { logs: rows2 } });
    });
    adminRouter.post("/chaos", (req, res) => {
      const on = req.body?.on !== false;
      setSetting("simulate_ai_failure", on ? "1" : "0");
      audit(req.user.id, "chaos.toggled", "settings", { on });
      res.json({ ok: true, data: { on } });
    });
    adminRouter.post("/demo/accelerate-checkins", (req, res) => {
      const userId = Number(req.body?.userId) || null;
      const r = db.prepare(`UPDATE notifications SET due_at = datetime('now') WHERE type = 'checkin' AND due_at > datetime('now') ${userId ? "AND user_id = ?" : ""}`).run(...userId ? [userId] : []);
      res.json({ ok: true, data: { moved: r.changes } });
    });
    adminRouter.get("/users", (_req, res) => {
      const rows2 = db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at, u.deleted_at FROM users u ORDER BY u.id DESC LIMIT 100`).all();
      res.json({ ok: true, data: { users: rows2 } });
    });
  }
});

// server/routes/account.js
import { Router as Router9 } from "express";
var accountRouter;
var init_account = __esm({
  "server/routes/account.js"() {
    init_db();
    init_auth();
    init_utils();
    init_roadmaps();
    accountRouter = Router9();
    accountRouter.get("/export", requireAuth(), (req, res) => {
      const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
      const pack = {
        exported_at: (/* @__PURE__ */ new Date()).toISOString(),
        account: { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone, created_at: u.created_at, referral_code: u.referral_code, consent_status: u.consent_status },
        profile: db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(u.id) || null,
        assessments: db.prepare("SELECT * FROM assessments WHERE user_id = ?").all(u.id),
        assessment_answers: (() => {
          const ids = db.prepare("SELECT id FROM assessments WHERE user_id = ?").all(u.id).map((r) => r.id);
          if (!ids.length) return [];
          return db.prepare(`SELECT * FROM assessment_answers WHERE assessment_id IN (${ids.map(() => "?").join(",")})`).all(...ids);
        })(),
        assessment_results: db.prepare("SELECT * FROM assessment_results WHERE user_id = ?").get(u.id) || null,
        recommendations: db.prepare("SELECT * FROM recommendations WHERE user_id = ?").all(u.id),
        roadmaps: db.prepare("SELECT * FROM roadmaps WHERE user_id = ?").all(u.id),
        favourites: db.prepare("SELECT * FROM favourites WHERE user_id = ?").all(u.id),
        mentor_questions: db.prepare("SELECT * FROM mentor_questions WHERE student_id = ? OR mentor_id = ?").all(u.id, u.id),
        notifications: db.prepare("SELECT * FROM notifications WHERE user_id = ?").all(u.id),
        journal: db.prepare("SELECT * FROM journal_entries WHERE user_id = ?").all(u.id),
        feedback: db.prepare("SELECT * FROM feedback WHERE user_id = ?").all(u.id)
      };
      audit(u.id, "data.exported", `user:${u.id}`, { sections: Object.keys(pack).length });
      res.setHeader("Content-Disposition", `attachment; filename="career-compass-my-data.json"`);
      res.type("application/json").send(JSON.stringify(pack, null, 2));
    });
    accountRouter.post("/delete", requireAuth(), (req, res) => {
      const confirm = String(req.body?.confirm || "");
      if (confirm !== "DELETE") return fail(res, 400, "CONFIRM", "Type DELETE to confirm account removal.");
      const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
      db.prepare(`UPDATE users SET deleted_at = datetime('now'), name = 'Deleted user', email = NULL, phone = NULL WHERE id = ?`).run(u.id);
      db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(u.id);
      db.prepare(`DELETE FROM student_profiles WHERE user_id = ?`).run(u.id);
      db.prepare(`DELETE FROM assessment_results WHERE user_id = ?`).run(u.id);
      audit(null, "data.deleted", `user:${u.id}`, { role: u.role });
      sendEmail(u.email || `+91${u.phone || ""}`, "Career Compass \u2014 account deleted", "Your account and personal data were deleted. Catalog data you never touched remains (it is not personal).");
      res.clearCookie("cc_session", { path: "/" });
      res.json({ ok: true, data: { deleted: true } });
    });
    accountRouter.get("/audit", requireAuth(), (req, res) => {
      const rows2 = db.prepare(`SELECT action, entity, created_at FROM audit_logs WHERE actor_id = ? ORDER BY id DESC LIMIT 40`).all(req.user.id);
      res.json({ ok: true, data: { logs: rows2 } });
    });
    accountRouter.get("/referrals", requireAuth("student"), (req, res) => {
      const signups = db.prepare(`SELECT name, created_at FROM users WHERE referred_by = ? AND deleted_at IS NULL`).all(req.user.id);
      res.json({ ok: true, data: { code: req.user.referral_code, signups, count: signups.length } });
    });
    accountRouter.get("/notifications", requireAuth(), (req, res) => {
      const rows2 = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ?
    AND (type != 'checkin' OR due_at <= datetime('now'))
    ORDER BY read_at IS NULL DESC, id DESC LIMIT 40`).all(req.user.id);
      const unread = db.prepare(`SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL AND (type != 'checkin' OR due_at <= datetime('now'))`).get(req.user.id).c;
      res.json({ ok: true, data: { notifications: rows2, unread } });
    });
    accountRouter.post("/notifications/:id/read", requireAuth(), (req, res) => {
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
      res.json({ ok: true, data: {} });
    });
    accountRouter.post("/notifications/read-all", requireAuth(), (req, res) => {
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(req.user.id);
      res.json({ ok: true, data: {} });
    });
    accountRouter.get("/shared/:token", (req, res) => {
      const rm = db.prepare("SELECT * FROM roadmaps WHERE share_token = ? AND share_enabled = 1").get(req.params.token);
      if (!rm || rm.status !== "ready") return fail(res, 404, "NOT_FOUND", "This share link is invalid or has been turned off.");
      const student = db.prepare("SELECT name FROM users WHERE id = ?").get(rm.user_id);
      const payload = roadmapPayload(rm, false);
      res.json({
        ok: true,
        data: {
          student_name: student?.name?.split(" ")[0] || "A student",
          generated_at: rm.generated_at,
          roadmap: payload,
          note: "Shared by the student with explicit consent. Read-only view."
        }
      });
    });
  }
});

// server/embedded-public.js
var EMBEDDED_HTML;
var init_embedded_public = __esm({
  "server/embedded-public.js"() {
    EMBEDDED_HTML = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n    <meta name="theme-color" content="#0d5c57" />\n    <meta name="description" content="Career Compass \u2014 AI-powered career and college guidance for Indian students. Your future should not be a guessing game." />\n    <title>Career Compass \u2014 Your future should not be a guessing game</title>\n    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Ccircle cx=\'32\' cy=\'32\' r=\'30\' fill=\'%230d5c57\'/%3E%3Cpath d=\'M32 12 L40 32 L32 52 L24 32 Z\' fill=\'%23f4b942\'/%3E%3Ccircle cx=\'32\' cy=\'32\' r=\'4\' fill=\'%23fff\'/%3E%3C/svg%3E" />\n    <script type="module">\nfunction oh(e,t){for(var n=0;n<t.length;n++){const s=t[n];if(typeof s!="string"&&!Array.isArray(s)){for(const l in s)if(l!=="default"&&!(l in e)){const a=Object.getOwnPropertyDescriptor(s,l);a&&Object.defineProperty(e,l,a.get?a:{enumerable:!0,get:()=>s[l]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll(\'link[rel="modulepreload"]\'))s(l);new MutationObserver(l=>{for(const a of l)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(l){const a={};return l.integrity&&(a.integrity=l.integrity),l.referrerPolicy&&(a.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?a.credentials="include":l.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(l){if(l.ep)return;l.ep=!0;const a=n(l);fetch(l.href,a)}})();function ch(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var kc={exports:{}},Ys={},Sc={exports:{}},A={};/**\n * @license React\n * react.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */var Lr=Symbol.for("react.element"),uh=Symbol.for("react.portal"),dh=Symbol.for("react.fragment"),hh=Symbol.for("react.strict_mode"),fh=Symbol.for("react.profiler"),ph=Symbol.for("react.provider"),mh=Symbol.for("react.context"),vh=Symbol.for("react.forward_ref"),xh=Symbol.for("react.suspense"),gh=Symbol.for("react.memo"),yh=Symbol.for("react.lazy"),qi=Symbol.iterator;function jh(e){return e===null||typeof e!="object"?null:(e=qi&&e[qi]||e["@@iterator"],typeof e=="function"?e:null)}var Cc={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Ec=Object.assign,_c={};function Fn(e,t,n){this.props=e,this.context=t,this.refs=_c,this.updater=n||Cc}Fn.prototype.isReactComponent={};Fn.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Fn.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Pc(){}Pc.prototype=Fn.prototype;function Ya(e,t,n){this.props=e,this.context=t,this.refs=_c,this.updater=n||Cc}var Ka=Ya.prototype=new Pc;Ka.constructor=Ya;Ec(Ka,Fn.prototype);Ka.isPureReactComponent=!0;var eo=Array.isArray,Tc=Object.prototype.hasOwnProperty,Ga={current:null},Mc={key:!0,ref:!0,__self:!0,__source:!0};function zc(e,t,n){var s,l={},a=null,i=null;if(t!=null)for(s in t.ref!==void 0&&(i=t.ref),t.key!==void 0&&(a=""+t.key),t)Tc.call(t,s)&&!Mc.hasOwnProperty(s)&&(l[s]=t[s]);var o=arguments.length-2;if(o===1)l.children=n;else if(1<o){for(var c=Array(o),d=0;d<o;d++)c[d]=arguments[d+2];l.children=c}if(e&&e.defaultProps)for(s in o=e.defaultProps,o)l[s]===void 0&&(l[s]=o[s]);return{$$typeof:Lr,type:e,key:a,ref:i,props:l,_owner:Ga.current}}function wh(e,t){return{$$typeof:Lr,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Xa(e){return typeof e=="object"&&e!==null&&e.$$typeof===Lr}function Nh(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var to=/\\/+/g;function Nl(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Nh(""+e.key):t.toString(36)}function rs(e,t,n,s,l){var a=typeof e;(a==="undefined"||a==="boolean")&&(e=null);var i=!1;if(e===null)i=!0;else switch(a){case"string":case"number":i=!0;break;case"object":switch(e.$$typeof){case Lr:case uh:i=!0}}if(i)return i=e,l=l(i),e=s===""?"."+Nl(i,0):s,eo(l)?(n="",e!=null&&(n=e.replace(to,"$&/")+"/"),rs(l,t,n,"",function(d){return d})):l!=null&&(Xa(l)&&(l=wh(l,n+(!l.key||i&&i.key===l.key?"":(""+l.key).replace(to,"$&/")+"/")+e)),t.push(l)),1;if(i=0,s=s===""?".":s+":",eo(e))for(var o=0;o<e.length;o++){a=e[o];var c=s+Nl(a,o);i+=rs(a,t,n,c,l)}else if(c=jh(e),typeof c=="function")for(e=c.call(e),o=0;!(a=e.next()).done;)a=a.value,c=s+Nl(a,o++),i+=rs(a,t,n,c,l);else if(a==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return i}function Wr(e,t,n){if(e==null)return e;var s=[],l=0;return rs(e,s,"","",function(a){return t.call(n,a,l++)}),s}function kh(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var Ne={current:null},ss={transition:null},Sh={ReactCurrentDispatcher:Ne,ReactCurrentBatchConfig:ss,ReactCurrentOwner:Ga};function Lc(){throw Error("act(...) is not supported in production builds of React.")}A.Children={map:Wr,forEach:function(e,t,n){Wr(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return Wr(e,function(){t++}),t},toArray:function(e){return Wr(e,function(t){return t})||[]},only:function(e){if(!Xa(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};A.Component=Fn;A.Fragment=dh;A.Profiler=fh;A.PureComponent=Ya;A.StrictMode=hh;A.Suspense=xh;A.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Sh;A.act=Lc;A.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var s=Ec({},e.props),l=e.key,a=e.ref,i=e._owner;if(t!=null){if(t.ref!==void 0&&(a=t.ref,i=Ga.current),t.key!==void 0&&(l=""+t.key),e.type&&e.type.defaultProps)var o=e.type.defaultProps;for(c in t)Tc.call(t,c)&&!Mc.hasOwnProperty(c)&&(s[c]=t[c]===void 0&&o!==void 0?o[c]:t[c])}var c=arguments.length-2;if(c===1)s.children=n;else if(1<c){o=Array(c);for(var d=0;d<c;d++)o[d]=arguments[d+2];s.children=o}return{$$typeof:Lr,type:e.type,key:l,ref:a,props:s,_owner:i}};A.createContext=function(e){return e={$$typeof:mh,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:ph,_context:e},e.Consumer=e};A.createElement=zc;A.createFactory=function(e){var t=zc.bind(null,e);return t.type=e,t};A.createRef=function(){return{current:null}};A.forwardRef=function(e){return{$$typeof:vh,render:e}};A.isValidElement=Xa;A.lazy=function(e){return{$$typeof:yh,_payload:{_status:-1,_result:e},_init:kh}};A.memo=function(e,t){return{$$typeof:gh,type:e,compare:t===void 0?null:t}};A.startTransition=function(e){var t=ss.transition;ss.transition={};try{e()}finally{ss.transition=t}};A.unstable_act=Lc;A.useCallback=function(e,t){return Ne.current.useCallback(e,t)};A.useContext=function(e){return Ne.current.useContext(e)};A.useDebugValue=function(){};A.useDeferredValue=function(e){return Ne.current.useDeferredValue(e)};A.useEffect=function(e,t){return Ne.current.useEffect(e,t)};A.useId=function(){return Ne.current.useId()};A.useImperativeHandle=function(e,t,n){return Ne.current.useImperativeHandle(e,t,n)};A.useInsertionEffect=function(e,t){return Ne.current.useInsertionEffect(e,t)};A.useLayoutEffect=function(e,t){return Ne.current.useLayoutEffect(e,t)};A.useMemo=function(e,t){return Ne.current.useMemo(e,t)};A.useReducer=function(e,t,n){return Ne.current.useReducer(e,t,n)};A.useRef=function(e){return Ne.current.useRef(e)};A.useState=function(e){return Ne.current.useState(e)};A.useSyncExternalStore=function(e,t,n){return Ne.current.useSyncExternalStore(e,t,n)};A.useTransition=function(){return Ne.current.useTransition()};A.version="18.3.1";Sc.exports=A;var x=Sc.exports;const Rc=ch(x),Ch=oh({__proto__:null,default:Rc},[x]);/**\n * @license React\n * react-jsx-runtime.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */var Eh=x,_h=Symbol.for("react.element"),Ph=Symbol.for("react.fragment"),Th=Object.prototype.hasOwnProperty,Mh=Eh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,zh={key:!0,ref:!0,__self:!0,__source:!0};function Ic(e,t,n){var s,l={},a=null,i=null;n!==void 0&&(a=""+n),t.key!==void 0&&(a=""+t.key),t.ref!==void 0&&(i=t.ref);for(s in t)Th.call(t,s)&&!zh.hasOwnProperty(s)&&(l[s]=t[s]);if(e&&e.defaultProps)for(s in t=e.defaultProps,t)l[s]===void 0&&(l[s]=t[s]);return{$$typeof:_h,type:e,key:a,ref:i,props:l,_owner:Mh.current}}Ys.Fragment=Ph;Ys.jsx=Ic;Ys.jsxs=Ic;kc.exports=Ys;var r=kc.exports,Dc={exports:{}},De={},Oc={exports:{}},Ac={};/**\n * @license React\n * scheduler.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */(function(e){function t(T,I){var O=T.length;T.push(I);e:for(;0<O;){var ne=O-1>>>1,oe=T[ne];if(0<l(oe,I))T[ne]=I,T[O]=oe,O=ne;else break e}}function n(T){return T.length===0?null:T[0]}function s(T){if(T.length===0)return null;var I=T[0],O=T.pop();if(O!==I){T[0]=O;e:for(var ne=0,oe=T.length,Fr=oe>>>1;ne<Fr;){var Ht=2*(ne+1)-1,wl=T[Ht],bt=Ht+1,$r=T[bt];if(0>l(wl,O))bt<oe&&0>l($r,wl)?(T[ne]=$r,T[bt]=O,ne=bt):(T[ne]=wl,T[Ht]=O,ne=Ht);else if(bt<oe&&0>l($r,O))T[ne]=$r,T[bt]=O,ne=bt;else break e}}return I}function l(T,I){var O=T.sortIndex-I.sortIndex;return O!==0?O:T.id-I.id}if(typeof performance=="object"&&typeof performance.now=="function"){var a=performance;e.unstable_now=function(){return a.now()}}else{var i=Date,o=i.now();e.unstable_now=function(){return i.now()-o}}var c=[],d=[],f=1,p=null,g=3,y=!1,j=!1,w=!1,N=typeof setTimeout=="function"?setTimeout:null,h=typeof clearTimeout=="function"?clearTimeout:null,u=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function m(T){for(var I=n(d);I!==null;){if(I.callback===null)s(d);else if(I.startTime<=T)s(d),I.sortIndex=I.expirationTime,t(c,I);else break;I=n(d)}}function v(T){if(w=!1,m(T),!j)if(n(c)!==null)j=!0,yl(k);else{var I=n(d);I!==null&&jl(v,I.startTime-T)}}function k(T,I){j=!1,w&&(w=!1,h(M),M=-1),y=!0;var O=g;try{for(m(I),p=n(c);p!==null&&(!(p.expirationTime>I)||T&&!pe());){var ne=p.callback;if(typeof ne=="function"){p.callback=null,g=p.priorityLevel;var oe=ne(p.expirationTime<=I);I=e.unstable_now(),typeof oe=="function"?p.callback=oe:p===n(c)&&s(c),m(I)}else s(c);p=n(c)}if(p!==null)var Fr=!0;else{var Ht=n(d);Ht!==null&&jl(v,Ht.startTime-I),Fr=!1}return Fr}finally{p=null,g=O,y=!1}}var E=!1,_=null,M=-1,V=5,R=-1;function pe(){return!(e.unstable_now()-R<V)}function xt(){if(_!==null){var T=e.unstable_now();R=T;var I=!0;try{I=_(!0,T)}finally{I?Hn():(E=!1,_=null)}}else E=!1}var Hn;if(typeof u=="function")Hn=function(){u(xt)};else if(typeof MessageChannel<"u"){var Zi=new MessageChannel,ih=Zi.port2;Zi.port1.onmessage=xt,Hn=function(){ih.postMessage(null)}}else Hn=function(){N(xt,0)};function yl(T){_=T,E||(E=!0,Hn())}function jl(T,I){M=N(function(){T(e.unstable_now())},I)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(T){T.callback=null},e.unstable_continueExecution=function(){j||y||(j=!0,yl(k))},e.unstable_forceFrameRate=function(T){0>T||125<T?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):V=0<T?Math.floor(1e3/T):5},e.unstable_getCurrentPriorityLevel=function(){return g},e.unstable_getFirstCallbackNode=function(){return n(c)},e.unstable_next=function(T){switch(g){case 1:case 2:case 3:var I=3;break;default:I=g}var O=g;g=I;try{return T()}finally{g=O}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(T,I){switch(T){case 1:case 2:case 3:case 4:case 5:break;default:T=3}var O=g;g=T;try{return I()}finally{g=O}},e.unstable_scheduleCallback=function(T,I,O){var ne=e.unstable_now();switch(typeof O=="object"&&O!==null?(O=O.delay,O=typeof O=="number"&&0<O?ne+O:ne):O=ne,T){case 1:var oe=-1;break;case 2:oe=250;break;case 5:oe=1073741823;break;case 4:oe=1e4;break;default:oe=5e3}return oe=O+oe,T={id:f++,callback:I,priorityLevel:T,startTime:O,expirationTime:oe,sortIndex:-1},O>ne?(T.sortIndex=O,t(d,T),n(c)===null&&T===n(d)&&(w?(h(M),M=-1):w=!0,jl(v,O-ne))):(T.sortIndex=oe,t(c,T),j||y||(j=!0,yl(k))),T},e.unstable_shouldYield=pe,e.unstable_wrapCallback=function(T){var I=g;return function(){var O=g;g=I;try{return T.apply(this,arguments)}finally{g=O}}}})(Ac);Oc.exports=Ac;var Lh=Oc.exports;/**\n * @license React\n * react-dom.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */var Rh=x,Re=Lh;function S(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Fc=new Set,hr={};function an(e,t){Tn(e,t),Tn(e+"Capture",t)}function Tn(e,t){for(hr[e]=t,e=0;e<t.length;e++)Fc.add(t[e])}var dt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Gl=Object.prototype.hasOwnProperty,Ih=/^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$/,no={},ro={};function Dh(e){return Gl.call(ro,e)?!0:Gl.call(no,e)?!1:Ih.test(e)?ro[e]=!0:(no[e]=!0,!1)}function Oh(e,t,n,s){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return s?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function Ah(e,t,n,s){if(t===null||typeof t>"u"||Oh(e,t,n,s))return!0;if(s)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function ke(e,t,n,s,l,a,i){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=s,this.attributeNamespace=l,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=a,this.removeEmptyString=i}var fe={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){fe[e]=new ke(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];fe[t]=new ke(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){fe[e]=new ke(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){fe[e]=new ke(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){fe[e]=new ke(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){fe[e]=new ke(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){fe[e]=new ke(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){fe[e]=new ke(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){fe[e]=new ke(e,5,!1,e.toLowerCase(),null,!1,!1)});var Ja=/[\\-:]([a-z])/g;function Za(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(Ja,Za);fe[t]=new ke(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(Ja,Za);fe[t]=new ke(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(Ja,Za);fe[t]=new ke(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){fe[e]=new ke(e,1,!1,e.toLowerCase(),null,!1,!1)});fe.xlinkHref=new ke("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){fe[e]=new ke(e,1,!1,e.toLowerCase(),null,!0,!0)});function qa(e,t,n,s){var l=fe.hasOwnProperty(t)?fe[t]:null;(l!==null?l.type!==0:s||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(Ah(t,n,l,s)&&(n=null),s||l===null?Dh(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):l.mustUseProperty?e[l.propertyName]=n===null?l.type===3?!1:"":n:(t=l.attributeName,s=l.attributeNamespace,n===null?e.removeAttribute(t):(l=l.type,n=l===3||l===4&&n===!0?"":""+n,s?e.setAttributeNS(s,t,n):e.setAttribute(t,n))))}var mt=Rh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Ur=Symbol.for("react.element"),dn=Symbol.for("react.portal"),hn=Symbol.for("react.fragment"),ei=Symbol.for("react.strict_mode"),Xl=Symbol.for("react.profiler"),$c=Symbol.for("react.provider"),Wc=Symbol.for("react.context"),ti=Symbol.for("react.forward_ref"),Jl=Symbol.for("react.suspense"),Zl=Symbol.for("react.suspense_list"),ni=Symbol.for("react.memo"),yt=Symbol.for("react.lazy"),Uc=Symbol.for("react.offscreen"),so=Symbol.iterator;function bn(e){return e===null||typeof e!="object"?null:(e=so&&e[so]||e["@@iterator"],typeof e=="function"?e:null)}var Z=Object.assign,kl;function qn(e){if(kl===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\\n( *(at )?)/);kl=t&&t[1]||""}return`\n`+kl+e}var Sl=!1;function Cl(e,t){if(!e||Sl)return"";Sl=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(d){var s=d}Reflect.construct(e,[],t)}else{try{t.call()}catch(d){s=d}e.call(t.prototype)}else{try{throw Error()}catch(d){s=d}e()}}catch(d){if(d&&s&&typeof d.stack=="string"){for(var l=d.stack.split(`\n`),a=s.stack.split(`\n`),i=l.length-1,o=a.length-1;1<=i&&0<=o&&l[i]!==a[o];)o--;for(;1<=i&&0<=o;i--,o--)if(l[i]!==a[o]){if(i!==1||o!==1)do if(i--,o--,0>o||l[i]!==a[o]){var c=`\n`+l[i].replace(" at new "," at ");return e.displayName&&c.includes("<anonymous>")&&(c=c.replace("<anonymous>",e.displayName)),c}while(1<=i&&0<=o);break}}}finally{Sl=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?qn(e):""}function Fh(e){switch(e.tag){case 5:return qn(e.type);case 16:return qn("Lazy");case 13:return qn("Suspense");case 19:return qn("SuspenseList");case 0:case 2:case 15:return e=Cl(e.type,!1),e;case 11:return e=Cl(e.type.render,!1),e;case 1:return e=Cl(e.type,!0),e;default:return""}}function ql(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case hn:return"Fragment";case dn:return"Portal";case Xl:return"Profiler";case ei:return"StrictMode";case Jl:return"Suspense";case Zl:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case Wc:return(e.displayName||"Context")+".Consumer";case $c:return(e._context.displayName||"Context")+".Provider";case ti:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case ni:return t=e.displayName||null,t!==null?t:ql(e.type)||"Memo";case yt:t=e._payload,e=e._init;try{return ql(e(t))}catch{}}return null}function $h(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ql(t);case 8:return t===ei?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Dt(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function Bc(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function Wh(e){var t=Bc(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),s=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var l=n.get,a=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return l.call(this)},set:function(i){s=""+i,a.call(this,i)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return s},setValue:function(i){s=""+i},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Br(e){e._valueTracker||(e._valueTracker=Wh(e))}function Vc(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),s="";return e&&(s=Bc(e)?e.checked?"true":"false":e.value),e=s,e!==n?(t.setValue(e),!0):!1}function ms(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function ea(e,t){var n=t.checked;return Z({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function lo(e,t){var n=t.defaultValue==null?"":t.defaultValue,s=t.checked!=null?t.checked:t.defaultChecked;n=Dt(t.value!=null?t.value:n),e._wrapperState={initialChecked:s,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function Hc(e,t){t=t.checked,t!=null&&qa(e,"checked",t,!1)}function ta(e,t){Hc(e,t);var n=Dt(t.value),s=t.type;if(n!=null)s==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(s==="submit"||s==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?na(e,t.type,n):t.hasOwnProperty("defaultValue")&&na(e,t.type,Dt(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function ao(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var s=t.type;if(!(s!=="submit"&&s!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function na(e,t,n){(t!=="number"||ms(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var er=Array.isArray;function kn(e,t,n,s){if(e=e.options,t){t={};for(var l=0;l<n.length;l++)t["$"+n[l]]=!0;for(n=0;n<e.length;n++)l=t.hasOwnProperty("$"+e[n].value),e[n].selected!==l&&(e[n].selected=l),l&&s&&(e[n].defaultSelected=!0)}else{for(n=""+Dt(n),t=null,l=0;l<e.length;l++){if(e[l].value===n){e[l].selected=!0,s&&(e[l].defaultSelected=!0);return}t!==null||e[l].disabled||(t=e[l])}t!==null&&(t.selected=!0)}}function ra(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(S(91));return Z({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function io(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(S(92));if(er(n)){if(1<n.length)throw Error(S(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Dt(n)}}function bc(e,t){var n=Dt(t.value),s=Dt(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),s!=null&&(e.defaultValue=""+s)}function oo(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function Qc(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function sa(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?Qc(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var Vr,Yc=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,s,l){MSApp.execUnsafeLocalFunction(function(){return e(t,n,s,l)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(Vr=Vr||document.createElement("div"),Vr.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=Vr.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function fr(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var rr={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Uh=["Webkit","ms","Moz","O"];Object.keys(rr).forEach(function(e){Uh.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),rr[t]=rr[e]})});function Kc(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||rr.hasOwnProperty(e)&&rr[e]?(""+t).trim():t+"px"}function Gc(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var s=n.indexOf("--")===0,l=Kc(n,t[n],s);n==="float"&&(n="cssFloat"),s?e.setProperty(n,l):e[n]=l}}var Bh=Z({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function la(e,t){if(t){if(Bh[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(S(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(S(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(S(61))}if(t.style!=null&&typeof t.style!="object")throw Error(S(62))}}function aa(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var ia=null;function ri(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var oa=null,Sn=null,Cn=null;function co(e){if(e=Dr(e)){if(typeof oa!="function")throw Error(S(280));var t=e.stateNode;t&&(t=Zs(t),oa(e.stateNode,e.type,t))}}function Xc(e){Sn?Cn?Cn.push(e):Cn=[e]:Sn=e}function Jc(){if(Sn){var e=Sn,t=Cn;if(Cn=Sn=null,co(e),t)for(e=0;e<t.length;e++)co(t[e])}}function Zc(e,t){return e(t)}function qc(){}var El=!1;function eu(e,t,n){if(El)return e(t,n);El=!0;try{return Zc(e,t,n)}finally{El=!1,(Sn!==null||Cn!==null)&&(qc(),Jc())}}function pr(e,t){var n=e.stateNode;if(n===null)return null;var s=Zs(n);if(s===null)return null;n=s[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(s=!s.disabled)||(e=e.type,s=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!s;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(S(231,t,typeof n));return n}var ca=!1;if(dt)try{var Qn={};Object.defineProperty(Qn,"passive",{get:function(){ca=!0}}),window.addEventListener("test",Qn,Qn),window.removeEventListener("test",Qn,Qn)}catch{ca=!1}function Vh(e,t,n,s,l,a,i,o,c){var d=Array.prototype.slice.call(arguments,3);try{t.apply(n,d)}catch(f){this.onError(f)}}var sr=!1,vs=null,xs=!1,ua=null,Hh={onError:function(e){sr=!0,vs=e}};function bh(e,t,n,s,l,a,i,o,c){sr=!1,vs=null,Vh.apply(Hh,arguments)}function Qh(e,t,n,s,l,a,i,o,c){if(bh.apply(this,arguments),sr){if(sr){var d=vs;sr=!1,vs=null}else throw Error(S(198));xs||(xs=!0,ua=d)}}function on(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function tu(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function uo(e){if(on(e)!==e)throw Error(S(188))}function Yh(e){var t=e.alternate;if(!t){if(t=on(e),t===null)throw Error(S(188));return t!==e?null:e}for(var n=e,s=t;;){var l=n.return;if(l===null)break;var a=l.alternate;if(a===null){if(s=l.return,s!==null){n=s;continue}break}if(l.child===a.child){for(a=l.child;a;){if(a===n)return uo(l),e;if(a===s)return uo(l),t;a=a.sibling}throw Error(S(188))}if(n.return!==s.return)n=l,s=a;else{for(var i=!1,o=l.child;o;){if(o===n){i=!0,n=l,s=a;break}if(o===s){i=!0,s=l,n=a;break}o=o.sibling}if(!i){for(o=a.child;o;){if(o===n){i=!0,n=a,s=l;break}if(o===s){i=!0,s=a,n=l;break}o=o.sibling}if(!i)throw Error(S(189))}}if(n.alternate!==s)throw Error(S(190))}if(n.tag!==3)throw Error(S(188));return n.stateNode.current===n?e:t}function nu(e){return e=Yh(e),e!==null?ru(e):null}function ru(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=ru(e);if(t!==null)return t;e=e.sibling}return null}var su=Re.unstable_scheduleCallback,ho=Re.unstable_cancelCallback,Kh=Re.unstable_shouldYield,Gh=Re.unstable_requestPaint,se=Re.unstable_now,Xh=Re.unstable_getCurrentPriorityLevel,si=Re.unstable_ImmediatePriority,lu=Re.unstable_UserBlockingPriority,gs=Re.unstable_NormalPriority,Jh=Re.unstable_LowPriority,au=Re.unstable_IdlePriority,Ks=null,tt=null;function Zh(e){if(tt&&typeof tt.onCommitFiberRoot=="function")try{tt.onCommitFiberRoot(Ks,e,void 0,(e.current.flags&128)===128)}catch{}}var Ke=Math.clz32?Math.clz32:tf,qh=Math.log,ef=Math.LN2;function tf(e){return e>>>=0,e===0?32:31-(qh(e)/ef|0)|0}var Hr=64,br=4194304;function tr(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function ys(e,t){var n=e.pendingLanes;if(n===0)return 0;var s=0,l=e.suspendedLanes,a=e.pingedLanes,i=n&268435455;if(i!==0){var o=i&~l;o!==0?s=tr(o):(a&=i,a!==0&&(s=tr(a)))}else i=n&~l,i!==0?s=tr(i):a!==0&&(s=tr(a));if(s===0)return 0;if(t!==0&&t!==s&&!(t&l)&&(l=s&-s,a=t&-t,l>=a||l===16&&(a&4194240)!==0))return t;if(s&4&&(s|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=s;0<t;)n=31-Ke(t),l=1<<n,s|=e[n],t&=~l;return s}function nf(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function rf(e,t){for(var n=e.suspendedLanes,s=e.pingedLanes,l=e.expirationTimes,a=e.pendingLanes;0<a;){var i=31-Ke(a),o=1<<i,c=l[i];c===-1?(!(o&n)||o&s)&&(l[i]=nf(o,t)):c<=t&&(e.expiredLanes|=o),a&=~o}}function da(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function iu(){var e=Hr;return Hr<<=1,!(Hr&4194240)&&(Hr=64),e}function _l(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function Rr(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Ke(t),e[t]=n}function sf(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var s=e.eventTimes;for(e=e.expirationTimes;0<n;){var l=31-Ke(n),a=1<<l;t[l]=0,s[l]=-1,e[l]=-1,n&=~a}}function li(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var s=31-Ke(n),l=1<<s;l&t|e[s]&t&&(e[s]|=t),n&=~l}}var U=0;function ou(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var cu,ai,uu,du,hu,ha=!1,Qr=[],Et=null,_t=null,Pt=null,mr=new Map,vr=new Map,wt=[],lf="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function fo(e,t){switch(e){case"focusin":case"focusout":Et=null;break;case"dragenter":case"dragleave":_t=null;break;case"mouseover":case"mouseout":Pt=null;break;case"pointerover":case"pointerout":mr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":vr.delete(t.pointerId)}}function Yn(e,t,n,s,l,a){return e===null||e.nativeEvent!==a?(e={blockedOn:t,domEventName:n,eventSystemFlags:s,nativeEvent:a,targetContainers:[l]},t!==null&&(t=Dr(t),t!==null&&ai(t)),e):(e.eventSystemFlags|=s,t=e.targetContainers,l!==null&&t.indexOf(l)===-1&&t.push(l),e)}function af(e,t,n,s,l){switch(t){case"focusin":return Et=Yn(Et,e,t,n,s,l),!0;case"dragenter":return _t=Yn(_t,e,t,n,s,l),!0;case"mouseover":return Pt=Yn(Pt,e,t,n,s,l),!0;case"pointerover":var a=l.pointerId;return mr.set(a,Yn(mr.get(a)||null,e,t,n,s,l)),!0;case"gotpointercapture":return a=l.pointerId,vr.set(a,Yn(vr.get(a)||null,e,t,n,s,l)),!0}return!1}function fu(e){var t=Kt(e.target);if(t!==null){var n=on(t);if(n!==null){if(t=n.tag,t===13){if(t=tu(n),t!==null){e.blockedOn=t,hu(e.priority,function(){uu(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function ls(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=fa(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var s=new n.constructor(n.type,n);ia=s,n.target.dispatchEvent(s),ia=null}else return t=Dr(n),t!==null&&ai(t),e.blockedOn=n,!1;t.shift()}return!0}function po(e,t,n){ls(e)&&n.delete(t)}function of(){ha=!1,Et!==null&&ls(Et)&&(Et=null),_t!==null&&ls(_t)&&(_t=null),Pt!==null&&ls(Pt)&&(Pt=null),mr.forEach(po),vr.forEach(po)}function Kn(e,t){e.blockedOn===t&&(e.blockedOn=null,ha||(ha=!0,Re.unstable_scheduleCallback(Re.unstable_NormalPriority,of)))}function xr(e){function t(l){return Kn(l,e)}if(0<Qr.length){Kn(Qr[0],e);for(var n=1;n<Qr.length;n++){var s=Qr[n];s.blockedOn===e&&(s.blockedOn=null)}}for(Et!==null&&Kn(Et,e),_t!==null&&Kn(_t,e),Pt!==null&&Kn(Pt,e),mr.forEach(t),vr.forEach(t),n=0;n<wt.length;n++)s=wt[n],s.blockedOn===e&&(s.blockedOn=null);for(;0<wt.length&&(n=wt[0],n.blockedOn===null);)fu(n),n.blockedOn===null&&wt.shift()}var En=mt.ReactCurrentBatchConfig,js=!0;function cf(e,t,n,s){var l=U,a=En.transition;En.transition=null;try{U=1,ii(e,t,n,s)}finally{U=l,En.transition=a}}function uf(e,t,n,s){var l=U,a=En.transition;En.transition=null;try{U=4,ii(e,t,n,s)}finally{U=l,En.transition=a}}function ii(e,t,n,s){if(js){var l=fa(e,t,n,s);if(l===null)Al(e,t,s,ws,n),fo(e,s);else if(af(l,e,t,n,s))s.stopPropagation();else if(fo(e,s),t&4&&-1<lf.indexOf(e)){for(;l!==null;){var a=Dr(l);if(a!==null&&cu(a),a=fa(e,t,n,s),a===null&&Al(e,t,s,ws,n),a===l)break;l=a}l!==null&&s.stopPropagation()}else Al(e,t,s,null,n)}}var ws=null;function fa(e,t,n,s){if(ws=null,e=ri(s),e=Kt(e),e!==null)if(t=on(e),t===null)e=null;else if(n=t.tag,n===13){if(e=tu(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return ws=e,null}function pu(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Xh()){case si:return 1;case lu:return 4;case gs:case Jh:return 16;case au:return 536870912;default:return 16}default:return 16}}var kt=null,oi=null,as=null;function mu(){if(as)return as;var e,t=oi,n=t.length,s,l="value"in kt?kt.value:kt.textContent,a=l.length;for(e=0;e<n&&t[e]===l[e];e++);var i=n-e;for(s=1;s<=i&&t[n-s]===l[a-s];s++);return as=l.slice(e,1<s?1-s:void 0)}function is(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function Yr(){return!0}function mo(){return!1}function Oe(e){function t(n,s,l,a,i){this._reactName=n,this._targetInst=l,this.type=s,this.nativeEvent=a,this.target=i,this.currentTarget=null;for(var o in e)e.hasOwnProperty(o)&&(n=e[o],this[o]=n?n(a):a[o]);return this.isDefaultPrevented=(a.defaultPrevented!=null?a.defaultPrevented:a.returnValue===!1)?Yr:mo,this.isPropagationStopped=mo,this}return Z(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=Yr)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=Yr)},persist:function(){},isPersistent:Yr}),t}var $n={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},ci=Oe($n),Ir=Z({},$n,{view:0,detail:0}),df=Oe(Ir),Pl,Tl,Gn,Gs=Z({},Ir,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:ui,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Gn&&(Gn&&e.type==="mousemove"?(Pl=e.screenX-Gn.screenX,Tl=e.screenY-Gn.screenY):Tl=Pl=0,Gn=e),Pl)},movementY:function(e){return"movementY"in e?e.movementY:Tl}}),vo=Oe(Gs),hf=Z({},Gs,{dataTransfer:0}),ff=Oe(hf),pf=Z({},Ir,{relatedTarget:0}),Ml=Oe(pf),mf=Z({},$n,{animationName:0,elapsedTime:0,pseudoElement:0}),vf=Oe(mf),xf=Z({},$n,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),gf=Oe(xf),yf=Z({},$n,{data:0}),xo=Oe(yf),jf={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},wf={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Nf={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function kf(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Nf[e])?!!t[e]:!1}function ui(){return kf}var Sf=Z({},Ir,{key:function(e){if(e.key){var t=jf[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=is(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?wf[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:ui,charCode:function(e){return e.type==="keypress"?is(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?is(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Cf=Oe(Sf),Ef=Z({},Gs,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),go=Oe(Ef),_f=Z({},Ir,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:ui}),Pf=Oe(_f),Tf=Z({},$n,{propertyName:0,elapsedTime:0,pseudoElement:0}),Mf=Oe(Tf),zf=Z({},Gs,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Lf=Oe(zf),Rf=[9,13,27,32],di=dt&&"CompositionEvent"in window,lr=null;dt&&"documentMode"in document&&(lr=document.documentMode);var If=dt&&"TextEvent"in window&&!lr,vu=dt&&(!di||lr&&8<lr&&11>=lr),yo=" ",jo=!1;function xu(e,t){switch(e){case"keyup":return Rf.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function gu(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var fn=!1;function Df(e,t){switch(e){case"compositionend":return gu(t);case"keypress":return t.which!==32?null:(jo=!0,yo);case"textInput":return e=t.data,e===yo&&jo?null:e;default:return null}}function Of(e,t){if(fn)return e==="compositionend"||!di&&xu(e,t)?(e=mu(),as=oi=kt=null,fn=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return vu&&t.locale!=="ko"?null:t.data;default:return null}}var Af={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function wo(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Af[e.type]:t==="textarea"}function yu(e,t,n,s){Xc(s),t=Ns(t,"onChange"),0<t.length&&(n=new ci("onChange","change",null,n,s),e.push({event:n,listeners:t}))}var ar=null,gr=null;function Ff(e){Mu(e,0)}function Xs(e){var t=vn(e);if(Vc(t))return e}function $f(e,t){if(e==="change")return t}var ju=!1;if(dt){var zl;if(dt){var Ll="oninput"in document;if(!Ll){var No=document.createElement("div");No.setAttribute("oninput","return;"),Ll=typeof No.oninput=="function"}zl=Ll}else zl=!1;ju=zl&&(!document.documentMode||9<document.documentMode)}function ko(){ar&&(ar.detachEvent("onpropertychange",wu),gr=ar=null)}function wu(e){if(e.propertyName==="value"&&Xs(gr)){var t=[];yu(t,gr,e,ri(e)),eu(Ff,t)}}function Wf(e,t,n){e==="focusin"?(ko(),ar=t,gr=n,ar.attachEvent("onpropertychange",wu)):e==="focusout"&&ko()}function Uf(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return Xs(gr)}function Bf(e,t){if(e==="click")return Xs(t)}function Vf(e,t){if(e==="input"||e==="change")return Xs(t)}function Hf(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Xe=typeof Object.is=="function"?Object.is:Hf;function yr(e,t){if(Xe(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),s=Object.keys(t);if(n.length!==s.length)return!1;for(s=0;s<n.length;s++){var l=n[s];if(!Gl.call(t,l)||!Xe(e[l],t[l]))return!1}return!0}function So(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Co(e,t){var n=So(e);e=0;for(var s;n;){if(n.nodeType===3){if(s=e+n.textContent.length,e<=t&&s>=t)return{node:n,offset:t-e};e=s}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=So(n)}}function Nu(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Nu(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function ku(){for(var e=window,t=ms();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=ms(e.document)}return t}function hi(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function bf(e){var t=ku(),n=e.focusedElem,s=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&Nu(n.ownerDocument.documentElement,n)){if(s!==null&&hi(n)){if(t=s.start,e=s.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var l=n.textContent.length,a=Math.min(s.start,l);s=s.end===void 0?a:Math.min(s.end,l),!e.extend&&a>s&&(l=s,s=a,a=l),l=Co(n,a);var i=Co(n,s);l&&i&&(e.rangeCount!==1||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==i.node||e.focusOffset!==i.offset)&&(t=t.createRange(),t.setStart(l.node,l.offset),e.removeAllRanges(),a>s?(e.addRange(t),e.extend(i.node,i.offset)):(t.setEnd(i.node,i.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Qf=dt&&"documentMode"in document&&11>=document.documentMode,pn=null,pa=null,ir=null,ma=!1;function Eo(e,t,n){var s=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;ma||pn==null||pn!==ms(s)||(s=pn,"selectionStart"in s&&hi(s)?s={start:s.selectionStart,end:s.selectionEnd}:(s=(s.ownerDocument&&s.ownerDocument.defaultView||window).getSelection(),s={anchorNode:s.anchorNode,anchorOffset:s.anchorOffset,focusNode:s.focusNode,focusOffset:s.focusOffset}),ir&&yr(ir,s)||(ir=s,s=Ns(pa,"onSelect"),0<s.length&&(t=new ci("onSelect","select",null,t,n),e.push({event:t,listeners:s}),t.target=pn)))}function Kr(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var mn={animationend:Kr("Animation","AnimationEnd"),animationiteration:Kr("Animation","AnimationIteration"),animationstart:Kr("Animation","AnimationStart"),transitionend:Kr("Transition","TransitionEnd")},Rl={},Su={};dt&&(Su=document.createElement("div").style,"AnimationEvent"in window||(delete mn.animationend.animation,delete mn.animationiteration.animation,delete mn.animationstart.animation),"TransitionEvent"in window||delete mn.transitionend.transition);function Js(e){if(Rl[e])return Rl[e];if(!mn[e])return e;var t=mn[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in Su)return Rl[e]=t[n];return e}var Cu=Js("animationend"),Eu=Js("animationiteration"),_u=Js("animationstart"),Pu=Js("transitionend"),Tu=new Map,_o="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Wt(e,t){Tu.set(e,t),an(t,[e])}for(var Il=0;Il<_o.length;Il++){var Dl=_o[Il],Yf=Dl.toLowerCase(),Kf=Dl[0].toUpperCase()+Dl.slice(1);Wt(Yf,"on"+Kf)}Wt(Cu,"onAnimationEnd");Wt(Eu,"onAnimationIteration");Wt(_u,"onAnimationStart");Wt("dblclick","onDoubleClick");Wt("focusin","onFocus");Wt("focusout","onBlur");Wt(Pu,"onTransitionEnd");Tn("onMouseEnter",["mouseout","mouseover"]);Tn("onMouseLeave",["mouseout","mouseover"]);Tn("onPointerEnter",["pointerout","pointerover"]);Tn("onPointerLeave",["pointerout","pointerover"]);an("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));an("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));an("onBeforeInput",["compositionend","keypress","textInput","paste"]);an("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));an("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));an("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var nr="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Gf=new Set("cancel close invalid load scroll toggle".split(" ").concat(nr));function Po(e,t,n){var s=e.type||"unknown-event";e.currentTarget=n,Qh(s,t,void 0,e),e.currentTarget=null}function Mu(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var s=e[n],l=s.event;s=s.listeners;e:{var a=void 0;if(t)for(var i=s.length-1;0<=i;i--){var o=s[i],c=o.instance,d=o.currentTarget;if(o=o.listener,c!==a&&l.isPropagationStopped())break e;Po(l,o,d),a=c}else for(i=0;i<s.length;i++){if(o=s[i],c=o.instance,d=o.currentTarget,o=o.listener,c!==a&&l.isPropagationStopped())break e;Po(l,o,d),a=c}}}if(xs)throw e=ua,xs=!1,ua=null,e}function b(e,t){var n=t[ja];n===void 0&&(n=t[ja]=new Set);var s=e+"__bubble";n.has(s)||(zu(t,e,2,!1),n.add(s))}function Ol(e,t,n){var s=0;t&&(s|=4),zu(n,e,s,t)}var Gr="_reactListening"+Math.random().toString(36).slice(2);function jr(e){if(!e[Gr]){e[Gr]=!0,Fc.forEach(function(n){n!=="selectionchange"&&(Gf.has(n)||Ol(n,!1,e),Ol(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[Gr]||(t[Gr]=!0,Ol("selectionchange",!1,t))}}function zu(e,t,n,s){switch(pu(t)){case 1:var l=cf;break;case 4:l=uf;break;default:l=ii}n=l.bind(null,t,n,e),l=void 0,!ca||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(l=!0),s?l!==void 0?e.addEventListener(t,n,{capture:!0,passive:l}):e.addEventListener(t,n,!0):l!==void 0?e.addEventListener(t,n,{passive:l}):e.addEventListener(t,n,!1)}function Al(e,t,n,s,l){var a=s;if(!(t&1)&&!(t&2)&&s!==null)e:for(;;){if(s===null)return;var i=s.tag;if(i===3||i===4){var o=s.stateNode.containerInfo;if(o===l||o.nodeType===8&&o.parentNode===l)break;if(i===4)for(i=s.return;i!==null;){var c=i.tag;if((c===3||c===4)&&(c=i.stateNode.containerInfo,c===l||c.nodeType===8&&c.parentNode===l))return;i=i.return}for(;o!==null;){if(i=Kt(o),i===null)return;if(c=i.tag,c===5||c===6){s=a=i;continue e}o=o.parentNode}}s=s.return}eu(function(){var d=a,f=ri(n),p=[];e:{var g=Tu.get(e);if(g!==void 0){var y=ci,j=e;switch(e){case"keypress":if(is(n)===0)break e;case"keydown":case"keyup":y=Cf;break;case"focusin":j="focus",y=Ml;break;case"focusout":j="blur",y=Ml;break;case"beforeblur":case"afterblur":y=Ml;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":y=vo;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":y=ff;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":y=Pf;break;case Cu:case Eu:case _u:y=vf;break;case Pu:y=Mf;break;case"scroll":y=df;break;case"wheel":y=Lf;break;case"copy":case"cut":case"paste":y=gf;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":y=go}var w=(t&4)!==0,N=!w&&e==="scroll",h=w?g!==null?g+"Capture":null:g;w=[];for(var u=d,m;u!==null;){m=u;var v=m.stateNode;if(m.tag===5&&v!==null&&(m=v,h!==null&&(v=pr(u,h),v!=null&&w.push(wr(u,v,m)))),N)break;u=u.return}0<w.length&&(g=new y(g,j,null,n,f),p.push({event:g,listeners:w}))}}if(!(t&7)){e:{if(g=e==="mouseover"||e==="pointerover",y=e==="mouseout"||e==="pointerout",g&&n!==ia&&(j=n.relatedTarget||n.fromElement)&&(Kt(j)||j[ht]))break e;if((y||g)&&(g=f.window===f?f:(g=f.ownerDocument)?g.defaultView||g.parentWindow:window,y?(j=n.relatedTarget||n.toElement,y=d,j=j?Kt(j):null,j!==null&&(N=on(j),j!==N||j.tag!==5&&j.tag!==6)&&(j=null)):(y=null,j=d),y!==j)){if(w=vo,v="onMouseLeave",h="onMouseEnter",u="mouse",(e==="pointerout"||e==="pointerover")&&(w=go,v="onPointerLeave",h="onPointerEnter",u="pointer"),N=y==null?g:vn(y),m=j==null?g:vn(j),g=new w(v,u+"leave",y,n,f),g.target=N,g.relatedTarget=m,v=null,Kt(f)===d&&(w=new w(h,u+"enter",j,n,f),w.target=m,w.relatedTarget=N,v=w),N=v,y&&j)t:{for(w=y,h=j,u=0,m=w;m;m=un(m))u++;for(m=0,v=h;v;v=un(v))m++;for(;0<u-m;)w=un(w),u--;for(;0<m-u;)h=un(h),m--;for(;u--;){if(w===h||h!==null&&w===h.alternate)break t;w=un(w),h=un(h)}w=null}else w=null;y!==null&&To(p,g,y,w,!1),j!==null&&N!==null&&To(p,N,j,w,!0)}}e:{if(g=d?vn(d):window,y=g.nodeName&&g.nodeName.toLowerCase(),y==="select"||y==="input"&&g.type==="file")var k=$f;else if(wo(g))if(ju)k=Vf;else{k=Uf;var E=Wf}else(y=g.nodeName)&&y.toLowerCase()==="input"&&(g.type==="checkbox"||g.type==="radio")&&(k=Bf);if(k&&(k=k(e,d))){yu(p,k,n,f);break e}E&&E(e,g,d),e==="focusout"&&(E=g._wrapperState)&&E.controlled&&g.type==="number"&&na(g,"number",g.value)}switch(E=d?vn(d):window,e){case"focusin":(wo(E)||E.contentEditable==="true")&&(pn=E,pa=d,ir=null);break;case"focusout":ir=pa=pn=null;break;case"mousedown":ma=!0;break;case"contextmenu":case"mouseup":case"dragend":ma=!1,Eo(p,n,f);break;case"selectionchange":if(Qf)break;case"keydown":case"keyup":Eo(p,n,f)}var _;if(di)e:{switch(e){case"compositionstart":var M="onCompositionStart";break e;case"compositionend":M="onCompositionEnd";break e;case"compositionupdate":M="onCompositionUpdate";break e}M=void 0}else fn?xu(e,n)&&(M="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(M="onCompositionStart");M&&(vu&&n.locale!=="ko"&&(fn||M!=="onCompositionStart"?M==="onCompositionEnd"&&fn&&(_=mu()):(kt=f,oi="value"in kt?kt.value:kt.textContent,fn=!0)),E=Ns(d,M),0<E.length&&(M=new xo(M,e,null,n,f),p.push({event:M,listeners:E}),_?M.data=_:(_=gu(n),_!==null&&(M.data=_)))),(_=If?Df(e,n):Of(e,n))&&(d=Ns(d,"onBeforeInput"),0<d.length&&(f=new xo("onBeforeInput","beforeinput",null,n,f),p.push({event:f,listeners:d}),f.data=_))}Mu(p,t)})}function wr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Ns(e,t){for(var n=t+"Capture",s=[];e!==null;){var l=e,a=l.stateNode;l.tag===5&&a!==null&&(l=a,a=pr(e,n),a!=null&&s.unshift(wr(e,a,l)),a=pr(e,t),a!=null&&s.push(wr(e,a,l))),e=e.return}return s}function un(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function To(e,t,n,s,l){for(var a=t._reactName,i=[];n!==null&&n!==s;){var o=n,c=o.alternate,d=o.stateNode;if(c!==null&&c===s)break;o.tag===5&&d!==null&&(o=d,l?(c=pr(n,a),c!=null&&i.unshift(wr(n,c,o))):l||(c=pr(n,a),c!=null&&i.push(wr(n,c,o)))),n=n.return}i.length!==0&&e.push({event:t,listeners:i})}var Xf=/\\r\\n?/g,Jf=/\\u0000|\\uFFFD/g;function Mo(e){return(typeof e=="string"?e:""+e).replace(Xf,`\n`).replace(Jf,"")}function Xr(e,t,n){if(t=Mo(t),Mo(e)!==t&&n)throw Error(S(425))}function ks(){}var va=null,xa=null;function ga(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var ya=typeof setTimeout=="function"?setTimeout:void 0,Zf=typeof clearTimeout=="function"?clearTimeout:void 0,zo=typeof Promise=="function"?Promise:void 0,qf=typeof queueMicrotask=="function"?queueMicrotask:typeof zo<"u"?function(e){return zo.resolve(null).then(e).catch(ep)}:ya;function ep(e){setTimeout(function(){throw e})}function Fl(e,t){var n=t,s=0;do{var l=n.nextSibling;if(e.removeChild(n),l&&l.nodeType===8)if(n=l.data,n==="/$"){if(s===0){e.removeChild(l),xr(t);return}s--}else n!=="$"&&n!=="$?"&&n!=="$!"||s++;n=l}while(n);xr(t)}function Tt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Lo(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var Wn=Math.random().toString(36).slice(2),et="__reactFiber$"+Wn,Nr="__reactProps$"+Wn,ht="__reactContainer$"+Wn,ja="__reactEvents$"+Wn,tp="__reactListeners$"+Wn,np="__reactHandles$"+Wn;function Kt(e){var t=e[et];if(t)return t;for(var n=e.parentNode;n;){if(t=n[ht]||n[et]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Lo(e);e!==null;){if(n=e[et])return n;e=Lo(e)}return t}e=n,n=e.parentNode}return null}function Dr(e){return e=e[et]||e[ht],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function vn(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(S(33))}function Zs(e){return e[Nr]||null}var wa=[],xn=-1;function Ut(e){return{current:e}}function Q(e){0>xn||(e.current=wa[xn],wa[xn]=null,xn--)}function H(e,t){xn++,wa[xn]=e.current,e.current=t}var Ot={},ge=Ut(Ot),_e=Ut(!1),en=Ot;function Mn(e,t){var n=e.type.contextTypes;if(!n)return Ot;var s=e.stateNode;if(s&&s.__reactInternalMemoizedUnmaskedChildContext===t)return s.__reactInternalMemoizedMaskedChildContext;var l={},a;for(a in n)l[a]=t[a];return s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=l),l}function Pe(e){return e=e.childContextTypes,e!=null}function Ss(){Q(_e),Q(ge)}function Ro(e,t,n){if(ge.current!==Ot)throw Error(S(168));H(ge,t),H(_e,n)}function Lu(e,t,n){var s=e.stateNode;if(t=t.childContextTypes,typeof s.getChildContext!="function")return n;s=s.getChildContext();for(var l in s)if(!(l in t))throw Error(S(108,$h(e)||"Unknown",l));return Z({},n,s)}function Cs(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||Ot,en=ge.current,H(ge,e),H(_e,_e.current),!0}function Io(e,t,n){var s=e.stateNode;if(!s)throw Error(S(169));n?(e=Lu(e,t,en),s.__reactInternalMemoizedMergedChildContext=e,Q(_e),Q(ge),H(ge,e)):Q(_e),H(_e,n)}var it=null,qs=!1,$l=!1;function Ru(e){it===null?it=[e]:it.push(e)}function rp(e){qs=!0,Ru(e)}function Bt(){if(!$l&&it!==null){$l=!0;var e=0,t=U;try{var n=it;for(U=1;e<n.length;e++){var s=n[e];do s=s(!0);while(s!==null)}it=null,qs=!1}catch(l){throw it!==null&&(it=it.slice(e+1)),su(si,Bt),l}finally{U=t,$l=!1}}return null}var gn=[],yn=0,Es=null,_s=0,Ae=[],Fe=0,tn=null,ot=1,ct="";function Qt(e,t){gn[yn++]=_s,gn[yn++]=Es,Es=e,_s=t}function Iu(e,t,n){Ae[Fe++]=ot,Ae[Fe++]=ct,Ae[Fe++]=tn,tn=e;var s=ot;e=ct;var l=32-Ke(s)-1;s&=~(1<<l),n+=1;var a=32-Ke(t)+l;if(30<a){var i=l-l%5;a=(s&(1<<i)-1).toString(32),s>>=i,l-=i,ot=1<<32-Ke(t)+l|n<<l|s,ct=a+e}else ot=1<<a|n<<l|s,ct=e}function fi(e){e.return!==null&&(Qt(e,1),Iu(e,1,0))}function pi(e){for(;e===Es;)Es=gn[--yn],gn[yn]=null,_s=gn[--yn],gn[yn]=null;for(;e===tn;)tn=Ae[--Fe],Ae[Fe]=null,ct=Ae[--Fe],Ae[Fe]=null,ot=Ae[--Fe],Ae[Fe]=null}var Le=null,ze=null,Y=!1,Ye=null;function Du(e,t){var n=We(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Do(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Le=e,ze=Tt(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Le=e,ze=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=tn!==null?{id:ot,overflow:ct}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=We(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,Le=e,ze=null,!0):!1;default:return!1}}function Na(e){return(e.mode&1)!==0&&(e.flags&128)===0}function ka(e){if(Y){var t=ze;if(t){var n=t;if(!Do(e,t)){if(Na(e))throw Error(S(418));t=Tt(n.nextSibling);var s=Le;t&&Do(e,t)?Du(s,n):(e.flags=e.flags&-4097|2,Y=!1,Le=e)}}else{if(Na(e))throw Error(S(418));e.flags=e.flags&-4097|2,Y=!1,Le=e}}}function Oo(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Le=e}function Jr(e){if(e!==Le)return!1;if(!Y)return Oo(e),Y=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!ga(e.type,e.memoizedProps)),t&&(t=ze)){if(Na(e))throw Ou(),Error(S(418));for(;t;)Du(e,t),t=Tt(t.nextSibling)}if(Oo(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(S(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){ze=Tt(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}ze=null}}else ze=Le?Tt(e.stateNode.nextSibling):null;return!0}function Ou(){for(var e=ze;e;)e=Tt(e.nextSibling)}function zn(){ze=Le=null,Y=!1}function mi(e){Ye===null?Ye=[e]:Ye.push(e)}var sp=mt.ReactCurrentBatchConfig;function Xn(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(S(309));var s=n.stateNode}if(!s)throw Error(S(147,e));var l=s,a=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===a?t.ref:(t=function(i){var o=l.refs;i===null?delete o[a]:o[a]=i},t._stringRef=a,t)}if(typeof e!="string")throw Error(S(284));if(!n._owner)throw Error(S(290,e))}return e}function Zr(e,t){throw e=Object.prototype.toString.call(t),Error(S(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Ao(e){var t=e._init;return t(e._payload)}function Au(e){function t(h,u){if(e){var m=h.deletions;m===null?(h.deletions=[u],h.flags|=16):m.push(u)}}function n(h,u){if(!e)return null;for(;u!==null;)t(h,u),u=u.sibling;return null}function s(h,u){for(h=new Map;u!==null;)u.key!==null?h.set(u.key,u):h.set(u.index,u),u=u.sibling;return h}function l(h,u){return h=Rt(h,u),h.index=0,h.sibling=null,h}function a(h,u,m){return h.index=m,e?(m=h.alternate,m!==null?(m=m.index,m<u?(h.flags|=2,u):m):(h.flags|=2,u)):(h.flags|=1048576,u)}function i(h){return e&&h.alternate===null&&(h.flags|=2),h}function o(h,u,m,v){return u===null||u.tag!==6?(u=Ql(m,h.mode,v),u.return=h,u):(u=l(u,m),u.return=h,u)}function c(h,u,m,v){var k=m.type;return k===hn?f(h,u,m.props.children,v,m.key):u!==null&&(u.elementType===k||typeof k=="object"&&k!==null&&k.$$typeof===yt&&Ao(k)===u.type)?(v=l(u,m.props),v.ref=Xn(h,u,m),v.return=h,v):(v=ps(m.type,m.key,m.props,null,h.mode,v),v.ref=Xn(h,u,m),v.return=h,v)}function d(h,u,m,v){return u===null||u.tag!==4||u.stateNode.containerInfo!==m.containerInfo||u.stateNode.implementation!==m.implementation?(u=Yl(m,h.mode,v),u.return=h,u):(u=l(u,m.children||[]),u.return=h,u)}function f(h,u,m,v,k){return u===null||u.tag!==7?(u=Zt(m,h.mode,v,k),u.return=h,u):(u=l(u,m),u.return=h,u)}function p(h,u,m){if(typeof u=="string"&&u!==""||typeof u=="number")return u=Ql(""+u,h.mode,m),u.return=h,u;if(typeof u=="object"&&u!==null){switch(u.$$typeof){case Ur:return m=ps(u.type,u.key,u.props,null,h.mode,m),m.ref=Xn(h,null,u),m.return=h,m;case dn:return u=Yl(u,h.mode,m),u.return=h,u;case yt:var v=u._init;return p(h,v(u._payload),m)}if(er(u)||bn(u))return u=Zt(u,h.mode,m,null),u.return=h,u;Zr(h,u)}return null}function g(h,u,m,v){var k=u!==null?u.key:null;if(typeof m=="string"&&m!==""||typeof m=="number")return k!==null?null:o(h,u,""+m,v);if(typeof m=="object"&&m!==null){switch(m.$$typeof){case Ur:return m.key===k?c(h,u,m,v):null;case dn:return m.key===k?d(h,u,m,v):null;case yt:return k=m._init,g(h,u,k(m._payload),v)}if(er(m)||bn(m))return k!==null?null:f(h,u,m,v,null);Zr(h,m)}return null}function y(h,u,m,v,k){if(typeof v=="string"&&v!==""||typeof v=="number")return h=h.get(m)||null,o(u,h,""+v,k);if(typeof v=="object"&&v!==null){switch(v.$$typeof){case Ur:return h=h.get(v.key===null?m:v.key)||null,c(u,h,v,k);case dn:return h=h.get(v.key===null?m:v.key)||null,d(u,h,v,k);case yt:var E=v._init;return y(h,u,m,E(v._payload),k)}if(er(v)||bn(v))return h=h.get(m)||null,f(u,h,v,k,null);Zr(u,v)}return null}function j(h,u,m,v){for(var k=null,E=null,_=u,M=u=0,V=null;_!==null&&M<m.length;M++){_.index>M?(V=_,_=null):V=_.sibling;var R=g(h,_,m[M],v);if(R===null){_===null&&(_=V);break}e&&_&&R.alternate===null&&t(h,_),u=a(R,u,M),E===null?k=R:E.sibling=R,E=R,_=V}if(M===m.length)return n(h,_),Y&&Qt(h,M),k;if(_===null){for(;M<m.length;M++)_=p(h,m[M],v),_!==null&&(u=a(_,u,M),E===null?k=_:E.sibling=_,E=_);return Y&&Qt(h,M),k}for(_=s(h,_);M<m.length;M++)V=y(_,h,M,m[M],v),V!==null&&(e&&V.alternate!==null&&_.delete(V.key===null?M:V.key),u=a(V,u,M),E===null?k=V:E.sibling=V,E=V);return e&&_.forEach(function(pe){return t(h,pe)}),Y&&Qt(h,M),k}function w(h,u,m,v){var k=bn(m);if(typeof k!="function")throw Error(S(150));if(m=k.call(m),m==null)throw Error(S(151));for(var E=k=null,_=u,M=u=0,V=null,R=m.next();_!==null&&!R.done;M++,R=m.next()){_.index>M?(V=_,_=null):V=_.sibling;var pe=g(h,_,R.value,v);if(pe===null){_===null&&(_=V);break}e&&_&&pe.alternate===null&&t(h,_),u=a(pe,u,M),E===null?k=pe:E.sibling=pe,E=pe,_=V}if(R.done)return n(h,_),Y&&Qt(h,M),k;if(_===null){for(;!R.done;M++,R=m.next())R=p(h,R.value,v),R!==null&&(u=a(R,u,M),E===null?k=R:E.sibling=R,E=R);return Y&&Qt(h,M),k}for(_=s(h,_);!R.done;M++,R=m.next())R=y(_,h,M,R.value,v),R!==null&&(e&&R.alternate!==null&&_.delete(R.key===null?M:R.key),u=a(R,u,M),E===null?k=R:E.sibling=R,E=R);return e&&_.forEach(function(xt){return t(h,xt)}),Y&&Qt(h,M),k}function N(h,u,m,v){if(typeof m=="object"&&m!==null&&m.type===hn&&m.key===null&&(m=m.props.children),typeof m=="object"&&m!==null){switch(m.$$typeof){case Ur:e:{for(var k=m.key,E=u;E!==null;){if(E.key===k){if(k=m.type,k===hn){if(E.tag===7){n(h,E.sibling),u=l(E,m.props.children),u.return=h,h=u;break e}}else if(E.elementType===k||typeof k=="object"&&k!==null&&k.$$typeof===yt&&Ao(k)===E.type){n(h,E.sibling),u=l(E,m.props),u.ref=Xn(h,E,m),u.return=h,h=u;break e}n(h,E);break}else t(h,E);E=E.sibling}m.type===hn?(u=Zt(m.props.children,h.mode,v,m.key),u.return=h,h=u):(v=ps(m.type,m.key,m.props,null,h.mode,v),v.ref=Xn(h,u,m),v.return=h,h=v)}return i(h);case dn:e:{for(E=m.key;u!==null;){if(u.key===E)if(u.tag===4&&u.stateNode.containerInfo===m.containerInfo&&u.stateNode.implementation===m.implementation){n(h,u.sibling),u=l(u,m.children||[]),u.return=h,h=u;break e}else{n(h,u);break}else t(h,u);u=u.sibling}u=Yl(m,h.mode,v),u.return=h,h=u}return i(h);case yt:return E=m._init,N(h,u,E(m._payload),v)}if(er(m))return j(h,u,m,v);if(bn(m))return w(h,u,m,v);Zr(h,m)}return typeof m=="string"&&m!==""||typeof m=="number"?(m=""+m,u!==null&&u.tag===6?(n(h,u.sibling),u=l(u,m),u.return=h,h=u):(n(h,u),u=Ql(m,h.mode,v),u.return=h,h=u),i(h)):n(h,u)}return N}var Ln=Au(!0),Fu=Au(!1),Ps=Ut(null),Ts=null,jn=null,vi=null;function xi(){vi=jn=Ts=null}function gi(e){var t=Ps.current;Q(Ps),e._currentValue=t}function Sa(e,t,n){for(;e!==null;){var s=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,s!==null&&(s.childLanes|=t)):s!==null&&(s.childLanes&t)!==t&&(s.childLanes|=t),e===n)break;e=e.return}}function _n(e,t){Ts=e,vi=jn=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(Ee=!0),e.firstContext=null)}function Be(e){var t=e._currentValue;if(vi!==e)if(e={context:e,memoizedValue:t,next:null},jn===null){if(Ts===null)throw Error(S(308));jn=e,Ts.dependencies={lanes:0,firstContext:e}}else jn=jn.next=e;return t}var Gt=null;function yi(e){Gt===null?Gt=[e]:Gt.push(e)}function $u(e,t,n,s){var l=t.interleaved;return l===null?(n.next=n,yi(t)):(n.next=l.next,l.next=n),t.interleaved=n,ft(e,s)}function ft(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var jt=!1;function ji(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wu(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function ut(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function Mt(e,t,n){var s=e.updateQueue;if(s===null)return null;if(s=s.shared,F&2){var l=s.pending;return l===null?t.next=t:(t.next=l.next,l.next=t),s.pending=t,ft(e,n)}return l=s.interleaved,l===null?(t.next=t,yi(s)):(t.next=l.next,l.next=t),s.interleaved=t,ft(e,n)}function os(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,li(e,n)}}function Fo(e,t){var n=e.updateQueue,s=e.alternate;if(s!==null&&(s=s.updateQueue,n===s)){var l=null,a=null;if(n=n.firstBaseUpdate,n!==null){do{var i={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};a===null?l=a=i:a=a.next=i,n=n.next}while(n!==null);a===null?l=a=t:a=a.next=t}else l=a=t;n={baseState:s.baseState,firstBaseUpdate:l,lastBaseUpdate:a,shared:s.shared,effects:s.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function Ms(e,t,n,s){var l=e.updateQueue;jt=!1;var a=l.firstBaseUpdate,i=l.lastBaseUpdate,o=l.shared.pending;if(o!==null){l.shared.pending=null;var c=o,d=c.next;c.next=null,i===null?a=d:i.next=d,i=c;var f=e.alternate;f!==null&&(f=f.updateQueue,o=f.lastBaseUpdate,o!==i&&(o===null?f.firstBaseUpdate=d:o.next=d,f.lastBaseUpdate=c))}if(a!==null){var p=l.baseState;i=0,f=d=c=null,o=a;do{var g=o.lane,y=o.eventTime;if((s&g)===g){f!==null&&(f=f.next={eventTime:y,lane:0,tag:o.tag,payload:o.payload,callback:o.callback,next:null});e:{var j=e,w=o;switch(g=t,y=n,w.tag){case 1:if(j=w.payload,typeof j=="function"){p=j.call(y,p,g);break e}p=j;break e;case 3:j.flags=j.flags&-65537|128;case 0:if(j=w.payload,g=typeof j=="function"?j.call(y,p,g):j,g==null)break e;p=Z({},p,g);break e;case 2:jt=!0}}o.callback!==null&&o.lane!==0&&(e.flags|=64,g=l.effects,g===null?l.effects=[o]:g.push(o))}else y={eventTime:y,lane:g,tag:o.tag,payload:o.payload,callback:o.callback,next:null},f===null?(d=f=y,c=p):f=f.next=y,i|=g;if(o=o.next,o===null){if(o=l.shared.pending,o===null)break;g=o,o=g.next,g.next=null,l.lastBaseUpdate=g,l.shared.pending=null}}while(!0);if(f===null&&(c=p),l.baseState=c,l.firstBaseUpdate=d,l.lastBaseUpdate=f,t=l.shared.interleaved,t!==null){l=t;do i|=l.lane,l=l.next;while(l!==t)}else a===null&&(l.shared.lanes=0);rn|=i,e.lanes=i,e.memoizedState=p}}function $o(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var s=e[t],l=s.callback;if(l!==null){if(s.callback=null,s=n,typeof l!="function")throw Error(S(191,l));l.call(s)}}}var Or={},nt=Ut(Or),kr=Ut(Or),Sr=Ut(Or);function Xt(e){if(e===Or)throw Error(S(174));return e}function wi(e,t){switch(H(Sr,t),H(kr,e),H(nt,Or),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:sa(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=sa(t,e)}Q(nt),H(nt,t)}function Rn(){Q(nt),Q(kr),Q(Sr)}function Uu(e){Xt(Sr.current);var t=Xt(nt.current),n=sa(t,e.type);t!==n&&(H(kr,e),H(nt,n))}function Ni(e){kr.current===e&&(Q(nt),Q(kr))}var G=Ut(0);function zs(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var Wl=[];function ki(){for(var e=0;e<Wl.length;e++)Wl[e]._workInProgressVersionPrimary=null;Wl.length=0}var cs=mt.ReactCurrentDispatcher,Ul=mt.ReactCurrentBatchConfig,nn=0,X=null,ae=null,ce=null,Ls=!1,or=!1,Cr=0,lp=0;function me(){throw Error(S(321))}function Si(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!Xe(e[n],t[n]))return!1;return!0}function Ci(e,t,n,s,l,a){if(nn=a,X=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,cs.current=e===null||e.memoizedState===null?cp:up,e=n(s,l),or){a=0;do{if(or=!1,Cr=0,25<=a)throw Error(S(301));a+=1,ce=ae=null,t.updateQueue=null,cs.current=dp,e=n(s,l)}while(or)}if(cs.current=Rs,t=ae!==null&&ae.next!==null,nn=0,ce=ae=X=null,Ls=!1,t)throw Error(S(300));return e}function Ei(){var e=Cr!==0;return Cr=0,e}function qe(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return ce===null?X.memoizedState=ce=e:ce=ce.next=e,ce}function Ve(){if(ae===null){var e=X.alternate;e=e!==null?e.memoizedState:null}else e=ae.next;var t=ce===null?X.memoizedState:ce.next;if(t!==null)ce=t,ae=e;else{if(e===null)throw Error(S(310));ae=e,e={memoizedState:ae.memoizedState,baseState:ae.baseState,baseQueue:ae.baseQueue,queue:ae.queue,next:null},ce===null?X.memoizedState=ce=e:ce=ce.next=e}return ce}function Er(e,t){return typeof t=="function"?t(e):t}function Bl(e){var t=Ve(),n=t.queue;if(n===null)throw Error(S(311));n.lastRenderedReducer=e;var s=ae,l=s.baseQueue,a=n.pending;if(a!==null){if(l!==null){var i=l.next;l.next=a.next,a.next=i}s.baseQueue=l=a,n.pending=null}if(l!==null){a=l.next,s=s.baseState;var o=i=null,c=null,d=a;do{var f=d.lane;if((nn&f)===f)c!==null&&(c=c.next={lane:0,action:d.action,hasEagerState:d.hasEagerState,eagerState:d.eagerState,next:null}),s=d.hasEagerState?d.eagerState:e(s,d.action);else{var p={lane:f,action:d.action,hasEagerState:d.hasEagerState,eagerState:d.eagerState,next:null};c===null?(o=c=p,i=s):c=c.next=p,X.lanes|=f,rn|=f}d=d.next}while(d!==null&&d!==a);c===null?i=s:c.next=o,Xe(s,t.memoizedState)||(Ee=!0),t.memoizedState=s,t.baseState=i,t.baseQueue=c,n.lastRenderedState=s}if(e=n.interleaved,e!==null){l=e;do a=l.lane,X.lanes|=a,rn|=a,l=l.next;while(l!==e)}else l===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function Vl(e){var t=Ve(),n=t.queue;if(n===null)throw Error(S(311));n.lastRenderedReducer=e;var s=n.dispatch,l=n.pending,a=t.memoizedState;if(l!==null){n.pending=null;var i=l=l.next;do a=e(a,i.action),i=i.next;while(i!==l);Xe(a,t.memoizedState)||(Ee=!0),t.memoizedState=a,t.baseQueue===null&&(t.baseState=a),n.lastRenderedState=a}return[a,s]}function Bu(){}function Vu(e,t){var n=X,s=Ve(),l=t(),a=!Xe(s.memoizedState,l);if(a&&(s.memoizedState=l,Ee=!0),s=s.queue,_i(Qu.bind(null,n,s,e),[e]),s.getSnapshot!==t||a||ce!==null&&ce.memoizedState.tag&1){if(n.flags|=2048,_r(9,bu.bind(null,n,s,l,t),void 0,null),ue===null)throw Error(S(349));nn&30||Hu(n,t,l)}return l}function Hu(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function bu(e,t,n,s){t.value=n,t.getSnapshot=s,Yu(t)&&Ku(e)}function Qu(e,t,n){return n(function(){Yu(t)&&Ku(e)})}function Yu(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!Xe(e,n)}catch{return!0}}function Ku(e){var t=ft(e,1);t!==null&&Ge(t,e,1,-1)}function Wo(e){var t=qe();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Er,lastRenderedState:e},t.queue=e,e=e.dispatch=op.bind(null,X,e),[t.memoizedState,e]}function _r(e,t,n,s){return e={tag:e,create:t,destroy:n,deps:s,next:null},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(s=n.next,n.next=e,e.next=s,t.lastEffect=e)),e}function Gu(){return Ve().memoizedState}function us(e,t,n,s){var l=qe();X.flags|=e,l.memoizedState=_r(1|t,n,void 0,s===void 0?null:s)}function el(e,t,n,s){var l=Ve();s=s===void 0?null:s;var a=void 0;if(ae!==null){var i=ae.memoizedState;if(a=i.destroy,s!==null&&Si(s,i.deps)){l.memoizedState=_r(t,n,a,s);return}}X.flags|=e,l.memoizedState=_r(1|t,n,a,s)}function Uo(e,t){return us(8390656,8,e,t)}function _i(e,t){return el(2048,8,e,t)}function Xu(e,t){return el(4,2,e,t)}function Ju(e,t){return el(4,4,e,t)}function Zu(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function qu(e,t,n){return n=n!=null?n.concat([e]):null,el(4,4,Zu.bind(null,t,e),n)}function Pi(){}function ed(e,t){var n=Ve();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Si(t,s[1])?s[0]:(n.memoizedState=[e,t],e)}function td(e,t){var n=Ve();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Si(t,s[1])?s[0]:(e=e(),n.memoizedState=[e,t],e)}function nd(e,t,n){return nn&21?(Xe(n,t)||(n=iu(),X.lanes|=n,rn|=n,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,Ee=!0),e.memoizedState=n)}function ap(e,t){var n=U;U=n!==0&&4>n?n:4,e(!0);var s=Ul.transition;Ul.transition={};try{e(!1),t()}finally{U=n,Ul.transition=s}}function rd(){return Ve().memoizedState}function ip(e,t,n){var s=Lt(e);if(n={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null},sd(e))ld(t,n);else if(n=$u(e,t,n,s),n!==null){var l=je();Ge(n,e,s,l),ad(n,t,s)}}function op(e,t,n){var s=Lt(e),l={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null};if(sd(e))ld(t,l);else{var a=e.alternate;if(e.lanes===0&&(a===null||a.lanes===0)&&(a=t.lastRenderedReducer,a!==null))try{var i=t.lastRenderedState,o=a(i,n);if(l.hasEagerState=!0,l.eagerState=o,Xe(o,i)){var c=t.interleaved;c===null?(l.next=l,yi(t)):(l.next=c.next,c.next=l),t.interleaved=l;return}}catch{}finally{}n=$u(e,t,l,s),n!==null&&(l=je(),Ge(n,e,s,l),ad(n,t,s))}}function sd(e){var t=e.alternate;return e===X||t!==null&&t===X}function ld(e,t){or=Ls=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function ad(e,t,n){if(n&4194240){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,li(e,n)}}var Rs={readContext:Be,useCallback:me,useContext:me,useEffect:me,useImperativeHandle:me,useInsertionEffect:me,useLayoutEffect:me,useMemo:me,useReducer:me,useRef:me,useState:me,useDebugValue:me,useDeferredValue:me,useTransition:me,useMutableSource:me,useSyncExternalStore:me,useId:me,unstable_isNewReconciler:!1},cp={readContext:Be,useCallback:function(e,t){return qe().memoizedState=[e,t===void 0?null:t],e},useContext:Be,useEffect:Uo,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,us(4194308,4,Zu.bind(null,t,e),n)},useLayoutEffect:function(e,t){return us(4194308,4,e,t)},useInsertionEffect:function(e,t){return us(4,2,e,t)},useMemo:function(e,t){var n=qe();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var s=qe();return t=n!==void 0?n(t):t,s.memoizedState=s.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},s.queue=e,e=e.dispatch=ip.bind(null,X,e),[s.memoizedState,e]},useRef:function(e){var t=qe();return e={current:e},t.memoizedState=e},useState:Wo,useDebugValue:Pi,useDeferredValue:function(e){return qe().memoizedState=e},useTransition:function(){var e=Wo(!1),t=e[0];return e=ap.bind(null,e[1]),qe().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var s=X,l=qe();if(Y){if(n===void 0)throw Error(S(407));n=n()}else{if(n=t(),ue===null)throw Error(S(349));nn&30||Hu(s,t,n)}l.memoizedState=n;var a={value:n,getSnapshot:t};return l.queue=a,Uo(Qu.bind(null,s,a,e),[e]),s.flags|=2048,_r(9,bu.bind(null,s,a,n,t),void 0,null),n},useId:function(){var e=qe(),t=ue.identifierPrefix;if(Y){var n=ct,s=ot;n=(s&~(1<<32-Ke(s)-1)).toString(32)+n,t=":"+t+"R"+n,n=Cr++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=lp++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},up={readContext:Be,useCallback:ed,useContext:Be,useEffect:_i,useImperativeHandle:qu,useInsertionEffect:Xu,useLayoutEffect:Ju,useMemo:td,useReducer:Bl,useRef:Gu,useState:function(){return Bl(Er)},useDebugValue:Pi,useDeferredValue:function(e){var t=Ve();return nd(t,ae.memoizedState,e)},useTransition:function(){var e=Bl(Er)[0],t=Ve().memoizedState;return[e,t]},useMutableSource:Bu,useSyncExternalStore:Vu,useId:rd,unstable_isNewReconciler:!1},dp={readContext:Be,useCallback:ed,useContext:Be,useEffect:_i,useImperativeHandle:qu,useInsertionEffect:Xu,useLayoutEffect:Ju,useMemo:td,useReducer:Vl,useRef:Gu,useState:function(){return Vl(Er)},useDebugValue:Pi,useDeferredValue:function(e){var t=Ve();return ae===null?t.memoizedState=e:nd(t,ae.memoizedState,e)},useTransition:function(){var e=Vl(Er)[0],t=Ve().memoizedState;return[e,t]},useMutableSource:Bu,useSyncExternalStore:Vu,useId:rd,unstable_isNewReconciler:!1};function be(e,t){if(e&&e.defaultProps){t=Z({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function Ca(e,t,n,s){t=e.memoizedState,n=n(s,t),n=n==null?t:Z({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var tl={isMounted:function(e){return(e=e._reactInternals)?on(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var s=je(),l=Lt(e),a=ut(s,l);a.payload=t,n!=null&&(a.callback=n),t=Mt(e,a,l),t!==null&&(Ge(t,e,l,s),os(t,e,l))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var s=je(),l=Lt(e),a=ut(s,l);a.tag=1,a.payload=t,n!=null&&(a.callback=n),t=Mt(e,a,l),t!==null&&(Ge(t,e,l,s),os(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=je(),s=Lt(e),l=ut(n,s);l.tag=2,t!=null&&(l.callback=t),t=Mt(e,l,s),t!==null&&(Ge(t,e,s,n),os(t,e,s))}};function Bo(e,t,n,s,l,a,i){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(s,a,i):t.prototype&&t.prototype.isPureReactComponent?!yr(n,s)||!yr(l,a):!0}function id(e,t,n){var s=!1,l=Ot,a=t.contextType;return typeof a=="object"&&a!==null?a=Be(a):(l=Pe(t)?en:ge.current,s=t.contextTypes,a=(s=s!=null)?Mn(e,l):Ot),t=new t(n,a),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=tl,e.stateNode=t,t._reactInternals=e,s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=a),t}function Vo(e,t,n,s){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,s),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,s),t.state!==e&&tl.enqueueReplaceState(t,t.state,null)}function Ea(e,t,n,s){var l=e.stateNode;l.props=n,l.state=e.memoizedState,l.refs={},ji(e);var a=t.contextType;typeof a=="object"&&a!==null?l.context=Be(a):(a=Pe(t)?en:ge.current,l.context=Mn(e,a)),l.state=e.memoizedState,a=t.getDerivedStateFromProps,typeof a=="function"&&(Ca(e,t,a,n),l.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof l.getSnapshotBeforeUpdate=="function"||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(t=l.state,typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount(),t!==l.state&&tl.enqueueReplaceState(l,l.state,null),Ms(e,n,l,s),l.state=e.memoizedState),typeof l.componentDidMount=="function"&&(e.flags|=4194308)}function In(e,t){try{var n="",s=t;do n+=Fh(s),s=s.return;while(s);var l=n}catch(a){l=`\nError generating stack: `+a.message+`\n`+a.stack}return{value:e,source:t,stack:l,digest:null}}function Hl(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function _a(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var hp=typeof WeakMap=="function"?WeakMap:Map;function od(e,t,n){n=ut(-1,n),n.tag=3,n.payload={element:null};var s=t.value;return n.callback=function(){Ds||(Ds=!0,Aa=s),_a(e,t)},n}function cd(e,t,n){n=ut(-1,n),n.tag=3;var s=e.type.getDerivedStateFromError;if(typeof s=="function"){var l=t.value;n.payload=function(){return s(l)},n.callback=function(){_a(e,t)}}var a=e.stateNode;return a!==null&&typeof a.componentDidCatch=="function"&&(n.callback=function(){_a(e,t),typeof s!="function"&&(zt===null?zt=new Set([this]):zt.add(this));var i=t.stack;this.componentDidCatch(t.value,{componentStack:i!==null?i:""})}),n}function Ho(e,t,n){var s=e.pingCache;if(s===null){s=e.pingCache=new hp;var l=new Set;s.set(t,l)}else l=s.get(t),l===void 0&&(l=new Set,s.set(t,l));l.has(n)||(l.add(n),e=Ep.bind(null,e,t,n),t.then(e,e))}function bo(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Qo(e,t,n,s,l){return e.mode&1?(e.flags|=65536,e.lanes=l,e):(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=ut(-1,1),t.tag=2,Mt(n,t,1))),n.lanes|=1),e)}var fp=mt.ReactCurrentOwner,Ee=!1;function ye(e,t,n,s){t.child=e===null?Fu(t,null,n,s):Ln(t,e.child,n,s)}function Yo(e,t,n,s,l){n=n.render;var a=t.ref;return _n(t,l),s=Ci(e,t,n,s,a,l),n=Ei(),e!==null&&!Ee?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,pt(e,t,l)):(Y&&n&&fi(t),t.flags|=1,ye(e,t,s,l),t.child)}function Ko(e,t,n,s,l){if(e===null){var a=n.type;return typeof a=="function"&&!Oi(a)&&a.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=a,ud(e,t,a,s,l)):(e=ps(n.type,null,s,t,t.mode,l),e.ref=t.ref,e.return=t,t.child=e)}if(a=e.child,!(e.lanes&l)){var i=a.memoizedProps;if(n=n.compare,n=n!==null?n:yr,n(i,s)&&e.ref===t.ref)return pt(e,t,l)}return t.flags|=1,e=Rt(a,s),e.ref=t.ref,e.return=t,t.child=e}function ud(e,t,n,s,l){if(e!==null){var a=e.memoizedProps;if(yr(a,s)&&e.ref===t.ref)if(Ee=!1,t.pendingProps=s=a,(e.lanes&l)!==0)e.flags&131072&&(Ee=!0);else return t.lanes=e.lanes,pt(e,t,l)}return Pa(e,t,n,s,l)}function dd(e,t,n){var s=t.pendingProps,l=s.children,a=e!==null?e.memoizedState:null;if(s.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},H(Nn,Me),Me|=n;else{if(!(n&1073741824))return e=a!==null?a.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,H(Nn,Me),Me|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},s=a!==null?a.baseLanes:n,H(Nn,Me),Me|=s}else a!==null?(s=a.baseLanes|n,t.memoizedState=null):s=n,H(Nn,Me),Me|=s;return ye(e,t,l,n),t.child}function hd(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function Pa(e,t,n,s,l){var a=Pe(n)?en:ge.current;return a=Mn(t,a),_n(t,l),n=Ci(e,t,n,s,a,l),s=Ei(),e!==null&&!Ee?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,pt(e,t,l)):(Y&&s&&fi(t),t.flags|=1,ye(e,t,n,l),t.child)}function Go(e,t,n,s,l){if(Pe(n)){var a=!0;Cs(t)}else a=!1;if(_n(t,l),t.stateNode===null)ds(e,t),id(t,n,s),Ea(t,n,s,l),s=!0;else if(e===null){var i=t.stateNode,o=t.memoizedProps;i.props=o;var c=i.context,d=n.contextType;typeof d=="object"&&d!==null?d=Be(d):(d=Pe(n)?en:ge.current,d=Mn(t,d));var f=n.getDerivedStateFromProps,p=typeof f=="function"||typeof i.getSnapshotBeforeUpdate=="function";p||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(o!==s||c!==d)&&Vo(t,i,s,d),jt=!1;var g=t.memoizedState;i.state=g,Ms(t,s,i,l),c=t.memoizedState,o!==s||g!==c||_e.current||jt?(typeof f=="function"&&(Ca(t,n,f,s),c=t.memoizedState),(o=jt||Bo(t,n,o,s,g,c,d))?(p||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount()),typeof i.componentDidMount=="function"&&(t.flags|=4194308)):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=s,t.memoizedState=c),i.props=s,i.state=c,i.context=d,s=o):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),s=!1)}else{i=t.stateNode,Wu(e,t),o=t.memoizedProps,d=t.type===t.elementType?o:be(t.type,o),i.props=d,p=t.pendingProps,g=i.context,c=n.contextType,typeof c=="object"&&c!==null?c=Be(c):(c=Pe(n)?en:ge.current,c=Mn(t,c));var y=n.getDerivedStateFromProps;(f=typeof y=="function"||typeof i.getSnapshotBeforeUpdate=="function")||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(o!==p||g!==c)&&Vo(t,i,s,c),jt=!1,g=t.memoizedState,i.state=g,Ms(t,s,i,l);var j=t.memoizedState;o!==p||g!==j||_e.current||jt?(typeof y=="function"&&(Ca(t,n,y,s),j=t.memoizedState),(d=jt||Bo(t,n,d,s,g,j,c)||!1)?(f||typeof i.UNSAFE_componentWillUpdate!="function"&&typeof i.componentWillUpdate!="function"||(typeof i.componentWillUpdate=="function"&&i.componentWillUpdate(s,j,c),typeof i.UNSAFE_componentWillUpdate=="function"&&i.UNSAFE_componentWillUpdate(s,j,c)),typeof i.componentDidUpdate=="function"&&(t.flags|=4),typeof i.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof i.componentDidUpdate!="function"||o===e.memoizedProps&&g===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||o===e.memoizedProps&&g===e.memoizedState||(t.flags|=1024),t.memoizedProps=s,t.memoizedState=j),i.props=s,i.state=j,i.context=c,s=d):(typeof i.componentDidUpdate!="function"||o===e.memoizedProps&&g===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||o===e.memoizedProps&&g===e.memoizedState||(t.flags|=1024),s=!1)}return Ta(e,t,n,s,a,l)}function Ta(e,t,n,s,l,a){hd(e,t);var i=(t.flags&128)!==0;if(!s&&!i)return l&&Io(t,n,!1),pt(e,t,a);s=t.stateNode,fp.current=t;var o=i&&typeof n.getDerivedStateFromError!="function"?null:s.render();return t.flags|=1,e!==null&&i?(t.child=Ln(t,e.child,null,a),t.child=Ln(t,null,o,a)):ye(e,t,o,a),t.memoizedState=s.state,l&&Io(t,n,!0),t.child}function fd(e){var t=e.stateNode;t.pendingContext?Ro(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Ro(e,t.context,!1),wi(e,t.containerInfo)}function Xo(e,t,n,s,l){return zn(),mi(l),t.flags|=256,ye(e,t,n,s),t.child}var Ma={dehydrated:null,treeContext:null,retryLane:0};function za(e){return{baseLanes:e,cachePool:null,transitions:null}}function pd(e,t,n){var s=t.pendingProps,l=G.current,a=!1,i=(t.flags&128)!==0,o;if((o=i)||(o=e!==null&&e.memoizedState===null?!1:(l&2)!==0),o?(a=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(l|=1),H(G,l&1),e===null)return ka(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(i=s.children,e=s.fallback,a?(s=t.mode,a=t.child,i={mode:"hidden",children:i},!(s&1)&&a!==null?(a.childLanes=0,a.pendingProps=i):a=sl(i,s,0,null),e=Zt(e,s,n,null),a.return=t,e.return=t,a.sibling=e,t.child=a,t.child.memoizedState=za(n),t.memoizedState=Ma,e):Ti(t,i));if(l=e.memoizedState,l!==null&&(o=l.dehydrated,o!==null))return pp(e,t,i,s,o,l,n);if(a){a=s.fallback,i=t.mode,l=e.child,o=l.sibling;var c={mode:"hidden",children:s.children};return!(i&1)&&t.child!==l?(s=t.child,s.childLanes=0,s.pendingProps=c,t.deletions=null):(s=Rt(l,c),s.subtreeFlags=l.subtreeFlags&14680064),o!==null?a=Rt(o,a):(a=Zt(a,i,n,null),a.flags|=2),a.return=t,s.return=t,s.sibling=a,t.child=s,s=a,a=t.child,i=e.child.memoizedState,i=i===null?za(n):{baseLanes:i.baseLanes|n,cachePool:null,transitions:i.transitions},a.memoizedState=i,a.childLanes=e.childLanes&~n,t.memoizedState=Ma,s}return a=e.child,e=a.sibling,s=Rt(a,{mode:"visible",children:s.children}),!(t.mode&1)&&(s.lanes=n),s.return=t,s.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=s,t.memoizedState=null,s}function Ti(e,t){return t=sl({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function qr(e,t,n,s){return s!==null&&mi(s),Ln(t,e.child,null,n),e=Ti(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function pp(e,t,n,s,l,a,i){if(n)return t.flags&256?(t.flags&=-257,s=Hl(Error(S(422))),qr(e,t,i,s)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(a=s.fallback,l=t.mode,s=sl({mode:"visible",children:s.children},l,0,null),a=Zt(a,l,i,null),a.flags|=2,s.return=t,a.return=t,s.sibling=a,t.child=s,t.mode&1&&Ln(t,e.child,null,i),t.child.memoizedState=za(i),t.memoizedState=Ma,a);if(!(t.mode&1))return qr(e,t,i,null);if(l.data==="$!"){if(s=l.nextSibling&&l.nextSibling.dataset,s)var o=s.dgst;return s=o,a=Error(S(419)),s=Hl(a,s,void 0),qr(e,t,i,s)}if(o=(i&e.childLanes)!==0,Ee||o){if(s=ue,s!==null){switch(i&-i){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=l&(s.suspendedLanes|i)?0:l,l!==0&&l!==a.retryLane&&(a.retryLane=l,ft(e,l),Ge(s,e,l,-1))}return Di(),s=Hl(Error(S(421))),qr(e,t,i,s)}return l.data==="$?"?(t.flags|=128,t.child=e.child,t=_p.bind(null,e),l._reactRetry=t,null):(e=a.treeContext,ze=Tt(l.nextSibling),Le=t,Y=!0,Ye=null,e!==null&&(Ae[Fe++]=ot,Ae[Fe++]=ct,Ae[Fe++]=tn,ot=e.id,ct=e.overflow,tn=t),t=Ti(t,s.children),t.flags|=4096,t)}function Jo(e,t,n){e.lanes|=t;var s=e.alternate;s!==null&&(s.lanes|=t),Sa(e.return,t,n)}function bl(e,t,n,s,l){var a=e.memoizedState;a===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:s,tail:n,tailMode:l}:(a.isBackwards=t,a.rendering=null,a.renderingStartTime=0,a.last=s,a.tail=n,a.tailMode=l)}function md(e,t,n){var s=t.pendingProps,l=s.revealOrder,a=s.tail;if(ye(e,t,s.children,n),s=G.current,s&2)s=s&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Jo(e,n,t);else if(e.tag===19)Jo(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}s&=1}if(H(G,s),!(t.mode&1))t.memoizedState=null;else switch(l){case"forwards":for(n=t.child,l=null;n!==null;)e=n.alternate,e!==null&&zs(e)===null&&(l=n),n=n.sibling;n=l,n===null?(l=t.child,t.child=null):(l=n.sibling,n.sibling=null),bl(t,!1,l,n,a);break;case"backwards":for(n=null,l=t.child,t.child=null;l!==null;){if(e=l.alternate,e!==null&&zs(e)===null){t.child=l;break}e=l.sibling,l.sibling=n,n=l,l=e}bl(t,!0,n,null,a);break;case"together":bl(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function ds(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function pt(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),rn|=t.lanes,!(n&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(S(153));if(t.child!==null){for(e=t.child,n=Rt(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=Rt(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function mp(e,t,n){switch(t.tag){case 3:fd(t),zn();break;case 5:Uu(t);break;case 1:Pe(t.type)&&Cs(t);break;case 4:wi(t,t.stateNode.containerInfo);break;case 10:var s=t.type._context,l=t.memoizedProps.value;H(Ps,s._currentValue),s._currentValue=l;break;case 13:if(s=t.memoizedState,s!==null)return s.dehydrated!==null?(H(G,G.current&1),t.flags|=128,null):n&t.child.childLanes?pd(e,t,n):(H(G,G.current&1),e=pt(e,t,n),e!==null?e.sibling:null);H(G,G.current&1);break;case 19:if(s=(n&t.childLanes)!==0,e.flags&128){if(s)return md(e,t,n);t.flags|=128}if(l=t.memoizedState,l!==null&&(l.rendering=null,l.tail=null,l.lastEffect=null),H(G,G.current),s)break;return null;case 22:case 23:return t.lanes=0,dd(e,t,n)}return pt(e,t,n)}var vd,La,xd,gd;vd=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};La=function(){};xd=function(e,t,n,s){var l=e.memoizedProps;if(l!==s){e=t.stateNode,Xt(nt.current);var a=null;switch(n){case"input":l=ea(e,l),s=ea(e,s),a=[];break;case"select":l=Z({},l,{value:void 0}),s=Z({},s,{value:void 0}),a=[];break;case"textarea":l=ra(e,l),s=ra(e,s),a=[];break;default:typeof l.onClick!="function"&&typeof s.onClick=="function"&&(e.onclick=ks)}la(n,s);var i;n=null;for(d in l)if(!s.hasOwnProperty(d)&&l.hasOwnProperty(d)&&l[d]!=null)if(d==="style"){var o=l[d];for(i in o)o.hasOwnProperty(i)&&(n||(n={}),n[i]="")}else d!=="dangerouslySetInnerHTML"&&d!=="children"&&d!=="suppressContentEditableWarning"&&d!=="suppressHydrationWarning"&&d!=="autoFocus"&&(hr.hasOwnProperty(d)?a||(a=[]):(a=a||[]).push(d,null));for(d in s){var c=s[d];if(o=l!=null?l[d]:void 0,s.hasOwnProperty(d)&&c!==o&&(c!=null||o!=null))if(d==="style")if(o){for(i in o)!o.hasOwnProperty(i)||c&&c.hasOwnProperty(i)||(n||(n={}),n[i]="");for(i in c)c.hasOwnProperty(i)&&o[i]!==c[i]&&(n||(n={}),n[i]=c[i])}else n||(a||(a=[]),a.push(d,n)),n=c;else d==="dangerouslySetInnerHTML"?(c=c?c.__html:void 0,o=o?o.__html:void 0,c!=null&&o!==c&&(a=a||[]).push(d,c)):d==="children"?typeof c!="string"&&typeof c!="number"||(a=a||[]).push(d,""+c):d!=="suppressContentEditableWarning"&&d!=="suppressHydrationWarning"&&(hr.hasOwnProperty(d)?(c!=null&&d==="onScroll"&&b("scroll",e),a||o===c||(a=[])):(a=a||[]).push(d,c))}n&&(a=a||[]).push("style",n);var d=a;(t.updateQueue=d)&&(t.flags|=4)}};gd=function(e,t,n,s){n!==s&&(t.flags|=4)};function Jn(e,t){if(!Y)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var s=null;n!==null;)n.alternate!==null&&(s=n),n=n.sibling;s===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:s.sibling=null}}function ve(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,s=0;if(t)for(var l=e.child;l!==null;)n|=l.lanes|l.childLanes,s|=l.subtreeFlags&14680064,s|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;l!==null;)n|=l.lanes|l.childLanes,s|=l.subtreeFlags,s|=l.flags,l.return=e,l=l.sibling;return e.subtreeFlags|=s,e.childLanes=n,t}function vp(e,t,n){var s=t.pendingProps;switch(pi(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return ve(t),null;case 1:return Pe(t.type)&&Ss(),ve(t),null;case 3:return s=t.stateNode,Rn(),Q(_e),Q(ge),ki(),s.pendingContext&&(s.context=s.pendingContext,s.pendingContext=null),(e===null||e.child===null)&&(Jr(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,Ye!==null&&(Wa(Ye),Ye=null))),La(e,t),ve(t),null;case 5:Ni(t);var l=Xt(Sr.current);if(n=t.type,e!==null&&t.stateNode!=null)xd(e,t,n,s,l),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!s){if(t.stateNode===null)throw Error(S(166));return ve(t),null}if(e=Xt(nt.current),Jr(t)){s=t.stateNode,n=t.type;var a=t.memoizedProps;switch(s[et]=t,s[Nr]=a,e=(t.mode&1)!==0,n){case"dialog":b("cancel",s),b("close",s);break;case"iframe":case"object":case"embed":b("load",s);break;case"video":case"audio":for(l=0;l<nr.length;l++)b(nr[l],s);break;case"source":b("error",s);break;case"img":case"image":case"link":b("error",s),b("load",s);break;case"details":b("toggle",s);break;case"input":lo(s,a),b("invalid",s);break;case"select":s._wrapperState={wasMultiple:!!a.multiple},b("invalid",s);break;case"textarea":io(s,a),b("invalid",s)}la(n,a),l=null;for(var i in a)if(a.hasOwnProperty(i)){var o=a[i];i==="children"?typeof o=="string"?s.textContent!==o&&(a.suppressHydrationWarning!==!0&&Xr(s.textContent,o,e),l=["children",o]):typeof o=="number"&&s.textContent!==""+o&&(a.suppressHydrationWarning!==!0&&Xr(s.textContent,o,e),l=["children",""+o]):hr.hasOwnProperty(i)&&o!=null&&i==="onScroll"&&b("scroll",s)}switch(n){case"input":Br(s),ao(s,a,!0);break;case"textarea":Br(s),oo(s);break;case"select":case"option":break;default:typeof a.onClick=="function"&&(s.onclick=ks)}s=l,t.updateQueue=s,s!==null&&(t.flags|=4)}else{i=l.nodeType===9?l:l.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=Qc(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=i.createElement("div"),e.innerHTML="<script><\\/script>",e=e.removeChild(e.firstChild)):typeof s.is=="string"?e=i.createElement(n,{is:s.is}):(e=i.createElement(n),n==="select"&&(i=e,s.multiple?i.multiple=!0:s.size&&(i.size=s.size))):e=i.createElementNS(e,n),e[et]=t,e[Nr]=s,vd(e,t,!1,!1),t.stateNode=e;e:{switch(i=aa(n,s),n){case"dialog":b("cancel",e),b("close",e),l=s;break;case"iframe":case"object":case"embed":b("load",e),l=s;break;case"video":case"audio":for(l=0;l<nr.length;l++)b(nr[l],e);l=s;break;case"source":b("error",e),l=s;break;case"img":case"image":case"link":b("error",e),b("load",e),l=s;break;case"details":b("toggle",e),l=s;break;case"input":lo(e,s),l=ea(e,s),b("invalid",e);break;case"option":l=s;break;case"select":e._wrapperState={wasMultiple:!!s.multiple},l=Z({},s,{value:void 0}),b("invalid",e);break;case"textarea":io(e,s),l=ra(e,s),b("invalid",e);break;default:l=s}la(n,l),o=l;for(a in o)if(o.hasOwnProperty(a)){var c=o[a];a==="style"?Gc(e,c):a==="dangerouslySetInnerHTML"?(c=c?c.__html:void 0,c!=null&&Yc(e,c)):a==="children"?typeof c=="string"?(n!=="textarea"||c!=="")&&fr(e,c):typeof c=="number"&&fr(e,""+c):a!=="suppressContentEditableWarning"&&a!=="suppressHydrationWarning"&&a!=="autoFocus"&&(hr.hasOwnProperty(a)?c!=null&&a==="onScroll"&&b("scroll",e):c!=null&&qa(e,a,c,i))}switch(n){case"input":Br(e),ao(e,s,!1);break;case"textarea":Br(e),oo(e);break;case"option":s.value!=null&&e.setAttribute("value",""+Dt(s.value));break;case"select":e.multiple=!!s.multiple,a=s.value,a!=null?kn(e,!!s.multiple,a,!1):s.defaultValue!=null&&kn(e,!!s.multiple,s.defaultValue,!0);break;default:typeof l.onClick=="function"&&(e.onclick=ks)}switch(n){case"button":case"input":case"select":case"textarea":s=!!s.autoFocus;break e;case"img":s=!0;break e;default:s=!1}}s&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return ve(t),null;case 6:if(e&&t.stateNode!=null)gd(e,t,e.memoizedProps,s);else{if(typeof s!="string"&&t.stateNode===null)throw Error(S(166));if(n=Xt(Sr.current),Xt(nt.current),Jr(t)){if(s=t.stateNode,n=t.memoizedProps,s[et]=t,(a=s.nodeValue!==n)&&(e=Le,e!==null))switch(e.tag){case 3:Xr(s.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&Xr(s.nodeValue,n,(e.mode&1)!==0)}a&&(t.flags|=4)}else s=(n.nodeType===9?n:n.ownerDocument).createTextNode(s),s[et]=t,t.stateNode=s}return ve(t),null;case 13:if(Q(G),s=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Y&&ze!==null&&t.mode&1&&!(t.flags&128))Ou(),zn(),t.flags|=98560,a=!1;else if(a=Jr(t),s!==null&&s.dehydrated!==null){if(e===null){if(!a)throw Error(S(318));if(a=t.memoizedState,a=a!==null?a.dehydrated:null,!a)throw Error(S(317));a[et]=t}else zn(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;ve(t),a=!1}else Ye!==null&&(Wa(Ye),Ye=null),a=!0;if(!a)return t.flags&65536?t:null}return t.flags&128?(t.lanes=n,t):(s=s!==null,s!==(e!==null&&e.memoizedState!==null)&&s&&(t.child.flags|=8192,t.mode&1&&(e===null||G.current&1?ie===0&&(ie=3):Di())),t.updateQueue!==null&&(t.flags|=4),ve(t),null);case 4:return Rn(),La(e,t),e===null&&jr(t.stateNode.containerInfo),ve(t),null;case 10:return gi(t.type._context),ve(t),null;case 17:return Pe(t.type)&&Ss(),ve(t),null;case 19:if(Q(G),a=t.memoizedState,a===null)return ve(t),null;if(s=(t.flags&128)!==0,i=a.rendering,i===null)if(s)Jn(a,!1);else{if(ie!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(i=zs(e),i!==null){for(t.flags|=128,Jn(a,!1),s=i.updateQueue,s!==null&&(t.updateQueue=s,t.flags|=4),t.subtreeFlags=0,s=n,n=t.child;n!==null;)a=n,e=s,a.flags&=14680066,i=a.alternate,i===null?(a.childLanes=0,a.lanes=e,a.child=null,a.subtreeFlags=0,a.memoizedProps=null,a.memoizedState=null,a.updateQueue=null,a.dependencies=null,a.stateNode=null):(a.childLanes=i.childLanes,a.lanes=i.lanes,a.child=i.child,a.subtreeFlags=0,a.deletions=null,a.memoizedProps=i.memoizedProps,a.memoizedState=i.memoizedState,a.updateQueue=i.updateQueue,a.type=i.type,e=i.dependencies,a.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return H(G,G.current&1|2),t.child}e=e.sibling}a.tail!==null&&se()>Dn&&(t.flags|=128,s=!0,Jn(a,!1),t.lanes=4194304)}else{if(!s)if(e=zs(i),e!==null){if(t.flags|=128,s=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),Jn(a,!0),a.tail===null&&a.tailMode==="hidden"&&!i.alternate&&!Y)return ve(t),null}else 2*se()-a.renderingStartTime>Dn&&n!==1073741824&&(t.flags|=128,s=!0,Jn(a,!1),t.lanes=4194304);a.isBackwards?(i.sibling=t.child,t.child=i):(n=a.last,n!==null?n.sibling=i:t.child=i,a.last=i)}return a.tail!==null?(t=a.tail,a.rendering=t,a.tail=t.sibling,a.renderingStartTime=se(),t.sibling=null,n=G.current,H(G,s?n&1|2:n&1),t):(ve(t),null);case 22:case 23:return Ii(),s=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==s&&(t.flags|=8192),s&&t.mode&1?Me&1073741824&&(ve(t),t.subtreeFlags&6&&(t.flags|=8192)):ve(t),null;case 24:return null;case 25:return null}throw Error(S(156,t.tag))}function xp(e,t){switch(pi(t),t.tag){case 1:return Pe(t.type)&&Ss(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Rn(),Q(_e),Q(ge),ki(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return Ni(t),null;case 13:if(Q(G),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(S(340));zn()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return Q(G),null;case 4:return Rn(),null;case 10:return gi(t.type._context),null;case 22:case 23:return Ii(),null;case 24:return null;default:return null}}var es=!1,xe=!1,gp=typeof WeakSet=="function"?WeakSet:Set,P=null;function wn(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(s){ee(e,t,s)}else n.current=null}function Ra(e,t,n){try{n()}catch(s){ee(e,t,s)}}var Zo=!1;function yp(e,t){if(va=js,e=ku(),hi(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var s=n.getSelection&&n.getSelection();if(s&&s.rangeCount!==0){n=s.anchorNode;var l=s.anchorOffset,a=s.focusNode;s=s.focusOffset;try{n.nodeType,a.nodeType}catch{n=null;break e}var i=0,o=-1,c=-1,d=0,f=0,p=e,g=null;t:for(;;){for(var y;p!==n||l!==0&&p.nodeType!==3||(o=i+l),p!==a||s!==0&&p.nodeType!==3||(c=i+s),p.nodeType===3&&(i+=p.nodeValue.length),(y=p.firstChild)!==null;)g=p,p=y;for(;;){if(p===e)break t;if(g===n&&++d===l&&(o=i),g===a&&++f===s&&(c=i),(y=p.nextSibling)!==null)break;p=g,g=p.parentNode}p=y}n=o===-1||c===-1?null:{start:o,end:c}}else n=null}n=n||{start:0,end:0}}else n=null;for(xa={focusedElem:e,selectionRange:n},js=!1,P=t;P!==null;)if(t=P,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,P=e;else for(;P!==null;){t=P;try{var j=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(j!==null){var w=j.memoizedProps,N=j.memoizedState,h=t.stateNode,u=h.getSnapshotBeforeUpdate(t.elementType===t.type?w:be(t.type,w),N);h.__reactInternalSnapshotBeforeUpdate=u}break;case 3:var m=t.stateNode.containerInfo;m.nodeType===1?m.textContent="":m.nodeType===9&&m.documentElement&&m.removeChild(m.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(S(163))}}catch(v){ee(t,t.return,v)}if(e=t.sibling,e!==null){e.return=t.return,P=e;break}P=t.return}return j=Zo,Zo=!1,j}function cr(e,t,n){var s=t.updateQueue;if(s=s!==null?s.lastEffect:null,s!==null){var l=s=s.next;do{if((l.tag&e)===e){var a=l.destroy;l.destroy=void 0,a!==void 0&&Ra(t,n,a)}l=l.next}while(l!==s)}}function nl(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var s=n.create;n.destroy=s()}n=n.next}while(n!==t)}}function Ia(e){var t=e.ref;if(t!==null){var n=e.stateNode;switch(e.tag){case 5:e=n;break;default:e=n}typeof t=="function"?t(e):t.current=e}}function yd(e){var t=e.alternate;t!==null&&(e.alternate=null,yd(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[et],delete t[Nr],delete t[ja],delete t[tp],delete t[np])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function jd(e){return e.tag===5||e.tag===3||e.tag===4}function qo(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||jd(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Da(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=ks));else if(s!==4&&(e=e.child,e!==null))for(Da(e,t,n),e=e.sibling;e!==null;)Da(e,t,n),e=e.sibling}function Oa(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(s!==4&&(e=e.child,e!==null))for(Oa(e,t,n),e=e.sibling;e!==null;)Oa(e,t,n),e=e.sibling}var de=null,Qe=!1;function gt(e,t,n){for(n=n.child;n!==null;)wd(e,t,n),n=n.sibling}function wd(e,t,n){if(tt&&typeof tt.onCommitFiberUnmount=="function")try{tt.onCommitFiberUnmount(Ks,n)}catch{}switch(n.tag){case 5:xe||wn(n,t);case 6:var s=de,l=Qe;de=null,gt(e,t,n),de=s,Qe=l,de!==null&&(Qe?(e=de,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):de.removeChild(n.stateNode));break;case 18:de!==null&&(Qe?(e=de,n=n.stateNode,e.nodeType===8?Fl(e.parentNode,n):e.nodeType===1&&Fl(e,n),xr(e)):Fl(de,n.stateNode));break;case 4:s=de,l=Qe,de=n.stateNode.containerInfo,Qe=!0,gt(e,t,n),de=s,Qe=l;break;case 0:case 11:case 14:case 15:if(!xe&&(s=n.updateQueue,s!==null&&(s=s.lastEffect,s!==null))){l=s=s.next;do{var a=l,i=a.destroy;a=a.tag,i!==void 0&&(a&2||a&4)&&Ra(n,t,i),l=l.next}while(l!==s)}gt(e,t,n);break;case 1:if(!xe&&(wn(n,t),s=n.stateNode,typeof s.componentWillUnmount=="function"))try{s.props=n.memoizedProps,s.state=n.memoizedState,s.componentWillUnmount()}catch(o){ee(n,t,o)}gt(e,t,n);break;case 21:gt(e,t,n);break;case 22:n.mode&1?(xe=(s=xe)||n.memoizedState!==null,gt(e,t,n),xe=s):gt(e,t,n);break;default:gt(e,t,n)}}function ec(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new gp),t.forEach(function(s){var l=Pp.bind(null,e,s);n.has(s)||(n.add(s),s.then(l,l))})}}function He(e,t){var n=t.deletions;if(n!==null)for(var s=0;s<n.length;s++){var l=n[s];try{var a=e,i=t,o=i;e:for(;o!==null;){switch(o.tag){case 5:de=o.stateNode,Qe=!1;break e;case 3:de=o.stateNode.containerInfo,Qe=!0;break e;case 4:de=o.stateNode.containerInfo,Qe=!0;break e}o=o.return}if(de===null)throw Error(S(160));wd(a,i,l),de=null,Qe=!1;var c=l.alternate;c!==null&&(c.return=null),l.return=null}catch(d){ee(l,t,d)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Nd(t,e),t=t.sibling}function Nd(e,t){var n=e.alternate,s=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(He(t,e),Ze(e),s&4){try{cr(3,e,e.return),nl(3,e)}catch(w){ee(e,e.return,w)}try{cr(5,e,e.return)}catch(w){ee(e,e.return,w)}}break;case 1:He(t,e),Ze(e),s&512&&n!==null&&wn(n,n.return);break;case 5:if(He(t,e),Ze(e),s&512&&n!==null&&wn(n,n.return),e.flags&32){var l=e.stateNode;try{fr(l,"")}catch(w){ee(e,e.return,w)}}if(s&4&&(l=e.stateNode,l!=null)){var a=e.memoizedProps,i=n!==null?n.memoizedProps:a,o=e.type,c=e.updateQueue;if(e.updateQueue=null,c!==null)try{o==="input"&&a.type==="radio"&&a.name!=null&&Hc(l,a),aa(o,i);var d=aa(o,a);for(i=0;i<c.length;i+=2){var f=c[i],p=c[i+1];f==="style"?Gc(l,p):f==="dangerouslySetInnerHTML"?Yc(l,p):f==="children"?fr(l,p):qa(l,f,p,d)}switch(o){case"input":ta(l,a);break;case"textarea":bc(l,a);break;case"select":var g=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!a.multiple;var y=a.value;y!=null?kn(l,!!a.multiple,y,!1):g!==!!a.multiple&&(a.defaultValue!=null?kn(l,!!a.multiple,a.defaultValue,!0):kn(l,!!a.multiple,a.multiple?[]:"",!1))}l[Nr]=a}catch(w){ee(e,e.return,w)}}break;case 6:if(He(t,e),Ze(e),s&4){if(e.stateNode===null)throw Error(S(162));l=e.stateNode,a=e.memoizedProps;try{l.nodeValue=a}catch(w){ee(e,e.return,w)}}break;case 3:if(He(t,e),Ze(e),s&4&&n!==null&&n.memoizedState.isDehydrated)try{xr(t.containerInfo)}catch(w){ee(e,e.return,w)}break;case 4:He(t,e),Ze(e);break;case 13:He(t,e),Ze(e),l=e.child,l.flags&8192&&(a=l.memoizedState!==null,l.stateNode.isHidden=a,!a||l.alternate!==null&&l.alternate.memoizedState!==null||(Li=se())),s&4&&ec(e);break;case 22:if(f=n!==null&&n.memoizedState!==null,e.mode&1?(xe=(d=xe)||f,He(t,e),xe=d):He(t,e),Ze(e),s&8192){if(d=e.memoizedState!==null,(e.stateNode.isHidden=d)&&!f&&e.mode&1)for(P=e,f=e.child;f!==null;){for(p=P=f;P!==null;){switch(g=P,y=g.child,g.tag){case 0:case 11:case 14:case 15:cr(4,g,g.return);break;case 1:wn(g,g.return);var j=g.stateNode;if(typeof j.componentWillUnmount=="function"){s=g,n=g.return;try{t=s,j.props=t.memoizedProps,j.state=t.memoizedState,j.componentWillUnmount()}catch(w){ee(s,n,w)}}break;case 5:wn(g,g.return);break;case 22:if(g.memoizedState!==null){nc(p);continue}}y!==null?(y.return=g,P=y):nc(p)}f=f.sibling}e:for(f=null,p=e;;){if(p.tag===5){if(f===null){f=p;try{l=p.stateNode,d?(a=l.style,typeof a.setProperty=="function"?a.setProperty("display","none","important"):a.display="none"):(o=p.stateNode,c=p.memoizedProps.style,i=c!=null&&c.hasOwnProperty("display")?c.display:null,o.style.display=Kc("display",i))}catch(w){ee(e,e.return,w)}}}else if(p.tag===6){if(f===null)try{p.stateNode.nodeValue=d?"":p.memoizedProps}catch(w){ee(e,e.return,w)}}else if((p.tag!==22&&p.tag!==23||p.memoizedState===null||p===e)&&p.child!==null){p.child.return=p,p=p.child;continue}if(p===e)break e;for(;p.sibling===null;){if(p.return===null||p.return===e)break e;f===p&&(f=null),p=p.return}f===p&&(f=null),p.sibling.return=p.return,p=p.sibling}}break;case 19:He(t,e),Ze(e),s&4&&ec(e);break;case 21:break;default:He(t,e),Ze(e)}}function Ze(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(jd(n)){var s=n;break e}n=n.return}throw Error(S(160))}switch(s.tag){case 5:var l=s.stateNode;s.flags&32&&(fr(l,""),s.flags&=-33);var a=qo(e);Oa(e,a,l);break;case 3:case 4:var i=s.stateNode.containerInfo,o=qo(e);Da(e,o,i);break;default:throw Error(S(161))}}catch(c){ee(e,e.return,c)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function jp(e,t,n){P=e,kd(e)}function kd(e,t,n){for(var s=(e.mode&1)!==0;P!==null;){var l=P,a=l.child;if(l.tag===22&&s){var i=l.memoizedState!==null||es;if(!i){var o=l.alternate,c=o!==null&&o.memoizedState!==null||xe;o=es;var d=xe;if(es=i,(xe=c)&&!d)for(P=l;P!==null;)i=P,c=i.child,i.tag===22&&i.memoizedState!==null?rc(l):c!==null?(c.return=i,P=c):rc(l);for(;a!==null;)P=a,kd(a),a=a.sibling;P=l,es=o,xe=d}tc(e)}else l.subtreeFlags&8772&&a!==null?(a.return=l,P=a):tc(e)}}function tc(e){for(;P!==null;){var t=P;if(t.flags&8772){var n=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:xe||nl(5,t);break;case 1:var s=t.stateNode;if(t.flags&4&&!xe)if(n===null)s.componentDidMount();else{var l=t.elementType===t.type?n.memoizedProps:be(t.type,n.memoizedProps);s.componentDidUpdate(l,n.memoizedState,s.__reactInternalSnapshotBeforeUpdate)}var a=t.updateQueue;a!==null&&$o(t,a,s);break;case 3:var i=t.updateQueue;if(i!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}$o(t,i,n)}break;case 5:var o=t.stateNode;if(n===null&&t.flags&4){n=o;var c=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":c.autoFocus&&n.focus();break;case"img":c.src&&(n.src=c.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var d=t.alternate;if(d!==null){var f=d.memoizedState;if(f!==null){var p=f.dehydrated;p!==null&&xr(p)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(S(163))}xe||t.flags&512&&Ia(t)}catch(g){ee(t,t.return,g)}}if(t===e){P=null;break}if(n=t.sibling,n!==null){n.return=t.return,P=n;break}P=t.return}}function nc(e){for(;P!==null;){var t=P;if(t===e){P=null;break}var n=t.sibling;if(n!==null){n.return=t.return,P=n;break}P=t.return}}function rc(e){for(;P!==null;){var t=P;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{nl(4,t)}catch(c){ee(t,n,c)}break;case 1:var s=t.stateNode;if(typeof s.componentDidMount=="function"){var l=t.return;try{s.componentDidMount()}catch(c){ee(t,l,c)}}var a=t.return;try{Ia(t)}catch(c){ee(t,a,c)}break;case 5:var i=t.return;try{Ia(t)}catch(c){ee(t,i,c)}}}catch(c){ee(t,t.return,c)}if(t===e){P=null;break}var o=t.sibling;if(o!==null){o.return=t.return,P=o;break}P=t.return}}var wp=Math.ceil,Is=mt.ReactCurrentDispatcher,Mi=mt.ReactCurrentOwner,Ue=mt.ReactCurrentBatchConfig,F=0,ue=null,le=null,he=0,Me=0,Nn=Ut(0),ie=0,Pr=null,rn=0,rl=0,zi=0,ur=null,Ce=null,Li=0,Dn=1/0,at=null,Ds=!1,Aa=null,zt=null,ts=!1,St=null,Os=0,dr=0,Fa=null,hs=-1,fs=0;function je(){return F&6?se():hs!==-1?hs:hs=se()}function Lt(e){return e.mode&1?F&2&&he!==0?he&-he:sp.transition!==null?(fs===0&&(fs=iu()),fs):(e=U,e!==0||(e=window.event,e=e===void 0?16:pu(e.type)),e):1}function Ge(e,t,n,s){if(50<dr)throw dr=0,Fa=null,Error(S(185));Rr(e,n,s),(!(F&2)||e!==ue)&&(e===ue&&(!(F&2)&&(rl|=n),ie===4&&Nt(e,he)),Te(e,s),n===1&&F===0&&!(t.mode&1)&&(Dn=se()+500,qs&&Bt()))}function Te(e,t){var n=e.callbackNode;rf(e,t);var s=ys(e,e===ue?he:0);if(s===0)n!==null&&ho(n),e.callbackNode=null,e.callbackPriority=0;else if(t=s&-s,e.callbackPriority!==t){if(n!=null&&ho(n),t===1)e.tag===0?rp(sc.bind(null,e)):Ru(sc.bind(null,e)),qf(function(){!(F&6)&&Bt()}),n=null;else{switch(ou(s)){case 1:n=si;break;case 4:n=lu;break;case 16:n=gs;break;case 536870912:n=au;break;default:n=gs}n=zd(n,Sd.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function Sd(e,t){if(hs=-1,fs=0,F&6)throw Error(S(327));var n=e.callbackNode;if(Pn()&&e.callbackNode!==n)return null;var s=ys(e,e===ue?he:0);if(s===0)return null;if(s&30||s&e.expiredLanes||t)t=As(e,s);else{t=s;var l=F;F|=2;var a=Ed();(ue!==e||he!==t)&&(at=null,Dn=se()+500,Jt(e,t));do try{Sp();break}catch(o){Cd(e,o)}while(!0);xi(),Is.current=a,F=l,le!==null?t=0:(ue=null,he=0,t=ie)}if(t!==0){if(t===2&&(l=da(e),l!==0&&(s=l,t=$a(e,l))),t===1)throw n=Pr,Jt(e,0),Nt(e,s),Te(e,se()),n;if(t===6)Nt(e,s);else{if(l=e.current.alternate,!(s&30)&&!Np(l)&&(t=As(e,s),t===2&&(a=da(e),a!==0&&(s=a,t=$a(e,a))),t===1))throw n=Pr,Jt(e,0),Nt(e,s),Te(e,se()),n;switch(e.finishedWork=l,e.finishedLanes=s,t){case 0:case 1:throw Error(S(345));case 2:Yt(e,Ce,at);break;case 3:if(Nt(e,s),(s&130023424)===s&&(t=Li+500-se(),10<t)){if(ys(e,0)!==0)break;if(l=e.suspendedLanes,(l&s)!==s){je(),e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=ya(Yt.bind(null,e,Ce,at),t);break}Yt(e,Ce,at);break;case 4:if(Nt(e,s),(s&4194240)===s)break;for(t=e.eventTimes,l=-1;0<s;){var i=31-Ke(s);a=1<<i,i=t[i],i>l&&(l=i),s&=~a}if(s=l,s=se()-s,s=(120>s?120:480>s?480:1080>s?1080:1920>s?1920:3e3>s?3e3:4320>s?4320:1960*wp(s/1960))-s,10<s){e.timeoutHandle=ya(Yt.bind(null,e,Ce,at),s);break}Yt(e,Ce,at);break;case 5:Yt(e,Ce,at);break;default:throw Error(S(329))}}}return Te(e,se()),e.callbackNode===n?Sd.bind(null,e):null}function $a(e,t){var n=ur;return e.current.memoizedState.isDehydrated&&(Jt(e,t).flags|=256),e=As(e,t),e!==2&&(t=Ce,Ce=n,t!==null&&Wa(t)),e}function Wa(e){Ce===null?Ce=e:Ce.push.apply(Ce,e)}function Np(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var s=0;s<n.length;s++){var l=n[s],a=l.getSnapshot;l=l.value;try{if(!Xe(a(),l))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function Nt(e,t){for(t&=~zi,t&=~rl,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Ke(t),s=1<<n;e[n]=-1,t&=~s}}function sc(e){if(F&6)throw Error(S(327));Pn();var t=ys(e,0);if(!(t&1))return Te(e,se()),null;var n=As(e,t);if(e.tag!==0&&n===2){var s=da(e);s!==0&&(t=s,n=$a(e,s))}if(n===1)throw n=Pr,Jt(e,0),Nt(e,t),Te(e,se()),n;if(n===6)throw Error(S(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,Yt(e,Ce,at),Te(e,se()),null}function Ri(e,t){var n=F;F|=1;try{return e(t)}finally{F=n,F===0&&(Dn=se()+500,qs&&Bt())}}function sn(e){St!==null&&St.tag===0&&!(F&6)&&Pn();var t=F;F|=1;var n=Ue.transition,s=U;try{if(Ue.transition=null,U=1,e)return e()}finally{U=s,Ue.transition=n,F=t,!(F&6)&&Bt()}}function Ii(){Me=Nn.current,Q(Nn)}function Jt(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,Zf(n)),le!==null)for(n=le.return;n!==null;){var s=n;switch(pi(s),s.tag){case 1:s=s.type.childContextTypes,s!=null&&Ss();break;case 3:Rn(),Q(_e),Q(ge),ki();break;case 5:Ni(s);break;case 4:Rn();break;case 13:Q(G);break;case 19:Q(G);break;case 10:gi(s.type._context);break;case 22:case 23:Ii()}n=n.return}if(ue=e,le=e=Rt(e.current,null),he=Me=t,ie=0,Pr=null,zi=rl=rn=0,Ce=ur=null,Gt!==null){for(t=0;t<Gt.length;t++)if(n=Gt[t],s=n.interleaved,s!==null){n.interleaved=null;var l=s.next,a=n.pending;if(a!==null){var i=a.next;a.next=l,s.next=i}n.pending=s}Gt=null}return e}function Cd(e,t){do{var n=le;try{if(xi(),cs.current=Rs,Ls){for(var s=X.memoizedState;s!==null;){var l=s.queue;l!==null&&(l.pending=null),s=s.next}Ls=!1}if(nn=0,ce=ae=X=null,or=!1,Cr=0,Mi.current=null,n===null||n.return===null){ie=1,Pr=t,le=null;break}e:{var a=e,i=n.return,o=n,c=t;if(t=he,o.flags|=32768,c!==null&&typeof c=="object"&&typeof c.then=="function"){var d=c,f=o,p=f.tag;if(!(f.mode&1)&&(p===0||p===11||p===15)){var g=f.alternate;g?(f.updateQueue=g.updateQueue,f.memoizedState=g.memoizedState,f.lanes=g.lanes):(f.updateQueue=null,f.memoizedState=null)}var y=bo(i);if(y!==null){y.flags&=-257,Qo(y,i,o,a,t),y.mode&1&&Ho(a,d,t),t=y,c=d;var j=t.updateQueue;if(j===null){var w=new Set;w.add(c),t.updateQueue=w}else j.add(c);break e}else{if(!(t&1)){Ho(a,d,t),Di();break e}c=Error(S(426))}}else if(Y&&o.mode&1){var N=bo(i);if(N!==null){!(N.flags&65536)&&(N.flags|=256),Qo(N,i,o,a,t),mi(In(c,o));break e}}a=c=In(c,o),ie!==4&&(ie=2),ur===null?ur=[a]:ur.push(a),a=i;do{switch(a.tag){case 3:a.flags|=65536,t&=-t,a.lanes|=t;var h=od(a,c,t);Fo(a,h);break e;case 1:o=c;var u=a.type,m=a.stateNode;if(!(a.flags&128)&&(typeof u.getDerivedStateFromError=="function"||m!==null&&typeof m.componentDidCatch=="function"&&(zt===null||!zt.has(m)))){a.flags|=65536,t&=-t,a.lanes|=t;var v=cd(a,o,t);Fo(a,v);break e}}a=a.return}while(a!==null)}Pd(n)}catch(k){t=k,le===n&&n!==null&&(le=n=n.return);continue}break}while(!0)}function Ed(){var e=Is.current;return Is.current=Rs,e===null?Rs:e}function Di(){(ie===0||ie===3||ie===2)&&(ie=4),ue===null||!(rn&268435455)&&!(rl&268435455)||Nt(ue,he)}function As(e,t){var n=F;F|=2;var s=Ed();(ue!==e||he!==t)&&(at=null,Jt(e,t));do try{kp();break}catch(l){Cd(e,l)}while(!0);if(xi(),F=n,Is.current=s,le!==null)throw Error(S(261));return ue=null,he=0,ie}function kp(){for(;le!==null;)_d(le)}function Sp(){for(;le!==null&&!Kh();)_d(le)}function _d(e){var t=Md(e.alternate,e,Me);e.memoizedProps=e.pendingProps,t===null?Pd(e):le=t,Mi.current=null}function Pd(e){var t=e;do{var n=t.alternate;if(e=t.return,t.flags&32768){if(n=xp(n,t),n!==null){n.flags&=32767,le=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{ie=6,le=null;return}}else if(n=vp(n,t,Me),n!==null){le=n;return}if(t=t.sibling,t!==null){le=t;return}le=t=e}while(t!==null);ie===0&&(ie=5)}function Yt(e,t,n){var s=U,l=Ue.transition;try{Ue.transition=null,U=1,Cp(e,t,n,s)}finally{Ue.transition=l,U=s}return null}function Cp(e,t,n,s){do Pn();while(St!==null);if(F&6)throw Error(S(327));n=e.finishedWork;var l=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(S(177));e.callbackNode=null,e.callbackPriority=0;var a=n.lanes|n.childLanes;if(sf(e,a),e===ue&&(le=ue=null,he=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||ts||(ts=!0,zd(gs,function(){return Pn(),null})),a=(n.flags&15990)!==0,n.subtreeFlags&15990||a){a=Ue.transition,Ue.transition=null;var i=U;U=1;var o=F;F|=4,Mi.current=null,yp(e,n),Nd(n,e),bf(xa),js=!!va,xa=va=null,e.current=n,jp(n),Gh(),F=o,U=i,Ue.transition=a}else e.current=n;if(ts&&(ts=!1,St=e,Os=l),a=e.pendingLanes,a===0&&(zt=null),Zh(n.stateNode),Te(e,se()),t!==null)for(s=e.onRecoverableError,n=0;n<t.length;n++)l=t[n],s(l.value,{componentStack:l.stack,digest:l.digest});if(Ds)throw Ds=!1,e=Aa,Aa=null,e;return Os&1&&e.tag!==0&&Pn(),a=e.pendingLanes,a&1?e===Fa?dr++:(dr=0,Fa=e):dr=0,Bt(),null}function Pn(){if(St!==null){var e=ou(Os),t=Ue.transition,n=U;try{if(Ue.transition=null,U=16>e?16:e,St===null)var s=!1;else{if(e=St,St=null,Os=0,F&6)throw Error(S(331));var l=F;for(F|=4,P=e.current;P!==null;){var a=P,i=a.child;if(P.flags&16){var o=a.deletions;if(o!==null){for(var c=0;c<o.length;c++){var d=o[c];for(P=d;P!==null;){var f=P;switch(f.tag){case 0:case 11:case 15:cr(8,f,a)}var p=f.child;if(p!==null)p.return=f,P=p;else for(;P!==null;){f=P;var g=f.sibling,y=f.return;if(yd(f),f===d){P=null;break}if(g!==null){g.return=y,P=g;break}P=y}}}var j=a.alternate;if(j!==null){var w=j.child;if(w!==null){j.child=null;do{var N=w.sibling;w.sibling=null,w=N}while(w!==null)}}P=a}}if(a.subtreeFlags&2064&&i!==null)i.return=a,P=i;else e:for(;P!==null;){if(a=P,a.flags&2048)switch(a.tag){case 0:case 11:case 15:cr(9,a,a.return)}var h=a.sibling;if(h!==null){h.return=a.return,P=h;break e}P=a.return}}var u=e.current;for(P=u;P!==null;){i=P;var m=i.child;if(i.subtreeFlags&2064&&m!==null)m.return=i,P=m;else e:for(i=u;P!==null;){if(o=P,o.flags&2048)try{switch(o.tag){case 0:case 11:case 15:nl(9,o)}}catch(k){ee(o,o.return,k)}if(o===i){P=null;break e}var v=o.sibling;if(v!==null){v.return=o.return,P=v;break e}P=o.return}}if(F=l,Bt(),tt&&typeof tt.onPostCommitFiberRoot=="function")try{tt.onPostCommitFiberRoot(Ks,e)}catch{}s=!0}return s}finally{U=n,Ue.transition=t}}return!1}function lc(e,t,n){t=In(n,t),t=od(e,t,1),e=Mt(e,t,1),t=je(),e!==null&&(Rr(e,1,t),Te(e,t))}function ee(e,t,n){if(e.tag===3)lc(e,e,n);else for(;t!==null;){if(t.tag===3){lc(t,e,n);break}else if(t.tag===1){var s=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof s.componentDidCatch=="function"&&(zt===null||!zt.has(s))){e=In(n,e),e=cd(t,e,1),t=Mt(t,e,1),e=je(),t!==null&&(Rr(t,1,e),Te(t,e));break}}t=t.return}}function Ep(e,t,n){var s=e.pingCache;s!==null&&s.delete(t),t=je(),e.pingedLanes|=e.suspendedLanes&n,ue===e&&(he&n)===n&&(ie===4||ie===3&&(he&130023424)===he&&500>se()-Li?Jt(e,0):zi|=n),Te(e,t)}function Td(e,t){t===0&&(e.mode&1?(t=br,br<<=1,!(br&130023424)&&(br=4194304)):t=1);var n=je();e=ft(e,t),e!==null&&(Rr(e,t,n),Te(e,n))}function _p(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Td(e,n)}function Pp(e,t){var n=0;switch(e.tag){case 13:var s=e.stateNode,l=e.memoizedState;l!==null&&(n=l.retryLane);break;case 19:s=e.stateNode;break;default:throw Error(S(314))}s!==null&&s.delete(t),Td(e,n)}var Md;Md=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||_e.current)Ee=!0;else{if(!(e.lanes&n)&&!(t.flags&128))return Ee=!1,mp(e,t,n);Ee=!!(e.flags&131072)}else Ee=!1,Y&&t.flags&1048576&&Iu(t,_s,t.index);switch(t.lanes=0,t.tag){case 2:var s=t.type;ds(e,t),e=t.pendingProps;var l=Mn(t,ge.current);_n(t,n),l=Ci(null,t,s,e,l,n);var a=Ei();return t.flags|=1,typeof l=="object"&&l!==null&&typeof l.render=="function"&&l.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Pe(s)?(a=!0,Cs(t)):a=!1,t.memoizedState=l.state!==null&&l.state!==void 0?l.state:null,ji(t),l.updater=tl,t.stateNode=l,l._reactInternals=t,Ea(t,s,e,n),t=Ta(null,t,s,!0,a,n)):(t.tag=0,Y&&a&&fi(t),ye(null,t,l,n),t=t.child),t;case 16:s=t.elementType;e:{switch(ds(e,t),e=t.pendingProps,l=s._init,s=l(s._payload),t.type=s,l=t.tag=Mp(s),e=be(s,e),l){case 0:t=Pa(null,t,s,e,n);break e;case 1:t=Go(null,t,s,e,n);break e;case 11:t=Yo(null,t,s,e,n);break e;case 14:t=Ko(null,t,s,be(s.type,e),n);break e}throw Error(S(306,s,""))}return t;case 0:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:be(s,l),Pa(e,t,s,l,n);case 1:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:be(s,l),Go(e,t,s,l,n);case 3:e:{if(fd(t),e===null)throw Error(S(387));s=t.pendingProps,a=t.memoizedState,l=a.element,Wu(e,t),Ms(t,s,null,n);var i=t.memoizedState;if(s=i.element,a.isDehydrated)if(a={element:s,isDehydrated:!1,cache:i.cache,pendingSuspenseBoundaries:i.pendingSuspenseBoundaries,transitions:i.transitions},t.updateQueue.baseState=a,t.memoizedState=a,t.flags&256){l=In(Error(S(423)),t),t=Xo(e,t,s,n,l);break e}else if(s!==l){l=In(Error(S(424)),t),t=Xo(e,t,s,n,l);break e}else for(ze=Tt(t.stateNode.containerInfo.firstChild),Le=t,Y=!0,Ye=null,n=Fu(t,null,s,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(zn(),s===l){t=pt(e,t,n);break e}ye(e,t,s,n)}t=t.child}return t;case 5:return Uu(t),e===null&&ka(t),s=t.type,l=t.pendingProps,a=e!==null?e.memoizedProps:null,i=l.children,ga(s,l)?i=null:a!==null&&ga(s,a)&&(t.flags|=32),hd(e,t),ye(e,t,i,n),t.child;case 6:return e===null&&ka(t),null;case 13:return pd(e,t,n);case 4:return wi(t,t.stateNode.containerInfo),s=t.pendingProps,e===null?t.child=Ln(t,null,s,n):ye(e,t,s,n),t.child;case 11:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:be(s,l),Yo(e,t,s,l,n);case 7:return ye(e,t,t.pendingProps,n),t.child;case 8:return ye(e,t,t.pendingProps.children,n),t.child;case 12:return ye(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(s=t.type._context,l=t.pendingProps,a=t.memoizedProps,i=l.value,H(Ps,s._currentValue),s._currentValue=i,a!==null)if(Xe(a.value,i)){if(a.children===l.children&&!_e.current){t=pt(e,t,n);break e}}else for(a=t.child,a!==null&&(a.return=t);a!==null;){var o=a.dependencies;if(o!==null){i=a.child;for(var c=o.firstContext;c!==null;){if(c.context===s){if(a.tag===1){c=ut(-1,n&-n),c.tag=2;var d=a.updateQueue;if(d!==null){d=d.shared;var f=d.pending;f===null?c.next=c:(c.next=f.next,f.next=c),d.pending=c}}a.lanes|=n,c=a.alternate,c!==null&&(c.lanes|=n),Sa(a.return,n,t),o.lanes|=n;break}c=c.next}}else if(a.tag===10)i=a.type===t.type?null:a.child;else if(a.tag===18){if(i=a.return,i===null)throw Error(S(341));i.lanes|=n,o=i.alternate,o!==null&&(o.lanes|=n),Sa(i,n,t),i=a.sibling}else i=a.child;if(i!==null)i.return=a;else for(i=a;i!==null;){if(i===t){i=null;break}if(a=i.sibling,a!==null){a.return=i.return,i=a;break}i=i.return}a=i}ye(e,t,l.children,n),t=t.child}return t;case 9:return l=t.type,s=t.pendingProps.children,_n(t,n),l=Be(l),s=s(l),t.flags|=1,ye(e,t,s,n),t.child;case 14:return s=t.type,l=be(s,t.pendingProps),l=be(s.type,l),Ko(e,t,s,l,n);case 15:return ud(e,t,t.type,t.pendingProps,n);case 17:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:be(s,l),ds(e,t),t.tag=1,Pe(s)?(e=!0,Cs(t)):e=!1,_n(t,n),id(t,s,l),Ea(t,s,l,n),Ta(null,t,s,!0,e,n);case 19:return md(e,t,n);case 22:return dd(e,t,n)}throw Error(S(156,t.tag))};function zd(e,t){return su(e,t)}function Tp(e,t,n,s){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=s,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function We(e,t,n,s){return new Tp(e,t,n,s)}function Oi(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Mp(e){if(typeof e=="function")return Oi(e)?1:0;if(e!=null){if(e=e.$$typeof,e===ti)return 11;if(e===ni)return 14}return 2}function Rt(e,t){var n=e.alternate;return n===null?(n=We(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function ps(e,t,n,s,l,a){var i=2;if(s=e,typeof e=="function")Oi(e)&&(i=1);else if(typeof e=="string")i=5;else e:switch(e){case hn:return Zt(n.children,l,a,t);case ei:i=8,l|=8;break;case Xl:return e=We(12,n,t,l|2),e.elementType=Xl,e.lanes=a,e;case Jl:return e=We(13,n,t,l),e.elementType=Jl,e.lanes=a,e;case Zl:return e=We(19,n,t,l),e.elementType=Zl,e.lanes=a,e;case Uc:return sl(n,l,a,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case $c:i=10;break e;case Wc:i=9;break e;case ti:i=11;break e;case ni:i=14;break e;case yt:i=16,s=null;break e}throw Error(S(130,e==null?e:typeof e,""))}return t=We(i,n,t,l),t.elementType=e,t.type=s,t.lanes=a,t}function Zt(e,t,n,s){return e=We(7,e,s,t),e.lanes=n,e}function sl(e,t,n,s){return e=We(22,e,s,t),e.elementType=Uc,e.lanes=n,e.stateNode={isHidden:!1},e}function Ql(e,t,n){return e=We(6,e,null,t),e.lanes=n,e}function Yl(e,t,n){return t=We(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function zp(e,t,n,s,l){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=_l(0),this.expirationTimes=_l(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=_l(0),this.identifierPrefix=s,this.onRecoverableError=l,this.mutableSourceEagerHydrationData=null}function Ai(e,t,n,s,l,a,i,o,c){return e=new zp(e,t,n,o,c),t===1?(t=1,a===!0&&(t|=8)):t=0,a=We(3,null,null,t),e.current=a,a.stateNode=e,a.memoizedState={element:s,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},ji(a),e}function Lp(e,t,n){var s=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:dn,key:s==null?null:""+s,children:e,containerInfo:t,implementation:n}}function Ld(e){if(!e)return Ot;e=e._reactInternals;e:{if(on(e)!==e||e.tag!==1)throw Error(S(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Pe(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(S(171))}if(e.tag===1){var n=e.type;if(Pe(n))return Lu(e,n,t)}return t}function Rd(e,t,n,s,l,a,i,o,c){return e=Ai(n,s,!0,e,l,a,i,o,c),e.context=Ld(null),n=e.current,s=je(),l=Lt(n),a=ut(s,l),a.callback=t??null,Mt(n,a,l),e.current.lanes=l,Rr(e,l,s),Te(e,s),e}function ll(e,t,n,s){var l=t.current,a=je(),i=Lt(l);return n=Ld(n),t.context===null?t.context=n:t.pendingContext=n,t=ut(a,i),t.payload={element:e},s=s===void 0?null:s,s!==null&&(t.callback=s),e=Mt(l,t,i),e!==null&&(Ge(e,l,i,a),os(e,l,i)),i}function Fs(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function ac(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function Fi(e,t){ac(e,t),(e=e.alternate)&&ac(e,t)}function Rp(){return null}var Id=typeof reportError=="function"?reportError:function(e){console.error(e)};function $i(e){this._internalRoot=e}al.prototype.render=$i.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(S(409));ll(e,t,null,null)};al.prototype.unmount=$i.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;sn(function(){ll(null,e,null,null)}),t[ht]=null}};function al(e){this._internalRoot=e}al.prototype.unstable_scheduleHydration=function(e){if(e){var t=du();e={blockedOn:null,target:e,priority:t};for(var n=0;n<wt.length&&t!==0&&t<wt[n].priority;n++);wt.splice(n,0,e),n===0&&fu(e)}};function Wi(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function il(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function ic(){}function Ip(e,t,n,s,l){if(l){if(typeof s=="function"){var a=s;s=function(){var d=Fs(i);a.call(d)}}var i=Rd(t,s,e,0,null,!1,!1,"",ic);return e._reactRootContainer=i,e[ht]=i.current,jr(e.nodeType===8?e.parentNode:e),sn(),i}for(;l=e.lastChild;)e.removeChild(l);if(typeof s=="function"){var o=s;s=function(){var d=Fs(c);o.call(d)}}var c=Ai(e,0,!1,null,null,!1,!1,"",ic);return e._reactRootContainer=c,e[ht]=c.current,jr(e.nodeType===8?e.parentNode:e),sn(function(){ll(t,c,n,s)}),c}function ol(e,t,n,s,l){var a=n._reactRootContainer;if(a){var i=a;if(typeof l=="function"){var o=l;l=function(){var c=Fs(i);o.call(c)}}ll(t,i,e,l)}else i=Ip(n,t,e,l,s);return Fs(i)}cu=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=tr(t.pendingLanes);n!==0&&(li(t,n|1),Te(t,se()),!(F&6)&&(Dn=se()+500,Bt()))}break;case 13:sn(function(){var s=ft(e,1);if(s!==null){var l=je();Ge(s,e,1,l)}}),Fi(e,1)}};ai=function(e){if(e.tag===13){var t=ft(e,134217728);if(t!==null){var n=je();Ge(t,e,134217728,n)}Fi(e,134217728)}};uu=function(e){if(e.tag===13){var t=Lt(e),n=ft(e,t);if(n!==null){var s=je();Ge(n,e,t,s)}Fi(e,t)}};du=function(){return U};hu=function(e,t){var n=U;try{return U=e,t()}finally{U=n}};oa=function(e,t,n){switch(t){case"input":if(ta(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+\'][type="radio"]\'),t=0;t<n.length;t++){var s=n[t];if(s!==e&&s.form===e.form){var l=Zs(s);if(!l)throw Error(S(90));Vc(s),ta(s,l)}}}break;case"textarea":bc(e,n);break;case"select":t=n.value,t!=null&&kn(e,!!n.multiple,t,!1)}};Zc=Ri;qc=sn;var Dp={usingClientEntryPoint:!1,Events:[Dr,vn,Zs,Xc,Jc,Ri]},Zn={findFiberByHostInstance:Kt,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Op={bundleType:Zn.bundleType,version:Zn.version,rendererPackageName:Zn.rendererPackageName,rendererConfig:Zn.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:mt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=nu(e),e===null?null:e.stateNode},findFiberByHostInstance:Zn.findFiberByHostInstance||Rp,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ns=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ns.isDisabled&&ns.supportsFiber)try{Ks=ns.inject(Op),tt=ns}catch{}}De.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Dp;De.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Wi(t))throw Error(S(200));return Lp(e,t,null,n)};De.createRoot=function(e,t){if(!Wi(e))throw Error(S(299));var n=!1,s="",l=Id;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(l=t.onRecoverableError)),t=Ai(e,1,!1,null,null,n,!1,s,l),e[ht]=t.current,jr(e.nodeType===8?e.parentNode:e),new $i(t)};De.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(S(188)):(e=Object.keys(e).join(","),Error(S(268,e)));return e=nu(t),e=e===null?null:e.stateNode,e};De.flushSync=function(e){return sn(e)};De.hydrate=function(e,t,n){if(!il(t))throw Error(S(200));return ol(null,e,t,!0,n)};De.hydrateRoot=function(e,t,n){if(!Wi(e))throw Error(S(405));var s=n!=null&&n.hydratedSources||null,l=!1,a="",i=Id;if(n!=null&&(n.unstable_strictMode===!0&&(l=!0),n.identifierPrefix!==void 0&&(a=n.identifierPrefix),n.onRecoverableError!==void 0&&(i=n.onRecoverableError)),t=Rd(t,null,e,1,n??null,l,!1,a,i),e[ht]=t.current,jr(e),s)for(e=0;e<s.length;e++)n=s[e],l=n._getVersion,l=l(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,l]:t.mutableSourceEagerHydrationData.push(n,l);return new al(t)};De.render=function(e,t,n){if(!il(t))throw Error(S(200));return ol(null,e,t,!1,n)};De.unmountComponentAtNode=function(e){if(!il(e))throw Error(S(40));return e._reactRootContainer?(sn(function(){ol(null,null,e,!1,function(){e._reactRootContainer=null,e[ht]=null})}),!0):!1};De.unstable_batchedUpdates=Ri;De.unstable_renderSubtreeIntoContainer=function(e,t,n,s){if(!il(n))throw Error(S(200));if(e==null||e._reactInternals===void 0)throw Error(S(38));return ol(e,t,n,!1,s)};De.version="18.3.1-next-f1338f8080-20240426";function Dd(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Dd)}catch(e){console.error(e)}}Dd(),Dc.exports=De;var Ap=Dc.exports,Od,oc=Ap;Od=oc.createRoot,oc.hydrateRoot;/**\n * @remix-run/router v1.23.4\n *\n * Copyright (c) Remix Software Inc.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE.md file in the root directory of this source tree.\n *\n * @license MIT\n */function Tr(){return Tr=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var s in n)({}).hasOwnProperty.call(n,s)&&(e[s]=n[s])}return e},Tr.apply(null,arguments)}var Ct;(function(e){e.Pop="POP",e.Push="PUSH",e.Replace="REPLACE"})(Ct||(Ct={}));const cc="popstate";function Fp(e){e===void 0&&(e={});function t(s,l){let{pathname:a,search:i,hash:o}=s.location;return Ua("",{pathname:a,search:i,hash:o},l.state&&l.state.usr||null,l.state&&l.state.key||"default")}function n(s,l){return typeof l=="string"?l:$s(l)}return Wp(t,n,null,e)}function J(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function Ad(e,t){if(!e){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function $p(){return Math.random().toString(36).substr(2,8)}function uc(e,t){return{usr:e.state,key:e.key,idx:t}}function Ua(e,t,n,s){return n===void 0&&(n=null),Tr({pathname:typeof e=="string"?e:e.pathname,search:"",hash:""},typeof t=="string"?Un(t):t,{state:n,key:t&&t.key||s||$p()})}function $s(e){let{pathname:t="/",search:n="",hash:s=""}=e;return n&&n!=="?"&&(t+=n.charAt(0)==="?"?n:"?"+n),s&&s!=="#"&&(t+=s.charAt(0)==="#"?s:"#"+s),t}function Un(e){let t={};if(e){let n=e.indexOf("#");n>=0&&(t.hash=e.substr(n),e=e.substr(0,n));let s=e.indexOf("?");s>=0&&(t.search=e.substr(s),e=e.substr(0,s)),e&&(t.pathname=e)}return t}function Wp(e,t,n,s){s===void 0&&(s={});let{window:l=document.defaultView,v5Compat:a=!1}=s,i=l.history,o=Ct.Pop,c=null,d=f();d==null&&(d=0,i.replaceState(Tr({},i.state,{idx:d}),""));function f(){return(i.state||{idx:null}).idx}function p(){o=Ct.Pop;let N=f(),h=N==null?null:N-d;d=N,c&&c({action:o,location:w.location,delta:h})}function g(N,h){o=Ct.Push;let u=Ua(w.location,N,h);d=f()+1;let m=uc(u,d),v=w.createHref(u);try{i.pushState(m,"",v)}catch(k){if(k instanceof DOMException&&k.name==="DataCloneError")throw k;l.location.assign(v)}a&&c&&c({action:o,location:w.location,delta:1})}function y(N,h){o=Ct.Replace;let u=Ua(w.location,N,h);d=f();let m=uc(u,d),v=w.createHref(u);i.replaceState(m,"",v),a&&c&&c({action:o,location:w.location,delta:0})}function j(N){let h=l.location.origin!=="null"?l.location.origin:l.location.href,u=typeof N=="string"?N:$s(N);return u=u.replace(/ $/,"%20"),J(h,"No window.location.(origin|href) available to create URL for href: "+u),new URL(u,h)}let w={get action(){return o},get location(){return e(l,i)},listen(N){if(c)throw new Error("A history only accepts one active listener");return l.addEventListener(cc,p),c=N,()=>{l.removeEventListener(cc,p),c=null}},createHref(N){return t(l,N)},createURL:j,encodeLocation(N){let h=j(N);return{pathname:h.pathname,search:h.search,hash:h.hash}},push:g,replace:y,go(N){return i.go(N)}};return w}var dc;(function(e){e.data="data",e.deferred="deferred",e.redirect="redirect",e.error="error"})(dc||(dc={}));function Up(e,t,n){return n===void 0&&(n="/"),Bp(e,t,n)}function Bp(e,t,n,s){let l=typeof t=="string"?Un(t):t,a=On(l.pathname||"/",n);if(a==null)return null;let i=Fd(e);Vp(i);let o=null,c=em(a);for(let d=0;o==null&&d<i.length;++d)o=Zp(i[d],c);return o}function Fd(e,t,n,s){t===void 0&&(t=[]),n===void 0&&(n=[]),s===void 0&&(s="");let l=(a,i,o)=>{let c={relativePath:o===void 0?a.path||"":o,caseSensitive:a.caseSensitive===!0,childrenIndex:i,route:a};c.relativePath.startsWith("/")&&(J(c.relativePath.startsWith(s),\'Absolute route path "\'+c.relativePath+\'" nested under path \'+(\'"\'+s+\'" is not valid. An absolute child route path \')+"must start with the combined path of all its parent routes."),c.relativePath=c.relativePath.slice(s.length));let d=It([s,c.relativePath]),f=n.concat(c);a.children&&a.children.length>0&&(J(a.index!==!0,"Index routes must not have child routes. Please remove "+(\'all child routes from route path "\'+d+\'".\')),Fd(a.children,t,f,d)),!(a.path==null&&!a.index)&&t.push({path:d,score:Xp(d,a.index),routesMeta:f})};return e.forEach((a,i)=>{var o;if(a.path===""||!((o=a.path)!=null&&o.includes("?")))l(a,i);else for(let c of $d(a.path))l(a,i,c)}),t}function $d(e){let t=e.split("/");if(t.length===0)return[];let[n,...s]=t,l=n.endsWith("?"),a=n.replace(/\\?$/,"");if(s.length===0)return l?[a,""]:[a];let i=$d(s.join("/")),o=[];return o.push(...i.map(c=>c===""?a:[a,c].join("/"))),l&&o.push(...i),o.map(c=>e.startsWith("/")&&c===""?"/":c)}function Vp(e){e.sort((t,n)=>t.score!==n.score?n.score-t.score:Jp(t.routesMeta.map(s=>s.childrenIndex),n.routesMeta.map(s=>s.childrenIndex)))}const Hp=/^:[\\w-]+$/,bp=3,Qp=2,Yp=1,Kp=10,Gp=-2,hc=e=>e==="*";function Xp(e,t){let n=e.split("/"),s=n.length;return n.some(hc)&&(s+=Gp),t&&(s+=Qp),n.filter(l=>!hc(l)).reduce((l,a)=>l+(Hp.test(a)?bp:a===""?Yp:Kp),s)}function Jp(e,t){return e.length===t.length&&e.slice(0,-1).every((s,l)=>s===t[l])?e[e.length-1]-t[t.length-1]:0}function Zp(e,t,n){let{routesMeta:s}=e,l={},a="/",i=[];for(let o=0;o<s.length;++o){let c=s[o],d=o===s.length-1,f=a==="/"?t:t.slice(a.length)||"/",p=Ba({path:c.relativePath,caseSensitive:c.caseSensitive,end:d},f),g=c.route;if(!p)return null;Object.assign(l,p.params),i.push({params:l,pathname:It([a,p.pathname]),pathnameBase:rm(It([a,p.pathnameBase])),route:g}),p.pathnameBase!=="/"&&(a=It([a,p.pathnameBase]))}return i}function Ba(e,t){typeof e=="string"&&(e={path:e,caseSensitive:!1,end:!0});let[n,s]=qp(e.path,e.caseSensitive,e.end),l=t.match(n);if(!l)return null;let a=l[0],i=a.replace(/(.)\\/+$/,"$1"),o=l.slice(1);return{params:s.reduce((d,f,p)=>{let{paramName:g,isOptional:y}=f;if(g==="*"){let w=o[p]||"";i=a.slice(0,a.length-w.length).replace(/(.)\\/+$/,"$1")}const j=o[p];return y&&!j?d[g]=void 0:d[g]=(j||"").replace(/%2F/g,"/"),d},{}),pathname:a,pathnameBase:i,pattern:e}}function qp(e,t,n){t===void 0&&(t=!1),n===void 0&&(n=!0),Ad(e==="*"||!e.endsWith("*")||e.endsWith("/*"),\'Route path "\'+e+\'" will be treated as if it were \'+(\'"\'+e.replace(/\\*$/,"/*")+\'" because the `*` character must \')+"always follow a `/` in the pattern. To get rid of this warning, "+(\'please change the route path to "\'+e.replace(/\\*$/,"/*")+\'".\'));let s=[],l="^"+e.replace(/\\/*\\*?$/,"").replace(/^\\/*/,"/").replace(/[\\\\.*+^${}|()[\\]]/g,"\\\\$&").replace(/\\/:([\\w-]+)(\\?)?/g,(i,o,c)=>(s.push({paramName:o,isOptional:c!=null}),c?"/?([^\\\\/]+)?":"/([^\\\\/]+)"));return e.endsWith("*")?(s.push({paramName:"*"}),l+=e==="*"||e==="/*"?"(.*)$":"(?:\\\\/(.+)|\\\\/*)$"):n?l+="\\\\/*$":e!==""&&e!=="/"&&(l+="(?:(?=\\\\/|$))"),[new RegExp(l,t?void 0:"i"),s]}function em(e){try{return e.split("/").map(t=>decodeURIComponent(t).replace(/\\//g,"%2F")).join("/")}catch(t){return Ad(!1,\'The URL path "\'+e+\'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent \'+("encoding ("+t+").")),e}}function On(e,t){if(t==="/")return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let n=t.endsWith("/")?t.length-1:t.length,s=e.charAt(n);return s&&s!=="/"?null:e.slice(n)||"/"}function tm(e,t){t===void 0&&(t="/");let{pathname:n,search:s="",hash:l=""}=typeof e=="string"?Un(e):e,a;return n?(n=Wd(n),n.startsWith("/")?a=fc(n.substring(1),"/"):a=fc(n,t)):a=t,{pathname:a,search:sm(s),hash:lm(l)}}function fc(e,t){let n=t.replace(/\\/+$/,"").split("/");return e.split("/").forEach(l=>{l===".."?n.length>1&&n.pop():l!=="."&&n.push(l)}),n.length>1?n.join("/"):"/"}function Kl(e,t,n,s){return"Cannot include a \'"+e+"\' character in a manually specified "+("`to."+t+"` field ["+JSON.stringify(s)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+\'a string in <Link to="..."> and the router will parse it for you.\'}function nm(e){return e.filter((t,n)=>n===0||t.route.path&&t.route.path.length>0)}function Ui(e,t){let n=nm(e);return t?n.map((s,l)=>l===n.length-1?s.pathname:s.pathnameBase):n.map(s=>s.pathnameBase)}function Bi(e,t,n,s){s===void 0&&(s=!1);let l;typeof e=="string"?l=Un(e):(l=Tr({},e),J(!l.pathname||!l.pathname.includes("?"),Kl("?","pathname","search",l)),J(!l.pathname||!l.pathname.includes("#"),Kl("#","pathname","hash",l)),J(!l.search||!l.search.includes("#"),Kl("#","search","hash",l)));let a=e===""||l.pathname==="",i=a?"/":l.pathname,o;if(i==null)o=n;else{let p=t.length-1;if(!s&&i.startsWith("..")){let g=i.split("/");for(;g[0]==="..";)g.shift(),p-=1;l.pathname=g.join("/")}o=p>=0?t[p]:"/"}let c=tm(l,o),d=i&&i!=="/"&&i.endsWith("/"),f=(a||i===".")&&n.endsWith("/");return!c.pathname.endsWith("/")&&(d||f)&&(c.pathname+="/"),c}const Wd=e=>e.replace(/\\/\\/+/g,"/"),It=e=>Wd(e.join("/")),rm=e=>e.replace(/\\/+$/,"").replace(/^\\/*/,"/"),sm=e=>!e||e==="?"?"":e.startsWith("?")?e:"?"+e,lm=e=>!e||e==="#"?"":e.startsWith("#")?e:"#"+e;function am(e){return e!=null&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.internal=="boolean"&&"data"in e}const Ud=["post","put","patch","delete"];new Set(Ud);const im=["get",...Ud];new Set(im);/**\n * React Router v6.30.6\n *\n * Copyright (c) Remix Software Inc.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE.md file in the root directory of this source tree.\n *\n * @license MIT\n */function Mr(){return Mr=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var s in n)({}).hasOwnProperty.call(n,s)&&(e[s]=n[s])}return e},Mr.apply(null,arguments)}const cl=x.createContext(null),Bd=x.createContext(null),vt=x.createContext(null),ul=x.createContext(null),st=x.createContext({outlet:null,matches:[],isDataRoute:!1}),Vd=x.createContext(null);function om(e,t){let{relative:n}=t===void 0?{}:t;Bn()||J(!1);let{basename:s,navigator:l}=x.useContext(vt),{hash:a,pathname:i,search:o}=dl(e,{relative:n}),c=i;return s!=="/"&&(c=i==="/"?s:It([s,i])),l.createHref({pathname:c,search:o,hash:a})}function Bn(){return x.useContext(ul)!=null}function Vt(){return Bn()||J(!1),x.useContext(ul).location}function Hd(e){x.useContext(vt).static||x.useLayoutEffect(e)}function Vn(){let{isDataRoute:e}=x.useContext(st);return e?km():cm()}function cm(){Bn()||J(!1);let e=x.useContext(cl),{basename:t,future:n,navigator:s}=x.useContext(vt),{matches:l}=x.useContext(st),{pathname:a}=Vt(),i=JSON.stringify(Ui(l,n.v7_relativeSplatPath)),o=x.useRef(!1);return Hd(()=>{o.current=!0}),x.useCallback(function(d,f){if(f===void 0&&(f={}),!o.current)return;if(typeof d=="number"){s.go(d);return}let p=Bi(d,JSON.parse(i),a,f.relative==="path");e==null&&t!=="/"&&(p.pathname=p.pathname==="/"?t:It([t,p.pathname])),(f.replace?s.replace:s.push)(p,f.state,f)},[t,s,i,a,e])}const um=x.createContext(null);function dm(e){let t=x.useContext(st).outlet;return t&&x.createElement(um.Provider,{value:e},t)}function Vi(){let{matches:e}=x.useContext(st),t=e[e.length-1];return t?t.params:{}}function dl(e,t){let{relative:n}=t===void 0?{}:t,{future:s}=x.useContext(vt),{matches:l}=x.useContext(st),{pathname:a}=Vt(),i=JSON.stringify(Ui(l,s.v7_relativeSplatPath));return x.useMemo(()=>Bi(e,JSON.parse(i),a,n==="path"),[e,i,a,n])}function hm(e,t){return fm(e,t)}function fm(e,t,n,s){Bn()||J(!1);let{navigator:l}=x.useContext(vt),{matches:a}=x.useContext(st),i=a[a.length-1],o=i?i.params:{};i&&i.pathname;let c=i?i.pathnameBase:"/";i&&i.route;let d=Vt(),f;if(t){var p;let N=typeof t=="string"?Un(t):t;c==="/"||(p=N.pathname)!=null&&p.startsWith(c)||J(!1),f=N}else f=d;let g=f.pathname||"/",y=g;if(c!=="/"){let N=c.replace(/^\\//,"").split("/");y="/"+g.replace(/^\\//,"").split("/").slice(N.length).join("/")}let j=Up(e,{pathname:y}),w=gm(j&&j.map(N=>Object.assign({},N,{params:Object.assign({},o,N.params),pathname:It([c,l.encodeLocation?l.encodeLocation(N.pathname).pathname:N.pathname]),pathnameBase:N.pathnameBase==="/"?c:It([c,l.encodeLocation?l.encodeLocation(N.pathnameBase).pathname:N.pathnameBase])})),a,n,s);return t&&w?x.createElement(ul.Provider,{value:{location:Mr({pathname:"/",search:"",hash:"",state:null,key:"default"},f),navigationType:Ct.Pop}},w):w}function pm(){let e=Nm(),t=am(e)?e.status+" "+e.statusText:e instanceof Error?e.message:JSON.stringify(e),n=e instanceof Error?e.stack:null,l={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return x.createElement(x.Fragment,null,x.createElement("h2",null,"Unexpected Application Error!"),x.createElement("h3",{style:{fontStyle:"italic"}},t),n?x.createElement("pre",{style:l},n):null,null)}const mm=x.createElement(pm,null);class vm extends x.Component{constructor(t){super(t),this.state={location:t.location,revalidation:t.revalidation,error:t.error}}static getDerivedStateFromError(t){return{error:t}}static getDerivedStateFromProps(t,n){return n.location!==t.location||n.revalidation!=="idle"&&t.revalidation==="idle"?{error:t.error,location:t.location,revalidation:t.revalidation}:{error:t.error!==void 0?t.error:n.error,location:n.location,revalidation:t.revalidation||n.revalidation}}componentDidCatch(t,n){console.error("React Router caught the following error during render",t,n)}render(){return this.state.error!==void 0?x.createElement(st.Provider,{value:this.props.routeContext},x.createElement(Vd.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function xm(e){let{routeContext:t,match:n,children:s}=e,l=x.useContext(cl);return l&&l.static&&l.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(l.staticContext._deepestRenderedBoundaryId=n.route.id),x.createElement(st.Provider,{value:t},s)}function gm(e,t,n,s){var l;if(t===void 0&&(t=[]),n===void 0&&(n=null),s===void 0&&(s=null),e==null){var a;if(!n)return null;if(n.errors)e=n.matches;else if((a=s)!=null&&a.v7_partialHydration&&t.length===0&&!n.initialized&&n.matches.length>0)e=n.matches;else return null}let i=e,o=(l=n)==null?void 0:l.errors;if(o!=null){let f=i.findIndex(p=>p.route.id&&(o==null?void 0:o[p.route.id])!==void 0);f>=0||J(!1),i=i.slice(0,Math.min(i.length,f+1))}let c=!1,d=-1;if(n&&s&&s.v7_partialHydration)for(let f=0;f<i.length;f++){let p=i[f];if((p.route.HydrateFallback||p.route.hydrateFallbackElement)&&(d=f),p.route.id){let{loaderData:g,errors:y}=n,j=p.route.loader&&g[p.route.id]===void 0&&(!y||y[p.route.id]===void 0);if(p.route.lazy||j){c=!0,d>=0?i=i.slice(0,d+1):i=[i[0]];break}}}return i.reduceRight((f,p,g)=>{let y,j=!1,w=null,N=null;n&&(y=o&&p.route.id?o[p.route.id]:void 0,w=p.route.errorElement||mm,c&&(d<0&&g===0?(Sm("route-fallback"),j=!0,N=null):d===g&&(j=!0,N=p.route.hydrateFallbackElement||null)));let h=t.concat(i.slice(0,g+1)),u=()=>{let m;return y?m=w:j?m=N:p.route.Component?m=x.createElement(p.route.Component,null):p.route.element?m=p.route.element:m=f,x.createElement(xm,{match:p,routeContext:{outlet:f,matches:h,isDataRoute:n!=null},children:m})};return n&&(p.route.ErrorBoundary||p.route.errorElement||g===0)?x.createElement(vm,{location:n.location,revalidation:n.revalidation,component:w,error:y,children:u(),routeContext:{outlet:null,matches:h,isDataRoute:!0}}):u()},null)}var bd=function(e){return e.UseBlocker="useBlocker",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e}(bd||{}),Qd=function(e){return e.UseBlocker="useBlocker",e.UseLoaderData="useLoaderData",e.UseActionData="useActionData",e.UseRouteError="useRouteError",e.UseNavigation="useNavigation",e.UseRouteLoaderData="useRouteLoaderData",e.UseMatches="useMatches",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e.UseRouteId="useRouteId",e}(Qd||{});function ym(e){let t=x.useContext(cl);return t||J(!1),t}function jm(e){let t=x.useContext(Bd);return t||J(!1),t}function wm(e){let t=x.useContext(st);return t||J(!1),t}function Yd(e){let t=wm(),n=t.matches[t.matches.length-1];return n.route.id||J(!1),n.route.id}function Nm(){var e;let t=x.useContext(Vd),n=jm(),s=Yd();return t!==void 0?t:(e=n.errors)==null?void 0:e[s]}function km(){let{router:e}=ym(bd.UseNavigateStable),t=Yd(Qd.UseNavigateStable),n=x.useRef(!1);return Hd(()=>{n.current=!0}),x.useCallback(function(l,a){a===void 0&&(a={}),n.current&&(typeof l=="number"?e.navigate(l):e.navigate(l,Mr({fromRouteId:t},a)))},[e,t])}const pc={};function Sm(e,t,n){pc[e]||(pc[e]=!0)}function Cm(e,t){e==null||e.v7_startTransition,e==null||e.v7_relativeSplatPath}function Va(e){let{to:t,replace:n,state:s,relative:l}=e;Bn()||J(!1);let{future:a,static:i}=x.useContext(vt),{matches:o}=x.useContext(st),{pathname:c}=Vt(),d=Vn(),f=Bi(t,Ui(o,a.v7_relativeSplatPath),c,l==="path"),p=JSON.stringify(f);return x.useEffect(()=>d(JSON.parse(p),{replace:n,state:s,relative:l}),[d,p,l,n,s]),null}function Em(e){return dm(e.context)}function re(e){J(!1)}function _m(e){let{basename:t="/",children:n=null,location:s,navigationType:l=Ct.Pop,navigator:a,static:i=!1,future:o}=e;Bn()&&J(!1);let c=t.replace(/^\\/*/,"/"),d=x.useMemo(()=>({basename:c,navigator:a,static:i,future:Mr({v7_relativeSplatPath:!1},o)}),[c,o,a,i]);typeof s=="string"&&(s=Un(s));let{pathname:f="/",search:p="",hash:g="",state:y=null,key:j="default"}=s,w=x.useMemo(()=>{let N=On(f,c);return N==null?null:{location:{pathname:N,search:p,hash:g,state:y,key:j},navigationType:l}},[c,f,p,g,y,j,l]);return w==null?null:x.createElement(vt.Provider,{value:d},x.createElement(ul.Provider,{children:n,value:w}))}function Pm(e){let{children:t,location:n}=e;return hm(Ha(t),n)}new Promise(()=>{});function Ha(e,t){t===void 0&&(t=[]);let n=[];return x.Children.forEach(e,(s,l)=>{if(!x.isValidElement(s))return;let a=[...t,l];if(s.type===x.Fragment){n.push.apply(n,Ha(s.props.children,a));return}s.type!==re&&J(!1),!s.props.index||!s.props.children||J(!1);let i={id:s.props.id||a.join("-"),caseSensitive:s.props.caseSensitive,element:s.props.element,Component:s.props.Component,index:s.props.index,path:s.props.path,loader:s.props.loader,action:s.props.action,errorElement:s.props.errorElement,ErrorBoundary:s.props.ErrorBoundary,hasErrorBoundary:s.props.ErrorBoundary!=null||s.props.errorElement!=null,shouldRevalidate:s.props.shouldRevalidate,handle:s.props.handle,lazy:s.props.lazy};s.props.children&&(i.children=Ha(s.props.children,a)),n.push(i)}),n}/**\n * React Router DOM v6.30.6\n *\n * Copyright (c) Remix Software Inc.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE.md file in the root directory of this source tree.\n *\n * @license MIT\n */function Ws(){return Ws=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var s in n)({}).hasOwnProperty.call(n,s)&&(e[s]=n[s])}return e},Ws.apply(null,arguments)}function Kd(e,t){if(e==null)return{};var n={};for(var s in e)if({}.hasOwnProperty.call(e,s)){if(t.indexOf(s)!==-1)continue;n[s]=e[s]}return n}function Tm(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function Mm(e,t){return e.button===0&&(!t||t==="_self")&&!Tm(e)}const zm=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],Lm=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],Rm="6";try{window.__reactRouterVersion=Rm}catch{}const Im=x.createContext({isTransitioning:!1}),Dm="startTransition",mc=Ch[Dm];function Om(e){let{basename:t,children:n,future:s,window:l}=e,a=x.useRef();a.current==null&&(a.current=Fp({window:l,v5Compat:!0}));let i=a.current,[o,c]=x.useState({action:i.action,location:i.location}),{v7_startTransition:d}=s||{},f=x.useCallback(p=>{d&&mc?mc(()=>c(p)):c(p)},[c,d]);return x.useLayoutEffect(()=>i.listen(f),[i,f]),x.useEffect(()=>Cm(s),[s]),x.createElement(_m,{basename:t,children:n,location:o.location,navigationType:o.action,navigator:i,future:s})}const Am=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",Fm=/^(?:[a-z][a-z0-9+.-]*:|\\/\\/)/i,K=x.forwardRef(function(t,n){let{onClick:s,relative:l,reloadDocument:a,replace:i,state:o,target:c,to:d,preventScrollReset:f,viewTransition:p}=t,g=Kd(t,zm),{basename:y}=x.useContext(vt),j,w=!1;if(typeof d=="string"&&Fm.test(d)&&(j=d,Am))try{let m=new URL(window.location.href),v=d.startsWith("//")?new URL(m.protocol+d):new URL(d),k=On(v.pathname,y);v.origin===m.origin&&k!=null?d=k+v.search+v.hash:w=!0}catch{}let N=om(d,{relative:l}),h=Wm(d,{replace:i,state:o,target:c,preventScrollReset:f,relative:l,viewTransition:p});function u(m){s&&s(m),m.defaultPrevented||h(m)}return x.createElement("a",Ws({},g,{href:j||N,onClick:w||a?s:u,ref:n,target:c}))}),vc=x.forwardRef(function(t,n){let{"aria-current":s="page",caseSensitive:l=!1,className:a="",end:i=!1,style:o,to:c,viewTransition:d,children:f}=t,p=Kd(t,Lm),g=dl(c,{relative:p.relative}),y=Vt(),j=x.useContext(Bd),{navigator:w,basename:N}=x.useContext(vt),h=j!=null&&Um(g)&&d===!0,u=w.encodeLocation?w.encodeLocation(g).pathname:g.pathname,m=y.pathname,v=j&&j.navigation&&j.navigation.location?j.navigation.location.pathname:null;l||(m=m.toLowerCase(),v=v?v.toLowerCase():null,u=u.toLowerCase()),v&&N&&(v=On(v,N)||v);const k=u!=="/"&&u.endsWith("/")?u.length-1:u.length;let E=m===u||!i&&m.startsWith(u)&&m.charAt(k)==="/",_=v!=null&&(v===u||!i&&v.startsWith(u)&&v.charAt(u.length)==="/"),M={isActive:E,isPending:_,isTransitioning:h},V=E?s:void 0,R;typeof a=="function"?R=a(M):R=[a,E?"active":null,_?"pending":null,h?"transitioning":null].filter(Boolean).join(" ");let pe=typeof o=="function"?o(M):o;return x.createElement(K,Ws({},p,{"aria-current":V,className:R,ref:n,style:pe,to:c,viewTransition:d}),typeof f=="function"?f(M):f)});var ba;(function(e){e.UseScrollRestoration="useScrollRestoration",e.UseSubmit="useSubmit",e.UseSubmitFetcher="useSubmitFetcher",e.UseFetcher="useFetcher",e.useViewTransitionState="useViewTransitionState"})(ba||(ba={}));var xc;(function(e){e.UseFetcher="useFetcher",e.UseFetchers="useFetchers",e.UseScrollRestoration="useScrollRestoration"})(xc||(xc={}));function $m(e){let t=x.useContext(cl);return t||J(!1),t}function Wm(e,t){let{target:n,replace:s,state:l,preventScrollReset:a,relative:i,viewTransition:o}=t===void 0?{}:t,c=Vn(),d=Vt(),f=dl(e,{relative:i});return x.useCallback(p=>{if(Mm(p,n)){p.preventDefault();let g=s!==void 0?s:$s(d)===$s(f);c(e,{replace:g,state:l,preventScrollReset:a,relative:i,viewTransition:o})}},[d,c,f,s,l,n,e,a,i,o])}function Um(e,t){t===void 0&&(t={});let n=x.useContext(Im);n==null&&J(!1);let{basename:s}=$m(ba.useViewTransitionState),l=dl(e,{relative:t.relative});if(!n.isTransitioning)return!1;let a=On(n.currentLocation.pathname,s)||n.currentLocation.pathname,i=On(n.nextLocation.pathname,s)||n.nextLocation.pathname;return Ba(l.pathname,i)!=null||Ba(l.pathname,a)!=null}const Us="cc_token";let Hi=null;function Bm(){try{return localStorage.getItem(Us)}catch{return null}}function gc(e){Hi=e||null;try{e?localStorage.setItem(Us,e):localStorage.removeItem(Us)}catch{}}function Gd(){Hi=null;try{localStorage.removeItem(Us)}catch{}}function Vm(){return Hi||Bm()}class Hm extends Error{constructor(t,n){var s,l;super(((s=t==null?void 0:t.error)==null?void 0:s.message)||"Something went wrong."),this.code=((l=t==null?void 0:t.error)==null?void 0:l.code)||"UNKNOWN",this.status=n,this.payload=t}}async function hl(e,{method:t="GET",body:n}={}){const s={};n&&(s["Content-Type"]="application/json");const l=Vm();l&&(s.Authorization=`Bearer ${l}`);const a=await fetch(e,{method:t,headers:s,body:n?JSON.stringify(n):void 0,credentials:"same-origin"});let i=null;try{i=await a.json()}catch{}if(a.status===401&&Gd(),!a.ok||!(i!=null&&i.ok))throw new Hm(i,a.status);return i.data}const $=e=>hl(e),W=(e,t)=>hl(e,{method:"POST",body:t}),bm=(e,t)=>hl(e,{method:"PUT",body:t}),Xd=e=>hl(e,{method:"DELETE"}),Jd=x.createContext(null),te=()=>x.useContext(Jd);function Qm({children:e}){const[t,n]=x.useState([]),s=x.useRef(0),l=x.useCallback((a,i="ok")=>{const o=++s.current;n(c=>[...c,{id:o,message:a,kind:i}]),setTimeout(()=>n(c=>c.filter(d=>d.id!==o)),4200)},[]);return r.jsxs(Jd.Provider,{value:{toast:l},children:[e,r.jsx("div",{className:"toasts",children:t.map(a=>r.jsx("div",{className:`toast ${a.kind==="err"?"err":""}`,children:a.message},a.id))})]})}const Zd=x.createContext(null),Se=()=>x.useContext(Zd);function Ym({children:e}){const[t,n]=x.useState(null),[s,l]=x.useState(!0),a=x.useCallback(async()=>{try{const o=await $("/api/auth/me");n(o)}catch{n({user:null})}finally{l(!1)}},[]);x.useEffect(()=>{a()},[a]);const i=async()=>{try{await W("/api/auth/logout")}catch{}Gd(),n({user:null})};return r.jsx(Zd.Provider,{value:{me:t,user:t==null?void 0:t.user,loading:s,refresh:a,logout:i},children:e})}function Km(){const[e,t]=x.useState(()=>document.documentElement.getAttribute("data-theme")||"light");return{theme:e,toggle:()=>{const s=e==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",s),localStorage.setItem("cc-theme",s),t(s)}}}const D=(e,t="0 0 24 24")=>n=>r.jsx("svg",{viewBox:t,fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round",width:"18",height:"18",...n,dangerouslySetInnerHTML:{__html:e}}),ln=e=>r.jsxs("svg",{viewBox:"0 0 64 64",width:"28",height:"28",...e,children:[r.jsx("circle",{cx:"32",cy:"32",r:"29",fill:"#0d5c57"}),r.jsx("path",{d:"M32 13 L41 32 L32 51 L23 32 Z",fill:"#e8a33d"}),r.jsx("circle",{cx:"32",cy:"32",r:"4",fill:"#fff"})]}),Gm=D(\'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>\'),bi=D(\'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>\'),At=D(\'<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/>\'),Ft=D(\'<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.6-.3-3.7-.8L3 21l1.3-4.6A8.5 8.5 0 1 1 21 12z"/>\'),fl=D(\'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>\'),Xm=D(\'<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>\'),q=D(\'<path d="m4.5 12.5 5 5 10-11"/>\'),Jm=D(\'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>\'),qd=D(\'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>\'),eh=D(\'<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/>\'),rt=D(\'<path d="M12 3 4.5 6v5c0 5 3.2 8.3 7.5 10 4.3-1.7 7.5-5 7.5-10V6L12 3z"/><path d="m9 12 2 2 4-4.5"/>\'),An=D(\'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>\'),Je=D(\'<path d="M4 12h16M14 6l6 6-6 6"/>\'),Bs=D(\'<path d="M20 12H4M10 6l-6 6 6 6"/>\'),th=D(\'<path d="M12 5v14M5 12h14"/>\'),Qi=D(\'<path d="M6 6l12 12M18 6 6 18"/>\'),yc=D(\'<path d="m6 9 6 6 6-6"/>\'),Zm=D(\'<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>\'),qm=D(\'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>\'),ev=D(\'<path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9"/><path d="M15 16l4-4-4-4M19 12H9"/>\'),nh=D(\'<path d="M7 4h10M7 8.5h10M15.5 4c0 4-3.5 4.5-8.5 4.5 4 0 8.5 1 8.5 5.5 0 3-2.5 6-6.5 6-2 0-4-.5-5-1.5"/>\'),pl=D(\'<path d="M13 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V9l-6-6z"/><path d="M13 3v6h6"/>\'),Ar=D(\'<path d="M20 11A8 8 0 0 0 5.6 6.6L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.4 4.4L20 15.5"/><path d="M20 20v-4.5h-4.5"/>\'),Yi=D(\'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>\'),tv=D(\'<path d="M7 21V10l4.5-7 1.4.7a2 2 0 0 1 1 2.2L13 10h5.5a2 2 0 0 1 2 2.5l-1.8 7A2 2 0 0 1 16.7 21H7z"/><path d="M7 10H4v11h3"/>\'),nv=D(\'<path d="M17 3v11l-4.5 7-1.4-.7a2 2 0 0 1-1-2.2L11 14H5.5a2 2 0 0 1-2-2.5l1.8-7A2 2 0 0 1 7.3 3H17z"/><path d="M17 14h3V3h-3"/>\'),Vs=D(\'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>\'),rv=D(\'<path d="m2.5 9 9.5-5 9.5 5-9.5 5L2.5 9z"/><path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5"/><path d="M21.5 9v6"/>\'),Ki=D(\'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10.5 21v-3h3v3"/>\'),Hs=D(\'<path d="M12 3v18M8 21h8"/><path d="M12 6 5 8M12 6l7 2"/><path d="M5 8 2.5 14a2.8 2.8 0 0 0 5 0L5 8zM19 8l-2.5 6a2.8 2.8 0 0 0 5 0L19 8z"/>\'),bs=D(\'<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V13"/>\'),rh=D(\'<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 20h14"/>\'),sh=D(\'<path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>\'),ml=D(\'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>\'),Qs=D(\'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>\'),Gi=D(\'<path d="M10 3.5a1.8 1.8 0 0 1 3.6 0c0 1.2 1 1.6 2.2 1.1a1.8 1.8 0 0 1 1.6 3.2c-1.1.6-1.1 1.7 0 2.4a1.8 1.8 0 0 1-1.6 3.2c-1.2-.5-2.2-.1-2.2 1.1a1.8 1.8 0 0 1-3.6 0c0-1.2-1-1.6-2.2-1.1a1.8 1.8 0 0 1-1.6-3.2c1.1-.6 1.1-1.7 0-2.4a1.8 1.8 0 0 1 1.6-3.2C9 5.1 10 4.7 10 3.5z"/><circle cx="12" cy="12" r="2"/>\'),Xi=D(\'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5a3.5 3.5 0 0 1 0 7M17.5 14.5a6.5 6.5 0 0 1 4 5.5"/>\'),lh=D(\'<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18"/>\'),vl=D(\'<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4M12 17v.01"/>\');function z({as:e,to:t,href:n,children:s,variant:l="primary",size:a,block:i,className:o="",...c}){const d=`btn btn-${l} ${a==="sm"?"btn-sm":""} ${a==="lg"?"btn-lg":""} ${i?"btn-block":""} ${o}`;return e==="a"||n?r.jsx("a",{className:d,href:n,...c,children:s}):r.jsx("button",{className:d,...c,children:s})}function L({tone:e="brand",children:t,...n}){return r.jsx("span",{className:`badge badge-${e}`,...n,children:t})}function C({children:e,className:t="",pad:n=!0,...s}){return r.jsx("div",{className:`card ${n?"card-pad":""} ${t}`,...s,children:e})}function $e({label:e,hint:t,children:n}){return r.jsxs("div",{className:"field",children:[e&&r.jsx("label",{children:e}),n,t&&r.jsx("div",{className:"hint",children:t})]})}function xl({open:e,onClose:t,title:n,children:s,wide:l}){return x.useEffect(()=>{const a=i=>i.key==="Escape"&&(t==null?void 0:t());return e&&window.addEventListener("keydown",a),()=>window.removeEventListener("keydown",a)},[e,t]),e?r.jsx("div",{className:"modal-overlay",onMouseDown:a=>a.target===a.currentTarget&&(t==null?void 0:t()),children:r.jsxs("div",{className:"modal",style:l?{maxWidth:720}:void 0,children:[r.jsxs("div",{className:"modal-head",children:[r.jsx("h3",{style:{flex:1},children:n}),r.jsx("button",{className:"icon-btn",onClick:t,"aria-label":"Close",children:r.jsx(Qi,{})})]}),r.jsx("div",{className:"modal-body",children:s})]})}):null}function $t(){return r.jsxs("span",{className:"ascii-loader",children:[r.jsx("i",{}),r.jsx("i",{}),r.jsx("i",{})]})}function B({h:e=90}){return r.jsx("div",{className:"skeleton skeleton-row",style:{height:e}})}function we({icon:e,title:t,body:n,action:s}){return r.jsxs("div",{className:"card card-pad center",style:{padding:"40px 20px"},children:[r.jsx("div",{style:{color:"var(--faint)",marginBottom:12},children:e||r.jsx(ln,{width:44,height:44})}),r.jsx("h3",{children:t}),n&&r.jsx("p",{className:"mt-1",children:n}),s&&r.jsx("div",{className:"mt-3",children:s})]})}function qt({source:e,asOf:t,staleDays:n=180}){if(!e&&!t)return null;const s=t&&Date.now()-new Date(t).getTime()>n*864e5;return r.jsxs("span",{className:`source-tag ${s?"stale":""}`,title:`Source: ${e||"\u2014"} \xB7 Verified as of ${zr(t)}`,children:[r.jsx(rt,{width:12,height:12}),e?e.split("(")[0].trim():"Source"," \xB7 as of ",zr(t),s&&" \xB7 needs refresh"]})}function sv({level:e}){const t=e==="high"?"success":e==="medium"?"brand":"warn",n=e==="high"?"High confidence":e==="medium"?"Medium confidence":"Low confidence";return r.jsx(L,{tone:t,children:n})}function gl({score:e,size:t=64,label:n="match"}){const s=(t-8)/2,l=2*Math.PI*s,a=l*(1-e/100),i=e>=75?"var(--success)":e>=55?"var(--brand-2)":"var(--accent)";return r.jsxs("div",{className:"match-score",style:{width:t,height:t},children:[r.jsxs("svg",{className:"ring",width:t,height:t,children:[r.jsx("circle",{className:"track",cx:t/2,cy:t/2,r:s,strokeWidth:"5",fill:"none"}),r.jsx("circle",{className:"fill",cx:t/2,cy:t/2,r:s,strokeWidth:"5",fill:"none",stroke:i,strokeDasharray:l,strokeDashoffset:a,strokeLinecap:"round"})]}),r.jsxs("div",{className:"ring-label",children:[r.jsxs("strong",{style:{fontSize:t>56?"1.02rem":".86rem"},children:[Math.round(e),"%"]}),r.jsx("span",{className:"tiny faint",children:n})]})]})}function cn({value:e}){return r.jsx("div",{className:"progressbar",children:r.jsx("div",{style:{width:`${Math.min(100,Math.max(0,e))}%`}})})}function Ji({tabs:e,value:t,onChange:n}){return r.jsx("div",{className:"tabs",children:e.map(s=>r.jsxs("button",{className:t===s.id?"on":"",onClick:()=>n(s.id),children:[s.label,s.count!=null?` (${s.count})`:""]},s.id))})}function zr(e){if(!e)return"\u2014";try{return new Date(e).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}catch{return e}}function Ie(e){if(!e)return"\u2014";try{return new Date(e).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}catch{return e}}function lv(e){const t=x.useRef(null);return x.useEffect(()=>{const n=s=>{t.current&&!t.current.contains(s.target)&&e()};return document.addEventListener("mousedown",n),()=>document.removeEventListener("mousedown",n)},[e]),t}function av(){const[e,t]=x.useState(!1),[n,s]=x.useState({notifications:[],unread:0}),l=lv(()=>t(!1)),a=async()=>{try{s(await $("/api/account/notifications"))}catch{}};x.useEffect(()=>{a();const o=setInterval(a,2e4);return()=>clearInterval(o)},[]);const i=async()=>{await W("/api/account/notifications/read-all"),a()};return r.jsxs("div",{ref:l,style:{position:"relative"},children:[r.jsxs("button",{className:"icon-btn",onClick:()=>t(o=>!o),"aria-label":"Notifications",children:[r.jsx(Xm,{}),n.unread>0&&r.jsx("span",{className:"dot",children:n.unread})]}),e&&r.jsxs("div",{className:"card",style:{position:"absolute",right:0,top:48,width:"min(92vw, 380px)",zIndex:60,padding:12,maxHeight:420,overflowY:"auto"},children:[r.jsxs("div",{className:"row",style:{padding:"2px 6px 10px"},children:[r.jsx("strong",{children:"Notifications"}),r.jsx("span",{className:"spacer"}),n.unread>0&&r.jsx("button",{className:"btn btn-ghost btn-sm",onClick:i,children:"Mark all read"})]}),n.notifications.length===0&&r.jsx("p",{className:"small center",style:{padding:18},children:"Nothing yet \u2014 your check-ins and mentor answers land here."}),r.jsx("div",{className:"stack",style:{gap:8},children:n.notifications.slice(0,12).map(o=>r.jsxs(K,{to:o.link||"/app/home",className:`notif-item ${o.read_at?"":"unread"}`,onClick:()=>{t(!1),W(`/api/account/notifications/${o.id}/read`).then(a)},children:[r.jsx("div",{style:{minWidth:20,color:o.type==="checkin"?"var(--accent)":o.type==="payment"?"var(--success)":"var(--brand-2)"},children:o.type==="checkin"?r.jsx(Qs,{}):o.type==="payment"?r.jsx(nh,{}):o.type==="mentor_answer"?r.jsx(Ft,{}):r.jsx(An,{})}),r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{style:{fontWeight:600,fontSize:".88rem"},children:o.title}),r.jsx("div",{className:"small muted",children:o.body}),r.jsx("div",{className:"tiny faint mt-1",children:Ie(o.created_at)})]})]},o.id))})]})]})}const iv=[{to:"/app/home",label:"Home",icon:Gm,roles:["student","parent","mentor","admin"]},{to:"/app/explore",label:"Explore",icon:bi,roles:["student","parent","mentor","admin"]},{to:"/app/roadmap",label:"Roadmap",icon:At,roles:["student"]},{to:"/app/ask",label:"Ask a Pro",icon:Ft,roles:["student"]},{to:"/app/progress",label:"Progress",icon:rv,roles:["student"]},{to:"/app/mentor",label:"Mentor desk",icon:Ft,roles:["mentor"]},{to:"/app/admin",label:"Admin",icon:rt,roles:["admin"]},{to:"/app/account",label:"Account",icon:fl,roles:["student","parent","mentor","admin"]}];function ov(){const{user:e,logout:t}=Se(),{theme:n,toggle:s}=Km(),{toast:l}=te(),a=Vn(),i=iv.filter(c=>c.roles.includes(e.role)),o=[...i.filter(c=>["/app/home","/app/explore","/app/roadmap","/app/ask","/app/progress","/app/mentor","/app/admin"].includes(c.to))].slice(0,5);return r.jsxs(r.Fragment,{children:[(e==null?void 0:e.is_minor)&&r.jsxs("div",{className:"demo-banner",children:["Parental consent ",e.consent_status==="given"?"received \u2713":"pending"," \xB7 share your consent code from Account to link a parent"]}),r.jsx("div",{className:"demo-banner",style:{background:"var(--brand-soft)",color:"var(--brand)"},children:"Demo mode \xB7 demo accounts are listed on the sign-in page \xB7 everything is free"}),r.jsx("header",{className:"topbar",children:r.jsxs("div",{className:"topbar-inner",children:[r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]}),r.jsx("nav",{className:"topnav",children:i.map(c=>r.jsx(vc,{to:c.to,className:({isActive:d})=>d?"active":"",children:c.label},c.to))}),r.jsx("div",{className:"topbar-spacer"}),r.jsx("button",{className:"icon-btn",onClick:s,"aria-label":"Toggle theme",children:n==="light"?r.jsx(qm,{}):r.jsx(Zm,{})}),r.jsx(av,{}),r.jsx("button",{className:"icon-btn",onClick:async()=>{await t(),l("Signed out. Come back soon."),a("/")},"aria-label":"Sign out",children:r.jsx(ev,{})})]})}),r.jsx("main",{className:"page",style:{flex:1},children:r.jsx(Em,{})}),r.jsx("nav",{className:"bottom-nav",children:o.map(c=>r.jsxs(vc,{to:c.to,className:({isActive:d})=>d?"active":"",children:[r.jsx(c.icon,{})," ",c.label]},c.to))})]})}function ah(){const{user:e}=Se();return r.jsx("header",{className:"topbar",children:r.jsxs("div",{className:"topbar-inner",children:[r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]}),r.jsx("div",{className:"topbar-spacer"}),r.jsx(K,{to:"/how-it-works",className:"btn btn-ghost btn-sm",children:"How it works"}),e?r.jsx(z,{as:"a",href:"/app/home",size:"sm",children:"Open app"}):r.jsx(z,{as:"a",href:"/signin",size:"sm",children:"Sign in"})]})})}function cv(){return r.jsxs(r.Fragment,{children:[r.jsx(ah,{}),r.jsxs("section",{className:"landing-hero",children:[r.jsxs("div",{children:[r.jsx(L,{tone:"accent",children:"\u2726 Built for Indian students, Class 10\u201312"}),r.jsxs("h1",{className:"hero-h1 mt-2",children:["Your future should not be a ",r.jsx("span",{style:{color:"var(--brand-2)"},children:"guessing game"}),"."]}),r.jsxs("p",{className:"mt-2",style:{fontSize:"1.06rem",maxWidth:520},children:["Parents, teachers, friends, the internet \u2014 everyone has an opinion on your career. The problem isn\'t finding advice. It\'s knowing ",r.jsx("strong",{children:"which advice to trust"}),". Career Compass turns who you are into ",r.jsx("strong",{children:"one trusted roadmap"})," you can actually act on."]}),r.jsx("div",{className:"row mt-3",children:r.jsxs(z,{as:"a",href:"/signin",size:"lg",children:["Start free \u2014 takes 15 minutes ",r.jsx(Je,{})]})}),r.jsxs("div",{className:"trust-strip mt-3",children:[r.jsxs("span",{className:"chip",children:[r.jsx(rt,{})," Every fact dated & sourced"]}),r.jsxs("span",{className:"chip",children:[r.jsx(Xi,{})," Real professionals, verified"]}),r.jsxs("span",{className:"chip",children:[r.jsx(nh,{})," No commission from colleges \u2014 ever"]})]})]}),r.jsx("div",{className:"hero-visual",children:r.jsxs(C,{className:"hero-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(L,{tone:"brand",children:"Aarav\'s #1 match"}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:"success",children:"High confidence"})]}),r.jsxs("div",{className:"row",children:[r.jsx(gl,{score:92}),r.jsxs("div",{children:[r.jsx("div",{className:"match-title",children:"AI / ML Engineer"}),r.jsx("div",{className:"small muted",children:"Investigative + Realistic \xB7 strong in Mathematics & CS"})]})]}),r.jsxs("div",{className:"why-box",children:[\'"You enjoy Mathematics (5/5) and Computer Science, and your goals \u2014 working with technology and strong earnings \u2014 align here. The typical route is B.Tech CSE via JEE Main."\',r.jsx("div",{className:"tiny faint mt-1",children:"\u2713 Grounded in Career Compass research \xB7 as of this month"})]}),r.jsxs("div",{className:"row",children:[r.jsxs("span",{className:"chip on",children:[r.jsx(At,{})," Roadmap ready"]}),r.jsxs("span",{className:"chip",children:[r.jsx(Ft,{})," Mentor answered in 6h"]})]})]})})]}),r.jsxs("section",{className:"landing-section",children:[r.jsx("div",{className:"eyebrow",children:"How it works"}),r.jsx("h2",{children:\'From "everyone says something different" to one plan, in four steps\'}),r.jsx("div",{className:"grid-2 mt-3",children:[["Tell us who you are",\'Interests, subjects, strengths, goals \u2014 a structured "know me" profile, built in minutes.\',fl],["Take the assessment","60 questions across aptitude, personality (RIASEC) and career interests. Save and resume anytime.",Gi],["Get honest matches",\'Top 3 careers + 2 wildcards \u2014 each with a plain-language "why", confidence level, and cited sources.\',An],["Follow your roadmap","Milestones, exam timelines, free resources, mentor conversations, and 2-week check-ins. One path forward.",At]].map(([e,t,n],s)=>r.jsxs(C,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx("span",{className:"step-num",children:s+1}),r.jsx(n,{width:20,height:20,style:{color:"var(--brand-2)"}})]}),r.jsx("h3",{children:e}),r.jsx("p",{className:"small",children:t})]},s))})]}),r.jsxs("section",{className:"landing-section",children:[r.jsx("div",{className:"eyebrow",children:"Why trust us"}),r.jsx("h2",{children:"Trust is the product"}),r.jsx("p",{children:"Other platforms hand you a report and a list of options. We hand you a decision \u2014 with the receipts."}),r.jsxs("div",{className:"grid-3 mt-3",children:[r.jsxs(C,{className:"step-card",children:[r.jsx(rt,{width:22,height:22,style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"Dated, sourced facts"}),r.jsx("p",{className:"small",children:"Every career, college and exam fact shows its source and when it was last verified. Stale content gets flagged for review \u2014 by students and by us."})]}),r.jsxs(C,{className:"step-card",children:[r.jsx(Yi,{width:22,height:22,style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"Explainable matches"}),r.jsx("p",{className:"small",children:\'Every recommendation ships with a "Why was this recommended?" decision log in plain language. High-stakes advice (like a gap year) is checked by a human counsellor first.\'})]}),r.jsxs(C,{className:"step-card",children:[r.jsx(Hs,{width:22,height:22,style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"No commissions. Ever."}),r.jsx("p",{className:"small",children:"We never take money from colleges to rank or recommend them. We charge students a small, honest fee \u2014 so our only incentive is giving you the right answer."})]})]})]}),r.jsxs("section",{className:"landing-section",children:[r.jsx("div",{className:"eyebrow",children:"Pricing"}),r.jsx("h2",{children:"Free for every student. No paywalls, no commissions."}),r.jsx("p",{className:"mb-3",children:"Career guidance shouldn\'t depend on a family\'s budget \u2014 and it should never be paid for by colleges. Every feature is free for every student, funded by nothing but honesty."}),r.jsxs("div",{className:"grid-2",children:[r.jsxs(C,{className:"pricing-card",style:{border:"2px solid var(--brand)"},children:[r.jsxs("div",{className:"row",children:[r.jsxs("div",{children:[r.jsx("h3",{children:"Everything"}),r.jsx("p",{className:"tiny",children:"One plan \xB7 no hidden tiers"})]}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:"brand",children:"Free forever"})]}),r.jsxs("div",{className:"price",children:["\u20B90 ",r.jsx("small",{children:"always"})]}),r.jsxs("div",{className:"tick-list",children:[r.jsxs("div",{children:[r.jsx(q,{})," 60-question assessment"]}),r.jsxs("div",{children:[r.jsx(q,{})," Personality & aptitude profile"]}),r.jsxs("div",{children:[r.jsx(q,{})," All career matches + wildcards, fully explained"]}),r.jsxs("div",{children:[r.jsx(q,{})," Personal roadmap with exam timeline"]}),r.jsxs("div",{children:[r.jsx(q,{})," PDF export & parent sharing"]}),r.jsxs("div",{children:[r.jsx(q,{})," Ask-a-Professional access"]}),r.jsxs("div",{children:[r.jsx(q,{})," 2-week & 4-week check-ins"]})]}),r.jsx("div",{className:"spacer"}),r.jsx(z,{as:"a",href:"/signin",block:!0,children:"Create your free account"})]}),r.jsxs(C,{className:"pricing-card",children:[r.jsxs("div",{children:[r.jsx("h3",{children:"Why free?"}),r.jsx("p",{className:"tiny",children:"The honest answer"})]}),r.jsxs("div",{className:"tick-list",style:{marginTop:10},children:[r.jsxs("div",{children:[r.jsx(q,{})," Zero commission from colleges \u2014 we answer to students only"]}),r.jsxs("div",{children:[r.jsx(q,{})," No paid rankings, no sponsored placements"]}),r.jsxs("div",{children:[r.jsx(q,{})," Every fact dated and sourced \u2014 verify anything"]}),r.jsxs("div",{children:[r.jsx(q,{})," Parents see everything through shared roadmaps"]})]}),r.jsx("p",{className:"small mt-3",children:"A platform that takes money from colleges can\'t tell you which college is right for you. We can, because we don\'t."})]})]})]}),r.jsxs("section",{className:"landing-section",style:{paddingBottom:70},children:[r.jsxs(C,{className:"center",style:{padding:"44px 24px",background:"var(--brand)",borderColor:"var(--brand)"},children:[r.jsxs("h2",{style:{color:"#fff"},children:["Stop collecting opinions.",r.jsx("br",{}),"Start following one plan."]}),r.jsx("p",{className:"mt-2",style:{color:"rgba(255,255,255,.75)",maxWidth:460,margin:"10px auto 0"},children:"15 minutes of honest answers. One roadmap you can commit to \u2014 reviewed by humans where it matters, grounded in sources everywhere."}),r.jsxs(z,{as:"a",href:"/signin",size:"lg",variant:"secondary",className:"mt-3",style:{background:"#fff",borderColor:"#fff"},children:["Begin my compass ",r.jsx(Je,{})]})]}),r.jsxs("p",{className:"tiny faint center mt-3",children:["Demo build \xB7 ",r.jsx(K,{to:"/how-it-works",children:"How recommendations work"})," \xB7 Made with care for students who deserve better than guesswork"]})]})]})}function uv(){return r.jsxs(r.Fragment,{children:[r.jsx(ah,{}),r.jsxs("div",{className:"page page-narrow",children:[r.jsx("div",{className:"eyebrow",children:"Transparency"}),r.jsx("h1",{style:{fontSize:"1.9rem"},children:"How recommendations work"}),r.jsx("p",{className:"mb-3",children:"We believe you should be able to audit the machine that\'s advising your life. Here is exactly what happens under the hood."}),r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(Gi,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Layer 1 \u2014 a deterministic matcher"]}),r.jsx("p",{className:"small mt-1",children:"Your assessment produces a RIASEC personality profile (Realistic, Investigative, Artistic, Social, Enterprising, Conventional), aptitude scores, and rated interests. Each career in our knowledge base carries vectors for the same dimensions. The engine computes a weighted match \u2014 personality fit (40%), subjects (18%), interests (16%), goals (12%), aptitude (8%), practical feasibility (6%) \u2014 and shows you the contribution of every factor in the decision log. This layer is fully reproducible and runs even if the AI layer is unavailable."})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(An,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Layer 2 \u2014 a grounded narrative"]}),r.jsx("p",{className:"small mt-1",children:`A language model (or our local generator when no LLM is configured) writes the "Why this fits you" narrative \u2014 but it can only use facts from our verified knowledge base. If a fact isn\'t in the base, it says "to be confirmed with a mentor" rather than guessing. The deterministic scores always win; the narrative explains, never overrides.`})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(rt,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Humans where it matters"]}),r.jsxs("p",{className:"small mt-1",children:["Recommendations that suggest high-impact steps \u2014 a gap year, a stream change \u2014 are held for counsellor review ",r.jsx("em",{children:"before"})," you see them. Anything you flag goes to the same review queue."]})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(Hs,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," What we will never do"]}),r.jsx("p",{className:"small mt-1",children:"Take commissions from colleges to steer you. Let advertising influence a match. Sell your data. A small fee from students is our only revenue \u2014 our incentive is giving you the right answer, not the profitable one."})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(fl,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Your data, your rights (DPDP-aligned)"]}),r.jsx("p",{className:"small mt-1",children:"Export everything we hold about you as JSON, delete your account outright, control what parents see. Under-18 accounts require verifiable parental consent. Every export and deletion is logged."})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(vl,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Honest limits"]}),r.jsx("p",{className:"small mt-1",children:"This is guidance, not a verdict. Salaries are ranges, dates change \u2014 always verify on official websites before committing money or years. Our knowledge base is curated, not infinite, and we date every fact so you can see how fresh it is."})]})]})]})]})}function dv(){const{refresh:e}=Se(),{toast:t}=te(),n=Vn(),s=Vt(),[l,a]=x.useState("signin"),[i,o]=x.useState(""),[c,d]=x.useState(""),[f,p]=x.useState({name:"",role:"student",isMinor:!1,consent:!1,referralCode:"",parentConsentCode:""}),[g,y]=x.useState(!1),[j,w]=x.useState(""),[N,h]=x.useState(null);x.useEffect(()=>{$("/api/auth/demo").then(h).catch(()=>h(null))},[]);const u=(v,k)=>{a("signin"),o(v),d(k),w("")},m=async()=>{var v;y(!0),w("");try{if(l==="signin"){if(i.trim().length<5||!c)throw new Error("Enter your email/phone and password.");const k=await W("/api/auth/signin",{identifier:i,password:c});k.token&&gc(k.token),await e(),t(`Welcome back, ${k.user.name.split(" ")[0]}!`),n(((v=s.state)==null?void 0:v.from)||(k.user.role==="admin"?"/app/admin":k.user.role==="mentor"?"/app/mentor":k.user.role==="parent"?"/app/progress":"/app/home"))}else{if(f.name.trim().length<2)throw new Error("Please enter your name.");if(c.length<8)throw new Error("Passwords need at least 8 characters, with a letter and a number.");if(f.role==="student"&&f.isMinor&&!f.consent)throw new Error("A parent/guardian must consent for students under 18.");if(f.role==="parent"&&!f.parentConsentCode.trim())throw new Error("Parents join with the consent code from their child\'s account.");const k=await W("/api/auth/signup",{name:f.name.trim(),identifier:i,password:c,role:f.role,isMinor:f.isMinor,consent:f.consent,referralCode:f.referralCode,parentConsentCode:f.parentConsentCode});k.token&&gc(k.token),await e(),t(`Welcome to Career Compass, ${k.user.name.split(" ")[0]}! Everything here is free \u2014 start with your profile.`),k.consentCode&&t(`Your parent consent code: ${k.consentCode} \u2014 share it from Account.`),n(k.user.role==="parent"?"/app/progress":"/app/profile")}}catch(k){w(k.message)}finally{y(!1)}};return r.jsxs("div",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",background:"var(--bg)"},children:[r.jsx("header",{className:"topbar",children:r.jsx("div",{className:"topbar-inner",children:r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]})})}),r.jsx("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"},children:r.jsxs("div",{style:{width:"100%",maxWidth:460},children:[r.jsxs(C,{children:[r.jsxs("div",{className:"center mb-2",children:[r.jsx(ln,{width:44,height:44}),r.jsx("h2",{className:"mt-1",children:l==="signin"?"Welcome back":"Create your free account"}),r.jsx("p",{className:"small",children:l==="signin"?"Sign in with your email or phone and password.":"Email or phone + password. Everything on Career Compass is free."})]}),j&&r.jsxs("div",{className:"alert alert-danger mb-2",children:[r.jsx(vl,{}),r.jsx("div",{children:j})]}),r.jsxs("div",{className:"stack",children:[l==="signup"&&r.jsx($e,{label:"Your name",children:r.jsx("input",{className:"input input-lg",placeholder:"e.g. Aarav Sharma",value:f.name,onChange:v=>p(k=>({...k,name:v.target.value}))})}),r.jsx($e,{label:"Email or 10-digit mobile number",children:r.jsx("input",{className:"input input-lg",placeholder:"you@example.com  \xB7  9876543210",value:i,onChange:v=>o(v.target.value),autoFocus:!0})}),r.jsx($e,{label:"Password",hint:l==="signin"?void 0:"At least 8 characters, with a letter and a number",children:r.jsx("input",{className:"input input-lg",type:"password",placeholder:l==="signin"?"Your password":"Choose a password",value:c,onChange:v=>d(v.target.value),onKeyDown:v=>v.key==="Enter"&&m()})}),l==="signup"&&r.jsxs(r.Fragment,{children:[r.jsx($e,{label:"I am a",children:r.jsxs("div",{className:"row",children:[r.jsx("span",{className:`chip ${f.role==="student"?"on":""}`,onClick:()=>p(v=>({...v,role:"student"})),children:"\u{1F393} Student"}),r.jsx("span",{className:`chip ${f.role==="parent"?"on":""}`,onClick:()=>p(v=>({...v,role:"parent"})),children:"\u{1F464} Parent"})]})}),f.role==="student"&&r.jsxs(r.Fragment,{children:[r.jsxs("label",{className:"check-item",style:{cursor:"pointer"},children:[r.jsx("span",{className:`checkbox ${f.isMinor?"done":""}`,children:r.jsx(q,{})}),r.jsx("span",{className:"check-text small",onClick:v=>{v.preventDefault(),p(k=>({...k,isMinor:!k.isMinor}))},children:"I am under 18 (a parent will be linked with a consent code)"}),r.jsx("input",{type:"checkbox",style:{display:"none"},checked:f.isMinor,onChange:v=>p(k=>({...k,isMinor:v.target.checked}))})]}),f.isMinor&&r.jsxs("label",{className:"check-item",style:{cursor:"pointer"},children:[r.jsx("span",{className:`checkbox ${f.consent?"done":""}`,children:r.jsx(q,{})}),r.jsx("span",{className:"check-text small",onClick:v=>{v.preventDefault(),p(k=>({...k,consent:!k.consent}))},children:"My parent/guardian has agreed to my using Career Compass (required under India\'s DPDP Act)"}),r.jsx("input",{type:"checkbox",style:{display:"none"},checked:f.consent,onChange:v=>p(k=>({...k,consent:v.target.checked}))})]}),r.jsx($e,{label:"Referral code (optional)",children:r.jsx("input",{className:"input",placeholder:"CC-XXXXXX",value:f.referralCode,onChange:v=>p(k=>({...k,referralCode:v.target.value}))})})]}),f.role==="parent"&&r.jsx($e,{label:"Consent code from your child",hint:"Your child finds this in their Account page.",children:r.jsx("input",{className:"input",placeholder:"PC-XXXXXX",value:f.parentConsentCode,onChange:v=>p(k=>({...k,parentConsentCode:v.target.value}))})})]}),r.jsx(z,{block:!0,size:"lg",disabled:g||i.trim().length<5||!c,onClick:m,children:g?r.jsx($t,{}):l==="signin"?r.jsxs(r.Fragment,{children:["Sign in ",r.jsx(Je,{})]}):"Create account"}),r.jsx("div",{className:"center small",children:l==="signin"?r.jsxs(r.Fragment,{children:["New here? ",r.jsx("a",{href:"#",onClick:v=>{v.preventDefault(),a("signup"),w("")},children:"Create a free account"})]}):r.jsxs(r.Fragment,{children:["Already have an account? ",r.jsx("a",{href:"#",onClick:v=>{v.preventDefault(),a("signin"),w("")},children:"Sign in"})]})})]}),(N==null?void 0:N.demo)&&r.jsxs("div",{className:"card-2 card-pad tiny",style:{marginTop:12},children:[r.jsx("strong",{children:"Demo accounts"})," (tap to fill):",N.accounts.map(v=>r.jsxs("div",{className:"row mt-1",style:{cursor:"pointer"},onClick:()=>u(v.email,v.password),children:[r.jsx("code",{children:v.email}),r.jsx("span",{className:"faint",children:"\xB7"}),r.jsx("code",{children:v.password}),r.jsx("span",{className:"spacer"}),r.jsx("span",{className:"faint",children:v.role})]},v.email))]})]}),r.jsxs("p",{className:"tiny faint center mt-2",children:["By continuing you agree to honest guidance, dated sources, and no college commissions. ",r.jsx(K,{to:"/how-it-works",children:"How recommendations work \u2192"})]})]})})]})}function hv(){var p,g,y,j;const{me:e,user:t}=Se(),n=Vn(),[s,l]=x.useState(null),[a,i]=x.useState(null),[o,c]=x.useState(null);if(x.useEffect(()=>{(t==null?void 0:t.role)==="student"&&($("/api/profile").then(w=>l(w)).catch(()=>{}),$("/api/recommendations").then(w=>i(w)).catch(()=>{}),$("/api/roadmap").then(w=>c(w.roadmap)).catch(()=>{}))},[t]),(t==null?void 0:t.role)==="parent")return r.jsx(fv,{});if((t==null?void 0:t.role)==="mentor")return n("/app/mentor"),null;if((t==null?void 0:t.role)==="admin")return n("/app/admin"),null;const d=((p=t==null?void 0:t.name)==null?void 0:p.split(" ")[0])||"there",f=!(s!=null&&s.hasProfile)&&!((g=s==null?void 0:s.profile)!=null&&g.class_level)?{n:1,label:"Build your profile",to:"/app/profile",desc:"Two minutes: subjects, interests, goals, constraints."}:e!=null&&e.assessmentDone?a!=null&&a.has_any?(o==null?void 0:o.status)!=="ready"?{n:4,label:"Create your roadmap",to:"/app/roadmap",desc:`Pick a career and get a dated, step-by-step plan. All ${a.matches.length} matches are free, forever.`}:{n:5,label:"Follow your roadmap",to:"/app/roadmap",desc:`${o.progress.done}/${o.progress.total} steps done. Check-ins keep you honest.`}:{n:3,label:"Generate your matches",to:"/app/results",desc:"See which careers fit \u2014 and exactly why."}:{n:2,label:"Take the assessment",to:"/app/assessment",desc:"60 questions \xB7 ~15 minutes \xB7 save and resume anytime."};return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Your compass"}),r.jsxs("h1",{style:{fontSize:"1.7rem"},children:["Hi ",d," \u{1F44B}"]}),r.jsx("p",{className:"small",children:(y=s==null?void 0:s.profile)!=null&&y.class_level?`${s.profile.class_level} \xB7 ${s.profile.stream||"stream not set"}`:"Let\'s get you oriented."})]}),r.jsx("span",{className:"spacer"}),(t==null?void 0:t.referral_code)&&r.jsxs("div",{className:"card-2 card-pad tiny",style:{maxWidth:250},children:[r.jsx("strong",{children:"Your referral code"}),r.jsx("div",{style:{fontFamily:"ui-monospace,monospace",fontSize:"1rem",color:"var(--brand-2)",fontWeight:700},children:t.referral_code}),r.jsx("span",{className:"faint",children:"Word-of-mouth is how trust spreads."})]})]}),r.jsx(C,{style:{background:"var(--brand)",borderColor:"var(--brand)",color:"#fff"},children:r.jsxs("div",{className:"row",style:{alignItems:"center"},children:[r.jsxs("div",{style:{flex:1,minWidth:220},children:[r.jsx("div",{className:"tiny",style:{opacity:.8,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"},children:"Next step"}),r.jsx("h3",{style:{color:"#fff",fontSize:"1.35rem",margin:"4px 0"},children:f.label}),r.jsx("p",{className:"small",style:{color:"rgba(255,255,255,.8)"},children:f.desc}),r.jsxs(z,{variant:"secondary",className:"mt-2",style:{background:"#fff",borderColor:"#fff"},as:"a",href:f.to,children:[f.n===6?"Open roadmap":"Continue"," ",r.jsx(Je,{})]})]}),r.jsx("div",{className:"center",style:{display:"none"},children:r.jsxs("div",{style:{width:84,height:84,borderRadius:"50%",border:"3px solid rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.9rem",fontFamily:"var(--font-display)"},children:[f.n,r.jsx("span",{style:{fontSize:".9rem",opacity:.6},children:"/6"})]})})]})}),r.jsxs("div",{className:"grid-3",children:[r.jsxs(C,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(fl,{style:{color:"var(--brand-2)"}})," ",r.jsx("strong",{children:"Profile"})]}),r.jsxs("div",{className:"stat",children:[r.jsxs("span",{className:"n",children:[(s==null?void 0:s.completeness)??0,"%"]}),r.jsx("span",{className:"l",children:"complete"})]}),r.jsx(cn,{value:(s==null?void 0:s.completeness)??0}),r.jsx("p",{className:"tiny faint",children:"Richer profile \u2192 sharper matches."}),r.jsx(K,{to:"/app/profile",className:"small",children:"Edit profile \u2192"})]}),r.jsxs(C,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(Gi,{style:{color:"var(--brand-2)"}})," ",r.jsx("strong",{children:"Assessment"})]}),r.jsxs("div",{className:"stat",children:[r.jsx("span",{className:"n",children:e!=null&&e.assessmentDone?"Done \u2713":"Pending"}),r.jsx("span",{className:"l",children:"60 questions"})]}),r.jsx("p",{className:"tiny faint",children:e!=null&&e.assessmentDone?"Aptitude \xB7 personality \xB7 interests \u2014 scored.":"Aptitude \xB7 personality \xB7 interests."}),r.jsx(K,{to:"/app/assessment",className:"small",children:e!=null&&e.assessmentDone?"Review results \u2192":"Start assessment \u2192"})]}),r.jsxs(C,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(At,{style:{color:"var(--brand-2)"}})," ",r.jsx("strong",{children:"Roadmap"})]}),r.jsxs("div",{className:"stat",children:[r.jsx("span",{className:"n",children:(o==null?void 0:o.status)==="ready"?`${o.progress.done}/${o.progress.total}`:(o==null?void 0:o.status)??"\u2014"}),r.jsx("span",{className:"l",children:"steps completed"})]}),r.jsx("p",{className:"tiny faint",children:o!=null&&o.career?o.career.title:"Generated after you pick a career."}),r.jsx(K,{to:"/app/roadmap",className:"small",children:"Open roadmap \u2192"})]})]}),(a==null?void 0:a.has_any)&&r.jsxs(C,{children:[r.jsxs("div",{className:"row mb-2",children:[r.jsx("h3",{children:"Your top match"}),r.jsx("span",{className:"spacer"}),r.jsx(K,{to:"/app/results",className:"small",children:"See all matches \u2192"})]}),a.matches[0]?a.matches[0].pending?r.jsxs("div",{className:"alert alert-warn",children:[r.jsx(rt,{}),r.jsx("div",{children:"This recommendation is under counsellor review (high-impact content). You\'ll see it as soon as a human checks it."})]}):r.jsxs("div",{className:"row",children:[r.jsx(gl,{score:a.matches[0].match_score}),r.jsxs("div",{style:{flex:1,minWidth:200},children:[r.jsx("div",{className:"match-title",children:a.matches[0].career.title}),r.jsxs("div",{className:"small muted",children:[(j=a.matches[0].career.summary)==null?void 0:j.slice(0,110),"\u2026"]}),r.jsx("div",{className:"row mt-1",children:r.jsxs(L,{tone:a.matches[0].confidence==="high"?"success":"brand",children:[a.matches[0].confidence," confidence"]})})]})]}):null]}),r.jsxs("div",{className:"row",style:{gap:10},children:[r.jsxs(K,{to:"/app/ask",className:"card card-pad",style:{flex:1,minWidth:200,textDecoration:"none"},children:[r.jsx(Ft,{style:{color:"var(--brand-2)"}}),r.jsx("div",{className:"match-title",style:{fontSize:"1rem"},children:"Ask a professional"}),r.jsx("p",{className:"tiny faint",children:"Verified mentors answer within 48 hours."})]}),r.jsxs(K,{to:"/app/explore",className:"card card-pad",style:{flex:1,minWidth:200,textDecoration:"none"},children:[r.jsx(bi,{style:{color:"var(--brand-2)"}}),r.jsx("div",{className:"match-title",style:{fontSize:"1rem"},children:"Explore careers"}),r.jsx("p",{className:"tiny faint",children:"57 careers \xB7 209 colleges \xB7 33 exams, all sourced & dated."})]})]})]})}function fv(){var n,s;const{me:e,user:t}=Se();return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Parent view"}),r.jsxs("h1",{style:{fontSize:"1.7rem"},children:["Welcome, ",(n=t==null?void 0:t.name)==null?void 0:n.split(" ")[0]]}),r.jsx("p",{className:"small",children:"You\'re the decision partner \u2014 here\'s what your child has shared with you."})]}),(s=e==null?void 0:e.sharedToMe)!=null&&s.length?r.jsx("div",{className:"stack",children:e.sharedToMe.map((l,a)=>r.jsxs(C,{className:"row",children:[r.jsx(At,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsxs("strong",{children:[l.student_name,"\'s roadmap \u2014 ",l.career_title]}),r.jsxs("div",{className:"small muted",children:["Status: ",l.rm_status]})]}),r.jsx(z,{as:"a",href:`/shared/${l.share_token}`,size:"sm",variant:"secondary",children:"View (read-only)"})]},a))}):r.jsxs(C,{className:"center",style:{padding:40},children:[r.jsx(bs,{width:38,height:38,style:{color:"var(--faint)"}}),r.jsx("h3",{className:"mt-2",children:"No roadmap shared yet"}),r.jsx("p",{className:"small mt-1",children:"When your child shares their roadmap, it appears here. They control sharing \u2014 you\'ll get the link the moment they do."})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Why parents trust this"}),r.jsx("p",{className:"small mt-1",children:"One wrong course choice costs years and lakhs. A roadmap your child actually follows \u2014 with exam timelines, a Plan B, and professionals to ask \u2014 is the cheapest insurance in education. And it\'s completely free."}),r.jsxs("p",{className:"small mt-2",children:["We take ",r.jsx("strong",{children:"zero commission from colleges"}),". Our only job is the right answer for your child."]})]})]})}function pv(){const{refresh:e}=Se(),{toast:t}=te(),[n,s]=x.useState(null),[l,a]=x.useState(null),[i,o]=x.useState(null),[c,d]=x.useState(!1),[f,p]=x.useState("");if(x.useEffect(()=>{$("/api/profile/meta").then(s),$("/api/profile").then(u=>{var m,v,k,E,_,M,V,R,pe,xt;a(u),o({class_level:((m=u.profile)==null?void 0:m.class_level)||"Class 12",stream:((v=u.profile)==null?void 0:v.stream)||"",subjects:((k=u.profile)==null?void 0:k.subjects)||{},strengths:((E=u.profile)==null?void 0:E.strengths)||[],skills:((_=u.profile)==null?void 0:_.skills)||[],goals:((M=u.profile)==null?void 0:M.goals)||[],budget:((V=u.profile)==null?void 0:V.budget)||"",city:((R=u.profile)==null?void 0:R.city)||"",willing_to_relocate:((pe=u.profile)==null?void 0:pe.willing_to_relocate)!==!1,target_year:((xt=u.profile)==null?void 0:xt.target_year)||new Date().getFullYear()+1})})},[]),!i||!n)return r.jsx("div",{className:"stack",children:r.jsx($t,{})});const g=(u,m)=>o(v=>({...v,subjects:{...v.subjects,[u]:m}})),y=u=>o(m=>({...m,goals:m.goals.includes(u)?m.goals.filter(v=>v!==u):[...m.goals,u]})),j=u=>o(m=>({...m,strengths:m.strengths.includes(u)?m.strengths.filter(v=>v!==u):[...m.strengths,u]})),w=()=>{const u=f.trim();u&&!i.skills.includes(u)&&i.skills.length<10&&o(m=>({...m,skills:[...m.skills,u]})),p("")},N=async()=>{d(!0);try{await bm("/api/profile",i);const u=await $("/api/profile");a(u),t(`Profile saved \u2014 ${u.completeness}% complete.`),e()}catch(u){t(u.message,"err")}finally{d(!1)}},h=[new Date().getFullYear()+1,new Date().getFullYear()+2,new Date().getFullYear()+3];return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Know me"}),r.jsx("h1",{style:{fontSize:"1.6rem"},children:"Your profile"}),r.jsx("p",{className:"small",children:"This feeds the matcher. Honest answers now \u2192 a roadmap you\'ll actually trust later."})]}),r.jsx("span",{className:"spacer"}),r.jsxs("div",{style:{width:150},children:[r.jsxs("div",{className:"tiny muted mb-1",children:[l.completeness,"% complete"]}),r.jsx(cn,{value:l.completeness})]})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Basics"}),r.jsxs("div",{className:"grid-2 mt-2",children:[r.jsx($e,{label:"Class level",children:r.jsx("select",{className:"input",value:i.class_level,onChange:u=>o(m=>({...m,class_level:u.target.value})),children:["Class 10","Class 11","Class 12","Just finished Class 12","Dropper / gap year"].map(u=>r.jsx("option",{children:u},u))})}),r.jsx($e,{label:"Current stream (or expected)",children:r.jsxs("select",{className:"input",value:i.stream,onChange:u=>o(m=>({...m,stream:u.target.value})),children:[r.jsx("option",{value:"",children:"Not decided yet"}),["Science","Commerce","Arts"].map(u=>r.jsx("option",{children:u},u))]})}),r.jsx($e,{label:"City",children:r.jsx("input",{className:"input",placeholder:"e.g. Gaya, Bihar",value:i.city,onChange:u=>o(m=>({...m,city:u.target.value}))})}),r.jsx($e,{label:"Target admission year",children:r.jsx("select",{className:"input",value:i.target_year,onChange:u=>o(m=>({...m,target_year:Number(u.target.value)})),children:h.map(u=>r.jsx("option",{value:u,children:u},u))})})]})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Subjects \u2014 how much do you enjoy them?"}),r.jsx("p",{className:"small mb-2",children:"1 = dislike, 5 = love it. Enjoyment predicts fit better than marks do."}),r.jsx("div",{className:"stack",style:{gap:10},children:n.subjects.map(u=>r.jsxs("div",{className:"row",children:[r.jsx("div",{style:{width:150,fontWeight:500,fontSize:".92rem"},children:u}),r.jsx("div",{className:"rate-row",style:{flex:1},children:[1,2,3,4,5].map(m=>r.jsx("button",{className:`rate-opt ${i.subjects[u]===m?"on":""}`,onClick:()=>g(u,i.subjects[u]===m?void 0:m),children:m},m))})]},u))})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Strengths \u2014 pick up to 5"}),r.jsx("div",{className:"row mt-2",children:n.subjects.map(u=>r.jsxs("span",{className:`chip ${i.strengths.includes(u)?"on":""}`,onClick:()=>j(u),children:[i.strengths.includes(u)&&r.jsx(q,{width:13,height:13})," ",u]},u))})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:["Goals \u2014 what matters to you? ",r.jsx("span",{className:"faint small",children:"(pick 2\u20134)"})]}),r.jsx("p",{className:"small mb-2",children:"Conflicting goals are okay. The engine surfaces the tension honestly instead of hiding it."}),r.jsx("div",{className:"row mt-2",children:n.goals.map(u=>r.jsxs("span",{className:`chip ${i.goals.includes(u.id)?"on":""}`,onClick:()=>y(u.id),children:[i.goals.includes(u.id)&&r.jsx(q,{width:13,height:13})," ",u.label]},u.id))})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Skills you already have"}),r.jsx("div",{className:"row mt-2",children:i.skills.map(u=>r.jsxs("span",{className:"chip on",children:[u,r.jsx("button",{onClick:()=>o(m=>({...m,skills:m.skills.filter(v=>v!==u)})),style:{border:0,background:"none",color:"inherit",cursor:"pointer",display:"flex"},children:r.jsx(Qi,{width:13,height:13})})]},u))}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("input",{className:"input",style:{flex:1,minWidth:180},placeholder:"e.g. Python basics, sketching, debating\u2026",value:f,onChange:u=>p(u.target.value),onKeyDown:u=>u.key==="Enter"&&(u.preventDefault(),w())}),r.jsxs(z,{variant:"secondary",size:"sm",onClick:w,children:[r.jsx(th,{})," Add"]})]})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Practical constraints"}),r.jsx("p",{className:"small mb-2",children:"Budget and mobility shape which plans are realistic \u2014 the matcher accounts for them (and suggests scholarships where needed)."}),r.jsxs("div",{className:"grid-2 mt-2",children:[r.jsx($e,{label:"Education budget per year",children:r.jsxs("select",{className:"input",value:i.budget,onChange:u=>o(m=>({...m,budget:u.target.value})),children:[r.jsx("option",{value:"",children:"Prefer not to say"}),n.budgets.map(u=>r.jsx("option",{value:u.id,children:u.label},u.id))]})}),r.jsx($e,{label:"Willing to relocate for the right college?",children:r.jsxs("div",{className:"row mt-1",children:[r.jsx("span",{className:`chip ${i.willing_to_relocate?"on":""}`,onClick:()=>o(u=>({...u,willing_to_relocate:!0})),children:"Yes, anywhere in India"}),r.jsx("span",{className:`chip ${i.willing_to_relocate?"":"on"}`,onClick:()=>o(u=>({...u,willing_to_relocate:!1})),children:"Prefer close to home"})]})})]})]}),r.jsxs("div",{className:"row",children:[r.jsx(z,{size:"lg",disabled:c,onClick:N,children:c?r.jsx($t,{}):r.jsxs(r.Fragment,{children:["Save profile ",r.jsx(q,{})]})}),r.jsxs(z,{size:"lg",variant:"secondary",as:"a",href:"/app/assessment",children:["Continue to assessment ",r.jsx(Je,{})]})]})]})}const jc={aptitude:"Aptitude",personality:"Personality",interest:"Career interests"},wc={R:["Realistic","Builder / doer \u2014 hands-on, practical"],I:["Investigative","Thinker / analyst \u2014 curious, evidence-driven"],A:["Artistic","Creator \u2014 expressive, original"],S:["Social","Helper \u2014 people-oriented, supportive"],E:["Enterprising","Leader \u2014 persuasive, takes charge"],C:["Conventional","Organizer \u2014 structured, detail-focused"]},mv={numeric:"Numeric",logical:"Logical",verbal:"Verbal",spatial:"Spatial"};function vv(){const{me:e,refresh:t}=Se(),{toast:n}=te(),[s,l]=x.useState(null),[a,i]=x.useState(0),[o,c]=x.useState({}),[d,f]=x.useState(!1),[p,g]=x.useState(!1),y=async()=>{const v=await $("/api/assessment");l(v),c(v.answers||{});const k=v.questions.findIndex(E=>{var _;return((_=v.answers)==null?void 0:_[E.id])==null});i(k===-1?v.questions.length-1:k)};if(x.useEffect(()=>{y()},[]),!s)return r.jsx("div",{className:"stack",children:r.jsx($t,{})});const j=s.questions[a],w=Object.keys(o).length,N=s.status==="completed"||!!s.results,h=async v=>{const k={...o,[j.id]:v};c(k);try{await W("/api/assessment/answer",{questionId:j.id,value:v})}catch(E){n(E.message,"err")}setTimeout(()=>i(E=>Math.min(E+1,s.questions.length-1)),150)},u=async()=>{f(!0);try{await W("/api/assessment/complete"),await t(),n("Assessment complete! Your profile is ready."),await y()}catch(v){n(v.message,"err")}finally{f(!1)}},m=async v=>{f(!0);try{await W("/api/assessment/demo-fill",{persona:v}),n("Demo answers filled \u2014 completing now."),await y(),g(!1)}catch(k){n(k.message,"err")}finally{f(!1)}};return N&&s.results?r.jsx(xv,{results:s.results}):r.jsxs("div",{className:"assessment-wrap",children:[r.jsxs("div",{className:"row mb-2",children:[r.jsxs(K,{to:"/app/home",className:"btn btn-ghost btn-sm",children:[r.jsx(Bs,{})," Home"]}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"small muted",children:[jc[j.sub_test]," \xB7 ",w,"/",s.questions.length]})]}),r.jsx(cn,{value:w/s.questions.length*100}),r.jsxs(C,{className:"mt-3 fade-in",children:[r.jsxs("div",{className:"eyebrow",children:[jc[j.sub_test]," \xB7 Q",a+1]}),r.jsx("h3",{style:{fontSize:"1.25rem",margin:"8px 0 18px",minHeight:56},children:j.text}),j.options?r.jsx("div",{children:j.options.map((v,k)=>r.jsxs("button",{className:`option-btn ${o[j.id]===k?"on":""}`,onClick:()=>h(k),children:[r.jsx("span",{className:"option-key",children:String.fromCharCode(65+k)})," ",v]},k))}):r.jsxs("div",{children:[r.jsx("div",{className:"rate-row",children:[1,2,3,4,5].map(v=>r.jsx("button",{className:`rate-opt ${o[j.id]===v?"on":""} ${o[j.id]===v?"":"rate-lg"}`,style:{padding:"16px 2px"},onClick:()=>h(v),children:v},v))}),r.jsxs("div",{className:"rate-caption",children:[r.jsx("span",{children:"Not at all"}),r.jsx("span",{children:"Somewhat"}),r.jsx("span",{children:"Very much"})]})]})]},j.id),r.jsxs("div",{className:"row mt-3",children:[r.jsxs(z,{variant:"secondary",size:"sm",disabled:a===0,onClick:()=>i(v=>v-1),children:[r.jsx(Bs,{})," Back"]}),a<s.questions.length-1&&r.jsxs(z,{variant:"ghost",size:"sm",onClick:()=>i(v=>v+1),children:["Skip for now ",r.jsx(Je,{})]}),r.jsx("span",{className:"spacer"}),w>=Math.ceil(s.questions.length*.9)&&r.jsx(z,{size:"sm",disabled:d,onClick:u,children:d?r.jsx($t,{}):r.jsxs(r.Fragment,{children:["Complete assessment ",r.jsx(q,{})]})})]}),r.jsx("div",{className:"mt-3",children:p?r.jsxs(C,{className:"card-2",children:[r.jsx("strong",{className:"small",children:"Auto-fill with a persona"}),r.jsx("p",{className:"tiny faint mb-2",children:"For reviewers who want to reach the results instantly."}),r.jsx("div",{className:"row",children:[["tech","\u{1F4BB} Tech-inclined"],["healer","\u{1FA7A} Care-oriented"],["creator","\u{1F3A8} Creative"],["leader","\u{1F4C8} Business/leader"]].map(([v,k])=>r.jsx("span",{className:"chip",onClick:()=>m(v),children:k},v))})]}):r.jsx("button",{className:"btn btn-ghost btn-sm",onClick:()=>g(!0),children:"\u26A1 In a hurry? (demo auto-fill)"})}),r.jsx("p",{className:"tiny faint center mt-3",children:"Your answers autosave. No timers \u2014 this is about honesty, not speed."})]})}function xv({results:e}){const t=Object.entries(e.riasec).sort((s,l)=>l[1]-s[1]),n=t.slice(0,2).map(([s])=>s).join(" + ");return r.jsxs("div",{className:"assessment-wrap",children:[r.jsxs("div",{className:"center mb-3",children:[r.jsx("div",{className:"eyebrow",children:"Assessment complete"}),r.jsxs("h1",{style:{fontSize:"1.7rem"},children:["Your profile: ",n]}),r.jsx("p",{className:"small",children:"Top two traits shape your strongest matches \u2014 but every dimension counts."})]}),r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Personality (RIASEC)"}),r.jsx("div",{className:"stack",style:{gap:10},children:t.map(([s,l])=>r.jsxs("div",{className:"row",style:{gap:12},children:[r.jsxs("div",{style:{width:200,flex:"none"},children:[r.jsx("strong",{className:"small",children:wc[s][0]}),r.jsx("div",{className:"tiny faint",children:wc[s][1]})]}),r.jsx("div",{style:{flex:1},children:r.jsx(cn,{value:l})}),r.jsx("strong",{className:"small",style:{width:34,textAlign:"right"},children:l})]},s))})]}),r.jsxs(C,{className:"mt-3",children:[r.jsx("h3",{className:"mb-2",children:"Aptitude"}),r.jsx("div",{className:"row",style:{gap:14},children:Object.entries(e.aptitude).map(([s,l])=>r.jsx("div",{className:"center",style:{flex:1},children:r.jsx(gl,{score:Math.round(l*100),size:70,label:mv[s]})},s))}),r.jsx("p",{className:"tiny faint mt-2",children:"A short snapshot, not an IQ test \u2014 it feeds the skill-gap check in your matches."})]}),r.jsx("div",{className:"row mt-3",children:r.jsxs(z,{size:"lg",as:"a",href:"/app/results",children:["See my career matches ",r.jsx(Je,{})]})}),r.jsx("p",{className:"tiny faint center mt-2",children:"Your answers stay on record \u2014 matches and roadmaps build on this profile."})]})}function gv(){var g;const{user:e,refresh:t}=Se(),{toast:n}=te(),[s,l]=x.useState(null),[a,i]=x.useState(!1),[o,c]=x.useState(null),d=async()=>{try{l(await $("/api/recommendations"))}catch(y){l({error:y.message})}};if(x.useEffect(()=>{d()},[]),s!=null&&s.error)return r.jsx(we,{title:"Complete your assessment first",body:s.error,action:r.jsx(z,{as:"a",href:"/app/assessment",children:"Go to assessment"})});if(!s)return r.jsxs("div",{className:"stack",children:[r.jsx(B,{}),r.jsx(B,{}),r.jsx(B,{})]});const f=async()=>{var y;i(!0);try{const j=await W("/api/recommendations/generate");n(`${j.count} matches generated${(y=j.aiModes)!=null&&y.includes("fallback")?" (AI fallback mode)":""}.`),await d()}catch(j){n(j.message,"err")}finally{i(!1)}},p=s.has_any;return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Your matches"}),r.jsxs("h1",{style:{fontSize:"1.6rem"},children:["Careers that fit ",(g=e==null?void 0:e.name)==null?void 0:g.split(" ")[0]]}),r.jsx("p",{className:"small",children:"Top 3 + 2 wildcards. Converge, don\'t overwhelm \u2014 one roadmap beats fifty browser tabs."})]}),r.jsx("span",{className:"spacer"}),p&&!a&&r.jsxs(z,{variant:"secondary",size:"sm",onClick:f,children:[r.jsx(Ar,{})," Recompute"]})]}),!p&&r.jsx(we,{icon:r.jsx(An,{width:44,height:44}),title:a?"Computing your matches\u2026":"Ready when you are",body:a?"Layer 1 (deterministic) + Layer 2 (narrative) are working on your profile.":"Generate your personalised matches from the assessment you just completed.",action:r.jsx(z,{size:"lg",disabled:a,onClick:f,children:a?r.jsx($t,{}):r.jsxs(r.Fragment,{children:["Generate my matches ",r.jsx(An,{})]})})}),p&&s.matches.map(y=>r.jsx(yv,{m:y,onWhy:()=>c(y),onChanged:d},y.id)),o&&r.jsx(jv,{m:o,onClose:()=>c(!1),onChanged:d})]})}function yv({m:e,onWhy:t,onChanged:n}){var c,d;const{toast:s}=te(),[l,a]=x.useState(e.your_feedback||0);if(e.pending)return r.jsx(C,{className:"match-card",children:r.jsxs("div",{className:"row",children:[r.jsx(rt,{style:{color:"var(--warn)"}}),r.jsxs("div",{children:[r.jsx("div",{className:"match-title",children:"A match is under counsellor review"}),r.jsx("p",{className:"small",children:"This recommendation includes a high-impact step (like a stream change or gap-year consideration), so a human checks it before you see it. That\'s the trust layer working."})]})]})});const i=async f=>{const p=l===f?0:f;if(a(p),p!==0)try{await W(`/api/recommendations/${e.id}/feedback`,{thumbs:p}),s(p===1?"Noted \u2014 the engine will weight this career higher next time.":"Noted \u2014 the engine will steer away from this. Honest signals beat polite nods."),n==null||n()}catch(g){s(g.message,"err")}},o=async()=>{const f=window.prompt("What looks wrong? (a counsellor will review)");if(f!=null)try{await W(`/api/recommendations/${e.id}/flag`,{reason:f}),s("Flagged \u2014 thank you. Trust is the product.")}catch(p){s(p.message,"err")}};return r.jsxs(C,{className:"match-card",children:[e.kind==="wildcard"&&r.jsx("div",{className:"row",children:r.jsxs(L,{tone:"accent",children:[r.jsx(An,{})," Wildcard \u2014 a direction worth one honest look"]})}),r.jsxs("div",{className:"match-head",children:[r.jsx(gl,{score:e.match_score}),r.jsxs("div",{style:{flex:1,minWidth:180},children:[r.jsxs("div",{className:"row",children:[r.jsxs("span",{className:"faint small",style:{fontWeight:700},children:["#",e.rank]}),r.jsx("div",{className:"match-title",children:e.career.title})]}),r.jsxs("div",{className:"row mt-1",children:[r.jsx(sv,{level:e.confidence}),r.jsxs(L,{tone:"muted",children:[e.career.growth," outlook"]}),e.career.emerging===1&&r.jsx(L,{tone:"info",children:"Emerging"})]})]}),r.jsx("div",{style:{textAlign:"right"},className:"tiny faint",children:(c=e.career.education)==null?void 0:c[0]})]}),r.jsxs(r.Fragment,{children:[r.jsx("div",{className:"why-box",children:e.rationale}),r.jsx("div",{className:"row",style:{gap:8},children:(d=e.evidence)==null?void 0:d.slice(0,2).map((f,p)=>r.jsxs("span",{className:"source-tag",children:[r.jsx(rt,{width:12,height:12})," ",f.fact.slice(0,60),"\u2026 \xB7 as of ",new Date(f.as_of).toLocaleDateString("en-IN",{month:"short",year:"numeric"})]},p))})]}),r.jsxs("div",{className:"row",children:[r.jsxs(z,{variant:"secondary",size:"sm",onClick:t,children:[r.jsx(Yi,{})," Why this recommendation?"]}),"}",r.jsxs(z,{as:"a",href:`/app/explore/careers/${e.career.slug}`,variant:"ghost",size:"sm",children:["Explore ",r.jsx(Je,{})]}),r.jsx("span",{className:"spacer"}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34,borderColor:l===1?"var(--success)":void 0,color:l===1?"var(--success)":void 0},title:"This fits",onClick:()=>i(1),children:r.jsx(tv,{width:15,height:15})}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34,borderColor:l===-1?"var(--danger)":void 0,color:l===-1?"var(--danger)":void 0},title:"This doesn\'t fit",onClick:()=>i(-1),children:r.jsx(nv,{width:15,height:15})}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34},title:"Flag for review",onClick:o,children:r.jsx(eh,{width:15,height:15})})]})]})}function jv({m:e,onClose:t,onChanged:n}){var s,l;return r.jsx(xl,{open:!0,onClose:t,title:`Why ${e.career.title}?`,wide:!0,children:r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"alert alert-info",children:[r.jsx(ml,{}),r.jsx("div",{children:"Every factor that moved this match, in plain language. The same log is stored server-side \u2014 you can export it with your data anytime."})]}),(s=e.decision_log)==null?void 0:s.map((a,i)=>r.jsxs("div",{className:"log-item",children:[r.jsx("span",{className:"log-label",children:a.label}),r.jsx("span",{className:"small",children:a.detail})]},i)),r.jsx("div",{className:"divider"}),r.jsx("h3",{children:"Evidence behind the facts"}),(l=e.evidence)==null?void 0:l.map((a,i)=>r.jsxs("div",{className:"log-item",children:[r.jsx("span",{className:"small",children:a.fact}),r.jsx(qt,{source:a.source,asOf:a.as_of})]},i)),r.jsx("p",{className:"tiny faint",children:"Guidance, not a verdict \u2014 test it with a mentor conversation and your own research."})]})})}const wv=[{id:"careers",label:"Careers",icon:lh},{id:"courses",label:"Courses",icon:Vs},{id:"colleges",label:"Colleges",icon:Ki},{id:"exams",label:"Exams",icon:pl}],Qa="cc-compare";function Nv(){const[e,t]=x.useState("careers"),[n,s]=x.useState(""),[l,a]=x.useState(""),[i,o]=x.useState(1),[c,d]=x.useState(null),[f,p]=x.useState(()=>JSON.parse(localStorage.getItem(Qa)||"{}")),{user:g}=Se();x.useEffect(()=>{d(null),a(""),o(1);const N=new URLSearchParams;n&&N.set("search",n),l&&e==="careers"&&N.set("stream",l),l&&e==="colleges"&&N.set("type",l),l&&e==="exams"&&N.set("level",l),N.set("page",String(i)),$(`/api/catalog/${e}?${N}`).then(d).catch(()=>d({items:[]}))},[e,n,l,i]);const y=(N,h)=>{p(u=>{const m=(u[e]||[]).filter(k=>k.slug!==N),v={...u,[e]:[...m,{slug:N,title:h}].slice(-3)};return localStorage.setItem(Qa,JSON.stringify(v)),v})},j=f[e]||[],w={careers:["Science","Commerce","Arts"],colleges:["IIT","NIT","IIIT","AIIMS","National Law University","Central University","Private","Government"],exams:["National","Institute","State"],courses:[]}[e];return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Knowledge base"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Explore & compare"}),r.jsx("p",{className:"small",children:"Every fact carries a source and an as-of date. Stale facts get flagged \u2014 by you and by us."})]}),r.jsx("div",{className:"tabs",children:wv.map(N=>r.jsx("button",{className:e===N.id?"on":"",onClick:()=>t(N.id),children:N.label},N.id))}),r.jsxs("div",{className:"row",children:[r.jsxs("div",{style:{position:"relative",flex:1,minWidth:200},children:[r.jsx(bi,{style:{position:"absolute",left:12,top:12,color:"var(--faint)"}}),r.jsx("input",{className:"input",style:{paddingLeft:38},placeholder:`Search ${e}\u2026`,value:n,onChange:N=>s(N.target.value)})]}),w.length>0&&r.jsxs("select",{className:"input",style:{maxWidth:210},value:l,onChange:N=>a(N.target.value),children:[r.jsxs("option",{value:"",children:["All ",e==="careers"?"streams":"types"]}),w.map(N=>r.jsx("option",{value:N,children:N},N))]}),j.length>=2&&r.jsxs(z,{as:"a",href:`/app/compare/${e}`,size:"sm",variant:"secondary",children:[r.jsx(Hs,{})," Compare (",j.length,")"]})]}),c?r.jsxs(r.Fragment,{children:[r.jsxs("p",{className:"tiny faint",children:[c.total," ",e," ",c.pages>1&&`\xB7 page ${c.page}/${c.pages}`]}),r.jsx("div",{className:"grid-2",children:c.items.map(N=>{const h=j.some(u=>u.slug===N.slug);return r.jsxs(C,{className:"step-card",style:{cursor:"pointer"},onClick:()=>window.location.href=`/app/explore/${e}/${N.slug}`,children:[r.jsxs("div",{className:"row",children:[e==="careers"&&r.jsx("strong",{style:{fontSize:"1.02rem"},children:N.title}),e!=="careers"&&r.jsx("strong",{style:{fontSize:"1.02rem"},children:N.name}),r.jsx("span",{className:"spacer"}),N.your_match!=null&&r.jsxs(L,{tone:"brand",children:[Math.round(N.your_match),"% match"]}),N.emerging===1&&r.jsx(L,{tone:"info",children:"Emerging"})]}),r.jsxs("p",{className:"small",children:[(N.summary||N.about||`${N.city||""} ${N.type||""}`).slice(0,110),"\u2026"]}),r.jsxs("div",{className:"row",style:{gap:6},children:[e==="careers"&&r.jsx(L,{tone:"muted",children:N.salary_entry}),e==="colleges"&&r.jsx(L,{tone:"muted",children:N.city}),e==="exams"&&r.jsx(L,{tone:"muted",children:N.conducted_by}),e==="courses"&&r.jsx(L,{tone:"muted",children:N.duration})]}),r.jsxs("div",{className:"row",style:{marginTop:"auto",paddingTop:8},children:[r.jsx(qt,{source:N.source,asOf:N.as_of}),r.jsx("span",{className:"spacer"}),r.jsxs("button",{className:`chip ${h?"on":""}`,style:{padding:"4px 10px",fontSize:".74rem"},onClick:u=>{u.stopPropagation(),y(N.slug,N.title||N.name)},children:[r.jsx(Hs,{width:12,height:12})," ",h?"Added":"Compare"]})]})]},N.slug)})}),c.items.length===0&&r.jsx(we,{title:"Nothing found",body:"Try a different search or filter."}),c.pages>1&&r.jsx("div",{className:"row",style:{justifyContent:"center"},children:r.jsx(z,{variant:"secondary",size:"sm",disabled:c.page<=1,onClick:()=>{}})})]}):r.jsxs("div",{className:"stack",children:[r.jsx(B,{}),r.jsx(B,{}),r.jsx(B,{})]})]})}function kv(){var f,p,g,y,j,w,N;const{type:e,slug:t}=Vi(),{user:n}=Se(),{toast:s}=te(),[l,a]=x.useState(null),[i,o]=x.useState(!1);if(x.useEffect(()=>{$(`/api/catalog/${e}/${t}`).then(h=>{a(h.item),o(!!h.item.favourited)}).catch(()=>a(null))},[e,t]),l===null)return r.jsxs("div",{className:"stack",children:[r.jsx(B,{h:200}),r.jsx(B,{h:120})]});if(l===!1)return r.jsx(we,{title:"Not found",body:"That page isn\'t in the knowledge base.",action:r.jsx(z,{as:"a",href:"/app/explore",children:"Back to Explore"})});const c=async()=>{if(n)try{i?await Xd(`/api/catalog/favourites/${e==="careers"?"career":e==="colleges"?"college":"exam"}/${l.id}`):await W("/api/catalog/favourites",{entity_type:e==="careers"?"career":e==="colleges"?"college":"exam",entity_id:l.id}),o(!i),s(i?"Removed from favourites.":"Saved \u2014 favourites nudge your future matches.")}catch(h){s(h.message,"err")}},d=l.title||l.name;return r.jsxs("div",{className:"stack",children:[r.jsxs(K,{to:"/app/explore",className:"btn btn-ghost btn-sm",style:{alignSelf:"flex-start"},children:[r.jsx(Bs,{})," Explore"]}),r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{className:"eyebrow",children:e}),r.jsx("h1",{style:{fontSize:"1.6rem"},children:d}),r.jsxs("div",{className:"row mt-1",children:[e==="careers"&&r.jsxs(r.Fragment,{children:[r.jsxs(L,{tone:"muted",children:["Entry: ",l.salary_entry]}),r.jsxs(L,{tone:"muted",children:["Senior: ",l.salary_senior]}),r.jsxs(L,{tone:l.growth==="high"?"success":"brand",children:[l.growth," outlook"]}),l.streams.map(h=>r.jsx(L,{tone:"brand",children:h},h))]}),e==="colleges"&&r.jsxs(r.Fragment,{children:[r.jsxs(L,{tone:"muted",children:[l.city,", ",l.state]}),r.jsx(L,{tone:"brand",children:l.type}),r.jsxs(L,{tone:"muted",children:["\u2248 ",l.approx_fees_per_year,"/yr"]}),l.nirf_rank&&r.jsxs(L,{tone:"success",children:["NIRF 2025 #",l.nirf_rank," \xB7 ",l.nirf_category]}),l.website&&r.jsxs("a",{href:`https://${l.website}`,target:"_blank",rel:"noreferrer",className:"chip on",children:[l.website," \u2197"]})]}),e==="exams"&&r.jsxs(r.Fragment,{children:[r.jsx(L,{tone:"brand",children:l.conducted_by}),r.jsx(L,{tone:"muted",children:l.level}),l.streams.map(h=>r.jsx(L,{tone:"muted",children:h},h))]}),e==="courses"&&r.jsxs(r.Fragment,{children:[r.jsx(L,{tone:"brand",children:l.level}),r.jsx(L,{tone:"muted",children:l.duration})]})]})]}),(e==="careers"||e==="colleges")&&n&&r.jsx("button",{className:"icon-btn",onClick:c,title:i?"Remove favourite":"Save to favourites",style:i?{color:"var(--accent)",borderColor:"var(--accent)"}:{},children:r.jsx(qd,{})})]}),r.jsxs(C,{children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(ml,{style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"Overview"})]}),r.jsx("p",{style:{color:"var(--ink)"},children:l.summary||l.about}),e==="careers"&&r.jsxs("p",{className:"small mt-2",children:[r.jsx("strong",{children:"A day in the life:"})," ",l.day_in_life]}),r.jsx("div",{className:"mt-2",children:r.jsx(qt,{source:l.source,asOf:l.as_of})})]}),e==="careers"&&r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"grid-2",children:[r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Key skills"}),r.jsx("div",{className:"row",children:l.skills.map(h=>r.jsx("span",{className:"chip",children:h},h))})]}),r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Subjects that feed this path"}),r.jsx("div",{className:"row",children:Object.keys(l.subjects).map(h=>r.jsx("span",{className:"chip",children:h},h))})]})]}),((f=l.exams_detail)==null?void 0:f.length)>0&&r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Entrance exams"}),r.jsx("div",{className:"stack",style:{gap:8},children:l.exams_detail.map(h=>{var u,m;return r.jsxs(K,{to:`/app/explore/exams/${h.slug}`,className:"card-2 card-pad row",style:{textDecoration:"none"},children:[r.jsx(pl,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:h.name}),r.jsxs("div",{className:"tiny muted",children:[h.conducted_by," \xB7 apply ",(u=h.timeline)==null?void 0:u.application_window," \xB7 exam ",(m=h.timeline)==null?void 0:m.exam_months]})]}),r.jsx(qt,{source:h.source,asOf:h.as_of})]},h.slug)})})]}),((p=l.courses)==null?void 0:p.length)>0&&r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Typical courses"}),r.jsx("div",{className:"row",children:l.courses.map(h=>r.jsx(K,{to:`/app/explore/courses/${h.slug}`,className:"chip",children:h.name},h.slug))})]}),((g=l.colleges)==null?void 0:g.length)>0&&r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Colleges to consider"}),r.jsx("div",{className:"stack",style:{gap:8},children:l.colleges.map(h=>r.jsxs(K,{to:`/app/explore/colleges/${h.slug}`,className:"card-2 card-pad row",style:{textDecoration:"none"},children:[r.jsx(Ki,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:h.name}),r.jsxs("div",{className:"tiny muted",children:[h.city," \xB7 ",h.type," \xB7 \u2248 ",h.approx_fees_per_year,"/yr"]})]}),r.jsx(qt,{source:h.source,asOf:h.as_of})]},h.slug))})]})]}),e==="exams"&&r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Timeline"}),r.jsx("div",{className:"grid-3",children:[["Applications",(y=l.timeline)==null?void 0:y.application_window],["Exam",(j=l.timeline)==null?void 0:j.exam_months],["Results",(w=l.timeline)==null?void 0:w.result_months],["Attempts",(N=l.timeline)==null?void 0:N.attempts]].map(([h,u])=>r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",style:{fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"},children:h}),r.jsx("strong",{children:u||"\u2014"})]},h))}),r.jsx("p",{className:"tiny faint mt-2",children:"Always confirm on the official website \u2014 exam bodies shuffle dates."})]})]})}function Sv(){const{type:e}=Vi();Vn();const[t,n]=x.useState(null),l=JSON.parse(localStorage.getItem(Qa)||"{}")[e]||[];if(x.useEffect(()=>{l.length>=2?W("/api/catalog/compare",{type:e,ids:l.map(i=>i.slug)}).then(n).catch(()=>{}):n({items:[]})},[e]),!t)return r.jsx("div",{className:"stack",children:r.jsx(B,{h:160})});if(t.items.length<2)return r.jsx(we,{title:"Pick 2\u20133 items to compare",body:"Go back to Explore and tap \'Compare\' on the cards you want side by side.",action:r.jsx(z,{as:"a",href:"/app/explore",children:"Back to Explore"})});const a={careers:[["Summary",i=>i.summary],["Entry salary",i=>i.salary_entry],["Senior salary",i=>i.salary_senior],["Outlook",i=>i.growth],["Streams",i=>(i.streams||[]).join(", ")],["Core skills",i=>(i.skills||[]).join(", ")],["Typical route",i=>(i.education||[])[0]||"\u2014"],["Entrance exams",i=>(i.exams||[]).join(", ")||"\u2014"],["Day in the life",i=>i.day_in_life]],colleges:[["City",i=>`${i.city}, ${i.state}`],["Type",i=>i.type],["Approx fees/yr",i=>i.approx_fees_per_year],["Entrance",i=>(i.entrance_exams||[]).join(", ")]]}[e]||[["About",i=>i.about],["Level",i=>i.level],["Duration",i=>i.duration]];return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",children:[r.jsxs(K,{to:"/app/explore",className:"btn btn-ghost btn-sm",children:[r.jsx(Bs,{})," Explore"]}),r.jsxs("h2",{style:{fontSize:"1.3rem"},children:["Compare ",e]})]}),r.jsx(C,{pad:!1,style:{overflowX:"auto"},children:r.jsxs("table",{className:"timeline-table",style:{minWidth:640},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{}),t.items.map(i=>r.jsx("th",{style:{minWidth:190},children:i.title||i.name},i.slug))]})}),r.jsxs("tbody",{children:[a.map(([i,o])=>r.jsxs("tr",{children:[r.jsx("td",{style:{color:"var(--muted)",fontWeight:600,fontSize:".8rem"},children:i}),t.items.map(c=>r.jsx("td",{children:o(c)},c.slug))]},i)),r.jsxs("tr",{children:[r.jsx("td",{style:{color:"var(--muted)",fontWeight:600,fontSize:".8rem"},children:"Verified"}),t.items.map(i=>r.jsx("td",{children:r.jsx(qt,{source:i.source,asOf:i.as_of})},i.slug))]})]})]})}),r.jsx("div",{className:"row",children:t.items.map(i=>r.jsxs(z,{size:"sm",variant:"ghost",as:"a",href:`/app/explore/${e}/${i.slug}`,children:["Open ",i.title||i.name," ",r.jsx(Je,{})]},i.slug))})]})}function Cv(){const{user:e,refresh:t}=Se(),{toast:n}=te(),[s,l]=x.useState(null),[a,i]=x.useState(null),[o,c]=x.useState(!1),d=x.useRef(null),f=async()=>{try{const g=await $("/api/roadmap");l(g),g.roadmap&&["queued","generating"].includes(g.roadmap.status)&&(clearTimeout(d.current),d.current=setTimeout(f,1500))}catch(g){l({error:g.message})}};if(x.useEffect(()=>(f(),()=>clearTimeout(d.current)),[]),!s)return r.jsxs("div",{className:"stack",children:[r.jsx(B,{h:120}),r.jsx(B,{}),r.jsx(B,{})]});if(s.error)return r.jsx(we,{title:s.error,action:r.jsx(z,{as:"a",href:"/app/assessment",children:"Go to assessment"})});const p=s.roadmap;return p?p.status==="failed"?r.jsx(we,{icon:r.jsx(vl,{width:42,height:42}),title:"Generation failed",body:p.error||"Something broke while building your roadmap.",action:r.jsxs(z,{onClick:async()=>{await W("/api/roadmap/retry"),f()},children:[r.jsx(Ar,{})," Retry"]})}):p.status!=="ready"?r.jsx(Pv,{status:p.status}):p.under_review?r.jsxs(C,{className:"center",style:{padding:44},children:[r.jsx(rt,{width:44,height:44,style:{color:"var(--warn)"}}),r.jsx("h2",{className:"mt-2",children:"Your roadmap is with a counsellor"}),r.jsx("p",{className:"small mt-1",style:{maxWidth:420,margin:"8px auto 0"},children:"It includes a high-impact step \u2014 a timeline or stream decision with real consequences \u2014 so a human reviews it before it reaches you. This is the trust layer doing its job; it usually completes within a few hours."}),r.jsx(L,{tone:"warn",className:"mt-3",children:"Under review"})]}):r.jsx(Tv,{rm:p,checkins:s.checkins||[],reload:f}):r.jsxs(r.Fragment,{children:[r.jsx(Ev,{onPick:()=>c(!0)}),r.jsx(_v,{open:o,onClose:()=>c(!1),onGenerated:f,recs:a,setRecs:i})]})}function Ev({onPick:e}){return r.jsx(we,{icon:r.jsx(At,{width:44,height:44}),title:"Create your personal roadmap \u2014 free",body:"Pick the career you want to pursue \u2014 we turn it into dated milestones, an exam timeline, free resources, and a Plan B. PDF export and parent sharing included, all free.",action:r.jsxs(z,{size:"lg",onClick:e,children:[r.jsx(At,{})," Build my roadmap"]})})}function _v({open:e,onClose:t,onGenerated:n,recs:s,setRecs:l}){const{toast:a}=te(),[i,o]=x.useState(!1);x.useEffect(()=>{e&&!s&&$("/api/recommendations").then(l).catch(()=>l({matches:[]}))},[e]);const c=((s==null?void 0:s.matches)||[]).filter(f=>!f.pending&&f.kind==="primary"),d=async f=>{o(!0);try{await W("/api/roadmap/generate",{careerId:f}),a("Roadmap queued \u2014 generation takes ~5 seconds in this demo."),n(),t()}catch(p){a(p.message,"err")}finally{o(!1)}};return r.jsx(xl,{open:e,onClose:t,title:"Which career are we planning for?",children:c.length===0?r.jsx("p",{className:"small",children:"Generate your matches first \u2014 the roadmap builds on one of your recommended careers."}):r.jsxs("div",{className:"stack",children:[c.map(f=>{var p;return r.jsxs("button",{className:"option-btn",disabled:i,onClick:()=>d(f.career.id),children:[r.jsx(ScoreRing,{score:f.match_score,size:44}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{children:f.career.title}),r.jsx("div",{className:"small muted",children:(p=f.career.education)==null?void 0:p[0]})]}),r.jsx(Je,{})]},f.id)}),r.jsx("p",{className:"tiny faint",children:"Not feeling them? Give a thumbs-down on the results page and recompute \u2014 the engine listens."})]})})}function Pv({status:e}){const t=[["queued","Roadmap queued","Waiting for a generation slot (non-urgent work is queued \u2014 this is how we survive result-day spikes)"],["generating","Generating your roadmap","Layer 2 is writing milestones from the knowledge base \u2014 exams, resources, dated steps"]],n=e==="generating"?1:0;return r.jsxs(C,{className:"center",style:{padding:48},children:[r.jsx($t,{}),r.jsx("h2",{className:"mt-3",style:{fontSize:"1.3rem"},children:t[n][1]}),r.jsx("p",{className:"small mt-1",style:{maxWidth:400,margin:"6px auto 0"},children:t[n][2]}),r.jsx("div",{className:"tiny faint mt-3",children:"Your report is being prepared \u2014 this page updates itself."})]})}function Tv({rm:e,checkins:t,reload:n}){const{toast:s}=te(),[l,a]=x.useState({}),[i,o]=x.useState(!1),[c,d]=x.useState({enabled:e.share.enabled,url:e.share.url}),f=async(y,j)=>{try{await W("/api/roadmap/milestone",{milestoneIdx:y,stepIdx:j}),n()}catch(w){s(w.message,"err")}},p=async()=>{try{const y=await W("/api/roadmap/share",{enabled:!c.enabled});d({enabled:y.enabled,url:y.url}),s(y.enabled?"Share link active \u2014 send it to your parent.":"Sharing turned off.")}catch(y){s(y.message,"err")}},g=t.filter(y=>!y.read);return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsxs("div",{className:"eyebrow",children:["Your roadmap \xB7 target ",e.target_year]}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:e.career.title}),r.jsx("p",{className:"small",children:e.career.summary})]}),r.jsx("span",{className:"spacer"}),r.jsxs("div",{className:"no-print",style:{textAlign:"right"},children:[r.jsxs("div",{className:"tiny muted mb-1",children:[e.progress.done,"/",e.progress.total," steps done"]}),r.jsx("div",{style:{width:130},children:r.jsx(cn,{value:e.progress.done/Math.max(1,e.progress.total)*100})})]})]}),e.ai_mode==="fallback"&&r.jsxs("div",{className:"alert alert-warn no-print",children:[r.jsx(vl,{}),r.jsxs("div",{children:["Generated in ",r.jsx("strong",{children:"fallback mode"})," \u2014 the AI narrative layer was unavailable, so deterministic templates produced this roadmap. Nothing important is missing: Layer-1 scores and knowledge-base facts don\'t depend on the AI."]})]}),g.length>0&&r.jsx(Mv,{checkin:g[0],onDone:n}),r.jsxs("div",{className:"row no-print",children:[r.jsxs(z,{size:"sm",variant:"secondary",onClick:()=>window.print(),children:[r.jsx(rh,{})," Export as PDF"]}),r.jsxs(z,{size:"sm",variant:"secondary",onClick:()=>o(!0),children:[r.jsx(bs,{})," Share with parent"]}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:e.high_impact?"warn":"success",children:e.high_impact?"Counsellor-reviewed":"Standard plan"})]}),r.jsx("div",{className:"stack",children:e.milestones.map((y,j)=>r.jsxs(C,{pad:!1,className:"milestone",children:[r.jsxs("div",{className:"milestone-head",onClick:()=>a(w=>({...w,[j]:!w[j]})),children:[r.jsxs("div",{style:{flex:1},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:y.title}),y.high_impact&&r.jsx(L,{tone:"warn",children:"High impact \xB7 reviewed"})]}),r.jsxs("div",{className:"milestone-date",children:["by ",zr(y.target_date)," \xB7 ",y.steps.filter(w=>w.done).length,"/",y.steps.length," steps"]})]}),l[j]===!1?r.jsx(yc,{style:{transform:"rotate(-90deg)"}}):r.jsx(yc,{})]}),l[j]!==!1&&r.jsxs("div",{style:{padding:"0 18px 16px"},children:[r.jsx("div",{className:"stack",style:{gap:8},children:y.steps.map((w,N)=>r.jsxs("div",{className:`check-item ${w.done?"done":""}`,onClick:()=>f(j,N),role:"checkbox","aria-checked":w.done,children:[r.jsx("span",{className:"checkbox",children:r.jsx(q,{})}),r.jsx("span",{className:"check-text small",children:w.text})]},N))}),y.note&&r.jsx("p",{className:"tiny faint mt-2",children:y.note})]})]},j))}),e.timeline.length>0&&r.jsxs(C,{pad:!1,style:{overflowX:"auto"},children:[r.jsx("div",{style:{padding:"16px 18px 0"},children:r.jsx("h3",{children:"Entrance exam timeline"})}),r.jsxs("table",{className:"timeline-table",style:{minWidth:560,margin:"10px 0"},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"Exam"}),r.jsx("th",{children:"Applications"}),r.jsx("th",{children:"Exam months"}),r.jsx("th",{children:"Results"}),r.jsx("th",{children:"Verified"})]})}),r.jsx("tbody",{children:e.timeline.map((y,j)=>r.jsxs("tr",{children:[r.jsxs("td",{children:[r.jsx("strong",{children:y.exam}),r.jsx("div",{className:"tiny faint",children:y.conducted_by})]}),r.jsx("td",{children:y.application_window}),r.jsx("td",{children:y.exam_months}),r.jsx("td",{children:y.result_months}),r.jsx("td",{className:"tiny faint",children:new Date(y.as_of).toLocaleDateString("en-IN",{month:"short",year:"numeric"})})]},j))})]}),r.jsx("p",{className:"tiny faint",style:{padding:"0 18px 14px"},children:"Dates verified as of generation \u2014 always confirm on official sites before applying."})]}),e.resources.length>0&&r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Free resources, picked for this path"}),r.jsx("div",{className:"stack",style:{gap:8},children:e.resources.map((y,j)=>r.jsxs("a",{className:"card-2 card-pad row",href:y.url,target:"_blank",rel:"noreferrer",style:{textDecoration:"none"},children:[r.jsx(Vs,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:y.label}),r.jsx("div",{className:"tiny faint",children:y.why})]}),r.jsx(Je,{width:15,height:15})]},j))})]}),r.jsx(xl,{open:i,onClose:()=>o(!1),title:"Share with a parent (read-only)",children:r.jsxs("div",{className:"stack",children:[r.jsx("p",{className:"small",children:"Your parent sees your roadmap \u2014 nothing else. No account needed for them. You can turn this off anytime; every share is logged."}),c.enabled?r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"card-2 card-pad center",children:[r.jsx("div",{className:"tiny faint mb-1",children:"Share link"}),r.jsxs("code",{className:"small",style:{wordBreak:"break-all"},children:[window.location.origin,c.url]})]}),r.jsx(z,{variant:"secondary",block:!0,onClick:()=>{var y;return(y=navigator.clipboard)==null?void 0:y.writeText(window.location.origin+c.url).then(()=>s("Link copied!"))},children:"Copy link"}),r.jsxs(z,{variant:"ghost",block:!0,onClick:p,children:[r.jsx(Qi,{})," Stop sharing"]})]}):r.jsxs(z,{block:!0,onClick:p,children:[r.jsx(bs,{})," Create share link"]})]})})]})}function Mv({checkin:e,onDone:t}){const{toast:n}=te(),[s,l]=x.useState("");return r.jsxs(C,{style:{border:"2px solid var(--accent)"},children:[r.jsxs("div",{className:"row",children:[r.jsx(Qs,{style:{color:"var(--accent)"}}),r.jsx("strong",{children:e.title}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:"accent",children:"Check-in"})]}),r.jsx("p",{className:"small mt-1",children:e.body}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("input",{className:"input",style:{flex:1,minWidth:180},placeholder:"What did you act on? (one honest line)",value:s,onChange:a=>l(a.target.value)}),r.jsx(z,{size:"sm",onClick:async()=>{await W(`/api/roadmap/checkin/${e.id}`,{acted:s}),n("Check-in recorded \u2014 acting beats intending."),t()},children:"Log it"})]})]})}function zv(){return r.jsx(Lv,{})}function Lv(){const[e,t]=x.useState("milestones");return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Keep momentum"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Your progress"}),r.jsx("p",{className:"small",children:"The plan only works if you work the plan. Check-ins keep you honest."})]}),r.jsx(Ji,{tabs:[{id:"milestones",label:"Milestones"},{id:"checkins",label:"Check-ins"},{id:"favourites",label:"Favourites"},{id:"journal",label:"Decision journal"}],value:e,onChange:t}),e==="milestones"&&r.jsx(Rv,{}),e==="checkins"&&r.jsx(Iv,{}),e==="favourites"&&r.jsx(Dv,{}),e==="journal"&&r.jsx(Ov,{})]})}function Rv(){const[e,t]=x.useState(null);if(x.useEffect(()=>{$("/api/roadmap").then(t)},[]),!e)return r.jsx(B,{h:140});const n=e.roadmap;if(!n||n.status!=="ready")return r.jsx(we,{title:"No roadmap yet",body:"Your milestones will live here once you build a roadmap.",action:r.jsx(z,{as:"a",href:"/app/roadmap",children:"Build roadmap"})});const s=Math.round(n.progress.done/Math.max(1,n.progress.total)*100);return r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsxs("div",{className:"row",children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{children:n.career.title}),r.jsxs("div",{className:"small muted",children:[n.progress.done," of ",n.progress.total," steps completed"]})]}),r.jsxs("div",{className:"stat",style:{textAlign:"right"},children:[r.jsxs("span",{className:"n",children:[s,"%"]}),r.jsx("span",{className:"l",children:"there"})]})]}),r.jsx("div",{className:"mt-2",children:r.jsx(cn,{value:s})})]}),r.jsx("div",{className:"row",children:r.jsxs(K,{to:"/app/roadmap",className:"card card-pad",style:{flex:1,minWidth:200,textDecoration:"none"},children:[r.jsx(At,{style:{color:"var(--brand-2)"}}),r.jsx("div",{className:"match-title",style:{fontSize:"1rem"},children:"Work on milestones"}),r.jsx("p",{className:"tiny faint",children:"Open the roadmap and tick steps off."})]})})]})}function Iv(){const[e,t]=x.useState(null);if(x.useEffect(()=>{$("/api/roadmap").then(t)},[]),!e)return r.jsx(B,{h:100});const n=e.checkins||[];return n.length?r.jsxs("div",{className:"stack",children:[n.map(s=>r.jsxs(C,{className:"row",style:{alignItems:"flex-start"},children:[r.jsx(Qs,{style:{color:s.read?"var(--faint)":"var(--accent)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:s.title}),!s.read&&r.jsx(L,{tone:"accent",children:"Due"})]}),r.jsx("p",{className:"small",children:s.body}),r.jsxs("div",{className:"tiny faint",children:["Due ",Ie(s.due_at)]})]}),!s.read&&r.jsx(z,{as:"a",href:"/app/roadmap",size:"sm",children:"Respond"})]},s.id)),r.jsx("p",{className:"tiny faint",children:"Check-ins are the product\'s honesty mechanism \u2014 they separate real action from politeness."})]}):r.jsx(we,{icon:r.jsx(Qs,{width:40,height:40}),title:"Check-ins appear after your roadmap",body:"Automated nudges at 2 weeks and 4 weeks: what did you act on, what\'s blocked?"})}function Dv(){const{toast:e}=te(),[t,n]=x.useState(null),s=()=>$("/api/catalog/favourites/mine").then(n).catch(()=>n({favourites:[]}));if(x.useEffect(()=>{s()},[]),!t)return r.jsx(B,{h:100});if(!t.favourites.length)return r.jsx(we,{icon:r.jsx(qd,{width:40,height:40}),title:"Nothing saved yet",body:"Star careers and colleges while exploring \u2014 favourites nudge your future matches.",action:r.jsx(z,{as:"a",href:"/app/explore",children:"Explore"})});const l={career:"careers",college:"colleges"};return r.jsx("div",{className:"stack",children:t.favourites.map((a,i)=>r.jsxs(C,{className:"row",children:[a.entity_type==="career"?r.jsx(lh,{style:{color:"var(--brand-2)"}}):r.jsx(Ki,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:a.item.title||a.item.name}),a.entity_type==="college"&&r.jsxs("div",{className:"tiny muted",children:[a.item.city," \xB7 ",a.item.type]})]}),r.jsx(z,{as:"a",href:`/app/explore/${l[a.entity_type]}/${a.item.slug}`,size:"sm",variant:"ghost",children:"Open"}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34},onClick:async()=>{await Xd(`/api/catalog/favourites/${a.entity_type}/${a.item.id}`),e("Removed."),s()},children:r.jsx(sh,{width:14,height:14})})]},i))})}function Ov(){const{toast:e}=te(),[t,n]=x.useState(null),[s,l]=x.useState(""),a=()=>$("/api/profile/journal").then(o=>n(o.entries)).catch(()=>n([]));x.useEffect(()=>{a()},[]);const i=async()=>{s.trim().length<2||(await W("/api/profile/journal",{text:s}),l(""),e("Journaled."),a())};return r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Decision journal"}),r.jsx("p",{className:"small mb-2",children:"Write what you learned, what surprised you, what you\'re unsure about. Future-you (and mentor conversations) will thank you."}),r.jsxs("div",{className:"row",children:[r.jsx("input",{className:"input",style:{flex:1,minWidth:200},placeholder:"e.g. Talked to a data scientist \u2014 turns out 70% of her job is cleaning data\u2026",value:s,onChange:o=>l(o.target.value),onKeyDown:o=>o.key==="Enter"&&i()}),r.jsxs(z,{onClick:i,children:[r.jsx(th,{})," Add"]})]})]}),(t||[]).map(o=>r.jsxs(C,{className:"row",style:{alignItems:"flex-start"},children:[r.jsx(Vs,{style:{color:"var(--faint)",marginTop:2}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{className:"small",style:{color:"var(--ink)"},children:o.text}),r.jsx("div",{className:"tiny faint mt-1",children:Ie(o.created_at)})]})]},o.id)),t&&t.length===0&&r.jsx(we,{icon:r.jsx(Vs,{width:40,height:40}),title:"Empty journal",body:"Decisions written down are decisions half-made."})]})}function Av(){const{toast:e}=te(),[t,n]=x.useState(null),[s,l]=x.useState(""),[a,i]=x.useState(""),[o,c]=x.useState([]),[d,f]=x.useState(!1),p=()=>$("/api/mentor/questions").then(n).catch(()=>n({questions:[]}));x.useEffect(()=>{p(),$("/api/recommendations").then(y=>c(y.matches||[])).catch(()=>{})},[]);const g=async()=>{f(!0);try{const y=await W("/api/mentor/questions",{question:s,careerId:a||null});e(`Sent \u2014 a verified mentor answers within ${y.sla_hours}h.`),l(""),p()}catch(y){e(y.message,"err")}finally{f(!1)}};return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Ask-a-Professional"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Ask someone who actually does the job"}),r.jsx("p",{className:"small",children:"Brochures sell. Mentors tell. Verified professionals answer your questions within 48 hours."})]}),r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Your question"}),r.jsx("textarea",{className:"input",placeholder:"e.g. What does a bad day look like in your job? What would you do differently at 17?",value:s,onChange:y=>l(y.target.value)}),r.jsxs("div",{className:"row mt-2",children:[r.jsxs("select",{className:"input",style:{maxWidth:280},value:a,onChange:y=>i(y.target.value),children:[r.jsx("option",{value:"",children:"General question (no specific career)"}),o.filter(y=>!y.pending).map(y=>r.jsx("option",{value:y.career.id,children:y.career.title},y.id))]}),r.jsx("span",{className:"spacer"}),r.jsx(z,{disabled:d||s.trim().length<10,onClick:g,children:d?"Sending\u2026":r.jsxs(r.Fragment,{children:["Ask a mentor ",r.jsx(Ft,{})]})})]}),r.jsx("p",{className:"tiny faint mt-2",children:\'Be specific \u2014 "should I do X or Y and why" gets far better answers than "what should I do".\'})]}),t?t.questions.length===0?r.jsx(we,{icon:r.jsx(Ft,{width:40,height:40}),title:"No questions yet",body:"The best question is the one you\'re slightly afraid to ask. Ask it."}):r.jsx("div",{className:"stack",children:t.questions.map(y=>r.jsxs(C,{children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(L,{tone:y.status==="answered"?"success":y.sla_status==="overdue"?"danger":"brand",children:y.status==="answered"?"Answered":y.sla_status==="overdue"?"Overdue \u2014 we\'re on it":`Answer expected by ${Ie(y.sla_due_at)}`}),y.career_title&&r.jsx(L,{tone:"muted",children:y.career_title}),r.jsx("span",{className:"spacer"}),r.jsx("span",{className:"tiny faint",children:Ie(y.created_at)})]}),r.jsx("p",{style:{color:"var(--ink)",fontWeight:500},children:y.question}),y.answer&&r.jsxs("div",{className:"why-box mt-2",children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(Xi,{width:14,height:14,style:{color:"var(--brand-2)"}}),r.jsxs("strong",{className:"small",children:[y.mentor_name," \xB7 verified mentor"]})]}),r.jsx("p",{className:"small",style:{color:"var(--ink)"},children:y.answer})]})]},y.id))}):r.jsx(B,{h:120})]})}function Fv(){return r.jsx($v,{})}function $v(){const[e,t]=x.useState("profile");return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Your account"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Account & data"}),r.jsx("p",{className:"small",children:"Your data, your rights (DPDP-aligned): export it, delete it, control who sees it."})]}),r.jsx(Ji,{tabs:[{id:"profile",label:"Profile"},{id:"data",label:"Data & privacy"},{id:"referrals",label:"Referrals"},{id:"audit",label:"My audit trail"}],value:e,onChange:t}),e==="profile"&&r.jsx(Wv,{}),e==="data"&&r.jsx(Vv,{}),e==="referrals"&&r.jsx(Hv,{}),e==="audit"&&r.jsx(bv,{})]})}function Wv(){var n,s;const{me:e,user:t}=Se();return r.jsxs("div",{className:"stack",children:[r.jsx(C,{children:r.jsxs("div",{className:"row",children:[r.jsx("div",{style:{width:54,height:54,borderRadius:18,background:"var(--brand-soft)",color:"var(--brand-2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",fontFamily:"var(--font-display)",fontWeight:700},children:(s=(n=t==null?void 0:t.name)==null?void 0:n[0])==null?void 0:s.toUpperCase()}),r.jsxs("div",{children:[r.jsx("h3",{children:t==null?void 0:t.name}),r.jsxs("p",{className:"small muted",children:[(t==null?void 0:t.email)||`+91 ${t==null?void 0:t.phone}`," \xB7 joined ",Ie(t==null?void 0:t.created_at)]}),r.jsxs("div",{className:"row mt-1",children:[r.jsx(L,{tone:"brand",children:t==null?void 0:t.role}),r.jsx(L,{tone:"success",children:"Everything unlocked \xB7 free"}),(t==null?void 0:t.is_minor)&&r.jsxs(L,{tone:t.consent_status==="given"?"success":"warn",children:["Minor \xB7 consent ",t.consent_status]})]})]})]})}),(t==null?void 0:t.role)==="student"&&(t==null?void 0:t.is_minor)&&t.consent_status!=="given"&&r.jsx(Bv,{}),r.jsx(Uv,{}),(t==null?void 0:t.role)==="student"&&r.jsxs(C,{children:[r.jsx("h3",{className:"mb-1",children:"Status"}),r.jsxs("div",{className:"grid-3",children:[r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",children:"PROFILE"}),r.jsx("strong",{children:e!=null&&e.hasProfile?"Complete":"Pending"})]}),r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",children:"ASSESSMENT"}),r.jsx("strong",{children:e!=null&&e.assessmentDone?"Completed":"Pending"})]}),r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",children:"PRICE"}),r.jsx("strong",{children:"\u20B90 \u2014 everything free"})]})]})]})]})}function Uv(){const{toast:e}=te(),[t,n]=x.useState(""),[s,l]=x.useState(""),[a,i]=x.useState(!1),o=async()=>{i(!0);try{await W("/api/auth/password/change",{current:t,next:s}),n(""),l(""),e("Password changed. Other devices have been signed out.")}catch(c){e(c.message,"err")}finally{i(!1)}};return r.jsxs(C,{children:[r.jsx("h3",{className:"mb-1",children:"Change password"}),r.jsx("p",{className:"small",children:"Passwords are salted and hashed (scrypt). Changing it signs out your other sessions."}),r.jsxs("div",{className:"stack mt-2",style:{maxWidth:380},children:[r.jsx("input",{className:"input",type:"password",placeholder:"Current password",value:t,onChange:c=>n(c.target.value)}),r.jsx("input",{className:"input",type:"password",placeholder:"New password (8+ characters, a letter + a number)",value:s,onChange:c=>l(c.target.value)}),r.jsx(z,{size:"sm",disabled:a||!t||s.length<8,onClick:o,children:a?"Changing\u2026":"Change password"})]})]})}function Bv(){const{user:e,refresh:t}=Se(),{toast:n}=te(),[s,l]=x.useState(e==null?void 0:e.consent_code),a=async()=>{try{const i=await W("/api/auth/consent/generate");l(i.code),n("New consent code created."),t()}catch(i){n(i.message,"err")}};return r.jsxs(C,{style:{border:"2px solid var(--accent)"},children:[r.jsxs("div",{className:"row",children:[r.jsx(rt,{style:{color:"var(--accent)"}}),r.jsx("h3",{children:"Link a parent (required for under-18)"})]}),r.jsx("p",{className:"small mt-1",children:"Under India\'s DPDP Act, we need verifiable parental consent. Share this code \u2014 your parent enters it while signing up:"}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("code",{className:"card-2 card-pad",style:{fontSize:"1.15rem",letterSpacing:3,fontWeight:700},children:s||"\u2014"}),r.jsxs(z,{variant:"secondary",size:"sm",onClick:a,children:[r.jsx(Ar,{})," New code"]})]})]})}function Vv(){const{user:e,logout:t}=Se(),{toast:n}=te(),[s,l]=x.useState(!1),[a,i]=x.useState(""),o=async()=>{try{await W("/api/account/delete",{confirm:a}),n("Account deleted. Your personal data is gone \u2014 catalog data was never yours alone."),await t(),window.location.href="/"}catch(c){n(c.message,"err")}};return r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(rh,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Export your data"]}),r.jsx("p",{className:"small mt-1 mb-2",children:"Everything we hold about you \u2014 profile, answers, matches, roadmaps, notifications \u2014 as one JSON file. Includes the decision logs behind every recommendation."}),r.jsxs(z,{as:"a",href:"/api/account/export",variant:"secondary",children:[r.jsx(pl,{})," Download my data (JSON)"]})]}),r.jsxs(C,{children:[r.jsxs("h3",{children:[r.jsx(bs,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Sharing"]}),r.jsxs("p",{className:"small mt-1",children:["Roadmap sharing with parents is controlled from the ",r.jsx("strong",{children:"Roadmap \u2192 Share"})," button. Links are read-only, revocable, and every share is logged in your audit trail below."]})]}),r.jsxs(C,{style:{border:"2px solid var(--danger-soft)"},children:[r.jsxs("h3",{style:{color:"var(--danger)"},children:[r.jsx(sh,{style:{verticalAlign:-3}})," Delete my account"]}),r.jsx("p",{className:"small mt-1 mb-2",children:"Full erasure: profile, assessment, matches, roadmaps. Catalog data (careers, colleges, exams) stays \u2014 it was never personal. This cannot be undone."}),r.jsx(z,{variant:"danger",size:"sm",onClick:()=>l(!0),children:"Delete my account\u2026"})]}),r.jsxs(xl,{open:s,onClose:()=>l(!1),title:"Delete account \u2014 are you sure?",children:[r.jsxs("p",{className:"small mb-2",children:["Type ",r.jsx("strong",{children:"DELETE"})," to confirm. Your roadmap, matches and answers will be permanently removed."]}),r.jsx("input",{className:"input",placeholder:"DELETE",value:a,onChange:c=>i(c.target.value)}),r.jsxs("div",{className:"row mt-3",children:[r.jsx(z,{variant:"secondary",onClick:()=>l(!1),children:"Keep my account"}),r.jsx("span",{className:"spacer"}),r.jsx(z,{variant:"danger",disabled:a!=="DELETE",onClick:o,children:"Delete everything"})]})]})]})}function Hv(){const[e,t]=x.useState(null);return x.useEffect(()=>{$("/api/account/referrals").then(t).catch(()=>t({signups:[]}))},[]),e?r.jsxs("div",{className:"stack",children:[r.jsxs(C,{className:"center",style:{padding:30},children:[r.jsx("div",{className:"tiny muted",style:{fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"},children:"Your referral code"}),r.jsx("div",{style:{fontFamily:"ui-monospace,monospace",fontSize:"2rem",fontWeight:700,color:"var(--brand-2)",letterSpacing:4},children:e.code}),r.jsx("p",{className:"small mt-1",children:"Unprompted referrals are the clearest signal that guidance actually worked. If the app helped you, point a friend at it."}),r.jsx("div",{className:"row mt-2",style:{justifyContent:"center"},children:r.jsxs(L,{tone:"brand",children:[e.count," student",e.count===1?"":"s"," joined with your code"]})})]}),e.signups.map((n,s)=>r.jsxs(C,{className:"row",children:[r.jsx(Xi,{style:{color:"var(--brand-2)"}}),r.jsx("strong",{className:"small",children:n.name}),r.jsx("span",{className:"spacer"}),r.jsx("span",{className:"tiny faint",children:Ie(n.created_at)})]},s))]}):r.jsx(B,{h:100})}function bv(){const[e,t]=x.useState(null);return x.useEffect(()=>{$("/api/account/audit").then(t).catch(()=>t({logs:[]}))},[]),e?r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsx("h3",{className:"mb-1",children:"Your audit trail"}),r.jsx("p",{className:"small",children:"Every action the system took for you, logged server-side \u2014 the same transparency we demand of the recommendation engine."})]}),e.logs.map(n=>r.jsxs(C,{className:"row",children:[r.jsx(pl,{style:{color:"var(--faint)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("code",{className:"small",children:n.action}),r.jsx("div",{className:"tiny faint",children:n.entity})]}),r.jsx("span",{className:"tiny faint",children:Ie(n.created_at)})]},n.created_at+n.action)),e.logs.length===0&&r.jsx(C,{className:"center small",children:"Nothing logged yet."})]}):r.jsx(B,{h:100})}function Qv(){const[e,t]=x.useState(null),{toast:n}=te(),[s,l]=x.useState({}),a=()=>$("/api/mentor/inbox").then(t).catch(()=>t({questions:[]}));if(x.useEffect(()=>{a()},[]),!e)return r.jsxs("div",{className:"stack",children:[r.jsx(B,{}),r.jsx(B,{})]});const i=e.questions.filter(d=>d.status==="open"),o=e.questions.filter(d=>d.status!=="open"),c=async d=>{var p;const f=(p=s[d])==null?void 0:p.trim();if(!f||f.length<10)return n("Write a real answer first.","err");try{await W("/api/mentor/answer",{questionId:d,answer:f}),n("Answered \u2014 the student has been notified."),a()}catch(g){n(g.message,"err")}};return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Mentor desk"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Questions waiting for you"}),e.mentor&&r.jsxs("p",{className:"small",children:[e.mentor.headline," \xB7 ",r.jsx(L,{tone:e.mentor.verified?"success":"warn",children:e.mentor.verified?"Verified":"Pending verification"})]})]}),e.questions.length===0&&r.jsx(we,{icon:r.jsx(Ft,{width:40,height:40}),title:"Inbox zero",body:"New student questions will appear here, matched to your field."}),[...i,...o].map(d=>r.jsxs(C,{className:d.status==="open"?"":"card-2",style:d.status==="open"?{border:"2px solid var(--brand-soft)"}:{},children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(L,{tone:d.status==="answered"?"success":d.status==="escalated"||d.sla_status==="overdue"?"danger":"brand",children:d.status==="answered"?"Answered":d.status==="escalated"?"Escalated to admin":d.sla_status==="overdue"?"SLA breached":"Open \xB7 within SLA"}),d.career_title&&r.jsx(L,{tone:"muted",children:d.career_title}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:[d.student_name," \xB7 ",Ie(d.created_at)]})]}),r.jsx("p",{style:{color:"var(--ink)",fontWeight:500},children:d.question}),d.answer&&r.jsx("div",{className:"why-box mt-2",children:r.jsx("p",{className:"small",style:{color:"var(--ink)"},children:d.answer})}),d.status==="open"&&r.jsxs(r.Fragment,{children:[r.jsx("textarea",{className:"input mt-2",placeholder:"Write your honest answer \u2014 what you wish someone had told you at 17\u2026",value:s[d.id]||"",onChange:f=>l(p=>({...p,[d.id]:f.target.value}))}),r.jsxs("div",{className:"row mt-1",children:[r.jsxs(z,{size:"sm",onClick:()=>c(d.id),children:[r.jsx(q,{})," Send answer"]}),r.jsxs(z,{size:"sm",variant:"ghost",onClick:async()=>{await W(`/api/mentor/escalate/${d.id}`),n("Escalated to admin."),a()},children:[r.jsx(eh,{width:14,height:14})," Escalate (out of my field)"]}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:["SLA: ",Ie(d.sla_due_at)]})]})]})]},d.id)),r.jsx("p",{className:"tiny faint",children:"Answers carry your name and verification badge. Capacity is capped \u2014 quality over volume."})]})}function Yv(){const[e,t]=x.useState("overview");return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Counsellor console"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Admin"}),r.jsx("p",{className:"small",children:"Humans where it matters: reviews, mentor verification, and content freshness."})]}),r.jsx(Ji,{tabs:[{id:"overview",label:"Overview"},{id:"review",label:"Review queue"},{id:"mentors",label:"Mentors"},{id:"content",label:"Content freshness"},{id:"tools",label:"Demo & tools"},{id:"audit",label:"Audit trail"}],value:e,onChange:t}),e==="overview"&&r.jsx(Kv,{}),e==="review"&&r.jsx(Gv,{}),e==="mentors"&&r.jsx(Xv,{}),e==="content"&&r.jsx(Jv,{}),e==="tools"&&r.jsx(Zv,{}),e==="audit"&&r.jsx(qv,{})]})}function Kv(){const[e,t]=x.useState(null);return x.useEffect(()=>{$("/api/admin/overview").then(t).catch(()=>{})},[]),e?r.jsxs("div",{className:"stack",children:[r.jsx("div",{className:"grid-3",children:[["Students",e.students],["Parents",e.parents],["Roadmaps ready",e.roadmapsReady],["Assessments done",e.assessments],["Mentor answers",e.mentorAnswers],["Open flags",e.openFlags]].map(([n,s])=>r.jsx(C,{className:"step-card",children:r.jsxs("div",{className:"stat",children:[r.jsx("span",{className:"n",children:s}),r.jsx("span",{className:"l",children:n})]})},n))}),r.jsxs("div",{className:"grid-2",children:[r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Trust health"}),r.jsxs("div",{className:"row",children:[r.jsxs(L,{tone:e.pendingReviews>0?"warn":"success",children:[e.pendingReviews," pending reviews"]}),r.jsxs(L,{tone:e.openFlags>0?"warn":"success",children:[e.openFlags," open flags"]}),r.jsxs(L,{tone:"brand",children:[e.parents," parents linked"]})]}),r.jsxs("div",{className:"alert alert-info mt-2",children:[r.jsx(ml,{}),r.jsx("div",{className:"small",children:"High-impact recommendations (gap-year, stream switch) reach students only after review here. That gate is the product\'s core promise."})]})]}),r.jsxs(C,{children:[r.jsx("h3",{className:"mb-2",children:"Content freshness"}),r.jsx("div",{className:"stack",style:{gap:8},children:Object.entries(e.stale).map(([n,s])=>r.jsxs("div",{className:"row",children:[r.jsx("span",{className:"small",style:{width:80,textTransform:"capitalize"},children:n}),r.jsx("div",{className:"progressbar",style:{flex:1},children:r.jsx("div",{style:{width:`${Math.min(100,s*12)}%`,background:s>0?"var(--warn)":"var(--success)"}})}),r.jsxs("span",{className:"tiny muted",children:[s," stale"]})]},n))}),r.jsx("p",{className:"tiny faint mt-2",children:"Stale = not verified in 6+ months. Students see the as-of date on every fact."})]})]}),r.jsxs(C,{children:[r.jsxs("h3",{className:"mb-2",children:["Referral leaderboard ",r.jsx("span",{className:"faint small",children:"(the trust signal we track)"})]}),e.referrals.length?e.referrals.map((n,s)=>r.jsxs("div",{className:"row",style:{padding:"6px 0"},children:[r.jsx("strong",{className:"small",children:n.name}),r.jsx("code",{className:"tiny faint",children:n.referral_code}),r.jsx("span",{className:"spacer"}),r.jsxs(L,{tone:"brand",children:[n.signups," signups"]})]},s)):r.jsx("p",{className:"small",children:"No referrals yet."})]})]}):r.jsxs("div",{className:"stack",children:[r.jsx(B,{}),r.jsx(B,{})]})}function Gv(){const{toast:e}=te(),[t,n]=x.useState(null),s=()=>$("/api/admin/review").then(n).catch(()=>{});if(x.useEffect(()=>{s()},[]),!t)return r.jsx(B,{h:140});const l=async(i,o,c)=>{try{await W(i,o),e(c),s()}catch(d){e(d.message,"err")}},a=!t.flags.length&&!t.pendingRecs.length&&!t.pendingRoadmaps.length;return r.jsxs("div",{className:"stack",children:[a&&r.jsxs(C,{className:"center",style:{padding:36},children:[r.jsx(q,{width:36,height:36,style:{color:"var(--success)"}}),r.jsx("h3",{className:"mt-2",children:"Queue is clear"}),r.jsx("p",{className:"small",children:"Nothing waiting for human review."})]}),t.pendingRecs.map(i=>r.jsxs(C,{style:{border:"2px solid var(--warn-soft)"},children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(L,{tone:"warn",children:"High-impact recommendation"}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:[i.student_name," \xB7 ",Ie(i.created_at)]})]}),r.jsxs("h3",{children:[i.career_title," \xB7 ",Math.round(i.match_score),"% match"]}),r.jsx("p",{className:"small",children:i.review_reason}),r.jsx("div",{className:"stack mt-2",style:{gap:6},children:i.decision_log.map((o,c)=>r.jsxs("div",{className:"log-item",children:[r.jsx("span",{className:"log-label",children:o.label}),r.jsx("span",{className:"small",children:o.detail})]},c))}),r.jsxs("div",{className:"row mt-3",children:[r.jsx(z,{size:"sm",onClick:()=>l(`/api/admin/review/rec/${i.id}`,{action:"approve"},"Approved \u2014 now visible to the student."),children:"Approve & release"}),r.jsx(z,{size:"sm",variant:"secondary",onClick:()=>l(`/api/admin/review/rec/${i.id}`,{action:"reject"},"Rejected."),children:"Reject"})]})]},i.id)),t.pendingRoadmaps.map(i=>r.jsxs(C,{style:{border:"2px solid var(--warn-soft)"},children:[r.jsx("div",{className:"row mb-1",children:r.jsx(L,{tone:"warn",children:"Roadmap under review"})}),r.jsxs("h3",{children:[i.student_name," \xB7 ",i.career_title]}),r.jsx("p",{className:"small",children:"This roadmap contains a high-impact step (gap-year / stream-change consideration) and is withheld from the student until reviewed."}),r.jsxs("div",{className:"row mt-2",children:[r.jsx(z,{size:"sm",onClick:()=>l(`/api/admin/review/roadmap/${i.id}`,{action:"approve"},"Approved \u2014 roadmap released."),children:"Approve & release"}),r.jsx(z,{size:"sm",variant:"secondary",onClick:()=>l(`/api/admin/review/roadmap/${i.id}`,{action:"reject"},"Rejected."),children:"Reject"})]})]},i.id)),t.flags.map(i=>r.jsxs(C,{children:[r.jsxs("div",{className:"row mb-1",children:[r.jsxs(L,{tone:"info",children:["Content flag \xB7 ",i.entity_type]}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:[i.flagger," \xB7 ",Ie(i.created_at)]})]}),r.jsx("p",{className:"small",style:{color:"var(--ink)"},children:i.reason}),i.career_title&&r.jsxs("p",{className:"tiny muted",children:["On: ",i.career_title]}),r.jsx("div",{className:"row mt-2",children:r.jsxs(z,{size:"sm",variant:"secondary",onClick:()=>l(`/api/admin/review/flag/${i.id}`,{},"Flag resolved & fact refreshed."),children:[r.jsx(Ar,{width:14,height:14})," Resolve (refresh as-of date)"]})})]},i.id))]})}function Xv(){const{toast:e}=te(),[t,n]=x.useState(null),s=()=>$("/api/admin/mentors").then(n).catch(()=>{});return x.useEffect(()=>{s()},[]),t?r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsx("h3",{children:"Supply-side capacity"}),r.jsx("p",{className:"small mt-1",children:"Grow the verified pool before marketing spikes \u2014 mentor capacity is the first human bottleneck at 10,000 users."})]}),t.mentors.map(l=>r.jsxs(C,{className:"row",children:[r.jsxs("div",{style:{flex:1},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:l.name}),r.jsx(L,{tone:l.verified?"success":"warn",children:l.verified?"Verified":"Unverified"})]}),r.jsx("div",{className:"small muted",children:l.headline}),r.jsx("div",{className:"row mt-1",children:l.fields.map(a=>r.jsx("span",{className:"chip",style:{padding:"3px 9px",fontSize:".72rem"},children:a},a))})]}),r.jsx(z,{size:"sm",variant:l.verified?"secondary":"primary",onClick:async()=>{await W(`/api/admin/mentors/${l.user_id}/verify`,{verified:!l.verified}),e(l.verified?"Verification removed.":"Mentor verified."),s()},children:l.verified?"Unverify":"Verify"})]},l.user_id))]}):r.jsx(B,{h:120})}function Jv(){const{toast:e}=te(),[t,n]=x.useState(null),s=()=>$("/api/admin/stale").then(n).catch(()=>{});if(x.useEffect(()=>{s()},[]),!t)return r.jsx(B,{h:120});const l=[["careers","Careers"],["colleges","Colleges"],["exams","Exams"],["courses","Courses"]],a=l.every(([i])=>!t[i].length);return r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsx("h3",{children:"Stale content (6+ months unverified)"}),r.jsx("p",{className:"small mt-1",children:\'One stale course fact can undo the whole "trusted" promise. Resolving a flag or refreshing here updates the as-of date students see.\'})]}),a&&r.jsxs(C,{className:"center",style:{padding:30},children:[r.jsx(q,{width:32,height:32,style:{color:"var(--success)"}}),r.jsx("h3",{className:"mt-1",children:"Everything fresh"})]}),l.map(([i,o])=>t[i].length>0&&r.jsxs(C,{children:[r.jsxs("h3",{className:"mb-2",children:[o," \xB7 ",t[i].length," stale"]}),r.jsx("div",{className:"stack",style:{gap:8},children:t[i].map(c=>r.jsxs("div",{className:"row card-2 card-pad",children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:c.label}),r.jsx(qt,{source:c.source,asOf:c.as_of})]}),r.jsxs(z,{size:"sm",variant:"secondary",onClick:async()=>{await W(`/api/admin/stale/${i}/${c.id}/refresh`),e(`${c.label} marked verified today.`),s()},children:[r.jsx(Ar,{width:14,height:14})," Mark re-verified"]})]},c.id))})]},i))]})}function Zv(){const{toast:e}=te(),[t,n]=x.useState(null),[s,l]=x.useState(""),a=()=>$("/api/admin/overview").then(n).catch(()=>{});return x.useEffect(()=>{a()},[]),t?r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsx("h3",{children:"Chaos toggle \u2014 simulate AI failure"}),r.jsx("p",{className:"small mt-1 mb-2",children:\'Forces the narrative layer onto its deterministic fallback. Demonstrates graceful degradation: Layer-1 matches and roadmaps keep working, narratives switch to templates, roadmaps are marked "fallback mode".\'}),r.jsx(z,{variant:t.chaos?"danger":"secondary",onClick:async()=>{await W("/api/admin/chaos",{on:!t.chaos}),e(t.chaos?"Chaos off \u2014 narratives use the normal path.":"Chaos on \u2014 next generations use fallback."),a()},children:t.chaos?"Turn chaos OFF":"Turn chaos ON (simulate AI failure)"})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Accelerate check-ins (demo)"}),r.jsx("p",{className:"small mt-1 mb-2",children:\'Pulls all future 2-week/4-week check-in nudges to "now" so the follow-up flow can be demoed instantly.\'}),r.jsx(z,{variant:"secondary",onClick:async()=>{const i=await W("/api/admin/demo/accelerate-checkins",{});e(`${i.moved} check-ins moved to due-now.`)},children:"Make all check-ins due now"})]}),r.jsxs(C,{children:[r.jsx("h3",{children:"Generate a comp code"}),r.jsx("p",{className:"small mt-1 mb-2",children:"100% codes unlock the full report instantly; partial codes reduce the checkout amount."}),r.jsxs("div",{className:"row",children:[r.jsx("input",{className:"input",style:{maxWidth:220},placeholder:"CODE (blank = auto)",value:s,onChange:i=>l(i.target.value.toUpperCase())}),[100,50].map(i=>r.jsxs(z,{size:"sm",variant:"secondary",onClick:async()=>{const o=await W("/api/admin/compcodes",{code:s||void 0,percentOff:i});e(`Code ${o.code} created (${o.percent_off}% off).`),l("")},children:[i,"% off"]},i))]})]})]}):r.jsx(B,{h:120})}function qv(){const[e,t]=x.useState(null);return x.useEffect(()=>{$("/api/admin/audit").then(t).catch(()=>{})},[]),e?r.jsxs("div",{className:"stack",children:[r.jsxs(C,{children:[r.jsx("h3",{children:"System audit trail"}),r.jsx("p",{className:"small mt-1",children:"Every logged action \u2014 recommendation generations, reviews, exports, deletions. Tamper-evident by design."})]}),r.jsx(C,{pad:!1,style:{overflowX:"auto"},children:r.jsxs("table",{className:"timeline-table",style:{minWidth:560},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"When"}),r.jsx("th",{children:"Actor"}),r.jsx("th",{children:"Action"}),r.jsx("th",{children:"Entity"})]})}),r.jsx("tbody",{children:e.logs.map(n=>r.jsxs("tr",{children:[r.jsx("td",{className:"tiny",children:Ie(n.created_at)}),r.jsx("td",{className:"small",children:n.actor_name||"system"}),r.jsx("td",{children:r.jsx("code",{className:"small",children:n.action})}),r.jsx("td",{className:"tiny faint",children:n.entity})]},n.id))})]})})]}):r.jsx(B,{h:120})}function ex(){const{token:e}=Vi(),[t,n]=x.useState(null),[s,l]=x.useState(!1);if(x.useEffect(()=>{$(`/api/account/shared/${e}`).then(n).catch(()=>l(!0))},[e]),s)return r.jsx("div",{style:{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20},children:r.jsx(we,{icon:r.jsx(Jm,{width:40,height:40}),title:"This link is off",body:"The student turned off sharing, or the link expired. Ask them to share again from their roadmap page.",action:r.jsx(K,{className:"btn btn-secondary",to:"/",children:"Career Compass home"})})});if(!t)return r.jsxs("div",{style:{padding:20},children:[r.jsx(B,{h:120}),r.jsx(B,{})]});const a=t.roadmap,i=Math.round(a.progress.done/Math.max(1,a.progress.total)*100);return r.jsxs("div",{style:{minHeight:"100vh",background:"var(--bg)"},children:[r.jsx("header",{className:"topbar no-print",children:r.jsxs("div",{className:"topbar-inner",children:[r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]}),r.jsx("div",{className:"topbar-spacer"}),r.jsxs(L,{tone:"brand",children:[r.jsx(Yi,{})," Read-only view"]})]})}),r.jsxs("div",{className:"page page-narrow",children:[r.jsxs("div",{className:"center mb-3",children:[r.jsxs("div",{className:"eyebrow",children:[t.student_name,"\'s roadmap"]}),r.jsx("h1",{style:{fontSize:"1.8rem"},children:a.career.title}),r.jsx("p",{className:"small",children:a.career.summary}),r.jsxs("p",{className:"tiny faint mt-1",children:["Shared with consent by the student \xB7 generated ",zr(a.generated_at)]})]}),r.jsxs(C,{className:"mb-3",children:[r.jsxs("div",{className:"row",children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{children:"Progress"}),r.jsxs("div",{className:"small muted",children:[a.progress.done," of ",a.progress.total," steps completed"]})]}),r.jsxs("div",{className:"stat",style:{textAlign:"right"},children:[r.jsxs("span",{className:"n",children:[i,"%"]}),r.jsx("span",{className:"l",children:"there"})]})]}),r.jsx("div",{className:"mt-2",children:r.jsx(cn,{value:i})})]}),r.jsx("div",{className:"stack",children:a.milestones.map((o,c)=>r.jsx(C,{pad:!1,className:"milestone",children:r.jsxs("div",{style:{padding:"14px 18px"},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:o.title}),o.high_impact&&r.jsx(L,{tone:"warn",children:"High impact"}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:["by ",zr(o.target_date)]})]}),r.jsx("div",{className:"stack mt-2",style:{gap:6},children:o.steps.map((d,f)=>r.jsxs("div",{className:"row",style:{gap:8},children:[r.jsx("span",{className:`checkbox ${d.done?"done":""}`,style:{width:18,height:18,borderRadius:6},children:r.jsx(q,{width:11,height:11})}),r.jsx("span",{className:`small ${d.done?"muted":""}`,style:{textDecoration:d.done?"line-through":"none"},children:d.text})]},f))}),o.note&&r.jsx("p",{className:"tiny faint mt-2",children:o.note})]})},c))}),a.timeline.length>0&&r.jsxs(C,{pad:!1,style:{overflowX:"auto"},className:"mt-3",children:[r.jsx("div",{style:{padding:"16px 18px 0"},children:r.jsx("h3",{children:"Entrance exam timeline"})}),r.jsxs("table",{className:"timeline-table",style:{minWidth:500,margin:"10px 0"},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"Exam"}),r.jsx("th",{children:"Applications"}),r.jsx("th",{children:"Exam months"}),r.jsx("th",{children:"Results"})]})}),r.jsx("tbody",{children:a.timeline.map((o,c)=>r.jsxs("tr",{children:[r.jsx("td",{children:r.jsx("strong",{children:o.exam})}),r.jsx("td",{children:o.application_window}),r.jsx("td",{children:o.exam_months}),r.jsx("td",{children:o.result_months})]},c))})]})]}),r.jsxs("div",{className:"alert alert-info mt-3 no-print",children:[r.jsx(ml,{}),r.jsxs("div",{className:"small",children:["This is a ",r.jsx("strong",{children:"read-only view"})," shared by ",t.student_name," with explicit consent. Parents: the best support right now is asking about milestone 1 \u2014 not adding more opinions. Every fact in this roadmap is dated and sourced; verify deadlines on official websites before acting."]})]}),r.jsxs("p",{className:"tiny faint center mt-2 no-print",children:["Made with Career Compass \u2014 ",r.jsx(K,{to:"/",children:"one trusted roadmap, not another list of options"})]})]})]})}function tx(){return r.jsx("div",{style:{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20},children:r.jsxs("div",{className:"center",children:[r.jsx(ln,{width:60,height:60}),r.jsx("h1",{className:"mt-2",style:{fontSize:"2.2rem"},children:"Off the map"}),r.jsx("p",{className:"mt-1",children:"This page isn\'t on the compass. Let\'s get you back on course."}),r.jsxs("div",{className:"row mt-3",style:{justifyContent:"center"},children:[r.jsx(z,{as:"a",href:"/",children:"Home"}),r.jsx(z,{as:"a",href:"/app/home",variant:"secondary",children:"My app"})]})]})})}function lt({roles:e,children:t}){const{user:n,loading:s}=Se(),l=Vt();return s?r.jsx("div",{className:"page center",style:{paddingTop:80},children:r.jsx($t,{})}):n?e&&!e.includes(n.role)?r.jsx(Va,{to:"/app/home",replace:!0}):t:r.jsx(Va,{to:"/signin",state:{from:l.pathname},replace:!0})}function nx(){return r.jsx("div",{className:"app-shell",children:r.jsxs(Pm,{children:[r.jsx(re,{path:"/",element:r.jsx(cv,{})}),r.jsx(re,{path:"/how-it-works",element:r.jsx(uv,{})}),r.jsx(re,{path:"/signin",element:r.jsx(dv,{})}),r.jsx(re,{path:"/shared/:token",element:r.jsx(ex,{})}),r.jsxs(re,{path:"/app",element:r.jsx(lt,{children:r.jsx(ov,{})}),children:[r.jsx(re,{index:!0,element:r.jsx(Va,{to:"/app/home",replace:!0})}),r.jsx(re,{path:"home",element:r.jsx(hv,{})}),r.jsx(re,{path:"profile",element:r.jsx(lt,{roles:["student"],children:r.jsx(pv,{})})}),r.jsx(re,{path:"assessment",element:r.jsx(lt,{roles:["student"],children:r.jsx(vv,{})})}),r.jsx(re,{path:"results",element:r.jsx(lt,{roles:["student"],children:r.jsx(gv,{})})}),r.jsx(re,{path:"explore",element:r.jsx(Nv,{})}),r.jsx(re,{path:"explore/:type/:slug",element:r.jsx(kv,{})}),r.jsx(re,{path:"compare/:type",element:r.jsx(Sv,{})}),r.jsx(re,{path:"roadmap",element:r.jsx(lt,{roles:["student"],children:r.jsx(Cv,{})})}),r.jsx(re,{path:"progress",element:r.jsx(lt,{roles:["student"],children:r.jsx(zv,{})})}),r.jsx(re,{path:"ask",element:r.jsx(lt,{roles:["student"],children:r.jsx(Av,{})})}),r.jsx(re,{path:"account",element:r.jsx(Fv,{})}),r.jsx(re,{path:"mentor",element:r.jsx(lt,{roles:["mentor"],children:r.jsx(Qv,{})})}),r.jsx(re,{path:"admin",element:r.jsx(lt,{roles:["admin"],children:r.jsx(Yv,{})})})]}),r.jsx(re,{path:"*",element:r.jsx(tx,{})})]})})}var Nc;const rx=localStorage.getItem("cc-theme")||((Nc=window.matchMedia)!=null&&Nc.call(window,"(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",rx);Od(document.getElementById("root")).render(r.jsx(Rc.StrictMode,{children:r.jsx(Om,{children:r.jsx(Qm,{children:r.jsx(Ym,{children:r.jsx(nx,{})})})})}));\n\n</script>\n    <style>\n*{box-sizing:border-box;margin:0;padding:0}:root{--bg: #f5f3ec;--bg-soft: #edeae0;--surface: #ffffff;--surface-2: #faf9f5;--ink: #1b2534;--muted: #5b6b82;--faint: #8d9aad;--line: #e5e1d6;--brand: #0d5c57;--brand-2: #0f766e;--brand-soft: #e3efed;--accent: #d98324;--accent-soft: #fdf1de;--success: #15803d;--success-soft: #e5f4ea;--danger: #b91c1c;--danger-soft: #fbe9e9;--info: #1d4ed8;--info-soft: #e8eefc;--warn: #a16207;--warn-soft: #fdf3d8;--ring: rgba(13, 92, 87, .22);--shadow-1: 0 1px 2px rgba(23, 34, 48, .05), 0 2px 8px rgba(23, 34, 48, .05);--shadow-2: 0 4px 14px rgba(23, 34, 48, .09), 0 1px 3px rgba(23, 34, 48, .06);--shadow-3: 0 18px 50px rgba(15, 30, 45, .18);--r-s: 10px;--r-m: 14px;--r-l: 20px;--font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;--font-display: ui-serif, Georgia, "Times New Roman", serif;--maxw: 1120px;--bottom-nav-h: 64px}[data-theme=dark]{--bg: #0c121c;--bg-soft: #101826;--surface: #16202e;--surface-2: #1b2637;--ink: #e8edf4;--muted: #93a3ba;--faint: #64748b;--line: #24324a;--brand: #35a397;--brand-2: #46b3a6;--brand-soft: #11302c;--accent: #e8a33d;--accent-soft: #3a2c14;--success: #4ade80;--success-soft: #12291b;--danger: #f87171;--danger-soft: #3a1a1a;--info: #93b4ff;--info-soft: #1a2647;--warn: #fbbf24;--warn-soft: #332a12;--ring: rgba(69, 179, 166, .3);--shadow-1: 0 1px 2px rgba(0,0,0,.3), 0 2px 8px rgba(0,0,0,.25);--shadow-2: 0 4px 14px rgba(0,0,0,.4);--shadow-3: 0 18px 50px rgba(0,0,0,.55)}html{-webkit-text-size-adjust:100%}body{font-family:var(--font);background:var(--bg);color:var(--ink);line-height:1.55;font-size:15.5px;min-height:100vh;-webkit-font-smoothing:antialiased}#root{min-height:100vh;display:flex;flex-direction:column}h1,h2,h3,.display{font-family:var(--font-display);font-weight:600;line-height:1.18;letter-spacing:-.01em}h1{font-size:2rem}h2{font-size:1.45rem}h3{font-size:1.12rem}a{color:var(--brand-2);text-decoration:none}a:hover{text-decoration:underline}p{color:var(--muted)}strong{color:var(--ink)}button{font-family:inherit}.app-shell{flex:1;width:100%}.topbar{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--surface) 88%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.topbar-inner{max-width:var(--maxw);margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:12px}.brand{display:flex;align-items:center;gap:9px;font-family:var(--font-display);font-weight:700;font-size:1.12rem;color:var(--ink);text-decoration:none!important}.brand:hover{opacity:.85}.brand .compass{width:28px;height:28px;flex:none}.topnav{display:none;gap:4px;margin-left:20px}.topnav a{padding:7px 12px;border-radius:999px;color:var(--muted);font-weight:500;font-size:.93rem}.topnav a:hover{background:var(--bg-soft);color:var(--ink);text-decoration:none}.topnav a.active{background:var(--brand-soft);color:var(--brand);font-weight:600}.topbar-spacer{flex:1}@media (min-width: 900px){.topnav{display:flex}}.icon-btn{position:relative;width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s}.icon-btn:hover{background:var(--bg-soft)}.icon-btn .dot{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--danger);color:#fff;font-size:.64rem;font-weight:700;display:flex;align-items:center;justify-content:center}.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:40;height:var(--bottom-nav-h);background:color-mix(in srgb,var(--surface) 94%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid var(--line);display:flex;padding-bottom:env(safe-area-inset-bottom)}.bottom-nav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--faint);font-size:.68rem;font-weight:600;text-decoration:none!important}.bottom-nav a svg{width:21px;height:21px}.bottom-nav a.active{color:var(--brand)}@media (min-width: 900px){.bottom-nav{display:none}}.page{max-width:var(--maxw);margin:0 auto;padding:22px 16px calc(var(--bottom-nav-h) + 30px);width:100%}@media (min-width: 900px){.page{padding-bottom:60px}}.page-narrow{max-width:760px}.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-l);box-shadow:var(--shadow-1)}.card-pad{padding:20px}.card-2{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-m)}.stack{display:flex;flex-direction:column;gap:14px}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.grid-2,.grid-3{display:grid;grid-template-columns:1fr;gap:14px}@media (min-width: 700px){.grid-2{grid-template-columns:1fr 1fr}.grid-3{grid-template-columns:1fr 1fr 1fr}}.spacer{flex:1}.muted{color:var(--muted)}.faint{color:var(--faint)}.small{font-size:.85rem}.tiny{font-size:.78rem}.center{text-align:center}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;border:1px solid transparent;cursor:pointer;font-weight:600;font-size:.95rem;padding:11px 18px;transition:.15s;text-decoration:none!important;line-height:1.2;min-height:44px}.btn:disabled{opacity:.55;cursor:not-allowed}.btn-primary{background:var(--brand);color:#fff;box-shadow:var(--shadow-1)}.btn-primary:hover:not(:disabled){background:var(--brand-2)}.btn-secondary{background:var(--surface);border-color:var(--line);color:var(--ink)}.btn-secondary:hover:not(:disabled){background:var(--bg-soft)}.btn-ghost{background:transparent;color:var(--brand-2)}.btn-ghost:hover:not(:disabled){background:var(--brand-soft)}.btn-danger{background:var(--danger);color:#fff}.btn-sm{padding:7px 13px;min-height:36px;font-size:.87rem;border-radius:10px}.btn-lg{padding:14px 26px;font-size:1.05rem}.btn-block{width:100%}.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:700;letter-spacing:.01em}.badge-brand{background:var(--brand-soft);color:var(--brand)}.badge-accent{background:var(--accent-soft);color:var(--accent)}.badge-success{background:var(--success-soft);color:var(--success)}.badge-danger{background:var(--danger-soft);color:var(--danger)}.badge-info{background:var(--info-soft);color:var(--info)}.badge-warn{background:var(--warn-soft);color:var(--warn)}.badge-muted{background:var(--bg-soft);color:var(--muted)}.badge svg{width:12px;height:12px}.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:.85rem;color:var(--muted);cursor:pointer;transition:.15s;font-weight:500;-webkit-user-select:none;user-select:none}.chip:hover{border-color:var(--brand-2);color:var(--ink)}.chip.on{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;font-weight:700;color:var(--brand-2)}.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:.88rem;font-weight:600;color:var(--ink)}.field .hint{font-size:.78rem;color:var(--faint)}.input,select.input,textarea.input{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-size:.95rem;font-family:inherit;transition:.15s}.input:focus{outline:none;border-color:var(--brand-2);box-shadow:0 0 0 4px var(--ring)}textarea.input{resize:vertical;min-height:84px}.input-lg{padding:14px 16px;font-size:1.05rem}.rate-row{display:flex;gap:8px}.rate-opt{flex:1;padding:9px 2px;text-align:center;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font-weight:700;font-size:.92rem;color:var(--muted);transition:.12s}.rate-opt:hover{border-color:var(--brand-2)}.rate-opt.on{background:var(--brand);border-color:var(--brand);color:#fff}.rate-caption{font-size:.74rem;color:var(--faint);display:flex;justify-content:space-between;margin-top:3px}.progressbar{height:8px;border-radius:999px;background:var(--bg-soft);overflow:hidden}.progressbar>div{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--brand-2));transition:width .35s ease}.ring{transform:rotate(-90deg)}.ring .track{stroke:var(--bg-soft)}.ring .fill{stroke:var(--brand);transition:stroke-dashoffset .6s ease}.ring-label{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.toasts{position:fixed;top:14px;left:50%;transform:translate(-50%);z-index:100;display:flex;flex-direction:column;gap:8px;width:min(94vw,460px)}.toast{background:var(--ink);color:var(--bg);border-radius:12px;padding:11px 16px;font-size:.9rem;font-weight:500;box-shadow:var(--shadow-3);display:flex;gap:10px;align-items:center;animation:toast-in .25s ease}[data-theme=dark] .toast{background:#e8edf4;color:#101826}.toast.err{background:var(--danger);color:#fff}@keyframes toast-in{0%{opacity:0;transform:translateY(-8px)}}.modal-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:#0c121c8c;z-index:90;display:flex;align-items:flex-end;justify-content:center;padding:0}@media (min-width: 640px){.modal-overlay{align-items:center;padding:24px}}.modal{background:var(--surface);width:100%;max-width:560px;max-height:88vh;overflow-y:auto;border-radius:var(--r-l) var(--r-l) 0 0;box-shadow:var(--shadow-3);animation:modal-in .22s ease}@media (min-width: 640px){.modal{border-radius:var(--r-l)}}@keyframes modal-in{0%{opacity:0;transform:translateY(16px)}}.modal-head{display:flex;align-items:flex-start;gap:12px;padding:20px 20px 0}.modal-body{padding:16px 20px 20px}.skeleton{background:linear-gradient(90deg,var(--bg-soft) 25%,var(--surface-2) 50%,var(--bg-soft) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:var(--r-m)}@keyframes shimmer{to{background-position:-200% 0}}.skeleton-row{height:90px}.divider{height:1px;background:var(--line);border:0;margin:14px 0}.locked-veil{filter:blur(5px);-webkit-user-select:none;user-select:none;pointer-events:none;opacity:.65}.stat{display:flex;flex-direction:column;gap:2px}.stat .n{font-family:var(--font-display);font-size:1.7rem;font-weight:700;color:var(--ink)}.stat .l{font-size:.78rem;color:var(--muted);font-weight:600}.source-tag{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;color:var(--faint)}.source-tag svg{width:12px;height:12px}.stale{color:var(--warn)}.check-item{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:var(--r-m);border:1px solid var(--line);background:var(--surface);cursor:pointer;transition:.15s}.check-item:hover{border-color:var(--brand-2)}.check-item.done{background:var(--success-soft);border-color:transparent}.check-item.done .check-text{text-decoration:line-through;color:var(--muted)}.checkbox{width:22px;height:22px;border-radius:7px;border:2px solid var(--line);flex:none;display:flex;align-items:center;justify-content:center;margin-top:1px}.check-item.done .checkbox{background:var(--success);border-color:var(--success)}.checkbox svg{width:13px;height:13px;color:#fff;opacity:0}.check-item.done .checkbox svg{opacity:1}.tabs{display:flex;gap:4px;overflow-x:auto;padding:4px;background:var(--bg-soft);border-radius:14px;-webkit-overflow-scrolling:touch}.tabs button{flex:none;padding:9px 16px;border-radius:10px;border:0;background:transparent;color:var(--muted);font-weight:600;font-size:.9rem;cursor:pointer;white-space:nowrap}.tabs button.on{background:var(--surface);color:var(--ink);box-shadow:var(--shadow-1)}.notif-item{display:flex;gap:12px;padding:12px 14px;border-radius:var(--r-m);border:1px solid var(--line);background:var(--surface);cursor:pointer}.notif-item.unread{border-left:3px solid var(--brand);background:var(--brand-soft)}.landing-hero{max-width:var(--maxw);margin:0 auto;padding:46px 20px 30px;display:grid;gap:30px}@media (min-width: 940px){.landing-hero{grid-template-columns:1.1fr .9fr;align-items:center;padding-top:76px}}.hero-h1{font-size:2.35rem}@media (min-width: 700px){.hero-h1{font-size:3.1rem}}.hero-quote{border-left:3px solid var(--accent);padding:4px 0 4px 14px;font-style:italic;color:var(--muted)}.hero-visual{position:relative}.hero-card{padding:18px;display:flex;flex-direction:column;gap:12px}.landing-section{max-width:var(--maxw);margin:0 auto;padding:34px 20px}.landing-section h2{margin-bottom:6px}.step-card{padding:18px;display:flex;flex-direction:column;gap:8px;height:100%}.step-num{width:34px;height:34px;border-radius:11px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:var(--font-display)}.trust-strip{display:flex;flex-wrap:wrap;gap:10px}.pricing-card{padding:26px;display:flex;flex-direction:column;gap:14px;height:100%}.price{font-family:var(--font-display);font-size:2.6rem;font-weight:700}.price small{font-size:1rem;color:var(--muted);font-weight:400}.tick-list{display:flex;flex-direction:column;gap:9px}.tick-list div{display:flex;gap:9px;align-items:flex-start;font-size:.93rem;color:var(--ink)}.tick-list svg{width:17px;height:17px;color:var(--success);flex:none;margin-top:2px}.assessment-wrap{max-width:640px;margin:0 auto}.option-btn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;border-radius:var(--r-m);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-size:.98rem;font-weight:500;cursor:pointer;transition:.13s;margin-bottom:9px}.option-btn:hover{border-color:var(--brand-2)}.option-btn.on{border-color:var(--brand);background:var(--brand-soft);font-weight:600}.option-key{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:700;flex:none;font-size:.85rem;color:var(--muted)}.option-btn.on .option-key{background:var(--brand);border-color:var(--brand);color:#fff}.match-card{padding:18px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden}.match-head{display:flex;gap:14px;align-items:center}.match-score{position:relative;width:64px;height:64px;flex:none}.match-title{font-family:var(--font-display);font-size:1.2rem;font-weight:700}.why-box{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-m);padding:14px;font-size:.92rem;color:var(--ink)}.log-item{display:flex;flex-direction:column;gap:3px;padding:11px 13px;border-radius:var(--r-m);background:var(--surface-2);border:1px solid var(--line)}.log-label{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--brand-2)}.milestone{padding:0;overflow:hidden}.milestone-head{display:flex;gap:12px;align-items:center;padding:16px 18px;cursor:pointer}.milestone-date{font-size:.76rem;color:var(--faint);font-weight:600}.timeline-table{width:100%;border-collapse:collapse;font-size:.87rem}.timeline-table th{text-align:left;padding:8px 10px;color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--line)}.timeline-table td{padding:9px 10px;border-bottom:1px solid var(--line);color:var(--ink)}.timeline-table tr:last-child td{border-bottom:0}.paywall-overlay{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(180deg,transparent 0%,var(--surface) 12%);display:flex;align-items:center;justify-content:center;padding:18px}.checkout-sheet{background:var(--surface);border-radius:var(--r-l);box-shadow:var(--shadow-3);width:100%;max-width:420px;overflow:hidden}.checkout-top{background:#0b2b5c;color:#fff;padding:16px 20px;display:flex;align-items:center;gap:10px}.checkout-amount{font-family:var(--font-display);font-size:1.6rem;font-weight:700}.upi-id{letter-spacing:.12em;font-family:ui-monospace,monospace}@media print{body{background:#fff}.topbar,.bottom-nav,.no-print,.toasts,.modal-overlay{display:none!important}.page{max-width:100%;padding:0}.card{box-shadow:none;border:1px solid #ddd;break-inside:avoid}}.flex{display:flex}.flex-1{flex:1}.mt-1{margin-top:6px}.mt-2{margin-top:12px}.mt-3{margin-top:18px}.mt-4{margin-top:26px}.mb-1{margin-bottom:6px}.mb-2{margin-bottom:12px}.mb-3{margin-bottom:18px}.gap-1{gap:6px}.gap-2{gap:12px}.gap-3{gap:18px}.w-full{width:100%}.hidden{display:none!important}.alert{border-radius:var(--r-m);padding:12px 15px;font-size:.9rem;display:flex;gap:10px;align-items:flex-start}.alert-warn{background:var(--warn-soft);color:var(--warn)}.alert-info{background:var(--info-soft);color:var(--info)}.alert-danger{background:var(--danger-soft);color:var(--danger)}.alert-success{background:var(--success-soft);color:var(--success)}.alert svg{width:17px;height:17px;flex:none;margin-top:2px}.demo-banner{background:var(--accent-soft);color:var(--accent);font-size:.8rem;font-weight:600;padding:6px 14px;text-align:center}.ascii-loader{display:inline-flex;gap:4px;align-items:center}.ascii-loader i{width:7px;height:7px;border-radius:50%;background:var(--brand);animation:bounce 1.2s infinite}.ascii-loader i:nth-child(2){animation-delay:.15s}.ascii-loader i:nth-child(3){animation-delay:.3s}@keyframes bounce{0%,60%,to{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}.fade-in{animation:fade-in .3s ease}@keyframes fade-in{0%{opacity:0;transform:translateY(6px)}}\n\n</style>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n';
  }
});

// server/index.js
var server_exports = {};
import express from "express";
import cookieParser from "cookie-parser";
import path3 from "node:path";
import fs3 from "node:fs";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var __dirname3, app, PORT, HOST, PUBLIC_DIR, GENERATING_MS, QUEUED_MS;
var init_server = __esm({
  "server/index.js"() {
    init_db();
    init_auth();
    init_auth2();
    init_profile();
    init_assessment();
    init_catalog();
    init_recommendations();
    init_roadmaps();
    init_mentor();
    init_admin();
    init_account();
    init_roadmap();
    init_db_helper();
    init_embedded_public();
    __dirname3 = path3.dirname(fileURLToPath3(import.meta.url));
    app = express();
    PORT = Number(process.env.PORT || 3e3);
    HOST = process.env.HOST || "0.0.0.0";
    app.disable("x-powered-by");
    app.use(express.json({ limit: "1mb" }));
    app.use(cookieParser());
    app.use(attachUser);
    app.get("/api/health", (_req, res) => res.json({ ok: true, data: { name: "Career Compass API", time: (/* @__PURE__ */ new Date()).toISOString() } }));
    app.use("/api/auth", authRouter);
    app.use("/api/profile", profileRouter);
    app.use("/api/assessment", assessmentRouter);
    app.use("/api/catalog", catalogRouter);
    app.use("/api/recommendations", recRouter);
    app.use("/api/roadmap", roadmapRouter);
    app.use("/api/mentor", mentorRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api/account", accountRouter);
    app.use("/api", (_req, res) => res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Unknown API route." } }));
    PUBLIC_DIR = path3.join(__dirname3, "public");
    if (fs3.existsSync(PUBLIC_DIR)) {
      app.use(express.static(PUBLIC_DIR, { maxAge: "1h", setHeaders: (res, p) => {
        if (p.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
      } }));
      app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path3.join(PUBLIC_DIR, "index.html")));
    } else if (EMBEDDED_HTML) {
      const sendSpa = (_req, res) => {
        res.set("Cache-Control", "no-cache");
        res.type("html").send(EMBEDDED_HTML);
      };
      app.get(/^(?!\/api\/).*/, sendSpa);
    } else {
      app.get("/", (_req, res) => res.send("<h1>Career Compass</h1><p>Frontend not built yet. Run <code>npm run build</code>.</p>"));
    }
    app.use((err, _req, res, _next) => {
      console.error("[error]", err);
      res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "Something broke on our side. The team has been notified (check server logs)." } });
    });
    GENERATING_MS = 3800;
    QUEUED_MS = 1200;
    setInterval(() => {
      try {
        const toStart = db.prepare(`SELECT * FROM roadmaps WHERE status = 'queued' AND datetime(created_at, '+${QUEUED_MS / 1e3} seconds') <= datetime('now')`).all();
        for (const rm of toStart) db.prepare(`UPDATE roadmaps SET status = 'generating', updated_at = datetime('now') WHERE id = ?`).run(rm.id);
        const toFinish = db.prepare(`SELECT * FROM roadmaps WHERE status = 'generating' AND datetime(updated_at, '+${GENERATING_MS / 1e3} seconds') <= datetime('now')`).all();
        for (const rm of toFinish) {
          try {
            const user = db.prepare("SELECT * FROM users WHERE id = ?").get(rm.user_id);
            const profile = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(rm.user_id);
            const results = db.prepare("SELECT * FROM assessment_results WHERE user_id = ?").get(rm.user_id);
            const career = db.prepare("SELECT * FROM careers WHERE id = ?").get(rm.career_id);
            const built = buildRoadmap(user, profile, results, career);
            const simulateFailure = getSetting("simulate_ai_failure", "0") === "1";
            const hasLLM = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
            const aiMode = simulateFailure ? "fallback" : hasLLM ? "llm" : "local";
            const review = built.high_impact ? "pending" : "none";
            db.prepare(`UPDATE roadmaps SET status='ready', milestones_json=?, timeline_json=?, resources_json=?, high_impact=?, review_status=?, ai_mode=?, generated_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(JSON.stringify(built.milestones), JSON.stringify(built.timeline), JSON.stringify(built.resources), built.high_impact ? 1 : 0, review, aiMode, rm.id);
            db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
              rm.user_id,
              "roadmap",
              review === "pending" ? "Your roadmap is ready \u2014 one human check first" : "Your personalised roadmap is ready",
              review === "pending" ? "Your roadmap includes a high-impact step (e.g., a timeline decision), so a counsellor reviews it before it reaches you. Usually within a few hours." : "Generated from your profile, assessment and the Career Compass knowledge base. Start with milestone 1.",
              "/app/roadmap"
            );
            db.prepare(`INSERT INTO notifications (user_id,type,title,body,link,due_at) VALUES (?,?,?,?,?, datetime('now','+14 days'))`).run(rm.user_id, "checkin", "2-week check-in", "Two weeks since your roadmap \u2014 what did you act on? What is blocked?", "/app/roadmap");
            db.prepare(`INSERT INTO notifications (user_id,type,title,body,link,due_at) VALUES (?,?,?,?,?, datetime('now','+28 days'))`).run(rm.user_id, "checkin", "4-week check-in", "One month in \u2014 review your milestones honestly and adjust.", "/app/roadmap");
            audit(rm.user_id, "roadmap.ready", `roadmap:${rm.id}`, { ai_mode: aiMode, high_impact: built.high_impact });
            console.log(`[worker] roadmap ${rm.id} ready (ai=${aiMode}, review=${review})`);
          } catch (err) {
            console.error("[worker] roadmap failed", rm.id, err);
            db.prepare(`UPDATE roadmaps SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(String(err.message).slice(0, 300), rm.id);
            db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(rm.user_id, "roadmap", "Roadmap generation failed", "Something went wrong generating your roadmap. You can retry from the roadmap page.", "/app/roadmap");
          }
        }
      } catch (err) {
        console.error("[worker] tick error", err);
      }
    }, 1200).unref();
    app.listen(PORT, HOST, () => {
      const counts = {
        careers: db.prepare("SELECT COUNT(*) c FROM careers").get().c,
        colleges: db.prepare("SELECT COUNT(*) c FROM colleges").get().c,
        users: db.prepare("SELECT COUNT(*) c FROM users").get().c
      };
      console.log(`Career Compass running on http://${HOST}:${PORT}`);
      console.log(`DB: ${counts.careers} careers, ${counts.colleges} colleges, ${counts.users} users`);
    });
  }
});

// server/deploy-entry.js
process.env.DATA_DIR = process.env.DATA_DIR || "./data";
var { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
var n = db2.prepare("SELECT COUNT(*) c FROM users").get().c;
if (n === 0) {
  console.log("[deploy] empty database \u2014 seeding demo data\u2026");
  await init_seed().then(() => seed_exports);
  console.log("[deploy] seed complete");
}
await Promise.resolve().then(() => (init_server(), server_exports));
