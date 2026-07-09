<div align="center">
  
  # 💈 Southside Barbers 💈
  ### *Premium appointment booking and real-time queue management system.*

  [![TanStack Start](https://img.shields.io/badge/Framework-TanStack_Start-FF4154?style=for-the-badge&logo=react&logoColor=white)](https://tanstack.com/router/v1/docs/start/overview)
  [![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

  *A high-contrast, brutalist-editorial design experience built for barbershop operations.*
  
  ---
</div>

## 🌌 System Overview

Southside Barbers is a full-stack, real-time application engineered to streamline barbershop booking funnels, manage barbershop personnel portfolios, display customer review feedback, and track walk-in customer queues in real-time. 

Designed around a modern, brutalist aesthetic, the system features a high-performance customer-facing site and a secure admin management portal.

---

## ⚡ Technical Architecture

The application is structured into three main layers:

1. **Client Interface**: Powered by **React 19** and **TanStack Start/Router**. It provides client-side hydration, automatic route generation, and transitions. The styling utilizes a custom layout configuration built on **Tailwind CSS v4** to deliver a responsive grid and interface elements.
2. **Server Functions**: Implemented via **Nitro server engine** (underpinning TanStack Start). All sensitive transactions, including queue position updates and administrative queries, run on serverless endpoints.
3. **Database & Services (Supabase)**:
   - **PostgreSQL Database** — Stores relational schemas for barbers, services, bookings, schedules, audit logs, and client reviews.
   - **Database Triggers** — Automatically computes live average barber ratings upon review creation, updates, and deletes.
   - **Realtime Subscriptions** — Synchronizes queue waitlists and booking updates instantly across customer views and admin boards.
   - **Object Storage Buckets** — Stores uploaded barber avatar images and portfolio styling cuts.

---

## ✨ Key Capabilities

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>👤 Customer Portal</h3>
      <ul>
        <li>📅 <strong>Multi-Service Selection</strong> — Allows selection of multiple services in a single booking.</li>
        <li>👥 <strong>Interactive Portfolios</strong> — Displays master barber experience, bios, portfolio grids, and client feedback.</li>
        <li>💬 <strong>Live Reviews</strong> — Shows verified client comments and ratings linked to specific bookings.</li>
        <li>🕒 <strong>Real-time Queue Monitor</strong> — Displays queue orders, active statuses, and estimated wait times.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>👑 Admin Dashboard</h3>
      <ul>
        <li>📝 <strong>Booking Manager</strong> — Provides checking in, updating status, and processing checkout for appointments.</li>
        <li>🚶 <strong>Walk-in Logger</strong> — Adds walk-in customers to the live database queue instantly.</li>
        <li>🔧 <strong>Service Configurator</strong> — Manages active services, durations, categories, and pricing.</li>
        <li>📅 <strong>Schedule Manager</strong> — Configures weekly barber schedules and logs holidays to block bookings.</li>
        <li>📊 <strong>Business Analytics</strong> — Tracks weekly booking counts, revenue charts, and barber productivity.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 📂 System Project Structure

The codebase is organized logically to separate client interfaces, server integrations, database migrations, and static assets:

```
├── public/                  # Static assets (fonts, layouts)
├── src/
│   ├── components/
│   │   ├── admin/           # Dashboard analytics, list pages, and print receipts
│   │   └── site/            # Global navigation headers, site footers
│   ├── integrations/
│   │   └── supabase/        # Database type definitions and Client initialization
│   ├── lib/
│   │   └── customer-api.ts  # Database fetch queries & slot calculations
│   └── routes/
│       ├── admin/           # Admin configuration panels and reporting dashboards
│       ├── barbers.tsx      # Barbers listing with inline scroll-sync portfolio
│       ├── contact.tsx      # Visitors information
│       ├── index.tsx        # Public landing homepage
│       └── queue.tsx        # Live waitlist queue page
└── supabase/
    └── migrations/          # Incremental PostgreSQL database schemas
```

---

<div align="center">
  <sub>Developed with precision and style. Proprietary & Private.</sub>
</div>
