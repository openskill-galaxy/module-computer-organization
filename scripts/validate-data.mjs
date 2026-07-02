import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "public/data");
const ok = (m) => console.log("  ✅ " + m);
const fail = (m) => { console.error("  ❌ " + m); errors.push(m); };
const errors = [];
const uniq = (arr) => new Set(arr).size === arr.length;

async function load(name) {
  try {
    const raw = await readFile(join(DATA_DIR, name + ".json"), "utf8");
    const data = JSON.parse(raw);
    const sz = (await stat(join(DATA_DIR, name + ".json"))).size;
    ok(`${name}.json (${Math.round(sz / 1024)} KB)`);
    return data;
  } catch (e) {
    fail(`${name}.json: ${e.message}`);
    return null;
  }
}

console.log("\n=== Validate Static Data (module-computer-organization) ===\n");
console.log("--- File Existence & JSON Parse ---");
const courses = await load("courses");
const lessons = await load("lessons");
const kps = await load("knowledge-points");
const questions = await load("questions");
const exams = await load("exams");
const cases = await load("cases");
const routes = await load("routes");
const glossary = await load("glossary");
const faqs = await load("faqs");
const tags = await load("tags");
const moduleMeta = await load("module");
const searchIdx = await load("search-index");

console.log("\n--- Duplicate ID Check ---");
const checkIds = (name, arr) => {
  if (!arr) return;
  const ids = arr.map((x) => x.id);
  if (uniq(ids)) ok(`${name}.json: ${ids.length} unique IDs`);
  else fail(`${name}.json: duplicate IDs found`);
};
checkIds("courses", courses);
checkIds("lessons", lessons);
checkIds("knowledge-points", kps);
checkIds("questions", questions);
checkIds("exams", exams);
checkIds("cases", cases);
checkIds("routes", routes);
checkIds("glossary", glossary);
checkIds("faqs", faqs);
checkIds("tags", tags);

console.log("\n--- Reference Integrity ---");
if (courses && lessons) {
  const courseIds = new Set(courses.map((c) => c.id));
  const lessonCourseIds = new Set(lessons.map((l) => l.courseId));
  const orphanLessons = [...lessonCourseIds].filter((id) => !courseIds.has(id));
  if (orphanLessons.length === 0) ok("All lessons reference valid courseIds");
  else fail(`${orphanLessons.length} lessons reference non-existent courseIds`);
}

if (courses && lessons) {
  const lessonIds = new Set(lessons.map((l) => l.id));
  let totalRefs = 0;
  let badRefs = 0;
  for (const c of courses) {
    if (c.lessonIds) {
      for (const lid of c.lessonIds) {
        totalRefs++;
        if (!lessonIds.has(lid)) badRefs++;
      }
    }
  }
  if (badRefs === 0) ok(`All ${totalRefs} course.lessonIds references are valid`);
  else fail(`${badRefs}/${totalRefs} course.lessonIds references are invalid`);
}

if (lessons) {
  let hasPracticeQs = 0;
  let totalPracticeQs = 0;
  for (const l of lessons) {
    if (l.practiceQuestionIds && l.practiceQuestionIds.length > 0) {
      hasPracticeQs++;
      totalPracticeQs += l.practiceQuestionIds.length;
    }
  }
  ok(`${hasPracticeQs}/${lessons.length} lessons have practiceQuestionIds (${totalPracticeQs} total)`);
}

if (questions) {
  let missingFields = 0;
  const requiredFields = ["id", "type", "difficulty", "chapter", "knowledge_points", "stem", "options", "answer", "explanation", "wrong_reason", "tags", "estimated_time", "source_type"];
  for (const q of questions) {
    for (const f of requiredFields) {
      if (q[f] === undefined) {
        missingFields++;
        break;
      }
    }
  }
  if (missingFields === 0) ok(`All ${questions.length} questions have required fields`);
  else fail(`${missingFields} questions missing required fields`);
  const nonCurated = questions.filter(q => q.source_type !== "curated-generated");
  if (nonCurated.length === 0) ok(`All questions use source_type: curated-generated`);
  else fail(`${nonCurated.length} questions do not use curated-generated`);
}

if (exams && questions) {
  const qIds = new Set(questions.map((q) => q.id));
  let examQTotal = 0;
  let examQBad = 0;
  for (const e of exams) {
    if (e.questionIds) {
      for (const qid of e.questionIds) {
        examQTotal++;
        if (!qIds.has(qid)) examQBad++;
      }
    }
  }
  if (examQBad === 0) ok(`All ${examQTotal} exam.questionIds references are valid`);
  else fail(`${examQBad}/${examQTotal} exam.questionIds references are invalid`);
}

if (cases && questions) {
  const qIds = new Set(questions.map((q) => q.id));
  let caseQTotal = 0;
  let caseQBad = 0;
  for (const c of cases) {
    if (c.relatedQuestionIds) {
      for (const qid of c.relatedQuestionIds) {
        caseQTotal++;
        if (!qIds.has(qid)) caseQBad++;
      }
    }
  }
  if (caseQBad === 0) ok(`All ${caseQTotal} case.relatedQuestionIds references are valid`);
  else fail(`${caseQBad}/${caseQTotal} case.relatedQuestionIds references are invalid`);
}

console.log("\n--- Search Index ---");
if (searchIdx) {
  ok(`search-index.json exists with ${searchIdx.length} entries`);
  const hasAllTypes = searchIdx.some(e => e.type === "lesson") &&
    searchIdx.some(e => e.type === "question") &&
    searchIdx.some(e => e.type === "glossary") &&
    searchIdx.some(e => e.type === "faq");
  if (hasAllTypes) ok("search-index covers all content types");
  else fail("search-index missing some content types");
} else {
  fail("search-index.json is missing");
}

console.log("\n--- Data Scale ---");
const checks = [
  ["courses", courses, 14],
  ["lessons", lessons, 180],
  ["knowledge-points", kps, 800],
  ["questions", questions, 3500],
  ["exams", exams, 100],
  ["cases", cases, 260],
  ["routes", routes, 30],
  ["tags", tags, 350],
  ["glossary", glossary, 350],
  ["faqs", faqs, 200],
];
for (const [name, data, min] of checks) {
  if (data && data.length >= min) ok(`${name}: ${data.length} >= ${min}`);
  else if (data) fail(`${name}: ${data.length} < ${min}`);
  else fail(`${name}: could not load`);
}

console.log("\n" + "=".repeat(50));
if (errors.length === 0) {
  console.log("✅ All validation checks passed!\n");
  process.exit(0);
} else {
  console.log(`❌ ${errors.length} validation error(s) found.\n`);
  process.exit(1);
}
