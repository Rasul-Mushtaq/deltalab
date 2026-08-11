# DeltaLab: Data Health Inspector

DeltaLab is an instant data profiling and dataset health inspector. Drop in a CSV or JSON file and get a full statistical profile, a health score, and useful cleaning tools, all without sending your data anywhere.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=for-the-badge)](https://deltalab-app.netlify.app)

## Key Features

- **Dataset metrics**: row and column counts, file size, and per-column statistics like mean, median, std dev, and outliers.
- **Health scoring**: a 0 to 100 score with a breakdown of penalties for missing values, duplicates, outliers, and constant columns.
- **Column type breakdown**: automatic schema detection with an interactive donut chart showing the mix of numeric, categorical, datetime, boolean, and text columns.
- **Missing value detection**: highlights null-heavy columns and surfaces alerts with severity levels.
- **Correlation scatter plots**: click any pair in the correlation matrix to open an interactive scatter plot. Large datasets are sampled automatically so the plot stays responsive.
- **Quick Clean**: impute missing values, drop duplicates, trim whitespace, cast types, and strip special characters with a live before/after preview.
- **Data grid**: search, sort, and paginate through the raw dataset.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- PapaParse
- Lucide React

## Getting Started

Clone the repo and install dependencies:

```bash
git clone <https://github.com/Rasul-Mushtaq/deltalab>
cd deltalab-data-health-inspector
npm install
```

Start the dev server:

```bash
npm run dev
```

Open the local URL printed in the terminal (via http://localhost:5173) and drop in a dataset to get started.
