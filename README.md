# 🌐 AboutME-V2 (Discord Live Status Portfolio)

A premium, modern, and highly interactive developer portfolio featuring a live Discord presence/status integration. Built with state-of-the-art web technologies for ultimate performance and fluid animations.

---

## 🚀 Tech Stack

Here is the modern stack powering this web application:

*   **Core Framework**: [React 19](https://react.dev/) — High performance, ultra-fast UI rendering with the latest React features.
*   **Build Tool**: [Vite 8](https://vite.dev/) — Next-generation frontend tooling for lightning-fast development, Hot Module Replacement (HMR), and optimized production builds.
*   **Language**: [TypeScript](https://www.typescriptlang.org/) — Strictly-typed JavaScript for reliable, robust, and clean code development.
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) — Utility-first styling framework with first-class support for modern CSS features and seamless theme support.
*   **Animations**: [Framer Motion](https://www.framer.com/motion/) — Industry-standard library for fluid, physics-based UI transitions and elegant interactive animations.
*   **Icons**: [Lucide React](https://lucide.dev/) — A beautiful, consistent, and customizable icon library for React applications.
*   **Routing**: [React Router DOM](https://reactrouter.com/) — Client-side routing for seamless page transitions.

---

## 🛠️ Getting Started

Follow these steps to run the application locally on your machine.

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) installed.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/AboutME-V2.git
    cd AboutME-V2
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

### Available Scripts

In the project directory, you can run:

*   `npm run dev` — Runs the app in the development mode at `http://localhost:5173`.
*   `npm run build` — Builds the production bundle to the `dist` folder.
*   `npm run lint` — Lints the codebase with ESLint.
*   `npm run preview` — Previews the production-ready build locally.

---

## 📁 Project Structure

```text
AboutME-V2/
├── public/              # Static assets (favicons, etc.)
├── src/
│   ├── assets/          # Static media assets, images, etc.
│   ├── components/      # Reusable UI component blocks (e.g. AboutMe, SharedComponents)
│   ├── hooks/           # Custom React hooks (e.g. Discord status polling/websockets)
│   ├── pages/           # Page components
│   ├── App.tsx          # Main App entry and layout structure
│   ├── index.css        # Tailwind v4 configuration and global CSS variables
│   └── main.tsx         # Root react mounting point
├── eslint.config.js     # Code quality and linting settings
├── package.json         # Project manifests and package versions
├── tsconfig.json        # TypeScript configuration files
└── vite.config.ts       # Vite bundler configurations
```
