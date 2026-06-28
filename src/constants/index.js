const navLinks = [
  {
    name: "Work",
    link: "#work",
  },
  {
    name: "Drug Products List",
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
  Cardiology: "#ff6b81",
  Oncology: "#9d4edd",
  Respiratory: "#4cc9f0",
  Immunology: "#52d1a4",
  Neurology: "#b794f6",
  Endocrinology: "#f4a261",
};

// Drugs you've worked on. The first three match the Work case studies; the rest
// are examples — replace `name`/`area` with your actual product list.
const drugProducts = [
  { name: "Mavacamten", area: "Cardiology" },
  { name: "Capivasertib", area: "Oncology" },
  { name: "Trastuzumab deruxtecan", area: "Oncology" },
  { name: "Dapagliflozin", area: "Cardiology" },
  { name: "Vericiguat", area: "Cardiology" },
  { name: "Osimertinib", area: "Oncology" },
  { name: "Olaparib", area: "Oncology" },
  { name: "Durvalumab", area: "Oncology" },
  { name: "Benralizumab", area: "Respiratory" },
  { name: "Tezepelumab", area: "Respiratory" },
  { name: "Roflumilast", area: "Respiratory" },
  { name: "Upadacitinib", area: "Immunology" },
  { name: "Risankizumab", area: "Immunology" },
  { name: "Lecanemab", area: "Neurology" },
  { name: "Tirzepatide", area: "Endocrinology" },
];

const counterItems = [
  { value: 1.5, suffix: "+", label: "Years of Experience" },
  { value: 10, suffix: "+", label: "Satisfied MNC Clients" },
  { value: 50, suffix: "+", label: "Completed Projects" }
];

const logoIconsList = [
  {
    imgPath: "/images/logos/company-logo-1.png",
  },
  {
    imgPath: "/images/logos/company-logo-2.png",
  },
  {
    imgPath: "/images/logos/company-logo-3.png",
  },
  {
    imgPath: "/images/logos/company-logo-4.png",
  },
  {
    imgPath: "/images/logos/company-logo-5.png",
  },
  {
    imgPath: "/images/logos/company-logo-6.png",
  },
  {
    imgPath: "/images/logos/company-logo-7.png",
  },
  {
    imgPath: "/images/logos/company-logo-8.png",
  },
  {
    imgPath: "/images/logos/company-logo-9.png",
  },
  {
    imgPath: "/images/logos/company-logo-10.png",
  },
  {
    imgPath: "/images/logos/company-logo-11.png",
  },
];

const abilities = [
  {
    imgPath: "/images/seo.png",
    title: "Quality Focus",
    desc: "Delivering high-quality results while maintaining attention to every detail.",
  },
  {
    imgPath: "/images/chat.png",
    title: "Reliable Communication",
    desc: "Keeping you updated at every step to ensure transparency and clarity.",
  },
  {
    imgPath: "/images/time.png",
    title: "On-Time Delivery",
    desc: "Making sure projects are completed on schedule, with quality & attention to detail.",
  },
];

const techStackImgs = [
  {
    name: "React Developer",
    imgPath: "/images/logos/react.png",
  },
  {
    name: "Python Developer",
    imgPath: "/images/logos/python.svg",
  },
  {
    name: "Backend Developer",
    imgPath: "/images/logos/node.png",
  },
  {
    name: "Interactive Developer",
    imgPath: "/images/logos/three.png",
  },
  {
    name: "Project Manager",
    imgPath: "/images/logos/git.svg",
  },
];

const techStackIcons = [
  {
    name: "React Developer",
    modelPath: "/models/react_logo-transformed.glb",
    scale: 1,
    rotation: [0, 0, 0],
  },
  {
    name: "Python Developer",
    modelPath: "/models/python-transformed.glb",
    scale: 0.8,
    rotation: [0, 0, 0],
  },
  {
    name: "Backend Developer",
    modelPath: "/models/node-transformed.glb",
    scale: 5,
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    name: "Interactive Developer",
    modelPath: "/models/three.js-transformed.glb",
    scale: 0.05,
    rotation: [0, 0, 0],
  },
  {
    name: "Project Manager",
    modelPath: "/models/git-svg-transformed.glb",
    scale: 0.05,
    rotation: [0, -Math.PI / 4, 0],
  },
];

const expCards = [
  {
    review:
      "Adrian brought creativity and technical expertise to the team, significantly improving our frontend performance. His work has been invaluable in delivering faster experiences.",
    imgPath: "/images/exp1.png",
    logoPath: "/images/logo1.png",
    title: "Frontend Developer",
    date: "January 2023 - Present",
    responsibilities: [
      "Developed and maintained user-facing features for the Hostinger website.",
      "Collaborated closely with UI/UX designers to ensure seamless user experiences.",
      "Optimized web applications for maximum speed and scalability.",
    ],
  },
  {
    review:
      "Adrian’s contributions to Docker's web applications have been outstanding. He approaches challenges with a problem-solving mindset.",
    imgPath: "/images/exp2.png",
    logoPath: "/images/logo2.png",
    title: "Full Stack Developer",
    date: "June 2020 - December 2023",
    responsibilities: [
      "Led the development of Docker's web applications, focusing on scalability.",
      "Worked with backend engineers to integrate APIs seamlessly with the frontend.",
      "Contributed to open-source projects that were used with the Docker ecosystem.",
    ],
  },
  {
    review:
      "Adrian’s work on Appwrite’s mobile app brought a high level of quality and efficiency. He delivered solutions that enhanced our mobile experience & meet our product goals.",
    imgPath: "/images/exp3.png",
    logoPath: "/images/logo3.png",
    title: "React Native Developer",
    date: "March 2019 - May 2020",
    responsibilities: [
      "Built cross-platform mobile apps using React Native, integrating with Appwrite's backend services.",
      "Improved app performance and user experience through code optimization and testing.",
      "Coordinated with the product team to implement features based on feedback.",
    ],
  },
];

const expLogos = [
  {
    name: "logo1",
    imgPath: "/images/logo1.png",
  },
  {
    name: "logo2",
    imgPath: "/images/logo2.png",
  },
  {
    name: "logo3",
    imgPath: "/images/logo3.png",
  },
];

const testimonials = [
  {
    name: "Esther Howard",
    mentions: "@estherhoward",
    review:
      "I can’t say enough good things about Adrian. He was able to take our complex project requirements and turn them into a seamless, functional website. His problem-solving abilities are outstanding.",
    imgPath: "/images/client1.png",
  },
  {
    name: "Wade Warren",
    mentions: "@wadewarren",
    review:
      "Working with Adrian was a fantastic experience. He transformed our outdated website into a modern, user-friendly platform. His attention to detail and commitment to quality are unmatched. Highly recommend him for any web dev projects.",
    imgPath: "/images/client3.png",
  },
  {
    name: "Guy Hawkins",
    mentions: "@guyhawkins",
    review:
      "Collaborating with Adrian was an absolute pleasure. His professionalism, promptness, and dedication to delivering exceptional results were evident throughout our project. Adrian's enthusiasm for every facet of development truly stands out. If you're seeking to elevate your website and elevate your brand, Adrian is the ideal partner.",
    imgPath: "/images/client2.png",
  },
  {
    name: "Marvin McKinney",
    mentions: "@marvinmckinney",
    review:
      "Adrian was a pleasure to work with. He turned our outdated website into a fresh, intuitive platform that’s both modern and easy to navigate. Fantastic work overall.",
    imgPath: "/images/client5.png",
  },
  {
    name: "Floyd Miles",
    mentions: "@floydmiles",
    review:
      "Adrian’s expertise in web development is truly impressive. He delivered a robust and scalable solution for our e-commerce site, and our online sales have significantly increased since the launch. He’s a true professional!",
    imgPath: "/images/client4.png",
  },
  {
    name: "Albert Flores",
    mentions: "@albertflores",
    review:
      "Adrian was a pleasure to work with. He understood our requirements perfectly and delivered a website that exceeded our expectations. His skills in both frontend and backend dev are top-notch.",
    imgPath: "/images/client6.png",
  },
];

const socialImgs = [
  {
    name: "insta",
    url: "https://www.instagram.com/",
    imgPath: "/images/insta.png",
  },
  {
    name: "fb",
    url: "https://www.facebook.com/",
    imgPath: "/images/fb.png",
  },
  {
    name: "x",
    url: "https://www.x.com/",
    imgPath: "/images/x.png",
  },
  {
    name: "linkedin",
    url: "https://www.linkedin.com/",
    imgPath: "/images/linkedin.png",
  },
];

export {
  words,
  workProjects,
  drugProducts,
  drugAreaColors,
  abilities,
  logoIconsList,
  counterItems,
  expCards,
  expLogos,
  testimonials,
  socialImgs,
  techStackIcons,
  techStackImgs,
  navLinks,
};