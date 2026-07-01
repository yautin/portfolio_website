const navLinks = [
  {
    name: "Work",
    link: "#work",
  },
  {
    name: "Drug Product Experience",
    link: "#drugs",
  },
  {
    name: "Data Distilled",
    link: "#distill",
  },
];

const words = [
  { text: "Science", imgPath: "/images/science.svg" },
  { text: "Data", imgPath: "/images/data.svg" },
  { text: "Evidence", imgPath: "/images/evidence.svg" },
  { text: "Science", imgPath: "/images/science.svg" },
  { text: "Data", imgPath: "/images/data.svg" },
  { text: "Evidence", imgPath: "/images/evidence.svg" },
];

// Headline stats — replace the values with your own figures.
const counterItems = [
  { value: 9, suffix: "+", label: "Therapeutic areas covered" },
  { value: 60, suffix: "+", label: "Promotional pieces delivered" },
  { value: 1.5, suffix: "+", label: "Years in medical writing" },
];

const workProjects = [
  {
    tag: "Detail Aid · Cardiology",
    title: "8-panel detail aid for a first-in-class cardiac myosin inhibitor",
    molecule: "mavacamten",
    description:
      "Visual aid for cardiologists on obstructive HCM that standardised Valsalva-maneuver assessment and framed the therapy as a non-invasive treatment option.",
    chips: ["8-panel", "MLR-reviewed", "oHCM"],
    icon: "/images/work/activity.svg",
    accent: "#ff6b81",
  },
  {
    tag: "Detail Aid · Oncology",
    title: "4-panel detail aid on AKT-pathway–targeted therapy",
    molecule: "capivasertib",
    description:
      "Translated complex AKT signaling biology into a fair-balanced visual rationale, showing oncologists how capivasertib targets a critical choke-point in the pathway.",
    chips: ["4-panel", "MLR-reviewed", "mBC"],
    icon: "/images/work/target.svg",
    accent: "#9d4edd",
  },
  {
    tag: "Reminder Card · Oncology",
    title: "Overall-survival reminder card for a HER2-low ADC",
    molecule: "trastuzumab deruxtecan",
    description:
      "Leave-behind communicating overall-survival (OS) data for an antibody–drug conjugate in HER2-low breast cancer, designed for fast reference at the point of care.",
    chips: ["Leave-behind", "MLR-reviewed", "mBC"],
    icon: "/images/work/trending.svg",
    accent: "#9d4edd",
  },
];

// Therapeutic areas mapped to accent colours, reused by the drug-products marquee
const drugAreaColors = {
  Oncology: "#9d4edd",
  Cardiology: "#ff6b81",
  Endocrinology: "#f4a261",
  Nephrology: "#52d1a4",
  "Infectious Disease": "#4cc9f0",
  Hematology: "#f25f5c",
  Gastroenterology: "#a3e635",
  Dermatology: "#f472b6",
  Ophthalmology: "#60a5fa",
};

// Drug products Marco has developed content for. Pill labels use the common INN;
// each `area` must have a matching colour in drugAreaColors above.
const drugProducts = [
  { name: "Trastuzumab deruxtecan", area: "Oncology" },
  { name: "Olaparib", area: "Oncology" },
  { name: "Sacituzumab govitecan", area: "Oncology" },
  { name: "Capivasertib", area: "Oncology" },
  { name: "Elacestrant", area: "Oncology" },
  { name: "Abemaciclib", area: "Oncology" },
  { name: "Acalabrutinib", area: "Oncology" },
  { name: "Amivantamab", area: "Oncology" },
  { name: "Mavacamten", area: "Cardiology" },
  { name: "Alirocumab", area: "Cardiology" },
  { name: "Clopidogrel", area: "Cardiology" },
  { name: "Ticagrelor", area: "Cardiology" },
  { name: "Dapagliflozin", area: "Cardiology" },
  { name: "Dapagliflozin + metformin", area: "Endocrinology" },
  { name: "Tirzepatide", area: "Endocrinology" },
  { name: "Semaglutide", area: "Endocrinology" },
  { name: "Finerenone", area: "Nephrology" },
  { name: "Remdesivir", area: "Infectious Disease" },
  { name: "Bictegravir/emtricitabine/tenofovir alafenamide", area: "Infectious Disease" },
  { name: "Tenofovir alafenamide", area: "Infectious Disease" },
  { name: "Japanese encephalitis vaccine", area: "Infectious Disease" },
  { name: "Ferric derisomaltose", area: "Hematology" },
  { name: "Otilonium bromide", area: "Gastroenterology" },
  { name: "Lebrikizumab", area: "Dermatology" },
  { name: "Faricimab", area: "Ophthalmology" },
];

// Raw trial readout → distilled takeaway, for the "Data Distilled" section.
// IMPORTANT: figures are recalled from memory and must be VERIFIED against the
// primary publications (and citations completed) before publishing. `area`
// keys map to drugAreaColors; `arms[0]` is the product (accent), `arms[1]` the
// comparator; `fraction` is each arm's value relative to the larger arm.
const dataDistillExamples = [
  {
    area: "Oncology",
    trial: "DESTINY-Breast04",
    population: "HER2-low metastatic breast cancer",
    source: "PFS HR 0.51 (95% CI 0.40–0.64), P<0.001",
    citation: "Modi S, et al. N Engl J Med. 2022;387(1):9-20.",
    footnotes: [
      {
        symbol: "*",
        target: "population",
        text: "Of 557 patients who underwent randomization, 494 (88.7%) had hormone receptor–positive disease and 63 (11.3%) had hormone receptor–negative disease.",
      },
      {
        symbol: "†",
        target: "statement",
        text: "For the treatment of physician's choice (TPC) group, patients received eribulin (51.1%), capecitabine (20.1%), nab-paclitaxel (10.3%), gemcitabine (10.3%), or paclitaxel (8.2%).",
      },
    ],
    metricValue: 49,
    decimals: 0,
    suffix: "%",
    metricLabel: "relative risk reduction",
    statement: "Lower risk of progression or death vs TPC",
    direction: "down",
    arms: [
      { label: "T-DXd", value: "10.1", unit: " mo", fraction: 1 },
      { label: "Chemo", value: "5.4", unit: " mo", fraction: 0.53 },
    ],
  },
  {
    area: "Cardiology",
    trial: "VALOR-HCM",
    population: "Obstructive HCM eligible for septal reduction therapy",
    source: "17.9% vs 76.8% met SRT criteria at wk 16; P<0.001",
    citation: "Desai MY, et al. J Am Coll Cardiol. 2022;80(2):95-108.",
    metricValue: 59,
    decimals: 0,
    suffix: " pts",
    metricLabel: "absolute reduction",
    statement: "Fewer patients still eligible for septal reduction therapy",
    direction: "down",
    arms: [
      { label: "Mavacamten", value: "17.9", unit: "%", fraction: 0.23 },
      { label: "Placebo", value: "76.8", unit: "%", fraction: 1 },
    ],
  },
];

// Contact details — update the email and LinkedIn URL to your own.
const contactEmail = "ngyautin@gmail.com";

// Free access key from https://web3forms.com (safe to expose client-side).
// Until you paste your key here, the contact form falls back to opening a
// pre-filled draft in the visitor's mail app.
const web3formsKey = "6ae7eb9f-c72a-4470-add8-9100d21e31c9";

const contactLinks = [
  {
    label: "Email",
    value: "ngyautin@gmail.com",
    href: "mailto:ngyautin@gmail.com",
  },
  {
    label: "Phone",
    value: "+852 6409 9880",
    href: "tel:+85264099880",
  },
  {
    label: "Based in",
    value: "Hong Kong",
    href: null,
  },
];

export {
  navLinks,
  words,
  counterItems,
  workProjects,
  drugProducts,
  drugAreaColors,
  dataDistillExamples,
  contactEmail,
  contactLinks,
  web3formsKey,
};
