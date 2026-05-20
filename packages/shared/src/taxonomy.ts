export type TaxonomyDepartment = {
  id: string;
  label: string;
  jobTitles: string[];
};

export type TaxonomyIndustry = {
  id: string;
  label: string;
  departments: TaxonomyDepartment[];
};

export const taxonomy = {
  industries: [
    {
      id: "technology-software",
      label: "Technology & Software",
      departments: [
        {
          id: "engineering",
          label: "Engineering",
          jobTitles: [
            "Frontend Developer",
            "Backend Developer",
            "Full-Stack Developer",
            "Mobile Developer",
            "DevOps Engineer",
            "QA Engineer"
          ]
        },
        {
          id: "product-design",
          label: "Product & Design",
          jobTitles: ["Product Manager", "UX Designer", "UI Designer", "UX Researcher"]
        },
        {
          id: "data-analytics",
          label: "Data & Analytics",
          jobTitles: ["Data Analyst", "Data Scientist", "Data Engineer", "ML Engineer"]
        }
      ]
    },
    {
      id: "creative-media",
      label: "Creative & Media",
      departments: [
        {
          id: "content-copywriting",
          label: "Content & Copywriting",
          jobTitles: ["Copywriter", "Content Strategist", "Technical Writer", "Social Media Manager"]
        },
        {
          id: "graphic-brand-design",
          label: "Graphic & Brand Design",
          jobTitles: ["Brand Designer", "Illustrator", "Motion Designer", "Video Editor"]
        }
      ]
    },
    {
      id: "marketing-growth",
      label: "Marketing & Growth",
      departments: [
        {
          id: "digital-marketing",
          label: "Digital Marketing",
          jobTitles: ["SEO Specialist", "Paid Ads Manager", "Email Marketing Specialist", "Growth Hacker"]
        }
      ]
    },
    {
      id: "business-operations",
      label: "Business & Operations",
      departments: [
        {
          id: "consulting-strategy",
          label: "Consulting & Strategy",
          jobTitles: ["Business Analyst", "Management Consultant", "Project Manager"]
        },
        {
          id: "finance-accounting",
          label: "Finance & Accounting",
          jobTitles: ["Bookkeeper", "Financial Analyst", "CFO Consultant"]
        }
      ]
    },
    {
      id: "other",
      label: "Other",
      departments: []
    }
  ] satisfies TaxonomyIndustry[]
} as const;

export const skillTags = [
  // Design
  "Figma",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Adobe After Effects",
  "UI Design",
  "UX Design",
  "Brand Identity",
  "Wireframing",
  "Prototyping",
  // Engineering
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "NestJS",
  "GraphQL",
  "REST APIs",
  "PostgreSQL",
  "Docker",
  "AWS",
  "CI/CD",
  "Testing",
  // Marketing
  "SEO",
  "Paid Advertising",
  "Google Ads",
  "Meta Ads",
  "Email Marketing",
  "Content Strategy",
  "Copywriting",
  "Social Media Marketing",
  "Analytics",
  // Data
  "SQL",
  "Python",
  "Tableau",
  "Power BI",
  "Machine Learning",
  "Data Visualization",
  "ETL",
  "A/B Testing",
  // Business
  "Project Management",
  "Stakeholder Management",
  "Business Analysis",
  "Process Improvement",
  "Financial Modeling",
  "Budgeting",
  "Operations",
  "Strategy"
] as const;

export type SkillTag = (typeof skillTags)[number];
