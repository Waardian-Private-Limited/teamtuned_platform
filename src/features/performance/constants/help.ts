// "How it works" text behind the ⓘ button in each Performance, Learning and Surveys page header.
// steps: the flow in order; terms: what each word on the page means.
export interface PageHelp { title: string; intro: string; steps: string[]; terms?: [string, string][] }

const RATING_TERMS: [string, string][] = [
  ['KRA', 'Key result area: a big responsibility of the job, e.g. "Revenue growth". It groups KPIs.'],
  ['KPI', 'Key performance indicator: one number with a target, e.g. "Sales ₹120 lakh a year".'],
  ['Competency', 'A behaviour rated 1 to 5 by the manager, e.g. "Customer focus".'],
  ['Weight', 'How much a goal (or a section) counts in the score. Weights add up to 100.'],
  ['Score', '100 means the target was met. Each KPI scores actual ÷ target (target ÷ actual when less is better).'],
  ['Band / rating', 'The score mapped on the rating scale, e.g. 85–94.99 = 4 "Exceeds Expectations".'],
];

export const HELP: Record<string, PageHelp> = {
  cycles: {
    title: 'Review cycles',
    intro: 'A cycle is one review period, e.g. FY 2025-26, optionally split into breaks (quarters or your own dates).',
    steps: [
      'Draft: create the cycle, choose breaks and how the year-end score is worked out, then "Create goal sheets". HR can already prepare goals.',
      'Goal setting: everyone is told; managers set goals and submit them for approval.',
      'In progress: values come in (typed, file upload or computed). Close each break after it ends.',
      'Review: self review, then the manager\'s final review and approval.',
      'Calibration (optional): HR compares ratings across teams.',
      'Released: employees see their rating, acknowledge or dispute it. Then close the cycle.',
    ],
    terms: [
      ['Break', 'One part of the cycle (Q1, H1 or custom dates) with its own values, target and score.'],
      ['Year-end score', 'Whole year, average of breaks, weighted by break, or latest break.'],
      ['Goal sheet', 'One person\'s goals for one cycle, copied from their template.'],
    ],
  },
  cycle: {
    title: 'One cycle',
    intro: 'The stepper shows where the cycle is; the buttons move it to the next stage.',
    steps: [
      'Create goal sheets: everyone the cycle covers gets the template "Who gets what" gives them.',
      'Open goal setting, then Start cycle once goals are approved (approved sheets lock).',
      'During the year: Recalculate pulls computed values; Load from file imports a CSV; close each break after it ends.',
      'Open reviews, optionally Start calibration, then Release ratings.',
      'Reports shows progress, rating spread and the KPI heat map.',
    ],
    terms: [['Approved', 'Goals agreed and locked.'], ['Need changes', 'The approver sent the sheet back.'], ['Not submitted', 'Goals still being set.']],
  },
  myGoals: {
    title: 'My goals',
    intro: 'Your goal sheet for each cycle: what you are measured on, your progress, check-ins and your rating.',
    steps: ['Your manager sets your goals (or you propose them, if allowed) and submits them.', 'During the year, values come in; you type in the ones you own.', 'At review time you write your own review, then your manager writes the final one.', 'When ratings are released, you acknowledge or dispute yours.'],
    terms: RATING_TERMS,
  },
  teamGoals: {
    title: 'Team goals',
    intro: 'Goal sheets of the people you review. HR sees every sheet of open cycles, drafts included, and can prepare goals before goal setting opens.',
    steps: ['Open a sheet and add KPIs and competencies, with weights adding up to 100 per section.', 'Submit: it goes to the approval flow (or is approved at once, as your settings say).', 'During the year, enter or check values and write check-ins.', 'At review time, rate competencies and write the final review.'],
    terms: RATING_TERMS,
  },
  sheet: {
    title: 'Goal sheet',
    intro: 'One person\'s goals for one cycle. The score combines goals (KPIs), competencies and 360 feedback by the template\'s section weights.',
    steps: ['Set goals: choose KPIs from the library or write your own; give each a weight and a target (per break if needed).', 'Submit for approval. Approved goals lock.', 'Progress fills as values come in; each break gets its own score.', 'Review: self review, the manager\'s final review (ratings, comment, potential), approval.', 'After release: acknowledge or dispute the rating.'],
    terms: RATING_TERMS,
  },
  okrs: {
    title: 'OKRs',
    intro: 'Objectives and key results show where the company is going and how far it has got. They never change anyone\'s rating.',
    steps: ['HR or leaders set company objectives.', 'Departments align their objectives under a company key result.', 'People (or their managers) add personal objectives under a department one.', 'Key results update by hand, from a goal-sheet KPI, or as the average of the objectives under them.', 'Progress rolls up the tree; check-ins add a confidence and a note.'],
    terms: [['Objective', 'Where you want to get, in words.'], ['Key result', 'A number that proves you got there, with a start and a target.'], ['Confidence', 'On track, at risk or off track: how it feels, not just the number.']],
  },
  oneOnOnes: {
    title: 'One-on-ones',
    intro: 'Regular talks between a manager and one person.',
    steps: ['Book one with your manager or someone on your team.', 'Both add agenda points before the meeting; a reminder comes a day ahead.', 'During it, keep shared notes and action items with an owner and a due date.', 'Mark it done, then "Book the next one": open actions carry over.'],
    terms: [['Shared notes', 'Both of you see them.'], ['Private notes', 'Only the person who wrote them ever sees them.']],
  },
  kudos: {
    title: 'Kudos',
    intro: 'Thanks from one colleague to another.',
    steps: ['Give kudos: pick the person, say what they did, optionally tag the value it shows.', 'Everyone sees it on the wall and can like it.', 'The receiver\'s manager sees kudos from the cycle during the review.'],
  },
  feedback: {
    title: 'Feedback to give',
    intro: '360 feedback a colleague\'s reviewer asked you for.',
    steps: ['Rate each competency from 1 to 5 and answer the questions.', 'Or say you cannot give feedback.', 'Answers are combined with others\'; while anonymous, your name is never shown.'],
  },
  pips: {
    title: 'Improvement plans',
    intro: 'A plan with clear objectives, check-ins and a pass or fail at the end, for someone who needs support.',
    steps: ['Start one from a flagged released rating or for anyone you manage.', 'Submit for approval (if your settings need it); it then becomes active.', 'Add check-in notes and judge each objective met or not met.', 'Extend it if needed, or close it with an outcome.'],
  },
  pip: {
    title: 'Improvement plan',
    intro: 'One plan: objectives, check-ins and the outcome.',
    steps: ['Draft, then submit or start.', 'Active: check-ins and objective results.', 'Close with passed or failed and a summary.'],
  },
  calibration: {
    title: 'Calibration session',
    intro: 'Compares the ratings of a group against the company\'s expected spread before release.',
    steps: ['Look at the spread against the guide.', 'Change a rating only with a reason; every change is logged.', 'Close the session. If the guide is enforced and the spread is off, a cycle manager must give a reason.'],
    terms: [['System', 'Rating from the score.'], ['Manager', 'Rating chosen in the final review.'], ['Now', 'Rating after calibration.']],
  },
  dashboard: {
    title: 'Performance dashboard',
    intro: 'One page to run and audit a review cycle: where every step stands, how ratings are spread, what was changed and why, and what the ratings turned into in pay.',
    steps: [
      'Pick a cycle (the running one opens first). The stepper shows its stage; the funnel shows how many people got through each step.',
      'Ratings: the spread is compared with the calibration guide; bands over or under the guide are flagged. Departments and KPIs show as ink heat (darker = higher score).',
      'Audit: "Missing work" lists goals, reviews and acknowledgements that are late for the stage; "Changes" lists every manager override, calibration move and dispute adjustment with its reason; "Disputes" lists open and settled disputes.',
      'Attendance counts too: a KPI can read attendance (present rate, overtime, night OT, off-day work…). Its score feeds the rating like any other goal.',
      'Pay outcome: link an appraisal cycle to this performance cycle (Compensation → appraisal cycle). Released ratings set the increment % and, when the rating has a bonus %, a one-time bonus paid with payroll.',
    ],
    terms: [
      ['Funnel', 'People in the cycle → goals approved → review approved → released → acknowledged.'],
      ['Override', 'The manager chose a different rating than the score gave, with a reason.'],
      ['Calibration move', 'HR moved a rating in a calibration session, with a reason.'],
      ['Pulse', '1:1s held, kudos given, feedback answered, PIPs and OKR progress — the habits around the rating.'],
      ['Increment / bonus', 'From the appraisal cycle’s rating guide: increment % on CTC, bonus % on basic, gross or CTC.'],
    ],
  },
  report: {
    title: 'Cycle reports',
    intro: 'How far the cycle has got and how ratings and goals look across the company.',
    steps: ['Progress: goals approved, reviews approved, released, acknowledged.', 'Goal score by break, rating spread, KPI heat map by department, team scorecards.', 'Download Excel for the full detail.'],
  },
  setup: {
    title: 'Performance setup',
    intro: 'The library cycles are built from. Set it up once, or import a starter pack and edit it.',
    steps: ['KPIs and KRAs: what is measured, the target, and where values come from (typed in, a file, Attendance, Leave, Recruitment, Tasks or a Data Collection form).', 'Competencies and rating scales.', 'Templates: KPIs and competencies with weights, plus section weights.', 'Who gets what: rules that give each person a template.', 'Settings: approvals, visibility, 360, calibration guide, improvement plans.'],
    terms: [...RATING_TERMS,
      ['Tasks KPI', 'Counts finished tasks (or on-time %, late, review rating, hours). Can be narrowed to a priority, label, form, or only tasks linked to the goal.'],
      ['Form KPI', 'From a Data Collection form: a tracked number field, how many times it was filled, % approved or % on time.']],
  },
  talent: {
    title: 'Talent',
    intro: 'Who is ready for more, who needs support, and who could step into key roles.',
    steps: ['Managers mark potential (low, medium, high) in the final review; employees never see it.', 'The nine-box places each person by rating (performance) and potential.', 'Succession: list key positions and who could step in, with how soon they are ready.'],
    terms: [['Future leader', 'High performance, high potential.'], ['Core player', 'Middle on both.'], ['Talent risk', 'Low on both.']],
  },
  learning: {
    title: 'Learning',
    intro: 'Courses and learning plans.',
    steps: ['HR keeps a catalog of courses, tagged with the skills they build.', 'Skills rated 2 or below in the latest review show as gaps with matching courses.', 'The manager (or HR) assigns items; the employee can add courses too.', 'The employee starts, then marks done with proof; the manager confirms.'],
  },
  surveys: {
    title: 'Surveys',
    intro: 'Short anonymous surveys.',
    steps: ['HR writes a survey (or starts from a ready set) and opens it to everyone or chosen departments.', 'People answer once. Answers are stored without any name.', 'Results show only for groups with enough answers; small teams are pooled or hidden.', 'It closes on its date; results show eNPS, engagement and the trend.'],
    terms: [['eNPS', '% who would recommend (9-10) minus % who would not (0-6). From -100 to +100.'], ['Engagement', 'Average agreement with the statements, 0 to 100.']],
  },
};
