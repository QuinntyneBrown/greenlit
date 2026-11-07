# Greenlit Business Plan

As of 2026-11-07. Living copy:
[Greenlit Business Plan](https://claude.ai/artifact/TQmGjQXyofzqYsmwCVMF76) (includes the MRR chart and
roadmap drawing). All projections are estimates; figures marked approximate must be verified before use.

## Executive summary

Greenlit is a bootstrapped, solo-run SaaS that replaces the vacation spreadsheet for teams of under ten people,
priced at one flat fee per team instead of per seat. The goal is 1,000 paying teams and about CAD 125k in annual
recurring revenue (ARR) by the end of year 3 (2029), with running costs under CAD 8k a year until then.

- **Problem.** A manager of a small team either pays per-seat for an HR suite built for 50+ employees, or keeps a
  colour-coded Google Sheet with no notifications, no request trail and no mobile view.
- **Product.** One screen that looks like that sheet: members down the side, days across, blue for tentative,
  yellow for requested, green for confirmed, red for weekends and holidays. A member colours their own days; the
  manager confirms. Nothing else.
- **Customer.** Owner-managers and team leads of 2 to 9 people: agencies, clinics, trades, small software teams,
  and sub-teams inside larger companies whose HR system is too heavy for day-to-day planning.
- **Model.** Free for up to 3 members; **Team** at CAD 12 a month (or CAD 120 a year) flat for up to 9 members;
  **Multi-team** at CAD 29 a month for up to 5 teams.
- **Go-to-market.** Founder-led and low-cost: SEO around "vacation tracker spreadsheet" searches, a free Google
  Sheets import, a launch on Product Hunt and small-business communities, and local GTA networks (Mississauga
  Business Enterprise Centre, Peel chambers).
- **Founder.** Based in Mississauga, Ontario, building nights and weekends first, keeping employment income until
  Greenlit's MRR covers the founder's personal floor.
- **Ask.** No outside capital. Startup cost is about CAD 2.5k; the funding section lists Ontario and federal
  programs that fit a pre-revenue software founder.

## Problem and market gap

Small teams are stuck between a free spreadsheet that does too little and HR software that does far too much.
Greenlit sits in the empty middle.

**What the spreadsheet does well.** Everyone sees the whole month at a glance. The colour code (blue tentative,
yellow requested, green confirmed, red off) is learned in seconds. It costs nothing.

**Where it breaks.**

- No request trail: a cell turns yellow and the manager may not notice for a week.
- Anyone can edit anyone's row, so "who changed my days?" arguments happen.
- A fresh tab every month and hand-painted holidays; the formatting drifts.
- Poor on phones, which is where people actually check who is off tomorrow.
- No running count of days taken against an allowance, which matters in Ontario where the _Employment Standards
  Act_ sets a minimum of two weeks' vacation (three after five years) and requires vacation records.

**Why HR suites don't fit.** BambooHR, Rippling, Humi, Gusto and similar tools bundle payroll, onboarding and
performance reviews. They often need a sales call, charge per employee with monthly minimums, and take hours to
set up. A 6-person team wants none of that; it wants the sheet, with a confirm button.

**Why point tools still feel heavy.** Dedicated leave trackers (Timetastic, Vacation Tracker, Calamari, Day Off)
are closer, but they are built around policies, leave types, approval chains and Slack/Teams bots. Many have
monthly minimums that make a 5-person team pay like a 25-person one. Their default view is a list or calendar,
not the grid managers already know.

**The gap.** Nobody owns "the vacation sheet, done properly" for teams under ten: same grid, same colours, real
roles (member colours their own days, only the manager confirms), mobile-first, flat price.

## Product and positioning

Greenlit is the vacation sheet with roles, a request trail and a phone-friendly view, and the plan is to keep it
that small. Positioning line: **"Your team's vacation sheet, minus the arguments."**

**What it does today (per `docs/specs/L1.md` and `L2.md`).**

- One team = one sheet: members down the side, two header rows (weekday initial, day of month), one table per
  month.
- Four states per cell: Tentative (blue), Requested (yellow), Confirmed (green), Holiday/weekend (red). State is
  also shown as text or icon, never colour alone.
- A member edits only their own row; only the manager confirms; members see only their own team.
- Works with touch on a phone and with the keyboard on a desktop.
- Members can exist as names before they sign in, so a manager can set up the sheet in minutes.

**Near-term additions that stay inside the use case.**

1. Google Sheets / CSV import of an existing vacation sheet (the main acquisition hook).
2. Email notification when a day is requested or confirmed.
3. Days-used counter per member per year, with an optional allowance.
4. Provincial and state public holidays preloaded by team time zone (Ontario first).
5. Read-only calendar feed (iCal) so confirmed days appear in Google/Outlook.

Each of these is a production behaviour change and follows the repo's requirement, design, mock and ATDD process
before implementation.

**Deliberately out of scope.** Payroll, accrual engines, multi-level approval chains, leave-type taxonomies,
shift scheduling, performance reviews. Each would pull Greenlit toward the HR suites it replaces. The rule for any
feature request: does a manager of 6 people miss it on the spreadsheet? If not, decline it.

**Differentiators.**

- **Familiar on day one:** it looks like the sheet they already use, so there is nothing to train.
- **Flat team price:** one predictable fee, no per-seat maths, no minimums.
- **Two-minute setup:** no policies or leave types to configure before it is useful.
- **Canadian-built and hosted option:** a real selling point for Canadian clinics, accountants and
  public-sector-adjacent teams wary of US data residency.

## Target customers and market sizing

The year-3 goal of 1,000 paying teams is about 0.2% of a conservative serviceable market, so the plan does not
depend on winning a large share.

**Beachhead segments (in order).**

| Segment                                             | Typical size | Why they feel the pain                                                       | Where to reach them                                         |
| --------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Small agencies and studios (design, marketing, dev) | 3–9          | Client deadlines collide with vacations; already live in Google Workspace    | Indie Hackers, agency Slack groups, LinkedIn                |
| Clinics and dental/physio offices                   | 4–9          | Coverage rules: two hygienists can't be off the same week                    | Local GTA networking, practice-management forums            |
| Trades and field-service shops                      | 3–9          | Owner-manager tracks it on paper or a whiteboard                             | Peel/Mississauga chambers, supplier counters, Facebook groups |
| Sub-teams inside larger companies                   | 4–9          | Corporate HRIS tracks balances, but day-to-day planning lives in a team sheet | SEO, word of mouth, Product Hunt                            |
| Small accounting and law firms                      | 3–9          | Busy-season blackout periods; privacy-sensitive, prefer Canadian hosting     | CPA Ontario and local bar association events                |

**Market size (approximate, to verify).**

| Layer         | Definition                                                                       | Teams (approx.) | At CAD 120 / year |
| ------------- | -------------------------------------------------------------------------------- | --------------- | ----------------- |
| TAM           | Employer businesses under 10 staff in Canada + US, plus sub-teams                | ~6 million      | ~CAD 720M         |
| SAM           | English-speaking, software-comfortable, 3+ staff, currently on a sheet or nothing | ~600,000        | ~CAD 72M          |
| SOM (year 3)  | Paying Greenlit teams                                                            | 1,000           | ~CAD 120k         |

Canada had about 1.08 million small employer businesses at December 2024, and micro-businesses (1–4 employees)
were roughly 55% of businesses in the 2023 edition
([Key Small Business Statistics 2025](https://ised-isde.canada.ca/site/sme-research-statistics/en/node/439),
[2023](https://ised-isde.canada.ca/site/sme-research-statistics/en/node/372)). The US share is an estimate and
should be checked against US Census Statistics of US Businesses before external use.

**Ideal first customer.** An owner-manager in the GTA with 4–8 staff who already keeps a colour-coded vacation
sheet and complains about it. They decide alone, pay by card, and tell peers.

## Competitive landscape

Greenlit's real competitor is the free spreadsheet; against paid tools it wins on familiarity and setup time, not
on being the cheapest.

| Alternative                                                                         | Monthly cost for a 6-person team         | Strength                     | Weakness for a sub-10 team                                          |
| ----------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Google Sheet / Excel                                                                | Free                                     | Familiar grid, zero setup    | No roles, no trail, no notifications, poor on mobile                |
| [Timetastic](https://www.capterra.com/p/146655/Timetastic/)                         | ~£7 (£1.20/user), ~CAD 13                | Cheap, polished, mature      | Calendar/list UI, leave types and policies to configure; UK-hosted  |
| [Vacation Tracker](https://www.capterra.com/p/189276/Vacation-Tracker/pricing/)     | USD 50 minimum (Core, $2/user)           | Deep Slack/Teams integration | Minimum fee makes a 6-person team pay for 25; needs Slack/Teams     |
| Calamari, Day Off, similar trackers                                                 | Free tier to ~USD 2–5/user (approx.)     | Accruals, multiple leave types | Policy-first design; more than a small team needs                 |
| BambooHR, Humi, Rippling, Gusto                                                     | Quote-based, often USD 50–150+ (approx.) | Full HRIS, payroll           | Sales call, onboarding project, many features unused                |
| Shared Google/Outlook calendar                                                      | Free                                     | Already in use               | No approval state, clutters everyone's calendar                     |

Prices are from Capterra listings as of November 2026 or are marked approximate; confirm on each vendor's site
before publishing comparisons.

**How Greenlit wins each matchup.**

- **vs the spreadsheet:** import it in one click, keep the same look, add confirm, notifications and phone
  access. Free tier for 3 members lowers the switch cost to zero.
- **vs Timetastic-style trackers:** no setup screen; the grid is the home page. A flat fee means adding the ninth
  person costs nothing.
- **vs Vacation Tracker:** no minimum and no chat-tool dependency.
- **vs HR suites:** self-serve card signup in two minutes; no contract.

**Moat, honestly.** There is no technical moat; any competitor could ship a grid view. The defensible assets are
focus (refusing features), the brand promise of "the sheet, done properly", SEO content around spreadsheet
templates, and Canadian hosting for privacy-sensitive buyers.

## Business model and pricing

One flat price per team, a generous free tier and annual billing as the default keep revenue predictable and
support light; gross margin should stay above 90%.

| Plan       | Price (CAD, before tax)  | Limits                                                              | Purpose                                                |
| ---------- | ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Free       | 0                        | 1 team, up to 3 members, current + next 2 months                    | Replace the sheet for the smallest teams; word of mouth |
| Team       | 12 / month or 120 / year | 1 team, up to 9 members, full history, import, notifications, iCal  | Core revenue plan                                      |
| Multi-team | 29 / month or 290 / year | Up to 5 teams, one billing owner                                    | Owners with two locations, or department heads         |

USD pricing for US customers: USD 9 / month or USD 90 / year for Team. Prices exclude HST/GST, which is added at
checkout once registered (see Legal).

**Unit economics per Team subscription (estimates).**

| Item                                                | Monthly plan       | Annual plan                   |
| --------------------------------------------------- | ------------------ | ----------------------------- |
| Gross price                                         | CAD 12.00          | CAD 10.00 / month equivalent  |
| Payment processing (Stripe, ~2.9% + 30¢ per charge) | −CAD 0.65          | −CAD 0.31                     |
| Hosting, email, backups per team                    | −CAD 0.25          | −CAD 0.25                     |
| Contribution                                        | ~CAD 11.10 (92%)   | ~CAD 9.44 (94%)               |

**Targets.** Monthly logo churn under 3% (lifetime ~33 months, lifetime value ~CAD 350); free-to-paid conversion
of 4–6% of active free teams; customer acquisition cost under CAD 90 so payback is under 8 months. Most
acquisition should be organic, so blended CAC should be far lower.

**Why not per seat.** Per-seat pricing makes managers hesitate to add the part-timer or the summer student, which
breaks the "everyone on one sheet" promise. The 9-member cap is the natural fence: a team that outgrows it is an
HR-suite customer, and Greenlit should let it go gracefully (export everything).

**Later, optional revenue.** A one-time "Founding team" lifetime deal capped at 100 teams (CAD 249) to fund year
1; a white-label or reseller arrangement with GTA bookkeepers who manage payroll for small clients.

## Go-to-market

With no ad budget and about 10 hours a week, the plan leans on channels that compound: search, templates, the
import tool and referrals, seeded by hand-sold GTA customers.

**Phase 1 — Hand-sold design partners (months 1–3).**

- Recruit 10 GTA teams the founder can meet in person: former colleagues, friends' businesses, IDEA Mississauga
  and Mississauga Board of Trade contacts.
- Offer free Team for 12 months in exchange for a 20-minute call every two weeks and a testimonial.
- Sit with each manager while they import their sheet; every friction point becomes a backlog item.

**Phase 2 — Public launch (months 4–6).**

- Launch on Product Hunt, Indie Hackers, Hacker News (Show HN) and r/smallbusiness on separate weeks.
- Offer the 100-seat Founding team lifetime deal to early adopters to fund the first year.
- Publish a free **Google Sheets vacation tracker template** in the Greenlit colours, with a "Move this to
  Greenlit" link. It ranks, it is useful on its own, and it pre-formats data for the importer.

**Phase 3 — Compounding channels (months 6–36).**

1. **SEO content:** one article a week targeting long-tail searches ("vacation tracker spreadsheet", "Ontario
   vacation entitlement calculator", "staff holiday planner for small business", "leave calendar for dental
   office").
2. **Free tools:** Ontario/provincial vacation-pay calculator and public-holiday calendar pages per province and
   state.
3. **Referral loop:** every member invited sees "Powered by Greenlit — free for teams of 3"; give one free month
   for each referred paying team.
4. **Directories:** Capterra, G2, GetApp, AlternativeTo listings (free tiers) and "Timetastic alternative"
   comparison pages.
5. **Partners:** bookkeepers and payroll providers serving GTA small businesses recommend Greenlit to clients;
   offer them a Multi-team account free.
6. **Marketplaces:** Google Workspace Marketplace add-on later, if the import proves popular.

**Local Mississauga and GTA tactics.** Attend IDEA Mississauga and Board of Trade events monthly; give a
10-minute "stop fighting about vacation" talk at chamber lunches; target Peel clinics and trades with a one-page
leave-planning guide around Ontario's statutory holidays.

**Messaging pillars.** Looks like your sheet; members colour, managers confirm; works on any phone; one flat
price; Canadian-made.

## Operations and technology

The product is already built on a stack one person can run: a .NET API, an Angular front end and SQL Server,
hosted in Canada for under CAD 100 a month until several hundred teams.

**Stack (from this repo).** .NET solution with Domain / Application / Infrastructure / Api / Cli layers; Angular
workspace with a `gl-*` design system; Playwright acceptance and visual-regression tests; ATDD and incremental
slices as the working method. Migrations run explicitly through the `greenlit` CLI, which suits safe, boring
deploys.

**Hosting plan.**

| Component                  | Choice                                                   | Est. monthly cost (CAD) |
| -------------------------- | -------------------------------------------------------- | ----------------------- |
| API + front end            | Azure App Service (Canada Central, Toronto), B1/B2       | 20–75                   |
| Database                   | Azure SQL serverless, auto-pause off-hours               | 10–30                   |
| Transactional email        | Postmark or Amazon SES                                   | 0–20                    |
| Error monitoring + uptime  | Sentry free tier, Better Stack / UptimeRobot free        | 0                       |
| Backups                    | Point-in-time restore + weekly export to a second region | included–5              |
| Domain, DNS, CDN           | Cloudflare                                               | ~2                      |

Canada Central keeps data in Canada, which supports the privacy pitch and PIPEDA expectations.

**Support.** Email-only, answered within one business day; an in-app help page and a short video per task.
Target under 2 hours a week of support at 500 teams by keeping the product small.

**Founder time budget (while employed).**

| Activity                                            | Hours / week |
| --------------------------------------------------- | ------------ |
| Building and fixing                                 | 5            |
| Marketing: one article or template, community posts | 3            |
| Customer calls and support                          | 1.5          |
| Admin: books, tax, legal                            | 0.5          |
| **Total**                                           | **10**       |

**Operational guardrails.** Automated CI on every push; staging environment that mirrors production; written
runbooks for deploy, restore and incident response; a status page; quarterly restore drills. A single-founder
business must be able to survive a week of the founder being unavailable.

## Legal, tax and compliance

Start as a sole proprietor to validate demand cheaply, then incorporate in Ontario once revenue is steady or the
business takes on risk the founder doesn't want to carry personally. Fees and rates below are approximate; confirm
with the Ontario Business Registry, CRA and an accountant.

**First, check the employment contract.** Read the current employer's IP-assignment, moonlighting and
non-compete clauses before selling anything. Build on personal hardware and time, and get written sign-off if
the contract is vague. This is the single biggest legal risk for a side-project founder.

**Structure path.**

| Stage      | Structure                                                                        | Approx. cost                                                         | When                                                  |
| ---------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Validation | Sole proprietorship, business name registered on the Ontario Business Registry   | ~CAD 60                                                              | Before the first paid sale                            |
| Growth     | Ontario corporation (or federal + Ontario extra-provincial registration)         | ~CAD 300–500 plus NUANS search, or ~CAD 1,000–1,500 with a lawyer    | MRR above ~CAD 2,000, or before signing larger customers |

A Canadian-controlled private corporation pays roughly 12.2% combined federal and Ontario tax on active business
income under CAD 500k (small business deduction), can retain profit, and separates liability. Ask an accountant
about the salary vs dividend mix once the founder is paid.

**Sales tax.**

- HST in Ontario is 13%. Registration becomes mandatory once taxable sales exceed CAD 30,000 over four
  consecutive quarters (small supplier threshold). Consider registering voluntarily at launch to recover HST on
  hosting and software as input tax credits, and to look established.
- Sales to other provinces use that province's GST/HST rate; sales to customers outside Canada are generally
  zero-rated. Confirm SaaS treatment with CRA or an accountant.
- US states: SaaS is taxable in some states, but economic-nexus thresholds (commonly USD 100k in a state) are far
  above year-3 revenue. Use Stripe Tax to monitor.

**Privacy and data.**

- **PIPEDA** governs personal information collected in commercial activity in Ontario: publish a privacy policy,
  collect only what is needed, name a privacy officer, and report breaches that pose a real risk of significant
  harm.
- **Quebec Law 25** applies when serving Quebec teams; it adds a privacy-impact step and stricter consent.
- Vacation days can reveal health or family information; keep reasons out of the product by design (Greenlit
  stores status, not reason).
- Host in Canada Central and say so; offer a Data Processing Agreement template to customers who ask.

**Marketing email.** **CASL** requires express or implied consent for commercial emails, plus sender
identification and an unsubscribe link in each one. Use double opt-in for the newsletter.

**Employment law positioning.** Ontario's _Employment Standards Act_ sets vacation minimums and record-keeping.
Greenlit helps keep records but is not payroll or legal advice; state this in the terms and avoid calculating
vacation pay in-product until it can be done correctly.

**Other essentials.**

- Terms of Service and Privacy Policy, reviewed once by an Ontario tech lawyer (~CAD 1,000–2,500, or a startup
  legal clinic).
- Trademark search and CIPO filing for "Greenlit" in software classes (~CAD 450+ for the first class); the name
  is common, so check conflicts first and keep a fallback.
- Technology errors & omissions plus cyber liability insurance once there are paying customers (~CAD
  1,000–2,000 / year, approx.).
- Separate business bank account and card from day one; bookkeeping in Wave or QuickBooks; keep receipts for
  home-office and equipment deductions.

## Financial plan

Greenlit is cash-positive from year 1 because costs are tiny; the real question is when recurring revenue can
replace the founder's salary, which this plan puts at mid-2029. All figures are projections in CAD, assuming
launch work starts January 2027.

**Startup costs (one-time).**

| Item                                                                | CAD        |
| ------------------------------------------------------------------- | ---------- |
| Terms, privacy policy and contract review (lawyer or legal clinic)  | 1,500      |
| Trademark search and CIPO filing, one class                         | 460        |
| Logo and landing-page design touches                                | 300        |
| Ontario business name registration                                  | 60         |
| Domain and email setup                                              | 20         |
| **Total**                                                           | **~2,340** |

The laptop and the code already exist, so there is no capital equipment.

**Projected paying teams and MRR at quarter end** (CAD 10.50 blended monthly price per paying team).

| Quarter | 2027 teams | 2027 MRR | 2028 teams | 2028 MRR | 2029 teams | 2029 MRR |
| ------- | ---------- | -------- | ---------- | -------- | ---------- | -------- |
| Q1      | 0          | 0        | 140        | 1,470    | 500        | 5,250    |
| Q2      | 15         | 158      | 210        | 2,205    | 640        | 6,720    |
| Q3      | 45         | 473      | 290        | 3,045    | 810        | 8,505    |
| Q4      | 80         | 840      | 380        | 3,990    | 1,000      | 10,500   |

At a CAD 6,000 personal floor, recurring revenue covers a modest full-time salary from about Q2 2029; set a
different floor and the crossing moves with it.

**Three-year summary (projection).**

| Year | Revenue                                  | Operating costs                       | Net before founder pay |
| ---- | ---------------------------------------- | ------------------------------------- | ---------------------- |
| 2027 | 18,100 (incl. 60 lifetime deals × 249)   | 6,800 (incl. startup costs)           | 11,300                 |
| 2028 | 27,400                                   | 7,500                                 | 19,900                 |
| 2029 | 83,200                                   | 18,400 (adds a part-time contractor)  | 64,800                 |

**Cost assumptions.** Hosting CAD 600 / 1,000 / 1,800 a year; tools and email 300 / 600 / 1,200; insurance
1,200 / 1,500 / 1,800; accountant 800 / 1,500 / 2,000 (after incorporation); marketing 1,000 / 2,000 / 4,000;
payment fees ~3% of revenue; a CAD 5,000 support/design contractor in 2029.

**Break-even.** Monthly running costs of ~CAD 400–600 are covered by about 50 paying teams, which the plan
reaches in Q4 2027.

**Sensitivity.** At half the growth (500 teams by end-2029) MRR is ~CAD 5,250 and the full-time move slips about
a year. At 6% monthly churn instead of 3%, plan on roughly 30% fewer teams at year 3. Neither case loses money,
because there is no burn to fund.

## Funding and support programs

Greenlit needs no outside capital; the best uses of programs are a small non-repayable grant, free mentorship,
and tax credits later. Avoid equity investors: a sub-CAD 1M ARR niche tool is a great lifestyle business and a
poor venture bet.

| Program                                                                                                                                      | What it offers                                                       | Fit for Greenlit                                                     | Next step                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Starter Company Plus](https://mbot.com/news/the-mississauga-starter-company-plus-program-is-open) (City of Mississauga, via IDEA Mississauga) | Training, mentorship, grant reported as up to CAD 5,000 (taxable)    | Strong: Launch stream suits a new Mississauga business               | Attend an info session ([virtual, Nov 10 2026](https://luma.com/wju21jje)); apply at next intake |
| IDEA Mississauga / Mississauga Business Enterprise Centre                                                                                    | Free advisory, workshops, registration help                          | Strong: free, local                                                  | Book a consultation this month                                                              |
| RIC Centre (Peel's regional innovation centre, Mississauga)                                                                                  | Tech-startup advisory, investor/customer intros                      | Good once there are paying users                                     | Apply after first 20 paying teams                                                           |
| Futurpreneur Canada (founders 18–39)                                                                                                         | Loan financing with BDC, plus a 2-year mentor                        | Optional, only if cash is needed to go full-time earlier             | Check age eligibility; treat as a fallback                                                  |
| SR&ED federal and Ontario tax credits                                                                                                        | Refundable credits on eligible R&D salaries for CCPCs                | Weak: CRUD SaaS rarely qualifies, and owner dividends don't count    | Revisit only if building genuinely novel tech                                               |
| NRC IRAP                                                                                                                                     | Advisor plus wage funding                                            | Weak until incorporated and hiring                                   | Revisit in 2029 with a hire                                                                 |
| Canada Summer Jobs / Digital Skills for Youth                                                                                                | Wage subsidy for a student or graduate                               | Possible in 2029 for marketing/support help                          | Requires being an employer                                                                  |

Program amounts and terms change often; details are from search listings in November 2026 and should be
confirmed with each program before applying.

**Bootstrapping plan.** Keep the day job; fund the ~CAD 2,340 startup costs from savings; let the Founding team
lifetime deal (target 60 × CAD 249) fund year 1 marketing and legal work; reinvest all profit until MRR crosses
the personal floor.

## Milestones and roadmap

The plan moves in four phases, and each gate is a number that is either hit or not; missing a gate means staying
in the phase and fixing the cause, not spending more.

| Phase             | When               | Work                                                                                  | Gate to leave the phase                    |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. Validate       | Jan–Mar 2027       | 10 GTA design partners, Google Sheets import, email notifications, fortnightly calls  | 8 of 10 partners use it every week         |
| 2. Launch         | Apr–Jun 2027       | Product Hunt, Show HN, Founding lifetime deal, free Sheets template, directory listings | 15 paying teams and 40+ lifetime deals    |
| 3. Compound       | Jul 2027–Dec 2028  | Weekly SEO articles, referral loop, bookkeeper partners, incorporate at CAD 2k MRR    | 380 paying teams, churn under 3%           |
| 4. Go full-time   | 2029               | Multi-team plan, part-time contractor                                                 | Leave the job when MRR beats the floor for 3 months |

If a gate is missed twice in a row (for example, fewer than 15 paying teams by end of September 2027), stop and
re-interview customers before building anything else: the problem is positioning or pricing, not features.

## Risks and mitigations

The largest risks are slow organic growth and the free spreadsheet being "good enough"; none of them can sink the
business financially, because there is almost no burn.

| Risk                                          | Likelihood | Impact | Mitigation                                                                                                                    |
| --------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Managers won't pay to replace a free sheet    | High       | High   | Free tier for 3 members; import in one click; price below a team lunch; validate with 10 design partners before building more |
| Organic growth is slower than planned         | Medium     | High   | Weekly content cadence; track signups per article; add partner channel (bookkeepers) by month 9; extend timeline rather than raise money |
| Employer IP or moonlighting claim             | Low–Medium | Severe | Review contract now; separate hardware, accounts and hours; written consent if unclear                                        |
| Competitor ships a grid view or a free plan   | Medium     | Medium | Stay focused on the sheet experience, Canadian hosting and flat pricing; build loyalty through support                        |
| Data breach or data loss                      | Low        | Severe | Canadian hosting, encrypted backups, restore drills, least-privilege access, breach plan under PIPEDA, cyber insurance        |
| Founder burnout (job + product)               | Medium     | High   | Fixed 10 hours/week; ruthless scope; automate support; quarterly week off from the product                                    |
| Scope creep toward an HR suite                | Medium     | Medium | The "would a 6-person manager miss it on the sheet?" test; public roadmap with a "won't do" list                              |
| "Greenlit" name or trademark conflict         | Medium     | Medium | Search CIPO and USPTO before spending on brand; keep a fallback name and domain                                               |
| Single point of failure (the founder)         | High       | Medium | Runbooks, status page, managed services, a trusted developer friend with emergency access                                     |

## Appendix: assumptions, KPIs and next actions

**Key assumptions.** Blended revenue of CAD 10.50 per paying team per month; 3% monthly churn; 4–6% free-to-paid
conversion; 10 founder hours a week until the full-time decision; no paid acquisition beyond CAD 4,000 a year;
launch work starts January 2027. Revisit every quarter against actuals.

**KPIs to review monthly.**

| KPI                                     | Target by end-2027 | Target by end-2029 |
| --------------------------------------- | ------------------ | ------------------ |
| Paying teams                            | 80                 | 1,000              |
| MRR (CAD)                               | 840                | 10,500             |
| Active free teams                       | 400                | 5,000              |
| Free-to-paid conversion                 | 4%                 | 6%                 |
| Monthly logo churn                      | under 4%           | under 3%           |
| Weekly active members / total members   | 50%                | 60%                |
| Support hours per week                  | under 1            | under 3            |
| Organic signups per month               | 60                 | 500                |

**Next 30 days.**

- [ ] Read the employment contract's IP and moonlighting clauses; get written consent if needed
- [ ] Register "Greenlit" (or the final name) as a business name on the Ontario Business Registry
- [ ] Run a CIPO and USPTO trademark search on "Greenlit"
- [ ] Book a free consultation with IDEA Mississauga; register for a Starter Company Plus info session
- [ ] List 25 GTA managers who keep a vacation sheet; book 10 design-partner calls
- [ ] Specify, design and mock the Google Sheets import; publish a public vacation-tracker template
- [ ] Open a business bank account and set up Stripe in CAD and USD
- [ ] Deploy production to Azure Canada Central with backups and uptime monitoring

## Sources

- [Key Small Business Statistics 2025 (ISED)](https://ised-isde.canada.ca/site/sme-research-statistics/en/node/439)
- [Key Small Business Statistics 2023 (ISED)](https://ised-isde.canada.ca/site/sme-research-statistics/en/node/372)
- [Timetastic on Capterra](https://www.capterra.com/p/146655/Timetastic/)
- [Vacation Tracker pricing on Capterra](https://www.capterra.com/p/189276/Vacation-Tracker/pricing/)
- [Mississauga Starter Company Plus (Mississauga Board of Trade)](https://mbot.com/news/the-mississauga-starter-company-plus-program-is-open)
- [Starter Company Plus Launch Stream info session](https://luma.com/wju21jje)

Figures were taken from search listings because direct page access was unavailable when this was written; legal,
tax and fee figures not linked here are approximate and from general knowledge, so confirm them with CRA, the
Ontario Business Registry and an accountant.
