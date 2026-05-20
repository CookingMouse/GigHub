export interface TaxonomyItem {
  id: string;
  label: string;
  sublabel?: string;
  children?: TaxonomyItem[];
}

export const taxonomy: TaxonomyItem[] = [
  {
    id: "tech",
    label: "Technology",
    sublabel: "Software, Hardware, and IT services",
    children: [
      {
        id: "eng",
        label: "Engineering",
        sublabel: "Software development and infrastructure",
        children: [
          { id: "frontend", label: "Frontend Developer", sublabel: "UI/UX implementation" },
          { id: "backend", label: "Backend Developer", sublabel: "Server-side logic" },
          { id: "fullstack", label: "Fullstack Developer", sublabel: "End-to-end development" },
        ]
      },
      {
        id: "design",
        label: "Design",
        sublabel: "Visual and interaction design",
        children: [
          { id: "ui", label: "UI Designer" },
          { id: "ux", label: "UX Designer" },
          { id: "product", label: "Product Designer" },
        ]
      }
    ]
  },
  {
    id: "marketing",
    label: "Marketing",
    sublabel: "Growth, Content, and Brand",
    children: [
      {
        id: "content",
        label: "Content",
        children: [
          { id: "writer", label: "Content Writer" },
          { id: "editor", label: "Editor" },
        ]
      },
      {
        id: "growth",
        label: "Growth",
        children: [
          { id: "seo", label: "SEO Specialist" },
          { id: "performance", label: "Performance Marketer" },
        ]
      }
    ]
  }
];
