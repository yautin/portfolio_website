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
    name: "Skills",
    link: "#skills",
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
  { value: 6, suffix: "+", label: "Therapeutic areas covered" },
  { value: 40, suffix: "+", label: "Promotional pieces delivered" },
  { value: 5, suffix: "+", label: "Years in medical writing" },
];

const workProjects = [
  {
    tag: "Detail Aid · Cardiology",
    title: "8-panel detail aid for a first-in-class cardiac myosin inhibitor",
    molecule: "mavacamten",
    description:
      "Visual aid for cardiologists on obstructive HCM that standardised Valsalva-maneuver assessment and framed the therapy as a non-invasive treatment option. Owned the scientific narrative and reference accuracy through MLR review.",
    chips: ["8-panel", "MLR-reviewed", "oHCM"],
    icon: "/images/work/activity.svg",
    accent: "#ff6b81",
  },
  {
    tag: "Detail Aid · Oncology",
    title: "4-panel detail aid on AKT-pathway–targeted therapy",
    molecule: "capivasertib",
    description:
      "Translated complex AKT signalling-pathway biology into a concise, fair-balanced clinical rationale for oncologists, kept MLR-compliant throughout.",
    chips: ["4-panel", "MLR-reviewed", "Targeted therapy"],
    icon: "/images/work/target.svg",
    accent: "#9d4edd",
  },
  {
    tag: "Reminder Card · Oncology",
    title: "Overall-survival reminder card for a HER2-low ADC",
    molecule: "trastuzumab deruxtecan",
    description:
      "Leave-behind communicating overall-survival (OS) data for an antibody–drug conjugate in HER2-low breast cancer, designed for fast reference at the point of care.",
    chips: ["Leave-behind", "OS data", "HER2-low"],
    icon: "/images/work/trending.svg",
    accent: "#4cc9f0",
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

export {
  navLinks,
  words,
  counterItems,
  workProjects,
  drugProducts,
  drugAreaColors,
};
