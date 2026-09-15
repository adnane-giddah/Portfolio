

export const PROFILE = {
  name: { first: 'Ahmed', middle: 'Adnane', last: 'Meddah' },
  tag: 'AI Engineering Student · Mathematician · Olympiad Coach',
  subtitle: 'Where rigour meets intelligence.',
  bio: "Undergraduate at ENSIA, Algeria's national school of Artificial Intelligence. IMC medalist, PAMO gold laureate, and coach to 500+ students across Africa. Driven by the mathematical foundations of learning algorithms.",
  cvHref: 'cv.pdf',

  photo: 'photo.jpg',
  photoAlt: 'Ahmed Adnane Meddah',
};

export interface Stat {
  value: string;
  label: string;
  href: string;
}

export const STATS: Stat[] = [
  { value: '500+', label: 'Students coached', href: '#coaching' },
  { value: '5+', label: 'International medals', href: '#achievements' },
  { value: '5+', label: 'African countries reached', href: '#about' },
  { value: '1k+', label: 'Community members', href: '#projects' },
];

export const ABOUT_INTERESTS = [
  'Convex Optimization',
  'Non-convex Optimization',
  'Stochastic Optimization',
  'Theoretical ML',
  'Computational Complexity',
  'Deep Learning Theory',
  'Linear Algebra',
  'Geometry',
  'Theoretical CS',
];

export interface EduItem {
  years: string;
  place: string;
  school: string;
  degree: string;
  detail?: string;
}

export const EDUCATION: EduItem[] = [
  {
    years: '2024 — PRESENT',
    place: 'Algiers, Algeria',
    school: "École Nationale Supérieure d'Intelligence Artificielle",
    degree: 'Engineering Degree in Artificial Intelligence · ENSIA',
    detail: 'Ranked in category A — top 10% (first 27) based on annual average.',
  },
  {
    years: '2021 — 2024',
    place: 'Algeria',
    school: 'High School — Mathematics Stream',
    degree: 'Baccalauréat · Mention Mathematics',
    detail: 'Obtained with "Excellent" honours — average 18+/20.',
  },
];

export type MedalKind = 'gold' | 'silver' | 'bronze' | 'mention';

export interface Medal {
  kind: MedalKind;
  badge: string;
  competition: string;
  details: string;
  href?: string;
}

export const MEDALS: Medal[] = [
  {
    kind: 'bronze',
    badge: 'Bronze Medal',
    competition: 'International Mathematical Competition',
    details: 'IMC 2025 · Bulgaria',
    href: 'https://www.imc-math.org.uk/?act=results&by=sum&year=2025',
  },
  {
    kind: 'mention',
    badge: 'Honourable Mention',
    competition: 'International Mathematical Olympiad',
    details: 'IMO 2024 · United Kingdom · 2 pts from Bronze',
    href: 'https://www.imo-official.org/team_r.aspx?code=ALG&year=2024',
  },
  {
    kind: 'mention',
    badge: 'Honourable Mention',
    competition: 'International Mathematical Olympiad',
    details: 'IMO 2023 · Japan',
    href: 'https://www.imo-official.org/team_r.aspx?code=ALG&year=2023',
  },
  {
    kind: 'silver',
    badge: 'Silver Medal',
    competition: 'Iranian Geometry Olympiad',
    details: 'IGO 2024 · Online (Iran)',
  },
  {
    kind: 'silver',
    badge: 'Silver Medal',
    competition: 'Francophone Mathematical Olympiad',
    details: 'OFM 2024 · 1 pt from Gold',
    href: 'https://ofm2024.mathraining.be/resultats-senior.html',
  },
  {
    kind: 'gold',
    badge: 'Gold Medal',
    competition: 'Pan-African Mathematical Olympiad',
    details: 'PAMO 2024 · South Africa',
    href: 'https://www.pamoofficial.org/timeline/2024/individual.html',
  },
  {
    kind: 'gold',
    badge: 'Perfect Score',
    competition: 'National Mathematical Olympiad',
    details: 'NMO 2022 · Algeria',
  },
  {
    kind: 'silver',
    badge: 'Silver Medal',
    competition: 'Junior Francophone Mathematical Olympiad',
    details: 'OFMJ 2023',
    href: 'http://igm.univ-mlv.fr/~juge/ofm/',
  },
  {
    kind: 'gold',
    badge: 'Gold Medal',
    competition: 'Algerian Mathematical Olympiad',
    details: 'ALMO 2024 · Algeria',
  },
  {
    kind: 'mention',
    badge: 'Honourable Mention',
    competition: 'European Mathematics Cup',
    details: 'EMC 2023',
  },
  {
    kind: 'mention',
    badge: 'Honourable Mention',
    competition: 'Iranian Geometry Olympiad',
    details: 'IGO 2023 · Online (Iran)',
  },
];

export interface CoachingItem {
  org: string;
  role: string;
  period: string;
  points: string[];
}

export const COACHING: CoachingItem[] = [
  {
    org: 'AMO',
    role: 'President',
    period: 'Aug 2026 — Present · Algeria',
    points: [
      'Overall direction and supervision of the entire AMO organizing team.',
      'Strategic coordination of academic, logistical, and operational activities on a national scale.',
      'Decision-making authority over competition organization, team selection, and international representation.',
    ],
  },
  {
    org: 'AMO',
    role: 'Coach & Leader',
    period: '2024 — Present · Algeria',
    points: [
      'Coached 50+ high school students for national and international mathematics competitions.',
      'Directed the academic and logistical organization of the 2025 ALMO Finals (200+ participants), contributing to the Problem Selection Committee & Correction/Inspection.',
      'Served as Leader of the Algerian delegation at the Iranian Geometry Olympiad (IGO 2025).',
      'Served as Deputy Leader of the Algerian team at the Francophone Mathematical Olympiad (OFM 2025).',
      'Served as Observer and Coordinator for the Algerian delegation at IMO 2025.',
      'Observer A of the Algerian delegation at the Balkan Mathematical Olympiad (BMO 2026) and the International Mathematical Olympiad (IMO 2026).',
      'Directed test and TST development for over one year; later appointed Head Coach for 5 months.',
      'Served as a Remote Coordinator for the Pan-African Math Olympiad, responsible for the rigorous grading and coordination of solutions from participants across various African delegations.',
    ],
  },
  {
    org: 'AOI',
    role: 'Coach',
    period: '2024 — 2025 · Algeria',
    points: [
      'Mentored and coached 50+ students in algorithms, data structures, and problem-solving techniques.',
      'Coordinated onsite selection tests and training camps, including problem setting.',
    ],
  },
  {
    org: 'AOA',
    role: 'Lecturer',
    period: '2025 — Present · Remote (Rwanda)',
    points: [
      'Delivered online lectures in mathematics and informatics to students from 10+ African countries as part of the Rising Stars Program.',
    ],
  },
];

export interface Project {
  years: string;
  title: string;
  desc: string;
  href: string;
  role?: string;
  images?: string[];
}

export const PROJECTS: Project[] = [
  {
    years: '2024 — 2026',
    title: 'BAC World',
    href: '#',
    desc: 'Founded and scaled a high-performance academic community reaching 1,000+ students preparing for the Algerian Baccalaureate. Led a team of student-teachers and contributors. Members achieved scores above 18/20, including top national performers.',
  },
  {
    years: '2024 — 2026',
    title: 'Academic Horizon Hub',
    href: '#',
    desc: 'Co-managed a 1,000+ member platform delivering academic opportunities and guidance. Collaborated with BAC World to expand outreach and impact across Algeria.',
  },
  {
    years: '2025 — 2026',
    title: 'MathWin Program',
    href: '#',
    desc: 'Participated in the MathWin educational program as a student, learning and applying advanced mathematical concepts throughout the 2025–2026 academic year.',
  },
  {
    years: 'March 2026',
    title: 'MathCamp — 6th Edition',
    href: '#',
    desc: 'Attended MathCamp — 6th Edition as a student, engaging with advanced conferences and workshops covering various areas of mathematics designed for undergraduate students.',
  },
  {
    years: '2026 — Present',
    title: 'ADNMission',
    role: 'Founder & Developer',
    href: '#',
    desc: 'An interactive geography game centered on exploring the Earth — countries, flags, mountains, rivers, seas, oceans, tectonic plates, and volcanoes. Three complementary modes: Exploration, Game, and Learning (in active development).',
    images: ['projects/adnmission-home.png', 'projects/adnmission-gameplay.png'],
  },
  {
    years: '2026',
    title: 'AMO Testing Platform',
    role: 'Developer',
    href: '#',
    desc: 'A web platform for managing and evaluating mathematical olympiad problems, built with React and Node.js/Express. Automated evaluation scoring and vote weighting by evaluator profile, with structured data storage. Completed; not publicly deployed.',
    images: ['projects/amo-testing-admin.png'],
  },
  {
    years: '2026',
    title: 'AMO Discord',
    role: 'Administrator & Developer',
    href: '#',
    desc: "Administered and developed the Discord infrastructure of the Algerian Mathematical Olympiad Organization. Built bots to automate thread creation, role assignment, and channel-tailored introduction messages.",
  },
  {
    years: '2026 — Present',
    title: 'Configuration Spaces in Normed Spaces',
    role: 'Geometry Research',
    href: '#',
    desc: 'Research under the supervision of Ghani Zeghib (CNRS Research Director, ENS Lyon), with Mohamed Amir BenMelouka and Haithem Idris Ait Hamadouche — studying geometric and topological structures of configuration spaces in normed spaces.',
  },
];

export interface SkillGroup {
  title: string;
  skills: { name: string; level: number }[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: 'Languages',
    skills: [
      { name: 'C++', level: 7 },
      { name: 'Python', level: 5 },
      { name: 'Java', level: 3 },
      { name: 'JavaScript', level: 5 },
      { name: 'HTML5', level: 6 },
      { name: 'CSS3', level: 6 },
      { name: 'LaTeX', level: 8 },
    ],
  },
  {
    title: 'Frameworks & Tools',
    skills: [
      { name: 'NumPy', level: 2 },
      { name: 'Pandas', level: 3 },
      { name: 'Regular Expressions', level: 6 },
      { name: 'Node.js', level: 5 },
      { name: 'Express', level: 5 },
      { name: 'React', level: 6 },
      { name: 'Git', level: 6 },
    ],
  },
  {
    title: 'Databases & Cloud',
    skills: [
      { name: 'MySQL', level: 7 },
      { name: 'MongoDB', level: 3 },
      { name: 'Google Cloud Platform', level: 3 },
    ],
  },
  {
    title: 'Networking & Infrastructure',
    skills: [
      { name: 'IP Configuration', level: 7 },
      { name: 'VLAN', level: 8 },
      { name: 'DHCP', level: 3 },
      { name: 'SSH', level: 3 },
      { name: 'OSPF', level: 7 },
      { name: 'Switch Configuration', level: 7 },
      { name: 'Firewall Administration', level: 4 },
      { name: 'Router Configuration', level: 3 },
      { name: 'Server Administration', level: 3 },
      { name: 'Proxmox', level: 7 },
      { name: 'MobaXterm', level: 6 },
    ],
  },
];

export const LANGUAGES = [
  { name: 'Arabic', level: 'Native' },
  { name: 'English', level: 'Fluent' },
  { name: 'French', level: 'Advanced' },
];

export interface ContactLink {
  icon: string;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

export const CONTACT_LINKS: ContactLink[] = [
  {
    icon: '✉',
    label: 'Email',
    value: 'ahmed-adnane.meddah@ensia.edu.dz',
    href: 'mailto:ahmed-adnane.meddah@ensia.edu.dz',
  },
  { icon: '✆', label: 'Phone', value: '+213 540 45 99 39', href: 'tel:+213540459939' },
  {
    icon: '⌥',
    label: 'GitHub',
    value: 'adnane-giddah',
    href: 'https://github.com/adnane-giddah',
    external: true,
  },
  {
    icon: 'in',
    label: 'LinkedIn',
    value: 'ahmed-adnane-meddah',
    href: 'https://linkedin.com/in/ahmed-adnane-meddah-8454b434b',
    external: true,
  },
  { icon: '◈', label: 'Personal Site', value: 'adnane-giddah.github.io', href: '#' },
];

export const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#achievements', label: 'Awards' },
  { href: '#coaching', label: 'Coaching' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
];
