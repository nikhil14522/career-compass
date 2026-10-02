var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
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
  paid_unlock INTEGER NOT NULL DEFAULT 0,
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
import crypto from "node:crypto";
var __dirname2, FRESH, DB_PATH, RUN_AS_CLI, seeded;
var init_seed = __esm({
  async "server/seed/index.js"() {
    init_db();
    init_questions();
    init_careers();
    init_courses();
    init_exams();
    init_colleges();
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
        console.log(`Catalogs: ${db.prepare("SELECT COUNT(*) c FROM careers").get().c} careers, ${db.prepare("SELECT COUNT(*) c FROM courses").get().c} courses, ${db.prepare("SELECT COUNT(*) c FROM colleges").get().c} colleges, ${db.prepare("SELECT COUNT(*) c FROM exams").get().c} exams`);
        const mkUser = (name, email, phone, role, opts = {}) => {
          const ref = "CC-" + crypto.randomBytes(3).toString("hex").toUpperCase();
          const r = db.prepare(`INSERT INTO users (role,name,email,phone,is_minor,consent_status,referral_code,referred_by,paid_unlock,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(role, name, email, phone, opts.is_minor ? 1 : 0, opts.consent_status || "not_applicable", opts.referral || ref, opts.referred_by || null, opts.paid_unlock ? 1 : 0, opts.is_demo === false ? 0 : 1);
          return r.lastInsertRowid;
        };
        const adminId = mkUser("Admin (Counsellor)", "admin@demo.cc", "9000000001", "admin");
        const m1 = mkUser("Dr. Neha Verma", "mentor@demo.cc", "9000000002", "mentor");
        const m2 = mkUser("Dr. Arjun Mehta", "arjun.mentor@demo.cc", "9000000003", "mentor");
        const m3 = mkUser("Adv. Sana Khan", "sana.mentor@demo.cc", "9000000004", "mentor");
        const insMentor = db.prepare("INSERT INTO mentors (user_id,verified,fields_json,headline,years_experience,capacity) VALUES (?,?,?,?,?,?)");
        insMentor.run(m1, 1, JSON.stringify(["Software Engineering", "Technology", "Data & AI"]), "Staff Software Engineer, Google \xB7 12 yrs", 12, 15);
        insMentor.run(m2, 1, JSON.stringify(["Medicine", "Psychology", "Healthcare"]), "Consultant Psychiatrist, AIIMS Delhi \xB7 10 yrs", 10, 12);
        insMentor.run(m3, 1, JSON.stringify(["Civil Services", "Law", "Business"]), "Ex-IAS (2013 batch), now mentor \xB7 9 yrs", 9, 10);
        const parentId = mkUser("Rajesh Sharma (Parent)", "parent@demo.cc", "9000000005", "parent");
        const studentRef = "CC-AARAV01";
        const studentId = mkUser("Aarav Sharma", "student@demo.cc", "9000000006", "student", { is_minor: true, consent_status: "given", paid_unlock: true, referral: studentRef });
        db.prepare("UPDATE users SET parent_user_id = ?, consent_code = ? WHERE id = ?").run(parentId, "PC-" + crypto.randomBytes(3).toString("hex").toUpperCase(), studentId);
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
          const shareToken = crypto.randomBytes(12).toString("hex");
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
        db.prepare(`INSERT INTO payments (user_id,item,amount,provider,provider_ref,status) VALUES (?,?,?,?,?,?)`).run(studentId, "roadmap_report", 499, "mock", "pay_demo_" + crypto.randomBytes(4).toString("hex"), "paid");
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
          const gid = mkUser(name, email, null, "student", { paid_unlock: paid, referred_by: referredBy, is_demo: true });
          ghostIds.push(gid);
          db.prepare(`INSERT INTO student_profiles (user_id,class_level,stream,subjects_json,goals_json,budget,city,target_year) VALUES (?,?,?,?,?,?,?,?)`).run(gid, "Class 12", "Science", JSON.stringify({ Biology: 4, Chemistry: 4, Physics: 3 }), JSON.stringify([g1, g2]), "low", "Patna, Bihar", (/* @__PURE__ */ new Date()).getFullYear() + 1);
          if (paid) db.prepare(`INSERT INTO payments (user_id,item,amount,provider,provider_ref,status) VALUES (?,?,?,?,?,?)`).run(gid, "roadmap_report", 499, "mock", "pay_" + crypto.randomBytes(4).toString("hex"), "paid");
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
        db.prepare(`INSERT OR IGNORE INTO comp_codes (code,percent_off,active,created_by) VALUES ('EARLY100',100,1,?)`).run(adminId);
        db.prepare(`INSERT OR IGNORE INTO comp_codes (code,percent_off,active,created_by) VALUES ('FRIEND50',50,1,?)`).run(adminId);
        setSetting("price_report", "499");
        audit(adminId, "seed.run", "database", { careers: db.prepare("SELECT COUNT(*) c FROM careers").get().c });
        db.prepare(`INSERT INTO meta (key,value) VALUES ('seed_version', ?)`).run("1.0.0");
      });
      TX();
    }
    if (RUN_AS_CLI) {
      console.log("\nSeed complete. Demo accounts (sign in with email; OTP shows in the UI in demo mode):");
      console.log("  Student : student@demo.cc   (fully worked: assessment \u2713 matches \u2713 roadmap \u2713 paid \u2713)");
      console.log("  Parent  : parent@demo.cc");
      console.log("  Mentor  : mentor@demo.cc");
      console.log("  Admin   : admin@demo.cc");
      console.log("  Comp codes: EARLY100 (100% off), FRIEND50 (50% off)");
      process.exit(0);
    }
  }
});

// server/auth.js
import crypto2 from "node:crypto";
function normalizeIdentifier(id) {
  const trimmed = String(id || "").trim();
  if (trimmed.includes("@")) return { kind: "email", value: trimmed.toLowerCase() };
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+91")) return { kind: "phone", value: digits.slice(3) };
  if (digits.length === 10 && /^\d+$/.test(digits)) return { kind: "phone", value: digits };
  return null;
}
function requestOtp(identifier) {
  const code = String(Math.floor(1e5 + Math.random() * 9e5));
  otps.set(identifier, { code, expires: Date.now() + OTP_TTL_MS, attempts: 0 });
  return code;
}
function verifyOtp(identifier, code) {
  const rec = otps.get(identifier);
  if (!rec || Date.now() > rec.expires) return false;
  rec.attempts += 1;
  if (rec.attempts > 5) {
    otps.delete(identifier);
    return false;
  }
  if (String(code).trim() !== rec.code) return false;
  otps.delete(identifier);
  return true;
}
function generateCode(prefix, len = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${s}`;
}
function createSession(userId) {
  const token = crypto2.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return token;
}
function destroySession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
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
    paid_unlock: !!u.paid_unlock,
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
var OTP_TTL_MS, SESSION_TTL_MS, otps;
var init_auth = __esm({
  "server/auth.js"() {
    init_db();
    OTP_TTL_MS = 10 * 60 * 1e3;
    SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
    otps = /* @__PURE__ */ new Map();
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
var authRouter;
var init_auth2 = __esm({
  "server/routes/auth.js"() {
    init_db();
    init_auth();
    init_utils();
    authRouter = Router();
    authRouter.post("/otp/request", (req, res) => {
      const { identifier, mode } = req.body || {};
      const id = normalizeIdentifier(identifier);
      if (!id) return fail(res, 400, "BAD_IDENTIFIER", "Enter a valid email address or 10-digit mobile number.");
      if (!rateLimit(`otp:${id.value}`)) return fail(res, 429, "RATE_LIMITED", "Too many OTP requests. Wait a few minutes and try again.");
      const key = `${id.kind}:${id.value}`;
      const existing = db.prepare(`SELECT * FROM users WHERE ${id.kind} = ? AND deleted_at IS NULL`).get(id.value);
      if (!existing && mode === "signin") {
        return res.json({ ok: true, data: { exists: false, needsSignup: true, message: "No account found with that email/phone. Sign up instead \u2014 it takes a minute." } });
      }
      const code = requestOtp(key);
      sendEmail(id.kind === "email" ? id.value : `+91${id.value}`, "Your Career Compass OTP", `Your OTP is ${code}. Valid for 10 minutes.`);
      const devOtp = process.env.DEMO_MODE !== "false" ? code : void 0;
      res.json({ ok: true, data: { exists: !!existing, name: existing?.name, role: existing?.role, devOtp } });
    });
    authRouter.post("/otp/verify", (req, res) => {
      const { identifier, otp, signup } = req.body || {};
      const id = normalizeIdentifier(identifier);
      if (!id) return fail(res, 400, "BAD_IDENTIFIER", "Invalid email/phone.");
      const key = `${id.kind}:${id.value}`;
      if (!verifyOtp(key, otp)) return fail(res, 401, "BAD_OTP", "That OTP is wrong or expired. Request a new one.");
      let user = db.prepare(`SELECT * FROM users WHERE ${id.kind} = ? AND deleted_at IS NULL`).get(id.value);
      if (!user) {
        const { name, role = "student", isMinor, parentConsentCode, referralCode, consent } = signup || {};
        if (!name || name.trim().length < 2) return fail(res, 400, "NAME_REQUIRED", "Please tell us your name.");
        if (!["student", "parent"].includes(role)) return fail(res, 400, "ROLE", "Sign-up is open to students and parents. Mentors join by invitation.");
        let referred_by = null;
        if (referralCode) {
          const ref = db.prepare("SELECT id FROM users WHERE referral_code = ? AND deleted_at IS NULL").get(String(referralCode).trim().toUpperCase());
          if (ref) referred_by = ref.id;
        }
        let parent_user_id = null, consent_status = "not_applicable", consent_code = null;
        if (role === "student" && isMinor) {
          if (!consent) return fail(res, 400, "CONSENT", "A parent/guardian must consent for students under 18.");
          consent_status = "pending";
          consent_code = generateCode("PC-");
        }
        if (role === "parent") {
          if (!parentConsentCode) return fail(res, 400, "CONSENT_CODE", "Parents join with the consent code from their child's account.");
          const child = db.prepare("SELECT * FROM users WHERE consent_code = ? AND deleted_at IS NULL").get(String(parentConsentCode).trim().toUpperCase());
          if (!child) return fail(res, 400, "CONSENT_CODE", "That consent code doesn't match any student. Ask your child to share it from their profile.");
          parent_user_id = null;
          const r2 = db.prepare(`INSERT INTO users (role,name,${id.kind},referral_code,is_demo) VALUES (?,?,?,?,0)`).run("parent", name.trim(), id.value, generateCode("CC-", 6));
          const parentId = r2.lastInsertRowid;
          db.prepare("UPDATE users SET parent_user_id = ?, consent_status = ? WHERE id = ?").run(parentId, "given", child.id);
          db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(child.id, "consent", "Parent linked", `${name.trim()} is now linked to your account and can view roadmaps you share.`, "/app/account");
          audit(parentId, "consent.linked", `user:${child.id}`, {});
          const token3 = loginUser(res, { id: parentId, role: "parent", name: name.trim() });
          const u = db.prepare("SELECT * FROM users WHERE id = ?").get(parentId);
          return res.json({ ok: true, data: { user: publicUser(u), token: token3, isNew: true, role: "parent" } });
        }
        const r = db.prepare(`INSERT INTO users (role,name,${id.kind},is_minor,consent_status,consent_code,referral_code,referred_by,is_demo) VALUES (?,?,?,?,?,?,?,?,0)`).run(role, name.trim(), id.value, isMinor ? 1 : 0, consent_status, consent_code, generateCode("CC-", 6), referred_by);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(r.lastInsertRowid);
        if (role === "student") db.prepare("INSERT INTO student_profiles (user_id) VALUES (?)").run(user.id);
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
        const token2 = loginUser(res, user);
        return res.json({ ok: true, data: { user: publicUser(user), token: token2, isNew: true, consentCode: consent_code || void 0 } });
      }
      const token = loginUser(res, user);
      res.json({ ok: true, data: { user: publicUser(user), token, isNew: false } });
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
      if (!rows2.length) return res.json({ ok: true, data: { paid: !!req.user.paid_unlock, matches: [], has_any: false } });
      const sorted = [...rows2].sort((a, b) => (a.kind === "wildcard") - (b.kind === "wildcard") || b.match_score - a.match_score);
      const matches = sorted.map((r, i) => shapeRec(r, !!req.user.paid_unlock, i + 1));
      res.json({ ok: true, data: { paid: !!req.user.paid_unlock, matches, has_any: true } });
    });
    recRouter.get("/:id", requireAuth("student"), (req, res) => {
      const r = db.prepare(`SELECT * FROM recommendations WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
      if (!r) return fail(res, 404, "NOT_FOUND", "Recommendation not found.");
      const rank = db.prepare(`SELECT COUNT(*) + 1 AS r FROM recommendations WHERE user_id = ? AND status IN ('active','pending_review') AND match_score > ? AND kind = 'primary'`).get(req.user.id, r.match_score).r;
      const shaped = shapeRec(r, !!req.user.paid_unlock || r.kind === "primary" && rank === 1, rank);
      if (shaped.locked) return fail(res, 402, "PAYMENT_REQUIRED", "Unlock the full report to see this match.");
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
      if (!req.user.paid_unlock) return fail(res, 402, "PAYMENT_REQUIRED", "The personalised roadmap is part of the \u20B9499 report.");
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

// server/routes/payments.js
import { Router as Router8 } from "express";
import crypto4 from "node:crypto";
var paymentRouter, PRICE;
var init_payments = __esm({
  "server/routes/payments.js"() {
    init_db();
    init_auth();
    init_utils();
    paymentRouter = Router8();
    PRICE = () => Number(db.prepare(`SELECT value FROM settings WHERE key = 'price_report'`).get()?.value || 499);
    paymentRouter.get("/pricing", (_req, res) => {
      res.json({
        ok: true,
        data: {
          price: PRICE(),
          provider: process.env.PAYMENT_PROVIDER === "razorpay" ? "razorpay" : "mock",
          free: ["60-question assessment", "Personality & aptitude profile", "Your #1 career match with full reasoning"],
          paid: ["All matches + wildcards", 'Full "why this fits you" narratives', "Personal roadmap with exam timeline", "PDF export & parent sharing", "Ask-a-Professional access", "2-week & 4-week check-ins"]
        }
      });
    });
    paymentRouter.post("/order", requireAuth("student"), (req, res) => {
      const { compCode } = req.body || {};
      let amount = PRICE();
      let comp = null;
      if (compCode) {
        comp = db.prepare("SELECT * FROM comp_codes WHERE code = ? AND active = 1 AND used_by IS NULL").get(String(compCode).trim().toUpperCase());
        if (!comp) return fail(res, 400, "BAD_CODE", "That code is invalid, used, or expired.");
        amount = Math.round(PRICE() * (1 - comp.percent_off / 100));
      }
      const providerRef = "order_" + crypto4.randomBytes(8).toString("hex");
      const r = db.prepare("INSERT INTO payments (user_id,item,amount,provider,provider_ref,status) VALUES (?,?,?,?,?,?)").run(req.user.id, "roadmap_report", amount, process.env.PAYMENT_PROVIDER === "razorpay" ? "razorpay" : "mock", providerRef, "created");
      res.json({
        ok: true,
        data: {
          orderId: r.lastInsertRowid,
          providerRef,
          amount,
          currency: "INR",
          comp: comp ? { code: comp.code, percent_off: comp.percent_off } : null,
          provider: process.env.PAYMENT_PROVIDER === "razorpay" ? "razorpay" : "mock"
        }
      });
    });
    paymentRouter.post("/verify", requireAuth("student"), (req, res) => {
      const { orderId, success, providerRef } = req.body || {};
      const p = db.prepare("SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = ?").get(orderId, req.user.id, "created");
      if (!p) return fail(res, 404, "NOT_FOUND", "Order not found.");
      if (!success) {
        db.prepare(`UPDATE payments SET status = 'failed' WHERE id = ?`).run(p.id);
        return res.json({ ok: true, data: { status: "failed", message: "Payment failed \u2014 no money taken. You can retry." } });
      }
      if (providerRef && providerRef !== p.provider_ref) return fail(res, 400, "BAD_SIGN", "Payment signature mismatch.");
      db.prepare(`UPDATE payments SET status = 'paid' WHERE id = ?`).run(p.id);
      db.prepare(`UPDATE users SET paid_unlock = 1 WHERE id = ?`).run(req.user.id);
      db.prepare(`UPDATE comp_codes SET used_by = ?, used_at = datetime('now') WHERE code = (SELECT ? ) AND active = 1`).run(req.user.id, req.body?.compCode || "");
      db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(req.user.id, "payment", "Payment received \u2014 thank you", "Your full report and roadmap are unlocked. \u20B9" + p.amount + " (test mode).", "/app/results");
      sendEmail(req.user.email || `+91${req.user.phone}`, "Career Compass \u2014 payment receipt", `Received \u20B9${p.amount} (mock mode). Full report unlocked.`);
      audit(req.user.id, "payment.paid", `payment:${p.id}`, { amount: p.amount });
      res.json({ ok: true, data: { status: "paid", unlocked: true } });
    });
    paymentRouter.post("/comp", requireAuth("student"), (req, res) => {
      const code = String(req.body?.code || "").trim().toUpperCase();
      const comp = db.prepare("SELECT * FROM comp_codes WHERE code = ? AND active = 1 AND used_by IS NULL").get(code);
      if (!comp) return fail(res, 400, "BAD_CODE", "Invalid or already-used code.");
      if (comp.percent_off >= 100) {
        db.prepare(`UPDATE comp_codes SET used_by = ?, used_at = datetime('now') WHERE code = ?`).run(req.user.id, code);
        db.prepare(`UPDATE users SET paid_unlock = 1 WHERE id = ?`).run(req.user.id);
        db.prepare(`INSERT INTO payments (user_id,item,amount,provider,provider_ref,status) VALUES (?,?,?,?,?,?)`).run(req.user.id, "roadmap_report", 0, "comp_code", code, "paid");
        audit(req.user.id, "payment.comp_unlock", `comp:${code}`, {});
        return res.json({ ok: true, data: { unlocked: true, amountDue: 0 } });
      }
      res.json({ ok: true, data: { unlocked: false, amountDue: Math.round(PRICE() * (1 - comp.percent_off / 100)), percent_off: comp.percent_off } });
    });
  }
});

// server/routes/admin.js
import { Router as Router9 } from "express";
import crypto5 from "node:crypto";
var adminRouter, STALE_DAYS, setSettingGetter;
var init_admin = __esm({
  "server/routes/admin.js"() {
    init_db();
    init_auth();
    init_utils();
    adminRouter = Router9();
    adminRouter.use(requireAuth("admin"));
    STALE_DAYS = 180;
    adminRouter.get("/overview", (_req, res) => {
      const count = (sql, ...p) => db.prepare(sql).get(...p).c;
      const revenue = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'paid'`).get().s;
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
          paidUsers: count(`SELECT COUNT(*) c FROM users WHERE paid_unlock=1 AND deleted_at IS NULL`),
          revenue,
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
      const code = String(req.body?.code || "").trim().toUpperCase() || "CC" + crypto5.randomBytes(3).toString("hex").toUpperCase();
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
      const rows2 = db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.role, u.paid_unlock, u.created_at, u.deleted_at FROM users u ORDER BY u.id DESC LIMIT 100`).all();
      res.json({ ok: true, data: { users: rows2 } });
    });
  }
});

// server/routes/account.js
import { Router as Router10 } from "express";
var accountRouter;
var init_account = __esm({
  "server/routes/account.js"() {
    init_db();
    init_auth();
    init_utils();
    init_roadmaps();
    accountRouter = Router10();
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
        payments: db.prepare("SELECT * FROM payments WHERE user_id = ?").all(u.id),
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
      db.prepare(`UPDATE users SET deleted_at = datetime('now'), name = 'Deleted user', email = NULL, phone = NULL, paid_unlock = 0 WHERE id = ?`).run(u.id);
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
    EMBEDDED_HTML = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n    <meta name="theme-color" content="#0d5c57" />\n    <meta name="description" content="Career Compass \u2014 AI-powered career and college guidance for Indian students. Your future should not be a guessing game." />\n    <title>Career Compass \u2014 Your future should not be a guessing game</title>\n    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Ccircle cx=\'32\' cy=\'32\' r=\'30\' fill=\'%230d5c57\'/%3E%3Cpath d=\'M32 12 L40 32 L32 52 L24 32 Z\' fill=\'%23f4b942\'/%3E%3Ccircle cx=\'32\' cy=\'32\' r=\'4\' fill=\'%23fff\'/%3E%3C/svg%3E" />\n    <script type="module">\nfunction ch(e,t){for(var n=0;n<t.length;n++){const s=t[n];if(typeof s!="string"&&!Array.isArray(s)){for(const l in s)if(l!=="default"&&!(l in e)){const a=Object.getOwnPropertyDescriptor(s,l);a&&Object.defineProperty(e,l,a.get?a:{enumerable:!0,get:()=>s[l]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll(\'link[rel="modulepreload"]\'))s(l);new MutationObserver(l=>{for(const a of l)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(l){const a={};return l.integrity&&(a.integrity=l.integrity),l.referrerPolicy&&(a.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?a.credentials="include":l.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(l){if(l.ep)return;l.ep=!0;const a=n(l);fetch(l.href,a)}})();function uh(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var Sc={exports:{}},Xs={},Cc={exports:{}},A={};/**\n * @license React\n * react.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */var Rr=Symbol.for("react.element"),dh=Symbol.for("react.portal"),hh=Symbol.for("react.fragment"),fh=Symbol.for("react.strict_mode"),ph=Symbol.for("react.profiler"),mh=Symbol.for("react.provider"),vh=Symbol.for("react.context"),xh=Symbol.for("react.forward_ref"),yh=Symbol.for("react.suspense"),gh=Symbol.for("react.memo"),jh=Symbol.for("react.lazy"),to=Symbol.iterator;function wh(e){return e===null||typeof e!="object"?null:(e=to&&e[to]||e["@@iterator"],typeof e=="function"?e:null)}var Ec={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},_c=Object.assign,Pc={};function Fn(e,t,n){this.props=e,this.context=t,this.refs=Pc,this.updater=n||Ec}Fn.prototype.isReactComponent={};Fn.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Fn.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Tc(){}Tc.prototype=Fn.prototype;function Ka(e,t,n){this.props=e,this.context=t,this.refs=Pc,this.updater=n||Ec}var Ga=Ka.prototype=new Tc;Ga.constructor=Ka;_c(Ga,Fn.prototype);Ga.isPureReactComponent=!0;var no=Array.isArray,Mc=Object.prototype.hasOwnProperty,Xa={current:null},zc={key:!0,ref:!0,__self:!0,__source:!0};function Lc(e,t,n){var s,l={},a=null,i=null;if(t!=null)for(s in t.ref!==void 0&&(i=t.ref),t.key!==void 0&&(a=""+t.key),t)Mc.call(t,s)&&!zc.hasOwnProperty(s)&&(l[s]=t[s]);var o=arguments.length-2;if(o===1)l.children=n;else if(1<o){for(var c=Array(o),d=0;d<o;d++)c[d]=arguments[d+2];l.children=c}if(e&&e.defaultProps)for(s in o=e.defaultProps,o)l[s]===void 0&&(l[s]=o[s]);return{$$typeof:Rr,type:e,key:a,ref:i,props:l,_owner:Xa.current}}function Nh(e,t){return{$$typeof:Rr,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Ja(e){return typeof e=="object"&&e!==null&&e.$$typeof===Rr}function kh(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var ro=/\\/+/g;function kl(e,t){return typeof e=="object"&&e!==null&&e.key!=null?kh(""+e.key):t.toString(36)}function is(e,t,n,s,l){var a=typeof e;(a==="undefined"||a==="boolean")&&(e=null);var i=!1;if(e===null)i=!0;else switch(a){case"string":case"number":i=!0;break;case"object":switch(e.$$typeof){case Rr:case dh:i=!0}}if(i)return i=e,l=l(i),e=s===""?"."+kl(i,0):s,no(l)?(n="",e!=null&&(n=e.replace(ro,"$&/")+"/"),is(l,t,n,"",function(d){return d})):l!=null&&(Ja(l)&&(l=Nh(l,n+(!l.key||i&&i.key===l.key?"":(""+l.key).replace(ro,"$&/")+"/")+e)),t.push(l)),1;if(i=0,s=s===""?".":s+":",no(e))for(var o=0;o<e.length;o++){a=e[o];var c=s+kl(a,o);i+=is(a,t,n,c,l)}else if(c=wh(e),typeof c=="function")for(e=c.call(e),o=0;!(a=e.next()).done;)a=a.value,c=s+kl(a,o++),i+=is(a,t,n,c,l);else if(a==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return i}function br(e,t,n){if(e==null)return e;var s=[],l=0;return is(e,s,"","",function(a){return t.call(n,a,l++)}),s}function Sh(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var Ne={current:null},os={transition:null},Ch={ReactCurrentDispatcher:Ne,ReactCurrentBatchConfig:os,ReactCurrentOwner:Xa};function Rc(){throw Error("act(...) is not supported in production builds of React.")}A.Children={map:br,forEach:function(e,t,n){br(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return br(e,function(){t++}),t},toArray:function(e){return br(e,function(t){return t})||[]},only:function(e){if(!Ja(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};A.Component=Fn;A.Fragment=hh;A.Profiler=ph;A.PureComponent=Ka;A.StrictMode=fh;A.Suspense=yh;A.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Ch;A.act=Rc;A.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var s=_c({},e.props),l=e.key,a=e.ref,i=e._owner;if(t!=null){if(t.ref!==void 0&&(a=t.ref,i=Xa.current),t.key!==void 0&&(l=""+t.key),e.type&&e.type.defaultProps)var o=e.type.defaultProps;for(c in t)Mc.call(t,c)&&!zc.hasOwnProperty(c)&&(s[c]=t[c]===void 0&&o!==void 0?o[c]:t[c])}var c=arguments.length-2;if(c===1)s.children=n;else if(1<c){o=Array(c);for(var d=0;d<c;d++)o[d]=arguments[d+2];s.children=o}return{$$typeof:Rr,type:e.type,key:l,ref:a,props:s,_owner:i}};A.createContext=function(e){return e={$$typeof:vh,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:mh,_context:e},e.Consumer=e};A.createElement=Lc;A.createFactory=function(e){var t=Lc.bind(null,e);return t.type=e,t};A.createRef=function(){return{current:null}};A.forwardRef=function(e){return{$$typeof:xh,render:e}};A.isValidElement=Ja;A.lazy=function(e){return{$$typeof:jh,_payload:{_status:-1,_result:e},_init:Sh}};A.memo=function(e,t){return{$$typeof:gh,type:e,compare:t===void 0?null:t}};A.startTransition=function(e){var t=os.transition;os.transition={};try{e()}finally{os.transition=t}};A.unstable_act=Rc;A.useCallback=function(e,t){return Ne.current.useCallback(e,t)};A.useContext=function(e){return Ne.current.useContext(e)};A.useDebugValue=function(){};A.useDeferredValue=function(e){return Ne.current.useDeferredValue(e)};A.useEffect=function(e,t){return Ne.current.useEffect(e,t)};A.useId=function(){return Ne.current.useId()};A.useImperativeHandle=function(e,t,n){return Ne.current.useImperativeHandle(e,t,n)};A.useInsertionEffect=function(e,t){return Ne.current.useInsertionEffect(e,t)};A.useLayoutEffect=function(e,t){return Ne.current.useLayoutEffect(e,t)};A.useMemo=function(e,t){return Ne.current.useMemo(e,t)};A.useReducer=function(e,t,n){return Ne.current.useReducer(e,t,n)};A.useRef=function(e){return Ne.current.useRef(e)};A.useState=function(e){return Ne.current.useState(e)};A.useSyncExternalStore=function(e,t,n){return Ne.current.useSyncExternalStore(e,t,n)};A.useTransition=function(){return Ne.current.useTransition()};A.version="18.3.1";Cc.exports=A;var x=Cc.exports;const Ic=uh(x),Eh=ch({__proto__:null,default:Ic},[x]);/**\n * @license React\n * react-jsx-runtime.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */var _h=x,Ph=Symbol.for("react.element"),Th=Symbol.for("react.fragment"),Mh=Object.prototype.hasOwnProperty,zh=_h.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Lh={key:!0,ref:!0,__self:!0,__source:!0};function Oc(e,t,n){var s,l={},a=null,i=null;n!==void 0&&(a=""+n),t.key!==void 0&&(a=""+t.key),t.ref!==void 0&&(i=t.ref);for(s in t)Mh.call(t,s)&&!Lh.hasOwnProperty(s)&&(l[s]=t[s]);if(e&&e.defaultProps)for(s in t=e.defaultProps,t)l[s]===void 0&&(l[s]=t[s]);return{$$typeof:Ph,type:e,key:a,ref:i,props:l,_owner:zh.current}}Xs.Fragment=Th;Xs.jsx=Oc;Xs.jsxs=Oc;Sc.exports=Xs;var r=Sc.exports,Dc={exports:{}},Oe={},Ac={exports:{}},Fc={};/**\n * @license React\n * scheduler.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */(function(e){function t(M,I){var D=M.length;M.push(I);e:for(;0<D;){var te=D-1>>>1,oe=M[te];if(0<l(oe,I))M[te]=I,M[D]=oe,D=te;else break e}}function n(M){return M.length===0?null:M[0]}function s(M){if(M.length===0)return null;var I=M[0],D=M.pop();if(D!==I){M[0]=D;e:for(var te=0,oe=M.length,Br=oe>>>1;te<Br;){var bt=2*(te+1)-1,Nl=M[bt],Ht=bt+1,Vr=M[Ht];if(0>l(Nl,D))Ht<oe&&0>l(Vr,Nl)?(M[te]=Vr,M[Ht]=D,te=Ht):(M[te]=Nl,M[bt]=D,te=bt);else if(Ht<oe&&0>l(Vr,D))M[te]=Vr,M[Ht]=D,te=Ht;else break e}}return I}function l(M,I){var D=M.sortIndex-I.sortIndex;return D!==0?D:M.id-I.id}if(typeof performance=="object"&&typeof performance.now=="function"){var a=performance;e.unstable_now=function(){return a.now()}}else{var i=Date,o=i.now();e.unstable_now=function(){return i.now()-o}}var c=[],d=[],m=1,p=null,v=3,y=!1,j=!1,w=!1,N=typeof setTimeout=="function"?setTimeout:null,f=typeof clearTimeout=="function"?clearTimeout:null,u=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function h(M){for(var I=n(d);I!==null;){if(I.callback===null)s(d);else if(I.startTime<=M)s(d),I.sortIndex=I.expirationTime,t(c,I);else break;I=n(d)}}function g(M){if(w=!1,h(M),!j)if(n(c)!==null)j=!0,jl(S);else{var I=n(d);I!==null&&wl(g,I.startTime-M)}}function S(M,I){j=!1,w&&(w=!1,f(E),E=-1),y=!0;var D=v;try{for(h(I),p=n(c);p!==null&&(!(p.expirationTime>I)||M&&!pe());){var te=p.callback;if(typeof te=="function"){p.callback=null,v=p.priorityLevel;var oe=te(p.expirationTime<=I);I=e.unstable_now(),typeof oe=="function"?p.callback=oe:p===n(c)&&s(c),h(I)}else s(c);p=n(c)}if(p!==null)var Br=!0;else{var bt=n(d);bt!==null&&wl(g,bt.startTime-I),Br=!1}return Br}finally{p=null,v=D,y=!1}}var P=!1,k=null,E=-1,F=5,R=-1;function pe(){return!(e.unstable_now()-R<F)}function yt(){if(k!==null){var M=e.unstable_now();R=M;var I=!0;try{I=k(!0,M)}finally{I?bn():(P=!1,k=null)}}else P=!1}var bn;if(typeof u=="function")bn=function(){u(yt)};else if(typeof MessageChannel<"u"){var eo=new MessageChannel,oh=eo.port2;eo.port1.onmessage=yt,bn=function(){oh.postMessage(null)}}else bn=function(){N(yt,0)};function jl(M){k=M,P||(P=!0,bn())}function wl(M,I){E=N(function(){M(e.unstable_now())},I)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(M){M.callback=null},e.unstable_continueExecution=function(){j||y||(j=!0,jl(S))},e.unstable_forceFrameRate=function(M){0>M||125<M?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):F=0<M?Math.floor(1e3/M):5},e.unstable_getCurrentPriorityLevel=function(){return v},e.unstable_getFirstCallbackNode=function(){return n(c)},e.unstable_next=function(M){switch(v){case 1:case 2:case 3:var I=3;break;default:I=v}var D=v;v=I;try{return M()}finally{v=D}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(M,I){switch(M){case 1:case 2:case 3:case 4:case 5:break;default:M=3}var D=v;v=M;try{return I()}finally{v=D}},e.unstable_scheduleCallback=function(M,I,D){var te=e.unstable_now();switch(typeof D=="object"&&D!==null?(D=D.delay,D=typeof D=="number"&&0<D?te+D:te):D=te,M){case 1:var oe=-1;break;case 2:oe=250;break;case 5:oe=1073741823;break;case 4:oe=1e4;break;default:oe=5e3}return oe=D+oe,M={id:m++,callback:I,priorityLevel:M,startTime:D,expirationTime:oe,sortIndex:-1},D>te?(M.sortIndex=D,t(d,M),n(c)===null&&M===n(d)&&(w?(f(E),E=-1):w=!0,wl(g,D-te))):(M.sortIndex=oe,t(c,M),j||y||(j=!0,jl(S))),M},e.unstable_shouldYield=pe,e.unstable_wrapCallback=function(M){var I=v;return function(){var D=v;v=I;try{return M.apply(this,arguments)}finally{v=D}}}})(Fc);Ac.exports=Fc;var Rh=Ac.exports;/**\n * @license React\n * react-dom.production.min.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */var Ih=x,Re=Rh;function C(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var $c=new Set,hr={};function an(e,t){Tn(e,t),Tn(e+"Capture",t)}function Tn(e,t){for(hr[e]=t,e=0;e<t.length;e++)$c.add(t[e])}var ht=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Xl=Object.prototype.hasOwnProperty,Oh=/^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$/,so={},lo={};function Dh(e){return Xl.call(lo,e)?!0:Xl.call(so,e)?!1:Oh.test(e)?lo[e]=!0:(so[e]=!0,!1)}function Ah(e,t,n,s){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return s?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function Fh(e,t,n,s){if(t===null||typeof t>"u"||Ah(e,t,n,s))return!0;if(s)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function ke(e,t,n,s,l,a,i){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=s,this.attributeNamespace=l,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=a,this.removeEmptyString=i}var fe={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){fe[e]=new ke(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];fe[t]=new ke(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){fe[e]=new ke(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){fe[e]=new ke(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){fe[e]=new ke(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){fe[e]=new ke(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){fe[e]=new ke(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){fe[e]=new ke(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){fe[e]=new ke(e,5,!1,e.toLowerCase(),null,!1,!1)});var Za=/[\\-:]([a-z])/g;function qa(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(Za,qa);fe[t]=new ke(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(Za,qa);fe[t]=new ke(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(Za,qa);fe[t]=new ke(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){fe[e]=new ke(e,1,!1,e.toLowerCase(),null,!1,!1)});fe.xlinkHref=new ke("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){fe[e]=new ke(e,1,!1,e.toLowerCase(),null,!0,!0)});function ei(e,t,n,s){var l=fe.hasOwnProperty(t)?fe[t]:null;(l!==null?l.type!==0:s||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(Fh(t,n,l,s)&&(n=null),s||l===null?Dh(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):l.mustUseProperty?e[l.propertyName]=n===null?l.type===3?!1:"":n:(t=l.attributeName,s=l.attributeNamespace,n===null?e.removeAttribute(t):(l=l.type,n=l===3||l===4&&n===!0?"":""+n,s?e.setAttributeNS(s,t,n):e.setAttribute(t,n))))}var vt=Ih.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Hr=Symbol.for("react.element"),dn=Symbol.for("react.portal"),hn=Symbol.for("react.fragment"),ti=Symbol.for("react.strict_mode"),Jl=Symbol.for("react.profiler"),Uc=Symbol.for("react.provider"),Wc=Symbol.for("react.context"),ni=Symbol.for("react.forward_ref"),Zl=Symbol.for("react.suspense"),ql=Symbol.for("react.suspense_list"),ri=Symbol.for("react.memo"),jt=Symbol.for("react.lazy"),Bc=Symbol.for("react.offscreen"),ao=Symbol.iterator;function Hn(e){return e===null||typeof e!="object"?null:(e=ao&&e[ao]||e["@@iterator"],typeof e=="function"?e:null)}var Z=Object.assign,Sl;function qn(e){if(Sl===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\\n( *(at )?)/);Sl=t&&t[1]||""}return`\n`+Sl+e}var Cl=!1;function El(e,t){if(!e||Cl)return"";Cl=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(d){var s=d}Reflect.construct(e,[],t)}else{try{t.call()}catch(d){s=d}e.call(t.prototype)}else{try{throw Error()}catch(d){s=d}e()}}catch(d){if(d&&s&&typeof d.stack=="string"){for(var l=d.stack.split(`\n`),a=s.stack.split(`\n`),i=l.length-1,o=a.length-1;1<=i&&0<=o&&l[i]!==a[o];)o--;for(;1<=i&&0<=o;i--,o--)if(l[i]!==a[o]){if(i!==1||o!==1)do if(i--,o--,0>o||l[i]!==a[o]){var c=`\n`+l[i].replace(" at new "," at ");return e.displayName&&c.includes("<anonymous>")&&(c=c.replace("<anonymous>",e.displayName)),c}while(1<=i&&0<=o);break}}}finally{Cl=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?qn(e):""}function $h(e){switch(e.tag){case 5:return qn(e.type);case 16:return qn("Lazy");case 13:return qn("Suspense");case 19:return qn("SuspenseList");case 0:case 2:case 15:return e=El(e.type,!1),e;case 11:return e=El(e.type.render,!1),e;case 1:return e=El(e.type,!0),e;default:return""}}function ea(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case hn:return"Fragment";case dn:return"Portal";case Jl:return"Profiler";case ti:return"StrictMode";case Zl:return"Suspense";case ql:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case Wc:return(e.displayName||"Context")+".Consumer";case Uc:return(e._context.displayName||"Context")+".Provider";case ni:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case ri:return t=e.displayName||null,t!==null?t:ea(e.type)||"Memo";case jt:t=e._payload,e=e._init;try{return ea(e(t))}catch{}}return null}function Uh(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ea(t);case 8:return t===ti?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Dt(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function Vc(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function Wh(e){var t=Vc(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),s=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var l=n.get,a=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return l.call(this)},set:function(i){s=""+i,a.call(this,i)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return s},setValue:function(i){s=""+i},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Qr(e){e._valueTracker||(e._valueTracker=Wh(e))}function bc(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),s="";return e&&(s=Vc(e)?e.checked?"true":"false":e.value),e=s,e!==n?(t.setValue(e),!0):!1}function gs(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function ta(e,t){var n=t.checked;return Z({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function io(e,t){var n=t.defaultValue==null?"":t.defaultValue,s=t.checked!=null?t.checked:t.defaultChecked;n=Dt(t.value!=null?t.value:n),e._wrapperState={initialChecked:s,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function Hc(e,t){t=t.checked,t!=null&&ei(e,"checked",t,!1)}function na(e,t){Hc(e,t);var n=Dt(t.value),s=t.type;if(n!=null)s==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(s==="submit"||s==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?ra(e,t.type,n):t.hasOwnProperty("defaultValue")&&ra(e,t.type,Dt(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function oo(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var s=t.type;if(!(s!=="submit"&&s!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function ra(e,t,n){(t!=="number"||gs(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var er=Array.isArray;function kn(e,t,n,s){if(e=e.options,t){t={};for(var l=0;l<n.length;l++)t["$"+n[l]]=!0;for(n=0;n<e.length;n++)l=t.hasOwnProperty("$"+e[n].value),e[n].selected!==l&&(e[n].selected=l),l&&s&&(e[n].defaultSelected=!0)}else{for(n=""+Dt(n),t=null,l=0;l<e.length;l++){if(e[l].value===n){e[l].selected=!0,s&&(e[l].defaultSelected=!0);return}t!==null||e[l].disabled||(t=e[l])}t!==null&&(t.selected=!0)}}function sa(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(C(91));return Z({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function co(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(C(92));if(er(n)){if(1<n.length)throw Error(C(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Dt(n)}}function Qc(e,t){var n=Dt(t.value),s=Dt(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),s!=null&&(e.defaultValue=""+s)}function uo(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function Yc(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function la(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?Yc(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var Yr,Kc=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,s,l){MSApp.execUnsafeLocalFunction(function(){return e(t,n,s,l)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(Yr=Yr||document.createElement("div"),Yr.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=Yr.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function fr(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var rr={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Bh=["Webkit","ms","Moz","O"];Object.keys(rr).forEach(function(e){Bh.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),rr[t]=rr[e]})});function Gc(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||rr.hasOwnProperty(e)&&rr[e]?(""+t).trim():t+"px"}function Xc(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var s=n.indexOf("--")===0,l=Gc(n,t[n],s);n==="float"&&(n="cssFloat"),s?e.setProperty(n,l):e[n]=l}}var Vh=Z({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function aa(e,t){if(t){if(Vh[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(C(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(C(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(C(61))}if(t.style!=null&&typeof t.style!="object")throw Error(C(62))}}function ia(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var oa=null;function si(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var ca=null,Sn=null,Cn=null;function ho(e){if(e=Dr(e)){if(typeof ca!="function")throw Error(C(280));var t=e.stateNode;t&&(t=tl(t),ca(e.stateNode,e.type,t))}}function Jc(e){Sn?Cn?Cn.push(e):Cn=[e]:Sn=e}function Zc(){if(Sn){var e=Sn,t=Cn;if(Cn=Sn=null,ho(e),t)for(e=0;e<t.length;e++)ho(t[e])}}function qc(e,t){return e(t)}function eu(){}var _l=!1;function tu(e,t,n){if(_l)return e(t,n);_l=!0;try{return qc(e,t,n)}finally{_l=!1,(Sn!==null||Cn!==null)&&(eu(),Zc())}}function pr(e,t){var n=e.stateNode;if(n===null)return null;var s=tl(n);if(s===null)return null;n=s[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(s=!s.disabled)||(e=e.type,s=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!s;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(C(231,t,typeof n));return n}var ua=!1;if(ht)try{var Qn={};Object.defineProperty(Qn,"passive",{get:function(){ua=!0}}),window.addEventListener("test",Qn,Qn),window.removeEventListener("test",Qn,Qn)}catch{ua=!1}function bh(e,t,n,s,l,a,i,o,c){var d=Array.prototype.slice.call(arguments,3);try{t.apply(n,d)}catch(m){this.onError(m)}}var sr=!1,js=null,ws=!1,da=null,Hh={onError:function(e){sr=!0,js=e}};function Qh(e,t,n,s,l,a,i,o,c){sr=!1,js=null,bh.apply(Hh,arguments)}function Yh(e,t,n,s,l,a,i,o,c){if(Qh.apply(this,arguments),sr){if(sr){var d=js;sr=!1,js=null}else throw Error(C(198));ws||(ws=!0,da=d)}}function on(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function nu(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function fo(e){if(on(e)!==e)throw Error(C(188))}function Kh(e){var t=e.alternate;if(!t){if(t=on(e),t===null)throw Error(C(188));return t!==e?null:e}for(var n=e,s=t;;){var l=n.return;if(l===null)break;var a=l.alternate;if(a===null){if(s=l.return,s!==null){n=s;continue}break}if(l.child===a.child){for(a=l.child;a;){if(a===n)return fo(l),e;if(a===s)return fo(l),t;a=a.sibling}throw Error(C(188))}if(n.return!==s.return)n=l,s=a;else{for(var i=!1,o=l.child;o;){if(o===n){i=!0,n=l,s=a;break}if(o===s){i=!0,s=l,n=a;break}o=o.sibling}if(!i){for(o=a.child;o;){if(o===n){i=!0,n=a,s=l;break}if(o===s){i=!0,s=a,n=l;break}o=o.sibling}if(!i)throw Error(C(189))}}if(n.alternate!==s)throw Error(C(190))}if(n.tag!==3)throw Error(C(188));return n.stateNode.current===n?e:t}function ru(e){return e=Kh(e),e!==null?su(e):null}function su(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=su(e);if(t!==null)return t;e=e.sibling}return null}var lu=Re.unstable_scheduleCallback,po=Re.unstable_cancelCallback,Gh=Re.unstable_shouldYield,Xh=Re.unstable_requestPaint,re=Re.unstable_now,Jh=Re.unstable_getCurrentPriorityLevel,li=Re.unstable_ImmediatePriority,au=Re.unstable_UserBlockingPriority,Ns=Re.unstable_NormalPriority,Zh=Re.unstable_LowPriority,iu=Re.unstable_IdlePriority,Js=null,tt=null;function qh(e){if(tt&&typeof tt.onCommitFiberRoot=="function")try{tt.onCommitFiberRoot(Js,e,void 0,(e.current.flags&128)===128)}catch{}}var Ke=Math.clz32?Math.clz32:nf,ef=Math.log,tf=Math.LN2;function nf(e){return e>>>=0,e===0?32:31-(ef(e)/tf|0)|0}var Kr=64,Gr=4194304;function tr(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function ks(e,t){var n=e.pendingLanes;if(n===0)return 0;var s=0,l=e.suspendedLanes,a=e.pingedLanes,i=n&268435455;if(i!==0){var o=i&~l;o!==0?s=tr(o):(a&=i,a!==0&&(s=tr(a)))}else i=n&~l,i!==0?s=tr(i):a!==0&&(s=tr(a));if(s===0)return 0;if(t!==0&&t!==s&&!(t&l)&&(l=s&-s,a=t&-t,l>=a||l===16&&(a&4194240)!==0))return t;if(s&4&&(s|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=s;0<t;)n=31-Ke(t),l=1<<n,s|=e[n],t&=~l;return s}function rf(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function sf(e,t){for(var n=e.suspendedLanes,s=e.pingedLanes,l=e.expirationTimes,a=e.pendingLanes;0<a;){var i=31-Ke(a),o=1<<i,c=l[i];c===-1?(!(o&n)||o&s)&&(l[i]=rf(o,t)):c<=t&&(e.expiredLanes|=o),a&=~o}}function ha(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function ou(){var e=Kr;return Kr<<=1,!(Kr&4194240)&&(Kr=64),e}function Pl(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function Ir(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Ke(t),e[t]=n}function lf(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var s=e.eventTimes;for(e=e.expirationTimes;0<n;){var l=31-Ke(n),a=1<<l;t[l]=0,s[l]=-1,e[l]=-1,n&=~a}}function ai(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var s=31-Ke(n),l=1<<s;l&t|e[s]&t&&(e[s]|=t),n&=~l}}var B=0;function cu(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var uu,ii,du,hu,fu,fa=!1,Xr=[],_t=null,Pt=null,Tt=null,mr=new Map,vr=new Map,Nt=[],af="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function mo(e,t){switch(e){case"focusin":case"focusout":_t=null;break;case"dragenter":case"dragleave":Pt=null;break;case"mouseover":case"mouseout":Tt=null;break;case"pointerover":case"pointerout":mr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":vr.delete(t.pointerId)}}function Yn(e,t,n,s,l,a){return e===null||e.nativeEvent!==a?(e={blockedOn:t,domEventName:n,eventSystemFlags:s,nativeEvent:a,targetContainers:[l]},t!==null&&(t=Dr(t),t!==null&&ii(t)),e):(e.eventSystemFlags|=s,t=e.targetContainers,l!==null&&t.indexOf(l)===-1&&t.push(l),e)}function of(e,t,n,s,l){switch(t){case"focusin":return _t=Yn(_t,e,t,n,s,l),!0;case"dragenter":return Pt=Yn(Pt,e,t,n,s,l),!0;case"mouseover":return Tt=Yn(Tt,e,t,n,s,l),!0;case"pointerover":var a=l.pointerId;return mr.set(a,Yn(mr.get(a)||null,e,t,n,s,l)),!0;case"gotpointercapture":return a=l.pointerId,vr.set(a,Yn(vr.get(a)||null,e,t,n,s,l)),!0}return!1}function pu(e){var t=Kt(e.target);if(t!==null){var n=on(t);if(n!==null){if(t=n.tag,t===13){if(t=nu(n),t!==null){e.blockedOn=t,fu(e.priority,function(){du(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function cs(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=pa(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var s=new n.constructor(n.type,n);oa=s,n.target.dispatchEvent(s),oa=null}else return t=Dr(n),t!==null&&ii(t),e.blockedOn=n,!1;t.shift()}return!0}function vo(e,t,n){cs(e)&&n.delete(t)}function cf(){fa=!1,_t!==null&&cs(_t)&&(_t=null),Pt!==null&&cs(Pt)&&(Pt=null),Tt!==null&&cs(Tt)&&(Tt=null),mr.forEach(vo),vr.forEach(vo)}function Kn(e,t){e.blockedOn===t&&(e.blockedOn=null,fa||(fa=!0,Re.unstable_scheduleCallback(Re.unstable_NormalPriority,cf)))}function xr(e){function t(l){return Kn(l,e)}if(0<Xr.length){Kn(Xr[0],e);for(var n=1;n<Xr.length;n++){var s=Xr[n];s.blockedOn===e&&(s.blockedOn=null)}}for(_t!==null&&Kn(_t,e),Pt!==null&&Kn(Pt,e),Tt!==null&&Kn(Tt,e),mr.forEach(t),vr.forEach(t),n=0;n<Nt.length;n++)s=Nt[n],s.blockedOn===e&&(s.blockedOn=null);for(;0<Nt.length&&(n=Nt[0],n.blockedOn===null);)pu(n),n.blockedOn===null&&Nt.shift()}var En=vt.ReactCurrentBatchConfig,Ss=!0;function uf(e,t,n,s){var l=B,a=En.transition;En.transition=null;try{B=1,oi(e,t,n,s)}finally{B=l,En.transition=a}}function df(e,t,n,s){var l=B,a=En.transition;En.transition=null;try{B=4,oi(e,t,n,s)}finally{B=l,En.transition=a}}function oi(e,t,n,s){if(Ss){var l=pa(e,t,n,s);if(l===null)Fl(e,t,s,Cs,n),mo(e,s);else if(of(l,e,t,n,s))s.stopPropagation();else if(mo(e,s),t&4&&-1<af.indexOf(e)){for(;l!==null;){var a=Dr(l);if(a!==null&&uu(a),a=pa(e,t,n,s),a===null&&Fl(e,t,s,Cs,n),a===l)break;l=a}l!==null&&s.stopPropagation()}else Fl(e,t,s,null,n)}}var Cs=null;function pa(e,t,n,s){if(Cs=null,e=si(s),e=Kt(e),e!==null)if(t=on(e),t===null)e=null;else if(n=t.tag,n===13){if(e=nu(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Cs=e,null}function mu(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Jh()){case li:return 1;case au:return 4;case Ns:case Zh:return 16;case iu:return 536870912;default:return 16}default:return 16}}var St=null,ci=null,us=null;function vu(){if(us)return us;var e,t=ci,n=t.length,s,l="value"in St?St.value:St.textContent,a=l.length;for(e=0;e<n&&t[e]===l[e];e++);var i=n-e;for(s=1;s<=i&&t[n-s]===l[a-s];s++);return us=l.slice(e,1<s?1-s:void 0)}function ds(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function Jr(){return!0}function xo(){return!1}function De(e){function t(n,s,l,a,i){this._reactName=n,this._targetInst=l,this.type=s,this.nativeEvent=a,this.target=i,this.currentTarget=null;for(var o in e)e.hasOwnProperty(o)&&(n=e[o],this[o]=n?n(a):a[o]);return this.isDefaultPrevented=(a.defaultPrevented!=null?a.defaultPrevented:a.returnValue===!1)?Jr:xo,this.isPropagationStopped=xo,this}return Z(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=Jr)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=Jr)},persist:function(){},isPersistent:Jr}),t}var $n={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},ui=De($n),Or=Z({},$n,{view:0,detail:0}),hf=De(Or),Tl,Ml,Gn,Zs=Z({},Or,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:di,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Gn&&(Gn&&e.type==="mousemove"?(Tl=e.screenX-Gn.screenX,Ml=e.screenY-Gn.screenY):Ml=Tl=0,Gn=e),Tl)},movementY:function(e){return"movementY"in e?e.movementY:Ml}}),yo=De(Zs),ff=Z({},Zs,{dataTransfer:0}),pf=De(ff),mf=Z({},Or,{relatedTarget:0}),zl=De(mf),vf=Z({},$n,{animationName:0,elapsedTime:0,pseudoElement:0}),xf=De(vf),yf=Z({},$n,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),gf=De(yf),jf=Z({},$n,{data:0}),go=De(jf),wf={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Nf={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},kf={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Sf(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=kf[e])?!!t[e]:!1}function di(){return Sf}var Cf=Z({},Or,{key:function(e){if(e.key){var t=wf[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=ds(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Nf[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:di,charCode:function(e){return e.type==="keypress"?ds(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?ds(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Ef=De(Cf),_f=Z({},Zs,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),jo=De(_f),Pf=Z({},Or,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:di}),Tf=De(Pf),Mf=Z({},$n,{propertyName:0,elapsedTime:0,pseudoElement:0}),zf=De(Mf),Lf=Z({},Zs,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Rf=De(Lf),If=[9,13,27,32],hi=ht&&"CompositionEvent"in window,lr=null;ht&&"documentMode"in document&&(lr=document.documentMode);var Of=ht&&"TextEvent"in window&&!lr,xu=ht&&(!hi||lr&&8<lr&&11>=lr),wo=" ",No=!1;function yu(e,t){switch(e){case"keyup":return If.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function gu(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var fn=!1;function Df(e,t){switch(e){case"compositionend":return gu(t);case"keypress":return t.which!==32?null:(No=!0,wo);case"textInput":return e=t.data,e===wo&&No?null:e;default:return null}}function Af(e,t){if(fn)return e==="compositionend"||!hi&&yu(e,t)?(e=vu(),us=ci=St=null,fn=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return xu&&t.locale!=="ko"?null:t.data;default:return null}}var Ff={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ko(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Ff[e.type]:t==="textarea"}function ju(e,t,n,s){Jc(s),t=Es(t,"onChange"),0<t.length&&(n=new ui("onChange","change",null,n,s),e.push({event:n,listeners:t}))}var ar=null,yr=null;function $f(e){zu(e,0)}function qs(e){var t=vn(e);if(bc(t))return e}function Uf(e,t){if(e==="change")return t}var wu=!1;if(ht){var Ll;if(ht){var Rl="oninput"in document;if(!Rl){var So=document.createElement("div");So.setAttribute("oninput","return;"),Rl=typeof So.oninput=="function"}Ll=Rl}else Ll=!1;wu=Ll&&(!document.documentMode||9<document.documentMode)}function Co(){ar&&(ar.detachEvent("onpropertychange",Nu),yr=ar=null)}function Nu(e){if(e.propertyName==="value"&&qs(yr)){var t=[];ju(t,yr,e,si(e)),tu($f,t)}}function Wf(e,t,n){e==="focusin"?(Co(),ar=t,yr=n,ar.attachEvent("onpropertychange",Nu)):e==="focusout"&&Co()}function Bf(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return qs(yr)}function Vf(e,t){if(e==="click")return qs(t)}function bf(e,t){if(e==="input"||e==="change")return qs(t)}function Hf(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Xe=typeof Object.is=="function"?Object.is:Hf;function gr(e,t){if(Xe(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),s=Object.keys(t);if(n.length!==s.length)return!1;for(s=0;s<n.length;s++){var l=n[s];if(!Xl.call(t,l)||!Xe(e[l],t[l]))return!1}return!0}function Eo(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function _o(e,t){var n=Eo(e);e=0;for(var s;n;){if(n.nodeType===3){if(s=e+n.textContent.length,e<=t&&s>=t)return{node:n,offset:t-e};e=s}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=Eo(n)}}function ku(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?ku(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function Su(){for(var e=window,t=gs();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=gs(e.document)}return t}function fi(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function Qf(e){var t=Su(),n=e.focusedElem,s=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&ku(n.ownerDocument.documentElement,n)){if(s!==null&&fi(n)){if(t=s.start,e=s.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var l=n.textContent.length,a=Math.min(s.start,l);s=s.end===void 0?a:Math.min(s.end,l),!e.extend&&a>s&&(l=s,s=a,a=l),l=_o(n,a);var i=_o(n,s);l&&i&&(e.rangeCount!==1||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==i.node||e.focusOffset!==i.offset)&&(t=t.createRange(),t.setStart(l.node,l.offset),e.removeAllRanges(),a>s?(e.addRange(t),e.extend(i.node,i.offset)):(t.setEnd(i.node,i.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Yf=ht&&"documentMode"in document&&11>=document.documentMode,pn=null,ma=null,ir=null,va=!1;function Po(e,t,n){var s=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;va||pn==null||pn!==gs(s)||(s=pn,"selectionStart"in s&&fi(s)?s={start:s.selectionStart,end:s.selectionEnd}:(s=(s.ownerDocument&&s.ownerDocument.defaultView||window).getSelection(),s={anchorNode:s.anchorNode,anchorOffset:s.anchorOffset,focusNode:s.focusNode,focusOffset:s.focusOffset}),ir&&gr(ir,s)||(ir=s,s=Es(ma,"onSelect"),0<s.length&&(t=new ui("onSelect","select",null,t,n),e.push({event:t,listeners:s}),t.target=pn)))}function Zr(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var mn={animationend:Zr("Animation","AnimationEnd"),animationiteration:Zr("Animation","AnimationIteration"),animationstart:Zr("Animation","AnimationStart"),transitionend:Zr("Transition","TransitionEnd")},Il={},Cu={};ht&&(Cu=document.createElement("div").style,"AnimationEvent"in window||(delete mn.animationend.animation,delete mn.animationiteration.animation,delete mn.animationstart.animation),"TransitionEvent"in window||delete mn.transitionend.transition);function el(e){if(Il[e])return Il[e];if(!mn[e])return e;var t=mn[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in Cu)return Il[e]=t[n];return e}var Eu=el("animationend"),_u=el("animationiteration"),Pu=el("animationstart"),Tu=el("transitionend"),Mu=new Map,To="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Ut(e,t){Mu.set(e,t),an(t,[e])}for(var Ol=0;Ol<To.length;Ol++){var Dl=To[Ol],Kf=Dl.toLowerCase(),Gf=Dl[0].toUpperCase()+Dl.slice(1);Ut(Kf,"on"+Gf)}Ut(Eu,"onAnimationEnd");Ut(_u,"onAnimationIteration");Ut(Pu,"onAnimationStart");Ut("dblclick","onDoubleClick");Ut("focusin","onFocus");Ut("focusout","onBlur");Ut(Tu,"onTransitionEnd");Tn("onMouseEnter",["mouseout","mouseover"]);Tn("onMouseLeave",["mouseout","mouseover"]);Tn("onPointerEnter",["pointerout","pointerover"]);Tn("onPointerLeave",["pointerout","pointerover"]);an("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));an("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));an("onBeforeInput",["compositionend","keypress","textInput","paste"]);an("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));an("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));an("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var nr="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Xf=new Set("cancel close invalid load scroll toggle".split(" ").concat(nr));function Mo(e,t,n){var s=e.type||"unknown-event";e.currentTarget=n,Yh(s,t,void 0,e),e.currentTarget=null}function zu(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var s=e[n],l=s.event;s=s.listeners;e:{var a=void 0;if(t)for(var i=s.length-1;0<=i;i--){var o=s[i],c=o.instance,d=o.currentTarget;if(o=o.listener,c!==a&&l.isPropagationStopped())break e;Mo(l,o,d),a=c}else for(i=0;i<s.length;i++){if(o=s[i],c=o.instance,d=o.currentTarget,o=o.listener,c!==a&&l.isPropagationStopped())break e;Mo(l,o,d),a=c}}}if(ws)throw e=da,ws=!1,da=null,e}function H(e,t){var n=t[wa];n===void 0&&(n=t[wa]=new Set);var s=e+"__bubble";n.has(s)||(Lu(t,e,2,!1),n.add(s))}function Al(e,t,n){var s=0;t&&(s|=4),Lu(n,e,s,t)}var qr="_reactListening"+Math.random().toString(36).slice(2);function jr(e){if(!e[qr]){e[qr]=!0,$c.forEach(function(n){n!=="selectionchange"&&(Xf.has(n)||Al(n,!1,e),Al(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[qr]||(t[qr]=!0,Al("selectionchange",!1,t))}}function Lu(e,t,n,s){switch(mu(t)){case 1:var l=uf;break;case 4:l=df;break;default:l=oi}n=l.bind(null,t,n,e),l=void 0,!ua||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(l=!0),s?l!==void 0?e.addEventListener(t,n,{capture:!0,passive:l}):e.addEventListener(t,n,!0):l!==void 0?e.addEventListener(t,n,{passive:l}):e.addEventListener(t,n,!1)}function Fl(e,t,n,s,l){var a=s;if(!(t&1)&&!(t&2)&&s!==null)e:for(;;){if(s===null)return;var i=s.tag;if(i===3||i===4){var o=s.stateNode.containerInfo;if(o===l||o.nodeType===8&&o.parentNode===l)break;if(i===4)for(i=s.return;i!==null;){var c=i.tag;if((c===3||c===4)&&(c=i.stateNode.containerInfo,c===l||c.nodeType===8&&c.parentNode===l))return;i=i.return}for(;o!==null;){if(i=Kt(o),i===null)return;if(c=i.tag,c===5||c===6){s=a=i;continue e}o=o.parentNode}}s=s.return}tu(function(){var d=a,m=si(n),p=[];e:{var v=Mu.get(e);if(v!==void 0){var y=ui,j=e;switch(e){case"keypress":if(ds(n)===0)break e;case"keydown":case"keyup":y=Ef;break;case"focusin":j="focus",y=zl;break;case"focusout":j="blur",y=zl;break;case"beforeblur":case"afterblur":y=zl;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":y=yo;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":y=pf;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":y=Tf;break;case Eu:case _u:case Pu:y=xf;break;case Tu:y=zf;break;case"scroll":y=hf;break;case"wheel":y=Rf;break;case"copy":case"cut":case"paste":y=gf;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":y=jo}var w=(t&4)!==0,N=!w&&e==="scroll",f=w?v!==null?v+"Capture":null:v;w=[];for(var u=d,h;u!==null;){h=u;var g=h.stateNode;if(h.tag===5&&g!==null&&(h=g,f!==null&&(g=pr(u,f),g!=null&&w.push(wr(u,g,h)))),N)break;u=u.return}0<w.length&&(v=new y(v,j,null,n,m),p.push({event:v,listeners:w}))}}if(!(t&7)){e:{if(v=e==="mouseover"||e==="pointerover",y=e==="mouseout"||e==="pointerout",v&&n!==oa&&(j=n.relatedTarget||n.fromElement)&&(Kt(j)||j[ft]))break e;if((y||v)&&(v=m.window===m?m:(v=m.ownerDocument)?v.defaultView||v.parentWindow:window,y?(j=n.relatedTarget||n.toElement,y=d,j=j?Kt(j):null,j!==null&&(N=on(j),j!==N||j.tag!==5&&j.tag!==6)&&(j=null)):(y=null,j=d),y!==j)){if(w=yo,g="onMouseLeave",f="onMouseEnter",u="mouse",(e==="pointerout"||e==="pointerover")&&(w=jo,g="onPointerLeave",f="onPointerEnter",u="pointer"),N=y==null?v:vn(y),h=j==null?v:vn(j),v=new w(g,u+"leave",y,n,m),v.target=N,v.relatedTarget=h,g=null,Kt(m)===d&&(w=new w(f,u+"enter",j,n,m),w.target=h,w.relatedTarget=N,g=w),N=g,y&&j)t:{for(w=y,f=j,u=0,h=w;h;h=un(h))u++;for(h=0,g=f;g;g=un(g))h++;for(;0<u-h;)w=un(w),u--;for(;0<h-u;)f=un(f),h--;for(;u--;){if(w===f||f!==null&&w===f.alternate)break t;w=un(w),f=un(f)}w=null}else w=null;y!==null&&zo(p,v,y,w,!1),j!==null&&N!==null&&zo(p,N,j,w,!0)}}e:{if(v=d?vn(d):window,y=v.nodeName&&v.nodeName.toLowerCase(),y==="select"||y==="input"&&v.type==="file")var S=Uf;else if(ko(v))if(wu)S=bf;else{S=Bf;var P=Wf}else(y=v.nodeName)&&y.toLowerCase()==="input"&&(v.type==="checkbox"||v.type==="radio")&&(S=Vf);if(S&&(S=S(e,d))){ju(p,S,n,m);break e}P&&P(e,v,d),e==="focusout"&&(P=v._wrapperState)&&P.controlled&&v.type==="number"&&ra(v,"number",v.value)}switch(P=d?vn(d):window,e){case"focusin":(ko(P)||P.contentEditable==="true")&&(pn=P,ma=d,ir=null);break;case"focusout":ir=ma=pn=null;break;case"mousedown":va=!0;break;case"contextmenu":case"mouseup":case"dragend":va=!1,Po(p,n,m);break;case"selectionchange":if(Yf)break;case"keydown":case"keyup":Po(p,n,m)}var k;if(hi)e:{switch(e){case"compositionstart":var E="onCompositionStart";break e;case"compositionend":E="onCompositionEnd";break e;case"compositionupdate":E="onCompositionUpdate";break e}E=void 0}else fn?yu(e,n)&&(E="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(E="onCompositionStart");E&&(xu&&n.locale!=="ko"&&(fn||E!=="onCompositionStart"?E==="onCompositionEnd"&&fn&&(k=vu()):(St=m,ci="value"in St?St.value:St.textContent,fn=!0)),P=Es(d,E),0<P.length&&(E=new go(E,e,null,n,m),p.push({event:E,listeners:P}),k?E.data=k:(k=gu(n),k!==null&&(E.data=k)))),(k=Of?Df(e,n):Af(e,n))&&(d=Es(d,"onBeforeInput"),0<d.length&&(m=new go("onBeforeInput","beforeinput",null,n,m),p.push({event:m,listeners:d}),m.data=k))}zu(p,t)})}function wr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Es(e,t){for(var n=t+"Capture",s=[];e!==null;){var l=e,a=l.stateNode;l.tag===5&&a!==null&&(l=a,a=pr(e,n),a!=null&&s.unshift(wr(e,a,l)),a=pr(e,t),a!=null&&s.push(wr(e,a,l))),e=e.return}return s}function un(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function zo(e,t,n,s,l){for(var a=t._reactName,i=[];n!==null&&n!==s;){var o=n,c=o.alternate,d=o.stateNode;if(c!==null&&c===s)break;o.tag===5&&d!==null&&(o=d,l?(c=pr(n,a),c!=null&&i.unshift(wr(n,c,o))):l||(c=pr(n,a),c!=null&&i.push(wr(n,c,o)))),n=n.return}i.length!==0&&e.push({event:t,listeners:i})}var Jf=/\\r\\n?/g,Zf=/\\u0000|\\uFFFD/g;function Lo(e){return(typeof e=="string"?e:""+e).replace(Jf,`\n`).replace(Zf,"")}function es(e,t,n){if(t=Lo(t),Lo(e)!==t&&n)throw Error(C(425))}function _s(){}var xa=null,ya=null;function ga(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var ja=typeof setTimeout=="function"?setTimeout:void 0,qf=typeof clearTimeout=="function"?clearTimeout:void 0,Ro=typeof Promise=="function"?Promise:void 0,ep=typeof queueMicrotask=="function"?queueMicrotask:typeof Ro<"u"?function(e){return Ro.resolve(null).then(e).catch(tp)}:ja;function tp(e){setTimeout(function(){throw e})}function $l(e,t){var n=t,s=0;do{var l=n.nextSibling;if(e.removeChild(n),l&&l.nodeType===8)if(n=l.data,n==="/$"){if(s===0){e.removeChild(l),xr(t);return}s--}else n!=="$"&&n!=="$?"&&n!=="$!"||s++;n=l}while(n);xr(t)}function Mt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Io(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var Un=Math.random().toString(36).slice(2),et="__reactFiber$"+Un,Nr="__reactProps$"+Un,ft="__reactContainer$"+Un,wa="__reactEvents$"+Un,np="__reactListeners$"+Un,rp="__reactHandles$"+Un;function Kt(e){var t=e[et];if(t)return t;for(var n=e.parentNode;n;){if(t=n[ft]||n[et]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Io(e);e!==null;){if(n=e[et])return n;e=Io(e)}return t}e=n,n=e.parentNode}return null}function Dr(e){return e=e[et]||e[ft],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function vn(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(C(33))}function tl(e){return e[Nr]||null}var Na=[],xn=-1;function Wt(e){return{current:e}}function Q(e){0>xn||(e.current=Na[xn],Na[xn]=null,xn--)}function b(e,t){xn++,Na[xn]=e.current,e.current=t}var At={},ye=Wt(At),_e=Wt(!1),en=At;function Mn(e,t){var n=e.type.contextTypes;if(!n)return At;var s=e.stateNode;if(s&&s.__reactInternalMemoizedUnmaskedChildContext===t)return s.__reactInternalMemoizedMaskedChildContext;var l={},a;for(a in n)l[a]=t[a];return s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=l),l}function Pe(e){return e=e.childContextTypes,e!=null}function Ps(){Q(_e),Q(ye)}function Oo(e,t,n){if(ye.current!==At)throw Error(C(168));b(ye,t),b(_e,n)}function Ru(e,t,n){var s=e.stateNode;if(t=t.childContextTypes,typeof s.getChildContext!="function")return n;s=s.getChildContext();for(var l in s)if(!(l in t))throw Error(C(108,Uh(e)||"Unknown",l));return Z({},n,s)}function Ts(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||At,en=ye.current,b(ye,e),b(_e,_e.current),!0}function Do(e,t,n){var s=e.stateNode;if(!s)throw Error(C(169));n?(e=Ru(e,t,en),s.__reactInternalMemoizedMergedChildContext=e,Q(_e),Q(ye),b(ye,e)):Q(_e),b(_e,n)}var ot=null,nl=!1,Ul=!1;function Iu(e){ot===null?ot=[e]:ot.push(e)}function sp(e){nl=!0,Iu(e)}function Bt(){if(!Ul&&ot!==null){Ul=!0;var e=0,t=B;try{var n=ot;for(B=1;e<n.length;e++){var s=n[e];do s=s(!0);while(s!==null)}ot=null,nl=!1}catch(l){throw ot!==null&&(ot=ot.slice(e+1)),lu(li,Bt),l}finally{B=t,Ul=!1}}return null}var yn=[],gn=0,Ms=null,zs=0,Ae=[],Fe=0,tn=null,ct=1,ut="";function Qt(e,t){yn[gn++]=zs,yn[gn++]=Ms,Ms=e,zs=t}function Ou(e,t,n){Ae[Fe++]=ct,Ae[Fe++]=ut,Ae[Fe++]=tn,tn=e;var s=ct;e=ut;var l=32-Ke(s)-1;s&=~(1<<l),n+=1;var a=32-Ke(t)+l;if(30<a){var i=l-l%5;a=(s&(1<<i)-1).toString(32),s>>=i,l-=i,ct=1<<32-Ke(t)+l|n<<l|s,ut=a+e}else ct=1<<a|n<<l|s,ut=e}function pi(e){e.return!==null&&(Qt(e,1),Ou(e,1,0))}function mi(e){for(;e===Ms;)Ms=yn[--gn],yn[gn]=null,zs=yn[--gn],yn[gn]=null;for(;e===tn;)tn=Ae[--Fe],Ae[Fe]=null,ut=Ae[--Fe],Ae[Fe]=null,ct=Ae[--Fe],Ae[Fe]=null}var Le=null,ze=null,Y=!1,Ye=null;function Du(e,t){var n=Ue(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Ao(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Le=e,ze=Mt(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Le=e,ze=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=tn!==null?{id:ct,overflow:ut}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=Ue(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,Le=e,ze=null,!0):!1;default:return!1}}function ka(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Sa(e){if(Y){var t=ze;if(t){var n=t;if(!Ao(e,t)){if(ka(e))throw Error(C(418));t=Mt(n.nextSibling);var s=Le;t&&Ao(e,t)?Du(s,n):(e.flags=e.flags&-4097|2,Y=!1,Le=e)}}else{if(ka(e))throw Error(C(418));e.flags=e.flags&-4097|2,Y=!1,Le=e}}}function Fo(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Le=e}function ts(e){if(e!==Le)return!1;if(!Y)return Fo(e),Y=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!ga(e.type,e.memoizedProps)),t&&(t=ze)){if(ka(e))throw Au(),Error(C(418));for(;t;)Du(e,t),t=Mt(t.nextSibling)}if(Fo(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(C(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){ze=Mt(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}ze=null}}else ze=Le?Mt(e.stateNode.nextSibling):null;return!0}function Au(){for(var e=ze;e;)e=Mt(e.nextSibling)}function zn(){ze=Le=null,Y=!1}function vi(e){Ye===null?Ye=[e]:Ye.push(e)}var lp=vt.ReactCurrentBatchConfig;function Xn(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(C(309));var s=n.stateNode}if(!s)throw Error(C(147,e));var l=s,a=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===a?t.ref:(t=function(i){var o=l.refs;i===null?delete o[a]:o[a]=i},t._stringRef=a,t)}if(typeof e!="string")throw Error(C(284));if(!n._owner)throw Error(C(290,e))}return e}function ns(e,t){throw e=Object.prototype.toString.call(t),Error(C(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function $o(e){var t=e._init;return t(e._payload)}function Fu(e){function t(f,u){if(e){var h=f.deletions;h===null?(f.deletions=[u],f.flags|=16):h.push(u)}}function n(f,u){if(!e)return null;for(;u!==null;)t(f,u),u=u.sibling;return null}function s(f,u){for(f=new Map;u!==null;)u.key!==null?f.set(u.key,u):f.set(u.index,u),u=u.sibling;return f}function l(f,u){return f=It(f,u),f.index=0,f.sibling=null,f}function a(f,u,h){return f.index=h,e?(h=f.alternate,h!==null?(h=h.index,h<u?(f.flags|=2,u):h):(f.flags|=2,u)):(f.flags|=1048576,u)}function i(f){return e&&f.alternate===null&&(f.flags|=2),f}function o(f,u,h,g){return u===null||u.tag!==6?(u=Yl(h,f.mode,g),u.return=f,u):(u=l(u,h),u.return=f,u)}function c(f,u,h,g){var S=h.type;return S===hn?m(f,u,h.props.children,g,h.key):u!==null&&(u.elementType===S||typeof S=="object"&&S!==null&&S.$$typeof===jt&&$o(S)===u.type)?(g=l(u,h.props),g.ref=Xn(f,u,h),g.return=f,g):(g=ys(h.type,h.key,h.props,null,f.mode,g),g.ref=Xn(f,u,h),g.return=f,g)}function d(f,u,h,g){return u===null||u.tag!==4||u.stateNode.containerInfo!==h.containerInfo||u.stateNode.implementation!==h.implementation?(u=Kl(h,f.mode,g),u.return=f,u):(u=l(u,h.children||[]),u.return=f,u)}function m(f,u,h,g,S){return u===null||u.tag!==7?(u=Zt(h,f.mode,g,S),u.return=f,u):(u=l(u,h),u.return=f,u)}function p(f,u,h){if(typeof u=="string"&&u!==""||typeof u=="number")return u=Yl(""+u,f.mode,h),u.return=f,u;if(typeof u=="object"&&u!==null){switch(u.$$typeof){case Hr:return h=ys(u.type,u.key,u.props,null,f.mode,h),h.ref=Xn(f,null,u),h.return=f,h;case dn:return u=Kl(u,f.mode,h),u.return=f,u;case jt:var g=u._init;return p(f,g(u._payload),h)}if(er(u)||Hn(u))return u=Zt(u,f.mode,h,null),u.return=f,u;ns(f,u)}return null}function v(f,u,h,g){var S=u!==null?u.key:null;if(typeof h=="string"&&h!==""||typeof h=="number")return S!==null?null:o(f,u,""+h,g);if(typeof h=="object"&&h!==null){switch(h.$$typeof){case Hr:return h.key===S?c(f,u,h,g):null;case dn:return h.key===S?d(f,u,h,g):null;case jt:return S=h._init,v(f,u,S(h._payload),g)}if(er(h)||Hn(h))return S!==null?null:m(f,u,h,g,null);ns(f,h)}return null}function y(f,u,h,g,S){if(typeof g=="string"&&g!==""||typeof g=="number")return f=f.get(h)||null,o(u,f,""+g,S);if(typeof g=="object"&&g!==null){switch(g.$$typeof){case Hr:return f=f.get(g.key===null?h:g.key)||null,c(u,f,g,S);case dn:return f=f.get(g.key===null?h:g.key)||null,d(u,f,g,S);case jt:var P=g._init;return y(f,u,h,P(g._payload),S)}if(er(g)||Hn(g))return f=f.get(h)||null,m(u,f,g,S,null);ns(u,g)}return null}function j(f,u,h,g){for(var S=null,P=null,k=u,E=u=0,F=null;k!==null&&E<h.length;E++){k.index>E?(F=k,k=null):F=k.sibling;var R=v(f,k,h[E],g);if(R===null){k===null&&(k=F);break}e&&k&&R.alternate===null&&t(f,k),u=a(R,u,E),P===null?S=R:P.sibling=R,P=R,k=F}if(E===h.length)return n(f,k),Y&&Qt(f,E),S;if(k===null){for(;E<h.length;E++)k=p(f,h[E],g),k!==null&&(u=a(k,u,E),P===null?S=k:P.sibling=k,P=k);return Y&&Qt(f,E),S}for(k=s(f,k);E<h.length;E++)F=y(k,f,E,h[E],g),F!==null&&(e&&F.alternate!==null&&k.delete(F.key===null?E:F.key),u=a(F,u,E),P===null?S=F:P.sibling=F,P=F);return e&&k.forEach(function(pe){return t(f,pe)}),Y&&Qt(f,E),S}function w(f,u,h,g){var S=Hn(h);if(typeof S!="function")throw Error(C(150));if(h=S.call(h),h==null)throw Error(C(151));for(var P=S=null,k=u,E=u=0,F=null,R=h.next();k!==null&&!R.done;E++,R=h.next()){k.index>E?(F=k,k=null):F=k.sibling;var pe=v(f,k,R.value,g);if(pe===null){k===null&&(k=F);break}e&&k&&pe.alternate===null&&t(f,k),u=a(pe,u,E),P===null?S=pe:P.sibling=pe,P=pe,k=F}if(R.done)return n(f,k),Y&&Qt(f,E),S;if(k===null){for(;!R.done;E++,R=h.next())R=p(f,R.value,g),R!==null&&(u=a(R,u,E),P===null?S=R:P.sibling=R,P=R);return Y&&Qt(f,E),S}for(k=s(f,k);!R.done;E++,R=h.next())R=y(k,f,E,R.value,g),R!==null&&(e&&R.alternate!==null&&k.delete(R.key===null?E:R.key),u=a(R,u,E),P===null?S=R:P.sibling=R,P=R);return e&&k.forEach(function(yt){return t(f,yt)}),Y&&Qt(f,E),S}function N(f,u,h,g){if(typeof h=="object"&&h!==null&&h.type===hn&&h.key===null&&(h=h.props.children),typeof h=="object"&&h!==null){switch(h.$$typeof){case Hr:e:{for(var S=h.key,P=u;P!==null;){if(P.key===S){if(S=h.type,S===hn){if(P.tag===7){n(f,P.sibling),u=l(P,h.props.children),u.return=f,f=u;break e}}else if(P.elementType===S||typeof S=="object"&&S!==null&&S.$$typeof===jt&&$o(S)===P.type){n(f,P.sibling),u=l(P,h.props),u.ref=Xn(f,P,h),u.return=f,f=u;break e}n(f,P);break}else t(f,P);P=P.sibling}h.type===hn?(u=Zt(h.props.children,f.mode,g,h.key),u.return=f,f=u):(g=ys(h.type,h.key,h.props,null,f.mode,g),g.ref=Xn(f,u,h),g.return=f,f=g)}return i(f);case dn:e:{for(P=h.key;u!==null;){if(u.key===P)if(u.tag===4&&u.stateNode.containerInfo===h.containerInfo&&u.stateNode.implementation===h.implementation){n(f,u.sibling),u=l(u,h.children||[]),u.return=f,f=u;break e}else{n(f,u);break}else t(f,u);u=u.sibling}u=Kl(h,f.mode,g),u.return=f,f=u}return i(f);case jt:return P=h._init,N(f,u,P(h._payload),g)}if(er(h))return j(f,u,h,g);if(Hn(h))return w(f,u,h,g);ns(f,h)}return typeof h=="string"&&h!==""||typeof h=="number"?(h=""+h,u!==null&&u.tag===6?(n(f,u.sibling),u=l(u,h),u.return=f,f=u):(n(f,u),u=Yl(h,f.mode,g),u.return=f,f=u),i(f)):n(f,u)}return N}var Ln=Fu(!0),$u=Fu(!1),Ls=Wt(null),Rs=null,jn=null,xi=null;function yi(){xi=jn=Rs=null}function gi(e){var t=Ls.current;Q(Ls),e._currentValue=t}function Ca(e,t,n){for(;e!==null;){var s=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,s!==null&&(s.childLanes|=t)):s!==null&&(s.childLanes&t)!==t&&(s.childLanes|=t),e===n)break;e=e.return}}function _n(e,t){Rs=e,xi=jn=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(Ee=!0),e.firstContext=null)}function Be(e){var t=e._currentValue;if(xi!==e)if(e={context:e,memoizedValue:t,next:null},jn===null){if(Rs===null)throw Error(C(308));jn=e,Rs.dependencies={lanes:0,firstContext:e}}else jn=jn.next=e;return t}var Gt=null;function ji(e){Gt===null?Gt=[e]:Gt.push(e)}function Uu(e,t,n,s){var l=t.interleaved;return l===null?(n.next=n,ji(t)):(n.next=l.next,l.next=n),t.interleaved=n,pt(e,s)}function pt(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var wt=!1;function wi(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wu(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function dt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function zt(e,t,n){var s=e.updateQueue;if(s===null)return null;if(s=s.shared,U&2){var l=s.pending;return l===null?t.next=t:(t.next=l.next,l.next=t),s.pending=t,pt(e,n)}return l=s.interleaved,l===null?(t.next=t,ji(s)):(t.next=l.next,l.next=t),s.interleaved=t,pt(e,n)}function hs(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,ai(e,n)}}function Uo(e,t){var n=e.updateQueue,s=e.alternate;if(s!==null&&(s=s.updateQueue,n===s)){var l=null,a=null;if(n=n.firstBaseUpdate,n!==null){do{var i={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};a===null?l=a=i:a=a.next=i,n=n.next}while(n!==null);a===null?l=a=t:a=a.next=t}else l=a=t;n={baseState:s.baseState,firstBaseUpdate:l,lastBaseUpdate:a,shared:s.shared,effects:s.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function Is(e,t,n,s){var l=e.updateQueue;wt=!1;var a=l.firstBaseUpdate,i=l.lastBaseUpdate,o=l.shared.pending;if(o!==null){l.shared.pending=null;var c=o,d=c.next;c.next=null,i===null?a=d:i.next=d,i=c;var m=e.alternate;m!==null&&(m=m.updateQueue,o=m.lastBaseUpdate,o!==i&&(o===null?m.firstBaseUpdate=d:o.next=d,m.lastBaseUpdate=c))}if(a!==null){var p=l.baseState;i=0,m=d=c=null,o=a;do{var v=o.lane,y=o.eventTime;if((s&v)===v){m!==null&&(m=m.next={eventTime:y,lane:0,tag:o.tag,payload:o.payload,callback:o.callback,next:null});e:{var j=e,w=o;switch(v=t,y=n,w.tag){case 1:if(j=w.payload,typeof j=="function"){p=j.call(y,p,v);break e}p=j;break e;case 3:j.flags=j.flags&-65537|128;case 0:if(j=w.payload,v=typeof j=="function"?j.call(y,p,v):j,v==null)break e;p=Z({},p,v);break e;case 2:wt=!0}}o.callback!==null&&o.lane!==0&&(e.flags|=64,v=l.effects,v===null?l.effects=[o]:v.push(o))}else y={eventTime:y,lane:v,tag:o.tag,payload:o.payload,callback:o.callback,next:null},m===null?(d=m=y,c=p):m=m.next=y,i|=v;if(o=o.next,o===null){if(o=l.shared.pending,o===null)break;v=o,o=v.next,v.next=null,l.lastBaseUpdate=v,l.shared.pending=null}}while(!0);if(m===null&&(c=p),l.baseState=c,l.firstBaseUpdate=d,l.lastBaseUpdate=m,t=l.shared.interleaved,t!==null){l=t;do i|=l.lane,l=l.next;while(l!==t)}else a===null&&(l.shared.lanes=0);rn|=i,e.lanes=i,e.memoizedState=p}}function Wo(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var s=e[t],l=s.callback;if(l!==null){if(s.callback=null,s=n,typeof l!="function")throw Error(C(191,l));l.call(s)}}}var Ar={},nt=Wt(Ar),kr=Wt(Ar),Sr=Wt(Ar);function Xt(e){if(e===Ar)throw Error(C(174));return e}function Ni(e,t){switch(b(Sr,t),b(kr,e),b(nt,Ar),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:la(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=la(t,e)}Q(nt),b(nt,t)}function Rn(){Q(nt),Q(kr),Q(Sr)}function Bu(e){Xt(Sr.current);var t=Xt(nt.current),n=la(t,e.type);t!==n&&(b(kr,e),b(nt,n))}function ki(e){kr.current===e&&(Q(nt),Q(kr))}var G=Wt(0);function Os(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var Wl=[];function Si(){for(var e=0;e<Wl.length;e++)Wl[e]._workInProgressVersionPrimary=null;Wl.length=0}var fs=vt.ReactCurrentDispatcher,Bl=vt.ReactCurrentBatchConfig,nn=0,X=null,ae=null,ce=null,Ds=!1,or=!1,Cr=0,ap=0;function me(){throw Error(C(321))}function Ci(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!Xe(e[n],t[n]))return!1;return!0}function Ei(e,t,n,s,l,a){if(nn=a,X=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,fs.current=e===null||e.memoizedState===null?up:dp,e=n(s,l),or){a=0;do{if(or=!1,Cr=0,25<=a)throw Error(C(301));a+=1,ce=ae=null,t.updateQueue=null,fs.current=hp,e=n(s,l)}while(or)}if(fs.current=As,t=ae!==null&&ae.next!==null,nn=0,ce=ae=X=null,Ds=!1,t)throw Error(C(300));return e}function _i(){var e=Cr!==0;return Cr=0,e}function qe(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return ce===null?X.memoizedState=ce=e:ce=ce.next=e,ce}function Ve(){if(ae===null){var e=X.alternate;e=e!==null?e.memoizedState:null}else e=ae.next;var t=ce===null?X.memoizedState:ce.next;if(t!==null)ce=t,ae=e;else{if(e===null)throw Error(C(310));ae=e,e={memoizedState:ae.memoizedState,baseState:ae.baseState,baseQueue:ae.baseQueue,queue:ae.queue,next:null},ce===null?X.memoizedState=ce=e:ce=ce.next=e}return ce}function Er(e,t){return typeof t=="function"?t(e):t}function Vl(e){var t=Ve(),n=t.queue;if(n===null)throw Error(C(311));n.lastRenderedReducer=e;var s=ae,l=s.baseQueue,a=n.pending;if(a!==null){if(l!==null){var i=l.next;l.next=a.next,a.next=i}s.baseQueue=l=a,n.pending=null}if(l!==null){a=l.next,s=s.baseState;var o=i=null,c=null,d=a;do{var m=d.lane;if((nn&m)===m)c!==null&&(c=c.next={lane:0,action:d.action,hasEagerState:d.hasEagerState,eagerState:d.eagerState,next:null}),s=d.hasEagerState?d.eagerState:e(s,d.action);else{var p={lane:m,action:d.action,hasEagerState:d.hasEagerState,eagerState:d.eagerState,next:null};c===null?(o=c=p,i=s):c=c.next=p,X.lanes|=m,rn|=m}d=d.next}while(d!==null&&d!==a);c===null?i=s:c.next=o,Xe(s,t.memoizedState)||(Ee=!0),t.memoizedState=s,t.baseState=i,t.baseQueue=c,n.lastRenderedState=s}if(e=n.interleaved,e!==null){l=e;do a=l.lane,X.lanes|=a,rn|=a,l=l.next;while(l!==e)}else l===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function bl(e){var t=Ve(),n=t.queue;if(n===null)throw Error(C(311));n.lastRenderedReducer=e;var s=n.dispatch,l=n.pending,a=t.memoizedState;if(l!==null){n.pending=null;var i=l=l.next;do a=e(a,i.action),i=i.next;while(i!==l);Xe(a,t.memoizedState)||(Ee=!0),t.memoizedState=a,t.baseQueue===null&&(t.baseState=a),n.lastRenderedState=a}return[a,s]}function Vu(){}function bu(e,t){var n=X,s=Ve(),l=t(),a=!Xe(s.memoizedState,l);if(a&&(s.memoizedState=l,Ee=!0),s=s.queue,Pi(Yu.bind(null,n,s,e),[e]),s.getSnapshot!==t||a||ce!==null&&ce.memoizedState.tag&1){if(n.flags|=2048,_r(9,Qu.bind(null,n,s,l,t),void 0,null),ue===null)throw Error(C(349));nn&30||Hu(n,t,l)}return l}function Hu(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function Qu(e,t,n,s){t.value=n,t.getSnapshot=s,Ku(t)&&Gu(e)}function Yu(e,t,n){return n(function(){Ku(t)&&Gu(e)})}function Ku(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!Xe(e,n)}catch{return!0}}function Gu(e){var t=pt(e,1);t!==null&&Ge(t,e,1,-1)}function Bo(e){var t=qe();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Er,lastRenderedState:e},t.queue=e,e=e.dispatch=cp.bind(null,X,e),[t.memoizedState,e]}function _r(e,t,n,s){return e={tag:e,create:t,destroy:n,deps:s,next:null},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(s=n.next,n.next=e,e.next=s,t.lastEffect=e)),e}function Xu(){return Ve().memoizedState}function ps(e,t,n,s){var l=qe();X.flags|=e,l.memoizedState=_r(1|t,n,void 0,s===void 0?null:s)}function rl(e,t,n,s){var l=Ve();s=s===void 0?null:s;var a=void 0;if(ae!==null){var i=ae.memoizedState;if(a=i.destroy,s!==null&&Ci(s,i.deps)){l.memoizedState=_r(t,n,a,s);return}}X.flags|=e,l.memoizedState=_r(1|t,n,a,s)}function Vo(e,t){return ps(8390656,8,e,t)}function Pi(e,t){return rl(2048,8,e,t)}function Ju(e,t){return rl(4,2,e,t)}function Zu(e,t){return rl(4,4,e,t)}function qu(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function ed(e,t,n){return n=n!=null?n.concat([e]):null,rl(4,4,qu.bind(null,t,e),n)}function Ti(){}function td(e,t){var n=Ve();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Ci(t,s[1])?s[0]:(n.memoizedState=[e,t],e)}function nd(e,t){var n=Ve();t=t===void 0?null:t;var s=n.memoizedState;return s!==null&&t!==null&&Ci(t,s[1])?s[0]:(e=e(),n.memoizedState=[e,t],e)}function rd(e,t,n){return nn&21?(Xe(n,t)||(n=ou(),X.lanes|=n,rn|=n,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,Ee=!0),e.memoizedState=n)}function ip(e,t){var n=B;B=n!==0&&4>n?n:4,e(!0);var s=Bl.transition;Bl.transition={};try{e(!1),t()}finally{B=n,Bl.transition=s}}function sd(){return Ve().memoizedState}function op(e,t,n){var s=Rt(e);if(n={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null},ld(e))ad(t,n);else if(n=Uu(e,t,n,s),n!==null){var l=je();Ge(n,e,s,l),id(n,t,s)}}function cp(e,t,n){var s=Rt(e),l={lane:s,action:n,hasEagerState:!1,eagerState:null,next:null};if(ld(e))ad(t,l);else{var a=e.alternate;if(e.lanes===0&&(a===null||a.lanes===0)&&(a=t.lastRenderedReducer,a!==null))try{var i=t.lastRenderedState,o=a(i,n);if(l.hasEagerState=!0,l.eagerState=o,Xe(o,i)){var c=t.interleaved;c===null?(l.next=l,ji(t)):(l.next=c.next,c.next=l),t.interleaved=l;return}}catch{}finally{}n=Uu(e,t,l,s),n!==null&&(l=je(),Ge(n,e,s,l),id(n,t,s))}}function ld(e){var t=e.alternate;return e===X||t!==null&&t===X}function ad(e,t){or=Ds=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function id(e,t,n){if(n&4194240){var s=t.lanes;s&=e.pendingLanes,n|=s,t.lanes=n,ai(e,n)}}var As={readContext:Be,useCallback:me,useContext:me,useEffect:me,useImperativeHandle:me,useInsertionEffect:me,useLayoutEffect:me,useMemo:me,useReducer:me,useRef:me,useState:me,useDebugValue:me,useDeferredValue:me,useTransition:me,useMutableSource:me,useSyncExternalStore:me,useId:me,unstable_isNewReconciler:!1},up={readContext:Be,useCallback:function(e,t){return qe().memoizedState=[e,t===void 0?null:t],e},useContext:Be,useEffect:Vo,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,ps(4194308,4,qu.bind(null,t,e),n)},useLayoutEffect:function(e,t){return ps(4194308,4,e,t)},useInsertionEffect:function(e,t){return ps(4,2,e,t)},useMemo:function(e,t){var n=qe();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var s=qe();return t=n!==void 0?n(t):t,s.memoizedState=s.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},s.queue=e,e=e.dispatch=op.bind(null,X,e),[s.memoizedState,e]},useRef:function(e){var t=qe();return e={current:e},t.memoizedState=e},useState:Bo,useDebugValue:Ti,useDeferredValue:function(e){return qe().memoizedState=e},useTransition:function(){var e=Bo(!1),t=e[0];return e=ip.bind(null,e[1]),qe().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var s=X,l=qe();if(Y){if(n===void 0)throw Error(C(407));n=n()}else{if(n=t(),ue===null)throw Error(C(349));nn&30||Hu(s,t,n)}l.memoizedState=n;var a={value:n,getSnapshot:t};return l.queue=a,Vo(Yu.bind(null,s,a,e),[e]),s.flags|=2048,_r(9,Qu.bind(null,s,a,n,t),void 0,null),n},useId:function(){var e=qe(),t=ue.identifierPrefix;if(Y){var n=ut,s=ct;n=(s&~(1<<32-Ke(s)-1)).toString(32)+n,t=":"+t+"R"+n,n=Cr++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=ap++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},dp={readContext:Be,useCallback:td,useContext:Be,useEffect:Pi,useImperativeHandle:ed,useInsertionEffect:Ju,useLayoutEffect:Zu,useMemo:nd,useReducer:Vl,useRef:Xu,useState:function(){return Vl(Er)},useDebugValue:Ti,useDeferredValue:function(e){var t=Ve();return rd(t,ae.memoizedState,e)},useTransition:function(){var e=Vl(Er)[0],t=Ve().memoizedState;return[e,t]},useMutableSource:Vu,useSyncExternalStore:bu,useId:sd,unstable_isNewReconciler:!1},hp={readContext:Be,useCallback:td,useContext:Be,useEffect:Pi,useImperativeHandle:ed,useInsertionEffect:Ju,useLayoutEffect:Zu,useMemo:nd,useReducer:bl,useRef:Xu,useState:function(){return bl(Er)},useDebugValue:Ti,useDeferredValue:function(e){var t=Ve();return ae===null?t.memoizedState=e:rd(t,ae.memoizedState,e)},useTransition:function(){var e=bl(Er)[0],t=Ve().memoizedState;return[e,t]},useMutableSource:Vu,useSyncExternalStore:bu,useId:sd,unstable_isNewReconciler:!1};function He(e,t){if(e&&e.defaultProps){t=Z({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function Ea(e,t,n,s){t=e.memoizedState,n=n(s,t),n=n==null?t:Z({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var sl={isMounted:function(e){return(e=e._reactInternals)?on(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var s=je(),l=Rt(e),a=dt(s,l);a.payload=t,n!=null&&(a.callback=n),t=zt(e,a,l),t!==null&&(Ge(t,e,l,s),hs(t,e,l))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var s=je(),l=Rt(e),a=dt(s,l);a.tag=1,a.payload=t,n!=null&&(a.callback=n),t=zt(e,a,l),t!==null&&(Ge(t,e,l,s),hs(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=je(),s=Rt(e),l=dt(n,s);l.tag=2,t!=null&&(l.callback=t),t=zt(e,l,s),t!==null&&(Ge(t,e,s,n),hs(t,e,s))}};function bo(e,t,n,s,l,a,i){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(s,a,i):t.prototype&&t.prototype.isPureReactComponent?!gr(n,s)||!gr(l,a):!0}function od(e,t,n){var s=!1,l=At,a=t.contextType;return typeof a=="object"&&a!==null?a=Be(a):(l=Pe(t)?en:ye.current,s=t.contextTypes,a=(s=s!=null)?Mn(e,l):At),t=new t(n,a),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=sl,e.stateNode=t,t._reactInternals=e,s&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=a),t}function Ho(e,t,n,s){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,s),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,s),t.state!==e&&sl.enqueueReplaceState(t,t.state,null)}function _a(e,t,n,s){var l=e.stateNode;l.props=n,l.state=e.memoizedState,l.refs={},wi(e);var a=t.contextType;typeof a=="object"&&a!==null?l.context=Be(a):(a=Pe(t)?en:ye.current,l.context=Mn(e,a)),l.state=e.memoizedState,a=t.getDerivedStateFromProps,typeof a=="function"&&(Ea(e,t,a,n),l.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof l.getSnapshotBeforeUpdate=="function"||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(t=l.state,typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount(),t!==l.state&&sl.enqueueReplaceState(l,l.state,null),Is(e,n,l,s),l.state=e.memoizedState),typeof l.componentDidMount=="function"&&(e.flags|=4194308)}function In(e,t){try{var n="",s=t;do n+=$h(s),s=s.return;while(s);var l=n}catch(a){l=`\nError generating stack: `+a.message+`\n`+a.stack}return{value:e,source:t,stack:l,digest:null}}function Hl(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function Pa(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var fp=typeof WeakMap=="function"?WeakMap:Map;function cd(e,t,n){n=dt(-1,n),n.tag=3,n.payload={element:null};var s=t.value;return n.callback=function(){$s||($s=!0,Fa=s),Pa(e,t)},n}function ud(e,t,n){n=dt(-1,n),n.tag=3;var s=e.type.getDerivedStateFromError;if(typeof s=="function"){var l=t.value;n.payload=function(){return s(l)},n.callback=function(){Pa(e,t)}}var a=e.stateNode;return a!==null&&typeof a.componentDidCatch=="function"&&(n.callback=function(){Pa(e,t),typeof s!="function"&&(Lt===null?Lt=new Set([this]):Lt.add(this));var i=t.stack;this.componentDidCatch(t.value,{componentStack:i!==null?i:""})}),n}function Qo(e,t,n){var s=e.pingCache;if(s===null){s=e.pingCache=new fp;var l=new Set;s.set(t,l)}else l=s.get(t),l===void 0&&(l=new Set,s.set(t,l));l.has(n)||(l.add(n),e=_p.bind(null,e,t,n),t.then(e,e))}function Yo(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Ko(e,t,n,s,l){return e.mode&1?(e.flags|=65536,e.lanes=l,e):(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=dt(-1,1),t.tag=2,zt(n,t,1))),n.lanes|=1),e)}var pp=vt.ReactCurrentOwner,Ee=!1;function ge(e,t,n,s){t.child=e===null?$u(t,null,n,s):Ln(t,e.child,n,s)}function Go(e,t,n,s,l){n=n.render;var a=t.ref;return _n(t,l),s=Ei(e,t,n,s,a,l),n=_i(),e!==null&&!Ee?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,mt(e,t,l)):(Y&&n&&pi(t),t.flags|=1,ge(e,t,s,l),t.child)}function Xo(e,t,n,s,l){if(e===null){var a=n.type;return typeof a=="function"&&!Ai(a)&&a.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=a,dd(e,t,a,s,l)):(e=ys(n.type,null,s,t,t.mode,l),e.ref=t.ref,e.return=t,t.child=e)}if(a=e.child,!(e.lanes&l)){var i=a.memoizedProps;if(n=n.compare,n=n!==null?n:gr,n(i,s)&&e.ref===t.ref)return mt(e,t,l)}return t.flags|=1,e=It(a,s),e.ref=t.ref,e.return=t,t.child=e}function dd(e,t,n,s,l){if(e!==null){var a=e.memoizedProps;if(gr(a,s)&&e.ref===t.ref)if(Ee=!1,t.pendingProps=s=a,(e.lanes&l)!==0)e.flags&131072&&(Ee=!0);else return t.lanes=e.lanes,mt(e,t,l)}return Ta(e,t,n,s,l)}function hd(e,t,n){var s=t.pendingProps,l=s.children,a=e!==null?e.memoizedState:null;if(s.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},b(Nn,Me),Me|=n;else{if(!(n&1073741824))return e=a!==null?a.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,b(Nn,Me),Me|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},s=a!==null?a.baseLanes:n,b(Nn,Me),Me|=s}else a!==null?(s=a.baseLanes|n,t.memoizedState=null):s=n,b(Nn,Me),Me|=s;return ge(e,t,l,n),t.child}function fd(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function Ta(e,t,n,s,l){var a=Pe(n)?en:ye.current;return a=Mn(t,a),_n(t,l),n=Ei(e,t,n,s,a,l),s=_i(),e!==null&&!Ee?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,mt(e,t,l)):(Y&&s&&pi(t),t.flags|=1,ge(e,t,n,l),t.child)}function Jo(e,t,n,s,l){if(Pe(n)){var a=!0;Ts(t)}else a=!1;if(_n(t,l),t.stateNode===null)ms(e,t),od(t,n,s),_a(t,n,s,l),s=!0;else if(e===null){var i=t.stateNode,o=t.memoizedProps;i.props=o;var c=i.context,d=n.contextType;typeof d=="object"&&d!==null?d=Be(d):(d=Pe(n)?en:ye.current,d=Mn(t,d));var m=n.getDerivedStateFromProps,p=typeof m=="function"||typeof i.getSnapshotBeforeUpdate=="function";p||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(o!==s||c!==d)&&Ho(t,i,s,d),wt=!1;var v=t.memoizedState;i.state=v,Is(t,s,i,l),c=t.memoizedState,o!==s||v!==c||_e.current||wt?(typeof m=="function"&&(Ea(t,n,m,s),c=t.memoizedState),(o=wt||bo(t,n,o,s,v,c,d))?(p||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount()),typeof i.componentDidMount=="function"&&(t.flags|=4194308)):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=s,t.memoizedState=c),i.props=s,i.state=c,i.context=d,s=o):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),s=!1)}else{i=t.stateNode,Wu(e,t),o=t.memoizedProps,d=t.type===t.elementType?o:He(t.type,o),i.props=d,p=t.pendingProps,v=i.context,c=n.contextType,typeof c=="object"&&c!==null?c=Be(c):(c=Pe(n)?en:ye.current,c=Mn(t,c));var y=n.getDerivedStateFromProps;(m=typeof y=="function"||typeof i.getSnapshotBeforeUpdate=="function")||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(o!==p||v!==c)&&Ho(t,i,s,c),wt=!1,v=t.memoizedState,i.state=v,Is(t,s,i,l);var j=t.memoizedState;o!==p||v!==j||_e.current||wt?(typeof y=="function"&&(Ea(t,n,y,s),j=t.memoizedState),(d=wt||bo(t,n,d,s,v,j,c)||!1)?(m||typeof i.UNSAFE_componentWillUpdate!="function"&&typeof i.componentWillUpdate!="function"||(typeof i.componentWillUpdate=="function"&&i.componentWillUpdate(s,j,c),typeof i.UNSAFE_componentWillUpdate=="function"&&i.UNSAFE_componentWillUpdate(s,j,c)),typeof i.componentDidUpdate=="function"&&(t.flags|=4),typeof i.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof i.componentDidUpdate!="function"||o===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||o===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),t.memoizedProps=s,t.memoizedState=j),i.props=s,i.state=j,i.context=c,s=d):(typeof i.componentDidUpdate!="function"||o===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||o===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),s=!1)}return Ma(e,t,n,s,a,l)}function Ma(e,t,n,s,l,a){fd(e,t);var i=(t.flags&128)!==0;if(!s&&!i)return l&&Do(t,n,!1),mt(e,t,a);s=t.stateNode,pp.current=t;var o=i&&typeof n.getDerivedStateFromError!="function"?null:s.render();return t.flags|=1,e!==null&&i?(t.child=Ln(t,e.child,null,a),t.child=Ln(t,null,o,a)):ge(e,t,o,a),t.memoizedState=s.state,l&&Do(t,n,!0),t.child}function pd(e){var t=e.stateNode;t.pendingContext?Oo(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Oo(e,t.context,!1),Ni(e,t.containerInfo)}function Zo(e,t,n,s,l){return zn(),vi(l),t.flags|=256,ge(e,t,n,s),t.child}var za={dehydrated:null,treeContext:null,retryLane:0};function La(e){return{baseLanes:e,cachePool:null,transitions:null}}function md(e,t,n){var s=t.pendingProps,l=G.current,a=!1,i=(t.flags&128)!==0,o;if((o=i)||(o=e!==null&&e.memoizedState===null?!1:(l&2)!==0),o?(a=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(l|=1),b(G,l&1),e===null)return Sa(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(i=s.children,e=s.fallback,a?(s=t.mode,a=t.child,i={mode:"hidden",children:i},!(s&1)&&a!==null?(a.childLanes=0,a.pendingProps=i):a=il(i,s,0,null),e=Zt(e,s,n,null),a.return=t,e.return=t,a.sibling=e,t.child=a,t.child.memoizedState=La(n),t.memoizedState=za,e):Mi(t,i));if(l=e.memoizedState,l!==null&&(o=l.dehydrated,o!==null))return mp(e,t,i,s,o,l,n);if(a){a=s.fallback,i=t.mode,l=e.child,o=l.sibling;var c={mode:"hidden",children:s.children};return!(i&1)&&t.child!==l?(s=t.child,s.childLanes=0,s.pendingProps=c,t.deletions=null):(s=It(l,c),s.subtreeFlags=l.subtreeFlags&14680064),o!==null?a=It(o,a):(a=Zt(a,i,n,null),a.flags|=2),a.return=t,s.return=t,s.sibling=a,t.child=s,s=a,a=t.child,i=e.child.memoizedState,i=i===null?La(n):{baseLanes:i.baseLanes|n,cachePool:null,transitions:i.transitions},a.memoizedState=i,a.childLanes=e.childLanes&~n,t.memoizedState=za,s}return a=e.child,e=a.sibling,s=It(a,{mode:"visible",children:s.children}),!(t.mode&1)&&(s.lanes=n),s.return=t,s.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=s,t.memoizedState=null,s}function Mi(e,t){return t=il({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function rs(e,t,n,s){return s!==null&&vi(s),Ln(t,e.child,null,n),e=Mi(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function mp(e,t,n,s,l,a,i){if(n)return t.flags&256?(t.flags&=-257,s=Hl(Error(C(422))),rs(e,t,i,s)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(a=s.fallback,l=t.mode,s=il({mode:"visible",children:s.children},l,0,null),a=Zt(a,l,i,null),a.flags|=2,s.return=t,a.return=t,s.sibling=a,t.child=s,t.mode&1&&Ln(t,e.child,null,i),t.child.memoizedState=La(i),t.memoizedState=za,a);if(!(t.mode&1))return rs(e,t,i,null);if(l.data==="$!"){if(s=l.nextSibling&&l.nextSibling.dataset,s)var o=s.dgst;return s=o,a=Error(C(419)),s=Hl(a,s,void 0),rs(e,t,i,s)}if(o=(i&e.childLanes)!==0,Ee||o){if(s=ue,s!==null){switch(i&-i){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=l&(s.suspendedLanes|i)?0:l,l!==0&&l!==a.retryLane&&(a.retryLane=l,pt(e,l),Ge(s,e,l,-1))}return Di(),s=Hl(Error(C(421))),rs(e,t,i,s)}return l.data==="$?"?(t.flags|=128,t.child=e.child,t=Pp.bind(null,e),l._reactRetry=t,null):(e=a.treeContext,ze=Mt(l.nextSibling),Le=t,Y=!0,Ye=null,e!==null&&(Ae[Fe++]=ct,Ae[Fe++]=ut,Ae[Fe++]=tn,ct=e.id,ut=e.overflow,tn=t),t=Mi(t,s.children),t.flags|=4096,t)}function qo(e,t,n){e.lanes|=t;var s=e.alternate;s!==null&&(s.lanes|=t),Ca(e.return,t,n)}function Ql(e,t,n,s,l){var a=e.memoizedState;a===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:s,tail:n,tailMode:l}:(a.isBackwards=t,a.rendering=null,a.renderingStartTime=0,a.last=s,a.tail=n,a.tailMode=l)}function vd(e,t,n){var s=t.pendingProps,l=s.revealOrder,a=s.tail;if(ge(e,t,s.children,n),s=G.current,s&2)s=s&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&qo(e,n,t);else if(e.tag===19)qo(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}s&=1}if(b(G,s),!(t.mode&1))t.memoizedState=null;else switch(l){case"forwards":for(n=t.child,l=null;n!==null;)e=n.alternate,e!==null&&Os(e)===null&&(l=n),n=n.sibling;n=l,n===null?(l=t.child,t.child=null):(l=n.sibling,n.sibling=null),Ql(t,!1,l,n,a);break;case"backwards":for(n=null,l=t.child,t.child=null;l!==null;){if(e=l.alternate,e!==null&&Os(e)===null){t.child=l;break}e=l.sibling,l.sibling=n,n=l,l=e}Ql(t,!0,n,null,a);break;case"together":Ql(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function ms(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function mt(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),rn|=t.lanes,!(n&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(C(153));if(t.child!==null){for(e=t.child,n=It(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=It(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function vp(e,t,n){switch(t.tag){case 3:pd(t),zn();break;case 5:Bu(t);break;case 1:Pe(t.type)&&Ts(t);break;case 4:Ni(t,t.stateNode.containerInfo);break;case 10:var s=t.type._context,l=t.memoizedProps.value;b(Ls,s._currentValue),s._currentValue=l;break;case 13:if(s=t.memoizedState,s!==null)return s.dehydrated!==null?(b(G,G.current&1),t.flags|=128,null):n&t.child.childLanes?md(e,t,n):(b(G,G.current&1),e=mt(e,t,n),e!==null?e.sibling:null);b(G,G.current&1);break;case 19:if(s=(n&t.childLanes)!==0,e.flags&128){if(s)return vd(e,t,n);t.flags|=128}if(l=t.memoizedState,l!==null&&(l.rendering=null,l.tail=null,l.lastEffect=null),b(G,G.current),s)break;return null;case 22:case 23:return t.lanes=0,hd(e,t,n)}return mt(e,t,n)}var xd,Ra,yd,gd;xd=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};Ra=function(){};yd=function(e,t,n,s){var l=e.memoizedProps;if(l!==s){e=t.stateNode,Xt(nt.current);var a=null;switch(n){case"input":l=ta(e,l),s=ta(e,s),a=[];break;case"select":l=Z({},l,{value:void 0}),s=Z({},s,{value:void 0}),a=[];break;case"textarea":l=sa(e,l),s=sa(e,s),a=[];break;default:typeof l.onClick!="function"&&typeof s.onClick=="function"&&(e.onclick=_s)}aa(n,s);var i;n=null;for(d in l)if(!s.hasOwnProperty(d)&&l.hasOwnProperty(d)&&l[d]!=null)if(d==="style"){var o=l[d];for(i in o)o.hasOwnProperty(i)&&(n||(n={}),n[i]="")}else d!=="dangerouslySetInnerHTML"&&d!=="children"&&d!=="suppressContentEditableWarning"&&d!=="suppressHydrationWarning"&&d!=="autoFocus"&&(hr.hasOwnProperty(d)?a||(a=[]):(a=a||[]).push(d,null));for(d in s){var c=s[d];if(o=l!=null?l[d]:void 0,s.hasOwnProperty(d)&&c!==o&&(c!=null||o!=null))if(d==="style")if(o){for(i in o)!o.hasOwnProperty(i)||c&&c.hasOwnProperty(i)||(n||(n={}),n[i]="");for(i in c)c.hasOwnProperty(i)&&o[i]!==c[i]&&(n||(n={}),n[i]=c[i])}else n||(a||(a=[]),a.push(d,n)),n=c;else d==="dangerouslySetInnerHTML"?(c=c?c.__html:void 0,o=o?o.__html:void 0,c!=null&&o!==c&&(a=a||[]).push(d,c)):d==="children"?typeof c!="string"&&typeof c!="number"||(a=a||[]).push(d,""+c):d!=="suppressContentEditableWarning"&&d!=="suppressHydrationWarning"&&(hr.hasOwnProperty(d)?(c!=null&&d==="onScroll"&&H("scroll",e),a||o===c||(a=[])):(a=a||[]).push(d,c))}n&&(a=a||[]).push("style",n);var d=a;(t.updateQueue=d)&&(t.flags|=4)}};gd=function(e,t,n,s){n!==s&&(t.flags|=4)};function Jn(e,t){if(!Y)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var s=null;n!==null;)n.alternate!==null&&(s=n),n=n.sibling;s===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:s.sibling=null}}function ve(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,s=0;if(t)for(var l=e.child;l!==null;)n|=l.lanes|l.childLanes,s|=l.subtreeFlags&14680064,s|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;l!==null;)n|=l.lanes|l.childLanes,s|=l.subtreeFlags,s|=l.flags,l.return=e,l=l.sibling;return e.subtreeFlags|=s,e.childLanes=n,t}function xp(e,t,n){var s=t.pendingProps;switch(mi(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return ve(t),null;case 1:return Pe(t.type)&&Ps(),ve(t),null;case 3:return s=t.stateNode,Rn(),Q(_e),Q(ye),Si(),s.pendingContext&&(s.context=s.pendingContext,s.pendingContext=null),(e===null||e.child===null)&&(ts(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,Ye!==null&&(Wa(Ye),Ye=null))),Ra(e,t),ve(t),null;case 5:ki(t);var l=Xt(Sr.current);if(n=t.type,e!==null&&t.stateNode!=null)yd(e,t,n,s,l),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!s){if(t.stateNode===null)throw Error(C(166));return ve(t),null}if(e=Xt(nt.current),ts(t)){s=t.stateNode,n=t.type;var a=t.memoizedProps;switch(s[et]=t,s[Nr]=a,e=(t.mode&1)!==0,n){case"dialog":H("cancel",s),H("close",s);break;case"iframe":case"object":case"embed":H("load",s);break;case"video":case"audio":for(l=0;l<nr.length;l++)H(nr[l],s);break;case"source":H("error",s);break;case"img":case"image":case"link":H("error",s),H("load",s);break;case"details":H("toggle",s);break;case"input":io(s,a),H("invalid",s);break;case"select":s._wrapperState={wasMultiple:!!a.multiple},H("invalid",s);break;case"textarea":co(s,a),H("invalid",s)}aa(n,a),l=null;for(var i in a)if(a.hasOwnProperty(i)){var o=a[i];i==="children"?typeof o=="string"?s.textContent!==o&&(a.suppressHydrationWarning!==!0&&es(s.textContent,o,e),l=["children",o]):typeof o=="number"&&s.textContent!==""+o&&(a.suppressHydrationWarning!==!0&&es(s.textContent,o,e),l=["children",""+o]):hr.hasOwnProperty(i)&&o!=null&&i==="onScroll"&&H("scroll",s)}switch(n){case"input":Qr(s),oo(s,a,!0);break;case"textarea":Qr(s),uo(s);break;case"select":case"option":break;default:typeof a.onClick=="function"&&(s.onclick=_s)}s=l,t.updateQueue=s,s!==null&&(t.flags|=4)}else{i=l.nodeType===9?l:l.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=Yc(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=i.createElement("div"),e.innerHTML="<script><\\/script>",e=e.removeChild(e.firstChild)):typeof s.is=="string"?e=i.createElement(n,{is:s.is}):(e=i.createElement(n),n==="select"&&(i=e,s.multiple?i.multiple=!0:s.size&&(i.size=s.size))):e=i.createElementNS(e,n),e[et]=t,e[Nr]=s,xd(e,t,!1,!1),t.stateNode=e;e:{switch(i=ia(n,s),n){case"dialog":H("cancel",e),H("close",e),l=s;break;case"iframe":case"object":case"embed":H("load",e),l=s;break;case"video":case"audio":for(l=0;l<nr.length;l++)H(nr[l],e);l=s;break;case"source":H("error",e),l=s;break;case"img":case"image":case"link":H("error",e),H("load",e),l=s;break;case"details":H("toggle",e),l=s;break;case"input":io(e,s),l=ta(e,s),H("invalid",e);break;case"option":l=s;break;case"select":e._wrapperState={wasMultiple:!!s.multiple},l=Z({},s,{value:void 0}),H("invalid",e);break;case"textarea":co(e,s),l=sa(e,s),H("invalid",e);break;default:l=s}aa(n,l),o=l;for(a in o)if(o.hasOwnProperty(a)){var c=o[a];a==="style"?Xc(e,c):a==="dangerouslySetInnerHTML"?(c=c?c.__html:void 0,c!=null&&Kc(e,c)):a==="children"?typeof c=="string"?(n!=="textarea"||c!=="")&&fr(e,c):typeof c=="number"&&fr(e,""+c):a!=="suppressContentEditableWarning"&&a!=="suppressHydrationWarning"&&a!=="autoFocus"&&(hr.hasOwnProperty(a)?c!=null&&a==="onScroll"&&H("scroll",e):c!=null&&ei(e,a,c,i))}switch(n){case"input":Qr(e),oo(e,s,!1);break;case"textarea":Qr(e),uo(e);break;case"option":s.value!=null&&e.setAttribute("value",""+Dt(s.value));break;case"select":e.multiple=!!s.multiple,a=s.value,a!=null?kn(e,!!s.multiple,a,!1):s.defaultValue!=null&&kn(e,!!s.multiple,s.defaultValue,!0);break;default:typeof l.onClick=="function"&&(e.onclick=_s)}switch(n){case"button":case"input":case"select":case"textarea":s=!!s.autoFocus;break e;case"img":s=!0;break e;default:s=!1}}s&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return ve(t),null;case 6:if(e&&t.stateNode!=null)gd(e,t,e.memoizedProps,s);else{if(typeof s!="string"&&t.stateNode===null)throw Error(C(166));if(n=Xt(Sr.current),Xt(nt.current),ts(t)){if(s=t.stateNode,n=t.memoizedProps,s[et]=t,(a=s.nodeValue!==n)&&(e=Le,e!==null))switch(e.tag){case 3:es(s.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&es(s.nodeValue,n,(e.mode&1)!==0)}a&&(t.flags|=4)}else s=(n.nodeType===9?n:n.ownerDocument).createTextNode(s),s[et]=t,t.stateNode=s}return ve(t),null;case 13:if(Q(G),s=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Y&&ze!==null&&t.mode&1&&!(t.flags&128))Au(),zn(),t.flags|=98560,a=!1;else if(a=ts(t),s!==null&&s.dehydrated!==null){if(e===null){if(!a)throw Error(C(318));if(a=t.memoizedState,a=a!==null?a.dehydrated:null,!a)throw Error(C(317));a[et]=t}else zn(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;ve(t),a=!1}else Ye!==null&&(Wa(Ye),Ye=null),a=!0;if(!a)return t.flags&65536?t:null}return t.flags&128?(t.lanes=n,t):(s=s!==null,s!==(e!==null&&e.memoizedState!==null)&&s&&(t.child.flags|=8192,t.mode&1&&(e===null||G.current&1?ie===0&&(ie=3):Di())),t.updateQueue!==null&&(t.flags|=4),ve(t),null);case 4:return Rn(),Ra(e,t),e===null&&jr(t.stateNode.containerInfo),ve(t),null;case 10:return gi(t.type._context),ve(t),null;case 17:return Pe(t.type)&&Ps(),ve(t),null;case 19:if(Q(G),a=t.memoizedState,a===null)return ve(t),null;if(s=(t.flags&128)!==0,i=a.rendering,i===null)if(s)Jn(a,!1);else{if(ie!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(i=Os(e),i!==null){for(t.flags|=128,Jn(a,!1),s=i.updateQueue,s!==null&&(t.updateQueue=s,t.flags|=4),t.subtreeFlags=0,s=n,n=t.child;n!==null;)a=n,e=s,a.flags&=14680066,i=a.alternate,i===null?(a.childLanes=0,a.lanes=e,a.child=null,a.subtreeFlags=0,a.memoizedProps=null,a.memoizedState=null,a.updateQueue=null,a.dependencies=null,a.stateNode=null):(a.childLanes=i.childLanes,a.lanes=i.lanes,a.child=i.child,a.subtreeFlags=0,a.deletions=null,a.memoizedProps=i.memoizedProps,a.memoizedState=i.memoizedState,a.updateQueue=i.updateQueue,a.type=i.type,e=i.dependencies,a.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return b(G,G.current&1|2),t.child}e=e.sibling}a.tail!==null&&re()>On&&(t.flags|=128,s=!0,Jn(a,!1),t.lanes=4194304)}else{if(!s)if(e=Os(i),e!==null){if(t.flags|=128,s=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),Jn(a,!0),a.tail===null&&a.tailMode==="hidden"&&!i.alternate&&!Y)return ve(t),null}else 2*re()-a.renderingStartTime>On&&n!==1073741824&&(t.flags|=128,s=!0,Jn(a,!1),t.lanes=4194304);a.isBackwards?(i.sibling=t.child,t.child=i):(n=a.last,n!==null?n.sibling=i:t.child=i,a.last=i)}return a.tail!==null?(t=a.tail,a.rendering=t,a.tail=t.sibling,a.renderingStartTime=re(),t.sibling=null,n=G.current,b(G,s?n&1|2:n&1),t):(ve(t),null);case 22:case 23:return Oi(),s=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==s&&(t.flags|=8192),s&&t.mode&1?Me&1073741824&&(ve(t),t.subtreeFlags&6&&(t.flags|=8192)):ve(t),null;case 24:return null;case 25:return null}throw Error(C(156,t.tag))}function yp(e,t){switch(mi(t),t.tag){case 1:return Pe(t.type)&&Ps(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Rn(),Q(_e),Q(ye),Si(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return ki(t),null;case 13:if(Q(G),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(C(340));zn()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return Q(G),null;case 4:return Rn(),null;case 10:return gi(t.type._context),null;case 22:case 23:return Oi(),null;case 24:return null;default:return null}}var ss=!1,xe=!1,gp=typeof WeakSet=="function"?WeakSet:Set,T=null;function wn(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(s){q(e,t,s)}else n.current=null}function Ia(e,t,n){try{n()}catch(s){q(e,t,s)}}var ec=!1;function jp(e,t){if(xa=Ss,e=Su(),fi(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var s=n.getSelection&&n.getSelection();if(s&&s.rangeCount!==0){n=s.anchorNode;var l=s.anchorOffset,a=s.focusNode;s=s.focusOffset;try{n.nodeType,a.nodeType}catch{n=null;break e}var i=0,o=-1,c=-1,d=0,m=0,p=e,v=null;t:for(;;){for(var y;p!==n||l!==0&&p.nodeType!==3||(o=i+l),p!==a||s!==0&&p.nodeType!==3||(c=i+s),p.nodeType===3&&(i+=p.nodeValue.length),(y=p.firstChild)!==null;)v=p,p=y;for(;;){if(p===e)break t;if(v===n&&++d===l&&(o=i),v===a&&++m===s&&(c=i),(y=p.nextSibling)!==null)break;p=v,v=p.parentNode}p=y}n=o===-1||c===-1?null:{start:o,end:c}}else n=null}n=n||{start:0,end:0}}else n=null;for(ya={focusedElem:e,selectionRange:n},Ss=!1,T=t;T!==null;)if(t=T,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,T=e;else for(;T!==null;){t=T;try{var j=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(j!==null){var w=j.memoizedProps,N=j.memoizedState,f=t.stateNode,u=f.getSnapshotBeforeUpdate(t.elementType===t.type?w:He(t.type,w),N);f.__reactInternalSnapshotBeforeUpdate=u}break;case 3:var h=t.stateNode.containerInfo;h.nodeType===1?h.textContent="":h.nodeType===9&&h.documentElement&&h.removeChild(h.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(C(163))}}catch(g){q(t,t.return,g)}if(e=t.sibling,e!==null){e.return=t.return,T=e;break}T=t.return}return j=ec,ec=!1,j}function cr(e,t,n){var s=t.updateQueue;if(s=s!==null?s.lastEffect:null,s!==null){var l=s=s.next;do{if((l.tag&e)===e){var a=l.destroy;l.destroy=void 0,a!==void 0&&Ia(t,n,a)}l=l.next}while(l!==s)}}function ll(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var s=n.create;n.destroy=s()}n=n.next}while(n!==t)}}function Oa(e){var t=e.ref;if(t!==null){var n=e.stateNode;switch(e.tag){case 5:e=n;break;default:e=n}typeof t=="function"?t(e):t.current=e}}function jd(e){var t=e.alternate;t!==null&&(e.alternate=null,jd(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[et],delete t[Nr],delete t[wa],delete t[np],delete t[rp])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function wd(e){return e.tag===5||e.tag===3||e.tag===4}function tc(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||wd(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Da(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=_s));else if(s!==4&&(e=e.child,e!==null))for(Da(e,t,n),e=e.sibling;e!==null;)Da(e,t,n),e=e.sibling}function Aa(e,t,n){var s=e.tag;if(s===5||s===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(s!==4&&(e=e.child,e!==null))for(Aa(e,t,n),e=e.sibling;e!==null;)Aa(e,t,n),e=e.sibling}var de=null,Qe=!1;function gt(e,t,n){for(n=n.child;n!==null;)Nd(e,t,n),n=n.sibling}function Nd(e,t,n){if(tt&&typeof tt.onCommitFiberUnmount=="function")try{tt.onCommitFiberUnmount(Js,n)}catch{}switch(n.tag){case 5:xe||wn(n,t);case 6:var s=de,l=Qe;de=null,gt(e,t,n),de=s,Qe=l,de!==null&&(Qe?(e=de,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):de.removeChild(n.stateNode));break;case 18:de!==null&&(Qe?(e=de,n=n.stateNode,e.nodeType===8?$l(e.parentNode,n):e.nodeType===1&&$l(e,n),xr(e)):$l(de,n.stateNode));break;case 4:s=de,l=Qe,de=n.stateNode.containerInfo,Qe=!0,gt(e,t,n),de=s,Qe=l;break;case 0:case 11:case 14:case 15:if(!xe&&(s=n.updateQueue,s!==null&&(s=s.lastEffect,s!==null))){l=s=s.next;do{var a=l,i=a.destroy;a=a.tag,i!==void 0&&(a&2||a&4)&&Ia(n,t,i),l=l.next}while(l!==s)}gt(e,t,n);break;case 1:if(!xe&&(wn(n,t),s=n.stateNode,typeof s.componentWillUnmount=="function"))try{s.props=n.memoizedProps,s.state=n.memoizedState,s.componentWillUnmount()}catch(o){q(n,t,o)}gt(e,t,n);break;case 21:gt(e,t,n);break;case 22:n.mode&1?(xe=(s=xe)||n.memoizedState!==null,gt(e,t,n),xe=s):gt(e,t,n);break;default:gt(e,t,n)}}function nc(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new gp),t.forEach(function(s){var l=Tp.bind(null,e,s);n.has(s)||(n.add(s),s.then(l,l))})}}function be(e,t){var n=t.deletions;if(n!==null)for(var s=0;s<n.length;s++){var l=n[s];try{var a=e,i=t,o=i;e:for(;o!==null;){switch(o.tag){case 5:de=o.stateNode,Qe=!1;break e;case 3:de=o.stateNode.containerInfo,Qe=!0;break e;case 4:de=o.stateNode.containerInfo,Qe=!0;break e}o=o.return}if(de===null)throw Error(C(160));Nd(a,i,l),de=null,Qe=!1;var c=l.alternate;c!==null&&(c.return=null),l.return=null}catch(d){q(l,t,d)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)kd(t,e),t=t.sibling}function kd(e,t){var n=e.alternate,s=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(be(t,e),Ze(e),s&4){try{cr(3,e,e.return),ll(3,e)}catch(w){q(e,e.return,w)}try{cr(5,e,e.return)}catch(w){q(e,e.return,w)}}break;case 1:be(t,e),Ze(e),s&512&&n!==null&&wn(n,n.return);break;case 5:if(be(t,e),Ze(e),s&512&&n!==null&&wn(n,n.return),e.flags&32){var l=e.stateNode;try{fr(l,"")}catch(w){q(e,e.return,w)}}if(s&4&&(l=e.stateNode,l!=null)){var a=e.memoizedProps,i=n!==null?n.memoizedProps:a,o=e.type,c=e.updateQueue;if(e.updateQueue=null,c!==null)try{o==="input"&&a.type==="radio"&&a.name!=null&&Hc(l,a),ia(o,i);var d=ia(o,a);for(i=0;i<c.length;i+=2){var m=c[i],p=c[i+1];m==="style"?Xc(l,p):m==="dangerouslySetInnerHTML"?Kc(l,p):m==="children"?fr(l,p):ei(l,m,p,d)}switch(o){case"input":na(l,a);break;case"textarea":Qc(l,a);break;case"select":var v=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!a.multiple;var y=a.value;y!=null?kn(l,!!a.multiple,y,!1):v!==!!a.multiple&&(a.defaultValue!=null?kn(l,!!a.multiple,a.defaultValue,!0):kn(l,!!a.multiple,a.multiple?[]:"",!1))}l[Nr]=a}catch(w){q(e,e.return,w)}}break;case 6:if(be(t,e),Ze(e),s&4){if(e.stateNode===null)throw Error(C(162));l=e.stateNode,a=e.memoizedProps;try{l.nodeValue=a}catch(w){q(e,e.return,w)}}break;case 3:if(be(t,e),Ze(e),s&4&&n!==null&&n.memoizedState.isDehydrated)try{xr(t.containerInfo)}catch(w){q(e,e.return,w)}break;case 4:be(t,e),Ze(e);break;case 13:be(t,e),Ze(e),l=e.child,l.flags&8192&&(a=l.memoizedState!==null,l.stateNode.isHidden=a,!a||l.alternate!==null&&l.alternate.memoizedState!==null||(Ri=re())),s&4&&nc(e);break;case 22:if(m=n!==null&&n.memoizedState!==null,e.mode&1?(xe=(d=xe)||m,be(t,e),xe=d):be(t,e),Ze(e),s&8192){if(d=e.memoizedState!==null,(e.stateNode.isHidden=d)&&!m&&e.mode&1)for(T=e,m=e.child;m!==null;){for(p=T=m;T!==null;){switch(v=T,y=v.child,v.tag){case 0:case 11:case 14:case 15:cr(4,v,v.return);break;case 1:wn(v,v.return);var j=v.stateNode;if(typeof j.componentWillUnmount=="function"){s=v,n=v.return;try{t=s,j.props=t.memoizedProps,j.state=t.memoizedState,j.componentWillUnmount()}catch(w){q(s,n,w)}}break;case 5:wn(v,v.return);break;case 22:if(v.memoizedState!==null){sc(p);continue}}y!==null?(y.return=v,T=y):sc(p)}m=m.sibling}e:for(m=null,p=e;;){if(p.tag===5){if(m===null){m=p;try{l=p.stateNode,d?(a=l.style,typeof a.setProperty=="function"?a.setProperty("display","none","important"):a.display="none"):(o=p.stateNode,c=p.memoizedProps.style,i=c!=null&&c.hasOwnProperty("display")?c.display:null,o.style.display=Gc("display",i))}catch(w){q(e,e.return,w)}}}else if(p.tag===6){if(m===null)try{p.stateNode.nodeValue=d?"":p.memoizedProps}catch(w){q(e,e.return,w)}}else if((p.tag!==22&&p.tag!==23||p.memoizedState===null||p===e)&&p.child!==null){p.child.return=p,p=p.child;continue}if(p===e)break e;for(;p.sibling===null;){if(p.return===null||p.return===e)break e;m===p&&(m=null),p=p.return}m===p&&(m=null),p.sibling.return=p.return,p=p.sibling}}break;case 19:be(t,e),Ze(e),s&4&&nc(e);break;case 21:break;default:be(t,e),Ze(e)}}function Ze(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(wd(n)){var s=n;break e}n=n.return}throw Error(C(160))}switch(s.tag){case 5:var l=s.stateNode;s.flags&32&&(fr(l,""),s.flags&=-33);var a=tc(e);Aa(e,a,l);break;case 3:case 4:var i=s.stateNode.containerInfo,o=tc(e);Da(e,o,i);break;default:throw Error(C(161))}}catch(c){q(e,e.return,c)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function wp(e,t,n){T=e,Sd(e)}function Sd(e,t,n){for(var s=(e.mode&1)!==0;T!==null;){var l=T,a=l.child;if(l.tag===22&&s){var i=l.memoizedState!==null||ss;if(!i){var o=l.alternate,c=o!==null&&o.memoizedState!==null||xe;o=ss;var d=xe;if(ss=i,(xe=c)&&!d)for(T=l;T!==null;)i=T,c=i.child,i.tag===22&&i.memoizedState!==null?lc(l):c!==null?(c.return=i,T=c):lc(l);for(;a!==null;)T=a,Sd(a),a=a.sibling;T=l,ss=o,xe=d}rc(e)}else l.subtreeFlags&8772&&a!==null?(a.return=l,T=a):rc(e)}}function rc(e){for(;T!==null;){var t=T;if(t.flags&8772){var n=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:xe||ll(5,t);break;case 1:var s=t.stateNode;if(t.flags&4&&!xe)if(n===null)s.componentDidMount();else{var l=t.elementType===t.type?n.memoizedProps:He(t.type,n.memoizedProps);s.componentDidUpdate(l,n.memoizedState,s.__reactInternalSnapshotBeforeUpdate)}var a=t.updateQueue;a!==null&&Wo(t,a,s);break;case 3:var i=t.updateQueue;if(i!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}Wo(t,i,n)}break;case 5:var o=t.stateNode;if(n===null&&t.flags&4){n=o;var c=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":c.autoFocus&&n.focus();break;case"img":c.src&&(n.src=c.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var d=t.alternate;if(d!==null){var m=d.memoizedState;if(m!==null){var p=m.dehydrated;p!==null&&xr(p)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(C(163))}xe||t.flags&512&&Oa(t)}catch(v){q(t,t.return,v)}}if(t===e){T=null;break}if(n=t.sibling,n!==null){n.return=t.return,T=n;break}T=t.return}}function sc(e){for(;T!==null;){var t=T;if(t===e){T=null;break}var n=t.sibling;if(n!==null){n.return=t.return,T=n;break}T=t.return}}function lc(e){for(;T!==null;){var t=T;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{ll(4,t)}catch(c){q(t,n,c)}break;case 1:var s=t.stateNode;if(typeof s.componentDidMount=="function"){var l=t.return;try{s.componentDidMount()}catch(c){q(t,l,c)}}var a=t.return;try{Oa(t)}catch(c){q(t,a,c)}break;case 5:var i=t.return;try{Oa(t)}catch(c){q(t,i,c)}}}catch(c){q(t,t.return,c)}if(t===e){T=null;break}var o=t.sibling;if(o!==null){o.return=t.return,T=o;break}T=t.return}}var Np=Math.ceil,Fs=vt.ReactCurrentDispatcher,zi=vt.ReactCurrentOwner,We=vt.ReactCurrentBatchConfig,U=0,ue=null,le=null,he=0,Me=0,Nn=Wt(0),ie=0,Pr=null,rn=0,al=0,Li=0,ur=null,Ce=null,Ri=0,On=1/0,it=null,$s=!1,Fa=null,Lt=null,ls=!1,Ct=null,Us=0,dr=0,$a=null,vs=-1,xs=0;function je(){return U&6?re():vs!==-1?vs:vs=re()}function Rt(e){return e.mode&1?U&2&&he!==0?he&-he:lp.transition!==null?(xs===0&&(xs=ou()),xs):(e=B,e!==0||(e=window.event,e=e===void 0?16:mu(e.type)),e):1}function Ge(e,t,n,s){if(50<dr)throw dr=0,$a=null,Error(C(185));Ir(e,n,s),(!(U&2)||e!==ue)&&(e===ue&&(!(U&2)&&(al|=n),ie===4&&kt(e,he)),Te(e,s),n===1&&U===0&&!(t.mode&1)&&(On=re()+500,nl&&Bt()))}function Te(e,t){var n=e.callbackNode;sf(e,t);var s=ks(e,e===ue?he:0);if(s===0)n!==null&&po(n),e.callbackNode=null,e.callbackPriority=0;else if(t=s&-s,e.callbackPriority!==t){if(n!=null&&po(n),t===1)e.tag===0?sp(ac.bind(null,e)):Iu(ac.bind(null,e)),ep(function(){!(U&6)&&Bt()}),n=null;else{switch(cu(s)){case 1:n=li;break;case 4:n=au;break;case 16:n=Ns;break;case 536870912:n=iu;break;default:n=Ns}n=Ld(n,Cd.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function Cd(e,t){if(vs=-1,xs=0,U&6)throw Error(C(327));var n=e.callbackNode;if(Pn()&&e.callbackNode!==n)return null;var s=ks(e,e===ue?he:0);if(s===0)return null;if(s&30||s&e.expiredLanes||t)t=Ws(e,s);else{t=s;var l=U;U|=2;var a=_d();(ue!==e||he!==t)&&(it=null,On=re()+500,Jt(e,t));do try{Cp();break}catch(o){Ed(e,o)}while(!0);yi(),Fs.current=a,U=l,le!==null?t=0:(ue=null,he=0,t=ie)}if(t!==0){if(t===2&&(l=ha(e),l!==0&&(s=l,t=Ua(e,l))),t===1)throw n=Pr,Jt(e,0),kt(e,s),Te(e,re()),n;if(t===6)kt(e,s);else{if(l=e.current.alternate,!(s&30)&&!kp(l)&&(t=Ws(e,s),t===2&&(a=ha(e),a!==0&&(s=a,t=Ua(e,a))),t===1))throw n=Pr,Jt(e,0),kt(e,s),Te(e,re()),n;switch(e.finishedWork=l,e.finishedLanes=s,t){case 0:case 1:throw Error(C(345));case 2:Yt(e,Ce,it);break;case 3:if(kt(e,s),(s&130023424)===s&&(t=Ri+500-re(),10<t)){if(ks(e,0)!==0)break;if(l=e.suspendedLanes,(l&s)!==s){je(),e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=ja(Yt.bind(null,e,Ce,it),t);break}Yt(e,Ce,it);break;case 4:if(kt(e,s),(s&4194240)===s)break;for(t=e.eventTimes,l=-1;0<s;){var i=31-Ke(s);a=1<<i,i=t[i],i>l&&(l=i),s&=~a}if(s=l,s=re()-s,s=(120>s?120:480>s?480:1080>s?1080:1920>s?1920:3e3>s?3e3:4320>s?4320:1960*Np(s/1960))-s,10<s){e.timeoutHandle=ja(Yt.bind(null,e,Ce,it),s);break}Yt(e,Ce,it);break;case 5:Yt(e,Ce,it);break;default:throw Error(C(329))}}}return Te(e,re()),e.callbackNode===n?Cd.bind(null,e):null}function Ua(e,t){var n=ur;return e.current.memoizedState.isDehydrated&&(Jt(e,t).flags|=256),e=Ws(e,t),e!==2&&(t=Ce,Ce=n,t!==null&&Wa(t)),e}function Wa(e){Ce===null?Ce=e:Ce.push.apply(Ce,e)}function kp(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var s=0;s<n.length;s++){var l=n[s],a=l.getSnapshot;l=l.value;try{if(!Xe(a(),l))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function kt(e,t){for(t&=~Li,t&=~al,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Ke(t),s=1<<n;e[n]=-1,t&=~s}}function ac(e){if(U&6)throw Error(C(327));Pn();var t=ks(e,0);if(!(t&1))return Te(e,re()),null;var n=Ws(e,t);if(e.tag!==0&&n===2){var s=ha(e);s!==0&&(t=s,n=Ua(e,s))}if(n===1)throw n=Pr,Jt(e,0),kt(e,t),Te(e,re()),n;if(n===6)throw Error(C(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,Yt(e,Ce,it),Te(e,re()),null}function Ii(e,t){var n=U;U|=1;try{return e(t)}finally{U=n,U===0&&(On=re()+500,nl&&Bt())}}function sn(e){Ct!==null&&Ct.tag===0&&!(U&6)&&Pn();var t=U;U|=1;var n=We.transition,s=B;try{if(We.transition=null,B=1,e)return e()}finally{B=s,We.transition=n,U=t,!(U&6)&&Bt()}}function Oi(){Me=Nn.current,Q(Nn)}function Jt(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,qf(n)),le!==null)for(n=le.return;n!==null;){var s=n;switch(mi(s),s.tag){case 1:s=s.type.childContextTypes,s!=null&&Ps();break;case 3:Rn(),Q(_e),Q(ye),Si();break;case 5:ki(s);break;case 4:Rn();break;case 13:Q(G);break;case 19:Q(G);break;case 10:gi(s.type._context);break;case 22:case 23:Oi()}n=n.return}if(ue=e,le=e=It(e.current,null),he=Me=t,ie=0,Pr=null,Li=al=rn=0,Ce=ur=null,Gt!==null){for(t=0;t<Gt.length;t++)if(n=Gt[t],s=n.interleaved,s!==null){n.interleaved=null;var l=s.next,a=n.pending;if(a!==null){var i=a.next;a.next=l,s.next=i}n.pending=s}Gt=null}return e}function Ed(e,t){do{var n=le;try{if(yi(),fs.current=As,Ds){for(var s=X.memoizedState;s!==null;){var l=s.queue;l!==null&&(l.pending=null),s=s.next}Ds=!1}if(nn=0,ce=ae=X=null,or=!1,Cr=0,zi.current=null,n===null||n.return===null){ie=1,Pr=t,le=null;break}e:{var a=e,i=n.return,o=n,c=t;if(t=he,o.flags|=32768,c!==null&&typeof c=="object"&&typeof c.then=="function"){var d=c,m=o,p=m.tag;if(!(m.mode&1)&&(p===0||p===11||p===15)){var v=m.alternate;v?(m.updateQueue=v.updateQueue,m.memoizedState=v.memoizedState,m.lanes=v.lanes):(m.updateQueue=null,m.memoizedState=null)}var y=Yo(i);if(y!==null){y.flags&=-257,Ko(y,i,o,a,t),y.mode&1&&Qo(a,d,t),t=y,c=d;var j=t.updateQueue;if(j===null){var w=new Set;w.add(c),t.updateQueue=w}else j.add(c);break e}else{if(!(t&1)){Qo(a,d,t),Di();break e}c=Error(C(426))}}else if(Y&&o.mode&1){var N=Yo(i);if(N!==null){!(N.flags&65536)&&(N.flags|=256),Ko(N,i,o,a,t),vi(In(c,o));break e}}a=c=In(c,o),ie!==4&&(ie=2),ur===null?ur=[a]:ur.push(a),a=i;do{switch(a.tag){case 3:a.flags|=65536,t&=-t,a.lanes|=t;var f=cd(a,c,t);Uo(a,f);break e;case 1:o=c;var u=a.type,h=a.stateNode;if(!(a.flags&128)&&(typeof u.getDerivedStateFromError=="function"||h!==null&&typeof h.componentDidCatch=="function"&&(Lt===null||!Lt.has(h)))){a.flags|=65536,t&=-t,a.lanes|=t;var g=ud(a,o,t);Uo(a,g);break e}}a=a.return}while(a!==null)}Td(n)}catch(S){t=S,le===n&&n!==null&&(le=n=n.return);continue}break}while(!0)}function _d(){var e=Fs.current;return Fs.current=As,e===null?As:e}function Di(){(ie===0||ie===3||ie===2)&&(ie=4),ue===null||!(rn&268435455)&&!(al&268435455)||kt(ue,he)}function Ws(e,t){var n=U;U|=2;var s=_d();(ue!==e||he!==t)&&(it=null,Jt(e,t));do try{Sp();break}catch(l){Ed(e,l)}while(!0);if(yi(),U=n,Fs.current=s,le!==null)throw Error(C(261));return ue=null,he=0,ie}function Sp(){for(;le!==null;)Pd(le)}function Cp(){for(;le!==null&&!Gh();)Pd(le)}function Pd(e){var t=zd(e.alternate,e,Me);e.memoizedProps=e.pendingProps,t===null?Td(e):le=t,zi.current=null}function Td(e){var t=e;do{var n=t.alternate;if(e=t.return,t.flags&32768){if(n=yp(n,t),n!==null){n.flags&=32767,le=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{ie=6,le=null;return}}else if(n=xp(n,t,Me),n!==null){le=n;return}if(t=t.sibling,t!==null){le=t;return}le=t=e}while(t!==null);ie===0&&(ie=5)}function Yt(e,t,n){var s=B,l=We.transition;try{We.transition=null,B=1,Ep(e,t,n,s)}finally{We.transition=l,B=s}return null}function Ep(e,t,n,s){do Pn();while(Ct!==null);if(U&6)throw Error(C(327));n=e.finishedWork;var l=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(C(177));e.callbackNode=null,e.callbackPriority=0;var a=n.lanes|n.childLanes;if(lf(e,a),e===ue&&(le=ue=null,he=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||ls||(ls=!0,Ld(Ns,function(){return Pn(),null})),a=(n.flags&15990)!==0,n.subtreeFlags&15990||a){a=We.transition,We.transition=null;var i=B;B=1;var o=U;U|=4,zi.current=null,jp(e,n),kd(n,e),Qf(ya),Ss=!!xa,ya=xa=null,e.current=n,wp(n),Xh(),U=o,B=i,We.transition=a}else e.current=n;if(ls&&(ls=!1,Ct=e,Us=l),a=e.pendingLanes,a===0&&(Lt=null),qh(n.stateNode),Te(e,re()),t!==null)for(s=e.onRecoverableError,n=0;n<t.length;n++)l=t[n],s(l.value,{componentStack:l.stack,digest:l.digest});if($s)throw $s=!1,e=Fa,Fa=null,e;return Us&1&&e.tag!==0&&Pn(),a=e.pendingLanes,a&1?e===$a?dr++:(dr=0,$a=e):dr=0,Bt(),null}function Pn(){if(Ct!==null){var e=cu(Us),t=We.transition,n=B;try{if(We.transition=null,B=16>e?16:e,Ct===null)var s=!1;else{if(e=Ct,Ct=null,Us=0,U&6)throw Error(C(331));var l=U;for(U|=4,T=e.current;T!==null;){var a=T,i=a.child;if(T.flags&16){var o=a.deletions;if(o!==null){for(var c=0;c<o.length;c++){var d=o[c];for(T=d;T!==null;){var m=T;switch(m.tag){case 0:case 11:case 15:cr(8,m,a)}var p=m.child;if(p!==null)p.return=m,T=p;else for(;T!==null;){m=T;var v=m.sibling,y=m.return;if(jd(m),m===d){T=null;break}if(v!==null){v.return=y,T=v;break}T=y}}}var j=a.alternate;if(j!==null){var w=j.child;if(w!==null){j.child=null;do{var N=w.sibling;w.sibling=null,w=N}while(w!==null)}}T=a}}if(a.subtreeFlags&2064&&i!==null)i.return=a,T=i;else e:for(;T!==null;){if(a=T,a.flags&2048)switch(a.tag){case 0:case 11:case 15:cr(9,a,a.return)}var f=a.sibling;if(f!==null){f.return=a.return,T=f;break e}T=a.return}}var u=e.current;for(T=u;T!==null;){i=T;var h=i.child;if(i.subtreeFlags&2064&&h!==null)h.return=i,T=h;else e:for(i=u;T!==null;){if(o=T,o.flags&2048)try{switch(o.tag){case 0:case 11:case 15:ll(9,o)}}catch(S){q(o,o.return,S)}if(o===i){T=null;break e}var g=o.sibling;if(g!==null){g.return=o.return,T=g;break e}T=o.return}}if(U=l,Bt(),tt&&typeof tt.onPostCommitFiberRoot=="function")try{tt.onPostCommitFiberRoot(Js,e)}catch{}s=!0}return s}finally{B=n,We.transition=t}}return!1}function ic(e,t,n){t=In(n,t),t=cd(e,t,1),e=zt(e,t,1),t=je(),e!==null&&(Ir(e,1,t),Te(e,t))}function q(e,t,n){if(e.tag===3)ic(e,e,n);else for(;t!==null;){if(t.tag===3){ic(t,e,n);break}else if(t.tag===1){var s=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof s.componentDidCatch=="function"&&(Lt===null||!Lt.has(s))){e=In(n,e),e=ud(t,e,1),t=zt(t,e,1),e=je(),t!==null&&(Ir(t,1,e),Te(t,e));break}}t=t.return}}function _p(e,t,n){var s=e.pingCache;s!==null&&s.delete(t),t=je(),e.pingedLanes|=e.suspendedLanes&n,ue===e&&(he&n)===n&&(ie===4||ie===3&&(he&130023424)===he&&500>re()-Ri?Jt(e,0):Li|=n),Te(e,t)}function Md(e,t){t===0&&(e.mode&1?(t=Gr,Gr<<=1,!(Gr&130023424)&&(Gr=4194304)):t=1);var n=je();e=pt(e,t),e!==null&&(Ir(e,t,n),Te(e,n))}function Pp(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Md(e,n)}function Tp(e,t){var n=0;switch(e.tag){case 13:var s=e.stateNode,l=e.memoizedState;l!==null&&(n=l.retryLane);break;case 19:s=e.stateNode;break;default:throw Error(C(314))}s!==null&&s.delete(t),Md(e,n)}var zd;zd=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||_e.current)Ee=!0;else{if(!(e.lanes&n)&&!(t.flags&128))return Ee=!1,vp(e,t,n);Ee=!!(e.flags&131072)}else Ee=!1,Y&&t.flags&1048576&&Ou(t,zs,t.index);switch(t.lanes=0,t.tag){case 2:var s=t.type;ms(e,t),e=t.pendingProps;var l=Mn(t,ye.current);_n(t,n),l=Ei(null,t,s,e,l,n);var a=_i();return t.flags|=1,typeof l=="object"&&l!==null&&typeof l.render=="function"&&l.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Pe(s)?(a=!0,Ts(t)):a=!1,t.memoizedState=l.state!==null&&l.state!==void 0?l.state:null,wi(t),l.updater=sl,t.stateNode=l,l._reactInternals=t,_a(t,s,e,n),t=Ma(null,t,s,!0,a,n)):(t.tag=0,Y&&a&&pi(t),ge(null,t,l,n),t=t.child),t;case 16:s=t.elementType;e:{switch(ms(e,t),e=t.pendingProps,l=s._init,s=l(s._payload),t.type=s,l=t.tag=zp(s),e=He(s,e),l){case 0:t=Ta(null,t,s,e,n);break e;case 1:t=Jo(null,t,s,e,n);break e;case 11:t=Go(null,t,s,e,n);break e;case 14:t=Xo(null,t,s,He(s.type,e),n);break e}throw Error(C(306,s,""))}return t;case 0:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:He(s,l),Ta(e,t,s,l,n);case 1:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:He(s,l),Jo(e,t,s,l,n);case 3:e:{if(pd(t),e===null)throw Error(C(387));s=t.pendingProps,a=t.memoizedState,l=a.element,Wu(e,t),Is(t,s,null,n);var i=t.memoizedState;if(s=i.element,a.isDehydrated)if(a={element:s,isDehydrated:!1,cache:i.cache,pendingSuspenseBoundaries:i.pendingSuspenseBoundaries,transitions:i.transitions},t.updateQueue.baseState=a,t.memoizedState=a,t.flags&256){l=In(Error(C(423)),t),t=Zo(e,t,s,n,l);break e}else if(s!==l){l=In(Error(C(424)),t),t=Zo(e,t,s,n,l);break e}else for(ze=Mt(t.stateNode.containerInfo.firstChild),Le=t,Y=!0,Ye=null,n=$u(t,null,s,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(zn(),s===l){t=mt(e,t,n);break e}ge(e,t,s,n)}t=t.child}return t;case 5:return Bu(t),e===null&&Sa(t),s=t.type,l=t.pendingProps,a=e!==null?e.memoizedProps:null,i=l.children,ga(s,l)?i=null:a!==null&&ga(s,a)&&(t.flags|=32),fd(e,t),ge(e,t,i,n),t.child;case 6:return e===null&&Sa(t),null;case 13:return md(e,t,n);case 4:return Ni(t,t.stateNode.containerInfo),s=t.pendingProps,e===null?t.child=Ln(t,null,s,n):ge(e,t,s,n),t.child;case 11:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:He(s,l),Go(e,t,s,l,n);case 7:return ge(e,t,t.pendingProps,n),t.child;case 8:return ge(e,t,t.pendingProps.children,n),t.child;case 12:return ge(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(s=t.type._context,l=t.pendingProps,a=t.memoizedProps,i=l.value,b(Ls,s._currentValue),s._currentValue=i,a!==null)if(Xe(a.value,i)){if(a.children===l.children&&!_e.current){t=mt(e,t,n);break e}}else for(a=t.child,a!==null&&(a.return=t);a!==null;){var o=a.dependencies;if(o!==null){i=a.child;for(var c=o.firstContext;c!==null;){if(c.context===s){if(a.tag===1){c=dt(-1,n&-n),c.tag=2;var d=a.updateQueue;if(d!==null){d=d.shared;var m=d.pending;m===null?c.next=c:(c.next=m.next,m.next=c),d.pending=c}}a.lanes|=n,c=a.alternate,c!==null&&(c.lanes|=n),Ca(a.return,n,t),o.lanes|=n;break}c=c.next}}else if(a.tag===10)i=a.type===t.type?null:a.child;else if(a.tag===18){if(i=a.return,i===null)throw Error(C(341));i.lanes|=n,o=i.alternate,o!==null&&(o.lanes|=n),Ca(i,n,t),i=a.sibling}else i=a.child;if(i!==null)i.return=a;else for(i=a;i!==null;){if(i===t){i=null;break}if(a=i.sibling,a!==null){a.return=i.return,i=a;break}i=i.return}a=i}ge(e,t,l.children,n),t=t.child}return t;case 9:return l=t.type,s=t.pendingProps.children,_n(t,n),l=Be(l),s=s(l),t.flags|=1,ge(e,t,s,n),t.child;case 14:return s=t.type,l=He(s,t.pendingProps),l=He(s.type,l),Xo(e,t,s,l,n);case 15:return dd(e,t,t.type,t.pendingProps,n);case 17:return s=t.type,l=t.pendingProps,l=t.elementType===s?l:He(s,l),ms(e,t),t.tag=1,Pe(s)?(e=!0,Ts(t)):e=!1,_n(t,n),od(t,s,l),_a(t,s,l,n),Ma(null,t,s,!0,e,n);case 19:return vd(e,t,n);case 22:return hd(e,t,n)}throw Error(C(156,t.tag))};function Ld(e,t){return lu(e,t)}function Mp(e,t,n,s){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=s,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Ue(e,t,n,s){return new Mp(e,t,n,s)}function Ai(e){return e=e.prototype,!(!e||!e.isReactComponent)}function zp(e){if(typeof e=="function")return Ai(e)?1:0;if(e!=null){if(e=e.$$typeof,e===ni)return 11;if(e===ri)return 14}return 2}function It(e,t){var n=e.alternate;return n===null?(n=Ue(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function ys(e,t,n,s,l,a){var i=2;if(s=e,typeof e=="function")Ai(e)&&(i=1);else if(typeof e=="string")i=5;else e:switch(e){case hn:return Zt(n.children,l,a,t);case ti:i=8,l|=8;break;case Jl:return e=Ue(12,n,t,l|2),e.elementType=Jl,e.lanes=a,e;case Zl:return e=Ue(13,n,t,l),e.elementType=Zl,e.lanes=a,e;case ql:return e=Ue(19,n,t,l),e.elementType=ql,e.lanes=a,e;case Bc:return il(n,l,a,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case Uc:i=10;break e;case Wc:i=9;break e;case ni:i=11;break e;case ri:i=14;break e;case jt:i=16,s=null;break e}throw Error(C(130,e==null?e:typeof e,""))}return t=Ue(i,n,t,l),t.elementType=e,t.type=s,t.lanes=a,t}function Zt(e,t,n,s){return e=Ue(7,e,s,t),e.lanes=n,e}function il(e,t,n,s){return e=Ue(22,e,s,t),e.elementType=Bc,e.lanes=n,e.stateNode={isHidden:!1},e}function Yl(e,t,n){return e=Ue(6,e,null,t),e.lanes=n,e}function Kl(e,t,n){return t=Ue(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Lp(e,t,n,s,l){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Pl(0),this.expirationTimes=Pl(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Pl(0),this.identifierPrefix=s,this.onRecoverableError=l,this.mutableSourceEagerHydrationData=null}function Fi(e,t,n,s,l,a,i,o,c){return e=new Lp(e,t,n,o,c),t===1?(t=1,a===!0&&(t|=8)):t=0,a=Ue(3,null,null,t),e.current=a,a.stateNode=e,a.memoizedState={element:s,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},wi(a),e}function Rp(e,t,n){var s=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:dn,key:s==null?null:""+s,children:e,containerInfo:t,implementation:n}}function Rd(e){if(!e)return At;e=e._reactInternals;e:{if(on(e)!==e||e.tag!==1)throw Error(C(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Pe(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(C(171))}if(e.tag===1){var n=e.type;if(Pe(n))return Ru(e,n,t)}return t}function Id(e,t,n,s,l,a,i,o,c){return e=Fi(n,s,!0,e,l,a,i,o,c),e.context=Rd(null),n=e.current,s=je(),l=Rt(n),a=dt(s,l),a.callback=t??null,zt(n,a,l),e.current.lanes=l,Ir(e,l,s),Te(e,s),e}function ol(e,t,n,s){var l=t.current,a=je(),i=Rt(l);return n=Rd(n),t.context===null?t.context=n:t.pendingContext=n,t=dt(a,i),t.payload={element:e},s=s===void 0?null:s,s!==null&&(t.callback=s),e=zt(l,t,i),e!==null&&(Ge(e,l,i,a),hs(e,l,i)),i}function Bs(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function oc(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function $i(e,t){oc(e,t),(e=e.alternate)&&oc(e,t)}function Ip(){return null}var Od=typeof reportError=="function"?reportError:function(e){console.error(e)};function Ui(e){this._internalRoot=e}cl.prototype.render=Ui.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(C(409));ol(e,t,null,null)};cl.prototype.unmount=Ui.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;sn(function(){ol(null,e,null,null)}),t[ft]=null}};function cl(e){this._internalRoot=e}cl.prototype.unstable_scheduleHydration=function(e){if(e){var t=hu();e={blockedOn:null,target:e,priority:t};for(var n=0;n<Nt.length&&t!==0&&t<Nt[n].priority;n++);Nt.splice(n,0,e),n===0&&pu(e)}};function Wi(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function ul(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function cc(){}function Op(e,t,n,s,l){if(l){if(typeof s=="function"){var a=s;s=function(){var d=Bs(i);a.call(d)}}var i=Id(t,s,e,0,null,!1,!1,"",cc);return e._reactRootContainer=i,e[ft]=i.current,jr(e.nodeType===8?e.parentNode:e),sn(),i}for(;l=e.lastChild;)e.removeChild(l);if(typeof s=="function"){var o=s;s=function(){var d=Bs(c);o.call(d)}}var c=Fi(e,0,!1,null,null,!1,!1,"",cc);return e._reactRootContainer=c,e[ft]=c.current,jr(e.nodeType===8?e.parentNode:e),sn(function(){ol(t,c,n,s)}),c}function dl(e,t,n,s,l){var a=n._reactRootContainer;if(a){var i=a;if(typeof l=="function"){var o=l;l=function(){var c=Bs(i);o.call(c)}}ol(t,i,e,l)}else i=Op(n,t,e,l,s);return Bs(i)}uu=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=tr(t.pendingLanes);n!==0&&(ai(t,n|1),Te(t,re()),!(U&6)&&(On=re()+500,Bt()))}break;case 13:sn(function(){var s=pt(e,1);if(s!==null){var l=je();Ge(s,e,1,l)}}),$i(e,1)}};ii=function(e){if(e.tag===13){var t=pt(e,134217728);if(t!==null){var n=je();Ge(t,e,134217728,n)}$i(e,134217728)}};du=function(e){if(e.tag===13){var t=Rt(e),n=pt(e,t);if(n!==null){var s=je();Ge(n,e,t,s)}$i(e,t)}};hu=function(){return B};fu=function(e,t){var n=B;try{return B=e,t()}finally{B=n}};ca=function(e,t,n){switch(t){case"input":if(na(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+\'][type="radio"]\'),t=0;t<n.length;t++){var s=n[t];if(s!==e&&s.form===e.form){var l=tl(s);if(!l)throw Error(C(90));bc(s),na(s,l)}}}break;case"textarea":Qc(e,n);break;case"select":t=n.value,t!=null&&kn(e,!!n.multiple,t,!1)}};qc=Ii;eu=sn;var Dp={usingClientEntryPoint:!1,Events:[Dr,vn,tl,Jc,Zc,Ii]},Zn={findFiberByHostInstance:Kt,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Ap={bundleType:Zn.bundleType,version:Zn.version,rendererPackageName:Zn.rendererPackageName,rendererConfig:Zn.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:vt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=ru(e),e===null?null:e.stateNode},findFiberByHostInstance:Zn.findFiberByHostInstance||Ip,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var as=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!as.isDisabled&&as.supportsFiber)try{Js=as.inject(Ap),tt=as}catch{}}Oe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Dp;Oe.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Wi(t))throw Error(C(200));return Rp(e,t,null,n)};Oe.createRoot=function(e,t){if(!Wi(e))throw Error(C(299));var n=!1,s="",l=Od;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(l=t.onRecoverableError)),t=Fi(e,1,!1,null,null,n,!1,s,l),e[ft]=t.current,jr(e.nodeType===8?e.parentNode:e),new Ui(t)};Oe.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(C(188)):(e=Object.keys(e).join(","),Error(C(268,e)));return e=ru(t),e=e===null?null:e.stateNode,e};Oe.flushSync=function(e){return sn(e)};Oe.hydrate=function(e,t,n){if(!ul(t))throw Error(C(200));return dl(null,e,t,!0,n)};Oe.hydrateRoot=function(e,t,n){if(!Wi(e))throw Error(C(405));var s=n!=null&&n.hydratedSources||null,l=!1,a="",i=Od;if(n!=null&&(n.unstable_strictMode===!0&&(l=!0),n.identifierPrefix!==void 0&&(a=n.identifierPrefix),n.onRecoverableError!==void 0&&(i=n.onRecoverableError)),t=Id(t,null,e,1,n??null,l,!1,a,i),e[ft]=t.current,jr(e),s)for(e=0;e<s.length;e++)n=s[e],l=n._getVersion,l=l(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,l]:t.mutableSourceEagerHydrationData.push(n,l);return new cl(t)};Oe.render=function(e,t,n){if(!ul(t))throw Error(C(200));return dl(null,e,t,!1,n)};Oe.unmountComponentAtNode=function(e){if(!ul(e))throw Error(C(40));return e._reactRootContainer?(sn(function(){dl(null,null,e,!1,function(){e._reactRootContainer=null,e[ft]=null})}),!0):!1};Oe.unstable_batchedUpdates=Ii;Oe.unstable_renderSubtreeIntoContainer=function(e,t,n,s){if(!ul(n))throw Error(C(200));if(e==null||e._reactInternals===void 0)throw Error(C(38));return dl(e,t,n,!1,s)};Oe.version="18.3.1-next-f1338f8080-20240426";function Dd(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Dd)}catch(e){console.error(e)}}Dd(),Dc.exports=Oe;var Fp=Dc.exports,Ad,uc=Fp;Ad=uc.createRoot,uc.hydrateRoot;/**\n * @remix-run/router v1.23.4\n *\n * Copyright (c) Remix Software Inc.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE.md file in the root directory of this source tree.\n *\n * @license MIT\n */function Tr(){return Tr=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var s in n)({}).hasOwnProperty.call(n,s)&&(e[s]=n[s])}return e},Tr.apply(null,arguments)}var Et;(function(e){e.Pop="POP",e.Push="PUSH",e.Replace="REPLACE"})(Et||(Et={}));const dc="popstate";function $p(e){e===void 0&&(e={});function t(s,l){let{pathname:a,search:i,hash:o}=s.location;return Ba("",{pathname:a,search:i,hash:o},l.state&&l.state.usr||null,l.state&&l.state.key||"default")}function n(s,l){return typeof l=="string"?l:Vs(l)}return Wp(t,n,null,e)}function J(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function Fd(e,t){if(!e){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function Up(){return Math.random().toString(36).substr(2,8)}function hc(e,t){return{usr:e.state,key:e.key,idx:t}}function Ba(e,t,n,s){return n===void 0&&(n=null),Tr({pathname:typeof e=="string"?e:e.pathname,search:"",hash:""},typeof t=="string"?Wn(t):t,{state:n,key:t&&t.key||s||Up()})}function Vs(e){let{pathname:t="/",search:n="",hash:s=""}=e;return n&&n!=="?"&&(t+=n.charAt(0)==="?"?n:"?"+n),s&&s!=="#"&&(t+=s.charAt(0)==="#"?s:"#"+s),t}function Wn(e){let t={};if(e){let n=e.indexOf("#");n>=0&&(t.hash=e.substr(n),e=e.substr(0,n));let s=e.indexOf("?");s>=0&&(t.search=e.substr(s),e=e.substr(0,s)),e&&(t.pathname=e)}return t}function Wp(e,t,n,s){s===void 0&&(s={});let{window:l=document.defaultView,v5Compat:a=!1}=s,i=l.history,o=Et.Pop,c=null,d=m();d==null&&(d=0,i.replaceState(Tr({},i.state,{idx:d}),""));function m(){return(i.state||{idx:null}).idx}function p(){o=Et.Pop;let N=m(),f=N==null?null:N-d;d=N,c&&c({action:o,location:w.location,delta:f})}function v(N,f){o=Et.Push;let u=Ba(w.location,N,f);d=m()+1;let h=hc(u,d),g=w.createHref(u);try{i.pushState(h,"",g)}catch(S){if(S instanceof DOMException&&S.name==="DataCloneError")throw S;l.location.assign(g)}a&&c&&c({action:o,location:w.location,delta:1})}function y(N,f){o=Et.Replace;let u=Ba(w.location,N,f);d=m();let h=hc(u,d),g=w.createHref(u);i.replaceState(h,"",g),a&&c&&c({action:o,location:w.location,delta:0})}function j(N){let f=l.location.origin!=="null"?l.location.origin:l.location.href,u=typeof N=="string"?N:Vs(N);return u=u.replace(/ $/,"%20"),J(f,"No window.location.(origin|href) available to create URL for href: "+u),new URL(u,f)}let w={get action(){return o},get location(){return e(l,i)},listen(N){if(c)throw new Error("A history only accepts one active listener");return l.addEventListener(dc,p),c=N,()=>{l.removeEventListener(dc,p),c=null}},createHref(N){return t(l,N)},createURL:j,encodeLocation(N){let f=j(N);return{pathname:f.pathname,search:f.search,hash:f.hash}},push:v,replace:y,go(N){return i.go(N)}};return w}var fc;(function(e){e.data="data",e.deferred="deferred",e.redirect="redirect",e.error="error"})(fc||(fc={}));function Bp(e,t,n){return n===void 0&&(n="/"),Vp(e,t,n)}function Vp(e,t,n,s){let l=typeof t=="string"?Wn(t):t,a=Dn(l.pathname||"/",n);if(a==null)return null;let i=$d(e);bp(i);let o=null,c=tm(a);for(let d=0;o==null&&d<i.length;++d)o=qp(i[d],c);return o}function $d(e,t,n,s){t===void 0&&(t=[]),n===void 0&&(n=[]),s===void 0&&(s="");let l=(a,i,o)=>{let c={relativePath:o===void 0?a.path||"":o,caseSensitive:a.caseSensitive===!0,childrenIndex:i,route:a};c.relativePath.startsWith("/")&&(J(c.relativePath.startsWith(s),\'Absolute route path "\'+c.relativePath+\'" nested under path \'+(\'"\'+s+\'" is not valid. An absolute child route path \')+"must start with the combined path of all its parent routes."),c.relativePath=c.relativePath.slice(s.length));let d=Ot([s,c.relativePath]),m=n.concat(c);a.children&&a.children.length>0&&(J(a.index!==!0,"Index routes must not have child routes. Please remove "+(\'all child routes from route path "\'+d+\'".\')),$d(a.children,t,m,d)),!(a.path==null&&!a.index)&&t.push({path:d,score:Jp(d,a.index),routesMeta:m})};return e.forEach((a,i)=>{var o;if(a.path===""||!((o=a.path)!=null&&o.includes("?")))l(a,i);else for(let c of Ud(a.path))l(a,i,c)}),t}function Ud(e){let t=e.split("/");if(t.length===0)return[];let[n,...s]=t,l=n.endsWith("?"),a=n.replace(/\\?$/,"");if(s.length===0)return l?[a,""]:[a];let i=Ud(s.join("/")),o=[];return o.push(...i.map(c=>c===""?a:[a,c].join("/"))),l&&o.push(...i),o.map(c=>e.startsWith("/")&&c===""?"/":c)}function bp(e){e.sort((t,n)=>t.score!==n.score?n.score-t.score:Zp(t.routesMeta.map(s=>s.childrenIndex),n.routesMeta.map(s=>s.childrenIndex)))}const Hp=/^:[\\w-]+$/,Qp=3,Yp=2,Kp=1,Gp=10,Xp=-2,pc=e=>e==="*";function Jp(e,t){let n=e.split("/"),s=n.length;return n.some(pc)&&(s+=Xp),t&&(s+=Yp),n.filter(l=>!pc(l)).reduce((l,a)=>l+(Hp.test(a)?Qp:a===""?Kp:Gp),s)}function Zp(e,t){return e.length===t.length&&e.slice(0,-1).every((s,l)=>s===t[l])?e[e.length-1]-t[t.length-1]:0}function qp(e,t,n){let{routesMeta:s}=e,l={},a="/",i=[];for(let o=0;o<s.length;++o){let c=s[o],d=o===s.length-1,m=a==="/"?t:t.slice(a.length)||"/",p=Va({path:c.relativePath,caseSensitive:c.caseSensitive,end:d},m),v=c.route;if(!p)return null;Object.assign(l,p.params),i.push({params:l,pathname:Ot([a,p.pathname]),pathnameBase:sm(Ot([a,p.pathnameBase])),route:v}),p.pathnameBase!=="/"&&(a=Ot([a,p.pathnameBase]))}return i}function Va(e,t){typeof e=="string"&&(e={path:e,caseSensitive:!1,end:!0});let[n,s]=em(e.path,e.caseSensitive,e.end),l=t.match(n);if(!l)return null;let a=l[0],i=a.replace(/(.)\\/+$/,"$1"),o=l.slice(1);return{params:s.reduce((d,m,p)=>{let{paramName:v,isOptional:y}=m;if(v==="*"){let w=o[p]||"";i=a.slice(0,a.length-w.length).replace(/(.)\\/+$/,"$1")}const j=o[p];return y&&!j?d[v]=void 0:d[v]=(j||"").replace(/%2F/g,"/"),d},{}),pathname:a,pathnameBase:i,pattern:e}}function em(e,t,n){t===void 0&&(t=!1),n===void 0&&(n=!0),Fd(e==="*"||!e.endsWith("*")||e.endsWith("/*"),\'Route path "\'+e+\'" will be treated as if it were \'+(\'"\'+e.replace(/\\*$/,"/*")+\'" because the `*` character must \')+"always follow a `/` in the pattern. To get rid of this warning, "+(\'please change the route path to "\'+e.replace(/\\*$/,"/*")+\'".\'));let s=[],l="^"+e.replace(/\\/*\\*?$/,"").replace(/^\\/*/,"/").replace(/[\\\\.*+^${}|()[\\]]/g,"\\\\$&").replace(/\\/:([\\w-]+)(\\?)?/g,(i,o,c)=>(s.push({paramName:o,isOptional:c!=null}),c?"/?([^\\\\/]+)?":"/([^\\\\/]+)"));return e.endsWith("*")?(s.push({paramName:"*"}),l+=e==="*"||e==="/*"?"(.*)$":"(?:\\\\/(.+)|\\\\/*)$"):n?l+="\\\\/*$":e!==""&&e!=="/"&&(l+="(?:(?=\\\\/|$))"),[new RegExp(l,t?void 0:"i"),s]}function tm(e){try{return e.split("/").map(t=>decodeURIComponent(t).replace(/\\//g,"%2F")).join("/")}catch(t){return Fd(!1,\'The URL path "\'+e+\'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent \'+("encoding ("+t+").")),e}}function Dn(e,t){if(t==="/")return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let n=t.endsWith("/")?t.length-1:t.length,s=e.charAt(n);return s&&s!=="/"?null:e.slice(n)||"/"}function nm(e,t){t===void 0&&(t="/");let{pathname:n,search:s="",hash:l=""}=typeof e=="string"?Wn(e):e,a;return n?(n=Wd(n),n.startsWith("/")?a=mc(n.substring(1),"/"):a=mc(n,t)):a=t,{pathname:a,search:lm(s),hash:am(l)}}function mc(e,t){let n=t.replace(/\\/+$/,"").split("/");return e.split("/").forEach(l=>{l===".."?n.length>1&&n.pop():l!=="."&&n.push(l)}),n.length>1?n.join("/"):"/"}function Gl(e,t,n,s){return"Cannot include a \'"+e+"\' character in a manually specified "+("`to."+t+"` field ["+JSON.stringify(s)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+\'a string in <Link to="..."> and the router will parse it for you.\'}function rm(e){return e.filter((t,n)=>n===0||t.route.path&&t.route.path.length>0)}function Bi(e,t){let n=rm(e);return t?n.map((s,l)=>l===n.length-1?s.pathname:s.pathnameBase):n.map(s=>s.pathnameBase)}function Vi(e,t,n,s){s===void 0&&(s=!1);let l;typeof e=="string"?l=Wn(e):(l=Tr({},e),J(!l.pathname||!l.pathname.includes("?"),Gl("?","pathname","search",l)),J(!l.pathname||!l.pathname.includes("#"),Gl("#","pathname","hash",l)),J(!l.search||!l.search.includes("#"),Gl("#","search","hash",l)));let a=e===""||l.pathname==="",i=a?"/":l.pathname,o;if(i==null)o=n;else{let p=t.length-1;if(!s&&i.startsWith("..")){let v=i.split("/");for(;v[0]==="..";)v.shift(),p-=1;l.pathname=v.join("/")}o=p>=0?t[p]:"/"}let c=nm(l,o),d=i&&i!=="/"&&i.endsWith("/"),m=(a||i===".")&&n.endsWith("/");return!c.pathname.endsWith("/")&&(d||m)&&(c.pathname+="/"),c}const Wd=e=>e.replace(/\\/\\/+/g,"/"),Ot=e=>Wd(e.join("/")),sm=e=>e.replace(/\\/+$/,"").replace(/^\\/*/,"/"),lm=e=>!e||e==="?"?"":e.startsWith("?")?e:"?"+e,am=e=>!e||e==="#"?"":e.startsWith("#")?e:"#"+e;function im(e){return e!=null&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.internal=="boolean"&&"data"in e}const Bd=["post","put","patch","delete"];new Set(Bd);const om=["get",...Bd];new Set(om);/**\n * React Router v6.30.6\n *\n * Copyright (c) Remix Software Inc.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE.md file in the root directory of this source tree.\n *\n * @license MIT\n */function Mr(){return Mr=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var s in n)({}).hasOwnProperty.call(n,s)&&(e[s]=n[s])}return e},Mr.apply(null,arguments)}const hl=x.createContext(null),Vd=x.createContext(null),xt=x.createContext(null),fl=x.createContext(null),lt=x.createContext({outlet:null,matches:[],isDataRoute:!1}),bd=x.createContext(null);function cm(e,t){let{relative:n}=t===void 0?{}:t;Bn()||J(!1);let{basename:s,navigator:l}=x.useContext(xt),{hash:a,pathname:i,search:o}=pl(e,{relative:n}),c=i;return s!=="/"&&(c=i==="/"?s:Ot([s,i])),l.createHref({pathname:c,search:o,hash:a})}function Bn(){return x.useContext(fl)!=null}function Vt(){return Bn()||J(!1),x.useContext(fl).location}function Hd(e){x.useContext(xt).static||x.useLayoutEffect(e)}function Vn(){let{isDataRoute:e}=x.useContext(lt);return e?Sm():um()}function um(){Bn()||J(!1);let e=x.useContext(hl),{basename:t,future:n,navigator:s}=x.useContext(xt),{matches:l}=x.useContext(lt),{pathname:a}=Vt(),i=JSON.stringify(Bi(l,n.v7_relativeSplatPath)),o=x.useRef(!1);return Hd(()=>{o.current=!0}),x.useCallback(function(d,m){if(m===void 0&&(m={}),!o.current)return;if(typeof d=="number"){s.go(d);return}let p=Vi(d,JSON.parse(i),a,m.relative==="path");e==null&&t!=="/"&&(p.pathname=p.pathname==="/"?t:Ot([t,p.pathname])),(m.replace?s.replace:s.push)(p,m.state,m)},[t,s,i,a,e])}const dm=x.createContext(null);function hm(e){let t=x.useContext(lt).outlet;return t&&x.createElement(dm.Provider,{value:e},t)}function bi(){let{matches:e}=x.useContext(lt),t=e[e.length-1];return t?t.params:{}}function pl(e,t){let{relative:n}=t===void 0?{}:t,{future:s}=x.useContext(xt),{matches:l}=x.useContext(lt),{pathname:a}=Vt(),i=JSON.stringify(Bi(l,s.v7_relativeSplatPath));return x.useMemo(()=>Vi(e,JSON.parse(i),a,n==="path"),[e,i,a,n])}function fm(e,t){return pm(e,t)}function pm(e,t,n,s){Bn()||J(!1);let{navigator:l}=x.useContext(xt),{matches:a}=x.useContext(lt),i=a[a.length-1],o=i?i.params:{};i&&i.pathname;let c=i?i.pathnameBase:"/";i&&i.route;let d=Vt(),m;if(t){var p;let N=typeof t=="string"?Wn(t):t;c==="/"||(p=N.pathname)!=null&&p.startsWith(c)||J(!1),m=N}else m=d;let v=m.pathname||"/",y=v;if(c!=="/"){let N=c.replace(/^\\//,"").split("/");y="/"+v.replace(/^\\//,"").split("/").slice(N.length).join("/")}let j=Bp(e,{pathname:y}),w=gm(j&&j.map(N=>Object.assign({},N,{params:Object.assign({},o,N.params),pathname:Ot([c,l.encodeLocation?l.encodeLocation(N.pathname).pathname:N.pathname]),pathnameBase:N.pathnameBase==="/"?c:Ot([c,l.encodeLocation?l.encodeLocation(N.pathnameBase).pathname:N.pathnameBase])})),a,n,s);return t&&w?x.createElement(fl.Provider,{value:{location:Mr({pathname:"/",search:"",hash:"",state:null,key:"default"},m),navigationType:Et.Pop}},w):w}function mm(){let e=km(),t=im(e)?e.status+" "+e.statusText:e instanceof Error?e.message:JSON.stringify(e),n=e instanceof Error?e.stack:null,l={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return x.createElement(x.Fragment,null,x.createElement("h2",null,"Unexpected Application Error!"),x.createElement("h3",{style:{fontStyle:"italic"}},t),n?x.createElement("pre",{style:l},n):null,null)}const vm=x.createElement(mm,null);class xm extends x.Component{constructor(t){super(t),this.state={location:t.location,revalidation:t.revalidation,error:t.error}}static getDerivedStateFromError(t){return{error:t}}static getDerivedStateFromProps(t,n){return n.location!==t.location||n.revalidation!=="idle"&&t.revalidation==="idle"?{error:t.error,location:t.location,revalidation:t.revalidation}:{error:t.error!==void 0?t.error:n.error,location:n.location,revalidation:t.revalidation||n.revalidation}}componentDidCatch(t,n){console.error("React Router caught the following error during render",t,n)}render(){return this.state.error!==void 0?x.createElement(lt.Provider,{value:this.props.routeContext},x.createElement(bd.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function ym(e){let{routeContext:t,match:n,children:s}=e,l=x.useContext(hl);return l&&l.static&&l.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(l.staticContext._deepestRenderedBoundaryId=n.route.id),x.createElement(lt.Provider,{value:t},s)}function gm(e,t,n,s){var l;if(t===void 0&&(t=[]),n===void 0&&(n=null),s===void 0&&(s=null),e==null){var a;if(!n)return null;if(n.errors)e=n.matches;else if((a=s)!=null&&a.v7_partialHydration&&t.length===0&&!n.initialized&&n.matches.length>0)e=n.matches;else return null}let i=e,o=(l=n)==null?void 0:l.errors;if(o!=null){let m=i.findIndex(p=>p.route.id&&(o==null?void 0:o[p.route.id])!==void 0);m>=0||J(!1),i=i.slice(0,Math.min(i.length,m+1))}let c=!1,d=-1;if(n&&s&&s.v7_partialHydration)for(let m=0;m<i.length;m++){let p=i[m];if((p.route.HydrateFallback||p.route.hydrateFallbackElement)&&(d=m),p.route.id){let{loaderData:v,errors:y}=n,j=p.route.loader&&v[p.route.id]===void 0&&(!y||y[p.route.id]===void 0);if(p.route.lazy||j){c=!0,d>=0?i=i.slice(0,d+1):i=[i[0]];break}}}return i.reduceRight((m,p,v)=>{let y,j=!1,w=null,N=null;n&&(y=o&&p.route.id?o[p.route.id]:void 0,w=p.route.errorElement||vm,c&&(d<0&&v===0?(Cm("route-fallback"),j=!0,N=null):d===v&&(j=!0,N=p.route.hydrateFallbackElement||null)));let f=t.concat(i.slice(0,v+1)),u=()=>{let h;return y?h=w:j?h=N:p.route.Component?h=x.createElement(p.route.Component,null):p.route.element?h=p.route.element:h=m,x.createElement(ym,{match:p,routeContext:{outlet:m,matches:f,isDataRoute:n!=null},children:h})};return n&&(p.route.ErrorBoundary||p.route.errorElement||v===0)?x.createElement(xm,{location:n.location,revalidation:n.revalidation,component:w,error:y,children:u(),routeContext:{outlet:null,matches:f,isDataRoute:!0}}):u()},null)}var Qd=function(e){return e.UseBlocker="useBlocker",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e}(Qd||{}),Yd=function(e){return e.UseBlocker="useBlocker",e.UseLoaderData="useLoaderData",e.UseActionData="useActionData",e.UseRouteError="useRouteError",e.UseNavigation="useNavigation",e.UseRouteLoaderData="useRouteLoaderData",e.UseMatches="useMatches",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e.UseRouteId="useRouteId",e}(Yd||{});function jm(e){let t=x.useContext(hl);return t||J(!1),t}function wm(e){let t=x.useContext(Vd);return t||J(!1),t}function Nm(e){let t=x.useContext(lt);return t||J(!1),t}function Kd(e){let t=Nm(),n=t.matches[t.matches.length-1];return n.route.id||J(!1),n.route.id}function km(){var e;let t=x.useContext(bd),n=wm(),s=Kd();return t!==void 0?t:(e=n.errors)==null?void 0:e[s]}function Sm(){let{router:e}=jm(Qd.UseNavigateStable),t=Kd(Yd.UseNavigateStable),n=x.useRef(!1);return Hd(()=>{n.current=!0}),x.useCallback(function(l,a){a===void 0&&(a={}),n.current&&(typeof l=="number"?e.navigate(l):e.navigate(l,Mr({fromRouteId:t},a)))},[e,t])}const vc={};function Cm(e,t,n){vc[e]||(vc[e]=!0)}function Em(e,t){e==null||e.v7_startTransition,e==null||e.v7_relativeSplatPath}function ba(e){let{to:t,replace:n,state:s,relative:l}=e;Bn()||J(!1);let{future:a,static:i}=x.useContext(xt),{matches:o}=x.useContext(lt),{pathname:c}=Vt(),d=Vn(),m=Vi(t,Bi(o,a.v7_relativeSplatPath),c,l==="path"),p=JSON.stringify(m);return x.useEffect(()=>d(JSON.parse(p),{replace:n,state:s,relative:l}),[d,p,l,n,s]),null}function _m(e){return hm(e.context)}function ne(e){J(!1)}function Pm(e){let{basename:t="/",children:n=null,location:s,navigationType:l=Et.Pop,navigator:a,static:i=!1,future:o}=e;Bn()&&J(!1);let c=t.replace(/^\\/*/,"/"),d=x.useMemo(()=>({basename:c,navigator:a,static:i,future:Mr({v7_relativeSplatPath:!1},o)}),[c,o,a,i]);typeof s=="string"&&(s=Wn(s));let{pathname:m="/",search:p="",hash:v="",state:y=null,key:j="default"}=s,w=x.useMemo(()=>{let N=Dn(m,c);return N==null?null:{location:{pathname:N,search:p,hash:v,state:y,key:j},navigationType:l}},[c,m,p,v,y,j,l]);return w==null?null:x.createElement(xt.Provider,{value:d},x.createElement(fl.Provider,{children:n,value:w}))}function Tm(e){let{children:t,location:n}=e;return fm(Ha(t),n)}new Promise(()=>{});function Ha(e,t){t===void 0&&(t=[]);let n=[];return x.Children.forEach(e,(s,l)=>{if(!x.isValidElement(s))return;let a=[...t,l];if(s.type===x.Fragment){n.push.apply(n,Ha(s.props.children,a));return}s.type!==ne&&J(!1),!s.props.index||!s.props.children||J(!1);let i={id:s.props.id||a.join("-"),caseSensitive:s.props.caseSensitive,element:s.props.element,Component:s.props.Component,index:s.props.index,path:s.props.path,loader:s.props.loader,action:s.props.action,errorElement:s.props.errorElement,ErrorBoundary:s.props.ErrorBoundary,hasErrorBoundary:s.props.ErrorBoundary!=null||s.props.errorElement!=null,shouldRevalidate:s.props.shouldRevalidate,handle:s.props.handle,lazy:s.props.lazy};s.props.children&&(i.children=Ha(s.props.children,a)),n.push(i)}),n}/**\n * React Router DOM v6.30.6\n *\n * Copyright (c) Remix Software Inc.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE.md file in the root directory of this source tree.\n *\n * @license MIT\n */function bs(){return bs=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var s in n)({}).hasOwnProperty.call(n,s)&&(e[s]=n[s])}return e},bs.apply(null,arguments)}function Gd(e,t){if(e==null)return{};var n={};for(var s in e)if({}.hasOwnProperty.call(e,s)){if(t.indexOf(s)!==-1)continue;n[s]=e[s]}return n}function Mm(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function zm(e,t){return e.button===0&&(!t||t==="_self")&&!Mm(e)}const Lm=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],Rm=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],Im="6";try{window.__reactRouterVersion=Im}catch{}const Om=x.createContext({isTransitioning:!1}),Dm="startTransition",xc=Eh[Dm];function Am(e){let{basename:t,children:n,future:s,window:l}=e,a=x.useRef();a.current==null&&(a.current=$p({window:l,v5Compat:!0}));let i=a.current,[o,c]=x.useState({action:i.action,location:i.location}),{v7_startTransition:d}=s||{},m=x.useCallback(p=>{d&&xc?xc(()=>c(p)):c(p)},[c,d]);return x.useLayoutEffect(()=>i.listen(m),[i,m]),x.useEffect(()=>Em(s),[s]),x.createElement(Pm,{basename:t,children:n,location:o.location,navigationType:o.action,navigator:i,future:s})}const Fm=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",$m=/^(?:[a-z][a-z0-9+.-]*:|\\/\\/)/i,K=x.forwardRef(function(t,n){let{onClick:s,relative:l,reloadDocument:a,replace:i,state:o,target:c,to:d,preventScrollReset:m,viewTransition:p}=t,v=Gd(t,Lm),{basename:y}=x.useContext(xt),j,w=!1;if(typeof d=="string"&&$m.test(d)&&(j=d,Fm))try{let h=new URL(window.location.href),g=d.startsWith("//")?new URL(h.protocol+d):new URL(d),S=Dn(g.pathname,y);g.origin===h.origin&&S!=null?d=S+g.search+g.hash:w=!0}catch{}let N=cm(d,{relative:l}),f=Wm(d,{replace:i,state:o,target:c,preventScrollReset:m,relative:l,viewTransition:p});function u(h){s&&s(h),h.defaultPrevented||f(h)}return x.createElement("a",bs({},v,{href:j||N,onClick:w||a?s:u,ref:n,target:c}))}),yc=x.forwardRef(function(t,n){let{"aria-current":s="page",caseSensitive:l=!1,className:a="",end:i=!1,style:o,to:c,viewTransition:d,children:m}=t,p=Gd(t,Rm),v=pl(c,{relative:p.relative}),y=Vt(),j=x.useContext(Vd),{navigator:w,basename:N}=x.useContext(xt),f=j!=null&&Bm(v)&&d===!0,u=w.encodeLocation?w.encodeLocation(v).pathname:v.pathname,h=y.pathname,g=j&&j.navigation&&j.navigation.location?j.navigation.location.pathname:null;l||(h=h.toLowerCase(),g=g?g.toLowerCase():null,u=u.toLowerCase()),g&&N&&(g=Dn(g,N)||g);const S=u!=="/"&&u.endsWith("/")?u.length-1:u.length;let P=h===u||!i&&h.startsWith(u)&&h.charAt(S)==="/",k=g!=null&&(g===u||!i&&g.startsWith(u)&&g.charAt(u.length)==="/"),E={isActive:P,isPending:k,isTransitioning:f},F=P?s:void 0,R;typeof a=="function"?R=a(E):R=[a,P?"active":null,k?"pending":null,f?"transitioning":null].filter(Boolean).join(" ");let pe=typeof o=="function"?o(E):o;return x.createElement(K,bs({},p,{"aria-current":F,className:R,ref:n,style:pe,to:c,viewTransition:d}),typeof m=="function"?m(E):m)});var Qa;(function(e){e.UseScrollRestoration="useScrollRestoration",e.UseSubmit="useSubmit",e.UseSubmitFetcher="useSubmitFetcher",e.UseFetcher="useFetcher",e.useViewTransitionState="useViewTransitionState"})(Qa||(Qa={}));var gc;(function(e){e.UseFetcher="useFetcher",e.UseFetchers="useFetchers",e.UseScrollRestoration="useScrollRestoration"})(gc||(gc={}));function Um(e){let t=x.useContext(hl);return t||J(!1),t}function Wm(e,t){let{target:n,replace:s,state:l,preventScrollReset:a,relative:i,viewTransition:o}=t===void 0?{}:t,c=Vn(),d=Vt(),m=pl(e,{relative:i});return x.useCallback(p=>{if(zm(p,n)){p.preventDefault();let v=s!==void 0?s:Vs(d)===Vs(m);c(e,{replace:v,state:l,preventScrollReset:a,relative:i,viewTransition:o})}},[d,c,m,s,l,n,e,a,i,o])}function Bm(e,t){t===void 0&&(t={});let n=x.useContext(Om);n==null&&J(!1);let{basename:s}=Um(Qa.useViewTransitionState),l=pl(e,{relative:t.relative});if(!n.isTransitioning)return!1;let a=Dn(n.currentLocation.pathname,s)||n.currentLocation.pathname,i=Dn(n.nextLocation.pathname,s)||n.nextLocation.pathname;return Va(l.pathname,i)!=null||Va(l.pathname,a)!=null}const Hs="cc_token";let Hi=null;function Vm(){try{return localStorage.getItem(Hs)}catch{return null}}function bm(e){Hi=e||null;try{e?localStorage.setItem(Hs,e):localStorage.removeItem(Hs)}catch{}}function Xd(){Hi=null;try{localStorage.removeItem(Hs)}catch{}}function Hm(){return Hi||Vm()}class Qm extends Error{constructor(t,n){var s,l;super(((s=t==null?void 0:t.error)==null?void 0:s.message)||"Something went wrong."),this.code=((l=t==null?void 0:t.error)==null?void 0:l.code)||"UNKNOWN",this.status=n,this.payload=t}}async function ml(e,{method:t="GET",body:n}={}){const s={};n&&(s["Content-Type"]="application/json");const l=Hm();l&&(s.Authorization=`Bearer ${l}`);const a=await fetch(e,{method:t,headers:s,body:n?JSON.stringify(n):void 0,credentials:"same-origin"});let i=null;try{i=await a.json()}catch{}if(a.status===401&&Xd(),!a.ok||!(i!=null&&i.ok))throw new Qm(i,a.status);return i.data}const W=e=>ml(e),$=(e,t)=>ml(e,{method:"POST",body:t}),Ym=(e,t)=>ml(e,{method:"PUT",body:t}),Jd=e=>ml(e,{method:"DELETE"}),Zd=x.createContext(null),ee=()=>x.useContext(Zd);function Km({children:e}){const[t,n]=x.useState([]),s=x.useRef(0),l=x.useCallback((a,i="ok")=>{const o=++s.current;n(c=>[...c,{id:o,message:a,kind:i}]),setTimeout(()=>n(c=>c.filter(d=>d.id!==o)),4200)},[]);return r.jsxs(Zd.Provider,{value:{toast:l},children:[e,r.jsx("div",{className:"toasts",children:t.map(a=>r.jsx("div",{className:`toast ${a.kind==="err"?"err":""}`,children:a.message},a.id))})]})}const qd=x.createContext(null),Se=()=>x.useContext(qd);function Gm({children:e}){const[t,n]=x.useState(null),[s,l]=x.useState(!0),a=x.useCallback(async()=>{try{const o=await W("/api/auth/me");n(o)}catch{n({user:null})}finally{l(!1)}},[]);x.useEffect(()=>{a()},[a]);const i=async()=>{try{await $("/api/auth/logout")}catch{}Xd(),n({user:null})};return r.jsx(qd.Provider,{value:{me:t,user:t==null?void 0:t.user,loading:s,refresh:a,logout:i},children:e})}function Xm(){const[e,t]=x.useState(()=>document.documentElement.getAttribute("data-theme")||"light");return{theme:e,toggle:()=>{const s=e==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",s),localStorage.setItem("cc-theme",s),t(s)}}}const O=(e,t="0 0 24 24")=>n=>r.jsx("svg",{viewBox:t,fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round",width:"18",height:"18",...n,dangerouslySetInnerHTML:{__html:e}}),ln=e=>r.jsxs("svg",{viewBox:"0 0 64 64",width:"28",height:"28",...e,children:[r.jsx("circle",{cx:"32",cy:"32",r:"29",fill:"#0d5c57"}),r.jsx("path",{d:"M32 13 L41 32 L32 51 L23 32 Z",fill:"#e8a33d"}),r.jsx("circle",{cx:"32",cy:"32",r:"4",fill:"#fff"})]}),Jm=O(\'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>\'),Qi=O(\'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>\'),Ft=O(\'<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/>\'),$t=O(\'<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.6-.3-3.7-.8L3 21l1.3-4.6A8.5 8.5 0 1 1 21 12z"/>\'),vl=O(\'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>\'),Zm=O(\'<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>\'),se=O(\'<path d="m4.5 12.5 5 5 10-11"/>\'),Yi=O(\'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>\'),eh=O(\'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>\'),th=O(\'<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/>\'),rt=O(\'<path d="M12 3 4.5 6v5c0 5 3.2 8.3 7.5 10 4.3-1.7 7.5-5 7.5-10V6L12 3z"/><path d="m9 12 2 2 4-4.5"/>\'),An=O(\'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>\'),Je=O(\'<path d="M4 12h16M14 6l6 6-6 6"/>\'),zr=O(\'<path d="M20 12H4M10 6l-6 6 6 6"/>\'),nh=O(\'<path d="M12 5v14M5 12h14"/>\'),Ki=O(\'<path d="M6 6l12 12M18 6 6 18"/>\'),jc=O(\'<path d="m6 9 6 6 6-6"/>\'),qm=O(\'<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>\'),ev=O(\'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>\'),tv=O(\'<path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9"/><path d="M15 16l4-4-4-4M19 12H9"/>\'),Fr=O(\'<path d="M7 4h10M7 8.5h10M15.5 4c0 4-3.5 4.5-8.5 4.5 4 0 8.5 1 8.5 5.5 0 3-2.5 6-6.5 6-2 0-4-.5-5-1.5"/>\'),xl=O(\'<path d="M13 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V9l-6-6z"/><path d="M13 3v6h6"/>\'),$r=O(\'<path d="M20 11A8 8 0 0 0 5.6 6.6L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.4 4.4L20 15.5"/><path d="M20 20v-4.5h-4.5"/>\'),Gi=O(\'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>\'),nv=O(\'<path d="M7 21V10l4.5-7 1.4.7a2 2 0 0 1 1 2.2L13 10h5.5a2 2 0 0 1 2 2.5l-1.8 7A2 2 0 0 1 16.7 21H7z"/><path d="M7 10H4v11h3"/>\'),rv=O(\'<path d="M17 3v11l-4.5 7-1.4-.7a2 2 0 0 1-1-2.2L11 14H5.5a2 2 0 0 1-2-2.5l1.8-7A2 2 0 0 1 7.3 3H17z"/><path d="M17 14h3V3h-3"/>\'),Qs=O(\'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>\'),sv=O(\'<path d="m2.5 9 9.5-5 9.5 5-9.5 5L2.5 9z"/><path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5"/><path d="M21.5 9v6"/>\'),Xi=O(\'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10.5 21v-3h3v3"/>\'),Ys=O(\'<path d="M12 3v18M8 21h8"/><path d="M12 6 5 8M12 6l7 2"/><path d="M5 8 2.5 14a2.8 2.8 0 0 0 5 0L5 8zM19 8l-2.5 6a2.8 2.8 0 0 0 5 0L19 8z"/>\'),Ks=O(\'<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V13"/>\'),rh=O(\'<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 20h14"/>\'),sh=O(\'<path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>\'),Ur=O(\'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>\'),Gs=O(\'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>\'),Ji=O(\'<path d="M10 3.5a1.8 1.8 0 0 1 3.6 0c0 1.2 1 1.6 2.2 1.1a1.8 1.8 0 0 1 1.6 3.2c-1.1.6-1.1 1.7 0 2.4a1.8 1.8 0 0 1-1.6 3.2c-1.2-.5-2.2-.1-2.2 1.1a1.8 1.8 0 0 1-3.6 0c0-1.2-1-1.6-2.2-1.1a1.8 1.8 0 0 1-1.6-3.2c1.1-.6 1.1-1.7 0-2.4a1.8 1.8 0 0 1 1.6-3.2C9 5.1 10 4.7 10 3.5z"/><circle cx="12" cy="12" r="2"/>\'),Zi=O(\'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5a3.5 3.5 0 0 1 0 7M17.5 14.5a6.5 6.5 0 0 1 4 5.5"/>\'),lh=O(\'<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18"/>\'),yl=O(\'<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4M12 17v.01"/>\');function z({as:e,to:t,href:n,children:s,variant:l="primary",size:a,block:i,className:o="",...c}){const d=`btn btn-${l} ${a==="sm"?"btn-sm":""} ${a==="lg"?"btn-lg":""} ${i?"btn-block":""} ${o}`;return e==="a"||n?r.jsx("a",{className:d,href:n,...c,children:s}):r.jsx("button",{className:d,...c,children:s})}function L({tone:e="brand",children:t,...n}){return r.jsx("span",{className:`badge badge-${e}`,...n,children:t})}function _({children:e,className:t="",pad:n=!0,...s}){return r.jsx("div",{className:`card ${n?"card-pad":""} ${t}`,...s,children:e})}function $e({label:e,hint:t,children:n}){return r.jsxs("div",{className:"field",children:[e&&r.jsx("label",{children:e}),n,t&&r.jsx("div",{className:"hint",children:t})]})}function Wr({open:e,onClose:t,title:n,children:s,wide:l}){return x.useEffect(()=>{const a=i=>i.key==="Escape"&&(t==null?void 0:t());return e&&window.addEventListener("keydown",a),()=>window.removeEventListener("keydown",a)},[e,t]),e?r.jsx("div",{className:"modal-overlay",onMouseDown:a=>a.target===a.currentTarget&&(t==null?void 0:t()),children:r.jsxs("div",{className:"modal",style:l?{maxWidth:720}:void 0,children:[r.jsxs("div",{className:"modal-head",children:[r.jsx("h3",{style:{flex:1},children:n}),r.jsx("button",{className:"icon-btn",onClick:t,"aria-label":"Close",children:r.jsx(Ki,{})})]}),r.jsx("div",{className:"modal-body",children:s})]})}):null}function st(){return r.jsxs("span",{className:"ascii-loader",children:[r.jsx("i",{}),r.jsx("i",{}),r.jsx("i",{})]})}function V({h:e=90}){return r.jsx("div",{className:"skeleton skeleton-row",style:{height:e}})}function we({icon:e,title:t,body:n,action:s}){return r.jsxs("div",{className:"card card-pad center",style:{padding:"40px 20px"},children:[r.jsx("div",{style:{color:"var(--faint)",marginBottom:12},children:e||r.jsx(ln,{width:44,height:44})}),r.jsx("h3",{children:t}),n&&r.jsx("p",{className:"mt-1",children:n}),s&&r.jsx("div",{className:"mt-3",children:s})]})}function qt({source:e,asOf:t,staleDays:n=180}){if(!e&&!t)return null;const s=t&&Date.now()-new Date(t).getTime()>n*864e5;return r.jsxs("span",{className:`source-tag ${s?"stale":""}`,title:`Source: ${e||"\u2014"} \xB7 Verified as of ${Lr(t)}`,children:[r.jsx(rt,{width:12,height:12}),e?e.split("(")[0].trim():"Source"," \xB7 as of ",Lr(t),s&&" \xB7 needs refresh"]})}function lv({level:e}){const t=e==="high"?"success":e==="medium"?"brand":"warn",n=e==="high"?"High confidence":e==="medium"?"Medium confidence":"Low confidence";return r.jsx(L,{tone:t,children:n})}function gl({score:e,size:t=64,label:n="match"}){const s=(t-8)/2,l=2*Math.PI*s,a=l*(1-e/100),i=e>=75?"var(--success)":e>=55?"var(--brand-2)":"var(--accent)";return r.jsxs("div",{className:"match-score",style:{width:t,height:t},children:[r.jsxs("svg",{className:"ring",width:t,height:t,children:[r.jsx("circle",{className:"track",cx:t/2,cy:t/2,r:s,strokeWidth:"5",fill:"none"}),r.jsx("circle",{className:"fill",cx:t/2,cy:t/2,r:s,strokeWidth:"5",fill:"none",stroke:i,strokeDasharray:l,strokeDashoffset:a,strokeLinecap:"round"})]}),r.jsxs("div",{className:"ring-label",children:[r.jsxs("strong",{style:{fontSize:t>56?"1.02rem":".86rem"},children:[Math.round(e),"%"]}),r.jsx("span",{className:"tiny faint",children:n})]})]})}function cn({value:e}){return r.jsx("div",{className:"progressbar",children:r.jsx("div",{style:{width:`${Math.min(100,Math.max(0,e))}%`}})})}function qi({tabs:e,value:t,onChange:n}){return r.jsx("div",{className:"tabs",children:e.map(s=>r.jsxs("button",{className:t===s.id?"on":"",onClick:()=>n(s.id),children:[s.label,s.count!=null?` (${s.count})`:""]},s.id))})}function Lr(e){if(!e)return"\u2014";try{return new Date(e).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}catch{return e}}function Ie(e){if(!e)return"\u2014";try{return new Date(e).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}catch{return e}}function av(e){const t=x.useRef(null);return x.useEffect(()=>{const n=s=>{t.current&&!t.current.contains(s.target)&&e()};return document.addEventListener("mousedown",n),()=>document.removeEventListener("mousedown",n)},[e]),t}function iv(){const[e,t]=x.useState(!1),[n,s]=x.useState({notifications:[],unread:0}),l=av(()=>t(!1)),a=async()=>{try{s(await W("/api/account/notifications"))}catch{}};x.useEffect(()=>{a();const o=setInterval(a,2e4);return()=>clearInterval(o)},[]);const i=async()=>{await $("/api/account/notifications/read-all"),a()};return r.jsxs("div",{ref:l,style:{position:"relative"},children:[r.jsxs("button",{className:"icon-btn",onClick:()=>t(o=>!o),"aria-label":"Notifications",children:[r.jsx(Zm,{}),n.unread>0&&r.jsx("span",{className:"dot",children:n.unread})]}),e&&r.jsxs("div",{className:"card",style:{position:"absolute",right:0,top:48,width:"min(92vw, 380px)",zIndex:60,padding:12,maxHeight:420,overflowY:"auto"},children:[r.jsxs("div",{className:"row",style:{padding:"2px 6px 10px"},children:[r.jsx("strong",{children:"Notifications"}),r.jsx("span",{className:"spacer"}),n.unread>0&&r.jsx("button",{className:"btn btn-ghost btn-sm",onClick:i,children:"Mark all read"})]}),n.notifications.length===0&&r.jsx("p",{className:"small center",style:{padding:18},children:"Nothing yet \u2014 your check-ins and mentor answers land here."}),r.jsx("div",{className:"stack",style:{gap:8},children:n.notifications.slice(0,12).map(o=>r.jsxs(K,{to:o.link||"/app/home",className:`notif-item ${o.read_at?"":"unread"}`,onClick:()=>{t(!1),$(`/api/account/notifications/${o.id}/read`).then(a)},children:[r.jsx("div",{style:{minWidth:20,color:o.type==="checkin"?"var(--accent)":o.type==="payment"?"var(--success)":"var(--brand-2)"},children:o.type==="checkin"?r.jsx(Gs,{}):o.type==="payment"?r.jsx(Fr,{}):o.type==="mentor_answer"?r.jsx($t,{}):r.jsx(An,{})}),r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{style:{fontWeight:600,fontSize:".88rem"},children:o.title}),r.jsx("div",{className:"small muted",children:o.body}),r.jsx("div",{className:"tiny faint mt-1",children:Ie(o.created_at)})]})]},o.id))})]})]})}const ov=[{to:"/app/home",label:"Home",icon:Jm,roles:["student","parent","mentor","admin"]},{to:"/app/explore",label:"Explore",icon:Qi,roles:["student","parent","mentor","admin"]},{to:"/app/roadmap",label:"Roadmap",icon:Ft,roles:["student"]},{to:"/app/ask",label:"Ask a Pro",icon:$t,roles:["student"]},{to:"/app/progress",label:"Progress",icon:sv,roles:["student"]},{to:"/app/mentor",label:"Mentor desk",icon:$t,roles:["mentor"]},{to:"/app/admin",label:"Admin",icon:rt,roles:["admin"]},{to:"/app/account",label:"Account",icon:vl,roles:["student","parent","mentor","admin"]}];function cv(){const{user:e,logout:t}=Se(),{theme:n,toggle:s}=Xm(),{toast:l}=ee(),a=Vn(),i=ov.filter(c=>c.roles.includes(e.role)),o=[...i.filter(c=>["/app/home","/app/explore","/app/roadmap","/app/ask","/app/progress","/app/mentor","/app/admin"].includes(c.to))].slice(0,5);return r.jsxs(r.Fragment,{children:[(e==null?void 0:e.is_minor)&&r.jsxs("div",{className:"demo-banner",children:["Parental consent ",e.consent_status==="given"?"received \u2713":"pending"," \xB7 share your consent code from Account to link a parent"]}),r.jsx("div",{className:"demo-banner",style:{background:"var(--brand-soft)",color:"var(--brand)"},children:"Demo mode \xB7 OTP codes show on screen \xB7 payments are simulated (no real money)"}),r.jsx("header",{className:"topbar",children:r.jsxs("div",{className:"topbar-inner",children:[r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]}),r.jsx("nav",{className:"topnav",children:i.map(c=>r.jsx(yc,{to:c.to,className:({isActive:d})=>d?"active":"",children:c.label},c.to))}),r.jsx("div",{className:"topbar-spacer"}),r.jsx("button",{className:"icon-btn",onClick:s,"aria-label":"Toggle theme",children:n==="light"?r.jsx(ev,{}):r.jsx(qm,{})}),r.jsx(iv,{}),r.jsx("button",{className:"icon-btn",onClick:async()=>{await t(),l("Signed out. Come back soon."),a("/")},"aria-label":"Sign out",children:r.jsx(tv,{})})]})}),r.jsx("main",{className:"page",style:{flex:1},children:r.jsx(_m,{})}),r.jsx("nav",{className:"bottom-nav",children:o.map(c=>r.jsxs(yc,{to:c.to,className:({isActive:d})=>d?"active":"",children:[r.jsx(c.icon,{})," ",c.label]},c.to))})]})}function ah(){const{user:e}=Se();return r.jsx("header",{className:"topbar",children:r.jsxs("div",{className:"topbar-inner",children:[r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]}),r.jsx("div",{className:"topbar-spacer"}),r.jsx(K,{to:"/how-it-works",className:"btn btn-ghost btn-sm",children:"How it works"}),e?r.jsx(z,{as:"a",href:"/app/home",size:"sm",children:"Open app"}):r.jsx(z,{as:"a",href:"/signin",size:"sm",children:"Sign in"})]})})}function uv(){return r.jsxs(r.Fragment,{children:[r.jsx(ah,{}),r.jsxs("section",{className:"landing-hero",children:[r.jsxs("div",{children:[r.jsx(L,{tone:"accent",children:"\u2726 Built for Indian students, Class 10\u201312"}),r.jsxs("h1",{className:"hero-h1 mt-2",children:["Your future should not be a ",r.jsx("span",{style:{color:"var(--brand-2)"},children:"guessing game"}),"."]}),r.jsxs("p",{className:"mt-2",style:{fontSize:"1.06rem",maxWidth:520},children:["Parents, teachers, friends, the internet \u2014 everyone has an opinion on your career. The problem isn\'t finding advice. It\'s knowing ",r.jsx("strong",{children:"which advice to trust"}),". Career Compass turns who you are into ",r.jsx("strong",{children:"one trusted roadmap"})," you can actually act on."]}),r.jsx("div",{className:"row mt-3",children:r.jsxs(z,{as:"a",href:"/signin",size:"lg",children:["Start free \u2014 takes 15 minutes ",r.jsx(Je,{})]})}),r.jsxs("div",{className:"trust-strip mt-3",children:[r.jsxs("span",{className:"chip",children:[r.jsx(rt,{})," Every fact dated & sourced"]}),r.jsxs("span",{className:"chip",children:[r.jsx(Zi,{})," Real professionals, verified"]}),r.jsxs("span",{className:"chip",children:[r.jsx(Fr,{})," No commission from colleges \u2014 ever"]})]})]}),r.jsx("div",{className:"hero-visual",children:r.jsxs(_,{className:"hero-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(L,{tone:"brand",children:"Aarav\'s #1 match"}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:"success",children:"High confidence"})]}),r.jsxs("div",{className:"row",children:[r.jsx(gl,{score:92}),r.jsxs("div",{children:[r.jsx("div",{className:"match-title",children:"AI / ML Engineer"}),r.jsx("div",{className:"small muted",children:"Investigative + Realistic \xB7 strong in Mathematics & CS"})]})]}),r.jsxs("div",{className:"why-box",children:[\'"You enjoy Mathematics (5/5) and Computer Science, and your goals \u2014 working with technology and strong earnings \u2014 align here. The typical route is B.Tech CSE via JEE Main."\',r.jsx("div",{className:"tiny faint mt-1",children:"\u2713 Grounded in Career Compass research \xB7 as of this month"})]}),r.jsxs("div",{className:"row",children:[r.jsxs("span",{className:"chip on",children:[r.jsx(Ft,{})," Roadmap ready"]}),r.jsxs("span",{className:"chip",children:[r.jsx($t,{})," Mentor answered in 6h"]})]})]})})]}),r.jsxs("section",{className:"landing-section",children:[r.jsx("div",{className:"eyebrow",children:"How it works"}),r.jsx("h2",{children:\'From "everyone says something different" to one plan, in four steps\'}),r.jsx("div",{className:"grid-2 mt-3",children:[["Tell us who you are",\'Interests, subjects, strengths, goals \u2014 a structured "know me" profile, built in minutes.\',vl],["Take the assessment","60 questions across aptitude, personality (RIASEC) and career interests. Save and resume anytime.",Ji],["Get honest matches",\'Top 3 careers + 2 wildcards \u2014 each with a plain-language "why", confidence level, and cited sources.\',An],["Follow your roadmap","Milestones, exam timelines, free resources, mentor conversations, and 2-week check-ins. One path forward.",Ft]].map(([e,t,n],s)=>r.jsxs(_,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx("span",{className:"step-num",children:s+1}),r.jsx(n,{width:20,height:20,style:{color:"var(--brand-2)"}})]}),r.jsx("h3",{children:e}),r.jsx("p",{className:"small",children:t})]},s))})]}),r.jsxs("section",{className:"landing-section",children:[r.jsx("div",{className:"eyebrow",children:"Why trust us"}),r.jsx("h2",{children:"Trust is the product"}),r.jsx("p",{children:"Other platforms hand you a report and a list of options. We hand you a decision \u2014 with the receipts."}),r.jsxs("div",{className:"grid-3 mt-3",children:[r.jsxs(_,{className:"step-card",children:[r.jsx(rt,{width:22,height:22,style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"Dated, sourced facts"}),r.jsx("p",{className:"small",children:"Every career, college and exam fact shows its source and when it was last verified. Stale content gets flagged for review \u2014 by students and by us."})]}),r.jsxs(_,{className:"step-card",children:[r.jsx(Gi,{width:22,height:22,style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"Explainable matches"}),r.jsx("p",{className:"small",children:\'Every recommendation ships with a "Why was this recommended?" decision log in plain language. High-stakes advice (like a gap year) is checked by a human counsellor first.\'})]}),r.jsxs(_,{className:"step-card",children:[r.jsx(Ys,{width:22,height:22,style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"No commissions. Ever."}),r.jsx("p",{className:"small",children:"We never take money from colleges to rank or recommend them. We charge students a small, honest fee \u2014 so our only incentive is giving you the right answer."})]})]})]}),r.jsxs("section",{className:"landing-section",children:[r.jsx("div",{className:"eyebrow",children:"Pricing"}),r.jsx("h2",{children:"Honest pricing, charged from day one"}),r.jsx("p",{className:"mb-3",children:`A real (small) price keeps us honest: if students won\'t pay for a trusted roadmap, we\'d rather know than hide behind "free".`}),r.jsxs("div",{className:"grid-2",children:[r.jsxs(_,{className:"pricing-card",children:[r.jsxs("div",{children:[r.jsx("h3",{children:"Free"}),r.jsx("p",{className:"tiny",children:"Start here \u2014 no card needed"})]}),r.jsx("div",{className:"price",children:"\u20B90"}),r.jsxs("div",{className:"tick-list",children:[r.jsxs("div",{children:[r.jsx(se,{})," 60-question assessment"]}),r.jsxs("div",{children:[r.jsx(se,{})," Personality & aptitude profile"]}),r.jsxs("div",{children:[r.jsx(se,{})," Your #1 career match, with full reasoning"]})]}),r.jsx("div",{className:"spacer"}),r.jsx(z,{as:"a",href:"/signin",variant:"secondary",block:!0,children:"Start free"})]}),r.jsxs(_,{className:"pricing-card",style:{border:"2px solid var(--brand)"},children:[r.jsxs("div",{className:"row",children:[r.jsxs("div",{children:[r.jsx("h3",{children:"Full report"}),r.jsx("p",{className:"tiny",children:"One-time \xB7 includes roadmap"})]}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:"brand",children:"Recommended"})]}),r.jsxs("div",{className:"price",children:["\u20B9499 ",r.jsx("small",{children:"once"})]}),r.jsxs("div",{className:"tick-list",children:[r.jsxs("div",{children:[r.jsx(se,{})," All matches + wildcard options"]}),r.jsxs("div",{children:[r.jsx(se,{}),\' Full "why this fits you" narratives\']}),r.jsxs("div",{children:[r.jsx(se,{})," Personal roadmap with exam timeline"]}),r.jsxs("div",{children:[r.jsx(se,{})," PDF export & parent sharing"]}),r.jsxs("div",{children:[r.jsx(se,{})," Ask-a-Professional access"]}),r.jsxs("div",{children:[r.jsx(se,{})," 2-week & 4-week check-ins"]})]}),r.jsx("div",{className:"spacer"}),r.jsx(z,{as:"a",href:"/signin",block:!0,children:"Unlock the full report"}),r.jsx("p",{className:"tiny faint center",children:"Test mode in this demo \u2014 or use code EARLY100"})]})]})]}),r.jsxs("section",{className:"landing-section",style:{paddingBottom:70},children:[r.jsxs(_,{className:"center",style:{padding:"44px 24px",background:"var(--brand)",borderColor:"var(--brand)"},children:[r.jsxs("h2",{style:{color:"#fff"},children:["Stop collecting opinions.",r.jsx("br",{}),"Start following one plan."]}),r.jsx("p",{className:"mt-2",style:{color:"rgba(255,255,255,.75)",maxWidth:460,margin:"10px auto 0"},children:"15 minutes of honest answers. One roadmap you can commit to \u2014 reviewed by humans where it matters, grounded in sources everywhere."}),r.jsxs(z,{as:"a",href:"/signin",size:"lg",variant:"secondary",className:"mt-3",style:{background:"#fff",borderColor:"#fff"},children:["Begin my compass ",r.jsx(Je,{})]})]}),r.jsxs("p",{className:"tiny faint center mt-3",children:["Demo build \xB7 ",r.jsx(K,{to:"/how-it-works",children:"How recommendations work"})," \xB7 Made with care for students who deserve better than guesswork"]})]})]})}function dv(){return r.jsxs(r.Fragment,{children:[r.jsx(ah,{}),r.jsxs("div",{className:"page page-narrow",children:[r.jsx("div",{className:"eyebrow",children:"Transparency"}),r.jsx("h1",{style:{fontSize:"1.9rem"},children:"How recommendations work"}),r.jsx("p",{className:"mb-3",children:"We believe you should be able to audit the machine that\'s advising your life. Here is exactly what happens under the hood."}),r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(Ji,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Layer 1 \u2014 a deterministic matcher"]}),r.jsx("p",{className:"small mt-1",children:"Your assessment produces a RIASEC personality profile (Realistic, Investigative, Artistic, Social, Enterprising, Conventional), aptitude scores, and rated interests. Each career in our knowledge base carries vectors for the same dimensions. The engine computes a weighted match \u2014 personality fit (40%), subjects (18%), interests (16%), goals (12%), aptitude (8%), practical feasibility (6%) \u2014 and shows you the contribution of every factor in the decision log. This layer is fully reproducible and runs even if the AI layer is unavailable."})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(An,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Layer 2 \u2014 a grounded narrative"]}),r.jsx("p",{className:"small mt-1",children:`A language model (or our local generator when no LLM is configured) writes the "Why this fits you" narrative \u2014 but it can only use facts from our verified knowledge base. If a fact isn\'t in the base, it says "to be confirmed with a mentor" rather than guessing. The deterministic scores always win; the narrative explains, never overrides.`})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(rt,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Humans where it matters"]}),r.jsxs("p",{className:"small mt-1",children:["Recommendations that suggest high-impact steps \u2014 a gap year, a stream change \u2014 are held for counsellor review ",r.jsx("em",{children:"before"})," you see them. Anything you flag goes to the same review queue."]})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(Ys,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," What we will never do"]}),r.jsx("p",{className:"small mt-1",children:"Take commissions from colleges to steer you. Let advertising influence a match. Sell your data. A small fee from students is our only revenue \u2014 our incentive is giving you the right answer, not the profitable one."})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(vl,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Your data, your rights (DPDP-aligned)"]}),r.jsx("p",{className:"small mt-1",children:"Export everything we hold about you as JSON, delete your account outright, control what parents see. Under-18 accounts require verifiable parental consent. Every export and deletion is logged."})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(yl,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Honest limits"]}),r.jsx("p",{className:"small mt-1",children:"This is guidance, not a verdict. Salaries are ranges, dates change \u2014 always verify on official websites before committing money or years. Our knowledge base is curated, not infinite, and we date every fact so you can see how fresh it is."})]})]})]})]})}function hv(){const{refresh:e}=Se(),{toast:t}=ee(),n=Vn(),s=Vt(),[l,a]=x.useState("identifier"),[i,o]=x.useState(""),[c,d]=x.useState(null),[m,p]=x.useState(""),[v,y]=x.useState(""),[j,w]=x.useState({name:"",role:"student",isMinor:!1,consent:!1,referralCode:"",parentConsentCode:""}),[N,f]=x.useState(!1),[u,h]=x.useState(""),g=async k=>{f(!0),h("");try{const E=await $("/api/auth/otp/request",{identifier:i,mode:k});if(E.needsSignup){h(E.message),a("signup");return}d(E.exists),p(E.devOtp||""),y(E.devOtp||""),a("otp"),t(E.devOtp?`OTP sent. Demo code: ${E.devOtp}`:"OTP sent \u2014 check your email/SMS.")}catch(E){h(E.message)}finally{f(!1)}},S=async()=>{var k;f(!0),h("");try{const E={identifier:i,otp:v};if(!c){if(j.name.trim().length<2)throw new Error("Please enter your name.");if(j.role==="student"&&j.isMinor&&!j.consent)throw new Error("A parent/guardian must consent for students under 18.");if(j.role==="parent"&&!j.parentConsentCode.trim())throw new Error("Parents join with the consent code from their child\'s account.");E.signup=j}const F=await $("/api/auth/otp/verify",E);F.token&&bm(F.token),await e(),t(F.isNew?`Welcome to Career Compass, ${F.user.name.split(" ")[0]}!`:`Welcome back, ${F.user.name.split(" ")[0]}!`),F.consentCode&&t(`Your parent consent code: ${F.consentCode} \u2014 share it from Account.`),n(((k=s.state)==null?void 0:k.from)||(F.user.role==="admin"?"/app/admin":F.user.role==="mentor"?"/app/mentor":"/app/home"))}catch(E){h(E.message)}finally{f(!1)}},P=i.includes("@");return r.jsxs("div",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",background:"var(--bg)"},children:[r.jsx("header",{className:"topbar",children:r.jsx("div",{className:"topbar-inner",children:r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]})})}),r.jsx("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"},children:r.jsxs("div",{style:{width:"100%",maxWidth:440},children:[r.jsxs(_,{children:[r.jsxs("div",{className:"center mb-2",children:[r.jsx(ln,{width:44,height:44}),r.jsx("h2",{className:"mt-1",children:l==="identifier"?"Welcome":c===!1?"Create your account":"Verify it\'s you"}),r.jsx("p",{className:"small",children:l==="identifier"?"Sign in with an email or phone \u2014 no passwords.":c===!1?"One last detail and your compass is live.":`We sent a 6-digit code to ${i}`})]}),m&&l==="otp"&&r.jsxs("div",{className:"alert alert-info mb-2",children:[r.jsx(Ur,{}),r.jsxs("div",{children:["Demo mode \u2014 your OTP is ",r.jsx("strong",{style:{letterSpacing:2},children:m})," (filled in for you)"]})]}),u&&r.jsxs("div",{className:"alert alert-danger mb-2",children:[r.jsx(yl,{}),r.jsx("div",{children:u})]}),l==="identifier"&&r.jsxs("div",{className:"stack",children:[r.jsx($e,{label:"Email or 10-digit mobile number",children:r.jsx("input",{className:"input input-lg",placeholder:"you@example.com  \xB7  9876543210",value:i,onChange:k=>o(k.target.value),onKeyDown:k=>k.key==="Enter"&&i.trim()&&g("signin"),autoFocus:!0})}),r.jsx(z,{block:!0,size:"lg",disabled:i.trim().length<5||N,onClick:()=>g("signin"),children:N?r.jsx(st,{}):r.jsxs(r.Fragment,{children:["Continue ",r.jsx(Je,{})]})}),r.jsxs("div",{className:"card-2 card-pad tiny",style:{marginTop:4},children:[r.jsx("strong",{children:"Demo accounts"})," (sign in with these):",r.jsx("br",{}),r.jsx("code",{children:"student@demo.cc"})," \u2014 fully worked profile + roadmap",r.jsx("br",{}),r.jsx("code",{children:"parent@demo.cc"})," \xB7 ",r.jsx("code",{children:"mentor@demo.cc"})," \xB7 ",r.jsx("code",{children:"admin@demo.cc"})]})]}),l==="otp"&&r.jsxs("div",{className:"stack",children:[c===!1&&r.jsxs(r.Fragment,{children:[r.jsx($e,{label:"Your name",children:r.jsx("input",{className:"input input-lg",placeholder:"e.g. Aarav Sharma",value:j.name,onChange:k=>w(E=>({...E,name:k.target.value}))})}),r.jsx($e,{label:"I am a",children:r.jsxs("div",{className:"row",children:[r.jsx("span",{className:`chip ${j.role==="student"?"on":""}`,onClick:()=>w(k=>({...k,role:"student"})),children:"\u{1F393} Student"}),r.jsx("span",{className:`chip ${j.role==="parent"?"on":""}`,onClick:()=>w(k=>({...k,role:"parent"})),children:"\u{1F464} Parent"})]})}),j.role==="student"&&r.jsxs(r.Fragment,{children:[r.jsxs("label",{className:"check-item",style:{cursor:"pointer"},children:[r.jsx("span",{className:`checkbox ${j.isMinor?"done":""}`,children:r.jsx(se,{})}),r.jsx("span",{className:"check-text small",onClick:k=>{k.preventDefault(),w(E=>({...E,isMinor:!E.isMinor}))},children:"I am under 18 (a parent will be linked with a consent code)"}),r.jsx("input",{type:"checkbox",style:{display:"none"},checked:j.isMinor,onChange:k=>w(E=>({...E,isMinor:k.target.checked}))})]}),j.isMinor&&r.jsxs("label",{className:"check-item",style:{cursor:"pointer"},children:[r.jsx("span",{className:`checkbox ${j.consent?"done":""}`,children:r.jsx(se,{})}),r.jsx("span",{className:"check-text small",onClick:k=>{k.preventDefault(),w(E=>({...E,consent:!E.consent}))},children:"My parent/guardian has agreed to my using Career Compass (required under India\'s DPDP Act)"}),r.jsx("input",{type:"checkbox",style:{display:"none"},checked:j.consent,onChange:k=>w(E=>({...E,consent:k.target.checked}))})]}),r.jsx($e,{label:"Referral code (optional)",children:r.jsx("input",{className:"input",placeholder:"CC-XXXXXX",value:j.referralCode,onChange:k=>w(E=>({...E,referralCode:k.target.value}))})})]}),j.role==="parent"&&r.jsx($e,{label:"Consent code from your child",hint:"Your child finds this in their Account page.",children:r.jsx("input",{className:"input",placeholder:"PC-XXXXXX",value:j.parentConsentCode,onChange:k=>w(E=>({...E,parentConsentCode:k.target.value}))})})]}),r.jsx($e,{label:"6-digit OTP",children:r.jsx("input",{className:"input input-lg",style:{letterSpacing:6,textAlign:"center",fontSize:"1.3rem"},maxLength:6,placeholder:"\u2022\u2022\u2022\u2022\u2022\u2022",value:v,onChange:k=>y(k.target.value.replace(/\\D/g,"")),onKeyDown:k=>k.key==="Enter"&&v.length===6&&S()})}),r.jsx(z,{block:!0,size:"lg",disabled:v.length!==6||N,onClick:S,children:N?r.jsx(st,{}):c===!1?"Create account & sign in":"Verify & sign in"}),r.jsxs("div",{className:"row",children:[r.jsxs("button",{className:"btn btn-ghost btn-sm",onClick:()=>{a("identifier"),h("")},children:[r.jsx(zr,{})," Change ",P?"email":"number"]}),r.jsx("span",{className:"spacer"}),r.jsx("button",{className:"btn btn-ghost btn-sm",onClick:()=>g("signin"),children:"Resend OTP"})]})]})]}),r.jsxs("p",{className:"tiny faint center mt-2",children:["By continuing you agree to honest guidance, dated sources, and no college commissions. ",r.jsx(K,{to:"/how-it-works",children:"How recommendations work \u2192"})]})]})})]})}function fv(){var p,v,y,j,w;const{me:e,user:t}=Se(),n=Vn(),[s,l]=x.useState(null),[a,i]=x.useState(null),[o,c]=x.useState(null);if(x.useEffect(()=>{(t==null?void 0:t.role)==="student"&&(W("/api/profile").then(N=>l(N)).catch(()=>{}),W("/api/recommendations").then(N=>i(N)).catch(()=>{}),W("/api/roadmap").then(N=>c(N.roadmap)).catch(()=>{}))},[t]),(t==null?void 0:t.role)==="parent")return r.jsx(pv,{});if((t==null?void 0:t.role)==="mentor")return n("/app/mentor"),null;if((t==null?void 0:t.role)==="admin")return n("/app/admin"),null;const d=((p=t==null?void 0:t.name)==null?void 0:p.split(" ")[0])||"there",m=!(s!=null&&s.hasProfile)&&!((v=s==null?void 0:s.profile)!=null&&v.class_level)?{n:1,label:"Build your profile",to:"/app/profile",desc:"Two minutes: subjects, interests, goals, constraints."}:e!=null&&e.assessmentDone?a!=null&&a.has_any?t!=null&&t.paid_unlock?(o==null?void 0:o.status)!=="ready"?{n:5,label:"Create your roadmap",to:"/app/roadmap",desc:"Pick a career and get a dated, step-by-step plan."}:{n:6,label:"Follow your roadmap",to:"/app/roadmap",desc:`${o.progress.done}/${o.progress.total} steps done. Check-ins keep you honest.`}:{n:4,label:"Unlock your full report",to:"/app/results",desc:`\u20B9499 once \xB7 or use code EARLY100. Your #1 match (${(y=a.matches[0])==null?void 0:y.match_score}%) is free forever.`}:{n:3,label:"Generate your matches",to:"/app/results",desc:"See which careers fit \u2014 and exactly why."}:{n:2,label:"Take the assessment",to:"/app/assessment",desc:"60 questions \xB7 ~15 minutes \xB7 save and resume anytime."};return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Your compass"}),r.jsxs("h1",{style:{fontSize:"1.7rem"},children:["Hi ",d," \u{1F44B}"]}),r.jsx("p",{className:"small",children:(j=s==null?void 0:s.profile)!=null&&j.class_level?`${s.profile.class_level} \xB7 ${s.profile.stream||"stream not set"}`:"Let\'s get you oriented."})]}),r.jsx("span",{className:"spacer"}),(t==null?void 0:t.referral_code)&&r.jsxs("div",{className:"card-2 card-pad tiny",style:{maxWidth:250},children:[r.jsx("strong",{children:"Your referral code"}),r.jsx("div",{style:{fontFamily:"ui-monospace,monospace",fontSize:"1rem",color:"var(--brand-2)",fontWeight:700},children:t.referral_code}),r.jsx("span",{className:"faint",children:"Word-of-mouth is how trust spreads."})]})]}),r.jsx(_,{style:{background:"var(--brand)",borderColor:"var(--brand)",color:"#fff"},children:r.jsxs("div",{className:"row",style:{alignItems:"center"},children:[r.jsxs("div",{style:{flex:1,minWidth:220},children:[r.jsx("div",{className:"tiny",style:{opacity:.8,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"},children:"Next step"}),r.jsx("h3",{style:{color:"#fff",fontSize:"1.35rem",margin:"4px 0"},children:m.label}),r.jsx("p",{className:"small",style:{color:"rgba(255,255,255,.8)"},children:m.desc}),r.jsxs(z,{variant:"secondary",className:"mt-2",style:{background:"#fff",borderColor:"#fff"},as:"a",href:m.to,children:[m.n===6?"Open roadmap":"Continue"," ",r.jsx(Je,{})]})]}),r.jsx("div",{className:"center",style:{display:"none"},children:r.jsxs("div",{style:{width:84,height:84,borderRadius:"50%",border:"3px solid rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.9rem",fontFamily:"var(--font-display)"},children:[m.n,r.jsx("span",{style:{fontSize:".9rem",opacity:.6},children:"/6"})]})})]})}),r.jsxs("div",{className:"grid-3",children:[r.jsxs(_,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(vl,{style:{color:"var(--brand-2)"}})," ",r.jsx("strong",{children:"Profile"})]}),r.jsxs("div",{className:"stat",children:[r.jsxs("span",{className:"n",children:[(s==null?void 0:s.completeness)??0,"%"]}),r.jsx("span",{className:"l",children:"complete"})]}),r.jsx(cn,{value:(s==null?void 0:s.completeness)??0}),r.jsx("p",{className:"tiny faint",children:"Richer profile \u2192 sharper matches."}),r.jsx(K,{to:"/app/profile",className:"small",children:"Edit profile \u2192"})]}),r.jsxs(_,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(Ji,{style:{color:"var(--brand-2)"}})," ",r.jsx("strong",{children:"Assessment"})]}),r.jsxs("div",{className:"stat",children:[r.jsx("span",{className:"n",children:e!=null&&e.assessmentDone?"Done \u2713":"Pending"}),r.jsx("span",{className:"l",children:"60 questions"})]}),r.jsx("p",{className:"tiny faint",children:e!=null&&e.assessmentDone?"Aptitude \xB7 personality \xB7 interests \u2014 scored.":"Aptitude \xB7 personality \xB7 interests."}),r.jsx(K,{to:"/app/assessment",className:"small",children:e!=null&&e.assessmentDone?"Review results \u2192":"Start assessment \u2192"})]}),r.jsxs(_,{className:"step-card",children:[r.jsxs("div",{className:"row",children:[r.jsx(Ft,{style:{color:"var(--brand-2)"}})," ",r.jsx("strong",{children:"Roadmap"})]}),r.jsxs("div",{className:"stat",children:[r.jsx("span",{className:"n",children:(o==null?void 0:o.status)==="ready"?`${o.progress.done}/${o.progress.total}`:(o==null?void 0:o.status)??"\u2014"}),r.jsx("span",{className:"l",children:"steps completed"})]}),r.jsx("p",{className:"tiny faint",children:o!=null&&o.career?o.career.title:"Generated after you pick a career."}),r.jsx(K,{to:"/app/roadmap",className:"small",children:"Open roadmap \u2192"})]})]}),(a==null?void 0:a.has_any)&&r.jsxs(_,{children:[r.jsxs("div",{className:"row mb-2",children:[r.jsx("h3",{children:"Your top match"}),r.jsx("span",{className:"spacer"}),r.jsx(K,{to:"/app/results",className:"small",children:"See all matches \u2192"})]}),a.matches[0]?a.matches[0].pending?r.jsxs("div",{className:"alert alert-warn",children:[r.jsx(rt,{}),r.jsx("div",{children:"This recommendation is under counsellor review (high-impact content). You\'ll see it as soon as a human checks it."})]}):r.jsxs("div",{className:"row",children:[r.jsx(gl,{score:a.matches[0].match_score}),r.jsxs("div",{style:{flex:1,minWidth:200},children:[r.jsx("div",{className:"match-title",children:a.matches[0].career.title}),r.jsxs("div",{className:"small muted",children:[(w=a.matches[0].career.summary)==null?void 0:w.slice(0,110),"\u2026"]}),r.jsx("div",{className:"row mt-1",children:r.jsxs(L,{tone:a.matches[0].confidence==="high"?"success":"brand",children:[a.matches[0].confidence," confidence"]})})]})]}):null]}),r.jsxs("div",{className:"row",style:{gap:10},children:[r.jsxs(K,{to:"/app/ask",className:"card card-pad",style:{flex:1,minWidth:200,textDecoration:"none"},children:[r.jsx($t,{style:{color:"var(--brand-2)"}}),r.jsx("div",{className:"match-title",style:{fontSize:"1rem"},children:"Ask a professional"}),r.jsx("p",{className:"tiny faint",children:"Verified mentors answer within 48 hours."})]}),r.jsxs(K,{to:"/app/explore",className:"card card-pad",style:{flex:1,minWidth:200,textDecoration:"none"},children:[r.jsx(Qi,{style:{color:"var(--brand-2)"}}),r.jsx("div",{className:"match-title",style:{fontSize:"1rem"},children:"Explore careers"}),r.jsx("p",{className:"tiny faint",children:"57 careers \xB7 209 colleges \xB7 33 exams, all sourced & dated."})]})]})]})}function pv(){var n,s;const{me:e,user:t}=Se();return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Parent view"}),r.jsxs("h1",{style:{fontSize:"1.7rem"},children:["Welcome, ",(n=t==null?void 0:t.name)==null?void 0:n.split(" ")[0]]}),r.jsx("p",{className:"small",children:"You\'re the decision partner \u2014 here\'s what your child has shared with you."})]}),(s=e==null?void 0:e.sharedToMe)!=null&&s.length?r.jsx("div",{className:"stack",children:e.sharedToMe.map((l,a)=>r.jsxs(_,{className:"row",children:[r.jsx(Ft,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsxs("strong",{children:[l.student_name,"\'s roadmap \u2014 ",l.career_title]}),r.jsxs("div",{className:"small muted",children:["Status: ",l.rm_status]})]}),r.jsx(z,{as:"a",href:`/shared/${l.share_token}`,size:"sm",variant:"secondary",children:"View (read-only)"})]},a))}):r.jsxs(_,{className:"center",style:{padding:40},children:[r.jsx(Ks,{width:38,height:38,style:{color:"var(--faint)"}}),r.jsx("h3",{className:"mt-2",children:"No roadmap shared yet"}),r.jsx("p",{className:"small mt-1",children:"When your child shares their roadmap, it appears here. They control sharing \u2014 you\'ll get the link the moment they do."})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Why parents pay for this"}),r.jsx("p",{className:"small mt-1",children:"One wrong course choice costs years and lakhs. A \u20B9499 roadmap that your child actually follows \u2014 with exam timelines, a Plan B, and professionals to ask \u2014 is the cheapest insurance in education."}),r.jsxs("p",{className:"small mt-2",children:["We take ",r.jsx("strong",{children:"zero commission from colleges"}),". Our only job is the right answer for your child."]})]})]})}function mv(){const{refresh:e}=Se(),{toast:t}=ee(),[n,s]=x.useState(null),[l,a]=x.useState(null),[i,o]=x.useState(null),[c,d]=x.useState(!1),[m,p]=x.useState("");if(x.useEffect(()=>{W("/api/profile/meta").then(s),W("/api/profile").then(u=>{var h,g,S,P,k,E,F,R,pe,yt;a(u),o({class_level:((h=u.profile)==null?void 0:h.class_level)||"Class 12",stream:((g=u.profile)==null?void 0:g.stream)||"",subjects:((S=u.profile)==null?void 0:S.subjects)||{},strengths:((P=u.profile)==null?void 0:P.strengths)||[],skills:((k=u.profile)==null?void 0:k.skills)||[],goals:((E=u.profile)==null?void 0:E.goals)||[],budget:((F=u.profile)==null?void 0:F.budget)||"",city:((R=u.profile)==null?void 0:R.city)||"",willing_to_relocate:((pe=u.profile)==null?void 0:pe.willing_to_relocate)!==!1,target_year:((yt=u.profile)==null?void 0:yt.target_year)||new Date().getFullYear()+1})})},[]),!i||!n)return r.jsx("div",{className:"stack",children:r.jsx(st,{})});const v=(u,h)=>o(g=>({...g,subjects:{...g.subjects,[u]:h}})),y=u=>o(h=>({...h,goals:h.goals.includes(u)?h.goals.filter(g=>g!==u):[...h.goals,u]})),j=u=>o(h=>({...h,strengths:h.strengths.includes(u)?h.strengths.filter(g=>g!==u):[...h.strengths,u]})),w=()=>{const u=m.trim();u&&!i.skills.includes(u)&&i.skills.length<10&&o(h=>({...h,skills:[...h.skills,u]})),p("")},N=async()=>{d(!0);try{await Ym("/api/profile",i);const u=await W("/api/profile");a(u),t(`Profile saved \u2014 ${u.completeness}% complete.`),e()}catch(u){t(u.message,"err")}finally{d(!1)}},f=[new Date().getFullYear()+1,new Date().getFullYear()+2,new Date().getFullYear()+3];return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Know me"}),r.jsx("h1",{style:{fontSize:"1.6rem"},children:"Your profile"}),r.jsx("p",{className:"small",children:"This feeds the matcher. Honest answers now \u2192 a roadmap you\'ll actually trust later."})]}),r.jsx("span",{className:"spacer"}),r.jsxs("div",{style:{width:150},children:[r.jsxs("div",{className:"tiny muted mb-1",children:[l.completeness,"% complete"]}),r.jsx(cn,{value:l.completeness})]})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Basics"}),r.jsxs("div",{className:"grid-2 mt-2",children:[r.jsx($e,{label:"Class level",children:r.jsx("select",{className:"input",value:i.class_level,onChange:u=>o(h=>({...h,class_level:u.target.value})),children:["Class 10","Class 11","Class 12","Just finished Class 12","Dropper / gap year"].map(u=>r.jsx("option",{children:u},u))})}),r.jsx($e,{label:"Current stream (or expected)",children:r.jsxs("select",{className:"input",value:i.stream,onChange:u=>o(h=>({...h,stream:u.target.value})),children:[r.jsx("option",{value:"",children:"Not decided yet"}),["Science","Commerce","Arts"].map(u=>r.jsx("option",{children:u},u))]})}),r.jsx($e,{label:"City",children:r.jsx("input",{className:"input",placeholder:"e.g. Gaya, Bihar",value:i.city,onChange:u=>o(h=>({...h,city:u.target.value}))})}),r.jsx($e,{label:"Target admission year",children:r.jsx("select",{className:"input",value:i.target_year,onChange:u=>o(h=>({...h,target_year:Number(u.target.value)})),children:f.map(u=>r.jsx("option",{value:u,children:u},u))})})]})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Subjects \u2014 how much do you enjoy them?"}),r.jsx("p",{className:"small mb-2",children:"1 = dislike, 5 = love it. Enjoyment predicts fit better than marks do."}),r.jsx("div",{className:"stack",style:{gap:10},children:n.subjects.map(u=>r.jsxs("div",{className:"row",children:[r.jsx("div",{style:{width:150,fontWeight:500,fontSize:".92rem"},children:u}),r.jsx("div",{className:"rate-row",style:{flex:1},children:[1,2,3,4,5].map(h=>r.jsx("button",{className:`rate-opt ${i.subjects[u]===h?"on":""}`,onClick:()=>v(u,i.subjects[u]===h?void 0:h),children:h},h))})]},u))})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Strengths \u2014 pick up to 5"}),r.jsx("div",{className:"row mt-2",children:n.subjects.map(u=>r.jsxs("span",{className:`chip ${i.strengths.includes(u)?"on":""}`,onClick:()=>j(u),children:[i.strengths.includes(u)&&r.jsx(se,{width:13,height:13})," ",u]},u))})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:["Goals \u2014 what matters to you? ",r.jsx("span",{className:"faint small",children:"(pick 2\u20134)"})]}),r.jsx("p",{className:"small mb-2",children:"Conflicting goals are okay. The engine surfaces the tension honestly instead of hiding it."}),r.jsx("div",{className:"row mt-2",children:n.goals.map(u=>r.jsxs("span",{className:`chip ${i.goals.includes(u.id)?"on":""}`,onClick:()=>y(u.id),children:[i.goals.includes(u.id)&&r.jsx(se,{width:13,height:13})," ",u.label]},u.id))})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Skills you already have"}),r.jsx("div",{className:"row mt-2",children:i.skills.map(u=>r.jsxs("span",{className:"chip on",children:[u,r.jsx("button",{onClick:()=>o(h=>({...h,skills:h.skills.filter(g=>g!==u)})),style:{border:0,background:"none",color:"inherit",cursor:"pointer",display:"flex"},children:r.jsx(Ki,{width:13,height:13})})]},u))}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("input",{className:"input",style:{flex:1,minWidth:180},placeholder:"e.g. Python basics, sketching, debating\u2026",value:m,onChange:u=>p(u.target.value),onKeyDown:u=>u.key==="Enter"&&(u.preventDefault(),w())}),r.jsxs(z,{variant:"secondary",size:"sm",onClick:w,children:[r.jsx(nh,{})," Add"]})]})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Practical constraints"}),r.jsx("p",{className:"small mb-2",children:"Budget and mobility shape which plans are realistic \u2014 the matcher accounts for them (and suggests scholarships where needed)."}),r.jsxs("div",{className:"grid-2 mt-2",children:[r.jsx($e,{label:"Education budget per year",children:r.jsxs("select",{className:"input",value:i.budget,onChange:u=>o(h=>({...h,budget:u.target.value})),children:[r.jsx("option",{value:"",children:"Prefer not to say"}),n.budgets.map(u=>r.jsx("option",{value:u.id,children:u.label},u.id))]})}),r.jsx($e,{label:"Willing to relocate for the right college?",children:r.jsxs("div",{className:"row mt-1",children:[r.jsx("span",{className:`chip ${i.willing_to_relocate?"on":""}`,onClick:()=>o(u=>({...u,willing_to_relocate:!0})),children:"Yes, anywhere in India"}),r.jsx("span",{className:`chip ${i.willing_to_relocate?"":"on"}`,onClick:()=>o(u=>({...u,willing_to_relocate:!1})),children:"Prefer close to home"})]})})]})]}),r.jsxs("div",{className:"row",children:[r.jsx(z,{size:"lg",disabled:c,onClick:N,children:c?r.jsx(st,{}):r.jsxs(r.Fragment,{children:["Save profile ",r.jsx(se,{})]})}),r.jsxs(z,{size:"lg",variant:"secondary",as:"a",href:"/app/assessment",children:["Continue to assessment ",r.jsx(Je,{})]})]})]})}const wc={aptitude:"Aptitude",personality:"Personality",interest:"Career interests"},Nc={R:["Realistic","Builder / doer \u2014 hands-on, practical"],I:["Investigative","Thinker / analyst \u2014 curious, evidence-driven"],A:["Artistic","Creator \u2014 expressive, original"],S:["Social","Helper \u2014 people-oriented, supportive"],E:["Enterprising","Leader \u2014 persuasive, takes charge"],C:["Conventional","Organizer \u2014 structured, detail-focused"]},vv={numeric:"Numeric",logical:"Logical",verbal:"Verbal",spatial:"Spatial"};function xv(){const{me:e,refresh:t}=Se(),{toast:n}=ee(),[s,l]=x.useState(null),[a,i]=x.useState(0),[o,c]=x.useState({}),[d,m]=x.useState(!1),[p,v]=x.useState(!1),y=async()=>{const g=await W("/api/assessment");l(g),c(g.answers||{});const S=g.questions.findIndex(P=>{var k;return((k=g.answers)==null?void 0:k[P.id])==null});i(S===-1?g.questions.length-1:S)};if(x.useEffect(()=>{y()},[]),!s)return r.jsx("div",{className:"stack",children:r.jsx(st,{})});const j=s.questions[a],w=Object.keys(o).length,N=s.status==="completed"||!!s.results,f=async g=>{const S={...o,[j.id]:g};c(S);try{await $("/api/assessment/answer",{questionId:j.id,value:g})}catch(P){n(P.message,"err")}setTimeout(()=>i(P=>Math.min(P+1,s.questions.length-1)),150)},u=async()=>{m(!0);try{await $("/api/assessment/complete"),await t(),n("Assessment complete! Your profile is ready."),await y()}catch(g){n(g.message,"err")}finally{m(!1)}},h=async g=>{m(!0);try{await $("/api/assessment/demo-fill",{persona:g}),n("Demo answers filled \u2014 completing now."),await y(),v(!1)}catch(S){n(S.message,"err")}finally{m(!1)}};return N&&s.results?r.jsx(yv,{results:s.results}):r.jsxs("div",{className:"assessment-wrap",children:[r.jsxs("div",{className:"row mb-2",children:[r.jsxs(K,{to:"/app/home",className:"btn btn-ghost btn-sm",children:[r.jsx(zr,{})," Home"]}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"small muted",children:[wc[j.sub_test]," \xB7 ",w,"/",s.questions.length]})]}),r.jsx(cn,{value:w/s.questions.length*100}),r.jsxs(_,{className:"mt-3 fade-in",children:[r.jsxs("div",{className:"eyebrow",children:[wc[j.sub_test]," \xB7 Q",a+1]}),r.jsx("h3",{style:{fontSize:"1.25rem",margin:"8px 0 18px",minHeight:56},children:j.text}),j.options?r.jsx("div",{children:j.options.map((g,S)=>r.jsxs("button",{className:`option-btn ${o[j.id]===S?"on":""}`,onClick:()=>f(S),children:[r.jsx("span",{className:"option-key",children:String.fromCharCode(65+S)})," ",g]},S))}):r.jsxs("div",{children:[r.jsx("div",{className:"rate-row",children:[1,2,3,4,5].map(g=>r.jsx("button",{className:`rate-opt ${o[j.id]===g?"on":""} ${o[j.id]===g?"":"rate-lg"}`,style:{padding:"16px 2px"},onClick:()=>f(g),children:g},g))}),r.jsxs("div",{className:"rate-caption",children:[r.jsx("span",{children:"Not at all"}),r.jsx("span",{children:"Somewhat"}),r.jsx("span",{children:"Very much"})]})]})]},j.id),r.jsxs("div",{className:"row mt-3",children:[r.jsxs(z,{variant:"secondary",size:"sm",disabled:a===0,onClick:()=>i(g=>g-1),children:[r.jsx(zr,{})," Back"]}),a<s.questions.length-1&&r.jsxs(z,{variant:"ghost",size:"sm",onClick:()=>i(g=>g+1),children:["Skip for now ",r.jsx(Je,{})]}),r.jsx("span",{className:"spacer"}),w>=Math.ceil(s.questions.length*.9)&&r.jsx(z,{size:"sm",disabled:d,onClick:u,children:d?r.jsx(st,{}):r.jsxs(r.Fragment,{children:["Complete assessment ",r.jsx(se,{})]})})]}),r.jsx("div",{className:"mt-3",children:p?r.jsxs(_,{className:"card-2",children:[r.jsx("strong",{className:"small",children:"Auto-fill with a persona"}),r.jsx("p",{className:"tiny faint mb-2",children:"For reviewers who want to reach the results instantly."}),r.jsx("div",{className:"row",children:[["tech","\u{1F4BB} Tech-inclined"],["healer","\u{1FA7A} Care-oriented"],["creator","\u{1F3A8} Creative"],["leader","\u{1F4C8} Business/leader"]].map(([g,S])=>r.jsx("span",{className:"chip",onClick:()=>h(g),children:S},g))})]}):r.jsx("button",{className:"btn btn-ghost btn-sm",onClick:()=>v(!0),children:"\u26A1 In a hurry? (demo auto-fill)"})}),r.jsx("p",{className:"tiny faint center mt-3",children:"Your answers autosave. No timers \u2014 this is about honesty, not speed."})]})}function yv({results:e}){const t=Object.entries(e.riasec).sort((s,l)=>l[1]-s[1]),n=t.slice(0,2).map(([s])=>s).join(" + ");return r.jsxs("div",{className:"assessment-wrap",children:[r.jsxs("div",{className:"center mb-3",children:[r.jsx("div",{className:"eyebrow",children:"Assessment complete"}),r.jsxs("h1",{style:{fontSize:"1.7rem"},children:["Your profile: ",n]}),r.jsx("p",{className:"small",children:"Top two traits shape your strongest matches \u2014 but every dimension counts."})]}),r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Personality (RIASEC)"}),r.jsx("div",{className:"stack",style:{gap:10},children:t.map(([s,l])=>r.jsxs("div",{className:"row",style:{gap:12},children:[r.jsxs("div",{style:{width:200,flex:"none"},children:[r.jsx("strong",{className:"small",children:Nc[s][0]}),r.jsx("div",{className:"tiny faint",children:Nc[s][1]})]}),r.jsx("div",{style:{flex:1},children:r.jsx(cn,{value:l})}),r.jsx("strong",{className:"small",style:{width:34,textAlign:"right"},children:l})]},s))})]}),r.jsxs(_,{className:"mt-3",children:[r.jsx("h3",{className:"mb-2",children:"Aptitude"}),r.jsx("div",{className:"row",style:{gap:14},children:Object.entries(e.aptitude).map(([s,l])=>r.jsx("div",{className:"center",style:{flex:1},children:r.jsx(gl,{score:Math.round(l*100),size:70,label:vv[s]})},s))}),r.jsx("p",{className:"tiny faint mt-2",children:"A short snapshot, not an IQ test \u2014 it feeds the skill-gap check in your matches."})]}),r.jsx("div",{className:"row mt-3",children:r.jsxs(z,{size:"lg",as:"a",href:"/app/results",children:["See my career matches ",r.jsx(Je,{})]})}),r.jsx("p",{className:"tiny faint center mt-2",children:"Your answers stay on record \u2014 matches and roadmaps build on this profile."})]})}function ih({order:e,onDone:t,onClose:n}){const{toast:s}=ee(),[l,a]=x.useState("upi"),[i,o]=x.useState(""),[c,d]=x.useState(!1);if(!e)return null;const m=async p=>{d(!0),await new Promise(v=>setTimeout(v,1400));try{(await $("/api/payments/verify",{orderId:e.orderId,success:p,providerRef:e.providerRef})).status==="paid"?(s(`Payment of \u20B9${e.amount} successful (test mode) \u2014 full report unlocked!`),t==null||t(!0)):(s("Payment failed \u2014 nothing was charged. You can retry.","err"),t==null||t(!1))}catch(v){s(v.message,"err")}finally{d(!1)}};return r.jsx(Wr,{open:!0,onClose:n,title:r.jsxs("span",{children:["Checkout \xB7 ",r.jsx("span",{style:{color:"var(--faint)",fontWeight:400,fontSize:".85rem"},children:"Test mode"})]}),children:r.jsxs("div",{className:"checkout-sheet",style:{maxWidth:"none",boxShadow:"none"},children:[r.jsxs("div",{className:"checkout-top",children:[r.jsx("div",{style:{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center"},children:"\u26A1"}),r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{style:{fontSize:".78rem",opacity:.8},children:"Career Compass \xB7 Career Compass Test Payments"}),r.jsxs("div",{className:"checkout-amount",children:["\u20B9",e.amount.toLocaleString("en-IN")]})]}),r.jsx("div",{className:"tiny",style:{opacity:.7},children:e.comp?`Code ${e.comp.code} applied (\u2212${e.comp.percent_off}%)`:"Roadmap report"})]}),r.jsxs("div",{style:{padding:18},children:[r.jsxs("div",{className:"tabs mb-2",children:[r.jsx("button",{className:l==="upi"?"on":"",onClick:()=>a("upi"),children:"UPI"}),r.jsx("button",{className:l==="card"?"on":"",onClick:()=>a("card"),children:"Card"})]}),l==="upi"&&r.jsxs("div",{className:"field",children:[r.jsx("label",{children:"UPI ID"}),r.jsx("input",{className:"input upi-id",placeholder:"yourname@upi",value:i,onChange:p=>o(p.target.value)}),r.jsx("div",{className:"hint",children:"Any ID works in test mode \u2014 try student@upi"}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("div",{className:"chip",children:"GPay"}),r.jsx("div",{className:"chip",children:"PhonePe"}),r.jsx("div",{className:"chip",children:"Paytm"}),r.jsx("div",{className:"chip",children:"BHIM"})]})]}),l==="card"&&r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"field",children:[r.jsx("label",{children:"Card number"}),r.jsx("input",{className:"input",placeholder:"4111 1111 1111 1111",defaultValue:"4111 1111 1111 1111"})]}),r.jsxs("div",{className:"grid-2",children:[r.jsxs("div",{className:"field",children:[r.jsx("label",{children:"Expiry"}),r.jsx("input",{className:"input",placeholder:"12/28",defaultValue:"12/28"})]}),r.jsxs("div",{className:"field",children:[r.jsx("label",{children:"CVV"}),r.jsx("input",{className:"input",placeholder:"\u2022\u2022\u2022",defaultValue:"123",type:"password"})]})]})]}),c?r.jsxs("div",{className:"center mt-3",style:{padding:22},children:[r.jsx(st,{}),r.jsx("p",{className:"small mt-2",children:l==="upi"?"Waiting for UPI approval\u2026":"Authorising card\u2026"})]}):r.jsxs(r.Fragment,{children:[r.jsxs("button",{className:"btn btn-primary btn-block btn-lg mt-3",onClick:()=>m(!0),disabled:l==="upi"&&i.trim().length<3,children:[r.jsx(Fr,{})," Pay \u20B9",e.amount.toLocaleString("en-IN")]}),r.jsx("button",{className:"btn btn-ghost btn-sm btn-block mt-1",onClick:()=>m(!1),children:"Simulate a failed payment"}),r.jsx("p",{className:"tiny faint center mt-2",children:"Simulated by the mock payment adapter \xB7 no real money moves \xB7 switch PAYMENT_PROVIDER=razorpay with live keys for production"})]})]})]})})}function gv(){var u;const{user:e,refresh:t}=Se(),{toast:n}=ee(),[s,l]=x.useState(null),[a,i]=x.useState(!1),[o,c]=x.useState(null),[d,m]=x.useState(null),[p,v]=x.useState(""),y=async()=>{try{l(await W("/api/recommendations"))}catch(h){l({error:h.message})}};if(x.useEffect(()=>{y()},[]),s!=null&&s.error)return r.jsx(we,{title:"Complete your assessment first",body:s.error,action:r.jsx(z,{as:"a",href:"/app/assessment",children:"Go to assessment"})});if(!s)return r.jsxs("div",{className:"stack",children:[r.jsx(V,{}),r.jsx(V,{}),r.jsx(V,{})]});const j=async()=>{var h;i(!0);try{const g=await $("/api/recommendations/generate");n(`${g.count} matches generated${(h=g.aiModes)!=null&&h.includes("fallback")?" (AI fallback mode)":""}.`),await y()}catch(g){n(g.message,"err")}finally{i(!1)}},w=async h=>{try{const g=await $("/api/payments/order",h?{compCode:p.trim().toUpperCase()}:{});m(g)}catch(g){n(g.message,"err")}},N=async()=>{try{const h=await $("/api/payments/comp",{code:p.trim().toUpperCase()});h.unlocked?(n("Code applied \u2014 full report unlocked!"),await t(),await y()):n(`Code applied \u2014 pay \u20B9${h.amountDue} to unlock.`)}catch(h){n(h.message,"err")}},f=s.has_any;return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Your matches"}),r.jsxs("h1",{style:{fontSize:"1.6rem"},children:["Careers that fit ",(u=e==null?void 0:e.name)==null?void 0:u.split(" ")[0]]}),r.jsx("p",{className:"small",children:"Top 3 + 2 wildcards. Converge, don\'t overwhelm \u2014 one roadmap beats fifty browser tabs."})]}),r.jsx("span",{className:"spacer"}),f&&!a&&r.jsxs(z,{variant:"secondary",size:"sm",onClick:j,children:[r.jsx($r,{})," Recompute"]})]}),!f&&r.jsx(we,{icon:r.jsx(An,{width:44,height:44}),title:a?"Computing your matches\u2026":"Ready when you are",body:a?"Layer 1 (deterministic) + Layer 2 (narrative) are working on your profile.":"Generate your personalised matches from the assessment you just completed.",action:r.jsx(z,{size:"lg",disabled:a,onClick:j,children:a?r.jsx(st,{}):r.jsxs(r.Fragment,{children:["Generate my matches ",r.jsx(An,{})]})})}),f&&s.matches.map(h=>r.jsx(jv,{m:h,paid:s.paid,onWhy:()=>c(h),onPaid:y},h.id)),f&&!s.paid&&r.jsx(_,{style:{border:"2px solid var(--brand)"},children:r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsx(Yi,{style:{color:"var(--brand)",marginTop:3}}),r.jsxs("div",{style:{flex:1,minWidth:220},children:[r.jsx("h3",{children:"Unlock your full report \u2014 \u20B9499 once"}),r.jsx("p",{className:"small mt-1",children:"All matches with full reasoning \xB7 your personal roadmap \xB7 PDF export \xB7 parent sharing \xB7 mentor access \xB7 check-ins."}),r.jsx("div",{className:"row mt-2",children:r.jsxs(z,{onClick:()=>w(!1),children:[r.jsx(Fr,{})," Pay \u20B9499 (test mode)"]})}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("input",{className:"input",style:{maxWidth:200},placeholder:"Comp code (try EARLY100)",value:p,onChange:h=>v(h.target.value)}),r.jsx(z,{variant:"secondary",size:"sm",onClick:N,children:"Apply code"})]}),r.jsx("p",{className:"tiny faint mt-2",children:"Charged from day one on purpose: if a trusted roadmap isn\'t worth \u20B9499, we\'d rather learn that now."})]})]})}),d&&r.jsx(ih,{order:d,onClose:()=>m(null),onDone:async h=>{h&&(await t(),await y()),m(null)}}),o&&r.jsx(wv,{m:o,onClose:()=>c(!1),onChanged:y})]})}function jv({m:e,paid:t,onWhy:n,onPaid:s}){var d,m;const{toast:l}=ee(),[a,i]=x.useState(e.your_feedback||0);if(e.pending)return r.jsx(_,{className:"match-card",children:r.jsxs("div",{className:"row",children:[r.jsx(rt,{style:{color:"var(--warn)"}}),r.jsxs("div",{children:[r.jsx("div",{className:"match-title",children:"A match is under counsellor review"}),r.jsx("p",{className:"small",children:"This recommendation includes a high-impact step (like a stream change or gap-year consideration), so a human checks it before you see it. That\'s the trust layer working."})]})]})});const o=async p=>{const v=a===p?0:p;if(i(v),v!==0)try{await $(`/api/recommendations/${e.id}/feedback`,{thumbs:v}),l(v===1?"Noted \u2014 the engine will weight this career higher next time.":"Noted \u2014 the engine will steer away from this. Honest signals beat polite nods."),s==null||s()}catch(y){l(y.message,"err")}},c=async()=>{const p=window.prompt("What looks wrong? (a counsellor will review)");if(p!=null)try{await $(`/api/recommendations/${e.id}/flag`,{reason:p}),l("Flagged \u2014 thank you. Trust is the product.")}catch(v){l(v.message,"err")}};return r.jsxs(_,{className:"match-card",children:[e.kind==="wildcard"&&r.jsx("div",{className:"row",children:r.jsxs(L,{tone:"accent",children:[r.jsx(An,{})," Wildcard \u2014 a direction worth one honest look"]})}),r.jsxs("div",{className:"match-head",children:[r.jsx(gl,{score:e.match_score}),r.jsxs("div",{style:{flex:1,minWidth:180},children:[r.jsxs("div",{className:"row",children:[r.jsxs("span",{className:"faint small",style:{fontWeight:700},children:["#",e.rank]}),r.jsx("div",{className:"match-title",children:e.career.title})]}),r.jsxs("div",{className:"row mt-1",children:[r.jsx(lv,{level:e.confidence}),r.jsxs(L,{tone:"muted",children:[e.career.growth," outlook"]}),e.career.emerging===1&&r.jsx(L,{tone:"info",children:"Emerging"})]})]}),r.jsx("div",{style:{textAlign:"right"},className:"tiny faint",children:(d=e.career.education)==null?void 0:d[0]})]}),e.locked?r.jsxs("div",{style:{position:"relative"},children:[r.jsx("div",{className:"locked-veil",children:r.jsx("div",{className:"why-box",children:"Your enjoyment of Mathematics and Computer Science maps directly onto this career\'s core work. It also lines up with your goals of working with technology and strong earnings. The typical route is B.Tech Computer Science & Engineering via JEE Main, with entry salaries of \u20B94\u201312 LPA and a strong growth outlook\u2026"})}),r.jsx("div",{className:"paywall-overlay",children:r.jsxs("div",{className:"center",children:[r.jsx(Yi,{width:26,height:26,style:{color:"var(--brand)"}}),r.jsx("div",{style:{fontWeight:700},children:"Unlock the full report"}),r.jsx("div",{className:"tiny muted",children:"\u20B9499 once \xB7 every match, fully explained"})]})})]}):r.jsxs(r.Fragment,{children:[r.jsx("div",{className:"why-box",children:e.rationale}),r.jsx("div",{className:"row",style:{gap:8},children:(m=e.evidence)==null?void 0:m.slice(0,2).map((p,v)=>r.jsxs("span",{className:"source-tag",children:[r.jsx(rt,{width:12,height:12})," ",p.fact.slice(0,60),"\u2026 \xB7 as of ",new Date(p.as_of).toLocaleDateString("en-IN",{month:"short",year:"numeric"})]},v))})]}),r.jsxs("div",{className:"row",children:[!e.locked&&r.jsxs(z,{variant:"secondary",size:"sm",onClick:n,children:[r.jsx(Gi,{})," Why this recommendation?"]}),r.jsxs(z,{as:"a",href:`/app/explore/careers/${e.career.slug}`,variant:"ghost",size:"sm",children:["Explore ",r.jsx(Je,{})]}),r.jsx("span",{className:"spacer"}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34,borderColor:a===1?"var(--success)":void 0,color:a===1?"var(--success)":void 0},title:"This fits",onClick:()=>o(1),children:r.jsx(nv,{width:15,height:15})}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34,borderColor:a===-1?"var(--danger)":void 0,color:a===-1?"var(--danger)":void 0},title:"This doesn\'t fit",onClick:()=>o(-1),children:r.jsx(rv,{width:15,height:15})}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34},title:"Flag for review",onClick:c,children:r.jsx(th,{width:15,height:15})})]})]})}function wv({m:e,onClose:t,onChanged:n}){var s,l;return r.jsx(Wr,{open:!0,onClose:t,title:`Why ${e.career.title}?`,wide:!0,children:r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"alert alert-info",children:[r.jsx(Ur,{}),r.jsx("div",{children:"Every factor that moved this match, in plain language. The same log is stored server-side \u2014 you can export it with your data anytime."})]}),(s=e.decision_log)==null?void 0:s.map((a,i)=>r.jsxs("div",{className:"log-item",children:[r.jsx("span",{className:"log-label",children:a.label}),r.jsx("span",{className:"small",children:a.detail})]},i)),r.jsx("div",{className:"divider"}),r.jsx("h3",{children:"Evidence behind the facts"}),(l=e.evidence)==null?void 0:l.map((a,i)=>r.jsxs("div",{className:"log-item",children:[r.jsx("span",{className:"small",children:a.fact}),r.jsx(qt,{source:a.source,asOf:a.as_of})]},i)),r.jsx("p",{className:"tiny faint",children:"Guidance, not a verdict \u2014 test it with a mentor conversation and your own research."})]})})}const Nv=[{id:"careers",label:"Careers",icon:lh},{id:"courses",label:"Courses",icon:Qs},{id:"colleges",label:"Colleges",icon:Xi},{id:"exams",label:"Exams",icon:xl}],Ya="cc-compare";function kv(){const[e,t]=x.useState("careers"),[n,s]=x.useState(""),[l,a]=x.useState(""),[i,o]=x.useState(1),[c,d]=x.useState(null),[m,p]=x.useState(()=>JSON.parse(localStorage.getItem(Ya)||"{}")),{user:v}=Se();x.useEffect(()=>{d(null),a(""),o(1);const N=new URLSearchParams;n&&N.set("search",n),l&&e==="careers"&&N.set("stream",l),l&&e==="colleges"&&N.set("type",l),l&&e==="exams"&&N.set("level",l),N.set("page",String(i)),W(`/api/catalog/${e}?${N}`).then(d).catch(()=>d({items:[]}))},[e,n,l,i]);const y=(N,f)=>{p(u=>{const h=(u[e]||[]).filter(S=>S.slug!==N),g={...u,[e]:[...h,{slug:N,title:f}].slice(-3)};return localStorage.setItem(Ya,JSON.stringify(g)),g})},j=m[e]||[],w={careers:["Science","Commerce","Arts"],colleges:["IIT","NIT","IIIT","AIIMS","National Law University","Central University","Private","Government"],exams:["National","Institute","State"],courses:[]}[e];return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Knowledge base"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Explore & compare"}),r.jsx("p",{className:"small",children:"Every fact carries a source and an as-of date. Stale facts get flagged \u2014 by you and by us."})]}),r.jsx("div",{className:"tabs",children:Nv.map(N=>r.jsx("button",{className:e===N.id?"on":"",onClick:()=>t(N.id),children:N.label},N.id))}),r.jsxs("div",{className:"row",children:[r.jsxs("div",{style:{position:"relative",flex:1,minWidth:200},children:[r.jsx(Qi,{style:{position:"absolute",left:12,top:12,color:"var(--faint)"}}),r.jsx("input",{className:"input",style:{paddingLeft:38},placeholder:`Search ${e}\u2026`,value:n,onChange:N=>s(N.target.value)})]}),w.length>0&&r.jsxs("select",{className:"input",style:{maxWidth:210},value:l,onChange:N=>a(N.target.value),children:[r.jsxs("option",{value:"",children:["All ",e==="careers"?"streams":"types"]}),w.map(N=>r.jsx("option",{value:N,children:N},N))]}),j.length>=2&&r.jsxs(z,{as:"a",href:`/app/compare/${e}`,size:"sm",variant:"secondary",children:[r.jsx(Ys,{})," Compare (",j.length,")"]})]}),c?r.jsxs(r.Fragment,{children:[r.jsxs("p",{className:"tiny faint",children:[c.total," ",e," ",c.pages>1&&`\xB7 page ${c.page}/${c.pages}`]}),r.jsx("div",{className:"grid-2",children:c.items.map(N=>{const f=j.some(u=>u.slug===N.slug);return r.jsxs(_,{className:"step-card",style:{cursor:"pointer"},onClick:()=>window.location.href=`/app/explore/${e}/${N.slug}`,children:[r.jsxs("div",{className:"row",children:[e==="careers"&&r.jsx("strong",{style:{fontSize:"1.02rem"},children:N.title}),e!=="careers"&&r.jsx("strong",{style:{fontSize:"1.02rem"},children:N.name}),r.jsx("span",{className:"spacer"}),N.your_match!=null&&r.jsxs(L,{tone:"brand",children:[Math.round(N.your_match),"% match"]}),N.emerging===1&&r.jsx(L,{tone:"info",children:"Emerging"})]}),r.jsxs("p",{className:"small",children:[(N.summary||N.about||`${N.city||""} ${N.type||""}`).slice(0,110),"\u2026"]}),r.jsxs("div",{className:"row",style:{gap:6},children:[e==="careers"&&r.jsx(L,{tone:"muted",children:N.salary_entry}),e==="colleges"&&r.jsx(L,{tone:"muted",children:N.city}),e==="exams"&&r.jsx(L,{tone:"muted",children:N.conducted_by}),e==="courses"&&r.jsx(L,{tone:"muted",children:N.duration})]}),r.jsxs("div",{className:"row",style:{marginTop:"auto",paddingTop:8},children:[r.jsx(qt,{source:N.source,asOf:N.as_of}),r.jsx("span",{className:"spacer"}),r.jsxs("button",{className:`chip ${f?"on":""}`,style:{padding:"4px 10px",fontSize:".74rem"},onClick:u=>{u.stopPropagation(),y(N.slug,N.title||N.name)},children:[r.jsx(Ys,{width:12,height:12})," ",f?"Added":"Compare"]})]})]},N.slug)})}),c.items.length===0&&r.jsx(we,{title:"Nothing found",body:"Try a different search or filter."}),c.pages>1&&r.jsx("div",{className:"row",style:{justifyContent:"center"},children:r.jsx(z,{variant:"secondary",size:"sm",disabled:c.page<=1,onClick:()=>{}})})]}):r.jsxs("div",{className:"stack",children:[r.jsx(V,{}),r.jsx(V,{}),r.jsx(V,{})]})]})}function Sv(){var m,p,v,y,j,w,N;const{type:e,slug:t}=bi(),{user:n}=Se(),{toast:s}=ee(),[l,a]=x.useState(null),[i,o]=x.useState(!1);if(x.useEffect(()=>{W(`/api/catalog/${e}/${t}`).then(f=>{a(f.item),o(!!f.item.favourited)}).catch(()=>a(null))},[e,t]),l===null)return r.jsxs("div",{className:"stack",children:[r.jsx(V,{h:200}),r.jsx(V,{h:120})]});if(l===!1)return r.jsx(we,{title:"Not found",body:"That page isn\'t in the knowledge base.",action:r.jsx(z,{as:"a",href:"/app/explore",children:"Back to Explore"})});const c=async()=>{if(n)try{i?await Jd(`/api/catalog/favourites/${e==="careers"?"career":e==="colleges"?"college":"exam"}/${l.id}`):await $("/api/catalog/favourites",{entity_type:e==="careers"?"career":e==="colleges"?"college":"exam",entity_id:l.id}),o(!i),s(i?"Removed from favourites.":"Saved \u2014 favourites nudge your future matches.")}catch(f){s(f.message,"err")}},d=l.title||l.name;return r.jsxs("div",{className:"stack",children:[r.jsxs(K,{to:"/app/explore",className:"btn btn-ghost btn-sm",style:{alignSelf:"flex-start"},children:[r.jsx(zr,{})," Explore"]}),r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{className:"eyebrow",children:e}),r.jsx("h1",{style:{fontSize:"1.6rem"},children:d}),r.jsxs("div",{className:"row mt-1",children:[e==="careers"&&r.jsxs(r.Fragment,{children:[r.jsxs(L,{tone:"muted",children:["Entry: ",l.salary_entry]}),r.jsxs(L,{tone:"muted",children:["Senior: ",l.salary_senior]}),r.jsxs(L,{tone:l.growth==="high"?"success":"brand",children:[l.growth," outlook"]}),l.streams.map(f=>r.jsx(L,{tone:"brand",children:f},f))]}),e==="colleges"&&r.jsxs(r.Fragment,{children:[r.jsxs(L,{tone:"muted",children:[l.city,", ",l.state]}),r.jsx(L,{tone:"brand",children:l.type}),r.jsxs(L,{tone:"muted",children:["\u2248 ",l.approx_fees_per_year,"/yr"]})]}),e==="exams"&&r.jsxs(r.Fragment,{children:[r.jsx(L,{tone:"brand",children:l.conducted_by}),r.jsx(L,{tone:"muted",children:l.level}),l.streams.map(f=>r.jsx(L,{tone:"muted",children:f},f))]}),e==="courses"&&r.jsxs(r.Fragment,{children:[r.jsx(L,{tone:"brand",children:l.level}),r.jsx(L,{tone:"muted",children:l.duration})]})]})]}),(e==="careers"||e==="colleges")&&n&&r.jsx("button",{className:"icon-btn",onClick:c,title:i?"Remove favourite":"Save to favourites",style:i?{color:"var(--accent)",borderColor:"var(--accent)"}:{},children:r.jsx(eh,{})})]}),r.jsxs(_,{children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(Ur,{style:{color:"var(--brand-2)"}}),r.jsx("h3",{children:"Overview"})]}),r.jsx("p",{style:{color:"var(--ink)"},children:l.summary||l.about}),e==="careers"&&r.jsxs("p",{className:"small mt-2",children:[r.jsx("strong",{children:"A day in the life:"})," ",l.day_in_life]}),r.jsx("div",{className:"mt-2",children:r.jsx(qt,{source:l.source,asOf:l.as_of})})]}),e==="careers"&&r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"grid-2",children:[r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Key skills"}),r.jsx("div",{className:"row",children:l.skills.map(f=>r.jsx("span",{className:"chip",children:f},f))})]}),r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Subjects that feed this path"}),r.jsx("div",{className:"row",children:Object.keys(l.subjects).map(f=>r.jsx("span",{className:"chip",children:f},f))})]})]}),((m=l.exams_detail)==null?void 0:m.length)>0&&r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Entrance exams"}),r.jsx("div",{className:"stack",style:{gap:8},children:l.exams_detail.map(f=>{var u,h;return r.jsxs(K,{to:`/app/explore/exams/${f.slug}`,className:"card-2 card-pad row",style:{textDecoration:"none"},children:[r.jsx(xl,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:f.name}),r.jsxs("div",{className:"tiny muted",children:[f.conducted_by," \xB7 apply ",(u=f.timeline)==null?void 0:u.application_window," \xB7 exam ",(h=f.timeline)==null?void 0:h.exam_months]})]}),r.jsx(qt,{source:f.source,asOf:f.as_of})]},f.slug)})})]}),((p=l.courses)==null?void 0:p.length)>0&&r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Typical courses"}),r.jsx("div",{className:"row",children:l.courses.map(f=>r.jsx(K,{to:`/app/explore/courses/${f.slug}`,className:"chip",children:f.name},f.slug))})]}),((v=l.colleges)==null?void 0:v.length)>0&&r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Colleges to consider"}),r.jsx("div",{className:"stack",style:{gap:8},children:l.colleges.map(f=>r.jsxs(K,{to:`/app/explore/colleges/${f.slug}`,className:"card-2 card-pad row",style:{textDecoration:"none"},children:[r.jsx(Xi,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:f.name}),r.jsxs("div",{className:"tiny muted",children:[f.city," \xB7 ",f.type," \xB7 \u2248 ",f.approx_fees_per_year,"/yr"]})]}),r.jsx(qt,{source:f.source,asOf:f.as_of})]},f.slug))})]})]}),e==="exams"&&r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Timeline"}),r.jsx("div",{className:"grid-3",children:[["Applications",(y=l.timeline)==null?void 0:y.application_window],["Exam",(j=l.timeline)==null?void 0:j.exam_months],["Results",(w=l.timeline)==null?void 0:w.result_months],["Attempts",(N=l.timeline)==null?void 0:N.attempts]].map(([f,u])=>r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",style:{fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"},children:f}),r.jsx("strong",{children:u||"\u2014"})]},f))}),r.jsx("p",{className:"tiny faint mt-2",children:"Always confirm on the official website \u2014 exam bodies shuffle dates."})]})]})}function Cv(){const{type:e}=bi();Vn();const[t,n]=x.useState(null),l=JSON.parse(localStorage.getItem(Ya)||"{}")[e]||[];if(x.useEffect(()=>{l.length>=2?$("/api/catalog/compare",{type:e,ids:l.map(i=>i.slug)}).then(n).catch(()=>{}):n({items:[]})},[e]),!t)return r.jsx("div",{className:"stack",children:r.jsx(V,{h:160})});if(t.items.length<2)return r.jsx(we,{title:"Pick 2\u20133 items to compare",body:"Go back to Explore and tap \'Compare\' on the cards you want side by side.",action:r.jsx(z,{as:"a",href:"/app/explore",children:"Back to Explore"})});const a={careers:[["Summary",i=>i.summary],["Entry salary",i=>i.salary_entry],["Senior salary",i=>i.salary_senior],["Outlook",i=>i.growth],["Streams",i=>(i.streams||[]).join(", ")],["Core skills",i=>(i.skills||[]).join(", ")],["Typical route",i=>(i.education||[])[0]||"\u2014"],["Entrance exams",i=>(i.exams||[]).join(", ")||"\u2014"],["Day in the life",i=>i.day_in_life]],colleges:[["City",i=>`${i.city}, ${i.state}`],["Type",i=>i.type],["Approx fees/yr",i=>i.approx_fees_per_year],["Entrance",i=>(i.entrance_exams||[]).join(", ")]]}[e]||[["About",i=>i.about],["Level",i=>i.level],["Duration",i=>i.duration]];return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",children:[r.jsxs(K,{to:"/app/explore",className:"btn btn-ghost btn-sm",children:[r.jsx(zr,{})," Explore"]}),r.jsxs("h2",{style:{fontSize:"1.3rem"},children:["Compare ",e]})]}),r.jsx(_,{pad:!1,style:{overflowX:"auto"},children:r.jsxs("table",{className:"timeline-table",style:{minWidth:640},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{}),t.items.map(i=>r.jsx("th",{style:{minWidth:190},children:i.title||i.name},i.slug))]})}),r.jsxs("tbody",{children:[a.map(([i,o])=>r.jsxs("tr",{children:[r.jsx("td",{style:{color:"var(--muted)",fontWeight:600,fontSize:".8rem"},children:i}),t.items.map(c=>r.jsx("td",{children:o(c)},c.slug))]},i)),r.jsxs("tr",{children:[r.jsx("td",{style:{color:"var(--muted)",fontWeight:600,fontSize:".8rem"},children:"Verified"}),t.items.map(i=>r.jsx("td",{children:r.jsx(qt,{source:i.source,asOf:i.as_of})},i.slug))]})]})]})}),r.jsx("div",{className:"row",children:t.items.map(i=>r.jsxs(z,{size:"sm",variant:"ghost",as:"a",href:`/app/explore/${e}/${i.slug}`,children:["Open ",i.title||i.name," ",r.jsx(Je,{})]},i.slug))})]})}function Ev(){const{user:e,refresh:t}=Se(),{toast:n}=ee(),[s,l]=x.useState(null),[a,i]=x.useState(null),[o,c]=x.useState(!1),[d,m]=x.useState(null),p=x.useRef(null),v=async()=>{try{const w=await W("/api/roadmap");l(w),w.roadmap&&["queued","generating"].includes(w.roadmap.status)&&(clearTimeout(p.current),p.current=setTimeout(v,1500))}catch(w){l({error:w.message})}};x.useEffect(()=>(v(),()=>clearTimeout(p.current)),[]);const y=async()=>{try{const w=await $("/api/payments/order",{});m(w)}catch(w){n(w.message,"err")}};if(!s)return r.jsxs("div",{className:"stack",children:[r.jsx(V,{h:120}),r.jsx(V,{}),r.jsx(V,{})]});if(s.error)return r.jsx(we,{title:s.error,action:r.jsx(z,{as:"a",href:"/app/assessment",children:"Go to assessment"})});const j=s.roadmap;return j?j.status==="failed"?r.jsx(we,{icon:r.jsx(yl,{width:42,height:42}),title:"Generation failed",body:j.error||"Something broke while building your roadmap.",action:r.jsxs(z,{onClick:async()=>{await $("/api/roadmap/retry"),v()},children:[r.jsx($r,{})," Retry"]})}):j.status!=="ready"?r.jsx(Tv,{status:j.status}):j.under_review?r.jsxs(_,{className:"center",style:{padding:44},children:[r.jsx(rt,{width:44,height:44,style:{color:"var(--warn)"}}),r.jsx("h2",{className:"mt-2",children:"Your roadmap is with a counsellor"}),r.jsx("p",{className:"small mt-1",style:{maxWidth:420,margin:"8px auto 0"},children:"It includes a high-impact step \u2014 a timeline or stream decision with real consequences \u2014 so a human reviews it before it reaches you. This is the trust layer doing its job; it usually completes within a few hours."}),r.jsx(L,{tone:"warn",className:"mt-3",children:"Under review"})]}):r.jsx(Mv,{rm:j,checkins:s.checkins||[],reload:v}):r.jsxs(r.Fragment,{children:[r.jsx(_v,{onPick:()=>c(!0),paid:!!(e!=null&&e.paid_unlock),onPay:y}),r.jsx(Pv,{open:o,onClose:()=>c(!1),onGenerated:v,recs:a,setRecs:i}),d&&r.jsx(ih,{order:d,onClose:()=>m(null),onDone:async w=>{w&&await t(),m(null)}})]})}function _v({onPick:e,paid:t,onPay:n}){return r.jsx(we,{icon:r.jsx(Ft,{width:44,height:44}),title:t?"Create your personal roadmap":"The roadmap lives in the full report",body:t?"Pick the career you want to pursue \u2014 we turn it into dated milestones, an exam timeline, free resources, and a Plan B.":"Your roadmap \u2014 milestones, exam timeline, resources, PDF export and parent sharing \u2014 unlocks with the \u20B9499 full report.",action:t?r.jsxs(z,{size:"lg",onClick:e,children:[r.jsx(Ft,{})," Build my roadmap"]}):r.jsxs(z,{size:"lg",onClick:n,children:[r.jsx(Fr,{})," Unlock full report \u2014 \u20B9499"]})})}function Pv({open:e,onClose:t,onGenerated:n,recs:s,setRecs:l}){const{toast:a}=ee(),[i,o]=x.useState(!1);x.useEffect(()=>{e&&!s&&W("/api/recommendations").then(l).catch(()=>l({matches:[]}))},[e]);const c=((s==null?void 0:s.matches)||[]).filter(m=>!m.pending&&m.kind==="primary"),d=async m=>{o(!0);try{await $("/api/roadmap/generate",{careerId:m}),a("Roadmap queued \u2014 generation takes ~5 seconds in this demo."),n(),t()}catch(p){a(p.message,"err")}finally{o(!1)}};return r.jsx(Wr,{open:e,onClose:t,title:"Which career are we planning for?",children:c.length===0?r.jsx("p",{className:"small",children:"Generate your matches first \u2014 the roadmap builds on one of your recommended careers."}):r.jsxs("div",{className:"stack",children:[c.map(m=>{var p;return r.jsxs("button",{className:"option-btn",disabled:i,onClick:()=>d(m.career.id),children:[r.jsx(ScoreRing,{score:m.match_score,size:44}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{children:m.career.title}),r.jsx("div",{className:"small muted",children:(p=m.career.education)==null?void 0:p[0]})]}),r.jsx(Je,{})]},m.id)}),r.jsx("p",{className:"tiny faint",children:"Not feeling them? Give a thumbs-down on the results page and recompute \u2014 the engine listens."})]})})}function Tv({status:e}){const t=[["queued","Roadmap queued","Waiting for a generation slot (non-urgent work is queued \u2014 this is how we survive result-day spikes)"],["generating","Generating your roadmap","Layer 2 is writing milestones from the knowledge base \u2014 exams, resources, dated steps"]],n=e==="generating"?1:0;return r.jsxs(_,{className:"center",style:{padding:48},children:[r.jsx(st,{}),r.jsx("h2",{className:"mt-3",style:{fontSize:"1.3rem"},children:t[n][1]}),r.jsx("p",{className:"small mt-1",style:{maxWidth:400,margin:"6px auto 0"},children:t[n][2]}),r.jsx("div",{className:"tiny faint mt-3",children:"Your report is being prepared \u2014 this page updates itself."})]})}function Mv({rm:e,checkins:t,reload:n}){const{toast:s}=ee(),[l,a]=x.useState({}),[i,o]=x.useState(!1),[c,d]=x.useState({enabled:e.share.enabled,url:e.share.url}),m=async(y,j)=>{try{await $("/api/roadmap/milestone",{milestoneIdx:y,stepIdx:j}),n()}catch(w){s(w.message,"err")}},p=async()=>{try{const y=await $("/api/roadmap/share",{enabled:!c.enabled});d({enabled:y.enabled,url:y.url}),s(y.enabled?"Share link active \u2014 send it to your parent.":"Sharing turned off.")}catch(y){s(y.message,"err")}},v=t.filter(y=>!y.read);return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{className:"row",style:{alignItems:"flex-start"},children:[r.jsxs("div",{children:[r.jsxs("div",{className:"eyebrow",children:["Your roadmap \xB7 target ",e.target_year]}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:e.career.title}),r.jsx("p",{className:"small",children:e.career.summary})]}),r.jsx("span",{className:"spacer"}),r.jsxs("div",{className:"no-print",style:{textAlign:"right"},children:[r.jsxs("div",{className:"tiny muted mb-1",children:[e.progress.done,"/",e.progress.total," steps done"]}),r.jsx("div",{style:{width:130},children:r.jsx(cn,{value:e.progress.done/Math.max(1,e.progress.total)*100})})]})]}),e.ai_mode==="fallback"&&r.jsxs("div",{className:"alert alert-warn no-print",children:[r.jsx(yl,{}),r.jsxs("div",{children:["Generated in ",r.jsx("strong",{children:"fallback mode"})," \u2014 the AI narrative layer was unavailable, so deterministic templates produced this roadmap. Nothing important is missing: Layer-1 scores and knowledge-base facts don\'t depend on the AI."]})]}),v.length>0&&r.jsx(zv,{checkin:v[0],onDone:n}),r.jsxs("div",{className:"row no-print",children:[r.jsxs(z,{size:"sm",variant:"secondary",onClick:()=>window.print(),children:[r.jsx(rh,{})," Export as PDF"]}),r.jsxs(z,{size:"sm",variant:"secondary",onClick:()=>o(!0),children:[r.jsx(Ks,{})," Share with parent"]}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:e.high_impact?"warn":"success",children:e.high_impact?"Counsellor-reviewed":"Standard plan"})]}),r.jsx("div",{className:"stack",children:e.milestones.map((y,j)=>r.jsxs(_,{pad:!1,className:"milestone",children:[r.jsxs("div",{className:"milestone-head",onClick:()=>a(w=>({...w,[j]:!w[j]})),children:[r.jsxs("div",{style:{flex:1},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:y.title}),y.high_impact&&r.jsx(L,{tone:"warn",children:"High impact \xB7 reviewed"})]}),r.jsxs("div",{className:"milestone-date",children:["by ",Lr(y.target_date)," \xB7 ",y.steps.filter(w=>w.done).length,"/",y.steps.length," steps"]})]}),l[j]===!1?r.jsx(jc,{style:{transform:"rotate(-90deg)"}}):r.jsx(jc,{})]}),l[j]!==!1&&r.jsxs("div",{style:{padding:"0 18px 16px"},children:[r.jsx("div",{className:"stack",style:{gap:8},children:y.steps.map((w,N)=>r.jsxs("div",{className:`check-item ${w.done?"done":""}`,onClick:()=>m(j,N),role:"checkbox","aria-checked":w.done,children:[r.jsx("span",{className:"checkbox",children:r.jsx(se,{})}),r.jsx("span",{className:"check-text small",children:w.text})]},N))}),y.note&&r.jsx("p",{className:"tiny faint mt-2",children:y.note})]})]},j))}),e.timeline.length>0&&r.jsxs(_,{pad:!1,style:{overflowX:"auto"},children:[r.jsx("div",{style:{padding:"16px 18px 0"},children:r.jsx("h3",{children:"Entrance exam timeline"})}),r.jsxs("table",{className:"timeline-table",style:{minWidth:560,margin:"10px 0"},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"Exam"}),r.jsx("th",{children:"Applications"}),r.jsx("th",{children:"Exam months"}),r.jsx("th",{children:"Results"}),r.jsx("th",{children:"Verified"})]})}),r.jsx("tbody",{children:e.timeline.map((y,j)=>r.jsxs("tr",{children:[r.jsxs("td",{children:[r.jsx("strong",{children:y.exam}),r.jsx("div",{className:"tiny faint",children:y.conducted_by})]}),r.jsx("td",{children:y.application_window}),r.jsx("td",{children:y.exam_months}),r.jsx("td",{children:y.result_months}),r.jsx("td",{className:"tiny faint",children:new Date(y.as_of).toLocaleDateString("en-IN",{month:"short",year:"numeric"})})]},j))})]}),r.jsx("p",{className:"tiny faint",style:{padding:"0 18px 14px"},children:"Dates verified as of generation \u2014 always confirm on official sites before applying."})]}),e.resources.length>0&&r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Free resources, picked for this path"}),r.jsx("div",{className:"stack",style:{gap:8},children:e.resources.map((y,j)=>r.jsxs("a",{className:"card-2 card-pad row",href:y.url,target:"_blank",rel:"noreferrer",style:{textDecoration:"none"},children:[r.jsx(Qs,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:y.label}),r.jsx("div",{className:"tiny faint",children:y.why})]}),r.jsx(Je,{width:15,height:15})]},j))})]}),r.jsx(Wr,{open:i,onClose:()=>o(!1),title:"Share with a parent (read-only)",children:r.jsxs("div",{className:"stack",children:[r.jsx("p",{className:"small",children:"Your parent sees your roadmap \u2014 nothing else. No account needed for them. You can turn this off anytime; every share is logged."}),c.enabled?r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"card-2 card-pad center",children:[r.jsx("div",{className:"tiny faint mb-1",children:"Share link"}),r.jsxs("code",{className:"small",style:{wordBreak:"break-all"},children:[window.location.origin,c.url]})]}),r.jsx(z,{variant:"secondary",block:!0,onClick:()=>{var y;return(y=navigator.clipboard)==null?void 0:y.writeText(window.location.origin+c.url).then(()=>s("Link copied!"))},children:"Copy link"}),r.jsxs(z,{variant:"ghost",block:!0,onClick:p,children:[r.jsx(Ki,{})," Stop sharing"]})]}):r.jsxs(z,{block:!0,onClick:p,children:[r.jsx(Ks,{})," Create share link"]})]})})]})}function zv({checkin:e,onDone:t}){const{toast:n}=ee(),[s,l]=x.useState("");return r.jsxs(_,{style:{border:"2px solid var(--accent)"},children:[r.jsxs("div",{className:"row",children:[r.jsx(Gs,{style:{color:"var(--accent)"}}),r.jsx("strong",{children:e.title}),r.jsx("span",{className:"spacer"}),r.jsx(L,{tone:"accent",children:"Check-in"})]}),r.jsx("p",{className:"small mt-1",children:e.body}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("input",{className:"input",style:{flex:1,minWidth:180},placeholder:"What did you act on? (one honest line)",value:s,onChange:a=>l(a.target.value)}),r.jsx(z,{size:"sm",onClick:async()=>{await $(`/api/roadmap/checkin/${e.id}`,{acted:s}),n("Check-in recorded \u2014 acting beats intending."),t()},children:"Log it"})]})]})}function Lv(){return r.jsx(Rv,{})}function Rv(){const[e,t]=x.useState("milestones");return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Keep momentum"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Your progress"}),r.jsx("p",{className:"small",children:"The plan only works if you work the plan. Check-ins keep you honest."})]}),r.jsx(qi,{tabs:[{id:"milestones",label:"Milestones"},{id:"checkins",label:"Check-ins"},{id:"favourites",label:"Favourites"},{id:"journal",label:"Decision journal"}],value:e,onChange:t}),e==="milestones"&&r.jsx(Iv,{}),e==="checkins"&&r.jsx(Ov,{}),e==="favourites"&&r.jsx(Dv,{}),e==="journal"&&r.jsx(Av,{})]})}function Iv(){const[e,t]=x.useState(null);if(x.useEffect(()=>{W("/api/roadmap").then(t)},[]),!e)return r.jsx(V,{h:140});const n=e.roadmap;if(!n||n.status!=="ready")return r.jsx(we,{title:"No roadmap yet",body:"Your milestones will live here once you build a roadmap.",action:r.jsx(z,{as:"a",href:"/app/roadmap",children:"Build roadmap"})});const s=Math.round(n.progress.done/Math.max(1,n.progress.total)*100);return r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsxs("div",{className:"row",children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{children:n.career.title}),r.jsxs("div",{className:"small muted",children:[n.progress.done," of ",n.progress.total," steps completed"]})]}),r.jsxs("div",{className:"stat",style:{textAlign:"right"},children:[r.jsxs("span",{className:"n",children:[s,"%"]}),r.jsx("span",{className:"l",children:"there"})]})]}),r.jsx("div",{className:"mt-2",children:r.jsx(cn,{value:s})})]}),r.jsx("div",{className:"row",children:r.jsxs(K,{to:"/app/roadmap",className:"card card-pad",style:{flex:1,minWidth:200,textDecoration:"none"},children:[r.jsx(Ft,{style:{color:"var(--brand-2)"}}),r.jsx("div",{className:"match-title",style:{fontSize:"1rem"},children:"Work on milestones"}),r.jsx("p",{className:"tiny faint",children:"Open the roadmap and tick steps off."})]})})]})}function Ov(){const[e,t]=x.useState(null);if(x.useEffect(()=>{W("/api/roadmap").then(t)},[]),!e)return r.jsx(V,{h:100});const n=e.checkins||[];return n.length?r.jsxs("div",{className:"stack",children:[n.map(s=>r.jsxs(_,{className:"row",style:{alignItems:"flex-start"},children:[r.jsx(Gs,{style:{color:s.read?"var(--faint)":"var(--accent)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:s.title}),!s.read&&r.jsx(L,{tone:"accent",children:"Due"})]}),r.jsx("p",{className:"small",children:s.body}),r.jsxs("div",{className:"tiny faint",children:["Due ",Ie(s.due_at)]})]}),!s.read&&r.jsx(z,{as:"a",href:"/app/roadmap",size:"sm",children:"Respond"})]},s.id)),r.jsx("p",{className:"tiny faint",children:"Check-ins are the product\'s honesty mechanism \u2014 they separate real action from politeness."})]}):r.jsx(we,{icon:r.jsx(Gs,{width:40,height:40}),title:"Check-ins appear after your roadmap",body:"Automated nudges at 2 weeks and 4 weeks: what did you act on, what\'s blocked?"})}function Dv(){const{toast:e}=ee(),[t,n]=x.useState(null),s=()=>W("/api/catalog/favourites/mine").then(n).catch(()=>n({favourites:[]}));if(x.useEffect(()=>{s()},[]),!t)return r.jsx(V,{h:100});if(!t.favourites.length)return r.jsx(we,{icon:r.jsx(eh,{width:40,height:40}),title:"Nothing saved yet",body:"Star careers and colleges while exploring \u2014 favourites nudge your future matches.",action:r.jsx(z,{as:"a",href:"/app/explore",children:"Explore"})});const l={career:"careers",college:"colleges"};return r.jsx("div",{className:"stack",children:t.favourites.map((a,i)=>r.jsxs(_,{className:"row",children:[a.entity_type==="career"?r.jsx(lh,{style:{color:"var(--brand-2)"}}):r.jsx(Xi,{style:{color:"var(--brand-2)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:a.item.title||a.item.name}),a.entity_type==="college"&&r.jsxs("div",{className:"tiny muted",children:[a.item.city," \xB7 ",a.item.type]})]}),r.jsx(z,{as:"a",href:`/app/explore/${l[a.entity_type]}/${a.item.slug}`,size:"sm",variant:"ghost",children:"Open"}),r.jsx("button",{className:"icon-btn",style:{width:34,height:34},onClick:async()=>{await Jd(`/api/catalog/favourites/${a.entity_type}/${a.item.id}`),e("Removed."),s()},children:r.jsx(sh,{width:14,height:14})})]},i))})}function Av(){const{toast:e}=ee(),[t,n]=x.useState(null),[s,l]=x.useState(""),a=()=>W("/api/profile/journal").then(o=>n(o.entries)).catch(()=>n([]));x.useEffect(()=>{a()},[]);const i=async()=>{s.trim().length<2||(await $("/api/profile/journal",{text:s}),l(""),e("Journaled."),a())};return r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Decision journal"}),r.jsx("p",{className:"small mb-2",children:"Write what you learned, what surprised you, what you\'re unsure about. Future-you (and mentor conversations) will thank you."}),r.jsxs("div",{className:"row",children:[r.jsx("input",{className:"input",style:{flex:1,minWidth:200},placeholder:"e.g. Talked to a data scientist \u2014 turns out 70% of her job is cleaning data\u2026",value:s,onChange:o=>l(o.target.value),onKeyDown:o=>o.key==="Enter"&&i()}),r.jsxs(z,{onClick:i,children:[r.jsx(nh,{})," Add"]})]})]}),(t||[]).map(o=>r.jsxs(_,{className:"row",style:{alignItems:"flex-start"},children:[r.jsx(Qs,{style:{color:"var(--faint)",marginTop:2}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("div",{className:"small",style:{color:"var(--ink)"},children:o.text}),r.jsx("div",{className:"tiny faint mt-1",children:Ie(o.created_at)})]})]},o.id)),t&&t.length===0&&r.jsx(we,{icon:r.jsx(Qs,{width:40,height:40}),title:"Empty journal",body:"Decisions written down are decisions half-made."})]})}function Fv(){const{toast:e}=ee(),[t,n]=x.useState(null),[s,l]=x.useState(""),[a,i]=x.useState(""),[o,c]=x.useState([]),[d,m]=x.useState(!1),p=()=>W("/api/mentor/questions").then(n).catch(()=>n({questions:[]}));x.useEffect(()=>{p(),W("/api/recommendations").then(y=>c(y.matches||[])).catch(()=>{})},[]);const v=async()=>{m(!0);try{const y=await $("/api/mentor/questions",{question:s,careerId:a||null});e(`Sent \u2014 a verified mentor answers within ${y.sla_hours}h.`),l(""),p()}catch(y){e(y.message,"err")}finally{m(!1)}};return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Ask-a-Professional"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Ask someone who actually does the job"}),r.jsx("p",{className:"small",children:"Brochures sell. Mentors tell. Verified professionals answer your questions within 48 hours."})]}),r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Your question"}),r.jsx("textarea",{className:"input",placeholder:"e.g. What does a bad day look like in your job? What would you do differently at 17?",value:s,onChange:y=>l(y.target.value)}),r.jsxs("div",{className:"row mt-2",children:[r.jsxs("select",{className:"input",style:{maxWidth:280},value:a,onChange:y=>i(y.target.value),children:[r.jsx("option",{value:"",children:"General question (no specific career)"}),o.filter(y=>!y.pending).map(y=>r.jsx("option",{value:y.career.id,children:y.career.title},y.id))]}),r.jsx("span",{className:"spacer"}),r.jsx(z,{disabled:d||s.trim().length<10,onClick:v,children:d?"Sending\u2026":r.jsxs(r.Fragment,{children:["Ask a mentor ",r.jsx($t,{})]})})]}),r.jsx("p",{className:"tiny faint mt-2",children:\'Be specific \u2014 "should I do X or Y and why" gets far better answers than "what should I do".\'})]}),t?t.questions.length===0?r.jsx(we,{icon:r.jsx($t,{width:40,height:40}),title:"No questions yet",body:"The best question is the one you\'re slightly afraid to ask. Ask it."}):r.jsx("div",{className:"stack",children:t.questions.map(y=>r.jsxs(_,{children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(L,{tone:y.status==="answered"?"success":y.sla_status==="overdue"?"danger":"brand",children:y.status==="answered"?"Answered":y.sla_status==="overdue"?"Overdue \u2014 we\'re on it":`Answer expected by ${Ie(y.sla_due_at)}`}),y.career_title&&r.jsx(L,{tone:"muted",children:y.career_title}),r.jsx("span",{className:"spacer"}),r.jsx("span",{className:"tiny faint",children:Ie(y.created_at)})]}),r.jsx("p",{style:{color:"var(--ink)",fontWeight:500},children:y.question}),y.answer&&r.jsxs("div",{className:"why-box mt-2",children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(Zi,{width:14,height:14,style:{color:"var(--brand-2)"}}),r.jsxs("strong",{className:"small",children:[y.mentor_name," \xB7 verified mentor"]})]}),r.jsx("p",{className:"small",style:{color:"var(--ink)"},children:y.answer})]})]},y.id))}):r.jsx(V,{h:120})]})}function $v(){return r.jsx(Uv,{})}function Uv(){const[e,t]=x.useState("profile");return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Your account"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Account & data"}),r.jsx("p",{className:"small",children:"Your data, your rights (DPDP-aligned): export it, delete it, control who sees it."})]}),r.jsx(qi,{tabs:[{id:"profile",label:"Profile"},{id:"data",label:"Data & privacy"},{id:"referrals",label:"Referrals"},{id:"audit",label:"My audit trail"}],value:e,onChange:t}),e==="profile"&&r.jsx(Wv,{}),e==="data"&&r.jsx(Vv,{}),e==="referrals"&&r.jsx(bv,{}),e==="audit"&&r.jsx(Hv,{})]})}function Wv(){var n,s;const{me:e,user:t}=Se();return r.jsxs("div",{className:"stack",children:[r.jsx(_,{children:r.jsxs("div",{className:"row",children:[r.jsx("div",{style:{width:54,height:54,borderRadius:18,background:"var(--brand-soft)",color:"var(--brand-2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",fontFamily:"var(--font-display)",fontWeight:700},children:(s=(n=t==null?void 0:t.name)==null?void 0:n[0])==null?void 0:s.toUpperCase()}),r.jsxs("div",{children:[r.jsx("h3",{children:t==null?void 0:t.name}),r.jsxs("p",{className:"small muted",children:[(t==null?void 0:t.email)||`+91 ${t==null?void 0:t.phone}`," \xB7 joined ",Ie(t==null?void 0:t.created_at)]}),r.jsxs("div",{className:"row mt-1",children:[r.jsx(L,{tone:"brand",children:t==null?void 0:t.role}),(t==null?void 0:t.paid_unlock)&&r.jsx(L,{tone:"success",children:"Full report unlocked"}),(t==null?void 0:t.is_minor)&&r.jsxs(L,{tone:t.consent_status==="given"?"success":"warn",children:["Minor \xB7 consent ",t.consent_status]})]})]})]})}),(t==null?void 0:t.role)==="student"&&(t==null?void 0:t.is_minor)&&t.consent_status!=="given"&&r.jsx(Bv,{}),(t==null?void 0:t.role)==="student"&&r.jsxs(_,{children:[r.jsx("h3",{className:"mb-1",children:"Status"}),r.jsxs("div",{className:"grid-3",children:[r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",children:"PROFILE"}),r.jsx("strong",{children:e!=null&&e.hasProfile?"Complete":"Pending"})]}),r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",children:"ASSESSMENT"}),r.jsx("strong",{children:e!=null&&e.assessmentDone?"Completed":"Pending"})]}),r.jsxs("div",{className:"card-2 card-pad",children:[r.jsx("div",{className:"tiny faint",children:"PLAN"}),r.jsx("strong",{children:t!=null&&t.paid_unlock?"Full report":"Free tier"})]})]})]})]})}function Bv(){const{user:e,refresh:t}=Se(),{toast:n}=ee(),[s,l]=x.useState(e==null?void 0:e.consent_code),a=async()=>{try{const i=await $("/api/auth/consent/generate");l(i.code),n("New consent code created."),t()}catch(i){n(i.message,"err")}};return r.jsxs(_,{style:{border:"2px solid var(--accent)"},children:[r.jsxs("div",{className:"row",children:[r.jsx(rt,{style:{color:"var(--accent)"}}),r.jsx("h3",{children:"Link a parent (required for under-18)"})]}),r.jsx("p",{className:"small mt-1",children:"Under India\'s DPDP Act, we need verifiable parental consent. Share this code \u2014 your parent enters it while signing up:"}),r.jsxs("div",{className:"row mt-2",children:[r.jsx("code",{className:"card-2 card-pad",style:{fontSize:"1.15rem",letterSpacing:3,fontWeight:700},children:s||"\u2014"}),r.jsxs(z,{variant:"secondary",size:"sm",onClick:a,children:[r.jsx($r,{})," New code"]})]})]})}function Vv(){const{user:e,logout:t}=Se(),{toast:n}=ee(),[s,l]=x.useState(!1),[a,i]=x.useState(""),o=async()=>{try{await $("/api/account/delete",{confirm:a}),n("Account deleted. Your personal data is gone \u2014 catalog data was never yours alone."),await t(),window.location.href="/"}catch(c){n(c.message,"err")}};return r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(rh,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Export your data"]}),r.jsx("p",{className:"small mt-1 mb-2",children:"Everything we hold about you \u2014 profile, answers, matches, roadmaps, payments, notifications \u2014 as one JSON file. Includes the decision logs behind every recommendation."}),r.jsxs(z,{as:"a",href:"/api/account/export",variant:"secondary",children:[r.jsx(xl,{})," Download my data (JSON)"]})]}),r.jsxs(_,{children:[r.jsxs("h3",{children:[r.jsx(Ks,{style:{verticalAlign:-3,color:"var(--brand-2)"}})," Sharing"]}),r.jsxs("p",{className:"small mt-1",children:["Roadmap sharing with parents is controlled from the ",r.jsx("strong",{children:"Roadmap \u2192 Share"})," button. Links are read-only, revocable, and every share is logged in your audit trail below."]})]}),r.jsxs(_,{style:{border:"2px solid var(--danger-soft)"},children:[r.jsxs("h3",{style:{color:"var(--danger)"},children:[r.jsx(sh,{style:{verticalAlign:-3}})," Delete my account"]}),r.jsx("p",{className:"small mt-1 mb-2",children:"Full erasure: profile, assessment, matches, roadmaps. Catalog data (careers, colleges, exams) stays \u2014 it was never personal. This cannot be undone."}),r.jsx(z,{variant:"danger",size:"sm",onClick:()=>l(!0),children:"Delete my account\u2026"})]}),r.jsxs(Wr,{open:s,onClose:()=>l(!1),title:"Delete account \u2014 are you sure?",children:[r.jsxs("p",{className:"small mb-2",children:["Type ",r.jsx("strong",{children:"DELETE"})," to confirm. Your roadmap, matches and answers will be permanently removed."]}),r.jsx("input",{className:"input",placeholder:"DELETE",value:a,onChange:c=>i(c.target.value)}),r.jsxs("div",{className:"row mt-3",children:[r.jsx(z,{variant:"secondary",onClick:()=>l(!1),children:"Keep my account"}),r.jsx("span",{className:"spacer"}),r.jsx(z,{variant:"danger",disabled:a!=="DELETE",onClick:o,children:"Delete everything"})]})]})]})}function bv(){const[e,t]=x.useState(null);return x.useEffect(()=>{W("/api/account/referrals").then(t).catch(()=>t({signups:[]}))},[]),e?r.jsxs("div",{className:"stack",children:[r.jsxs(_,{className:"center",style:{padding:30},children:[r.jsx("div",{className:"tiny muted",style:{fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"},children:"Your referral code"}),r.jsx("div",{style:{fontFamily:"ui-monospace,monospace",fontSize:"2rem",fontWeight:700,color:"var(--brand-2)",letterSpacing:4},children:e.code}),r.jsx("p",{className:"small mt-1",children:"Unprompted referrals are the clearest signal that guidance actually worked. If the app helped you, point a friend at it."}),r.jsx("div",{className:"row mt-2",style:{justifyContent:"center"},children:r.jsxs(L,{tone:"brand",children:[e.count," student",e.count===1?"":"s"," joined with your code"]})})]}),e.signups.map((n,s)=>r.jsxs(_,{className:"row",children:[r.jsx(Zi,{style:{color:"var(--brand-2)"}}),r.jsx("strong",{className:"small",children:n.name}),r.jsx("span",{className:"spacer"}),r.jsx("span",{className:"tiny faint",children:Ie(n.created_at)})]},s))]}):r.jsx(V,{h:100})}function Hv(){const[e,t]=x.useState(null);return x.useEffect(()=>{W("/api/account/audit").then(t).catch(()=>t({logs:[]}))},[]),e?r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsx("h3",{className:"mb-1",children:"Your audit trail"}),r.jsx("p",{className:"small",children:"Every action the system took for you, logged server-side \u2014 the same transparency we demand of the recommendation engine."})]}),e.logs.map(n=>r.jsxs(_,{className:"row",children:[r.jsx(xl,{style:{color:"var(--faint)"}}),r.jsxs("div",{style:{flex:1},children:[r.jsx("code",{className:"small",children:n.action}),r.jsx("div",{className:"tiny faint",children:n.entity})]}),r.jsx("span",{className:"tiny faint",children:Ie(n.created_at)})]},n.created_at+n.action)),e.logs.length===0&&r.jsx(_,{className:"center small",children:"Nothing logged yet."})]}):r.jsx(V,{h:100})}function Qv(){const[e,t]=x.useState(null),{toast:n}=ee(),[s,l]=x.useState({}),a=()=>W("/api/mentor/inbox").then(t).catch(()=>t({questions:[]}));if(x.useEffect(()=>{a()},[]),!e)return r.jsxs("div",{className:"stack",children:[r.jsx(V,{}),r.jsx(V,{})]});const i=e.questions.filter(d=>d.status==="open"),o=e.questions.filter(d=>d.status!=="open"),c=async d=>{var p;const m=(p=s[d])==null?void 0:p.trim();if(!m||m.length<10)return n("Write a real answer first.","err");try{await $("/api/mentor/answer",{questionId:d,answer:m}),n("Answered \u2014 the student has been notified."),a()}catch(v){n(v.message,"err")}};return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Mentor desk"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Questions waiting for you"}),e.mentor&&r.jsxs("p",{className:"small",children:[e.mentor.headline," \xB7 ",r.jsx(L,{tone:e.mentor.verified?"success":"warn",children:e.mentor.verified?"Verified":"Pending verification"})]})]}),e.questions.length===0&&r.jsx(we,{icon:r.jsx($t,{width:40,height:40}),title:"Inbox zero",body:"New student questions will appear here, matched to your field."}),[...i,...o].map(d=>r.jsxs(_,{className:d.status==="open"?"":"card-2",style:d.status==="open"?{border:"2px solid var(--brand-soft)"}:{},children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(L,{tone:d.status==="answered"?"success":d.status==="escalated"||d.sla_status==="overdue"?"danger":"brand",children:d.status==="answered"?"Answered":d.status==="escalated"?"Escalated to admin":d.sla_status==="overdue"?"SLA breached":"Open \xB7 within SLA"}),d.career_title&&r.jsx(L,{tone:"muted",children:d.career_title}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:[d.student_name," \xB7 ",Ie(d.created_at)]})]}),r.jsx("p",{style:{color:"var(--ink)",fontWeight:500},children:d.question}),d.answer&&r.jsx("div",{className:"why-box mt-2",children:r.jsx("p",{className:"small",style:{color:"var(--ink)"},children:d.answer})}),d.status==="open"&&r.jsxs(r.Fragment,{children:[r.jsx("textarea",{className:"input mt-2",placeholder:"Write your honest answer \u2014 what you wish someone had told you at 17\u2026",value:s[d.id]||"",onChange:m=>l(p=>({...p,[d.id]:m.target.value}))}),r.jsxs("div",{className:"row mt-1",children:[r.jsxs(z,{size:"sm",onClick:()=>c(d.id),children:[r.jsx(se,{})," Send answer"]}),r.jsxs(z,{size:"sm",variant:"ghost",onClick:async()=>{await $(`/api/mentor/escalate/${d.id}`),n("Escalated to admin."),a()},children:[r.jsx(th,{width:14,height:14})," Escalate (out of my field)"]}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:["SLA: ",Ie(d.sla_due_at)]})]})]})]},d.id)),r.jsx("p",{className:"tiny faint",children:"Answers carry your name and verification badge. Capacity is capped \u2014 quality over volume."})]})}function Yv(){const[e,t]=x.useState("overview");return r.jsxs("div",{className:"stack",children:[r.jsxs("div",{children:[r.jsx("div",{className:"eyebrow",children:"Counsellor console"}),r.jsx("h1",{style:{fontSize:"1.55rem"},children:"Admin"}),r.jsx("p",{className:"small",children:"Humans where it matters: reviews, mentor verification, and content freshness."})]}),r.jsx(qi,{tabs:[{id:"overview",label:"Overview"},{id:"review",label:"Review queue"},{id:"mentors",label:"Mentors"},{id:"content",label:"Content freshness"},{id:"tools",label:"Demo & tools"},{id:"audit",label:"Audit trail"}],value:e,onChange:t}),e==="overview"&&r.jsx(Kv,{}),e==="review"&&r.jsx(Gv,{}),e==="mentors"&&r.jsx(Xv,{}),e==="content"&&r.jsx(Jv,{}),e==="tools"&&r.jsx(Zv,{}),e==="audit"&&r.jsx(qv,{})]})}function Kv(){const[e,t]=x.useState(null);if(x.useEffect(()=>{W("/api/admin/overview").then(t).catch(()=>{})},[]),!e)return r.jsxs("div",{className:"stack",children:[r.jsx(V,{}),r.jsx(V,{})]});const n=s=>s>=1e7?`${(s/1e7).toFixed(1)}Cr`:s>=1e5?`${(s/1e5).toFixed(1)}L`:s.toLocaleString("en-IN");return r.jsxs("div",{className:"stack",children:[r.jsx("div",{className:"grid-3",children:[["Students",e.students],["Paid users",e.paidUsers],["Revenue (test)",`\u20B9${n(e.revenue)}`],["Assessments done",e.assessments],["Referral signups",e.referralSignups],["Open flags",e.openFlags]].map(([s,l])=>r.jsx(_,{className:"step-card",children:r.jsxs("div",{className:"stat",children:[r.jsx("span",{className:"n",children:l}),r.jsx("span",{className:"l",children:s})]})},s))}),r.jsxs("div",{className:"grid-2",children:[r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Trust health"}),r.jsxs("div",{className:"row",children:[r.jsxs(L,{tone:e.pendingReviews>0?"warn":"success",children:[e.pendingReviews," pending reviews"]}),r.jsxs(L,{tone:e.openFlags>0?"warn":"success",children:[e.openFlags," open flags"]}),r.jsxs(L,{tone:"brand",children:[e.parents," parents linked"]})]}),r.jsxs("div",{className:"alert alert-info mt-2",children:[r.jsx(Ur,{}),r.jsx("div",{className:"small",children:"High-impact recommendations (gap-year, stream switch) reach students only after review here. That gate is the product\'s core promise."})]})]}),r.jsxs(_,{children:[r.jsx("h3",{className:"mb-2",children:"Content freshness"}),r.jsx("div",{className:"stack",style:{gap:8},children:Object.entries(e.stale).map(([s,l])=>r.jsxs("div",{className:"row",children:[r.jsx("span",{className:"small",style:{width:80,textTransform:"capitalize"},children:s}),r.jsx("div",{className:"progressbar",style:{flex:1},children:r.jsx("div",{style:{width:`${Math.min(100,l*12)}%`,background:l>0?"var(--warn)":"var(--success)"}})}),r.jsxs("span",{className:"tiny muted",children:[l," stale"]})]},s))}),r.jsx("p",{className:"tiny faint mt-2",children:"Stale = not verified in 6+ months. Students see the as-of date on every fact."})]})]}),r.jsxs(_,{children:[r.jsxs("h3",{className:"mb-2",children:["Referral leaderboard ",r.jsx("span",{className:"faint small",children:"(the trust signal we track)"})]}),e.referrals.length?e.referrals.map((s,l)=>r.jsxs("div",{className:"row",style:{padding:"6px 0"},children:[r.jsx("strong",{className:"small",children:s.name}),r.jsx("code",{className:"tiny faint",children:s.referral_code}),r.jsx("span",{className:"spacer"}),r.jsxs(L,{tone:"brand",children:[s.signups," signups"]})]},l)):r.jsx("p",{className:"small",children:"No referrals yet."})]})]})}function Gv(){const{toast:e}=ee(),[t,n]=x.useState(null),s=()=>W("/api/admin/review").then(n).catch(()=>{});if(x.useEffect(()=>{s()},[]),!t)return r.jsx(V,{h:140});const l=async(i,o,c)=>{try{await $(i,o),e(c),s()}catch(d){e(d.message,"err")}},a=!t.flags.length&&!t.pendingRecs.length&&!t.pendingRoadmaps.length;return r.jsxs("div",{className:"stack",children:[a&&r.jsxs(_,{className:"center",style:{padding:36},children:[r.jsx(se,{width:36,height:36,style:{color:"var(--success)"}}),r.jsx("h3",{className:"mt-2",children:"Queue is clear"}),r.jsx("p",{className:"small",children:"Nothing waiting for human review."})]}),t.pendingRecs.map(i=>r.jsxs(_,{style:{border:"2px solid var(--warn-soft)"},children:[r.jsxs("div",{className:"row mb-1",children:[r.jsx(L,{tone:"warn",children:"High-impact recommendation"}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:[i.student_name," \xB7 ",Ie(i.created_at)]})]}),r.jsxs("h3",{children:[i.career_title," \xB7 ",Math.round(i.match_score),"% match"]}),r.jsx("p",{className:"small",children:i.review_reason}),r.jsx("div",{className:"stack mt-2",style:{gap:6},children:i.decision_log.map((o,c)=>r.jsxs("div",{className:"log-item",children:[r.jsx("span",{className:"log-label",children:o.label}),r.jsx("span",{className:"small",children:o.detail})]},c))}),r.jsxs("div",{className:"row mt-3",children:[r.jsx(z,{size:"sm",onClick:()=>l(`/api/admin/review/rec/${i.id}`,{action:"approve"},"Approved \u2014 now visible to the student."),children:"Approve & release"}),r.jsx(z,{size:"sm",variant:"secondary",onClick:()=>l(`/api/admin/review/rec/${i.id}`,{action:"reject"},"Rejected."),children:"Reject"})]})]},i.id)),t.pendingRoadmaps.map(i=>r.jsxs(_,{style:{border:"2px solid var(--warn-soft)"},children:[r.jsx("div",{className:"row mb-1",children:r.jsx(L,{tone:"warn",children:"Roadmap under review"})}),r.jsxs("h3",{children:[i.student_name," \xB7 ",i.career_title]}),r.jsx("p",{className:"small",children:"This roadmap contains a high-impact step (gap-year / stream-change consideration) and is withheld from the student until reviewed."}),r.jsxs("div",{className:"row mt-2",children:[r.jsx(z,{size:"sm",onClick:()=>l(`/api/admin/review/roadmap/${i.id}`,{action:"approve"},"Approved \u2014 roadmap released."),children:"Approve & release"}),r.jsx(z,{size:"sm",variant:"secondary",onClick:()=>l(`/api/admin/review/roadmap/${i.id}`,{action:"reject"},"Rejected."),children:"Reject"})]})]},i.id)),t.flags.map(i=>r.jsxs(_,{children:[r.jsxs("div",{className:"row mb-1",children:[r.jsxs(L,{tone:"info",children:["Content flag \xB7 ",i.entity_type]}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:[i.flagger," \xB7 ",Ie(i.created_at)]})]}),r.jsx("p",{className:"small",style:{color:"var(--ink)"},children:i.reason}),i.career_title&&r.jsxs("p",{className:"tiny muted",children:["On: ",i.career_title]}),r.jsx("div",{className:"row mt-2",children:r.jsxs(z,{size:"sm",variant:"secondary",onClick:()=>l(`/api/admin/review/flag/${i.id}`,{},"Flag resolved & fact refreshed."),children:[r.jsx($r,{width:14,height:14})," Resolve (refresh as-of date)"]})})]},i.id))]})}function Xv(){const{toast:e}=ee(),[t,n]=x.useState(null),s=()=>W("/api/admin/mentors").then(n).catch(()=>{});return x.useEffect(()=>{s()},[]),t?r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsx("h3",{children:"Supply-side capacity"}),r.jsx("p",{className:"small mt-1",children:"Grow the verified pool before marketing spikes \u2014 mentor capacity is the first human bottleneck at 10,000 users."})]}),t.mentors.map(l=>r.jsxs(_,{className:"row",children:[r.jsxs("div",{style:{flex:1},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:l.name}),r.jsx(L,{tone:l.verified?"success":"warn",children:l.verified?"Verified":"Unverified"})]}),r.jsx("div",{className:"small muted",children:l.headline}),r.jsx("div",{className:"row mt-1",children:l.fields.map(a=>r.jsx("span",{className:"chip",style:{padding:"3px 9px",fontSize:".72rem"},children:a},a))})]}),r.jsx(z,{size:"sm",variant:l.verified?"secondary":"primary",onClick:async()=>{await $(`/api/admin/mentors/${l.user_id}/verify`,{verified:!l.verified}),e(l.verified?"Verification removed.":"Mentor verified."),s()},children:l.verified?"Unverify":"Verify"})]},l.user_id))]}):r.jsx(V,{h:120})}function Jv(){const{toast:e}=ee(),[t,n]=x.useState(null),s=()=>W("/api/admin/stale").then(n).catch(()=>{});if(x.useEffect(()=>{s()},[]),!t)return r.jsx(V,{h:120});const l=[["careers","Careers"],["colleges","Colleges"],["exams","Exams"],["courses","Courses"]],a=l.every(([i])=>!t[i].length);return r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsx("h3",{children:"Stale content (6+ months unverified)"}),r.jsx("p",{className:"small mt-1",children:\'One stale course fact can undo the whole "trusted" promise. Resolving a flag or refreshing here updates the as-of date students see.\'})]}),a&&r.jsxs(_,{className:"center",style:{padding:30},children:[r.jsx(se,{width:32,height:32,style:{color:"var(--success)"}}),r.jsx("h3",{className:"mt-1",children:"Everything fresh"})]}),l.map(([i,o])=>t[i].length>0&&r.jsxs(_,{children:[r.jsxs("h3",{className:"mb-2",children:[o," \xB7 ",t[i].length," stale"]}),r.jsx("div",{className:"stack",style:{gap:8},children:t[i].map(c=>r.jsxs("div",{className:"row card-2 card-pad",children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{className:"small",children:c.label}),r.jsx(qt,{source:c.source,asOf:c.as_of})]}),r.jsxs(z,{size:"sm",variant:"secondary",onClick:async()=>{await $(`/api/admin/stale/${i}/${c.id}/refresh`),e(`${c.label} marked verified today.`),s()},children:[r.jsx($r,{width:14,height:14})," Mark re-verified"]})]},c.id))})]},i))]})}function Zv(){const{toast:e}=ee(),[t,n]=x.useState(null),[s,l]=x.useState(""),a=()=>W("/api/admin/overview").then(n).catch(()=>{});return x.useEffect(()=>{a()},[]),t?r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsx("h3",{children:"Chaos toggle \u2014 simulate AI failure"}),r.jsx("p",{className:"small mt-1 mb-2",children:\'Forces the narrative layer onto its deterministic fallback. Demonstrates graceful degradation: Layer-1 matches and roadmaps keep working, narratives switch to templates, roadmaps are marked "fallback mode".\'}),r.jsx(z,{variant:t.chaos?"danger":"secondary",onClick:async()=>{await $("/api/admin/chaos",{on:!t.chaos}),e(t.chaos?"Chaos off \u2014 narratives use the normal path.":"Chaos on \u2014 next generations use fallback."),a()},children:t.chaos?"Turn chaos OFF":"Turn chaos ON (simulate AI failure)"})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Accelerate check-ins (demo)"}),r.jsx("p",{className:"small mt-1 mb-2",children:\'Pulls all future 2-week/4-week check-in nudges to "now" so the follow-up flow can be demoed instantly.\'}),r.jsx(z,{variant:"secondary",onClick:async()=>{const i=await $("/api/admin/demo/accelerate-checkins",{});e(`${i.moved} check-ins moved to due-now.`)},children:"Make all check-ins due now"})]}),r.jsxs(_,{children:[r.jsx("h3",{children:"Generate a comp code"}),r.jsx("p",{className:"small mt-1 mb-2",children:"100% codes unlock the full report instantly; partial codes reduce the checkout amount."}),r.jsxs("div",{className:"row",children:[r.jsx("input",{className:"input",style:{maxWidth:220},placeholder:"CODE (blank = auto)",value:s,onChange:i=>l(i.target.value.toUpperCase())}),[100,50].map(i=>r.jsxs(z,{size:"sm",variant:"secondary",onClick:async()=>{const o=await $("/api/admin/compcodes",{code:s||void 0,percentOff:i});e(`Code ${o.code} created (${o.percent_off}% off).`),l("")},children:[i,"% off"]},i))]})]})]}):r.jsx(V,{h:120})}function qv(){const[e,t]=x.useState(null);return x.useEffect(()=>{W("/api/admin/audit").then(t).catch(()=>{})},[]),e?r.jsxs("div",{className:"stack",children:[r.jsxs(_,{children:[r.jsx("h3",{children:"System audit trail"}),r.jsx("p",{className:"small mt-1",children:"Every logged action \u2014 recommendation generations, reviews, payments, exports, deletions. Tamper-evident by design."})]}),r.jsx(_,{pad:!1,style:{overflowX:"auto"},children:r.jsxs("table",{className:"timeline-table",style:{minWidth:560},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"When"}),r.jsx("th",{children:"Actor"}),r.jsx("th",{children:"Action"}),r.jsx("th",{children:"Entity"})]})}),r.jsx("tbody",{children:e.logs.map(n=>r.jsxs("tr",{children:[r.jsx("td",{className:"tiny",children:Ie(n.created_at)}),r.jsx("td",{className:"small",children:n.actor_name||"system"}),r.jsx("td",{children:r.jsx("code",{className:"small",children:n.action})}),r.jsx("td",{className:"tiny faint",children:n.entity})]},n.id))})]})})]}):r.jsx(V,{h:120})}function ex(){const{token:e}=bi(),[t,n]=x.useState(null),[s,l]=x.useState(!1);if(x.useEffect(()=>{W(`/api/account/shared/${e}`).then(n).catch(()=>l(!0))},[e]),s)return r.jsx("div",{style:{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20},children:r.jsx(we,{icon:r.jsx(Yi,{width:40,height:40}),title:"This link is off",body:"The student turned off sharing, or the link expired. Ask them to share again from their roadmap page.",action:r.jsx(K,{className:"btn btn-secondary",to:"/",children:"Career Compass home"})})});if(!t)return r.jsxs("div",{style:{padding:20},children:[r.jsx(V,{h:120}),r.jsx(V,{})]});const a=t.roadmap,i=Math.round(a.progress.done/Math.max(1,a.progress.total)*100);return r.jsxs("div",{style:{minHeight:"100vh",background:"var(--bg)"},children:[r.jsx("header",{className:"topbar no-print",children:r.jsxs("div",{className:"topbar-inner",children:[r.jsxs(K,{to:"/",className:"brand",children:[r.jsx(ln,{className:"compass"})," Career Compass"]}),r.jsx("div",{className:"topbar-spacer"}),r.jsxs(L,{tone:"brand",children:[r.jsx(Gi,{})," Read-only view"]})]})}),r.jsxs("div",{className:"page page-narrow",children:[r.jsxs("div",{className:"center mb-3",children:[r.jsxs("div",{className:"eyebrow",children:[t.student_name,"\'s roadmap"]}),r.jsx("h1",{style:{fontSize:"1.8rem"},children:a.career.title}),r.jsx("p",{className:"small",children:a.career.summary}),r.jsxs("p",{className:"tiny faint mt-1",children:["Shared with consent by the student \xB7 generated ",Lr(a.generated_at)]})]}),r.jsxs(_,{className:"mb-3",children:[r.jsxs("div",{className:"row",children:[r.jsxs("div",{style:{flex:1},children:[r.jsx("strong",{children:"Progress"}),r.jsxs("div",{className:"small muted",children:[a.progress.done," of ",a.progress.total," steps completed"]})]}),r.jsxs("div",{className:"stat",style:{textAlign:"right"},children:[r.jsxs("span",{className:"n",children:[i,"%"]}),r.jsx("span",{className:"l",children:"there"})]})]}),r.jsx("div",{className:"mt-2",children:r.jsx(cn,{value:i})})]}),r.jsx("div",{className:"stack",children:a.milestones.map((o,c)=>r.jsx(_,{pad:!1,className:"milestone",children:r.jsxs("div",{style:{padding:"14px 18px"},children:[r.jsxs("div",{className:"row",children:[r.jsx("strong",{children:o.title}),o.high_impact&&r.jsx(L,{tone:"warn",children:"High impact"}),r.jsx("span",{className:"spacer"}),r.jsxs("span",{className:"tiny faint",children:["by ",Lr(o.target_date)]})]}),r.jsx("div",{className:"stack mt-2",style:{gap:6},children:o.steps.map((d,m)=>r.jsxs("div",{className:"row",style:{gap:8},children:[r.jsx("span",{className:`checkbox ${d.done?"done":""}`,style:{width:18,height:18,borderRadius:6},children:r.jsx(se,{width:11,height:11})}),r.jsx("span",{className:`small ${d.done?"muted":""}`,style:{textDecoration:d.done?"line-through":"none"},children:d.text})]},m))}),o.note&&r.jsx("p",{className:"tiny faint mt-2",children:o.note})]})},c))}),a.timeline.length>0&&r.jsxs(_,{pad:!1,style:{overflowX:"auto"},className:"mt-3",children:[r.jsx("div",{style:{padding:"16px 18px 0"},children:r.jsx("h3",{children:"Entrance exam timeline"})}),r.jsxs("table",{className:"timeline-table",style:{minWidth:500,margin:"10px 0"},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"Exam"}),r.jsx("th",{children:"Applications"}),r.jsx("th",{children:"Exam months"}),r.jsx("th",{children:"Results"})]})}),r.jsx("tbody",{children:a.timeline.map((o,c)=>r.jsxs("tr",{children:[r.jsx("td",{children:r.jsx("strong",{children:o.exam})}),r.jsx("td",{children:o.application_window}),r.jsx("td",{children:o.exam_months}),r.jsx("td",{children:o.result_months})]},c))})]})]}),r.jsxs("div",{className:"alert alert-info mt-3 no-print",children:[r.jsx(Ur,{}),r.jsxs("div",{className:"small",children:["This is a ",r.jsx("strong",{children:"read-only view"})," shared by ",t.student_name," with explicit consent. Parents: the best support right now is asking about milestone 1 \u2014 not adding more opinions. Every fact in this roadmap is dated and sourced; verify deadlines on official websites before acting."]})]}),r.jsxs("p",{className:"tiny faint center mt-2 no-print",children:["Made with Career Compass \u2014 ",r.jsx(K,{to:"/",children:"one trusted roadmap, not another list of options"})]})]})]})}function tx(){return r.jsx("div",{style:{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20},children:r.jsxs("div",{className:"center",children:[r.jsx(ln,{width:60,height:60}),r.jsx("h1",{className:"mt-2",style:{fontSize:"2.2rem"},children:"Off the map"}),r.jsx("p",{className:"mt-1",children:"This page isn\'t on the compass. Let\'s get you back on course."}),r.jsxs("div",{className:"row mt-3",style:{justifyContent:"center"},children:[r.jsx(z,{as:"a",href:"/",children:"Home"}),r.jsx(z,{as:"a",href:"/app/home",variant:"secondary",children:"My app"})]})]})})}function at({roles:e,children:t}){const{user:n,loading:s}=Se(),l=Vt();return s?r.jsx("div",{className:"page center",style:{paddingTop:80},children:r.jsx(st,{})}):n?e&&!e.includes(n.role)?r.jsx(ba,{to:"/app/home",replace:!0}):t:r.jsx(ba,{to:"/signin",state:{from:l.pathname},replace:!0})}function nx(){return r.jsx("div",{className:"app-shell",children:r.jsxs(Tm,{children:[r.jsx(ne,{path:"/",element:r.jsx(uv,{})}),r.jsx(ne,{path:"/how-it-works",element:r.jsx(dv,{})}),r.jsx(ne,{path:"/signin",element:r.jsx(hv,{})}),r.jsx(ne,{path:"/shared/:token",element:r.jsx(ex,{})}),r.jsxs(ne,{path:"/app",element:r.jsx(at,{children:r.jsx(cv,{})}),children:[r.jsx(ne,{index:!0,element:r.jsx(ba,{to:"/app/home",replace:!0})}),r.jsx(ne,{path:"home",element:r.jsx(fv,{})}),r.jsx(ne,{path:"profile",element:r.jsx(at,{roles:["student"],children:r.jsx(mv,{})})}),r.jsx(ne,{path:"assessment",element:r.jsx(at,{roles:["student"],children:r.jsx(xv,{})})}),r.jsx(ne,{path:"results",element:r.jsx(at,{roles:["student"],children:r.jsx(gv,{})})}),r.jsx(ne,{path:"explore",element:r.jsx(kv,{})}),r.jsx(ne,{path:"explore/:type/:slug",element:r.jsx(Sv,{})}),r.jsx(ne,{path:"compare/:type",element:r.jsx(Cv,{})}),r.jsx(ne,{path:"roadmap",element:r.jsx(at,{roles:["student"],children:r.jsx(Ev,{})})}),r.jsx(ne,{path:"progress",element:r.jsx(at,{roles:["student"],children:r.jsx(Lv,{})})}),r.jsx(ne,{path:"ask",element:r.jsx(at,{roles:["student"],children:r.jsx(Fv,{})})}),r.jsx(ne,{path:"account",element:r.jsx($v,{})}),r.jsx(ne,{path:"mentor",element:r.jsx(at,{roles:["mentor"],children:r.jsx(Qv,{})})}),r.jsx(ne,{path:"admin",element:r.jsx(at,{roles:["admin"],children:r.jsx(Yv,{})})})]}),r.jsx(ne,{path:"*",element:r.jsx(tx,{})})]})})}var kc;const rx=localStorage.getItem("cc-theme")||((kc=window.matchMedia)!=null&&kc.call(window,"(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",rx);Ad(document.getElementById("root")).render(r.jsx(Ic.StrictMode,{children:r.jsx(Am,{children:r.jsx(Km,{children:r.jsx(Gm,{children:r.jsx(nx,{})})})})}));\n\n</script>\n    <style>\n*{box-sizing:border-box;margin:0;padding:0}:root{--bg: #f5f3ec;--bg-soft: #edeae0;--surface: #ffffff;--surface-2: #faf9f5;--ink: #1b2534;--muted: #5b6b82;--faint: #8d9aad;--line: #e5e1d6;--brand: #0d5c57;--brand-2: #0f766e;--brand-soft: #e3efed;--accent: #d98324;--accent-soft: #fdf1de;--success: #15803d;--success-soft: #e5f4ea;--danger: #b91c1c;--danger-soft: #fbe9e9;--info: #1d4ed8;--info-soft: #e8eefc;--warn: #a16207;--warn-soft: #fdf3d8;--ring: rgba(13, 92, 87, .22);--shadow-1: 0 1px 2px rgba(23, 34, 48, .05), 0 2px 8px rgba(23, 34, 48, .05);--shadow-2: 0 4px 14px rgba(23, 34, 48, .09), 0 1px 3px rgba(23, 34, 48, .06);--shadow-3: 0 18px 50px rgba(15, 30, 45, .18);--r-s: 10px;--r-m: 14px;--r-l: 20px;--font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;--font-display: ui-serif, Georgia, "Times New Roman", serif;--maxw: 1120px;--bottom-nav-h: 64px}[data-theme=dark]{--bg: #0c121c;--bg-soft: #101826;--surface: #16202e;--surface-2: #1b2637;--ink: #e8edf4;--muted: #93a3ba;--faint: #64748b;--line: #24324a;--brand: #35a397;--brand-2: #46b3a6;--brand-soft: #11302c;--accent: #e8a33d;--accent-soft: #3a2c14;--success: #4ade80;--success-soft: #12291b;--danger: #f87171;--danger-soft: #3a1a1a;--info: #93b4ff;--info-soft: #1a2647;--warn: #fbbf24;--warn-soft: #332a12;--ring: rgba(69, 179, 166, .3);--shadow-1: 0 1px 2px rgba(0,0,0,.3), 0 2px 8px rgba(0,0,0,.25);--shadow-2: 0 4px 14px rgba(0,0,0,.4);--shadow-3: 0 18px 50px rgba(0,0,0,.55)}html{-webkit-text-size-adjust:100%}body{font-family:var(--font);background:var(--bg);color:var(--ink);line-height:1.55;font-size:15.5px;min-height:100vh;-webkit-font-smoothing:antialiased}#root{min-height:100vh;display:flex;flex-direction:column}h1,h2,h3,.display{font-family:var(--font-display);font-weight:600;line-height:1.18;letter-spacing:-.01em}h1{font-size:2rem}h2{font-size:1.45rem}h3{font-size:1.12rem}a{color:var(--brand-2);text-decoration:none}a:hover{text-decoration:underline}p{color:var(--muted)}strong{color:var(--ink)}button{font-family:inherit}.app-shell{flex:1;width:100%}.topbar{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--surface) 88%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.topbar-inner{max-width:var(--maxw);margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:12px}.brand{display:flex;align-items:center;gap:9px;font-family:var(--font-display);font-weight:700;font-size:1.12rem;color:var(--ink);text-decoration:none!important}.brand:hover{opacity:.85}.brand .compass{width:28px;height:28px;flex:none}.topnav{display:none;gap:4px;margin-left:20px}.topnav a{padding:7px 12px;border-radius:999px;color:var(--muted);font-weight:500;font-size:.93rem}.topnav a:hover{background:var(--bg-soft);color:var(--ink);text-decoration:none}.topnav a.active{background:var(--brand-soft);color:var(--brand);font-weight:600}.topbar-spacer{flex:1}@media (min-width: 900px){.topnav{display:flex}}.icon-btn{position:relative;width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s}.icon-btn:hover{background:var(--bg-soft)}.icon-btn .dot{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--danger);color:#fff;font-size:.64rem;font-weight:700;display:flex;align-items:center;justify-content:center}.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:40;height:var(--bottom-nav-h);background:color-mix(in srgb,var(--surface) 94%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid var(--line);display:flex;padding-bottom:env(safe-area-inset-bottom)}.bottom-nav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--faint);font-size:.68rem;font-weight:600;text-decoration:none!important}.bottom-nav a svg{width:21px;height:21px}.bottom-nav a.active{color:var(--brand)}@media (min-width: 900px){.bottom-nav{display:none}}.page{max-width:var(--maxw);margin:0 auto;padding:22px 16px calc(var(--bottom-nav-h) + 30px);width:100%}@media (min-width: 900px){.page{padding-bottom:60px}}.page-narrow{max-width:760px}.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-l);box-shadow:var(--shadow-1)}.card-pad{padding:20px}.card-2{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-m)}.stack{display:flex;flex-direction:column;gap:14px}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.grid-2,.grid-3{display:grid;grid-template-columns:1fr;gap:14px}@media (min-width: 700px){.grid-2{grid-template-columns:1fr 1fr}.grid-3{grid-template-columns:1fr 1fr 1fr}}.spacer{flex:1}.muted{color:var(--muted)}.faint{color:var(--faint)}.small{font-size:.85rem}.tiny{font-size:.78rem}.center{text-align:center}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;border:1px solid transparent;cursor:pointer;font-weight:600;font-size:.95rem;padding:11px 18px;transition:.15s;text-decoration:none!important;line-height:1.2;min-height:44px}.btn:disabled{opacity:.55;cursor:not-allowed}.btn-primary{background:var(--brand);color:#fff;box-shadow:var(--shadow-1)}.btn-primary:hover:not(:disabled){background:var(--brand-2)}.btn-secondary{background:var(--surface);border-color:var(--line);color:var(--ink)}.btn-secondary:hover:not(:disabled){background:var(--bg-soft)}.btn-ghost{background:transparent;color:var(--brand-2)}.btn-ghost:hover:not(:disabled){background:var(--brand-soft)}.btn-danger{background:var(--danger);color:#fff}.btn-sm{padding:7px 13px;min-height:36px;font-size:.87rem;border-radius:10px}.btn-lg{padding:14px 26px;font-size:1.05rem}.btn-block{width:100%}.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:700;letter-spacing:.01em}.badge-brand{background:var(--brand-soft);color:var(--brand)}.badge-accent{background:var(--accent-soft);color:var(--accent)}.badge-success{background:var(--success-soft);color:var(--success)}.badge-danger{background:var(--danger-soft);color:var(--danger)}.badge-info{background:var(--info-soft);color:var(--info)}.badge-warn{background:var(--warn-soft);color:var(--warn)}.badge-muted{background:var(--bg-soft);color:var(--muted)}.badge svg{width:12px;height:12px}.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:.85rem;color:var(--muted);cursor:pointer;transition:.15s;font-weight:500;-webkit-user-select:none;user-select:none}.chip:hover{border-color:var(--brand-2);color:var(--ink)}.chip.on{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;font-weight:700;color:var(--brand-2)}.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:.88rem;font-weight:600;color:var(--ink)}.field .hint{font-size:.78rem;color:var(--faint)}.input,select.input,textarea.input{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-size:.95rem;font-family:inherit;transition:.15s}.input:focus{outline:none;border-color:var(--brand-2);box-shadow:0 0 0 4px var(--ring)}textarea.input{resize:vertical;min-height:84px}.input-lg{padding:14px 16px;font-size:1.05rem}.rate-row{display:flex;gap:8px}.rate-opt{flex:1;padding:9px 2px;text-align:center;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font-weight:700;font-size:.92rem;color:var(--muted);transition:.12s}.rate-opt:hover{border-color:var(--brand-2)}.rate-opt.on{background:var(--brand);border-color:var(--brand);color:#fff}.rate-caption{font-size:.74rem;color:var(--faint);display:flex;justify-content:space-between;margin-top:3px}.progressbar{height:8px;border-radius:999px;background:var(--bg-soft);overflow:hidden}.progressbar>div{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--brand),var(--brand-2));transition:width .35s ease}.ring{transform:rotate(-90deg)}.ring .track{stroke:var(--bg-soft)}.ring .fill{stroke:var(--brand);transition:stroke-dashoffset .6s ease}.ring-label{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.toasts{position:fixed;top:14px;left:50%;transform:translate(-50%);z-index:100;display:flex;flex-direction:column;gap:8px;width:min(94vw,460px)}.toast{background:var(--ink);color:var(--bg);border-radius:12px;padding:11px 16px;font-size:.9rem;font-weight:500;box-shadow:var(--shadow-3);display:flex;gap:10px;align-items:center;animation:toast-in .25s ease}[data-theme=dark] .toast{background:#e8edf4;color:#101826}.toast.err{background:var(--danger);color:#fff}@keyframes toast-in{0%{opacity:0;transform:translateY(-8px)}}.modal-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:#0c121c8c;z-index:90;display:flex;align-items:flex-end;justify-content:center;padding:0}@media (min-width: 640px){.modal-overlay{align-items:center;padding:24px}}.modal{background:var(--surface);width:100%;max-width:560px;max-height:88vh;overflow-y:auto;border-radius:var(--r-l) var(--r-l) 0 0;box-shadow:var(--shadow-3);animation:modal-in .22s ease}@media (min-width: 640px){.modal{border-radius:var(--r-l)}}@keyframes modal-in{0%{opacity:0;transform:translateY(16px)}}.modal-head{display:flex;align-items:flex-start;gap:12px;padding:20px 20px 0}.modal-body{padding:16px 20px 20px}.skeleton{background:linear-gradient(90deg,var(--bg-soft) 25%,var(--surface-2) 50%,var(--bg-soft) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:var(--r-m)}@keyframes shimmer{to{background-position:-200% 0}}.skeleton-row{height:90px}.divider{height:1px;background:var(--line);border:0;margin:14px 0}.locked-veil{filter:blur(5px);-webkit-user-select:none;user-select:none;pointer-events:none;opacity:.65}.stat{display:flex;flex-direction:column;gap:2px}.stat .n{font-family:var(--font-display);font-size:1.7rem;font-weight:700;color:var(--ink)}.stat .l{font-size:.78rem;color:var(--muted);font-weight:600}.source-tag{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;color:var(--faint)}.source-tag svg{width:12px;height:12px}.stale{color:var(--warn)}.check-item{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:var(--r-m);border:1px solid var(--line);background:var(--surface);cursor:pointer;transition:.15s}.check-item:hover{border-color:var(--brand-2)}.check-item.done{background:var(--success-soft);border-color:transparent}.check-item.done .check-text{text-decoration:line-through;color:var(--muted)}.checkbox{width:22px;height:22px;border-radius:7px;border:2px solid var(--line);flex:none;display:flex;align-items:center;justify-content:center;margin-top:1px}.check-item.done .checkbox{background:var(--success);border-color:var(--success)}.checkbox svg{width:13px;height:13px;color:#fff;opacity:0}.check-item.done .checkbox svg{opacity:1}.tabs{display:flex;gap:4px;overflow-x:auto;padding:4px;background:var(--bg-soft);border-radius:14px;-webkit-overflow-scrolling:touch}.tabs button{flex:none;padding:9px 16px;border-radius:10px;border:0;background:transparent;color:var(--muted);font-weight:600;font-size:.9rem;cursor:pointer;white-space:nowrap}.tabs button.on{background:var(--surface);color:var(--ink);box-shadow:var(--shadow-1)}.notif-item{display:flex;gap:12px;padding:12px 14px;border-radius:var(--r-m);border:1px solid var(--line);background:var(--surface);cursor:pointer}.notif-item.unread{border-left:3px solid var(--brand);background:var(--brand-soft)}.landing-hero{max-width:var(--maxw);margin:0 auto;padding:46px 20px 30px;display:grid;gap:30px}@media (min-width: 940px){.landing-hero{grid-template-columns:1.1fr .9fr;align-items:center;padding-top:76px}}.hero-h1{font-size:2.35rem}@media (min-width: 700px){.hero-h1{font-size:3.1rem}}.hero-quote{border-left:3px solid var(--accent);padding:4px 0 4px 14px;font-style:italic;color:var(--muted)}.hero-visual{position:relative}.hero-card{padding:18px;display:flex;flex-direction:column;gap:12px}.landing-section{max-width:var(--maxw);margin:0 auto;padding:34px 20px}.landing-section h2{margin-bottom:6px}.step-card{padding:18px;display:flex;flex-direction:column;gap:8px;height:100%}.step-num{width:34px;height:34px;border-radius:11px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:var(--font-display)}.trust-strip{display:flex;flex-wrap:wrap;gap:10px}.pricing-card{padding:26px;display:flex;flex-direction:column;gap:14px;height:100%}.price{font-family:var(--font-display);font-size:2.6rem;font-weight:700}.price small{font-size:1rem;color:var(--muted);font-weight:400}.tick-list{display:flex;flex-direction:column;gap:9px}.tick-list div{display:flex;gap:9px;align-items:flex-start;font-size:.93rem;color:var(--ink)}.tick-list svg{width:17px;height:17px;color:var(--success);flex:none;margin-top:2px}.assessment-wrap{max-width:640px;margin:0 auto}.option-btn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;border-radius:var(--r-m);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-size:.98rem;font-weight:500;cursor:pointer;transition:.13s;margin-bottom:9px}.option-btn:hover{border-color:var(--brand-2)}.option-btn.on{border-color:var(--brand);background:var(--brand-soft);font-weight:600}.option-key{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:700;flex:none;font-size:.85rem;color:var(--muted)}.option-btn.on .option-key{background:var(--brand);border-color:var(--brand);color:#fff}.match-card{padding:18px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden}.match-head{display:flex;gap:14px;align-items:center}.match-score{position:relative;width:64px;height:64px;flex:none}.match-title{font-family:var(--font-display);font-size:1.2rem;font-weight:700}.why-box{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-m);padding:14px;font-size:.92rem;color:var(--ink)}.log-item{display:flex;flex-direction:column;gap:3px;padding:11px 13px;border-radius:var(--r-m);background:var(--surface-2);border:1px solid var(--line)}.log-label{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--brand-2)}.milestone{padding:0;overflow:hidden}.milestone-head{display:flex;gap:12px;align-items:center;padding:16px 18px;cursor:pointer}.milestone-date{font-size:.76rem;color:var(--faint);font-weight:600}.timeline-table{width:100%;border-collapse:collapse;font-size:.87rem}.timeline-table th{text-align:left;padding:8px 10px;color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--line)}.timeline-table td{padding:9px 10px;border-bottom:1px solid var(--line);color:var(--ink)}.timeline-table tr:last-child td{border-bottom:0}.paywall-overlay{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(180deg,transparent 0%,var(--surface) 12%);display:flex;align-items:center;justify-content:center;padding:18px}.checkout-sheet{background:var(--surface);border-radius:var(--r-l);box-shadow:var(--shadow-3);width:100%;max-width:420px;overflow:hidden}.checkout-top{background:#0b2b5c;color:#fff;padding:16px 20px;display:flex;align-items:center;gap:10px}.checkout-amount{font-family:var(--font-display);font-size:1.6rem;font-weight:700}.upi-id{letter-spacing:.12em;font-family:ui-monospace,monospace}@media print{body{background:#fff}.topbar,.bottom-nav,.no-print,.toasts,.modal-overlay{display:none!important}.page{max-width:100%;padding:0}.card{box-shadow:none;border:1px solid #ddd;break-inside:avoid}}.flex{display:flex}.flex-1{flex:1}.mt-1{margin-top:6px}.mt-2{margin-top:12px}.mt-3{margin-top:18px}.mt-4{margin-top:26px}.mb-1{margin-bottom:6px}.mb-2{margin-bottom:12px}.mb-3{margin-bottom:18px}.gap-1{gap:6px}.gap-2{gap:12px}.gap-3{gap:18px}.w-full{width:100%}.hidden{display:none!important}.alert{border-radius:var(--r-m);padding:12px 15px;font-size:.9rem;display:flex;gap:10px;align-items:flex-start}.alert-warn{background:var(--warn-soft);color:var(--warn)}.alert-info{background:var(--info-soft);color:var(--info)}.alert-danger{background:var(--danger-soft);color:var(--danger)}.alert-success{background:var(--success-soft);color:var(--success)}.alert svg{width:17px;height:17px;flex:none;margin-top:2px}.demo-banner{background:var(--accent-soft);color:var(--accent);font-size:.8rem;font-weight:600;padding:6px 14px;text-align:center}.ascii-loader{display:inline-flex;gap:4px;align-items:center}.ascii-loader i{width:7px;height:7px;border-radius:50%;background:var(--brand);animation:bounce 1.2s infinite}.ascii-loader i:nth-child(2){animation-delay:.15s}.ascii-loader i:nth-child(3){animation-delay:.3s}@keyframes bounce{0%,60%,to{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}.fade-in{animation:fade-in .3s ease}@keyframes fade-in{0%{opacity:0;transform:translateY(6px)}}\n\n</style>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n';
  }
});

// server/index.js
var index_exports = {};
import express from "express";
import cookieParser from "cookie-parser";
import path3 from "node:path";
import fs3 from "node:fs";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var __dirname3, app, PORT, HOST, PUBLIC_DIR, GENERATING_MS, QUEUED_MS;
var init_index = __esm({
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
    init_payments();
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
    app.use("/api/payments", paymentRouter);
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
await Promise.resolve().then(() => (init_index(), index_exports));
